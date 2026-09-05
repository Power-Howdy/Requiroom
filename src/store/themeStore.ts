"use client";

import { create } from "zustand";
import { applyTheme } from "@/theme/applyTheme";
import { DEFAULT_THEME, type ThemeConfig } from "@/theme/tokens";
import { idbGet, idbSet } from "@/lib/idb";

interface ThemeState extends ThemeConfig {
  ready: boolean;
  init: () => Promise<void>;
  setTheme: (partial: Partial<ThemeConfig>) => void;
  reset: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  ...DEFAULT_THEME,
  ready: false,

  init: async () => {
    const saved = await idbGet<ThemeConfig>("theme", "config");
    const theme = saved ? { ...DEFAULT_THEME, ...saved } : DEFAULT_THEME;
    set({ ...theme, ready: true });
    if (typeof document !== "undefined") applyTheme(theme);
  },

  setTheme: (partial) => {
    const next = { ...get(), ...partial };
    const config: ThemeConfig = {
      fontFamily: next.fontFamily,
      fontSize: next.fontSize,
      primary: next.primary,
      secondary: next.secondary,
      iconStyle: next.iconStyle,
      look: next.look,
      stylePreset: next.stylePreset,
      wallpaper: next.wallpaper,
    };
    set(config);
    applyTheme(config);
    void idbSet("theme", "config", config);
  },

  reset: () => {
    set({ ...DEFAULT_THEME });
    applyTheme(DEFAULT_THEME);
    void idbSet("theme", "config", DEFAULT_THEME);
  },
}));
