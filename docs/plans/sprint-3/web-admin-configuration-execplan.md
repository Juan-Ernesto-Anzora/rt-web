# Sprint 3 Web ExecPlan - Admin and Configuration UI

## Purpose

Sprint 3 adds a permission-aware administration area for Request Tracker configuration. After this sprint, authorized users can open an Admin section, navigate workflow/user/role configuration screens, and see clear access-denied, loading, empty, and error states instead of placeholder alerts or broken routes. Day 1-2 specifically delivers the admin shell, admin navigation, route guards, and 403 behavior that later admin feature screens can build on.

## Repository orientation

This plan applies to `rt-web`. Relevant files and expected Day 1-2 edit targets:

- `src/main.tsx`: React Router setup and protected route wrappers.
- `src/pages/App.tsx`: global app shell, top bar, left rail, Settings/Admin entry point.
- `src/auth/useAuth.tsx`: current auth context with token and tenant.
- `src/auth/userProfile.ts`: JWT claim decoding helper that can be extended or reused for permission claims.
- `src/lib/api.ts`: shared Axios client that injects `Authorization` and `X-Tenant`.
- `src/pages/`: new admin shell, admin landing, and forbidden page files should live here unless a more specific `src/pages/admin/` folder is introduced.
- `src/components/common/`: existing `EmptyState`, `ErrorState`, and `LoadingRows` components for consistent loading/error UI.
- `docs/plans/sprint-3/web-admin-configuration-execplan.md`: active ExecPlan for this sprint.

Current routes in `src/main.tsx` are `/login`, `/search`, `/requests/new`, `/requests/:id`, `/profile/preferences`, and `/`. There is no `/admin` route yet.

## Current behavior

The web app has authenticated user routes and a global shell, but there is no real admin area. The left rail contains `Settings`, but it is not wired to a route. The user menu has non-wired items such as Saved Views and Notifications. Auth state currently stores JWT and tenant; it does not expose an explicit permission model. Unauthorized or permission-denied admin navigation has no dedicated 403 page. There are no admin loading, empty, or error states.

## Desired behavior

Day 1-2 should make admin navigation real but still modest:

- Authenticated users can navigate to `/admin`.
- Admin routes are protected first by authentication, then by admin/permission claims.
- Users without admin permission see a clear 403 page, not a blank screen or redirect loop.
- The app has a compact admin shell with navigation for future Sprint 3 screens: Overview, Workflows, Users, Roles/Permissions.
- Admin navigation is permission-aware: users without admin permission should not see an active admin entry in the normal shell, or should be routed to 403 if they enter the URL manually.
- Loading, empty, and error states are explicit for any permission/profile load path used by the guard.
- Admin shell follows existing design tokens, compact density, focus-visible outlines, and left-aligned operational UI.
- The implementation must not rely on client-only flags as the source of backend authorization. Client permissions only guide navigation and presentation; API calls must still rely on backend enforcement.

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

Future milestone. Add tenant user list and membership management after API contracts are confirmed.

### Milestone 4: Role/permission matrix

Future milestone. Add role and permission matrix UI after backend role/permission endpoints are confirmed.

### Milestone 5: UX hardening and tests

Future milestone. Verify admin flows across happy paths, 403 paths, keyboard navigation, loading/error states, and API failure states.

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

## Progress

- [x] Day 1-2 ExecPlan expanded for admin shell and route guards.
- [x] Milestone 1 implemented.
- [x] Milestone 2 implemented.
- [ ] Milestone 3 implemented.
- [ ] Milestone 4 implemented.
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

## Outcomes & Retrospective

Milestone 1 outcome: `/admin/*` now uses an `AdminProtected` route guard that requires authentication and decoded admin permission. Non-admin authenticated users are sent to `/403`, while unauthenticated users are sent to `/login`. The global shell shows an `Admin` left-rail entry only when the decoded profile can access admin. The admin shell includes Overview, Workflows, Users, and Roles & Permissions navigation with compact placeholder states for future milestones. A dedicated 403 page gives users a clear denied-access state and a path back to Home.

Milestone 2 outcome: Admin -> Workflows now loads tenant workflows, shows selected workflow detail, renders existing statuses and transitions, and supports create/update actions for statuses and transitions through the admin API. The status editor validates duplicate names and required open/closed lifecycle coverage. The transition editor validates required endpoints, prevents self-transitions, and blocks duplicate From -> To pairs. Save actions show clear success/error feedback and refresh workflow detail after success.

Milestone 2 verification fix outcome: Admin route access now verifies the active tenant through `/api/admin/me/permissions/` before rendering or denying `/admin/*`. This fixes the ACME admin case where API permissions were valid but the web redirected to `/403` because admin rights were not present as recognized JWT claims. The App left rail also uses the same API-backed permission state to decide whether to show Admin.
