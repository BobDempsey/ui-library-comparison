import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
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
 * real control: it clicks the header button, types into the input, dispatches
 * the key event Headless UI itself listens for. `values()` and the multi-select
 * readbacks use a visually hidden summary the component renders next to the
 * trigger button, because the interface requires a synchronous read and opening
 * a Headless UI popup to inspect `aria-selected` is asynchronous.
 */
export function createAdapter(): BakeoffAdapter {
  let view: RenderResult | null = null;

  const requireView = (): RenderResult => {
    if (!view) throw new Error('react-headless: call mount() first');
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

  // Headless UI schedules a bit of its close/positioning bookkeeping outside the
  // synchronous click handler, so these flush a tick after clicking to keep every
  // update wrapped in `act`.
  const openListbox = async (buttonTestId: string): Promise<void> => {
    await act(async () => {
      fireEvent.click(screen.getByTestId(buttonTestId));
      await Promise.resolve();
    });
  };

  const closeListbox = async (buttonTestId: string): Promise<void> => {
    await act(async () => {
      fireEvent.click(screen.getByTestId(buttonTestId));
      await Promise.resolve();
    });
  };

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
        if (!row) throw new Error(`react-headless: no row at index ${index}`);
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
        if (!header) throw new Error(`react-headless: no sortable column header for ${column}`);
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
        // Repeatedly clicking First/Next/Previous/Last drives the same controls a
        // person would use; there is no direct "go to page N" control in section 4.
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
        if (!row) throw new Error(`react-headless: no row at index ${index}`);
        row.focus();
        fireEvent.keyDown(row, { key: 'Enter', code: 'Enter' });
        await waitFor(() => {
          if (!screen.queryByRole('dialog')) throw new Error('modal did not open');
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
        await openListbox('filter-status-button');
        for (const value of values) {
          await act(async () => {
            fireEvent.click(screen.getByTestId(`filter-status-option-${value}`));
          });
        }
        await closeListbox('filter-status-button');
      },

      setPriority: async (values) => {
        await openListbox('filter-priority-button');
        for (const value of values) {
          await act(async () => {
            fireEvent.click(screen.getByTestId(`filter-priority-option-${value}`));
          });
        }
        await closeListbox('filter-priority-button');
      },

      setAssignee: async (name) => {
        await openListbox('filter-assignee-button');
        const testId = name === null ? 'filter-assignee-option-null' : `filter-assignee-option-${name}`;
        await act(async () => {
          fireEvent.click(screen.getByTestId(testId));
        });
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
        const assigneeText = screen.getByTestId('filter-assignee-button').textContent ?? '';
        const assignee = assigneeText === 'Any assignee' ? null : assigneeText;
        const from = (screen.getByLabelText('From') as HTMLInputElement).value;
        const to = (screen.getByLabelText('To') as HTMLInputElement).value;
        const created: CreatedRange = { from: from === '' ? null : from, to: to === '' ? null : to };
        return { search, status, priority, assignee, created };
      },
    },

    modal: {
      // `hidden: true` is needed because Headless UI marks the record dialog
      // `aria-hidden` while the confirm dialog sits on top of it (criterion 13),
      // and Testing Library's role queries exclude aria-hidden nodes by default.
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
        await openListbox('modal-status-button');
        await act(async () => {
          fireEvent.click(screen.getByTestId(`modal-status-option-${value}`));
        });
      },

      setPriority: async (value) => {
        await openListbox('modal-priority-button');
        await act(async () => {
          fireEvent.click(screen.getByTestId(`modal-priority-option-${value}`));
        });
      },

      save: async () => {
        const dialog = screen.getByRole('dialog', { hidden: true });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Save', hidden: true }));
        await Promise.resolve();
      },

      cancel: async () => {
        const dialog = screen.getByRole('dialog', { hidden: true });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel', hidden: true }));
        await Promise.resolve();
      },

      pressEscape: async () => {
        fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
        await Promise.resolve();
      },

      fieldError: (field) => {
        if (field !== 'subject') return null;
        const el = document.getElementById('ticket-subject-error');
        return el ? el.textContent : null;
      },

      confirmIsOpen: () => screen.queryByRole('alertdialog', { hidden: true }) !== null,

      confirmDiscard: async () => {
        const dialog = screen.getByRole('alertdialog', { hidden: true });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Discard changes', hidden: true }));
        await Promise.resolve();
      },

      holdsFocus: () => {
        const dialog = screen.queryByRole('dialog', { hidden: true });
        return dialog !== null && document.activeElement !== null && dialog.contains(document.activeElement);
      },
    },

    toasts: {
      messages: () =>
        Array.from(document.querySelectorAll('.toast')).map((el) => el.querySelector('span')?.textContent ?? ''),

      dismissAll: async () => {
        const buttons = Array.from(
          document.querySelectorAll<HTMLButtonElement>('.toast button[aria-label="Dismiss notification"]'),
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
        if (!el) throw new Error('react-headless: no empty/error state showing');
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
