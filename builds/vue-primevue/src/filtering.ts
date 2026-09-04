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

const FIELD_OF: Record<SortColumn, keyof Ticket> = {
  id: 'id',
  subject: 'subject',
  created: 'createdAt',
  updated: 'updatedAt',
};

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

/** The PrimeVue `DataTable` field name (`createdAt`/`updatedAt`) behind an adapter `SortColumn`. */
export function fieldOf(column: SortColumn): keyof Ticket {
  return FIELD_OF[column];
}

/** The adapter `SortColumn` behind a PrimeVue `DataTable` field name, or null when it isn't one of the four. */
export function columnOfField(field: string | null): SortColumn | null {
  const entry = (Object.entries(FIELD_OF) as [SortColumn, keyof Ticket][]).find(([, f]) => f === field);
  return entry ? entry[0] : null;
}
