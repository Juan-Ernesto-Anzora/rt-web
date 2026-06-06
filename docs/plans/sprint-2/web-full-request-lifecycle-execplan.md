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

Implementation steps:

1. Extend `src/api/requestDetail.ts`:
   - Export `RequestTransition`, `listRequestTransitions(requestId)`, and `applyRequestTransition(requestId, payload)`.
   - Use the shared `src/lib/api.ts` Axios instance so `Authorization` and `X-Tenant` headers are included automatically.
   - Fetch available workflow actions from `GET /requests/{request_id}/available-transitions/`.
   - Apply the selected action with `POST /requests/{request_id}/transition/` using `transition_id` and optional `comment_markdown`.
   - Normalize transition IDs, labels, destination status names/categories, terminal flags, and comment requirements.
   - Never update workflow state by PATCHing the request detail endpoint; transition validation, status updates, optional comments, and activity events are handled by the workflow transition endpoint.
2. Update `src/pages/RequestDetailPage.tsx`:
   - Load transitions after real detail loads.
   - Render compact workflow actions in the right sidebar.
   - Support an optional transition comment and required-comment validation when the API marks a transition as requiring one.
   - Always ask the API for available transitions, even when the current status is terminal, so backend-allowed actions such as Reopen can be shown.
   - Refresh detail, transitions, comments, and activity after a successful transition.
   - Mirror a submitted transition comment into the regular request comments flow when the transition response does not attach one, then include comments in the Activity timeline display.
   - Show a clear error state on transition list or apply failures.
3. Keep out of scope:
   - Workflow builder/admin screens.
   - Custom transition forms beyond one optional comment.
   - Backend workflow changes.

### Milestone 4: Dashboard summary integration

Replace multiple count calls with `GET /api/dashboard/summary/` when available.

Implementation steps:

1. Update `src/api/dashboard.ts`:
   - Replace the four separate `/requests/` count calls with a single shared-client request to `GET /dashboard/summary/`.
   - Normalize common response field names: `open`, `in_progress`, `inProgress`, `due_today`, `dueToday`, and `overdue`, including nested `kpis` or `counts` wrappers if returned.
   - Keep the shared Axios client so `Authorization` and `X-Tenant` headers are included.
2. Update `src/pages/HomePage.tsx`:
   - Keep the existing KPI card layout and design-token styling.
   - Start KPI values at zero and show a clear API error if the summary endpoint fails.
   - Do not show demo KPI fallback values for authenticated API flows.
3. Keep out of scope:
   - Changing dashboard list endpoints or filters.
   - Adding new charts or page layout patterns.

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

Milestone 3 exact manual verification:

1. Open an existing non-terminal request detail page at `/requests/{request_id}`.
2. Confirm `GET /api/requests/{request_id}/available-transitions/` runs with `Authorization` and `X-Tenant` headers.
3. Confirm available workflow actions render in the right sidebar.
4. Select a non-terminal workflow action, optionally add a comment, and submit.
5. Confirm `POST /api/requests/{request_id}/transition/` sends `transition_id` and optional `comment_markdown`.
6. Confirm no `PATCH /api/requests/{request_id}/` is sent for workflow actions.
7. Select a terminal/close transition when available and submit.
8. Confirm close can include a comment in the transition `comment_markdown` payload.
9. Confirm the detail page refreshes and shows the new status.
10. Confirm the activity timeline records `status.changed` or `request.closed`.
11. Confirm the request refreshes into the closed/terminal status and the workflow panel still loads available transitions.
12. If the backend allows reopening, confirm a Reopen action appears on the closed request and can move the request back to an open status.
13. Confirm an optional transition comment appears in the Comments section and the Activity timeline after refresh.
14. Force or observe an API failure and confirm a clear inline error appears without navigating away.

Milestone 4 exact manual verification:

1. Open Home after logging in with a valid tenant.
2. In DevTools Network, confirm the KPI load is `GET /api/dashboard/summary/`.
3. Confirm the request includes `Authorization` and `X-Tenant` headers through the shared API client.
4. Confirm the old KPI fan-out calls to `/api/requests/?status_category=open`, `/api/requests/?status_category=in_progress`, `/api/requests/?due=today`, and `/api/requests/?overdue=true` are not sent.
5. Confirm the Open, In Progress, Due Today, and Overdue KPI cards show values from the summary response.
6. Force or observe a summary endpoint failure and confirm Home shows a clear dashboard summary error without demo KPI values.

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

Milestone 3 acceptance criteria:

- Request Detail fetches available transitions for the current `request_id` through the shared Axios client.
- The right sidebar renders transition actions without reintroducing placeholder alerts or old demo-only UI.
- A selected transition can be submitted with optional comment text.
- Required transition comments are validated client-side when the transition contract says they are required.
- Successful transitions refresh the detail, comments, activity, and available actions.
- Terminal/closed requests still fetch available transitions and show Reopen when the API allows it.
- Transition load/apply failures show clear errors and keep the user on Request Detail.
- Workflow actions call `POST /requests/{request_id}/transition/`; they never call `PATCH /requests/{request_id}/`.
- Close actions can include a comment.
- Activity is refreshed after transition so `status.changed`, `request.closed`, and user transition comments appear in the timeline.

Milestone 4 acceptance criteria:

- Home KPIs are loaded from `GET /dashboard/summary/` through the shared Axios client.
- Summary response field names are normalized into `open`, `inProgress`, `dueToday`, and `overdue`.
- KPI cards preserve the existing compact Home UI style and loading state.
- The old four-request KPI count fan-out is removed.
- Summary load failures show a clear error and do not display demo fallback KPI values.

## Progress

- [x] Milestone 1 completed.
- [x] Milestone 2 completed.
- [x] Milestone 3 completed.
- [x] Milestone 4 completed.
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
- 2026-05-31: This web repo does not include an OpenAPI document; workflow UI follows the existing request subresource pattern already used by comments, attachments, and activity.
- 2026-05-31: Request detail statuses include `is_terminal`; the frontend can use that flag to suppress further workflow actions after close.
- 2026-06-06: Real Day 6 testing showed the status-derived PATCH fallback was wrong. The backend rejects `PATCH /requests/{request_id}/` with tenant validation such as `flow_id: Not found for this tenant`; workflow actions must use the workflow transition endpoint.
- 2026-06-06: The API exposes `GET /requests/{request_id}/available-transitions/` for allowed actions and `POST /requests/{request_id}/transition/` for applying one selected `transition_id`.
- 2026-06-06: Transition comments are sent as `comment_markdown`, not `comment`, and activity/status updates are backend workflow responsibilities.
- 2026-06-06: Closed requests can still have backend-allowed available transitions such as Reopen, so the web must not suppress workflow loading merely because `status.is_terminal` is true.
- 2026-06-06: The tested transition response accepted `comment_markdown`, but the activity payload still showed `comment_id: null`; the web needs to preserve the user's transition comment visibly by refreshing/including regular request comments in the timeline.
- 2026-06-06: Home KPI loading was still implemented as four `/requests/` count queries. Day 7 replaces that with the dedicated dashboard summary endpoint.
- 2026-06-06: The web repo has no local OpenAPI file, so the dashboard summary adapter accepts both snake_case and camelCase response names while pointing at the confirmed summary endpoint path.

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
- 2026-05-31: Keep transition controls in the Request Detail right sidebar so lifecycle actions stay close to status, priority, assignee, and due-date context.
- 2026-06-06: Use only the workflow endpoints for lifecycle changes: `GET /available-transitions/` and `POST /transition/`.
- 2026-06-06: Store and submit the selected `transition_id`; do not derive or submit destination `status_id` from the web UI.
- 2026-06-06: Surface backend validation messages from transition failures directly in the workflow panel.
- 2026-06-06: Always fetch available transitions from the API for the current request, including terminal/closed requests, and let an empty API response decide whether no actions are available.
- 2026-06-06: After a successful transition with comment text, create a regular request comment as a visibility fallback and merge comments into the Activity timeline display.
- 2026-06-06: Use `GET /dashboard/summary/` as the sole KPI source for Home summary cards; keep request list loading unchanged for this milestone.
- 2026-06-06: Do not fall back to demo KPI values when the authenticated summary endpoint fails; show a clear error while keeping zero or last-known values.

## Outcomes & Retrospective

Milestone 2 outcome: `/requests/new` now exists as a protected full-page create flow. Top bar, left rail, and Home `New Request` actions navigate to it. The form validates title, description, flow ID, requester ID, and Open status ID before submission, sends `POST /requests/` through the shared Axios client, renders API/form errors without navigating, disables submit while posting, and navigates to `/requests/{request_id}` only when the API returns the public `request_id`. The payload now uses backend field names (`flow_id`, `status_id`, `requester_id`, `assignee_id`) and lowercase priority values. Request Detail loads real API data through the shared Axios client, normalizes nested detail objects into display strings, and no longer shows demo fallback messaging by default. Home and Search row navigation now use `request_id` instead of display IDs and avoid routing missing IDs to `/requests/-`. Create-time attachments, workflow transitions, and close behavior remain deferred to later milestones.

Milestone 3 outcome: Request Detail now loads allowed workflow actions from `GET /requests/{request_id}/available-transitions/`, renders user-friendly labels based on `to_status.name`, stores the selected `transition_id`, applies it with `POST /requests/{request_id}/transition/` and optional `comment_markdown`, and refreshes detail/comments/activity/actions after success. Workflow actions no longer PATCH the request detail endpoint. Closed/terminal requests still fetch available actions so Reopen can appear when the API allows it. Transition comments are preserved as regular request comments when needed and are merged into the Activity timeline display. Transition load/apply failures show backend validation messages inline without navigating away.

Milestone 4 outcome: Home KPI cards now load from the dedicated `GET /dashboard/summary/` endpoint through the shared Axios client, normalizing summary response fields into Open, In Progress, Due Today, and Overdue values. The old four-call `/requests/` count fan-out was removed, and summary failures now show a clear error instead of demo KPI fallback values.
