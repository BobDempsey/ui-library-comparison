import { render, screen, fireEvent, waitFor } from '@testing-library/vue';
import type { RenderResult } from '@testing-library/vue';
import axeCore from 'axe-core';
import { Quasar, QBtn, QInput, QSelect, QDialog, QCard, QCardSection, QCardActions, QBadge, QSkeleton } from 'quasar';
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
import TicketsScreen from '../src/TicketsScreen.vue';

const COLUMN_LABEL: Record<SortColumn, string> = {
  id: 'ID',
  subject: 'Subject',
  created: 'Created',
  updated: 'Updated',
};

/**
 * Quasar's Vite plugin auto-imports and registers whatever component tags a
 * template uses; that transform only runs inside Vite, not inside `vue3-jest`,
 * so this test build registers the same handful of components by hand for the
 * Jest run. Nothing here changes what ships in the production bundle.
 */
const QUASAR_COMPONENTS = {
  QBtn,
  QInput,
  QSelect,
  QDialog,
  QCard,
  QCardSection,
  QCardActions,
  QBadge,
  QSkeleton,
};

/** Real time, not fake timers: Quasar's dialogs move focus only after their show/hide transition settles. */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * This build's answer to the adapter interface. Every method drives a real
 * control: it clicks the header button, types into the input, dispatches the
 * key event Quasar itself listens for. `values()` and the multi-select
 * readbacks use a visually hidden mirror rendered next to each filter field
 * (see `FilterForm.vue`), the same technique `react-headless` used for
 * Headless UI's `Listbox`, because the interface requires a synchronous read
 * and opening a `QSelect` popup to inspect `aria-selected` is asynchronous.
 */
export function createAdapter(): ComparisonAdapter {
  let view: RenderResult | null = null;

  const requireView = (): RenderResult => {
    if (!view) throw new Error('vue-quasar: call mount() first');
    return view;
  };

  const findEmptyState = (): HTMLElement | null =>
    document.body.querySelector('[data-testid="table-empty-state"]');

  const readShowing = (): { start: number; end: number; total: number } | null => {
    const match = document.body.textContent?.match(/Showing (\d+) to (\d+) of (\d+)/);
    if (!match) return null;
    return { start: Number(match[1]), end: Number(match[2]), total: Number(match[3]) };
  };

  const getTicketRows = (): HTMLTableRowElement[] =>
    Array.from(document.body.querySelectorAll('[data-testid="ticket-row"]'));

  const waitForLoadingToClear = async (): Promise<void> => {
    await waitFor(
      () => {
        if (document.body.querySelector('[data-testid="loading-skeleton"]')) throw new Error('still loading');
      },
      { timeout: 3000 },
    );
  };

  // Quasar's QSelect popup teleports its options into a `.q-menu` appended to
  // `document.body`. Only one is opened at a time by this adapter, so a plain
  // body-wide query is unambiguous.
  const openSelect = async (testId: string): Promise<void> => {
    const input = screen.getByTestId(testId);
    await fireEvent.click(input);
    await waitFor(() => {
      if (!document.body.querySelector('.q-menu [role="option"]')) throw new Error('menu did not open');
    });
  };

  const closeSelect = async (_testId: string): Promise<void> => {
    // Quasar's popups close on an outside pointer press; it listens for
    // mousedown rather than the synthetic `click` event testing-library's
    // `fireEvent.click` alone dispatches, so both are fired here the way a
    // real click does.
    await fireEvent.mouseDown(document.body);
    await fireEvent.mouseUp(document.body);
    await waitFor(() => {
      if (document.body.querySelector('.q-menu [role="option"]')) throw new Error('menu still open');
    });
  };

  const clickOption = async (label: string): Promise<void> => {
    const options = Array.from(document.body.querySelectorAll('.q-menu [role="option"]'));
    const option = options.find((el) => el.textContent?.trim() === label);
    if (!option) throw new Error(`vue-quasar: no option "${label}" in the open menu`);
    await fireEvent.click(option);
  };

  const readFieldError = (input: HTMLElement): string | null => {
    const field = input.closest('.q-field');
    const message = field?.querySelector('.q-field__messages');
    const text = message?.textContent?.trim();
    return text ? text : null;
  };

  return {
    async mount(options) {
      view = render(TicketsScreen, {
        props: { fixture: options ?? {} },
        global: { plugins: [[Quasar, { components: QUASAR_COMPONENTS, plugins: {} }]] },
      });
      await waitForLoadingToClear();
    },

    async unmount() {
      requireView();
      view?.unmount();
      view = null;
    },

    table: {
      rowCount: () => getTicketRows().length,

      totalCount: () => {
        const showing = readShowing();
        if (showing) return showing.total;
        return findEmptyState() ? 0 : getTicketRows().length;
      },

      rowAt: (index) => {
        const row = getTicketRows()[index];
        if (!row) throw new Error(`vue-quasar: no row at index ${index}`);
        const cells = row.querySelectorAll('td');
        const result: RowView = {
          id: cells[0]?.textContent ?? '',
          subject: cells[1]?.textContent ?? '',
          status: (cells[2]?.textContent ?? '') as Status,
          priority: (cells[3]?.textContent ?? '') as Priority,
          assignee: cells[4]?.textContent ?? '',
          created: cells[5]?.textContent ?? '',
          updated: cells[6]?.textContent ?? '',
        };
        return result;
      },

      sortBy: async (column) => {
        const label = COLUMN_LABEL[column];
        const header = Array.from(document.body.querySelectorAll('thead th')).find((th) =>
          th.textContent?.trim().startsWith(label),
        );
        if (!header) throw new Error(`vue-quasar: no sortable column header for ${column}`);
        const button = header.querySelector('button');
        if (!button) throw new Error(`vue-quasar: no sort button for ${column}`);
        await fireEvent.click(button);
      },

      ariaSort: (column) => {
        const label = COLUMN_LABEL[column];
        const header = Array.from(document.body.querySelectorAll('thead th')).find((th) =>
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
        const getButton = (name: string) =>
          Array.from(document.body.querySelectorAll('.pagination button')).find(
            (b) => b.textContent?.trim() === name,
          ) as HTMLButtonElement | undefined;

        let current = (() => {
          const showing = readShowing();
          return showing ? Math.floor((showing.start - 1) / 25) + 1 : 1;
        })();
        while (current < page) {
          const next = getButton('Next');
          if (!next || next.disabled) break;
          await fireEvent.click(next);
          current += 1;
        }
        while (current > page) {
          const prev = getButton('Previous');
          if (!prev || prev.disabled) break;
          await fireEvent.click(prev);
          current -= 1;
        }
      },

      pressEnterOnRow: async (index) => {
        const row = getTicketRows()[index];
        if (!row) throw new Error(`vue-quasar: no row at index ${index}`);
        row.focus();
        await fireEvent.keyDown(row, { key: 'Enter', code: 'Enter' });
        await waitFor(
          () => {
            const dialog = document.body.querySelector('[data-testid="record-dialog"]');
            if (!dialog) throw new Error('modal did not open');
            if (!dialog.contains(document.activeElement)) throw new Error('focus not yet inside the dialog');
          },
          { timeout: 3000, interval: 20 },
        );
      },

      rowHasFocus: (index) => {
        const row = getTicketRows()[index];
        return row !== undefined && document.activeElement === row;
      },
    },

    filters: {
      setSearch: async (text) => {
        const input = screen.getByTestId('filter-search') as HTMLInputElement;
        await fireEvent.update(input, text);
        await sleep(300);
      },

      setStatus: async (values) => {
        await openSelect('filter-status');
        for (const value of values) {
          await clickOption(value);
        }
        await closeSelect('filter-status');
      },

      setPriority: async (values) => {
        await openSelect('filter-priority');
        for (const value of values) {
          await clickOption(value);
        }
        await closeSelect('filter-priority');
      },

      setAssignee: async (name) => {
        await openSelect('filter-assignee');
        await clickOption(name ?? 'Any assignee');
      },

      setCreatedRange: async (range) => {
        const from = screen.getByTestId('filter-created-from') as HTMLInputElement;
        const to = screen.getByTestId('filter-created-to') as HTMLInputElement;
        await fireEvent.update(from, range.from ?? '');
        await fireEvent.update(to, range.to ?? '');
      },

      clear: async () => {
        await fireEvent.click(screen.getByTestId('filter-clear-button'));
      },

      clearIsDisabled: () => (screen.getByTestId('filter-clear-button') as HTMLButtonElement).disabled,

      activeCount: () => {
        const text = screen.getByTestId('filter-active-count').textContent ?? '';
        return Number(text.match(/\d+/)?.[0] ?? '0');
      },

      values: (): FilterValues => {
        const search = (screen.getByTestId('filter-search') as HTMLInputElement).value;
        const status = (screen.getByTestId('filter-status-selected').textContent ?? '')
          .split(',')
          .filter(Boolean) as Status[];
        const priority = (screen.getByTestId('filter-priority-selected').textContent ?? '')
          .split(',')
          .filter(Boolean) as Priority[];
        const assigneeInput = screen.getByTestId('filter-assignee') as HTMLInputElement;
        const assigneeText = assigneeInput.closest('.q-field')?.querySelector('.q-select__selected-value')
          ?.textContent;
        const assignee = !assigneeText || assigneeText === 'Any assignee' ? null : assigneeText;
        const from = (screen.getByTestId('filter-created-from') as HTMLInputElement).value;
        const to = (screen.getByTestId('filter-created-to') as HTMLInputElement).value;
        const created: CreatedRange = { from: from === '' ? null : from, to: to === '' ? null : to };
        return { search, status, priority, assignee, created };
      },
    },

    modal: {
      isOpen: () => document.body.querySelector('[data-testid="record-dialog"]') !== null,

      title: () => document.body.querySelector('[data-testid="record-dialog-title"]')?.textContent ?? '',

      setSubject: async (text) => {
        const input = screen.getByTestId('modal-subject') as HTMLInputElement;
        await fireEvent.update(input, text);
      },

      setStatus: async (value) => {
        await openSelect('modal-status');
        await clickOption(value);
      },

      setPriority: async (value) => {
        await openSelect('modal-priority');
        await clickOption(value);
      },

      save: async () => {
        await fireEvent.click(screen.getByTestId('modal-save'));
      },

      cancel: async () => {
        await fireEvent.click(screen.getByTestId('modal-cancel'));
      },

      pressEscape: async () => {
        const dialog = document.body.querySelector('[data-testid="record-dialog"]');
        if (dialog) await fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
      },

      fieldError: (field) => {
        if (field !== 'subject') return null;
        const input = document.body.querySelector('[data-testid="modal-subject"]');
        return input ? readFieldError(input as HTMLElement) : null;
      },

      confirmIsOpen: () => document.body.querySelector('[data-testid="confirm-dialog"]') !== null,

      confirmDiscard: async () => {
        await fireEvent.click(screen.getByTestId('confirm-discard'));
      },

      holdsFocus: () => {
        const dialog = document.body.querySelector('[data-testid="record-dialog"]');
        return dialog !== null && document.activeElement !== null && dialog.contains(document.activeElement);
      },
    },

    toasts: {
      messages: () =>
        Array.from(document.body.querySelectorAll('.toast')).map((el) => el.querySelector('span')?.textContent ?? ''),

      dismissAll: async () => {
        const buttons = Array.from(
          document.body.querySelectorAll<HTMLButtonElement>('.toast button[aria-label="Dismiss notification"]'),
        );
        for (const button of buttons) await fireEvent.click(button);
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
        if (!el) throw new Error('vue-quasar: no empty/error state showing');
        const button = el.querySelector('button');
        if (!button) throw new Error('vue-quasar: no action button in the empty/error state');
        await fireEvent.click(button);
        await waitForLoadingToClear();
      },

      skeletonIsVisible: () => document.body.querySelector('[data-testid="loading-skeleton"]') !== null,
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
