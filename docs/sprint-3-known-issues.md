# Sprint 3 Known Issues

## Release blockers

### Authenticated disposable browser rehearsal

The real 25-step mutating browser demo was blocked safely at `/login`: tracked credentials are intentionally empty and no disposable database target was verifiably active. The normal `rt` database was not mutated.

Impact: automated Web contracts pass, but full release sign-off still requires the exact routes in `docs/sprint-3-demo-script.md` against a disposable/restorable clone.

Evidence: real browser route `http://127.0.0.1:5173/login`; downstream blocked routes are `/admin/workflows`, `/admin/users`, `/admin/roles`, `/admin/sla`, `/admin/reports`, `/admin/settings`, `/requests/new`, `/requests/{request_id}`, `/search?q=WEB-D10-<suffix>`, and `http://localhost:8025`.

### API final-hardening delivery

API polish is merged. At inspection time the API Day 10 final-hardening worktree contains the Postman/demo/release artifacts and composite-removal fix but still requires its recommended commit/merge/deployment before the coordinated release candidate.

### Database upgrade deployment

Sprint 3 API settings/audit schema changes use unmanaged Django models and companion SQL upgrades. Infrastructure must apply the approved upgrade scripts to the target SQL Server before the real-stack release smoke.

Impact: Settings or expanded audit behavior may fail even when Web and API code are correct.

## Accepted limitations

### Browser smoke is Web-contract smoke

The Chromium Playwright suite intercepts APIs with explicit contract-shaped fixtures. It validates routing, auth state, permission UI, rendering, accessibility selectors, and responsive overflow. It does not prove SQL Server, tenant isolation, MinIO, Redis, MailHog, Celery, or API authorization behavior.

Mitigation: run the manual ACME full-stack checklist in `docs/sprint-3-web-verification.md` before release.

### Audit actor labels may be unavailable

Audit responses expose `actor_id`, not actor display data. The Web resolves labels through `/api/users/`. Actors who are inactive, removed from the tenant, or absent from the lookup display as `Unknown actor` rather than a UUID.

### Audit entity links are area-level for some entities

Requests link directly to Request Detail. User, membership, role, workflow/status/transition, SLA, and notification-template records link only to an existing relevant Admin area unless that page already supports stable entity selection. The Web does not create speculative routes or dead links.

### Feature flags are configuration-only

`adminConsole`, `slaEnabled`, `exportsEnabled`, and `notificationTemplates` store tenant configuration. Day 8 does not enforce all existing routes from those values. Disabling `notificationTemplates` selects built-in notification fallback rather than suppressing notifications.

### Timezone and page-size runtime adoption

`default_timezone` and `default_page_size` are tenant client configuration. They do not mutate Django process-global timezone or every existing endpoint's pagination behavior.

### Existing-user membership discovery

The API does not expose a tenant-safe labelled lookup of domain users who are eligible to join but are not current members. The Web supports atomic RT-user/current-tenant membership creation and does not ask operators for raw user UUIDs.

For the Day 10 browser demo, membership creation is evidenced by the atomic `{user,membership}` response and membership detail refresh. A separate standalone picker remains out of scope until a labelled eligible-user contract exists.

### Employee-code search

Admin user server-side search currently covers email/display name unless the deployed API polish expands it. The Web does not fake employee-code search by filtering one loaded page.

### Dashboard list enrichment

Dashboard request rows may perform request-detail enrichment calls to obtain readable nested status/assignee/requester/flow data. This can create extra requests on populated queues.

Follow-up: return complete summary-row nested labels from the list contract and remove detail fan-out.

### Unfinished global menu destinations

Keyboard Shortcuts, Saved Views, Notifications, and Switch Company/Tenant remain visible placeholders without completed destination flows. Day 9 does not add those product features.

### Automated browser coverage

Only Chromium smoke coverage is added for Sprint 3 release preparation. Firefox/WebKit and comprehensive visual-regression coverage are deferred.

## Development environment note

In the Codex non-interactive Windows runtime, the pnpm wrapper can abort script execution with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`. Equivalent npm package scripts are used to validate the project when that wrapper fails. CI continues to use pnpm on Ubuntu.
