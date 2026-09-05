# Browse proxy (retired — future feature)

> **Status:** The in-app **Browser** now loads sites **directly** in an iframe
> (no `/api/proxy`). The proxy stack below is kept in the repo for a possible
> return once rewrite/hydration bugs are solved. Do not wire the UI back to it
> without a dedicated compatibility plan.

## Why it was retired

Proxied HTML rewrite + client shims break many modern apps (Next.js hydration,
nested `/api/proxy` URLs, history/soft-nav, “Show more” and similar client JS).
Direct framing is simpler; the tradeoff is `X-Frame-Options` /
`Content-Security-Policy: frame-ancestors` blocking some sites.

## Historical design (reference)

The proxy loaded remote sites through `/api/proxy` so requests originated from
the **deployment host**, not the user’s home IP.

### Request flow (high level)

1. User navigates to a URL in Browser.
2. Client requests `/api/proxy?url=…` (and related rewrite/cookie headers).
3. Server validates the target (`safety.ts`) — rejects private, loopback, and
   link-local destinations (SSRF protection).
4. Server fetches the resource (HTTP client). When Cloudflare challenges are
   detected, a **Chromium** session could solve the check, harvest
   `cf_clearance`, and return rewritten HTML.
5. HTML/CSS/JS URLs were rewritten so subsequent navigations and assets stayed
   on the proxy.
6. Service worker (`public/rq-browser-sw.js`) applied cookie jar + cache for the
   proxied origin.

Install Chromium (optional, for challenge experiments):

```bash
npm run browser:install
```

### Contributor rules (if reviving)

- **Never** remove or bypass SSRF checks to “make a site work.”
- Prefer small, testable changes to rewrite rules; document edge cases.
- Chromium (`browserFetch.ts`) is heavier — use only when a normal fetch cannot
  complete a challenge.
- Cookie and storage shims must not leak one proxied origin into another.

### Related files

- `src/app/api/proxy/route.ts` — entry
- `src/app/api/proxy/safety.ts` — URL allow/deny
- `src/app/api/proxy/rewrite.ts` — HTML/URL rewriting
- `src/app/api/proxy/cookies.ts` — cookie bridging
- `src/app/api/proxy/browserFetch.ts` — Chromium path
- `src/apps/browser/` — UI (direct mode today)
- `src/browser/registerSw.ts` — SW registration (unused by Browser UI for now)
- `public/rq-browser-sw.js` — proxy SW
