# Component library bake-off

Eight UI libraries build the same screen so they can be compared on ergonomics, bundle size, and accessibility defaults. The spec in [`spec/screen-spec.md`](spec/screen-spec.md) is the fixed input, and a library that cannot meet a requirement fails it rather than changing it.

This is sample content for a demo. The domain, the data, and the numbers are fictional.

## Where this stands

Phase one is built and frozen. Phase two, the eight builds, has not started. Every build folder is empty, so CI skips its matrix leg until someone scaffolds one.

| Piece | State |
| --- | --- |
| `spec/screen-spec.md` | settled, sections 1 to 13 |
| `packages/fixture` | 240 tickets, generator, committed `tickets.json` |
| `packages/criteria` | the 18 acceptance criteria, shared |
| `packages/harness` | the adapter interface every build implements |
| `templates/` | `common` plus a `react` and a `vue` overlay |
| `builds/*` | empty, eight to come |
| `baselines/*` | built, React floor 45.8 KB gzipped, Vue floor 24.6 KB |
| `scripts/measure.ts` | scores one build, writes `results/<build>.json` |
| `.github/workflows/ci.yml` | matrix over the ten apps |

## Phase one is frozen

Section 15 of the spec: the fixture, the criteria, and the adapter interface are settled before any build starts, because a comparison where they moved partway through is not a comparison.

Nobody working on a build edits `packages/criteria` or `packages/harness`. A criterion that looks wrong goes back to the phase one owner as a question. A test patched locally ends the comparison and nothing in CI will say so.

## Starting a build

The slice is one library, not one feature. Take a folder from empty through the screen, the adapter, the 18 criteria, and a `measure` run that writes `results/<name>.json`.

1. Scaffold the folder, then install:

```
pnpm new-build react-shadcn
pnpm install
```

   A build arrives with the four scripts `dev`, `build`, `test`, and `measure`, the Jest wiring, a Vite config matching its baseline, an `index.html`, a `TicketsScreen` already loading the fixture, and an adapter stub that throws from every method. It builds and typechecks before you write a line. The library, framework, and kind come from `scripts/roster.ts`, so all eight are labelled the same way.

2. Build the screen from the spec. Read sections 2 to 9 before writing code.
3. Fill in `test/adapter.ts`, deleting a `notImplemented` at a time. Drive real controls, never internal state. A build is done when none are left.
4. Run `pnpm --filter @bakeoff/<build> test`. Record what fails, do not bend the spec.

`test/criteria.test.ts` is the whole test file and it is one line of setup. There is nothing to add.

The 240 rows load through a dynamic import, so a bundler emits them as their own chunk and `measure` can leave them out of the size total, as section 10 requires. Keep using `loadTickets`; a static import of the fixture folds it back into the application bundle and inflates the number.

A worker writes only inside its own `builds/<name>/` folder and its own `results/<name>.json`, so eight writers never touch the same line. Each build lands as its own pull request.

## Commands

```
pnpm install
pnpm fixture:generate   # regenerate the 240 tickets, then check the assumptions
pnpm fixture:check      # check them without regenerating
pnpm typecheck          # the three shared packages
pnpm new-build <name>   # scaffold one of the eight from templates/build
pnpm measure --all      # score every scaffolded build into results/
```

`tickets.json` is committed and the seed is fixed, so regenerating produces the same file. If it does not, the earlier bundle and render numbers stop comparing and the run starts over.
