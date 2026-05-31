# Sprint 2 Web ExecPlan — Full Request Lifecycle UI

## Purpose

This plan completes the frontend request lifecycle. After the change, users can create a request, open a complete Request Detail page, add comments and attachments, transition or close a request, see dashboard summary counts, and manage simple profile/preferences.

## Repository orientation

This plan applies to `rt-web`. Relevant areas: `src/pages/`, `src/components/`, `src/api.ts` or `src/api/`, `design/design-tokens.json`, Tailwind config, `AGENTS.md`, and `.agent/PLANS.md`.

## Current behavior

Sprint 1 has login, shell, Home, Search, comments/uploads, and user menu. Sprint 2 Day 1-2 added a protected Request Detail route at `/requests/:id`, navigation from Home/Search rows to detail, and a detail API adapter that uses the shared tenant/auth Axios client. Create Request is not yet a full user flow: the top bar and Home page `New Request` buttons still show placeholder alerts, and there is no `/requests/new` route.

## Desired behavior

Users navigate from Home/Search to `/requests/:id`, see details, comments, attachments, and activity, create a request from `/requests/new`, and transition or close it from detail. Day 3-4 specifically delivers a protected create page with validation states, API submission through the shared Axios client, and navigation to the created Request Detail page after success.

## Scope

In scope: Request Detail page, Create Request flow, transition/close UI, dashboard summary integration, basic profile/preferences, loading/empty/error states. Out of scope: admin workflow builder, OIDC/AD, WebSockets.

## Implementation plan

### Milestone 1: Request Detail route

Create `/requests/:id`, API client calls, header, details, comments, attachments, and activity timeline.

### Milestone 2: Create Request flow

User-visible outcome: a signed-in user can click `New Request`, complete a compact create form, see inline validation, submit it through the API, and land on `/requests/:id` for the created request.

Implementation steps:

1. Add a protected route in `src/main.tsx`:
   - Path: `/requests/new`
   - Element: `RequestCreatePage`
   - Reuse the existing `Protected` wrapper so unauthenticated users are redirected to `/login`.
2. Replace placeholder `New Request` alerts with navigation:
   - In `src/pages/App.tsx`, make the top bar `New Request` action navigate to `/requests/new`.
   - In `src/pages/HomePage.tsx`, make the Home `New Request` action navigate to `/requests/new`.
   - Keep left rail `New Request` behavior consistent with the top bar if it is wired during this milestone.
3. Create `src/api/requestCreate.ts`:
   - Export `CreateRequestPayload`, `CreateRequestResult`, and `createRequest(payload)`.
   - Use the shared `src/lib/api.ts` Axios instance so `Authorization` and `X-Tenant` headers are included automatically.
   - Call `POST /requests/`.
   - Send API field names: `flow_id`, `status_id`, `requester_id`, and `assignee_id`; never send display-only field names such as `flow`, `requester`, or `assignee`.
   - Send `priority` as a lowercase value: `low`, `normal`, `high`, or `urgent`.
   - Read the public `request_id` from the create response and use only that value for post-create detail navigation.
4. Create `src/pages/RequestCreatePage.tsx`:
   - Use a full page, not a modal, for this milestone. This keeps the create flow bookmarkable and easier to validate manually.
   - Fields: `title` required, `description` required, `flow_id` required, `status_id` loaded from selected flow, `priority`, `assignee_id`, `requester_id`, `tags`, and `due_at`.
   - Use top labels, helper text, required asterisks, focus-visible outlines, and `danger-500` error text per `AGENTS.md`.
   - Use Tailwind tokens already exposed in `design/design-tokens.json` and `tailwind.config.ts`; do not introduce hardcoded palette values outside the existing token classes.
5. Validation behavior:
   - Disable submit while posting.
   - Required field errors appear inline under fields after submit attempt or blur.
   - When `flow_id` changes, load statuses for that flow, select the Open status by default, and block submit if no Open `status_id` is available.
   - API errors render in the repo error shape if available: `code`, `message`, `details[]`; map backend fields such as `flow_id`, `status_id`, `requester_id`, and `assignee_id` to readable labels in form-level or inline errors.
   - Do not navigate on validation or API failure.
6. Success behavior:
   - After `createRequest` succeeds, navigate to `/requests/${encodeURIComponent(created.requestId)}`.
   - Do not navigate with `human_id`, `humanid`, `requestid`, internal `id`, `null`, or `undefined`.
   - If `request_id` is not returned, show a non-field error and stay on the form.
7. Out-of-scope for this milestone:
   - Attachment upload during creation.
   - Workflow transitions or closing.
   - Loading flow/user option lists from admin APIs. Use simple inputs or static options until API endpoints are confirmed.

### Milestone 3: Transitions and close

Fetch available transitions, render actions, support optional transition comment, and refresh detail after success.

### Milestone 4: Dashboard summary integration

Replace multiple count calls with `GET /api/dashboard/summary/` when available.

### Milestone 5: User profile/preferences

Add profile/preferences route or panel from user menu with display name, email, employee code, tenant info, and placeholder theme/density controls.

## Tests and verification

Run `pnpm lint`, `pnpm typecheck`, and `pnpm build` where available. Manually verify login, Home, create request, detail, comment/upload, transition/close, search, profile, logout.

Milestone 2 exact manual verification:

1. Start API and web.
2. Log in with a valid tenant.
3. From `/`, click the top bar `New Request`.
4. Confirm the app navigates to `/requests/new`.
5. Submit an empty form.
6. Confirm inline required errors appear for title, description, and flow; confirm no API request succeeds and the URL remains `/requests/new`.
7. Fill required fields and optional priority, assignee, requester, tags, and due date.
8. Submit the form.
9. Confirm the request is created through `POST /requests/` with `Authorization` and `X-Tenant` headers.
10. Confirm submit is disabled while posting.
11. Confirm success navigates to `/requests/:id`.
12. In Chrome DevTools Network, confirm `POST /api/requests/` returns `201` with `response.request_id`, the browser navigates to `/requests/{request_id}`, and the detail `GET` returns `200`.
13. Return Home and confirm the Home page `New Request` button also navigates to `/requests/new`.
14. If the API returns validation errors, confirm they render inline or in a form-level error without navigating.

## Acceptance criteria

Request Detail exists; Create Request works; transition/close works; dashboard summary is consumed; profile/preferences exists; states are implemented; UI follows tokens; auth and X-Tenant headers are sent.

Milestone 2 acceptance criteria:

- `/requests/new` is protected and available through top bar and Home `New Request` actions.
- Create form includes title, description, flow, priority, assignee, requester, tags, and due date inputs.
- Required-field validation states are visible and accessible.
- API submission uses `POST /requests/` through the shared Axios client and sends `flow_id`, `status_id`, `requester_id`, optional `assignee_id`, lowercase `priority`, `tags`, and `due_at`.
- API and validation failures keep the user on the form and show clear errors.
- Successful creation navigates to `/requests/{request_id}` using the create response `request_id`.
- Request Detail renders real API data after a successful detail `GET` and does not show demo fallback messaging in authenticated API flows.
- Request Detail normalizes nested API objects and renders `flow.name`, `status.name`, `requester.display_name/email`, and `assignee.display_name/email` or `Unassigned`; it never renders raw objects in JSX.
- Home and Search rows navigate with `request.request_id`; rows without `request_id` do not navigate to `/requests/-`.
- No attachment upload, transition, or close behavior is introduced in this milestone.

## Progress

- [x] Milestone 1 completed.
- [x] Milestone 2 completed.
- [ ] Milestone 3 completed.
- [ ] Milestone 4 completed.
- [ ] Milestone 5 completed.

## Surprises & Discoveries

- 2026-05-30: Current routes are `/`, `/search`, and `/requests/:id`; `/requests/new` does not exist yet.
- 2026-05-30: Top bar and Home `New Request` actions are still placeholder alerts.
- 2026-05-30: `src/lib/api.ts` centralizes auth and tenancy headers with `Authorization: Bearer <token>` and `X-Tenant`.
- 2026-05-30: Design tokens are available through Tailwind classes mapped from `design/design-tokens.json`; status/priority UI components already exist under `src/components/requests/`.
- 2026-05-30: Create Request can be implemented without new dependencies; current React Router setup supports adding `/requests/new` beside `/requests/:id`.
- 2026-05-30: The API response ID normalizer must tolerate both public field names (`human_id`, `request_id`) and current legacy frontend names (`humanid`, `requestid`).
- 2026-05-30: Backend validation rejects the original create payload because it used `flow`, `requester`, and `assignee`; the create endpoint expects `flow_id`, `status_id`, `requester_id`, and `assignee_id`.
- 2026-05-30: Priority labels can stay user-friendly in the UI, but submitted values must be lowercase: `low`, `normal`, `high`, or `urgent`.
- 2026-05-30: `/requests/new` must be registered before `/requests/:id`; otherwise React Router treats `new` as a request ID.
- 2026-05-30: The create endpoint returns the public `request_id`; navigating with human/legacy IDs causes the detail route to miss the newly created SQL Server row and show the old demo-data fallback.
- 2026-05-30: Request Detail should treat the detail API response as authoritative. Comment or activity fetch failures can show empty sections, but a `200` detail response should still render real request data.
- 2026-05-30: Detail responses now include nested `flow`, `status`, `requester`, and nullable `assignee` objects. Rendering those fields directly crashes React, so adapters must flatten them to display strings before JSX.
- 2026-05-30: Home/Search list rows need a distinct `requestId` route key from the display `id`; using `id`, `human_id`, or `-` can route users to `/requests/-` or the wrong detail URL.

## Decision Log

- 2026-05-30: Use a full `/requests/new` route instead of a modal for Create Request. This supports direct navigation, simpler validation, and easier manual smoke testing.
- 2026-05-30: Use `POST /requests/` for creation because existing request list/detail APIs are under `/requests/` and the frontend already uses the shared Axios client for tenant/auth headers.
- 2026-05-30: Defer create-time attachments until after the base create flow is stable; attachments already exist in the comment/upload flow.
- 2026-05-30: Use simple text inputs/static priority options for flow, assignee, requester, and tags until API endpoints for option lists are confirmed.
- 2026-05-30: Treat flow, requester, and assignee inputs as ID inputs for now. The UI can later replace these with name-based selectors, but the payload must remain ID-based.
- 2026-05-30: Load flow statuses from `/flows/:flowId/statuses/` on flow selection and send the Open `status_id` by default.
- 2026-05-30: Omit empty optional fields where appropriate and send blank assignee as `assignee_id: null`, not an empty string.
- 2026-05-30: Post-create navigation uses only `response.request_id` from `POST /requests/`. If that field is missing, the form shows an error and does not guess from `human_id`, `requestid`, or internal IDs.
- 2026-05-30: Disable the Request Detail demo-data fallback by default. It is now available only when `VITE_ENABLE_DEMO_DETAIL_FALLBACK=true`; authenticated API flows show a clear error state instead.
- 2026-05-30: Normalize nested request detail/list/search fields at API adapter boundaries. Components receive strings for flow, status, requester, and assignee, plus optional `statusCategory` for badge styling.
- 2026-05-30: Keep table display IDs separate from route IDs. Home and Search route with `request_id` only and disable row activation when that value is missing.

## Outcomes & Retrospective

Milestone 2 outcome: `/requests/new` now exists as a protected full-page create flow. Top bar, left rail, and Home `New Request` actions navigate to it. The form validates title, description, flow ID, requester ID, and Open status ID before submission, sends `POST /requests/` through the shared Axios client, renders API/form errors without navigating, disables submit while posting, and navigates to `/requests/{request_id}` only when the API returns the public `request_id`. The payload now uses backend field names (`flow_id`, `status_id`, `requester_id`, `assignee_id`) and lowercase priority values. Request Detail loads real API data through the shared Axios client, normalizes nested detail objects into display strings, and no longer shows demo fallback messaging by default. Home and Search row navigation now use `request_id` instead of display IDs and avoid routing missing IDs to `/requests/-`. Create-time attachments, workflow transitions, and close behavior remain deferred to later milestones.
