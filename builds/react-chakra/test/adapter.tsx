import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axeCore from 'axe-core';
import type { Priority, Status } from '@uilc/fixture';
import type {
  AxeViolation,
  ComparisonAdapter,
  CreatedRange,
  EmptyKind,
  FilterValues,
  RowView,
  SortColumn,
  SortDirection,
} from '@uilc/harness';
import { TicketsScreen } from '../src/TicketsScreen.js';
import { resetToastsForTest } from '../src/toasts.js';

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
 * This build's answer to the adapter interface. Every method drives a real
 * control: it clicks the column header button, types into the input,
 * dispatches the key event Chakra's `Dialog` and `Toast` themselves listen
 * for, and drives the `Status`/`Priority`/`Assignee` selects as a real
 * `<select>` (Chakra's `NativeSelect`), the way a mouse or keyboard user
 * would pick options from a native control.
 */
export function createAdapter(): ComparisonAdapter {
  let view: RenderResult | null = null;

  const requireView = (): RenderResult => {
    if (!view) throw new Error('react-chakra: call mount() first');
    return view;
  };

  const findEmptyState = (): HTMLElement | null => screen.queryByTestId('table-empty-state');

  const readShowing = (): { start: number; end: number; total: number } | null => {
    const match = document.body.textContent?.match(/Showing (\d+) to (\d+) of (\d+)/);
    if (!match) return null;
    return { start: Number(match[1]), end: Number(match[2]), total: Number(match[3]) };
  };

  const getTicketRows = (): HTMLTableRowElement[] => screen.queryAllByTestId('ticket-row') as HTMLTableRowElement[];

  const findColumnHeader = (column: SortColumn): HTMLElement => {
    const label = COLUMN_LABEL[column];
    const header = Array.from(document.querySelectorAll('thead th')).find((th) =>
      th.textContent?.trim().startsWith(label),
    );
    if (!header) throw new Error(`react-chakra: no sortable column header for ${column}`);
    return header as HTMLElement;
  };

  const setMultiSelect = async (testId: string, values: string[]): Promise<void> => {
    const select = screen.getByTestId(testId) as HTMLSelectElement;
    if (values.length === 0) {
      await act(async () => {
        Array.from(select.options).forEach((option) => {
          option.selected = false;
        });
        fireEvent.change(select);
      });
      return;
    }
    await userEvent.selectOptions(select, values);
  };

  const setSingleSelect = async (testId: string, value: string): Promise<void> => {
    const select = screen.getByTestId(testId) as HTMLSelectElement;
    await userEvent.selectOptions(select, [value]);
  };

  /**
   * Chakra's dialog restores focus to the triggering element through its
   * focus-trap effect, which lands a render frame after the dialog itself
   * unmounts, not synchronously with the click that closed it. Wait for both:
   * the dialog gone, and focus somewhere other than the document body.
   */
  const awaitDialogClosed = async (): Promise<void> => {
    await waitFor(() => {
      if (screen.queryByTestId('record-dialog')) throw new Error('react-chakra: dialog still open');
    });
    await waitFor(() => {
      if (document.activeElement === null || document.activeElement === document.body) {
        throw new Error('react-chakra: focus not yet restored');
      }
    });
  };

  return {
    async mount(options) {
      view = render(<TicketsScreen fixture={options ?? {}} />);
      await waitFor(
        () => {
          if (screen.queryByTestId('loading-skeleton')) throw new Error('still loading');
        },
        { timeout: 3000 },
      );
    },

    async unmount() {
      requireView();
      view?.unmount();
      cleanup();
      resetToastsForTest();
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
        if (!row) throw new Error(`react-chakra: no row at index ${index}`);
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
        const header = findColumnHeader(column);
        const button = within(header).getByRole('button');
        await act(async () => {
          fireEvent.click(button);
        });
      },

      ariaSort: (column) => {
        const header = findColumnHeader(column);
        const raw = header.getAttribute('aria-sort');
        return (raw as SortDirection | null) ?? 'none';
      },

      currentPage: () => {
        const showing = readShowing();
        if (!showing) return 1;
        return Math.floor((showing.start - 1) / 25) + 1;
      },

      gotoPage: async (page) => {
        const next = () => screen.getByRole('button', { name: 'Next' });
        const prev = () => screen.getByRole('button', { name: 'Previous' });
        let current = (() => {
          const showing = readShowing();
          return showing ? Math.floor((showing.start - 1) / 25) + 1 : 1;
        })();
        while (current < page) {
          await act(async () => {
            fireEvent.click(next());
          });
          current += 1;
        }
        while (current > page) {
          await act(async () => {
            fireEvent.click(prev());
          });
          current -= 1;
        }
      },

      pressEnterOnRow: async (index) => {
        const row = getTicketRows()[index];
        if (!row) throw new Error(`react-chakra: no row at index ${index}`);
        row.focus();
        await act(async () => {
          fireEvent.keyDown(row, { key: 'Enter', code: 'Enter' });
        });
        // The dialog's focus trap claims focus on a subsequent animation
        // frame (Chakra's `Dialog` is built on a focus-trap effect, not a
        // synchronous focus() call), so wait for focus to actually land
        // inside it rather than just for the dialog element to exist.
        await waitFor(() => {
          const dialog = screen.queryByTestId('record-dialog');
          if (!dialog) throw new Error('modal did not open');
          if (!dialog.contains(document.activeElement)) throw new Error('modal has not taken focus yet');
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
        await setMultiSelect('filter-status', values);
      },

      setPriority: async (values) => {
        await setMultiSelect('filter-priority', values);
      },

      setAssignee: async (name) => {
        await setSingleSelect('filter-assignee', name ?? '');
      },

      setCreatedRange: async (range) => {
        const from = screen.getByLabelText('From') as HTMLInputElement;
        const to = screen.getByLabelText('To') as HTMLInputElement;
        await act(async () => {
          fireEvent.change(from, { target: { value: range.from ?? '' } });
          fireEvent.change(to, { target: { value: range.to ?? '' } });
        });
      },

      clear: async () => {
        await act(async () => {
          fireEvent.click(screen.getByTestId('filter-clear-button'));
        });
      },

      clearIsDisabled: () => (screen.getByTestId('filter-clear-button') as HTMLButtonElement).disabled,

      activeCount: () => {
        const text = screen.getByTestId('filter-active-count').textContent ?? '';
        return Number(text.match(/\d+/)?.[0] ?? '0');
      },

      values: (): FilterValues => {
        const search = (screen.getByLabelText('Search') as HTMLInputElement).value;
        const statusSelect = screen.getByTestId('filter-status') as HTMLSelectElement;
        const status = Array.from(statusSelect.selectedOptions, (o) => o.value) as Status[];
        const prioritySelect = screen.getByTestId('filter-priority') as HTMLSelectElement;
        const priority = Array.from(prioritySelect.selectedOptions, (o) => o.value) as Priority[];
        const assigneeSelect = screen.getByTestId('filter-assignee') as HTMLSelectElement;
        const assignee = assigneeSelect.value === '' ? null : assigneeSelect.value;
        const from = (screen.getByLabelText('From') as HTMLInputElement).value;
        const to = (screen.getByLabelText('To') as HTMLInputElement).value;
        const created: CreatedRange = { from: from === '' ? null : from, to: to === '' ? null : to };
        return { search, status, priority, assignee, created };
      },
    },

    modal: {
      // Chakra's dialog content fully unmounts when closed rather than hiding
      // with `aria-hidden`, but while the confirm dialog is open on top the
      // record dialog's content can still be marked `aria-hidden` by the
      // library's dismissable stack, so `{ hidden: true }` and the stable
      // `data-testid` keep these queries working in both states.
      isOpen: () => screen.queryByTestId('record-dialog') !== null,

      title: () => {
        const dialog = screen.getByTestId('record-dialog');
        return within(dialog).getByRole('heading', { hidden: true }).textContent ?? '';
      },

      setSubject: async (text) => {
        const dialog = screen.getByTestId('record-dialog');
        const input = within(dialog).getByLabelText('Subject') as HTMLInputElement;
        await act(async () => {
          fireEvent.change(input, { target: { value: text } });
        });
      },

      setStatus: async (value) => {
        await setSingleSelect('modal-status', value);
      },

      setPriority: async (value) => {
        await setSingleSelect('modal-priority', value);
      },

      save: async () => {
        const dialog = screen.getByTestId('record-dialog');
        await act(async () => {
          fireEvent.click(within(dialog).getByRole('button', { name: 'Save', hidden: true }));
        });
      },

      cancel: async () => {
        const dialog = screen.getByTestId('record-dialog');
        await act(async () => {
          fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel', hidden: true }));
        });
        await awaitDialogClosed();
      },

      pressEscape: async () => {
        await act(async () => {
          fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
        });
      },

      fieldError: (field) => {
        if (field !== 'subject') return null;
        const el = document.getElementById('ticket-subject-error');
        return el ? el.textContent : null;
      },

      confirmIsOpen: () => screen.queryByTestId('confirm-dialog') !== null,

      confirmDiscard: async () => {
        const dialog = screen.getByTestId('confirm-dialog');
        await act(async () => {
          fireEvent.click(within(dialog).getByRole('button', { name: 'Discard changes', hidden: true }));
        });
        await awaitDialogClosed();
      },

      holdsFocus: () => {
        const dialog = screen.queryByTestId('record-dialog');
        return dialog !== null && document.activeElement !== null && dialog.contains(document.activeElement);
      },
    },

    toasts: {
      messages: () =>
        Array.from(document.querySelectorAll('[data-testid="toast"]')).map((el) => el.textContent ?? ''),

      dismissAll: async () => {
        const buttons = Array.from(
          document.querySelectorAll<HTMLButtonElement>('[data-testid="toast"] button[aria-label="Dismiss notification"]'),
        );
        await act(async () => {
          for (const button of buttons) fireEvent.click(button);
        });
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
        if (!el) throw new Error('react-chakra: no empty/error state showing');
        const button = within(el).getByRole('button');
        await act(async () => {
          fireEvent.click(button);
        });
        await waitFor(
          () => {
            if (screen.queryByTestId('loading-skeleton')) throw new Error('still loading');
          },
          { timeout: 3000 },
        );
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
