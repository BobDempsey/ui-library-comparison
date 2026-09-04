import type { KeyboardEvent, MouseEvent, MutableRefObject } from 'react';
import { PAGE_SIZE, type Ticket } from '@uilc/fixture';
import { formatDate, formatRelative } from '../format.js';
import type { SortColumn, SortDirection } from '../filtering.js';
import { sortRows } from '../filtering.js';
import { TicketBadge } from './TicketBadge.js';
import { Button } from '@/components/ui/button.js';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.js';
import { ChevronDownIcon, ChevronUpIcon, ChevronsUpDownIcon } from '@/components/ui/icons.js';

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

/**
 * shadcn/ui's Table is styling only, so section 4's sort cycle, pagination,
 * and the row-as-a-button keyboard handling (Enter/Space open the modal) are
 * all hand built against real `table` markup.
 */
export function TicketsTable({
  filtered,
  page,
  onPageChange,
  sort,
  onSort,
  onOpenRow,
  returnFocusRef,
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
  /** Set to the clicked/activated row before `onOpenRow` fires, so the modal can focus it back on close. */
  returnFocusRef: MutableRefObject<HTMLElement | null>;
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

  const openRow = (ticket: Ticket, row: HTMLElement) => {
    returnFocusRef.current = row;
    onOpenRow(ticket);
  };

  const onRowClick = (ticket: Ticket) => (event: MouseEvent<HTMLTableRowElement>) => {
    openRow(ticket, event.currentTarget);
  };

  const onRowKeyDown = (ticket: Ticket) => (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openRow(ticket, event.currentTarget);
    }
  };

  const sortHeader = (col: (typeof COLUMNS)[number]) => {
    const active = sort.column === col.key;
    const Icon = active ? (sort.direction === 'ascending' ? ChevronUpIcon : ChevronDownIcon) : ChevronsUpDownIcon;
    return (
      <TableHead key={col.key} scope="col" aria-sort={ariaSortFor(sort, col.key) ?? 'none'}>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded font-medium hover:text-foreground focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
          onClick={() => onSort(col.key)}
        >
          {col.label}
          <Icon aria-hidden="true" className={active ? 'text-foreground' : 'text-muted-foreground'} />
        </button>
      </TableHead>
    );
  };

  return (
    <div className="table-region">
      <Table>
        <TableCaption className="visually-hidden">Support tickets</TableCaption>
        <TableHeader>
          <TableRow>
            {sortHeader(COLUMNS[0] as (typeof COLUMNS)[number])}
            {sortHeader(COLUMNS[1] as (typeof COLUMNS)[number])}
            <TableHead scope="col">Status</TableHead>
            <TableHead scope="col">Priority</TableHead>
            <TableHead scope="col">Assignee</TableHead>
            {sortHeader(COLUMNS[2] as (typeof COLUMNS)[number])}
            {sortHeader(COLUMNS[3] as (typeof COLUMNS)[number])}
          </TableRow>
        </TableHeader>
        <TableBody>
          {emptyKind ? (
            <TableRow>
              <TableCell colSpan={7} data-testid="table-empty-state" data-kind={emptyKind} className="py-8 text-center">
                <p className="mb-3">{emptyMessage}</p>
                {emptyKind === 'no-matches' ? (
                  <Button type="button" variant="outline" onClick={onClearFilters}>
                    Clear filters
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          ) : (
            pageRows.map((ticket) => (
              <TableRow
                key={ticket.id}
                data-testid="ticket-row"
                tabIndex={0}
                className="cursor-pointer"
                onClick={onRowClick(ticket)}
                onKeyDown={onRowKeyDown(ticket)}
              >
                <TableCell>{ticket.id}</TableCell>
                <TableCell>{ticket.subject}</TableCell>
                <TableCell>
                  <TicketBadge value={ticket.status} />
                </TableCell>
                <TableCell>
                  <TicketBadge value={ticket.priority} />
                </TableCell>
                <TableCell>{ticket.assignee ?? 'Unassigned'}</TableCell>
                <TableCell>{formatDate(ticket.createdAt)}</TableCell>
                <TableCell>{formatRelative(ticket.updatedAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {emptyKind ? null : (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p aria-live="polite" className="text-sm text-muted-foreground">
            Showing {start} to {end} of {total}
          </p>
          <div className="flex gap-1.5">
            <Button type="button" variant="outline" size="sm" onClick={() => onPageChange(1)} disabled={clampedPage === 1}>
              First
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onPageChange(clampedPage - 1)}
              disabled={clampedPage === 1}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onPageChange(clampedPage + 1)}
              disabled={clampedPage === totalPages}
            >
              Next
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              disabled={clampedPage === totalPages}
            >
              Last
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
