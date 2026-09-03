import type { ChangeEvent } from 'react';
import { PRIORITIES, STATUSES, type Priority, type Status } from '@bakeoff/fixture';
import type { FiltersApi } from '../useFilters.js';
import { MultiSelectField } from './MultiSelectField.js';
import { SingleSelectField } from './SingleSelectField.js';

/** Section 5. Filters on every keystroke or change, no submit button. */
export function FilterForm({ filters, assignees }: { filters: FiltersApi; assignees: readonly string[] }) {
  const onSearchChange = (event: ChangeEvent<HTMLInputElement>) => filters.setSearch(event.target.value);
  const onFromChange = (event: ChangeEvent<HTMLInputElement>) =>
    filters.setCreatedFrom(event.target.value === '' ? null : event.target.value);
  const onToChange = (event: ChangeEvent<HTMLInputElement>) =>
    filters.setCreatedTo(event.target.value === '' ? null : event.target.value);

  return (
    <form className="filter-form" aria-label="Filter tickets" onSubmit={(e) => e.preventDefault()}>
      <div className="field">
        <label htmlFor="search-input">Search</label>
        <input
          id="search-input"
          type="text"
          value={filters.fields.search}
          onChange={onSearchChange}
          placeholder="Search id or subject"
        />
      </div>

      <MultiSelectField<Status>
        testId="filter-status"
        label="Status"
        options={STATUSES}
        value={filters.fields.status}
        onChange={filters.setStatus}
      />

      <MultiSelectField<Priority>
        testId="filter-priority"
        label="Priority"
        options={PRIORITIES}
        value={filters.fields.priority}
        onChange={filters.setPriority}
      />

      <SingleSelectField<string>
        testId="filter-assignee"
        label="Assignee"
        options={[...assignees, 'Unassigned']}
        value={filters.fields.assignee}
        onChange={filters.setAssignee}
        nullOption="Any assignee"
      />

      <fieldset className="field created-range">
        <legend>Created between</legend>
        <label htmlFor="created-from">
          From
          <input id="created-from" type="date" value={filters.fields.createdFrom ?? ''} onChange={onFromChange} />
        </label>
        <label htmlFor="created-to">
          To
          <input id="created-to" type="date" value={filters.fields.createdTo ?? ''} onChange={onToChange} />
        </label>
      </fieldset>

      <div className="field clear-field">
        <span data-testid="filter-active-count">{filters.activeCount} active</span>
        <button
          type="button"
          data-testid="filter-clear-button"
          onClick={filters.clear}
          disabled={filters.activeCount === 0}
        >
          Clear filters
        </button>
      </div>
    </form>
  );
}
