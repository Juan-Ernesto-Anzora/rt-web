# Establish the Request Tracker UI/UX foundation

## Active implementation: M4 App Shell and navigation

M1-M3 are merged; current branch `feat/app-shell-navigation` starts clean. Blueprint v1.1 and the attached M4 request govern this milestone. Add one authenticated `AppShell` layout route under existing Protected, keep AdminProtected for `/admin/*`, and move common navigation from App/AdminShell into the layout. Preserve every public URL, page loader/mutation, and Settings `useBlocker`. Home/Search stay separate route elements. Initial breakpoint candidate: Tailwind `lg` (1024px), because current 240px Admin rail plus wide tables compress the 768px workspace; verify at 320/768/1024/1440 before retaining it.

Architecture: AppShell owns global utility bar, NavLink groups, compact Dialog navigation, SkipLink, a single main landmark, route focus and user disclosure. AdminShell retains section composition and contextual heading, loses its redundant full sidebar; a shared static `adminSections` map drives both Admin page selection and shell visibility. The shell reads existing tenant-scoped `useAdminPermission`; AdminProtected and page gates remain unchanged. Expect one added permission GET when entering previously shell-less authenticated routes, no cache/API refactor; measure via browser tests. Route focus runs only on pathname changes and targets the first page heading or main fallback after overlays close.

Scope: minimal conversion of legacy nested main tags to div and outer page min-height wrappers to fit one shell. Preserve page-specific titles/Back/actions, visual content and business state. Existing 403/404/error behavior remains. Responsive panel uses M3 native Dialog. User actions use ordinary links/buttons without ARIA menu roles. Use semantic tokens only in new shell components. No page/queue/filter/API redesign.

- [x] Route and navigation composition, guards, responsive/user interactions.
- [x] Permanent route, keyboard, dirty Settings, permission and responsive tests.
- [x] Light/Dark visual evidence and documented shell decisions.
- [x] Full local gate and M5 handoff.

M4 local outcome: **PASS**; hosted CI has not run for this branch. `npm.cmd run typecheck` and `npm.cmd run lint` pass; `npm.cmd run build` transforms 149 modules; token/theme tests pass (4/10); final CI-mode `npm.cmd run test:e2e -- --retries=0` passes all 34 in 46.6s (12 new shell, 7 existing Sprint 3, 10 M3 primitives and 5 M2 theme); `npm.cmd run test:theme:preview -- --retries=0` rebuilds and passes 5 production-theme tests in 8.0s; `git diff --check` passes. The final run includes the two-row 320px header and tests the strong active-route border color on both themes. Used the established npm equivalents because the desktop pnpm launcher issue is already documented. All browser API data is intercepted; no live API/SQL sign-off is inferred.

Shell architecture and routes: `src/main.tsx` adds a Protected parent route with `AppShell` and preserves all public child paths; AdminProtected still wraps `/admin/*`. `src/pages/App.tsx` is now a HomePage export; `src/pages/SearchView.tsx` contains the former Search markup/logic. `src/navigation/adminSections.ts` shares Admin mapping between the shell links and AdminShellPage. The old Admin full sidebar was removed while its contextual heading and section content remain. Page-specific nested `main` tags became div to retain one main landmark. The old global Home/New Request duplicate button was removed from Home; the globally available link performs the same navigation. `legacy-page` restores readable light canvases and native controls for content awaiting later page migrations, while the shell uses semantic Light/Dark tokens.

Accessibility and behavior: SkipLink is first; NavLink exact-match aria-current and active border identify destination; user actions are a normal disclosure (expanded/controls, ordinary Tab sequence, Escape/trigger focus, outside click, Preferences, Sign out); compact Menu uses the native Dialog at the existing lg=1024 breakpoint. Route focus moves to first heading, falling back to the named main after async loading, and does not run on first page load or query-only changes. Direct paths, refresh, browser Back/Forward, Create/Detail/Profile, Admin guard and friendly 403/404 passed tests. M4 checked 320/768/1024/1440 widths with no horizontal document overflow on tested routes. The existing Settings useBlocker was exercised from a dirty form through shell Home navigation: Cancel retained edits and route; Leave page proceeded. No new authorization logic or permission cache was added.

Measured permission effect: the mocked React StrictMode Home mount made 2 `/api/admin/me/permissions/` calls; client navigation to Create left the count at 2. Shell visibility on a fresh Create/Detail/Profile route adds one logical permission hook (which can mount twice in development); Home/Search replace their former App hook, while Admin replaces the former AdminShell hook. No backend endpoint, tenant header or list-detail fan-out logic changed.

Visual evidence in ignored `.agent/tmp/m4-shell/`: Home 1440 Light, Admin 1440 Light, Detail 1024 Light, Search 1440 Dark, Search 768 Dark, Search 320 Light, compact Navigation 320 and Create 320 were inspected. Tests pin locale/timezone and fixtures and assert computed shell colors, active URL and overflow. Golden `toHaveScreenshot` baselines were deliberately deferred because the local Windows Chromium renderer and CI Ubuntu font rasterization are not pinned to one image environment; committing local snapshots would make CI flaky. These captures establish reviewable shell evidence, not a cross-platform image diff. Product content remains intentionally mixed light in Dark mode until its own milestone.

Files changed for M4: `src/components/layout/AppShell.tsx`, `src/navigation/adminSections.ts`, `src/pages/{App,SearchView,HomePage,RequestCreatePage,RequestDetailPage,ProfilePreferencesPage,ForbiddenPage}.tsx`, `src/pages/admin/AdminShellPage.tsx`, `src/components/common/SystemStatusPage.tsx`, `src/index.css`, `src/main.tsx`, `tests/e2e/{app-shell,sprint3-admin-smoke}.spec.ts`, `docs/design/05-app-shell-navigation.md`, and this ExecPlan. No auth/API/feature module, design token JSON, dependency, density runtime or new route changed. `tests/e2e/app-shell.spec.ts` initially mocked Vite source modules under `/src/api/` due a broad `**/api/**` handler; it now continues all paths outside `/api/`. After that correction all focused and full tests pass. CI path filters already cover src, tests and plans; no workflow changes needed.

Known limits: old page headers/cards/controls and Search/Home detail enrichment remain for M5+. Admin overview still carries a historical setup placeholder; M4 did not redesign Admin content. The role/permission list is still determined by existing API context and page/server checks. Root app errors/404 stay outside the authenticated shell as before. Full WCAG assessment, deployed API behavior and approved cross-platform visual snapshots remain future gates.

Exact M5 handoff: redesign only Home/dashboard as an actionable workspace using this shell and M3 primitives. Preserve existing four queue tabs (My Tasks, Other Tasks, My Requests, Recently Updated), Quick Filters, current Open/In Progress/Due Today/Overdue KPI meanings, search entry, request_id navigation, server data, loading/empty/error states, auth/tenant headers and URL paths. Establish current populated/empty/error visual baseline, measure actual list/detail request counts and define a separate contract/performance acceptance step if fan-out needs change. Do not migrate Search results, Request Detail, Create or Admin page content in M5 without separately authorized scope.

## Active implementation: M3 shared accessible primitives

M1/M2 are merged; clean baseline `b70435f` on `feat/shared-ui-primitives`. This request authorizes M3 only. Build a small `src/components/ui/` layer (Button/IconButton, Field/native controls, Badge, Skeleton, Dialog, PageHeader, Separator); refine existing common feedback components and retain their exports. Keep StatusBadge category/name behavior and a PriorityChip adapter to the new PriorityIndicator. Native AdminDialog becomes a compatibility export; ConfirmDialog uses Button and preserves callbacks with busy dismissal protection. No product page JSX or router changes.

Evidence: repeated secondary/danger buttons and form classes across Create/Admin; field association logic local to Create; shared state components currently hard-code light palette; native AdminDialog already contains modality/focus behavior worth preserving. PageHeader and Separator cover repeated heading/actions and horizontal boundaries. Radio/tabs/menu/drawer/avatar/combobox frameworks are excluded. Keep PaginationControls, KpiCard, page-specific inputs/headers and legacy CSS for later migrations.

Verification surface: permanent `tests/fixtures/primitives.html` and TSX fixture, opened directly by Playwright in development only (not a router route or production build entry). Typecheck it, retain functional smoke and M2 preview tests, add keyboard/field/dialog/state tests and four preference/effective-theme cases. Capture only fixture light/dark images. Use existing React, native controls and Playwright; no new dependency or density runtime. Add focused token-pair checks for feedback/focus if needed.

- [x] Shared primitives and compatibility refinements.
- [x] Permanent accessibility/theme fixture and behavior tests (ten focused Chromium tests).
- [x] Component API/migration documentation and local gate.
- [x] Scope review and exact M4 handoff (App Shell/navigation only after separate authorization).

M3 outcome: **PASS locally**, hosted CI not run. New primitives: Button/IconButton, Field/Input/Textarea/Select/Checkbox, Badge, Skeleton, Dialog, PageHeader, Separator and PriorityIndicator. Refined common notices/empty/error/loading and compatibility exports for StateBadge, PriorityChip and AdminDialog. StatusBadge logic is retained unchanged. No product page JSX migrated; bounded integrations are ConfirmDialog -> Button/Dialog, ErrorState -> Button and LoadingRows -> Skeleton. Existing consumers keep their import paths/props/callbacks; visual styling of shared components is intentionally semantic now. ConfirmDialog busy Escape is intentionally protected, while parent-driven close remains allowed.

Permanent coverage: typechecked `tests/fixtures/primitives.html`/TSX, no production route or build entry; `tests/e2e/primitives.spec.ts` with ten cases covering native activation/type/disabled/loading, named icon and target, required/label/help/error fields and native select/checkbox, modal Escape/button close/focus restoration/background inertness/busy state, initially-open StrictMode focus, feedback semantics/static loading, and Light/Dark/System-Light/System-Dark. `tests/tokens.test.cjs` also checks new focus/danger-surface and hover-text pairings. Fixture screenshots `.agent/tmp/m3-primitives/light.png` and `dark.png` were inspected, remain ignored, and do not certify legacy product screens.

Final checks: npm.cmd run typecheck and lint pass; npm.cmd run build passes (146 modules); test:tokens four pass; test:theme ten pass; focused test:primitives originally nine pass, then extended to ten and all ten pass within the final full E2E run; `CI=true npm.cmd run test:e2e -- --retries=0` passes all 22 in 31.8s; `npm.cmd run test:theme:preview -- --retries=0` rebuilds and passes five production-preview tests in 7.7s; git diff --check and CI YAML validation pass. Established npm invocation used due documented pnpm launcher limitation; no machine/dependency repair. An earlier full run had a transient Chromium ERR_NETWORK_CHANGED navigation that passed on retry; the final no-retry run is clean. One approval-review invocation was not executed during a usage-limit interruption, then completed after the user resumed. Existing Browserslist/terminal-color warnings remain non-blocking.

Final scope/files: new `src/components/ui/{Button,Field,Controls,Badge,Skeleton,Dialog,PageHeader,Separator}.tsx`, `ui/styles.ts`, `requests/PriorityIndicator.tsx`; modified `admin/AdminDialog.tsx`, `common/{EmptyState,ErrorState,InlineNotice,LoadingRows,StateBadge}.tsx`, `requests/PriorityChip.tsx`; permanent fixture/spec, token tests, package script, TypeScript fixture include, CI fixture trigger; `docs/design/04-component-system.md` and this plan. No diff in src/pages, main/router, auth, API/features, theme runtime, tokens JSON, lockfile or dependencies. Fixture absent from dist/tests/fixtures and no fixture title/code in built JS. No commit/push requested.

Remaining limitations: Chromium-only behavior evidence; no universal WCAG/screen-reader certification. Native dialogs require modern showModal support and allow browser-chrome focus; no custom nested-modal system. Legacy raw controls inside existing Admin dialogs and other pages can retain light-only styling; new shell tokens do not certify their descendants. Use semantic parents for transparent/Field primitives. KpiCard, PaginationControls, SystemStatusPage, Create TextInput/FieldError, Profile fields, page-local headers/buttons and legacy CSS remain pending consumer migration. Static Skeleton has no motion to disable. No new overlays, icon packages, custom selectors or density runtime.

Exact M4 handoff: separately authorize App Shell + navigation per Blueprint v1.1 using these primitives. Inventory current destinations and guard ownership, unify persistent presentation/global search/create/user actions while preserving paths, server permission checks, back-state, My Requests/Recently Updated and Admin workflow/role context. Define accessible responsive navigation and route focus, and test deep links/refresh/denial/unsaved settings. Do not use M4 to redesign Dashboard/Search/Detail/Create/Admin content, add speculative routes/metrics, optimize API fan-out or activate density. M4 is planned, not implemented.

## Active implementation: M2 theme runtime

### Final production closeout

Status: **PASS for local M2 build and production-preview verification**. This evidence supersedes earlier test counts below. No M3 or production-runtime changes were made during closeout; only permanent verification, narrow CI invocation and evidence documentation were extended.

- Build: `npm.cmd run test:theme:preview` runs the production build before a new preview server. Generated `dist/index.html` references `/theme-init.js` in a classic blocking head script before `/assets/index-DgRWUgR_.js`; `dist/theme-init.js` matches the source exactly (SHA-256 `d61c09436ece5f8fa021e3fdaf2e6b0bec85919fc423ab91a806df531bcfd764`). 140 modules build successfully.
- Browser proof: saved dark, system/dark OS and system/light OS each resolve the HTML attribute and color-scheme with React's hashed entry held and `#root` empty. After releasing the entry, Login renders. Preview tests also verify preference Save/reload/System changes and semantic-consumer colors. Five preview tests pass in 7.6s; the full normal environment passes twelve tests in 21.2s (seven functional plus five theme).
- Delivery: preview serves the actual bootstrap as 200 JavaScript with `Cache-Control: no-cache`. Current Vite/router/README are root-oriented, with no custom base/basename or documented subpath deployment. Non-root app deployment is not supported/proven merely by the BASE_URL placeholder. No deployed server/CDN/CSP configuration was established from this checkout.
- External asset assessment: stable URL risks stale cache or unavailable script if a host applies immutable caching, blocks scripts, omits public files or returns SPA HTML. Require script/HTML revalidation, same-origin CSP permission and atomic complete dist deployment. Without the script, ThemeProvider dereferences an absent runtime before the inner error boundary; blank startup is possible. Documented as an asset-delivery prerequisite, not silently masked by another resolver. The tested production model serves it correctly; no runtime architecture defect was demonstrated.
- Consistency: ThemeProvider is a typed subscriber to the exact head-script store, not another validator/resolver. Accepted values, system fallback, effective computation, root attribute and color-scheme share one implementation. Token palette still exists only in JSON.
- Lifecycle/storage: ten runtime tests pass, including explicit light and dark precedence, shared subscriber ownership, final-listener cleanup/remount, zero writes during storage events, immediate same-tab state, malformed/inaccessible storage, failed-write session behavior and preservation of unrelated fields.
- Permanent gate: typecheck, lint, build, four token tests, ten runtime tests, twelve normal E2E tests, five production-preview theme tests and git diff --check pass. Established npm equivalents used; prior pnpm launcher limitation remains documented without machine repair. Hosted CI has NOT run for this diff. Browserslist age/terminal color warnings remain non-blocking.

Closeout changes only: `playwright.preview.config.ts`, `package.json` (test:theme:preview), `tests/e2e/theme-runtime.spec.ts` (production-compatible first-paint tests), `tests/theme.test.cjs` (lifecycle/zero-write assertions), `.github/workflows/ci-web.yml` (preview step reusing its build), `docs/design/03-design-tokens.md`, and this ExecPlan. No production source, palette or preference behavior changed in this review. No temporary harness or tracked screenshot artifacts.

M3 starting point remains shared accessible native primitives consuming the verified semantic tokens/runtime, with Light/Dark keyboard/focus/error/contrast tests. No App Shell, page, route, RBAC, API, density or component-library work is authorized by this closeout.

M1 is merged at `cc7db5e` (PR #23); branch `feat/theme-runtime` starts clean. The user now authorizes only M2. Earlier M1/audit scope statements remain historical. Normative Blueprint v1.1 R3 requires browser-local Light/Dark/System with the existing `rt.profile.preferences` object. Current missing/parse-error default is system; retain it and normalize invalid theme values to system as well.

Architecture: one parser-blocking, same-origin `public/theme-init.js` script in the document head resolves/applies `html[data-theme=light|dark]` and color-scheme before the body/React module. It owns the small preference store; a typed React ThemeProvider subscribes through useSyncExternalStore. The bootstrap and React therefore use the same storage/resolution code, with no duplicated resolver or palette. Subscribe to OS and cross-tab storage events with cleanup. Profile's existing Save action commits only changed preference fields, merging unrelated stored fields; storage write failure is visible and does not claim persistence.

Dark mappings belong solely in `design/design-tokens.json`; the M1 adapter emits a dark root selector with the same semantic aliases. Keep legacy utilities unchanged. Add permanent runtime tests using Node VM on the real bootstrap and Playwright tests for head initialization before the React module, preference UI, root switching and a bounded semantic test consumer. Update contrast checks for both themes. Required gate: npm typecheck/lint/build/test:e2e/test:tokens plus new test:theme and git diff --check. No M3 or broad consumer migration.

- [x] M2 runtime, dark mappings and preference integration.
- [x] Permanent behavior/first-paint/contrast tests and bounded visual evidence.
- [x] Full local gate and M3 handoff.

M2 result: **PASS locally**. Hosted CI has not run for this diff. `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build` (140 modules), `npm.cmd run test:tokens` (four tests), `npm.cmd run test:theme` (nine tests), and CI-mode `npm.cmd run test:e2e` (ten Chromium tests, 18.1 seconds) pass. `git diff --check` passes. Used established npm equivalents because the desktop pnpm launcher issue is already documented; no machine/dependency repair attempted. The first focused browser run could not execute when automatic approval review hit usage limits; the user resumed and the approved rerun completed. A hidden-radio test interaction was corrected to visible-label/keyboard operation; final tests pass without forced clicks.

First-paint evidence: the browser test blocks the React module and confirms saved Dark is already on the HTML root with color-scheme=dark and an empty React root. The production build retains the blocking head script ahead of its module and copies public/theme-init.js byte-for-byte. This proves root initialization, not complete dark rendering of legacy pages. Bounded light/dark semantic screenshots in `.agent/tmp/m2-theme/` were visually inspected; both are generated by the permanent test and remain ignored artifacts.

Contrast evidence (light/dark): foreground/background 17.06/16.12; muted/background 7.24/11.99; primary-action label/fill 6.29/6.29; info 7.09/8.32; success 7.29/9.94; warning 6.84/10.39; danger 5.72/8.27, all ratios to 1. Token tests enforce >=4.5 normal text plus >=3 focus/strong-border pairs. Full values and intended surfaces are in `docs/design/03-design-tokens.md`.

M2 files: `public/theme-init.js`, `src/theme/ThemeProvider.tsx`, `index.html`, `src/main.tsx`, `src/pages/ProfilePreferencesPage.tsx`, `design/design-tokens.json`, `design/tailwind-tokens.cjs`, `tests/theme.test.cjs`, `tests/tokens.test.cjs`, `tests/e2e/theme-runtime.spec.ts`, `package.json`, `eslint.config.js`, `.github/workflows/ci-web.yml`, `docs/design/03-design-tokens.md`, and this plan. No dependency/lockfile, route, RBAC, API, fan-out or redesigned page changes.

Remaining limits: legacy white/neutral utilities, body background, cards/buttons and native controls are not a complete dark UI; root color-scheme changes native browser controls. No full-page dark baselines or hosted/deployed sign-off. Public theme-init.js must be served alongside built assets and allowed by deployment CSP; verify deployment cache policy for this non-fingerprinted public asset. Existing Browserslist age warning remains non-blocking. Storage denial is recoverable/session-only and reports persistence failure.

Exact M3 handoff: implement only shared accessible primitive foundations (native wrappers where sufficient): buttons/fields/input/select/textarea/check/radio/dialog and state components as demanded by existing consumers, with semantic tokens and useTheme where needed. Preserve native dialog/focus/required/error semantics and legacy compatibility adapters, add light/dark keyboard/contrast tests. Do not implement App Shell/navigation, page redesigns, density, APIs/RBAC changes or a new component library without a separately justified need. M3 is planned, not started.

## Active implementation: 2026-09-19 M1

### M1 closeout review

Status: **PASS for local M1 implementation and review**. Hosted CI for this working-tree diff has not run; AGENTS requires it before merge. Reviewed the complete tracked diff against HEAD `8fdee7f`, the new adapter/tests/token documentation, and the untracked Blueprint/inventory/plan prerequisites. No M2 work was performed.

- Source-of-truth proof: `design/design-tokens.json` owns raw color/radius values. `design/tailwind-tokens.cjs` reads it, resolves brand references, converts hex to RGB channels, emits root variables with addBase, and derives utility strings. `tailwind.config.ts` imports those exports. `src/index.css` consumes Tailwind directives and retains legacy component classes; its former root radius is now emitted from JSON. The adapter has no independent hex/pixel token table. Existing shadow constants in Tailwind are unchanged and outside this color/radius scope. Test literals are compatibility assertions, not production definitions.
- Temporary harness: `tests/e2e/m1-parity-temporary.spec.ts` is already absent on disk and from the Git index. No recreation needed. Permanent `tests/tokens.test.cjs` and existing seven-test E2E suite remain.
- Artifact disposition: zero tracked files under `.agent/tmp/`, `test-results/`, or `playwright-report/`. Added `.agent/tmp/` to `.gitignore` to enforce the PLANS temporary-artifact policy; existing screenshots remain locally available and ignored. No temporary test/script was retained.
- Tooling retained: `test:tokens` runs permanent Node/PostCSS/Tailwind contract tests without dependencies; the exact two-file ESLint override gives the build adapter/test CommonJS and Node semantics, allowing require only there; CI watches `design/**`, `tailwind.config.*`, and the token test, and runs `pnpm test:tokens`. Each change is needed for continuing token verification; none exists solely for screenshot capture.
- Scope check: no page/component JSX, route, RBAC, API, theme runtime, dark consumer, component dependency, lockfile, density or list-fan-out change.

Closeout verification rerun:

| Permanent command | Result |
| --- | --- |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS on sequential rerun |
| `npm.cmd run build` | PASS, 139 modules |
| `CI=true npm.cmd run test:e2e` (PowerShell sets CI separately) | PASS, seven mocked Chromium tests, 24.9 seconds |
| `npm.cmd run test:tokens` | PASS, four permanent tests |
| `git diff --check` | PASS |

Initial closeout lint overlapped Playwright output-directory recreation and failed with ENOENT scanning test-results; after E2E completed, the identical lint command passed. No lint rule changes were needed for this transient check-order issue. The earlier exact pnpm attempts remain documented as pre-script ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY failures; this review uses the authorized npm equivalents without changing the developer environment. Browserslist age and NO_COLOR/FORCE_COLOR warnings are non-fatal. No live backend or hosted CI result is implied. Missing Prettier/Vitest tooling remains as previously documented.

Parity revalidated by reading the retained before/after PNG bytes: all four pairs are identical. Each pair shares this SHA-256 (1440x1000 viewport, full-page captures, existing synthetic mocks):

| Page | SHA-256 |
| --- | --- |
| Home | `31b38a01dbba2ebf92a7b4fdf120a331aeee0e4047a78c3f4a4f6d05ddcc24f8` |
| Create | `585f880ebf3d9d0fd3ca954fdc74085976b4eb164559daab731ea08739e26a95` |
| Detail | `5e29e0edd085dc358202bccbb6e046e1ffc41e3af657537dc6ac11a0c689d22e` |
| Settings | `47c838ae274a9d73e96fea71480719c51d3e25d5dee99f3fff146c12f955f1db` |

This confirms the reported representative parity and provides repeatable artifact comparison. The deleted capture harness is not a permanent automated visual suite; fresh capture across another browser/OS is not claimed to reproduce these bytes.

Final M1 file set: `.gitignore`, `.github/workflows/ci-web.yml`, `design/design-tokens.json`, `design/tailwind-tokens.cjs`, `tailwind.config.ts`, `src/index.css`, `package.json`, `eslint.config.js`, `tests/tokens.test.cjs`, `docs/design/03-design-tokens.md`, and this ExecPlan. Also present as pre-existing untracked prerequisites: Blueprint v1, Blueprint v1.1 and `docs/design/current-ui-inventory.md`; closeout preserves them unchanged. No commit/push is performed by this review.

Exact M2 starting point: after separate authorization, use normative v1.1 R3 and this verified JSON/adapter foundation to implement browser-local Light/Dark/System resolution. Preserve `rt.profile.preferences` and unrelated fields; validate missing/invalid/blocked storage, subscribe/clean up prefers-color-scheme, synchronize cross-tab changes, handle first paint and root color-scheme, and define dark values in the same JSON source. Test persistence/system changes and documented contrast pairs. Do not activate density/email behavior or migrate pages/routes/API/RBAC. Legacy light-only consumers remain explicitly documented; dark screenshots start only with working runtime. This handoff is a plan, not implementation authorization.

Blueprint `docs/design/00-Request-Tracker-UI-UX-Design-Blueprint-v1.1.md` supersedes v1 and the historical audit-only scope below. The user authorizes ONLY additive semantic colors and radius foundation on `feat/ui-ux-foundation`. The old M4-M9 breakdown below is historical: subsequent numbering follows v1.1 (M2 theme, M3 primitives, M4 shell/navigation, M5 Dashboard, M6 Search/queues, M7 Detail, M8 Create, M9 Admin/auth, M10 hardening). None is authorized here. Spacing/type/motion values and dark palette activation are deferred from the earlier broader M1 proposal.

Chosen flow: JSON -> `design/tailwind-tokens.cjs` resolver -> Tailwind addBase CSS custom properties and semantic utility aliases. Legacy palette is read directly from the same JSON. No generated stylesheet to maintain or separate runtime source. Radius aliases preserve xl=14px, 2xl=20px and the existing root radius=12px. New role values will be contrast-tested on their documented surfaces, while legacy consumers remain unchanged.

M1 verification complete: four fresh before/after representative light screenshots are byte-identical; all four Node/PostCSS/Tailwind token tests pass; typecheck/lint/build and seven Chromium E2E tests pass through documented npm equivalents. Exact requested pnpm commands were attempted and all stopped before executing scripts with ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY. No dependency, page, route, API or RBAC change. Hosted CI is not run in this uncommitted task.

## Purpose

Produce an evidence-based migration map before changing the interface. The approved `docs/design/00-Request-Tracker-UI-UX-Design-Blueprint-v1.md` is normative. This task creates documentation only; later milestones incrementally establish semantic tokens, themes, accessible components, and a persistent shell while preserving request processing and authorization.

## Repository orientation

Read `AGENTS.md`, `.agent/PLANS.md`, `.agent/code_review.md`, the Blueprint, `docs/design/current-ui-inventory.md`, `docs/sprint-3-web-verification.md`, and `docs/sprint-3-known-issues.md`. Source entry is `src/main.tsx`; operational shell and Search are in `src/pages/App.tsx`; Admin shell is `src/pages/admin/AdminShellPage.tsx`. Colors exist in `design/design-tokens.json` and are duplicated in `tailwind.config.ts`. Global presentation is `src/index.css`. Actual browser runner is `playwright.config.ts` with `tests/e2e/sprint3-admin-smoke.spec.ts`.

## Current behavior

Baseline is commit `7cb6cb5` on `docs/codex-astra-adoption`. The companion inventory records all operational and Admin routes, nested editors, shared UI, exact client API strings, and preservation requirements. Home/Search share App-local navigation; other screens have independent headers. JSON colors are duplicated in Tailwind, preferences do not apply themes, and legacy card/button styles contain 14/20px radii. Native HTML/dialog components are the established primitives; no third-party primitive or icon package exists. Home and Search perform detail enrichment per row. Existing Sprint 3 functionality is the baseline; historical unchecked deployment items do not authorize implementation.

## Desired behavior

Blueprint sections 7-14 and 29-31 define semantic tokens, Light/Dark/System themes, shared accessible primitives and domain components, persistent navigation, responsive layouts, and repeatable visual checks. Preserve routes, identifiers, tenant headers, permission checks, API payloads, and every existing working operation.

## Scope

This audit may create only the requested inventory and this plan. Preserve the user-provided, currently untracked Blueprint unchanged. No JSX, dependency, API, SQL, RBAC, route, or infrastructure edits. Future implementation requires the selected milestone to be explicitly requested.

## Implementation plan

The ordering below is normative for this plan. Each milestone is a separate bounded implementation/review unit; completion of this audit does not authorize any of them. Preserve old consumers through compatibility adapters until replacement parity is verified. New paths below are proposed, not falsely reported as existing.

### M1. Add semantic tokens without changing current rendering

Files implemented: `design/design-tokens.json`, `design/tailwind-tokens.cjs`, `tailwind.config.ts`, `src/index.css`, `docs/design/03-design-tokens.md`, `tests/tokens.test.cjs`, `package.json`, `eslint.config.js`, `.github/workflows/ci-web.yml`.

Implemented 25 purpose-named light color roles and five radius roles, preserving all current palette/radius utilities. A build-time Tailwind adapter emits variables and utility mappings directly from JSON. Reference syntax is deliberately limited to literal brand colors, preventing semantic-reference cycles. Existing 12px root radius is emitted by the adapter. No generated CSS artifact or second manually maintained color source exists. Spacing/type/motion and dark values are deferred per the narrower normative v1.1 M1 scope.

Focused checks: JSON parse, resolved Tailwind color parity with existing palette, all semantic aliases resolve, no circular references, contrast calculations for text/surfaces and focus/control boundaries. Record 4.5:1 normal text, 3:1 large text/non-text requirements with actual pairs. Validate opacity modifiers and fallback values. Compare representative current light screens before/after; unexplained visual change fails compatibility acceptance. Run full PR gate. Done: semantics available and documented, legacy screens unchanged, no API/routes/RBAC edits.

### M2. Implement theme architecture

Files: proposed `src/theme/ThemeProvider.tsx`, `src/theme/useTheme.ts`, `src/styles/tokens.css`, `src/main.tsx`, `index.html`, `src/pages/ProfilePreferencesPage.tsx`, proposed `docs/design/02-visual-language.md`.

Reconcile existing `rt.profile.preferences` persistence first (Blueprint reconciliation 3). Reuse its theme field and preserve density/email fields; validate invalid or inaccessible storage and fallback to System. Resolve System through matchMedia, react to system changes, and set root theme/color-scheme before paint where feasible. Define storage cross-tab synchronization and cleanup. Theme provider owns presentation only, not business or permission data. Native controls and portals/dialogs inherit the theme. Do not claim the whole legacy app is dark-ready until consumers migrate. Density and email server behavior remain outside scope.

Focused checks: Light/Dark/System selection, reload, media change, storage failure/invalid value, native control contrast and initial flash. Full PR gate. Done: deterministic resolution, local preferences preserved, accessible semantic preview fixtures in both themes; legacy limitations documented.

### M3. Establish shared primitives

Files: proposed `src/components/ui/{Button,IconButton,Field,Input,Textarea,Select,Checkbox,Radio,Dialog,Tabs,Badge,Avatar,Skeleton,Tooltip}.tsx`; refine `src/components/admin/AdminDialog.tsx`, common state components, `src/index.css`; document `docs/design/04-component-system.md`.

Implement only primitives needed by migrated consumers, with native semantics as the default. Retain native dialog mechanics. Extract native date input before considering a custom picker. Define DropdownMenu/Popover/Drawer/Toast requirements and only build when a consumer exists; any dependency decision needs explicit justification and scope. Do not assume an icon library is installed. Labels, descriptions, errors, loading/disabled/read-only, 24px minimum target or spacing exceptions, Escape/focus restoration and reduced motion are part of each contract. A Field supplies stable IDs, required semantics and aria-describedby. Avoid speculative variant matrices. Keep compatibility wrappers until every old import is migrated.

Focused checks: keyboard Tab/Shift+Tab/Enter/Space/Escape, dialog opener restoration, required/error announcement, pending submit protection and focus-visible in both themes. Add meaningful existing-Playwright component fixture coverage; no invented Vitest runner. Full PR gate. Done: documented small variant set, no unnamed controls, equivalent native interaction and no removal of working forms.

### M4. Extract reusable domain components

Files: `src/components/requests/{RequestTable,StatusBadge,PriorityChip}.tsx`, `src/components/common/*`, `src/components/dashboard/KpiCard.tsx`; proposed RequestId/UserIdentity/FlowLabel/PropertyField/ActivityItem/AttachmentItem/FilterBar/QueueToolbar/PageHeader modules; use sites in App/Create/Detail/Admin.

Follow the inventory classifications. Keep data fetching in existing page/service owners. Preserve public request_id navigation, absent-ID disabling, status text, normalized priority, nullable identity labels, attachment scan visibility and grouped-comment semantics. Consolidate repeated notices/fields/date display and table presentation without losing Search snippets/tags or queue columns. Do not combine unrelated controllers or alter endpoints as part of extraction. Domain pieces must accept presentation data rather than fetch detail per row.

Focused checks: long names/titles, null values, IDs absent, status/priority text, safe payload/attachment rendering, table captions/headers and parity with existing mutation tests. Full PR gate. Done: reused components have actual consumers; REMOVE_AFTER_MIGRATION items removed only after zero-import search and equivalent-state verification.

### M5. Compose persistent App Shell

Files: proposed `src/components/layout/{AppShell,AppHeader,Sidebar,PageHeader}.tsx`; `src/pages/App.tsx`, `src/pages/admin/AdminShellPage.tsx`, `src/main.tsx`, authenticated page wrappers.

Move global presentation ownership to a shared shell: navigation, theme, search/create entry, user menu, notifications region and route boundary. Keep route paths and guards exactly unchanged. Preserve Admin settings unsaved-change blocking and existing back/cancel behavior. Shell must not fetch dashboard/detail business data or infer permissions. Keep broad page composition in later surface ExecPlans. Login remains a separate public surface until the later authentication redesign.

Focused checks: refresh/deep-link every current route; no nested main landmarks, duplicate headers, lost guards or reset form data; public 404 and authenticated 403; no new API fetches caused by shell rendering. Full PR gate. Done: global actions reachable on existing authenticated pages, routes/contracts intact.

### M6. Reconcile navigation and context preservation

Files: shared layout navigation, `src/pages/App.tsx`, `src/pages/HomePage.tsx`, proposed `docs/design/01-information-architecture.md` and `05-app-shell-navigation.md`.

Resolve Blueprint reconciliation 1/2/4/7 first. Map My Tasks -> My Work and Other Tasks -> Team Work only with an explicit preservation map including My Requests/Recently Updated. Keep statuses workflow-scoped and permissions within Roles unless separately authorized route work establishes new destinations. Replace local-view navigation with route-aware links where behavior scope is approved; document URL filter vocabulary and back-state migration separately from visual styling. Preserve actual API access restrictions. Placeholder destinations must be explicitly planned, visibly unavailable or later migrated; no invented features. Command palette and productivity shortcuts are deferred.

Focused checks: route-selected aria-current, keyboard links, browser back/forward, deep links, filter/page/scroll restoration, allowed/denied Admin combinations. Full PR gate with negative permission tests. Done: approved existing destinations stay accessible; no dead enabled navigation or new authorization semantics.

### M7. Complete accessibility foundation

Files: shared primitives/layout/states, affected field/menu use sites, `eslint.config.js` if enabling existing jsx-a11y rules, proposed `docs/design/12-accessibility.md`, `tests/e2e/ui-accessibility.spec.ts`.

Accessibility is required in M1-M6, not postponed until M7. This milestone closes cross-cutting gaps: skip link, route heading/focus policy, announced asynchronous state, keyboard menu/tab patterns, role-select labels, field descriptions/required state, zoom/reflow and target sizes. Adopt WCAG 2.2 AA. Enabling existing lint rules may expose old defects: scope and track them instead of suppressing broadly. No automated rule engine is installed; proposal/approval for dependencies must be explicit. Preserve native modal behavior and API error specificity.

Focused checks: keyboard-only full route traversal, reader names/descriptions/alerts, 200% zoom, 320px reflow, contrast in both themes, no color-only status, reduced motion. Full PR gate. Done: migrated shared primitives have no known accessibility defects; unresolved legacy page issues are individually listed, not declared compliant.

### M8. Complete responsive foundation

Files: layout/primitives/table wrappers, `tailwind.config.ts` only if evidence requires breakpoint changes, proposed `docs/design/13-responsive.md`, `tests/e2e/ui-responsive.spec.ts`.

Retain default breakpoints initially; document behavior at 640/768/1024/1280/1536 transitions. Expanded desktop sidebar, deliberate narrower mode and mobile navigation must retain names/focus/actions. Detail properties stack or use an accessible disclosure/drawer per Blueprint, with no hidden processing functions. Keep tables internally scrollable; do not drop essential columns/actions just to pass overflow tests. Test long content, two-column attachment behavior, dialog height and safe narrow form footers. Avoid viewport-scaled typography.

Focused checks: 320/768/1024/1440/1920 widths, zoom, keyboard scroll regions, header/control overlap, long title/filename/identity, dialog overflow. Full PR gate. Done: no page overflow from migrated shell, content/actions reachable at all target widths, no degraded desktop density.

### M9. Establish visual regression baseline

Files: `playwright.config.ts`, proposed `tests/e2e/ui-visual-baseline.spec.ts`, controlled screenshot fixtures/snapshots, `.github/workflows/ci-web.yml`, proposed `docs/design/15-ui-qa-checklist.md`.

Capture the current light route/state evidence before consumer migration even though acceptance automation is finalized here. Pin viewport, locale, timezone, clock, fixture IDs, fonts and Chromium/OS; disable animations for snapshots while separately testing reduced-motion behavior. Reuse the explicit test API base from the CI repair. Record API mocks as mocks. Minimum Blueprint 29 names: dashboard-light-1440, dashboard-dark-1440, search-dark-1440, request-detail-dark-1440, request-detail-dark-1024, create-request-dark-1440, admin-dark-1440. Extend with loading/empty/error/denied/dialog and long-content states. Use existing Playwright `toHaveScreenshot`; no chart/test dependency needed. Review diffs intentionally; never auto-accept snapshots to hide regressions. Separate approved redesigned snapshots from pre-redesign evidence. Ensure CI watches design tokens, Tailwind, index.html, design docs and snapshot fixtures as appropriate (currently some paths are missing).

Focused checks: same-environment repeatability and one intentional controlled mismatch that the comparison catches; no real credentials/data in screenshots. Full PR gate plus affected visual/keyboard/accessibility tests. Done: reproducible baseline with reviewer-approved images and documented update policy. Real-stack verification remains necessary for integration changes.

## Tests and verification

Audit: inspect source and existing tests; validate document references and `git diff --check`. Static findings are not runtime verification. At each implementation PR gate run `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test`, and `git diff --check`; use documented npm equivalents when the desktop pnpm launcher fails before executing scripts. Do not add unavailable runners implicitly. Real API/SQL/browser release evidence remains separate from mocked Web tests.

## Acceptance criteria

- Inventory includes all routes, components, per-route API calls, states, accessibility, responsiveness, test coverage, and evidence-backed migration classifications.
- Blueprint inconsistencies are explicitly marked BLUEPRINT RECONCILIATION REQUIRED.
- Nine ordered foundation milestones name files, preservation criteria, focused checks, and PR gates.
- Runtime source and normative Blueprint remain unchanged.

## Progress

- [x] M4 App Shell/navigation complete and locally verified; see active M4 outcome above. M5 is not started.

- [x] M1 closeout: source-of-truth, complete scope/tooling review, retained parity hashes, permanent suite rerun and temporary-artifact exclusion verified.

- [x] Read repository instructions, Blueprint, tokens, and Sprint 3 verification/limitations.
- [x] Trace router, operational/Admin shells, shared components, permission hooks, dashboard fan-out, and detail loader.
- [x] Finish inventory, preservation mapping, and nine implementation milestones.
- [x] Capture 18 representative mocked light-route images; inspect Home and mobile Detail. Exhaustive route/state visual evidence remains partial.
- [x] Verify references, scope, and report remaining evidence gaps.
- [x] M1 semantic tokens: JSON/adapter, compatibility, contrast tests, visual parity and full package-script gate completed 2026-09-19.
- [x] M2 theme runtime complete; see current M2 result above. Historical milestone numbering below is superseded by Blueprint v1.1.
- [x] M3 shared primitives complete; see current M3 evidence above.
- [ ] M4 domain components (future implementation).
- [ ] M5 App Shell (future implementation).
- [ ] M6 navigation (future implementation).
- [ ] M7 accessibility foundation (future implementation).
- [ ] M8 responsive foundation (future implementation).
- [ ] M9 visual regression baseline (future implementation).

## Surprises & Discoveries

- M4: The first focused test fixture used `**/api/**` and accidentally intercepted Vite source modules under `/src/api/`, yielding blank pages. Filtering by actual path prefix `/api/` fixed the test without changing production modules.
- M4: A semantic dark shell initially exposed unreadable legacy Search/Home headings on its dark canvas. `legacy-page` reuses the old neutral canvas and local light color-scheme for unmigrated descendants; the shell and new navigation remain semantic/dark. A class was briefly applied to nested DetailField/TextInput/ProfileField rather than roots during editing and was corrected before verification.
- M4: The first 320px utility screenshot used three rows after adding initials/name to the user trigger. A two-row mobile grid now keeps the initials avatar in the first row and Search/New Request in the second; the full accessible user name remains on the trigger. Focus/overflow checks and the updated screenshot pass.
- M4: Existing Admin Settings useBlocker works with shell NavLinks. React StrictMode made two initial mocked permission calls; no further call occurred when navigating to Create within the mounted shell.

- M3: Initially-open dialogs under StrictMode can lose a scheduled explicit focus request during effect cleanup. Dialog now schedules contained initialFocusRef placement for each open effect, even if the native modal is already open; a permanent initial-open regression passes.

- M3: Native Chromium dialogs can expose browser chrome at Tab boundaries. The corrected permanent test verifies inert background controls, dialog focus, Escape/button close and restoration rather than imposing an inaccurate custom focus-loop assumption. No new dialog library is needed.
- M3: Existing AdminDialog's manual first-element focus could override native autofocus. Shared Dialog retains native initial focus and only applies a caller-provided contained initialFocusRef. ConfirmDialog preserves safe Cancel-first focus and now blocks Escape while busy.
- M3: Four-token/ten-theme unit checks and the production build pass. The fixture is absent from dist/tests/fixtures, and no product-page/router file has changed. The synthetic fixture screenshots are not product-page dark baselines.

- M2 production closeout: the previous first-paint test held only /src/main.tsx, so it could not demonstrate production initialization. It now matches the hashed production entry too and verifies the entry was actually held before inspecting pre-React state. Both dev and preview report no-cache for the bootstrap; deployed-host headers remain unknown.

- M2: Profile's prior default was already system, but unvalidated persisted values could leak into UI state and write errors could throw. Shared normalization retains system fallback; blocked writes now remain session-only and preserve that session state across later changes.
- M2: Classic head-script bootstrap avoids a second inlined resolver. React subscribes to the very same store; storage and OS listeners are removed after the final unsubscribe and restored on mount, including StrictMode remounts.
- M2: The existing radio inputs are visually hidden behind labels. Browser verification uses the real label and keyboard rather than changing the page or forcing pointer events.

- M1 closeout: `.agent/tmp/` was untracked but not ignored; the targeted ignore rule now prevents accidental inclusion of screenshot evidence. Parallel lint/E2E directory scanning caused a transient ENOENT; sequential lint passes.

- 2026-09-19: New status-danger #BE123C yields 6.29:1 on white; legacy danger.500 remains unchanged. Status surfaces and other new normal-text pairs pass 4.5:1; focus/strong-border pairs pass 3:1 on documented surfaces.
- 2026-09-19: Before/after Home/Create/Detail/Settings PNGs at 1440x1000 are byte-identical. Local artifacts are `.agent/tmp/m1-parity/before/` and `after/`; temporary fixture harness removed. This does not establish exhaustive visual or live-service parity.
- 2026-09-19: Lint initially rejected CommonJS in the two new build/test modules. A file-scoped Node/CommonJS override resolves this without relaxing application TypeScript checks. Final lint passes.

- 2026-09-18: Profile preferences persist theme/density locally but there is no theme provider or CSS theme consumer.
- 2026-09-18: Dashboard enriches every valid request row using a detail request, even when labels already exist.
- 2026-09-18: Search reads only `q` from the URL; most operational navigation and filter state remain local.
- 2026-09-18: Search also enriches every result with detail, up to 26 data calls at its default page size. Detail subresource failures silently normalize to empty arrays. These findings require bounded behavior work, not a styling workaround.
- 2026-09-18: jsx-a11y is installed/registered but recommended rules are not enabled. There are no automated visual snapshots or applied dark theme.
- 2026-09-18: Representative Playwright capture passed (40.4s); temporary harness was removed. Sparse existing mocks produce empty queues and missing detail labels; screenshots document that limitation and do not establish deployed behavior.

## Decision Log

- M4: Use `lg`=1024px for the persistent 224px rail, verified at neighboring 768 and wide 1440 viewports. Use a native dialog for compact navigation and a disclosure for user actions; no icon/menu framework or decorative motion.
- M4: Share existing admin section metadata, retain AdminProtected and server authorization, and keep page data out of AppShell. Route change focus uses first heading/main after transient overlays close; query-only updates do not steal focus.
- M4: Preserve unmigrated content readability with a scoped legacy light canvas/color-scheme, not a broad class migration. Capture deterministic visual evidence but defer committed snapshots until one cross-platform renderer/font environment is pinned.

- M3: Keep common component locations as stable consumer APIs. StateBadge/PriorityChip/AdminDialog use compatibility exports; ConfirmDialog and ErrorState use Button, LoadingRows uses Skeleton. All page JSX, KpiCard, PaginationControls and page-local controls/headers remain unchanged.
- M3: Use native Field-integrated controls and static Skeletons. Field owns ID/label/help/error relationships; one control per Field. No custom selection system, animation, icon/primitive framework or density behavior.
- M3: Add tests/fixtures to existing TypeScript coverage and CI fixture path triggers. test:primitives selects the permanent Playwright suite, also discovered by full functional E2E. No new runner/dependency.

- M2 production closeout: retain the external bootstrap after successful built-output/browser proof. Document its deployment/cache/failure contract; add permanent preview verification using current tools and CI build, rather than rewriting a working architecture. No M3 work.

- M2: Preserve Save Preferences semantics: radio selection is draft until Save. Merge only changed fields with latest stored fields, including unknown fields; do not introduce a second theme key or activate density/email behavior.
- M2: Keep dark palette values exclusively in JSON, enforce matching role sets, and generate the sole activation selector :root[data-theme="dark"]. Root color-scheme expresses the same effective theme for native controls.
- M2: Reuse built-in Node VM tests for the actual classic bootstrap and existing Playwright for reliable pre-React/browser verification; add no dependencies. Record only isolated semantic-consumer dark screenshots until page migration.

- M1 closeout: keep the adapter, four permanent token tests and all narrowly scoped tooling changes; no duplicated production token values or temporary-only tooling found. Update only artifact exclusion and closeout evidence. M2 remains unauthorized.

- 2026-09-19: Blueprint v1.1 and the user's M1 request govern over historical audit-only scope and old milestone numbering. Continue on the existing `feat/ui-ux-foundation` branch and preserve user-provided untracked design documents.
- 2026-09-19: Use existing Tailwind plugin infrastructure rather than generated/checked-in CSS; one JSON source generates legacy colors, new semantic utilities and root variables. Keep target small/medium/large radii at 4/8/12px and legacy control/card at 14/20px.
- 2026-09-19: Use Node's built-in test runner with existing PostCSS/Tailwind for focused token contracts. Add `test:tokens` and CI path coverage for design/Tailwind/tests. No dependency added.

- 2026-09-18: Preserve working native dialog and semantic-table behavior; classify by evidence rather than replacing libraries.
- 2026-09-18: Do not invent routes or backend capabilities to make current code resemble the Blueprint. Record reconciliation items and separate future product decisions.
- 2026-09-18: Preserve the user's untracked Blueprint and existing branch. This task does not request a new branch, commit or PR. Full checks remain mandatory at the later implementation/PR gate; this documentation audit uses reference/scope checks and representative mocked browser capture.
- 2026-09-18: M1 is additive and compatibility-preserving; accessibility and screenshot evidence start before consumers migrate, even though their cross-cutting completion gates are M7 and M9.

## Outcomes & Retrospective

Current outcome: M4 App Shell/navigation is implemented and passes the full local gate. AppShell composes one authenticated main, global actions, desktop/compact navigation, accessible user disclosure, route focus and permission-aware Admin links. AdminShell retains section composition without a second sidebar. The existing Settings dirty navigation remains protected. Visual captures and API request counts are recorded above and in `docs/design/05-app-shell-navigation.md`. M5 Dashboard is the next separately authorized product-content milestone; M4 made no dashboard data or API optimization.

Current outcome: M3 shared accessible primitives are implemented and verified locally, with compatibility exports and no page redesign. Ten primitive cases pass within a clean 22-test E2E run; production theme preview stays green. See the active M3 section and component guide for APIs, limits, scope and the exact M4 handoff. Older milestone outcomes below are historical.

Current outcome: M2 is complete and verified locally, as recorded at the top of this plan. M1/audit outcomes below are historical. Theme behavior is usable through the existing preference page while broad legacy visual migration remains deferred to later milestones. Next is M3 shared primitives, not App Shell or page redesign.

M1 outcome (2026-09-19): additive token foundation complete. Exact pnpm typecheck/lint/build/test:e2e commands hit the known pre-script launcher block; npm run typecheck, lint, build and test:e2e all pass (139 modules, seven mocked Chromium tests in 20.2s). npm run test:tokens passes four tests, including emitted CSS and opacity. git diff --check passes. Existing representative baseline inspected; four fresh before/after PNG pairs are identical. No visual migration, dark runtime, density activation or business behavior change. Changes are the nine M1 files listed above plus this plan; user Blueprint/inventory files are preserved. No commit or PR requested.

Recommended exact M2 scope: browser-local Light/Dark/System provider preserving `rt.profile.preferences` schema and unrelated fields; validate storage, follow prefers-color-scheme, handle subscription cleanup/cross-tab updates, first paint and root color-scheme. Add dark mappings to the authoritative JSON and adapt generated root selectors, with tests for theme resolution/persistence/system changes. Do not activate density/email behavior, change routes/RBAC/APIs or redesign pages. Document legacy light-only consumers and begin dark baselines only once the runtime works.

The inventory and nine-milestone sequence are complete from current code. Blueprint reconciliation items are numbered in the inventory; they are not silent edits to the Blueprint. No redesigned interface has been implemented. Verification: 22 source references resolve; new Markdown whitespace checks and git diff --check pass; tracked application source remains unchanged. The temporary mocked capture passed in 40.4 seconds and produced 18 local images under `.agent/tmp/ui-baseline/`; the harness was removed. Danger-500 on white calculates to 3.67:1 and needs a semantic error-text alternative. Full build/lint/typecheck/functional checks were not rerun for this documentation-only, non-PR task; they remain required for subsequent implementation PRs. The next bounded implementation is M1 only; current routes, API payloads and permission behavior must remain unchanged. Deployment, exhaustive route/state screenshots and full assistive-technology verification are separate evidence gaps.
