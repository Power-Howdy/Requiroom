import { hostCookieKey } from "./safety";

export type CookieMap = Record<string, string>;

/** Parse Cookie header into name=value pairs */
export function parseCookieHeader(header: string | null): CookieMap {
  const out: CookieMap = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i <= 0) continue;
    const name = part.slice(0, i).trim();
    const value = part.slice(i + 1).trim();
    if (name) out[name] = value;
  }
  return out;
}

/** Build upstream Cookie header from our jar cookie for this host */
export function upstreamCookieHeader(reqCookies: CookieMap, host: string): string | null {
  const key = hostCookieKey(host);
  const raw = reqCookies[key];
  if (!raw) return null;
  try {
    const jar = JSON.parse(decodeURIComponent(raw)) as CookieMap;
    return Object.entries(jar)
      .map(([n, v]) => `${n}=${v}`)
      .join("; ");
  } catch {
    return null;
  }
}

/** Merge Set-Cookie values into jar and return Set-Cookie for our domain */
export function mergeSetCookies(
  reqCookies: CookieMap,
  host: string,
  setCookieHeaders: string[],
): { setCookie: string | null; jar: CookieMap } {
  const key = hostCookieKey(host);
  let jar: CookieMap = {};
  try {
    if (reqCookies[key]) jar = JSON.parse(decodeURIComponent(reqCookies[key])) as CookieMap;
  } catch {
    jar = {};
  }

  for (const sc of setCookieHeaders) {
    const first = sc.split(";")[0];
    const i = first.indexOf("=");
    if (i <= 0) continue;
    let name = first.slice(0, i).trim();
    const value = first.slice(i + 1).trim();
    // Normalize cookie name prefixes Cloudflare / browsers use
    name = name.replace(/^__(?:Host|Secure)-/i, "");
    if (!name) continue;
    if (/max-age=0/i.test(sc) || /expires=.*1970/i.test(sc)) {
      delete jar[name];
    } else {
      jar[name] = value;
    }
  }

  const encoded = encodeURIComponent(JSON.stringify(jar));
  // Keep under typical 4KB cookie budget
  if (encoded.length > 3500) {
    const entries = Object.entries(jar);
    jar = Object.fromEntries(entries.slice(-20));
  }
  const setCookie = `${hostCookieKey(host)}=${encodeURIComponent(JSON.stringify(jar))}; Path=/api/proxy; SameSite=Lax; Max-Age=86400`;
  return { setCookie, jar };
}

export function collectSetCookie(headers: Headers): string[] {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  if (typeof getSetCookie === "function") {
    return getSetCookie.call(headers);
  }
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}
