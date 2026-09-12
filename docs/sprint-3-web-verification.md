# Sprint 3 Web Verification

## Scope

This document records the Sprint 3 Web release-preparation checks for Admin navigation, users/roles/workflows, reports/SLA, settings, audit, request detail, route failures, accessibility, responsive behavior, and browser smoke coverage.

The Web uses the shared Axios client for JWT and `X-Tenant`. The Playwright suite is a deterministic Web smoke suite with contract-shaped API interception; it does not replace the real API/database smoke listed below.

## Automated checks

| Check | Command | Result |
| --- | --- | --- |
| TypeScript | `npm.cmd run typecheck` | Passed |
| ESLint | `npm.cmd run lint` | Passed |
| Production build | `npm.cmd run build` | Passed, 139 modules transformed |
| Browser smoke | `npm.cmd test` | Passed, 7 Chromium tests in 12.6 seconds |
| Patch whitespace | `git diff --check` | Passed |

The exact requested `pnpm lint`, `pnpm build`, and `pnpm test` commands were attempted. In this non-interactive Codex Windows runtime, the wrapper aborted during dependency preflight with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` before the scripts ran. The same package scripts passed through npm. CI remains configured to use pnpm on Ubuntu.

Chromium is the intentionally supported automated browser for this milestone. The suite covers:

- Admin login and navigation.
- Users page with API-backed rows.
- Workflow page.
- Reports page with server-shaped KPI/breakdown data.
- Settings page with settings/flags/templates contracts.
- Audit page with paginated payload data.
- Unauthorized Admin route behavior.
- Friendly unknown-route 404.
- 320px page-overflow smoke for Users, Roles, Workflows, Reports, Settings, Audit, and Request Detail.
- Contract-exact workflow POST/PATCH and incremental first-status creation.
- Readable Request Create lookups with internal ID/null payload and `request_id` navigation.
- Exact transition `{transition_id,comment}` with no duplicate comment POST.

## Day 10 API preflight

- Live `GET http://127.0.0.1:8000/api/health`: 200, `{"status":"ok"}`.
- Live `GET http://127.0.0.1:8000/api/schema`: 200, 105,745 bytes.
- API release notes: 189 pytest tests, OpenAPI 0.2.0 validation, read-only Postman 32/92, Sprint 2 regression 8/17, disposable mutation Postman 69/178, SQL verification, and four MailHog events passed.
- Tracked Postman environment has empty username/password/TOKEN and `allow_mutation=false`.

## Route and data verification

- Root routing has a route `errorElement`, root React boundary, explicit 404, and friendly 403.
- Known API failures remain local page/section errors; the root boundary is not used to conceal them.
- Request Detail local demo records and `VITE_ENABLE_DEMO_DETAIL_FALLBACK` are removed.
- Home KPI failures render unavailable values rather than plausible zeros.
- API-read comments, attachments, and activity no longer receive generated IDs/timestamps when required server fields are absent.
- The Admin development override is restricted to Vite development builds.

## Accessibility and responsive verification

- Errors use alert semantics; loading states announce busy/loading state; success notices use status semantics.
- Home and Search request results use semantic tables with captions, scoped headings, and named Open actions.
- Shared pagination exposes page/count text and named Previous/Next actions.
- Dialogs capture the opener, establish initial focus, retain native modal containment/Escape behavior, and restore focus on close.
- Statuses retain readable text so color is never the only indicator.
- The app shell, Admin navigation, filters, tables, and Request Detail stack or scroll internally at narrow widths.

## Real-stack release smoke

This remains a required manual/deployment check because CI Playwright mocks API contracts:

1. Start the deployed API and Web with the current SQL upgrade scripts applied.
2. Sign in to ACME as an RT Admin with all Sprint 3 permissions.
3. Visit Users, Roles, Workflows, Reports, SLA, Settings, and Audit.
4. Confirm every request includes `Authorization` and `X-Tenant: ACME`.
5. Confirm `/api/admin/audit/` returns the expanded paginated entity/payload contract from the API Sprint 3 polish work.
6. Repeat `/admin` with a non-admin account and confirm friendly 403.
7. Force representative API failures and confirm no local/demo rows appear.
8. Verify 320px and desktop layouts with keyboard-only navigation and browser console open.

Day 10 live result: **BLOCKED at `/login` before credential submission**. No authenticated browser session or verifiably active disposable database target was available. The normal database is documented as clean, so no mutation was attempted. Exact blocked routes and the executable sequence are in `docs/sprint-3-demo-script.md`.

## API calls validated by Day 10 Web browser tests

- Workflow list/detail plus `POST /api/admin/workflows/`, `PATCH /api/admin/workflows/{flow_id}/`, and incremental `POST .../statuses/`.
- Request Create lookups: `GET /api/flows/`, `GET /api/flows/{flow_id}/statuses/`, and `GET /api/users/`.
- `POST /api/requests/` with public flow/status/requester IDs, lowercase priority, `assignee_id:null`, and navigation from response `request_id`.
- `POST /api/requests/{request_id}/transition/` with exact `{transition_id,comment}` and zero duplicate POST to `/comments/`.
- Existing smoke contracts for permission context, users, workflows, reports, settings, audit, dashboard/request detail, unauthorized Admin, friendly 404, and 320px overflow.

The tests use explicit contract-shaped interceptions. Live read-only API calls separately validated `/api/health` and `/api/schema` only.

## Secrets and credentials

- No real username, password, JWT, refresh token, API key, presigned URL, or infrastructure credential was added.
- `.env`/`.env.*` remain ignored.
- The Playwright JWT and password are visibly synthetic local test fixtures and authorize only intercepted mock responses.
- The API tracked Postman environment remains secret-free with empty credential/token values.

## Recommended commit

`fix(web): complete Sprint 3 browser demo hardening`

## Release status

Decision: **GO for the Web hardening commit/PR and CI; NO-GO for final coordinated release sign-off** until the disposable authenticated 25-step browser rehearsal and database restoration/cleanup evidence are complete. See [Sprint 3 known issues](sprint-3-known-issues.md).
