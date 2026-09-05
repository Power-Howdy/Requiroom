import { assertSafeUrl, BROWSER_UA } from "@/app/api/proxy/safety";

export const runtime = "nodejs";

function metaContent(html: string, prop: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
    "i",
  );
  const m = html.match(re);
  return m?.[1] || m?.[2] || null;
}

function pageTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m?.[1]?.trim() || null;
}

function absolutize(base: URL, maybe: string | null): string | null {
  if (!maybe) return null;
  try {
    return new URL(maybe, base).href;
  } catch {
    return null;
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("url");
  if (!raw) return Response.json({ error: "Missing url" }, { status: 400 });

  let target: URL;
  try {
    target = await assertSafeUrl(raw);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Unsafe URL" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(target.href, {
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": BROWSER_UA,
      },
      signal: AbortSignal.timeout(8000),
    });
    const ctype = res.headers.get("content-type") || "";
    if (!res.ok || !ctype.includes("text")) {
      return Response.json({
        title: target.hostname,
        description: null,
        image: null,
      });
    }
    const html = (await res.text()).slice(0, 250_000);
    const title =
      decodeEntities(
        metaContent(html, "og:title") ||
          metaContent(html, "twitter:title") ||
          pageTitle(html) ||
          target.hostname,
      );
    const description = decodeEntities(
      metaContent(html, "og:description") ||
        metaContent(html, "twitter:description") ||
        metaContent(html, "description") ||
        "",
    );
    const image = absolutize(
      target,
      metaContent(html, "og:image") || metaContent(html, "twitter:image"),
    );

    return Response.json(
      {
        title: title.slice(0, 200),
        description: description ? description.slice(0, 400) : null,
        image,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch {
    return Response.json({
      title: target.hostname,
      description: null,
      image: null,
    });
  }
}
