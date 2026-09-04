import type { ChangeEvent } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  TextField,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import { PRIORITIES, STATUSES, type Priority, type Status } from '@uilc/fixture';
import type { FiltersApi } from '../useFilters.js';

/**
 * Section 5. Filters on every keystroke or change, no submit button. Material
 * UI's `Select` (`multiple`) gives keyboard navigation, `aria-expanded`,
 * `role="listbox"`/`role="option"`, and the label association through
 * `InputLabel` + `labelId`; the field layout and the active-count summary
 * next to Clear are hand built.
 */
export function FilterForm({ filters, assignees }: { filters: FiltersApi; assignees: readonly string[] }) {
  const onSearchChange = (event: ChangeEvent<HTMLInputElement>) => filters.setSearch(event.target.value);
  const onFromChange = (event: ChangeEvent<HTMLInputElement>) =>
    filters.setCreatedFrom(event.target.value === '' ? null : event.target.value);
  const onToChange = (event: ChangeEvent<HTMLInputElement>) =>
    filters.setCreatedTo(event.target.value === '' ? null : event.target.value);

  const onStatusChange = (event: SelectChangeEvent<Status[]>) => {
    const value = event.target.value;
    filters.setStatus(typeof value === 'string' ? (value.split(',') as Status[]) : value);
  };

  const onPriorityChange = (event: SelectChangeEvent<Priority[]>) => {
    const value = event.target.value;
    filters.setPriority(typeof value === 'string' ? (value.split(',') as Priority[]) : value);
  };

  const onAssigneeChange = (event: SelectChangeEvent<string>) => {
    filters.setAssignee(event.target.value === '' ? null : event.target.value);
  };

  return (
    <Box
      component="form"
      className="filter-form"
      aria-label="Filter tickets"
      onSubmit={(e) => e.preventDefault()}
      data-testid="filter-form"
    >
      <TextField
        id="search-input"
        label="Search"
        value={filters.fields.search}
        onChange={onSearchChange}
        placeholder="Search id or subject"
        size="small"
      />

      <FormControl size="small" className="field" data-testid="filter-status-field">
        <InputLabel id="filter-status-label" shrink>
          Status
        </InputLabel>
        <Select
          labelId="filter-status-label"
          label="Status"
          multiple
          displayEmpty
          value={filters.fields.status}
          onChange={onStatusChange}
          renderValue={(selected) => (selected.length === 0 ? 'Any status' : selected.join(', '))}
        >
          {STATUSES.map((option) => (
            <MenuItem key={option} value={option} data-testid={`filter-status-option-${option}`}>
              <Checkbox size="small" checked={filters.fields.status.includes(option)} />
              <ListItemText primary={option} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" className="field" data-testid="filter-priority-field">
        <InputLabel id="filter-priority-label" shrink>
          Priority
        </InputLabel>
        <Select
          labelId="filter-priority-label"
          label="Priority"
          multiple
          displayEmpty
          value={filters.fields.priority}
          onChange={onPriorityChange}
          renderValue={(selected) => (selected.length === 0 ? 'Any priority' : selected.join(', '))}
        >
          {PRIORITIES.map((option) => (
            <MenuItem key={option} value={option} data-testid={`filter-priority-option-${option}`}>
              <Checkbox size="small" checked={filters.fields.priority.includes(option)} />
              <ListItemText primary={option} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" className="field" data-testid="filter-assignee-field">
        <InputLabel id="filter-assignee-label" shrink>
          Assignee
        </InputLabel>
        <Select
          labelId="filter-assignee-label"
          label="Assignee"
          displayEmpty
          value={filters.fields.assignee ?? ''}
          onChange={onAssigneeChange}
          renderValue={(selected) => (selected === '' ? 'Any assignee' : (selected as string))}
        >
          <MenuItem value="" data-testid="filter-assignee-option-null">
            Any assignee
          </MenuItem>
          {[...assignees, 'Unassigned'].map((name) => (
            <MenuItem key={name} value={name} data-testid={`filter-assignee-option-${name}`}>
              {name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box component="fieldset" className="field created-range">
        <legend>Created between</legend>
        <TextField
          id="created-from"
          label="From"
          type="date"
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
          value={filters.fields.createdFrom ?? ''}
          onChange={onFromChange}
        />
        <TextField
          id="created-to"
          label="To"
          type="date"
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
          value={filters.fields.createdTo ?? ''}
          onChange={onToChange}
        />
      </Box>

      <Box className="field clear-field">
        <Typography variant="body2" data-testid="filter-active-count">
          {filters.activeCount} active
        </Typography>
        <Button
          type="button"
          variant="outlined"
          size="small"
          data-testid="filter-clear-button"
          onClick={filters.clear}
          disabled={filters.activeCount === 0}
        >
          Clear filters
        </Button>
      </Box>
    </Box>
  );
}
