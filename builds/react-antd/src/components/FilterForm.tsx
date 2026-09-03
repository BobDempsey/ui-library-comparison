import { Button, Form, Input, Select } from 'antd';
import { PRIORITIES, STATUSES, type Priority, type Status } from '@bakeoff/fixture';
import type { FiltersApi } from '../useFilters.js';

const STATUS_OPTIONS = STATUSES.map((value) => ({ value, label: value }));
const PRIORITY_OPTIONS = PRIORITIES.map((value) => ({ value, label: value }));

/** Section 5. Filters on every keystroke or change, no submit button. */
export function FilterForm({ filters, assignees }: { filters: FiltersApi; assignees: readonly string[] }) {
  const assigneeOptions = [...assignees, 'Unassigned'].map((name) => ({ value: name, label: name }));

  return (
    <Form layout="vertical" className="filter-form" aria-label="Filter tickets" onSubmitCapture={(e) => e.preventDefault()}>
      <Form.Item label="Search" htmlFor="search-input" className="field">
        <Input
          id="search-input"
          data-testid="filter-search-input"
          value={filters.fields.search}
          onChange={(event) => filters.setSearch(event.target.value)}
          placeholder="Search id or subject"
          allowClear
        />
      </Form.Item>

      <Form.Item label="Status" htmlFor="filter-status" className="field">
        <Select<Status[]>
          id="filter-status"
          mode="multiple"
          data-testid="filter-status-select"
          value={filters.fields.status}
          onChange={(values) => filters.setStatus(values)}
          options={STATUS_OPTIONS}
          placeholder="Any status"
          style={{ minWidth: '10rem' }}
        />
      </Form.Item>

      <Form.Item label="Priority" htmlFor="filter-priority" className="field">
        <Select<Priority[]>
          id="filter-priority"
          mode="multiple"
          data-testid="filter-priority-select"
          value={filters.fields.priority}
          onChange={(values) => filters.setPriority(values)}
          options={PRIORITY_OPTIONS}
          placeholder="Any priority"
          style={{ minWidth: '10rem' }}
        />
      </Form.Item>

      <Form.Item label="Assignee" htmlFor="filter-assignee" className="field">
        <Select<string | null>
          id="filter-assignee"
          data-testid="filter-assignee-select"
          value={filters.fields.assignee}
          onChange={(value) => filters.setAssignee(value ?? null)}
          options={assigneeOptions}
          placeholder="Any assignee"
          allowClear
          style={{ minWidth: '10rem' }}
        />
      </Form.Item>

      <Form.Item label="Created between" className="field created-range">
        {/* A plain native date input rather than Ant Design's `DatePicker`:
            section 5 asks for "two date inputs", and `DatePicker` alone pulls in
            rc-picker plus dayjs's format/weekday/quarter plugins, a large slice
            of the bundle for a control the spec does not require to be a
            calendar popup. */}
        <div className="created-range-inputs">
          <label htmlFor="created-from">
            From
            <input
              id="created-from"
              type="date"
              data-testid="filter-created-from"
              value={filters.fields.createdFrom ?? ''}
              onChange={(event) => filters.setCreatedFrom(event.target.value === '' ? null : event.target.value)}
            />
          </label>
          <label htmlFor="created-to">
            To
            <input
              id="created-to"
              type="date"
              data-testid="filter-created-to"
              value={filters.fields.createdTo ?? ''}
              onChange={(event) => filters.setCreatedTo(event.target.value === '' ? null : event.target.value)}
            />
          </label>
        </div>
      </Form.Item>

      <div className="field clear-field">
        <span data-testid="filter-active-count">{filters.activeCount} active</span>
        <Button
          type="default"
          data-testid="filter-clear-button"
          onClick={filters.clear}
          disabled={filters.activeCount === 0}
        >
          Clear filters
        </Button>
      </div>
    </Form>
  );
}
