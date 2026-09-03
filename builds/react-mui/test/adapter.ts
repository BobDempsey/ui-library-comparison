import { createElement } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import axeCore from 'axe-core';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
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

const theme = createTheme();

/** Waits a real interval, flushing React state updates raised inside it (the search debounce, the toast timers). */
const settle = (ms: number): Promise<void> =>
  act(() => new Promise<void>((resolve) => setTimeout(() => resolve(), ms)));

/**
 * This build's answer to the adapter interface. Every method drives a real
 * control: it clicks the header, types into the input, dispatches the key
 * event Material UI's own `Dialog`/`Select` listen for. Multi-select and
 * single-select fields are opened with `mouseDown` on the `combobox` element,
 * which is the interaction Material UI's `Select` binds to (a plain `click`
 * does not reliably open it under jsdom).
 */
export function createAdapter(): BakeoffAdapter {
  let view: RenderResult | null = null;

  const requireView = (): RenderResult => {
    if (!view) throw new Error('react-mui: call mount() first');
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

  // MUI's `Select` opens its menu (a `Popover`, portaled to the body) off a
  // `mousedown` on the combobox element, and closes on Escape or a backdrop
  // click; there is no click-to-toggle. These flush a tick so every update
  // raised by the transition stays wrapped in `act`.
  const openSelect = async (fieldTestId: string): Promise<HTMLElement> => {
    const field = screen.getByTestId(fieldTestId);
    const trigger = within(field).getByRole('combobox');
    await act(async () => {
      fireEvent.mouseDown(trigger);
      await Promise.resolve();
    });
    return trigger;
  };

  const closeOpenSelect = async (): Promise<void> => {
    await act(async () => {
      fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape', code: 'Escape' });
      await Promise.resolve();
    });
  };

  return {
    async mount(options) {
      view = render(
        createElement(ThemeProvider, { theme }, createElement(CssBaseline), createElement(TicketsScreen, { fixture: options ?? {} })),
      );
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
        if (!row) throw new Error(`react-mui: no row at index ${index}`);
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
        if (!header) throw new Error(`react-mui: no sortable column header for ${column}`);
        const button = within(header as HTMLElement).getByRole('button');
        await act(async () => {
          fireEvent.click(button);
          await Promise.resolve();
        });
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
        const nav = () => screen.getByRole('button', { name: /next page/i });
        const prev = () => screen.getByRole('button', { name: /previous page/i });
        // Repeatedly clicking Next/Previous drives the same controls a person
        // would use; there is no direct "go to page N" control in section 4.
        let current = (() => {
          const showing = readShowing();
          return showing ? Math.floor((showing.start - 1) / 25) + 1 : 1;
        })();
        while (current < page) {
          await act(async () => {
            fireEvent.click(nav());
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
        if (!row) throw new Error(`react-mui: no row at index ${index}`);
        row.focus();
        await act(async () => {
          fireEvent.keyDown(row, { key: 'Enter', code: 'Enter' });
        });
        await waitFor(() => {
          if (!screen.queryByTestId('record-dialog')) throw new Error('modal did not open');
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
        await openSelect('filter-status-field');
        for (const value of values) {
          await act(async () => {
            fireEvent.click(screen.getByTestId(`filter-status-option-${value}`));
          });
        }
        await closeOpenSelect();
      },

      setPriority: async (values) => {
        await openSelect('filter-priority-field');
        for (const value of values) {
          await act(async () => {
            fireEvent.click(screen.getByTestId(`filter-priority-option-${value}`));
          });
        }
        await closeOpenSelect();
      },

      setAssignee: async (name) => {
        await openSelect('filter-assignee-field');
        const testId = name === null ? 'filter-assignee-option-null' : `filter-assignee-option-${name}`;
        await act(async () => {
          fireEvent.click(screen.getByTestId(testId));
        });
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
        const statusField = screen.getByTestId('filter-status-field');
        const statusText = within(statusField).getByRole('combobox').textContent ?? '';
        const status = statusText === 'Any status' ? [] : (statusText.split(', ').filter(Boolean) as Status[]);
        const priorityField = screen.getByTestId('filter-priority-field');
        const priorityText = within(priorityField).getByRole('combobox').textContent ?? '';
        const priority = priorityText === 'Any priority' ? [] : (priorityText.split(', ').filter(Boolean) as Priority[]);
        const assigneeField = screen.getByTestId('filter-assignee-field');
        const assigneeText = within(assigneeField).getByRole('combobox').textContent ?? '';
        const assignee = assigneeText === 'Any assignee' ? null : assigneeText;
        const from = (screen.getByLabelText('From') as HTMLInputElement).value;
        const to = (screen.getByLabelText('To') as HTMLInputElement).value;
        const created: CreatedRange = { from: from === '' ? null : from, to: to === '' ? null : to };
        return { search, status, priority, assignee, created };
      },
    },

    modal: {
      // Scoped by testid rather than `role="dialog"` because the record dialog
      // and the confirm dialog can both be open at once (criterion 13), and a
      // role query throws rather than returning a boolean when more than one
      // element matches.
      isOpen: () => screen.queryByTestId('record-dialog') !== null,

      title: () => {
        const dialog = screen.getByTestId('record-dialog');
        return within(dialog).getByRole('heading').textContent ?? '';
      },

      setSubject: async (text) => {
        const dialog = screen.getByTestId('record-dialog');
        const input = within(dialog).getByLabelText('Subject') as HTMLInputElement;
        await act(async () => {
          fireEvent.change(input, { target: { value: text } });
        });
      },

      setStatus: async (value) => {
        await openSelect('modal-status-field');
        await act(async () => {
          fireEvent.click(screen.getByTestId(`modal-status-option-${value}`));
        });
      },

      setPriority: async (value) => {
        await openSelect('modal-priority-field');
        await act(async () => {
          fireEvent.click(screen.getByTestId(`modal-priority-option-${value}`));
        });
      },

      save: async () => {
        const dialog = screen.getByTestId('record-dialog');
        await act(async () => {
          fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
        });
      },

      cancel: async () => {
        const dialog = screen.getByTestId('record-dialog');
        await act(async () => {
          fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
        });
      },

      pressEscape: async () => {
        const dialog = screen.getByTestId('record-dialog');
        await act(async () => {
          fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
        });
      },

      fieldError: (field) => {
        if (field !== 'subject') return null;
        const el = document.getElementById('ticket-subject-helper-text');
        return el ? el.textContent : null;
      },

      confirmIsOpen: () => screen.queryByTestId('confirm-dialog') !== null,

      confirmDiscard: async () => {
        const dialog = screen.getByTestId('confirm-dialog');
        await act(async () => {
          fireEvent.click(within(dialog).getByRole('button', { name: 'Discard changes' }));
        });
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
          document.querySelectorAll<HTMLButtonElement>('[data-testid="toast"] button'),
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
        return el.querySelector('[data-testid="empty-state-message"]')?.textContent ?? null;
      },

      pressAction: async () => {
        const el = findEmptyState();
        if (!el) throw new Error('react-mui: no empty/error state showing');
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
