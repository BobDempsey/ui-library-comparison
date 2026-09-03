<script setup lang="ts">
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import MultiSelect from 'primevue/multiselect';
import Select from 'primevue/select';
import { PRIORITIES, STATUSES } from '@bakeoff/fixture';
import type { FiltersApi } from '../composables/useFilters.js';

/** Section 5. Filters on every keystroke or change, no submit button. */
defineProps<{ filters: FiltersApi; assignees: readonly string[] }>();

function onDateChange(setter: (value: string | null) => void, event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  setter(value === '' ? null : value);
}
</script>

<template>
  <form class="filter-form" aria-label="Filter tickets" @submit.prevent>
    <div class="field">
      <label for="search-input">Search</label>
      <InputText
        id="search-input"
        type="text"
        :model-value="filters.fields.search"
        placeholder="Search id or subject"
        @update:model-value="(v) => filters.setSearch(v ?? '')"
      />
    </div>

    <div class="field">
      <label id="filter-status-label" for="filter-status">Status</label>
      <MultiSelect
        input-id="filter-status"
        aria-labelledby="filter-status-label"
        :model-value="filters.fields.status"
        :options="[...STATUSES]"
        placeholder="Any status"
        display="comma"
        data-testid="filter-status-button"
        @update:model-value="(v) => filters.setStatus(v)"
      />
      <span class="visually-hidden" data-testid="filter-status-selected">{{ filters.fields.status.join(',') }}</span>
    </div>

    <div class="field">
      <label id="filter-priority-label" for="filter-priority">Priority</label>
      <MultiSelect
        input-id="filter-priority"
        aria-labelledby="filter-priority-label"
        :model-value="filters.fields.priority"
        :options="[...PRIORITIES]"
        placeholder="Any priority"
        display="comma"
        data-testid="filter-priority-button"
        @update:model-value="(v) => filters.setPriority(v)"
      />
      <span class="visually-hidden" data-testid="filter-priority-selected">{{ filters.fields.priority.join(',') }}</span>
    </div>

    <div class="field">
      <label id="filter-assignee-label" for="filter-assignee">Assignee</label>
      <Select
        input-id="filter-assignee"
        aria-labelledby="filter-assignee-label"
        :model-value="filters.fields.assignee"
        :options="[...assignees, 'Unassigned']"
        placeholder="Any assignee"
        show-clear
        data-testid="filter-assignee-button"
        @update:model-value="(v) => filters.setAssignee(v ?? null)"
      />
    </div>

    <fieldset class="field created-range">
      <legend>Created between</legend>
      <label for="created-from">
        From
        <input
          id="created-from"
          type="date"
          :value="filters.fields.createdFrom ?? ''"
          @change="(e) => onDateChange(filters.setCreatedFrom, e)"
        />
      </label>
      <label for="created-to">
        To
        <input
          id="created-to"
          type="date"
          :value="filters.fields.createdTo ?? ''"
          @change="(e) => onDateChange(filters.setCreatedTo, e)"
        />
      </label>
    </fieldset>

    <div class="field clear-field">
      <span data-testid="filter-active-count">{{ filters.activeCount.value }} active</span>
      <Button
        type="button"
        label="Clear filters"
        data-testid="filter-clear-button"
        :disabled="filters.activeCount.value === 0"
        @click="filters.clear"
      />
    </div>
  </form>
</template>
