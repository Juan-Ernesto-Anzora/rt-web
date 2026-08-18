# Sprint 3 Web ExecPlan - Admin and Configuration UI

## Purpose

Sprint 3 adds a permission-aware administration area for Request Tracker configuration. After this sprint, authorized users can open an Admin section, navigate workflow/user/role configuration screens, and see clear access-denied, loading, empty, and error states instead of placeholder alerts or broken routes. Day 5-6 delivers tenant-scoped user, membership, role, and permission administration without implying that a Request Tracker domain user automatically receives login credentials.

## Repository orientation

This plan applies to `rt-web`. Relevant files and expected Sprint 3 edit targets:

- `src/main.tsx`: React Router setup and protected route wrappers.
- `src/pages/App.tsx`: global app shell, top bar, left rail, Settings/Admin entry point.
- `src/auth/useAuth.tsx`: current auth context with token and tenant.
- `src/auth/userProfile.ts`: JWT claim decoding helper that can be extended or reused for permission claims.
- `src/lib/api.ts`: shared Axios client that injects `Authorization` and `X-Tenant`.
- `src/api/requestDetail.ts`: existing tenant-user lookup normalization for array or paginated `results` responses; Admin directory calls must use dedicated `/api/admin/*` endpoints instead of the request-assignment lookup.
- `src/api/adminWorkflows.ts`: established admin API client and error-normalization pattern to follow for the new directory client.
- `src/auth/adminPermissions.ts`: tenant-scoped permission context loaded from `GET /api/admin/me/permissions/`; Day 5-6 must use its permission list for `admin.users`, `admin.roles`, and `admin.permissions` controls.
- `src/pages/admin/AdminShellPage.tsx`: existing route-aware Admin shell with Users and Roles & Permissions placeholders.
- `src/pages/admin/WorkflowAdminPage.tsx`: existing compact Admin loading, empty, save, and error-state patterns.
- `design/design-tokens.json`, `tailwind.config.ts`, and `src/index.css`: design token mappings and shared compact UI classes.
- `src/pages/`: new admin shell, admin landing, and forbidden page files should live here unless a more specific `src/pages/admin/` folder is introduced.
- `src/components/common/`: existing `EmptyState`, `ErrorState`, and `LoadingRows` components for consistent loading/error UI.
- `docs/plans/sprint-3/web-admin-configuration-execplan.md`: active ExecPlan for this sprint.

Current routes in `src/main.tsx` include `/login`, `/search`, `/requests/new`, `/requests/:id`, `/profile/preferences`, `/403`, `/admin/*`, and `/`. `AdminShellPage` resolves `/admin`, `/admin/workflows`, `/admin/users`, and `/admin/roles` inside the protected admin route.

## Current behavior

The admin shell, API-backed route guard, 403 page, and Admin -> Workflows are implemented. Admin -> Users and Admin -> Roles & Permissions still render placeholder empty states. The API-backed admin guard exposes the active tenant's role and permission codes, but no feature-level helper currently decides which user, role, or permission controls to render.

The adjacent API repository implements the Day 5-6 directory contract and generates it at `GET /api/schema`. The API server was not running during this planning pass and the local Poetry launcher could not generate a temporary schema, so the checked-in DRF routes, `extend_schema` declarations, serializers, services, tests, and API ExecPlan were inspected as the actual contract. Confirmed endpoints are:

- `GET/POST /api/admin/users/` and `GET/PATCH /api/admin/users/{user_id}/` (`admin.users`).
- `GET/POST /api/admin/memberships/` and `GET/PATCH/DELETE /api/admin/memberships/{membership_id}/` (`admin.users`).
- `GET/POST /api/admin/roles/` and `GET/PATCH /api/admin/roles/{role_id}/` (`admin.roles`).
- `POST /api/admin/memberships/{membership_id}/roles/` and `DELETE /api/admin/memberships/{membership_id}/roles/{role_id}/` (`admin.roles`).
- `GET /api/admin/permissions/`, `POST /api/admin/roles/{role_id}/permissions/`, and `DELETE /api/admin/roles/{role_id}/permissions/{permission_code}/` (`admin.permissions`).

All endpoints additionally require JWT, `X-Tenant`, and baseline `admin.read`. Lists use `page`, `page_size`, and `sort` and return paginated `results`.

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

Contract gate before implementation:

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

### Milestone 5: UX hardening and tests

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

## Progress

- [x] Day 1-2 ExecPlan expanded for admin shell and route guards.
- [x] Milestone 1 implemented.
- [x] Milestone 2 implemented.
- [x] Day 5-6 Milestones 3-4 planned against the actual API contract.
- [x] Milestone 3 implemented using atomic RT-user/current-tenant membership creation and tenant-scoped membership management.
- [x] Milestone 4 implemented with role detail, membership-role assignment, and permission matrix controls.
- [ ] Milestone 5 implemented.

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

## Outcomes & Retrospective

Milestone 1 outcome: `/admin/*` now uses an `AdminProtected` route guard that requires authentication and decoded admin permission. Non-admin authenticated users are sent to `/403`, while unauthenticated users are sent to `/login`. The global shell shows an `Admin` left-rail entry only when the decoded profile can access admin. The admin shell includes Overview, Workflows, Users, and Roles & Permissions navigation with compact placeholder states for future milestones. A dedicated 403 page gives users a clear denied-access state and a path back to Home.

Milestone 2 outcome: Admin -> Workflows now loads tenant workflows, shows selected workflow detail, renders existing statuses and transitions, and supports create/update actions for statuses and transitions through the admin API. The status editor validates duplicate names and required open/closed lifecycle coverage. The transition editor validates required endpoints, prevents self-transitions, and blocks duplicate From -> To pairs. Save actions show clear success/error feedback and refresh workflow detail after success.

Milestone 2 verification fix outcome: Admin route access now verifies the active tenant through `/api/admin/me/permissions/` before rendering or denying `/admin/*`. This fixes the ACME admin case where API permissions were valid but the web redirected to `/403` because admin rights were not present as recognized JWT claims. The App left rail also uses the same API-backed permission state to decide whether to show Admin.

Day 5-6 planning outcome: the user, membership, role, and permission milestones were mapped to the API's public fields, endpoint-specific permissions, pagination, conflict shapes, canonical roles, and final-admin/default-tenant safeguards. Employee-code search and labelled discovery of eligible non-member domain users remain explicit API/OpenAPI contract gates rather than client-side workarounds.

Milestones 3-4 outcome: Admin -> Users now provides API-backed pagination, email/display-name search, active filtering, atomic RT-user/current-tenant membership creation, user detail/edit, default-tenant management, membership removal, and membership-role assignment. The UI consistently distinguishes an RT domain user from a login account and displays the active tenant code rather than raw tenant IDs. Final active RT Admin deactivation, membership removal, and role removal are blocked with an explicit warning.

Admin -> Roles & Permissions now provides tenant role list/create/detail/edit, protects canonical role names, and renders the API permission catalogue as a responsive matrix. Permission and role assignment writes submit internal IDs/codes while showing readable labels, require confirmation for removals, and refresh affected data after success. No local/demo fallback is used. Typecheck, ESLint, Vite production build, and `git diff --check` pass through the available npm toolchain; the requested pnpm invocation is blocked by its non-interactive modules-purge guard.
