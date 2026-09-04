<script setup lang="ts">
import { computed } from 'vue';
import { PAGE_SIZE, type Ticket } from '@uilc/fixture';
import { formatDate, formatRelative } from '../format.js';
import { sortRows, type SortColumn, type SortDirection } from '../filtering.js';
import Badge from './Badge.vue';

export interface SortState {
  column: SortColumn | null;
  direction: SortDirection;
}

const props = defineProps<{
  filtered: Ticket[];
  page: number;
  sort: SortState;
  emptyKind: 'no-tickets' | 'no-matches' | null;
  emptyMessage: string | null;
}>();

const emit = defineEmits<{
  'page-change': [page: number];
  sort: [column: SortColumn];
  'open-row': [ticket: Ticket];
  'clear-filters': [];
}>();

const COLUMNS: { key: SortColumn; label: string }[] = [
  { key: 'id', label: 'ID' },
  { key: 'subject', label: 'Subject' },
  { key: 'created', label: 'Created' },
  { key: 'updated', label: 'Updated' },
];

function ariaSortFor(column: SortColumn): 'ascending' | 'descending' | 'none' {
  if (props.sort.column !== column) return 'none';
  return props.sort.direction;
}

const totalPages = computed(() => Math.max(1, Math.ceil(props.filtered.length / PAGE_SIZE)));
const clampedPage = computed(() => Math.min(Math.max(props.page, 1), totalPages.value));
const sorted = computed(() => sortRows(props.filtered, props.sort.column, props.sort.direction));
const pageRows = computed(() =>
  sorted.value.slice((clampedPage.value - 1) * PAGE_SIZE, clampedPage.value * PAGE_SIZE),
);
const total = computed(() => props.filtered.length);
const start = computed(() => (total.value === 0 ? 0 : (clampedPage.value - 1) * PAGE_SIZE + 1));
const end = computed(() => Math.min(clampedPage.value * PAGE_SIZE, total.value));

function onRowKeydown(ticket: Ticket, event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    emit('open-row', ticket);
  }
}
</script>

<template>
  <div class="table-region">
    <v-table>
      <caption class="visually-hidden">Support tickets</caption>
      <thead>
        <tr>
          <th
            v-for="col in COLUMNS.slice(0, 2)"
            :key="col.key"
            scope="col"
            :aria-sort="ariaSortFor(col.key)"
          >
            <v-btn class="sort-header-btn" :data-testid="`sort-${col.key}`" variant="text" density="compact" @click="emit('sort', col.key)">
              {{ col.label }}<span aria-hidden="true">{{ sort.column === col.key ? (sort.direction === 'ascending' ? ' ▲' : ' ▼') : '' }}</span>
            </v-btn>
          </th>
          <th scope="col">Status</th>
          <th scope="col">Priority</th>
          <th scope="col">Assignee</th>
          <th
            v-for="col in COLUMNS.slice(2)"
            :key="col.key"
            scope="col"
            :aria-sort="ariaSortFor(col.key)"
          >
            <v-btn class="sort-header-btn" :data-testid="`sort-${col.key}`" variant="text" density="compact" @click="emit('sort', col.key)">
              {{ col.label }}<span aria-hidden="true">{{ sort.column === col.key ? (sort.direction === 'ascending' ? ' ▲' : ' ▼') : '' }}</span>
            </v-btn>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="emptyKind">
          <td colspan="7" data-testid="table-empty-state" :data-kind="emptyKind">
            <p>{{ emptyMessage }}</p>
            <v-btn
              v-if="emptyKind === 'no-matches'"
              data-testid="empty-state-action"
              variant="tonal"
              @click="emit('clear-filters')"
            >
              Clear filters
            </v-btn>
          </td>
        </tr>
        <tr
          v-for="ticket in pageRows"
          v-else
          :key="ticket.id"
          data-testid="ticket-row"
          tabindex="0"
          @click="emit('open-row', ticket)"
          @keydown="onRowKeydown(ticket, $event)"
        >
          <td>{{ ticket.id }}</td>
          <td>{{ ticket.subject }}</td>
          <td><Badge kind="status" :value="ticket.status" /></td>
          <td><Badge kind="priority" :value="ticket.priority" /></td>
          <td>{{ ticket.assignee ?? 'Unassigned' }}</td>
          <td>{{ formatDate(ticket.createdAt) }}</td>
          <td>{{ formatRelative(ticket.updatedAt) }}</td>
        </tr>
      </tbody>
    </v-table>

    <div v-if="!emptyKind" class="pagination">
      <p aria-live="polite">Showing {{ start }} to {{ end }} of {{ total }}</p>
      <v-btn data-testid="page-first" variant="tonal" density="compact" :disabled="clampedPage === 1" @click="emit('page-change', 1)">First</v-btn>
      <v-btn data-testid="page-previous" variant="tonal" density="compact" :disabled="clampedPage === 1" @click="emit('page-change', clampedPage - 1)">Previous</v-btn>
      <v-btn data-testid="page-next" variant="tonal" density="compact" :disabled="clampedPage === totalPages" @click="emit('page-change', clampedPage + 1)">Next</v-btn>
      <v-btn data-testid="page-last" variant="tonal" density="compact" :disabled="clampedPage === totalPages" @click="emit('page-change', totalPages)">Last</v-btn>
    </div>
  </div>
</template>

<style scoped>
/*
 * The sortable ID/Subject/Created/Updated headers wrap their label in a
 * `v-btn` so they're a real clickable control; `v-btn`'s own CSS forces
 * `text-transform: uppercase` on its content by default. Status/Priority/
 * Assignee are plain `<th>` text with no such transform, so the row read
 * SUBJECT/CREATED/UPDATED next to Status/Priority/Assignee: two casings in
 * the same header row by accident of which columns are sortable, not by
 * design. Un-transforming the button text matches it to the plain headers.
 */
.sort-header-btn {
  text-transform: none;
}
</style>
