"use client";

import { useEffect, useState } from "react";
import { Bell, Grid3X3, Sparkles } from "lucide-react";
import { AppIcon } from "./AppIcon";
import { GithubIcon } from "./GithubIcon";
import { APP_META, useWindowStore, type AppId } from "@/store/windowStore";
import { useNotifStore } from "@/store/notifStore";
import { openGithubInBrowser } from "./openGithub";
import { siteConfig } from "@/lib/site";

const LAUNCHERS: AppId[] = [
  "browser",
  "files",
  "shell",
  "editor",
  "notes",
  "excel",
  "settings",
  "assistant",
];

export function Taskbar() {
  const windows = useWindowStore((s) => s.windows);
  const focusedId = useWindowStore((s) => s.focusedId);
  const openApp = useWindowStore((s) => s.openApp);
  const focus = useWindowStore((s) => s.focus);
  const startOpen = useWindowStore((s) => s.startOpen);
  const setStartOpen = useWindowStore((s) => s.setStartOpen);
  const notifOpen = useWindowStore((s) => s.notifOpen);
  const setNotifOpen = useWindowStore((s) => s.setNotifOpen);
  const unread = useNotifStore((s) => s.items.filter((i) => !i.read).length);
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const openIds = new Set(windows.map((w) => w.appId));
  // Only show labeled chips for minimized windows (launchers already cover open apps)
  const minimized = windows.filter((w) => w.state === "minimized");

  const launchOrFocus = (id: AppId) => {
    const existing = windows.filter((w) => w.appId === id);
    if (existing.length) {
      const top = [...existing].sort((a, b) => b.z - a.z)[0];
      if (top.state === "minimized") focus(top.id);
      else if (top.id === focusedId) useWindowStore.getState().minimize(top.id);
      else focus(top.id);
    } else {
      openApp(id);
    }
  };

  return (
    <div className="os-taskbar fixed bottom-0 left-0 right-0 z-[9990] flex items-center gap-1 px-2">
      <button
        type="button"
        className={`os-task-btn ${startOpen ? "os-task-btn-active" : ""}`}
        onClick={() => setStartOpen(!startOpen)}
        aria-label="Start menu"
      >
        <Grid3X3 size={18} />
      </button>

      <div className="h-6 w-px bg-white/15 mx-1" />

      {LAUNCHERS.map((id) => (
        <button
          key={id}
          type="button"
          title={APP_META[id].title}
          className={`os-task-btn ${openIds.has(id) ? "os-task-btn-open" : ""} ${
            windows.some((w) => w.appId === id && w.id === focusedId) ? "os-task-btn-active" : ""
          }`}
          onClick={() => launchOrFocus(id)}
        >
          <AppIcon appId={id} size={18} />
        </button>
      ))}

      <div className="flex-1" />

      {minimized.map((w) => (
        <button
          key={w.id}
          type="button"
          className="os-task-window opacity-70"
          onClick={() => focus(w.id)}
          title={`Restore ${w.title}`}
        >
          <AppIcon appId={w.appId} size={14} />
          <span className="truncate max-w-[100px] text-xs">{w.title}</span>
        </button>
      ))}

      <button
        type="button"
        className="os-task-btn"
        onClick={openGithubInBrowser}
        aria-label="GitHub repository"
        title={`GitHub — ${siteConfig.githubUrl}`}
      >
        <GithubIcon size={18} />
      </button>

      <button
        type="button"
        className={`os-task-btn relative ${notifOpen ? "os-task-btn-active" : ""}`}
        onClick={() => setNotifOpen(!notifOpen)}
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--os-primary)] text-[10px] flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      <button
        type="button"
        className={`os-task-btn ${
          windows.some((w) => w.appId === "assistant" && w.id === focusedId)
            ? "os-task-btn-active"
            : ""
        }`}
        onClick={() => launchOrFocus("assistant")}
        aria-label="Assistant"
        title="Assistant (Ctrl+Space)"
      >
        <Sparkles size={18} />
      </button>

      <div className="os-clock px-2 text-sm tabular-nums">{clock}</div>
    </div>
  );
}
