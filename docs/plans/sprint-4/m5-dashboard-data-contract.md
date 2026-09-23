# M5 Dashboard list contract and staged acceptance

## Purpose and evidence boundary

This is the M5A documentation handoff for separate M5B (`rt-api`) and M5C (`rt-web`) work. No endpoint, serializer, route, SQL or Web behavior changes are made here. Inspected Web branch `feat/dashboard-foundation` at M4-merged baseline and read-only sibling API checkout at `906ee21cf165abdab0a07cb92ad28cee85e1a335`. The sibling checkout's local `main`/remote refs are stale; its code is evidence about the checked-out API implementation, not proof of deployment. M5B must confirm current API main and generated `GET /api/schema` before writing. The UI spec is `docs/design/06-dashboard.md`.

## Current contract and mismatch

- Web `src/api/dashboard.ts` calls `GET /dashboard/summary/` and `GET /requests/`. `getDashboardRequests` normalizes every list row, then GETs `/requests/{request_id}/` once for each row with a public ID, even if list labels are present. Detail errors are silently ignored and the original row is retained.
- API `apps/rt/views.py:RequestViewSet` uses `RequestSerializer` for list and `RequestDetailSerializer` only for retrieve/detail_bundle. The tenant-scoped queryset already `select_related("flowid", "statusid", "requesterid", "assigneeid")`. The current list serializer in `apps/rt/serializers.py` emits flat public IDs, title, description, priority, custom_fields, due_at and timestamps, but no nested flow/status/requester/assignee labels. Detail returns those nested objects. Thus the read-only list already owns the database join needed to emit labels without one HTTP detail request per row.
- `RequestViewSet.get_queryset` has no list-specific query filtering; the checkout's `REST_FRAMEWORK` has pagination but no default filter backend. The Web's `mine`, `requested_by_me`, `closed`, `priority`, `assignee`, and `sort` values are presently ignored by this API implementation. `sort=-updated_at` appears correct only because the queryset defaults to `-updatedat`. `page` and `page_size` are real DRF pagination parameters (`apps/common/pagination.py`, default 25, max 100); Home explicitly sends page 1 and size 10. This gap means UI queue labels currently express an intent, not a server-guaranteed membership rule.
- `GET /dashboard/summary/` is a separate tenant-wide aggregate via `build_dashboard_summary`, not tied to the selected queue. `DashboardSummarySerializer` has exact fields `open`, `in_progress`, `waiting`, `closed`, `due_today`, `overdue`, `assigned_to_me`, `unassigned`. Web displays four. Source: API `apps/rt/views.py` and `apps/rt/serializers.py`.

## Recommended M5B contract

**Extend the existing `GET /api/requests/` list representation and implement documented list filters.** Keep the URL, auth/tenant enforcement, DRF pagination envelope and existing flat fields unchanged. Use a list-only read serializer (or an equivalently additive read representation) so POST/PATCH write fields and validation do not change. Reuse the existing `select_related` queryset. Add read-only nested summaries using the same public field names as Detail, with bounded fields:

| New list field | Exact minimum contents | Why |
| --- | --- | --- |
| `status` | `{status_id, name, category}`; `is_terminal` is acceptable if reusing `StatusSummarySerializer` | Badge text and category-based tone; current list only has status_id |
| `requester` | `{user_id, display_name, email}` | Readable label; current list only has requester_id |
| `assignee` | same shape or `null` | Readable label/Unassigned; current list only has assignee_id |
| `flow` | `{flow_id, name}`; description is unnecessary | Blueprint-approved desktop request-row Flow label; current list only has flow_id |

Existing fields `request_id`, `human_id`, `title`, `priority`, `status_id`, `flow_id`, `requester_id`, `assignee_id`, `due_at`, `updated_at` remain. Existing `description`, `custom_fields`, `created_at` remain for backwards compatibility, although M5C does not need them for current rows. Do not create a second human ID or send raw Django `*_id` internals. The output must use a real public request_id, not `id`, human_id, or `-` as an Open target. Null assignee is legitimate; nested labels use display_name then email. Status/flow/requester label absence is an explicit data-error state or readable fallback, never a UUID rendered as a name. Do not include comments, attachments, activity, tags or full Detail payload solely for Home.

List query parameters to implement for the existing Web vocabulary:

| Parameter | Semantics / validation |
| --- | --- |
| `page`, `page_size` | Existing DRF numbered pagination, max 100; preserve `{count,next,previous,results}` |
| `sort=-updated_at` | Default and Web's only current value. Apply explicitly, with a stable public-ID tie-breaker. If accepting `updated_at`, document/test it. Reject unsupported sort names rather than silently ignoring |
| `mine=true` | `assignee_id` equals current tenant domain user |
| `mine=false` | assignee differs from current tenant domain user **or is null**, so Other Tasks includes unassigned work |
| `requested_by_me=true` | `requester_id` equals current tenant domain user; absent/false leaves unfiltered |
| `closed=true` | closed category or terminal status, as documented in one server predicate; `false` means nonclosed and nonterminal, aligning the active predicate used for due KPI |
| `priority=low|normal|high|urgent` | exact normalized value, not an invented Critical; current High Priority quick filter sends only `high` |
| `assignee=unassigned` | assignee IS NULL; reject unknown symbolic values unless a separate contract is approved |

Filters combine by AND except that the Web currently overwrites `mine=false` with `mine=true` for My Open before sending a query. The API should never infer queue names from display labels. If self filters are requested but no tenant domain user can be resolved, return a clear 403/validation response; in particular, never let `mine=false` degrade to the entire tenant list. Invalid booleans, priority, symbolic assignee or sort return a structured 400. Tenant queryset always applies first, and DB filtering occurs **before** pagination. Do not load a whole tenant table and filter in Python. No new permission model or different request visibility is implied by the UI; apply the existing API policy and test denied/cross-tenant cases.

Query semantics needing an explicit M5B/M5C contract review before implementation: the current Web lets My Open override an Other Tasks tab and combines it with My Requests. In M5C, make My Open a shortcut to the existing My Tasks queue plus `closed=false`; keep other quick filters scoped to the active queue. Recently Updated quick filter should select the existing Recently Updated queue and `-updated_at` ordering. This removes a misleading active-tab/query mismatch without inventing a fifth queue. Record the final query examples in OpenAPI and Web tests. If retaining the old combination UI is required by product owners, make the effective scope visible rather than silently showing a false tab label.

## Strategy comparison

| Option | Compatibility/reuse | Requests/payload | Implementation cost and risk | Decision |
| --- | --- | --- | --- | --- |
| A. Enrich existing GET `/api/requests/` | Additive; usable by Home and later Search/queues; same tenant-scoped pagination and auth | List is one HTTP call, plus summary; four compact nested summaries per row. `select_related` already avoids per-row ORM lookups | List-only serializer, validated query filter, OpenAPI/tests. Check other strict clients against additive JSON. Payload growth bounded by page_size | **Recommend** |
| B. New Dashboard-specific row endpoint | Existing list untouched, but another row contract/filters and later Search reuse require duplication | One list HTTP call plus summary, similar payload | More routing/serializers, pagination and tenancy paths to maintain; Dashboard coupling | Defer unless measurement shows list contract cannot be extended safely |
| C. Bundle queue rows into GET `/api/dashboard/summary/` | Changes aggregate shape/meaning; list and summary state become coupled | Initial request could be one, but queue/filter/page changes transfer rows with all aggregates or need another call | Harder independent error/retry/pagination and larger response, no natural Search reuse | Reject for current scope |
| D. Frontend metadata lookups/batch label map | No row contract change, potential reusable lookup cache | One list plus extra user/status/flow calls; missing/inactive labels, hydration and cache invalidation | Tenant-safe mapping and error handling in Web, repeated joins at app layer; not a durable row contract | Reject |

## Request-count budget and verification

Let `N` be visible rows with a public request_id (0..10 today). Exclude the separate Admin permission-context GET. Current Web data calls: initial Home = `GET summary + GET list + N GET detail` = `2+N` (up to 12); queue/quick-filter change = `1+N` (up to 11); manual refresh = `2+N`. There is no current Home pagination control: page change is not a current action. In development StrictMode mount effects can repeat; do not describe `2+N` as an observed production latency measurement.

M5C target after M5B: initial Home exactly **2 Dashboard data requests** (summary and one list); changing queue/filter/page exactly **1 list request**; manual refresh **2** (summary + list); **0** Detail requests for rows. Keep the shell permission lookup separate: one logical initial context read on a fresh authenticated route, which can appear twice in dev StrictMode and should not refetch on client navigation within the shell. Record Network counts for 0, 1 and 10 rows, query params, payload size before/after and real-server response timing; do not claim a latency gain without measurement. Tests must fail if a row triggers a Detail URL.

## M5B exact rt-api scope and acceptance

Scope is `apps/rt/serializers.py`, `apps/rt/views.py`, generated `GET /api/schema` annotations and focused API tests (proposed `tests/test_dashboard_request_list.py`). `rt_api/urls.py`, SQL and DB schema are expected to stay unchanged. Before editing, revalidate the API checkout against current main/deployed schema; this read-only checkout may not reflect deployment. The request list's existing `select_related` allows bounded nested summaries. Keep `RequestSerializer` writes unchanged and make list-only additions read-only. Confirm no extra ORM queries per added row with `assertNumQueries` or the project's equivalent, including **result sets containing 0, 1 and 10 rows** at valid page sizes; use tenant fixture data with mixed users/statuses/flows and null assignee.

Acceptance: exact labels/nulls/IDs and paginated envelope; deterministic sort/tie break; correct true/false self filters, closed/active, high vs urgent, unassigned, filter combinations and page boundaries; invalid params yield 400; missing tenant/self context denies safely; cross-tenant rows and nested identity labels never leak; permissions remain server authoritative; public OpenAPI list schema/parameters agree with serializer/query behavior; no changes to create/detail/transition/upload routes. A pre-M5B Web client should still normalize the enriched response. API tests and repository backend gates pass. Response bytes and SQL/query count are recorded, not guessed.

## M5C exact rt-web scope and acceptance

After the M5B API contract is merged and available: update only `src/api/dashboard.ts` and Home presentation (`src/pages/HomePage.tsx`, `src/components/dashboard/KpiCard.tsx`, `src/components/requests/RequestTable.tsx`, relevant shared row/badge helpers, and focused Playwright). Remove `enrichRequestsWithDetail` and its import from the Home list path; do not move the extra Detail calls into components. Normalize the additive list response, use public request_id for row links, and preserve existing four queue labels, quick-filter meanings, current KPI values and default `page_size=10,sort=-updated_at`. Keep the shared client so every API request includes Authorization and X-Tenant. Add server pagination and URL-backed queue/filter/sort/page state only after the API predicates above are verified. Keep Home and Search paths stable. Do not touch Search's known independent enrichment in M5C.

Present the operational hierarchy, loading/empty/zero/error and partial-summary states in `docs/design/06-dashboard.md`. Use M3 primitives and semantic tokens; remove `legacy-page` only for Home after Light/Dark/System checks. Keyboard, focus, 320/768/1024/1440 widths, no row Detail requests, assigned/unassigned labels, duplicate/invalid ID behavior, Back/Forward restoration and tenant headers require tests. Manual DevTools with real API confirms query/pagination and request counts. The full Web gate, preview/browser smoke and scoped visual evidence pass before sign-off.
