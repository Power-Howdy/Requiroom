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
<div class="note"><strong>Note:</strong> Sites that send <code>X-Frame-Options</code> or strict <code>frame-ancestors</code> CSP will refuse to embed here. A same-origin browse proxy is retired for now and may return later.</div>
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
