# react-antd

Ant Design building the bake-off screen in React.

Read [`spec/screen-spec.md`](../../spec/screen-spec.md) before writing code. Sections 2 to 9 are the requirements. A requirement this library cannot meet is recorded as a failure, not worked around.

```
pnpm --filter @bakeoff/react-antd dev
pnpm --filter @bakeoff/react-antd test
pnpm --filter @bakeoff/react-antd build
pnpm --filter @bakeoff/react-antd measure
```

Write only inside this folder and `results/react-antd.json`. `packages/criteria` and `packages/harness` belong to the phase one owner.

## Notes for the write-up

All 18 acceptance criteria pass, driving the real DOM through the adapter (`test/adapter.tsx`), never reading component state. `pnpm --filter @bakeoff/react-antd test` runs clean end to end.

**Bundle: over budget.** The production build is 278.36 KB gzipped against the 44.91 KB React baseline, a 233.45 KB delta, well past the 180 KB budget. `Table` alone accounts for most of it: an isolated esbuild bundle of `import { Table } from 'antd'` plus React comes to about 247 KB gzipped before anything else is added, because rc-table pulls in rc-virtual-list and its own sorter/filter/pagination machinery whether or not a build uses those features. Swapping `DatePicker` for a native `<input type="date">` cut about 37 KB, and dropping `Result` and `Skeleton` in favor of plain markup cut another 44 KB combined, but none of that was going to close a 100 KB gap opened by `Table` on its own. The honest read: a suite this size does not fit a 180 KB budget once its table component is load-bearing, regardless of how carefully the rest of the screen is built.

**What Ant Design gives for free.** `Table` sets `aria-sort` on the active column header and cycles ascending → descending → cancel on click automatically once a column carries `sorter: true` and a controlled `sortOrder` — confirmed by reading `antd`'s `useSorter.js`, not assumed. `Modal` (via `rc-dialog`) supplies `role="dialog"`, `aria-modal="true"`, `aria-labelledby` tied to the title, a Tab focus trap between two sentinel elements, and by default returns focus to whatever triggered it. `Select` gives the full combobox/listbox keyboard and ARIA wiring for both single- and multi-select, including the closed-state "chips" for a multi-select's current values. None of that is hand built here.

**What had to be hand built.**
- The table's accessible name: `Table` has no `caption` or `aria-label` prop, so one is set via a ref to the rendered `<table>` after mount.
- Row keyboard interactivity: a `<tr>` carries no native interactive semantics, so the Enter/Space-to-open handling and `tabIndex` are added by hand through `onRow`.
- Pagination: `Table`'s built-in pagination has Previous/Next and page numbers, not First/Last, and no "Showing X to Y of Z" copy. The whole pagination bar, including the `aria-live="polite"` count, is hand built with `pagination={false}` on `Table`.
- The subject field's validation error: `Form.Item`'s `validateStatus`/`help` render an error visually but do not wire `aria-describedby` or `aria-invalid` to the input (checked directly against `ItemHolder.js`), so that association is manual.
- Modal focus management: focus is moved to the Subject field explicitly on open rather than left at Ant Design's own sentinel, and `focusTriggerAfterClose` is turned off in favor of an explicit `opener.focus()` call, because the row that opened the dialog is not guaranteed to be the same DOM node by the time the dialog's own close animation would fire.
- Toasts: Ant Design ships `message` and `notification`, but both mount their container lazily on first call and neither caps a stack at a fixed count with oldest-dropped-first, so section 7 is met with a hand-built stack, cap, and live region instead (`src/toasts/`).

Five section 9 requirements needed this kind of custom code; see `bakeoff.json`.

**A real bug this build found in Ant Design's own DOM, not a testing mistake.** `Select`'s open dropdown renders two copies of every option: a visually hidden `role="listbox"`/`role="option"` list for assistive tech, and the actual clickable rows, which carry no ARIA role at all and are identified only by a `title` attribute. `screen.getAllByRole('option')` matches the hidden copy every time; clicking it does nothing, because no click handler is attached there. The adapter matches on `.ant-select-item-option[title="…"]` instead. Confirmed against the rendered DOM directly (`document.querySelectorAll('.ant-select-item-option')`), not inferred.

**Jest timeout.** `axe-core` against this screen's DOM (`Table`'s virtual-list scaffolding plus `Select`'s duplicated option lists) takes on the order of 2 to 4 real minutes per run under jsdom, and a couple of the filter criteria run several sequential `Select` interactions that add up past Jest's 15 second per-test default. `jest.config.js` raises `testTimeout` to 300000 ms. This does not loosen any assertion; it gives already-passing, correctly-behaving interactions the wall-clock time to finish instead of racing Jest's own clock.

## bakeoff.json

`measure` reads the bundle and the ergonomics counts off the code. Two things it cannot see live in `bakeoff.json`: how many section 9 requirements needed custom code (5), and whether the modal, select, and toast came from Ant Design or were hand built (modal and select: Ant Design; toast: hand built). Kept up to date as the build progressed.
