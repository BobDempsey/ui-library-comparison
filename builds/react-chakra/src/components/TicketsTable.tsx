import type { KeyboardEvent } from 'react';
import { Box, Button, HStack, Table, Text, VisuallyHidden } from '@chakra-ui/react';
import { PAGE_SIZE, type Ticket } from '@uilc/fixture';
import { formatDate, formatRelative } from '../format.js';
import type { SortColumn, SortDirection } from '../filtering.js';
import { sortRows } from '../filtering.js';
import { Badge } from './Badge.js';
import { TableEmptyState, type TableEmptyKind } from './TableEmptyState.js';

export interface SortState {
  column: SortColumn | null;
  direction: SortDirection;
}

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
  emptyKind: TableEmptyKind | null;
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

  const headerButton = (key: SortColumn, label: string) => (
    <Table.ColumnHeader key={key} aria-sort={ariaSortFor(sort, key) ?? 'none'}>
      <Button variant="plain" size="sm" px="0" fontWeight="semibold" onClick={() => onSort(key)}>
        {label}
        {sort.column === key ? (sort.direction === 'ascending' ? ' ▲' : ' ▼') : ''}
      </Button>
    </Table.ColumnHeader>
  );

  return (
    <Box>
      <Table.ScrollArea>
        <Table.Root>
          <VisuallyHidden asChild>
            <caption>Support tickets</caption>
          </VisuallyHidden>
          <Table.Header>
            <Table.Row>
              {headerButton('id', 'ID')}
              {headerButton('subject', 'Subject')}
              <Table.ColumnHeader>Status</Table.ColumnHeader>
              <Table.ColumnHeader>Priority</Table.ColumnHeader>
              <Table.ColumnHeader>Assignee</Table.ColumnHeader>
              {headerButton('created', 'Created')}
              {headerButton('updated', 'Updated')}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {emptyKind ? (
              <Table.Row>
                <Table.Cell colSpan={7} p="0" border="none">
                  <TableEmptyState
                    kind={emptyKind}
                    message={emptyMessage ?? ''}
                    onAction={onClearFilters}
                  />
                </Table.Cell>
              </Table.Row>
            ) : (
              pageRows.map((ticket) => (
                <Table.Row
                  key={ticket.id}
                  data-testid="ticket-row"
                  tabIndex={0}
                  cursor="pointer"
                  onClick={() => onOpenRow(ticket)}
                  onKeyDown={onRowKeyDown(ticket)}
                >
                  <Table.Cell>{ticket.id}</Table.Cell>
                  <Table.Cell>{ticket.subject}</Table.Cell>
                  <Table.Cell>
                    <Badge kind="status" value={ticket.status} />
                  </Table.Cell>
                  <Table.Cell>
                    <Badge kind="priority" value={ticket.priority} />
                  </Table.Cell>
                  <Table.Cell>{ticket.assignee ?? 'Unassigned'}</Table.Cell>
                  <Table.Cell>{formatDate(ticket.createdAt)}</Table.Cell>
                  <Table.Cell>{formatRelative(ticket.updatedAt)}</Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table.Root>
      </Table.ScrollArea>

      {emptyKind ? null : (
        <HStack mt="3" gap="3" wrap="wrap">
          <Text aria-live="polite">
            Showing {start} to {end} of {total}
          </Text>
          <Button size="sm" variant="outline" onClick={() => onPageChange(1)} disabled={clampedPage === 1}>
            First
          </Button>
          <Button size="sm" variant="outline" onClick={() => onPageChange(clampedPage - 1)} disabled={clampedPage === 1}>
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPageChange(clampedPage + 1)}
            disabled={clampedPage === totalPages}
          >
            Next
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPageChange(totalPages)}
            disabled={clampedPage === totalPages}
          >
            Last
          </Button>
        </HStack>
      )}
    </Box>
  );
}
