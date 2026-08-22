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
| Browser smoke | `npm.cmd test` | Passed, 4 Chromium tests |
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

## Release status

Web implementation and mocked-browser verification are complete. Full release acceptance remains conditional on the API Sprint 3 polish contract being merged/deployed and database upgrade requirements in [Sprint 3 known issues](sprint-3-known-issues.md) being resolved or explicitly accepted.
