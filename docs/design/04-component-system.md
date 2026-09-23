# Shared accessible UI primitives (M3)

Normative: `00-Request-Tracker-UI-UX-Design-Blueprint-v1.1.md`. These primitives consume the M1/M2 semantic token/runtime contract; they do not read theme/density preferences or fetch business data. No library was added. The fixture is a verification surface, not a new product route.

## Architecture and public APIs

Import concrete modules under `src/components/ui/`; native controls are grouped in `Controls.tsx`. React refs and ordinary native HTML props are forwarded by buttons/controls. `className` is for justified layout constraints, not for reintroducing palette/variant overrides.

| Component / source | Public API and responsibility | Accessibility and token behavior |
| --- | --- | --- |
| Button (`ui/Button.tsx`) | Native button props plus `variant=primary|secondary|ghost|danger`, `size=sm|md`, `loading`; defaults primary/md/type=button | Enter/Space native activation; disabled/loading prevents activation and loading sets aria-busy, preserving visible/accessibility label. Primary uses action pairs; secondary uses surface/foreground/strong-border; ghost inherits the semantic parent surface; danger uses danger foreground/surface (not inverse white). No permanent shadow or animation |
| IconButton (`ui/Button.tsx`) | Button API plus required nonblank `label` and noninteractive icon `children` | aria-label and native title from label; ignores competing aria-labelledby; decorative contents hidden from AT. 32/40px square target, 4px radius and shared focus; no icon library |
| Field (`ui/Field.tsx`) | `label`, optional `id`, `description`, `error`, `required`, and one native primitive child | Generates ID with useId; owns htmlFor/control ID, help/error IDs, required, invalid and describedby relationships through context; external describedby IDs are appended. Error remains linked text, avoiding a separate alert on every keystroke |
| Input (`ui/Controls.tsx`) | Native input props/ref | Field-aware, native validation/required/readOnly/disabled; 40px minimum height, semantic surface/text/strong boundary, muted placeholder, danger invalid border |
| Textarea (`ui/Controls.tsx`) | Native textarea props/ref; rows defaults 3 | Same associations; resizable vertically, min-height 96px, semantic control tokens |
| Select (`ui/Controls.tsx`) | Native select props/ref and option children | Native keyboard/typeahead/platform picker; same Field wiring and semantic surface, no combobox emulation |
| Checkbox (`ui/Controls.tsx`) | Native input props/ref excluding type | Fixed checkbox type, Field wiring, native check/Space/required semantics. 24px control, primary accent, semantic invalid ring, visible focus; native appearance/color-scheme retained |
| Badge (`ui/Badge.tsx`) | `label`, `tone=neutral|primary|info|success|warning|danger` | Always readable text; compact 4px radius, no pill. Neutral/primary use surface-hover/active with foreground; other tones use paired status roles |
| StatusBadge (`requests/StatusBadge.tsx`) | Existing `status`, optional `category` | Unchanged server-text and category behavior: waiting -> warning, closed/terminal -> neutral, otherwise primary. Uses StateBadge compatibility export |
| PriorityIndicator (`requests/PriorityIndicator.tsx`) | `priority:string`; exported domain type `Priority=low|normal|high|urgent` | Preserves supplied text and existing `Priority:` prefix. High/urgent use danger text/surface; low/normal neutral. Unknown server values render neutrally rather than being assigned an invented meaning |
| InlineNotice (`common/InlineNotice.tsx`) | Existing `message`, tone info/success/warning/danger; legacy error maps to danger | Normal notices role=status/live=polite; danger/error role=alert/live=assertive. Compact border and semantic status text/surface; no toast orchestration |
| EmptyState (`common/EmptyState.tsx`) | Existing `title`, `body`; optional `action:ReactNode` | Valid empty content, no alert semantics, dashed neutral border and readable surface/text. Optional action should be a named Button/link |
| ErrorState (`common/ErrorState.tsx`) | Existing `message`, optional `onRetry`; optional `retryLabel` defaults Refresh | Assertive alert, paired danger surface/text; retry uses secondary Button. Never use for a valid empty dataset |
| Skeleton (`ui/Skeleton.tsx`) | Optional geometry `className` | Decorative aria-hidden static surface-hover block, no shimmer/pulse; already reduced-motion safe |
| LoadingRows (`common/LoadingRows.tsx`) | Existing optional `rows=5` | Retains role=status, aria-live=polite, aria-busy and hidden Loading data text; reuses Skeleton with old responsive tracks |
| Dialog (`ui/Dialog.tsx`) | `open`, `title`, optional `description`, `children`, `onClose`, optional `busy`, `initialFocusRef` | Native showModal/inert background, labelled title/description; native autofocus by default, explicit contained focus ref if supplied. Escape closes unless busy; close restores connected opener. Busy is aria-busy and must be matched by disabled child actions. Surface/foreground, 8px radius, existing bounded width/height and overlay-only shadow |
| PageHeader (`ui/PageHeader.tsx`) | `title`, optional `description`, `actions` | One h1, 24px title, readable muted description, wrapping actions; no fetching/layout framework |
| Separator (`ui/Separator.tsx`) | No props | Native horizontal hr, semantic decorative border, standard 16px vertical spacing |

Focus is a 2px semantic focus-ring outline with 2px offset on all interactive primitives. The outline is not globally removed. sm/md controls are 32/40px minimum tall; the stored density preference remains inactive. Native disabled controls may have reduced contrast; read-only controls retain readable text and focusability.

## Correct use

```tsx
<Field label="Title" description="A short summary" required error={titleError}>
  <Input name="title" value={title} onChange={onTitleChange} />
</Field>
<Field id="workflow" label="Workflow" required>
  <Select defaultValue=""><option value="">Select workflow</option>{options}</Select>
</Field>
<Field label="Notify me"><Checkbox name="notify" /></Field>
<Button type="submit" loading={saving}>Save</Button>
<IconButton label="Add attachment" variant="secondary">{existingIcon}</IconButton>
```

- One Field wraps one control. For multiple controls use native fieldset/legend and separate Fields; do not create duplicate IDs by sharing one Field across several inputs.
- Field owns the ID when present. Put an explicit ID on Field, not a conflicting ID on its child. Standalone controls still require a real label or aria-label. Put required on Field to keep its visible marker and native required behavior consistent.
- Native Input's `type` remains the caller's responsibility; use Checkbox for checkbox inputs. Inputs/selects are native controlled or uncontrolled components; Field does not perform business validation or manage values.
- Compose on a semantic surface. Ghost buttons/Field error text inherit the parent background and are not guaranteed on arbitrary light-only legacy surfaces in Dark mode.
- IconButton children must be decorative, not another link/button/input. The name comes from label; it must describe the action, not the icon artwork. No framework/icon package is assumed.
- Dialog requires a labelled close/cancel action in its children; busy callers must disable those actions. Parent-controlled `open=false` can still close after completion. onClose follows native close events (including parent-driven closes), preserving the AdminDialog callback contract. No backdrop-click dismissal was added.
- PageHeader is for page level h1 only; retain local h2/h3 for sections. Do not replace all page headers merely to consume it.
- LoadingRows announces loading; individual Skeleton blocks do not. Use background-refresh indicators where needed later rather than wiping useful data globally.

## Native dialog limits

Chromium may move focus to browser chrome when tabbing past modal content. Tests verify background page controls remain inert and cannot receive focus; they do not force a custom trap that prevents reaching browser UI. Native modality/Escape/focus handling is retained. Explicit focus refs must point inside the dialog; otherwise native initial focus is used. Modern HTMLDialogElement/showModal support is required. Custom nested modal stacks, focus on removed openers, arbitrary form-method=dialog busy interception, and Firefox/WebKit differences are not claimed by Chromium-only verification. No new overlay framework is justified by current evidence.

## Migration and bounded consumers

- `StateBadge` re-exports Badge, `PriorityChip` re-exports PriorityIndicator, and `AdminDialog` re-exports Dialog. Their import paths and existing prop contracts remain available. StatusBadge itself is unchanged.
- ConfirmDialog is the bounded existing integration of Button and Dialog; Cancel/confirmation callbacks and names remain, and busy now blocks Escape as well as disabling buttons. It is not a product-page rewrite.
- EmptyState/ErrorState/InlineNotice/LoadingRows are refined in place, so current consumers receive semantic styling without page edits. ErrorState retry now consumes Button, and LoadingRows consumes Skeleton.
- All page JSX is unchanged. Create's TextInput/FieldError, Profile fields, page-local buttons/notices, page headers, RequestTable/Search table, KpiCard, PaginationControls, SystemStatusPage and legacy `.btn`/`.card` styles remain for later consumer migration. Shared semantic components do not make surrounding legacy pages fully Dark.
- No Radix/shadcn/Base UI/icon/chart/animation package; no Drawer/Popover/Tabs/Avatar/Combobox/DatePicker/toast framework. These are explicitly deferred.

## Permanent verification

`tests/fixtures/primitives.html` + `primitives.tsx` use the real React components and M2 bootstrap. Vite serves the fixture only as a development test entry; it is not imported by the production entry or added to Router. The production build must not contain a tests/fixtures entry. TypeScript includes this fixture, including a compile-time negative test for missing IconButton label.

`npm run test:primitives` runs `tests/e2e/primitives.spec.ts`; the full E2E script also discovers it. Tests cover native activation/default type, disabled/loading, icon name/target, generated/provided Field relationships and native required validation, select/checkbox labels, dialog focus/Escape/restoration/busy confirmation, feedback roles, static reduced-motion loading and actual server status/priority labels. Four theme cases cover explicit Light/Dark and System effective Light/Dark, with computed colors and focus outline checks. Light/Dark fixture captures are ignored local artifacts under `.agent/tmp/m3-primitives/`, not full-page product baselines.

Token tests retain all M2 contrast assertions and add the danger-surface focus and hover-foreground pairs used here. Normal readable status/action/text pairs meet 4.5:1; essential borders/focus meet 3:1 on documented surfaces. Skeleton/decorative separator colors convey no essential information. No universal WCAG certification, live API validation or complete screen-reader/browser matrix is claimed.

Required gate: npm run typecheck, lint, build, test:tokens, test:theme, test:primitives, test:e2e, test:theme:preview, and git diff --check (use npm.cmd on Windows). No unavailable runner is invented. Hosted CI is separate evidence.

M3 local result: typecheck/lint/build (146 modules), four token tests, ten theme runtime tests, all 22 E2E tests (including ten primitive cases) without retries, five production theme preview tests without retries, and whitespace checks pass. The initially-open StrictMode case explicitly verifies a caller's focus ref takes precedence over an earlier button. Native dialog consumers containing legacy hard-coded light controls are not declared fully Dark-ready by the new shell; those descendants await their own migration. Hosted CI was not run.
