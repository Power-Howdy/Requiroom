import { chromium, type Browser, type BrowserContext } from "playwright-core";
import { BROWSER_UA } from "./safety";

export type BrowserFetchResult = {
  url: string;
  status: number;
  contentType: string;
  body: Buffer;
  setCookies: string[];
  /** Cookie header suitable for a follow-up plain fetch */
  cookieHeader: string;
};

let browserPromise: Promise<Browser> | null = null;
let browserBusy = false;
let availabilityCache: { ok: boolean; at: number } | null = null;

/** Serialize Chromium jobs instead of skipping when busy. */
let chain: Promise<unknown> = Promise.resolve();

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    const launchOnce = async () => {
      const common = {
        headless: true as const,
        args: [
          "--disable-blink-features=AutomationControlled",
          "--no-sandbox",
          "--disable-dev-shm-usage",
          "--disable-features=IsolateOrigins,site-per-process",
        ],
      };
      // Prefer system Chrome when present — often clears CF more reliably than bundled Chromium.
      try {
        return await chromium.launch({ ...common, channel: "chrome" });
      } catch {
        try {
          return await chromium.launch({ ...common, channel: "msedge" });
        } catch {
          return await chromium.launch(common);
        }
      }
    };
    browserPromise = withTimeout(launchOnce(), 30_000, "chromium launch").catch((e) => {
      browserPromise = null;
      throw e;
    });
  }
  return browserPromise;
}

function parseCookieHeader(cookieHeader: string | null, pageUrl: string) {
  if (!cookieHeader) {
    return [] as Array<{
      name: string;
      value: string;
      domain: string;
      path: string;
    }>;
  }
  let host = "localhost";
  try {
    host = new URL(pageUrl).hostname;
  } catch {
    /* ignore */
  }
  return cookieHeader
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((pair) => {
      const i = pair.indexOf("=");
      if (i <= 0) return null;
      return {
        name: pair.slice(0, i).trim(),
        value: pair.slice(i + 1).trim(),
        domain: host,
        path: "/",
      };
    })
    .filter(Boolean) as Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
  }>;
}

function cookieToSetCookieHeader(c: {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}): string {
  const parts = [`${c.name}=${c.value}`, `Path=${c.path || "/"}`, `Domain=${c.domain}`];
  if (c.expires && c.expires > 0) parts.push(`Expires=${new Date(c.expires * 1000).toUTCString()}`);
  if (c.httpOnly) parts.push("HttpOnly");
  if (c.secure) parts.push("Secure");
  if (c.sameSite) parts.push(`SameSite=${c.sameSite}`);
  return parts.join("; ");
}

/**
 * Active Cloudflare interstitial only — not residual "challenge-platform"
 * strings that remain on cleared pages (e.g. Upwork).
 */
export function isActiveChallengeHtml(html: string, title?: string): boolean {
  const h = html.slice(0, 120_000);
  const t = (title || "").trim();
  if (/^just a moment/i.test(t)) return true;
  if (/^challenge\b/i.test(t)) return true;
  if (/cf_chl_opt/i.test(h)) return true;
  if (/challenge-error-text/i.test(h)) return true;
  if (/cType:\s*['"]managed['"]/i.test(h)) return true;
  if (/cf-browser-verification/i.test(h)) return true;
  if (/Enable JavaScript and cookies to continue/i.test(h) && /cdn-cgi/i.test(h)) return true;
  return false;
}

function looksLikeCloudflareResponse(status: number, headers: Headers, html?: string): boolean {
  const mitigated = (headers.get("cf-mitigated") || "").toLowerCase();
  if (mitigated.includes("challenge")) return true;
  if (html && isActiveChallengeHtml(html)) return true;
  if ((status === 403 || status === 503) && headers.get("cf-ray")) return true;
  if ((status === 403 || status === 503) && /cloudflare/i.test(headers.get("server") || "")) {
    return true;
  }
  return false;
}

export { looksLikeCloudflareResponse };

async function fetchDocumentWithBrowserInner(
  targetUrl: string,
  cookieHeader: string | null,
): Promise<BrowserFetchResult> {
  const browser = await getBrowser();
  let context: BrowserContext | null = null;
  try {
    context = await browser.newContext({
      userAgent: BROWSER_UA,
      locale: "en-US",
      viewport: { width: 1365, height: 900 },
      javaScriptEnabled: true,
      ignoreHTTPSErrors: true,
    });
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav = navigator as any;
      if (!nav.chrome) nav.chrome = { runtime: {} };
      Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
    });

    const initialCookies = parseCookieHeader(cookieHeader, targetUrl);
    if (initialCookies.length) {
      await context.addCookies(initialCookies);
    }

    const page = await context.newPage();
    let response = await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });

    const deadline = Date.now() + 50_000;
    let hasClearance = false;
    while (Date.now() < deadline) {
      const title = await page.title().catch(() => "");
      const htmlProbe = await page.content().catch(() => "");
      const cookies = await context.cookies();
      hasClearance = cookies.some((c) => c.name.toLowerCase() === "cf_clearance");

      if (!isActiveChallengeHtml(htmlProbe, title)) break;

      if (hasClearance) {
        // Interstitial can linger in DOM after clearance — reload with cookies.
        response =
          (await page
            .goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30_000 })
            .catch(() => response)) || response;
        const title2 = await page.title().catch(() => "");
        const html2 = await page.content().catch(() => "");
        if (!isActiveChallengeHtml(html2, title2)) break;
        // Clearance alone is enough — caller will cookie-refetch a clean document.
        break;
      }
      await page.waitForTimeout(800);
    }

    await page.waitForLoadState("networkidle", { timeout: 6_000 }).catch(() => {});

    const finalUrl = page.url();
    const title = await page.title().catch(() => "");
    let html = await page.content();
    const cookies = await context.cookies();
    hasClearance = cookies.some((c) => c.name.toLowerCase() === "cf_clearance");

    if (isActiveChallengeHtml(html, title) && !hasClearance) {
      throw new Error("Cloudflare challenge did not clear in Chromium");
    }

    // Prefer empty placeholder body when still interstitial — route will refetch with cookies
    if (isActiveChallengeHtml(html, title) && hasClearance) {
      html = "<!DOCTYPE html><html><head><title>Loading</title></head><body></body></html>";
    }

    const host = new URL(finalUrl).hostname;
    const relevant = cookies.filter((c) => {
      const d = c.domain.replace(/^\./, "");
      return host === d || host.endsWith("." + d);
    });

    const setCookies = relevant.map((c) =>
      cookieToSetCookieHeader({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expires: c.expires > 0 ? c.expires : undefined,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite:
          c.sameSite === "None" || c.sameSite === "Lax" || c.sameSite === "Strict" ? c.sameSite : "Lax",
      }),
    );

    const cookieHeaderOut = relevant.map((c) => `${c.name}=${c.value}`).join("; ");

    return {
      url: finalUrl,
      status: response?.status() || 200,
      contentType: "text/html; charset=utf-8",
      body: Buffer.from(html, "utf8"),
      setCookies,
      cookieHeader: cookieHeaderOut,
    };
  } finally {
    await context?.close().catch(() => {});
  }
}

/**
 * Fetch a document with Chromium so Cloudflare managed challenges can complete.
 * Jobs are queued so concurrent navigations do not skip the solver.
 */
export function fetchDocumentWithBrowser(
  targetUrl: string,
  cookieHeader: string | null,
): Promise<BrowserFetchResult> {
  const job = chain.then(async () => {
    browserBusy = true;
    try {
      return await fetchDocumentWithBrowserInner(targetUrl, cookieHeader);
    } finally {
      browserBusy = false;
    }
  });
  chain = job.then(
    () => undefined,
    () => undefined,
  );
  return job;
}

export async function isBrowserFetchAvailable(): Promise<boolean> {
  if (process.env.RQ_BROWSER_FETCH === "0") return false;
  const now = Date.now();
  // Only cache successes briefly; always retry after failures
  if (availabilityCache?.ok && now - availabilityCache.at < 120_000) {
    return true;
  }
  try {
    await getBrowser();
    availabilityCache = { ok: true, at: now };
    return true;
  } catch (e) {
    console.warn("[proxy] chromium unavailable:", e);
    browserPromise = null;
    availabilityCache = { ok: false, at: now };
    return false;
  }
}
