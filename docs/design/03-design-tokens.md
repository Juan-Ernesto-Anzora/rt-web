# Semantic tokens: M1

## M2 extension: theme runtime

M1 is the historical light/compatibility foundation below. M2 adds `darkColor` to the same JSON, with exactly the same 25 role keys as `color`. The adapter rejects mismatched key sets and derives dark RGB variables under `:root[data-theme="dark"]`. Default `:root` values remain light, so switching the attribute back to light restores M1 values without a second palette source. Legacy palette utilities and radius aliases do not change.

Dark values use restrained zinc surfaces (background #18181B, surface #27272A, raised #303036, hover #3F3F46), readable pale text, indigo selected surfaces/actions and pale status text on darker hue-related status surfaces. These are explicit role choices in JSON, not inversions. Primary action fills remain M1 indigo to retain white-label contrast. Low-contrast `border` remains decorative; use `border-strong` for essential boundaries. Opacity/background combinations outside tested pairs still require consumer review.

### Runtime and first paint

Production closeout: `npm run test:theme:preview` builds then runs the permanent theme suite against a fresh Vite preview server on port 4173. `playwright.preview.config.ts` reuses the existing Chromium settings. First-paint tests intercept either the dev entry or production `/assets/index-*.js`, require that entry request to have been held, and verify saved Dark/System-dark/System-light root state and color-scheme before releasing React. The built `/theme-init.js` returns 200 JavaScript with `Cache-Control: no-cache` under preview; all five theme browser tests pass against built assets. CI runs this preview suite against its existing build after functional E2E; hosted execution for this diff remains pending.

Deployment contract: current Vite base is `/`, no router basename or documented subdirectory deployment is configured. The build emits `/theme-init.js` and copies the public file unchanged. `%BASE_URL%` supports adjusting the asset prefix, but that alone does not make application routes safe below a subpath; such deployment needs a separate basename/server review. Non-root deployment is not asserted as supported here.

The stable bootstrap URL must revalidate (for example `Cache-Control: no-cache`) alongside HTML; do not apply hashed-assets-only `immutable` caching to it. Deploy the entire dist atomically, serve the script as JavaScript (not SPA-fallback HTML), and allow the same-origin script under CSP. No production proxy/CDN header configuration is present in this Web checkout, so preview headers do not prove deployed caching. Missing/blocked/corrupt bootstrap leaves `window.rtTheme` unavailable and ThemeProvider cannot initialize; the provider is above the app error boundary, so the result can be a blank application. A stale incompatible bootstrap can likewise fail. These are required-asset delivery constraints, explicitly not guarantees under failed network/CSP/partial deployments. The actual root build/preview delivery works; no architectural rewrite or speculative fallback resolver was introduced.

`index.html` includes `%BASE_URL%theme-init.js` as a classic same-origin script in the head, without async/defer/module. It blocks body parsing until it reads preferences and sets `html[data-theme="light"|"dark"]` plus root `style.colorScheme`. Vite copies `public/theme-init.js` unchanged into dist and resolves the base URL in HTML. React's module is later in the document. This avoids waiting for React/effects to resolve a saved dark preference. The public asset must be deployed and permitted by script-src; there is no inline script, generated color table or dependency. Initial body/page backgrounds still use legacy classes; M2 does not claim full-page dark rendering.

The same script exposes the single `window.rtTheme` store, consumed by typed `ThemeProvider`/`useTheme` through React useSyncExternalStore. State exposes preferenceTheme (light/dark/system), effectiveTheme (light/dark), validated preferences, persistenceError, setPreference and updatePreferences. The first subscriber installs OS/storage listeners; the last unsubscribe removes them. Re-subscribing reconciles startup changes. OS changes affect effective theme only when preference=system; explicit light/dark wins.

### Preference compatibility

Only `rt.profile.preferences` is used. Missing/malformed/non-object storage or invalid theme falls back to system, retaining the pre-existing default. Other valid fields, including unknown fields, survive updates. Density defaults to compact and emailNotifications to true as before; neither gets new runtime/server behavior. Writes merge latest stored data with only changed fields. A failed write applies the session preference and reports a persistence error rather than claiming Saved; further changes preserve that session state. Storage errors do not escape initialization. Cross-tab storage updates/removal resynchronize the store without echo writes.

Profile Preferences keeps its current layout and Save button: radio changes are draft until Save, which updates the runtime. The only new visible state is a semantic error notice if persistence fails. No global class conversion, authentication, routing, permission or API change is included.

### Measured normal-text contrast

Values are emitted by permanent `tests/tokens.test.cjs`, calculated from JSON with the WCAG sRGB luminance formula; every listed pair must meet >=4.5:1.

| Foreground / background | Light | Dark |
| --- | --- | --- |
| foreground / background | 17.06:1 | 16.12:1 |
| text-muted / background | 7.24:1 | 11.99:1 |
| action-primary-foreground / action-primary | 6.29:1 | 6.29:1 |
| status-info / status-info-surface | 7.09:1 | 8.32:1 |
| status-success / status-success-surface | 7.29:1 | 9.94:1 |
| status-warning / status-warning-surface | 6.84:1 | 10.39:1 |
| status-danger / status-danger-surface | 5.72:1 | 8.27:1 |

Tests also cover muted/subtle/default text across surface variants, hover-action labels, and focus/strong-border contrast >=3:1. This verifies token pairings, not the accessibility of unmigrated pages.

### Permanent verification and evidence

- `npm run test:tokens`: both palettes, role parity, contrast, dark-selector CSS, opacity and legacy compatibility.
- `npm run test:theme`: executes the actual public script in Node VM, covering resolution, fallback/storage denial, updates/preservation, OS changes, cross-tab sync and listener cleanup.
- `tests/e2e/theme-runtime.spec.ts`: delays the React module and asserts saved dark root activation with empty React root, then tests Save/reload/System changes and light/dark semantic consumer computed colors. The existing radio is selected through its visible label or keyboard, not forced pointer interaction with a hidden input.
- Bounded visual evidence: `.agent/tmp/m2-theme/semantic-light.png` and `semantic-dark.png`, captured by the permanent semantic-consumer test. No full-page dark baseline is asserted.

M3 begins shared accessible primitives using this runtime and role contract. Legacy `bg-white`, neutral-shade utilities, `.card`, `.btn`, body background and page layouts remain for later migration. Dark color-scheme can change native control rendering inside those otherwise light pages; M2 is not a finished dark UI.

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

Historical M1 handoff (implemented by M2 above): browser-local Light/Dark/System runtime, preserving `rt.profile.preferences` and unrelated fields; validated storage, system media subscription, root attribute/color-scheme and first-paint handling. M1 itself added no dark selector, preference consumer or theme runtime. Density activation remains deferred.
