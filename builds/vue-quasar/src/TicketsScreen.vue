<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { loadAssignees, type FixtureOptions, type Ticket } from '@uilc/fixture';
import { useTicketData } from './useTicketData.js';
import { useFilters } from './useFilters.js';
import { nextSort, type SortColumn, type SortDirection, type SortState } from './filtering.js';
import { provideToasts } from './toasts.js';
import ToastRegion from './components/ToastRegion.vue';
import FilterForm from './components/FilterForm.vue';
import TicketsTable from './components/TicketsTable.vue';
import RecordModal from './components/RecordModal.vue';
import LoadingSkeleton from './components/LoadingSkeleton.vue';
import ErrorState from './components/ErrorState.vue';

/**
 * The screen from sections 2 to 8: a filterable table, a filter form above it,
 * a record modal, and toasts. The toast region mounts unconditionally, before
 * the loading/error/ready branches below it, so `aria-live="polite"` is
 * already in the DOM before the first toast.
 */
const props = withDefaults(defineProps<{ fixture?: FixtureOptions }>(), { fixture: () => ({}) });

const toasts = provideToasts();
const { state: ticketState, retry } = useTicketData(props.fixture);

const rows = ref<Ticket[]>([]);
const assignees = ref<readonly string[]>([]);
const sort = ref<SortState>({ column: null, direction: 'ascending' });
const page = ref(1);
const editingTicket = ref<Ticket | null>(null);

watch(
  ticketState,
  (state) => {
    if (state.status === 'ready') rows.value = state.rows;
  },
  { immediate: true },
);

loadAssignees().then((names) => {
  assignees.value = names;
});

const filters = useFilters(
  () => rows.value,
  () => {
    page.value = 1;
  },
  () => toasts.push('Filters cleared', 3000),
);

function onSort(column: SortColumn) {
  const current = sort.value.column ? { column: sort.value.column, direction: sort.value.direction } : null;
  sort.value = nextSort(current, column) ?? { column: null, direction: 'ascending' as SortDirection };
}

function onSave(updated: Ticket) {
  rows.value = rows.value.map((t) => (t.id === updated.id ? updated : t));
}

const emptyKind = computed(() => {
  if (rows.value.length === 0) return 'no-tickets' as const;
  if (filters.filtered.value.length === 0) return 'no-matches' as const;
  return null;
});

const emptyMessage = computed(() => {
  if (emptyKind.value === 'no-tickets') return 'No tickets yet';
  if (emptyKind.value === 'no-matches') return 'No tickets match these filters';
  return null;
});
</script>

<template>
  <ToastRegion />

  <ErrorState v-if="ticketState.status === 'error'" :message="ticketState.message" @retry="retry" />
  <LoadingSkeleton v-else-if="ticketState.status === 'loading'" />
  <template v-else>
    <FilterForm :filters="filters" :assignees="assignees" />
    <TicketsTable
      :filtered="filters.filtered.value"
      :page="page"
      :sort="sort"
      :empty-kind="emptyKind"
      :empty-message="emptyMessage"
      @update:page="(p) => (page = p)"
      @sort="onSort"
      @open-row="(t) => (editingTicket = t)"
      @clear-filters="filters.clear"
    />
    <RecordModal :ticket="editingTicket" :assignees="assignees" @close="editingTicket = null" @save="onSave" />
  </template>
</template>
