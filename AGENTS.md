# AGENTS.md — Request Tracker (RT)

> **Read this file in full before making any code changes.** Agents and contributors must follow these rules when proposing or committing changes.

## 1. Tech stack & architecture
- **Frontend**: React (TypeScript), Vite, Tailwind, and local primitives under `src/components/`.
- **Backend**: Django + Django REST Framework; `djangorestframework-simplejwt` for local JWT during dev; path to OIDC kept ready.
- **DB**: SQL Server (primary). Use Full-Text Search for keyword queries.
- **Storage**: MinIO (S3-compatible) with **pre-signed uploads**.
- **Async**: Celery + Redis (email, notifications, file scans). Realtime: **polling MVP**, **Django Channels** later.
- **Tenancy**: single DB with `tenant_id` discriminator. All queries must be tenant-scoped.
- **Spec-first**: The sibling `rt-api` repository generates the source-of-truth contract at `GET /api/schema` with drf-spectacular. Verify that schema and the API serializers/tests before changing endpoint assumptions; do not invent Web endpoints.

## 2. Design system
- **Tokens**: See `design/design-tokens.json` and `tailwind.config.ts`. Never hardcode colors/spacing/typography.
- **Accessibility**: WCAG AA contrast, focus-visible outlines, tab order, ARIA labels for controls.
- **Density**: compact by default; components support comfortable density.
- **Status colors**: open/indigo, in-progress/indigo, waiting/amber, closed/neutral (see UI kit).

## 3. UI conventions
- **Global app bar**: left = product name; right = **user menu** (avatar/name).  
  - Menu items (initial set): **Profile & Preferences**, **Keyboard Shortcuts**, **Saved Views**, **Notifications**, **Switch Company/Tenant**, **Log out**.
- **Left rail**: New Request, My Tasks, Other Tasks, My Requests, Search, Settings.
- **Tables**: left-aligned text, fixed header, zebra rows off, hover highlight on, 48px row height.
- **Forms**: label top, helper text below, error text red/danger-500, required = asterisk.
- **Attachments**: grouped multi-upload → one comment bubble.
- **Search**: single unified page for open/closed; facets for status, assignee, flow, tag, date ranges.

## 4. API usage rules
- Include `Authorization: Bearer <jwt>` and `X-Tenant: <tenant_code>` on every request.
- Pagination: `page`, `page_size` (default 25). Sorting: `sort` (e.g., `-updated_at`).
- Errors: return JSON with `code`, `message`, `details[]`. Never leak stack traces.
- Don’t invent endpoints—extend the OpenAPI first.

## 5. Security & data
- Enforce tenant isolation on every queryset.
- AuthZ: RBAC via roles and permissions. Never rely on client flags for permission.
- Validate and virus-scan file uploads asynchronously; block serving until scan=clean.
- Log auditable events to `Activity` (who, what, when, request_id, payload).

## 6. Tests & quality (required before commit)
- **Current Web runners**: TypeScript (`pnpm typecheck`), ESLint (`pnpm lint`), Vite production build (`pnpm build`), and Playwright Chromium smoke (`pnpm test`).
- **Test scope**: Playwright uses intercepted contract-shaped APIs by default; it does not prove live API, SQL Server, MinIO, Redis, Celery, MailHog, tenancy, or backend authorization behavior.
- **Missing tooling**: Vitest and React Testing Library are not installed. Unit/component coverage remains a quality requirement when a change warrants it, but adding a runner requires an approved ExecPlan and dependency change. Never claim or invent an unavailable test command.
- **Formatting/tooling gap**: Prettier is a stated Web formatting requirement but is not installed or scripted in this checkout. Preserve existing formatting and record the missing runner; do not claim Prettier ran or add it outside an approved tooling change.
- **Backend checks**: pytest, Ruff, Black, isort, Django check, and OpenAPI validation run in the sibling `rt-api` repository as documented in its verification guide. Backend coverage/type-check tools not present there must not be claimed.
- All tests and linters **must pass locally** and in CI **before** a PR is merged.

## 7. Git & branching (trunk-based)
- Default branch: `main` (protected).
- Branch from `main` using:  
  - `feat/<scope>-<short-desc>` new feature  
  - `fix/<scope>-<short-desc>` bugfix  
  - `chore/<scope>-<short-desc>` tooling or infrastructure  
  - `docs/<scope>-<short-desc>` docs only  
  - `refactor/<scope>-<short-desc>` behavior-preserving changes
- Keep PRs **small** (≤ 400 lines changed ideally). Larger changes must be split.

## 8. Commit messages — Conventional Commits
- Format: `<type>(<scope>): <short summary>`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`
- Add `!` for breaking changes, describe them in the body.
- Examples:  
  - `feat(requests): add grouped multi-file upload`  
  - `fix(search): escape special chars in FTS query`

## 9. Pull requests
- Open against `main`. Draft until all checks pass.
- PR title mirrors Conventional Commit format when squash-merging.
- **Checklist (must pass):**
  - [ ] Unit/integration tests added/updated and green
  - [ ] Lint/type checks pass
  - [ ] OpenAPI updated (if API changed)
  - [ ] UI matches design tokens & accessibility
  - [ ] Changelog entry (if user-visible change)
- Reviewers: auto-assigned by `CODEOWNERS`. Two approvals required for sensitive areas (auth, tenancy, file uploads).

## 10. Release & versioning
- Semantic Versioning (`MAJOR.MINOR.PATCH`).
- Squash merge with Conventional Commit title to auto-generate changelog.
- Tag releases from CI on `main` after passing smoke E2E.

## 11. Local dev & scripts
- Install Web dependencies: `pnpm install --frozen-lockfile`.
- Create local Web env on PowerShell: `Copy-Item .env.example .env`; on POSIX: `cp .env.example .env`. Never commit `.env`.
- Run Web: `pnpm dev`; preview a production build: `pnpm preview`.
- The Web repository does not contain Docker Compose or seed scripts. Start and verify API/SQL Server/MinIO/Redis/MailHog through the sibling `rt-api` and `rt-infra` documentation.
- The generated API contract is served by the sibling API at `http://localhost:8000/api/schema` when that service is running.

## 12. Agent workflow (how to operate)
1) Read **this file end-to-end** and the current ticket.  
2) Read `.agent/PLANS.md`, select and name the active ExecPlan when required, and treat completed/historical plans as evidence rather than authorization.
3) State a short plan and acceptance criteria. Update the API OpenAPI source in `rt-api` or design tokens first when the requested contract changes.
4) Finish authorized work end to end. Make routine, reversible implementation choices that follow existing patterns; ask only when a material ambiguity can change the outcome or a real permission/managed-control boundary blocks progress.
5) Implement incrementally and run focused checks while iterating. Run the complete required Web check set at the PR gate; rerun it only after relevant changes, failures, or unresolved risk justify another pass.
6) If an instruction causes a pause, block, or scope change, name the instruction file and applicable rule and distinguish the rule from your interpretation. Never bypass managed controls or explicit user scope.
7) Open a small PR with clear title/body and checklist when requested. Respond to review feedback and keep the PR based on the intended current branch.

## 13. Ownership
- See `CODEOWNERS` for paths and required reviewers.
- Security-sensitive code paths: `/api/auth/**`, `/api/tenancy/**`, `/api/uploads/**`, `/infra/**`.

## 14. Notes for future phases
- Switch polling → WebSockets (Channels) for live comments/counters.
- Optional OpenSearch backend for search with query DSL.
- SSO/OIDC path with well-known discovery; keep JWT as fallback for dev.

## 15. Codex ExecPlans

For complex features, multi-file refactors, security-sensitive changes, API contract changes, database changes, upload/search changes, or Sprint work, Codex must create or update an ExecPlan following `.agent/PLANS.md`.

ExecPlans must live under `docs/plans/`. The active ExecPlan must be updated throughout implementation, especially `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective`.

For small single-file fixes, an ExecPlan is optional, but Codex must still state goal, constraints, and done criteria before editing.

Before implementation, Codex must read:
1. `AGENTS.md`
2. `.agent/PLANS.md`
3. the explicitly selected active ExecPlan for the branch/task
4. any repo-specific design/API/token files referenced by the plan

Do not infer the active plan from an old prompt, Sprint number, unchecked historical box, or filename recency. When a user reports a milestone complete, reconcile that report with code, Git, and verification evidence; leave deployment or live-service state unverified when this checkout cannot establish it.

## 16. Instruction hierarchy and model scope

- Preserve runtime-managed controls and explicit user scope. Apply this root file throughout the repository unless a nearer `AGENTS.md` provides a path-specific override.
- Skills, ExecPlans, prompts, and historical notes guide execution within that hierarchy; they do not grant broader permissions or override a newer explicit user request.
- The checked-in `.codex/config.toml.example` configures Codex development only. It does not add an OpenAI model or API integration to Request Tracker.
- For GPT-6 Astra work, keep prompts direct about completion, material ambiguity, blocking rules, check scope, and expected output. Do not add repetitive instructions that already exist at a higher-priority layer.

---

*This AGENTS.md reflects the design and constraints agreed for the Request Tracker modernization project.*
