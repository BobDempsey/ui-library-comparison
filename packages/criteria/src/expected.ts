import { PAGE_SIZE, type Priority, type Status, type Ticket } from '@bakeoff/fixture';
import { TICKETS } from '@bakeoff/fixture/data';

/**
 * A reference implementation of the filtering and sorting in sections 4 and 5.
 * The criteria compare a build against this, not against numbers typed by hand,
 * so regenerating the fixture does not silently invalidate the suite.
 */

export interface Query {
  search?: string;
  status?: Status[];
  priority?: Priority[];
  assignee?: string | null;
  createdFrom?: string | null;
  createdTo?: string | null;
}

const dayOf = (iso: string): string => iso.slice(0, 10);

export function applyFilters(rows: readonly Ticket[], q: Query): Ticket[] {
  return rows.filter((t) => {
    if (q.search) {
      const needle = q.search.toLowerCase();
      const hit = t.id.toLowerCase().includes(needle) || t.subject.toLowerCase().includes(needle);
      if (!hit) return false;
    }
    if (q.status?.length && !q.status.includes(t.status)) return false;
    if (q.priority?.length && !q.priority.includes(t.priority)) return false;
    if (q.assignee !== undefined && q.assignee !== null) {
      const shown = t.assignee ?? 'Unassigned';
      if (shown !== q.assignee) return false;
    }
    // The range is inclusive on both ends, compared by calendar day.
    if (q.createdFrom && dayOf(t.createdAt) < q.createdFrom) return false;
    if (q.createdTo && dayOf(t.createdAt) > q.createdTo) return false;
    return true;
  });
}

export function countMatching(q: Query): number {
  return applyFilters(TICKETS, q).length;
}

/** The default order from section 4: `updatedAt` descending. */
export function defaultOrder(rows: readonly Ticket[] = TICKETS): Ticket[] {
  return [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function sortedSubjects(direction: 'asc' | 'desc'): string[] {
  const sorted = [...TICKETS].sort((a, b) => a.subject.localeCompare(b.subject));
  return (direction === 'asc' ? sorted : sorted.reverse()).map((t) => t.subject);
}

export const firstPageSize = Math.min(PAGE_SIZE, TICKETS.length);

/** Picked from the fixture rather than assumed, so the suite fails loudly if it changes. */
export function pickCombination(): { status: Status; priority: Priority; count: number } {
  for (const status of ['open', 'pending', 'resolved', 'closed'] as const) {
    for (const priority of ['urgent', 'high', 'normal', 'low'] as const) {
      const count = countMatching({ status: [status], priority: [priority] });
      if (count > 0) return { status, priority, count };
    }
  }
  throw new Error('fixture has no status and priority pair with rows');
}

export function pickAssignee(): { name: string; count: number } {
  const named = TICKETS.find((t) => t.assignee !== null);
  if (!named?.assignee) throw new Error('fixture has no assigned rows');
  return { name: named.assignee, count: countMatching({ assignee: named.assignee }) };
}
