import { computed, reactive, ref, watch, type ComputedRef } from 'vue';
import type { Priority, Status, Ticket } from '@bakeoff/fixture';
import { activeFilterCount, applyFilters, EMPTY_FILTERS, type FilterState } from './filtering.js';

const SEARCH_DEBOUNCE_MS = 250;

/** The five fields from section 5, as the user reads them back (no debounce lag). */
export interface FilterFields {
  search: string;
  status: Status[];
  priority: Priority[];
  assignee: string | null;
  createdFrom: string | null;
  createdTo: string | null;
}

export interface FiltersApi {
  fields: FilterFields;
  filtered: ComputedRef<Ticket[]>;
  activeCount: ComputedRef<number>;
  setSearch(value: string): void;
  setStatus(values: Status[]): void;
  setPriority(values: Priority[]): void;
  setAssignee(name: string | null): void;
  setCreatedFrom(value: string | null): void;
  setCreatedTo(value: string | null): void;
  clear(): void;
}

/** Filters on every keystroke or change per section 5, search debounced 250ms. */
export function useFilters(rows: () => readonly Ticket[], onPageReset: () => void, onClear: () => void): FiltersApi {
  const fields = reactive<FilterFields>({ ...EMPTY_FILTERS });
  const debouncedSearch = ref('');
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  watch(
    () => fields.search,
    (value) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debouncedSearch.value = value;
      }, SEARCH_DEBOUNCE_MS);
    },
  );

  const effective = computed<FilterState>(() => ({
    search: debouncedSearch.value,
    status: fields.status,
    priority: fields.priority,
    assignee: fields.assignee,
    createdFrom: fields.createdFrom,
    createdTo: fields.createdTo,
  }));

  // Changing a filter resets to page 1, per section 4. Unlike React's
  // `useEffect`, Vue's `watch()` (without `immediate: true`) never fires on
  // setup, only on an actual subsequent change, so every firing here is a
  // real filter edit and there is no "first run" to skip.
  watch(effective, () => {
    onPageReset();
  });

  const filtered = computed(() => applyFilters(rows(), effective.value));
  // The active count and the disabled state read what is currently in the
  // fields, not the debounced value, so Clear reacts to what the user typed.
  const activeCount = computed(() => activeFilterCount({ ...fields }));

  return {
    fields,
    filtered,
    activeCount,
    setSearch: (value) => {
      fields.search = value;
    },
    setStatus: (values) => {
      fields.status = values;
    },
    setPriority: (values) => {
      fields.priority = values;
    },
    setAssignee: (name) => {
      fields.assignee = name;
    },
    setCreatedFrom: (value) => {
      fields.createdFrom = value;
    },
    setCreatedTo: (value) => {
      fields.createdTo = value;
    },
    clear: () => {
      Object.assign(fields, { ...EMPTY_FILTERS });
      debouncedSearch.value = '';
      onClear();
    },
  };
}
