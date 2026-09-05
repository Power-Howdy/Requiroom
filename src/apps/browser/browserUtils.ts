export const BROWSER_HOME = "about:home";

export function browserHomeHtml(): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Requiroom Start</title>
<style>
body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:40px}
h1{font-size:28px;margin:0 0 8px}p{opacity:.8}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-top:24px}
a{display:block;padding:16px;background:#1e293b;border-radius:12px;color:#93c5fd;text-decoration:none}
a:hover{background:#334155}
.note{margin-top:32px;padding:16px;background:#1e293b;border-radius:12px;font-size:14px;opacity:.85}
</style></head><body>
<h1>Requiroom Start</h1>
<p>Full proxied browsing — cookies, cache, and a Chromium engine for Cloudflare-protected pages. Sites see this host&apos;s IP.</p>
<div class="grid">
<a href="https://example.com">example.com</a>
<a href="https://wikipedia.org">Wikipedia</a>
<a href="https://api.ipify.org?format=json">What is my IP?</a>
<a href="https://httpbin.org/cookies/set?requiroom=1">Set a cookie</a>
</div>
<div class="note"><strong>Session:</strong> Cookies and HTTP cache are stored locally (IndexedDB / Cache API). Use Clear data in the toolbar to wipe them. Sites see this host&apos;s IP. Private/local URLs are blocked.</div>
</body></html>`;
}

export function frameSrc(url: string): string {
  if (url === BROWSER_HOME || url.startsWith("about:")) {
    return `data:text/html;charset=utf-8,${encodeURIComponent(browserHomeHtml())}`;
  }
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}

export function normalizeBrowseUrl(raw: string): string {
  let url = raw.trim();
  if (!url) return BROWSER_HOME;
  if (url === "about:home" || url === "home") return BROWSER_HOME;
  if (!/^https?:\/\//i.test(url) && !url.startsWith("about:")) {
    if (url.includes(".") && !url.includes(" ")) return `https://${url}`;
    return `https://duckduckgo.com/?q=${encodeURIComponent(url)}`;
  }
  return url;
}

export function newTabId() {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export interface BrowserTab {
  id: string;
  title: string;
  url: string;
  history: string[];
  histIdx: number;
}

export function createHomeTab(): BrowserTab {
  const id = newTabId();
  return { id, title: "Start", url: BROWSER_HOME, history: [BROWSER_HOME], histIdx: 0 };
}

export function tabTitleFromUrl(url: string): string {
  if (url === BROWSER_HOME) return "Start";
  return url.replace(/^https?:\/\//, "").slice(0, 40);
}
