# Semantic tokens: M1

Normative baseline: `00-Request-Tracker-UI-UX-Design-Blueprint-v1.1.md`. M1 adds roles without migrating pages or activating themes.

## Authoritative flow

`design/design-tokens.json` -> `design/tailwind-tokens.cjs` -> Tailwind `addBase(:root)` and `theme.extend` -> compiled Vite stylesheet.

JSON contains every new color/radius value. The adapter resolves references to `brand.colors`, validates six-digit hex and pixel radii, emits RGB-channel variables (`--rt-color-*`), radius variables (`--rt-radius-*`), and opacity-compatible Tailwind aliases. Semantic-to-semantic references are deliberately unsupported, so alias cycles cannot form. Missing/invalid references fail the build. No copied/generated CSS file or extra generation command exists. Tailwind imports the adapter, so JSON changes regenerate mappings at build time. Existing shadows/spacing are outside M1.

CSS variables are available after `@tailwind base`. Future code can use `rgb(var(--rt-color-foreground) / 1)` or Tailwind `text-foreground`. JSON keys are purpose-based kebab-case equivalents of Blueprint conceptual paths. Semantic utilities are generated when present in scanned source, just like other Tailwind utilities; variables are always emitted. No safelist or page migration is necessary.

## Roles and intent

| JSON color key / Tailwind suffix | Value source | Intended pairing |
| --- | --- | --- |
| background / foreground | neutral.50 / neutral.900 | App canvas and body text |
| surface / surface-raised | #FFFFFF | Default/elevated surfaces; same light color, distinct future role |
| surface-subtle / surface-hover / surface-active | neutral.50 / neutral.100 / primary.50 | Secondary, hover and selected surfaces |
| text-default / text-muted / text-subtle | neutral.900 / neutral.600 / neutral.600 | Normal text; subtle intentionally retains readable contrast |
| text-inverse | #FFFFFF | Primary action fills only; not white/light surfaces |
| border / border-strong | neutral.200 / neutral.600 | Decorative separator / essential control boundary |
| action-primary / action-primary-hover / action-primary-foreground | primary.600 / primary.700 / #FFFFFF | Primary controls, including readable text |
| focus-ring | primary.600 | Light surfaces with offset; colored boundaries still require consumer testing |
| status-info / status-info-surface | #075985 / #F0F9FF | Info text and pale info surface |
| status-success / status-success-surface | #065F46 / #ECFDF5 | Success text and pale success surface |
| status-warning / status-warning-surface | #92400E / #FFFBEB | Warning text and pale warning surface |
| status-danger / status-danger-surface | #BE123C / #FFF1F2 | Error text and pale danger surface |

White preserves current white surfaces. Status pairs use darker and lighter steps of the existing sky/emerald/amber/rose hue families to make text safe, not a new accent palette. Existing bright brand feedback colors remain available unchanged for legacy consumers. Default border is decorative: use border-strong when the boundary itself must convey the control. A role name alone cannot establish WCAG compliance for arbitrary combinations, opacity or backgrounds.

Examples for later consumers: `bg-surface text-foreground border-border`, `text-status-danger bg-status-danger-surface`, `bg-action-primary text-action-primary-foreground`, `focus-visible:ring-focus-ring`, `bg-surface/50`. Transparent variants require their own composited contrast review.

## Geometry and compatibility

| JSON radius | New utility | Value |
| --- | --- | --- |
| small | rounded-small | 4px |
| medium | rounded-medium | 8px |
| large | rounded-large | 12px |
| legacy-control | rounded-legacy-control | 14px |
| legacy-card | rounded-legacy-card | 20px |

Existing `rounded-xl` and `rounded-2xl` continue to resolve to literal 14px and 20px from JSON. `.btn`, `.btn-primary`, `.card` and page classes are unchanged. The previously hard-coded root `--radius:12px` now comes from JSON's large radius, preserving its value. Default Tailwind scales and unlisted colors (including neutral.500) remain available. New aliases must not override old palette entries. Delete legacy roles only after every consumer migrates and parity is reviewed.

## Verification and limits

`npm run test:tokens` (or `pnpm test:tokens`) uses Node's built-in test runner, installed PostCSS and Tailwind; no new dependency. It verifies required roles, bad references, complete legacy palette snapshot, all radius values, compiled CSS/opacity, normal text >=4.5:1 and essential boundary/focus >=3:1 on documented light surfaces. New danger text is 6.29:1 on white; legacy danger.500 remains 3.67:1 and is not remediated globally.

Fresh before/after screenshots at 1440x1000 for Home, Create, Detail and Admin Settings are byte-identical PNGs. Artifacts: `.agent/tmp/m1-parity/{before,after}/`; synthetic API fixtures, not live data. The existing Home baseline was also visually inspected. This is representative parity, not exhaustive visual regression or accessibility certification.

M2 remains: browser-local Light/Dark/System runtime, preserving `rt.profile.preferences` and unrelated fields; validated storage, system media subscription, root attribute/color-scheme and first-paint handling. Define dark values in the same JSON and derive their variables through this adapter. No dark selector, media subscription, preference consumer, density activation or dark screenshot is added by M1.
