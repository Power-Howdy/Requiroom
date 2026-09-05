# Open source checklist

Use this when making the repository public on GitHub (or another host).

## Before you publish

1. **License** — Confirm [LICENSE](../LICENSE) (MIT) matches your intent. Update
   the copyright line if you want a personal or org name instead of
   “Requiroom Contributors”.
2. **Replace placeholders** — In
   [`.github/ISSUE_TEMPLATE/config.yml`](../.github/ISSUE_TEMPLATE/config.yml),
   change `OWNER/REPO` to your GitHub `owner/repo` so Security / Contributing
   links work.
3. **Secrets** — Ensure no `.env`, keys, or personal data are tracked
   (`git status`, search history if the repo was ever private with secrets).
4. **README** — Add your real clone URL, demo link (if any), and maintainer
   contact once the remote exists.
5. **Branch protection** (recommended) — Require CI (`CI` workflow) and a review
   before merging to `main`.
6. **Security advisories** — Enable private vulnerability reporting in GitHub
   repo settings.
7. **Topics** — e.g. `nextjs`, `desktop`, `browser`, `opensource`, `typescript`.

## After you publish

- Pin a short README blurb and link [CONTRIBUTING.md](../CONTRIBUTING.md).
- Triage issues with the provided templates.
- Prefer discussing large LLM (or revived proxy) changes in an issue before a big PR.

## Optional extras later

- `NOTICE` or third-party attribution file if you redistribute bundled assets
- GitHub Discussions for Q&A
- Dependabot / Renovate for dependency updates
- A public demo with auth or rate limits on `/api/llm`
