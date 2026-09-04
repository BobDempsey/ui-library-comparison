<script setup lang="ts">
import { computed } from 'vue';
import { PAGE_SIZE, type Ticket } from '@uilc/fixture';
import { formatDate, formatRelative } from '../format.js';
import { sortRows, type SortColumn, type SortState } from '../filtering.js';
import Badge from './Badge.vue';

const props = defineProps<{
  filtered: Ticket[];
  page: number;
  sort: SortState;
  emptyKind: 'no-tickets' | 'no-matches' | null;
  emptyMessage: string | null;
}>();

const emit = defineEmits<{
  'update:page': [page: number];
  sort: [column: SortColumn];
  openRow: [ticket: Ticket];
  clearFilters: [];
}>();

const SORT_COLUMNS: { key: SortColumn; label: string }[] = [
  { key: 'id', label: 'ID' },
  { key: 'subject', label: 'Subject' },
  { key: 'created', label: 'Created' },
  { key: 'updated', label: 'Updated' },
];

function ariaSortFor(column: SortColumn): 'ascending' | 'descending' | 'none' {
  if (props.sort.column !== column) return 'none';
  return props.sort.direction;
}

function indicatorFor(column: SortColumn): string {
  if (props.sort.column !== column) return '';
  return props.sort.direction === 'ascending' ? ' ▲' : ' ▼';
}

const total = computed(() => props.filtered.length);
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)));
const clampedPage = computed(() => Math.min(Math.max(props.page, 1), totalPages.value));
const sorted = computed(() => sortRows(props.filtered, props.sort.column, props.sort.direction));
const pageRows = computed(() => {
  const start = (clampedPage.value - 1) * PAGE_SIZE;
  return sorted.value.slice(start, start + PAGE_SIZE);
});
const rangeStart = computed(() => (total.value === 0 ? 0 : (clampedPage.value - 1) * PAGE_SIZE + 1));
const rangeEnd = computed(() => Math.min(clampedPage.value * PAGE_SIZE, total.value));

function onRowKeydown(ticket: Ticket, event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    emit('openRow', ticket);
  }
}

function assigneeLabel(assignee: string | null): string {
  return assignee ?? 'Unassigned';
}
</script>

<template>
  <div class="table-region">
    <table>
      <caption class="visually-hidden">Support tickets</caption>
      <thead>
        <tr>
          <th
            v-for="col in SORT_COLUMNS.slice(0, 2)"
            :key="col.key"
            scope="col"
            :aria-sort="ariaSortFor(col.key)"
          >
            <q-btn flat dense no-caps @click="emit('sort', col.key)">{{ col.label }}{{ indicatorFor(col.key) }}</q-btn>
          </th>
          <th scope="col">Status</th>
          <th scope="col">Priority</th>
          <th scope="col">Assignee</th>
          <th
            v-for="col in SORT_COLUMNS.slice(2)"
            :key="col.key"
            scope="col"
            :aria-sort="ariaSortFor(col.key)"
          >
            <q-btn flat dense no-caps @click="emit('sort', col.key)">{{ col.label }}{{ indicatorFor(col.key) }}</q-btn>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="emptyKind">
          <td colspan="7" data-testid="table-empty-state" :data-kind="emptyKind">
            <p>{{ emptyMessage }}</p>
            <q-btn v-if="emptyKind === 'no-matches'" label="Clear filters" @click="emit('clearFilters')" />
          </td>
        </tr>
        <tr
          v-for="ticket in pageRows"
          v-else
          :key="ticket.id"
          data-testid="ticket-row"
          tabindex="0"
          @click="emit('openRow', ticket)"
          @keydown="onRowKeydown(ticket, $event)"
        >
          <td>{{ ticket.id }}</td>
          <td>{{ ticket.subject }}</td>
          <td><Badge kind="status" :value="ticket.status" /></td>
          <td><Badge kind="priority" :value="ticket.priority" /></td>
          <td>{{ assigneeLabel(ticket.assignee) }}</td>
          <td>{{ formatDate(ticket.createdAt) }}</td>
          <td>{{ formatRelative(ticket.updatedAt) }}</td>
        </tr>
      </tbody>
    </table>

    <div v-if="!emptyKind" class="pagination">
      <p aria-live="polite">Showing {{ rangeStart }} to {{ rangeEnd }} of {{ total }}</p>
      <q-btn label="First" :disable="clampedPage === 1" @click="emit('update:page', 1)" />
      <q-btn label="Previous" :disable="clampedPage === 1" @click="emit('update:page', clampedPage - 1)" />
      <q-btn label="Next" :disable="clampedPage === totalPages" @click="emit('update:page', clampedPage + 1)" />
      <q-btn label="Last" :disable="clampedPage === totalPages" @click="emit('update:page', totalPages)" />
    </div>
  </div>
</template>
