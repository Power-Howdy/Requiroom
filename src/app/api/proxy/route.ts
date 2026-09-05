import { assertSafeUrl, BROWSER_UA } from "./safety";
import { collectSetCookie } from "./cookies";
import { looksLikeCloudflareChallenge, rewriteCss, rewriteHtml } from "./rewrite";
import { fetchDocumentWithBrowser, isBrowserFetchAvailable } from "./browserFetch";

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

  let target: URL;
  try {
    target = await assertSafeUrl(raw);
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "Blocked", { status: 400 });
  }

  const swCookie = req.headers.get("X-RQ-Cookie");
  const cookie = swCookie?.trim() || null;
  const proxyBase = `${origin}/api/proxy`;
  const method = req.method.toUpperCase();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);

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

  try {
    const response = await fetch(target.href, {
      method,
      signal: controller.signal,
      redirect: "manual",
      headers: upstreamHeaders,
      body: body && body.byteLength ? body : undefined,
    });

    const setCookies = collectSetCookie(response.headers);
    const headers = new Headers();
    headers.set("X-RQ-Final-URL", target.href);
    headers.set("X-RQ-Fetch-Mode", "fetch");
    if (setCookies.length) {
      headers.set("X-RQ-Set-Cookie", JSON.stringify(setCookies));
      headers.set("Access-Control-Expose-Headers", "X-RQ-Set-Cookie, X-RQ-Final-URL, X-RQ-Fetch-Mode");
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const loc = response.headers.get("location");
      if (loc) {
        const next = await assertSafeUrl(new URL(loc, target).href);
        headers.set("Location", `${proxyBase}?url=${encodeURIComponent(next.href)}`);
        return new Response(null, { status: response.status, headers });
      }
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

      // If plain fetch hit CF and chromium is available, upgrade this navigation
      if (looksLikeCloudflareChallenge(html) && (await isBrowserFetchAvailable())) {
        try {
          const doc = await fetchDocumentWithBrowser(target.href, cookie);
          const finalUrl = await assertSafeUrl(doc.url);
          headers.set("X-RQ-Final-URL", finalUrl.href);
          headers.set("X-RQ-Fetch-Mode", "chromium");
          if (doc.setCookies.length) {
            headers.set("X-RQ-Set-Cookie", JSON.stringify(doc.setCookies));
          }
          html = rewriteHtml(doc.body.toString("utf8"), finalUrl, proxyBase);
          headers.set("Content-Type", "text/html; charset=utf-8");
          return new Response(html, { status: 200, headers });
        } catch (e) {
          console.warn("[proxy] chromium challenge upgrade failed:", e);
        }
      }

      html = rewriteHtml(html, target, proxyBase);
      headers.set("Content-Type", "text/html; charset=utf-8");
      return new Response(html, { status: response.status, headers });
    }

    if (contentType.includes("text/css")) {
      const buf = await response.arrayBuffer();
      if (buf.byteLength > 2_000_000) {
        return new Response("CSS too large", { status: 413 });
      }
      const css = rewriteCss(new TextDecoder("utf-8").decode(buf), target, proxyBase);
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
