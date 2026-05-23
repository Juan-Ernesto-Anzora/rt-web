# Sprint 2 Web ExecPlan — Full Request Lifecycle UI

## Purpose

This plan completes the frontend request lifecycle. After the change, users can create a request, open a complete Request Detail page, add comments and attachments, transition or close a request, see dashboard summary counts, and manage simple profile/preferences.

## Repository orientation

This plan applies to `rt-web`. Relevant areas: `src/pages/`, `src/components/`, `src/api.ts` or `src/api/`, `design/design-tokens.json`, Tailwind config, `AGENTS.md`, and `.agent/PLANS.md`.

## Current behavior

Sprint 1 has login, shell, Home, Search, comments/uploads, and user menu. Request Detail and Create Request are not full user flows.

## Desired behavior

Users navigate from Home/Search to `/requests/:id`, see details, comments, attachments, and activity, create a request from `/requests/new`, and transition or close it from detail.

## Scope

In scope: Request Detail page, Create Request flow, transition/close UI, dashboard summary integration, basic profile/preferences, loading/empty/error states. Out of scope: admin workflow builder, OIDC/AD, WebSockets.

## Implementation plan

### Milestone 1: Request Detail route

Create `/requests/:id`, API client calls, header, details, comments, attachments, and activity timeline.

### Milestone 2: Create Request flow

Create `/requests/new` or modal. Fields: title, description, flow, initial status, priority, assignee, tags, due date. On success, navigate to detail.

### Milestone 3: Transitions and close

Fetch available transitions, render actions, support optional transition comment, and refresh detail after success.

### Milestone 4: Dashboard summary integration

Replace multiple count calls with `GET /api/dashboard/summary/` when available.

### Milestone 5: User profile/preferences

Add profile/preferences route or panel from user menu with display name, email, employee code, tenant info, and placeholder theme/density controls.

## Tests and verification

Run `pnpm lint` and `pnpm build`. Manually verify login, Home, create request, detail, comment/upload, transition/close, search, profile, logout.

## Acceptance criteria

Request Detail exists; Create Request works; transition/close works; dashboard summary is consumed; profile/preferences exists; states are implemented; UI follows tokens; auth and X-Tenant headers are sent.

## Progress

- [ ] Milestone 1 completed.
- [ ] Milestone 2 completed.
- [ ] Milestone 3 completed.
- [ ] Milestone 4 completed.
- [ ] Milestone 5 completed.

## Surprises & Discoveries

Record findings here.

## Decision Log

Record decisions here.

## Outcomes & Retrospective

Complete after merge.
