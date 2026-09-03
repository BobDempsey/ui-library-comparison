# Handoff: component bake-off

**Updated:** 2026-09-03

## 1. What this is

The workspace behind `bakeoff-screen-spec.md`, which lives in `../demo-resume/` and is copied here as `spec/screen-spec.md`. Eight UI libraries build the same `/tickets` screen so they can be compared on ergonomics, bundle size, and accessibility defaults.

Demo content. The domain, the data, and the numbers are fictional, matching `../demo-resume/demo-resume.md`. Git history starts at the phase one commit, which is the baseline every build diffs against.

Phase one is built and frozen. Phase two, the eight builds, has not started. `builds/` and `results/` are empty.

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

## 6. Not done

- No build exists. All eight of `builds/` are empty, and `results/` is empty.
- No `criteria-results.json` reporter. Jest runs the 18 criteria but nothing writes the pass and fail counts that `measure` reads, so every score currently reports 18 failures.
- The `publish` job in CI is a placeholder. Nothing publishes the static sites yet.
- No Lighthouse runner. `measure` reads a `lighthouse.json` that nothing writes.
- No write-up. `write-up/` is an empty folder; it is written once, after all eight results files exist, by one owner reading `results/`.
- No remote and no pull request has ever run, so the CI steps that diff against main are untested.
