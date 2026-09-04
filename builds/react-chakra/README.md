# react-chakra

Chakra UI building the comparison screen in React.

Read [`spec/screen-spec.md`](../../spec/screen-spec.md) before writing code. Sections 2 to 9 are the requirements. A requirement this library cannot meet is recorded as a failure, not worked around.

```
pnpm --filter @uilc/react-chakra dev
pnpm --filter @uilc/react-chakra test
pnpm --filter @uilc/react-chakra build
pnpm --filter @uilc/react-chakra measure
```

Write only inside this folder and `results/react-chakra.json`. `packages/criteria` and `packages/harness` belong to the phase one owner.

## Notes for the write-up

**Criteria: 18/18 pass.** No thrown or skipped criteria. `builds/react-chakra/criteria-results.json` is the reporter's own record of the run.

**Bundle:** 142.63 KB gzipped total (well inside the 180 KB budget), against a 44.91 KB React baseline, a 97.72 KB delta. Chakra UI is built on Ark UI (Zag.js state machines) plus Emotion for styling, and that machinery is the largest part of the delta; it is also what buys the dialog's focus trap and the toast's live region for free (see below). `results/react-chakra.json` has the full numbers.

**What Chakra UI gave for free:**
- **The modal.** `Dialog.Root`/`Content`/`Title` (Ark UI underneath) supplies `role="dialog"` / `role="alertdialog"`, `aria-modal="true"`, the title-to-dialog `aria-labelledby` association, a real focus trap, and focus return to whatever had focus when the dialog opened — all with zero code from this build beyond passing `role="alertdialog"` to the confirm dialog. This matched section 6 almost exactly; the only surprise was that the focus-trap and focus-return effects run on a scheduled animation frame rather than synchronously with the click that opened or closed the dialog, so the adapter has to wait for focus to actually land/return rather than just for the dialog element to appear/disappear (see Gotchas).
- **The toast's mechanics.** `createToaster` + `Toaster` (again Ark UI) renders the live region (`role="region"`, `aria-live="polite"`) before any toast exists, gives each toast `role="status"`, and wires Escape-to-dismiss and a close button, all without custom code.
- **Field-level error display.** `Field.Root`'s `invalid` prop makes `Field.ErrorText` render (or not) automatically, with `aria-live="polite"` on the error text baked in.
- **Keyboard operability and focus rings** on every native control this build uses (`Button`, `Input`, `NativeSelect`) came from Chakra's default theme with no styling written for it.
- **The Skeleton and EmptyState components** map directly onto section 8's loading, no-tickets, no-matches, and error states.

**What had to be hand built:**
- **Toast eviction (section 7's cap of 3, oldest dropped first).** Ark's toast store has a `max` option, but past that limit it queues new toasts rather than evicting the oldest, which doesn't match the spec. `src/toasts.tsx` tracks active toast ids itself and calls `toaster.remove()` on the oldest before creating a new one past the cap.
- **Row keyboard activation.** A table row isn't a natively interactive element, so `tabIndex={0}` and an Enter/Space `onKeyDown` handler on `Table.Row` are ours (section 4).
- **`aria-sort` and the pagination live region.** Chakra's `Table.ColumnHeader` doesn't know about application sort state, and there's no pagination-announcement primitive; both are plain props/attributes this build sets from its own state (section 9).
- **The table caption**, `aria-invalid`/`aria-describedby` wiring between the Subject input and its error text, and all of the filtering/sorting/validation logic (`src/filtering.ts`, `src/useFilters.ts`, `src/useTicketData.ts`) — none of that is Chakra's job, and none of it was expected to be.

**A deliberate choice worth flagging:** Status/Priority/Assignee use Chakra's `NativeSelect` (a styled wrapper over a real `<select>`), not the flagship Ark-based `Select` (a listbox/combobox with a portal, positioner, and `createListCollection`). `NativeSelect` is still a real, shipped Chakra component, not hand rolled — the choice was for reliable native multi-select semantics (`Ctrl`/`Cmd`-click, arrow keys, typeahead) and simpler, less flake-prone testing under jsdom, not because the fancier `Select` couldn't do the job. A build optimizing for visual polish over the plainest reliable control would reasonably pick the Ark `Select` instead.

**Section 9 (accessibility) requirements needing custom code: 4** — table-row keyboard activation, the table caption, `aria-sort`, and the pagination live region. Free from the library: keyboard operability and focus rings on every native control, the dialog's full ARIA/focus-trap/focus-return behavior, and tab order (plain DOM order needed no extra work). Focus-ring contrast was not independently measured — axe-core cannot check color contrast under jsdom (`HTMLCanvasElement.getContext` isn't implemented there; the console error during criteria 17/18 is that, not a real failure) — and no manual NVDA/VoiceOver pass has been done yet, so the "3:1 focus contrast" and "manual screen-reader pass" bullets in section 9 are not independently verified either way, only inherited from Chakra's default theme.

**Gotcha for whoever builds another Ark-UI-based library (or debugs this one):** Ark's dialog and toast machines schedule some of their internal `setState` on `requestAnimationFrame`, not synchronously with the triggering event. The adapter's `pressEnterOnRow` and `cancel`/`confirmDiscard` methods wait for focus to actually land inside or return from the dialog (`waitFor`), not just for the dialog element to appear or disappear — asserting immediately after a click was flaky (criteria 10 and 14 intermittently failed) before that wait was added. Also, `createToaster()` builds a store meant to be a module-level singleton that outlives a single render (the right call for the real app), which means it also outlives a single Jest test's `mount()`/`unmount()` cycle; the adapter's `unmount()` calls `resetToastsForTest()` (a hard `toaster.remove()`, not the animated `dismiss()`) so a toast from one test doesn't leak into the next one's assertions (this caused criteria 11/12 to fail before the reset was added).

## comparison.json

`measure` reads the bundle and the ergonomics counts off the code. Two things it cannot see live in `comparison.json`: how many section 9 requirements needed custom code (4), and whether the modal, select, and toast came from Chakra UI or were hand built (all three came from the library; see the notes above for what "came from the library" meant in each case).
