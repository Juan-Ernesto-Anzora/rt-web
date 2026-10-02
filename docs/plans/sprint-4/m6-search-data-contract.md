# M6 Search contract audit and staged handoff

## Baseline and source register

M6A is documentation only. Web branch `feat/search-foundation`, HEAD `e9438ae` merges Dashboard PR #28. Read-only sibling `../rt-api-skeleton` is `main` at `288ea61`, merging M5B PR #24. Neither checkout establishes deployment. A GET to `http://127.0.0.1:8000/api/schema` refused connection; no static OpenAPI file is checked in. Current schema source is the API serializers plus `@extend_schema` on SearchView, with generated-schema tests. No API service/SQL/dependencies were started, changed or installed for this audit.

Web sources: `src/pages/SearchView.tsx`, `src/features/requestSearch.ts`, `src/api/requestDetail.ts`, `src/api/requestDisplay.ts`, `src/lib/api.ts`, `src/main.tsx`, `src/pages/HomePage.tsx`, `src/components/requests/RequestTable.tsx`, `src/components/requests/StatusBadge.tsx`, `src/components/requests/PriorityIndicator.tsx`, `src/components/common/PaginationControls.tsx`, `src/components/layout/AppShell.tsx`, `tests/e2e/app-shell.spec.ts`, `tests/e2e/dashboard.spec.ts`, `playwright.config.ts`, `.github/workflows/ci-web.yml`. UX spec: [07-search.md](../../design/07-search.md); active plan: [ui-ux-foundation-redesign-execplan.md](ui-ux-foundation-redesign-execplan.md).

API sources relative to sibling root: `apps/rt/search.py`, `apps/rt/views.py` (SearchView, RequestViewSet, FlowViewSet, UserLookupViewSet), `apps/rt/serializers.py` (SearchQuery/SearchResult/SearchResponse and M5B summaries), `apps/rt/models.py`, `rt_api/urls.py`, `rt_api/settings.py`, `apps/common/pagination.py`, `apps/core/middleware.py`, `tests/test_search.py`, `tests/test_dashboard_request_list.py`, `tests/test_openapi.py`, `tests/test_postman_contract.py`, `AGENTS.md`, `pyproject.toml`. Paths below are checkout evidence, not hypothetical endpoints.

## Current architecture and HTTP cost

Web uses shared Axios `GET /search/requests` relative to build-time `VITE_API_BASE`; normal configured full path is **GET `/api/search/requests` without trailing slash**. API `rt_api/urls.py` maps that path and legacy `/api/search` to the same SearchView. Search is IsAuthenticated with tenant middleware/context; raw FTS SQL scopes every branch/join by tenant. SearchView validates declared query fields then calls `search_requests`; it returns the custom envelope `{count,page,page_size,results}`, not request-list `{count,next,previous,results}`. Web tolerates arrays but that is not the current API contract.

`searchRequests` normalizes rows and unconditionally awaits `enrichSearchResultsWithDetail`. Each result with nonempty public `request_id` calls `getRequestDetail`, which is exactly one `/api/requests/{id}/` GET, not the activity/comments/attachments bundle. This still happens when labels are already present. Failed Detail reads are swallowed and leave base rows; the page checks stale/cancelled state only after all enrichment completes. No cache/bounded concurrency exists.

For one adapter invocation, **1 + V** Search-data HTTP calls, where V is visible rows with usable public IDs (normally N). Missing IDs skip Detail. Additionally, SearchView's mount effect fetches immediately and its URL-q synchronization effect sets a fresh submitted-filter object: initial nonempty-q production loads duplicate the invocation. React development StrictMode can replay further; it is not the production count below.

| Visible valid rows N | Single submitted query/filter/page: Search + Detail = total | Initial production `/search?q=vpn`: Search + Detail = total | M6C target per committed state |
| --- | --- | --- | --- |
| 0 | 1 + 0 = 1 | 2 + 0 = 2 | 1 + 0 = 1 |
| 1 | 1 + 1 = 2 | 2 + 2 = 4 | 1 + 0 = 1 |
| 10 | 1 + 10 = 11 | 2 + 20 = 22 | 1 + 0 = 1 |
| 25 | 1 + 25 = 26 | 2 + 50 = 52 | 1 + 0 = 1 |

These numbers were observed against a fresh production build with explicit `VITE_API_BASE=http://127.0.0.1:8000/api`, using a temporary synthetic Chromium fixture and completed-result waits. Initial shell permission reads were one and excluded. Blank-q entry sends zero Search data requests. The fixture also recorded `status=Open` after Apply and no request on facet toggle; Authorization and X-Tenant were present. Evidence/captures are ignored `.agent/tmp/m6a-search/`, with reproducible ignored `.agent/tmp/m6a-search-audit.cjs`. No request count proves real latency improvement or SQL performance. Catalog reads in the proposed UI are additional, lazy, bounded operations and must be accounted separately, not hidden in the one-Search-request claim.

## Web/API parameter reconciliation

DRF SearchQuerySerializer declares fields; undeclared keys are not forwarded to the service. Repeated scalar API UUID fields are not a multi-select contract. No name-to-ID resolution exists. Filters combine by AND before paging.

| Web key / value | API declaration/consumption | Classification and consequence |
| --- | --- | --- |
| `q` trimmed nonempty text | required CharField <=200; FTS tokenization | Supported and correctly wired; blank UI skips requests, API blank/symbol-only rejects |
| `status` repeated display labels | singular `status_id` UUID | Supported capability, named/value differently; current Web key ignored |
| `assignee` repeated display labels, including Unassigned | singular `assignee_id` UUID | Supported assigned-user capability, named/value differently; key ignored; null/symbolic Unassigned not supported |
| `flow` repeated flow names | singular `flow_id` UUID | Supported capability, named/value differently; current Web key ignored |
| `tag` repeated names | no field or SQL predicate | Web-only/ignored, nonfunctional |
| `updated_from`, `updated_to` yyyy-mm-dd from native date inputs | optional DateTimeField; SQL >= / <= respectively | Supported key; date-only parsing/timezone/end-of-day interpretation is ambiguous and needs tests; no range-order validation |
| `page` integer, default1 | min1, default1 | Supported and wired; Web currently local/draft state |
| `page_size` fixed25 | min1/max100/default25 | Supported and wired; no size UI |
| `sort=-updated_at` always | no field or service argument | Web-only/ignored; effective order is rank descending then updated descending |

| API-only key | Actual behavior | First M6C decision |
| --- | --- | --- |
| `types` | CSV request/comment/attachment; case-normalized, unknown rejected; absent/blank means all | Not exposed in first consumer; preserve existing all-source search |
| `status_id`, `assignee_id`, `flow_id` | single UUID equality on Request metadata | Wire exact IDs from tenant catalogs, not current-page labels |
| `created_from`, `created_to` | DateTimeField and Request.CreatedAt >= / <= | Supported but not exposed; defer controls unless justified |

No obsolete route needs deletion: `/api/search` is a legacy alias, not the current Web path. No selectable relevance/recency contract exists. Do not silently alias unsupported label parameters or copy M5B `mine/closed/priority/assignee=unassigned` into Search. Future removal of ignored Web sort/Tag requests is an intentional M6C reconciliation, not an M6A code patch.

## Searchable content versus metadata

Source: `apps/rt/search.py` builds tenant-scoped UNION ALL branches, groups to one Request, then pages.

| Content | Text-searched? | Filterable metadata? / evidence |
| --- | --- | --- |
| Request title / description | Yes, `CONTAINS((Title, Description), fts_query)` | no special title-only selector; request source groups both |
| Human ID | No; merely projected for display | no Human ID filter |
| Comments | Yes, `CONTAINS(MessageMd, ...)` joined to tenant Request | `types=comment` chooses source, not comment-author filter |
| Attachment filenames | Yes, `CONTAINS(Filename, ...)` joined to tenant Request | `types=attachment`; no file-content extraction/search |
| Tags | No branch/join | no Tag parameter/catalog in Search |
| Requester name/email | No | requester filter absent; requester_id not in Search output |
| Assignee name/email | No | UUID equality `assignee_id`, not name text search |
| Flow name | No | UUID equality `flow_id`, not label text search |
| Status label/category | No | UUID equality `status_id`; no symbolic Open/Closed filter |
| Priority/due | No | returned priority, but no Search priority or due predicate |
| Created/updated timestamps | No | date-time range predicates on Request, not source-comment/file timestamp |

Tokenizer uses Unicode `\w` tokens, quotes prefix terms (`"vpn*"`), ANDs the first eight, strips punctuation and rejects no-term text. It is not phrase/Boolean query syntax. Tokens must match within one FTS branch/document: terms split between unrelated comments or Request and attachment do not automatically combine. SQL uses parameterized values and static approved source branches. Search currently applies no comment visibility or attachment scan-status predicate; whether metadata matches require those restrictions is a policy question, not proven authorization compliance or permission to change RBAC in this audit.

**BLUEPRINT / PRODUCT COPY RECONCILIATION REQUIRED:** Web's ID/tags/assignee search claim is not supported. Keep Blueprint's request/comment/file direction, but classify its extra filter vocabulary as future scope. Correct copy only when M6C is implemented.

## Current response, enrichment and M5B reuse

Current SearchResult fields: `request_id`, `human_id`, `title`, `priority`, `status_id`, nullable `assignee_id`, `flow_id`, `created_at`, `updated_at`, `rank`, `match_sources`. SearchResponse adds count/page/page_size. Web DTO drops priority/created_at/rank/match_sources and lacks stable metadata IDs in its normalized view model.

| Proposed row field | CURRENT SEARCH RESPONSE | CURRENT DETAIL ONLY / enrichment | M5B LIST RESPONSE | Decision |
| --- | --- | --- | --- | --- |
| request_id / human_id / title | Present | title needlessly overwritten | Present | Required; stable route versus readable ID |
| priority | Present, Web ignores it | Detail present but not copied here | Present | Use existing value/indicator; no new domain value |
| status name/category | Flat status_id only | Nested status; both copied | Nested compact status | Required compact addition |
| status is_terminal | Absent | Nested status, detail normalizes it; Search does not copy it | Nested compact status | Reuse same summary, do not infer it from category |
| assignee summary/null | Flat nullable assignee_id only | Nested user/null copied to display text | Compact user/null | Required; null Unassigned, missing label unavailable |
| requester summary / requester_id | Both absent | Nested requester copied to text | Compact requester plus flat requester_id | Required summary addition for existing row; retain public ID in summary |
| flow summary | Flat flow_id only | Nested flow copied to text | Compact flow | Required compact addition |
| created_at | Present, Web ignores it | Present | Present | Preserve API; not a primary first-row column |
| updated_at | Present, overwritten | Copied from Detail | Present | Direct existing Search field sufficient |
| due_at | Absent | Present | Present | QUESTIONABLE / NOT NEEDED in first Search row; defer |
| rank | Present | Not Detail data | Absent | Preserve; no decorative numeric score |
| match_sources | Present | Not Detail data | Absent | Preserve; useful modest context on comment/file matches |
| snippet/highlight | NOT CURRENTLY AVAILABLE | Web falls back to full Detail description | description exists but is not a match snippet | Defer true excerpts; no client-fabricated highlighting |
| tags | Absent | Detail serializer's get_tags is an empty-list stub; Web enrichment does not copy tags | Absent | NOT CURRENTLY AVAILABLE as functional data; defer |

Enrichment currently overwrites title, status, statusCategory, assignee, requester, flow, updatedAt and snippet fallback. Only readable related labels/category require new metadata. Title/updated already exist; description fallback is misleading rather than a requirement to clone Detail. `StatusSummarySerializer` (status_id/name/category/is_terminal), `UserLookupSerializer` (user_id/display_name/email), and `FlowLookupSerializer` (flow_id/name) are exactly the reusable M5B definitions. Do not use broader Detail user/flow serializers with employee code/avatar/description just for Search rows.

## Facet-source and Tag findings

All four current Web groups use `uniqueFacetValues(results, key)` after Detail enrichment, never a catalog or server facets. Status/assignee/flow send the derived strings, not IDs. A page change changes choices; an option absent on the current page disappears, and duplicate names cannot distinguish different entities. Toggling a checkbox does not call the server until Search submit; even then those label keys are ignored. No local filtering repairs the mismatch.

Tag always has no choices for the checked-out Search contract: DTO defaults tags to [], service/serializer never sends them, and Detail enrichment never copies them. API `Tag` model alone does not create functionality: Requesttag is commented out, RequestDetailSerializer.get_tags returns [], and no public Tag lookup route is registered. Database DDL may contain RequestTag but that is not a working application contract. Tag needs its own future model/link/catalog/filter/search scope; M6B must not silently invent it.

Verified reusable value catalogs: `/api/flows/` paginated, `/api/flows/{flow_id}/statuses/` bounded array, `/api/users/` paginated tenant members with optional server `search` by display name/email. No standalone public Status catalog, filter-result counts or Tag route. Use complete/paginated sources with readable labels; no Admin-only endpoints for ordinary Search users. These lookup requests are separate from Search result requests.

## Rank, order and edge cases

MatchRank constants are request=30/comment=20/attachment=10; group MAX chooses the highest source weight, not summed matches or FTS rank. MatchSources is STRING_AGG then Python set/sort, so multiple comments/files still yield one Request with deduplicated source names. Fixed SQL order is `Rank DESC, UpdatedAt DESC`; equal values lack an ID tie-break. Web sort is ignored. Preserve weighted-source meaning rather than claiming linguistic relevance.

`COUNT(*) OVER()` is read only from the first returned page row; an empty out-of-range page incorrectly produces count0 even if earlier pages contain matches. Current tests use FakeCursor and validate SQL fragments/serialization, not a real FTS result set or live query growth. Search exceptions other than SearchValidationError are not converted by SearchView itself; normal API error middleware handles failure envelopes. Date ranges have no reversed-bound validator, and To is <= an instant, not an established inclusive calendar-day rule. These are M6B acceptance items, not fixes applied in M6A.

## Architecture alternatives

| Option | Relevance/comments/files | Pagination/tenant/query cost | Maintenance, URL and fan-out | Decision |
| --- | --- | --- | --- | --- |
| A. Extend existing Search | Preserves FTS branches, weighted rank and source context | Keep custom envelope and tenant predicates; add bounded page metadata hydration, stable ties/count | Exact existing query IDs; shared summaries; one result HTTP call without Detail | **Recommend** |
| B. M5B requests list plus q | q is not implemented on that list; adding it must recreate/delegate Search relevance/comments/files | DRF list pagination/recency semantics differ; broadens Dashboard list service | Risks losing types/rank/sources or duplicating search pipeline; would need another bounded design | Reject for M6B |
| C. New Search endpoint | Could preserve features but no gap requires new route | Another validation/auth/envelope path and migration | Duplicates contracts, redirects and URL adapter with no measured benefit | Defer |
| D. Client metadata catalogs | Keeps FTS response but no true snippets/requester ID there | Extra paginated catalogs, missing/inactive identities, tenant cache ownership | Cannot reach one Search-data response for full row metadata; stale/incomplete labels and more client joins | Reject as result hydration; use catalogs only for filter pickers |

## Recommended bounded M6B contract (not implemented)

Keep GET `/api/search/requests`, auth/X-Tenant and `{count,page,page_size,results}`; preserve existing primitive fields/rank/match_sources and required q. Add only `status`, `requester`, `assignee` (nullable) and `flow`, using the exact M5B serializers above. Requester's public user_id is already in its compact summary; a new flat requester_id or requester filter is not needed for this first row. Do not return comments/attachments/activity/full Detail/custom fields/avatars or duplicate description to make a pseudo-snippet.

Preserve existing single UUID/date/source filters and all-source default. First M6C needs flow/status/assignee/updated, not Tag/multi-select/new priority/requester/due/quick-queue predicates. Do not introduce sortable modes in minimum M6B: keep fixed weighted best-match order and append stable RequestId tie-break; M6C removes its obsolete sort parameter. New selectable recency/relevance sorting would be a separately explicit contract scope.

Resolve updated-calendar-day semantics before consumer implementation: recommendation is date-only From inclusive start-of-day and To exclusive start of following day in documented API configured TIME_ZONE, while preserving explicit date-time instant semantics for existing clients. Validate reversed bounds and document date/date-time formats in OpenAPI. Source default TIME_ZONE is UTC but environment configurable; tenant timezone application is not established. This recommendation requires M6B schema/tests and product confirmation of timezone, not a guessed Web conversion.

A maintainable implementation candidate: retain the SQL FTS selection/rank/page, then retrieve only page Request IDs with a tenant-filtered ORM queryset and `select_related("flowid","statusid","requesterid","assigneeid")`; serialize compact summaries in original ranked order. Do not query per row, change source weighting, sort hydration independently or omit tenant checks. Consider the count correction together with paging: a bounded separate count query or equivalent correct SQL is acceptable, but measure it. Target at most three service DB queries (page/count/hydration), independent of N; exact counts and payload bytes must be reported for 0/1/10/25, separately from middleware/auth queries. Inconsistent/foreign related metadata must not leak labels.

### Exact API scope and verification

- `apps/rt/serializers.py`: reuse compact definitions in SearchResultSerializer; document accepted query fields/date formats and validation. Preserve write/list/detail serializers.
- `apps/rt/search.py`: bounded tenant-safe metadata hydration, rank-order restoration, deterministic ties and correct total on empty/out-of-range pages; documented date comparisons. No DDL/FTS language/index rewrite by default.
- `apps/rt/views.py`: Search schema annotations/validated parameter forwarding and canonical validation detail shapes. `rt_api/urls.py` need not change.
- `tests/test_search.py`: extend exact output/null summaries, source weights/dedup/order, IDs/repeated scalar IDs/dates/types/query limits, filters-before-pagination, no-match and empty-page count, related-label tenant negatives, unauthenticated/missing-tenant cases, absent metadata, fixed query budget and old-response compatibility. Add schema assertions alongside `tests/test_openapi.py`; retain `tests/test_dashboard_request_list.py` for M5B parity.
- Before coding, M6B reads its own instructions/ExecPlan and refreshes generated schema. Available backend gate per API AGENTS: `poetry run python manage.py check`, `poetry run pytest -q`, `poetry run ruff check .`, `poetry run black . --check`, `poetry run isort . --check --diff`, `poetry run python manage.py spectacular --validate --file "$env:TEMP/rt-openapi.yaml"`, `git diff --check`. Missing configured coverage/type-check tooling stays an explicit gap. FakeCursor/schema tests do not certify live SQL; obtain disposable SQL Server FTS/query-budget/tenant evidence separately with authorized data setup.

## Exact M6C handoff (not implemented)

After M6B is merged and its real response/schema is verified: change `src/features/requestSearch.ts` to typed compact summaries/priority/rank/sources, remove `enrichSearchResultsWithDetail` and its import, send singular metadata IDs and no ignored tag/sort keys. Preserve shared API auth/tenant handling. Change `src/pages/SearchView.tsx` to one URL-backed applied state plus explicit drafts/Apply, eliminate duplicate initial loads, separate entry/empty/error/loading/retry, and use scoped catalogs rather than page-derived strings. Implement [07-search.md](../../design/07-search.md) with shared M3 controls, M5D title-link/table/compact-row language, semantic themes and existing pagination. Extract only the small shared row-view type/rendering warranted by both consumers; do not couple Search to Dashboard API or change Dashboard queries/counters.

Add permanent Search tests for 0/1/10/25 results, exactly one Search GET per committed state, zero Detail GETs before opening a result, exact ID params, catalog paging/failures, truthful copy, no Tag phantom filter, source context, real/unavailable labels, stale-response isolation, empty/errors, URL refresh/history/Detail Back/Home handoff, all themes, keyboard/focus and four populated widths. Include production preview using the same explicit CI build-time API base as Dashboard; avoid preview-only env fixes. Keep full Web typecheck/lint/build/token/theme/primitives/shell/functional/preview/diff gates. No new dependency, cache framework, route/RBAC/SQL, Detail/Create/Admin redesign or unapproved Search capability.

## Unresolved questions and evidence limits

1. Live schema/deployment is unavailable; confirm M6B contract on the running API before Web wiring. The checked-out annotations, tests and merged M5B are source evidence only.
2. Confirm calendar-day timezone policy and whether date-only parsing in the deployed DRF/Django version already behaves as intended; do not assume tenant settings drive Search dates.
3. Confirm whether private comment and blocked/pending attachment metadata may contribute matches under existing policy. No new RBAC is authorized; backend verification must establish equivalence with current allowed Detail access.
4. Approve deferral of Tag/Human-ID/snippets/new sorts and broad Blueprint filters explicitly when selecting M6B/M6C; this audit does not alter normative Blueprint text.
5. Test the bounded hydration/count scheme against actual SQL Server FTS, not merely fake cursors. No measured live timing, payload improvement, DB query budget or cross-platform image baseline is claimed here.
