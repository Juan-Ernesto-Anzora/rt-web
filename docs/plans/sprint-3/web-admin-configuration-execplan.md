# Sprint 3 Web ExecPlan - Admin and Configuration UI

## Purpose

Sprint 3 adds a permission-aware administration area for Request Tracker configuration. After this sprint, authorized users can open an Admin section, navigate workflow/user/role/report/SLA/settings/audit screens, and see clear access-denied, loading, empty, and error states instead of placeholder alerts or broken routes. Day 7 adds reports, export, and SLA administration. Day 8 adds tenant settings, feature flags, and plain-text notification-template administration. Day 9 prepares the Web for release. Day 10 is the final hardening/demo gate: reconcile the browser UI with the validated API 0.2.0/OpenAPI/Postman contract, resolve only release-blocking demo defects, rehearse the full request/admin lifecycle on disposable data, and produce an evidence-based go/no-go decision.

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
- `src/api/adminReports.ts` and `src/api/adminSla.ts`: established Day 7 typed-client, permission, and API-error patterns; Day 8 settings calls should follow these patterns without mixing configuration values into logs.
- `src/api/dashboard.ts`: existing unfiltered dashboard summary client; it is not sufficient as a filtered reports contract.
- `src/features/requestSearch.ts`: existing search parameter and request-result normalization; its current API contract does not cover the complete report filter set or aggregate breakdowns.
- `src/auth/adminPermissions.ts`: tenant-scoped permission context loaded from `GET /api/admin/me/permissions/`; Day 8 must use exact `admin.settings`, `tenant.settings.manage`, `featureflags.manage`, and `notifications.manage` codes.
- `src/pages/admin/AdminShellPage.tsx`: existing route-aware Admin shell; Day 8 will add a permission-aware Settings destination and subsections.
- `src/pages/admin/WorkflowAdminPage.tsx`: existing compact Admin loading, empty, save, and error-state patterns.
- `src/pages/RequestDetailPage.tsx`: the only remaining authenticated local demo-data fallback and a fixed desktop two-column layout that must be removed/hardened for Day 9.
- `src/components/admin/AdminDialog.tsx`: native-dialog wrapper that already has accessible title/description wiring but needs explicit initial-focus and opener-focus restoration verification.
- `src/components/common/EmptyState.tsx`, `ErrorState.tsx`, and `LoadingRows.tsx`: existing primitives to harden with semantic announcements and reuse consistently.
- `src/components/requests/StatusBadge.tsx`, `PriorityChip.tsx`, and `RequestTable.tsx`: existing request display primitives; Day 9 should consolidate status/badge use and make request tables semantic/responsive.
- `.github/workflows/ci-web.yml`: current Web CI runs install, typecheck, ESLint, and build only; Day 9 will add a minimal Chromium Playwright smoke command after documenting the dependency.
- Adjacent API `docs/sprint-3-api-verification.md`, `docs/sprint-3-demo-script.md`, `docs/release-readiness.md`, `docs/sprint-3-known-issues.md`, `postman/RT-Sprint-3.postman_collection.json`, `postman/RT-Sprint-2-Regression.postman_collection.json`, and `postman/RT-Local.postman_environment.json`: Day 10 source evidence for exact operations, mutation guards, verified results, cleanup, and remaining limitations.
- `design/design-tokens.json`, `tailwind.config.ts`, and `src/index.css`: design token mappings and shared compact UI classes.
- `src/pages/`: new admin shell, admin landing, and forbidden page files should live here unless a more specific `src/pages/admin/` folder is introduced.
- `src/components/common/`: existing `EmptyState`, `ErrorState`, and `LoadingRows` components for consistent loading/error UI.
- `docs/plans/sprint-3/web-admin-configuration-execplan.md`: active ExecPlan for this sprint.

Current routes in `src/main.tsx` include `/login`, `/search`, `/requests/new`, `/requests/:id`, `/profile/preferences`, `/403`, `/admin/*`, `/`, and friendly catch-all/error handling. `AdminShellPage` resolves `/admin`, `/admin/workflows`, `/admin/users`, `/admin/roles`, `/admin/reports`, `/admin/sla`, `/admin/settings`, and `/admin/audit` inside the protected admin route.

## Current behavior

The admin shell, API-backed route guard, friendly error pages, Admin -> Workflows, Users/Memberships, Roles & Permissions, Reports/CSV, SLA Policies, Settings, Audit, request lifecycle pages, shared accessibility/responsive hardening, and Chromium smoke are implemented. The permission context exposes normalized effective codes and gates each area with the API-confirmed permissions.

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

API `main` now includes the Day 8 Settings contract in DRF routes, serializers, services, tests, and additive SQL upgrades. Target environments must still apply the upgrade chain and verify `TenantSetting`, `FeatureFlag`, and `NotificationTemplate` rows. Confirmed operations are:

- `GET /api/admin/settings/` requires baseline `admin.read` plus `admin.settings`; `PATCH /api/admin/settings/` additionally requires `tenant.settings.manage` and accepts one atomic `{ settings: [...] }` batch.
- `GET /api/admin/feature-flags/` and `PATCH /api/admin/feature-flags/{key}/` require `featureflags.manage`. Keys are immutable and case-sensitive: `adminConsole`, `slaEnabled`, `exportsEnabled`, and `notificationTemplates`.
- `GET /api/admin/notification-templates/`, `GET /api/admin/notification-templates/{template_id}/`, and `PATCH` of the detail route require `notifications.manage`. Event types are immutable and limited to `request.created`, `request.assigned`, `comment.added`, and `request.closed`.
- Every operation also uses JWT, `X-Tenant`, active-tenant membership, and backend authorization. Cross-tenant or unknown flag/template identities return `404`; missing permissions return `403`.

Day 9 repository inspection found these release gaps:

- `src/main.tsx` uses flat `createBrowserRouter` routes with no root `errorElement`, no React error boundary, and no catch-all route. `/403` is friendly, but unmatched routes and unexpected render errors can expose React Router's developer error page.
- `src/pages/RequestDetailPage.tsx` still contains `FALLBACK_DETAIL`, local comments/activity, and `VITE_ENABLE_DEMO_DETAIL_FALLBACK`. No other authenticated page injects local request/search/report/user/role/settings records. Home does initialize KPI values to zero, which can look like real data after a summary failure and should become an explicit unavailable state.
- Home/Search request results use grid-styled button rows rather than semantic tables. Admin Users, Reports, and SLA already use real tables, but table heading scope/captions and shared pagination/status semantics are inconsistent.
- `ErrorState` lacks `role="alert"`; `LoadingRows` has no `aria-busy`/loading announcement; success/error notices and pagination are duplicated across pages. Most controls have visible labels, but inline errors are not consistently connected with `aria-describedby`.
- Request Detail uses `grid-cols-[minmax(0,1fr)_320px]` at every viewport. The Admin shell and most Admin pages already stack at `lg`/`xl`, but Users, Roles, Workflow, Reports, Settings, dialogs, tables, and action rows still need viewport verification and small overflow/focus fixes.
- The existing API already supports `GET /api/admin/audit/` with `admin.audit.read`, pagination, and exact filters `type`, `actor_id`, `request_id`, `entity_id`, `created_from`, `created_to`, `page`, and `page_size`. Results expose `activity_id`, `request_id`, `actor_id`, `type`, raw `payload`, parsed `payload_json`, `entity_id`, `entity_type`, and `created_at`. The API does not return actor display names.
- `package.json` and `pnpm-lock.yaml` contain no Playwright, Vitest, or Testing Library dependency or test script. CI has no browser job.

Day 10 contract/rehearsal inspection found:

- API `main` includes Admin Settings and API polish. The adjacent API final-hardening worktree reports OpenAPI `0.2.0` validation passing, 189 pytest tests passing, guarded read-only Postman 32/92 passing, Sprint 2 regression 8/17 passing, disposable mutation Postman 69/178 passing, SQL checks passing, four MailHog events present, and the original `rt` database restored with zero Day 10 records.
- The API's generated `/api/schema` is the OpenAPI source and `tests/test_postman_contract.py` proves every Postman method/path exists in that schema. The Sprint 3 collection is secret-free, defaults `allow_mutation=false`, and guards every non-auth mutation for disposable-database use.
- The current Web does not expose `POST/PATCH /api/admin/workflows/`; it can edit statuses/transitions only. Minimal workflow create/edit controls are a release-blocking completion for the requested browser demo.
- The Web Request Create form still asks for raw Flow/Requester/Assignee IDs even though `/api/flows/`, flow-status, and `/api/users/` lookups exist. Replacing those fields with readable selectors is a release-blocking usability correction and prevents raw-ID demo handling.
- Web transition submission sends `comment_markdown` and then creates a separate comment, while OpenAPI/Postman define `POST /api/requests/{requestid}/transition/` with `{ transition_id, comment }`. Day 10 must align to the exact contract and remove the duplicate workaround before rehearsal.
- `POST /api/admin/users/` intentionally creates a domain user and current-tenant membership atomically. The API also supports standalone `POST /api/admin/memberships/` with `user_id`, but exposes no labelled eligible-nonmember lookup. A general standalone browser picker cannot be added safely without an API contract change.
- Mutating browser rehearsal cannot be cleaned fully through public APIs because workflows/statuses/transitions/roles have no delete route and SLA cleanup is deactivation. It must run against a disposable/restorable clone and be discarded afterward.

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
- Admin -> Settings exposes General, Feature flags, and Notification templates without combining their independent permissions. The Settings navigation entry is visible when the operator has at least one Day 8 read/manage permission; each subsection independently loads or explains why it is unavailable.
- General settings display only `web_base_url`, `default_timezone`, `default_page_size`, and `email_from`, preserve the API `value_type`, and map backend validation to readable fields. Sensitive rows are never rendered as values: `is_sensitive=true` plus `has_value` may show only a neutral Configured/Not configured state.
- Feature flags display exact key, API description, and current enabled state. Disabling any currently enabled flag requires confirmation because the API exposes no usage-status field; the UI describes the relevant area but never claims actual live usage. Day 8 flags are configuration only and do not yet gate existing endpoints.
- Notification template editing uses exact API fields, a fixed allowed-placeholder reference, and plain-text preview with local sample values. Preview code never evaluates expressions or renders HTML, and backend validation remains authoritative.
- Settings editors maintain a last-fetched snapshot. Save submits only normalized changed fields, Cancel restores the selected editor, Reset restores all fields in the current subsection to the last fetched server snapshot, and navigation/reload with unsaved changes requires confirmation. Reset does not mean factory defaults because no reset/default endpoint exists.
- Every Day 8 screen has explicit loading, empty, retryable error, success, dirty, saving, and late-`403` states. Values and full template content are never written to console, telemetry, URLs, audit-facing client messages, or thrown error strings.
- Normal navigation never shows React Router's default developer error surface. Authenticated users receive friendly, consistent 403, 404, and unexpected-error pages with safe recovery actions and no stack/error-object disclosure.
- Authenticated production flows use API data or explicit loading/empty/error states only. No build flag can replace a failed request with local request/search/report/directory/configuration records.
- High-use screens are keyboard-operable, announce loading/errors/success, use semantic tables/headings, preserve visible focus, label controls and icon actions, and pair every color state with readable text.
- Admin Users, Roles/Permissions, Workflow, Reports, Settings, Audit, and Request Detail fit 320px mobile through desktop without page-level horizontal overflow, overlap, or inaccessible actions. Wide data tables may scroll within a labelled region.
- Admin Audit is visible only with `admin.audit.read`, uses real paginated API records and supported filters, resolves actor labels from the tenant-user lookup when possible, links only to valid known entities, and renders payload details as escaped readable text/fields.
- Shared badges, form fields, notices, loading/empty/error states, and pagination reduce behavior/style drift without a broad redesign or unrelated refactor.
- A minimal Playwright Chromium suite covers Sprint 3 navigation and unauthorized behavior with deterministic API interception; a separate manual smoke pass validates the deployed API/database integration.
- Day 10 produces a deterministic 25-step browser script with route, exact API request/response, visible success evidence, and failure/no-go behavior for every step, plus security/direct-link/refresh/console/mobile checks.

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

In scope for Day 8 planning and subsequent implementation:

- `/admin/settings` with permission-aware General, Feature flags, and Notification templates sections.
- Typed general setting controls and atomic save for the four approved keys.
- Exact feature-flag catalogue display and confirmed enabled-to-disabled PATCH actions.
- Four notification-template editors, allowed-placeholder reference, safe sample preview, active toggle, and server-validation feedback.
- Snapshot-based save/cancel/reset, unsaved-change protection, accessible responsive forms, and positive/negative automated and manual tests.

Out of scope for Day 8:

- Creating, deleting, or renaming setting keys, feature flags, or notification event types.
- Showing or attempting to recover sensitive setting values; editing unknown/sensitive settings is not part of the four-key General form.
- Claiming feature usage, enforcing flags in the web/API, or hiding existing Reports/SLA/Admin routes based on Day 8 flag values. The API explicitly treats the flags as configuration-only in this milestone.
- Suppressing built-in notification events. An inactive template or disabled `notificationTemplates` flag disables only the custom database override; the API falls back to built-in notification text.
- HTML/WYSIWYG template editing, raw HTML preview, executable expressions, remote preview calls, test-email sending, or adding new placeholders.
- Factory-default reset, settings history, secret rotation, SMTP credentials, API changes, or applying the API SQL upgrade from the Web repository.

In scope for Day 9 planning and subsequent implementation:

- Root route error boundary/error element, friendly 403/404/unexpected pages, and catch-all routing.
- Removal of all local authenticated data fallbacks and misleading placeholder values after API failure.
- Focused accessibility and responsive fixes across the listed Sprint 3/request-detail workflows.
- A permission-aware, paginated Admin Audit page using the existing API contract and supported filters only.
- Small shared UI primitives where repeated behavior already exists: state badges, labelled form controls, notices, loading/error/empty states, and pagination.
- One documented Playwright dependency and a minimal Chromium Web smoke suite for the required routes.

Out of scope for Day 9:

- New request lifecycle, workflow, report, SLA, settings, role, or notification capabilities.
- New audit API fields, server-side actor expansion, new filter endpoints, audit export, audit mutation, or client-side reconstruction of missing audit data.
- A design-system rewrite, new component framework, visual rebrand, charting, advanced analytics, cross-browser matrix, full regression suite, or broad unit-test migration.
- Displaying raw stack traces, internal error objects, token/permission payloads, raw UUIDs as primary labels, unsanitized HTML, or sensitive setting/template values.
- Treating mocked Playwright smoke tests as proof of full-stack API, tenancy, SQL, MinIO, Redis, MailHog, or permissions integration.

In scope for Day 10 planning and subsequent hardening/rehearsal:

- Minimal Web fixes required to execute the approved browser demo: workflow create/edit, readable Create Request lookups, and exact transition-comment payload behavior.
- One disposable-database browser rehearsal covering all 25 requested actions, evidence capture, reversible-value restoration, and clone cleanup.
- Negative non-admin/direct-URL verification, refresh/deep-link checks, console/network cleanliness, no-demo/raw-ID/raw-object assertions, and mobile sanity.
- Updating Web verification/known-issues/release-readiness evidence and ExecPlan Outcomes after the rehearsal.

Out of scope for Day 10:

- A general standalone membership picker without a labelled eligible-user API contract. The demo uses the supported atomic user-plus-membership result and explicitly explains this design.
- New admin delete/archive APIs, workflow builder redesign, invitations/login provisioning, notification inbox, SLA compliance, Spanish FTS tuning, cross-browser automation, or any unrelated product feature.
- Mutating the normal `rt` database. The Day 10 browser demo is no-go unless a disposable/restorable clone, backup, unique suffix, and cleanup owner are confirmed.

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

### Milestone 6: Admin Settings

User-visible outcome: an authorized tenant administrator can open `/admin/settings`, edit the four approved general settings, review and toggle the four configured feature flags, and safely edit/preview the four notification templates. Permissions remain independent, sensitive values remain undisclosed, and unsaved edits cannot be lost silently.

Contract and deployment gate before implementation:

1. Verify that the API Day 8 contract is merged and its generated `/api/schema` contains the five route shapes. This gate is resolved in current API `main`; the earlier uncommitted-worktree observation is historical.
2. Confirm infrastructure has applied `db/upgrade-sprint3-admin-settings.sql` to the development SQL Server. Until then, the endpoints may fail because the unmanaged models do not create their own tables.
3. Reconfirm `GET /api/admin/me/permissions/` returns the exact Day 8 codes assigned for the active tenant. Do not infer access from role names or feature-flag values.
4. Keep every call in the shared `src/lib/api.ts` client so `Authorization` and `X-Tenant` remain automatic. Do not put setting values or template content in URL parameters.

Typed API client:

1. Add `src/api/adminSettings.ts` with explicit DTOs and normalized UI models for `TenantSetting`, `FeatureFlag`, and `NotificationTemplate`. IDs remain internal keys; primary labels are setting labels, flag descriptions, and event labels.
2. Implement only the confirmed relative paths: `/admin/settings/`, `/admin/feature-flags/`, `/admin/feature-flags/{key}/`, `/admin/notification-templates/`, and `/admin/notification-templates/{template_id}/`.
3. Preserve exact public response fields. Settings use `setting_id`, `key`, `value`, `value_type`, `is_sensitive`, `has_value`, `updated_at`, and `updated_by_id`; flags use `feature_flag_id`, `key`, `enabled`, `description`, `updated_at`, and `updated_by_id`; templates use `notification_template_id`, `event_type`, `subject_template`, `body_template`, `is_active`, `updated_at`, and `updated_by_id`.
4. Normalize standard `{code,message,details[]}` errors. Map nested settings validation such as `settings.0.value` back to the matching key when possible. Never stringify a response object, request payload, masked value, or template body into the visible error or console.
5. Export the exact placeholder catalogue as immutable UI metadata: `human_id`, `title`, `request_id`, `request_url`, `requester_name`, `assignee_name`, `comment_author`, and `status_name`. This reference is display/preview metadata, not a replacement for backend validation.

Admin route and permissions:

1. Add Settings to `src/pages/admin/AdminShellPage.tsx` at `/admin/settings`. Show the navigation item when permission context contains any of `admin.settings`, `featureflags.manage`, or `notifications.manage`; `tenant.settings.manage` alone does not grant General read access.
2. Add `src/pages/admin/AdminSettingsPage.tsx` with compact General, Feature flags, and Notification templates tabs or segmented navigation. Hide inaccessible tabs when at least one accessible tab exists; a direct inaccessible selection shows a clear forbidden subsection state and never calls its endpoint.
3. General GET requires `admin.settings`; General Save additionally requires `tenant.settings.manage`. With read-only permission, render values and helpers but disable Save with an explanation.
4. Feature flags require `featureflags.manage`; templates require `notifications.manage`. UI hiding remains advisory and every late API `403` stays visible without discarding local edits.

General settings implementation:

1. Load `GET /api/admin/settings/` and select only `web_base_url`, `default_timezone`, `default_page_size`, and `email_from` into a keyed form. If one is absent, show an explicit missing-configuration error rather than inventing a default. Unknown rows are not shown in the General editor.
2. Preserve and submit each row's API `value_type`. Expected mappings are `web_base_url=url`, `default_timezone=timezone`, `default_page_size=integer`, and `email_from=email`; a mismatch disables Save and reports a contract/configuration error.
3. Use typed controls and explanatory help: URL input for the request-link base; text input with IANA examples for timezone; numeric input with integer step and 1-100 bounds for page size; email input for notification sender. Explain that only `web_base_url` and `email_from` currently affect notification delivery, while timezone/page size are tenant client configuration and do not mutate Django global behavior.
4. Normalize drafts before PATCH: trim text/email/timezone, remove a redundant trailing slash from `web_base_url`, and submit `default_page_size` as canonical base-10 text. Client validation mirrors obvious constraints, while backend validation remains authoritative for URL credentials/fragments/control characters, IANA timezone validity, and email validity.
5. Save only changed non-sensitive approved rows in one atomic `{ settings: [{ key, value, value_type }] }` PATCH. On success, replace the snapshot from the returned `settings` collection and show success. On failure, keep edits and map field errors inline.
6. For any `is_sensitive=true` row, ignore `value` even if unexpectedly present and display only Configured/Not configured from `has_value`. Do not place masked text in an input, DOM data attribute, title, log, or error. Sensitive rows are not writable through this four-key form.

Feature-flag implementation:

1. Load the bounded array from `GET /api/admin/feature-flags/`; render the exact case-sensitive key, API description, and Enabled/Disabled state for `adminConsole`, `slaEnabled`, `exportsEnabled`, and `notificationTemplates`. Missing keys get a visible configuration error; unknown keys may be shown read-only but are never renamed.
2. Do not offer create, delete, or key/description editing in Day 8. Toggle writes submit only `{ enabled: boolean }` to the path key and refresh the list after success.
3. Require a keyboard-accessible confirmation before every enabled-to-disabled PATCH. Use key-specific impact copy, while stating that Day 8 stores configuration and does not yet enforce existing Admin, SLA, export, or notification endpoints.
4. The API has no `in_use` or usage-count field. Treat every currently enabled flag as potentially in use and confirm conservatively; never display an unverified "currently in use" claim. If a future API adds usage evidence, update the contract before changing this behavior.
5. Do not optimistically flip the visible state. Show saving state on the selected flag, prevent duplicate clicks, retain the previous state on failure, and handle `404`/`403` clearly.

Notification-template implementation:

1. Load the bounded list from `GET /api/admin/notification-templates/` and present readable labels for `request.created`, `request.assigned`, `comment.added`, and `request.closed`. Select by `notification_template_id`; optionally refetch detail on selection so stale list content cannot overwrite newer edits.
2. Provide subject editor, multiline body editor, and active checkbox. Event type and template ID are immutable. Enforce basic local constraints: nonblank subject/body, one-line subject, subject maximum 500 characters, and body maximum 20,000 characters; map backend placeholder/braces errors inline.
3. Show the exact allowed-placeholder reference beside the editor with an insert-at-cursor action only if it can preserve selection and keyboard behavior. Unsupported placeholders, conversions, format specifiers, traversal, indexing, and malformed braces remain backend-rejected.
4. Implement a deterministic local plain-text preview with fixed sample values. Replace only exact allowed `{name}` tokens, support literal `{{` and `}}`, and treat all other text as text. Render subject/body using normal React text nodes or `<pre>`; never use `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `Function`, template compilation, Markdown HTML, or network calls.
5. Suggested sample values are clearly labelled Preview data: `RT-2026-000123`, `VPN access request`, a fixed sample UUID, `https://rt.example.test/requests/<sample-id>`, `Ana Requester`, `Alex Agent`, `Maria User`, and `In Progress`. Preview data is never submitted.
6. PATCH only changed `subject_template`, `body_template`, and/or `is_active`; refetch/replace the selected template after success. Explain that inactive custom templates and `notificationTemplates=false` fall back to built-in notification text rather than suppressing notification events.

Save, reset, and unsaved changes:

1. Keep server snapshots separate from drafts per subsection/template. Save updates the snapshot only from the API response. Cancel/Reset restores the current snapshot, not hardcoded seed values.
2. Disable Save when clean, invalid, unauthorized, or already saving. Keep visible dirty state and an accessible status message after save/error.
3. Use React Router's supported blocker API plus `beforeunload` for browser refresh/close. Confirm before leaving the Settings route, changing subsection, or selecting another template while the current draft is dirty. Continue/Discard restores or abandons the draft deterministically; Stay keeps focus in the editor.
4. Loading, empty, and fatal error states must not render stale values as current. Retry refetches the relevant family only. A tenant change invalidates all settings snapshots and reloads under the new `X-Tenant`.

### Milestone 7: UX hardening and tests

User-visible outcome: Sprint 3 can be demonstrated and released without developer error pages, fake authenticated data, inaccessible state changes, broken mobile layouts, or untested Admin navigation. Authorized auditors can inspect real tenant audit history without adding a new API capability.

Route-level failure handling:

1. Refactor `src/main.tsx` to use one parent/root route with a production-safe `errorElement` for descendant render/loader errors and retain the existing `Protected`/`AdminProtected` behavior. Add an explicit `*` route for 404 so unmatched paths never reach React Router's default error page.
2. Add reusable status-page presentation plus `src/pages/NotFoundPage.tsx` and `src/pages/RouteErrorPage.tsx`. Keep the existing `/403` copy/tenant context but align it with the same layout. Provide Home, Back, and Retry/Reload only where each action is valid.
3. Use `isRouteErrorResponse`/`useRouteError` to distinguish route 403/404 from unexpected errors. Never render `error.message`, stack, response body, route internals, tokens, or permission objects. A safe generic reference generated client-side may be shown only if it contains no error data.
4. Wrap `RouterProvider` in a small root React class error boundary, candidate `src/components/common/AppErrorBoundary.tsx`, for failures outside route rendering. Recovery clears no auth data automatically; offer reload and Home/login as context permits.
5. Keep API errors local to their page/section. A normal `400/403/404/500` Axios response must not be thrown into the root boundary unless the route itself cannot render safely.

Remove production demo/data substitutions:

1. Delete `FALLBACK_DETAIL`, `FALLBACK_COMMENTS`, `FALLBACK_ACTIVITY`, `ENABLE_DEMO_DETAIL_FALLBACK`, and the fallback branch from `src/pages/RequestDetailPage.tsx`. Failed real detail loads render the existing clear error state and no request content.
2. Search `src/`, environment examples, and docs for `demo`, `fallback`, `fake`, `mock`, and local record literals. Error-message fallback strings and safe empty labels are allowed; authenticated data replacement is not.
3. Change Home summary state from hardcoded zero values to nullable/unavailable state. Loading may use skeletons; a failed summary shows an error and dashes/Unavailable, never plausible zero KPIs.
4. Audit request/comment/activity normalizers that synthesize `crypto.randomUUID()` or current timestamps for API reads. Filter records missing required identity/timestamps or display Unknown/Unavailable without manufacturing server facts. Locally created optimistic records may exist only when clearly tied to a successful mutation response and must be replaced by refetch.
5. Restrict or remove `VITE_ENABLE_ADMIN_DEV_OVERRIDE`. If retained for local development, require both `import.meta.env.DEV` and the explicit flag so a production build can never grant Admin UI access from the override.

Shared accessibility and consistency hardening:

1. Enhance `ErrorState` with `role="alert"`; enhance loading states with `aria-busy`, a screen-reader loading label, and shape-neutral responsive skeletons; keep `EmptyState` semantically neutral. Add a small shared `InlineNotice` for success/info/warning/error with `role="status"` or `role="alert"` and migrate repeated Admin notices.
2. Add a shared `PaginationControls` accepting page, page size/count or API next/previous state, clear accessible names, disabled semantics, and a live page summary. Adopt it in Users, SLA, Search, and Audit without changing API pagination behavior.
3. Consolidate repeated status UI around `StatusBadge`/a small generic state badge. Visible text such as Open, Inactive, Enabled, or Overdue remains present, so color is never the only state indicator. Keep priority text readable for all four values rather than using red alone for High.
4. Convert Home and Search request grids to semantic tables with `<caption className="sr-only">`, `<thead>`, `<th scope="col">`, `<tbody>`, and a clearly named Open action/link. Preserve 48px rows, hover state, keyboard activation, and internal horizontal scrolling on narrow screens.
5. Standardize form labels/helper/error linkage with a lightweight shared field wrapper or shared ID/error helper; do not rewrite every form. Prioritize Login, Admin Users, Workflow editors, Reports filters, SLA dialog, Settings, Audit filters, and Request Detail actions. Every `aria-invalid` control with an error gets `aria-describedby`.
6. Harden `AdminDialog`: capture the opener, focus an explicit `autoFocus` control or first interactive element after `showModal`, keep native modal focus containment/Escape, and restore opener focus after close. Ensure destructive and unsaved-change dialogs have unique accessible names and disabled busy actions.
7. Verify the global user menu has menu semantics, Escape/outside-close behavior, logical focus movement, and a clear accessible avatar/menu-button name. Do not implement unfinished menu destinations during polish.

Responsive pass, using 320px, 768px, 1024px, and 1440px viewports:

1. Global/Admin shell: prevent fixed left rail/top-bar content from forcing page overflow. Use a compact mobile navigation/menu or a labelled horizontally scrollable navigation band; retain the desktop rail. Long tenant/user labels truncate without hiding menu access.
2. Admin Users: filters/actions wrap, the user table scrolls inside its own labelled container, pagination wraps, and user/membership detail stacks to one column with full-width controls on mobile.
3. Roles/Permissions: role navigation stacks above detail before `lg`; permission matrix becomes one column; long permission codes wrap; dialogs/action rows remain reachable.
4. Workflow Admin: workflow list stacks above status/transition editors; editor grid controls use full width on mobile; status/transition labels wrap; no action overlaps validation.
5. Reports: filter grid/date ranges collapse predictably, KPI values remain stable, breakdown tables scroll internally, and Export/Apply/Clear buttons wrap without truncation.
6. Settings: General fields, feature rows, template navigation/editor/preview, notices, and save/reset actions stack without viewport overflow; preview text wraps and scrolls inside its panel.
7. Request Detail: change the fixed main/sidebar grid to one column by default and two columns only at `lg`; header/actions wrap; comments, attachments, activity payloads, workflow/assignment controls, and upload filenames do not force page overflow.
8. Audit: filters stack, the table scrolls internally or switches to readable row blocks at narrow widths, details wrap, and pagination remains visible.

Admin Audit UI using the implemented API contract:

1. Add `src/api/adminAudit.ts` using `src/lib/api.ts`. Normalize the exact paginated response and omit malformed records that lack `activity_id`, `type`, or `created_at`; never generate substitute IDs/timestamps.
2. Add `/admin/audit` to `AdminShellPage` only when permission context contains `admin.audit.read`/`canReadAudit`. A direct route without permission shows a local 403 state and does not break the Admin shell.
3. Add `src/pages/admin/AdminAuditPage.tsx` with URL-backed filters for every API-supported field: event `type`, readable actor selector sending `actor_id`, request ID, entity ID, created-from/to, page, and page size. Convert calendar upper/lower bounds to explicit ISO datetimes and omit empty values.
4. Resolve actor labels through the existing tenant `/users/` lookup once per page load. Display `display_name` then email; if the actor is absent, show Unknown actor. Keep `actor_id` internal except in an explicitly labelled advanced filter value already entered by the operator.
5. Render a semantic paginated table with Event, Actor, Entity/Request, Timestamp, and Details. Convert dotted event types to readable title text while retaining the exact type in an optional secondary code label/filter value.
6. Link requests to `/requests/{request_id}`. For known entity types, link only when the existing target screen can select that entity: user/membership to Users, role to Roles, workflow/status/transition through `flow_id` when available, SLA policy to SLA, and notification template to Settings. Add minimal URL selection support to those existing pages only when needed; otherwise show a readable entity type with no dead/misleading link.
7. Render `payload_json` in a `<details>` disclosure with readable key/value rows. Primitive values become text; arrays/nested objects use escaped, wrapped text. If parsing failed, show Payload unavailable or a bounded plain-text raw payload only after confirming it contains no HTML rendering path. Never use `dangerouslySetInnerHTML`.
8. Handle loading, empty, malformed payload, invalid filters, pagination, `403`, and retry independently. Do not infer missing actors/entities, fabricate event labels, or expose raw objects.

Minimal Playwright dependency and smoke suite:

1. Proposed dependency, documented here before installation: add only `@playwright/test` as a dev dependency and update `pnpm-lock.yaml`. Add `test:e2e` and `test:e2e:install` scripts; do not add Vitest/RTL in the same release-prep change.
2. Add `playwright.config.ts` with Vite `webServer`, `http://127.0.0.1:5173` base URL, Chromium only, one worker in CI, trace on first retry, and screenshot on failure. Do not record videos or secrets by default.
3. Add `tests/e2e/sprint3-admin-smoke.spec.ts` plus a small API-routing fixture. Intercept authentication and only the API contracts needed by each smoke path, returning explicit contract-shaped fixtures. Use a syntactically valid test JWT only for client routing; no production credentials or tokens enter source control.
4. Minimum tests: admin login and navigation; Users page; Workflows page; Reports page; Settings page; unauthorized `/admin` behavior; friendly unknown-route 404. Assert page headings, key API request headers where observable, absence of React Router developer-error text, and no uncaught page errors.
5. Keep mocked Web smoke clearly named/documented. Add a separate optional/manual environment-variable full-stack run for deployed API verification; do not make CI depend on SQL Server/MinIO/Redis/MailHog for this minimal suite.
6. Update `.github/workflows/ci-web.yml` after dependency approval to install Chromium with dependencies and run `pnpm test:e2e` after lint/build. Preserve existing typecheck/lint/build gates.

Release verification and scope control:

1. Run `pnpm lint`, `pnpm build`, `pnpm test:e2e`, `pnpm tsc --noEmit`, and `git diff --check`. Record the existing non-interactive pnpm limitation if it recurs and run equivalent package scripts without claiming pnpm passed.
2. Run keyboard-only and responsive manual passes for the named screens, then one real authenticated ACME smoke against deployed API/SQL. Check browser console and Network for uncaught errors, failed route chunks, missing auth/tenant headers, and demo-data requests.
3. Keep Day 9 to polish, Audit UI, tests, and release documentation. If the diff exceeds the repository's preferred PR size, split Audit UI from shared polish/Playwright while preserving this single milestone's acceptance criteria.

### Milestone 8: Final hardening and browser demo

User-visible outcome: a reviewer can follow one browser-only, tenant-scoped story from RT Admin login through configuration, a complete request lifecycle, notification evidence, and logout. Every action has contract-backed success/failure evidence, no hidden Postman step is needed during the browser narrative, and the original database is unchanged after the disposable environment is removed.

Pre-demo release gates:

1. Merge/deploy the API final-hardening commit and Web Day 9 commit; generate and validate OpenAPI `0.2.0`; confirm the Postman contract test still proves collection methods/paths exist in the generated schema.
2. Back up the normal database and create a disposable clone such as `rt_browser_day10`. Apply the Sprint 3 upgrades in documented order plus the API polish upgrade. Never point the mutating browser demo at normal `rt`.
3. Run API checks and guarded read-only Postman/Sprint 2 regression, then `db/verify-sprint3-release.sql`. Confirm required tables/columns/indexes/permissions, no duplicates/mismatches, and all services: SQL Server, MinIO, Redis, MailHog, API, and Web.
4. Prepare secret-free local credentials outside source control: one ACME RT Admin, one ACME non-admin, one active disposable assignee/requester, and one separate disposable user safe to deactivate. Clear MailHog and browser storage. Use a unique suffix such as `WEB-D10-<timestamp>` for all created names/titles.
5. Capture baseline values for the setting, feature flag, and notification template that will be changed. Prepare a small harmless text file for grouped upload. Open DevTools Console and Network with Preserve log enabled.
6. Resolve three Web release blockers before rehearsal, with focused tests and no unrelated feature work:
   - Add create/edit workflow calls and controls using exact `POST/PATCH /api/admin/workflows/` fields `name` and `description`.
   - Replace raw Flow/Requester/Assignee ID inputs in `/requests/new` with readable `/api/flows/`, flow-status, and `/api/users/` selectors while still submitting IDs/null.
   - Send transition comments as exact `{ transition_id, comment }` and remove the separate duplicate-comment workaround.
7. Standalone membership creation is not a Day 10 Web addition. The browser demo explicitly presents the atomic membership returned by `POST /api/admin/users/` as the supported creation path. If stakeholders require a separate non-member picker and second POST, mark the demo no-go until OpenAPI adds a labelled eligible-user lookup.

All API calls below must include `Authorization: Bearer <jwt>` and `X-Tenant: ACME`, except login/health and the presigned MinIO PUT. All API failures must use the canonical `{code,message,details[]}` envelope and remain local to the current page.

#### Browser demo script

1. **Login as RT Admin**
   - Route: `/login`.
   - Expected API request: `POST /api/auth/jwt/create` with `{username,password}` and `X-Tenant: ACME`.
   - Expected response: `200` with nonempty `access` and optional `refresh` token.
   - Expected visible result: browser routes to `/`; Home heading, tenant ACME, user label, and real KPI/list loading states appear.
   - Failure behavior: `401/400` remains on Login with an announced readable error; no token is persisted and no authenticated shell/demo data appears.

2. **Confirm Admin navigation**
   - Route: `/`, then `/admin` from the Admin navigation item.
   - Expected API request: `GET /api/admin/me/permissions/`.
   - Expected response: `200` with ACME user context, `RT Admin`, `is_admin=true`, `can_read_audit=true`, and the approved 18 effective permission codes.
   - Expected visible result: Admin entry is visible; `/admin` shows Overview, Workflows, Users, Roles & Permissions, Reports, SLA Policies, Settings, and Audit according to exact permissions.
   - Failure behavior: missing/insufficient context hides Admin or routes direct access to friendly `/403`; permission-load failure shows retryable local error, never JWT claims or raw permission objects.

3. **Review audit records**
   - Route: `/admin/audit`.
   - Expected API requests: `GET /api/admin/audit/?page=1&page_size=25` and `GET /api/users/` for readable actor labels; apply one supported type/date/entity filter.
   - Expected response: `200 {count,next,previous,results}`; each result may contain `activity_id`, `request_id`, `actor_id`, `type`, `payload`, `payload_json`, `entity_id`, `entity_type`, `created_at`.
   - Expected visible result: semantic table shows readable event/actor/entity/timestamp, expandable escaped payload details, pagination, and only valid request/admin-area links.
   - Failure behavior: `403` stays inside Audit without breaking Admin; invalid UUID/date range maps `400 details[]` to filters; malformed payload is shown as unavailable/bounded text, never raw HTML/object rendering.

4. **Create and edit a workflow**
   - Route: `/admin/workflows`.
   - Expected API requests: initial `GET /api/admin/workflows/`; `POST /api/admin/workflows/` with `{name:"WEB-D10-<suffix>",description:"Browser demo workflow"}`; then `PATCH /api/admin/workflows/{flow_id}/` with changed description.
   - Expected responses: list `200`; create `201 {flow_id,name,description,created_at}`; patch `200` with the updated workflow.
   - Expected visible result: create dialog closes, the new readable workflow is selected, edit state reflects the saved description, and list/detail refetch from server.
   - Failure behavior: duplicate/invalid name shows inline `400/409`; form stays populated, no optimistic phantom workflow appears, and no raw ID is the primary label.

5. **Create and edit statuses**
   - Route: `/admin/workflows` with the new workflow selected.
   - Expected API requests: `POST /api/admin/workflows/{flow_id}/statuses/` for `Open`, `In Progress`, and terminal `Closed` using `{name,category,is_terminal}`; edit one through `PATCH .../statuses/{status_id}/`.
   - Expected responses: `201/200` clean status objects with `status_id`, `flow_id`, `name`, `category`, `is_terminal`, `created_at`.
   - Expected visible result: all three readable statuses appear; open/closed lifecycle validation passes; edited label/state refreshes.
   - Failure behavior: duplicate name, unsupported category, or missing open/closed coverage is blocked inline; API `409/400` preserves editor state and existing list.

6. **Create and edit transitions**
   - Route: `/admin/workflows`.
   - Expected API requests: POST Open → In Progress and In Progress → Closed to `/api/admin/workflows/{flow_id}/transitions/` with `from_status_id`, `to_status_id`, optional guard JSON/auto rules; PATCH one transition's `auto_rules` through its detail path.
   - Expected responses: `201/200` transition objects with public IDs, endpoints, guard fields, auto rules, and timestamp.
   - Expected visible result: readable From → To rows appear and refresh after edit.
   - Failure behavior: same-status or duplicate pair is blocked before request; malformed guard/auto-rule or backend conflict is readable and does not duplicate the transition.

7. **Create and deactivate a domain user**
   - Route: `/admin/users`.
   - Expected API requests: `POST /api/admin/users/` with unique email/display name and `is_default_tenant=false`, creating the active demo user; separately `PATCH /api/admin/users/{disposable_user_id}/` with `{is_active:false}` for the prepared deactivation target.
   - Expected responses: create `201 {user,membership}`; deactivate `200` user with `is_active=false`.
   - Expected visible result: created RT domain user appears with active current-tenant membership and explicit no-login-credentials copy; separate user displays Inactive after confirmation.
   - Failure behavior: duplicate email/validation maps inline; final-admin/shared-user safeguards show `409` warning and retain prior state; no claim is made that Django/OIDC login was created or disabled.

8. **Confirm membership creation**
   - Route: `/admin/users`, created user detail.
   - Expected API request: verify with `GET /api/admin/memberships/?user_id={created_user_id}&page=1&page_size=100`. Membership creation itself was the atomic `POST /api/admin/users/` in step 7; no second POST is expected.
   - Expected response: `200` paginated results containing the same `membership_id`, readable user, default-tenant state, roles, and `created_at` returned during creation.
   - Expected visible result: Tenant membership panel shows ACME and Tenant member/Default tenant state without exposing UUIDs.
   - Failure behavior: missing/mismatched membership is release-blocking and stops the demo. Do not paste a raw `user_id` into an improvised standalone form; a separately mandated membership POST is no-go pending labelled eligible-user lookup.

9. **Create and edit a role**
   - Route: `/admin/roles`.
   - Expected API requests: `GET /api/admin/roles/?page=1&page_size=100&sort=name`; `POST /api/admin/roles/` with unique `{name,description}`; `PATCH /api/admin/roles/{role_id}/` with updated description.
   - Expected responses: list page `200`; create `201`; patch `200`, all with clean role/permission fields.
   - Expected visible result: custom role is selected, readable name/description appear, and the permission matrix loads.
   - Failure behavior: duplicate/canonical-role rename conflict shows readable `409`; prior role remains selected and no duplicate appears.

10. **Assign role to membership**
    - Route: `/admin/users`, created user detail.
    - Expected API requests: load membership/role options, then `POST /api/admin/memberships/{membership_id}/roles/` with `{role_id}`.
    - Expected response: `201/200` membership object including the newly assigned readable role.
    - Expected visible result: role badge appears in the membership panel after server refresh.
    - Failure behavior: duplicate assignment `409`, cross-tenant/not-found `404`, or missing `admin.roles` stays local and leaves prior roles unchanged.

11. **Review permissions**
    - Route: `/admin/roles` with the custom role selected.
    - Expected API requests: `GET /api/admin/permissions/?page=1&page_size=100` and `GET /api/admin/roles/{role_id}/`.
    - Expected response: paginated permission catalogue and role detail with assigned permissions.
    - Expected visible result: grouped readable permission matrix; optionally assign one harmless permission with `POST .../permissions/ {permission_code}` and observe refresh.
    - Failure behavior: missing `admin.permissions` makes the matrix read-only; final-admin `admin.read` removal remains blocked/confirmed and `409` restores state.

12. **Create and edit an SLA policy**
    - Route: `/admin/sla`.
    - Expected API requests: `GET /api/admin/sla-policies/`; `POST` with unique name, lowercase priority, positive integer response/resolution minutes, active true; `PATCH /api/admin/sla-policies/{sla_policy_id}/` with changed targets or active state.
    - Expected responses: list `200`; create `201`; patch `200` public SLA policy object.
    - Expected visible result: policy row shows readable priority, minute/duration hints, Active state, and updated values after refetch.
    - Failure behavior: duplicate name, invalid priority/minutes, response greater than resolution, or `403` maps inline; dialog stays open and list remains accurate.

13. **View reports**
    - Route: `/admin/reports`.
    - Expected API requests: lookup calls plus `GET /api/reports/summary/` using one applied filter such as `priority=normal`.
    - Expected response: `200` exact server counts and `by_priority`/`by_status` arrays.
    - Expected visible result: KPI tiles and semantic breakdown tables match the response; URL-backed filters remain stable.
    - Failure behavior: `403/400/500` shows explicit error and no stale/fake KPI or chart values.

14. **Export CSV**
    - Route: `/admin/reports`.
    - Expected API request: `GET /api/reports/requests/export/?format=csv` plus the currently applied report filters.
    - Expected response: `200 text/csv; charset=utf-8` Blob with `Content-Disposition: attachment; filename="rt-requests-...Z.csv"` and approved columns.
    - Expected visible result: Preparing state ends, file downloads with server filename, and success notice appears without navigation.
    - Failure behavior: missing `reports.export` disables/explains control; `403`, export limit, or Blob JSON error is readable, object URL is revoked, and no fake file downloads.

15. **Update a tenant setting**
    - Route: `/admin/settings`, General settings.
    - Expected API requests: `GET /api/admin/settings/`; atomic `PATCH /api/admin/settings/` with one changed row such as `{key:"default_page_size",value:"25",value_type:"integer"}`.
    - Expected response: `200 {settings:[...]}` with normalized value/type/sensitivity metadata.
    - Expected visible result: success notice, refreshed value, and no sensitive value exposure. Record the original value for restoration.
    - Failure behavior: invalid type/range or missing write permission maps inline; edits remain dirty; no partial update or setting value is logged.

16. **Toggle a feature flag**
    - Route: `/admin/settings`, Feature flags.
    - Expected API requests: `GET /api/admin/feature-flags/`; confirmed `PATCH /api/admin/feature-flags/{exactKey}/` with `{enabled:false|true}`. Use a reversible flag and restore it immediately.
    - Expected response: `200` feature flag with exact case-sensitive key/current state.
    - Expected visible result: confirmation for enabled → disabled, refreshed readable state, and success notice.
    - Failure behavior: `403/404` retains prior state; no optimistic flip or key lowercasing; UI does not claim existing routes are enforced by the flag.

17. **Edit and preview a notification template**
    - Route: `/admin/settings`, Notification templates.
    - Expected API requests: list/detail GET; local text-only preview makes no request; PATCH detail with changed `subject_template`, `body_template`, and/or `is_active` using only allowed placeholders.
    - Expected response: `200` updated template with immutable ID/event type and active state.
    - Expected visible result: sample preview is escaped plain text, saved template refetches, and success notice appears. Keep the custom request-created template active through step 24, then restore baseline.
    - Failure behavior: unknown/malformed placeholder, HTML-looking text, multiline subject, or length error is visible and never executed/transformed silently; backend `400` remains authoritative.

18. **Return to normal Request Tracker**
    - Route: `/` via Back to Home.
    - Expected API requests: `GET /api/dashboard/summary/` and tenant-scoped `GET /api/requests/?...`.
    - Expected response: `200` real summary/list data.
    - Expected visible result: normal app shell, Home KPIs/queues, New Request/Search, and no Admin state leaking into content.
    - Failure behavior: unavailable/error states replace data honestly; no local rows, plausible zero substitution, or route-boundary takeover for known API failures.

19. **Create a request**
    - Route: `/requests/new`, then `/requests/{request_id}`.
    - Expected API requests: `GET /api/flows/`, `GET /api/flows/{flow_id}/statuses/`, `GET /api/users/`; `POST /api/requests/` with title/description, lowercase priority, created workflow/status IDs, readable requester/optional assignee IDs/null, optional due date/tags.
    - Expected response: `201` with public `request_id` and request fields.
    - Expected visible result: selectors show names/emails rather than UUID entry; successful navigation uses exactly `/requests/{response.request_id}` and real detail loads `200`.
    - Failure behavior: field errors map to readable controls; missing `request_id` blocks navigation with explicit error; never navigate to `/requests/-`, `/undefined`, human ID, or null.

20. **Assign the request**
    - Route: `/requests/{request_id}`.
    - Expected API requests: `GET /api/users/`; `PATCH /api/requests/{request_id}/` with `{assignee_id:"<user_id>"}` or null, followed by real detail refresh.
    - Expected response: `200` request/detail with assigned user ID/object as contracted.
    - Expected visible result: Current Assignee shows display name/email, success state, and no raw object/ID.
    - Failure behavior: `400/403/404` appears near assignment, old readable assignee remains, and no empty-string UUID is sent.

21. **Add comment and files**
    - Route: `/requests/{request_id}`.
    - Expected API requests: `POST /api/attachments/init` with request/file metadata; presigned MinIO `PUT`; `POST /api/attachments/finalize` with request/group IDs, comment `message`, and finalized file metadata; then comments/attachments/detail refresh. A no-file comment uses `POST /api/requests/{request_id}/comments/ {body}`.
    - Expected responses: init `200 {request_id,group_id,uploads}`; PUT `200/204`; finalize `201 {request_id,group_id,comment_id,attachments}`.
    - Expected visible result: one comment bubble groups all uploaded files; filenames, sizes, scan states, and comment text appear from refreshed API data.
    - Failure behavior: init/PUT/finalize error is readable, retry does not fabricate attachments/comments, optional IDs are not empty strings, and unfinalized files do not appear as complete.

22. **Transition and close**
    - Route: `/requests/{request_id}`.
    - Expected API requests: `GET /api/requests/{request_id}/available-transitions/`; POST Open → In Progress then In Progress → Closed to `/transition/` with exact `{transition_id,comment}`; refresh detail/transitions/comments/activity after each.
    - Expected response: each transition `200` updated request; subsequent detail/activity shows new status and transition/comment events. Closing triggers `request.closed` notification.
    - Expected visible result: status changes Open → In Progress → Closed, terminal state has no invalid actions, each optional comment appears once, and timeline remains readable.
    - Failure behavior: unavailable transition/required comment/backend validation is shown without PATCHing request detail; no duplicate comment workaround, stale action, raw payload object, or fake status.

23. **Search**
    - Route: `/search?q=WEB-D10-<suffix>`.
    - Expected API request: `GET /api/search/requests?q=...&page=1&page_size=25&sort=-updated_at` plus applied supported filters.
    - Expected response: `200 {count,page,page_size,results}` containing the created request when indexed/matched.
    - Expected visible result: real semantic result row with readable ID/title/status/assignee/requester/flow and Open action using `request_id`.
    - Failure behavior: API/index lag shows honest empty/error with retry guidance; no local search rows, `/requests/-`, raw object, or malformed-ID navigation.

24. **Confirm notification**
    - Route: MailHog browser `http://localhost:8025` (external demo tool), with Request Tracker still available in its tab.
    - Expected API request: no new RT mutation is required; MailHog UI fetches its own message API. Evidence was generated by request created, assigned, comment-added/finalized, and closed actions.
    - Expected response/evidence: four messages with unique recipients as applicable, Human ID/title/request ID/link, tenant `web_base_url`/`email_from`, and the custom request-created template previewed in step 17.
    - Expected visible result: created, assigned, comment-added, and closed messages are readable and links target `/requests/{request_id}`.
    - Failure behavior: missing/duplicate/wrong-recipient/link/template mail is release-blocking. Capture evidence and stop; do not resend blindly or claim UI success proves delivery. Restore template baseline after evidence.

25. **Logout**
    - Route: current RT tab user menu, ending at `/login`.
    - Expected API request: none; Web clears access/tenant local storage and refresh token session storage, then Protected routing redirects.
    - Expected response: not applicable.
    - Expected visible result: Login page appears; Back/refresh/direct `/admin` cannot reopen authenticated content.
    - Failure behavior: any retained Admin/request view, token in storage, or successful protected request after logout is release-blocking.

#### Cross-cutting negative and presentation verification

1. **Non-admin:** sign in with the prepared non-admin. Admin navigation is absent; Home/normal routes still work. Direct `/admin`, `/admin/workflows`, `/admin/users`, `/admin/roles`, `/admin/reports`, `/admin/sla`, `/admin/settings`, and `/admin/audit` must resolve to friendly `/403` or a permission-local denial after `GET /api/admin/me/permissions/`, never render protected data.
2. **Direct URLs and refresh:** as RT Admin, directly open and refresh every Admin route, `/requests/new`, a real `/requests/{request_id}`, and `/search?q=...`. Auth/tenant headers remain present after storage hydration; selected data refetches; unknown routes show friendly 404; no redirect loop/default router error appears.
3. **Console/network cleanliness:** zero uncaught exceptions, React key/object-child warnings, failed chunk loads, stack traces, unhandled promise rejections, or unexpected `4xx/5xx`. Expected negative checks are identified and cleared before the success recording.
4. **No local/demo fallback:** force one representative list/detail/search/report/settings failure. UI shows explicit error/empty state and no local request, local search, fake KPI, fake user/role/setting, generated server timestamp, or demo banner.
5. **Identifier safety:** inspect navigation and requests throughout. No `/requests/-`, `/requests/undefined`, `/requests/null`, human-ID detail fetch, empty UUID string, or raw UUID as a primary label. Missing IDs disable links/actions.
6. **No raw object rendering:** nested flow/status/requester/assignee, audit payload, errors, activity, and template text render as readable escaped text. No React object-child crash, `[object Object]`, raw exception, or `dangerouslySetInnerHTML` path.
7. **Mobile sanity:** at 320×720, verify Login, Home, Admin navigation, Audit, Workflow, Users, Roles, Reports, SLA, Settings, Request Create, Request Detail, and Search. No document-level horizontal overflow, overlapping controls, clipped actions, lost dialog focus, or color-only status; wide tables scroll only inside labelled regions.

#### Cleanup and evidence

1. Restore changed setting, feature flag, and notification template from captured baselines; verify each GET after restore. Clear downloaded CSV/demo upload from the workstation if required by policy.
2. Save screenshots or a concise evidence log for permissions, audit, workflow/status/transition, user/membership/role, SLA/report/CSV, settings/flag/template, request lifecycle/search, MailHog, non-admin 403, mobile, and clean console.
3. Stop Web/API/services, discard `rt_browser_day10`, verify normal `rt` contains zero `WEB-D10-<suffix>` records, and retain backup/script checksums/commit/PR/OpenAPI/Postman/SQL evidence.
4. Go only when every release-blocking browser step and negative check passes. Accepted limitations remain in `docs/sprint-3-known-issues.md`; any new defect gets owner/severity/reproduction before release decision.

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

Automated Day 8 verification:

- Add a focused Vitest/React Testing Library harness if it is still absent, with `pnpm test` or a documented equivalent script. Keep test setup scoped to Web behavior; do not duplicate API serializer tests.
- Test settings DTO normalization, exact key/type matching, sensitive-value suppression even when a malformed fixture contains a value, changed-only atomic payload construction, URL trailing-slash normalization, canonical page-size text, and nested backend field-error mapping.
- Test General read-only behavior with `admin.settings` but no `tenant.settings.manage`, write access with both permissions, hidden/inaccessible General behavior without `admin.settings`, and a simulated late `403` that preserves dirty input.
- Test feature flag exact-case keys, descriptions/states, confirmation on every enabled-to-disabled action, no confirmation for disabled-to-enabled, one in-flight PATCH, failure state restoration, and the absence of unverified live-usage claims.
- Test template list/detail normalization, immutable event identity, subject/body bounds, allowed-placeholder reference, escaped braces, plain-text sample replacement, and unsupported/malformed placeholder feedback while preserving backend authority.
- Include an XSS regression fixture such as `<img src=x onerror=alert(1)>` in a subject/body and prove preview renders literal text with no `innerHTML`, `dangerouslySetInnerHTML`, script execution, or DOM element creation.
- Test Save/Cancel/Reset snapshots, subsection/template selection blocking while dirty, browser unload registration/cleanup, successful snapshot replacement, retryable loading/empty/error states, and tenant-change invalidation.
- Run `pnpm lint`, `pnpm build`, `pnpm test`, and `git diff --check`. If pnpm again aborts before scripts in the non-interactive shell, run the exact npm package-script equivalents and record the environment limitation separately from script results.

Manual Day 8 verification:

1. Confirm the API Day 8 branch/schema is available and the SQL upgrade has been applied. Sign in to ACME with all Day 8 permissions and open `/admin/settings`.
2. In DevTools Network, confirm `GET /api/admin/settings/`, `GET /api/admin/feature-flags/`, and `GET /api/admin/notification-templates/` use `Authorization` and `X-Tenant: ACME`; confirm no setting/template value appears in a URL.
3. General: verify the four approved controls and help text. Change all four, then confirm one `PATCH /api/admin/settings/` sends an atomic `settings` array with exact keys/value types and only changed rows. Confirm success refreshes the snapshot.
4. Enter an invalid URL, unknown timezone, page size 0/101, and malformed email. Confirm local feedback is readable and backend `400 details[]` maps to the correct field without raw objects or values in logs.
5. Exercise a sensitive-setting fixture/API response. Confirm the DOM shows only Configured/Not configured, never the raw or masked value, and no PATCH includes that row.
6. Use a token with `admin.settings` but no `tenant.settings.manage`: GET remains readable, Save is disabled with an explanation, and a forced PATCH returns visible `403` without clearing edits. Use a token without `admin.settings` and confirm no General request is sent.
7. Feature flags: confirm all four exact keys, descriptions, and states. Disable an enabled flag, verify the confirmation does not claim measured usage, then confirm `PATCH /api/admin/feature-flags/{exactKey}/` sends only `{ "enabled": false }` and refetches. Verify rejected `403/404` leaves the old state.
8. Confirm the UI explains that Day 8 flags are configuration-only: changing `adminConsole`, `slaEnabled`, or `exportsEnabled` must not be presented as proof that current routes were disabled.
9. Templates: open each supported event and verify readable label, subject, body, active state, and exact placeholder reference. Confirm selection uses the public template ID internally but never displays it as the primary label.
10. Preview a subject/body containing every allowed placeholder, escaped braces, line breaks, and HTML-looking text. Confirm fixed sample values render as plain text and no HTML executes.
11. Save a valid template and confirm `PATCH /api/admin/notification-templates/{template_id}/` contains only changed `subject_template`, `body_template`, and/or `is_active`; confirm returned data replaces the snapshot.
12. Trigger unknown placeholder, traversal, malformed braces, multiline subject, blank fields, and length errors. Confirm backend messages appear at the subject/body control and unsaved input remains.
13. Disable one custom template and `notificationTemplates`; confirm the UI states that built-in notifications still send. Trigger the corresponding event and verify the API/MailHog fallback separately if the backend environment is available.
14. Make edits, then Cancel/Reset, switch template/tab, navigate Home, refresh, and close the browser tab. Confirm dirty-state prompts appear only when needed and discarded edits never leak into another tenant/template.
15. Repeat at mobile and desktop widths with keyboard only. Verify tab order, focus-visible controls, accessible confirmation/dialog names, Escape/cancel behavior, no overlaps, and clear loading/empty/error/success states.

Automated Day 9 verification:

- Route tests: unknown URL renders friendly 404; a thrown descendant error renders the safe unexpected-error page; authenticated non-admin `/admin` renders/redirects to friendly 403; no page contains React Router's default `Unexpected Application Error`/developer detail.
- Data tests through Playwright interception: Request Detail API failure shows no local request/comments/activity; Search/Reports/Users/Settings failures show no fixture/demo rows; Home summary failure does not show zero as a real KPI.
- Accessibility smoke: run Playwright keyboard interactions for Admin nav, user table Open action, workflow selection, report Apply/Export controls, Settings forms, Audit filters/details, and dialog Escape/focus return. Assert important alerts/status regions and labelled controls by accessible role/name.
- Responsive smoke: capture or assert no document-level horizontal overflow at 320x720 and 1440x900 for Users, Roles, Workflows, Reports, Settings, Audit, and Request Detail. Internal table/preview scrollers are allowed.
- Audit smoke: mock paginated records plus users; assert readable event/actor/entity/timestamp, request link, expandable escaped payload, supported filters, pagination, empty state, and local `403` handling.
- Run `pnpm tsc --noEmit`, `pnpm lint`, `pnpm build`, `pnpm test:e2e`, and `git diff --check`. CI runs the same commands with Chromium only.

Manual Day 9 release smoke:

1. Build production assets and serve them through Vite preview or the deployment-equivalent server. Open an unknown URL, `/403`, and a deliberately failing route/component test case; confirm friendly safe pages and no React Router developer screen/stack trace.
2. With authenticated API requests forced to fail one family at a time, visit Home, Search, Request Detail, Reports, Users/Roles, and Settings. Confirm only loading/empty/error states appear and no local/demo/fake record or plausible zero metric replaces the failure.
3. Use keyboard only from login through Admin navigation and each named screen. Confirm visible focus, logical order, labelled controls/buttons, table headers, announcements, modal Escape/focus restore, and no color-only status.
4. Verify 320px, 768px, 1024px, and 1440px layouts for Users, Roles/Permissions, Workflow, Reports, Settings, Audit, and Request Detail. Confirm no page-level horizontal scrollbar, clipped action, overlap, or unreadable long value.
5. Sign in with `admin.audit.read`, open `/admin/audit`, and confirm `GET /api/admin/audit/` sends Authorization/X-Tenant plus only applied filters. Compare count/order/fields to the API response, page forward/back, and inspect parsed/malformed payload handling.
6. Verify actor names come from `/api/users/`, unknown actors remain readable without UUID labels, request links open `/requests/{request_id}`, and unsupported/unresolvable entities are not dead links.
7. Repeat Audit without `admin.audit.read` and with a forced API `403`; confirm Audit navigation/action visibility is permission-aware and the rest of Admin remains usable.
8. Run the Chromium smoke suite and inspect failures/traces. Then perform one real ACME full-stack path through login, Users, Workflows, Reports, Settings, Audit, and unauthorized access after the API/SQL deployment is ready.
9. Confirm production browser console contains no uncaught errors/warnings caused by the app, Network contains no local/demo endpoint or missing tenant/auth header, and the release checklist records any backend deployment dependency separately.

Automated Day 10 hardening verification before the browser rehearsal:

- Add focused client/component or Playwright contract tests proving workflow create uses POST, edit uses PATCH, successful writes select/refetch the returned workflow, and duplicate/conflict errors preserve form state.
- Add Request Create coverage proving flows/users display readable labels, flow selection loads statuses, Open status is selected by ID, priorities are lowercase, optional assignee is null/omitted, and success navigates with response `request_id` only.
- Add transition coverage proving Apply Action sends exactly `{transition_id,comment}`, never PATCHes request detail, never sends `comment_markdown`, creates no duplicate comment request, and refreshes detail/transitions/comments/activity.
- Retain Day 9 Chromium smoke for Admin navigation/permissions/404/mobile and extend it only for the three hardening defects. Do not automate destructive full-demo mutations against shared infrastructure.
- Run `pnpm tsc --noEmit`, `pnpm lint`, `pnpm build`, `pnpm test`, and `git diff --check`; run API/OpenAPI/Postman/SQL commands from the API verification notes before opening the disposable browser environment.

Day 10 browser evidence checklist:

- Record one line per script step with timestamp, route, API status/method/path, visible result, screenshot/evidence reference, and Pass/Fail/Blocked.
- Record separate negative results for non-admin direct routes, refresh/deep links, forced API failure/no-demo behavior, ID safety, raw-object safety, console cleanliness, and 320px sanity.
- Record baseline/restore values and disposable database name/backup/cleanup evidence. A step without observable API and UI evidence is not considered passed.
- Update `docs/sprint-3-web-verification.md`, `docs/sprint-3-known-issues.md`, API release-readiness evidence, and this Outcomes section only after the rehearsal. Do not convert a blocked item to Passed from unit/Postman evidence alone.

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
- Day 8 implementation starts only after the API settings contract is committed/available and the additive SQL upgrade is applied to the test environment.
- `/admin/settings` navigation and subsections are independently permission-aware for `admin.settings`, `tenant.settings.manage`, `featureflags.manage`, and `notifications.manage`; backend `403` remains authoritative.
- General Settings displays and edits only `web_base_url`, `default_timezone`, `default_page_size`, and `email_from` with exact API types, typed help, changed-only atomic PATCH, inline backend errors, and refreshed snapshots.
- Sensitive setting values are never displayed, logged, put in URLs, copied into form state, or submitted from a masked response; only `has_value` may produce a neutral presence label.
- Feature flags display exact case-sensitive keys, descriptions, and current state. Every enabled-to-disabled action is confirmed, but the UI never invents API usage evidence or claims Day 8 flags already enforce routes.
- Notification templates support the four exact event types, subject/body/active editing, the exact allowed-placeholder reference, and local fixed-sample preview rendered strictly as plain text.
- Template IDs/event types and setting/flag keys remain immutable. The Web exposes no create/delete/rename, HTML preview, executable syntax, factory reset, notification suppression, or demo fallback.
- Save/Cancel/Reset and dirty-navigation protection work per setting family/template; successful writes replace snapshots from real API responses and failures preserve edits.
- Day 8 calls preserve Authorization and `X-Tenant`, handle tenant changes and late `403/404`, and expose loading, empty, retryable error, saving, success, read-only, and responsive keyboard-accessible states.
- Root routing has a safe `errorElement`/boundary and catch-all; friendly 403, 404, and unexpected-error pages replace React Router's developer page in normal use.
- Request Detail contains no local demo records or fallback flag, and no authenticated page substitutes local/fake data or plausible KPI values after API failure.
- Shared errors, loading states, notices, badges, form errors, and pagination expose consistent accessible semantics without a broad design rewrite.
- Home/Search and Admin data tables have semantic headings/captions and keyboard-accessible row actions; errors/success/loading are announced and every status includes readable text.
- Dialogs have accessible names, intentional initial focus, Escape behavior, focus containment, and opener focus restoration.
- Users, Roles/Permissions, Workflow, Reports, Settings, Audit, and Request Detail work from 320px through desktop with no document-level overflow or overlapping controls.
- `/admin/audit` is visible only with `admin.audit.read`, calls only `GET /api/admin/audit/`, supports all contracted filters/pagination, shows readable actors/events/entities/timestamps, and renders escaped expandable payload details.
- Audit actor labels use tenant-user lookup data; unknown actors/entities remain readable and do not expose UUIDs as primary labels or create dead links.
- `@playwright/test` is the only new Day 9 test dependency. Chromium smoke covers login/Admin navigation, Users, Workflows, Reports, Settings, unauthorized behavior, and 404 with deterministic contract-shaped API mocks.
- CI retains typecheck/lint/build and adds the minimal Playwright smoke command; manual release verification separately covers the real deployed API/database.
- Day 9 introduces no large product feature, API mutation, new backend contract, design-system replacement, or local/demo fallback.
- Day 10 starts only on a disposable/restorable database after API/Web/OpenAPI/Postman/SQL preflight passes; normal `rt` is never mutated by the browser rehearsal.
- Web supports contract-exact workflow create/edit, readable Request Create selectors, and transition `{transition_id,comment}` without duplicate comment requests before the rehearsal begins.
- The 25-step browser script records route, API request/status, response evidence, visible UI result, and failure/no-go behavior for every step.
- Domain user creation demonstrates the API's atomic current-tenant membership result. No raw-ID standalone membership picker is added without a labelled eligible-user API contract.
- The created workflow's Open/In Progress/Closed statuses and transitions drive the created request through assign, grouped comment/files, In Progress, Closed, search, and notification evidence.
- Reversible setting/flag/template edits are restored; non-deletable demo configuration exists only in the discarded clone; normal `rt` is verified free of the unique demo suffix.
- Non-admin and direct-URL checks prove friendly denial and no protected data. Refresh/deep links preserve auth/tenant headers without loops or developer error pages.
- Browser Console/Network is clean; no local/demo fallback, `/requests/-`/undefined/null, empty UUID, raw object child, `[object Object]`, stack trace, or HTML execution is observed.
- All required routes pass a 320px mobile sanity check with keyboard-visible focus, no page-level overflow, and no inaccessible action.
- MailHog visibly proves created, assigned, comment-added, and closed messages with correct recipients/identifiers/links; Web success alone is not accepted as email evidence.
- Final go/no-go and evidence are written to verification/known-issues/ExecPlan outcomes; blocked steps cannot be promoted from unit or Postman results alone.

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
- [x] Day 8 Milestone 6 planned against the implemented API settings/flags/templates contract.
- [x] Milestone 6 implemented in Web against the inspected Day 8 API contract.
- [x] Day 8 TypeScript, ESLint, production build, and diff validation pass through the available npm package scripts.
- [x] Sprint 3 infrastructure SQL validation reported complete and the API release evidence records the expected SQL checks.
- [ ] Day 8/10 real authenticated Web browser verification remains unexecuted; deployed target state is not established by this checkout.
- [x] Day 9 Milestone 7 planned after whole-application, API-audit-contract, responsive/accessibility, fallback, and test-stack inspection.
- [x] Milestone 7 implemented with route/error hardening, no-demo production flows, shared accessibility/responsive polish, Admin Audit, Playwright smoke, CI, and release documentation.
- [x] Day 9 typecheck, ESLint, production build, Chromium smoke, and diff validation pass through available npm package scripts.
- [x] API final-hardening PR #22 merged and API release evidence records its disposable Postman/SQL/MailHog run and cleanup.
- [ ] Real authenticated ACME Web release smoke and deployed environment state remain unverified.
- [x] Day 10 Milestone 8 planned from current Web behavior, generated OpenAPI route contract, validated Postman collections, API verification/demo/readiness notes, and known issues.
- [x] Release-blocking Web hardening completed: workflow create/edit, incremental empty-workflow status creation, readable Request Create lookups, and exact transition comment payload.
- [x] Seven Chromium tests pass for existing Sprint 3 smoke plus workflow POST/PATCH/status, Request Create IDs/null/navigation, and single exact transition comment.
- [ ] Disposable 25-step browser rehearsal and cross-cutting negative/mobile/console checks passed with evidence.
- [ ] Web 25-step rehearsal restoration/cleanup evidence remains unavailable because that browser run was not executed. API disposable cleanup is complete and documented separately.

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
- 2026-08-21: The adjacent API worktree then contained the complete Day 8 contract before commit. Historical resolution: the settings and later final-hardening API work are now merged; deployment remains a separate evidence question.
- 2026-08-21: Settings GET returns an object with a `settings` array, while feature flags and notification templates return bounded arrays without pagination. Settings PATCH is an atomic array; flags and templates PATCH one immutable path identity at a time.
- 2026-08-21: Sensitive settings are not partially masked. The API returns `value=null`, `is_sensitive=true`, and `has_value`; therefore the Web must never use asterisks or a masked fragment as an editable value.
- 2026-08-21: `default_timezone` and `default_page_size` are tenant configuration exposed to clients but do not currently alter Django process-global timezone or pagination. Help text must not promise runtime behavior the API does not implement.
- 2026-08-21: Feature flag responses contain no usage or dependency indicator, and Day 8 does not gate existing endpoints on flag state. The requested disable-in-use safeguard must be conservative confirmation for every enabled flag, not a fabricated usage badge.
- 2026-08-21: An inactive notification template or disabled `notificationTemplates` flag selects the backend built-in fallback; it does not suppress the event or email. The Web needs to communicate this distinction clearly.
- 2026-08-21: The API template allowlist is exactly eight plain placeholders and rejects traversal, indexing, conversions, format specifiers, malformed braces, multiline subjects, and unknown fields. A local preview can be useful but must remain non-authoritative and plain text.
- 2026-08-21: React Router 7 exposes `useBlocker` in the existing data-router setup, so Day 8 can protect SPA navigation without adding a routing dependency; `beforeunload` separately covers refresh/tab close.
- 2026-08-21: The Web package still has no Vitest/React Testing Library dependencies or test script. Day 8 keeps parsing and normalization in explicit functions and runs typecheck/lint/build, while the focused test-harness work remains in Milestone 7.
- 2026-08-22: The router has neither `errorElement` nor a catch-all route. The existing `/403` is intentional, but 404/unexpected route failures can still expose React Router's default developer surface.
- 2026-08-22: Request Detail is the only authenticated page still carrying actual local demo records, behind `VITE_ENABLE_DEMO_DETAIL_FALLBACK`. Search, Reports, Admin directory, and Settings contain no equivalent record substitution.
- 2026-08-22: Home initializes KPI summary to zero, so an initial/failing API load can visually resemble a legitimate all-zero summary. Release polish needs nullable/unavailable KPI state rather than fabricated counts.
- 2026-08-22: Some request activity/comment normalizers synthesize IDs or current timestamps when API fields are absent. These are not static demo rows, but they can manufacture server facts and should be narrowed to successful local mutation state or filtered read records.
- 2026-08-22: The Admin Audit API is already sufficient for a Web UI: it is tenant-scoped, paginated, permissioned by `admin.audit.read`, returns parsed `payload_json` plus entity metadata, and validates type/actor/request/entity/date/page filters. No API change is required.
- 2026-08-22: Audit records expose `actor_id` but not actor name/email. The public tenant `/users/` lookup is the only permission-compatible source of readable actor labels; inactive/removed actors may remain unresolved.
- 2026-08-22: Playwright, Vitest, and Testing Library are absent from both `package.json` and `pnpm-lock.yaml`; Web CI currently runs only typecheck, ESLint, and build. A browser suite therefore requires a documented dependency and CI installation step.
- 2026-08-22: Admin Users/Reports/SLA use semantic tables, while Home/Search use grid-shaped button rows. Shared Error/Loading/Pagination/Notice behavior is also inconsistent, so focused primitives give more release value than page-by-page cosmetic edits.
- 2026-08-22: Request Detail is fixed to a desktop two-column grid at every viewport. Most Admin screens already have responsive `lg`/`xl` stacking and need verification/small overflow fixes rather than redesign.
- 2026-08-22: The first Playwright login failure was a smoke fixture origin mismatch: Vite served Web at `127.0.0.1:5173` while `.env` sent API calls to `localhost:8000`. Intercepting all fetch/XHR requests fixed the test harness without changing application behavior.
- 2026-08-22: Playwright strict accessible-name matching exposed ambiguous partial selectors (`Admin` within the user-menu label and `Settings` within `General settings`). Exact role/name selectors now make the smoke suite resilient and reinforce explicit accessible naming.
- 2026-08-22: The 320px browser smoke passes for Users, Roles, Workflows, Reports, Settings, Audit, and Request Detail with no document-level horizontal overflow.
- 2026-08-22: API `feat/api-admin-settings` is merged, but the expanded Audit payload/entity/filter contract remains on the unmerged API Sprint 3 polish worktree. Web Audit is implemented against that inspected contract and full integration remains a release gate.
- 2026-08-22: API Sprint 3 polish is now merged. The adjacent API final-hardening worktree contains secret-free Postman collections, a final demo script, SQL verification, and release-readiness evidence; API Day 10 reports 189 pytest tests and all guarded/mutating Postman assertions passing.
- 2026-08-22: `tests/test_postman_contract.py` parses generated `/api/schema` and proves every collection method/path exists in OpenAPI. This gives the Web demo an authoritative operation list even though the API repository does not commit a static schema file.
- 2026-08-22: Web Workflow Admin has no create/update workflow call or control, despite OpenAPI exposing POST/PATCH. Status/transition editors alone cannot execute the requested full browser demo.
- 2026-08-22: Request Create still exposes raw Flow/Requester/Assignee ID inputs. Existing lookup endpoints are sufficient to correct this without an API change.
- 2026-08-22: Web transition code sends `comment_markdown` and creates a second comment, while current `RequestTransitionSerializer` and Postman/OpenAPI use `comment`. The apparent UI success is a compatibility workaround, not contract compliance.
- 2026-08-22: Standalone membership POST is contractually available but needs an existing non-member `user_id`; the API has no labelled eligible-user lookup. The safe browser behavior is the atomic membership returned by domain-user creation.
- 2026-08-22: Workflow/status/transition/role records cannot be deleted through current public APIs. The API Day 10 team verified mutations on a disposable clone and removed it, establishing the required browser-demo environment pattern.
- 2026-08-22: MailHog evidence is external browser evidence at the local MailHog UI, not an RT Web endpoint. Created/assigned/comment-added/closed triggers occur during the request lifecycle and must be correlated by Human ID/request ID.
- 2026-08-22: Existing status validation evaluated only saved statuses and required Open plus Closed before allowing the first status, so a newly created empty workflow could not be configured through the UI. Day 10 now permits incremental creates while preserving duplicate blocking and lifecycle warnings; edits still cannot remove required lifecycle coverage.
- 2026-08-22: The live API health and schema routes returned 200, but the in-app browser had no authenticated session, the secret-free environment had empty credentials, and no disposable database target was verified. Mutating rehearsal stopped at `/login` by design.

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
- 2026-08-21: Use one `/admin/settings` destination with independently permissioned subsections rather than separate top-level navigation items. Show it when at least one Day 8 family is accessible and never call an inaccessible family's endpoint.
- 2026-08-21: Treat General Settings as read-only with `admin.settings` alone and writable only with both `admin.settings` and `tenant.settings.manage`. Specialized flag/template permissions do not imply General access.
- 2026-08-21: Edit only the four approved non-sensitive general keys and submit changed rows in one atomic PATCH. Reset means restore the latest server snapshot, not factory defaults.
- 2026-08-21: Preserve exact case-sensitive flag keys and immutable template event types. Feature disable uses confirmed, non-optimistic per-key PATCH because the API has no bulk or rollback operation.
- 2026-08-21: Preview notification templates locally with fixed sample strings and exact-token substitution, rendered through React text nodes. Backend validation is the source of truth; the preview will never use HTML, expression evaluation, or remote rendering.
- 2026-08-21: Never log configuration payloads or include values/template content in URL state. Dirty drafts live only in component state and are discarded on tenant change after confirmation.
- 2026-08-21: Keep each Settings family in its own component and request/error boundary. A late `403` or missing-table failure in General, Flags, or Templates remains local and does not replace the Admin shell or the other sections.
- 2026-08-21: Refresh each family from its GET endpoint after a successful PATCH rather than trusting local optimistic state or only the mutation response.
- 2026-08-22: Use both a router-level `errorElement` and a root React error boundary, plus an explicit catch-all 404. Keep API failures local so the root boundary remains a last-resort render safety net.
- 2026-08-22: Remove the Request Detail demo fallback entirely instead of adding another production guard. Restrict the unrelated Admin dev authorization override to `import.meta.env.DEV` if retained.
- 2026-08-22: Treat null/Unavailable as the honest release state for missing KPI/API data. Do not synthesize IDs, timestamps, counts, actors, or entity links for server-read records.
- 2026-08-22: Implement Admin Audit as a read-only Web surface against the existing contract. Resolve actor labels with tenant users and add only minimal URL selection support needed for valid entity links; omit links when a target cannot be resolved safely.
- 2026-08-22: Render audit payload through escaped React text and semantic disclosures. Prefer parsed `payload_json`; never interpret payload/template content as HTML.
- 2026-08-22: Add only `@playwright/test` for Day 9, Chromium-only. Use mocked API contracts for deterministic Web smoke in CI and keep real-stack release smoke manual/optional so the Web job does not require SQL Server or service containers.
- 2026-08-22: Extract shared components only where behavior is already duplicated across at least three screens. Day 9 is hardening, not a design-system rewrite.
- 2026-08-22: If release-polish plus Audit exceeds the preferred PR size, split the implementation into shared polish/Playwright and Admin Audit PRs while keeping both under Milestone 7.
- 2026-08-22: Treat workflow create/edit, readable Request Create lookups, and transition comment contract alignment as the only permitted Day 10 Web additions; each closes a demonstrated release-blocking gap in the approved script.
- 2026-08-22: Present membership creation as the documented atomic result of `POST /api/admin/users/`. Do not add a raw UUID field or speculative cross-tenant/nonmember lookup to satisfy demo wording.
- 2026-08-22: Use one newly created workflow with Open, In Progress, and Closed statuses plus two transitions to drive the later normal request lifecycle. This links Admin configuration to user-visible value and minimizes disposable data.
- 2026-08-22: Use the workflow transition endpoint for both progress and close in the Web demo because the UI is action/transition-driven. The direct `/close/` endpoint remains Postman/regression coverage, not a second browser control.
- 2026-08-22: Keep the custom request-created template active until the created request notification is confirmed, then restore baseline. Toggle a different reversible feature flag so notification evidence is not accidentally disabled.
- 2026-08-22: Require disposable clone/backup/unique suffix/cleanup evidence before any mutating browser action. Lack of cleanup capability is a no-go, not an accepted demo residue.
- 2026-08-22: A browser step passes only with both network-contract and visible-UI evidence. Unit, Playwright-mock, Postman, or SQL evidence may support but cannot substitute for the requested full-stack browser observation.

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

Day 8 outcome: `/admin/settings` now contains independently permissioned General Settings, Feature Flags, and Notification Templates sections backed by a typed shared-client module. General writes submit changed approved keys as one atomic batch; flags preserve exact case-sensitive keys and confirm enabled-to-disabled changes; template writes preserve immutable identity and preview exact allowed placeholders as plain text while leaving unknown placeholders unchanged and visibly invalid. Sensitive values never enter editable state, section-level `403` responses stay local, successful writes refetch server state, and dirty settings/templates block navigation. The API contract is merged and SQL validation is reported complete; authenticated deployed-browser verification remains unverified.

Day 8 verification outcome: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`, and `git diff --check` pass. `pnpm lint` and `pnpm build` were attempted as requested, but this non-interactive Windows runtime aborted during pnpm dependency preflight with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` before either script ran. The generated `.pnpm-store` was removed. No automated test command exists in the current Web package; focused component coverage remains part of Milestone 7.

Day 9 planning outcome: the whole Web application and completed Sprint 3 milestones were inspected for route failures, fallback data, accessibility semantics, responsive layout, shared UI drift, Audit contract coverage, and browser-test readiness. Milestone 7 now has implementation-ready route/error, no-demo, accessibility/responsive, Admin Audit, Playwright/CI, acceptance, and release-smoke steps. Only this ExecPlan changed; implementation remains unchecked.

Milestone 7 outcome: routing now has a safe descendant `errorElement`, explicit friendly 404/403 pages, and a root render boundary used only for unexpected failures. Request Detail's demo objects/flag are deleted, Home KPI failures are unavailable instead of zero, production Admin override is development-only, and API-read activity/comments no longer receive fabricated IDs/timestamps. Known API failures remain local page states rather than being hidden by the boundary.

Shared Error/Loading/Notice/Pagination/StateBadge behavior now provides alert/status/busy semantics, named pagination controls, readable non-color-only state, semantic Home/Search/Admin tables, improved dialog focus restoration, and responsive app/Admin/Request Detail layouts. A read-only `/admin/audit` page uses the shared tenant-aware client, exact supported filters/pagination, tenant-user actor labels, safe entity-area links, and escaped expandable payloads under `admin.audit.read`.

Day 9 verification outcome: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd test`, and `git diff --check` pass. Playwright 1.62.1 runs four Chromium tests covering Admin login/navigation, Users, Workflows, Reports, Settings, Audit, unauthorized Admin access, friendly 404, and 320px overflow including Request Detail. The exact pnpm commands were attempted but the desktop wrapper aborted before scripts with its known no-TTY dependency-purge guard. CI now installs Chromium and runs the same browser smoke with pnpm. API polish has since merged; real ACME/SQL/browser verification is now the Day 10 release gate documented here and in the Web verification/known-issues files.

Day 10 planning outcome: the final browser rehearsal is defined as a 25-step contract/UI/failure matrix plus non-admin, direct-link, refresh, console, no-demo, identifier, raw-object, mobile, restoration, and cleanup checks. Current generated OpenAPI/Postman/API release evidence is incorporated. Three Web release blockers are explicitly scoped for minimal correction, standalone membership wording is reconciled to the atomic API contract without inventing a picker, and no mutating demo may run outside a disposable clone. Implementation and full-stack browser evidence remain unchecked.

Milestone 8 hardening outcome: Web Workflow Admin now creates and edits workflows through exact POST/PATCH operations and can configure the first status on an empty workflow without weakening duplicate/edit lifecycle protection. Request Create loads real flows/users/statuses, displays readable labels, submits internal IDs/null and lowercase priority, and navigates only with response `request_id`. Request transitions now send exact `{transition_id,comment}` and no longer create a duplicate separate comment.

Day 10 verification outcome: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd test`, and `git diff --check` pass. Build transforms 139 modules; seven Chromium tests pass in 12.6 seconds. Live read-only API health/schema return 200. The exact pnpm commands were attempted but the desktop wrapper aborts before scripts with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`; equivalent npm scripts pass and CI remains pnpm-based. The real mutating browser demo is Blocked at `http://127.0.0.1:5173/login` because no credentials/disposable target are available; no mutation was attempted against normal `rt`. Exact blocked routes are recorded in the demo and known-issues documents. Recommended commit: `fix(web): complete Sprint 3 browser demo hardening`. No real secrets or credentials are committed.

Final Day 10 decision: **GO for the Web hardening commit/PR and automated CI; NO-GO for coordinated Sprint 3 release sign-off** until an authorized operator supplies local-only credentials for a verifiably disposable clone, completes all 25 browser steps plus negative/mobile/console checks, restores reversible values, removes the clone, and records evidence. This is an environment/evidence gate, not a hidden Web test failure.
