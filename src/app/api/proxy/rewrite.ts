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
    if (u.startsWith(proxyBase)) return u;
    const abs = new URL(u, base).href;
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

  function abs(u){
    try{
      if(!u||u.startsWith('data:')||u.startsWith('blob:')||u.startsWith('javascript:')||u.startsWith('#')) return u;
      if(typeof u==='string' && u.indexOf(PROXY)===0) return u;
      return PROXY+'?url='+encodeURIComponent(new URL(u, PAGE).href);
    }catch(e){return u;}
  }
  function shouldProxy(u){
    try{
      var x=new URL(u, PAGE);
      return x.protocol==='http:'||x.protocol==='https:';
    }catch(e){return false;}
  }
  function maybeProxy(u){
    if(typeof u!=='string') return u;
    if(!shouldProxy(u)) return u;
    if(u.indexOf(PROXY)===0) return u;
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

  var _rs=history.replaceState.bind(history);
  var _ps=history.pushState.bind(history);
  history.replaceState=function(state, title, url){
    try{ if(url) url=maybeProxy(String(url)); }catch(e){}
    return _rs(state, title, url);
  };
  history.pushState=function(state, title, url){
    try{ if(url) url=maybeProxy(String(url)); }catch(e){}
    return _ps(state, title, url);
  };

  document.addEventListener('click', function(e){
    var a=e.target && e.target.closest && e.target.closest('a[href]');
    if(!a) return;
    var href=a.getAttribute('href');
    if(!href||href.startsWith('#')||href.startsWith('javascript:')) return;
    if(a.target==='_blank') return;
    try{
      if(shouldProxy(href) && href.indexOf(PROXY)!==0){
        e.preventDefault();
        location.href=abs(href);
      }
    }catch(err){}
  }, true);
  document.addEventListener('submit', function(e){
    var form=e.target;
    if(!form||!form.action) return;
    try{
      if(shouldProxy(form.action) && String(form.action).indexOf(PROXY)!==0){
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
    /\s(href|src|action|poster|data-src)=["']([^"']+)["']/gi,
    (_m, attr, val) => ` ${attr}="${p(val)}"`,
  );
  out = out.replace(/\ssrcset=["']([^"']+)["']/gi, (_m, val: string) => {
    const parts = val.split(",").map((part) => {
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
  const h = html.slice(0, 100_000).toLowerCase();
  return (
    h.includes("cf_chl_opt") ||
    h.includes("challenge-platform") ||
    h.includes("cdn-cgi/challenge-platform") ||
    h.includes("just a moment") ||
    h.includes("cf-browser-verification") ||
    (h.includes("challenge -") && h.includes("cloudflare"))
  );
}
