import type { ChangeEvent } from 'react';
import { PRIORITIES, STATUSES, type Priority, type Status } from '@uilc/fixture';
import type { FiltersApi } from '../useFilters.js';
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import { Label } from '@/components/ui/label.js';
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
    <form
      className="mb-4 flex flex-wrap items-end gap-4 rounded-lg border border-border bg-surface p-4"
      aria-label="Filter tickets"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="flex min-w-32 flex-col gap-1.5">
        <Label htmlFor="search-input">Search</Label>
        <Input
          id="search-input"
          type="text"
          value={filters.fields.search}
          onChange={onSearchChange}
          placeholder="Search id or subject"
        />
      </div>

      <MultiSelectField<Status>
        id="filter-status"
        testId="filter-status"
        label="Status"
        options={STATUSES}
        value={filters.fields.status}
        onChange={filters.setStatus}
      />

      <MultiSelectField<Priority>
        id="filter-priority"
        testId="filter-priority"
        label="Priority"
        options={PRIORITIES}
        value={filters.fields.priority}
        onChange={filters.setPriority}
      />

      <SingleSelectField<string>
        id="filter-assignee"
        testId="filter-assignee"
        label="Assignee"
        options={[...assignees, 'Unassigned']}
        value={filters.fields.assignee}
        onChange={filters.setAssignee}
        nullOption="Any assignee"
      />

      <fieldset className="m-0 flex gap-3 border-none p-0">
        <legend className="mb-1.5 text-sm font-medium">Created between</legend>
        <Label htmlFor="created-from" className="flex flex-col gap-1.5">
          From
          <Input id="created-from" type="date" value={filters.fields.createdFrom ?? ''} onChange={onFromChange} />
        </Label>
        <Label htmlFor="created-to" className="flex flex-col gap-1.5">
          To
          <Input id="created-to" type="date" value={filters.fields.createdTo ?? ''} onChange={onToChange} />
        </Label>
      </fieldset>

      <div className="flex items-center gap-2">
        <span data-testid="filter-active-count" className="text-sm text-muted-foreground">
          {filters.activeCount} active
        </span>
        <Button
          type="button"
          variant="outline"
          data-testid="filter-clear-button"
          onClick={filters.clear}
          disabled={filters.activeCount === 0}
        >
          Clear filters
        </Button>
      </div>
    </form>
  );
}
