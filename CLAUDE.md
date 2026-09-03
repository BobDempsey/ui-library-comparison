# CLAUDE.md

Eight UI libraries build the same `/tickets` screen so they can be compared on ergonomics, bundle size, and accessibility defaults. The comparison only holds if the screen and the measurements are identical, which is what most of the rules below protect.

Read `spec/screen-spec.md` before writing code. `handoff.md` carries the fuller state and the reasoning.

## Never

- **Edit `packages/criteria` or `packages/harness` while working on a build.** CI diffs them against main. A criterion that looks wrong is a question for the phase one owner, not a patch. A test patched locally ends the comparison and nothing will say so.
- **Edit `spec/screen-spec.md` or `packages/fixture` to make a build pass.** A library that cannot meet a requirement fails that requirement rather than changing it.
- **Edit another build's folder.** A worker writes only inside its own `builds/<name>/` and its own `results/<name>.json`.
- **Fake an adapter method.** Drive the real control: click the header, type in the input, press the key. Reading component state measures nothing. Throw from anything the library genuinely cannot do; a thrown criterion is a recorded result.
- **Skip a test, loosen an assertion, or special-case a criterion.** A documented failure is a good result. A claimed pass that cannot be demonstrated is worse than useless, because the write-up publishes it as real.
- **Import `@bakeoff/fixture/data` from application code.** Use `loadTickets` from `@bakeoff/fixture`. The static entry point folds the 240 rows into the bundle and inflates the size number. Tests may import it freely.
- **Re-export the generator from `@bakeoff/fixture`.** It reads and writes files, and pulling it into that entry point drags `node:fs` into every browser bundle.
- **Add manual chunking or external the library in `vite.config.ts`.** Either moves weight out of the number the comparison is about. Each build's config matches its baseline.

## Always

- Run `pnpm --filter @bakeoff/<name> test` as you go. The 18 criteria are the definition of done, not your own reading of the spec.
- Run `pnpm fixture:check` after touching the fixture. The criteria assume a row on each Created boundary, a search matching one row, subjects spanning A to Z, and a status and priority pair with rows.
- Run `pnpm install` after scaffolding a build, or its workspace dependencies are not linked.
- Update `bakeoff.json` honestly as you build. It carries the two counts a script cannot read off the code.
- Keep LF newlines. `.gitattributes` enforces it, and CI regenerates `tickets.json` and fails on a diff.
- Report failures plainly, with the criterion number and the reason.

## Prose

The user's writing rules in `~/.claude/CLAUDE.md` apply here. No em dashes, no marketing vocabulary. Every markdown file in this repo is already clean; keep new prose in the same register.
