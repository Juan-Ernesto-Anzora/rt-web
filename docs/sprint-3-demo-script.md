# Sprint 3 Browser Demo Script

## Execution status

- Web Day 10 hardening: implemented.
- Live API preflight: `GET /api/health` returned 200 `{"status":"ok"}`; `GET /api/schema` returned 200 and 105,745 bytes.
- Automated Chromium contract demo: **PASS, seven tests in 12.6 seconds**.
- Real mutating 25-step browser demo: **BLOCKED before credential submission at `/login`**.

The live browser showed the ACME login form, but the tracked Postman environment intentionally contains empty username/password/TOKEN values and no disposable database target was verifiably active. The normal `rt` database is documented as clean. No credentials were entered and no mutation was sent.

## Required environment

1. Back up normal `rt`; create and select a disposable clone such as `rt_browser_day10`.
2. Apply all Sprint 3 upgrades and run `db/verify-sprint3-release.sql`.
3. Start SQL Server, MinIO, Redis, MailHog, API, and Web.
4. Provide local-only ACME RT Admin and non-admin credentials; never commit/export them.
5. Clear MailHog/browser storage and choose a unique `WEB-D10-<timestamp>` suffix.
6. Capture baseline setting/flag/template values and prepare one harmless text file.

Every RT API request requires Bearer auth and `X-Tenant: ACME`, except login/health and presigned MinIO PUT.

## Demo sequence

| # | Browser route | Expected API evidence | Visible pass condition | Failure/no-go condition |
| --- | --- | --- | --- | --- |
| 1 | `/login` | `POST /api/auth/jwt/create` → 200 tokens | Routes to Home as ACME admin | 400/401 stays on announced Login error |
| 2 | `/`, `/admin` | `GET /api/admin/me/permissions/` → RT Admin/18 permissions | Permission-aware Admin navigation | Hidden/403 for valid admin or leaked permission object |
| 3 | `/admin/audit` | Paginated `GET /api/admin/audit/` plus `/api/users/` | Readable event/actor/entity/time/details | Local 403/validation allowed; raw object/HTML is fail |
| 4 | `/admin/workflows` | GET list, POST `{name,description}`, PATCH detail | New workflow selected and edited after refetch | Phantom/duplicate/raw-ID workflow |
| 5 | `/admin/workflows` | POST Open/In Progress/Closed statuses; PATCH one | Three readable statuses and lifecycle coverage | Empty workflow cannot accept first status; duplicate/invalid not handled |
| 6 | `/admin/workflows` | POST two distinct transitions; PATCH one | Open → In Progress → Closed rows | Self/duplicate transition or malformed state |
| 7 | `/admin/users` | POST user → `{user,membership}`; PATCH separate disposable user inactive | New active RT user/member plus separate Inactive row | Claims login account creation or bypasses final-admin safeguards |
| 8 | `/admin/users` | GET memberships filtered by created user | Atomic ACME membership matches create response | Missing membership; improvised raw-ID standalone form |
| 9 | `/admin/roles` | GET, POST role, PATCH description | Custom role selected and refreshed | Duplicate/canonical conflict loses prior state |
| 10 | `/admin/users` | POST membership role `{role_id}` | Role appears on created membership | Duplicate/cross-tenant/403 changes visible state optimistically |
| 11 | `/admin/roles` | GET permission catalogue and role detail | Readable permission matrix | Unauthorized mutation or final-admin bypass |
| 12 | `/admin/sla` | GET, POST policy, PATCH targets/state | Readable policy/duration/state | Invalid minutes/priority/conflict not inline |
| 13 | `/admin/reports` | Filtered `GET /api/reports/summary/` | KPI/breakdowns equal response | Fake/stale values after failure |
| 14 | `/admin/reports` | CSV GET with current filters → Blob/filename | Server-named CSV download and success | Fake file, leaked object URL, unreadable Blob error |
| 15 | `/admin/settings` | GET, atomic PATCH one setting | Normalized refreshed value | Sensitive value shown/logged or partial save |
| 16 | `/admin/settings` | GET flags, confirmed PATCH exact key, restore | Exact key/state refreshed | Key normalization or failed optimistic flip |
| 17 | `/admin/settings` | GET list/detail; local preview; PATCH template | Escaped preview and refreshed saved template | Unknown placeholder transformed/HTML executed |
| 18 | `/` | Dashboard summary/list GETs | Normal Request Tracker shell/data | Admin state leak or demo/zero fallback |
| 19 | `/requests/new` → `/requests/{request_id}` | Flow/status/user GETs; request POST → 201 `request_id` | Names shown, IDs submitted internally, exact navigation | `/requests/-`, undefined/null/human-ID navigation |
| 20 | `/requests/{request_id}` | Users GET; request PATCH `{assignee_id}` | Readable assignee after detail refresh | Empty UUID or raw object/ID rendering |
| 21 | `/requests/{request_id}` | Init → MinIO PUT → finalize, then refresh | One comment groups uploaded files | Fabricated comment/file or incomplete upload shown complete |
| 22 | `/requests/{request_id}` | Available transitions; two POSTs with `{transition_id,comment}` | Open → In Progress → Closed; comments once | Request PATCH, `comment_markdown`, duplicate comment POST, stale action |
| 23 | `/search?q=WEB-D10-...` | Search GET with pagination/sort | Created request opens by `request_id` | Local rows, raw object, malformed link |
| 24 | `http://localhost:8025` | MailHog message API, no new RT mutation | Created/assigned/comment/closed mail with correct IDs/links/recipients | Missing/duplicate/wrong-recipient/template mail |
| 25 | user menu → `/login` | No API mutation; local/session storage cleared | Protected routes remain inaccessible after refresh/back | Token or authenticated content survives |

## Required negative checks

- Non-admin direct access: `/admin`, `/admin/workflows`, `/admin/users`, `/admin/roles`, `/admin/reports`, `/admin/sla`, `/admin/settings`, and `/admin/audit` must deny without exposing data.
- Refresh/deep links: all Admin routes, `/requests/new`, `/requests/{request_id}`, and `/search?q=...` must restore auth/tenant headers without loops.
- Forced API failures must show errors without local/demo records.
- No `/requests/-`, `/requests/undefined`, `/requests/null`, empty UUID, raw object child, `[object Object]`, stack trace, or HTML execution.
- At 320×720, required routes must avoid document-level overflow and retain keyboard-visible actions/focus.
- Browser Console must contain no uncaught application errors or React warnings during the successful recording.

## Blocked live routes

Because live execution stopped safely at `/login`, these exact mutating routes remain unverified in a real browser: `/admin/workflows`, `/admin/users`, `/admin/roles`, `/admin/sla`, `/admin/reports`, `/admin/settings`, `/requests/new`, `/requests/{request_id}`, `/search?q=WEB-D10-<suffix>`, and MailHog `http://localhost:8025`.

The non-mutating/mock-browser result does not promote those steps to Passed.

A screenshot of the real ACME login gate was captured during the browser session. For every blocked downstream case, the exact route is listed above so the rehearsal can resume deterministically once disposable credentials are supplied.

Current decision: **GO for Web hardening PR/CI; NO-GO for final release sign-off until this blocked live sequence passes and cleanup evidence is attached.**

## Cleanup

Restore setting/flag/template baselines, discard the disposable clone, verify normal `rt` has zero demo-suffix rows, clear MailHog/downloaded demo artifacts as required, and retain evidence references.

## Recommended commit

`fix(web): complete Sprint 3 browser demo hardening`

No secrets or real credentials are committed. `.env` remains ignored and all browser-test auth values are synthetic fixtures used only with intercepted APIs.
