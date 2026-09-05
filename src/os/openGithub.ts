"use client";

import { useWindowStore } from "@/store/windowStore";
import { siteConfig } from "@/lib/site";

/** Open (or focus) Browser and navigate to the Requiroom GitHub repo. */
export function openGithubInBrowser() {
  const store = useWindowStore.getState();
  const existing = store.windows.filter((w) => w.appId === "browser");
  let windowId: string;
  if (existing.length) {
    const top = [...existing].sort((a, b) => b.z - a.z)[0];
    store.focus(top.id);
    windowId = top.id;
  } else {
    windowId = store.openApp("browser", "GitHub — Requiroom");
  }
  window.setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent("requiroom:navigate", {
        detail: { windowId, url: siteConfig.githubUrl },
      }),
    );
  }, 50);
}
