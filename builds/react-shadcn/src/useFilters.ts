import { useEffect, useRef, useState } from 'react';
import type { Priority, Status } from '@uilc/fixture';
import { activeFilterCount, applyFilters, EMPTY_FILTERS, type FilterState } from './filtering.js';
import type { Ticket } from '@uilc/fixture';

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
  filtered: Ticket[];
  activeCount: number;
  setSearch(value: string): void;
  setStatus(values: Status[]): void;
  setPriority(values: Priority[]): void;
  setAssignee(name: string | null): void;
  setCreatedFrom(value: string | null): void;
  setCreatedTo(value: string | null): void;
  clear(): void;
}

/** Filters on every keystroke or change per section 5, search debounced 250ms. */
export function useFilters(rows: readonly Ticket[], onPageReset: () => void, onClear: () => void): FiltersApi {
  const [fields, setFields] = useState<FilterFields>({ ...EMPTY_FILTERS });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const firstRun = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(fields.search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [fields.search]);

  const effective: FilterState = {
    search: debouncedSearch,
    status: fields.status,
    priority: fields.priority,
    assignee: fields.assignee,
    createdFrom: fields.createdFrom,
    createdTo: fields.createdTo,
  };

  // Changing a filter resets to page 1, per section 4. Skip the effect's first run.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    onPageReset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedSearch,
    fields.status,
    fields.priority,
    fields.assignee,
    fields.createdFrom,
    fields.createdTo,
  ]);

  const filtered = applyFilters(rows, effective);
  // The active count and the disabled state read what is currently in the
  // fields, not the debounced value, so Clear reacts to what the user typed.
  const rawState: FilterState = { ...fields };

  return {
    fields,
    filtered,
    activeCount: activeFilterCount(rawState),
    setSearch: (value) => setFields((f) => ({ ...f, search: value })),
    setStatus: (values) => setFields((f) => ({ ...f, status: values })),
    setPriority: (values) => setFields((f) => ({ ...f, priority: values })),
    setAssignee: (name) => setFields((f) => ({ ...f, assignee: name })),
    setCreatedFrom: (value) => setFields((f) => ({ ...f, createdFrom: value })),
    setCreatedTo: (value) => setFields((f) => ({ ...f, createdTo: value })),
    clear: () => {
      setFields({ ...EMPTY_FILTERS });
      setDebouncedSearch('');
      onClear();
    },
  };
}
