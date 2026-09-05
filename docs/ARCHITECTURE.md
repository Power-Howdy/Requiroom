# Architecture

Requiroom is an in-browser desktop: a multi-window shell in the client, with a
small Next.js server surface for browsing and LLM forwarding.

```
┌─────────────────────────────────────────────────────────┐
│  Browser tab                                            │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Desktop (src/os) — windows, taskbar, splash       │  │
│  │ Apps (src/apps) — Browser, Files, Shell, …        │  │
│  │ Stores (src/store) + VFS (src/fs) → IndexedDB      │  │
│  └───────────────────────────────────────────────────┘  │
│            │ /api/proxy          │ /api/llm             │
└────────────┼─────────────────────┼──────────────────────┘
             ▼                     ▼
      Next.js route           Next.js route
      HTML rewrite,           Forward to OpenAI /
      cookies, optional       Anthropic / Gemini /
      Playwright Chromium     NVIDIA (user’s key)
```

## Client OS

- **Window manager** — `src/store/windowStore.ts`, `src/os/Window.tsx`, taskbar / start menu
- **Dialogs** — `src/store/dialogStore.ts` + `src/os/OsDialogs.tsx` (in-app alert/confirm/prompt)
- **Theme** — tokens and wallpapers under `src/theme/`, applied via CSS variables
- **Persistence** — IndexedDB database `requiroom` (FS tree, theme, settings, notifications, keys)

Apps are React components routed by window type (`AppBodyRouter`). Most logic is
client-side; there is no multi-user backend.

## Virtual filesystem

`src/fs/virtualFs.ts` models a Unix-like tree. Import/export and zip live in
`src/fs/transfer.ts`. Files app uses the File System Access API when available.

## Browser / proxy

Visited pages are loaded through **`/api/proxy`** so third parties see the
**host’s** outbound IP (not a “Direct” tab navigation). Important pieces:

| Module | Role |
| --- | --- |
| `safety.ts` | Block private / link-local / metadata SSRF targets |
| `rewrite.ts` | Rewrite HTML/URLs for same-origin proxying |
| `cookies.ts` | Session cookie handling |
| `browserFetch.ts` | Optional Chromium fetch for challenge pages |
| `public/rq-browser-sw.js` | Service worker: cookie jar + HTTP cache |

See [PROXY.md](PROXY.md) for operator and contributor details.

## LLM / assistant

- Settings store API keys and provider choice in IndexedDB
- `/api/llm` forwards chat completions; the server must not persist keys
- Assistant tools in `src/agent/tools.ts` can act on the OS (files, windows, …)

## Deploy

Do **not** use static `output: "export"`. Netlify (`netlify.toml` +
`@netlify/plugin-nextjs`) and Vercel both work with a Node server runtime.
