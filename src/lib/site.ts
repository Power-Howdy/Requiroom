/** Shared site copy for HTML metadata, Open Graph, and social cards. */
export const siteConfig = {
  name: "Requiroom",
  shortName: "Requiroom",
  tagline: "Your in-browser desktop",
  description:
    "In-browser desktop OS with a proxied browser, virtual filesystem, Linux-like shell, editor, notes, sheets, themes, and an AI assistant — all in one room.",
  keywords: [
    "Requiroom",
    "browser OS",
    "in-browser desktop",
    "web desktop",
    "virtual filesystem",
    "proxied browser",
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
} as const;

/** Prefer NEXT_PUBLIC_SITE_URL in production so OG URLs resolve absolutely. */
export function getSiteUrl(): URL {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    try {
      return new URL(fromEnv);
    } catch {
      /* fall through */
    }
  }
  if (process.env.VERCEL_URL) {
    return new URL(`https://${process.env.VERCEL_URL}`);
  }
  if (process.env.URL) {
    // Netlify deploy URL
    try {
      return new URL(process.env.URL);
    } catch {
      /* fall through */
    }
  }
  return new URL("http://localhost:3000");
}
