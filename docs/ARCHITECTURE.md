# Architecture

Requiroom is an in-browser desktop: a multi-window shell in the client, with a
small Next.js server surface for LLM forwarding (and a retired browse-proxy
API kept for a possible future return).

```
┌─────────────────────────────────────────────────────────┐
│  Browser tab                                            │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Desktop (src/os) — windows, taskbar, splash       │  │
│  │ Apps (src/apps) — Browser (direct iframe), …      │  │
│  │ Stores (src/store) + VFS (src/fs) → IndexedDB      │  │
│  └───────────────────────────────────────────────────┘  │
│            │ iframe → remote site    │ /api/llm         │
└────────────┼─────────────────────────┼──────────────────┘
             ▼                         ▼
      Third-party origin          Next.js route
      (X-Frame may block)         Forward to OpenAI /
                                  Anthropic / Gemini /
                                  NVIDIA (user’s key)
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

## Browser

The in-app **Browser** loads `https://…` URLs **directly** in a sandboxed
iframe. Sites that forbid framing stay blank. The old **`/api/proxy`** rewrite
stack is **retired** (code retained); see [PROXY.md](PROXY.md).

## LLM / assistant

- Settings store API keys and provider choice in IndexedDB
- `/api/llm` forwards chat completions; the server must not persist keys
- Assistant tools in `src/agent/tools.ts` can act on the OS (files, windows, …)

## Deploy

Do **not** use static `output: "export"`. Netlify (`netlify.toml` +
`@netlify/plugin-nextjs`) and Vercel both work with a Node server runtime.
