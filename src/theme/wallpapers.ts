export type WallpaperId =
  | "aurora"
  | "midnight"
  | "ember"
  | "forest"
  | "ocean"
  | "dusk"
  | "mesh"
  | "noir"
  | "requirement"
  | "come"
  | "enchanted-library"
  | "lake-towers"
  | "vanishing";

export interface WallpaperMeta {
  id: WallpaperId;
  label: string;
  /** Small CSS preview for gradient wallpapers */
  preview: string;
  /** Optional full-bleed image under /public */
  image?: string;
  /** Settings group label */
  group?: "scenes" | "gradients";
}

export const WALLPAPERS: WallpaperMeta[] = [
  {
    id: "requirement",
    label: "Room of Need",
    group: "scenes",
    image: "/wallpapers/requirement.jpg",
    preview: "linear-gradient(160deg, #1c1917 0%, #78350f 45%, #0c4a6e 100%)",
  },
  {
    id: "come",
    label: "Come & Seek",
    group: "scenes",
    image: "/wallpapers/come.jpg",
    preview: "linear-gradient(155deg, #0f172a 0%, #14532d 40%, #78350f 100%)",
  },
  {
    id: "enchanted-library",
    label: "Enchanted Library",
    group: "scenes",
    image: "/wallpapers/enchanted-library.jpg",
    preview: "linear-gradient(150deg, #1c1917 0%, #7c2d12 50%, #4c1d95 100%)",
  },
  {
    id: "lake-towers",
    label: "Lake Towers",
    group: "scenes",
    image: "/wallpapers/lake-towers.jpg",
    preview: "linear-gradient(165deg, #020617 0%, #1e3a5f 50%, #0f766e 100%)",
  },
  {
    id: "vanishing",
    label: "Vanishing Door",
    group: "scenes",
    image: "/wallpapers/vanishing.jpg",
    preview: "linear-gradient(160deg, #0c0a09 0%, #44403c 40%, #b45309 100%)",
  },
  {
    id: "aurora",
    label: "Aurora",
    group: "gradients",
    preview:
      "radial-gradient(ellipse at 20% 20%, #3b82f680, transparent 50%), radial-gradient(ellipse at 80% 10%, #8b5cf680, transparent 45%), linear-gradient(160deg, #020617, #1e1b4b)",
  },
  {
    id: "midnight",
    label: "Midnight",
    group: "gradients",
    preview: "linear-gradient(145deg, #020617 0%, #0c4a6e 45%, #1e3a5f 100%)",
  },
  {
    id: "ember",
    label: "Ember",
    group: "gradients",
    preview: "linear-gradient(160deg, #1c1917 0%, #7c2d12 40%, #431407 100%)",
  },
  {
    id: "forest",
    label: "Forest",
    group: "gradients",
    preview: "linear-gradient(155deg, #052e16 0%, #14532d 50%, #022c22 100%)",
  },
  {
    id: "ocean",
    label: "Ocean",
    group: "gradients",
    preview: "linear-gradient(165deg, #082f49 0%, #0e7490 45%, #164e63 100%)",
  },
  {
    id: "dusk",
    label: "Dusk",
    group: "gradients",
    preview: "linear-gradient(150deg, #2e1065 0%, #9d174d 50%, #431407 100%)",
  },
  {
    id: "mesh",
    label: "Mesh",
    group: "gradients",
    preview:
      "radial-gradient(at 0% 0%, #1d4ed8 0, transparent 50%), radial-gradient(at 100% 0%, #7c3aed 0, transparent 50%), radial-gradient(at 100% 100%, #db2777 0, transparent 50%), #0f172a",
  },
  {
    id: "noir",
    label: "Noir",
    group: "gradients",
    preview: "linear-gradient(180deg, #09090b 0%, #18181b 50%, #27272a 100%)",
  },
];

export const DEFAULT_WALLPAPER: WallpaperId = "requirement";

export function wallpaperById(id: WallpaperId): WallpaperMeta | undefined {
  return WALLPAPERS.find((w) => w.id === id);
}
