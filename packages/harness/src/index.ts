import type { FixtureOptions, Priority, Status } from '@bakeoff/fixture';

/**
 * The adapter interface. Section 14 of the spec: the 18 criteria live once in
 * `@bakeoff/criteria` and run against every build, so the tests never reach into
 * a library's DOM. Each build answers these questions its own way.
 *
 * Rules for an implementer:
 * - Drive the screen the way a user does. Click the real control, do not call
 *   internal state. A build that answers `sortBy` by mutating an array is
 *   measuring nothing.
 * - Every method that changes the screen returns a promise and resolves after
 *   the UI has settled, debounce included. The criteria never sleep.
 * - Throw on anything the build genuinely cannot do. A thrown criterion is a
 *   recorded failure, which is the point. Do not return a plausible fake.
 */
export interface BakeoffAdapter {
  mount(options?: FixtureOptions): Promise<void>;
  unmount(): Promise<void>;

  table: TableProbe;
  filters: FilterProbe;
  modal: ModalProbe;
  toasts: ToastProbe;
  states: StateProbe;
  axe: AxeProbe;
}

/** One row as the user sees it, already formatted per section 3. */
export interface RowView {
  id: string;
  subject: string;
  status: Status;
  priority: Priority;
  /** `Unassigned` when the ticket has no assignee. */
  assignee: string;
  /** `MMM d, yyyy` */
  created: string;
  /** relative, such as `3 days ago` */
  updated: string;
}

export type SortColumn = 'id' | 'subject' | 'created' | 'updated';
export type SortDirection = 'ascending' | 'descending' | 'none';

export interface TableProbe {
  /** Rows currently painted, which is at most the 25 of a page. */
  rowCount(): number;
  /** The total behind `Showing 1 to 25 of 240`, read from that text. */
  totalCount(): number;
  rowAt(index: number): RowView;
  /** Click the column header. Section 4 cycles ascending, descending, default. */
  sortBy(column: SortColumn): Promise<void>;
  /** The `aria-sort` value on that column's header, or `none` when unset. */
  ariaSort(column: SortColumn): SortDirection;
  currentPage(): number;
  gotoPage(page: number): Promise<void>;
  /** Focus the row, then press Enter. Section 4 also accepts Space. */
  pressEnterOnRow(index: number): Promise<void>;
  /** True when the browser's focus sits on that row. Criterion 14 reads this. */
  rowHasFocus(index: number): boolean;
}

export interface CreatedRange {
  /** inclusive, `yyyy-MM-dd`, or null for an open end */
  from: string | null;
  to: string | null;
}

export interface FilterProbe {
  setSearch(text: string): Promise<void>;
  setStatus(values: Status[]): Promise<void>;
  setPriority(values: Priority[]): Promise<void>;
  /** `Unassigned` selects the null rows. Null clears the field. */
  setAssignee(name: string | null): Promise<void>;
  setCreatedRange(range: CreatedRange): Promise<void>;
  clear(): Promise<void>;
  clearIsDisabled(): boolean;
  /** The count shown next to the Clear button. */
  activeCount(): number;
  /** Every field as the user would read it back, for the reset assertion. */
  values(): FilterValues;
}

export interface FilterValues {
  search: string;
  status: Status[];
  priority: Priority[];
  assignee: string | null;
  created: CreatedRange;
}

export interface ModalProbe {
  isOpen(): boolean;
  /** The dialog title, which carries the id and subject. */
  title(): string;
  setSubject(text: string): Promise<void>;
  setStatus(value: Status): Promise<void>;
  setPriority(value: Priority): Promise<void>;
  save(): Promise<void>;
  cancel(): Promise<void>;
  pressEscape(): Promise<void>;
  /** The error under a field, or null. Criterion 11 reads the subject field. */
  fieldError(field: 'subject' | 'status' | 'priority'): string | null;
  /** The unsaved changes prompt from section 6. */
  confirmIsOpen(): boolean;
  confirmDiscard(): Promise<void>;
  /** True when focus is inside the dialog. */
  holdsFocus(): boolean;
}

export interface ToastProbe {
  /** Visible toast messages, oldest first, capped at 3 by section 7. */
  messages(): string[];
  dismissAll(): Promise<void>;
}

export type EmptyKind = 'no-tickets' | 'no-matches' | 'error' | null;

export interface StateProbe {
  /** Which of section 8's states is showing, or null when rows are. */
  kind(): EmptyKind;
  message(): string | null;
  /** The `Clear filters` inside the no-matches message, or the Retry on error. */
  pressAction(): Promise<void>;
  skeletonIsVisible(): boolean;
}

export interface AxeViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  nodes: number;
}

export interface AxeProbe {
  /** Run axe-core against the live DOM and return every violation it found. */
  run(): Promise<AxeViolation[]>;
}

/** The four scripts section 14 requires of every build. */
export const REQUIRED_SCRIPTS = ['dev', 'build', 'test', 'measure'] as const;

/**
 * What a build's `measure` writes to `results/<name>.json`. Section 10 fixes the
 * categories; the shape is here so the write-up reads one schema for all eight.
 */
export interface BuildResult {
  build: string;
  library: string;
  framework: 'react' | 'vue';
  /** shadcn/ui and Headless UI, per decision 4. */
  kind: 'suite' | 'assembly-kit';
  bundle: { totalGzipKb: number; baselineGzipKb: number; deltaGzipKb: number; overBudget: boolean };
  accessibility: { axeViolationsBeforeFixes: number; requirementsNeedingCustomCode: number };
  ergonomics: {
    linesOfAppCode: number;
    libraryImports: number;
    typeEscapes: number;
    handBuilt: { modal: boolean; select: boolean; toast: boolean };
  };
  render: { lighthouseFcpMsMedian: number; runs: number };
  criteria: { passed: number; failed: number; failedNumbers: number[] };
}

export const BUNDLE_BUDGET_KB = 180;
