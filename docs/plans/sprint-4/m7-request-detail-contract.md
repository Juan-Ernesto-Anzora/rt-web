# M7 Request Detail contract audit and API handoff

## Purpose and evidence

M7A is a documentation-only audit of the current `/requests/:id` workspace. No Web or API runtime contract changes are authorized here. The selected Web plan is `docs/plans/sprint-4/ui-ux-foundation-redesign-execplan.md`; UX acceptance is in `docs/design/08-request-detail.md`. Evidence is the clean Web branch `feat/request-detail-foundation` at `f0c1587`, read-only sibling `C:/dev/rt_project/rt-api-skeleton` source at `aa0927d`, and a disposable intercepted Chromium fixture against a fresh production build. That fixture was removed after the passing measurement. It did not exercise SQL Server, MinIO, authentication, deployed OpenAPI or a live API. The sibling API checkout's worktree status could not be established with `git status` in this environment; no API files were edited.

## Endpoint map and current client sequence

`src/lib/api.ts` supplies Bearer and `X-Tenant` to all API calls below. Direct object-store PUT uses independent Axios with only presign-provided headers. `src/main.tsx` maps `/requests/:id` behind `Protected`; AppShell's unrelated `/admin/me/permissions/` read is excluded from Detail counts. Source: `src/api/requestDetail.ts`, `src/features/requestActivity.ts`, `src/pages/RequestDetailPage.tsx`, sibling `rt_api/urls.py` and `apps/rt/views.py`.

| Operation | Exact current path (prefix `/api`) | Web call / API authority |
| --- | --- | --- |
| Core | GET `/requests/{request_id}/` | `getRequestDetail`; tenant-filtered `RequestViewSet.retrieve` |
| Comments | GET/POST `/requests/{request_id}/comments/` | `CommentViewSet`, GET paginated 25; POST `{body}` |
| Attachments | GET `/requests/{request_id}/attachments/` | `AttachmentViewSet`, GET paginated 25 default/50 requested |
| Activity | GET `/requests/{request_id}/activity/` | `RequestViewSet.activity`, **unpaginated**; `/activities/` is an alias, not used by Web |
| Actions | GET `/requests/{request_id}/available-transitions/` | current-flow/status lookup, unpaginated |
| Assignment directory | GET `/users/` | `UserLookupViewSet`, paginated 25 by default; Web reads only first page |
| Assignment | PATCH `/requests/{request_id}/` | `{assignee_id: UUID|null}`; generic `RequestSerializer` update |
| Transition | POST `/requests/{request_id}/transition/` | `{transition_id: UUID, comment: string}`; Web does not PATCH status |
| Upload init | POST `/attachments/init` | `{request_id, files:[{filename,content_type,size_bytes}]}` |
| Storage | PUT presigned `uploads[].url` | one PUT per file, provided `Content-Type`, no Bearer/X-Tenant |
| Upload finalize | POST `/attachments/finalize` | `{request_id,group_id,comment_markdown,files:[{object_key,filename,content_type?,size_bytes?}]}` |
| Existing bundle | GET `/requests/{request_id}/detail/` | API returns `{request,comments,attachments,activity}`; **Web does not call it** |
| Compatibility | POST `/requests/{request_id}/close/`, `/reopen/` | available in API, not called by Web; select a qualifying transition |

### Measured request budget

Production-preview Chromium fixture used one authenticated synthetic request and intercepted contract-shaped APIs. It excluded AppShell permission traffic. The initial sequence was core GET and independent `/users/` GET, then comments/attachments/activity after core, plus transitions after Detail state. `React.StrictMode` development replay can increase mount reads; counts below are a single production mount. A logical refresh from no Detail differs from a mutation refresh because the latter still holds stale `detail`, causing the transitions effect to run once on `loadAttempt` and again when the new Detail object arrives.

| Scenario | API GET | API writes | Storage PUT | Observed/formula |
| --- | ---: | ---: | ---: | --- |
| Successful initial load | 6 | 0 | 0 | 1 core + 3 subresources + 1 transitions + 1 users |
| Core GET fails on fresh mount | 2 | 0 | 0 | core + eager users; no subresources/transitions; page ErrorState |
| One subresource fails | 6 | 0 | 0 | same call count; rejected result silently becomes `[]` |
| Assignment save | 6 | 1 PATCH | 0 | full 4-GET bundle plus **2** transition reads; directory not refetched |
| Transition submit | 6 | 1 POST | 0 | same full refresh, whether comment supplied or not |
| Plain comment | 6 | 1 POST | 0 | same full refresh; comment POST response ignored |
| One-file upload | 6 | 2 POST | 1 | init + PUT + finalize + full refresh |
| N-file upload | 6 | 2 POST | N | init + N concurrent PUT + finalize + full refresh; N=2 observed 2 PUTs |
| Retry after failed core, same mount | 5 | 0 | 0 | core + 3 subresources + transitions; users already loaded |
| Retry workflow actions while Detail exists | up to 6 | 0 | 0 | current retry increments global `loadAttempt`, not only actions |
| User-directory retry | 1 | 0 | 0 | `/users/` only |

The disposable fixture passed after correcting the retry expectation from 6 to 5. A simulated comments 500 still produced the visible `No comments yet.` EmptyState. Neither successful completion nor response arrival order is a live-service timing claim. The one-pass `getRequestDetailBundle` formula is 1 core + 3 subresources; UI effects add transitions/users and the mutation duplicate.

## Core Detail fields and public identity

Sibling `RequestDetailSerializer` (`apps/rt/serializers.py`) returns `request_id`, `human_id`, title, description, priority, nested flow/status/requester/assignee, their flat IDs, `custom_fields`, `tags`, due/created/updated timestamps. `flow` has ID/name/description; status has ID/name/category/is_terminal; requester/assignee have ID/email/display_name/employee_code/avatar_url; assignee can be null. All are real DB-derived except `tags`: `get_tags()` always returns `[]`. `custom_fields` is a nullable **string**, not parsed structured fields. Web currently displays human ID as `detail.id`, title, description, status/category, priority, user/flow labels, due/created/updated; it keeps assignee ID for PATCH. It does not render `custom_fields`, tags, flow description, requester/assignee email when a name exists, or flat flow/status/requester IDs. Header identity fallback to human ID/legacy IDs/`-` is internal DTO tolerance, not permission to route on them. Dashboard/Search `RequestTable` links only when public `requestId` is present. Detail's `useParams().id` is passed to GET without UUID validation; malformed input reaches API, and core failures are rendered as a generic error rather than a differentiated 400/403/404. A foreign-tenant UUID is excluded by `BaseTenantViewSet.get_queryset()` (typically 404); live response policy is unverified.

## Existing Detail bundle: why not switch directly

`RequestViewSet.detail_bundle` uses tenant-scoped `get_object()` and separate tenant/request-filtered Comment, Attachment, Activity querysets. It serializes all four collections with `-createdat` ordering and no stable ID tie-break. There is **no pagination, limit, continuation, count or region error envelope**. For one request, source indicates one selected-related core query plus one query for each collection (at least four ORM reads, excluding auth/middleware), but SQL timing and actual query count were not measured. Core and attached rows share a response, so one failure fails the whole workspace and payload grows with the entire history. It duplicates core plus separate endpoints, and the Web has no consumer. This is not a durable default for long-lived requests; keep it as compatibility until any API replacement is specified/tested, do not silently point Web at it.

## Comments and activity contracts

`CommentViewSet` GET is tenant-filtered and orders **newest first** by `createdat`; DRF pagination is on, but Web requests 25 and never exposes `next`. Its serializer emits `commentid`, `requestid`, `authorid`, `messagemd`, read-only `message`, `visibility`, `createdat`. No nested author label, `created_at`, `id`, or attached files are emitted. POST `{body}` maps to `messagemd`; blank is allowed; visibility defaults `public` but GET is not visibility-filtered and no private/internal authorization is present. Creation attributes `authorid` to request **requester**, not actual authenticated actor, and calls `notify_comment_added`; it does **not** create Activity. Web's `normalizeComment` expects `created_at`, so its `id && createdAt` filter drops current API rows. If that alias is corrected, current `authorName` falls back to `Unknown user`, not a true author label. Web sends `sort=created_at`, but API ignores it and returns newest first.

`ActivitySerializer` emits `activityid`, `requestid`, `actorid`, `type`, `payload` (JSON text string), `createdat`. `/activity/` and `/activities/` both serialize the full tenant/request queryset, newest first, no pagination. No actor summary, human event label or typed payload exists. Web expects `id`/`activityid` plus `created_at` and filters out all current `createdat` rows; if fixed, it still falls back to `System`, `updated request`, and `JSON.stringify(payload)`, adding quote/escape noise to JSON strings. Creation writes `request.created`; transitions write `request.transitioned`; separate close/reopen write `request.closed`/`request.reopened`; upload finalize writes `attachments.finalized`. PATCH assignment creates **no** Activity in current `perform_update`; plain comment also creates none. Transition comment creates a Comment plus Activity with `comment_id` in JSON payload. Upload finalize creates a grouped Comment/Attachments plus Activity with comment/group IDs and filenames. Notification calls: create (and assigned if initially assigned), assignment to a new non-null user, closed-category transition, comment POST/finalize. No reopen or generic transition notification is shown in these services. See `apps/rt/views.py` and `tests/test_transitions.py`, `tests/test_uploads.py`, `tests/test_comments.py`.

| User action | Comment row | Attachment rows | Activity row | Current client-synthesized comment event |
| --- | --- | --- | --- | --- |
| Request created | no | no | `request.created` | no |
| Plain comment | yes | no | no | yes, when body nonblank and parser fixed |
| Comment + files | yes, one group | N | `attachments.finalized` | yes, when body nonblank and parser fixed |
| Assignment changed | no | no | **no** | no |
| Transition | optional | no | `request.transitioned` | yes when comment supplied and parser fixed |
| Close/reopen via generic Web transition | optional | no | `request.transitioned` | yes when comment supplied and parser fixed |
| API-only close/reopen | optional | no | `request.closed`/`request.reopened` | yes if later displayed and comment parser fixed |

Current UI has separate Comments, Attachments and Activity cards; Activity concatenates server events and synthesized nonempty comment events, so transition and upload can appear twice without grouping. Due to current parser mismatch, real API comments/activity can instead appear falsely empty. A final timeline must have one canonical paginated stream with typed event entries or a documented deterministic merge/dedup key and cursor across comment+activity; do **not** concatenate separately paginated lists. Show actor/time, readable verb and optional comment/files; unknown payload stays behind a safe text-only disclosure, never raw JSON by default. Preserve an attachment inventory as a supporting view only if retrieval/status calls for it.

## Attachments, downloads and scan state

`AttachmentSerializer` fields are `attachmentid`, `requestid`, `commentid`, `groupid`, `filename`, `contenttype`, `sizebytes`, `storageurl`, `checksum`, `scanstatus`, `createdat`. GET is tenant-filtered, newest first, paginated; Web asks for 50 but never follows `next`. Core Detail serializer has **no** attachments field and Comment serializer has **no** attachment list. The canonical current source is GET `/requests/{id}/attachments/`; Web's optional `detail.attachments` and `comment.attachments` are tolerant aliases not populated by this API. Web combines core + GET arrays without dedup, then AttachmentsSection dedups by ID, with comment-embedded data winning. It does not map comment/group IDs or attachment timestamp; current cards show filename, size, scan status, and an `Open` link whenever `downloadUrl` exists.

`normalizeAttachment` treats `download_url`, `storage_url` and `storageurl` as equivalent. The API's `storageurl` is constructed as `MINIO_PUBLIC_URL` **or** `MINIO_ENDPOINT` + bucket/object key; this is neither a presigned GET nor a scan-gated download contract. If endpoint is internal, the browser may not reach it; if public, a pending/blocked object may be exposed directly. Current Web does not gate link by `scanstatus`. **M7B API CONTRACT REQUIRED:** authorize tenant/request/attachment, require clean scan, return a short-lived download URL or controlled streaming response with explicit pending/blocked errors; never infer a client URL from object key/storageurl. Pending: status only, no Open. Clean: named download after authorized URL. Blocked: explain unavailable, no Open. The Web must not use storageurl as downloadUrl. No scanner/clean transition implementation is established by the inspected files.

## Upload state machine and failure boundaries

No-file composer sends only Comment POST. File composer sends init (one group UUID, presigned S3 PUT URL per file, 3600-second expiry, Content-Type signed), then `Promise.all` direct PUTs, then finalize with one comment and N attachments. Finalize sets each `scanstatus="pending"`, emits `attachments.finalized`, and notifies comment-added. The response includes IDs/`storage_url`, not a safe download URL. Web sends size and content type but no checksum; API accepts optional checksum. API serializers require at least one file and filename <=255/content type <=100/size >=0; there is no client count/aggregate-size limit and no visible configured maximum in inspected endpoint. Web requires nonempty comment **or** files, so file-only submission is allowed.

Current init creates no DB reservation; finalize accepts an object_key list supplied by the caller. Source does not verify that keys came from init, match the group, exist, have the stated size/checksum, or are scan-clean. `idempotency_key` is accepted by serializer but ignored by finalize logic. Partial PUT failure leaves other successful objects, skips finalize, shows a generic error, and leaves files/comment selected; retry starts a new init/group and PUTs all files again. Finalize failure leaves uploaded objects and same draft; retry repeats init/PUT/finalize and could create another comment/attachments if the first finalize committed but response failed. `Promise.all` is not cancellation; other PUTs can complete after first rejection. These are M7B upload integrity/idempotency issues, not M7A changes. Direct PUT does not carry API Authorization/X-Tenant; presign URL authorizes object upload. No actual storage/scan behavior was tested.

## Transition and assignment contracts

GET available transitions returns an array of `transition_id`, `from_status_id`, `to_status_id`, nested `to_status` (ID, flow ID, name, category, is_terminal). No label, `is_terminal` top-level or `requires_comment` is emitted. Web derives `Move to {name}`/`Close Request`, derives terminal from nested status and sets `requiresComment=false`. API `RequestTransitionSerializer` makes `comment` optional and `apply_transition` does not enforce a requirement; any product requirement for comments on a transition is **not** present in current contract. Workflow guards stored in `guardrolesjson`/`guardpermsjson` are not consulted by `get_available_transitions` or `apply_transition`; it filters only current flow/status. Response is flat `RequestSerializer` (not nested Detail); Web ignores it and refetches. A generic transition to a closed target writes `request.transitioned` (not `request.closed`), though it calls closed notification when category changes to closed. Separate close/reopen actions choose first qualifying transition, return the same flat request shape, and produce `request.closed`/`request.reopened` Activity; Web does not use them. Reopen only appears in Web if an available open-target transition exists.

Assignment PATCH accepts UUID or null; `RequestSerializer.validate` checks assignee membership in current tenant when non-null and validates existing flow/status/requester too. It updates `updatedat` and returns flat Request fields. New non-null assignee triggers notification; null/unassigned does not. There is no assignment Activity. Web eagerly loads only first `/users/` page on every Detail mount, labels display_name/email but stores user_id, sends null for Unassigned, then reloads the whole bundle. Directory membership is not an assign permission; the API currently has no operation-specific `assign` check.

## Current authority and capability matrix

All listed API views require authentication (`TenantPermission`/`IsAuthenticated`), and request-object reads/writes are tenant-filtered where described. `TenantMiddleware` requires `X-Tenant` and resolves tenant code; it checks Django `request.user` membership if authenticated at middleware time. JWT/DRF authentication occurs later, so do not equate the middleware branch alone with operation-specific RBAC. There is no server capability response for this workspace. The Web shows composer, assignment and available-transition UI to any authenticated viewer. This matrix is **source behavior**, not an endorsed permission policy.

| Operation | Server authority found | Current UI behavior / gap |
| --- | --- | --- |
| View core | authenticated, `BaseTenantViewSet` tenant queryset | page shows generic API error; 404/403 not differentiated |
| Comment | authenticated; tenant-scoped parent on POST/list queryset | composer always visible; requester used as author; no comment permission |
| Upload | authenticated; init/finalize parent tenant lookup | upload always visible; finalize object/group validation absent |
| Assign | authenticated, tenant-scoped request + target membership validation | control always visible, first-page users only; no assign permission |
| Transition | authenticated, tenant-scoped request + current flow/status transition | UI always visible; stored role/permission guards not evaluated |
| Download | no clean/authorized download action found | Web links raw storageurl regardless of scan state |
| Close/reopen | authenticated, tenant-scoped parent + qualifying transition | generic transition UI is authority; dedicated API endpoints unused |

M7B must first decide and document the intended roles/capabilities with product/API owners, then enforce them server-side and expose only authoritative action availability to Web. Hiding UI alone cannot close these gaps. Negative tests must cover no auth, wrong tenant, nonmember/forbidden, unavailable transition, invalid target user and unclean download. Do not invent a client-side RBAC matrix in M7C.

## Partial failures and architecture decision

`getRequestDetailBundle()` awaits core, then `Promise.allSettled` for comments/attachments/activity. Any one rejection becomes an empty array; the page clears/replaces that region with valid EmptyState. Because the API's current comments/activity shape is also misparsed, even successful nonempty responses can look empty. A core failure clears all regions and renders ErrorState. Transitions failure clears choices but its `ErrorState` is hidden when transitions length is zero (early EmptyState return). Users failure keeps current-assignee text but shows a local error; a failed mutation retains old context but a subsequent full refresh can re-trigger unrelated failure. M7C must model each region as loading/ready-empty/ready-data/error with local Retry, keep successful context, and avoid global reload except when needed.

| Option | HTTP / payload | Isolation and durability | Decision |
| --- | --- | --- | --- |
| A. Keep current endpoints, improve Web orchestration | 4 core/collection GET + action/directory; small paginated comments/attachments but unbounded activity | local retries possible after fixes; cross-stream ordering and duplicate semantics unsolved | viable interim only |
| B. Use existing `/detail/` bundle | 1 GET (+ actions/users), unbounded comments/files/activity | all-or-nothing, increasing payload, no cursors; serializer duplication | reject as final default |
| C. Bounded workspace bootstrap | 1 core+recent stream GET (+ lazy actions/users); explicit limits/cursors required | good if independently retryable region errors; new endpoint/test surface | optional if measured latency warrants |
| D. Core Detail + paginated unified timeline | 2 initial GET (+ actions when shown, lazy users); bounded payload, cursor continuation | clear ownership, isolated retry, one source of chronology | **recommended minimum durable architecture** |
| E. Compact bootstrap + paginated timeline + lazy metadata | 1-2 initial GET (+ action on demand) | most compact initial UX, but more API surface/versioning | defer until D is measured |

Recommendation: retain core `GET /requests/{id}/`, add a bounded, cursor-paginated unified timeline API that emits typed request-created/assignment/transition/comment/attachment-group entries with stable `(created_at,id)` ordering, actor summary and canonical attachment group/status references. Keep the separate tenant-scoped attachment inventory only if a full file list is needed; paginate it and never duplicate it in initial bootstrap. Read transitions near the actions surface (may remain one initial GET), load searchable/paginated tenant users only when assignment opens. Do not switch to unbounded bundle to win an HTTP-count contest. If API owners choose a smaller incremental path, it must still solve current DTO aliases, pagination, dedup, actor attribution, scan-gated downloads and operation authority before declaring M7C complete.

### M7B bounded API scope and acceptance

1. Define/generated OpenAPI for a tenant-scoped cursor timeline (or equivalent bounded stream) with typed stable event IDs, actor labels, comment body/visibility policy, attachment group/status summaries, next cursor, immutable ordering and no raw JSON primary display. Prove pagination/tie handling and bounded ORM query growth. Preserve existing endpoints during migration.
2. Correct/comment on actual actor attribution and assignment events; resolve transition comment linkage and upload grouping without double counting. Specify whether visibility has private semantics; either enforce it or state public-only. Resolve whether workflow guard fields are supported; if so enforce on list **and** POST, otherwise do not promise them. `requires_comment` remains absent unless a separately approved rule is enforced by API.
3. Add an authorized, clean-only download/open contract; never return/serve pending or blocked object links. Validate finalize object keys/group/ownership/existence/metadata and make finalize retries idempotent (or define explicit recovery). Define upload size/count limits if policy requires them. Add negative/partial tests.
4. If per-operation RBAC is intended, enforce it on comment/upload/assign/transition/download and expose server-authoritative capabilities or permission denials. Keep tenant isolation. Update `/api/schema`, serializers, integration/negative tests and migration notes. No SQL changes in M7A; any needed DB/scan infrastructure is an explicit M7B decision.

### Exact M7C Web handoff

After M7B contract is implemented and versioned, replace the fragmented page using `docs/design/08-request-detail.md`: public UUID route, semantic theme, one timeline/composer, compact properties/actions, correct DTOs, bounded continuation, explicit per-region failure/retry, scan-safe attachment links, lazy complete user picker, mutation-specific refresh, context-safe Back, and keyboard/mobile acceptance. Keep transition POST as the only Web status change and null assignment behavior. Add intercepted production-preview request-budget tests plus live API/MinIO/scan/tenant checks as separate evidence. Target: initial core + first timeline page + transitions if visible (2-3 GETs, plus zero eager users); comment submit 1 write + 1 timeline read; assignment 1 PATCH + 1 core read (and timeline if server emits assignment); transition 1 POST + core + transitions + timeline; file submit 2 API POST + N storage PUT + timeline/attachment read as needed. These are acceptance **targets**, not current API guarantees. Never drop a necessary refresh just to meet a number.

## Unresolved questions

- What is the intended permission policy for view/comment/upload/assign/transition/download, and how should JWT users map to domain actors? Current source is permissive relative to the stored workflow guard fields.
- Should visibility be public-only or enforced private/internal, and who can see each comment? No private UX is authorized yet.
- What scan service marks pending/clean/blocked, how are infected files purged, and should clean downloads be presigned GET or API stream?
- What recovery/idempotency protocol covers successful PUT with failed finalize, timeout after commit and orphan object cleanup? Is there a file count/size policy?
- Must activity include every assignment and plain comment, and which event is authoritative for the unified timeline? What retention/page-size SLA applies to long-lived requests?
- Should nonclosed terminal transitions send a closed notification? Is `request.closed` event type tied to action endpoint or target status semantics?
- Is a direct `/requests/{id}` deep link expected to fall back to Home when Back has no same-app history? How should 403 vs concealed 404 be worded without leaking tenant existence?
- Live `/api/schema`, SQL query counts, scan/MinIO behavior, deployment, and true permission behavior remain unverified from this documentation-only checkout.
