# Security Policy

## Supported versions

Security fixes are applied to the latest `main` branch. If you are running a
fork or an older commit, please update before reporting regressions that may
already be fixed.

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please report them privately using one of:

1. **GitHub Security Advisories** — on this repository, use
   *Security → Report a vulnerability* (preferred when the repo is on GitHub).
2. **Email the maintainers** — if advisories are unavailable, open a temporary
   private channel via the maintainers listed on the repository profile, or
   create a draft advisory and request collaborator access.

Include as much detail as you can:

- Affected component (e.g. `/api/proxy`, `/api/llm`, service worker, VFS)
- Steps to reproduce
- Impact (SSRF, data exfiltration, XSS in the desktop shell, key leakage, etc.)
- Suggested fix, if you have one

We aim to acknowledge reports within **7 days** and to share a remediation plan
or status update within **14 days**. Complex proxy / browser-isolation issues
may take longer; we will keep you informed.

## Scope notes for this project

Requiroom intentionally runs untrusted web content through a same-origin
browse proxy and may use a headless Chromium path for challenge pages. Related
risks contributors and operators should understand:

| Area | Expectation |
| --- | --- |
| `/api/proxy` | SSRF guards block private/link-local targets; report bypasses |
| HTML rewrite / iframe | XSS or navigation escapes that reach the parent OS shell |
| Service worker / cookie jar | Cross-origin session isolation failures |
| `/api/llm` | Keys must stay client-side; report any server persistence or leakage |
| IndexedDB | Local-only; not a multi-user secret store |
| Deployments | Operators are responsible for rate limits, abuse controls, and legal use of proxying |

Out of scope for “vulnerability” reports (file as bugs/enhancements instead):

- Sites that look broken after HTML rewrite (compatibility)
- Client IP leakage via WebRTC or plugins inside proxied pages (documented limitation)
- Abuse of a publicly hosted demo instance without evidence of a code defect

## Safe harbor

We will not pursue legal action against researchers who:

- Make a good-faith effort to avoid privacy violations, data destruction, and
  service disruption
- Do not exploit the issue beyond what is needed to demonstrate it
- Report findings promptly and keep them confidential until a fix is released
  or we agree they may be disclosed
