import { chromium, type Browser, type BrowserContext } from "playwright-core";
import { BROWSER_UA } from "./safety";

export type BrowserFetchResult = {
  url: string;
  status: number;
  contentType: string;
  body: Buffer;
  setCookies: string[];
};

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-dev-shm-usage",
      ],
    });
  }
  return browserPromise;
}

function parseCookieHeader(cookieHeader: string | null, pageUrl: string) {
  if (!cookieHeader) return [] as Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
  }>;
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
    .filter(Boolean) as Array<{ name: string; value: string; domain: string; path: string }>;
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

function isChallengeHtml(html: string, title?: string): boolean {
  const h = html.slice(0, 100_000).toLowerCase();
  const t = (title || "").toLowerCase();
  return (
    t.includes("just a moment") ||
    t.includes("challenge") ||
    h.includes("cf_chl_opt") ||
    h.includes("challenge-platform") ||
    h.includes("cdn-cgi/challenge-platform") ||
    h.includes("cf-browser-verification")
  );
}

/**
 * Fetch a document with real Chromium so Cloudflare managed challenges can complete.
 * Returns final HTML + cookies after the challenge clears (or best-effort timeout).
 */
export async function fetchDocumentWithBrowser(
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
    });
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    const initialCookies = parseCookieHeader(cookieHeader, targetUrl);
    if (initialCookies.length) {
      await context.addCookies(initialCookies);
    }

    const page = await context.newPage();
    const response = await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });

    // Give managed / interactive challenges time to finish
    const deadline = Date.now() + 40_000;
    while (Date.now() < deadline) {
      const title = await page.title().catch(() => "");
      const htmlProbe = await page.content().catch(() => "");
      if (!isChallengeHtml(htmlProbe, title)) break;
      // clearance cookie often appears when done
      const cookies = await context.cookies();
      if (cookies.some((c) => c.name === "cf_clearance" || c.name === "cf_clearance".toLowerCase())) {
        await page.waitForTimeout(800);
        const title2 = await page.title().catch(() => "");
        const html2 = await page.content().catch(() => "");
        if (!isChallengeHtml(html2, title2)) break;
      }
      await page.waitForTimeout(1000);
    }

    // Prefer network idle briefly for SPA shells after CF
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});

    const finalUrl = page.url();
    const html = await page.content();
    const cookies = await context.cookies();
    const setCookies = cookies
      .filter((c) => {
        try {
          const host = new URL(finalUrl).hostname;
          return host === c.domain.replace(/^\./, "") || host.endsWith(c.domain.replace(/^\./, ""));
        } catch {
          return true;
        }
      })
      .map((c) =>
        cookieToSetCookieHeader({
          name: c.name,
          value: c.value,
          domain: c.domain,
          path: c.path,
          expires: c.expires > 0 ? c.expires : undefined,
          httpOnly: c.httpOnly,
          secure: c.secure,
          sameSite: c.sameSite === "None" || c.sameSite === "Lax" || c.sameSite === "Strict" ? c.sameSite : "Lax",
        }),
      );

    return {
      url: finalUrl,
      status: response?.status() || 200,
      contentType: "text/html; charset=utf-8",
      body: Buffer.from(html, "utf8"),
      setCookies,
    };
  } finally {
    await context?.close().catch(() => {});
  }
}

export function shouldUseBrowserFetch(req: Request, contentTypeHint?: string): boolean {
  if (process.env.RQ_BROWSER_FETCH === "0") return false;
  const dest = (req.headers.get("Sec-Fetch-Dest") || "").toLowerCase();
  const accept = (req.headers.get("Accept") || "").toLowerCase();
  const mode = (req.headers.get("Sec-Fetch-Mode") || "").toLowerCase();
  if (dest === "document" || dest === "iframe") return true;
  if (mode === "navigate" && accept.includes("text/html")) return true;
  if (contentTypeHint?.includes("text/html") && accept.includes("text/html")) return true;
  return false;
}

export async function isBrowserFetchAvailable(): Promise<boolean> {
  try {
    await getBrowser();
    return true;
  } catch {
    browserPromise = null;
    return false;
  }
}
