# App Shell and navigation (M4)

Normative baseline: `00-Request-Tracker-UI-UX-Design-Blueprint-v1.1.md`. M4 adds one authenticated presentation shell. Existing routes, guards, data controllers and mutations stay in their owner pages. User-requested IA replaces the historical AGENTS left-rail labels where they differ: no My Work, Team Work, standalone Statuses/Priorities/Permissions or placeholder destinations are enabled.

## Route ownership

`src/main.tsx` keeps the root outlet/error element and public `/login` and 404. A nested Protected layout renders `AppShell` with one `main#main-content` and Outlet. Its children are index `/`, `/search`, `/requests/new`, `/requests/:id`, `/profile/preferences`, `/403` and `/admin/*`. `/admin/*` remains wrapped by AdminProtected and still uses server permission context. Forbidden remains an authenticated child; unknown routes/root errors still render their friendly status views. No paths or API contracts changed.

Home remains `HomePage` via `App.tsx` re-export; SearchView was extracted from the former App with its forms, result table, URL q initialization and calls unchanged. There is no `activeView` local routing state. Browser Back/Forward, deep links and refresh follow pathname. Home's in-page duplicate New Request button was removed because the identical global action is now always visible; Refresh, queue tabs and quick filters remain intact.

AppShell owns presentation only: global brand/utility bar, compact Menu, sidebar, user disclosure, SkipLink and route focus. No dashboard/search/detail/admin data enters the shell. At `/admin/*`, AdminShellPage still chooses the existing section page and keeps the contextual Admin heading; its second full navigation sidebar and Back-to-Home global chrome were removed. `src/navigation/adminSections.ts` is the one static section map for route selection and visible Admin links. Status and transition editors remain inside Workflows; permissions remain inside Roles.

## Navigation and authorization

Text-first navigation groups Workspace (Home, Search), Requests (New Request), and Administration (Overview, Workflows, Users, Roles & Permissions, Reports, SLA Policies, Settings, Audit). NavLink's exact matching sets `aria-current="page"` and a 2px strong-border marker plus active surface, so color is not the only signal and the marker keeps contrast on both light and dark sidebars. `/requests/:id` has no invented navigation destination; global Search/New Request remain reachable.

AppShell reuses the existing `useAdminPermission(token, tenant)` hook for Admin visibility; it filters section links using the exact permission logic formerly in AdminShellPage. Reports/SLA/Settings/Audit visibility remains permission-aware. Overview/Workflows/Users/Roles remain visible for accounts admitted by the existing Admin access rule, while each area/page/API still enforces its own permissions. A hidden link never grants or denies access. Direct unauthorized `/admin` still redirects to friendly `/403`; permission lookup failure remains a local AdminProtected error with retry.

Request impact: Home and Search each had one shell-level permission-hook instance before and retain one now. Admin routes had guard + AdminShell + page instances; M4 replaces AdminShell's with AppShell's, preserving their count. A fresh direct Create, Detail, Profile or authenticated 403 now adds one shell-level permission lookup because Admin navigation is global; on React StrictMode dev this hook's mount effect can make two calls. In the mocked test, initial Home load issued 2, and client navigation to Create kept the count at 2. No caching or list-detail fan-out work was introduced.

## Responsive and utility behavior

At the existing `lg` breakpoint (1024px) a 224px semantic sidebar stays visible alongside data content. This gives wider Admin content than the previous stacked 240px Admin rail. At 768px and 320px the sidebar is hidden; the header Menu opens a native M3 Dialog with the same NavLink groups. At 320px the utility header uses two rows: Menu/brand/initials avatar, then Search/New Request. Menu focus remains in the modal content and Escape restores the trigger. Navigation closes the panel; no icon rail, custom popover or animation was added. Widths 1440/1024/768/320 were exercised in Playwright with no page-level horizontal overflow for the tested routes.

The compact utility bar exposes Search and New Request as real links. User actions use a button with initials avatar and truncated name from 640px upward (initials only on smaller screens), aria-expanded/aria-controls and a normal link/button disclosure, not `role=menu`; Tab reaches Preferences, Escape restores trigger focus, pointer outside dismisses, and Sign out clears auth then returns to `/login`. Initials are decorative; the accessible button name includes the full user name at every width. The shell reads the existing JWT display name and tenant; it adds no account endpoints. User controls and navigation inherit semantic Light/Dark/System token values.

Skip to main content is first in the shell and becomes visible on focus. It targets `main#main-content`, the sole main landmark for authenticated pages. Page-root nested main tags were changed to div in Create/Detail/Profile/Admin; page headings, Back commands and content remain. On pathname changes after initial mount, AppShell closes transient navigation and focuses the first available page h1/h2 after two frames; when async content has no heading yet, it focuses the named main region. Query changes do not steal focus. A direct initial load does not forcibly move focus from browser defaults.

## Legacy page presentation

The shell uses semantic tokens in both themes. Current operational/Admin pages still contain light-specific text, surfaces, cards and native controls. `legacy-page` reuses the pre-M4 neutral-50 canvas and local light color-scheme only inside those unmigrated page roots. This makes text and form controls readable beside a dark shell without a broad page migration; it is not another root theme selector. M5+ consumer work removes this compatibility class incrementally after individual pages use semantic roles. The Admin contextual heading remains, and Admin content was not redesigned.

## Evidence and limitations

Permanent tests in `tests/e2e/app-shell.spec.ts` exercise direct routes, active link/history, one main landmark, skip link, route focus, user disclosure, global actions, logout, Admin guard, 403/404, dirty Settings blocker, four widths, Light/Dark and System's two effective modes. The seven preexisting Sprint 3 smoke tests were updated only to use the new navigation links and compact dialog, preserving their behavior assertions. Dirty Settings uses its existing React Router useBlocker: cancel stays and Leave page proceeds.

Visual evidence lives in ignored `.agent/tmp/m4-shell/`: Home 1440 Light, Admin 1440 Light, Detail 1024 Light, Search 1440 Dark, Search/compact navigation 768 Dark, Search/compact navigation and Create 320 Light. Screenshots were visually inspected. Tests pin locale/timezone and API fixtures, and assert computed shell colors, route state and overflow. These are deterministic evidence captures, not committed golden snapshots: the local Windows Chromium font rasterization differs from CI's Ubuntu image, legacy page content is still in staged migration, and no cross-platform image tolerance/approved baseline exists. M4 does not claim visual regression automation or full WCAG certification. No product-page dark baseline is inferred from the mixed-theme state.

Existing error boundaries/403/404 and the Settings unsaved blocker remain; other page-specific failures and loading are unchanged. The full authenticated real-API demo/deployment state remains separate from mocked browser tests.

## Anti-patterns and next scope

Do not add ARIA menu roles to the user disclosure without implementing that keyboard model. Do not infer auth from hidden nav, duplicate Shell headers inside pages, invent queue/Admin routes, introduce decorative cards/gradients, or migrate all page content through one global CSS override. Existing `.legacy-page` is a temporary compatibility boundary.

M5 should redesign only Home/dashboard and its current My Tasks, Other Tasks, My Requests and Recently Updated queues using the shell and M3 primitives. Preserve KPI meanings, filters, request_id navigation, loading/error/empty states and server-derived labels. Define measurable UI/performance needs before any separate list-contract or fan-out change. Search results, Request Detail, Create and Admin content remain later milestones.
