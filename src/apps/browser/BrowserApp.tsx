"use client";

import { useEffect, useState } from "react";
import { useWindowStore } from "@/store/windowStore";
import { useNotifStore } from "@/store/notifStore";
import { AppShell } from "@/components/ui";
import { BrowserChrome } from "./BrowserChrome";
import { FrameBlockedView } from "./FrameBlockedView";
import { SearchView } from "./SearchView";
import {
  BROWSER_HOME,
  createHomeTab,
  displayAddressForUrl,
  extractSearchQuery,
  frameSrc,
  isSearchResultsUrl,
  likelyBlocksFraming,
  normalizeBrowseUrl,
  openInSystemBrowser,
  searchUrlForQuery,
  tabTitleFromUrl,
  type BrowserTab,
  type SearchEngine,
} from "./browserUtils";

function pushUrl(tab: BrowserTab, url: string): BrowserTab {
  const history = tab.history.slice(0, tab.histIdx + 1).concat(url);
  return {
    ...tab,
    url,
    title: tabTitleFromUrl(url),
    history,
    histIdx: history.length - 1,
  };
}

export function BrowserApp({ windowId }: { windowId: string }) {
  const updateTitle = useWindowStore((s) => s.updateTitle);
  const notify = useNotifStore((s) => s.notify);
  const [tabs, setTabs] = useState<BrowserTab[]>([createHomeTab()]);
  const [activeId, setActiveId] = useState(() => tabs[0].id);
  /** While typing in the omnibox; `null` means show the active tab URL. */
  const [addressDraft, setAddressDraft] = useState<string | null>(null);
  const [frameNonce, setFrameNonce] = useState(0);

  const active = tabs.find((t) => t.id === activeId) || tabs[0];
  const address =
    addressDraft !== null ? addressDraft : displayAddressForUrl(active.url);
  const searchQuery = extractSearchQuery(active.url);
  const isSearch = isSearchResultsUrl(active.url);
  const frameBlocked =
    !isSearch &&
    active.url !== BROWSER_HOME &&
    !active.url.startsWith("about:") &&
    likelyBlocksFraming(active.url);

  useEffect(() => {
    updateTitle(windowId, `Browser — ${active?.title || "New Tab"}`);
  }, [active, windowId, updateTitle]);

  const navigate = (raw: string) => {
    const url = normalizeBrowseUrl(raw);
    setTabs((prev) => prev.map((t) => (t.id === activeId ? pushUrl(t, url) : t)));
    setAddressDraft(null);
    setFrameNonce((n) => n + 1);
    // Sites/search engines that refuse iframes — open in the system browser from this gesture.
    if (isSearchResultsUrl(url) || likelyBlocksFraming(url)) {
      openInSystemBrowser(url);
    }
  };

  const openSearchExternal = (engine: SearchEngine) => {
    const q = searchQuery || address.trim();
    if (!q) return;
    const url = searchUrlForQuery(q, engine);
    setTabs((prev) => prev.map((t) => (t.id === activeId ? pushUrl(t, url) : t)));
    setAddressDraft(null);
    openInSystemBrowser(url);
  };

  useEffect(() => {
    const onNavigateEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ windowId: string; url: string }>).detail;
      if (!detail || detail.windowId !== windowId) return;
      navigate(detail.url);
    };
    const onFrameMessage = (e: MessageEvent) => {
      const data = e.data;
      if (!data || data.type !== "requiroom:navigate" || typeof data.url !== "string") return;
      navigate(data.url);
    };
    window.addEventListener("requiroom:navigate", onNavigateEvent);
    window.addEventListener("message", onFrameMessage);
    return () => {
      window.removeEventListener("requiroom:navigate", onNavigateEvent);
      window.removeEventListener("message", onFrameMessage);
    };
    // navigate closes over activeId — rebind when the active tab changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowId, activeId]);

  const stepHistory = (delta: number) => {
    const tab = tabs.find((t) => t.id === activeId);
    if (!tab) return;
    const histIdx = tab.histIdx + delta;
    if (histIdx < 0 || histIdx >= tab.history.length) return;
    const url = tab.history[histIdx];
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeId ? { ...t, histIdx, url, title: tabTitleFromUrl(url) } : t,
      ),
    );
    setAddressDraft(null);
    setFrameNonce((n) => n + 1);
  };

  const syncAddressFromFrame = (iframe: HTMLIFrameElement) => {
    try {
      const href = iframe.contentWindow?.location.href;
      if (!href || href === "about:blank") return;
      if (href.startsWith("data:")) return;
      const url = normalizeBrowseUrl(href);
      if (url === active.url) return;
      setTabs((prev) =>
        prev.map((t) => (t.id === activeId ? pushUrl(t, url) : t)),
      );
      setAddressDraft(null);
    } catch {
      /* cross-origin — keep the URL we navigated to */
    }
  };

  const openExternal = () => {
    const url = active.url === BROWSER_HOME ? address : active.url;
    if (!url || url === BROWSER_HOME) return;
    openInSystemBrowser(normalizeBrowseUrl(url));
  };

  return (
    <AppShell className="bg-[#0f172a]">
      <BrowserChrome
        tabs={tabs}
        activeId={activeId}
        address={address}
        canBack={active.histIdx > 0}
        canForward={active.histIdx < active.history.length - 1}
        canOpenExternal={!!address && active.url !== BROWSER_HOME}
        onSelectTab={(id) => {
          setActiveId(id);
          setAddressDraft(null);
        }}
        onCloseTab={(id) => {
          const next = tabs.filter((x) => x.id !== id);
          setTabs(next);
          if (activeId === id) {
            setActiveId(next[0].id);
            setAddressDraft(null);
          }
        }}
        onNewTab={() => {
          const tab = createHomeTab();
          setTabs((t) => [...t, tab]);
          setActiveId(tab.id);
          setAddressDraft(null);
        }}
        onBack={() => stepHistory(-1)}
        onForward={() => stepHistory(1)}
        onReload={() => {
          setFrameNonce((n) => n + 1);
          if (active.url !== BROWSER_HOME) navigate(active.url);
        }}
        onOpenExternal={openExternal}
        onAddressChange={setAddressDraft}
        onNavigate={() => navigate(address || BROWSER_HOME)}
      />
      {isSearch ? (
        <SearchView
          query={searchQuery || ""}
          onSearchExternal={openSearchExternal}
          onGoHome={() => navigate(BROWSER_HOME)}
        />
      ) : frameBlocked ? (
        <FrameBlockedView
          url={active.url}
          onOpenExternal={openExternal}
          onGoHome={() => navigate(BROWSER_HOME)}
        />
      ) : (
        <iframe
          key={`${active.url}-${active.id}-${frameNonce}`}
          title={active.title}
          src={frameSrc(active.url)}
          className="flex-1 w-full bg-white border-0"
          sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads"
          referrerPolicy="no-referrer-when-downgrade"
          onLoad={(e) => syncAddressFromFrame(e.currentTarget)}
          onError={() =>
            notify({
              title: "Browser error",
              body: `Failed to load ${active.url}`,
              level: "error",
              appId: "browser",
              windowId,
            })
          }
        />
      )}
    </AppShell>
  );
}

export function navigateBrowserWindow(windowId: string, url: string) {
  window.dispatchEvent(new CustomEvent("requiroom:navigate", { detail: { windowId, url } }));
}
