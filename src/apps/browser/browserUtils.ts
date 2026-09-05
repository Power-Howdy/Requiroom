export const BROWSER_HOME = "about:home";

export type StartLink = {
  href: string;
  label: string;
  title: string;
  description: string;
  image: string;
};

/** Curated start destinations with Open Graph card metadata. */
export const START_LINKS: StartLink[] = [
  {
    href: "https://free-dev-tools.com/",
    label: "DevToolBox",
    title: "Online Dev Tools - Free Developer Utilities",
    description:
      "Free online developer tools: JSON formatter, JWT decoder, Base64 encoder, Unix timestamp converter, regex tester, and more.",
    image: "https://free-dev-tools.com/assets/image.png",
  },
  {
    href: "https://text-tools-iota.vercel.app/",
    label: "TextTools",
    title: "TextTools - Free Online Text Utilities",
    description: "Word counter, case converter, text sorter, and more. No sign-in required.",
    image: "https://text-tools-iota.vercel.app/opengraph-image.png",
  },
  {
    href: "https://image-tools-blue-eta.vercel.app/",
    label: "ImageTools",
    title: "ImageTools - Quick Image Utilities",
    description:
      "Free online image tools: compress, resize, crop, convert formats, remove background.",
    image: "https://image-tools-blue-eta.vercel.app/og-image.png",
  },
];

/** Iframe `src` for a remote tab URL (home is rendered in-app, not as data: HTML). */
export function frameSrc(url: string): string {
  if (url === BROWSER_HOME || url.startsWith("about:")) return "about:blank";
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
