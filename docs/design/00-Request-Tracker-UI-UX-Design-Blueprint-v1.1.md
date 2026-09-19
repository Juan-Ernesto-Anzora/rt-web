# Request Tracker UI/UX Design Blueprint v1.1

This file contains Blueprint v1 followed by the normative v1.1 reconciliation. Where the reconciliation conflicts with the original text, **v1.1 wins**.

---

# Request Tracker UI/UX Design Blueprint v1

**Project:** Request Tracker (RT)  
**Status:** Normative design baseline for redesign planning  
**Primary implementation repo:** `rt-web`  
**Related repos:** `rt-api`, `rt-infra`  
**Purpose:** Define the product UX, information architecture, design language, interaction rules, accessibility baseline, component model, screen behavior, and migration strategy before implementation with Codex / GPT-6 Astra.

---

## 1. Product vision

Request Tracker must evolve from a collection of functional screens into a coherent operational workspace for creating, finding, assigning, processing, monitoring, and administrating requests.

The redesigned product should feel:

- calm;
- fast;
- information-dense without becoming visually noisy;
- modern without imitating generic AI-generated SaaS dashboards;
- consistent across all routes;
- keyboard-friendly;
- accessible;
- predictable;
- easy to extend without redesigning basic UI decisions for every new screen.

The target experience is an **operations workspace**, not a marketing site and not a BI dashboard.

---

## 2. Design goals

### 2.1 Primary goals

1. Make the current user task obvious on every screen.
2. Reduce navigation cost between queues, search, request detail, and processing.
3. Make Request Detail the primary operational workspace.
4. Make Search a first-class navigation mechanism.
5. Replace fragmented Open/Closed search experiences with the unified request-centered search already designed.
6. Present dashboard information only when it supports an action or operational decision.
7. Build a reusable design system based on semantic tokens and accessible primitives.
8. Support Light, Dark, and System theme modes.
9. Preserve existing RBAC, tenant isolation, workflows, request-processing behavior, comments, attachments, and administrative rules.
10. Establish repeatable visual and interaction QA so future Codex-generated work cannot silently drift from the system.

### 2.2 Non-goals

The redesign must not:

- become a clone of Linear, Jira, Intercom, Vercel, Stripe, or any visual reference;
- introduce decorative charts without a workflow purpose;
- use gratuitous glassmorphism, glow, gradients, oversized radius, or floating cards;
- hide essential functionality solely to achieve a minimalist appearance;
- rewrite the API or database when UI changes alone are sufficient;
- replace working component libraries merely because a newer library exists;
- perform a one-branch “redesign everything” migration;
- alter permissions, workflow logic, tenancy, or request semantics without an explicit backend requirement and separate acceptance criteria.

---

## 3. Core UX principles

### P1 — Task first
Every page must answer a clear user question.

Examples:

- Home: “What needs my attention?”
- My Work: “What must I process?”
- Team Work: “Where is work accumulating?”
- Search: “How do I find a request quickly?”
- Create: “How do I submit this request correctly?”
- Detail: “What is happening and what should I do next?”
- Admin: “How do I safely configure the system?”

### P2 — Information hierarchy before decoration
Structure is created through:

1. typography;
2. spacing;
3. alignment;
4. contrast;
5. borders;
6. semantic color;
7. motion only when helpful.

Shadows, gradients, glows, illustration, and decorative containers are never the primary hierarchy mechanism.

### P3 — Operational density
Comparable records should normally use rows, lists, or tables.

Cards are appropriate for:

- heterogeneous dashboard summaries;
- grouped contextual information;
- empty/onboarding states;
- bounded summary modules.

Cards are not the default representation for long ticket lists.

### P4 — Progressive disclosure
Show what is required for the current task. Reveal advanced or workflow-specific options when needed.

Examples:

- Create Request reveals workflow-specific fields after workflow selection.
- Request Detail keeps frequent properties visible; rare actions live under an overflow menu.
- Search keeps common quick filters visible and advanced filters expandable.

### P5 — Direct manipulation
Frequent properties should be editable in place when permissions allow.

Examples:

- Status;
- Priority;
- Assignee;
- selected workflow properties.

Avoid unnecessary multi-step modal flows.

### P6 — System state is always visible
Users should never wonder whether the app is:

- loading;
- saving;
- saved;
- failed;
- filtering;
- empty;
- unauthorized.

### P7 — Preserve context
Navigating back from a request should restore the queue/search position, active filters, sort, and page when possible.

### P8 — Accessibility is architecture
Accessibility rules are applied at primitive/component level, not patched page by page.

### P9 — URL is useful state
Where practical, search/filter/sort/pagination state should be reflected in URL query parameters so views can be bookmarked, shared, reloaded, and restored.

### P10 — No generic AI design
Codex/Astra must not invent visual patterns page-by-page. New UI must reuse documented tokens, primitives, and patterns.

---

## 4. Product information architecture

### 4.1 Proposed primary navigation

```text
Workspace
  Home
  My Work
  Team Work
  Search

Requests
  New Request
  Saved Views / Queues   [phase-dependent]

Administration
  Workflows
  Statuses
  Priorities
  Users / Roles
  Permissions
  Other Configuration

Utilities
  Help                    [future/optional]
  Settings
  Theme
  Profile / Sign out
```

Visibility is permission-aware. Hidden destinations must not become an authorization mechanism; API authorization remains authoritative.

### 4.2 Navigation rules

- Left navigation is persistent on desktop.
- It can collapse to an icon rail at narrower desktop widths.
- Current route is visibly selected.
- User must not lose current queue state when opening and returning from a request.
- Search and New Request should remain globally reachable.
- Global search may later be exposed through `Ctrl/Cmd + K`.
- Administrative destinations are grouped separately from operational work.

---

## 5. App Shell

### 5.1 Desktop composition

```text
┌───────────────────────────────────────────────────────────────────────┐
│ Sidebar │ Context/header: page title | search | create | user actions │
│         ├─────────────────────────────────────────────────────────────┤
│         │                                                             │
│         │                    Main workspace                           │
│         │                                                             │
└───────────────────────────────────────────────────────────────────────┘
```

### 5.2 App Shell behavior

The shell owns:

- navigation;
- theme;
- global search entry point;
- create-request entry point;
- user menu;
- responsive shell behavior;
- global toast region;
- route-level error boundary;
- optional contextual breadcrumb/page header structure.

The shell must not own business-specific page data.

### 5.3 Width policy

- Main data-heavy pages should use most available width.
- Avoid arbitrary `max-width` that leaves large unused whitespace on 1440px+ screens.
- Forms and prose-like content may use narrower readable containers.
- Request Detail may use a flexible content column plus a fixed/contextual properties panel.

---

## 6. Visual language

## 6.1 Character

The product should feel:

- restrained;
- precise;
- professional;
- modern;
- technical but not developer-only;
- compact;
- confident;
- quiet.

### 6.2 Prohibited default aesthetics

Avoid by default:

- neon color systems;
- blurred glowing backgrounds;
- glass panels;
- gradients used as filler;
- 20–32px radius everywhere;
- giant hero headings;
- giant KPI cards;
- floating detached controls with no structural reason;
- excessive pills;
- cartoon illustrations;
- multiple competing accent colors;
- animation simply because an element entered the viewport.

---

## 7. Color and theming

### 7.1 Theme modes

The product must support:

- Light;
- Dark;
- System.

### 7.2 Semantic token model

Components consume semantic tokens rather than hard-coded colors.

Minimum conceptual tokens:

```text
background
foreground

surface
surface-subtle
surface-raised
surface-hover
surface-active

border
border-strong

muted
muted-foreground

primary
primary-hover
primary-foreground

focus-ring

success
success-surface
warning
warning-surface
danger
danger-surface
info
info-surface
```

Status-specific styling must still preserve text labels and/or icons; color alone may not communicate meaning.

### 7.3 Dark mode

Dark mode must:

- avoid pure black as the universal background;
- preserve meaningful surface separation;
- avoid overly bright saturated colors;
- maintain accessible contrast;
- use the same semantic component hierarchy as Light mode.

Dark mode is a theme, not an alternate component design.

---

## 8. Typography

Typography should optimize scanning and dense operational work.

Recommended scale:

```text
12px  metadata / auxiliary labels
13px  compact table metadata
14px  primary application body
15–16px emphasized body / form control text
18px  section heading
22–24px page title
24–32px dashboard metric when justified
```

Rules:

- No marketing-scale typography in operational screens.
- IDs may use a restrained monospaced treatment if it improves scanning.
- Table typography must remain readable at 100% browser zoom.
- Heading levels must retain semantic HTML hierarchy.

---

## 9. Spacing and geometry

### 9.1 Base spacing scale

```text
4
8
12
16
20
24
32
40
48
```

Use this scale consistently. New arbitrary spacing values require justification.

### 9.2 Radius

Conceptual radius tiers:

```text
small   4–6px
medium  8px
large   10–12px
```

Pill radius is reserved for controls or labels whose shape is semantically useful.

### 9.3 Borders and elevation

- Prefer 1px borders and surface contrast.
- Use shadow only for elevation such as popover, dialog, menu, or temporary raised surface.
- Do not use large permanent shadows around ordinary page cards.

---

## 10. Motion

Motion must support orientation and feedback.

Suggested timing bands:

```text
hover / press            100–140ms
small popover/menu       140–180ms
accordion/filter panel   160–200ms
drawer/side panel        180–220ms
page-level transition    <= 200ms and subtle
```

Allowed common uses:

- sidebar collapse;
- menu/popover;
- dialog;
- drawer;
- hover;
- accordion;
- filter expansion;
- toast;
- inline status update.

Avoid:

- floating card loops;
- decorative entrance animations for every page element;
- large parallax;
- persistent animated gradients;
- transitions that delay access to data.

Honor `prefers-reduced-motion`.

---

## 11. Accessibility baseline

Target: **WCAG 2.2 AA**.

Every reusable component must consider:

- keyboard operation;
- logical focus order;
- visible focus;
- accessible name;
- labels and descriptions;
- disabled/read-only semantics;
- sufficient contrast;
- non-color state communication;
- target size;
- screen-reader announcements for important async changes;
- focus trapping/restoration for dialogs;
- reduced motion;
- clear error association.

Accessibility defects in shared primitives are release-blocking because they propagate to all pages.

---

## 12. Responsive strategy

Primary target remains desktop operational use.

Design breakpoints should be based on layout behavior rather than device names.

### Large desktop
- persistent expanded sidebar;
- wide data tables;
- Request Detail main column + properties panel.

### Medium desktop / laptop
- collapsible sidebar;
- reduced table columns where justified;
- contextual property panel may narrow.

### Tablet-width
- icon/collapsible navigation;
- Request Detail properties may become a drawer;
- tables may hide lower-priority columns but must not hide essential actions.

### Small mobile
- basic functionality must remain possible;
- data may stack;
- detail/property panels become sequential;
- mobile must not dictate inefficient desktop layouts unless mobile becomes a primary product requirement.

---

## 13. Component architecture

Use this hierarchy:

```text
Tokens
  ↓
Primitives
  ↓
Reusable domain components
  ↓
Interaction/layout patterns
  ↓
Pages
```

### 13.1 Primitive inventory

Expected primitives include:

- Button
- IconButton
- Input
- Textarea
- Checkbox
- Radio
- Select / Combobox
- Date input / Date picker
- Tooltip
- Popover
- Dropdown menu
- Dialog
- Drawer / Sheet
- Tabs
- Badge
- Avatar
- Separator
- Skeleton
- Toast

Use existing accessible libraries if already established in the repo. Do not replace a working primitive library solely for trend reasons.

### 13.2 Domain components

Examples:

- RequestId
- StatusBadge
- PriorityIndicator
- UserIdentity
- FlowLabel
- RequestRow
- ActivityItem
- AttachmentItem
- PropertyField
- FilterChip
- FilterBar
- QueueToolbar
- SavedViewSelector
- Pagination
- EmptyState
- ErrorState
- PermissionState
- PageHeader
- MetricSummary

### 13.3 Rules

- Pages may compose components but should not reinvent primitive styling.
- No page-specific button variants unless they become an approved system variant.
- Domain components should not duplicate API-fetching logic if a page/service layer can own it.
- Accessibility and theme behavior belong in shared components.

---

## 14. Table/list pattern

Ticket collections should default to list/table presentation.

Recommended request row information:

- selection control when bulk actions exist;
- Human ID;
- title;
- status;
- priority;
- requester;
- assignee;
- flow;
- updated time;
- optional SLA/due information;
- overflow actions.

Rules:

- entire row may be navigable without making nested controls invalid;
- columns may be configurable later;
- sorting state is explicit;
- empty/loading/error states occupy the same content region;
- pagination should normally remain server-side;
- filters and sort should be URL-addressable when possible.

---

## 15. Dashboard specification

### 15.1 Dashboard mission

Answer:

> What needs my attention now?

It is an operational dashboard, not a generic analytics portal.

### 15.2 Proposed hierarchy

```text
Page header
  Greeting/context
  New Request

Attention summary
  Open assigned to me
  Waiting
  High/Critical
  Due soon / overdue (when supported)

Primary workspace
  My queue

Secondary insight
  workload / status distribution
  recent activity
```

### 15.3 Dashboard rules

- A KPI must imply an action or operational interpretation.
- Avoid “Total requests ever” unless it supports a concrete use case.
- Charts require a decision/use case.
- Clicking a metric should preferably navigate/filter into the underlying records.
- Do not duplicate request details through N+1/fan-out calls merely for readable labels; API contract should support the needed dashboard/list representation.
- Recent activity must remain concise and actionable.

---

## 16. My Work / Team Work

### 16.1 My Work

Purpose:

> Let me process my assigned workload quickly.

Features:

- quick status filters;
- priority filter;
- flow filter;
- sortable request list;
- useful default ordering such as urgency + recency;
- persistent state;
- click-through to Request Detail;
- possible keyboard row navigation in a later phase.

### 16.2 Team Work

Purpose:

> Show work outside my own queue that I need to understand, assist with, or manage.

Potential controls:

- assignee;
- status;
- flow;
- priority;
- requester;
- unassigned;
- updated range.

Avoid duplicating Search. Team Work is a curated operational queue, while Search is discovery.

---

## 17. Unified Search

The existing design direction remains valid: one request-centered search replaces separate Open and Closed request search experiences.

Search covers:

- request title;
- request description;
- comments;
- attachment filenames;
- structured filters;
- open/closed/status;
- assignee/requester;
- priority;
- flow;
- date ranges;
- sorting;
- pagination.

### 17.1 Search layout

```text
Search Requests

[ Search requests, comments, attachments... ]

Quick views:
[My Open] [High Priority] [Updated Recently] [Closed]

Advanced filters [toggle]

Results count                                 Sort

Request result rows...
```

### 17.2 Search behavior

- A match from a comment/attachment still returns its Request.
- Matched sources may be shown subtly when helpful.
- Filters should use query parameters.
- Clear All must be prominent when filters are active.
- Search state should survive navigation into a request and back.
- Do not use giant cards for each result.
- Search must expose loading, empty, error, and zero-match-with-filters states separately.

---

## 18. Request Detail workspace

This is the most important operational screen.

### 18.1 Mission

Answer:

> What is happening with this request, and what can I do next?

### 18.2 Proposed desktop layout

```text
Breadcrumb / back-to-context

RT-2026-XXXXXX   Request title
Status / Priority                        Assign / actions

──────────────────────────────────────────────────────────

Main column                              Properties
Description                              Status
                                        Priority
Activity timeline                        Flow
  created                               Requester
  comments                              Assignee
  state changes                         Created
  attachments                           Updated
                                        additional workflow fields

Comment composer
Attachments
```

### 18.3 Interaction rules

- Header remains visible when useful.
- Frequent editable properties may update inline if authorized.
- Rare actions live under an overflow menu.
- Destructive actions require explicit confirmation.
- Comments and meaningful system events share a comprehensible activity history.
- Attachments are contextualized within activity and may also have a dedicated subsection.
- Processing actions must not be visually separated into an unrelated legacy-style form.
- Optimistic UI may be used only where rollback/error behavior is safe and clear.
- Permission restrictions should disable/hide appropriately while API authorization remains authoritative.

---

## 19. Create Request

### 19.1 Mission

Answer:

> How do I submit the correct request with minimal friction?

### 19.2 Form design

Initial structure:

- Title;
- Description;
- Workflow;
- Priority when applicable;
- attachments;
- workflow-specific fields.

### 19.3 Rules

- Use progressive disclosure.
- Workflow selection controls dependent fields.
- Preserve all entered values on validation/API failure.
- Field errors appear adjacent to relevant controls.
- Required state is explicit.
- Avoid multiple visual sections unless they improve comprehension.
- Create action has a clear in-progress state and prevents accidental duplicate submission.
- Success should either navigate to the created request or offer an obvious “Open request” action.

---

## 20. Login and tenant/domain selection

The existing login/domain requirement is preserved.

Goals:

- simple focused authentication surface;
- clear User / Password / Domain fields as applicable;
- domain selection must be readable and keyboard-operable;
- errors must distinguish invalid credentials, unavailable domain, and server/network failure when the backend supports these distinctions;
- no decorative dashboard content on the login screen;
- theme should remain consistent with the main application.

Login redesign should happen after the core design system proves itself on more complex screens.

---

## 21. Administration

Administrative UI should use the same shell and system, but with higher emphasis on:

- clarity;
- explicit save/cancel behavior;
- permission visibility;
- auditability;
- validation;
- safe destructive actions.

Expected patterns:

- data table;
- detail/edit drawer or page;
- explicit active/inactive state;
- search/filter for large catalogs;
- confirmation dialog for destructive changes;
- unsaved-change protection when necessary.

Configuration screens should not resemble operational request queues if the tasks differ.

---

## 22. States and feedback

Every data surface must define these states:

### Initial loading
Use structural skeletons where useful.

### Background refresh
Avoid resetting the whole page to skeleton.

### Empty dataset
Explain what will appear here.

### Zero search results
Explain that current query/filters returned no matches and offer Clear Filters.

### Error
Use the most specific recoverable message available.

### Unauthorized / forbidden
Explain lack of permission rather than generic failure.

### Not found
Explain the request/resource no longer exists or cannot be accessed.

### Saving
Local indicator near the affected interaction.

### Saved
Subtle confirmation; avoid noisy toast spam for every inline property.

### Destructive operation
Confirm scope and consequence before action.

---

## 23. Content style

Product copy should be:

- concise;
- concrete;
- action-oriented;
- consistent.

Prefer:

- “No requests match these filters.”
- “Clear filters”
- “Assign request”
- “Add comment”

Avoid:

- vague errors like “Something went wrong” when a specific state is available;
- excessive explanatory prose;
- inconsistent synonyms for the same object.

The product should use one canonical term for Request/Ticket in visible UI unless a business-language requirement says otherwise.

---

## 24. Keyboard model

Planned baseline:

- standard Tab / Shift+Tab behavior everywhere;
- Escape closes transient overlays where appropriate;
- Enter/Space follow native control semantics.

Future productivity shortcuts may include:

```text
Ctrl/Cmd + K   global search / command palette
C              new request
G then H       Home
G then M       My Work
G then S       Search
J / K          next / previous request
```

Shortcuts must not interfere with typing in forms and must be discoverable.

---

## 25. Performance UX

The UI must optimize both actual and perceived performance.

Rules:

- avoid unnecessary detail fetches for list rows;
- avoid dashboard fan-out;
- paginate on the server for large request sets;
- debounce user-driven search only when necessary;
- retain previous data during safe background updates;
- lazy-load heavy secondary UI when useful;
- do not load full request activity for records that are only displayed in a queue.

Backend/API changes should be driven by measured UI data needs.

---

## 26. API implications

The redesign does not mandate an API rewrite.

Potential contract reviews:

1. Dashboard endpoint or enriched request-list contract to avoid request-detail fan-out.
2. Request Detail contract sufficient for properties/activity without excessive calls.
3. Existing unified Search endpoint remains request-centered.
4. Metadata endpoints for statuses, flows, users, priorities, permissions should support accessible labels and admin controls.
5. Permission-aware UI should consume server-authoritative capabilities when available rather than infer them from visual state.

Any API contract change gets its own documented acceptance criteria and tests.

---

## 27. Design documentation structure

Recommended repository structure:

```text
docs/design/
  00-product-design-principles.md
  01-information-architecture.md
  02-visual-language.md
  03-design-tokens.md
  04-component-system.md
  05-app-shell-navigation.md
  06-dashboard.md
  07-work-queues-search.md
  08-request-detail.md
  09-create-request.md
  10-admin.md
  11-motion.md
  12-accessibility.md
  13-responsive.md
  14-content-guidelines.md
  15-ui-qa-checklist.md

design/
  design-tokens.json
```

`design/design-tokens.json` remains the machine-readable source for applicable visual tokens.

---

## 28. Codex / Astra implementation contract

Codex/Astra must be told to treat the approved design docs and tokens as normative.

Core instruction:

```text
Do not create generic AI-generated SaaS styling.

Avoid excessive gradients, glassmorphism, neon glow, oversized radii,
arbitrary floating cards, decorative KPI widgets, excessive pill controls,
giant marketing typography in operational views, and gratuitous animation.

Prefer strong information hierarchy, compact enterprise density,
restrained neutral surfaces, semantic color, 1px borders,
consistent spacing, tables/lists for comparable data,
intentional cards only for grouped heterogeneous information,
clear primary actions, visible system state, and accessible interaction.

Do not invent new colors, spacing values, component variants,
or interaction patterns when an approved design-system equivalent exists.
```

Astra is the implementation/review agent, not the source of product-design truth.

---

## 29. Visual and UX quality gates

Frontend PRs in redesign work should eventually pass:

```text
typecheck
lint
build
functional Playwright E2E
visual regression checks for affected critical views
accessibility smoke checks
keyboard smoke checks
git diff --check
real-stack verification when integration behavior is involved
```

Visual testing should cover Light/Dark and representative desktop widths for critical routes.

Suggested baseline screenshots:

```text
dashboard-light-1440
dashboard-dark-1440
search-dark-1440
request-detail-dark-1440
request-detail-dark-1024
create-request-dark-1440
admin-dark-1440
```

---

## 30. Migration strategy

Do not perform a big-bang redesign.

### Phase 0 — Baseline reconciliation
- confirm current Sprint 3 / Day 10 state;
- reconcile stale instructions;
- verify Astra/Codex project configuration;
- record current screenshots/routes/components/tests.

### Phase 1 — UI/UX Foundation
- current UI inventory;
- information architecture;
- design principles;
- semantic token audit;
- component inventory;
- dark/light architecture;
- accessibility rules;
- responsive rules;
- motion rules.

### Phase 2 — Design system + App Shell
- theme provider;
- tokens;
- primitives;
- shared domain components;
- sidebar;
- top/context header;
- global overlays;
- shell responsive behavior.

### Phase 3 — Core operational surfaces
Recommended order:
1. Dashboard
2. Search / My Work
3. Request Detail
4. Create Request

### Phase 4 — Secondary surfaces
- Team / Other Tasks;
- administration;
- configuration;
- login/auth;
- less-used destinations.

### Phase 5 — Productivity polish
- command palette;
- keyboard shortcuts;
- saved views;
- richer inline editing;
- user display preferences where useful.

### Phase 6 — Hardening
- accessibility;
- responsive;
- performance;
- API fan-out;
- visual regression;
- real-stack verification.

---

## 31. Recommended ExecPlan sequence

```text
01-ui-ux-foundation
02-app-shell-navigation
03-dashboard-redesign
04-work-queues-search
05-request-detail-workspace
06-create-request
07-admin-surfaces
08-authentication
09-accessibility-responsive-performance
10-visual-regression-hardening
```

Each should use a short-lived branch and reviewable PR.

---

## 32. Current-screen preservation matrix

The redesign must preserve the functional intent observed in the existing Request Tracker surfaces:

| Current capability | New destination |
|---|---|
| User/password/domain login | Login |
| Home task list | Dashboard / My Work |
| Request detail | Request Detail workspace |
| Request comments | Activity timeline + comment composer |
| Attach file | Activity/detail attachment workflow |
| Process request | Request Detail action/property workflow |
| Create requirement | New Request |
| Flow selection | New Request workflow field |
| Other tasks | Team Work |
| Open request search | Unified Search |
| Closed request search | Unified Search |

The new design may reorganize these capabilities but must not silently remove them.

---

## 33. Decisions locked for Blueprint v1

The following are treated as baseline decisions unless later evidence requires revision:

1. Redesign is a product/UX architecture change, not merely a visual skin.
2. Persistent app shell with left navigation is the target desktop structure.
3. Dark, Light, and System themes are required.
4. Semantic design tokens are mandatory.
5. Long request collections use row/list/table layouts by default.
6. Dashboard is operational rather than decorative/BI-first.
7. Unified Search remains request-centered.
8. Request Detail becomes the primary workbench/workspace.
9. Progressive disclosure is used in Create Request.
10. Accessibility target is WCAG 2.2 AA.
11. Motion is restrained and must honor reduced-motion preferences.
12. Existing working component libraries are preserved unless evidence justifies replacement.
13. API/backend changes are only introduced for measurable UX/data-contract needs.
14. Migration is incremental through multiple ExecPlans/PRs.
15. Astra/Codex must follow documented design rules rather than inventing styling.

---

## 34. Items to validate during the UI inventory

These are intentionally not guessed in this blueprint and must be established from the current repositories:

- exact current route tree;
- exact current component tree;
- current Tailwind/theme configuration;
- whether Radix, shadcn, Base UI, or another primitive library is currently installed;
- current icon library;
- current fonts;
- current breakpoints;
- current design-token consumption vs dead tokens;
- duplicate components/styles;
- all RBAC-dependent UI surfaces;
- all APIs used per page;
- N+1/fan-out behavior;
- current Playwright page coverage;
- current accessibility defects;
- admin routes actually implemented vs planned;
- current mobile/tablet behavior;
- current persistence of filters/query state.

These findings become the evidence base for Blueprint v1.1 and the implementation ExecPlans.

---

## 35. Definition of success

The redesign succeeds when:

- a user can understand where to go without learning the old screen structure;
- common ticket-processing workflows require fewer navigation steps;
- ticket lists are faster to scan;
- Search can replace the historical split Open/Closed search mental model;
- Request Detail contains the context and actions required to process a ticket;
- Dashboard highlights actionable workload rather than decorative numbers;
- Light/Dark themes are consistent;
- keyboard and focus behavior are predictable;
- new pages can be built primarily from existing design-system primitives;
- UI review can be performed against explicit rules instead of subjective “looks modern” feedback;
- Codex/Astra can implement subsequent milestones without inventing a new visual language for each one.

---

# Immediate next milestone

**UI Inventory & Baseline Audit**

Before implementing any redesigned JSX, inspect `rt-web` and produce:

1. route inventory;
2. page inventory;
3. component inventory;
4. design/token inventory;
5. dependency/primitives inventory;
6. API usage by route;
7. current responsive behavior;
8. current accessibility issues;
9. current Playwright coverage;
10. screenshots for every current route/state;
11. duplicate/inconsistent UI patterns;
12. mapping from current components to:
    - keep;
    - refactor;
    - replace;
    - remove after migration.

Deliverable:

```text
docs/plans/sprint-4/ui-ux-foundation-redesign-execplan.md
docs/design/current-ui-inventory.md
```

This inventory is the evidence required before implementing the new App Shell or redesigning any page.


---


# Request Tracker UI/UX Design Blueprint v1.1 — Reconciliation

**Project:** Request Tracker (RT)  
**Date:** 2026-09-18  
**Status:** Normative reconciliation after current UI inventory  
**Relationship to v1:** This document amends Blueprint v1. Where v1 and this reconciliation conflict, **v1.1 wins**. All unchanged v1 principles remain valid.

## 1. Locked reconciliation decisions

### R1 — Navigation
`My Work` and `Team Work` remain target information-architecture concepts, not immediate new routes. Preserve current working Home queue semantics, especially **My Requests** and **Recently Updated**, until the later App Shell / Navigation milestone explicitly maps them.

### R2 — Administration IA
Do not add speculative standalone destinations. Current target grouping is:

```text
Administration
  Overview
  Workflows
    Statuses / transitions in workflow context
  Users
  Roles
    Permissions in role context
  Reports
  SLA
  Settings
  Audit
```

There is no standalone Priority CRUD route/API today.

### R3 — Theme scope
For the first theme implementation, theme preference remains browser-local and preserves the existing preference storage schema/key. Support **Light / Dark / System**. `System` follows `prefers-color-scheme`. Do not introduce tenant/server synchronization. Do not activate density mode implicitly. Do not present the stored email preference as a working server notification setting.

### R4 — Search
`/search` is already unified. Preserve it. Future Search work is a consumer redesign and URL-state/filter improvement, not a rebuild. Do not invent new filters without deployed API/schema support.

### R5 — Dashboard metrics
Use current supported domain values. Priorities are `low / normal / high / urgent`; current KPI concepts include Open, In Progress, Due Today and Overdue. Do not invent `Critical`, `Due Soon`, new charts or recent-activity metrics without a defined user decision and data source.

### R6 — Create Request
The first redesign preserves current creation capabilities, including requester, assignee, due date, tags, current flow/status behavior, public request-ID/null semantics and success navigation. Creation-time attachments and arbitrary workflow custom fields are separate future behavior/API scopes.

### R7 — Request Detail actions
Do not implement generic status PATCH. Status/lifecycle changes continue through the current transition endpoint and server allowed-actions semantics. Preserve required transition comments, assignment semantics and API-authoritative RBAC. Inline visual editing may wrap existing operations but may not bypass them.

### R8 — Radius migration
Introduce target semantic radius tiers additively with compatibility aliases for current 14px/20px behavior. Do not perform a global visual reset in M1. Remove aliases only after consumers migrate and parity is verified.

### R9 — Component-library strategy
No Radix, shadcn, Base UI, Headless UI, icon, chart or animation library is currently established. Do not add one in M1. Prefer accessible native wrappers where sufficient. A later third-party primitive proposal requires a concrete accessibility/behavior need and migration-cost analysis.

### R10 — Home/Search fan-out
Confirmed Home and Search list-detail enrichment is a separate bounded API/web performance milestone. Preserve current behavior during M1. Later optimization must measure request counts, define required list-row fields, preserve readable labels and test failure behavior.

### R11 — Visual baseline
Current 18 light screenshots are representative, not exhaustive approved visual regression. Expand repeatable state/viewport evidence before broad visual consumer migration. Dark baselines begin only after a working theme exists. M1 is acceptable only if token architecture changes preserve current rendered output intentionally.

### R12 — Accessibility
WCAG 2.2 AA remains normative for newly created/refactored primitives and patterns. Current UI is not declared compliant. Known legacy gaps enter the foundation backlog; M1 fixes only accessibility issues necessary for safe token work, while each migrated consumer gets explicit accessibility acceptance criteria.

## 2. Immediate implementation milestone

# M1 — Additive Semantic Token Foundation

### Purpose
Introduce the semantic design-token architecture required by the Blueprint while preserving current rendered output as closely as possible.

### In scope
- semantic color roles;
- semantic surface/text/border/focus/status aliases;
- theme-ready token naming;
- semantic radius tiers plus legacy compatibility aliases;
- one authoritative token flow between design tokens and Tailwind/CSS;
- documentation of token intent and compatibility;
- static/tests/build verification needed to prove token availability;
- no page-by-page visual migration.

### Out of scope
- activating Dark Mode across pages;
- changing layouts or JSX for redesign;
- App Shell redesign;
- route changes;
- RBAC changes;
- API changes;
- Home/Search fan-out optimization;
- component-library replacement;
- Dashboard/Search/Detail/Create redesign;
- density-mode activation;
- broad unrelated accessibility remediation.

### M1 acceptance principles
1. Existing screens render materially the same.
2. Existing consumers continue through compatibility mappings.
3. New semantic roles exist for future migrations.
4. No second manually independent visual source of truth is introduced.
5. No arbitrary new visual values are invented without documentation.
6. No application behavior change is introduced.
7. Full implementation PR gates run.

## 3. Minimum semantic roles

Exact values must be derived from current tokens and compatibility requirements.

```text
color.background
color.foreground

color.surface.default
color.surface.subtle
color.surface.raised
color.surface.hover
color.surface.active

color.text.default
color.text.muted
color.text.subtle
color.text.inverse

color.border.default
color.border.strong

color.action.primary
color.action.primaryHover
color.action.primaryForeground

color.focus.ring

color.status.info
color.status.infoSurface
color.status.success
color.status.successSurface
color.status.warning
color.status.warningSurface
color.status.danger
color.status.dangerSurface
```

Radius roles:

```text
radius.small
radius.medium
radius.large
radius.legacyControl
radius.legacyCard
```

Compatibility values are migration infrastructure, not the target visual language.

## 4. Source-of-truth rule

The audit found `design/design-tokens.json`, duplicated literals in `tailwind.config.ts`, and raw light-mode utility roles in current consumers.

Preferred architecture:

```text
design/design-tokens.json
        ↓
semantic mapping
        ↓
CSS custom properties / Tailwind semantic aliases
        ↓
components/pages
```

Codex may choose an equivalent low-complexity implementation, but it must document how drift between JSON, Tailwind and CSS is prevented. Do not leave two manually independent color definitions.

## 5. Theme-readiness rule

M1 prepares semantic roles for Light/Dark/System but does not broadly activate Dark Mode. Semantic names must describe purpose rather than light-only appearance.

Prefer:

```text
surface
foreground
border
muted
```

Avoid:

```text
whiteCard
darkText
grayPage
```

## 6. Expected milestone sequence after M1

```text
M1  Additive semantic tokens
M2  Theme runtime: Light / Dark / System
M3  Shared primitive foundations
M4  App Shell + navigation
M5  Dashboard
M6  Search / queue experience
M7  Request Detail workspace
M8  Create Request
M9  Admin/auth secondary surfaces
M10 Accessibility / responsive / performance / visual hardening
```

Home/Search enrichment should be handled as a separate bounded API/web optimization when needed by the relevant consumer milestone.

## 7. Rules from v1 that remain unchanged

All other Blueprint v1 rules remain in force, especially:

- task-first UX;
- information hierarchy before decoration;
- operational density;
- progressive disclosure;
- visible system state;
- preserve context;
- semantic tokens;
- restrained motion;
- WCAG 2.2 AA;
- incremental migration;
- no generic AI-generated SaaS styling;
- Astra/Codex follows the approved system instead of inventing one.

# Immediate next action

Execute **only M1 — Additive Semantic Token Foundation** from the approved ExecPlan. Do not begin theme activation or page visual migration in the same change. Review the diff, build/test results and rendered evidence before authorizing M2.
