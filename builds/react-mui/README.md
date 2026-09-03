# react-mui

Material UI building the bake-off screen in React.

Read [`spec/screen-spec.md`](../../spec/screen-spec.md) before writing code. Sections 2 to 9 are the requirements. A requirement this library cannot meet is recorded as a failure, not worked around.

```
pnpm --filter @bakeoff/react-mui dev
pnpm --filter @bakeoff/react-mui test
pnpm --filter @bakeoff/react-mui build
pnpm --filter @bakeoff/react-mui measure
```

Write only inside this folder and `results/react-mui.json`. `packages/criteria` and `packages/harness` belong to the phase one owner.

## Notes for the write-up

**Result: 18/18 criteria pass.** Bundle: 124.65 KB total gzipped, 44.91 KB baseline, 79.74 KB delta, within the 180 KB budget.

### What Material UI gave for free

- `Dialog`: `role="dialog"`, a real focus trap (`FocusTrap`), and focus return to whatever had focus before the dialog opened (the originating row, for criterion 14), all through its underlying `Modal`. `aria-modal="true"` comes from the same place. `aria-labelledby` is wired explicitly to the title's `id` rather than assumed automatic.
- `Select` (single and `multiple`): the `combobox`/listbox popup pattern, keyboard navigation, portal-based menu positioning, and `aria-selected` on each `MenuItem` computed from the current value. Covers both the filter form's multi-selects (Status, Priority) and every single-select (Assignee, and the modal's Status/Priority/Assignee).
- `Table`/`TableHead`/`TableBody`/`TableRow`/`TableCell`: real `<table>` markup for free, no ARIA table role emulation needed.
- `TableSortLabel`: the sort direction arrow and the active/inactive visual state. Combined with `TableCell`'s `sortDirection` prop, this produces the `aria-sort` attribute, though wiring `sortDirection` to our own sort state is application code.
- `TablePagination`: first/previous/next/last controls (`showFirstButton`/`showLastButton`) with correct `aria-label`s, plus the row-count label via `labelDisplayedRows`.
- `TextField`: `error`/`helperText` auto-wires `aria-invalid` and `aria-describedby` to the field, which is exactly what criterion 11's field-error announcement needs.
- `Chip`, `Skeleton`, `Alert` (`role="alert"` by default), `Checkbox`, `MenuItem`/`ListItemText`: all used as-is for badges, the loading skeleton, the error banner, and the multi-select checkmarks.

### What had to be hand built

- **The toast stack.** Material UI's only notification primitive is `Snackbar`, a single-slot component (its own docs describe a queue that shows the next message only once the current one closes), not the 3-deep, oldest-dropped-first stack section 7 asks for. `src/toasts/ToastContext.tsx` hand-builds the stack, the cap, and the auto-dismiss timers; `ToastRegion` renders each entry as an `Alert` for the visual chrome and the built-in close button, inside a hand-written `aria-live="polite"` container that mounts before the first toast.
- **A visible focus indicator at 3:1 contrast (section 9).** `ButtonBase` (which backs `Button`, `MenuItem`, `TableSortLabel`, and the `Select` trigger) ships a focus-visible state that only nudges opacity, not an outline. `src/styles.css` adds an explicit `:focus-visible` / `.Mui-focusVisible` outline rule.
- **The `<caption>` on the table** and the **`aria-sort` wiring** (`TableCell`'s `sortDirection` prop has to be told which column and direction is active; `TableSortLabel` does not infer it).
- **A live region around the pagination summary.** `TablePagination`'s displayed-rows text is not itself announced; it is wrapped in an `aria-live="polite"` container so page changes are announced per section 9.
- The sort cycle (ascending / descending / back to `updatedAt` descending), client-side pagination math, filtering (AND across fields, OR within a field), the search debounce, validation and touched-tracking in the record modal, and the unsaved-changes confirmation flow. These are the screen's actual behavior, not accessibility scaffolding, and no library provides them.
- Status/priority color mapping for `Chip`, date formatting (`MMM d, yyyy`, UTC-normalized), and the relative-time formatter for `updatedAt`.

### Accessibility (section 9)

Declared `requirementsNeedingCustomCode: 3` in `bakeoff.json`: the focus-visible outline, the table's `<caption>` plus `aria-sort` wiring, and the live region around the pagination summary. The other three of section 9's six code-relevant bullets (semantic HTML/ARIA choice, keyboard operability, tab order) came from using real `table` markup, MUI's ARIA-pattern `Select`/`Dialog`, and natural DOM order without extra work.

`axeViolationsBeforeFixes: 0` — axe-core reported zero violations of any severity (not just serious/critical) on both the loaded table and with the modal open, confirmed with a throwaway debug run before this file was written. The same caveat as every other build applies: axe-core runs under jsdom here (Jest's `testEnvironment`), and jsdom has no real layout or canvas (`HTMLCanvasElement.getContext` is not implemented), so axe's `color-contrast` check throws internally and cannot evaluate real contrast in this environment. "Zero violations" reflects everything axe can check under jsdom (roles, names, ARIA attribute correctness, structure), not a substitute for the manual NVDA/VoiceOver pass or a browser-based axe run for contrast.

### Adapter notes

- `modal.isOpen()`, `confirmIsOpen()`, and `holdsFocus()` are scoped by `data-testid` (`record-dialog`, `confirm-dialog`) rather than `role="dialog"`, because the record dialog and the confirm dialog can both be open at once (criterion 13), and a Testing Library role query throws instead of returning a boolean when more than one element matches a role.
- `Select`'s menu opens on `mousedown` on the `combobox` element (a plain `click` does not reliably open it under jsdom) and, for the multi-selects, closes on `Escape` since selecting an option does not auto-close a `multiple` `Select`.
- The multi-select and single-select filter fields needed `displayEmpty` on `Select`: without it, MUI suppresses a custom `renderValue` when the current value is empty (`[]` or `''`) and renders an internal zero-width-space placeholder instead, which broke `filters.values()`'s readback after Clear (caught by criterion 8).
- `fieldError('subject')` reads `TextField`'s auto-generated `#ticket-subject-helper-text` node, the same id `aria-describedby` points at.
- Default imports from MUI subpaths (`import Button from '@mui/material/Button'`) resolve to the whole CJS module object rather than the component under Jest's `--experimental-vm-modules` loader (Node's native CJS→ESM interop binds a default import to `module.exports` wholesale, not to `.default`), producing "Element type is invalid ... got: object" at render time. Every MUI import in this build, application code included, uses named imports from the `@mui/material` barrel instead (`import { Button } from '@mui/material'`), which resolves through the CJS module's named `exports.X` bindings and works under both Jest and Vite. This did not affect the Vite production build, which never went through this path.
- No adapter method had to throw. Nothing in the 18 criteria exposed a gap Material UI could not be made to do.

### Tooling snags (not part of the 18, carried over from `react-headless`, still true here)

- `packages/criteria/jest-preset.json`'s `transform` key is the literal string `"^.+\.(t|j)sx?$"`; `\.` is not a legal JSON escape, so `JSON.parse` throws on that file. Worked around by inlining the same, correctly escaped settings directly in this build's `jest.config.js`.
- The scaffolded `package.json` test script assumed a hoisted `jest` binary (`../../node_modules/jest/bin/jest.js`), which this pnpm workspace does not provide. Pointed at `node_modules/jest/bin/jest.js` instead.
- Nothing in the shared packages writes `criteria-results.json`, so a local Jest reporter (`test/reporter.cjs`) turns the suite's pass/fail state into that file for `measure` to read.
- jsdom implements neither `ResizeObserver` nor `window.matchMedia`, both touched by Material UI internals (`Popper` positioning, theme transition helpers). `test/setup.ts` stubs both.

## bakeoff.json

`measure` reads the bundle and the ergonomics counts off the code. Two things it cannot see live in `bakeoff.json`: how many section 9 requirements needed custom code, and whether the modal, select, and toast came from Material UI or were hand built. Update it as you go rather than at the end.
