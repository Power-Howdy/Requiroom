# Requiroom

**In-browser desktop OS** — a room that provides what you need. Multi-window UI,
virtual filesystem, themed chrome, simulated Linux shell, and an in-app Browser
that loads sites directly in a frame.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Features

- **Browser** — tabs; pages load directly in an iframe (sites that forbid framing stay blank)
- **Files** — explorer, drag-drop upload, zip download, File System Access API when available
- **Terminal** — xterm.js + JS Unix-like commands
- **Editor** — Monaco + VFS tree
- **Notes** — TipTap markdown in `/home/user/Notes`
- **Sheets** — formula-capable grid saved as `.sheet.json`
- **Settings** — Appearance (fonts, colors, icons, wallpapers, 2D/3D, presets) + AI providers
- **Assistant** — tool-calling OS agent (`Ctrl+Space`)

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- Next.js App Router, React, TypeScript, Tailwind
- Zustand stores + IndexedDB (`requiroom`)

## Deploy

Works on **Netlify** (`netlify.toml` + `@netlify/plugin-nextjs`) or **Vercel**.
Do **not** use `output: "export"` — `/api/llm` needs a server runtime.

## Privacy & data

| Data | Where it lives |
| --- | --- |
| VFS, theme, notifications, window layout | IndexedDB in **this browser** |
| LLM API keys | IndexedDB; `/api/llm` only forwards — keys are **not** stored on the server |
| In-app browsing | Direct to the remote site (your client IP); embedding may be blocked by the site |

A same-origin **browse proxy** (`/api/proxy`) is **retired** for now — code kept
for a possible future return. See [docs/PROXY.md](docs/PROXY.md).

## Documentation

| Doc | Contents |
| --- | --- |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Setup, PR process, coding norms |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Community standards |
| [SECURITY.md](SECURITY.md) | Vulnerability reporting |
| [SUPPORT.md](SUPPORT.md) | How to get help |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System overview |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Day-to-day development |
| [docs/PROXY.md](docs/PROXY.md) | Retired browse proxy (reference) |
| [docs/OPEN_SOURCE.md](docs/OPEN_SOURCE.md) | Checklist for publishing the repo |

## Contributing

Issues and pull requests are welcome. Please read
[CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md)
before submitting.

## License

[MIT](LICENSE) © Requiroom Contributors
