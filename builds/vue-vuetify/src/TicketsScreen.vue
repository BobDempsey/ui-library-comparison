<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';
import { loadAssignees, type FixtureOptions, type Ticket } from '@uilc/fixture';
import { useTicketData } from './useTicketData.js';
import { useFilters } from './useFilters.js';
import { nextSort, type SortColumn, type SortDirection } from './filtering.js';
import { provideToasts } from './toasts/toastStore.js';
import ToastRegion from './toasts/ToastRegion.vue';
import FilterForm from './components/FilterForm.vue';
import TicketsTable, { type SortState } from './components/TicketsTable.vue';
import RecordModal from './components/RecordModal.vue';
import LoadingSkeleton from './components/LoadingSkeleton.vue';
import ErrorState from './components/ErrorState.vue';

/**
 * The screen from sections 2 to 8: a filterable table, the filter form above
 * it, a record modal, and toasts. The toast region mounts once, at the top,
 * before any of the loading, error, or ready states below it, so
 * `aria-live="polite"` is already in the DOM before the first toast.
 */
const props = withDefaults(defineProps<{ fixture?: FixtureOptions }>(), { fixture: () => ({}) });

const toasts = provideToasts();
const { status: ticketStatus, errorMessage, rows: loadedRows, retry } = useTicketData(props.fixture);

const rows = shallowRef<Ticket[]>([]);
const assignees = ref<readonly string[]>([]);
const sort = ref<SortState>({ column: null, direction: 'ascending' });
const page = ref(1);
const editingTicket = ref<Ticket | null>(null);
const lastFocused = ref<HTMLElement | null>(null);

watch(
  loadedRows,
  (value) => {
    if (ticketStatus.value === 'ready') rows.value = [...value];
  },
  { immediate: true },
);

loadAssignees().then((names) => {
  assignees.value = names;
});

// `useFilters` is wired to the locally-editable `rows`, not the raw
// `loadedRows` straight out of the fixture: it has to filter and display
// whatever `onSaveTicket` last wrote, not the original load.
const filters = useFilters(
  rows,
  () => {
    page.value = 1;
  },
  () => toasts.push('Filters cleared', 3000),
);

function onSort(column: SortColumn): void {
  const current = sort.value.column ? { column: sort.value.column, direction: sort.value.direction } : null;
  sort.value = nextSort(current, column) ?? { column: null, direction: 'ascending' as SortDirection };
}

function onOpenRow(ticket: Ticket, sourceEl?: HTMLElement | null): void {
  lastFocused.value = sourceEl ?? (document.activeElement as HTMLElement | null);
  editingTicket.value = ticket;
}

function onCloseModal(): void {
  editingTicket.value = null;
  lastFocused.value?.focus();
}

function onSaveTicket(updated: Ticket): void {
  rows.value = rows.value.map((t) => (t.id === updated.id ? updated : t));
}

function onPageChange(next: number): void {
  page.value = next;
}

const emptyKind = computed<'no-tickets' | 'no-matches' | null>(() => {
  if (rows.value.length === 0) return 'no-tickets';
  if (filters.filtered.value.length === 0) return 'no-matches';
  return null;
});

const emptyMessage = computed(() => {
  if (emptyKind.value === 'no-tickets') return 'No tickets yet';
  if (emptyKind.value === 'no-matches') return 'No tickets match these filters';
  return null;
});
</script>

<template>
  <v-app>
    <v-main>
      <v-container fluid>
        <ToastRegion />

        <ErrorState v-if="ticketStatus === 'error'" :message="errorMessage ?? 'Could not load tickets'" @retry="retry" />
        <LoadingSkeleton v-else-if="ticketStatus === 'loading'" />
        <template v-else>
          <FilterForm :filters="filters" :assignees="assignees" />
          <TicketsTable
            :filtered="filters.filtered.value"
            :page="page"
            :sort="sort"
            :empty-kind="emptyKind"
            :empty-message="emptyMessage"
            @page-change="onPageChange"
            @sort="onSort"
            @open-row="(ticket) => onOpenRow(ticket)"
            @clear-filters="filters.clear"
          />
          <RecordModal :ticket="editingTicket" :assignees="assignees" @close="onCloseModal" @save="onSaveTicket" />
        </template>
      </v-container>
    </v-main>
  </v-app>
</template>
