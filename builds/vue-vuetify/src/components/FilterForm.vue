<script setup lang="ts">
import { computed } from 'vue';
import { PRIORITIES, STATUSES, type Priority, type Status } from '@uilc/fixture';
import type { FiltersApi } from '../useFilters.js';

/** Section 5. Filters on every keystroke or change, no submit button. */
const props = defineProps<{ filters: FiltersApi; assignees: readonly string[] }>();

const ANY_ASSIGNEE = 'Any assignee';
const assigneeItems = computed(() => [ANY_ASSIGNEE, ...props.assignees, 'Unassigned']);

const assigneeProxy = computed<string>({
  get: () => props.filters.fields.assignee ?? ANY_ASSIGNEE,
  set: (value) => props.filters.setAssignee(value === ANY_ASSIGNEE ? null : value),
});

const fromProxy = computed<string>({
  get: () => props.filters.fields.createdFrom ?? '',
  set: (value) => props.filters.setCreatedFrom(value === '' ? null : value),
});

const toProxy = computed<string>({
  get: () => props.filters.fields.createdTo ?? '',
  set: (value) => props.filters.setCreatedTo(value === '' ? null : value),
});
</script>

<template>
  <form class="filter-form" aria-label="Filter tickets" @submit.prevent>
    <v-text-field
      id="search-input"
      data-testid="filter-search-input"
      label="Search"
      placeholder="Search id or subject"
      density="compact"
      variant="outlined"
      hide-details
      :model-value="filters.fields.search"
      @update:model-value="(v: string) => filters.setSearch(v)"
    />

    <v-select
      id="filter-status"
      data-testid="filter-status-select"
      label="Status"
      density="compact"
      variant="outlined"
      hide-details
      multiple
      :items="[...STATUSES]"
      :model-value="filters.fields.status"
      @update:model-value="(v: Status[]) => filters.setStatus(v)"
    >
      <template #item="{ item, props: itemProps }">
        <v-list-item v-bind="itemProps" :data-testid="`filter-status-option-${item.raw}`" />
      </template>
    </v-select>
    <span class="visually-hidden" data-testid="filter-status-selected">{{ filters.fields.status.join(',') }}</span>

    <v-select
      id="filter-priority"
      data-testid="filter-priority-select"
      label="Priority"
      density="compact"
      variant="outlined"
      hide-details
      multiple
      :items="[...PRIORITIES]"
      :model-value="filters.fields.priority"
      @update:model-value="(v: Priority[]) => filters.setPriority(v)"
    >
      <template #item="{ item, props: itemProps }">
        <v-list-item v-bind="itemProps" :data-testid="`filter-priority-option-${item.raw}`" />
      </template>
    </v-select>
    <span class="visually-hidden" data-testid="filter-priority-selected">{{ filters.fields.priority.join(',') }}</span>

    <v-select
      id="filter-assignee"
      data-testid="filter-assignee-select"
      label="Assignee"
      density="compact"
      variant="outlined"
      hide-details
      :items="assigneeItems"
      v-model="assigneeProxy"
    >
      <template #item="{ item, props: itemProps }">
        <v-list-item
          v-bind="itemProps"
          :data-testid="item.raw === 'Any assignee' ? 'filter-assignee-option-null' : `filter-assignee-option-${item.raw}`"
        />
      </template>
    </v-select>
    <span class="visually-hidden" data-testid="filter-assignee-selected">{{ filters.fields.assignee ?? '' }}</span>

    <fieldset class="field created-range">
      <legend>Created between</legend>
      <v-text-field
        id="created-from"
        data-testid="filter-created-from"
        label="From"
        type="date"
        density="compact"
        variant="outlined"
        hide-details
        v-model="fromProxy"
      />
      <v-text-field
        id="created-to"
        data-testid="filter-created-to"
        label="To"
        type="date"
        density="compact"
        variant="outlined"
        hide-details
        v-model="toProxy"
      />
    </fieldset>

    <div class="field clear-field">
      <span data-testid="filter-active-count">{{ filters.activeCount.value }} active</span>
      <v-btn
        type="button"
        data-testid="filter-clear-button"
        variant="tonal"
        :disabled="filters.activeCount.value === 0"
        @click="filters.clear"
      >
        Clear filters
      </v-btn>
    </div>
  </form>
</template>
