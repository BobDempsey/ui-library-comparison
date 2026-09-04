<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import { PAGE_SIZE, type Ticket } from '@uilc/fixture';
import { formatDate, formatRelative } from '../format.js';
import { sortRows } from '../filtering.js';
import type { EmptyKind } from '@uilc/harness';
import Badge from './Badge.vue';

/**
 * Section 4's table. PrimeVue's `DataTable` supplies the real `table` markup,
 * the sortable-column click/keyboard handling and `aria-sort`, the row focus and
 * Enter/Space-to-open behaviour (via `selectionMode="single"`), and the
 * paginator's First/Previous/Next/Last controls and `Showing x to y of z`
 * report. Nothing here reimplements any of that.
 *
 * `selection` is deliberately left unbound: PrimeVue's row click toggles
 * selection off on a second click of the same row, which would silently stop
 * the row from reopening the modal. Leaving `selection` at its default `null`
 * means every click, Enter, or Space always takes the same "select" branch,
 * which always emits `row-click`, the event this component actually listens
 * for.
 */
const props = defineProps<{
  filtered: Ticket[];
  sortField: string | null;
  sortOrder: number | null;
  first: number;
  emptyKind: EmptyKind;
  emptyMessage: string | null;
}>();

const emit = defineEmits<{
  'update:sortField': [value: string | null];
  'update:sortOrder': [value: number | null];
  'update:first': [value: number];
  'open-row': [ticket: Ticket];
  'clear-filters': [];
}>();

// The default order from section 4: `updatedAt` descending. When `sortField`
// cycles back to null (the third click of the ascending/descending/default
// sequence), DataTable stops resorting its `value` and this is what shows.
const baseRows = computed(() => sortRows(props.filtered, null, 'descending'));

function onRowClick(event: { data: Ticket }): void {
  emit('open-row', event.data);
}
</script>

<template>
  <div class="table-region">
    <DataTable
      :value="baseRows"
      data-key="id"
      selection-mode="single"
      :selection="null"
      :sort-field="sortField"
      :sort-order="sortOrder"
      sort-mode="single"
      removable-sort
      paginator
      :rows="PAGE_SIZE"
      :first="first"
      current-page-report-template="Showing {first} to {last} of {totalRecords}"
      paginator-template="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
      :table-props="{ 'aria-label': 'Support tickets' }"
      :pt="{ pcPaginator: { current: { 'aria-live': 'polite' } } }"
      @update:sort-field="(v) => emit('update:sortField', v)"
      @update:sort-order="(v) => emit('update:sortOrder', v)"
      @update:first="(v) => emit('update:first', v)"
      @row-click="onRowClick"
    >
      <template #empty>
        <div data-testid="table-empty-state" :data-kind="emptyKind">
          <p>{{ emptyMessage }}</p>
          <Button v-if="emptyKind === 'no-matches'" type="button" label="Clear filters" @click="emit('clear-filters')" />
        </div>
      </template>

      <Column field="id" header="ID" sortable />
      <Column field="subject" header="Subject" sortable />
      <Column header="Status">
        <template #body="{ data }"><Badge kind="status" :value="data.status" /></template>
      </Column>
      <Column header="Priority">
        <template #body="{ data }"><Badge kind="priority" :value="data.priority" /></template>
      </Column>
      <Column header="Assignee">
        <template #body="{ data }">{{ data.assignee ?? 'Unassigned' }}</template>
      </Column>
      <Column field="createdAt" header="Created" sortable>
        <template #body="{ data }">{{ formatDate(data.createdAt) }}</template>
      </Column>
      <Column field="updatedAt" header="Updated" sortable>
        <template #body="{ data }">{{ formatRelative(data.updatedAt) }}</template>
      </Column>
    </DataTable>
  </div>
</template>
