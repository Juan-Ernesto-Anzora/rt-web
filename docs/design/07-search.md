# Unified Search: M6A UX specification

## M6D visual calibration

M6D refines the completed M6C Search presentation only. The labelled Search field now has a short `Search requests...` placeholder; the truthful scope (titles, descriptions, comments and attachment names) lives in an M3 Field description linked to the input by `aria-describedby`. Desktop actions align with the input rather than the helper line. At compact widths Search remains full-width and Clear all is a small separate command, not a second full-width action. No query/URL/request behavior changed.

Filters is still an inline disclosure, not a permanent rail or new overlay. Its open label says **Hide filters** and uses the existing `aria-expanded`/`aria-controls` relationship plus a restrained semantic active surface. The panel uses tighter established spacing at 320px, while 768px+ retains the compact inline catalog arrangement. The Status helper says **Select a flow to choose a status.** The standalone status_id deep-link contract remains unchanged. Find assignee uses a full-width native input with Find users/Load more actions on the following row at narrow widths, returning to an inline layout where space allows. Updated date labels and native controls remain grouped, and Apply/Cancel stay in normal flow without a sticky footer.

Applied filters are ordinary, slightly stronger text controls with the same meaningful removal names, not permanent pills. Results keep the M5D unframed table/compact-row language, subtle horizontal separators, title links and small ordinary-text match-source context. No palette, radius, icon, chart, animation or Search-data behavior was added. Existing AppShell compact controls were inspected but not redesigned.

Refreshed ignored captures in `.agent/tmp/m6-search/` were inspected at 1440 Light/Dark, 1024 Light, 768 Dark, 320 Light and **320 Dark with Filters open**, plus applied filters at 1440 Light and 320 Dark and Search empty/error states. Browser assertions cover helper association, expanded state, mobile input/action stacking, header clearance and no document overflow. The final local gate passes: typecheck, lint, build, 4 token tests, 10 theme tests, 75 full functional Chromium cases without retries, and built theme/Dashboard/Search previews at 5/14/27 cases respectively. These browser APIs are intercepted; cross-platform golden baselines and actual assistive-technology/zoom certification remain separate. Hosted CI for this working-tree diff has not run.

## M6C implementation reconciliation

The M6A inventory below is preserved as pre-implementation evidence. M6C now consumes the M6B compact Search summaries from merged rt-api PR #25 at the existing `/api/search/requests` path; no Web Detail enrichment runs for result rows. `src/features/requestSearch.ts` owns the typed result adapter plus canonical URL parsing/serialization. `src/pages/SearchView.tsx` derives applied state from URL query parameters, keeps form/filter drafts separate, and ignores stale result responses. The URL uses `q`, singular `flow_id`, `status_id`, `assignee_id`, `updated_from`, `updated_to`, and nondefault `page`. The first consumer fixes page_size at 25 and sends no legacy status/assignee/flow/tag/sort parameters. A repeated explicit Search of the same applied state retries once. Empty q makes no Search GET.

The inline Filters band replaces the permanent 280px rail. It loads flows across their paginated `/api/flows/` catalog, statuses from the selected `/api/flows/{flow_id}/statuses/`, and assignees from `/api/users/` with server search and Load more. Lookup requests use the shared auth/tenant client and are counted separately from result requests; an unavailable catalog never erases loaded Search results or silently clears an applied UUID. A standalone status_id deep link stays applied and removable even without a readable Flow-scoped status label. Date-only values are passed as selected YYYY-MM-DD strings, matching M6B's API-configured-timezone day semantics. Apply/Cancel and per-filter removal use URL-backed applied state; Clear all returns to neutral entry without an empty query request.

Search rows reuse M5D `RequestTable` with a Search-only fixed-layout variant, existing StatusBadge/PriorityIndicator, native title links, and an optional ordinary-text `match_sources` explanation for comment/attachment hits. There is no displayed rank, invented snippet/highlight, raw HTML, Tag control or repeated Open column. Missing nested labels show unavailable text; null assignee is Unassigned; missing/invalid public request_id renders plain title text. Search no longer has a `.legacy-page` or light-only card/control palette.

Final local browser evidence: the 72-case CI-mode functional suite passes without retries and includes 24 Search cases for 0/1/10/25 rows, exact UUID/date payloads, lazy catalog empty/error/paging, URL history/Detail Back, stale responses, populated reflow at 1440/1024/768/320, and a 640px CSS-width proxy for 200% reflow. The production Search preview passes 24/24, asserting exactly one initial Search GET and zero row Detail GETs for 0/1/10/25 results; production theme (5/5) and Dashboard (14/14) previews also pass. Screenshots in ignored `.agent/tmp/m6-search/` were inspected for normal/long populated, applied filters, empty/error and Light/Dark/narrow cases. Cross-platform golden baselines and an actual browser zoom/screen-reader audit remain separate evidence. Hosted CI has not run for this working-tree change.

## Purpose and evidence

Search answers **Find a request quickly, then narrow the result set without losing context.** It is the existing `/search` operational workspace, not another Dashboard queue, a BI page or a new route. Normative baseline: [Blueprint v1.1](00-Request-Tracker-UI-UX-Design-Blueprint-v1.1.md), [tokens](03-design-tokens.md), [primitives](04-component-system.md), [AppShell](05-app-shell-navigation.md) and [Dashboard](06-dashboard.md). Contract analysis and M6B prerequisites are in [m6-search-data-contract.md](../plans/sprint-4/m6-search-data-contract.md).

Audit: 2026-09-26, Web `feat/search-foundation` at `e9438ae` (PR #28 merge), read-only sibling API `main` at `288ea61` (M5B merge). Sources are `src/pages/SearchView.tsx`, `src/features/requestSearch.ts`, `src/api/requestDetail.ts`, `src/api/requestDisplay.ts`, `src/components/requests/RequestTable.tsx`, `src/components/common/PaginationControls.tsx`, `src/components/layout/AppShell.tsx` and `src/main.tsx`. A production-preview Chromium fixture intercepted contract-shaped API responses; it did not exercise SQL Server or a deployed API. Live `/api/schema` refused the connection. No runtime changes are made by M6A.

## Current UX inventory

| Pattern | Current evidence | Disposition for M6C |
| --- | --- | --- |
| Page/shell | One Search Requests h1 in the authenticated M4 shell; global Search/New Request links | KEEP route, shell, guards and useful heading |
| Keyword form | Labelled native field, Enter/submit, Search and Clear; draft query is local | REFINE through M3 primitives and URL-backed applied state |
| Filter rail | Permanent 280px card from 1024px; stacked above results below that; four checkbox groups plus updated dates | REPLACE presentation with optional compact filter panel; retain only verified contracts |
| Facets | Status/Assignee/Flow display strings from enriched current page; Tag from result tags | REPLACE value sourcing; not real global/server facets |
| Results | Local 900px-minimum table, captions/scoped headings, description fallback, repeated Open buttons | REFINE using M5D title-link/row language, not floating cards |
| Status/priority | Shared StatusBadge; priority returned by API but ignored by Web DTO/row | KEEP badge; use existing PriorityIndicator with exact domain values |
| Feedback | Plain unannounced searching text; no-query/zero-results copy; alert on failure; no retry; old rows hidden while loading | REFINE with shared state components and isolated current-scope feedback |
| Pagination | Shared named Previous/Next and live page count, but driven by draft rather than applied filters | KEEP component; fix state ownership in M6C |
| Theme | `.legacy-page`, white/neutral controls, `.card` shadows/20px radius; semantic descendants can use dark colors on light canvas | REMOVE_AFTER_MIGRATION only on Search once all descendants are semantic |

Current facets change drafts, not results immediately. Only Search submit or a page action applies them. Page actions also apply any pending query/filter edits. Result choices change with the current page and can disappear after filtering. Clear empties local query/results but leaves URL `q`; refresh restores the old query. Only URL `q` is read; submit does not write it. Deep links and returning from Detail lose local facets/page and even a submitted query different from the URL.

**BLUEPRINT / PRODUCT COPY RECONCILIATION REQUIRED:** current placeholder claims "Search title, id, tags, assignee, comments". API FTS searches title/description, comment message and attachment filename only. Human ID, tags and user/flow labels are not text-searched. Blueprint's broader structured-filter examples and AGENTS' Tag facet are future capabilities, not evidence that this API supports them. Do not alter the Blueprint silently or retain a nonfunctional Tag control merely for parity.

## Target hierarchy

1. M3 PageHeader: Search Requests; no hero or duplicate global navigation.
2. Labelled search form with compact Search command and meaningful Clear action.
3. Result count, Filter disclosure and compact applied-filter summary/removal controls.
4. Optional filter panel with explicit Apply and Cancel/reset-to-applied behavior.
5. Dense comparable rows, optional useful match-source text, then pagination.

The permanent 280px rail is not the default target: alongside M4's 224px rail it leaves only 456px for results at 1024px in the fixture. Prefer an inline collapsible filter band, wrapping native controls, which closes without losing applied filters. On narrow screens controls stack in that band before compact results. No new drawer/combobox framework is justified. Do not copy Dashboard's My Tasks/My Requests/quick queues into Search without new contracts.

## Search field behavior

- Preserve explicit submit, not auto-search on every keystroke. Label Search requests; truthful placeholder **Search titles, descriptions, comments and attachment names**. Explanatory copy must not promise Human ID/tag/person matching.
- Nonempty keyword is required by current API. Empty entry shows a neutral prompt and sends no Search request; punctuation-only or >200-character queries get readable validation. The API currently tokenizes prefix terms with AND and uses the first eight terms; M6B must document that rule before UI claims a different grammar.
- Keep query and filter drafts separate from applied URL state. Submitting query or Apply filters commits one canonical state and resets page to 1. Pagination uses applied state only, never silently submits unfinished edits. Clear all updates URL and drafts together; remove one filter preserves the query.
- Home's Search all requests form supplies `q`; Shell's Search link opens the existing empty Search page. Restore applied query/filters/page on refresh, Detail Back and browser Back/Forward. Avoid the current redundant mount synchronization effect.

## Filter strategy

These are metadata pickers, not result-page-derived facets or facet counts. First M6C scope uses single choices matching the API's singular UUID parameters. Source catalogs require auth/tenant and honest loading/error/continuation; no fake options, raw IDs as primary labels, or first-page-only claims of completeness.

| Filter | Source / value / visible label | Applied URL / behavior |
| --- | --- | --- |
| Flow | Existing `/api/flows/` paginated catalog; `flow_id`, name | One `flow_id`; All omits it. Follow pagination, retain selected label. Load lazily when filters are opened |
| Status | Existing `/api/flows/{flow_id}/statuses/` array; `status_id`, name/category | One `status_id`; interactive picker depends on selected Flow. Changing Flow clears its incompatible draft Status on Apply. No label-to-ID inference |
| Assignee | Existing `/api/users/` tenant-membership catalog with server `search`, page/page_size; `user_id`, display_name then email | One `assignee_id`. Paginated/searchable discovery, retain selected value across catalog pages. No Unassigned sentinel: Search currently accepts UUID only |
| Updated range | Native labelled date fields; M6B must confirm documented calendar-day/instant semantics | `updated_from`, `updated_to`; omit empty bounds, reject reversed range. Do not silently make To mean only midnight |

A syntactically valid deep-linked ID whose label cannot be resolved remains an applied, removable **Unavailable flow/status/assignee** filter, not a raw UUID label or a silently changed query. A status-only API deep link remains valid even if the UI needs a Flow to populate its picker; do not silently discard it. Keep result reads independent of label-catalog failure. API denial remains authoritative; never bypass catalog permissions with Admin endpoints.

Tag is deferred: no Search tags, tag filter or public tag lookup is implemented. Priority/requester/due filters, multi-select IDs, global facet counts and a global Status catalog require separate contract approval. API `types` and created bounds exist but are not necessary controls for the first M6C; keep them API capabilities, not speculative UI. Empty catalogs show genuine empty state; failed catalogs show local retry and preserve applied filters.

## Result-row hierarchy

Reuse the completed Dashboard's unframed table/compact list, subtle horizontal separators, named native title link, focus-visible/focus-within and text-based status/priority. Do not coerce Search into Dashboard's API DTO: introduce a small shared display-row type only if it meaningfully removes duplication, preserving Dashboard's current props/behavior/call budget.

- Primary: readable `human_id` and title link using public `request_id` only. Missing public ID yields non-link text, never `/requests/-`, null or undefined. No whole-row nested-interaction trick or repeated Open column.
- Desktop comparison: status name/category, priority, assignee, requester, flow, updated timestamp. Use nested M5B summaries directly; null assignee is Unassigned, missing metadata is explicitly unavailable.
- Compact rows: ID/title/status/priority/assignee/updated stay visible; requester/flow may use the 768px secondary line or Detail at 320px. Links meet target size and long text wraps rather than clipping essential labels.
- Preserve `created_at` in the response but omit the column unless a concrete search decision needs it. Due data is not needed in this first Search row. Never add SLA or comment counts without a source.

## Relevance and search-specific context

Current Rank is **source weighting**, not the SQL Server FTS relevance score: request content=30, comment=20, attachment=10; grouped rank is MAX, then updated descending. Multiple source types are unioned and deduplicated to Requests. The Web currently drops both `rank` and `match_sources` and sends an ignored sort.

Keep fixed best-match ordering for first M6C, with M6B's deterministic request-ID tie-break. Do not offer a nonfunctional sort selector or URL sort mode. Display modest match-source context only when it helps explain a comment/attachment hit, e.g. Matched in comments / attachment names. Use validated source enums and ordinary text, not decorative badges or a fabricated score. Request source means title **or description**; it does not identify which. Preserve rank for contract compatibility without numeric UI.

No snippet/highlight exists in Search. Current Web substitutes the full Detail description, even for a comment/file match; it is not a matched excerpt. Omit that misleading fallback when fan-out is removed. True bounded snippets and highlights are explicitly deferred, not synthesized client-side or rendered as raw HTML. Tags are not available for rows.

## URL proposal

Canonical `/search?q=<text>&flow_id=<uuid>&status_id=<uuid>&assignee_id=<uuid>&updated_from=<date>&updated_to=<date>&page=2`. Applied single IDs use API names; defaults/empty values are omitted. Default page_size=25 remains fixed in first M6C; no size picker or size URL is needed unless separately exposed. No `sort` while order is fixed, no expanded/loading/focus state in URL. Date serialization is gated on the M6B day/timezone decision in the contract document.

Trim query on Apply; validate positive safe page values and UUID/date syntax. Invalid values fall back with readable validation rather than passing malformed IDs or silently selecting a different person. Query/filter changes reset page; page changes retain applied filters. Browser history records completed navigational changes, not each input character. Cancel draft edits never changes results/URL. Tests must include Home handoff, deep link, refresh, Back/Forward, Detail return and Clear.

## Loading, empty, error and pagination

- Initial submitted load: static structural LoadingRows and one status announcement; not a giant spinner or blank hero.
- Same-scope retry/refresh may retain labelled prior rows with local `aria-busy`; changed-scope loads must not misrepresent old rows as the new query. Keep layout steady and controls reachable. Ignore stale responses, but do not claim cancellation prevents current adapter fan-out.
- No query is a neutral entry state; successful zero matches is EmptyState with query/filter context and Clear filters when relevant; an empty filtered set is not ErrorState.
- Errors use shared ErrorState, canonical API `message` and readable `details` by field, not only the obsolete `detail` key. Retry the current applied state. Distinguish forbidden/unavailable/not-found through existing app behavior; no demo fallback and no boundary used to conceal known defects.
- Keep shared PaginationControls bound to response/applied state, disable during scope changes, and handle out-of-range pages honestly. M6B must fix the current window-count-on-empty-page issue before reliable recovery can be accepted. Count is server total, never current-page length. Announce updated count/page without a live region per cell.

## Responsive evidence and target

The temporary production fixture used 10 populated rows, fixed locale/timezone and synthetic auth. It measured document overflow at all four widths; Search's min-900px table actually required about 980px for this content. No full accessibility/browser certification is implied.

| Width | Observed current behavior | Required M6C behavior |
| --- | --- | --- |
| 1440 | Shell rail plus 280px facet rail; result region 872px; ID/date wrap and Open is offscreen; slight document overflow | Use available width for comparable rows; no permanent second rail by default; optional secondary metadata |
| 1024 | Result region only 456px beside both rails; populated table needs internal scrolling; document overflow | Full primary comparison region, remove second permanent rail; retain primary fields/link |
| 768 | Filters stack before rows but expand to roughly 982px; Dark shell beside light Search | Bounded optional filters and compact rows with secondary requester/flow; no document overflow |
| 320 | Filter/results grid expands to roughly 982px; long pre-results stack and offscreen actions | Stacked native filters; compact complete primary row; pagination/link reachable without horizontal document scroll |

## Light/Dark/System migration

Replace Search's pattern-level `bg-white`, `neutral-*`, `.card`, `.btn`, raw danger colors and palette-specific focus with M1/M3 semantic surfaces/text/borders/actions/states. Remove `.legacy-page` only after the complete Search surface is migrated. Reuse existing HTML root theme contract; no parallel classes, palette, new runtime or density activation. The current Dark capture has light result/input surfaces with dark semantic StatusBadge/PaginationControls descendants; even the pagination label becomes pale on the light canvas. Verify populated/loading/empty/error/filtered/paging states under Light, Dark, System-Light and System-Dark, not only a root attribute.

## Accessibility acceptance

Keep one h1 and M4 skip/main/navigation behavior; current labelled field, native submit, fieldsets/checkbox labels, table caption/scope, named Open button and pagination are useful starting points. Current loading text lacks status/live semantics, count lacks a result announcement, drafts can misrepresent applied results, title is not a link, and focus stays at clicked pagination while old results vanish. Errors use a light danger shade; fixed-layout populated content overflows. Passing existing lint is not WCAG evidence.

M6C must test native Enter/Space/Tab/Shift+Tab, filter disclosure expanded/controls semantics, draft Apply/Cancel, labels/help/validation association, focus-visible on title links, result table/list/caption/headings, missing-ID nonnavigation, text-plus-color status/priority, loading/error/count announcements, pagination names/bounds, 24px-minimum targets with adequate spacing, long names/titles, 200% zoom and no 320px document overflow. Query-only navigation must not unexpectedly steal focus; keep the submit/filter trigger stable and announce results. Preserve M4 pathname focus after Detail navigation. Use M3 Dialog only if an overlay is actually needed; no new library required.

## Anti-patterns, gates and deferred items

Use semantic borders/surfaces, restrained 24px page heading, compact controls and rows. No search hero, card-per-result, heavy grid, permanent pill groups, charts, gradients, glow, permanent shadows, giant typography or gratuitous motion. Keep useful metadata/actions, not minimalism that hides work.

Existing Search coverage is mainly empty mocked shell navigation/widths in `tests/e2e/app-shell.spec.ts` plus Home query handoff in `tests/e2e/dashboard.spec.ts`; there is no permanent populated Search/parameter/fan-out/state/history suite. M6C adds that coverage and a production-preview check using CI's explicit build-time `VITE_API_BASE`, preserving Dashboard tests. Run typecheck/lint/build/token/theme/primitives/shell/full E2E/production-preview/diff gates. Golden images remain deferred until a stable Windows/Ubuntu renderer/font baseline is approved; retain deterministic structural/color/request assertions and inspected ignored captures meanwhile.

Deferred: M6B/M6C implementation in this task; Human ID FTS, Tag storage/filter/search, true snippets/highlights, selectable sorts, source-type controls, extra business filters/quick queues, saved views/command palette, bulk actions, API caching frameworks, SQL/schema/index/language tuning, Request Detail/Create/Admin redesign. Live schema, SQL query counts/timings, privacy-policy checks and deployed behavior remain verification requirements, not claims from this audit.
