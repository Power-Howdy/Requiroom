import {
  FONT_FAMILY_CSS,
  FONT_SIZE_REM,
  STYLE_PRESET_VARS,
  type ThemeConfig,
} from "./tokens";

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `${r}, ${g}, ${b}`;
}

export function applyTheme(theme: ThemeConfig, root: HTMLElement = document.documentElement) {
  root.style.setProperty("--os-font", FONT_FAMILY_CSS[theme.fontFamily]);
  root.style.setProperty("--os-font-size", FONT_SIZE_REM[theme.fontSize]);
  root.style.setProperty("--os-primary", theme.primary);
  root.style.setProperty("--os-secondary", theme.secondary);
  root.style.setProperty("--os-primary-rgb", hexToRgb(theme.primary));
  root.style.setProperty("--os-secondary-rgb", hexToRgb(theme.secondary));

  const preset = STYLE_PRESET_VARS[theme.stylePreset];
  for (const [k, v] of Object.entries(preset)) {
    root.style.setProperty(k, v);
  }

  root.dataset.look = theme.look;
  root.dataset.style = theme.stylePreset;
  root.dataset.icons = theme.iconStyle;
  root.dataset.wallpaper = theme.wallpaper;
}
