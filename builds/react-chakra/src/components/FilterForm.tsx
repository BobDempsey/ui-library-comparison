import type { ChangeEvent } from 'react';
import { Button, Field, Fieldset, Flex, HStack, Input, NativeSelect, Text } from '@chakra-ui/react';
import { PRIORITIES, STATUSES, type Priority, type Status } from '@uilc/fixture';
import type { FiltersApi } from '../useFilters.js';

const UNASSIGNED = 'Unassigned';

/**
 * Section 5. Filters on every keystroke or change, no submit button. The
 * Status and Priority multi-selects, and the Assignee single-select, use
 * Chakra's `NativeSelect`, a styled wrapper over the real `<select>` element
 * rather than the library's Ark-based listbox `Select`: it gives the same
 * multi-select semantics natively (`Ctrl`/`Cmd`-click, arrow keys, typeahead)
 * with none of the popover/portal machinery a filter bar this small does not
 * need.
 */
export function FilterForm({ filters, assignees }: { filters: FiltersApi; assignees: readonly string[] }) {
  const onSearchChange = (event: ChangeEvent<HTMLInputElement>) => filters.setSearch(event.target.value);
  const onFromChange = (event: ChangeEvent<HTMLInputElement>) =>
    filters.setCreatedFrom(event.target.value === '' ? null : event.target.value);
  const onToChange = (event: ChangeEvent<HTMLInputElement>) =>
    filters.setCreatedTo(event.target.value === '' ? null : event.target.value);

  const onStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(event.target.selectedOptions, (option) => option.value) as Status[];
    filters.setStatus(values);
  };

  const onPriorityChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(event.target.selectedOptions, (option) => option.value) as Priority[];
    filters.setPriority(values);
  };

  const onAssigneeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    filters.setAssignee(event.target.value === '' ? null : event.target.value);
  };

  return (
    <Flex
      as="form"
      aria-label="Filter tickets"
      onSubmit={(e) => e.preventDefault()}
      wrap="wrap"
      gap="4"
      align="end"
      mb="4"
      p="4"
      bg="bg.panel"
      borderWidth="1px"
      borderRadius="md"
    >
      <Field.Root flex="1 1 16rem" minW="12rem" width="auto">
        <Field.Label htmlFor="search-input">Search</Field.Label>
        <Input
          id="search-input"
          type="text"
          value={filters.fields.search}
          onChange={onSearchChange}
          placeholder="Search id or subject"
        />
      </Field.Root>

      <Field.Root flex="0 1 10rem" minW="10rem" width="auto">
        <Field.Label htmlFor="filter-status">Status</Field.Label>
        <NativeSelect.Root>
          <NativeSelect.Field
            id="filter-status"
            data-testid="filter-status"
            multiple
            height="auto"
            minH="2.5rem"
            value={filters.fields.status}
            onChange={onStatusChange}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </NativeSelect.Field>
        </NativeSelect.Root>
      </Field.Root>

      <Field.Root flex="0 1 10rem" minW="10rem" width="auto">
        <Field.Label htmlFor="filter-priority">Priority</Field.Label>
        <NativeSelect.Root>
          <NativeSelect.Field
            id="filter-priority"
            data-testid="filter-priority"
            multiple
            height="auto"
            minH="2.5rem"
            value={filters.fields.priority}
            onChange={onPriorityChange}
          >
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </NativeSelect.Field>
        </NativeSelect.Root>
      </Field.Root>

      <Field.Root flex="1 1 10rem" minW="10rem" width="auto">
        <Field.Label htmlFor="filter-assignee">Assignee</Field.Label>
        <NativeSelect.Root>
          <NativeSelect.Field
            id="filter-assignee"
            data-testid="filter-assignee"
            value={filters.fields.assignee ?? ''}
            onChange={onAssigneeChange}
          >
            <option value="">Any assignee</option>
            {assignees.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value={UNASSIGNED}>{UNASSIGNED}</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Field.Root>

      <Fieldset.Root flex="1 1 18rem" minW="16rem" width="auto">
        <Fieldset.Legend fontWeight="medium" fontSize="sm">
          Created between
        </Fieldset.Legend>
        <HStack gap="3">
          <Field.Root>
            <Field.Label htmlFor="created-from">From</Field.Label>
            <Input id="created-from" type="date" value={filters.fields.createdFrom ?? ''} onChange={onFromChange} />
          </Field.Root>
          <Field.Root>
            <Field.Label htmlFor="created-to">To</Field.Label>
            <Input id="created-to" type="date" value={filters.fields.createdTo ?? ''} onChange={onToChange} />
          </Field.Root>
        </HStack>
      </Fieldset.Root>

      <HStack gap="3">
        <Text fontSize="sm" data-testid="filter-active-count">
          {filters.activeCount} active
        </Text>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="filter-clear-button"
          onClick={filters.clear}
          disabled={filters.activeCount === 0}
        >
          Clear filters
        </Button>
      </HStack>
    </Flex>
  );
}
