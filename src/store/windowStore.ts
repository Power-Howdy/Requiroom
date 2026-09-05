"use client";

import { create } from "zustand";
import { idbGet, idbSet } from "@/lib/idb";

export type AppId =
  | "browser"
  | "files"
  | "shell"
  | "editor"
  | "notes"
  | "excel"
  | "settings"
  | "assistant";

export type WindowState = "normal" | "minimized" | "maximized";

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WindowRecord {
  id: string;
  appId: AppId;
  title: string;
  bounds: Bounds;
  restoreBounds?: Bounds;
  state: WindowState;
  z: number;
  payload?: Record<string, unknown>;
}

interface WindowStore {
  windows: WindowRecord[];
  focusedId: string | null;
  nextZ: number;
  startOpen: boolean;
  notifOpen: boolean;
  init: () => Promise<void>;
  openApp: (appId: AppId, title?: string, payload?: Record<string, unknown>) => string;
  focus: (id: string) => void;
  close: (id: string) => void;
  minimize: (id: string) => void;
  toggleMaximize: (id: string) => void;
  move: (id: string, bounds: Partial<Bounds>) => void;
  updateTitle: (id: string, title: string) => void;
  updatePayload: (id: string, payload: Record<string, unknown>) => void;
  setStartOpen: (v: boolean) => void;
  setNotifOpen: (v: boolean) => void;
  cycleFocus: () => void;
}

const DEFAULT_SIZE: Record<AppId, Pick<Bounds, "w" | "h">> = {
  browser: { w: 900, h: 560 },
  files: { w: 780, h: 500 },
  shell: { w: 720, h: 420 },
  editor: { w: 860, h: 540 },
  notes: { w: 700, h: 480 },
  excel: { w: 880, h: 520 },
  settings: { w: 640, h: 520 },
  assistant: { w: 400, h: 480 },
};

const FALLBACK_TASKBAR_H = 48;

function taskbarHeightPx(): number {
  if (typeof window === "undefined") return FALLBACK_TASKBAR_H;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--os-taskbar-h").trim();
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : FALLBACK_TASKBAR_H;
}

/** Center in the desktop (viewport minus taskbar), with a light cascade for duplicates. */
function centeredBounds(appId: AppId, cascadeIndex: number): Bounds {
  const size = DEFAULT_SIZE[appId];
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const taskbar = taskbarHeightPx();
  const deskH = Math.max(200, vh - taskbar);
  const w = Math.min(size.w, Math.max(320, vw - 40));
  const h = Math.min(size.h, Math.max(200, deskH - 40));
  const cascade = (cascadeIndex % 8) * 24;
  let x = Math.round((vw - w) / 2) + cascade;
  let y = Math.round((deskH - h) / 2) + cascade;
  x = Math.max(0, Math.min(x, vw - Math.min(w, 320)));
  y = Math.max(0, Math.min(y, deskH - Math.min(h, 200)));
  return { x, y, w, h };
}

export const APP_META: Record<
  AppId,
  { title: string; icon: string; color: string }
> = {
  browser: { title: "Browser", icon: "globe", color: "#3b82f6" },
  files: { title: "Files", icon: "folder", color: "#f59e0b" },
  shell: { title: "Terminal", icon: "terminal", color: "#10b981" },
  editor: { title: "Editor", icon: "code", color: "#8b5cf6" },
  notes: { title: "Notes", icon: "file-text", color: "#06b6d4" },
  excel: { title: "Sheets", icon: "table", color: "#22c55e" },
  settings: { title: "Settings", icon: "settings", color: "#94a3b8" },
  assistant: { title: "Assistant", icon: "sparkles", color: "#ec4899" },
};

let idCounter = 0;
function uid() {
  idCounter += 1;
  return `win-${Date.now()}-${idCounter}`;
}

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  focusedId: null,
  nextZ: 10,
  startOpen: false,
  notifOpen: false,

  init: async () => {
    const saved = await idbGet<{ windows: WindowRecord[]; nextZ: number }>("windows", "layout");
    if (saved?.windows?.length) {
      set({
        windows: saved.windows.map((w) =>
          w.state === "minimized" ? w : { ...w, state: w.state === "maximized" ? "maximized" : "normal" },
        ),
        nextZ: saved.nextZ || 10,
        focusedId: saved.windows.find((w) => w.state !== "minimized")?.id ?? null,
      });
    }
  },

  openApp: (appId, title, payload) => {
    const { windows, nextZ } = get();
    const same = windows.filter((w) => w.appId === appId).length;
    const id = uid();
    const bounds = centeredBounds(appId, same);
    const record: WindowRecord = {
      id,
      appId,
      title: title || APP_META[appId].title,
      bounds,
      state: "normal",
      z: nextZ,
      payload,
    };
    const next = [...windows, record];
    set({ windows: next, focusedId: id, nextZ: nextZ + 1, startOpen: false });
    void idbSet("windows", "layout", { windows: next, nextZ: nextZ + 1 });
    return id;
  },

  focus: (id) => {
    const { windows, nextZ } = get();
    const next = windows.map((w) =>
      w.id === id ? { ...w, z: nextZ, state: w.state === "minimized" ? "normal" : w.state } : w,
    );
    set({ windows: next, focusedId: id, nextZ: nextZ + 1, startOpen: false, notifOpen: false });
    void idbSet("windows", "layout", { windows: next, nextZ: nextZ + 1 });
  },

  close: (id) => {
    const next = get().windows.filter((w) => w.id !== id);
    const focusedId = get().focusedId === id ? next[next.length - 1]?.id ?? null : get().focusedId;
    set({ windows: next, focusedId });
    void idbSet("windows", "layout", { windows: next, nextZ: get().nextZ });
  },

  minimize: (id) => {
    const next = get().windows.map((w) => (w.id === id ? { ...w, state: "minimized" as const } : w));
    const focusedId = get().focusedId === id ? null : get().focusedId;
    set({ windows: next, focusedId });
    void idbSet("windows", "layout", { windows: next, nextZ: get().nextZ });
  },

  toggleMaximize: (id) => {
    const next = get().windows.map((w) => {
      if (w.id !== id) return w;
      if (w.state === "maximized") {
        return {
          ...w,
          state: "normal" as const,
          bounds: w.restoreBounds || w.bounds,
          restoreBounds: undefined,
        };
      }
      return {
        ...w,
        state: "maximized" as const,
        restoreBounds: w.bounds,
      };
    });
    set({ windows: next, focusedId: id });
    void idbSet("windows", "layout", { windows: next, nextZ: get().nextZ });
  },

  move: (id, bounds) => {
    const next = get().windows.map((w) =>
      w.id === id ? { ...w, bounds: { ...w.bounds, ...bounds } } : w,
    );
    set({ windows: next });
    void idbSet("windows", "layout", { windows: next, nextZ: get().nextZ });
  },

  updateTitle: (id, title) => {
    set({
      windows: get().windows.map((w) => (w.id === id ? { ...w, title } : w)),
    });
  },

  updatePayload: (id, payload) => {
    set({
      windows: get().windows.map((w) =>
        w.id === id ? { ...w, payload: { ...w.payload, ...payload } } : w,
      ),
    });
  },

  setStartOpen: (v) => set({ startOpen: v, notifOpen: v ? false : get().notifOpen }),
  setNotifOpen: (v) => set({ notifOpen: v, startOpen: v ? false : get().startOpen }),

  cycleFocus: () => {
    const visible = get()
      .windows.filter((w) => w.state !== "minimized")
      .sort((a, b) => a.z - b.z);
    if (!visible.length) return;
    const idx = visible.findIndex((w) => w.id === get().focusedId);
    const next = visible[(idx + 1) % visible.length];
    get().focus(next.id);
  },
}));
