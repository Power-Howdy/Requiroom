# Browse proxy

The in-app **Browser** loads remote sites through `/api/proxy` so requests
originate from the **deployment host**, not the user’s home IP. There is no
“open in a normal tab” fallback in the product UI.

## Request flow (high level)

1. User navigates to a URL in Browser.
2. Client requests `/api/proxy?url=…` (and related rewrite/cookie headers).
3. Server validates the target (`safety.ts`) — rejects private, loopback, and
   link-local destinations (SSRF protection).
4. Server fetches the resource (HTTP client, or Playwright Chromium when a
   challenge page is detected).
5. HTML/CSS/JS URLs are rewritten so subsequent navigations and assets stay on
   the proxy.
6. Service worker (`public/rq-browser-sw.js`) may apply cookie jar + cache
   behavior for the proxied origin.

## Contributor rules

- **Never** remove or bypass SSRF checks to “make a site work.” Fix rewrite or
  challenge handling instead.
- Prefer small, testable changes to rewrite rules; document edge cases you find.
- Chromium (`browserFetch.ts`) is heavier — use only when a normal fetch cannot
  complete a challenge; keep detection heuristics honest.
- Cookie and storage shims must not leak one proxied origin into another or into
  the parent desktop origin.

## Operator / self-host notes

- Proxying third-party sites may violate their terms of service; operators are
  responsible for lawful, ethical use and abuse controls (rate limits, auth on
  public demos, etc.).
- **WebRTC** and similar APIs inside a page may still expose the client IP;
  treat that as a known limitation.
- Many sites partially break after HTML rewrite (logins, SPAs, CSP, Service
  Workers of the target site). Compatibility fixes are welcome; perfect parity
  with a normal browser is not the goal.
- Install Chromium on the server/dev machine if you need challenge support:
  `npm run browser:install`.

## Related files

- `src/app/api/proxy/route.ts` — entry
- `src/app/api/proxy/safety.ts` — URL allow/deny
- `src/app/api/proxy/rewrite.ts` — HTML/URL rewriting
- `src/app/api/proxy/cookies.ts` — cookie bridging
- `src/app/api/proxy/browserFetch.ts` — Chromium path
- `src/apps/browser/` — UI
- `src/browser/registerSw.ts` — SW registration
