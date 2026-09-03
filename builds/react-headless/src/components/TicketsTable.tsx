import type { KeyboardEvent } from 'react';
import { PAGE_SIZE, type Ticket } from '@bakeoff/fixture';
import { formatDate, formatRelative } from '../format.js';
import type { SortColumn, SortDirection } from '../filtering.js';
import { sortRows } from '../filtering.js';
import { Badge } from './Badge.js';

export interface SortState {
  column: SortColumn | null;
  direction: SortDirection;
}

const COLUMNS: { key: SortColumn; label: string }[] = [
  { key: 'id', label: 'ID' },
  { key: 'subject', label: 'Subject' },
  { key: 'created', label: 'Created' },
  { key: 'updated', label: 'Updated' },
];

function ariaSortFor(sort: SortState, column: SortColumn): 'ascending' | 'descending' | undefined {
  if (sort.column !== column) return undefined;
  return sort.direction;
}

export function TicketsTable({
  filtered,
  page,
  onPageChange,
  sort,
  onSort,
  onOpenRow,
  emptyKind,
  emptyMessage,
  onClearFilters,
}: {
  filtered: Ticket[];
  page: number;
  onPageChange: (page: number) => void;
  sort: SortState;
  onSort: (column: SortColumn) => void;
  onOpenRow: (ticket: Ticket) => void;
  emptyKind: 'no-tickets' | 'no-matches' | null;
  emptyMessage: string | null;
  onClearFilters: () => void;
}) {
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const clampedPage = Math.min(Math.max(page, 1), totalPages);
  const sorted = sortRows(filtered, sort.column, sort.direction);
  const pageRows = sorted.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);
  const start = total === 0 ? 0 : (clampedPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(clampedPage * PAGE_SIZE, total);

  const onRowKeyDown = (ticket: Ticket) => (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpenRow(ticket);
    }
  };

  return (
    <div className="table-region">
      <table>
        <caption className="visually-hidden">Support tickets</caption>
        <thead>
          <tr>
            {COLUMNS.slice(0, 2).map((col) => (
              <th key={col.key} scope="col" aria-sort={ariaSortFor(sort, col.key) ?? 'none'}>
                <button type="button" onClick={() => onSort(col.key)}>
                  {col.label}
                  {sort.column === col.key ? (sort.direction === 'ascending' ? ' ▲' : ' ▼') : ''}
                </button>
              </th>
            ))}
            <th scope="col">Status</th>
            <th scope="col">Priority</th>
            <th scope="col">Assignee</th>
            {COLUMNS.slice(2).map((col) => (
              <th key={col.key} scope="col" aria-sort={ariaSortFor(sort, col.key) ?? 'none'}>
                <button type="button" onClick={() => onSort(col.key)}>
                  {col.label}
                  {sort.column === col.key ? (sort.direction === 'ascending' ? ' ▲' : ' ▼') : ''}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {emptyKind ? (
            <tr>
              <td colSpan={7} data-testid="table-empty-state" data-kind={emptyKind}>
                <p>{emptyMessage}</p>
                {emptyKind === 'no-matches' ? (
                  <button type="button" onClick={onClearFilters}>
                    Clear filters
                  </button>
                ) : null}
              </td>
            </tr>
          ) : (
            pageRows.map((ticket) => (
              <tr
                key={ticket.id}
                data-testid="ticket-row"
                tabIndex={0}
                onClick={() => onOpenRow(ticket)}
                onKeyDown={onRowKeyDown(ticket)}
              >
                <td>{ticket.id}</td>
                <td>{ticket.subject}</td>
                <td>
                  <Badge kind="status" value={ticket.status} />
                </td>
                <td>
                  <Badge kind="priority" value={ticket.priority} />
                </td>
                <td>{ticket.assignee ?? 'Unassigned'}</td>
                <td>{formatDate(ticket.createdAt)}</td>
                <td>{formatRelative(ticket.updatedAt)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {emptyKind ? null : (
        <div className="pagination">
          <p aria-live="polite">
            Showing {start} to {end} of {total}
          </p>
          <button type="button" onClick={() => onPageChange(1)} disabled={clampedPage === 1}>
            First
          </button>
          <button type="button" onClick={() => onPageChange(clampedPage - 1)} disabled={clampedPage === 1}>
            Previous
          </button>
          <button type="button" onClick={() => onPageChange(clampedPage + 1)} disabled={clampedPage === totalPages}>
            Next
          </button>
          <button type="button" onClick={() => onPageChange(totalPages)} disabled={clampedPage === totalPages}>
            Last
          </button>
        </div>
      )}
    </div>
  );
}
