# code_review.md — Codex Review Standard

Use this checklist when asking Codex to review a branch, PR diff, uncommitted changes, or a commit.

## Review priorities

1. Correctness: Does the change implement the requested behavior?
2. Tenant isolation: Can one tenant access another tenant's data?
3. Security: Are auth, permissions, uploads, SQL, and secrets handled safely?
4. API contract: Does public JSON use clean fields like `request_id`, `flow_id`, `created_at`?
5. Error handling: Are client mistakes returned as 400/401/403/404 instead of 500?
6. Tests: Are relevant tests added or updated?
7. Maintainability: Is logic in the correct service/component layer?
8. UX: Are loading, empty, error, and success states handled?
9. Documentation: Are OpenAPI, README, or demo docs updated?
10. Regression risk: What existing behavior might break?
11. Evidence mode: Which results come from static checks, intercepted Playwright APIs, live services, deployment, or user report?
12. Instruction drift: Do current paths/commands match the checkout, and are historical plan items being mistaken for active scope?

## Review operation

- Read `AGENTS.md`, `.agent/PLANS.md`, and the explicitly selected `{active_execplan}` in full before reviewing.
- Review the requested immutable branch/commit range against its intended base. Do not assume local `main` is current; report the refs actually inspected.
- Keep review read-only unless the user separately asks for fixes.
- Lead with prioritized findings and tight file/line references. If there are no findings, say so and identify residual test/live-service gaps.
- Use actual Web runners: `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `pnpm test`. Playwright intercepts API contracts by default; do not present it as live API/SQL evidence.
- If tooling or an instruction blocks the review, name the file/rule or missing runner and explain the concrete impact.

## Codex review prompt

Review `{head_ref}` against `{base_ref}`. Read `AGENTS.md`, `.agent/PLANS.md`, and `{active_execplan}` first. Reconcile completed historical milestones before treating an unchecked box as active. Focus on correctness, tenant isolation, public API naming, test coverage, evidence mode, and regressions. Do not make code changes. Return prioritized findings with file/line references, then residual risks and the checks actually observed or run.
