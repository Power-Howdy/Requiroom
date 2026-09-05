"use client";

let registering: Promise<ServiceWorkerRegistration | null> | null = null;

export function registerBrowserServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }
  if (!registering) {
    registering = navigator.serviceWorker
      .register("/rq-browser-sw.js", { scope: "/" })
      .then((reg) => {
        void navigator.serviceWorker.ready;
        return reg;
      })
      .catch((err) => {
        console.warn("Requiroom browser SW failed", err);
        return null;
      });
  }
  return registering;
}

export async function clearBrowserData(what: "cookies" | "cache" | "all" = "all") {
  await registerBrowserServiceWorker();
  const ready = await navigator.serviceWorker.ready;
  const type =
    what === "cookies" ? "rq-clear-cookies" : what === "cache" ? "rq-clear-cache" : "rq-clear-all";
  ready.active?.postMessage({ type });
}
