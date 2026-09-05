export type WallpaperId =
  | "aurora"
  | "midnight"
  | "ember"
  | "forest"
  | "ocean"
  | "dusk"
  | "mesh"
  | "noir";

export interface WallpaperMeta {
  id: WallpaperId;
  label: string;
  /** Small CSS preview for the settings thumbnail */
  preview: string;
}

export const WALLPAPERS: WallpaperMeta[] = [
  {
    id: "aurora",
    label: "Aurora",
    preview:
      "radial-gradient(ellipse at 20% 20%, #3b82f680, transparent 50%), radial-gradient(ellipse at 80% 10%, #8b5cf680, transparent 45%), linear-gradient(160deg, #020617, #1e1b4b)",
  },
  {
    id: "midnight",
    label: "Midnight",
    preview: "linear-gradient(145deg, #020617 0%, #0c4a6e 45%, #1e3a5f 100%)",
  },
  {
    id: "ember",
    label: "Ember",
    preview: "linear-gradient(160deg, #1c1917 0%, #7c2d12 40%, #431407 100%)",
  },
  {
    id: "forest",
    label: "Forest",
    preview: "linear-gradient(155deg, #052e16 0%, #14532d 50%, #022c22 100%)",
  },
  {
    id: "ocean",
    label: "Ocean",
    preview: "linear-gradient(165deg, #082f49 0%, #0e7490 45%, #164e63 100%)",
  },
  {
    id: "dusk",
    label: "Dusk",
    preview: "linear-gradient(150deg, #2e1065 0%, #9d174d 50%, #431407 100%)",
  },
  {
    id: "mesh",
    label: "Mesh",
    preview:
      "radial-gradient(at 0% 0%, #1d4ed8 0, transparent 50%), radial-gradient(at 100% 0%, #7c3aed 0, transparent 50%), radial-gradient(at 100% 100%, #db2777 0, transparent 50%), #0f172a",
  },
  {
    id: "noir",
    label: "Noir",
    preview: "linear-gradient(180deg, #09090b 0%, #18181b 50%, #27272a 100%)",
  },
];

export const DEFAULT_WALLPAPER: WallpaperId = "aurora";
