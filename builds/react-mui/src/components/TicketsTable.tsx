import type { KeyboardEvent } from 'react';
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material';
import { PAGE_SIZE, type Ticket } from '@bakeoff/fixture';
import { formatDate, formatRelative } from '../format.js';
import type { SortColumn, SortDirection } from '../filtering.js';
import { sortRows } from '../filtering.js';
import { Badge } from './Badge.js';

export interface SortState {
  column: SortColumn | null;
  direction: SortDirection;
}

const ID_COL = { key: 'id', label: 'ID' } as const;
const SUBJECT_COL = { key: 'subject', label: 'Subject' } as const;
const CREATED_COL = { key: 'created', label: 'Created' } as const;
const UPDATED_COL = { key: 'updated', label: 'Updated' } as const;

/** 'ascending' | 'descending' map straight onto MUI's `TableSortLabel` direction prop. */
function muiDirection(direction: SortDirection): 'asc' | 'desc' {
  return direction === 'ascending' ? 'asc' : 'desc';
}

/**
 * Section 4's table. Material UI's `Table` gives real `table`/`thead`/`tbody`
 * semantics for free; `TableSortLabel` plus a manually set `TableCell
 * sortDirection` gives the direction arrow and `aria-sort`; `TablePagination`
 * gives the first/previous/next/last controls and the "Showing x to y of z"
 * label. The sort cycle, the row-as-button keyboard handling, and the empty
 * states are hand built.
 */
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

  const headerCell = (col: { key: SortColumn; label: string }) => (
    <TableCell
      key={col.key}
      sortDirection={sort.column === col.key ? muiDirection(sort.direction) : false}
    >
      <TableSortLabel
        active={sort.column === col.key}
        direction={sort.column === col.key ? muiDirection(sort.direction) : 'asc'}
        onClick={() => onSort(col.key)}
      >
        {col.label}
      </TableSortLabel>
    </TableCell>
  );

  return (
    <div className="table-region">
      <TableContainer>
        <Table data-testid="tickets-table">
          <caption className="visually-hidden">Support tickets</caption>
          <TableHead>
            <TableRow>
              {headerCell(ID_COL)}
              {headerCell(SUBJECT_COL)}
              <TableCell>Status</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Assignee</TableCell>
              {headerCell(CREATED_COL)}
              {headerCell(UPDATED_COL)}
            </TableRow>
          </TableHead>
          <TableBody>
            {emptyKind ? (
              <TableRow>
                <TableCell colSpan={7} data-testid="table-empty-state" data-kind={emptyKind}>
                  <Typography data-testid="empty-state-message">{emptyMessage}</Typography>
                  {emptyKind === 'no-matches' ? (
                    <Button type="button" size="small" onClick={onClearFilters}>
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
                  hover
                  onClick={() => onOpenRow(ticket)}
                  onKeyDown={onRowKeyDown(ticket)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{ticket.id}</TableCell>
                  <TableCell>{ticket.subject}</TableCell>
                  <TableCell>
                    <Badge kind="status" value={ticket.status} />
                  </TableCell>
                  <TableCell>
                    <Badge kind="priority" value={ticket.priority} />
                  </TableCell>
                  <TableCell>{ticket.assignee ?? 'Unassigned'}</TableCell>
                  <TableCell>{formatDate(ticket.createdAt)}</TableCell>
                  <TableCell>{formatRelative(ticket.updatedAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {emptyKind ? null : (
        <Box aria-live="polite" className="pagination">
          <TablePagination
            component="div"
            count={total}
            page={clampedPage - 1}
            rowsPerPage={PAGE_SIZE}
            rowsPerPageOptions={[]}
            showFirstButton
            showLastButton
            onPageChange={(_event, newPage) => onPageChange(newPage + 1)}
            labelDisplayedRows={({ from, to, count }) => `Showing ${from} to ${to} of ${count}`}
          />
        </Box>
      )}
    </div>
  );
}
