import { cleanup, fireEvent, render, waitFor, type RenderResult } from '@testing-library/vue';
import axeCore from 'axe-core';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
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

/**
 * This build's answer to the adapter interface. Every method drives a real
 * control: it clicks the header button, types into the input, dispatches the
 * key event Vuetify itself listens for. Vuetify's `v-select` renders its menu
 * through a `Teleport` into a container appended to `document.body`, so every
 * query below searches the full `document` rather than a scoped container.
 *
 * `filter-status-selected` / `filter-priority-selected` / `filter-assignee-selected`
 * are visually hidden spans this build adds next to each select, mirroring the
 * current selection as plain text. `values()` needs a synchronous read of what
 * is selected, and Vuetify's own multi-select summary is formatted for display
 * (not for parsing back into an array), the same problem `react-headless`
 * solved with a hidden summary next to its Headless UI listbox.
 */
export function createAdapter(): BakeoffAdapter {
  let view: RenderResult | null = null;
  const vuetify = createVuetify({ components, directives });

  const requireView = (): RenderResult => {
    if (!view) throw new Error('vue-vuetify: call mount() first');
    return view;
  };

  // Vuetify's focus trap moves focus onto the overlay's content wrapper (the
  // `.v-overlay__content` div `[data-testid="record-dialog"]`'s `v-card` sits
  // inside), an ANCESTOR of the card, not a descendant of it. Checking
  // `card.contains(activeElement)` alone misses that: it is only true once
  // focus moves further in, onto something inside the card itself.
  const dialogContainsFocus = (card: Element): boolean => {
    const root = card.closest('.v-overlay__content') ?? card;
    return root.contains(document.activeElement);
  };

  const waitForLoaded = (): Promise<void> =>
    waitFor(
      () => {
        if (document.querySelector('[data-testid="loading-skeleton"]')) throw new Error('still loading');
      },
      { timeout: 3000 },
    );

  const tick = (ms = 0): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

  const getTicketRows = (): HTMLTableRowElement[] =>
    Array.from(document.querySelectorAll('[data-testid="ticket-row"]'));

  const findEmptyState = (): HTMLElement | null => document.querySelector('[data-testid="table-empty-state"]');

  const readShowing = (): { start: number; end: number; total: number } | null => {
    const match = document.body.textContent?.match(/Showing (\d+) to (\d+) of (\d+)/);
    if (!match) return null;
    return { start: Number(match[1]), end: Number(match[2]), total: Number(match[3]) };
  };

  const requireEl = <T extends Element>(selector: string): T => {
    const el = document.querySelector<T>(selector);
    if (!el) throw new Error(`vue-vuetify: no element for ${selector}`);
    return el;
  };

  // Vuetify's `v-select` opens its menu on a pointer sequence dispatched at the
  // field (the div carrying `role="combobox"`), not on a bare `click`; jsdom
  // does not synthesize the intermediate pointer/mouse events a real click
  // produces, so this dispatches them explicitly, the way a browser would.
  const openSelect = async (inputId: string): Promise<void> => {
    const input = document.getElementById(inputId) as HTMLInputElement;
    const field = input.closest('.v-field') as HTMLElement;
    fireEvent.pointerDown(field);
    fireEvent.mouseDown(field);
    fireEvent.mouseUp(field);
    fireEvent.click(field);
    input.focus();
    await tick(20);
  };

  const closeSelect = async (): Promise<void> => {
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape', code: 'Escape' });
    await tick(20);
  };

  return {
    async mount(options) {
      view = render(TicketsScreen, {
        props: { fixture: options ?? {} },
        global: { plugins: [vuetify] },
      });
      await waitForLoaded();
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
        return findEmptyState() ? 0 : getTicketRows().length;
      },

      rowAt: (index) => {
        const row = getTicketRows()[index];
        if (!row) throw new Error(`vue-vuetify: no row at index ${index}`);
        const cells = row.querySelectorAll('td');
        const text = (i: number) => cells[i]?.textContent?.trim() ?? '';
        const view: RowView = {
          id: text(0),
          subject: text(1),
          status: text(2) as Status,
          priority: text(3) as Priority,
          assignee: text(4),
          created: text(5),
          updated: text(6),
        };
        return view;
      },

      sortBy: async (column) => {
        const button = requireEl<HTMLButtonElement>(`[data-testid="sort-${column}"]`);
        fireEvent.click(button);
        await tick(10);
      },

      ariaSort: (column) => {
        const button = document.querySelector(`[data-testid="sort-${column}"]`);
        const th = button?.closest('th');
        const raw = th?.getAttribute('aria-sort');
        return (raw as SortDirection | null) ?? 'none';
      },

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
          fireEvent.click(requireEl('[data-testid="page-next"]'));
          current += 1;
          await tick(10);
        }
        while (current > page) {
          fireEvent.click(requireEl('[data-testid="page-previous"]'));
          current -= 1;
          await tick(10);
        }
      },

      pressEnterOnRow: async (index) => {
        const row = getTicketRows()[index];
        if (!row) throw new Error(`vue-vuetify: no row at index ${index}`);
        row.focus();
        fireEvent.keyDown(row, { key: 'Enter', code: 'Enter' });
        await waitFor(() => {
          const dialog = document.querySelector('[data-testid="record-dialog"]');
          if (!dialog) throw new Error('modal did not open');
          // Vuetify's focus trap moves focus into the dialog asynchronously
          // (after the dialog's own content has mounted), so wait for that too
          // rather than just for the dialog element to exist.
          if (!dialogContainsFocus(dialog)) throw new Error('focus not yet inside the modal');
        });
      },

      rowHasFocus: (index) => {
        const row = getTicketRows()[index];
        return row !== undefined && document.activeElement === row;
      },
    },

    filters: {
      setSearch: async (text) => {
        const input = document.getElementById('search-input') as HTMLInputElement;
        fireEvent.input(input, { target: { value: text } });
        await tick(300);
      },

      setStatus: async (values) => {
        await openSelect('filter-status');
        for (const value of values) {
          fireEvent.click(requireEl(`[data-testid="filter-status-option-${value}"]`));
          await tick(10);
        }
        await closeSelect();
      },

      setPriority: async (values) => {
        await openSelect('filter-priority');
        for (const value of values) {
          fireEvent.click(requireEl(`[data-testid="filter-priority-option-${value}"]`));
          await tick(10);
        }
        await closeSelect();
      },

      setAssignee: async (name) => {
        await openSelect('filter-assignee');
        const testId = name === null ? 'filter-assignee-option-null' : `filter-assignee-option-${name}`;
        fireEvent.click(requireEl(`[data-testid="${testId}"]`));
        await tick(20);
      },

      setCreatedRange: async (range) => {
        const from = document.getElementById('created-from') as HTMLInputElement;
        const to = document.getElementById('created-to') as HTMLInputElement;
        fireEvent.input(from, { target: { value: range.from ?? '' } });
        fireEvent.input(to, { target: { value: range.to ?? '' } });
        await tick(10);
      },

      clear: async () => {
        fireEvent.click(requireEl('[data-testid="filter-clear-button"]'));
        await tick(10);
      },

      clearIsDisabled: () => (requireEl('[data-testid="filter-clear-button"]') as HTMLButtonElement).disabled,

      activeCount: () => {
        const text = document.querySelector('[data-testid="filter-active-count"]')?.textContent ?? '';
        return Number(text.match(/\d+/)?.[0] ?? '0');
      },

      values: (): FilterValues => {
        const search = (document.getElementById('search-input') as HTMLInputElement).value;
        const status = (document.querySelector('[data-testid="filter-status-selected"]')?.textContent ?? '')
          .split(',')
          .filter(Boolean) as Status[];
        const priority = (document.querySelector('[data-testid="filter-priority-selected"]')?.textContent ?? '')
          .split(',')
          .filter(Boolean) as Priority[];
        const assigneeText = document.querySelector('[data-testid="filter-assignee-selected"]')?.textContent ?? '';
        const assignee = assigneeText === '' ? null : assigneeText;
        const from = (document.getElementById('created-from') as HTMLInputElement).value;
        const to = (document.getElementById('created-to') as HTMLInputElement).value;
        const created: CreatedRange = { from: from === '' ? null : from, to: to === '' ? null : to };
        return { search, status, priority, assignee, created };
      },
    },

    modal: {
      isOpen: () => document.querySelector('[data-testid="record-dialog"]') !== null,

      title: () => document.getElementById('record-dialog-title')?.textContent ?? '',

      setSubject: async (text) => {
        const input = document.getElementById('ticket-subject') as HTMLInputElement;
        fireEvent.input(input, { target: { value: text } });
        await tick(10);
      },

      setStatus: async (value) => {
        await openSelect('modal-status');
        fireEvent.click(requireEl(`[data-testid="modal-status-option-${value}"]`));
        await tick(20);
      },

      setPriority: async (value) => {
        await openSelect('modal-priority');
        fireEvent.click(requireEl(`[data-testid="modal-priority-option-${value}"]`));
        await tick(20);
      },

      save: async () => {
        fireEvent.click(requireEl('[data-testid="modal-save"]'));
        await tick(10);
      },

      cancel: async () => {
        fireEvent.click(requireEl('[data-testid="modal-cancel"]'));
        await tick(10);
      },

      pressEscape: async () => {
        const dialog = requireEl('[data-testid="record-dialog"]');
        fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
        await tick(10);
      },

      fieldError: (field) => {
        if (field !== 'subject') return null;
        const el = document.getElementById('ticket-subject-error');
        return el ? el.textContent : null;
      },

      confirmIsOpen: () => document.querySelector('[data-testid="confirm-dialog"]') !== null,

      confirmDiscard: async () => {
        fireEvent.click(requireEl('[data-testid="confirm-discard"]'));
        await tick(10);
      },

      holdsFocus: () => {
        const dialog = document.querySelector('[data-testid="record-dialog"]');
        return dialog !== null && document.activeElement !== null && dialogContainsFocus(dialog);
      },
    },

    toasts: {
      messages: () =>
        Array.from(document.querySelectorAll('.toast-region .v-alert')).map(
          (el) => el.querySelector('.v-alert__content')?.textContent?.trim() ?? '',
        ),

      dismissAll: async () => {
        const buttons = Array.from(
          document.querySelectorAll<HTMLButtonElement>('.toast-region button[aria-label="Dismiss notification"]'),
        );
        for (const button of buttons) fireEvent.click(button);
        await tick(10);
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
        return el?.querySelector('p')?.textContent ?? null;
      },

      pressAction: async () => {
        fireEvent.click(requireEl('[data-testid="empty-state-action"]'));
        // `waitForLoaded` polls immediately, and Vue's re-render from the
        // click is async: without this, the very first (synchronous) poll
        // can run before the skeleton has even mounted, see "no skeleton" as
        // success, and return before the retried 600ms load actually starts.
        await tick(50);
        await waitForLoaded();
      },

      skeletonIsVisible: () => document.querySelector('[data-testid="loading-skeleton"]') !== null,
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
