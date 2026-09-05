export type FontFamily = "inter" | "system" | "serif" | "mono" | "display";
export type FontSize = "small" | "medium" | "large" | "xlarge";
export type IconStyle = "outline" | "filled" | "duotone";
export type DepthLook = "2d" | "3d";
export type StylePreset = "classic" | "modern" | "compact" | "glass";

export type { WallpaperId } from "./wallpapers";
export { DEFAULT_WALLPAPER, WALLPAPERS } from "./wallpapers";
import type { WallpaperId } from "./wallpapers";
import { DEFAULT_WALLPAPER } from "./wallpapers";

export interface ThemeConfig {
  fontFamily: FontFamily;
  fontSize: FontSize;
  primary: string;
  secondary: string;
  iconStyle: IconStyle;
  look: DepthLook;
  stylePreset: StylePreset;
  wallpaper: WallpaperId;
}

export const DEFAULT_THEME: ThemeConfig = {
  fontFamily: "inter",
  fontSize: "medium",
  primary: "#3b82f6",
  secondary: "#8b5cf6",
  iconStyle: "outline",
  look: "3d",
  stylePreset: "modern",
  wallpaper: DEFAULT_WALLPAPER,
};

export const FONT_FAMILY_CSS: Record<FontFamily, string> = {
  inter: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
  system: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
  serif: "var(--font-source-serif), Georgia, 'Times New Roman', serif",
  mono: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
  display: "var(--font-outfit), ui-sans-serif, system-ui, sans-serif",
};

export const FONT_SIZE_REM: Record<FontSize, string> = {
  small: "0.875rem",
  medium: "1rem",
  large: "1.125rem",
  xlarge: "1.25rem",
};

export const STYLE_PRESET_VARS: Record<
  StylePreset,
  Record<string, string>
> = {
  classic: {
    "--os-radius": "4px",
    "--os-title-h": "36px",
    "--os-taskbar-h": "48px",
    "--os-pad": "12px",
    "--os-surface-alpha": "0.96",
  },
  modern: {
    "--os-radius": "12px",
    "--os-title-h": "32px",
    "--os-taskbar-h": "44px",
    "--os-pad": "14px",
    "--os-surface-alpha": "0.92",
  },
  compact: {
    "--os-radius": "8px",
    "--os-title-h": "28px",
    "--os-taskbar-h": "36px",
    "--os-pad": "8px",
    "--os-surface-alpha": "0.94",
  },
  glass: {
    "--os-radius": "14px",
    "--os-title-h": "32px",
    "--os-taskbar-h": "46px",
    "--os-pad": "14px",
    "--os-surface-alpha": "0.72",
  },
};

export const COLOR_SWATCHES = [
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#64748b",
];
