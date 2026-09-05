"use client";

import { useEffect, useState } from "react";
import { OsWindow } from "@/os/Window";
import { Taskbar } from "@/os/Taskbar";
import { StartMenu } from "@/os/StartMenu";
import { Toasts } from "@/os/Toasts";
import { NotificationCenter } from "@/os/NotificationCenter";
import { DesktopIcons } from "@/os/DesktopIcons";
import { AppBodyRouter } from "@/os/AppBodyRouter";
import { SplashScreen, type SplashPhase } from "@/os/SplashScreen";
import { OsDialogs } from "@/os/OsDialogs";
import { useWindowStore } from "@/store/windowStore";
import { useFsStore } from "@/store/fsStore";
import { useThemeStore } from "@/store/themeStore";
import { useNotifStore } from "@/store/notifStore";
import { useSettingsStore } from "@/store/settingsStore";
import { importHostFiles } from "@/fs/transfer";
import { registerBrowserServiceWorker } from "@/browser/registerSw";

const MIN_SPLASH_MS = 1800;
const SPLASH_FADE_MS = 450;

export function Desktop() {
  const windows = useWindowStore((s) => s.windows);
  const openApp = useWindowStore((s) => s.openApp);
  const setStartOpen = useWindowStore((s) => s.setStartOpen);
  const cycleFocus = useWindowStore((s) => s.cycleFocus);
  const initWindows = useWindowStore((s) => s.init);
  const initFs = useFsStore((s) => s.init);
  const initTheme = useThemeStore((s) => s.init);
  const initNotif = useNotifStore((s) => s.init);
  const initSettings = useSettingsStore((s) => s.init);
  const notify = useNotifStore((s) => s.notify);
  const [splash, setSplash] = useState<SplashPhase>("loading");

  useEffect(() => {
    void registerBrowserServiceWorker();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const started = performance.now();

    void (async () => {
      try {
        await Promise.all([
          initFs(),
          initTheme(),
          initNotif(),
          initSettings(),
          initWindows(),
          registerBrowserServiceWorker(),
        ]);
      } finally {
        if (cancelled) return;
        const elapsed = performance.now() - started;
        const wait = Math.max(0, MIN_SPLASH_MS - elapsed);
        if (wait) await new Promise((r) => setTimeout(r, wait));
        if (cancelled) return;
        setSplash("fading");
        window.setTimeout(() => {
          if (!cancelled) setSplash("done");
        }, SPLASH_FADE_MS);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initFs, initTheme, initNotif, initSettings, initWindows]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (splash !== "done") return;
      if (e.key === "Escape") setStartOpen(false);
      if (e.altKey && e.key === "Tab") {
        e.preventDefault();
        cycleFocus();
      }
      if ((e.ctrlKey || e.metaKey) && e.code === "Space") {
        e.preventDefault();
        openApp("assistant");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setStartOpen, cycleFocus, openApp, splash]);

  return (
    <div
      className="os-desktop fixed inset-0 z-0 overflow-hidden"
      onDragOver={(e) => e.preventDefault()}
      onDrop={async (e) => {
        e.preventDefault();
        if (splash !== "done") return;
        if (!e.dataTransfer.files?.length) return;
        const r = await importHostFiles(e.dataTransfer.files, "/home/user/Downloads");
        notify({
          title: "Files imported",
          body: `${r.imported} file(s) → /home/user/Downloads`,
          level: r.warned ? "warning" : "success",
          appId: "files",
        });
        openApp("files", "Files", { path: "/home/user/Downloads" });
      }}
    >
      <div className="absolute inset-0 os-wallpaper pointer-events-none" aria-hidden />
      <DesktopIcons />
      {windows.map((w) => (
        <OsWindow key={w.id} win={w}>
          <AppBodyRouter appId={w.appId} windowId={w.id} payload={w.payload} />
        </OsWindow>
      ))}
      <StartMenu />
      <NotificationCenter />
      <Taskbar />
      <Toasts />
      <OsDialogs />
      <SplashScreen phase={splash} />
    </div>
  );
}
