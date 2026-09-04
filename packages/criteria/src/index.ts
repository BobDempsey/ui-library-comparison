import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { PAGE_SIZE } from '@uilc/fixture';
import { TICKETS } from '@uilc/fixture/data';
import type { ComparisonAdapter } from '@uilc/harness';
import {
  applyFilters,
  countMatching,
  pickAssignee,
  pickCombination,
  sortedSubjects,
} from './expected.js';

export * from './expected.js';

export type AdapterFactory = () => ComparisonAdapter | Promise<ComparisonAdapter>;

/**
 * The 18 acceptance criteria from section 11, written once and run against every
 * build. Test names carry their number so a failure reads the same in all eight
 * result files. Nobody edits this file from inside a build. A criterion that
 * looks wrong goes back to the phase one owner as a question, because a locally
 * patched test ends the comparison without anyone noticing.
 */
export function runCriteria(buildName: string, createAdapter: AdapterFactory): void {
  describe(`${buildName}: acceptance criteria`, () => {
    let ui: ComparisonAdapter;

    beforeEach(async () => {
      ui = await createAdapter();
      await ui.mount();
    });

    afterEach(async () => {
      await ui.unmount();
    });

    test('1. renders 25 rows on first paint and reports 240 total', () => {
      expect(ui.table.rowCount()).toBe(PAGE_SIZE);
      expect(ui.table.totalCount()).toBe(TICKETS.length);
    });

    test('2. sorting by Subject ascending puts A before Z, clicking twice reverses it', async () => {
      await ui.table.sortBy('subject');
      expect(ui.table.rowAt(0).subject).toBe(sortedSubjects('asc')[0]);

      await ui.table.sortBy('subject');
      expect(ui.table.rowAt(0).subject).toBe(sortedSubjects('desc')[0]);
    });

    test('3. sorting sets aria-sort on the active column and clears the others', async () => {
      await ui.table.sortBy('subject');
      expect(ui.table.ariaSort('subject')).toBe('ascending');
      for (const other of ['id', 'created', 'updated'] as const) {
        expect(ui.table.ariaSort(other)).toBe('none');
      }
    });

    test('4. searching TCK-0007 narrows to one row', async () => {
      await ui.filters.setSearch('TCK-0007');
      expect(ui.table.totalCount()).toBe(1);
      expect(ui.table.rowAt(0).id).toBe('TCK-0007');
    });

    test('5. selecting open and pending shows only those two statuses', async () => {
      await ui.filters.setStatus(['open', 'pending']);
      expect(ui.table.totalCount()).toBe(countMatching({ status: ['open', 'pending'] }));
      for (let i = 0; i < ui.table.rowCount(); i += 1) {
        expect(['open', 'pending']).toContain(ui.table.rowAt(i).status);
      }
    });

    test('6. a status and a priority together show only rows matching both', async () => {
      const { status, priority, count } = pickCombination();
      await ui.filters.setStatus([status]);
      await ui.filters.setPriority([priority]);

      expect(ui.table.totalCount()).toBe(count);
      for (let i = 0; i < ui.table.rowCount(); i += 1) {
        const row = ui.table.rowAt(i);
        expect(row.status).toBe(status);
        expect(row.priority).toBe(priority);
      }
    });

    test('7. a Created range excludes outside rows and includes the boundary dates', async () => {
      const from = '2026-03-01';
      const to = '2026-03-31';
      await ui.filters.setCreatedRange({ from, to });

      const expected = applyFilters(TICKETS, { createdFrom: from, createdTo: to });
      expect(ui.table.totalCount()).toBe(expected.length);
      // TCK-0100 sits on the opening date and TCK-0101 on the closing one.
      expect(expected.map((t) => t.id)).toEqual(expect.arrayContaining(['TCK-0100', 'TCK-0101']));

      await ui.filters.setSearch('TCK-0100');
      expect(ui.table.totalCount()).toBe(1);
      await ui.filters.setSearch('TCK-0101');
      expect(ui.table.totalCount()).toBe(1);
    });

    test('8. Clear filters restores 240 rows, resets all five fields, and disables itself', async () => {
      const { name } = pickAssignee();
      await ui.filters.setSearch('billing');
      await ui.filters.setStatus(['open']);
      await ui.filters.setPriority(['high']);
      await ui.filters.setAssignee(name);
      await ui.filters.setCreatedRange({ from: '2026-02-01', to: '2026-04-01' });
      expect(ui.filters.activeCount()).toBe(5);
      expect(ui.filters.clearIsDisabled()).toBe(false);

      await ui.filters.clear();

      expect(ui.table.totalCount()).toBe(TICKETS.length);
      expect(ui.filters.values()).toEqual({
        search: '',
        status: [],
        priority: [],
        assignee: null,
        created: { from: null, to: null },
      });
      expect(ui.filters.activeCount()).toBe(0);
      expect(ui.filters.clearIsDisabled()).toBe(true);
    });

    test('9. changing a filter while on page 4 returns to page 1', async () => {
      await ui.table.gotoPage(4);
      expect(ui.table.currentPage()).toBe(4);

      await ui.filters.setStatus(['open']);
      expect(ui.table.currentPage()).toBe(1);
    });

    test('10. Enter on a focused row opens the modal for that row', async () => {
      const row = ui.table.rowAt(2);
      await ui.table.pressEnterOnRow(2);

      expect(ui.modal.isOpen()).toBe(true);
      expect(ui.modal.title()).toContain(row.id);
      expect(ui.modal.title()).toContain(row.subject);
      expect(ui.modal.holdsFocus()).toBe(true);
    });

    test('11. saving an empty subject blocks the save and shows the field error', async () => {
      await ui.table.pressEnterOnRow(0);
      await ui.modal.setSubject('');
      await ui.modal.save();

      expect(ui.modal.isOpen()).toBe(true);
      expect(ui.modal.fieldError('subject')).toBeTruthy();
      expect(ui.toasts.messages()).toHaveLength(0);
    });

    test('12. saving a valid change updates the row and fires one success toast', async () => {
      const row = ui.table.rowAt(0);
      await ui.table.pressEnterOnRow(0);
      await ui.modal.setSubject('Edited by criterion 12');
      await ui.modal.save();

      expect(ui.modal.isOpen()).toBe(false);
      expect(ui.table.rowAt(0).subject).toBe('Edited by criterion 12');
      expect(ui.toasts.messages()).toEqual([`Ticket ${row.id} updated`]);
    });

    test('13. Escape on a touched form asks for confirmation, on an untouched form closes', async () => {
      await ui.table.pressEnterOnRow(1);
      await ui.modal.setSubject('Touched');
      await ui.modal.pressEscape();
      expect(ui.modal.confirmIsOpen()).toBe(true);
      expect(ui.modal.isOpen()).toBe(true);
      await ui.modal.confirmDiscard();
      expect(ui.modal.isOpen()).toBe(false);

      await ui.table.pressEnterOnRow(1);
      await ui.modal.pressEscape();
      expect(ui.modal.confirmIsOpen()).toBe(false);
      expect(ui.modal.isOpen()).toBe(false);
    });

    test('14. focus returns to the originating row after the modal closes', async () => {
      await ui.table.pressEnterOnRow(3);
      await ui.modal.cancel();

      expect(ui.modal.isOpen()).toBe(false);
      expect(ui.table.rowHasFocus(3)).toBe(true);
    });


    test('15. filtering to no matches shows the empty state with a working Clear action', async () => {
      await ui.filters.setSearch('zzzz-no-such-ticket');

      expect(ui.table.rowCount()).toBe(0);
      expect(ui.states.kind()).toBe('no-matches');
      expect(ui.states.message()).toBe('No tickets match these filters');

      await ui.states.pressAction();
      expect(ui.table.totalCount()).toBe(TICKETS.length);
      expect(ui.filters.values().search).toBe('');
    });

    test('16. the forced error state shows the message and a Retry that reloads the fixture', async () => {
      await ui.unmount();
      ui = await createAdapter();
      await ui.mount({ fail: true });

      expect(ui.states.kind()).toBe('error');
      expect(ui.states.message()).toBe('Could not load tickets');

      await ui.states.pressAction();
      expect(ui.states.kind()).toBeNull();
      expect(ui.table.totalCount()).toBe(TICKETS.length);
    });

    test('17. axe reports zero serious or critical violations on the loaded table', async () => {
      const blocking = (await ui.axe.run()).filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      expect(blocking).toEqual([]);
    });

    test('18. axe reports zero serious or critical violations with the modal open', async () => {
      await ui.table.pressEnterOnRow(0);
      expect(ui.modal.isOpen()).toBe(true);

      const blocking = (await ui.axe.run()).filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      expect(blocking).toEqual([]);
    });
  });
}
