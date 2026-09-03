# react-headless

Headless UI building the bake-off screen in React.

Read [`spec/screen-spec.md`](../../spec/screen-spec.md) before writing code. Sections 2 to 9 are the requirements. A requirement this library cannot meet is recorded as a failure, not worked around.

```
pnpm --filter @bakeoff/react-headless dev
pnpm --filter @bakeoff/react-headless test
pnpm --filter @bakeoff/react-headless build
pnpm --filter @bakeoff/react-headless measure
```

Write only inside this folder and `results/react-headless.json`. `packages/criteria` and `packages/harness` belong to the phase one owner.

## Notes for the write-up

**Result: 18/18 criteria pass.** Bundle: 89.73 KB total gzipped, 44.91 KB baseline, 44.82 KB delta, within the 180 KB budget.

### What Headless UI gave for free

- `Dialog` / `DialogPanel` / `DialogTitle`: `role="dialog"`, `aria-modal="true"`, the title's `aria-labelledby`, a real focus trap, initial focus on the first field, and focus return to whatever had focus before the dialog opened (the originating row, for criterion 14). None of that is hand-written.
- `Listbox` (with its `multiple` prop): keyboard navigation, `aria-selected`, `aria-expanded`/`aria-haspopup` on the trigger, and the label association via `ListboxLabel`. This covers both the filter form's multi-selects (Status, Priority) and its single-selects (Assignee, and the modal's Status/Priority/Assignee).
- Stacking two `Dialog`s (the record modal and the unsaved-changes confirmation) worked correctly out of the box, including marking the backgrounded dialog `aria-hidden` while the confirmation is active — the test adapter had to pass `{ hidden: true }` to Testing Library's role queries to see through that, which is the correct a11y behavior, not a bug.

### What had to be hand built

- The entire table: semantics (`caption`, `scope`, `aria-sort`), sorting cycle, client-side pagination, the `Showing X to Y of Z` live region, and the row-as-a-button keyboard handling (Enter/Space open the modal). Headless UI ships no table or pagination primitive.
- The toast system in full: the stack, the cap of 3 with oldest-dropped-first, the 4s/3s auto-dismiss timers, dismiss-by-button and dismiss-by-Escape, and the always-mounted `aria-live="polite"` region. Headless UI has no toast primitive at all.
- The multi-select's actual UI: the trigger's "N selected" summary, the checkmark rendering per option, and (importantly) a visually-hidden mirror of the current selection next to the trigger, because `FilterProbe.values()` is a synchronous method in the adapter interface and reading Headless UI's `aria-selected` state means opening the popup, which is asynchronous. The mirror is real rendered output, not read-back React state.
- Status/priority badges, date formatting (`MMM d, yyyy`, UTC-normalized so the calendar day doesn't shift with the test runner's timezone), and the relative-time formatter for `updatedAt`.
- All validation, the touched-tracking, and the unsaved-changes confirmation flow around the modal. The dialog mechanics are free; the form behavior is not.

### Accessibility (section 9)

Declared `requirementsNeedingCustomCode: 6` in `bakeoff.json` — of the six code-relevant bullets in section 9 (semantic HTML/ARIA, keyboard + focus-visible, tab order, table semantics, aria-sort/live regions, zero axe violations), every one needed hand-written work, since Headless UI has no table, pagination, or toast component to inherit correctness from. The modal's accessibility (focus trap, labeling) came free; everything table- and toast-shaped did not.

`axeViolationsBeforeFixes: 0` — axe-core reported zero serious/critical violations from the first run that exercised it, because the table/form/modal were built against section 9 from the start rather than retrofitted. One caveat worth flagging for whoever reads the results: axe-core runs here under jsdom (Jest's `testEnvironment`), and jsdom has no real layout or canvas (`HTMLCanvasElement.getContext` is not implemented), so axe's `color-contrast` check throws internally and effectively can't evaluate real contrast in this environment. The "zero violations" result reflects everything axe *can* check under jsdom (roles, names, ARIA attribute correctness, structure) — it is not a substitute for the manual NVDA/VoiceOver pass or a browser-based axe run for contrast.

### Adapter notes

- `FilterProbe.values()` and the multi-select readbacks use the visually-hidden mirror described above rather than opening/closing the Headless UI popup, since the interface requires a synchronous read.
- `ModalProbe.isOpen()` / `holdsFocus()` query `getByRole('dialog', { hidden: true })` rather than the default role query, because Headless UI correctly marks the record dialog `aria-hidden` while the confirmation dialog is stacked on top of it (criterion 13 needs both `isOpen()` and `confirmIsOpen()` to read `true` at once).
- No adapter method had to throw. Nothing in the 18 criteria exposed a gap Headless UI couldn't be made to do, though several (table, pagination, toasts) needed real construction rather than assembly.

### Tooling snags (not part of the 18, but worth recording)

- `packages/criteria/jest-preset.json`'s `transform` key is the literal string `"^.+\.(t|j)sx?$"`. `\.` is not a legal JSON escape (`\\.` is), so `JSON.parse` throws on that file outright — every build pointing `jest.config.js`'s `preset` at `@bakeoff/criteria/jest-preset` hits this, not just this one. Worked around locally by inlining the same settings (correctly escaped) directly in this build's `jest.config.js` rather than editing the shared file. Flagged for the phase one owner.
- The scaffolded `package.json` test script was `node --experimental-vm-modules ../../node_modules/jest/bin/jest.js`, but this pnpm workspace does not hoist `jest` to the repository root (pnpm's default is a strict, non-hoisted `node_modules`). Jest is a direct devDependency of this build and resolves locally, so the script here points at `node_modules/jest/bin/jest.js` instead.
- `handoff.md` section 6 notes that nothing writes `criteria-results.json`, so `measure` would otherwise score every build as 18 failures regardless of the real Jest run. Added a small local Jest reporter (`test/reporter.cjs`, wired in via `jest.config.js`'s `reporters`) that turns the suite's own pass/fail state into that file. It reads test titles for the criterion number and does not change what passes or fails.

## bakeoff.json

`measure` reads the bundle and the ergonomics counts off the code. Two things it cannot see live in `bakeoff.json`: how many section 9 requirements needed custom code, and whether the modal, select, and toast came from Headless UI or were hand built. Update it as you go rather than at the end.
