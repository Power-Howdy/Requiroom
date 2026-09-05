import { assertSafeUrl, BROWSER_UA } from "./safety";
import { collectSetCookie, parseCookieHeader } from "./cookies";
import {
  looksLikeCloudflareChallenge,
  rewriteCss,
  rewriteHtml,
  unwrapProxyTarget,
} from "./rewrite";
import {
  fetchDocumentWithBrowser,
  isBrowserFetchAvailable,
  looksLikeCloudflareResponse,
  isActiveChallengeHtml,
} from "./browserFetch";

export const maxDuration = 60;

const STRIP_RESPONSE_HEADERS = [
  "content-security-policy",
  "content-security-policy-report-only",
  "x-frame-options",
  "frame-options",
  "cross-origin-opener-policy",
  "cross-origin-embedder-policy",
  "cross-origin-resource-policy",
  "clear-site-data",
  "report-to",
  "nel",
];

function forwardCacheControl(upstream: Headers, out: Headers, contentType: string) {
  const cc = upstream.get("cache-control");
  const etag = upstream.get("etag");
  const lm = upstream.get("last-modified");
  const expires = upstream.get("expires");
  if (contentType.includes("text/html")) {
    out.set("Cache-Control", "no-store");
    return;
  }
  if (cc) out.set("Cache-Control", cc);
  else out.set("Cache-Control", "public, max-age=300");
  if (etag) out.set("ETag", etag);
  if (lm) out.set("Last-Modified", lm);
  if (expires) out.set("Expires", expires);
}

async function proxyRequest(req: Request): Promise<Response> {
  const { searchParams, origin } = new URL(req.url);
  const raw = searchParams.get("url");
  if (!raw) return new Response("Missing url", { status: 400 });

  const proxyBase = `${origin}/api/proxy`;
  // Undo nested /api/proxy?url=… wraps (SPA history + re-proxy bugs).
  let flat = raw;
  for (let i = 0; i < 5; i++) {
    const inner = unwrapProxyTarget(flat, proxyBase);
    if (!inner || inner === flat) break;
    flat = inner;
  }

  let target: URL;
  try {
    target = await assertSafeUrl(flat);
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "Blocked", { status: 400 });
  }

  const swCookie = req.headers.get("X-RQ-Cookie");
  const cookie = swCookie?.trim() || null;
  const method = req.method.toUpperCase();

  const controller = new AbortController();
  // Long enough for redirect hops; Chromium challenge solve runs after this fetch.
  const timer = setTimeout(() => controller.abort(), 35_000);

  const accept =
    req.headers.get("Accept") ||
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8";
  const upstreamHeaders: Record<string, string> = {
    "User-Agent": BROWSER_UA,
    Accept: accept,
    "Accept-Language": req.headers.get("Accept-Language") || "en-US,en;q=0.9",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Ch-Ua": '"Chromium";v="131", "Not_A Brand";v="24"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": req.headers.get("Sec-Fetch-Dest") || "document",
    "Sec-Fetch-Mode": req.headers.get("Sec-Fetch-Mode") || "navigate",
    "Sec-Fetch-Site": req.headers.get("Sec-Fetch-Site") || "none",
    "Sec-Fetch-User": "?1",
  };
  if (cookie) upstreamHeaders.Cookie = cookie;

  const ifNoneMatch = req.headers.get("If-None-Match");
  const ifModifiedSince = req.headers.get("If-Modified-Since");
  if (ifNoneMatch) upstreamHeaders["If-None-Match"] = ifNoneMatch;
  if (ifModifiedSince) upstreamHeaders["If-Modified-Since"] = ifModifiedSince;

  const referer = req.headers.get("Referer");
  if (referer) {
    try {
      const refUrl = new URL(referer);
      const nested = refUrl.searchParams.get("url");
      if (nested) upstreamHeaders.Referer = nested;
      else if (!referer.includes("/api/proxy")) upstreamHeaders.Referer = referer;
    } catch {
      /* ignore */
    }
  }

  let body: ArrayBuffer | undefined;
  if (method !== "GET" && method !== "HEAD") {
    body = await req.arrayBuffer();
    const ct = req.headers.get("Content-Type");
    if (ct) upstreamHeaders["Content-Type"] = ct;
  }

  /** Follow redirects here — SW + iframe navigations often fail on opaque/manual 3xx. */
  const MAX_REDIRECTS = 10;

  try {
    let current = target;
    let currentMethod = method;
    let currentBody = body && body.byteLength ? body : undefined;
    let response: Response | null = null;
    const gatheredCookies: string[] = [];

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      response = await fetch(current.href, {
        method: currentMethod,
        signal: controller.signal,
        redirect: "manual",
        headers: upstreamHeaders,
        body: currentBody,
      });

      gatheredCookies.push(...collectSetCookie(response.headers));

      // Carry Set-Cookie into the next hop (Google regional redirects need this)
      if (gatheredCookies.length) {
        const jar = parseCookieHeader(upstreamHeaders.Cookie || null);
        for (const sc of gatheredCookies) {
          const first = sc.split(";")[0];
          const i = first.indexOf("=");
          if (i <= 0) continue;
          const name = first.slice(0, i).trim();
          const value = first.slice(i + 1).trim();
          if (name) jar[name] = value;
        }
        const merged = Object.entries(jar)
          .map(([n, v]) => `${n}=${v}`)
          .join("; ");
        if (merged) upstreamHeaders.Cookie = merged;
      }

      if (![301, 302, 303, 307, 308].includes(response.status)) break;

      const loc = response.headers.get("location");
      if (!loc) break;
      if (hop === MAX_REDIRECTS) {
        return new Response("Too many redirects", { status: 502 });
      }

      current = await assertSafeUrl(new URL(loc, current).href);
      // RFC: 303 → GET; 301/302 historically treated as GET for browser navigations
      if (
        response.status === 303 ||
        ((response.status === 301 || response.status === 302) &&
          currentMethod !== "GET" &&
          currentMethod !== "HEAD")
      ) {
        currentMethod = "GET";
        currentBody = undefined;
        delete upstreamHeaders["Content-Type"];
      }
      // Keep cookies from the client jar; hop Set-Cookie is returned to SW via X-RQ-Set-Cookie
    }

    if (!response) {
      return new Response("Fetch failed", { status: 502 });
    }

    const headers = new Headers();
    headers.set("X-RQ-Final-URL", current.href);
    headers.set("X-RQ-Fetch-Mode", "fetch");
    headers.set(
      "Access-Control-Expose-Headers",
      "X-RQ-Set-Cookie, X-RQ-Final-URL, X-RQ-Fetch-Mode",
    );
    if (gatheredCookies.length) {
      headers.set("X-RQ-Set-Cookie", JSON.stringify(gatheredCookies));
    }

    if (response.status === 304) {
      forwardCacheControl(response.headers, headers, response.headers.get("content-type") || "");
      return new Response(null, { status: 304, headers });
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    headers.set("Content-Type", contentType);
    forwardCacheControl(response.headers, headers, contentType);
    for (const h of STRIP_RESPONSE_HEADERS) headers.delete(h);

    if (contentType.includes("text/html")) {
      const buf = await response.arrayBuffer();
      if (buf.byteLength > 2_500_000) {
        return new Response("HTML too large", { status: 413 });
      }
      let html = new TextDecoder("utf-8").decode(buf);
      const cfHit =
        looksLikeCloudflareChallenge(html) ||
        looksLikeCloudflareResponse(response.status, response.headers, html);

      // Solve Cloudflare in Chromium, then prefer a clean cookie-backed refetch for rewrite.
      if (cfHit && (method === "GET" || method === "HEAD") && (await isBrowserFetchAvailable())) {
        try {
          // Seed Chromium with any Set-Cookie from the challenge response (__cf_bm, etc.)
          const seedJar = parseCookieHeader(cookie);
          for (const sc of gatheredCookies) {
            const first = sc.split(";")[0];
            const i = first.indexOf("=");
            if (i <= 0) continue;
            seedJar[first.slice(0, i).trim()] = first.slice(i + 1).trim();
          }
          const seedCookie = Object.entries(seedJar)
            .map(([n, v]) => `${n}=${v}`)
            .join("; ");

          const doc = await fetchDocumentWithBrowser(current.href, seedCookie || cookie);
          const finalUrl = await assertSafeUrl(doc.url);
          headers.set("X-RQ-Final-URL", finalUrl.href);
          headers.set("X-RQ-Fetch-Mode", "chromium");
          if (doc.setCookies.length) {
            headers.set("X-RQ-Set-Cookie", JSON.stringify(doc.setCookies));
          }

          let pageHtml = doc.body.toString("utf8");

          // Refetch with clearance cookies so the iframe gets pristine HTML (not a hydrated SPA dump).
          if (!doc.cookieHeader) {
            throw new Error("Chromium did not return session cookies");
          }
          {
            try {
              const refreshed = await fetch(finalUrl.href, {
                method: "GET",
                redirect: "follow",
                headers: {
                  "User-Agent": BROWSER_UA,
                  Accept:
                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                  "Accept-Language": "en-US,en;q=0.9",
                  Cookie: doc.cookieHeader,
                },
                signal: AbortSignal.timeout(25_000),
              });
              const refreshedCt = refreshed.headers.get("content-type") || "";
              if (refreshed.ok && refreshedCt.includes("text/html")) {
                const refreshedHtml = await refreshed.text();
                if (
                  refreshedHtml.length > 200 &&
                  !isActiveChallengeHtml(refreshedHtml) &&
                  !looksLikeCloudflareChallenge(refreshedHtml)
                ) {
                  pageHtml = refreshedHtml;
                  headers.set("X-RQ-Fetch-Mode", "chromium+fetch");
                  const moreCookies = collectSetCookie(refreshed.headers);
                  if (moreCookies.length) {
                    headers.set(
                      "X-RQ-Set-Cookie",
                      JSON.stringify([...doc.setCookies, ...moreCookies]),
                    );
                  }
                } else if (isActiveChallengeHtml(pageHtml) || looksLikeCloudflareChallenge(pageHtml)) {
                  throw new Error("Clearance cookies did not unlock the page for fetch");
                }
              } else if (isActiveChallengeHtml(pageHtml)) {
                throw new Error(`Post-clearance fetch returned ${refreshed.status}`);
              }
            } catch (e) {
              if (isActiveChallengeHtml(pageHtml) || pageHtml.length < 100) {
                throw e instanceof Error ? e : new Error("Post-clearance refetch failed");
              }
              console.warn("[proxy] post-clearance refetch failed, using chromium HTML:", e);
            }
          }

          html = rewriteHtml(pageHtml, finalUrl, proxyBase);
          headers.set("Content-Type", "text/html; charset=utf-8");
          return new Response(html, { status: 200, headers });
        } catch (e) {
          console.warn("[proxy] chromium challenge upgrade failed:", e);
          // Don't serve a rewritten interstitial that cannot pass Turnstile in an iframe.
          const msg = e instanceof Error ? e.message : "Challenge failed";
          const errPage = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Cloudflare blocked</title>
<style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:48px;max-width:560px}
code{background:#1e293b;padding:2px 6px;border-radius:4px}</style></head><body>
<h1>Cloudflare challenge</h1>
<p>Requiroom could not clear the bot check for this site via Chromium.</p>
<p style="opacity:.8">${msg.replace(/</g, "&lt;")}</p>
<p>Try <code>npm run browser:install</code>, clear browser data, then reload. Interactive Turnstile captchas may still require a normal browser.</p>
</body></html>`;
          headers.set("Content-Type", "text/html; charset=utf-8");
          headers.set("X-RQ-Fetch-Mode", "chromium-failed");
          return new Response(errPage, { status: 502, headers });
        }
      }

      html = rewriteHtml(html, current, proxyBase);
      headers.set("Content-Type", "text/html; charset=utf-8");
      return new Response(html, { status: response.status, headers });
    }

    if (contentType.includes("text/css")) {
      const buf = await response.arrayBuffer();
      if (buf.byteLength > 2_000_000) {
        return new Response("CSS too large", { status: 413 });
      }
      const css = rewriteCss(new TextDecoder("utf-8").decode(buf), current, proxyBase);
      headers.set("Content-Type", "text/css; charset=utf-8");
      return new Response(css, { status: response.status, headers });
    }

    const buf = await response.arrayBuffer();
    if (buf.byteLength > 12_000_000) {
      return new Response("Body too large", { status: 413 });
    }
    return new Response(buf, { status: response.status, headers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fetch failed";
    return new Response(msg, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: Request) {
  return proxyRequest(req);
}

export async function POST(req: Request) {
  return proxyRequest(req);
}

export async function PUT(req: Request) {
  return proxyRequest(req);
}

export async function PATCH(req: Request) {
  return proxyRequest(req);
}

export async function DELETE(req: Request) {
  return proxyRequest(req);
}

export async function HEAD(req: Request) {
  return proxyRequest(req);
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "X-RQ-Cookie, Content-Type, Accept, Accept-Language",
      "Access-Control-Expose-Headers": "X-RQ-Set-Cookie, X-RQ-Final-URL, X-RQ-Fetch-Mode",
    },
  });
}
