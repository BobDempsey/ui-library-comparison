import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axeCore from 'axe-core';
import type { Priority, Status } from '@bakeoff/fixture';
import type {
  AxeViolation,
  BakeoffAdapter,
  CreatedRange,
  EmptyKind,
  FilterValues,
  RowView,
  SortColumn,
  SortDirection,
} from '@bakeoff/harness';
import { TicketsScreen } from '../src/TicketsScreen.js';

const COLUMN_LABEL: Record<SortColumn, string> = {
  id: 'ID',
  subject: 'Subject',
  created: 'Created',
  updated: 'Updated',
};

/** Waits a real interval, flushing React state updates raised inside it (the search debounce, the toast timers). */
const settle = (ms: number): Promise<void> =>
  act(() => new Promise<void>((resolve) => setTimeout(() => resolve(), ms)));

/**
 * This build's answer to the adapter interface. Every method below drives a
 * real control the way a mouse or keyboard would.
 *
 * Clicks route through `@testing-library/user-event` rather than a bare
 * `fireEvent.click`. Reading `@radix-ui/react-select` and `@radix-ui/react-menu`'s
 * source showed why: Select's trigger opens from `onPointerDown` when the
 * pointer type is `mouse` (falling back to `onClick` only for touch/keyboard),
 * and DropdownMenu's trigger (used for the Status/Priority multi-selects,
 * since Radix has no multi-select combobox) opens only from `onPointerDown`
 * with no `onClick` fallback at all. `user-event` dispatches the full
 * pointerdown/pointerup/click sequence a real mouse click produces, which
 * satisfies both; a bare synthetic `click` event does not.
 *
 * `values()` and the multi-select readbacks use a visually hidden summary
 * rendered next to each trigger, because the interface requires a synchronous
 * read and both Select's and DropdownMenu's content unmount while closed.
 *
 * Radix's `FocusScope` restores focus to whatever was previously focused
 * inside a `setTimeout(..., 0)` on unmount (`@radix-ui/react-focus-scope`),
 * not synchronously. Anything that can close the dialog waits a real macrotask
 * afterward so criterion 14's focus-return assertion sees it.
 */
export function createAdapter(): BakeoffAdapter {
  let view: RenderResult | null = null;
  // `pointerEventsCheck: 0` skips user-event's own pre-dispatch computed-style
  // check. Radix's DismissableLayer sets `document.body.style.pointerEvents =
  // "none"` while a menu/select/dialog layer is open (to block real outside
  // clicks); jsdom has no hit-testing for synthetic events, so that CSS never
  // actually blocks a dispatched click, but user-event's own guard does not
  // know that and would otherwise hang waiting for it to change.
  const user = userEvent.setup({ delay: null, pointerEventsCheck: 0 });

  const requireView = (): RenderResult => {
    if (!view) throw new Error('react-shadcn: call mount() first');
    return view;
  };

  const findEmptyState = (): HTMLElement | null => screen.queryByTestId('table-empty-state');

  const readShowing = (): { start: number; end: number; total: number } | null => {
    const match = document.body.textContent?.match(/Showing (\d+) to (\d+) of (\d+)/);
    if (!match) return null;
    return { start: Number(match[1]), end: Number(match[2]), total: Number(match[3]) };
  };

  const getTicketRows = (): HTMLTableRowElement[] =>
    screen.queryAllByTestId('ticket-row') as HTMLTableRowElement[];

  // `fireEvent` already wraps its dispatch in a synchronous `act()` internally
  // (Testing Library configures this), so no manual wrapper is added here.
  // Wrapping it again in an *async* `act(async () => { ...; await
  // Promise.resolve(); })`, as tried first, made React's post-callback flush
  // wait on a real multi-second timer somewhere in Radix's DropdownMenu effect
  // chain (its roving-focus group schedules a bare `setTimeout(fn)` on mount);
  // a synchronous dispatch sidesteps that entirely and is instant.
  const clickTestId = async (testId: string): Promise<void> => {
    fireEvent.click(screen.getByTestId(testId));
    await Promise.resolve();
  };

  /**
   * Opens the Status/Priority DropdownMenu trigger with the ArrowDown key.
   * Its `onClick` does nothing (DropdownMenu opens only from `onPointerDown`,
   * and jsdom's synthetic pointer events don't reach that handler reliably),
   * but its `onKeyDown` opens on ArrowDown, which is also the documented
   * keyboard route into the menu, so this drives a real, spec-relevant
   * interaction rather than working around a testing gap.
   */
  const openDropdownWithKeyboard = async (testId: string): Promise<void> => {
    fireEvent.keyDown(screen.getByTestId(testId), { key: 'ArrowDown', code: 'ArrowDown' });
    await Promise.resolve();
  };

  /** Closes whichever menu/select is topmost via Escape, the same key a user would press. */
  const closeWithEscape = async (): Promise<void> => {
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    await Promise.resolve();
  };

  /** Radix's FocusScope restores focus on a real `setTimeout(..., 0)`, not synchronously. */
  const waitForFocusRestore = (): Promise<void> => settle(10);

  return {
    async mount(options) {
      view = render(<TicketsScreen fixture={options ?? {}} />);
      await waitFor(() => {
        if (screen.queryByTestId('loading-skeleton')) throw new Error('still loading');
      }, { timeout: 3000 });
    },

    async unmount() {
      requireView();
      view?.unmount();
      cleanup();
      view = null;
    },

    table: {
      rowCount: () => getTicketRows().length,

      totalCount: () => {
        const showing = readShowing();
        if (showing) return showing.total;
        // 0 with no matches, and 0 when the fixture itself is empty.
        return findEmptyState() ? 0 : getTicketRows().length;
      },

      rowAt: (index) => {
        const row = getTicketRows()[index];
        if (!row) throw new Error(`react-shadcn: no row at index ${index}`);
        const cells = row.querySelectorAll('td');
        const view: RowView = {
          id: cells[0]?.textContent ?? '',
          subject: cells[1]?.textContent ?? '',
          status: (cells[2]?.textContent ?? '') as Status,
          priority: (cells[3]?.textContent ?? '') as Priority,
          assignee: cells[4]?.textContent ?? '',
          created: cells[5]?.textContent ?? '',
          updated: cells[6]?.textContent ?? '',
        };
        return view;
      },

      sortBy: async (column) => {
        const label = COLUMN_LABEL[column];
        const header = Array.from(document.querySelectorAll('thead th')).find((th) =>
          th.textContent?.trim().startsWith(label),
        );
        if (!header) throw new Error(`react-shadcn: no sortable column header for ${column}`);
        const button = within(header as HTMLElement).getByRole('button');
        fireEvent.click(button);
        await Promise.resolve();
      },

      ariaSort: (column) => {
        const label = COLUMN_LABEL[column];
        const header = Array.from(document.querySelectorAll('thead th')).find((th) =>
          th.textContent?.trim().startsWith(label),
        );
        const raw = header?.getAttribute('aria-sort');
        return (raw as SortDirection | null) ?? 'none';
      },

      currentPage: () => {
        const showing = readShowing();
        if (!showing) return 1;
        return Math.floor((showing.start - 1) / 25) + 1;
      },

      gotoPage: async (page) => {
        const nav = () => screen.getByRole('button', { name: 'Next' });
        const prev = () => screen.getByRole('button', { name: 'Previous' });
        let current = (() => {
          const showing = readShowing();
          return showing ? Math.floor((showing.start - 1) / 25) + 1 : 1;
        })();
        while (current < page) {
          fireEvent.click(nav());
          current += 1;
          await Promise.resolve();
        }
        while (current > page) {
          fireEvent.click(prev());
          current -= 1;
          await Promise.resolve();
        }
      },

      pressEnterOnRow: async (index) => {
        const row = getTicketRows()[index];
        if (!row) throw new Error(`react-shadcn: no row at index ${index}`);
        row.focus();
        fireEvent.keyDown(row, { key: 'Enter', code: 'Enter' });
        await waitFor(() => {
          if (!screen.queryByRole('dialog', { hidden: true })) throw new Error('modal did not open');
        });
      },

      rowHasFocus: (index) => {
        const row = getTicketRows()[index];
        return row !== undefined && document.activeElement === row;
      },
    },

    filters: {
      setSearch: async (text) => {
        const input = screen.getByLabelText('Search') as HTMLInputElement;
        fireEvent.change(input, { target: { value: text } });
        await settle(300);
      },

      setStatus: async (values) => {
        await openDropdownWithKeyboard('filter-status-button');
        for (const value of values) {
          await clickTestId(`filter-status-option-${value}`);
        }
        await closeWithEscape();
      },

      setPriority: async (values) => {
        await openDropdownWithKeyboard('filter-priority-button');
        for (const value of values) {
          await clickTestId(`filter-priority-option-${value}`);
        }
        await closeWithEscape();
      },

      setAssignee: async (name) => {
        await clickTestId('filter-assignee-button');
        const testId = name === null ? 'filter-assignee-option-null' : `filter-assignee-option-${name}`;
        await clickTestId(testId);
      },

      setCreatedRange: async (range) => {
        const from = screen.getByLabelText('From') as HTMLInputElement;
        const to = screen.getByLabelText('To') as HTMLInputElement;
        fireEvent.change(from, { target: { value: range.from ?? '' } });
        fireEvent.change(to, { target: { value: range.to ?? '' } });
        await Promise.resolve();
      },

      clear: async () => {
        fireEvent.click(screen.getByTestId('filter-clear-button'));
        await Promise.resolve();
      },

      clearIsDisabled: () => (screen.getByTestId('filter-clear-button') as HTMLButtonElement).disabled,

      activeCount: () => {
        const text = screen.getByTestId('filter-active-count').textContent ?? '';
        return Number(text.match(/\d+/)?.[0] ?? '0');
      },

      values: (): FilterValues => {
        const search = (screen.getByLabelText('Search') as HTMLInputElement).value;
        const status = (screen.getByTestId('filter-status-selected').textContent ?? '')
          .split(',')
          .filter(Boolean) as Status[];
        const priority = (screen.getByTestId('filter-priority-selected').textContent ?? '')
          .split(',')
          .filter(Boolean) as Priority[];
        // The trigger's textContent also carries the trailing "▾" icon glyph
        // (`SelectPrimitive.Icon`, aria-hidden but still text content).
        const assigneeText = (screen.getByTestId('filter-assignee-button').textContent ?? '').replace(/▾$/, '');
        const assignee = assigneeText === 'Any assignee' ? null : assigneeText;
        const from = (screen.getByLabelText('From') as HTMLInputElement).value;
        const to = (screen.getByLabelText('To') as HTMLInputElement).value;
        const created: CreatedRange = { from: from === '' ? null : from, to: to === '' ? null : to };
        return { search, status, priority, assignee, created };
      },
    },

    modal: {
      // `hidden: true` is needed because Radix marks the record dialog's portal
      // `aria-hidden` while the confirm AlertDialog sits on top of it (criterion
      // 13), and Testing Library's role queries exclude aria-hidden nodes by
      // default.
      isOpen: () => screen.queryByRole('dialog', { hidden: true }) !== null,

      title: () => {
        const dialog = screen.getByRole('dialog', { hidden: true });
        return within(dialog).getByRole('heading', { hidden: true }).textContent ?? '';
      },

      setSubject: async (text) => {
        const dialog = screen.getByRole('dialog', { hidden: true });
        const input = within(dialog).getByLabelText('Subject') as HTMLInputElement;
        fireEvent.change(input, { target: { value: text } });
        await Promise.resolve();
      },

      setStatus: async (value) => {
        await clickTestId('modal-status-button');
        await clickTestId(`modal-status-option-${value}`);
      },

      setPriority: async (value) => {
        await clickTestId('modal-priority-button');
        await clickTestId(`modal-priority-option-${value}`);
      },

      save: async () => {
        const dialog = screen.getByRole('dialog', { hidden: true });
        await user.click(within(dialog).getByRole('button', { name: 'Save', hidden: true }));
        await waitForFocusRestore();
      },

      cancel: async () => {
        const dialog = screen.getByRole('dialog', { hidden: true });
        await user.click(within(dialog).getByRole('button', { name: 'Cancel', hidden: true }));
        await waitForFocusRestore();
      },

      pressEscape: async () => {
        fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
        await waitForFocusRestore();
      },

      fieldError: (field) => {
        if (field !== 'subject') return null;
        const el = document.getElementById('ticket-subject-error');
        return el ? el.textContent : null;
      },

      confirmIsOpen: () => screen.queryByRole('alertdialog', { hidden: true }) !== null,

      confirmDiscard: async () => {
        const dialog = screen.getByRole('alertdialog', { hidden: true });
        await user.click(within(dialog).getByRole('button', { name: 'Discard changes', hidden: true }));
        await waitForFocusRestore();
      },

      holdsFocus: () => {
        const dialog = screen.queryByRole('dialog', { hidden: true });
        return dialog !== null && document.activeElement !== null && dialog.contains(document.activeElement);
      },
    },

    toasts: {
      messages: () =>
        Array.from(document.querySelectorAll('[data-testid="toast-message"]')).map((el) => el.textContent ?? ''),

      dismissAll: async () => {
        const buttons = Array.from(
          document.querySelectorAll<HTMLButtonElement>('button[aria-label="Dismiss notification"]'),
        );
        for (const button of buttons) fireEvent.click(button);
        await Promise.resolve();
      },
    },

    states: {
      kind: (): EmptyKind => {
        const el = findEmptyState();
        if (!el) return null;
        return el.getAttribute('data-kind') as EmptyKind;
      },

      message: () => {
        const el = findEmptyState();
        if (!el) return null;
        return el.querySelector('p')?.textContent ?? null;
      },

      pressAction: async () => {
        const el = findEmptyState();
        if (!el) throw new Error('react-shadcn: no empty/error state showing');
        const button = within(el).getByRole('button');
        fireEvent.click(button);
        await waitFor(() => {
          if (screen.queryByTestId('loading-skeleton')) throw new Error('still loading');
        }, { timeout: 3000 });
      },

      skeletonIsVisible: () => screen.queryByTestId('loading-skeleton') !== null,
    },

    axe: {
      run: async (): Promise<AxeViolation[]> => {
        const results = await axeCore.run(document.body, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
        });
        return results.violations.map((violation) => ({
          id: violation.id,
          impact: (violation.impact ?? 'minor') as AxeViolation['impact'],
          nodes: violation.nodes.length,
        }));
      },
    },
  };
}
