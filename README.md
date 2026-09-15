# Request Tracker Web

React, TypeScript, Vite, and Tailwind frontend for the tenant-aware Request Tracker API. UI primitives live under `src/components/`; design tokens live in `design/design-tokens.json` and are mapped through `tailwind.config.ts`.

## Quick start

PowerShell:

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env
pnpm dev
```

POSIX:

```bash
pnpm install --frozen-lockfile
cp .env.example .env
pnpm dev
```

The Web checkout does not contain Docker Compose, database upgrades, or seed scripts. Start SQL Server, MinIO, Redis, MailHog, and Django through the sibling `rt-api`/`rt-infra` documentation. The API serves its generated OpenAPI contract at `http://localhost:8000/api/schema`.

Never commit `.env`; the tracked `.env.example` contains only non-secret Web defaults.

## Checks

```powershell
pnpm typecheck
pnpm lint
pnpm build
pnpm test
git diff --check
```

`pnpm test` runs Chromium Playwright smoke tests with intercepted contract-shaped API responses. It verifies Web behavior but is not live API, SQL Server, MinIO, Redis, MailHog, tenancy, or backend authorization evidence. Follow `docs/sprint-3-web-verification.md` for live-service verification.

## Codex workflow

Read `AGENTS.md`, `.agent/PLANS.md`, and the explicitly selected active ExecPlan before complex work. Reusable prompts are in `docs/codex-prompts.md`. The checked-in `.codex/config.toml.example` selects GPT-6 Astra for Codex development; it does not add an OpenAI integration to Request Tracker.
