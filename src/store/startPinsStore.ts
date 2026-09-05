"use client";

import { create } from "zustand";
import { idbGet, idbSet } from "@/lib/idb";
import { START_LINKS, type StartLink } from "@/apps/browser/browserUtils";

const STORAGE_KEY = "browser-start-pins";

function sameHref(a: string, b: string): boolean {
  return normalizePinHref(a) === normalizePinHref(b);
}

/** Stable comparison key for pin URLs. */
export function normalizePinHref(href: string): string {
  try {
    const u = new URL(href);
    u.hash = "";
    let path = u.pathname;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    return `${u.origin}${path === "/" ? "/" : path}${u.search}`;
  } catch {
    return href.trim();
  }
}

function hostLabel(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./i, "");
  } catch {
    return href;
  }
}

export function faviconForUrl(href: string): string {
  try {
    const host = new URL(href).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
  } catch {
    return "";
  }
}

/** Build a card from a URL (+ optional name), enriching via OG when possible. */
export async function buildStartLink(
  rawUrl: string,
  name?: string,
): Promise<StartLink> {
  const href = rawUrl.match(/^https?:\/\//i) ? rawUrl.trim() : `https://${rawUrl.trim()}`;
  const label = (name?.trim() || hostLabel(href)).slice(0, 80);
  let title = label;
  let description = `Pinned shortcut · ${hostLabel(href)}`;
  let image = faviconForUrl(href);

  try {
    const res = await fetch(`/api/og-meta?url=${encodeURIComponent(href)}`);
    if (res.ok) {
      const meta = (await res.json()) as {
        title?: string;
        description?: string;
        image?: string;
      };
      if (meta.title) title = name?.trim() ? label : meta.title;
      if (meta.description) description = meta.description;
      if (meta.image) image = meta.image;
    }
  } catch {
    /* keep fallbacks */
  }

  return {
    href,
    label,
    title,
    description: description.slice(0, 280),
    image,
  };
}

interface StartPinsState {
  pins: StartLink[];
  ready: boolean;
  init: () => Promise<void>;
  isPinned: (href: string) => boolean;
  pin: (link: StartLink) => void;
  unpin: (href: string) => void;
  update: (href: string, patch: Partial<StartLink>) => void;
  restoreDefaults: () => void;
}

function persist(pins: StartLink[]) {
  void idbSet("settings", STORAGE_KEY, pins);
}

function isRetiredDefaultPin(href: string): boolean {
  try {
    const host = new URL(href).hostname.replace(/^www\./i, "").toLowerCase();
    return host === "severus.guru";
  } catch {
    return false;
  }
}

export const useStartPinsStore = create<StartPinsState>((set, get) => ({
  pins: START_LINKS,
  ready: false,

  init: async () => {
    const saved = await idbGet<StartLink[]>("settings", STORAGE_KEY);
    if (Array.isArray(saved) && saved.length > 0) {
      const pins = saved.filter(
        (p) => p && typeof p.href === "string" && !isRetiredDefaultPin(p.href),
      );
      set({ pins, ready: true });
      if (pins.length !== saved.length) persist(pins);
    } else {
      set({ pins: START_LINKS, ready: true });
    }
  },

  isPinned: (href) => get().pins.some((p) => sameHref(p.href, href)),

  pin: (link) => {
    const href = link.href;
    if (!href || href.startsWith("about:")) return;
    const existing = get().pins;
    if (existing.some((p) => sameHref(p.href, href))) return;
    const pins = [...existing, link];
    set({ pins });
    persist(pins);
  },

  unpin: (href) => {
    const pins = get().pins.filter((p) => !sameHref(p.href, href));
    set({ pins });
    persist(pins);
  },

  update: (href, patch) => {
    const pins = get().pins.map((p) =>
      sameHref(p.href, href) ? { ...p, ...patch, href: patch.href ?? p.href } : p,
    );
    set({ pins });
    persist(pins);
  },

  restoreDefaults: () => {
    set({ pins: START_LINKS });
    persist(START_LINKS);
  },
}));
