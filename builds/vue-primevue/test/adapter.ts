import { fireEvent, render, screen, waitFor, within, type RenderResult } from '@testing-library/vue';
import axeCore from 'axe-core';
import ConfirmationService from 'primevue/confirmationservice';
import PrimeVue from 'primevue/config';
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
import TicketsScreen from '../src/TicketsScreen.vue';
import { preset } from '../src/theme.js';

const COLUMN_LABEL: Record<SortColumn, string> = {
  id: 'ID',
  subject: 'Subject',
  created: 'Created',
  updated: 'Updated',
};

const settle = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const waitForLoaded = (): Promise<void> =>
  waitFor(
    () => {
      if (screen.queryByTestId('loading-skeleton')) throw new Error('still loading');
    },
    { timeout: 3000 },
  );

/**
 * This build's answer to the adapter interface. Every method below drives a
 * real control: it clicks the column header, types into the input, dispatches
 * the key events PrimeVue itself listens for. The Status/Priority multi-select
 * readbacks use a visually hidden summary rendered next to the trigger,
 * because the interface requires a synchronous read and opening a PrimeVue
 * `MultiSelect` panel to inspect `aria-selected` is asynchronous.
 */
export function createAdapter(): BakeoffAdapter {
  let view: RenderResult | null = null;

  const requireView = (): RenderResult => {
    if (!view) throw new Error('vue-primevue: call mount() first');
    return view;
  };

  const findEmptyState = (): HTMLElement | null => screen.queryByTestId('table-empty-state');

  const readShowing = (): { start: number; end: number; total: number } | null => {
    const match = document.body.textContent?.match(/Showing (\d+) to (\d+) of (\d+)/);
    if (!match) return null;
    return { start: Number(match[1]), end: Number(match[2]), total: Number(match[3]) };
  };

  const getTicketRows = (): HTMLTableRowElement[] =>
    Array.from(document.querySelectorAll('tbody tr[data-p-index]'));

  const headerFor = (column: SortColumn): HTMLElement => {
    const label = COLUMN_LABEL[column];
    const header = Array.from(document.querySelectorAll('thead th')).find((th) =>
      th.textContent?.trim().startsWith(label),
    );
    if (!header) throw new Error(`vue-primevue: no sortable column header for ${column}`);
    return header as HTMLElement;
  };

  /**
   * Opens a PrimeVue `MultiSelect` by its accessible name. Its `role="combobox"`
   * sits on a visually hidden native `<input>` used for typeahead and screen
   * readers; the click handler that actually opens the panel lives on the
   * visible wrapping element, and explicitly ignores clicks whose target is
   * that `<input>` (so a real click on the hidden accessibility node is a
   * no-op, the same as it would be for a sighted mouse user). The click has
   * to land on that wrapper instead.
   */
  const openCombobox = async (name: string): Promise<HTMLElement> => {
    const hiddenInput = screen.getByRole('combobox', { name });
    const trigger = hiddenInput.closest<HTMLElement>('[data-pc-section="root"]') ?? hiddenInput;
    await fireEvent.click(trigger);
    return trigger;
  };

  const closeCombobox = async (trigger: HTMLElement): Promise<void> => {
    await fireEvent.click(trigger);
  };

  return {
    async mount(options) {
      view = render(TicketsScreen, {
        props: { fixture: options ?? {} },
        global: { plugins: [[PrimeVue, { theme: { preset } }], ConfirmationService] },
      });
      await waitForLoaded();
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
        if (!row) throw new Error(`vue-primevue: no row at index ${index}`);
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
        await fireEvent.click(headerFor(column));
      },

      ariaSort: (column) => (headerFor(column).getAttribute('aria-sort') as SortDirection | null) ?? 'none',

      currentPage: () => {
        const showing = readShowing();
        if (!showing) return 1;
        return Math.floor((showing.start - 1) / 25) + 1;
      },

      gotoPage: async (page) => {
        let current = (() => {
          const showing = readShowing();
          return showing ? Math.floor((showing.start - 1) / 25) + 1 : 1;
        })();
        while (current < page) {
          await fireEvent.click(screen.getByRole('button', { name: 'Next Page' }));
          current += 1;
        }
        while (current > page) {
          await fireEvent.click(screen.getByRole('button', { name: 'Previous Page' }));
          current -= 1;
        }
      },

      pressEnterOnRow: async (index) => {
        const row = getTicketRows()[index];
        if (!row) throw new Error(`vue-primevue: no row at index ${index}`);
        row.focus();
        await fireEvent.keyDown(row, { key: 'Enter', code: 'Enter' });
        // Waits for focus, not just the dialog's presence: the native
        // `autofocus` on the subject field (see RecordModal.vue) settles a
        // tick after the dialog element itself is inserted.
        await waitFor(
          () => {
            const dialog = screen.queryByRole('dialog');
            if (!dialog) throw new Error('modal did not open');
            if (!dialog.contains(document.activeElement)) throw new Error('modal has not taken focus yet');
          },
          { timeout: 3000 },
        );
      },

      rowHasFocus: (index) => {
        const row = getTicketRows()[index];
        return row !== undefined && document.activeElement === row;
      },
    },

    filters: {
      setSearch: async (text) => {
        const input = screen.getByLabelText('Search') as HTMLInputElement;
        await fireEvent.input(input, { target: { value: text } });
        await settle(300);
      },

      setStatus: async (values) => {
        const trigger = await openCombobox('Status');
        for (const value of values) {
          await fireEvent.click(screen.getByRole('option', { name: value }));
        }
        await closeCombobox(trigger);
      },

      setPriority: async (values) => {
        const trigger = await openCombobox('Priority');
        for (const value of values) {
          await fireEvent.click(screen.getByRole('option', { name: value }));
        }
        await closeCombobox(trigger);
      },

      setAssignee: async (name) => {
        const trigger = screen.getByRole('combobox', { name: 'Assignee' });
        if (name === null) {
          const clearIcon = trigger.parentElement?.querySelector<HTMLElement>('[data-pc-section="clearicon"]');
          if (clearIcon) await fireEvent.click(clearIcon);
          return;
        }
        await fireEvent.click(trigger);
        // PrimeVue's single `Select` commits an option on `mousedown`, not
        // `click` (its `MultiSelect` sibling uses `click`), so a real click
        // sequence's mousedown has to be dispatched explicitly here.
        await fireEvent.mouseDown(screen.getByRole('option', { name }));
      },

      setCreatedRange: async (range) => {
        const from = screen.getByLabelText('From') as HTMLInputElement;
        const to = screen.getByLabelText('To') as HTMLInputElement;
        await fireEvent.change(from, { target: { value: range.from ?? '' } });
        await fireEvent.change(to, { target: { value: range.to ?? '' } });
      },

      // Scoped by test id, not role/name: the table's no-matches empty state
      // (section 8) renders its own "Clear filters" button, and a filter
      // combination can legitimately match zero rows, putting two buttons of
      // that name in the DOM at once.
      clear: async () => {
        await fireEvent.click(screen.getByTestId('filter-clear-button'));
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
        const assigneeText = screen.getByRole('combobox', { name: 'Assignee' }).textContent ?? '';
        const assignee = assigneeText === 'Any assignee' || assigneeText === '' ? null : assigneeText;
        const from = (screen.getByLabelText('From') as HTMLInputElement).value;
        const to = (screen.getByLabelText('To') as HTMLInputElement).value;
        const created: CreatedRange = { from: from === '' ? null : from, to: to === '' ? null : to };
        return { search, status, priority, assignee, created };
      },
    },

    modal: {
      isOpen: () => screen.queryByRole('dialog') !== null,

      title: () => {
        const dialog = screen.getByRole('dialog');
        const labelledBy = dialog.getAttribute('aria-labelledby');
        const titleEl = labelledBy ? document.getElementById(labelledBy) : null;
        return titleEl?.textContent ?? '';
      },

      setSubject: async (text) => {
        const dialog = screen.getByRole('dialog');
        const input = within(dialog).getByLabelText('Subject') as HTMLInputElement;
        await fireEvent.input(input, { target: { value: text } });
      },

      setStatus: async (value) => {
        const dialog = screen.getByRole('dialog');
        await fireEvent.click(within(dialog).getByRole('combobox', { name: 'Status' }));
        await fireEvent.mouseDown(screen.getByRole('option', { name: value }));
      },

      setPriority: async (value) => {
        const dialog = screen.getByRole('dialog');
        await fireEvent.click(within(dialog).getByRole('combobox', { name: 'Priority' }));
        await fireEvent.mouseDown(screen.getByRole('option', { name: value }));
      },

      save: async () => {
        const dialog = screen.getByRole('dialog');
        await fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
      },

      cancel: async () => {
        const dialog = screen.getByRole('dialog');
        await fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
      },

      pressEscape: async () => {
        await fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
        // A touched form opens PrimeVue's `ConfirmDialog` from the `accept`
        // callback passed to `confirm.require()` (see RecordModal.vue); an
        // untouched form instead closes with nothing new to wait on. There is
        // no single DOM condition to poll for either way, so this gives Vue's
        // reactive update a real tick to reach the DOM.
        await settle(50);
      },

      fieldError: (field) => {
        if (field !== 'subject') return null;
        const el = document.getElementById('ticket-subject-error');
        return el ? el.textContent : null;
      },

      confirmIsOpen: () => screen.queryByRole('alertdialog') !== null,

      confirmDiscard: async () => {
        const dialog = screen.getByRole('alertdialog');
        await fireEvent.click(within(dialog).getByRole('button', { name: 'Discard changes' }));
        await settle(50);
      },

      holdsFocus: () => {
        const dialog = screen.queryByRole('dialog');
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
        if (!el) throw new Error('vue-primevue: no empty/error state showing');
        const button = within(el).getByRole('button');
        await fireEvent.click(button);
        await waitForLoaded();
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
