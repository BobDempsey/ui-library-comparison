import { computed, type ComputedRef, reactive, type Ref, ref, watch } from 'vue';
import type { Priority, Status, Ticket } from '@uilc/fixture';
import { activeFilterCount, applyFilters, EMPTY_FILTERS, type FilterState } from '../filtering.js';

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
export function useFilters(rows: Ref<Ticket[]>, onPageReset: () => void, onClear: () => void): FiltersApi {
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

  // Changing a filter resets to page 1, per section 4. `watch` without `immediate`
  // never fires on the initial value, so the first render is skipped for free.
  watch(
    () => [debouncedSearch.value, fields.status, fields.priority, fields.assignee, fields.createdFrom, fields.createdTo],
    () => onPageReset(),
  );

  const filtered = computed(() => applyFilters(rows.value, effective.value));
  // The active count and the disabled state read what is currently in the
  // fields, not the debounced value, so Clear reacts to what the user typed.
  const activeCount = computed(() =>
    activeFilterCount({
      search: fields.search,
      status: fields.status,
      priority: fields.priority,
      assignee: fields.assignee,
      createdFrom: fields.createdFrom,
      createdTo: fields.createdTo,
    }),
  );

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
      fields.search = '';
      fields.status = [];
      fields.priority = [];
      fields.assignee = null;
      fields.createdFrom = null;
      fields.createdTo = null;
      debouncedSearch.value = '';
      if (debounceTimer) clearTimeout(debounceTimer);
      onClear();
    },
  };
}
