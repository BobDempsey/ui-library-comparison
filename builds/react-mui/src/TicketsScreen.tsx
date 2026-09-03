import { useEffect, useState } from 'react';
import { loadAssignees, type FixtureOptions, type Ticket } from '@bakeoff/fixture';
import { useTicketData } from './useTicketData.js';
import { useFilters } from './useFilters.js';
import { nextSort, type SortColumn, type SortDirection } from './filtering.js';
import { ToastProvider, useToasts } from './toasts/ToastContext.js';
import { ToastRegion } from './toasts/ToastRegion.js';
import { FilterForm } from './components/FilterForm.js';
import { TicketsTable, type SortState } from './components/TicketsTable.js';
import { RecordModal } from './components/RecordModal.js';
import { LoadingSkeleton } from './components/LoadingSkeleton.js';
import { ErrorState } from './components/ErrorState.js';

/**
 * The screen from sections 2 to 8: a filterable table, the filter form above it,
 * a record modal, and toasts. The toast region mounts once, at the top, before
 * any of the loading, error, or ready states below it, so `aria-live="polite"`
 * is already in the DOM before the first toast.
 */
export function TicketsScreen({ fixture = {} }: { fixture?: FixtureOptions }) {
  return (
    <ToastProvider>
      <ToastRegion />
      <ScreenBody fixture={fixture} />
    </ToastProvider>
  );
}

function ScreenBody({ fixture }: { fixture: FixtureOptions }) {
  const { state: ticketState, retry } = useTicketData(fixture);
  const [rows, setRows] = useState<Ticket[]>([]);
  const [assignees, setAssignees] = useState<readonly string[]>([]);
  const [sort, setSort] = useState<SortState>({ column: null, direction: 'ascending' });
  const [page, setPage] = useState(1);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const toasts = useToasts();

  useEffect(() => {
    if (ticketState.status === 'ready') setRows(ticketState.rows);
  }, [ticketState]);

  useEffect(() => {
    loadAssignees().then(setAssignees);
  }, []);

  const filters = useFilters(
    rows,
    () => setPage(1),
    () => toasts.push('Filters cleared', 3000),
  );

  const onSort = (column: SortColumn) => {
    setSort((prev) => {
      const current = prev.column ? { column: prev.column, direction: prev.direction } : null;
      return nextSort(current, column) ?? { column: null, direction: 'ascending' as SortDirection };
    });
  };

  const onSave = (updated: Ticket) => {
    setRows((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  if (ticketState.status === 'error') {
    return <ErrorState message={ticketState.message} onRetry={retry} />;
  }

  if (ticketState.status === 'loading') {
    return <LoadingSkeleton />;
  }

  const emptyKind = rows.length === 0 ? 'no-tickets' : filters.filtered.length === 0 ? 'no-matches' : null;
  const emptyMessage =
    emptyKind === 'no-tickets' ? 'No tickets yet' : emptyKind === 'no-matches' ? 'No tickets match these filters' : null;

  return (
    <>
      <FilterForm filters={filters} assignees={assignees} />
      <TicketsTable
        filtered={filters.filtered}
        page={page}
        onPageChange={setPage}
        sort={sort}
        onSort={onSort}
        onOpenRow={setEditingTicket}
        emptyKind={emptyKind}
        emptyMessage={emptyMessage}
        onClearFilters={filters.clear}
      />
      <RecordModal ticket={editingTicket} assignees={assignees} onClose={() => setEditingTicket(null)} onSave={onSave} />
    </>
  );
}
