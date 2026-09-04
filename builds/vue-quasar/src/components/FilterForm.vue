<script setup lang="ts">
import { PRIORITIES, STATUSES, type Priority, type Status } from '@uilc/fixture';
import type { FiltersApi } from '../useFilters.js';

/** Section 5. Filters on every keystroke or change, no submit button. */
const props = defineProps<{ filters: FiltersApi; assignees: readonly string[] }>();

const ANY_ASSIGNEE = 'Any assignee';

const assigneeOptions = () => [ANY_ASSIGNEE, ...props.assignees, 'Unassigned'];

function onFromChange(value: string | number | null) {
  const text = value === null ? '' : String(value);
  props.filters.setCreatedFrom(text === '' ? null : text);
}

function onToChange(value: string | number | null) {
  const text = value === null ? '' : String(value);
  props.filters.setCreatedTo(text === '' ? null : text);
}

function onAssigneeChange(value: string) {
  props.filters.setAssignee(value === ANY_ASSIGNEE ? null : value);
}
</script>

<template>
  <form class="filter-form" aria-label="Filter tickets" @submit.prevent>
    <div class="field">
      <q-input
        data-testid="filter-search"
        label="Search"
        placeholder="Search id or subject"
        :model-value="filters.fields.search"
        @update:model-value="(v) => filters.setSearch(String(v ?? ''))"
      />
    </div>

    <div class="field">
      <q-select
        data-testid="filter-status"
        label="Status"
        :options="[...STATUSES]"
        :model-value="filters.fields.status"
        multiple
        emit-value
        map-options
        dropdown-icon="M7 10l5 5 5-5z"
        @update:model-value="(v) => filters.setStatus(v as Status[])"
      />
      <span class="visually-hidden" data-testid="filter-status-selected">{{ filters.fields.status.join(',') }}</span>
    </div>

    <div class="field">
      <q-select
        data-testid="filter-priority"
        label="Priority"
        :options="[...PRIORITIES]"
        :model-value="filters.fields.priority"
        multiple
        emit-value
        map-options
        dropdown-icon="M7 10l5 5 5-5z"
        @update:model-value="(v) => filters.setPriority(v as Priority[])"
      />
      <span class="visually-hidden" data-testid="filter-priority-selected">{{ filters.fields.priority.join(',') }}</span>
    </div>

    <div class="field">
      <q-select
        data-testid="filter-assignee"
        label="Assignee"
        :options="assigneeOptions()"
        :model-value="filters.fields.assignee ?? ANY_ASSIGNEE"
        emit-value
        map-options
        dropdown-icon="M7 10l5 5 5-5z"
        @update:model-value="onAssigneeChange"
      />
    </div>

    <fieldset class="field created-range">
      <legend>Created between</legend>
      <div class="created-range-inputs">
        <q-input
          data-testid="filter-created-from"
          type="date"
          label="From"
          :model-value="filters.fields.createdFrom ?? ''"
          @update:model-value="onFromChange"
        />
        <q-input
          data-testid="filter-created-to"
          type="date"
          label="To"
          :model-value="filters.fields.createdTo ?? ''"
          @update:model-value="onToChange"
        />
      </div>
    </fieldset>

    <div class="field clear-field">
      <span data-testid="filter-active-count">{{ filters.activeCount }} active</span>
      <q-btn
        label="Clear filters"
        data-testid="filter-clear-button"
        :disable="filters.activeCount.value === 0"
        @click="filters.clear"
      />
    </div>
  </form>
</template>
