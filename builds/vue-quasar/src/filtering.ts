import type { Priority, Status, Ticket } from '@uilc/fixture';

/** Sections 4 and 5: the filter and sort rules, mirroring `packages/criteria/src/expected.ts` exactly. */

export interface FilterState {
  search: string;
  status: Status[];
  priority: Priority[];
  assignee: string | null;
  createdFrom: string | null;
  createdTo: string | null;
}

export const EMPTY_FILTERS: FilterState = {
  search: '',
  status: [],
  priority: [],
  assignee: null,
  createdFrom: null,
  createdTo: null,
};

const dayOf = (iso: string): string => iso.slice(0, 10);

export function applyFilters(rows: readonly Ticket[], f: FilterState): Ticket[] {
  return rows.filter((t) => {
    if (f.search) {
      const needle = f.search.toLowerCase();
      const hit = t.id.toLowerCase().includes(needle) || t.subject.toLowerCase().includes(needle);
      if (!hit) return false;
    }
    if (f.status.length && !f.status.includes(t.status)) return false;
    if (f.priority.length && !f.priority.includes(t.priority)) return false;
    if (f.assignee !== null) {
      const shown = t.assignee ?? 'Unassigned';
      if (shown !== f.assignee) return false;
    }
    if (f.createdFrom && dayOf(t.createdAt) < f.createdFrom) return false;
    if (f.createdTo && dayOf(t.createdAt) > f.createdTo) return false;
    return true;
  });
}

export function activeFilterCount(f: FilterState): number {
  let count = 0;
  if (f.search !== '') count += 1;
  if (f.status.length > 0) count += 1;
  if (f.priority.length > 0) count += 1;
  if (f.assignee !== null) count += 1;
  if (f.createdFrom !== null || f.createdTo !== null) count += 1;
  return count;
}

export type SortColumn = 'id' | 'subject' | 'created' | 'updated';
export type SortDirection = 'ascending' | 'descending';

export interface SortState {
  column: SortColumn | null;
  direction: SortDirection;
}

const comparators: Record<SortColumn, (a: Ticket, b: Ticket) => number> = {
  id: (a, b) => a.id.localeCompare(b.id),
  subject: (a, b) => a.subject.localeCompare(b.subject),
  created: (a, b) => a.createdAt.localeCompare(b.createdAt),
  updated: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
};

/** `null` column is the default from section 4: `updatedAt` descending. */
export function sortRows(rows: readonly Ticket[], column: SortColumn | null, direction: SortDirection): Ticket[] {
  if (!column) return [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const sorted = [...rows].sort(comparators[column]);
  return direction === 'ascending' ? sorted : sorted.reverse();
}

/** Section 4's three-step cycle: ascending, descending, back to the default. */
export function nextSort(
  current: { column: SortColumn; direction: SortDirection } | null,
  column: SortColumn,
): { column: SortColumn; direction: SortDirection } | null {
  if (!current || current.column !== column) return { column, direction: 'ascending' };
  if (current.direction === 'ascending') return { column, direction: 'descending' };
  return null;
}
