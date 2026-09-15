# PLANS.md — Codex ExecPlans Standard

This file defines how Codex must create and maintain ExecPlans in this repository.

An ExecPlan is a self-contained implementation plan that a coding agent or a new engineer can follow without needing hidden chat context. Use an ExecPlan for complex features, cross-file refactors, security-sensitive changes, workflow changes, or any task expected to affect multiple modules.

## Non-negotiable rules

1. Read this file and the repository `AGENTS.md` in full before creating or executing an ExecPlan.
2. Every ExecPlan must be self-contained. Do not rely on prior chat memory.
3. Every ExecPlan must explain the user-visible outcome first.
4. Every ExecPlan must name exact repository-relative files and commands.
5. Every ExecPlan must contain acceptance criteria and verification steps.
6. Keep `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` updated.
7. For API or UI contract changes, update OpenAPI or design tokens before implementation.
8. Run the repo checks listed in `AGENTS.md` before suggesting a commit or PR.
9. For auth, tenancy, uploads, search SQL, database, permissions, or workflows, include negative tests.
10. Name the selected active ExecPlan in the task/prompt. Do not choose a plan from Sprint number, filename recency, or an old unchecked box.
11. Reconcile user-reported completion with code, Git, and verification evidence. Preserve historical decisions, but do not restart completed implementation because an old Progress item was never checked.
12. Run focused checks during iteration. Run the complete required check set at the PR gate, and rerun it only after relevant changes, failures, or unresolved risk justify the cost.
13. Distinguish actual runners, intercepted/mock tests, and live-service checks. Missing tooling remains an explicit gap; never silently weaken a requirement or invent a command.
14. Finish authorized work, make routine reversible choices that follow repository patterns, and ask only when material ambiguity changes the outcome or a real permission/managed-control boundary blocks progress.
15. When an instruction causes a pause, block, or scope change, name the file and applicable rule and distinguish the rule from your interpretation.

## Where plans live

- Shared standard: `.agent/PLANS.md`
- Active plans: `docs/plans/sprint-<n>/<feature>-execplan.md`
- Temporary plans: `.agent/tmp/` and must not be committed unless promoted.

## ExecPlan skeleton

# <Short action-oriented feature title>

## Purpose

Explain what a user or operator can do after this change that they cannot do now. Include how to observe it working.

## Repository orientation

Explain the relevant files and folders in this repo. Name exact repository-relative paths.

## Current behavior

Describe what the app does today.

## Desired behavior

Describe target behavior, edge cases, failure behavior, and security expectations.

## Scope

State what is in scope and out of scope.

## Implementation plan

Write step-by-step milestones. Each milestone names files to edit, focused iteration checks, the complete PR-gate checks, and expected observations. State whether each check uses local/mocked data or live services.

## Tests and verification

List unit, integration, manual, Postman, or browser checks. Include exact commands.

## Acceptance criteria

Use behavior-oriented criteria.

## Progress

Use checkboxes and keep updated. Separate implementation completion from deployment/live verification. Reconcile stale boxes explicitly instead of treating every unchecked historical item as active work.

## Surprises & Discoveries

Record facts discovered during implementation.

## Decision Log

Record decisions and why they were made.

## Outcomes & Retrospective

At completion, summarize what changed, what works, what remains, and follow-up issues.
