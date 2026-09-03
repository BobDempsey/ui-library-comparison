# react-shadcn

shadcn/ui building the bake-off screen in React.

Read [`spec/screen-spec.md`](../../spec/screen-spec.md) before writing code. Sections 2 to 9 are the requirements. A requirement this library cannot meet is recorded as a failure, not worked around.

```
pnpm --filter @bakeoff/react-shadcn dev
pnpm --filter @bakeoff/react-shadcn test
pnpm --filter @bakeoff/react-shadcn build
pnpm --filter @bakeoff/react-shadcn measure
```

Write only inside this folder and `results/react-shadcn.json`. `packages/criteria` and `packages/harness` belong to the phase one owner.

## Notes for the write-up

**Result: 18/18 criteria pass.** Bundle: 103.52 KB total gzipped, 44.91 KB baseline, 58.61 KB delta, inside the 180 KB budget.

shadcn/ui is not an npm package of components. It is Radix UI primitives plus Tailwind CSS, copied into the repo as source under `src/components/ui/`. That copy-paste model is why it sits in the same "assembly kit" category as Headless UI in section 10: what you get is real, tested primitives for interaction and accessibility, not a finished visual component. Every file under `src/components/ui/` in this build is source I wrote by adapting the standard shadcn/ui registry output for this screen, wired to `@radix-ui/react-*` packages (`dialog`, `alert-dialog`, `select`, `dropdown-menu`, `checkbox`, `toast`, `label`, `slot`), `class-variance-authority`, `clsx`, and `tailwind-merge`.

### What shadcn/ui (Radix underneath) gave for free

- **Dialog**: `role="dialog"`, `aria-modal="true"`, the title's `aria-labelledby`, and a real focus trap. Initial focus lands on the first tabbable element inside the content by default, which happens to be the Subject input, satisfying section 6's "focus moves to the first field on open" without any code from this build.
- **AlertDialog**: the unsaved-changes confirmation (section 6) needed `role="alertdialog"` and a dialog that cannot be dismissed by clicking outside. Radix ships this as a distinct primitive built on Dialog, not a prop toggle, and it worked correctly stacked on top of the record dialog, including marking the backgrounded dialog `aria-hidden` while the confirmation is on top.
- **Select**: keyboard navigation (arrow keys, type-ahead, Home/End), `aria-haspopup`/`aria-expanded` on the trigger, and `aria-selected` on options, for the Assignee filter and the modal's Status/Priority/Assignee fields.
- **DropdownMenu + Checkbox**: `role="menuitemcheckbox"`, `aria-checked`, and roving keyboard focus for the Status/Priority multi-selects (see "What had to be hand built" for why DropdownMenu, not Select).
- **Toast**: a real primitive, unlike Headless UI which ships none at all. Per-toast auto-dismiss timing comes from its `duration` prop (paused on hover/focus, resumed on blur), Escape closes the focused toast, and the visual toast plus a paired visually-hidden announcer both carry live-region semantics.

### What had to be hand built

- **The entire table**: semantics (`caption`, `scope`, `aria-sort`), the sort cycle, client-side pagination, the `Showing X to Y of Z` live region, and the row-as-a-button keyboard handling (Enter/Space open the modal). shadcn/ui's `Table` component is styling over plain `table` elements; it carries none of this behavior, the same gap Headless UI had.
- **Multi-select for Status and Priority.** Radix's `Select` is single-value only, so the two multi-selects in the filter form are assembled from `DropdownMenu` and `Checkbox` instead: the trigger's "N selected" summary, keeping the menu open across multiple picks (`DropdownMenuCheckboxItem`'s `onSelect` closes the menu by default), and a visually hidden mirror of the current selection next to the trigger. The mirror exists because `FilterProbe.values()` is a synchronous read in the adapter interface, and both Select's and DropdownMenu's content unmount while closed.
- **Focus return to the originating row (section 6), and this was the real surprise of this build.** Reading `@radix-ui/react-dialog`'s source turned up that its `DialogContentModal` composes `onCloseAutoFocus` with `context.triggerRef.current?.focus()`, and always calls `preventDefault()` on the way out, which skips the generic "restore whatever was focused before" fallback that the underlying `FocusScope` primitive otherwise provides. `triggerRef` is only populated by a `<Dialog.Trigger>` component. This screen opens the record dialog from a table row via controlled `open` state, the way `pressEnterOnRow` in section 4 requires, not from a `Dialog.Trigger`, so that ref is never set and Radix's own restore is a silent no-op: focus was landing on `document.body` on every close. The fix is a `returnFocusRef`, set by `TicketsTable` on the row that was clicked or Enter/Space-activated, read back in `RecordModal`'s own `onCloseAutoFocus` handler. Criterion 14 is what caught this; it would have shipped broken otherwise.
- **The toast stack's policy.** Radix's Toast gives one toast correct auto-dismiss and dismiss-by-Escape behavior, but has no concept of a capped stack. The array, the cap of 3 with oldest dropped first, and the two exact messages from section 7 are hand-written in `src/toasts/ToastContext.tsx`. The viewport's `aria-live="polite"` is also set explicitly (passed as a literal prop) rather than relied on implicitly, since Radix's own default announcer uses `aria-live="assertive"` unless the `type="background"` prop is set.
- Status/priority badges, UTC-normalized date formatting (`MMM d, yyyy`), the relative-time formatter for `updatedAt`, and all validation, touched-tracking, and the unsaved-changes flow around the modal.

### Accessibility (section 9)

`requirementsNeedingCustomCode: 4` in `bakeoff.json`, out of section 9's six code-relevant bullets (the seventh, a manual NVDA/VoiceOver pass, was not done as part of this automated build):

- Needed custom code: semantic table/badge markup and ARIA, the table's keyboard handling and focus-visible ring, the table's `caption`, and `aria-sort` plus the page-count live region. None of these have a Radix or shadcn/ui equivalent to inherit from, the same gap Headless UI had.
- Free from the DOM's own structure: tab order following filter form, table, then pagination. Nothing in this build reorders tabbing by hand; it falls out of writing the three regions in that order.
- Not a separate code item: zero axe-core violations is an outcome of the other choices, not its own requirement.

This is fewer than react-headless's 6, because Radix genuinely covers more here (Dialog's focus trap and title association, Select and DropdownMenu's keyboard model, Toast's per-item dismiss timing), even though the modal's focus-*return* turned out to need real hand-built code of its own, as described above.

`axeViolationsBeforeFixes: 0` from the first run that exercised criteria 17 and 18, since the table, form, and modal were built against section 9 from the start. The same caveat react-headless recorded applies here: axe-core runs under jsdom (Jest's `testEnvironment`), and jsdom has no real layout or canvas (`HTMLCanvasElement.getContext` is not implemented), so axe's `color-contrast` check throws internally and cannot evaluate real contrast in this environment. "Zero violations" covers everything axe can check under jsdom (roles, names, ARIA correctness, structure), not contrast, and is not a substitute for a manual screen-reader pass or a browser-based axe run.

### Adapter notes

- `ModalProbe.isOpen()` / `confirmIsOpen()` / `holdsFocus()` query with `{ hidden: true }` because Radix marks the record dialog's portal `aria-hidden` while the confirm `AlertDialog` sits on top of it (criterion 13 needs both `isOpen()` and `confirmIsOpen()` to read `true` at once), and Testing Library's role queries exclude `aria-hidden` nodes by default.
- Opening the Status/Priority `DropdownMenu` trigger uses the ArrowDown key, not a click. Reading `@radix-ui/react-menu`'s source showed the trigger's `onClick` handler does nothing at all; opening happens only from `onPointerDown` (mouse) or specific keys in `onKeyDown`, including ArrowDown. A synthetic `fireEvent.pointerDown` with a fully-populated `PointerEvent` init dict did not trigger it reliably in jsdom, while the documented keyboard route did, immediately, so the adapter drives it that way, which is also just a real, spec-relevant way a keyboard user opens the menu.
- `@testing-library/user-event` is used for the Save/Cancel/Discard buttons (a full pointerdown/pointerup/click sequence), but plain `fireEvent.click` is used for Select and DropdownMenu items and the DropdownMenu trigger's ArrowDown open, after finding that wrapping those specific interactions in `user-event` or in an async `act(async () => { ...; await Promise.resolve(); })` made a single interaction take 30 or more real seconds. `fireEvent` already wraps its dispatch in a synchronous `act()` internally (Testing Library configures this); the *async* variant, tried first, made React's post-callback flush wait on a real timer somewhere in the DropdownMenu effect chain (`@radix-ui/react-roving-focus` schedules a bare `setTimeout(fn)` on mount). Switching those two calls to a synchronous dispatch fixed it. Criteria 5, 6, 8, and 9, the ones that drive the Status/Priority multi-select, still run measurably slower than the rest of the suite (30 to 110 seconds each, against under 2 seconds for the others) even with that fix; the suite passes correctly, but the remaining time was not fully traced and is flagged here for whoever picks this build up next.
- `FilterProbe.values()`'s assignee field strips a trailing `▾` character from the Select trigger's `textContent`: the glyph is `SelectPrimitive.Icon`'s rendered content, marked `aria-hidden` for screen readers but still part of the DOM text a plain `.textContent` read picks up.
- No adapter method throws. Every one of the 18 criteria found a real control to drive, though the Status/Priority fields needed assembling from `DropdownMenu` rather than reading an actual multi-select component, since Radix has none.

### Tooling snags (not part of the 18, but worth recording)

- The same `packages/criteria/jest-preset.json` invalid-JSON issue and hoisted-`jest`-binary script mismatch that react-headless hit and documented in `handoff.md`. Worked around the same way: the settings are inlined directly in this build's `jest.config.js`, and `package.json`'s `test` script points at `node_modules/jest/bin/jest.js` rather than the repository root.
- Same missing shared `criteria-results.json` reporter as react-headless; `test/reporter.cjs` here is the same small local Jest reporter, reading test titles for the criterion number without touching what passes or fails.
- shadcn/ui needed real additions beyond the four scripts and the fixture import: Tailwind CSS v4 via `@tailwindcss/vite`, and a `@` path alias (`@/*` to `src/*`) in both `vite.config.ts` and `tsconfig.json`, because shadcn's own components and every application file that uses them import through `@/components/ui/*` and `@/lib/utils`. `scripts/measure.ts`'s `librarySpecifier` map already expects `@/components/ui` for shadcn/ui, which is why the alias, not a relative import, is the real specifier used throughout `src/`.
- `jsdom` needed a few more stand-ins than react-headless's `ResizeObserver` stub: `Element.prototype.hasPointerCapture`/`setPointerCapture`/`releasePointerCapture` and `scrollIntoView`, all used internally by Radix's `Select` and `DropdownMenu`. See `test/setup.ts`.

## bakeoff.json

`measure` reads the bundle and the ergonomics counts off the code. Two things it cannot see live in `bakeoff.json`: how many section 9 requirements needed custom code, and whether the modal, select, and toast came from shadcn/ui or were hand built. Update it as you go rather than at the end.
