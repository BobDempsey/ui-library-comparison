# vue-vuetify

Vuetify building the bake-off screen in Vue 3.

Read [`spec/screen-spec.md`](../../spec/screen-spec.md) before writing code. Sections 2 to 9 are the requirements. A requirement this library cannot meet is recorded as a failure, not worked around.

```
pnpm --filter @bakeoff/vue-vuetify dev
pnpm --filter @bakeoff/vue-vuetify test
pnpm --filter @bakeoff/vue-vuetify build
pnpm --filter @bakeoff/vue-vuetify measure
```

Write only inside this folder and `results/vue-vuetify.json`. `packages/criteria` and `packages/harness` belong to the phase one owner.

## Result

18 of 18 criteria pass, driving the real DOM through the adapter (`test/adapter.ts`) rather than reading component state. No adapter method throws; Vuetify met every requirement the spec asks for, though several needed hand-built code on top (see below).

Bundle: 120.17 KB gzipped total against a 24.21 KB Vue baseline, a 95.96 KB delta, inside the 180 KB budget. `pnpm --filter @bakeoff/vue-vuetify measure` writes this to `results/vue-vuetify.json`.

## Notes for the write-up

### What Vuetify gave for free

- **The table.** `v-table` renders a real `<table>` with Vuetify's styling; the caption, `aria-sort`, sort cycling, and pagination are hand built on top (Vuetify ships a separate `v-data-table` with its own sorting and paging, but its header-click cycle and footer controls do not match section 4's exact three-step cycle or its "Showing 1 to 25 of 240" wording, so this build used the plain `v-table` wrapper and built the behavior itself, the same choice every build in this comparison makes for its table region regardless of library).
- **The filter selects.** `v-select` handles both the Status/Priority multi-selects and the single-select Assignee field: selection state, chips-free multi-value display, keyboard navigation, and the ARIA combobox/listbox pattern all come from the component. The only hand-built pieces are three visually-hidden spans (`filter-status-selected` etc.) mirroring the current selection as plain text, needed because `values()` in the adapter interface requires a synchronous read and Vuetify's own display text is formatted for people, not for parsing back into an array — the same problem `react-headless` solved with a hidden summary next to its Headless UI listbox.
- **The modal shell.** `v-dialog` + `v-card` gives `role="dialog"`, `aria-modal="true"`, teleporting the dialog out of the table's DOM position, and a Tab-focus trap once focus is inside. `content-props` let this build attach `aria-labelledby` to the card's title and override the confirm dialog's role to `alertdialog` without fighting the component.
- **Badges and buttons.** `v-chip` for status/priority badges and `v-btn` for every button (sort headers, pagination, Save/Cancel, Retry, Clear filters) came directly from the library with no customization beyond color mapping.
- **The individual toast.** `v-alert` with `closable` gives each toast its close button (with a real `aria-label` via `close-label`) and `role="status"` for free.

### What had to be hand built

Six of section 9's requirements needed custom code:

1. **`aria-sort` and the sort cycle itself.** Since sorting is built on plain `v-table` rather than `v-data-table`, the ascending → descending → default cycle (section 4) and the `aria-sort` attribute on the active column (section 9) are both hand written in `TicketsTable.vue` and `filtering.ts`.
2. **Pagination's live region.** The `Showing X to Y of Z` text and its `aria-live="polite"` wrapper, plus the First/Previous/Next/Last buttons, are hand built; `v-table` has no pagination concept.
3. **Row keyboard operability.** A native `<tr>` is not interactive. This build adds `tabindex="0"` and an Enter/Space `keydown` handler to open the record modal, matching section 4's requirement that a row be reachable and operable by keyboard.
4. **Focus moves to the first field on modal open.** This was the one genuine surprise: polling `document.activeElement` for a full second after opening the dialog (with no user-agent throttling involved) showed focus never moves off the triggering row on its own. Whatever Vuetify's dialog does for focus on open, it did not move focus into the dialog in this setup, so `RecordModal.vue` explicitly calls `.focus()` on the subject field once the dialog's content has mounted (`nextTick` after the ticket prop changes). This may be a jsdom-specific gap (Vuetify's focus trap likely depends on transition-end timing this build's transitions are stubbed for under Jest) rather than a real-browser behavior; a manual pass is the way to confirm that, per section 9's own caveat about axe-core and jsdom.
5. **Focus returns to the originating row on modal close.** Rather than lean on Vuetify's documented activator-based focus return (which assumes the dialog owns an `activator` element; this screen opens the modal from a table row click/keypress, not from a dedicated trigger), `TicketsScreen.vue` captures `document.activeElement` itself right before opening and restores it in the close handler.
6. **The field error announcement.** The subject field's required/max-length error (section 6) is a hand-built `<p role="alert">` under the field rather than Vuetify's built-in `error-messages` prop, to guarantee the exact DOM shape criterion 11 and the adapter's `fieldError()` need and to guarantee it is announced immediately.

### The toast system

`handBuilt.toast: true`. Vuetify's `v-snackbar` is a single overlay instance, not built for a persistent stack, so it is not used here. Instead, `toasts/toastStore.ts` hand builds the whole system section 7 asks for — the push/dismiss queue, the cap of 3 with oldest-dropped-first eviction, and per-toast auto-dismiss timers — and `ToastRegion.vue` renders each queued message through a `v-alert` for its visual chrome and close button. So the pieces are: library component for one toast's markup, hand-built code for everything that makes it a *toast system*.

### Ergonomics counts

`measure` reports **1** library import in `src/`. That number is real but misleading on its own: this build uses [`vite-plugin-vuetify`](https://www.npmjs.com/package/vite-plugin-vuetify)'s `autoImport`, the standard way to install Vuetify with Vite, which resolves `<v-btn>`, `<v-table>`, `<v-select>`, `<v-dialog>`, `<v-card>`, `<v-chip>`, `<v-text-field>`, `<v-alert>`, `<v-app>`, `<v-main>`, `<v-list-item>`, and `<v-skeleton-loader>` from their template tags at build time, so none of them needs an explicit `import` statement in a `.vue` file's `<script setup>`. The single counted import is `createVuetify` in `main.ts`. `measure`'s import count, written before this build existed, assumes a library where every component is named in an import line (true for `Headless UI`, `Material UI`, and every React build); it undercounts a Vuetify (or PrimeVue, or Quasar) build's actual component surface. Whoever assembles the write-up should read this note rather than the bare number for the Vue group.

0 type escapes (`any`, `as unknown as`, `@ts-expect-error`) anywhere in `src/`. 942 lines of application code.

## Unexpected things for a future builder or the phase-one owner

Beyond the three issues in `handoff.md` section 5 (invalid `jest-preset.json`, the hoisted `jest` binary path, no shared `criteria-results.json` reporter — all present here too, worked around the same way `react-headless` did), Vuetify under Jest needed a fair amount of setup that a future Vue-suite builder (PrimeVue, Quasar) should expect to hit some version of:

- **Jest has to run in classic CommonJS mode, not `--experimental-vm-modules`.** `@vue/vue3-jest` compiles `<script setup>` to CommonJS output; under Jest's native-ESM loader (what `react-headless` uses, since `ts-jest`'s `useESM` mode produces real `export` syntax) a `.vue` file's compiled module does not expose a `default` export the loader can see. Running Jest in its default CJS mode sidesteps this because everything, including the workspace's `type: module` packages like `@bakeoff/fixture`, gets transformed to CommonJS uniformly, so package.json's `type` field never enters into it.
- **Vuetify ships ESM-only, no CommonJS build**, so its `node_modules` source needs `babel-jest` (with `@babel/preset-env`) and a `transformIgnorePatterns` override, rather than the default skip-everything-in-`node_modules` behavior. pnpm's `node_modules/.pnpm/vuetify@<version>/node_modules/vuetify/...` nesting means the usual single-package "un-ignore" regex recipe (written for a flat `node_modules`) has to target the `.pnpm/vuetify@` segment specifically.
- **jsdom is missing several globals Vuetify's overlay positioning touches unconditionally**: `CSS` (used for `CSS.supports(...)` feature detection), `visualViewport` (referenced as a bare global, not `window.visualViewport`, inside `VOverlay`'s location strategy), plus the more commonly-needed `ResizeObserver`, `IntersectionObserver`, and `matchMedia`. All five are stubbed in `test/setup.ts`. Without the `visualViewport` stub specifically, opening any `v-select`, `v-menu`, or `v-dialog` throws a `ReferenceError` from deep inside a watcher, which is a confusing failure to trace back to "missing browser global."
- **`v-select`'s menu does not open on a bare `fireEvent.click`.** It needs a fuller pointer sequence (`pointerdown`, `mousedown`, `mouseup`, `click`) dispatched at the `.v-field` element (the div carrying `role="combobox"`, not the `<input>` inside it) before the menu opens; seen by direct DOM inspection under Jest, not documented anywhere obvious. `test/adapter.ts`'s `openSelect()` helper does this once so nothing else has to.
- **The dialog's focus trap does not move focus onto the first field automatically**, at least not observably under Jest/jsdom (polled `document.activeElement` for a full second with nothing happening). Section 6 requires it, so `RecordModal.vue` moves focus itself. This is worth a manual-browser check per section 9's NVDA/VoiceOver pass, since it may be a jsdom-only gap rather than a real Vuetify limitation.
- **`v-select`'s `data-testid` (and any other non-declared attribute) lands on the component's root element**, which for a select/text-field is the outer `.v-input` wrapper, not the inner `<input>`. The `id` prop, by contrast, is a real declared prop and does land on the actual `<input>`, which is what this build's adapter and `<label for>` associations rely on throughout.

None of this changed how the screen is built for a real user; it is entirely test-harness plumbing, and it is the reason this build's `jest.config.js`, `babel.config.cjs`, and `test/setup.ts` are longer than a superficially similar React build's would be.
