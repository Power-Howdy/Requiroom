/* Requiroom browser service worker — cookie jar + HTTP cache for /api/proxy */
/* v2: follow proxy redirects in-SW (iframe-safe) */
/* eslint-disable no-restricted-globals */

const DB_NAME = "requiroom-browser";
const DB_VERSION = 1;
const COOKIE_STORE = "cookies";
const CACHE_NAME = "rq-http-v1";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(COOKIE_STORE)) {
        const store = db.createObjectStore(COOKIE_STORE, { keyPath: "id" });
        store.createIndex("host", "host", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbReq(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function cookieId(host, name, path) {
  return `${host}\n${name}\n${path || "/"}`;
}

function hostMatches(cookieHost, reqHost) {
  const ch = String(cookieHost || "").replace(/^\./, "").toLowerCase();
  const rh = String(reqHost || "").toLowerCase();
  if (!ch || !rh) return false;
  return rh === ch || rh.endsWith("." + ch);
}

function pathMatches(cookiePath, reqPath) {
  const cp = cookiePath || "/";
  const rp = reqPath || "/";
  if (rp === cp) return true;
  if (!rp.startsWith(cp)) return false;
  return cp.endsWith("/") || rp.charAt(cp.length) === "/";
}

async function getCookiesForUrl(urlStr) {
  let url;
  try {
    url = new URL(urlStr);
  } catch {
    return "";
  }
  const db = await openDb();
  const tx = db.transaction(COOKIE_STORE, "readonly");
  const all = await idbReq(tx.objectStore(COOKIE_STORE).getAll());
  db.close();
  const now = Date.now();
  const matched = [];
  for (const c of all || []) {
    if (c.expires && c.expires < now) continue;
    if (!hostMatches(c.host, url.hostname)) continue;
    if (!pathMatches(c.path, url.pathname)) continue;
    if (c.secure && url.protocol !== "https:") continue;
    matched.push(c);
  }
  matched.sort((a, b) => (b.path || "/").length - (a.path || "/").length);
  return matched.map((c) => `${c.name}=${c.value}`).join("; ");
}

function parseSetCookie(raw, pageUrl) {
  const parts = String(raw).split(";").map((p) => p.trim());
  const first = parts.shift() || "";
  const eq = first.indexOf("=");
  if (eq <= 0) return null;
  let name = first.slice(0, eq).trim();
  const value = first.slice(eq + 1).trim();
  name = name.replace(/^__(?:Host|Secure)-/i, "");
  if (!name) return null;

  let url;
  try {
    url = new URL(pageUrl);
  } catch {
    return null;
  }

  const cookie = {
    id: "",
    name,
    value,
    host: url.hostname,
    path: "/",
    expires: null,
    secure: url.protocol === "https:",
    httpOnly: false,
    sameSite: "Lax",
  };

  for (const p of parts) {
    const li = p.indexOf("=");
    const k = (li >= 0 ? p.slice(0, li) : p).trim().toLowerCase();
    const v = (li >= 0 ? p.slice(li + 1) : "").trim();
    if (k === "domain" && v) cookie.host = v.replace(/^\./, "").toLowerCase();
    else if (k === "path" && v) cookie.path = v.startsWith("/") ? v : "/" + v;
    else if (k === "secure") cookie.secure = true;
    else if (k === "httponly") cookie.httpOnly = true;
    else if (k === "samesite" && v) cookie.sameSite = v;
    else if (k === "max-age") {
      const n = parseInt(v, 10);
      if (!Number.isNaN(n)) cookie.expires = n <= 0 ? 0 : Date.now() + n * 1000;
    } else if (k === "expires") {
      const t = Date.parse(v);
      if (!Number.isNaN(t)) cookie.expires = t;
    }
  }

  if (cookie.expires === 0) {
    cookie.id = cookieId(cookie.host, cookie.name, cookie.path);
    return { delete: true, cookie };
  }
  cookie.id = cookieId(cookie.host, cookie.name, cookie.path);
  return { delete: false, cookie };
}

async function applySetCookies(setCookies, pageUrl) {
  if (!setCookies || !setCookies.length) return;
  const db = await openDb();
  const tx = db.transaction(COOKIE_STORE, "readwrite");
  const store = tx.objectStore(COOKIE_STORE);
  for (const raw of setCookies) {
    const parsed = parseSetCookie(raw, pageUrl);
    if (!parsed) continue;
    if (parsed.delete) await idbReq(store.delete(parsed.cookie.id));
    else await idbReq(store.put(parsed.cookie));
  }
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function clearCookies() {
  const db = await openDb();
  const tx = db.transaction(COOKIE_STORE, "readwrite");
  await idbReq(tx.objectStore(COOKIE_STORE).clear());
  db.close();
}

async function clearHttpCache() {
  await caches.delete(CACHE_NAME);
}

function cacheable(req, res) {
  if (req.method !== "GET") return false;
  if (![200, 301, 302, 203, 304].includes(res.status)) return false;
  const cc = (res.headers.get("cache-control") || "").toLowerCase();
  if (cc.includes("no-store") || cc.includes("private")) return false;
  if (cc.includes("no-cache")) return false;
  const ct = res.headers.get("content-type") || "";
  // Cache static-ish assets aggressively; HTML only when explicitly cacheable
  if (ct.includes("text/html")) {
    return /max-age=\d+/i.test(cc) && !cc.includes("max-age=0");
  }
  return (
    ct.includes("javascript") ||
    ct.includes("css") ||
    ct.includes("font") ||
    ct.includes("image/") ||
    ct.includes("wasm") ||
    ct.includes("json")
  );
}

async function handleProxy(req) {
  const url = new URL(req.url);
  const target = url.searchParams.get("url");
  if (!target) return fetch(req);

  // Bypass cache when navigating documents or explicit reload
  const dest = req.headers.get("Sec-Fetch-Dest") || "";
  const cache = await caches.open(CACHE_NAME);
  if (req.method === "GET" && dest !== "document" && dest !== "iframe") {
    const hit = await cache.match(req);
    if (hit) return hit;
  }

  // Follow same-origin proxy redirects here. Returning fetch(redirect:"manual")
  // 3xx responses from a SW often breaks iframe navigations (opaque / filtered).
  let requestUrl = req.url;
  let method = req.method;
  let body =
    method === "GET" || method === "HEAD" ? undefined : await req.arrayBuffer();
  let upstream = null;
  let finalUrl = target;

  for (let hop = 0; hop < 12; hop++) {
    const hopTarget = new URL(requestUrl).searchParams.get("url") || finalUrl;
    const cookieHeader = await getCookiesForUrl(hopTarget);
    const headers = new Headers(req.headers);
    if (cookieHeader) headers.set("X-RQ-Cookie", cookieHeader);
    headers.delete("cookie");

    upstream = await fetch(
      new Request(requestUrl, {
        method,
        headers,
        body,
        redirect: "manual",
        credentials: "omit",
      }),
    );

    finalUrl = upstream.headers.get("X-RQ-Final-URL") || hopTarget;
    const setRaw = upstream.headers.get("X-RQ-Set-Cookie");
    if (setRaw) {
      try {
        const list = JSON.parse(setRaw);
        if (Array.isArray(list)) await applySetCookies(list, finalUrl);
      } catch {
        /* ignore */
      }
    }

    if (![301, 302, 303, 307, 308].includes(upstream.status)) break;
    const loc = upstream.headers.get("Location");
    if (!loc) break;
    try {
      const next = new URL(loc, requestUrl);
      if (next.origin !== self.location.origin || next.pathname !== "/api/proxy") {
        // Don't follow off-proxy redirects from the SW
        break;
      }
      requestUrl = next.href;
      if (upstream.status === 303 || ((upstream.status === 301 || upstream.status === 302) && method !== "GET" && method !== "HEAD")) {
        method = "GET";
        body = undefined;
      }
    } catch {
      break;
    }
  }

  if (!upstream) return fetch(req);

  const outHeaders = new Headers(upstream.headers);
  outHeaders.delete("X-RQ-Set-Cookie");
  const out = new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  });

  if (cacheable(req, out)) {
    try {
      await cache.put(req, out.clone());
    } catch {
      /* quota */
    }
  }
  return out;
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "rq-clear-cookies") {
    event.waitUntil(clearCookies().then(() => event.source && event.source.postMessage({ type: "rq-cleared", what: "cookies" })));
  }
  if (data.type === "rq-clear-cache") {
    event.waitUntil(clearHttpCache().then(() => event.source && event.source.postMessage({ type: "rq-cleared", what: "cache" })));
  }
  if (data.type === "rq-clear-all") {
    event.waitUntil(
      Promise.all([clearCookies(), clearHttpCache()]).then(
        () => event.source && event.source.postMessage({ type: "rq-cleared", what: "all" }),
      ),
    );
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === "/api/proxy") {
    event.respondWith(handleProxy(event.request));
  }
});
