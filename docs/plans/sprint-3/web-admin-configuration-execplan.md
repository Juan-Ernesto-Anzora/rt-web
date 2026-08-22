# Sprint 3 Web ExecPlan - Admin and Configuration UI

## Purpose

Sprint 3 adds a permission-aware administration area for Request Tracker configuration. After this sprint, authorized users can open an Admin section, navigate workflow/user/role/report/SLA configuration screens, and see clear access-denied, loading, empty, and error states instead of placeholder alerts or broken routes. Day 7 adds a real-data reports experience, filtered CSV export, and SLA policy administration after their API contracts are documented and implemented.

## Repository orientation

This plan applies to `rt-web`. Relevant files and expected Sprint 3 edit targets:

- `src/main.tsx`: React Router setup and protected route wrappers.
- `src/pages/App.tsx`: global app shell, top bar, left rail, Settings/Admin entry point.
- `src/auth/useAuth.tsx`: current auth context with token and tenant.
- `src/auth/userProfile.ts`: JWT claim decoding helper that can be extended or reused for permission claims.
- `src/lib/api.ts`: shared Axios client that injects `Authorization` and `X-Tenant`.
- `src/api/requestDetail.ts`: existing tenant-user lookup normalization for array or paginated `results` responses; Admin directory calls must use dedicated `/api/admin/*` endpoints instead of the request-assignment lookup.
- `src/api/adminWorkflows.ts`: established admin API client and error-normalization pattern to follow for the new directory client.
- `src/api/adminDirectory.ts`: established typed admin pagination, normalization, permission-aware error, and mutation patterns to reuse for SLA administration.
- `src/api/dashboard.ts`: existing unfiltered dashboard summary client; it is not sufficient as a filtered reports contract.
- `src/features/requestSearch.ts`: existing search parameter and request-result normalization; its current API contract does not cover the complete report filter set or aggregate breakdowns.
- `src/auth/adminPermissions.ts`: tenant-scoped permission context loaded from `GET /api/admin/me/permissions/`; Day 5-6 must use its permission list for `admin.users`, `admin.roles`, and `admin.permissions` controls.
- `src/pages/admin/AdminShellPage.tsx`: existing route-aware Admin shell; Day 7 will add permission-aware Reports and SLA navigation after contracts are confirmed.
- `src/pages/admin/WorkflowAdminPage.tsx`: existing compact Admin loading, empty, save, and error-state patterns.
- `design/design-tokens.json`, `tailwind.config.ts`, and `src/index.css`: design token mappings and shared compact UI classes.
- `src/pages/`: new admin shell, admin landing, and forbidden page files should live here unless a more specific `src/pages/admin/` folder is introduced.
- `src/components/common/`: existing `EmptyState`, `ErrorState`, and `LoadingRows` components for consistent loading/error UI.
- `docs/plans/sprint-3/web-admin-configuration-execplan.md`: active ExecPlan for this sprint.

Current routes in `src/main.tsx` include `/login`, `/search`, `/requests/new`, `/requests/:id`, `/profile/preferences`, `/403`, `/admin/*`, and `/`. `AdminShellPage` resolves `/admin`, `/admin/workflows`, `/admin/users`, `/admin/roles`, `/admin/reports`, and `/admin/sla` inside the protected admin route.

## Current behavior

The admin shell, API-backed route guard, 403 page, Admin -> Workflows, Admin -> Users/Memberships, Admin -> Roles & Permissions, Reports, CSV export, and SLA Policies are implemented. The permission context exposes normalized effective codes and gates report reads with `reports.read`, export with `reports.export`, and SLA administration with `sla.manage`.

The adjacent API repository implements the Day 5-6 directory contract and generates it at `GET /api/schema`. The API server was not running during this planning pass and the local Poetry launcher could not generate a temporary schema, so the checked-in DRF routes, `extend_schema` declarations, serializers, services, tests, and API ExecPlan were inspected as the actual contract. Confirmed endpoints are:

- `GET/POST /api/admin/users/` and `GET/PATCH /api/admin/users/{user_id}/` (`admin.users`).
- `GET/POST /api/admin/memberships/` and `GET/PATCH/DELETE /api/admin/memberships/{membership_id}/` (`admin.users`).
- `GET/POST /api/admin/roles/` and `GET/PATCH /api/admin/roles/{role_id}/` (`admin.roles`).
- `POST /api/admin/memberships/{membership_id}/roles/` and `DELETE /api/admin/memberships/{membership_id}/roles/{role_id}/` (`admin.roles`).
- `GET /api/admin/permissions/`, `POST /api/admin/roles/{role_id}/permissions/`, and `DELETE /api/admin/roles/{role_id}/permissions/{permission_code}/` (`admin.permissions`).

All endpoints additionally require JWT, `X-Tenant`, and baseline `admin.read`. Lists use `page`, `page_size`, and `sort` and return paginated `results`.

The adjacent API `feat/api-sla-reports` worktree now provides the Day 7 contract and tests. Confirmed operations are:

- `GET /api/reports/summary/` with `reports.read`, returning exact server fields `total`, category counts, due/overdue/unassigned counts, `assigned_to_me`, `by_priority`, and `by_status`.
- `GET /api/reports/requests/export/?format=csv` with `reports.export`, the same report filters, UTF-8 CSV, and a server `Content-Disposition` filename.
- `GET/POST /api/admin/sla-policies/` and `GET/PATCH /api/admin/sla-policies/{sla_policy_id}/` with `sla.manage`, paginated list behavior, lowercase priorities, integer targets, and `is_active` deactivation.
- `GET /api/flows/`, flow-status lookup, and `GET /api/users/` provide readable report filter labels while requests submit only non-empty public IDs.

## Desired behavior

The completed Day 1-4 foundation and planned Day 5-6 directory UI should provide:

- Authenticated users can navigate to `/admin`.
- Admin routes are protected first by authentication, then by admin/permission claims.
- Users without admin permission see a clear 403 page, not a blank screen or redirect loop.
- The app has a compact admin shell with navigation for future Sprint 3 screens: Overview, Workflows, Users, Roles/Permissions.
- Admin navigation is permission-aware: users without admin permission should not see an active admin entry in the normal shell, or should be routed to 403 if they enter the URL manually.
- Loading, empty, and error states are explicit for any permission/profile load path used by the guard.
- Admin shell follows existing design tokens, compact density, focus-visible outlines, and left-aligned operational UI.
- The implementation must not rely on client-only flags as the source of backend authorization. Client permissions only guide navigation and presentation; API calls must still rely on backend enforcement.
- Admin -> Users shows a paginated, sortable current-tenant directory with server-side search and active/inactive filtering.
- Admin users can create a domain user and its active-tenant membership atomically, then edit display name, employee code, and active state from a detail drawer or responsive detail page.
- The create dialog states clearly that the operation creates an RT domain record and membership only; it does not create Django authentication credentials, a password, or an OIDC identity.
- Membership rows show the user's readable name/email, assigned roles, and whether this is the user's default tenant. Duplicate membership attempts and default-tenant conflicts render readable API validation.
- Admin -> Roles & Permissions lists, creates, and edits tenant roles; opens role detail; assigns/removes roles from memberships; and renders a permission matrix from the catalogue and each role's assigned permissions.
- The seeded role names `RT Admin`, `RT Manager`, `RT Agent`, `RT Requester`, and `RT Viewer` are shown as canonical roles. Canonical names are not editable because the API returns `409 canonical_role` if renamed.
- Final-admin and self-lockout actions carry a warning before submission and surface `409 admin_lockout` without leaving stale optimistic state.
- Feature controls are permission-aware: `admin.users` controls user and membership actions, `admin.roles` controls role maintenance and membership-role assignment, and `admin.permissions` controls permission mutations. Controls are hidden when irrelevant and disabled with an explanation when context is useful, but every API `403` is still handled.
- Loading skeletons, empty states, inline field validation, keyboard-accessible dialogs/drawers, confirmations for destructive actions, and success/error notifications are explicit. No local/demo fallback is permitted.
- API objects and UUIDs are normalized and never rendered directly or used as primary labels.
- Reports use server-calculated KPI values and breakdowns only: status, priority, overdue, due today, and unassigned values are never inferred from one client page or fabricated for a chart.
- Report filters include search text, flow, status, priority, requester, assignee, and created/updated/due date ranges. Human labels are displayed while API-confirmed IDs and lowercase priority values are submitted.
- CSV export applies the same normalized filter object as the visible report, requires `reports.export`, downloads a blob, prefers a valid server `Content-Disposition` filename, and exposes generating/error states without navigating away.
- SLA administration lists, creates, edits, and deactivates tenant policies using explicit API fields. Priorities use `low`, `normal`, `high`, and `urgent`; response and resolution targets are integer minutes with human-friendly duration hints.
- `reports.read`, `reports.export`, and `sla.manage` independently control navigation and actions. Hidden/disabled controls do not replace backend enforcement, and late `403` responses remain visible.
- Reports and SLA screens use accessible tables/forms, pagination where the API returns collections, responsive layouts, loading/empty/error states, and no local/demo fallback.
- No chart dependency is added. With the current stack, breakdowns use semantic tables plus token-colored CSS bars only when server totals are available; adding a library requires a separate documented justification.

## Scope

In scope for Day 1-2:

- Admin route skeleton under `/admin`.
- Protected admin route guard.
- Permission-aware UI entry point.
- 403 page.
- Admin shell navigation and placeholder admin landing sections.
- Loading/error states for guard/profile evaluation.
- Manual verification steps and negative access checks.

Out of scope for Day 1-2:

- Workflow CRUD screens.
- User membership editing.
- Role/permission matrix editing.
- Backend API changes.
- Persistent admin settings mutations.
- Any API repo changes unless later work requires read-only contract verification.

In scope for Day 5-6 planning and subsequent implementation:

- Admin Users list, filters, create, detail, and edit flows.
- Current-tenant membership list/detail, default-tenant state, membership removal, and role assignment/removal.
- Role list/create/detail/edit and permission catalogue/matrix.
- Feature-level permission-aware controls and API 403 handling.
- Focused automated tests plus manual responsive, keyboard, permission, conflict, and lockout verification.

Out of scope for Day 5-6:

- Creating passwords, Django auth users, invitations, OIDC identities, or any login-provisioning flow.
- Role deletion; the API exposes no role delete endpoint.
- Client-side search across only a loaded page.
- Cross-tenant membership discovery or displaying other tenants' data.
- API repository changes on this web branch. API contract gaps must be resolved in the API repo and generated OpenAPI before dependent web controls are implemented.

In scope for Day 7 planning and subsequent implementation:

- A permission-aware Reports page with server-calculated KPIs, status/priority breakdowns, filters, and optional paginated detail rows only if the API contract returns them.
- CSV export of the current applied report filters with safe filename handling and progress/error feedback.
- SLA policy list/create/edit/deactivate with lowercase priorities and minute-based response/resolution targets.
- URL-stable report filters, real tenant lookup labels, accessible tables/forms, responsive behavior, and focused positive/negative tests.

Out of scope for Day 7:

- Client aggregation from paginated request/search rows.
- Fabricated chart values, local/demo fallbacks, or static SLA examples presented as API data.
- Inventing API paths, filter parameter names, CSV media types, SLA JSON shapes, or deactivation semantics before generated OpenAPI defines them.
- Adding a chart library to the current React/Vite dependency set.
- SLA timer execution, breach notifications, business calendars, holidays, pause conditions, or historical reporting unless the API contract explicitly includes them.

## Implementation plan

### Milestone 1: Admin shell and route guards

User-visible outcome: an authorized admin can open `/admin`, see a compact admin shell with configuration navigation, and a non-admin user sees a clear 403 page.

Implementation steps:

1. Inspect available auth/permission signals:
   - Read `src/auth/useAuth.tsx` and `src/auth/userProfile.ts`.
   - Decode JWT claims for likely admin/permission fields such as `is_staff`, `is_superuser`, `roles`, `groups`, `permissions`, or `scope` if present.
   - If no explicit claim is present, implement the guard so it fails closed unless a clearly documented local development override is used.
2. Add an admin permission helper:
   - New file candidate: `src/auth/permissions.ts`.
   - Export a small typed helper such as `getAuthzProfile(token)` and `canAccessAdmin(profile)`.
   - Keep the helper defensive: unknown/missing claims should not accidentally grant admin access.
3. Add route wrappers in `src/main.tsx`:
   - Keep the existing `Protected` auth wrapper.
   - Add or compose an `AdminProtected` wrapper for `/admin` routes.
   - Add `/admin` and `/admin/*` routes that render an admin shell.
   - Add `/403` route for forbidden access.
4. Add the 403 page:
   - New file candidate: `src/pages/ForbiddenPage.tsx`.
   - Show concise text: access denied, tenant context, and a button back to Home.
   - Do not expose raw token/permission internals.
5. Add admin shell:
   - New file candidate: `src/pages/admin/AdminShellPage.tsx` or `src/pages/AdminShellPage.tsx`.
   - Navigation labels: Overview, Workflows, Users, Roles & Permissions.
   - Use route-aware navigation or internal tab state as appropriate for the existing router style.
   - Placeholder sections must be useful and operational, not marketing copy.
6. Wire admin navigation entry:
   - In `src/pages/App.tsx`, make the existing `Settings` rail item navigate to `/admin` or add an `Admin` item if that is clearer.
   - Entry should be visible only when the decoded profile can access admin, or route to 403 if the user manually navigates.
7. Loading, empty, and error states:
   - If permissions are derived synchronously from JWT claims, show no spinner unless async API verification is added.
   - If an API verification endpoint is later confirmed, show loading while verifying and clear error if verification fails.
   - Admin overview placeholders should use `EmptyState` or simple cards that explain which configuration screens are coming next.
8. Keep out of scope:
   - No workflow/user/role CRUD implementation in this milestone.
   - No backend API changes.
   - No local demo-only admin data mutation.

### Milestone 2: Workflow list/detail/edit screens

User-visible outcome: an authorized admin can open Admin -> Workflows, select a tenant workflow, edit statuses, and add or update allowed transitions without leaving the admin shell.

Implementation steps:

1. Confirm the API contract for workflow administration:
   - List workflows from `GET /api/admin/workflows/`.
   - Load workflow detail from `GET /api/admin/workflows/{flow_id}/`.
   - Create/update statuses through `/api/admin/workflows/{flow_id}/statuses/`.
   - Create/update transitions through `/api/admin/workflows/{flow_id}/transitions/`.
2. Add a workflow admin API client using the shared Axios client so `Authorization` and `X-Tenant` headers are included automatically.
3. Replace the Workflows placeholder with a real Admin -> Workflows screen:
   - Left workflow list.
   - Workflow detail summary.
   - Status editor.
   - Transition editor.
4. Normalize response shapes and never render raw API objects directly.
5. Add client validation before status writes:
   - Status names cannot be duplicated within a workflow.
   - At least one `open` status is required.
   - At least one `closed` or terminal status is required.
6. Add client validation before transition writes:
   - From status and To status are required.
   - From and To statuses must differ.
   - Duplicate From -> To transition pairs are blocked.
7. Show loading, empty, success, and error states for workflow list/detail and editor saves.
8. Keep out of scope:
   - User and role admin screens.
   - Backend API changes.
   - Delete/archive actions not confirmed by the API contract.

### Milestone 3: User/membership screens

User-visible outcome: an operator with `admin.users` can find tenant users, create an RT domain user and membership, inspect a user, update allowed profile fields, manage default-tenant state, and remove a membership with clear safeguards and no suggestion that login credentials were provisioned.

Contract gate, completed before implementation:

1. Verify the generated `GET /api/schema` from the running API against the checked-in DRF contract.
2. Resolve employee-code search in the API/OpenAPI first. The current `GET /api/admin/users/?search=` implementation searches only email and display name even though Day 5-6 requires employee code. Do not fake this with current-page filtering.
3. Resolve labelled discovery for an existing domain user who is not yet in the active tenant before exposing a standalone Create Membership picker. `POST /api/admin/memberships/` accepts `user_id`, but both `/api/admin/users/` and `/api/users/` are tenant-scoped and cannot supply an eligible non-member without requiring a raw UUID. Until the API exposes a tenant-safe email/name lookup, user creation remains the supported labelled membership-creation path because `POST /api/admin/users/` atomically returns `{ user, membership }`.

Implementation steps:

1. Add `src/api/adminDirectory.ts` with explicit DTOs and normalized models for users, memberships, roles, permissions, pagination, and `{code,message,details[]}` errors. Use `src/lib/api.ts` for every call so JWT and `X-Tenant` are automatic.
2. Replace the Users placeholder in `src/pages/admin/AdminShellPage.tsx` with a route-aware `src/pages/admin/AdminUsersPage.tsx`.
3. Load `GET /admin/users/` with `page`, `page_size`, `sort`, submitted or debounced `search`, and `is_active=true|false`. Preserve filters in URL query parameters so refresh/back navigation is predictable.
4. Render a compact responsive table/list with display name, email, employee code, active state, and updated/created date. Use `user_id` only as the route/API key. Add loading skeleton, no-users, no-results, and retryable error states.
5. Add a keyboard-accessible create-user dialog with email, display name, optional employee code, and default-tenant checkbox. POST `{email, display_name, employee_code: string|null, is_default_tenant}` to `/admin/users/`. Show permanent helper text that this creates no password or login credentials. On success, notify, close, refresh the list, and open the returned `user.user_id` detail.
6. Add a user detail drawer on desktop and full-width modal/page presentation on narrow screens. Load `GET /admin/users/{user_id}/` and `GET /admin/memberships/?user_id={user_id}` rather than assuming list data is complete.
7. Allow PATCH `/admin/users/{user_id}/` with only changed `display_name`, `employee_code` (`null` rather than empty when cleared), and `is_active`. Require confirmation before deactivation and warn that inactive users cannot receive memberships or roles. Handle `409 shared_user_conflict` and `409 admin_lockout` as readable messages, not raw objects.
8. Show current-tenant memberships from `GET /admin/memberships/`, including readable user label, canonical/custom role labels, and a `Default tenant` badge. PATCH `{is_default_tenant: boolean}` for default changes; refresh user and membership data after success.
9. Prevent duplicates in selectable UI state and handle backend `409 conflict` as authoritative. Do not offer a user already present in the active tenant in any membership picker.
10. Add a confirmation dialog before DELETE `/admin/memberships/{membership_id}/`. Explain default-tenant and final-admin risks, do not optimistically remove the row, and refresh only after `204`.
11. Gate user/membership create, edit, deactivate, default, and remove controls on `admin.users`. A late API `403` must clear pending state and show an actionable error notification.

### Milestone 4: Role/permission matrix

User-visible outcome: operators can inspect tenant roles, maintain custom role names/descriptions, assign roles to memberships, and manage each role's permissions according to their own feature permissions.

Implementation steps:

1. Replace the Roles & Permissions placeholder with `src/pages/admin/AdminRolesPage.tsx`, using the shared directory client and feature permission context.
2. Load paginated roles from `GET /admin/roles/?page=&page_size=&sort=name` and selected role detail from `GET /admin/roles/{role_id}/`. Render role name and description as primary labels; never render tenant/role IDs.
3. Add create/edit forms using `{name, description: string|null}`. Validate required/duplicate names inline. Treat `RT Admin`, `RT Manager`, `RT Agent`, `RT Requester`, and `RT Viewer` as canonical: disable canonical name editing with an explanation while permitting API-supported description updates.
4. Load the paginated permission catalogue from `GET /admin/permissions/` and fetch all pages required for the matrix. Render permission code plus description, grouped by prefix when useful; do not display raw permission objects.
5. Build a responsive permission matrix with roles as selectable columns/tabs and permissions as rows. Checked state comes from role detail `permissions`. POST `{permission_code}` to `/admin/roles/{role_id}/permissions/` to assign and DELETE the encoded permission-code endpoint to remove.
6. Gate role create/edit and membership-role assignment/removal on `admin.roles`. Gate permission checkbox mutation on `admin.permissions`. Users lacking a mutation permission may inspect allowed data only when the API permits the corresponding read.
7. In user/membership detail, POST `{role_id}` to `/admin/memberships/{membership_id}/roles/` and DELETE `/admin/memberships/{membership_id}/roles/{role_id}/` to assign/remove roles. Exclude already assigned roles from the picker and block duplicate submissions while pending.
8. Confirm removal of `RT Admin` or `admin.read` before submitting. Warn that the API protects the actor's own final admin access and the tenant's final active RT Admin; surface `409 admin_lockout` and retain the previous checked/assigned state.
9. Show success/error notifications for every mutation and refetch the affected role or membership after success. Never use optimistic permission or assignment removal for lockout-sensitive changes.
10. Preserve API enforcement: handle `401`, `403`, `404`, and `409` centrally, and keep cross-tenant/not-found responses free of raw identifiers.

### Milestone 5: Reports, CSV export, and SLA administration

User-visible outcome: an authorized operator can apply tenant-scoped report filters, inspect server-calculated request KPIs and breakdowns, export the same filtered dataset to CSV, and maintain active/inactive SLA policies without fabricated values or raw configuration JSON.

Contract gate before implementation:

1. Verify the API routes, serializers, views, and tests before choosing web paths or public field names. This gate passed against the local API `feat/api-sla-reports` worktree.
2. The report-summary schema must return explicit numeric fields for total/matching requests, overdue, due today, and unassigned plus arrays for status and priority breakdowns. Every breakdown item must include a stable ID/value, readable label, and count; percentages may be calculated only from those server counts and a server total.
3. The report contract must define one shared filter vocabulary for summary and export: search text, `flow_id`, `status_id`, priority, `requester_id`, `assignee_id`, created-from/to, updated-from/to, and due-from/to. It must define date format, timezone, range inclusivity, unassigned semantics, whether filters are singular or repeated, and how empty values are omitted.
4. The CSV response must define its media type, binary/blob behavior, `Content-Disposition` filename, encoding/BOM choice, and error response behavior. Export must require `reports.export`; report reads must require `reports.read`.
5. The SLA schema must replace opaque `AppliesTo`/`Targets` assumptions with clean public fields: policy ID, name, priority (`low|normal|high|urgent`), response minutes, resolution minutes, active state, and created/updated timestamps as supported. It must define duplicate priority/name behavior, validation ranges, deactivation operation, pagination, sorting, and clean `400/403/404/409` errors.
6. SLA reads and writes must require `sla.manage`, remain tenant-scoped, and create auditable admin events. The web will not parse or author undocumented JSON inside `AppliesTo` or `Targets`.
7. Confirm lookup contracts for flows, statuses, requester, and assignee labels. Filters display names/email but submit only API-confirmed IDs; empty UUID values are omitted.

Reports implementation steps after the contract gate passes:

1. Add a dedicated typed client, candidate `src/api/adminReports.ts`, using `src/lib/api.ts`. Define one `ReportFilters` type and one serializer shared by summary and export so filter drift is impossible.
2. Add a route-aware Reports section to `src/pages/admin/AdminShellPage.tsx`, candidate web route `/admin/reports`, visible when the permission context includes `reports.read` or `reports.export` according to the confirmed read behavior.
3. Add `src/pages/admin/AdminReportsPage.tsx` with URL-backed applied filters. Draft controls do not fetch until Apply is submitted; Clear resets both URL and applied API filters deterministically.
4. Load flow, status, and tenant-user lookups through existing confirmed endpoints. Display flow/status names and user display name/email; submit only non-empty IDs and lowercase priorities.
5. Render KPI tiles for matching/total as provided, overdue, due today, and unassigned. Render status and priority breakdowns as accessible tables. Optional proportional CSS bars use design tokens and server counts; zero totals render zero width and never divide by zero.
6. If the report contract includes detail rows, render them in an accessible paginated table using `page`, `page_size`, and confirmed sorting. Do not manufacture a detail list by calling search or enriching every row with request-detail calls.
7. Show initial/loading, empty-result, retryable error, and stale-data behavior explicitly. A failed filter request must not relabel old data as current.
8. Gate report reads with `reports.read`. If export-only access is supported by the API, show only the contract-permitted export surface; otherwise show a clear permission state. Always handle API `403` even when navigation/actions are hidden.

CSV export implementation steps after the contract gate passes:

1. Export the last applied `ReportFilters`, not unsaved control drafts, through the OpenAPI-confirmed export operation with Axios `responseType: "blob"`.
2. Hide or disable export without `reports.export`; prevent duplicate clicks while generating and expose progress text such as `Preparing CSV...` without claiming byte progress unless the transport reports it.
3. Parse `Content-Disposition` safely, preferring RFC 5987 `filename*` and then quoted/plain `filename`. Sanitize path separators/control characters; use a deterministic local fallback only when the server provides no usable filename.
4. Create a temporary object URL, trigger a real file download, then revoke the URL. Do not navigate the SPA to the blob or retain it in state longer than needed.
5. Convert JSON/blob error responses into the standard readable API error state and preserve the report on screen for retry.

SLA implementation steps after the contract gate passes:

1. Add a typed SLA client, candidate `src/api/adminSla.ts`, using the shared API client and only OpenAPI-confirmed routes/payload fields.
2. Add a permission-aware SLA section to `AdminShellPage`, candidate web route `/admin/sla`, visible only with `sla.manage` while retaining backend `403` handling.
3. Add `src/pages/admin/AdminSlaPage.tsx` with a paginated policy table showing name, priority label, response target, resolution target, active state, and updated/created date. Use policy ID only as the internal API key.
4. Add keyboard-accessible create/edit dialogs using the existing admin dialog pattern. Priority labels are title case but submitted values are exactly `low`, `normal`, `high`, or `urgent`.
5. Use numeric minute inputs with contract-confirmed bounds. Show computed hints such as `90 minutes (1 hour 30 minutes)` and `2880 minutes (2 days)` without changing the submitted integer minutes.
6. Validate required name/priority/targets inline, reject non-integers/negative or zero values according to OpenAPI, and enforce response-versus-resolution ordering only if the API contract defines that invariant.
7. Treat deactivate as a state mutation, not deletion. Require confirmation, keep inactive policies visible through the confirmed active filter, avoid optimistic removal, and refetch the affected list/detail after success.
8. Show loading skeletons, no-policy/no-filter-match states, success/error notifications, pagination, responsive table behavior, and readable backend validation. Never render raw `AppliesTo`, `Targets`, objects, or IDs.

### Milestone 6: UX hardening and tests

Add focused Vitest/React Testing Library coverage when the repo test harness is present, plus browser/manual verification. Keep layout usable at mobile and desktop widths; verify focus trapping, Escape/cancel, initial focus, focus restoration, semantic labels, and no overlapping table/dialog content.

## Tests and verification

Run where available:

- `pnpm lint`
- `pnpm build`
- If `pnpm` is unavailable in the Windows shell, run:
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`
  - `npm.cmd run build`

Manual Day 1-2 verification:

1. Log out and open `/admin`.
2. Confirm unauthenticated users are redirected to `/login`.
3. Log in as a user without admin permission.
4. Confirm the normal shell does not expose a usable admin entry, or if visible by design, clicking it results in `/403`.
5. Manually open `/admin` as the non-admin user.
6. Confirm the 403 page renders with a clear message and a way back to Home.
7. Log in as an admin/staff user or a test token with the expected admin claim.
8. Confirm the left rail/user shell exposes admin navigation.
9. Open `/admin`.
10. Confirm the admin shell renders Overview, Workflows, Users, and Roles & Permissions navigation.
11. Confirm admin placeholder panels render useful loading/empty/error-ready states and no placeholder browser alerts.
12. Confirm browser refresh on `/admin` keeps the admin page working.
13. Confirm direct navigation to unknown admin subroutes shows a controlled empty/not-found state or redirects to the admin overview.
14. Confirm focus-visible outlines are present on admin navigation and buttons.

Negative/security verification:

- Remove or alter the admin claim in a local test token and confirm `/admin` denies access.
- Confirm the frontend permission helper does not grant admin access for missing/unknown claims.
- Confirm all future admin API calls continue to use the shared Axios client with `Authorization` and `X-Tenant`.

Automated Day 5-6 verification:

- Add API normalizer/error tests for array/paginated responses, nullable fields, nested user/role objects, and `{code,message,details[]}` mapping.
- Add component tests for user loading/empty/results/error states; URL-backed search/filter/pagination; create/edit validation; and no-credentials helper copy.
- Add permission tests proving `admin.users`, `admin.roles`, and `admin.permissions` independently hide/disable their controls while simulated API `403` responses still show an error.
- Add role/matrix tests for canonical-role name locking, duplicate assignment prevention, permission toggles, pending-state double-submit prevention, and `409 admin_lockout` state restoration.
- Add dialog tests for accessible name, initial focus, Tab containment, Escape/cancel, destructive confirmation, and focus return to the opener.
- Run `pnpm lint`, `pnpm build`, and the repo test command introduced with the test harness. Until a test script exists in `package.json`, run `npm.cmd run typecheck`, `npm.cmd run lint`, and `npm.cmd run build` and record the missing automated-test harness rather than claiming tests ran.

Manual Day 5-6 verification:

1. Sign in to tenant ACME as an RT Admin whose `/api/admin/me/permissions/` response includes `admin.users`, `admin.roles`, and `admin.permissions`.
2. Open `/admin/users`; verify one `GET /api/admin/users/?page=1&page_size=25&sort=display_name` with Authorization and `X-Tenant`, then verify loading, populated, empty-filter, retryable-error, pagination, and responsive states.
3. Search by email, display name, and employee code. Confirm each query is sent through `search` and returns server-filtered results; employee code is blocked from acceptance until the API contract gate is resolved.
4. Filter Active and Inactive; confirm `is_active=true|false` is sent and URL state survives refresh/back.
5. Create a user with email, display name, employee code, and default-tenant choice. Confirm POST `/api/admin/users/` returns `201` with `{user,membership}`, the UI opens the returned user detail, and the dialog never claims credentials/password/login were created.
6. Trigger duplicate email and inline validation errors; confirm readable field messages and no raw response object.
7. Edit display name/employee code, then deactivate/reactivate a non-admin user. Confirm PATCH contains only changed public fields and the detail refreshes.
8. Open membership detail; confirm readable user/role labels and default badge. Test default change, duplicate membership, inactive-user membership, and membership removal confirmation. Confirm no raw UUID is requested from the operator.
9. Open `/admin/roles`; verify role pagination, create a custom role, edit its description, and confirm canonical role names cannot be edited.
10. Assign and remove a role from a membership. Confirm POST uses `role_id`, DELETE uses the selected assignment IDs internally, labels remain readable, and data refreshes after success.
11. Load the permission matrix, assign/remove a non-critical permission, and confirm POST `{permission_code}`/DELETE calls use the shared client and refresh role detail.
12. Attempt to remove the actor's own final `RT Admin` role or the final admin's `admin.read`; confirm warning first, API `409 admin_lockout`, unchanged UI state, and a readable error.
13. Repeat with accounts that have only `admin.users`, only `admin.roles`, and only `admin.permissions`; verify unauthorized controls are hidden/disabled and forced API `403` responses are still handled.
14. Verify dialogs and drawers using keyboard only at desktop and mobile widths, including focus trap, Escape/cancel, focus restoration, no overlap, and readable labels.
15. Confirm no local/demo data, raw object, raw error payload, stack trace, or raw UUID appears as a primary label anywhere in Users, Memberships, Roles, or Permissions.

Automated Day 7 verification after API contract implementation:

- Add report client tests for exact filter serialization, omission of empty UUID/date values, server breakdown normalization, zero totals, malformed values, `401/403`, and no fallback data.
- Add report component tests for draft-versus-applied filters, URL restoration, loading/empty/error states, permission-aware navigation/actions, accessible KPI/table labels, pagination if present, and stale-data protection after a failed refetch.
- Add CSV tests proving summary/export receive identical filters, `reports.export` gating, one in-flight export, blob download, `filename*`/`filename` parsing, filename sanitization, fallback filename, URL revocation, and JSON errors returned as blobs.
- Add SLA client/component tests for pagination, lowercase priority payloads, integer-minute payloads, human duration hints, inline validation, create/edit refresh, deactivate confirmation, inactive visibility, `sla.manage` gating, and late `403` handling.
- Add negative tests confirming no client aggregation from result pages, no raw `AppliesTo`/`Targets`, no unknown endpoint, and no chart-library dependency.
- Run `pnpm lint`, `pnpm build`, the configured frontend test command, and `git diff --check`; if the repository still lacks a test harness, adding the focused harness is part of implementation rather than silently skipping tests.

Manual Day 7 verification after API contract implementation:

1. Sign in to tenant ACME with `reports.read`, open the Reports web route, and confirm the Network request uses the OpenAPI-confirmed summary operation with Authorization and `X-Tenant`.
2. Verify server values for status/priority breakdowns, overdue, due today, and unassigned against the same filtered API response. Confirm the page performs no local/demo substitution and no per-request detail fan-out.
3. Apply each filter individually and in combination: text, flow, status, priority, requester, assignee, created range, updated range, and due range. Confirm readable labels are shown and exact API-confirmed IDs/lowercase values/dates are submitted.
4. Confirm filter URL state survives refresh/back, Clear removes optional parameters, empty UUID fields are omitted, invalid date ranges show inline errors, and API errors do not present stale values as current.
5. If report detail rows are contracted, verify page/page-size navigation and result count without client aggregation.
6. With `reports.export`, apply filters and export. Confirm one export request carries the same filters, the button shows a generating state, the browser downloads a blob, and the server filename is used when valid.
7. Repeat export without `reports.export` and with a forced API `403`/JSON error. Confirm the control is unavailable or disabled and no fake CSV is generated.
8. Sign in with `sla.manage`, open the SLA web route, and confirm the list uses the OpenAPI-confirmed paginated endpoint with Authorization and `X-Tenant`.
9. Create policies for representative priorities using lowercase payload values and integer response/resolution minutes. Confirm readable duration hints match the submitted minutes.
10. Edit a policy, then deactivate it through confirmation. Confirm no DELETE is sent unless OpenAPI explicitly defines deactivation that way, the list/detail refreshes, and the inactive policy remains discoverable through the confirmed filter.
11. Verify duplicate/invalid SLA validation, missing `sla.manage`, late API `403`, empty lists, retryable failures, keyboard-only dialogs, and mobile/desktop layouts.
12. Confirm no report/SLA screen renders raw objects, IDs, opaque SLA JSON, fabricated chart values, or local demo data.

## Acceptance criteria

- `/admin` is registered and protected by authentication.
- `/admin` is additionally protected by a permission-aware admin guard.
- `/admin` verifies tenant-scoped admin authorization through `GET /api/admin/me/permissions/`.
- Users without admin permission see a clear 403 page.
- Admin users see a compact admin shell with Overview, Workflows, Users, and Roles & Permissions navigation.
- The global app shell has an intentional Admin/Settings entry behavior.
- Loading, empty, and error states are clear and consistent with existing common components.
- No raw token, raw permission object, stack trace, or placeholder alert is shown to users.
- Day 1-2 implementation touches only admin shell/guard-related files and this ExecPlan.
- Admin -> Workflows loads tenant workflows from the admin API.
- Selecting a workflow loads real workflow detail, statuses, and transitions.
- Status editor can create and update statuses with duplicate/open/closed validation.
- Transition editor can create and update transitions with required-field, self-transition, and duplicate-pair validation.
- Workflow admin calls use the shared API client with auth and tenant headers.
- Admin users with API permissions such as `admin.read` and `admin.workflows` can reach Admin -> Workflows even when those permissions are not embedded in JWT claims.
- Day 3-4 implementation touches only workflow admin-related files and this ExecPlan.
- Admin -> Users uses paginated API data with server-side search, active/inactive filtering, sorting, URL-stable controls, and no local fallback.
- Employee-code search is accepted only after `GET /api/admin/users/?search=` supports it in generated OpenAPI and the API implementation.
- Creating a user sends public fields, creates the active-tenant membership through the API response contract, and clearly states that no login credentials are created.
- User detail/edit and current-tenant membership management use readable labels, nullable values, confirmations, and refreshed API data.
- A standalone existing-user membership picker is accepted only after a tenant-safe labelled eligible-user lookup exists; the UI never asks an operator to enter a user UUID.
- Admin -> Roles supports list/create/detail/edit for custom roles and protects canonical role names.
- Membership-role assignment and permission matrix mutations use the confirmed assignment endpoints and refresh after success.
- `admin.users`, `admin.roles`, and `admin.permissions` independently control relevant UI actions; backend `403` remains authoritative and visible.
- Final-admin-sensitive actions warn before submission, avoid optimistic mutation, and preserve state on `409 admin_lockout`.
- Loading skeletons, empty states, inline validation, keyboard-accessible dialogs, destructive confirmations, and success/error notifications work at mobile and desktop widths.
- No demo fallback, raw API object, raw error object, stack trace, or raw UUID primary label appears.
- Day 5-6 implementation touches only admin directory/permission UI files, focused tests, and this ExecPlan.
- Day 7 web implementation does not start until generated OpenAPI defines report summary, CSV export, and SLA operations and schemas.
- Reports require `reports.read`, use one server-calculated filtered response for KPIs/breakdowns, and never aggregate a paginated search/list client-side.
- The report filter surface covers text, flow, status, priority, requester, assignee, created/updated/due ranges using readable labels and API-confirmed values.
- Status and priority breakdowns are accessible tables; any CSS bars are derived only from server counts and use existing design tokens. No chart library is added.
- CSV export requires `reports.export`, exports the applied filters, downloads a blob, prefers a sanitized server filename, and shows generating/error states.
- SLA administration requires `sla.manage`, uses paginated real API policies, sends lowercase priorities and integer minutes, shows readable duration hints, and supports API-defined create/edit/deactivate behavior.
- Report/export/SLA calls preserve Authorization and `X-Tenant`, handle late `403`, and never use local/demo fallback or raw object/ID labels.
- Day 7 includes focused automated and manual verification for permissions, tenancy headers, filters, downloads, pagination, validation, accessibility, and responsive layouts.

## Progress

- [x] Day 1-2 ExecPlan expanded for admin shell and route guards.
- [x] Milestone 1 implemented.
- [x] Milestone 2 implemented.
- [x] Day 5-6 Milestones 3-4 planned against the actual API contract.
- [x] Milestone 3 implemented using atomic RT-user/current-tenant membership creation and tenant-scoped membership management.
- [x] Milestone 4 implemented with role detail, membership-role assignment, and permission matrix controls.
- [x] Day 7 Milestone 5 planned against the API contract and its initial gaps.
- [x] Milestone 5 implemented against the confirmed report/export/SLA routes and public fields.
- [x] Day 7 typecheck, ESLint, production build, and diff validation completed; no frontend test harness is configured in `package.json`.
- [ ] Milestone 6 implemented.

## Surprises & Discoveries

- 2026-06-10: The previous Sprint 3 plan was a short stub and needed to be expanded into a self-contained ExecPlan before implementation.
- 2026-06-10: Current web routes do not include `/admin`; the only route guard is the existing auth-only `Protected` wrapper in `src/main.tsx`.
- 2026-06-10: The current auth context exposes `token` and `tenant`, but no explicit permission model yet.
- 2026-06-10: The existing left rail has a `Settings` item that is not wired to a route; it is the likely Day 1-2 entry point for Admin/Configuration.
- 2026-06-10: JWT permission claims are not yet guaranteed by the web repo. The admin guard recognizes common staff/admin role, permission, group, and scope claims and otherwise fails closed.
- 2026-06-10: A local demo override can be enabled with `VITE_ENABLE_ADMIN_DEV_OVERRIDE=true`, but backend authorization remains authoritative for future admin API calls.
- 2026-06-12: The API repo already exposes Sprint 3 admin workflow endpoints under `/api/admin/workflows/`, including workflow detail with embedded `statuses` and `transitions`.
- 2026-06-12: Admin status writes use public fields `name`, `category`, and `is_terminal`; transition writes use `from_status_id`, `to_status_id`, `guard_roles_json`, `guard_perms_json`, and `auto_rules`.
- 2026-06-12: The current admin workflow API exposes create/update for statuses and transitions, but no delete/archive endpoints, so delete actions stay out of scope for Day 3-4.
- 2026-07-29: Manual testing showed an ACME admin user was redirected to `/403` before the web called the admin API. The API repo verification showed `/api/admin/me/permissions/` and `/api/admin/workflows/` return 200 for that user, so the denial was caused by web JWT-only authorization.
- 2026-07-29: The API permission names include `admin.read`, `admin.workflows`, and `admin.audit.read`; the previous web JWT permission helper did not recognize `admin.read`.
- 2026-07-29: The SQL Server MCP connection is configured but timed out to `host.docker.internal:1433`, so direct DB row validation was not available from this Codex session.
- 2026-08-01: The API repository has no checked-in OpenAPI YAML. Its generated `/api/schema` route, DRF `extend_schema` declarations, serializers, services, schema tests, and API ExecPlan are the available contract sources; the API server was offline and the Poetry launcher could not generate a temporary schema in this session.
- 2026-08-01: `GET /api/admin/users/?search=` currently searches email and display name only; employee code is not included despite the requested web acceptance criteria.
- 2026-08-01: `POST /api/admin/users/` atomically creates a domain user plus current-tenant membership and explicitly does not create Django authentication credentials.
- 2026-08-01: `POST /api/admin/memberships/` requires `user_id`, but current user lookup/list endpoints expose only active-tenant members. There is no tenant-safe labelled lookup for an existing non-member domain user, so a standalone picker cannot be implemented without a new API contract.
- 2026-08-01: Membership removal, RT Admin role removal, user deactivation, and `admin.read` removal can return `409 admin_lockout`; default-tenant changes/removal can return `409 default_tenant_required`.
- 2026-08-01: Canonical role names are `RT Admin`, `RT Manager`, `RT Agent`, `RT Requester`, and `RT Viewer`; the API rejects renaming them but supports description updates.
- 2026-08-01: The web `package.json` currently has no automated test script or Vitest/React Testing Library dependencies, so implementation must either add a focused harness or explicitly record that gap while still running typecheck, lint, and build.
- 2026-08-01: The implemented web client uses the API's `/admin/*` paths relative to `VITE_API_BASE`; the shared Axios interceptor preserves `Authorization` and `X-Tenant` for every directory request.
- 2026-08-01: Tenant identity is supplied by the active `X-Tenant` code, not a body UUID, for all current contract writes. The UI displays that tenant code and never asks the operator to enter `tenant_id`.
- 2026-08-01: Native modal dialogs provide keyboard Escape handling, browser focus containment, and focus restoration without adding a new UI dependency to this repository.
- 2026-08-01: `pnpm lint` remains blocked in the Codex non-interactive shell because pnpm attempts a `node_modules` purge and aborts without a TTY. Equivalent `npm.cmd run typecheck`, `npm.cmd run lint`, and `npm.cmd run build` pass.
- 2026-08-17: The current API has no report, CSV export, or SLA admin routes, serializers, views, services, or tests. Only permission catalogue codes and the unmanaged `SlaPolicy` model exist for Day 7 concepts.
- 2026-08-17: `/api/dashboard/summary/` is real and tenant-scoped but unfiltered, requires only authentication, and returns fixed category counts rather than arbitrary status and priority breakdown arrays; it cannot satisfy the Reports page contract.
- 2026-08-17: Existing search requires text `q` and supports only status, assignee, flow, created, and updated filters. It lacks requester, priority, due ranges, aggregate breakdowns, CSV semantics, and `reports.read`/`reports.export` enforcement.
- 2026-08-17: `SlaPolicy` persists `Name`, opaque `AppliesTo`, opaque `Targets`, and `CreatedAt`; it has no public active, priority, response-minutes, resolution-minutes, or updated-at fields. The web cannot safely infer JSON shapes or deactivation from this model.
- 2026-08-17: The API permission catalogue already contains `reports.read`, `reports.export`, and `sla.manage`, and the web permission context already returns arbitrary normalized permission codes, so Day 7 controls can use exact codes after resource endpoints enforce them.
- 2026-08-17: The current web dependency set has no chart library. Accessible tables and token-based CSS bars are sufficient for server-provided breakdowns and avoid adding dependency weight for two categorical summaries.
- 2026-08-17: The API worktree advanced to `feat/api-sla-reports` with concrete report summary/export and SLA serializers, views, routes, and tests. This removed the Day 7 contract blocker without requiring changes in the API repository.
- 2026-08-17: Report date filters are DRF `DateTimeField` values, while the web controls are calendar dates. The shared filter serializer converts lower bounds to local-day start and upper bounds to local-day end, then sends ISO datetimes to both summary and export.
- 2026-08-17: Export errors arrive as blobs because successful CSV requests use Axios `responseType: "blob"`; the client must parse JSON from an error blob before presenting API permission or validation text.

## Decision Log

- 2026-06-10: Treat Day 1-2 as shell and guard infrastructure only. Workflow/user/role CRUD remains deferred to later Sprint 3 milestones.
- 2026-06-10: Use decoded JWT claims for client-side permission-aware navigation unless a current-user/permissions endpoint is confirmed. Missing or unknown permission claims must fail closed.
- 2026-06-10: Add a dedicated 403 page instead of silently redirecting unauthorized users to Home, because manual verification needs a clear denied-access state.
- 2026-06-10: Keep backend authorization as authoritative. The frontend guard is for UX and route protection only.
- 2026-06-10: Use the existing left rail location for an `Admin` entry and hide it for users who do not pass the decoded admin guard.
- 2026-06-10: Keep the admin shell as route-based pages under `/admin/*` with placeholders only; workflow/user/role CRUD remains deferred.
- 2026-06-12: Implement Admin -> Workflows against the dedicated `/api/admin/workflows/` endpoints rather than the public `/api/flows/` lookup endpoints, because this is configuration/admin behavior.
- 2026-06-12: Validate duplicate status names and missing open/closed lifecycle states in the web UI before saving, while still preserving backend authorization and validation as authoritative.
- 2026-06-12: Block duplicate and self-referential transition pairs client-side before POST/PATCH to keep transition editor feedback immediate.
- 2026-07-29: Replace the `/admin/*` guard's JWT-only authorization check with an async call to `/api/admin/me/permissions/` using the shared tenant-aware API client. Backend RBAC is the source of truth for admin access.
- 2026-07-29: Keep the explicit `VITE_ENABLE_ADMIN_DEV_OVERRIDE=true` escape hatch for local development only, but do not grant production admin access from JWT-only claims when the backend permission check fails.
- 2026-07-29: Make the shared API client fall back to persisted auth/tenant localStorage values during direct page refreshes, so the first permission request still includes `Authorization` and `X-Tenant`.
- 2026-08-01: Keep Day 5-6 admin directory calls in a dedicated typed client using the shared Axios instance; do not reuse public request-assignment `/users/` lookup semantics for admin management.
- 2026-08-01: Treat backend permission context as authoritative and derive independent `canManageUsers`, `canManageRoles`, and `canManagePermissions` UI capabilities from exact permission codes.
- 2026-08-01: Block employee-code search acceptance until the API/OpenAPI supports server-side employee-code matching; paginated data must never be filtered only on the current page.
- 2026-08-01: Do not expose standalone Create Membership until a labelled eligible-domain-user lookup exists. Use atomic domain-user creation as the supported membership creation flow in the interim and never ask for a raw UUID.
- 2026-08-01: Use confirmations and post-success refetches, not optimistic removal, for deactivation, membership removal, role removal, and permission removal because backend final-admin/default-tenant safeguards may reject them.
- 2026-08-01: Present canonical role names as protected labels and allow only API-supported description edits; custom roles may edit both name and description.
- 2026-08-01: Load all current-tenant memberships before lockout-sensitive user, membership, or RT Admin role actions. If the selected membership is the final active RT Admin, block the action in the web before sending it; still preserve backend `409 admin_lockout` as authoritative.
- 2026-08-01: Block removal of `admin.read` from the canonical `RT Admin` role because that role-level change would remove effective RT Admin access tenant-wide. Other permission removals require confirmation and post-success detail refresh.
- 2026-08-01: Keep IDs internal to controls: user/role/permission labels remain human-readable, while writes submit only the API-required `user_id`, `role_id`, `permission_code`, membership path ID, or tenant header value. Empty select values never trigger UUID writes.
- 2026-08-17: Treat the absence of Day 7 OpenAPI operations as a blocking contract dependency. Do not repurpose dashboard/search endpoints or choose hypothetical API path names to make the web appear complete.
- 2026-08-17: Require one shared report-filter serializer for summary and CSV export so the downloaded dataset always represents the last applied on-screen filters.
- 2026-08-17: Use semantic breakdown tables as the primary visualization. Optional CSS bars may enhance scanning but cannot be the only encoding and must use server counts and existing tokens.
- 2026-08-17: Parse and sanitize server filenames for CSV downloads, revoke object URLs, and use a local fallback name only when `Content-Disposition` is absent or unusable.
- 2026-08-17: Keep SLA target values as integer minutes in UI state and API payloads; duration text is display-only. Never submit formatted duration strings.
- 2026-08-17: Model deactivation as the OpenAPI-defined state change rather than deletion, keep inactive policies discoverable, avoid optimistic removal, and refetch after writes.
- 2026-08-17: Implement Day 7 only against `/reports/summary/`, `/reports/requests/export/`, and `/admin/sla-policies/` relative to the shared API base. Do not reuse dashboard/search or derive missing metrics client-side.
- 2026-08-17: Keep report draft filters separate from applied filters. Summary and CSV both serialize the applied object, so an unsaved control edit cannot silently change an export.
- 2026-08-17: Normalize SLA names with trimming, priorities to lowercase enum values, and targets to positive integer minutes. Map API `details[].field` values back to the corresponding form control.

## Outcomes & Retrospective

Milestone 1 outcome: `/admin/*` now uses an `AdminProtected` route guard that requires authentication and decoded admin permission. Non-admin authenticated users are sent to `/403`, while unauthenticated users are sent to `/login`. The global shell shows an `Admin` left-rail entry only when the decoded profile can access admin. The admin shell includes Overview, Workflows, Users, and Roles & Permissions navigation with compact placeholder states for future milestones. A dedicated 403 page gives users a clear denied-access state and a path back to Home.

Milestone 2 outcome: Admin -> Workflows now loads tenant workflows, shows selected workflow detail, renders existing statuses and transitions, and supports create/update actions for statuses and transitions through the admin API. The status editor validates duplicate names and required open/closed lifecycle coverage. The transition editor validates required endpoints, prevents self-transitions, and blocks duplicate From -> To pairs. Save actions show clear success/error feedback and refresh workflow detail after success.

Milestone 2 verification fix outcome: Admin route access now verifies the active tenant through `/api/admin/me/permissions/` before rendering or denying `/admin/*`. This fixes the ACME admin case where API permissions were valid but the web redirected to `/403` because admin rights were not present as recognized JWT claims. The App left rail also uses the same API-backed permission state to decide whether to show Admin.

Day 5-6 planning outcome: the user, membership, role, and permission milestones were mapped to the API's public fields, endpoint-specific permissions, pagination, conflict shapes, canonical roles, and final-admin/default-tenant safeguards. Employee-code search and labelled discovery of eligible non-member domain users remain explicit API/OpenAPI contract gates rather than client-side workarounds.

Milestones 3-4 outcome: Admin -> Users now provides API-backed pagination, email/display-name search, active filtering, atomic RT-user/current-tenant membership creation, user detail/edit, default-tenant management, membership removal, and membership-role assignment. The UI consistently distinguishes an RT domain user from a login account and displays the active tenant code rather than raw tenant IDs. Final active RT Admin deactivation, membership removal, and role removal are blocked with an explicit warning.

Admin -> Roles & Permissions now provides tenant role list/create/detail/edit, protects canonical role names, and renders the API permission catalogue as a responsive matrix. Permission and role assignment writes submit internal IDs/codes while showing readable labels, require confirmation for removals, and refresh affected data after success. No local/demo fallback is used. Typecheck, ESLint, Vite production build, and `git diff --check` pass through the available npm toolchain; the requested pnpm invocation is blocked by its non-interactive modules-purge guard.

Milestone 5 outcome: Admin -> Reports now loads only server-calculated summary fields, applies URL-backed tenant filters, and renders KPI and accessible breakdown tables without fabricated chart data. CSV export uses the same applied filter serializer, preserves shared auth/tenant headers, handles blob responses and server filenames, revokes temporary object URLs, and explains missing `reports.export` permission.

Admin -> SLA Policies now lists and filters paginated policies, creates and edits normalized policies, shows readable duration hints while submitting integer minutes, maps backend validation to fields, and deactivates through `PATCH {is_active: false}` with confirmation and refetch. Navigation and controls are permission-aware and no report or SLA demo fallback exists.

Day 7 verification outcome: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`, and `git diff --check` pass. The requested `pnpm lint` and `pnpm build` commands were attempted, but this non-interactive Windows runtime aborts during pnpm dependency preflight with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`; neither script itself was reached. The equivalent package scripts pass through npm. No Vitest/React Testing Library dependencies or test script exist yet, so no component test command is available for this milestone.
