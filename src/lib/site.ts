/** Shared site copy for HTML metadata, Open Graph, and social cards. */
export const siteConfig = {
  name: "Requiroom",
  shortName: "Requiroom",
  tagline: "Your in-browser desktop",
  description:
    "In-browser desktop OS with a multi-window UI, virtual filesystem, Linux-like shell, editor, notes, sheets, themes, and an AI assistant — all in one room.",
  keywords: [
    "Requiroom",
    "browser OS",
    "in-browser desktop",
    "web desktop",
    "virtual filesystem",
    "web browser",
    "web terminal",
    "AI assistant",
    "Next.js",
    "open source",
  ],
  authors: [{ name: "Requiroom Contributors" }],
  creator: "Requiroom Contributors",
  publisher: "Requiroom",
  locale: "en_US",
  category: "productivity",
  githubUrl: "https://github.com/Power-Howdy/Requiroom",
  /** Canonical production origin (override with NEXT_PUBLIC_SITE_URL). */
  productionUrl: "https://requiroom.vercel.app",
} as const;

function tryUrl(raw: string | undefined): URL | null {
  const s = raw?.trim();
  if (!s) return null;
  try {
    return new URL(s.includes("://") ? s : `https://${s}`);
  } catch {
    return null;
  }
}

/**
 * Absolute site origin for metadataBase / OG URLs.
 * Prefer a stable production host — never a one-off Vercel preview URL.
 */
export function getSiteUrl(): URL {
  const explicit = tryUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (explicit) return explicit;

  // Vercel sets VERCEL=1 on all deployments; use the production domain for OG
  // so preview deploys don't emit ephemeral requiroom-xxxx.vercel.app image URLs.
  if (process.env.VERCEL) {
    return (
      tryUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
      tryUrl(siteConfig.productionUrl) ||
      tryUrl(process.env.VERCEL_URL) ||
      new URL(siteConfig.productionUrl)
    );
  }

  // Netlify primary URL (not localhost)
  const netlify = tryUrl(process.env.URL);
  if (netlify && netlify.hostname !== "localhost") return netlify;

  return new URL("http://localhost:3000");
}
