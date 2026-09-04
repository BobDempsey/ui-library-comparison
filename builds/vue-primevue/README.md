# vue-primevue

PrimeVue building the comparison screen in Vue 3.

Read [`spec/screen-spec.md`](../../spec/screen-spec.md) before writing code. Sections 2 to 9 are the requirements. A requirement this library cannot meet is recorded as a failure, not worked around.

```
pnpm --filter @uilc/vue-primevue dev
pnpm --filter @uilc/vue-primevue test
pnpm --filter @uilc/vue-primevue build
pnpm --filter @uilc/vue-primevue measure
```

Write only inside this folder and `results/vue-primevue.json`. `packages/criteria` and `packages/harness` belong to the phase one owner.

## Notes for the write-up

**Result: 18/18 criteria pass.** Bundle: 174.38 KB total (24.21 KB Vue baseline, 150.17 KB delta), inside the 180 KB budget with roughly 5.6 KB of headroom. 955 lines of application code, 18 PrimeVue imports, 0 type escapes. See `results/vue-primevue.json`.

### What PrimeVue gave for free

- **The table.** `DataTable` supplies real `table`/`thead`/`tbody` markup, sortable-column click and keyboard handling with correct `aria-sort` cycling, and row focus plus Enter/Space-to-open once `selectionMode="single"` is set. The paginator's First/Previous/Next/Last controls and the `Showing {first} to {last} of {totalRecords}` report came from `paginatorTemplate` and `currentPageReportTemplate` matching section 4's wording exactly.
- **The modal.** `Dialog` supplies `role="dialog"`, `aria-modal`, the title association, and a real focus trap (`v-focustrap`).
- **The selects.** `MultiSelect` (Status, Priority) and `Select` (Assignee, and Status/Priority inside the modal) are the real combobox/listbox widgets, not hand rolled.
- **The confirmation.** `ConfirmDialog` (`role="alertdialog"`) handles the unsaved-changes prompt from section 6, so there is no second bespoke dialog.

### What had to be hand built

- **Toasts, entirely** (`handBuilt.toast: true`). PrimeVue's `Toast` ships each message as its own `role="alert" aria-live="assertive"` node with no persistent container, no cap on stack size, and no Escape-to-dismiss. Section 7 requires a single `aria-live="polite"` region present before the first toast, a cap of 3 with the oldest dropped first, and Escape-while-focused dismissal — none of which is a `Toast` config flag, so the whole stack (`src/composables/useToasts.ts`, `src/components/ToastRegion.vue`) is plain reactive state and markup instead.
- **Modal focus placement and its return to the triggering row** (`src/components/RecordModal.vue`). `Dialog`'s own mechanism for this lives entirely inside its `<transition>` `enter`/`leave` hooks, and those hooks never fire under this Jest/jsdom setup (confirmed by instrumenting the library directly: `onEnter` is never called, so neither is its document `keydown` listener for `closeOnEscape`, nor its `document.activeElement` capture-and-restore). `close-on-escape` is set to `false` and replaced with an explicit `document` `keydown` listener while the dialog is open, and the triggering element is captured explicitly in the same watcher that opens the dialog rather than trusting Dialog's own capture. Initial focus on the subject field still works, via a native `autofocus` attribute rather than Dialog's transition-driven fallback.
- **A minimal Aura theme preset** (`src/theme.ts`). `@primevue/themes/aura`'s default export merges design tokens for all ~90 PrimeVue components, and Rollup cannot tree-shake the unused ones out of that merge. `theme.ts` assembles a preset from only the ten components this screen mounts, using `@primeuix/themes` (declared as a direct dependency) rather than `@primevue/themes`'s own `aura/<name>` subpaths, because those subpaths carry an `import`-only `exports` condition with no `require` fallback that Jest's CommonJS resolution cannot follow.
- **The page-change live region.** `Paginator`'s current-page report has no `aria-live` by default; added via `pt="{ pcPaginator: { current: { 'aria-live': 'polite' } } }"`.
- **The focus-visible outline and the table's accessible name.** Section 9 fixes the focus ring at 3:1 contrast, set explicitly in `src/styles.css` rather than trusted to the theme default; `DataTable` has no caption or label of its own, added via `table-props="{ 'aria-label': 'Support tickets' }"`.

### Where a spec requirement fought a default

- PrimeVue's single `Select` commits an option on `mousedown`; its `MultiSelect` sibling commits on `click`. Both are real, deliberate library behavior, not a bug, but it means the test adapter drives them differently (`fireEvent.mouseDown` vs `fireEvent.click`) and a naive one-size-fits-all "click the option" helper silently no-ops on `Select`.
- `MultiSelect`'s accessible `role="combobox"` sits on a visually hidden native `<input>` used for typeahead and screen readers; the actual click-to-open handler lives on the visible wrapping element and explicitly ignores clicks whose target is that hidden input. Clicking the element `getByRole` finds is a no-op; the adapter has to click its `[data-pc-section="root"]` ancestor instead.
- Native `autofocus` on the subject field and `Dialog`'s own (transition-gated, and here non-functional) focus-capture-on-open compete for the same `document.activeElement` read. Once `autofocus` wins that race, `Dialog`'s built-in "return focus to whatever was focused before opening" restores to the subject field, not the row, which is why focus-restore ended up hand built rather than left to the default even though the mechanism is a supported one.

### Two independently corroborated jest/jsdom gotchas, in addition to the ones already filed by react-headless

- `@vue/vue3-jest` runs a Vue SFC's compiled `<template>` through `@babel/core` with no `caller` metadata, so `@babel/preset-env` always downlevels it to CommonJS regardless of Jest's own ESM settings — a `.vue` file's transformed output is CommonJS no matter what `extensionsToTreatAsEsm` asks for.
- Jest's default `transformIgnorePatterns` excludes `node_modules`, but PrimeVue (and `@primevue/themes`/`@primeuix/themes`/`@primeuix/utils`) publish ESM only, no CommonJS build at all. `jest.config.js` documents the resulting CommonJS-mode setup (unlike react-headless's ESM one) and the exact reasoning; see the comment there before changing it.

### Theming repair pass (2026-09-03)

A visual survey at 1440px found two defects in this build's first paint, both traced to the same cause. `app.use(PrimeVue, { theme: { preset } })` never set `options.darkModeSelector`, so PrimeVue used its own default of `'system'`, which wraps the preset's dark `colorScheme` tokens in `@media (prefers-color-scheme: dark)`. On a machine or browser with a dark OS preference, that media query matched, so `DataTable`, the filter controls, and everything else themed off PrimeVue's CSS variables switched to the preset's dark tokens while `styles.css`'s own hardcoded light colors on `body` and `.filter-form` stayed put, splitting the screen visually in two. The same switch flipped `--p-text-color` (inherited by the table cells, and by extension the status and priority badges in `src/components/Badge.vue`) to the dark scheme's near-white value, which sat against the badges' own fixed light-grey `#e2e8f0` pill background from `styles.css` and read as pale grey on pale grey, a real contrast failure.

Fixed in `src/theme.ts` by adding `export const options = { darkModeSelector: false }` alongside the existing `preset`, and passing it through in both `src/main.ts` and `test/adapter.ts` (`theme: { preset, options }`) so production and Jest stay configured identically, matching how `preset` was already shared between them. `darkModeSelector: false` stops PrimeVue from emitting the dark `colorScheme` block at all rather than gating it behind a selector; confirmed in a real browser (Puppeteer against the running dev server on port 5179) that none of the 29 generated `<style>` tags contain `prefers-color-scheme` any more. The badges now compute to `rgb(51, 65, 85)` text (slate-700) on `rgb(226, 232, 240)` background (slate-200), inherited correctly from the light scheme's `text.color` token, comfortably above 4.5:1.

This is a one-line config change, not new code, so the bundle is unchanged: 174.38 KB total, 150.17 KB delta, same as before the fix. `pnpm --filter @uilc/vue-primevue test` still passes all 18 criteria after the change.

## comparison.json

`measure` reads the bundle and the ergonomics counts off the code. Two things it cannot see live in `comparison.json`: how many section 9 requirements needed custom code, and whether the modal, select, and toast came from PrimeVue or were hand built. Filled in as: `requirementsNeedingCustomCode: 4` (the focus-visible outline, the table's accessible name, the page-change live region, and Escape-to-close/focus-restore for the modal — see above), `handBuilt: { modal: false, select: false, toast: true }`, `axeViolationsBeforeFixes: 0` (criteria 17 and 18 passed clean on every run, including before the fixes above were added).
