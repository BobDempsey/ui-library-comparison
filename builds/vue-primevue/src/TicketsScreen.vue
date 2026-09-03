<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import ConfirmDialog from 'primevue/confirmdialog';
import { loadAssignees, type FixtureOptions, type Ticket } from '@bakeoff/fixture';
import { useFilters } from './composables/useFilters.js';
import { useTicketData } from './composables/useTicketData.js';
import { provideToasts } from './composables/useToasts.js';
import ErrorState from './components/ErrorState.vue';
import FilterForm from './components/FilterForm.vue';
import LoadingSkeleton from './components/LoadingSkeleton.vue';
import RecordModal from './components/RecordModal.vue';
import TicketsTable from './components/TicketsTable.vue';
import ToastRegion from './components/ToastRegion.vue';

/**
 * The screen from sections 2 to 8: a filterable table, the filter form above
 * it, a record modal, and toasts. The toast region and the confirm dialog
 * mount once, at the top, before any of the loading, error, or ready states
 * below them, so `aria-live="polite"` is already in the DOM before the first
 * toast.
 */
const props = withDefaults(defineProps<{ fixture?: FixtureOptions }>(), { fixture: () => ({}) });

const fixture = computed(() => props.fixture);
const { state: ticketState, retry } = useTicketData(fixture);
const toasts = provideToasts();

const rows = ref<Ticket[]>([]);
const assignees = ref<readonly string[]>([]);
const editingTicket = ref<Ticket | null>(null);
const sortField = ref<string | null>(null);
const sortOrder = ref<number | null>(null);
const first = ref(0);

watch(
  ticketState,
  (state) => {
    if (state.status === 'ready') rows.value = state.rows;
  },
  { immediate: true },
);

onMounted(() => {
  loadAssignees().then((names) => {
    assignees.value = names;
  });
});

const filters = useFilters(
  rows,
  () => {
    first.value = 0;
  },
  () => toasts.push('Filters cleared', 3000),
);

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

function openRow(ticket: Ticket): void {
  editingTicket.value = ticket;
}

function closeModal(): void {
  editingTicket.value = null;
}

function onSave(updated: Ticket): void {
  rows.value = rows.value.map((t) => (t.id === updated.id ? updated : t));
}
</script>

<template>
  <ToastRegion :toasts="toasts.toasts" @dismiss="toasts.dismiss" />
  <ConfirmDialog />

  <ErrorState v-if="ticketState.status === 'error'" :message="ticketState.message" @retry="retry" />
  <LoadingSkeleton v-else-if="ticketState.status === 'loading'" />
  <template v-else>
    <FilterForm :filters="filters" :assignees="assignees" />
    <TicketsTable
      :filtered="filters.filtered.value"
      :sort-field="sortField"
      :sort-order="sortOrder"
      :first="first"
      :empty-kind="emptyKind"
      :empty-message="emptyMessage"
      @update:sort-field="(v) => (sortField = v)"
      @update:sort-order="(v) => (sortOrder = v)"
      @update:first="(v) => (first = v)"
      @open-row="openRow"
      @clear-filters="filters.clear"
    />
    <RecordModal :ticket="editingTicket" :assignees="assignees" @close="closeModal" @save="onSave" />
  </template>
</template>
