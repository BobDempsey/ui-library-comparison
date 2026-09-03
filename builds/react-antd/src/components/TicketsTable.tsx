import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Button, Table } from 'antd';
import type { TableProps } from 'antd';
import type { ColumnsType, TableRef } from 'antd/es/table';
import { PAGE_SIZE, type Ticket } from '@bakeoff/fixture';
import { formatDate, formatRelative } from '../format.js';
import type { SortColumn, SortDirection } from '../filtering.js';
import { sortRows } from '../filtering.js';
import { Badge } from './Badge.js';

export interface SortState {
  column: SortColumn | null;
  direction: SortDirection;
}

type AntSortOrder = 'ascend' | 'descend';

const toAntOrder = (direction: SortDirection): AntSortOrder => (direction === 'ascending' ? 'ascend' : 'descend');
const fromAntOrder = (order: AntSortOrder): SortDirection => (order === 'ascend' ? 'ascending' : 'descending');

/**
 * The table from section 4. Ant Design's `Table` gives the real `<table>`
 * markup, the click/Enter-to-sort header wiring, the `aria-sort` attribute on
 * the active column, and the ascending/descending/cancel three-step cycle, all
 * for free once a column carries `sorter: true` and a controlled `sortOrder`.
 * Actual row ordering and pagination are computed by hand (`sortRows` plus a
 * slice) so a fixed 25-row page and the default `updatedAt` order stay exactly
 * what section 4 specifies; passing that pre-sliced page as `dataSource` with
 * a boolean `sorter` keeps Ant Design from re-sorting what is already ordered.
 * The `<table>`'s accessible name and the row click/Enter/Space handling are
 * hand built; Ant Design's `Table` has no `caption` or `aria-label` prop and no
 * built-in First/Last pagination control, only Previous/Next and page numbers.
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
  onSort: (state: SortState) => void;
  onOpenRow: (ticket: Ticket, rowElement: HTMLElement | null) => void;
  emptyKind: 'no-tickets' | 'no-matches' | null;
  emptyMessage: string | null;
  onClearFilters: () => void;
}) {
  const tableRef = useRef<TableRef>(null);

  // Ant Design's `Table` has no `caption` or `aria-label` prop, so the table's
  // accessible name (section 9: "a `caption` or an `aria-label`") is set by hand.
  useEffect(() => {
    const root = tableRef.current?.nativeElement;
    const tableEl = root?.querySelector('table');
    if (tableEl && !tableEl.hasAttribute('aria-label')) {
      tableEl.setAttribute('aria-label', 'Support tickets');
    }
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const clampedPage = Math.min(Math.max(page, 1), totalPages);
  const sorted = sortRows(filtered, sort.column, sort.direction);
  const pageRows = emptyKind ? [] : sorted.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);
  const start = total === 0 ? 0 : (clampedPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(clampedPage * PAGE_SIZE, total);

  // `exactOptionalPropertyTypes` treats an optional prop set to `undefined` as
  // an error, so the inactive columns omit `sortOrder` entirely rather than
  // set it to `undefined`.
  const sortableColumn = (key: SortColumn, title: string, dataIndex: keyof Ticket) => {
    const order = sort.column === key ? toAntOrder(sort.direction) : undefined;
    return {
      key,
      title,
      dataIndex,
      sorter: true,
      ...(order ? { sortOrder: order } : {}),
    };
  };

  const columns: ColumnsType<Ticket> = [
    sortableColumn('id', 'ID', 'id'),
    sortableColumn('subject', 'Subject', 'subject'),
    {
      key: 'status',
      title: 'Status',
      dataIndex: 'status',
      render: (value: Ticket['status']) => <Badge kind="status" value={value} />,
    },
    {
      key: 'priority',
      title: 'Priority',
      dataIndex: 'priority',
      render: (value: Ticket['priority']) => <Badge kind="priority" value={value} />,
    },
    {
      key: 'assignee',
      title: 'Assignee',
      dataIndex: 'assignee',
      render: (value: Ticket['assignee']) => value ?? 'Unassigned',
    },
    {
      ...sortableColumn('created', 'Created', 'createdAt'),
      render: (value: string) => formatDate(value),
    },
    {
      ...sortableColumn('updated', 'Updated', 'updatedAt'),
      render: (value: string) => formatRelative(value),
    },
  ];

  const onChange: TableProps<Ticket>['onChange'] = (_pagination, _filters, sorter) => {
    const info = Array.isArray(sorter) ? sorter[0] : sorter;
    const order = info?.order;
    if (order !== 'ascend' && order !== 'descend') {
      onSort({ column: null, direction: 'ascending' });
      return;
    }
    onSort({ column: info?.columnKey as SortColumn, direction: fromAntOrder(order) });
  };

  const onRowKeyDown = (ticket: Ticket) => (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpenRow(ticket, event.currentTarget);
    }
  };

  return (
    <div className="table-region">
      <Table<Ticket>
        ref={tableRef}
        columns={columns}
        dataSource={pageRows}
        rowKey="id"
        pagination={false}
        showSorterTooltip={false}
        onChange={onChange}
        locale={{
          emptyText: emptyKind ? (
            <div data-testid="table-empty-state" data-kind={emptyKind}>
              <p>{emptyMessage}</p>
              {emptyKind === 'no-matches' ? (
                <Button type="link" onClick={onClearFilters}>
                  Clear filters
                </Button>
              ) : null}
            </div>
          ) : null,
        }}
        onRow={(record) => ({
          'data-testid': 'ticket-row',
          tabIndex: 0,
          onClick: (event) => onOpenRow(record, event.currentTarget),
          onKeyDown: onRowKeyDown(record),
        })}
      />

      {emptyKind ? null : (
        <div className="pagination">
          <p aria-live="polite">
            Showing {start} to {end} of {total}
          </p>
          <Button onClick={() => onPageChange(1)} disabled={clampedPage === 1}>
            First
          </Button>
          <Button onClick={() => onPageChange(clampedPage - 1)} disabled={clampedPage === 1}>
            Previous
          </Button>
          <Button onClick={() => onPageChange(clampedPage + 1)} disabled={clampedPage === totalPages}>
            Next
          </Button>
          <Button onClick={() => onPageChange(totalPages)} disabled={clampedPage === totalPages}>
            Last
          </Button>
        </div>
      )}
    </div>
  );
}
