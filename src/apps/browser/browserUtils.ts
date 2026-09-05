export const BROWSER_HOME = "about:home";

const START_LINKS = [
  { href: "https://free-dev-tools.com/", label: "DevToolBox" },
  { href: "https://text-tools-iota.vercel.app/", label: "TextTools" },
  { href: "https://image-tools-blue-eta.vercel.app/", label: "ImageTools" },
  { href: "https://severus.guru/", label: "Severus" },
] as const;

export function browserHomeHtml(): string {
  const links = START_LINKS.map((l) => `<a href="${l.href}">${l.label}</a>`).join(
    "\n",
  );

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Requiroom Start</title>
<style>
body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:40px}
h1{font-size:28px;margin:0 0 8px}p{opacity:.8;max-width:42rem;line-height:1.5}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-top:24px}
a{display:block;padding:16px;background:#1e293b;border-radius:12px;color:#93c5fd;text-decoration:none}
a:hover{background:#334155}
.note{margin-top:32px;padding:16px;background:#1e293b;border-radius:12px;font-size:14px;opacity:.85;max-width:42rem;line-height:1.45}
</style></head><body>
<h1>Requiroom Start</h1>
<p>Direct browsing — pages load in this frame from their own origin (same as a normal browser iframe).</p>
<div class="grid">
${links}
</div>
<div class="note"><strong>Note:</strong> Sites like GitHub that send <code>X-Frame-Options</code> or strict <code>frame-ancestors</code> CSP cannot load in this frame — use <strong>Open in system browser</strong> in the toolbar.</div>
<script>
document.addEventListener("click", function (e) {
  var a = e.target && e.target.closest && e.target.closest("a[href]");
  if (!a) return;
  var href = a.getAttribute("href");
  if (!href || href.charAt(0) === "#") return;
  e.preventDefault();
  try {
    parent.postMessage({ type: "requiroom:navigate", url: href }, "*");
  } catch (err) {}
});
</script>
</body></html>`;
}

/** Iframe `src` for a tab URL — direct navigation (no `/api/proxy`). */
export function frameSrc(url: string): string {
  if (url === BROWSER_HOME || url.startsWith("about:")) {
    return `data:text/html;charset=utf-8,${encodeURIComponent(browserHomeHtml())}`;
  }
  return url;
}

export function normalizeBrowseUrl(raw: string): string {
  const url = raw.trim();
  if (!url) return BROWSER_HOME;
  if (url === "about:home" || url === "home") return BROWSER_HOME;
  if (!/^https?:\/\//i.test(url) && !url.startsWith("about:")) {
    if (looksLikeHostname(url)) return `https://${url}`;
    return searchUrlForQuery(url, "duckduckgo");
  }
  return url;
}

/** Bare hostnames like `example.com` — not search phrases. */
function looksLikeHostname(raw: string): boolean {
  if (raw.includes(" ") || raw.includes("://")) return false;
  // require a dot and no path-like junk without scheme
  if (!/^[a-z0-9.-]+\.[a-z]{2,}([/:].*)?$/i.test(raw)) return false;
  return true;
}

export type SearchEngine = "duckduckgo" | "google" | "bing";

export function searchUrlForQuery(query: string, engine: SearchEngine = "duckduckgo"): string {
  const q = encodeURIComponent(query.trim());
  switch (engine) {
    case "google":
      return `https://www.google.com/search?q=${q}`;
    case "bing":
      return `https://www.bing.com/search?q=${q}`;
    default:
      return `https://duckduckgo.com/?q=${q}`;
  }
}

/** Extract omnibox/search query from a search-engine results URL, if any. */
export function extractSearchQuery(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "duckduckgo.com" || host.endsWith(".duckduckgo.com")) {
      return u.searchParams.get("q");
    }
    if (host === "google.com" || host.endsWith(".google.com")) {
      if (u.pathname === "/search") return u.searchParams.get("q");
    }
    if (host === "bing.com" || host.endsWith(".bing.com")) {
      if (u.pathname === "/search") return u.searchParams.get("q");
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function isSearchResultsUrl(url: string): boolean {
  return extractSearchQuery(url) !== null;
}

export function displayAddressForUrl(url: string): string {
  if (url === BROWSER_HOME || url.startsWith("about:")) return "";
  const q = extractSearchQuery(url);
  if (q !== null) return q;
  return url;
}

/** Hosts that commonly send X-Frame-Options / frame-ancestors blocking iframes. */
const FRAME_BLOCK_SUFFIXES = [
  "github.com",
  "githubusercontent.com",
  "google.com",
  "youtube.com",
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "reddit.com",
  "microsoft.com",
  "live.com",
  "office.com",
  "apple.com",
  "amazon.com",
  "netflix.com",
  "discord.com",
  "slack.com",
  "notion.so",
  "duckduckgo.com",
  "bing.com",
];

/** True when the site is very likely to refuse iframe embedding. */
export function likelyBlocksFraming(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
    return FRAME_BLOCK_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
}

export function openInSystemBrowser(url: string) {
  if (!url || url === BROWSER_HOME || url.startsWith("about:") || url.startsWith("data:")) return;
  window.open(url, "_blank", "noopener,noreferrer");
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
  const q = extractSearchQuery(url);
  if (q) return q.length > 40 ? `${q.slice(0, 37)}…` : q;
  return url.replace(/^https?:\/\//, "").slice(0, 40);
}
