# Contributing to Requiroom

Thanks for helping make Requiroom better. This guide covers how to set up a
development environment, the kinds of changes we welcome, and how to get a pull
request merged.

Please also read our [Code of Conduct](CODE_OF_CONDUCT.md). By participating,
you agree to uphold it.

## Ways to contribute

- **Bug reports** — use the Bug report issue template; include browser, OS, and steps
- **Feature ideas** — open a Feature request; discuss scope before large PRs
- **Code** — fix bugs, improve apps, harden the proxy, polish UX
- **Docs** — README, `docs/`, inline comments for non-obvious flows
- **Design** — themes, wallpapers, accessibility (prefer matching existing chrome)

## Development setup

Requirements: **Node.js 20+** (LTS recommended) and npm.

```bash
git clone <your-fork-or-this-repo>.git
cd BrowserOS   # or your local folder name
npm install    # also installs a git pre-push hook (Husky) that runs lint
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

A **pre-push** hook runs `npm run lint` and blocks the push if ESLint fails.
CI also runs lint + build on PRs to `main`.

Optional — Chromium for retired proxy experiments:

```bash
npm run browser:install
```

Useful scripts:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint (also runs on `git push` via Husky) |
| `npm run browser:install` | Install Playwright Chromium |

## Project layout (short)

| Path | Role |
| --- | --- |
| `src/os/` | Desktop shell, windows, taskbar, splash, OS dialogs |
| `src/apps/` | Built-in apps (Browser, Files, Shell, Editor, Notes, Sheets, Settings, Assistant) |
| `src/fs/` | Virtual filesystem + import/export |
| `src/store/` | Zustand stores (windows, FS, theme, settings, dialogs, …) |
| `src/app/api/proxy/` | Same-origin browse proxy (SSRF safety, rewrite, cookies, Chromium fetch) |
| `src/app/api/llm/` | LLM forwarder (client-supplied keys; not stored on server) |
| `src/theme/` | Tokens, wallpapers, `applyTheme` |
| `src/agent/` | Assistant tools |
| `public/` | Static assets (e.g. browser service worker) |
| `docs/` | Deeper architecture and feature docs |

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and
[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Coding guidelines

- **TypeScript + React** — match existing patterns in nearby files
- **UI** — reuse `src/components/ui` and OS dialogs (`osAlert` / `osConfirm` / `osPrompt`); do not reintroduce `window.alert` / `confirm` / `prompt`
- **Secrets** — never commit API keys or `.env` files; keys belong in Settings / IndexedDB
- **Proxy safety** — do not weaken SSRF checks in `src/app/api/proxy/safety.ts` without a strong justification and tests/docs
- **Scope** — keep PRs focused; large refactors should be discussed in an issue first
- **Next.js** — this repo may use Next APIs that differ from older tutorials; check `node_modules/next/dist/docs/` and `AGENTS.md` when unsure

## Pull requests

1. Fork (if needed) and create a branch from `main`
2. Make your change with a clear commit message
3. Run `npm run lint` and `npm run build` locally
4. Open a PR using the template; link related issues
5. Describe **what** changed and **why**; note proxy/LLM/IndexedDB impacts

Maintainers may ask for smaller follow-ups or doc updates before merging.

## Security

Report vulnerabilities privately — see [SECURITY.md](SECURITY.md). Do not file
public issues for exploitable defects in the proxy, LLM route, or shell XSS.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).
