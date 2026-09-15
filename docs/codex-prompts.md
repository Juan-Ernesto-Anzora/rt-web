# Codex prompts — rt-web

Replace every `{placeholder}` before using a prompt. `{active_execplan}` must name one explicit repository-relative plan, for example `docs/plans/sprint-4/codex-astra-adoption-execplan.md`. Do not infer it from an old Sprint number or unchecked historical item.

## Context and planning

Read `AGENTS.md`, `.agent/PLANS.md`, applicable nearer `AGENTS.md` overrides, and `{active_execplan}` in full. Read the current ticket and the code/config/contracts it names. Inspect Git status, branch/base, actual package scripts, CI, and relevant verification/known-issue docs. Reconcile reported completion with code and evidence; treat completed plans as history and leave deployment/live-service state unverified when this checkout cannot establish it.

Update only `{active_execplan}`. Make it self-contained with goal, scope, implementation milestones, focused iteration checks, complete PR-gate checks, acceptance criteria, negative cases where required, and evidence modes. Do not write implementation code yet.

## Implement the selected milestone

Read `AGENTS.md`, `.agent/PLANS.md`, and `{active_execplan}` in full. Implement only `{milestone}` and keep the plan's Progress, Surprises & Discoveries, Decision Log, and Outcomes current.

Finish the authorized work end to end. Make routine reversible choices that follow existing repository patterns. Ask only when a material ambiguity can change the outcome or a real permission/managed-control boundary blocks progress. If an instruction causes a pause, block, or scope change, name the file and applicable rule and distinguish that rule from your interpretation.

Run focused checks while iterating. At the PR gate run the complete required Web set: `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test`, and `git diff --check`. Rerun the full set only after relevant changes, failures, or unresolved risk justify it. If the Windows pnpm wrapper fails before scripts execute, run the documented npm equivalents and report both outcomes. Do not claim missing tooling or intercepted Playwright APIs as live-service evidence.

## Review

Review `{head_ref}` against `{base_ref}` using `.agent/code_review.md`. Read `AGENTS.md`, `.agent/PLANS.md`, and `{active_execplan}` first. Confirm the actual refs and working-tree scope; do not assume local `main` is current. Keep the review read-only.

Lead with findings ordered by severity and include tight file/line references. Focus on correctness, tenant isolation, auth/permissions, public API naming, error behavior, regressions, accessibility, tests, documentation, and evidence mode. Reconcile historical plan text with current code. If no findings remain, say so and list residual mocked/live/deployment gaps.

## Handoff

Read `AGENTS.md`, `.agent/PLANS.md`, `{active_execplan}`, verification docs, known issues, package/build files, and CI. Do not change files.

Report repository/branch/HEAD/working-tree state; completed behavior with code evidence; current limitations; uncertain deployment evidence; active instruction/config sources; stale paths or commands; exact available checks and whether each is static, mocked, or live; and the next bounded task with acceptance criteria. Distinguish Codex development configuration from application-level OpenAI integration. Never infer the active model from prose or a default config; use client-visible status when available, otherwise report it as unknown.
