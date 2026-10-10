# Request Detail operational workspace (M7A specification)

Normative product baseline: `docs/design/00-Request-Tracker-UI-UX-Design-Blueprint-v1.1.md` section 18 and R7, plus `docs/design/03-design-tokens.md`, `04-component-system.md`, `05-app-shell-navigation.md`, `06-dashboard.md`, and `07-search.md`. Source/contract evidence and M7B prerequisites: `docs/plans/sprint-4/m7-request-detail-contract.md`. This document specifies M7C UX; it does **not** authorize M7B/C implementation or change existing workflow, upload, tenancy, routes or RBAC.

## Workspace mission and current UX inventory

At `/requests/:id`, answer **what is happening, who owns it, and what can I do next?** Preserve public request UUID in route, human ID as display metadata, real API data, assignments, transition-controlled lifecycle, grouped file upload, comments, attachments and history. Current `src/pages/RequestDetailPage.tsx` has one header plus four large `card` sections (Details, Comments, Attachments, Activity) and a permanent property `card` containing a full workflow form and full assignment form. This creates repeated content, makes the composer precede conversation, and leaves workflow actions detached from request context. Comments, attachment inventory and Activity can describe the same action in different regions. The page uses `legacy-page`, raw white/neutral/primary/danger utilities, `.btn`, 20px card radius/shadow and a fixed 320px rail at `lg`; shared semantic primitives are present but mostly unused here.

The page currently has one h1; StatusBadge and PriorityChip preserve text beside tone, and `RequestTable` links from Dashboard/Search by `request_id`. It lacks a safe direct-link Back fallback, distinct partial failure states, paged history, selected-file removal, upload progress, clean-only download contract and action-specific capability data. These are evidence-based gaps, not grounds to simulate behavior in M7A.

## Target information hierarchy

1. **Context line:** Back to prior Dashboard/Search URL when there is same-app navigation context; otherwise a named Home fallback. Never call `navigate(-1)` blindly for direct deep links or browser refresh. Preserve query/page/filter URL; do not replace it with a new default.
2. **Identity and immediate state:** readable human ID, one h1 request title, StatusBadge and restrained PriorityIndicator. Keep status/priority text visible without relying on color. Most relevant server-allowed workflow action belongs near this context; rare actions may disclose rather than consume a permanent form.
3. **Main workspace:** description, then one chronological Activity stream with comments, transitions, request changes and file groups in context. One combined comment/file composer sits adjacent to the stream and remains usable without scrolling through unrelated cards.
4. **Properties:** status, priority, flow, requester, assignee, due, created and updated in a compact definition-list-like rail. If custom fields become structured and supported, add them deliberately; current nullable string is not a safe editable form. Tags remain absent from UI because API returns a stub `[]`.
5. **Supporting files view:** optional compact attachment inventory for finding files across a long timeline; it must share the canonical attachment data/status and not create a second conversation feed.

Use an unframed two-column layout at large widths with a 1px divider or subtle surface distinction, not nested cards. Strong hierarchy comes from type, spacing and separators. Keep AppShell global navigation, Search/New Request, route focus and one `main` landmark. The Detail page does not own shell data.

## Header, description and properties

Header shows human ID as readable metadata and request title as h1; if human ID is unavailable, show an honest unavailable label rather than a UUID as primary label. Route resolution still uses the public request UUID. Long title wraps without colliding with badges/actions. Back is a button or link with destination-specific accessible name; preserve Dashboard/Search URL state. Direct deep link, refresh, malformed ID and foreign-tenant ID need distinct recoverable states where API policy permits. Do not show local demo data or fabricate a request.

Description preserves whitespace as plain text; empty description has a quiet truthful placeholder. Do not render raw HTML/Markdown unsanitized. Property labels/values should be semantic and scan-friendly, with native `<dl>` or equivalent label/value association. Status is **read-only display** outside server-provided transition actions; no generic status PATCH. Priority, flow, requester, due and timestamps are display-only in first M7C because this audit does not establish dedicated safe inline editing rules. Assignee alone has current PATCH support. Timestamp formatting must preserve full date when needed for history; avoid ambiguous month/day-only dates. Null due and assignee are explicit, not `-` when that would mislead.

## Assignment interaction

Show current assignee as a concise property. A named **Change assignee** action opens a compact inline disclosure or small accessible dialog, rather than a permanent Current Assignee + select + Save form. Native searchable/paginated user selection is required for a real tenant directory beyond 25 users; display display_name/email, submit user_id, and allow Unassigned as JSON null. If API does not expose search/continuation safely in the chosen picker, keep a bounded dialog with server search; never claim a first-page list is complete. Directory loads lazily when the action opens, has local loading/error/retry and preserves the current label if it fails. Save has pending/success/error states; refetch core after PATCH. Do not infer assign permission from directory access; API denial remains authoritative and any future capability must be server-issued.

## Workflow actions and close/reopen

GET available-transitions remains the current authority for which **status transitions** exist. Show readable action derived from `to_status.name`; store/send `transition_id`, not status ID. Terminal/closed action may receive stronger danger/confirmation treatment proportional to business consequence, but it is still POST `/transition/`. Close/reopen API aliases are not Web authority today. A closed request can reopen only when server returns an open-target transition. Show no-action state honestly, separate from failed-to-load actions. Do not display a required-comment marker: current API neither exposes nor enforces `requires_comment`. If M7B adds a real rule, bind the comment field/validation to that response and server error. Optional transition comment is part of the action and appears once in timeline, linked to transition. Keep failure messages near the action and do not overwrite request state optimistically without safe rollback. A transition success refreshes core, available actions and timeline; user catalog and full file inventory need not reload by default.

## Unified Activity model

The final primary stream is one bounded, chronological source, not an append of separately paginated comments and Activity. Each entry has actor (or honest unknown/system attribution), event verb, full timestamp, optional plain-text body and optional attachment group. Render known current event families as:

| Event | Primary wording/content |
| --- | --- |
| `request.created` | request created; optional safe title/initial status summary |
| Plain comment | author commented; body as text |
| `attachments.finalized` | author added N files; one group with optional comment body, no duplicate comment item |
| `request.transitioned` | actor moved request from readable status to readable status; linked optional comment once |
| `request.closed` / `request.reopened` | closed/reopened only when emitted by API-only actions or future equivalent contract |
| Assignment change | only when M7B emits authoritative event; never fabricate audit history from current PATCH |

Current payload is JSON text with UUIDs, so M7B must provide typed fields/readable summaries or a mapping contract. Unknown event types get a neutral verb and a collapsed, text-only detail disclosure for safe diagnostics, not raw quoted JSON as primary copy. Use separators/compact timeline rows, not a card per event or repeated decorative icons. Preserve server ordering with stable tie-break and continuation. Announce new entries/pagination without making every cell a live region. Comments do not need a second full Comments application in Detail. A supporting file inventory may be needed for findability but should not duplicate event narration.

## Combined comment and upload composer

One labelled textarea and one labelled multiple-file input support text-only, file-only and text+file submission under current contracts. Show each selected filename/size/status and a named Remove action before submission; no drag/drop is required. Disable duplicate submit while in flight, retain the draft on failure and distinguish init, uploading N files, finalizing, and refreshing. An uncertain finalize result must not invite blind resubmission; M7B must establish idempotency/recovery first. The group yields one comment with N attachments. Do not promise clean download immediately after finalize: new attachments start pending. File count/size validation must use real API policy, not invented client limits. Use current shared M3 Field/Textarea/Button/InlineNotice/ErrorState patterns when implementing, with per-step accessible status updates and focusable error recovery.

## Attachment source, states and download

The current API's canonical file inventory is GET request attachments; core Detail/Comment DTOs do not embed files. M7B may provide timeline attachment-group summaries, but inventory and stream must share IDs and scan state. Dedup by public attachment ID, not filename; keep comment ID/group ID for context. Display filename, size/type if known, timestamp and explicit scan status. **Pending:** status and no Open. **Clean:** named Download/Open only from authorized short-lived API contract. **Blocked:** warning and no Open. Missing/unknown scan status is unavailable, not presumed clean. Never link directly to current `storageurl`, internal MinIO host or user-derived object key. Attachment row failure is not “No attachments”; offer local retry. Preserve one grouped comment for multi-file upload.

## Loading, empty and error model

| Region | Loading | Genuine empty | Failure and recovery |
| --- | --- | --- | --- |
| Core request | compact structural skeleton; no stale wrong-ID request | not applicable | 400/403/404/general API state as policy allows; retry core without demo fallback |
| Timeline | independent rows skeleton, keep core/properties | no activity yet only on successful empty page | local ErrorState/Retry; never convert reject to `[]` |
| Workflow actions | local busy status | no available transitions only after successful response | local error/Retry, do not call it terminal just because list failed |
| Assignment directory | only while disclosure is open | no tenant users available only on successful complete result | retain current assignee, local Retry, no fake option |
| Attachment inventory | local loading | no files on successful empty result | local Retry; stream/core stay visible |
| Composer/upload/mutation | step-specific pending; prevent double submit | no draft is idle, not an empty data set | inline exact backend error, preserve draft, explain uncertain finalize outcome |

Core failure should not trigger unrelated directory load. A non-core failure must not erase successful context. Background refresh should keep correctly scoped data with a small busy indicator; a new request ID must not show prior-request data. State announcements use `role=status` for progress/success and `role=alert` for errors without repeated noise.

## Light, Dark, System and responsive behavior

M7C removes `legacy-page` only when every Detail descendant uses semantic token roles under the existing `html[data-theme]` contract. Replace page-local `bg-white`, `text-neutral-*`, `border-neutral-*`, raw primary/danger color and `.card`/`.btn` styles with approved M1/M3 roles; no new palette, body theme class or broad global reset. Test populated/loading/empty/error/dialog/pending attachment states in Light, Dark, System-light and System-dark. Use StatusBadge and PriorityIndicator compatibility without changing other consumers.

| Width | Target composition |
| --- | --- |
| 1440 | wide activity/description column and compact properties rail; header actions visible without hero treatment |
| 1024 | controlled narrower rail or stack when content no longer fits; long values wrap, no horizontal page overflow |
| 768 | one main flow with properties following identity/description or in an accessible disclosure; actions reachable before deep history |
| 320 | single column, compact ordered properties and composer; selected files wrap/remove controls remain reachable; no two-column attachment grid or huge card stack |

Breakpoints follow content rather than device labels. Test 200% zoom, long title/user/file names, native select/dialog reflow and no document-level horizontal overflow at 1440/1024/768/320. Preserve dense operational rows at desktop and sensible grouping at 320.

## WCAG 2.2 AA acceptance

- Exactly one h1; logical heading order and existing AppShell skip/main route focus. Back has context-specific name and safe destination.
- Status/priority/scan state/transition availability conveyed by text as well as color; documented token pair contrast and visible focus on every interactive control.
- Properties have programmatic label/value relationships. Timeline has semantic list/feed order, actor/event/time text and accessible continuation. Unknown payload disclosure does not expose raw JSON by default.
- Composer textarea/file input have explicit labels/help/error associations. Selected-file Remove names identify the file. Upload step/progress and completion are announced without stealing focus; a retry does not duplicate work silently.
- Transition selection exposes selected state programmatically (native select/radio or correct button semantics); optional/required comment association reflects **real** API rule. Assignment disclosure/dialog has initial focus, Escape/close behavior, restoration and pending-state protection.
- Pending/blocked attachments are not links; clean Download link names the file. Every empty state requires a successful data read, while failures announce Error and offer local retry.
- Keyboard-only path covers Dashboard/Search link -> Detail -> assignment/comment/files/transition -> Back. Targets meet WCAG 2.2 AA target-size/spacing exception policy; 200% zoom and 320px reflow have no horizontal document overflow or clipped actions.

Current E2E covers basic Detail route/mobile overflow and one transition POST; no permanent assignment/upload/partial-failure/scan/download/long-history Detail suite exists. Add focused intercepted dev **and production-preview** checks during M7C; live API/MinIO/scan/tenant behavior is a separate integration gate, not proved by mocks.

## Anti-AI-design rules and deferrals

Use restrained operational density, 1px separators, compact metadata, semantic status, useful whitespace and limited motion. No giant hero, card-per-section/event, floating nested cards, glow, glass, gradients, oversized radius, decorative icon repetition or fabricated content. Do not replace working primitives or add a query-cache/overlay library automatically.

Deferred beyond M7A: all M7B/M7C runtime work, Create/Admin redesign, arbitrary status/priority/due editing, private comments without enforcement, creation-time files, drag/drop, saved views, live collaboration, WebSockets, speculative AI summaries, new routes, SQL/storage infrastructure and full screen-reader certification. The next step is the bounded M7B API contract decision in `m7-request-detail-contract.md`; M7C starts only after its required contracts and negative tests are available.
