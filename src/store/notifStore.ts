"use client";

import { create } from "zustand";
import { idbGet, idbSet } from "@/lib/idb";
import type { AppId } from "./windowStore";

export type NotifLevel = "info" | "success" | "warning" | "error";

export interface OsNotification {
  id: string;
  title: string;
  body: string;
  level: NotifLevel;
  appId?: AppId;
  windowId?: string;
  sticky?: boolean;
  read: boolean;
  createdAt: number;
}

interface NotifState {
  items: OsNotification[];
  toasts: OsNotification[];
  showToasts: boolean;
  init: () => Promise<void>;
  notify: (n: Omit<OsNotification, "id" | "read" | "createdAt">) => string;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  dismissToast: (id: string) => void;
  setShowToasts: (v: boolean) => void;
  unreadCount: () => number;
}

function nid() {
  return `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useNotifStore = create<NotifState>((set, get) => ({
  items: [],
  toasts: [],
  showToasts: true,

  init: async () => {
    const saved = await idbGet<{ items: OsNotification[]; showToasts: boolean }>(
      "notifications",
      "data",
    );
    if (saved) {
      set({ items: saved.items || [], showToasts: saved.showToasts ?? true });
    }
  },

  notify: (n) => {
    const item: OsNotification = {
      ...n,
      id: nid(),
      read: false,
      createdAt: Date.now(),
    };
    const items = [item, ...get().items].slice(0, 100);
    const toasts = get().showToasts ? [item, ...get().toasts].slice(0, 5) : get().toasts;
    set({ items, toasts });
    void idbSet("notifications", "data", { items, showToasts: get().showToasts });
    if (!item.sticky && get().showToasts) {
      setTimeout(() => get().dismissToast(item.id), 5000);
    }
    return item.id;
  },

  markRead: (id) => {
    const items = get().items.map((i) => (i.id === id ? { ...i, read: true } : i));
    set({ items });
    void idbSet("notifications", "data", { items, showToasts: get().showToasts });
  },

  markAllRead: () => {
    const items = get().items.map((i) => ({ ...i, read: true }));
    set({ items });
    void idbSet("notifications", "data", { items, showToasts: get().showToasts });
  },

  clearAll: () => {
    set({ items: [], toasts: [] });
    void idbSet("notifications", "data", { items: [], showToasts: get().showToasts });
  },

  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  setShowToasts: (v) => {
    set({ showToasts: v });
    void idbSet("notifications", "data", { items: get().items, showToasts: v });
  },

  unreadCount: () => get().items.filter((i) => !i.read).length,
}));
