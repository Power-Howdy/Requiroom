# Development guide

## Prerequisites

- Node.js **20+**
- npm (comes with Node)
- A modern desktop browser (Chromium-based recommended for File System Access)

## First run

```bash
npm install
npm run dev
```

Visit http://localhost:3000. The splash screen waits for FS / theme / settings
init before showing the desktop.

### Optional Chromium (retired proxy experiments)

`npm run browser:install` installs Playwright Chromium for the **retired**
`/api/proxy` challenge path. The Browser UI no longer uses it; see
[PROXY.md](PROXY.md).

## Environment

No API keys are required in `.env` for core desktop features. LLM providers are
configured in **Settings → AI** (keys stay in the browser).

If you add server env vars later, use `.env.local` (gitignored) and document
them here.

## Quality checks

Before opening a PR:

```bash
npm run lint
npm run build
```

## Where to change what

| Goal | Start here |
| --- | --- |
| New built-in app | `src/apps/<name>/`, register in window types + start menu / icons |
| Desktop chrome | `src/os/` |
| Theme / wallpaper | `src/theme/`, Settings Appearance |
| Shell commands | `src/apps/shell/commands.ts` |
| In-app Browser | `src/apps/browser/` (direct iframe) |
| Retired browse proxy | `src/app/api/proxy/`, `docs/PROXY.md` |
| LLM providers | `src/app/api/llm/route.ts`, Settings AI panel |
| Shared UI | `src/components/ui/` |
| OS dialogs | `dialogStore` + `OsDialogs` — never `window.prompt` |

## Next.js notes

This project uses a current Next.js App Router build. Conventions may differ
from older blog posts. See `AGENTS.md` and `node_modules/next/dist/docs/` before
adding new routes or server APIs.

## Data reset (local)

Clear site data for localhost (or delete the IndexedDB database named
`requiroom`) to wipe VFS, theme, and saved API keys.
