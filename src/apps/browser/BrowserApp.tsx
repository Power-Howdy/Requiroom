"use client";

import { useEffect, useState } from "react";
import { useWindowStore } from "@/store/windowStore";
import { useNotifStore } from "@/store/notifStore";
import { AppShell } from "@/components/ui";
import { clearBrowserData, registerBrowserServiceWorker } from "@/browser/registerSw";
import { BrowserChrome } from "./BrowserChrome";
import {
  BROWSER_HOME,
  createHomeTab,
  frameSrc,
  normalizeBrowseUrl,
  tabTitleFromUrl,
  type BrowserTab,
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
  const [address, setAddress] = useState("");
  const [frameNonce, setFrameNonce] = useState(0);
  const [swReady, setSwReady] = useState(false);

  const active = tabs.find((t) => t.id === activeId) || tabs[0];

  useEffect(() => {
    void registerBrowserServiceWorker().then((reg) => setSwReady(!!reg));
  }, []);

  useEffect(() => {
    setAddress(active?.url === BROWSER_HOME ? "" : active?.url || "");
    updateTitle(windowId, `Browser — ${active?.title || "New Tab"}`);
  }, [active, windowId, updateTitle]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ windowId: string; url: string }>).detail;
      if (!detail || detail.windowId !== windowId) return;
      setTabs((prev) =>
        prev.map((t) => (t.id === activeId ? pushUrl(t, detail.url) : t)),
      );
    };
    window.addEventListener("requiroom:navigate", handler);
    return () => window.removeEventListener("requiroom:navigate", handler);
  }, [windowId, activeId]);

  const navigate = (raw: string) => {
    const url = normalizeBrowseUrl(raw);
    setTabs((prev) => prev.map((t) => (t.id === activeId ? pushUrl(t, url) : t)));
    setFrameNonce((n) => n + 1);
  };

  const stepHistory = (delta: number) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== activeId) return t;
        const histIdx = t.histIdx + delta;
        if (histIdx < 0 || histIdx >= t.history.length) return t;
        const url = t.history[histIdx];
        return { ...t, histIdx, url, title: tabTitleFromUrl(url) };
      }),
    );
    setFrameNonce((n) => n + 1);
  };

  return (
    <AppShell className="bg-[#0f172a]">
      <BrowserChrome
        tabs={tabs}
        activeId={activeId}
        address={address}
        canBack={active.histIdx > 0}
        canForward={active.histIdx < active.history.length - 1}
        onSelectTab={setActiveId}
        onCloseTab={(id) => {
          const next = tabs.filter((x) => x.id !== id);
          setTabs(next);
          if (activeId === id) setActiveId(next[0].id);
        }}
        onNewTab={() => {
          const tab = createHomeTab();
          setTabs((t) => [...t, tab]);
          setActiveId(tab.id);
        }}
        onBack={() => stepHistory(-1)}
        onForward={() => stepHistory(1)}
        onReload={() => {
          setFrameNonce((n) => n + 1);
          if (active.url !== BROWSER_HOME) navigate(active.url);
        }}
        onAddressChange={setAddress}
        onNavigate={() => navigate(address || BROWSER_HOME)}
        onClearData={async () => {
          await clearBrowserData("all");
          setFrameNonce((n) => n + 1);
          notify({
            title: "Browsing data cleared",
            body: "Cookies and HTTP cache removed.",
            level: "success",
            appId: "browser",
            windowId,
          });
        }}
      />
      {!swReady && (
        <div className="px-3 py-1 text-[11px] text-amber-200/90 bg-amber-500/10 border-b border-amber-500/20">
          Starting browser session (cookies & cache)…
        </div>
      )}
      <iframe
        key={`${active.url}-${active.id}-${frameNonce}`}
        title={active.title}
        src={frameSrc(active.url)}
        className="flex-1 w-full bg-white border-0"
        sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads"
        referrerPolicy="no-referrer-when-downgrade"
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
    </AppShell>
  );
}

export function navigateBrowserWindow(windowId: string, url: string) {
  window.dispatchEvent(new CustomEvent("requiroom:navigate", { detail: { windowId, url } }));
}
