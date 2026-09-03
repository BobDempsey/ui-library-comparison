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

/** rc-dialog and rc-select read `keyCode`, not `key`, so every Escape needs it spelled out. */
const ESCAPE = { key: 'Escape', code: 'Escape', keyCode: 27, which: 27 };

/** Waits a real interval, flushing React state updates raised inside it (the search debounce, the toast timers). */
const settle = (ms: number): Promise<void> =>
  act(() => new Promise<void>((resolve) => setTimeout(() => resolve(), ms)));

/**
 * This build's answer to the adapter interface. Every method drives a real
 * control: it clicks the column header, types into the input, dispatches the
 * mousedown/click/keydown events Ant Design's own components listen for.
 * Multi-select values are read back from the `.ant-select-selection-item` tags
 * Ant Design renders for each chosen value, visible whether the dropdown is
 * open or not, rather than from any state this build tracks itself.
 */
export function createAdapter(): BakeoffAdapter {
  let view: RenderResult | null = null;

  const requireView = (): RenderResult => {
    if (!view) throw new Error('react-antd: call mount() first');
    return view;
  };

  const findEmptyState = (): HTMLElement | null => screen.queryByTestId('table-empty-state');

  const readShowing = (): { start: number; end: number; total: number } | null => {
    const match = document.body.textContent?.match(/Showing (\d+) to (\d+) of (\d+)/);
    if (!match) return null;
    return { start: Number(match[1]), end: Number(match[2]), total: Number(match[3]) };
  };

  const getTicketRows = (): HTMLTableRowElement[] => screen.queryAllByTestId('ticket-row') as HTMLTableRowElement[];

  // Ant Design's `Select` opens on mousedown of its selector, not a plain click.
  const openSelect = (testId: string): HTMLElement => {
    const root = screen.getByTestId(testId);
    const selector = root.querySelector('.ant-select-selector');
    if (!selector) throw new Error(`react-antd: ${testId} is not a Select`);
    fireEvent.mouseDown(selector);
    return root;
  };

  // rc-select renders two copies of each option: a visually hidden `role="option"`
  // list for assistive tech, and the real clickable rows the popup shows, which
  // carry no ARIA role at all and are matched by `title` instead. Clicking the
  // accessibility copy does nothing, so the real one is what gets driven here.
  const findRealOption = (label: string): HTMLElement | undefined =>
    Array.from(document.querySelectorAll<HTMLElement>('.ant-select-item-option')).find(
      (el) => el.getAttribute('title') === label,
    );

  const clickOption = async (label: string): Promise<void> => {
    await waitFor(() => {
      if (!findRealOption(label)) throw new Error(`react-antd: no option "${label}" in the open dropdown`);
    });
    const option = findRealOption(label);
    if (!option) throw new Error(`react-antd: no option "${label}" in the open dropdown`);
    fireEvent.click(option);
  };

  // Selecting an option in `mode="multiple"` keeps the dropdown open (so several
  // options can be picked in a row); this closes it the same way a user would,
  // pressing Escape while the select's own combobox input has focus.
  const closeSelect = (testId: string): void => {
    const root = screen.getByTestId(testId);
    const input = within(root).getByRole('combobox');
    fireEvent.keyDown(input, ESCAPE);
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
        if (!row) throw new Error(`react-antd: no row at index ${index}`);
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
        if (!header) throw new Error(`react-antd: no sortable column header for ${column}`);
        fireEvent.click(header);
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
        const next = () => screen.getByRole('button', { name: 'Next' });
        const prev = () => screen.getByRole('button', { name: 'Previous' });
        let current = (() => {
          const showing = readShowing();
          return showing ? Math.floor((showing.start - 1) / 25) + 1 : 1;
        })();
        while (current < page) {
          fireEvent.click(next());
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
        if (!row) throw new Error(`react-antd: no row at index ${index}`);
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
        const input = screen.getByTestId('filter-search-input') as HTMLInputElement;
        fireEvent.change(input, { target: { value: text } });
        await settle(300);
      },

      setStatus: async (values) => {
        openSelect('filter-status-select');
        for (const value of values) {
          await clickOption(value);
        }
        closeSelect('filter-status-select');
        await Promise.resolve();
      },

      setPriority: async (values) => {
        openSelect('filter-priority-select');
        for (const value of values) {
          await clickOption(value);
        }
        closeSelect('filter-priority-select');
        await Promise.resolve();
      },

      setAssignee: async (name) => {
        const root = screen.getByTestId('filter-assignee-select');
        if (name === null) {
          // `allowClear`'s clear icon only renders once a value is selected.
          const clear = root.querySelector('.ant-select-clear');
          if (clear) fireEvent.mouseDown(clear);
          await Promise.resolve();
          return;
        }
        openSelect('filter-assignee-select');
        await clickOption(name);
      },

      setCreatedRange: async (range) => {
        const from = screen.getByTestId('filter-created-from') as HTMLInputElement;
        const to = screen.getByTestId('filter-created-to') as HTMLInputElement;
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
        const search = (screen.getByTestId('filter-search-input') as HTMLInputElement).value;

        const readMulti = (testId: string): string[] =>
          Array.from(screen.getByTestId(testId).querySelectorAll('.ant-select-selection-item')).map(
            (el) => el.getAttribute('title') ?? el.textContent ?? '',
          );

        const status = readMulti('filter-status-select') as Status[];
        const priority = readMulti('filter-priority-select') as Priority[];

        const assigneeItem = screen
          .getByTestId('filter-assignee-select')
          .querySelector('.ant-select-selection-item');
        const assignee = assigneeItem ? (assigneeItem.getAttribute('title') ?? assigneeItem.textContent) : null;

        const from = (screen.getByTestId('filter-created-from') as HTMLInputElement).value;
        const to = (screen.getByTestId('filter-created-to') as HTMLInputElement).value;
        const created: CreatedRange = { from: from === '' ? null : from, to: to === '' ? null : to };

        return { search, status, priority, assignee, created };
      },
    },

    modal: {
      isOpen: () => screen.queryByTestId('record-dialog') !== null,

      title: () => {
        const dialog = screen.getByTestId('record-dialog');
        return dialog.querySelector('.ant-modal-title')?.textContent ?? '';
      },

      setSubject: async (text) => {
        const input = screen.getByTestId('modal-subject-input') as HTMLInputElement;
        fireEvent.change(input, { target: { value: text } });
        await Promise.resolve();
      },

      setStatus: async (value) => {
        openSelect('modal-status-select');
        await clickOption(value);
      },

      setPriority: async (value) => {
        openSelect('modal-priority-select');
        await clickOption(value);
      },

      save: async () => {
        const dialog = screen.getByTestId('record-dialog');
        fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
        await Promise.resolve();
      },

      cancel: async () => {
        const dialog = screen.getByTestId('record-dialog');
        fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
        await Promise.resolve();
      },

      pressEscape: async () => {
        const target = (document.activeElement as HTMLElement) ?? screen.getByTestId('record-dialog');
        fireEvent.keyDown(target, ESCAPE);
        await Promise.resolve();
      },

      fieldError: (field) => {
        if (field !== 'subject') return null;
        const el = document.getElementById('ticket-subject-error');
        return el ? el.textContent : null;
      },

      confirmIsOpen: () => screen.queryByTestId('confirm-dialog') !== null,

      confirmDiscard: async () => {
        const dialog = screen.getByTestId('confirm-dialog');
        fireEvent.click(within(dialog).getByRole('button', { name: 'Discard changes' }));
        await Promise.resolve();
      },

      holdsFocus: () => {
        const dialog = screen.queryByTestId('record-dialog');
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
        if (!el) throw new Error('react-antd: no empty/error state showing');
        const button = within(el).getByRole('button');
        fireEvent.click(button);
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
