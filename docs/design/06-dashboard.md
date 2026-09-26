# Operational Dashboard specification (M5A)

## M5D visual calibration

M5D retains every M5C data request, URL value, queue/filter predicate, KPI meaning and route. The Dashboard result uses a semantic table at desktop widths and compact list below 1024px, now without an outer results frame or an Open action column. Subtle horizontal separators and row hover/focus-within surfaces carry comparison; there are no vertical cell borders or per-request cards. The request title is the single native link to `/requests/{request_id}`; absent public IDs leave non-link text, never a placeholder route. Keyboard focus remains visible. Human ID remains readable but is not a second tab stop.

PriorityIndicator keeps its existing prefixed default for other consumers and for compact rows without a Priority heading. In the desktop Priority column only, its concise form displays Low/Normal/High/Urgent without `Priority:` or a badge fill; high/urgent retain semantic danger text. The queue selector is a flat horizontal group with a selected bottom marker and surface, still `aria-pressed` buttons. Inactive quick filters are quiet ghost controls; active filters gain a surface and weight without permanent pill outlines. Four KPI cells remain one restrained strip with slightly stronger number weight. Borders use semantic tokens; no shadows, gradients or new colors were introduced.

Home's search field never filters the current queue: it submits the typed value to the existing global `/search?q=...` destination. The label, placeholder and submit text now say **Search all requests** to make that scope clear. The AppShell Search link remains the direct destination, while the Home field is a query shortcut. No Search-page redesign was made.

Updated deterministic fixture captures under ignored `.agent/tmp/m5-dashboard/` were inspected at 1440 Light/Dark, 1024 Light, 768 Dark and 320 Light, plus existing empty/error states. No golden snapshots are committed because the established Windows/Ubuntu renderer/font baseline is not stable. The existing M5C mocked API/production-preview tests remain the behavioral gate; live deployment and a full assistive-technology audit remain separate.

## M5C implementation reconciliation

The sections below preserve the M5A pre-implementation audit and proposed M5B contract as historical evidence. M5C now uses the implemented M5B list-only summaries in the sibling API checkout at `dc3b3a2`; deployment remains unverified. `src/api/dashboard.ts` no longer imports Request Detail or issues per-row Detail reads. Home renders four tenant-wide KPIs from `/api/dashboard/summary/` and compact rows from paginated `/api/requests/`; the latter uses the same shared auth/tenant client. Initial production-preview browser evidence is one summary GET plus one list GET, with zero row Detail GETs. Queue/filter/page changes use a list GET; Refresh uses both endpoints.

Home state is URL-backed: `queue` is one of `my_tasks`, `other_tasks`, `my_requests`, `recently_updated`; `quick` is one of `my_open`, `high_priority`, `closed`, `unassigned`; `page` is a positive integer; `sort` is `-updated_at` or `updated_at`. Defaults are omitted. Invalid values are canonicalized; My Open selects My Tasks with `mine=true&closed=false`, never a contradictory active queue. The redundant Recently Updated quick button from the earlier M5A proposal was omitted because the latest M5C authorization explicitly requires four quick filters and the queue already offers the same sort. The Recently Updated queue remains. KPI cells stay informational: no existing list predicate exactly matches all four aggregates.

At wide widths the semantic table shows human ID, title, status, priority, assignee, requester, flow and updated time. Below 1024px it becomes a compact list; requester/flow appear on the secondary line at 768px and are omitted from the 320px row, remaining available in Detail. Missing public `request_id` disables Open. Missing nested labels show readable unavailable text, not UUIDs or a fabricated assignee. Summary/list loading, failure, retry and empty states are independent; a failed list never also shows the empty state. Same-scope refresh retains prior rows with an explicit busy notice; changed-scope loading does not show stale rows. Home search submits immediately to `/search?q=...` and does not redesign Search.

Permanent `tests/e2e/dashboard.spec.ts` uses intercepted API fixtures to exercise fields, filters, URL history, navigation, empty/error/retry, four widths, and Light/Dark/System. `playwright.dashboard.preview.config.ts` runs those tests against the built app and asserts the production initial call count. The screenshots under ignored `.agent/tmp/m5-dashboard/` are review artifacts, not cross-platform golden snapshots. Live API timings, deployed M5B behavior, WCAG audit and hosted CI are separate verification gates; no latency gain is inferred solely from request count.

Normative: `00-Request-Tracker-UI-UX-Design-Blueprint-v1.1.md` sections 14-16 and R5/R10. This is an implementation specification, not a redesigned page. Current evidence is `src/pages/HomePage.tsx`, `src/api/dashboard.ts`, `src/components/dashboard/KpiCard.tsx`, `src/components/requests/{RequestTable,StatusBadge,PriorityIndicator}.tsx`, `src/api/{requestDetail,requestDisplay}.ts`, the M4 AppShell and read-only sibling API source at `906ee21cf165abdab0a07cb92ad28cee85e1a335`. That checkout/deployment status is not established by this document. API acceptance is in `docs/plans/sprint-4/m5-dashboard-data-contract.md`.

## Mission and current behavior

Home answers **“What needs my attention now?”** using four tenant-wide KPI counts, a request-list workspace, four queues, five quick filters and a jump to unified Search. The global M4 shell already provides New Request; Home has Refresh and the search form. No BI chart or recent-activity module is supported by current Home data. The current screen displays rows in a semantic table and navigates via public `request_id`, disabled when missing.

Today Home calls `GET /dashboard/summary/` once and `GET /requests/` once on mount through separate effects, then GETs `/requests/{request_id}/` for every normalized list row with a public ID. It waits for all detail fetches before showing rows. Failed detail fetches quietly leave original labels. Summary failure clears KPI data and shows unavailable (`—`), not plausible zero; list failure clears rows and shows ErrorState, **but also** renders EmptyState because the empty branch does not exclude `listError`. Background list refresh hides existing rows behind LoadingRows. These are M5C state defects, not permission to fabricate data in M5A.

### Exact current KPIs

Source: Web `normalizeSummary` maps the clean API `DashboardSummarySerializer` fields; API `build_dashboard_summary` uses the tenant-filtered request queryset. Web also tolerates historic alias/wrapper shapes, but the current API returns top-level snake_case values. Counts are not selected-queue counts.

| Visible label | API field | Exact checked-out API meaning | Click now? | Safe target action / ambiguity |
| --- | --- | --- | --- | --- |
| Open | `open` | Tenant requests with `status.category` case-insensitive `open`; not limited to assigned user or nonterminal | No | Do not link to `closed=false`: that includes waiting/in-progress and excludes terminals, so it does not equal Open. Remain informational until exact status-category list filter exists |
| In Progress | `in_progress` | Tenant requests with `status.category` case-insensitive `in_progress`; no assignee/terminal predicate | No | No exact current list predicate; remain informational |
| Due Today | `due_today` | Requests with `due_at` **date** equal to server `timezone.localdate()`, excluding closed-category and terminal statuses | No | No due-today list predicate; do not make a fake click target |
| Overdue | `overdue` | Same active predicate, `due_at` **date before** server today; no due date is excluded by comparison | No | No exact overdue list predicate; remain informational |

The API also returns `waiting`, `closed`, `assigned_to_me`, `unassigned`, but Home does **not** display them. Do not substitute those for current four or invent Critical/Due Soon. API `open` can include a terminal status categorized open whereas due counts exclude terminal statuses. The API uses process/local timezone; this checkout does not prove tenant setting `default_timezone` changes those counts. Clarify timezone/terminal business expectations before giving KPI a new action or label. `KpiCard` currently shows compact label + 24px numeric or skeleton; cards have legacy shadow/radius, and no onclick.

### Exact current queues and quick filters

All four tabs call **the same** `GET /requests/` with `page=1&page_size=10&sort=-updated_at`; URL encoding/order is Axios controlled. There is no Home pagination UI despite `count` being returned. Tab/filter state lives only in Home React state; returning from Detail remounts and resets to My Tasks with no quick filter. Quick filter selection persists when switching tabs **within** one mount. Browser Back restores `/` but not tab/quick filter. User-visible tab names are intentionally preserved.

| Tab (state key) | Additional Web query parameter | Code-based intended purpose | Current API effect |
| --- | --- | --- | --- |
| My Tasks (`my_tasks`, default) | `mine=true` | Requests assigned to signed-in tenant user | Parameter ignored by checked-out API; generic tenant list |
| Other Tasks (`other_tasks`) | `mine=false` | Requests assigned to others or unassigned | Parameter ignored; generic tenant list |
| My Requests (`my_requests`) | `requested_by_me=true` | Requests whose requester is signed-in tenant user | Parameter ignored; generic tenant list |
| Recently Updated (`recently_updated`) | none | Tenant list by recency | API queryset's default `-updatedat` produces recency ordering; `sort` parameter is ignored |

| Quick filter | Param changes over selected tab | Current behavior/evidence |
| --- | --- | --- |
| My Open (`my_open`) | `mine=true&closed=false`; replaces Other Tasks `mine=false`, adds to My Requests | Intended assigned active work; server currently ignores both. Active tab can misrepresent resulting intended query |
| High Priority (`high_priority`) | `priority=high` | Exact `high`; `urgent` is **not** included or relabelled Critical |
| Recently Updated (`recently_updated`) | none | Repeats the same request and sort, only changes selected button style |
| Closed (`closed`) | `closed=true` | Intended closed requests in selected queue |
| Unassigned (`unassigned`) | `assignee=unassigned` | Intended null assignee, within selected queue |

There is no arbitrary status facet on Home; only My Open/Closed attempt status-like filtering. The API implementation currently applies **none** of these queue/quick-filter params. Pagination is real DRF page/size, but Home fixes page to 1. The API default `-updatedat` coincidentally matches Web's sent `sort=-updated_at`; explicit sort is not implemented. Do not claim the four displayed lists are different tenant subsets until M5B filter acceptance passes. `mine=false` must include null assignee under the proposed contract; M5B tests define this rather than guessing from the label.

### Current row enrichment, field by field

`RequestSerializer` currently sends flat IDs and all primitive row values. `RequestDetailSerializer` sends nested status/flow/requester/assignee. `getDashboardRequests` normalizes the list, then overwrites eight fields from Detail for each request_id. Only five are currently rendered in RequestTable; statusCategory affects badge tone. No Detail value is needed for row navigation or a Home behavior guard.

| Overwritten normalized field | Detail source | Equivalent current list response? | Current Home use | Classification |
| --- | --- | --- | --- | --- |
| `status` | Detail `status.name` (category fallback) | Only `status_id` UUID; no readable name; Web UUID guard yields `-` | Badge text | Presentation-required; new list label needed |
| `statusCategory` | Detail `status.category` | No category | Badge tone; label remains visible | Presentation-required; new list category needed |
| `assignee` | Detail `assignee.display_name` then email or null | `assignee_id` only; no label. Assigned rows can misleadingly show `Unassigned` without Detail | Assignee cell | Presentation-required; null must mean truly unassigned |
| `requester` | Detail `requester.display_name` then email | `requester_id` only; no label | Requester cell | Presentation-required; new label needed |
| `flow` | Detail `flow.name` | `flow_id` only | Not currently rendered | Presentational enrichment wasted today; Blueprint row recommends Flow at wide widths |
| `priority` | Detail `priority` | Yes, list has priority | PriorityIndicator text/tone | Redundant detail overwrite; list sufficient |
| `dueAt` | Detail `due_at` | Yes, list has due_at | Not currently rendered | Redundant and currently unused; optional target due context |
| `updatedAt` | Detail `updated_at` or original | Yes, list has updated_at | Updated cell | Redundant detail overwrite; list sufficient |

`requestId` and `id`/human_id navigation identity, title, and count come directly from the list and are **not** overwritten by detail. The table currently shows human ID, title, status, priority, assignee, requester and updated time. It does not show flow, due_at or created_at. The priority domain is exactly `low`, `normal`, `high`, `urgent`; preserve server text for unknown values without inventing a fifth priority.

## Minimum target row representation

The target is an **additive** list representation, not a full Detail response. Existing flat fields remain for compatibility. The recommended nested summaries and filter contract are defined in `m5-dashboard-data-contract.md`.

| Field | Current source | Target source / required? | Why it is justified |
| --- | --- | --- | --- |
| `request_id` | List public UUID | Existing list, required | Stable Detail link and row key; missing ID disables navigation, never `/requests/-` |
| `human_id` | List | Existing list, required for usual display | Readable request identity; never use it as the Detail route key |
| `title` | List | Existing list, required | Primary scannable row text |
| `status_id` + `status.name` + `status.category` | Flat status_id plus Detail | Existing ID plus new list nested summary, required | Text badge and category tone; retain text with color |
| `priority` | List | Existing list, required | Current row and High Priority quick filter; normalize low/normal/high/urgent |
| `assignee` label or null | Detail | New list nested user summary/null, required | Current visible assignee and accurate Unassigned |
| `requester` label | Detail | New list nested user summary, required | Current visible requester |
| `flow.name` | Detail | New list nested flow summary, required for proposed wide row | Blueprint 14 recommends Flow; avoid another lookup when displayed |
| `updated_at` | List | Existing list, required | Current updated cell, default recency |
| `due_at` | List | Existing list, nullable; optional row display | Existing Due Today/Overdue context and Blueprint's optional due information; do not invent due-soon |

`created_at`, description, custom_fields and full nested details are not required by Home's target row; keep existing list fields backward-compatible. Tags, comment count, SLA indicator and activity are outside this Dashboard row contract without evidence of a current data source or user decision. No row makes its own Detail request after M5B/M5C.

## Request-count contract

Let N be the number of visible rows with a valid public request_id (at most 10 today). Data requests exclude the separate `/admin/me/permissions/` shell call.

| Action | Current Web data requests | M5C target after M5B |
| --- | --- | --- |
| Initial Home | `1 summary + 1 list + N detail = 2+N` (up to 12) | 1 summary + 1 list = **2**, 0 Detail |
| Switch queue | `1 list + N detail = 1+N` (up to 11) | **1 list**, 0 Detail |
| Change quick filter | `1 list + N detail = 1+N` | **1 list**, 0 Detail |
| Paginate | No current control; Home always page 1 | **1 list**, 0 Detail |
| Manual Refresh | `1 summary + 1 list + N detail = 2+N` | **2**, 0 Detail |

Rows lacking request_id currently skip enrichment; on a detail-fetch failure, original normalized row survives with potentially wrong/missing labels. In React StrictMode development, mount effects may run twice; count against one logical production load and report actual network counts separately. Shell's Admin permission-context call is separate (M4 measured 2 on dev mount, 0 additional when navigating within shell). No latency gain is asserted from HTTP count alone.

## Target Dashboard UX (M5C)

1. Page context: keep the visible **Home** heading under M4 AppShell. The shell's global New Request link is the primary create action; do not duplicate it in Home. Optional one-line context uses concrete operational language, not a hero/marketing block.
2. Attention strip: four compact, unframed KPI cells (Open, In Progress, Due Today, Overdue) with 24-32px maximum useful numbers, small labels, 1px dividers/surface contrast and no permanent shadow. Show `—` when summary unavailable; never a fake zero. No decorative chart, new KPI, Recent Activity or inaccurate clickable filter. All four currently have no click action. A future click needs an API predicate that returns exactly the counted set; `closed=false` is not an Open predicate.
3. Primary queue: a named heading/count and dense results region, placed before secondary controls when scanning. Keep My Tasks, Other Tasks, My Requests, Recently Updated. Use ordinary buttons with a keyboard-operable group/segmented control and aria-pressed (or true tabs with tab/tabpanel keyboard behavior, if fully implemented). The active label must be visible and not color-only. Keep queue state in URL after M5C; no new queue routes.
4. Filter/toolbar: current My Open, High Priority, Recently Updated, Closed and Unassigned quick choices, server count, stable sort and pagination. My Open should select My Tasks plus nonclosed predicate; Recently Updated selects the existing queue and recency sort. Other filters scope to the active queue. Display effective filter state and a Clear control only when relevant. Search remains navigation to `/search?q=...`; M4 global Search stays reachable. No new filter vocabulary without M5B support.
5. Results: use shared StatusBadge, PriorityIndicator, Button/EmptyState/ErrorState/LoadingRows and a semantic table/list. RequestTable's existing caption/scoped headings/focusable scroll region are a useful base. On wide layouts show human ID, title, status, priority, assignee, requester, flow, updated time; due only when supported by row and useful. A row with absent request_id must not navigate. Text labels supplement every color. No nested cards per row.
6. States: summary and list load/fail independently. Initial loading uses structural static skeletons. During same-query refresh, keep labelled prior rows and show local busy status; on queue/filter change do not misrepresent old rows as results for the new scope. Empty dataset and zero filtered results use different copy; list error shows retry **without** simultaneous EmptyState. If summary fails but list succeeds, keep list and unavailable KPIs; if list fails but summary succeeds, keep real KPIs and a list-region ErrorState. If required nested row labels are missing/malformed, surface unavailable label/row error, not a fabricated assignment/status. Save/partial-data success messages are not needed for read-only Dashboard.

### URL and keyboard acceptance

Recommend `/` query state: `queue=my_tasks|other_tasks|my_requests|recently_updated`, `quick=my_open|high_priority|recently_updated|closed|unassigned` when meaningful, `page`, and `sort` when not default. Defaults may be omitted but must deserialize consistently. Keep page_size=10 unless the UI offers size selection. `/search?q=...` remains separate. Queue/filter changes reset page to 1; Back/Forward and return from Detail restore queue/quick/page/sort. Invalid/unknown URL values fall back safely and update only when needed. Do not implement URL state in M5A.

Use one semantic h1, clear control labels, native keyboard buttons, visible focus and aria-pressed/aria-current where appropriate. Do not claim tabs without arrow-key/selection behavior. Request rows remain a table at widths where columns are useful; Open is a named link/button with public request_id. Focus after page/queue change should not jump unexpectedly from controls; announce count/loading in a live region without spamming status on every cell. Preserve WCAG 2.2 AA token pair contrast and 24px target constraints with necessary adjacent spacing, no color-only status or hidden essential actions. Test 200% zoom, long titles/IDs and keyboard-only queue-to-detail/back paths.

### Responsive acceptance

| Width | Primary visible row data | Secondary/omitted first-view data | Layout |
| --- | --- | --- | --- |
| 1440 | human ID/title/status/priority/assignee/requester/flow/updated; due if relevant | description, internal IDs omitted | Full-width dense semantic table under persistent M4 rail; compact KPI strip, no isolated floating cards |
| 1024 | ID/title/status/priority/assignee/updated | requester/flow can move to secondary line or internal scroll; due shown only when it changes attention | Preserve desktop density with constrained tracks; no title occlusion |
| 768 | ID/title/status/priority/assignee and updated | requester/flow on secondary line or Detail | Compact shell; narrow table/list rows, not a column of giant cards |
| 320 | ID/title, status/priority, assignee/updated, Open action | requester/flow may be omitted from initial row but remain in Detail; due if actionable | Two/three-line compact rows, wrap long text, touch/keyboard reachability, no page-level overflow |

Theme: M5C removes `legacy-page` only from Home once all its surfaces/controls use semantic M1-M3 roles. Verify Home content and M4 shell under Light, Dark, System->Light, System->Dark, not just the shell. Pin test fixture/locale/time where screenshots are used; capture representative populated/empty/error states at widths above. Full-page golden snapshots require an approved cross-platform renderer/font baseline (M4 documented that gap), so deterministic computed colors and visual evidence remain the interim gate.

## Stage gates

**M5B rt-api:** extend tenant-scoped list read serializer and implement the exact predicates/query validation in `m5-dashboard-data-contract.md`; expose them through generated `/api/schema`, prove no per-row ORM query growth, pagination/sort, nulls, tenant/auth negatives and additive compatibility. No new route or SQL by default.

**M5C rt-web:** only after M5B contract is available, remove Dashboard detail enrichment, wire new list summary shape, build the hierarchy above and URL state, retain current four queues/four KPIs/five quick controls, fix state overlaps, render all states in four theme modes and tested widths, and validate **zero** per-row Detail requests with real API Network evidence. Do not optimize Search's independent fan-out, rename business concepts or implement unsupported KPI actions. Full Web gates and targeted browser/keyboard tests pass before sign-off.
