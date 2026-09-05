function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

/**
 * Next.js `/_next/image?url=...` often breaks behind a proxy (and HTML &amp; in
 * query strings becomes a 400). Prefer the underlying asset URL when possible.
 */
export function unwrapImageOptimizerUrl(absHref: string): string {
  try {
    const u = new URL(absHref);
    const path = u.pathname;
    if (
      path === "/_next/image" ||
      path.endsWith("/_next/image") ||
      path === "/_vercel/image" ||
      path.endsWith("/_vercel/image") ||
      /\/cdn-cgi\/image\//i.test(path)
    ) {
      // Cloudflare Image Resizing: /cdn-cgi/image/width=...,quality=.../https://...
      const cf = path.match(/\/cdn-cgi\/image\/[^/]+\/(https?:\/\/.+)$/i);
      if (cf?.[1]) return decodeURIComponent(cf[1]);

      const inner = u.searchParams.get("url");
      if (inner) {
        const decoded = decodeURIComponent(inner);
        if (/^https?:\/\//i.test(decoded)) return decoded;
        return new URL(decoded, u.origin).href;
      }
    }
  } catch {
    /* keep original */
  }
  return absHref;
}

/** If a URL already points at our proxy (or was nested via mistaken re-proxy), unwrap. */
export function unwrapProxyTarget(href: string, proxyBase: string): string | null {
  try {
    const proxyPath = new URL(proxyBase, "http://local.invalid").pathname.replace(/\/$/, "") || "/api/proxy";
    const tryOne = (raw: string): string | null => {
      const u = new URL(raw, proxyBase);
      const path = u.pathname.replace(/\/$/, "") || "/";
      if (path === proxyPath || path.endsWith(proxyPath)) {
        const inner = u.searchParams.get("url");
        return inner || null;
      }
      return null;
    };
    let cur: string | null = href;
    for (let i = 0; i < 4 && cur; i++) {
      const next = tryOne(cur);
      if (!next) return i === 0 ? null : cur;
      cur = next;
    }
    return cur;
  } catch {
    return null;
  }
}

function proxify(u: string, base: string, proxyBase: string): string {
  try {
    if (
      !u ||
      u.startsWith("data:") ||
      u.startsWith("javascript:") ||
      u.startsWith("#") ||
      u.startsWith("blob:") ||
      u.startsWith("mailto:")
    ) {
      return u;
    }
    const cleaned = decodeHtmlEntities(u.trim());
    if (cleaned.startsWith(proxyBase)) {
      const flat = unwrapProxyTarget(cleaned, proxyBase);
      return flat ? `${proxyBase}?url=${encodeURIComponent(flat)}` : cleaned;
    }
    // Path like /api/proxy?url=… resolved against the remote origin → nested mess
    const nested = unwrapProxyTarget(new URL(cleaned, base).href, proxyBase);
    if (nested) return `${proxyBase}?url=${encodeURIComponent(nested)}`;
    const abs = unwrapImageOptimizerUrl(new URL(cleaned, base).href);
    return `${proxyBase}?url=${encodeURIComponent(abs)}`;
  } catch {
    return u;
  }
}

export function rewriteCss(css: string, baseUrl: URL, proxyBase: string): string {
  const base = baseUrl.href;
  return css.replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi, (_m, q: string, raw: string) => {
    const v = raw.trim();
    if (v.startsWith("data:")) return `url(${q}${v}${q})`;
    return `url(${q}${proxify(v, base, proxyBase)}${q})`;
  });
}

function injectClientShim(proxyBase: string, pageUrl: string): string {
  return `<script data-rq-proxy-shim>
(function(){
  var PROXY=${JSON.stringify(proxyBase)};
  var PAGE=${JSON.stringify(pageUrl)};
  var ORIGIN;
  try { ORIGIN = new URL(PAGE).origin; } catch(e) { ORIGIN = PAGE; }
  var LS_KEY = "rq:ls:" + ORIGIN + ":";
  var SS_KEY = "rq:ss:" + ORIGIN + ":";

  function proxyPathname(){
    try { return new URL(PROXY, location.href).pathname.replace(/\\/$/, '') || '/api/proxy'; }
    catch(e){ return '/api/proxy'; }
  }
  function extractProxyTarget(raw){
    try{
      var bases = [location.href, PAGE, PROXY];
      for (var bi=0; bi<bases.length; bi++){
        try {
          var u = new URL(raw, bases[bi]);
          var path = u.pathname.replace(/\\/$/, '') || '/';
          var pp = proxyPathname();
          if (path === pp || path.indexOf(pp) !== -1 && /\\/api\\/proxy$/.test(path)) {
            var inner = u.searchParams.get('url');
            if (inner) return inner;
          }
        } catch(e1){}
      }
    }catch(e){}
    return null;
  }
  function flattenProxyTarget(raw){
    var cur = raw;
    for (var i=0; i<5; i++){
      var next = extractProxyTarget(cur);
      if (!next) return cur;
      cur = next;
    }
    return cur;
  }
  function abs(u){
    try{
      if(!u||u.startsWith('data:')||u.startsWith('blob:')||u.startsWith('javascript:')||u.startsWith('#')||u.startsWith('mailto:')) return u;
      var cleaned = String(u).replace(/&amp;/gi,'&').replace(/&quot;/gi,'"');
      // Already a proxy URL (or nested) — flatten to a single proxy hop
      var existing = extractProxyTarget(cleaned);
      if (existing) {
        return PROXY+'?url='+encodeURIComponent(flattenProxyTarget(existing));
      }
      var resolved = new URL(cleaned, PAGE).href;
      // Accidentally resolved /api/proxy?url=… against the remote origin
      existing = extractProxyTarget(resolved);
      if (existing) {
        return PROXY+'?url='+encodeURIComponent(flattenProxyTarget(existing));
      }
      // Unwrap Next.js / Vercel image optimizer to the real asset
      try {
        var ru = new URL(resolved);
        if (ru.pathname.indexOf('/_next/image') !== -1 || ru.pathname.indexOf('/_vercel/image') !== -1) {
          var inner = ru.searchParams.get('url');
          if (inner) {
            var dec = decodeURIComponent(inner);
            resolved = /^https?:\\/\\//i.test(dec) ? dec : new URL(dec, ru.origin).href;
          }
        }
      } catch (e2) {}
      return PROXY+'?url='+encodeURIComponent(resolved);
    }catch(e){return u;}
  }
  function shouldProxy(u){
    try{
      if (extractProxyTarget(u)) return true;
      var x=new URL(u, PAGE);
      return x.protocol==='http:'||x.protocol==='https:';
    }catch(e){return false;}
  }
  function maybeProxy(u){
    if(typeof u!=='string') return u;
    if(!shouldProxy(u)) return u;
    return abs(u);
  }

  function wrapStorage(storage, prefix){
    try{
      return {
        get length(){
          var n=0;
          for(var i=0;i<storage.length;i++){
            var k=storage.key(i);
            if(k&&k.indexOf(prefix)===0) n++;
          }
          return n;
        },
        key: function(i){
          var keys=[];
          for(var j=0;j<storage.length;j++){
            var k=storage.key(j);
            if(k&&k.indexOf(prefix)===0) keys.push(k.slice(prefix.length));
          }
          return keys[i]||null;
        },
        getItem: function(k){ return storage.getItem(prefix+k); },
        setItem: function(k,v){ storage.setItem(prefix+k, v); },
        removeItem: function(k){ storage.removeItem(prefix+k); },
        clear: function(){
          var del=[];
          for(var i=0;i<storage.length;i++){
            var k=storage.key(i);
            if(k&&k.indexOf(prefix)===0) del.push(k);
          }
          del.forEach(function(k){ storage.removeItem(k); });
        }
      };
    }catch(e){ return storage; }
  }

  try {
    Object.defineProperty(window, "localStorage", { configurable: true, value: wrapStorage(window.localStorage, LS_KEY) });
    Object.defineProperty(window, "sessionStorage", { configurable: true, value: wrapStorage(window.sessionStorage, SS_KEY) });
  } catch(e) {}

  var _fetch=window.fetch;
  window.fetch=function(input, init){
    try{
      var url=typeof input==='string'?input:(input&&input.url);
      if(url&&shouldProxy(url)){
        var p=abs(url);
        if(typeof input==='string') return _fetch.call(this, p, init);
        return _fetch.call(this, new Request(p, input), init);
      }
    }catch(e){}
    return _fetch.apply(this, arguments);
  };
  var XO=XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open=function(method, url){
    try{ if(typeof url==='string'&&shouldProxy(url)) arguments[1]=abs(url); }catch(e){}
    return XO.apply(this, arguments);
  };
  var SA=Element.prototype.setAttribute;
  Element.prototype.setAttribute=function(name, value){
    try{
      var n=String(name).toLowerCase();
      if((n==='src'||n==='href'||n==='action') && typeof value==='string')
        value=maybeProxy(value);
    }catch(e){}
    return SA.call(this, name, value);
  };

  // Path-absolute URLs like /cdn-cgi/... ignore <base> in practice for script.src —
  // patch property setters so Cloudflare orchestrate scripts load through the proxy.
  function patchUrlProp(proto, prop){
    try{
      var d=Object.getOwnPropertyDescriptor(proto, prop);
      if(!d||!d.set||!d.get) return;
      Object.defineProperty(proto, prop, {
        configurable: true,
        enumerable: d.enumerable,
        get: function(){ return d.get.call(this); },
        set: function(v){ d.set.call(this, maybeProxy(v)); }
      });
    }catch(e){}
  }
  patchUrlProp(HTMLScriptElement.prototype, 'src');
  patchUrlProp(HTMLImageElement.prototype, 'src');
  patchUrlProp(HTMLIFrameElement.prototype, 'src');
  patchUrlProp(HTMLAnchorElement.prototype, 'href');
  patchUrlProp(HTMLFormElement.prototype, 'action');
  patchUrlProp(HTMLLinkElement.prototype, 'href');
  try {
    var srcsetDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'srcset');
    if (srcsetDesc && srcsetDesc.set) {
      Object.defineProperty(HTMLImageElement.prototype, 'srcset', {
        configurable: true,
        enumerable: srcsetDesc.enumerable,
        get: function(){ return srcsetDesc.get.call(this); },
        set: function(v){
          try {
            if (typeof v === 'string') {
              v = v.split(',').map(function(part){
                var bits = part.trim().split(/\\s+/);
                var u = bits.shift() || '';
                return maybeProxy(u) + (bits.length ? ' ' + bits.join(' ') : '');
              }).join(', ');
            }
          } catch(e) {}
          srcsetDesc.set.call(this, v);
        }
      });
    }
  } catch(e) {}
  try {
    if (window.HTMLSourceElement) {
      patchUrlProp(HTMLSourceElement.prototype, 'src');
      var ssd = Object.getOwnPropertyDescriptor(HTMLSourceElement.prototype, 'srcset');
      if (ssd && ssd.set) {
        Object.defineProperty(HTMLSourceElement.prototype, 'srcset', {
          configurable: true,
          enumerable: ssd.enumerable,
          get: function(){ return ssd.get.call(this); },
          set: function(v){
            try {
              if (typeof v === 'string') {
                v = v.split(',').map(function(part){
                  var bits = part.trim().split(/\\s+/);
                  var u = bits.shift() || '';
                  return maybeProxy(u) + (bits.length ? ' ' + bits.join(' ') : '');
                }).join(', ');
              }
            } catch(e) {}
            ssd.set.call(this, v);
          }
        });
      }
    }
  } catch(e) {}

  var _rs=history.replaceState.bind(history);
  var _ps=history.pushState.bind(history);
  // Do not rewrite History URLs. Mapping /path → /api/proxy?url=… soft-navigates
  // the address bar without loading that document and blanks Next.js pages.
  // Clicks/forms below force full document loads through the proxy instead.
  history.replaceState=function(state, title, url){
    return _rs(state, title);
  };
  history.pushState=function(state, title, url){
    return _ps(state, title);
  };

  // Force full document navigations so Next.js / SPA routers cannot soft-nav
  // using the real /api/proxy path (which nests or 404s the remote site).
  document.addEventListener('click', function(e){
    if (e.defaultPrevented) return;
    if (e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a=e.target && e.target.closest && e.target.closest('a[href]');
    if(!a) return;
    var href=a.getAttribute('href');
    if(!href||href.startsWith('#')||href.startsWith('javascript:')||href.startsWith('mailto:')) return;
    if(a.target && a.target!=='_self') return;
    try{
      if(!shouldProxy(href) && !extractProxyTarget(href)) return;
      e.preventDefault();
      e.stopPropagation();
      location.href=abs(href);
    }catch(err){}
  }, true);
  document.addEventListener('submit', function(e){
    var form=e.target;
    if(!form||!form.action) return;
    try{
      if(shouldProxy(form.action) || extractProxyTarget(form.action)){
        form.action=abs(form.action);
      }
    }catch(err){}
  }, true);

  var cookieBag = {};
  try {
    Object.defineProperty(Document.prototype, "cookie", {
      configurable: true,
      get: function(){
        return Object.keys(cookieBag).map(function(k){ return k+"="+cookieBag[k]; }).join("; ");
      },
      set: function(v){
        try{
          var first = String(v).split(";")[0];
          var i = first.indexOf("=");
          if(i<=0) return;
          var name = first.slice(0,i).trim();
          var val = first.slice(i+1).trim();
          if(/max-age=0/i.test(v) || /expires=.*1970/i.test(v)) delete cookieBag[name];
          else cookieBag[name] = val;
          try { localStorage.setItem("__rq_doc_cookies", JSON.stringify(cookieBag)); } catch(e){}
        }catch(e){}
      }
    });
    try {
      var saved = localStorage.getItem("__rq_doc_cookies");
      if(saved) cookieBag = JSON.parse(saved) || {};
    } catch(e) {}
  } catch(e) {}
})();
</script>`;
}

/** Rewrite absolute /cdn-cgi paths inside inline scripts so CF orchestrate loads via proxy */
function rewriteInlineCdnCgi(html: string, baseUrl: URL, proxyBase: string): string {
  return html.replace(
    /(['"])(\/cdn-cgi\/[^'"]+)\1/g,
    (_m, q: string, path: string) => {
      const proxied = proxify(path, baseUrl.href, proxyBase);
      return `${q}${proxied}${q}`;
    },
  );
}

export function rewriteHtml(html: string, baseUrl: URL, proxyBase: string): string {
  const base = baseUrl.href;
  const p = (u: string) => proxify(u, base, proxyBase);

  let out = html;
  out = rewriteInlineCdnCgi(out, baseUrl, proxyBase);

  out = out.replace(
    /\s(href|src|action|poster|data-src|data-bg)=["']([^"']+)["']/gi,
    (_m, attr, val) => ` ${attr}="${p(val)}"`,
  );
  out = out.replace(/\s(?:srcset|imagesrcset)=["']([^"']+)["']/gi, (_m, val: string) => {
    const parts = decodeHtmlEntities(val).split(",").map((part) => {
      const bits = part.trim().split(/\s+/);
      const u = bits.shift() || "";
      return `${p(u)}${bits.length ? ` ${bits.join(" ")}` : ""}`;
    });
    return ` srcset="${parts.join(", ")}"`;
  });

  out = out.replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi, (_m, q: string, raw: string) => {
    const v = raw.trim();
    if (v.startsWith("data:")) return `url(${q}${v}${q})`;
    return `url(${q}${p(v)}${q})`;
  });

  // SRI breaks when we rewrite script URLs
  out = out.replace(/\sintegrity=(["'][^"']*["'])/gi, "");
  out = out.replace(/<meta[^>]+http-equiv=["']?content-security-policy["']?[^>]*>/gi, "");
  out = out.replace(
    /<meta[^>]+http-equiv=["']?refresh["']?[^>]*content=["'][^"']*url=([^"']+)["'][^>]*>/gi,
    (_m, u) => `<meta http-equiv="refresh" content="0;url=${p(u.trim())}">`,
  );

  const shim = injectClientShim(proxyBase, baseUrl.href);
  if (/<head[^>]*>/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, `<head$1><base href="${p(baseUrl.origin + "/")}">${shim}`);
  } else {
    out = `<head><base href="${p(baseUrl.origin + "/")}">${shim}</head>` + out;
  }

  return out;
}

export function looksLikeCloudflareChallenge(html: string): boolean {
  const h = html.slice(0, 120_000);
  if (/cf_chl_opt/i.test(h)) return true;
  if (/challenge-error-text/i.test(h)) return true;
  if (/cType:\s*['"]managed['"]/i.test(h)) return true;
  if (/cf-browser-verification/i.test(h)) return true;
  if (/just a moment/i.test(h) && /cdn-cgi/i.test(h)) return true;
  if (/Enable JavaScript and cookies to continue/i.test(h) && /cdn-cgi/i.test(h)) return true;
  // Do NOT match bare "challenge-platform" — cleared pages (e.g. Upwork) still contain it.
  return false;
}
