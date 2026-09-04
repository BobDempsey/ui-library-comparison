import { computed, reactive, ref, watch, type ComputedRef, type ShallowRef } from 'vue';
import type { Priority, Status, Ticket } from '@uilc/fixture';
import { activeFilterCount, applyFilters, EMPTY_FILTERS, type FilterState } from './filtering.js';

const SEARCH_DEBOUNCE_MS = 250;

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

/**
 * Filters on every keystroke or change per section 5, search debounced 250ms.
 * Mirrors `builds/react-headless/src/useFilters.ts`, ported to the composition
 * API: `fields` is what the user reads back immediately, `debouncedSearch`
 * lags 250ms behind and is what actually narrows the table.
 */
export function useFilters(rows: ShallowRef<Ticket[]>, onPageReset: () => void, onClear: () => void): FiltersApi {
  const fields = reactive<FilterFields>({ ...EMPTY_FILTERS });
  const debouncedSearch = ref('');
  let searchTimer: ReturnType<typeof setTimeout> | null = null;

  watch(
    () => fields.search,
    (value) => {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        debouncedSearch.value = value;
      }, SEARCH_DEBOUNCE_MS);
    },
  );

  // Unlike React's `useEffect`, Vue's `watch()` without `{ immediate: true }`
  // never runs at setup time, only on a real change, so there is no spurious
  // first firing to skip here the way `useFilters.ts` in `react-headless` has to.
  watch(
    [debouncedSearch, () => fields.status, () => fields.priority, () => fields.assignee, () => fields.createdFrom, () => fields.createdTo],
    () => {
      onPageReset();
    },
    { deep: true },
  );

  const filtered = computed(() => {
    const effective: FilterState = {
      search: debouncedSearch.value,
      status: fields.status,
      priority: fields.priority,
      assignee: fields.assignee,
      createdFrom: fields.createdFrom,
      createdTo: fields.createdTo,
    };
    return applyFilters(rows.value, effective);
  });

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
      if (searchTimer) clearTimeout(searchTimer);
      debouncedSearch.value = '';
      onClear();
    },
  };
}
