# Current Request Tracker UI inventory

Audit date: 2026-09-18. Source baseline: `7cb6cb56ccb31a455babc916e4ac5b0a3d23645f`, branch `docs/codex-astra-adoption`. Static source audit; no deployed-state or WCAG certification is implied. The user-provided `00-Request-Tracker-UI-UX-Design-Blueprint-v1.md` is normative and was untracked at audit start. It is preserved unchanged. No nested AGENTS override was found outside dependencies/Git metadata.

## Evidence and files inspected

- Instructions: `AGENTS.md`, `.agent/PLANS.md`, `.agent/code_review.md`.
- Design: the complete Blueprint, `design/design-tokens.json`, `tailwind.config.ts`, `src/index.css`, `index.html`.
- Baseline: `docs/sprint-3-web-verification.md`, `docs/sprint-3-known-issues.md`. Their recorded results are historical; this audit does not rerun the authenticated disposable demo or establish deployments.
- Routes/shell: `src/main.tsx`, `src/pages/App.tsx`, `src/pages/admin/AdminShellPage.tsx`.
- Operational pages: `HomePage.tsx`, `RequestCreatePage.tsx`, `RequestDetailPage.tsx`, `ProfilePreferencesPage.tsx`, `Login.tsx`; route error/forbidden/not-found components under `src/pages/`.
- Admin source: `WorkflowAdminPage.tsx`, `AdminUsersPage.tsx`, `AdminRolesPage.tsx`, `AdminReportsPage.tsx`, `AdminSlaPage.tsx`, `AdminSettingsPage.tsx`, `AdminAuditPage.tsx`, and the three `settings/*Panel.tsx` files under `src/pages/admin/` (targeted control/loader/state inspection).
- Shared UI: every file under `src/components/common/`, `src/components/requests/`, `src/components/dashboard/`, and `src/components/admin/` (implementation or call-site inspection).
- Data: `src/lib/api.ts`, legacy `src/api.ts`, all modules under `src/api/`, `src/features/requestSearch.ts`, `src/features/requestActivity.ts`; `src/auth/useAuth.tsx`, `adminPermissions.ts`, `userProfile.ts`, `permissions.ts` (loader/use-site inspection).
- Tooling: `package.json`, `playwright.config.ts`, `tests/e2e/sprint3-admin-smoke.spec.ts`, `eslint.config.js`, `.github/workflows/ci-web.yml`.

## Architecture and complete route tree

React 18 + TypeScript, Vite 5, React Router 7, Tailwind 3, Axios. `AuthProvider` wraps `AppErrorBoundary` and the browser router. Root `Outlet` has `RouteErrorPage` as `errorElement`. No persistent shared layout route wraps every authenticated page. Business data lives in page effects and API/feature modules; there is no installed query-cache library. All imports are eager.

| Route | Renderer / guard | Current behavior -> Blueprint destination | Classification and evidence |
| --- | --- | --- | --- |
| `/login` | Login; public | Tenant code, username, password -> Login, Blueprint 20 | REFINE later: working labelled form; no domain selector or themed shell |
| `/` (index) | Protected -> App -> HomePage | Summary, four queue tabs, filters -> Dashboard / My Work / Team Work, sections 15-16 | REFINE: retain actual queues, request IDs and metrics |
| `/search` | Protected -> App(initialView=search) -> local SearchView | Unified keyword search -> Unified Search, section 17 | REFINE: already unified; extract page and preserve results/actions |
| `/requests/new` | Protected -> RequestCreatePage | Validated creation -> Create Request, section 19 | REFINE: preserve ID/null payload, status lookup and success navigation |
| `/requests/:id` | Protected -> RequestDetailPage | Details/comments/attachments/activity/assignment/transitions -> Detail workspace, section 18 | REFINE: working lifecycle; fragmented sections and state duplication |
| `/profile/preferences` | Protected -> ProfilePreferencesPage | JWT profile + local preferences -> Profile/theme utilities | REFINE: storage exists, theme/density consumers do not |
| `/403` | Protected -> ForbiddenPage | Friendly denial -> PermissionState | KEEP behavior; refine semantic tokens |
| `/admin/*` | AdminProtected -> AdminShellPage | Section selection by exact pathname, not nested Router child routes | REFINE shell while preserving guard |
| `/admin` | overview | Stale setup-pending copy -> Admin overview | REFINE: implemented child pages contradict pending copy |
| `/admin/workflows` | WorkflowAdminPage | Local selected workflow, status/transition editors -> Workflow administration | REFINE; selection is not a detail URL |
| `/admin/users` | AdminUsersPage | List, inline detail, create/confirmation dialogs, membership roles -> Users/memberships | REFINE; preserve final-admin safeguards |
| `/admin/roles` | AdminRolesPage | Role list/detail + permission matrix -> Roles/Permissions | REFINE; retain exact permission codes |
| `/admin/reports` | AdminReportsPage | Filtered summary/breakdowns/CSV -> Reports | REFINE; server values only |
| `/admin/sla` | AdminSlaPage | Paginated policy list/create/edit/deactivate -> SLA administration | REFINE; preserve minute/priority validation |
| `/admin/settings` | AdminSettingsPage | General/flags/templates -> Configuration | REFINE; preserve dirty guard and masked-value rules |
| `/admin/audit` | AdminAuditPage | Filtered paginated audit/payload disclosure -> Audit | REFINE; preserve entity links and safe text |
| unmatched `/admin/...` | Navigate(`/admin`) | Redirect, including unsupported entity URLs | KEEP pending explicit route migration decision |
| global `*` | NotFoundPage; public | Friendly 404 -> shared error surface | KEEP |
| thrown route/render error | RouteErrorPage / AppErrorBoundary | Friendly failure/reload -> shell error boundary | KEEP; do not conceal page API defects |

Protected checks token presence. AdminProtected loads server tenant permissions and distinguishes checking/error/denial. Deep links to Create, Detail, Profile and Admin render separate headers; global search/create/user actions are not universal. `App` SideNav changes local `activeView`, so selecting Search can leave pathname `/`; Other Tasks/My Requests rail buttons have no target action. Their working equivalents are Home tabs. Home tab/filter selection resets on remount; page is fixed at 1 with 10 rows. Search initializes only `q` from URL; submit/clear/facets/pagination do not synchronize the URL. Reports and Audit have URL filter serialization. Most Admin entity selections remain local state.

## API map by route

Paths below are exact client-relative strings; prepend the configured `VITE_API_BASE` (normally `/api`). Trailing-slash differences are recorded, not silently normalized. Shared `src/lib/api.ts` adds Authorization and X-Tenant; 401 redirects to login. Presigned object-store PUT uses separate Axios with upload-provided headers, intentionally not the application bearer token. No API contract was changed or live endpoint exercised.

| Surface | Reads | Writes / user-triggered calls |
| --- | --- | --- |
| Login | none | POST `/auth/jwt/create` with tenant header |
| Home | GET `/admin/me/permissions/`, `/dashboard/summary/`, `/requests/` with page/page_size/sort and queue/quick-filter params; per-row `/requests/{id}/` | Refresh repeats summary/list/enrichment; search navigates |
| Search | Permission context; GET `/search/requests` with q/status/assignee/flow/tag/updated bounds/page/page_size/sort; per-result `/requests/{id}/` | No write; requires nonempty keyword |
| Create | GET `/flows/` page 1 size 100, `/users/`, selected `/flows/{id}/statuses/` | POST `/requests/`; reads public `request_id` for navigation |
| Detail | GET `/requests/{id}/`, then comments, attachments, activity subresources; `/users/`; `/requests/{id}/available-transitions/` | PATCH detail `{assignee_id}`; POST transition `{transition_id,comment}`; POST comments `{body}`; POST `/attachments/init`, N presigned PUTs, POST `/attachments/finalize` with group/comment/files; refresh bundle |
| Profile | JWT parsing/localStorage `rt.profile.preferences`; no profile API | Local preference write only; no server notification preference change |
| Admin overview | GET `/admin/me/permissions/` | none |
| Workflows | Permission guard/shell; GET `/admin/workflows/`, `/admin/workflows/{id}/` | POST collection; PATCH detail; POST/PATCH nested `statuses/` and `transitions/` with IDs; refetch selected workflow |
| Users | Permission guard/shell/page; GET `/admin/users/` with search/is_active/pagination; `/admin/users/{id}/`; `/admin/memberships/` for selected user and all tenant pages; optionally all `/admin/roles/` pages | POST users (atomic user+membership); PATCH user; PATCH membership default; DELETE membership; POST membership `roles/` `{role_id}`; DELETE `roles/{role_id}/` |
| Roles | Permissions plus `/admin/roles/`, `/admin/roles/{id}/`, all `/admin/permissions/` pages when permitted | POST/PATCH role; POST role `permissions/` `{permission_code}`; DELETE `permissions/{permission_code}/` |
| Reports | Permissions, `/flows/`, `/users/`, flow statuses, `/reports/summary/` with current filters | GET `/reports/requests/export/` Blob with current filters; filename parsing and URL revoke |
| SLA | Permissions, GET `/admin/sla-policies/` with filters/page | POST collection; PATCH `/{id}/` including active state |
| Settings | Permissions; GET `/admin/settings/`, `/admin/feature-flags/`, `/admin/notification-templates/`, selected template `/{id}/`, gated per panel | PATCH settings `{settings}`; PATCH flag `/{key}/` `{enabled}`; PATCH template `/{id}/`; server refetch |
| Audit | Permissions; `/users/` actor labels; `/admin/audit/` with type, actor_id, request_id, entity_id, created_from/to, page/page_size | none |
| 403/404/error | no page data call (guards can still run) | navigation/reload only |

### Request counts and failure risks

- `src/api/dashboard.ts:enrichRequestsWithDetail` unconditionally GETs every row with a public ID and awaits all before rendering. Summary + list + N detail = 2+N data calls; default N=10 gives 12, plus permission context. Detail labels already present do not skip enrichment. A failed enrichment quietly retains the list row.
- `src/features/requestSearch.ts:enrichSearchResultsWithDetail` repeats this pattern: 1+N calls, normally up to 26 at page_size=25, plus permission context. This is confirmed fan-out, not a measured latency claim. No bounded concurrency or cache.
- `getRequestDetailBundle` performs detail then three parallel subresources. The page separately loads users and, after detail is stored, transitions: approximately six initial requests. Subresource failures are converted to empty arrays via allSettled; UI cannot distinguish failure from no comments/attachments/activity. Comments/activity fetch 25, attachments 50, with no exposed continuation UI. Detail/endpoint attachment arrays are combined (view deduplication must be preserved).
- Each assignment/upload/transition invalidates the whole detail bundle. Transition effect depends on both loadAttempt and detail, so a refresh with old detail may trigger an extra transition request before the new detail arrives. Instrument before optimizing.
- `useAdminPermission` has per-instance state, no shared cache. Guard, shell, and most Admin pages mount separate consumers; permission requests can repeat. React StrictMode also replays mount effects in development: distinguish this from production counts.
- User selection loads detail, selected memberships, every tenant membership page and optionally every role page. All-membership data supports final-admin warnings; never remove those checks as a performance shortcut. Roles/permissions also collect all pages. Reports loads users/flows on mount even before canRead resolves.
- Preserve current loaders for the foundation. Enriched list contracts, permissions caching and detail partial-error handling require separately bounded behavior/performance work with request counts and negative tests.

## Component disposition and target mapping

KEEP means retain working behavior; REFINE means reuse implementation with documented migration; REPLACE means substitute a deficient implementation while preserving its capabilities; REMOVE_AFTER_MIGRATION requires zero consumers and parity proof; UNKNOWN means insufficient evidence, not permission to delete.

| Current component / pattern | Classification | Blueprint target and source evidence |
| --- | --- | --- |
| AuthProvider, Protected, AdminProtected, shared API | KEEP | Guards stay authoritative; shell reorganization must retain headers/401/403 behavior |
| AppErrorBoundary, RouteErrorPage, NotFoundPage, ForbiddenPage, SystemStatusPage | KEEP | Existing friendly failures; theme later through shared tokens |
| App-local TopBar/SideNav | REFINE | App Shell/Header/Navigation (5,13); working actions currently limited to Home/Search |
| App-local UserMenu | REPLACE | DropdownMenu (13); role=menu lacks arrow-key/initial-focus model and has inert destinations |
| AdminShellPage | REFINE | Unified App Shell with Admin grouping; retain visible sections and server guard |
| RequestTable + local SearchResultsTable | REFINE | RequestRow/RequestId/QueueToolbar (13-14); semantic tables and public-ID Open actions exist, columns/formatters are duplicated |
| StatusBadge | KEEP | StatusBadge: visible status text + category mapping already shared |
| PriorityChip | REFINE | PriorityIndicator: shared text but hard-coded danger tone and repeated 'Priority:' in cells |
| StateBadge | REFINE | Badge: functional tone mapping needs semantic color aliases |
| EmptyState, ErrorState, LoadingRows, InlineNotice | REFINE | Shared state/Skeleton/Toast foundation; existing alert/status/retry behavior retained |
| PaginationControls | KEEP | Pagination: labelled navigation, disabled bounds and live count; retheme without changing paging |
| KpiCard | REFINE | MetricSummary: null renders unavailable, but decorative card, non-actionable metric and silent loading placeholder |
| AdminDialog / ConfirmDialog | REFINE | Dialog: native showModal, title/description, Escape, opener restoration exist; shared control styling and busy-close policy need tests |
| Create TextInput / FieldError | REFINE | Input + Field: existing error IDs usable; move out of page, normalize required/error semantics |
| Raw native input/select/textarea/checkbox/radio/date controls | REFINE | Shared primitives; preserve native keyboard behavior and existing validation; no library replacement justified |
| DetailField, ProfileField | REFINE | PropertyField/UserIdentity/FlowLabel: duplicated label/value layouts |
| CommentsSection, ActivitySection | REFINE | ActivityItem + timeline (18); existing comment/system merge and attachments must remain |
| UploadSection, AttachmentsSection | REFINE | CommentComposer/AttachmentItem: grouped multi-file behavior retained; unify messages and geometry |
| TransitionActions, AssignmentControl | REFINE | Detail property/action workflow: preserve server transitions, required comment, ID/null and refresh semantics |
| WorkflowList/DetailsEditor/StatusEditor/TransitionEditor/CreateWorkflowDialog | REFINE | Admin master/detail forms: validation/state logic remains; primitive styles repeated |
| UserDetail/CreateUserDialog; RoleDetail/CreateRoleDialog | REFINE | Admin detail/form/matrix: domain-user distinction and final-admin warnings retained |
| SlaPolicyDialog/MinuteField/durationHint | REFINE | Shared Field/Dialog, retain normalized priority/minutes and field errors |
| Reports UserSelect/DateRange/Breakdown/inputClass | REFINE | FilterBar/UserIdentity/Field/table; preserve real report values and CSV lifecycle |
| Audit PayloadDetails/entityLink | KEEP | Readable native disclosure + existing-route links; preserve safe text rendering |
| GeneralSettingsPanel/FeatureFlagsPanel/NotificationTemplatesPanel/Preview | REFINE | Config forms: retain permission locality, sensitive handling, unknown-placeholder validation, text-only preview |
| Page-local SectionNotice/SectionPermission/form classes | REMOVE_AFTER_MIGRATION | Replace consumers with InlineNotice/PermissionState/Field before deletion; same states repeated across admin pages |
| `.btn`, `.btn-primary`, `.card` in index.css | REMOVE_AFTER_MIGRATION | Semantic primitives and unframed layout sections; 14/20px radii and permanent shadows conflict with Blueprint 9 |
| Profile PreferenceOption | REFINE | Native radio group retained; theme provider later consumes existing storage schema |
| legacy `src/api.ts` | UNKNOWN | No current source import found; not UI scope, confirm external consumers before any separate removal |
| Existing placeholder menu entries | UNKNOWN | Keyboard Shortcuts/Saved Views/Notifications/Tenant switch lack destination behavior; product decision, no silent deletion |
| IconButton, Tooltip, Popover, Drawer, shared Tabs/Avatar/Separator/Toast | UNKNOWN (absent) | No established implementation to migrate; design shared contracts from Blueprint 13 before adding |

## Design-system evidence

- No Radix, shadcn, Base UI, Headless UI, icon, chart, or animation package in package.json. Native HTML controls/dialog are the established baseline. No installed icon library; do not assume Lucide exists or replace working primitives. Blueprint requires no named library.
- Token JSON has only `brand.colors`: primary 50/500/600/700; accent 500/600; info/warning/danger 500; neutral 50/100/200/300/600/700/800/900. Tailwind duplicates these literals rather than importing JSON. Colors resolve in the UI, but JSON is not a build-time source. `--radius:12px` has no consumer found.
- No semantic surface/text/border/focus/status pairs, theme provider, dark selectors, dark variants, media-driven theme, or reduced-motion architecture. Profile saves theme/density/emailNotifications into one browser-wide key but does not apply them. No server synchronization.
- `index.html` sets body `bg-neutral-50`; CSS `.card` sets white/20px radius/shadow-md and `.btn` 14px radius. Those direct roles prevent a complete theme switch. `.btn-primary` carries a permanent shadow.
- Tailwind extends defaults: `sm=640`, `md=768`, `lg=1024`, `xl=1280`, `2xl=1536` px; screens are not overridden. Font uses Tailwind default system sans, no imported font/@font-face/custom font family. Default body remains browser/Tailwind 16px; most page content uses text-sm=14, xs=12, headings 18/20/24. No explicit 13px tier.
- Most geometry uses Tailwind spacing (p-3/4/5/6, gap-2/3/4; h-10 controls, h-12 rows). This is a utility scale, not JSON semantic spacing. Default radius-lg=8 coexists with custom xl=14 and 2xl=20. Numerous raw bg-white, text-white, neutral-shade utilities encode light-mode roles. Arbitrary widths: search 280px sidebar/900px table; queue 820px; detail 320px property column; Admin 240px rail; workflows 320px master; dialogs min(560px, viewport minus 2rem). These are layout constraints needing names and responsive tests, not evidence every value should be removed.
- Shared patterns to extract: secondary/destructive buttons, input/label/help/error blocks, form footers, local success/error panels, status/priority text, user label/date formatting, filters, table wrappers and page headers. Avoid prematurely unifying distinct data controllers.

## Accessibility, states and responsive findings

Code evidence, not a full browser/screen-reader audit:

- Positive: caption/scope on request/search tables, accessible Open actions disabled without IDs, focusable scroll regions, named pagination, native labelled controls, ErrorState alert and LoadingRows status, native modal semantics/focus restoration, status text alongside color.
- App UserMenu has menu roles but no arrow navigation or focus-on-open; closing on Escape does not explicitly restore trigger focus. SideNav/Admin navigation buttons lack aria-current; Home tabs/filter toggles lack aria-selected/aria-pressed. No skip link or route-focus policy found.
- AdminUsers UserDetail role-assignment select has no associated label/aria-label. Several page-local selects/errors set aria-invalid without describedby linkage. Create TextInput shows a visual required star but does not pass native required/aria-required to the input. Login error, Detail upload/assignment/transition success/error panels, Search searching text and KpiCard loading skeleton do not consistently announce state.
- Danger-500 (#F43F5E) is used as small error text on white; an sRGB contrast calculation gives 3.67:1, below the 4.5:1 normal-text threshold. This verifies one token-pair defect, not a full contrast audit. Focus rings sometimes use very pale primary-50. Disabled appearance and outline consistency require keyboard verification.
- ESLint registers jsx-a11y plugin but does not enable its recommended rules; passing lint does not prove accessibility. No axe dependency or automated accessibility audit configured.
- Home can render EmptyState alongside listError because its empty condition does not exclude errors. Detail bundle partial failures become empty lists. Search distinguishes no query/zero matches/error but hides rows while refreshing; Home replaces rows with skeleton. Most Admin pages have skeleton/empty/error/notice states; settings preserve per-section failures and dirty-state warnings. 403/404 and generic boundaries exist.
- Operational rail becomes horizontal below md, not a collapsible/drawer navigation. Admin rail becomes 2/3-column button grid until lg. Detail stacks below lg; attachments remain two columns even at narrow widths. Request tables scroll at 820/900px minimum widths. Forms use md grids and bounded containers. Workflow master/detail switches at xl. No theme-specific responsive design exists.
- Existing 320px smoke checks page-level overflow only; it does not prove target size, long filename/translation handling, 200% zoom, keyboard reachability, hidden-column behavior or tablet ergonomics. Row headers are not universally sticky despite AGENTS table guidance.

## Coverage and visual evidence register

Seven existing Chromium tests cover admin login/navigation (Users, Workflows, Reports, Settings, Audit), denied admin route, unknown route, 320px Admin/Detail overflow, workflow POST/PATCH/first status, request creation public IDs/null/navigation, and transition exact comment without duplicate POST. Config uses API mocks, fixed test API base, CI one worker/retry, failure screenshot and retry trace. No `toHaveScreenshot`, approved image snapshots, accessibility engine, Firefox/WebKit, or visual comparison job exists.

Missing redesign coverage: populated Home/Search, zero-results vs failures, Search/queue back-state, partial detail failures, attachments/scanning, assignment, user/membership/role safeguards, SLA mutations, CSV error/download, dirty settings/template preview, per-section denial, all theme modes/persistence/system change, menu/dialog keyboard, long content, 1024/1440/1920 layouts, zoom and contrast.

Representative current-route screenshots were captured with existing synthetic API fixtures in `.agent/tmp/ui-baseline/`: `login`, `home`, `search`, `create`, `detail`, `profile`, `admin`, `workflows`, `users`, `roles`, `reports`, `sla`, `settings`, `audit`, `forbidden`, `not-found` (each suffixed `-light-1440.png`), plus `detail-light-1024.png` and `detail-light-320.png`: 18 images. Temporary Playwright capture passed in 40.4 seconds with CI settings and was removed after use. Home and mobile Detail images were visually inspected. The fixture renders empty queues/catalogues and a sparse request (some labels are unavailable); those are fixture limitations, not proof that deployed data is missing. Search and SLA empty responses were explicitly mocked for capture. Images are local audit artifacts, not approved comparison snapshots.

Blueprint's exhaustive route/state screenshot requirement remains **PARTIAL**. Before visual migration, extend to initial/loading/populated/empty/error/forbidden/saving states at 1440/1024 and 320px sanity. Include dialogs, user menu, nested editors, memberships/matrix, SLA forms and settings panels. Pin clock/locale/timezone and record fixture/commit hashes for repeatability. Current theme is light only: dark captures must wait for working theme implementation. Real authenticated screenshots remain a separate disposable-environment gate.

## BLUEPRINT RECONCILIATION REQUIRED

1. Blueprint 4/16 proposes My Work/Team Work; current working queues are Home tabs. Preserve My Requests and Recently Updated, which have no explicit one-to-one destination in proposed navigation. Route changes require a later navigation milestone decision.
2. Blueprint 4 lists Statuses/Priorities/Permissions. Statuses are workflow-scoped editors; permissions are inside Roles; no priorities CRUD route/API exists in Web. Do not add speculative destinations.
3. Blueprint 7 theme modes are saved preferences only today; decide browser-local versus user/tenant scope and fallback behavior before provider wiring. Preserve existing key fields; email preference is not a live notification setting.
4. Blueprint 17's open/closed split is historical: current Search is already unified. It lacks several proposed filters/quick views and persists only q on entry. Confirm deployed schema before expanding filter vocabulary.
5. Blueprint 15 High/Critical attention summary: current priorities are low/normal/high/urgent; current visible KPIs are Open/In Progress/Due Today/Overdue. No invented Critical value, due-soon count, chart, recent-activity endpoint or metric link filter.
6. Blueprint 19 creation attachments/custom workflow fields are not implemented by the current Create page; upload is a Detail workflow. Preserve requester/assignee/due/tags. Additional creation features require separate API/behavior scope.
7. Blueprint 18 inline priority/status editing must preserve transition endpoint and server allowed-actions semantics; no generic PATCH status or new permission inference. Assignment/upload currently rely on API enforcement; Workflow Admin lacks per-action permission gating. Record, test, and reconcile capabilities separately rather than changing RBAC during styling.
8. Blueprint 9 radius tiers conflict with global 14/20px styles. Introduce approved tiers alongside legacy aliases; migrate consumers incrementally, not via global visual reset.
9. Blueprint 12 shared responsive shell is absent outside Home/Search. Blueprint 13 libraries are intentionally unspecified; no accessible third-party primitive/icon library is currently installed.
10. Blueprint 25 prohibits list detail fan-out, but Home and Search both depend on it for labels. Measure and review summary contracts separately before removing enrichment.
11. Blueprint 29/immediate exhaustive baseline is incomplete: 18 representative light images now exist locally, but approved state-by-state comparisons and dark screenshots do not. Extend current evidence before visual migration and mark future dark baselines pending.
12. Blueprint 11 WCAG 2.2 AA is stricter/more specific than current AGENTS AA wording; apply 2.2 AA acceptance to new primitives. Existing static lint and overflow tests do not establish compliance.

## Recommended next milestone

Execute only M1, additive semantic token foundation, from `docs/plans/sprint-4/ui-ux-foundation-redesign-execplan.md`. Preserve current rendered output with compatibility mappings. Theme activation, page JSX, routes, RBAC and API optimization remain later milestones. The missing route/state screenshot baseline must be established before accepting any visual consumer migration.

## Audit verification

22 explicit existing-source references resolve; both new Markdown files have no trailing whitespace; `git diff --check` passes and tracked application files have no diff. Representative mocked browser capture passed (one temporary test; 18 images); its harness is removed. One contrast pair was calculated as described above. No production behavior, real API mutation or full release suite was exercised. Typecheck/lint/build/full functional suite remain the mandatory implementation PR gate; they were not repeated for this documentation-only task, which does not request a commit or PR.
