# Handoff: component bake-off

**Updated:** 2026-09-03

## 1. What this is

The workspace behind `bakeoff-screen-spec.md`, which lives in `../demo-resume/` and is copied here as `spec/screen-spec.md`. Eight UI libraries build the same `/tickets` screen so they can be compared on ergonomics, bundle size, and accessibility defaults.

Demo content. The domain, the data, and the numbers are fictional, matching `../demo-resume/demo-resume.md`. Git history starts at the phase one commit, which is the baseline every build diffs against.

Phase one is built and frozen. Phase two, the eight builds, is done: all eight of `builds/` are built and scored, and `results/` has all eight files. Every build passes all 18 criteria except `react-antd`, which passes all 18 but is over the 180 KB bundle budget. None of it is committed yet.

## 2. What exists

- `spec/screen-spec.md`: the spec, copied from `demo-resume/bakeoff-screen-spec.md`. The copy is the one the builds read.
- `packages/fixture`: 240 tickets from a seeded generator, committed as `tickets.json`. Three entry points: `@bakeoff/fixture` for `loadTickets` and types, `@bakeoff/fixture/data` for the static rows, `@bakeoff/fixture/generate` for the generator.
- `packages/criteria`: the 18 acceptance criteria from section 11, as one `runCriteria(name, createAdapter)` call, plus `expected.ts`, a reference implementation of the filtering and sorting the criteria compare against.
- `packages/harness`: the `BakeoffAdapter` interface, the `BuildResult` shape, and the 180 KB budget constant.
- `templates/common`, `templates/react`, `templates/vue`: the per-build template, common files plus a framework overlay.
- `scripts/roster.ts`: the eight builds with their library, framework, and kind. Both the scaffold and the scoring read it.
- `scripts/new-build.ts`: stamps a build folder. `pnpm new-build react-shadcn`.
- `scripts/measure.ts`: scores one build into `results/<build>.json`.
- `scripts/check-fixture.ts`: asserts the things the criteria assume about the fixture.
- `baselines/react`, `baselines/vue`: mount the framework, render nothing. Measured 45.8 KB and 24.6 KB gzipped. Never published.
- `.github/workflows/ci.yml`: a `shared` gate, then a matrix over the ten apps. A build leg skips itself until that folder exists.
- `builds/react-headless`: the first build, Headless UI on React. 18/18 criteria pass, driving the real DOM through the adapter rather than reading component state. Gzipped total 89.73 KB against a 44.91 KB baseline, a 44.82 KB delta, inside the 180 KB budget. `builds/react-headless/bakeoff.json` records that the modal came free from `Dialog`, the select and toast were hand built (Headless UI has no toast primitive), and 6 of section 9's requirements needed custom code. Scored into `results/react-headless.json`. Not yet committed.
- `builds/react-mui`: Material UI on React. 18/18 criteria pass, no adapter method had to throw. Gzipped total 124.65 KB against the 44.91 KB baseline, a 79.74 KB delta, inside budget. `bakeoff.json` records `requirementsNeedingCustomCode: 3`, modal and select free from `Dialog`/`Select`, toast fully hand built (MUI's `Snackbar` is single-slot, not the 3-deep stack section 7 needs). Scored into `results/react-mui.json`. Not yet committed.
- `builds/react-chakra`: Chakra UI (Ark UI under the hood) on React. 18/18 criteria pass, verified with a fresh test run. Gzipped total 142.63 KB against the 44.91 KB baseline, a 97.72 KB delta, inside budget. Modal and toast live-region/dismiss came free; toast eviction (cap at 3, oldest dropped first), row keyboard activation, `aria-sort`, table caption, and pagination live-region were hand built, 4 requirements total. Uses Chakra's `NativeSelect` (a real `&lt;select&gt;`) instead of the Ark listbox `Select`, a documented trade for multi-select reliability, not a limitation. Scored into `results/react-chakra.json`. Not yet committed.
- `builds/vue-quasar`: Quasar on Vue. 18/18 criteria pass. Gzipped total 115.84 KB against a 24.21 KB Vue baseline, a 91.63 KB delta, inside budget. Modal and select came free from `QDialog`/`QSelect`; table and toast were hand built (`QTable` and `$q.notify()` didn't fit the spec's exact behavior), 6 requirements total, matching `react-headless`'s methodology for comparability. Caught and fixed a real critical axe violation (double-nested `&lt;label&gt;` around `QInput`) and a real app bug (a page-reset watcher ported from a React `useEffect` pattern that never fired on Vue's non-immediate `watch()`). Scored into `results/vue-quasar.json`. Not yet committed.
- `builds/vue-vuetify`: Vuetify on Vue. 18/18 criteria pass, stable across three clean runs. Gzipped total 120.17 KB against a 24.21 KB Vue baseline, a 95.96 KB delta, inside budget. Caught and fixed two real application bugs (a `watch()` skip-first-run guard wrong for Vue's mount semantics, and the filter/table pipeline reading raw fixture data instead of the post-save `rows` ref) and moved dialog focus explicitly onto the first field, since Vuetify's own trap left focus on the triggering row. Scored into `results/vue-vuetify.json`. Not yet committed.
- `builds/vue-primevue`: PrimeVue on Vue. 18/18 criteria pass. Gzipped total 174.38 KB against a 24.21 KB Vue baseline, a 150.17 KB delta, inside the 180 KB budget with about 5.6 KB headroom (needed trimming the theme to only the 10 mounted components and dropping an unused ~105 KB `primeicons` font import). Table, dialog, select, and confirm-dialog came free from `DataTable`/`Dialog`/`MultiSelect`/`ConfirmDialog`; toasts and modal focus placement/return were hand built (Dialog's focus trap and Escape listener never fired under this Jest/jsdom setup), `requirementsNeedingCustomCode: 4`. `axeViolationsBeforeFixes: 0`. Scored into `results/vue-primevue.json`. Not yet committed.
- `builds/react-shadcn`: shadcn/ui (Radix) on React. 18/18 criteria pass, confirmed stable across three runs. Gzipped total 103.52 KB against the 44.91 KB baseline, a 58.61 KB delta, inside budget. `handBuilt: { modal: true, select: true, toast: true }`, `requirementsNeedingCustomCode: 4`, the whole table, the multi-selects (Radix's `Select` is single-value only, assembled instead from `DropdownMenu` + `Checkbox`), the toast cap-of-3, and explicit focus return to the originating row on modal close (Radix's `Dialog` only restores focus to a `Dialog.Trigger`, a no-op here since the dialog opens from controlled row state). `axeViolationsBeforeFixes: 0`. Scored into `results/react-shadcn.json`. Not yet committed.
- `builds/react-antd`: Ant Design on React. 18/18 criteria pass, but **over the 180 KB bundle budget**: 278.36 KB gzipped total, a 233.45 KB delta against the 44.91 KB baseline, `overBudget: true` in the result. Isolated with a standalone esbuild bundle to confirm `Table` alone costs ~247 KB gzip with React (`rc-table` pulls in `rc-virtual-list` unconditionally), a genuine library-weight finding, not an implementation shortfall. Trimming elsewhere (native `<input type="date">` instead of `DatePicker`, plain markup instead of `Result`/`Skeleton`) saved real weight but couldn't close that gap. Modal and select came free; table `aria-label`, row keyboard activation, pagination bar, field error wiring, and toasts (entirely) were hand built, 5 requirements. Found a real library bug: `Select`'s open dropdown renders a hidden duplicate `role="option"` list alongside the real clickable rows, so a naive `getAllByRole('option')` matches the wrong copy. Scored into `results/react-antd.json`. Not yet committed.

## 3. The rules that govern edits

Phase one is the fixed input. Nobody working on a build edits `packages/criteria` or `packages/harness`. A criterion that looks wrong goes back to the phase one owner as a question, because a test patched locally ends the comparison and CI will not say so. The `builds` job diffs both packages against main for exactly this.

The slice is one library, never one feature. A feature slice would put eight workers inside the same eight folders. A worker writes only inside its own `builds/<name>/` and its own `results/<name>.json`.

`tickets.json` is committed and the seed is fixed. CI regenerates it and fails on a diff. If it ever changes, every earlier bundle and render number stops comparing and the run starts over.

Run `pnpm fixture:check` after touching the fixture. The criteria assume a row on each Created boundary, a search matching exactly one row, subjects spanning A to Z, and a status and priority pair with rows. That script asserts all of it.

A library that cannot meet a requirement records the failure. Do not bend the spec, and do not return a plausible fake from an adapter method to get the suite green. Throw instead. A thrown criterion is a recorded result.

## 4. Decisions made

- The fixture loads through a dynamic import inside `loadTickets`, so a bundler emits the 240 rows as their own chunk. Section 10 excludes the fixture from the size total, and `measure` can only do that if the rows are not inlined. A static import of `@bakeoff/fixture/data` in application code folds them back in and inflates the number. Tests import the static entry point freely.
- The generator is not re-exported from `@bakeoff/fixture`. It reads and writes files, and re-exporting it dragged `node:fs` into the browser bundle and broke `vite build`. It has its own entry point.
- `measure` reads the bundle and the ergonomics counts off the code. The two things a script cannot see, how many section 9 requirements needed custom code and whether the modal, select, and toast were hand built, come from a `bakeoff.json` each build declares.
- Lighthouse needs a served build and a browser, so a local `measure` writes `runs: 0` rather than inventing a number. CI supplies the median.
- A build with no `criteria-results.json` scores as 18 failures, not as 0 passes and 0 failures. A missing test run must never read as a clean one.
- The template splits into `common` plus a `react` or `vue` overlay. The two differ in the entry file, the Vite plugin, the dependencies, and a `.vue` type shim, and nothing else. A scaffolded build typechecks, builds, and measures before anyone writes a line.
- Each build's Vite config matches its baseline: no manual chunking, no external-ing the library. Either would move weight out of the number the comparison is about.
- The roster lives in `scripts/roster.ts` rather than inside the scaffold, because importing it from `new-build.ts` ran that script's CLI as a side effect.

## 5. Gotchas

- Scaffolding a build needs `pnpm install` afterwards, or its workspace dependencies are not linked and everything reports as missing modules.
- `measure` identifies the fixture chunk by basename, matching `tickets-*.js` or `data-*.js`. A bundler that names chunks differently needs that regex updated, or the fixture counts against the budget.
- The criteria compare against `expected.ts` rather than against numbers typed by hand, so regenerating the fixture does not silently invalidate the suite. Keep it that way.
- `pnpm typecheck` covers the three shared packages only. A build typechecks through its own `tsconfig.json`.
- Files are written with LF newlines. Preserve that.
- The user's writing rules ban em dashes and a list of marketing words. Every markdown file here has none. Keep new prose in the same register.
- `packages/criteria/jest-preset.json` is invalid JSON: the pattern `"^.+\.(t|j)sx?$"` uses `\.`, which is not a legal JSON escape, so `JSON.parse` throws on it. Every build hits this. `react-headless` worked around it by inlining the same, correctly escaped settings directly in its own `jest.config.js` rather than touching the shared file. This is a phase one bug and belongs to the owner, not to per-build workarounds.
- The scaffolded test script assumes a hoisted `jest` binary (`../../node_modules/jest/bin/jest.js`), which does not match this pnpm workspace's layout. `react-headless` pointed its script at its own `node_modules/jest/bin/jest.js` instead.
- axe-core under jsdom cannot check color contrast (`HTMLCanvasElement.getContext` is not implemented in jsdom), which logs a harmless console error during the axe criteria. A "zero violations" result is real for what axe can evaluate under jsdom, but is not a substitute for a manual screen-reader pass or a browser-based axe run.
- Under Jest's `--experimental-vm-modules`, a default import from a CJS library subpath (e.g. `import Button from '@mui/material/Button'`) can resolve to the whole module object instead of the component, because Node's native CJS-to-ESM interop binds the default import to `module.exports` wholesale rather than `.default`. `react-mui` hit this and fixed it by switching to named imports from the library's barrel (`import { Button } from '@mui/material'`) in both app and test code. Watch for it in any build pulling components from CJS subpaths; it does not affect the Vite production build, only Jest.
- `react-chakra`'s Ark UI dialog/toast state machines schedule some updates on `requestAnimationFrame`, so its adapter waits for focus to actually land or return rather than for the element to appear or disappear. Its `createToaster()` is a module-level singleton that survives Jest's mount/unmount cycles, so its adapter calls `toaster.remove()` in `unmount()` to stop bleed between tests.
- `measure`'s "library imports" ergonomics count only sees explicit `import` statements. `vue-vuetify` (and, the same way, any Vue-suite build using `vite-plugin-vuetify`/`unplugin-vue-components`-style auto-import, likely `vue-primevue` and `vue-quasar` too) resolves `<v-btn>`, `<v-select>`, etc. from template tags at build time, so the count undercounts real library usage for those builds. This is a `measure`/phase one limitation, not a build bug; flagged for the owner rather than worked around.
- `vue-primevue`'s Jest setup needed more than the two react-headless workarounds: `@vue/vue3-jest` always downlevels a `.vue` file's compiled template to CommonJS via Babel regardless of Jest's ESM settings, and PrimeVue ships ESM-only with no `require` fallback, so the build runs Jest in CommonJS mode with a widened `transformIgnorePatterns` (documented in its `jest.config.js`). `@primevue/themes`'s `aura/<name>` subpaths are also import-only with no CJS fallback; worked around by depending on `@primeuix/themes` directly, which the `@primevue/themes` package itself re-exports from.
- PrimeVue's single-value `Select` commits an option on `mousedown`, while its `MultiSelect` sibling commits on `click`, so a one-size-fits-all "click the option" test helper silently no-ops on `Select`. Its `MultiSelect` combobox is also a visually hidden `<input>` whose own click handler ignores clicks on itself, so a test has to click its `[data-pc-section="root"]` ancestor, not the element `getByRole('combobox')` naturally returns.
- `axe-core` runs 2 to 4 real minutes per test against a heavier DOM (Ant Design's `rc-table` virtual-list scaffolding, `rc-select`'s duplicated option lists), and chained `Select` interactions in `react-antd`'s filter criteria pass Jest's 15 second default. Its `jest.config.js` raises `testTimeout` to 300000ms; this does not loosen any assertion, it only stops correct-but-slow interactions from racing the clock. Worth checking if it recurs on other suite-kind builds.

## 6. Not done

- All eight builds are built and scored, but none is committed. `git status` still shows `builds/*` and `results/*.json` as untracked, plus `pnpm-lock.yaml` and `handoff.md` as modified.
- `react-antd` passes all 18 criteria but is over the 180 KB bundle budget (233.45 KB delta), because Ant Design's `Table` alone costs roughly 247 KB gzip with React. That is a recorded result, not a defect to fix; the phase one owner decides what, if anything, that means for the comparison.
- No shared `criteria-results.json` reporter. Each build added its own local Jest reporter (see `builds/react-headless/test/reporter.cjs` for the pattern) rather than one shared implementation. The owner may want to promote it into a shared package now that eight builds have copied it.
- The `publish` job in CI is a placeholder. Nothing publishes the static sites yet.
- No Lighthouse runner. `measure` reads a `lighthouse.json` that nothing writes.
- No write-up. `write-up/` is an empty folder. Its precondition, all eight results files existing, is now met; it is written once, by one owner reading `results/`.
- No remote and no pull request has ever run, so the CI steps that diff against main are untested.
- Use Playwright MCP to fully test all builds' functionality (search, save, etc.) once all eight are built.
