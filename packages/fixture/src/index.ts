import type { Ticket } from './types.js';

export * from './types.js';

// The generator is deliberately not re-exported here. It reads and writes files,
// so pulling it into this entry point drags node:fs into every browser bundle.
// Scripts import it from '@bakeoff/fixture/generate'.

/**
 * Section 8 needs an error state that every build shows. The flag is read by the
 * build's data layer, not by the criteria, so each library fails the load its own way.
 */
export interface FixtureOptions {
  /** Return no rows, for the `No tickets yet` empty state. */
  empty?: boolean;
  /** Fail the load, for `Could not load tickets` and its Retry button. */
  fail?: boolean;
  /** Milliseconds the skeleton is held on first mount. Section 8 fixes this at 600. */
  loadingMs?: number;
}

export const DEFAULT_LOADING_MS = 600;

/**
 * The rows arrive through a dynamic import, so the 240 tickets land in their own
 * chunk rather than inside the application bundle. There is still no network call.
 */
export async function loadTickets(options: FixtureOptions = {}): Promise<readonly Ticket[]> {
  const { empty = false, fail = false, loadingMs = DEFAULT_LOADING_MS } = options;
  await new Promise((resolve) => setTimeout(resolve, loadingMs));
  if (fail) throw new Error('Could not load tickets');
  if (empty) return [];
  const { TICKETS } = await import('./data.js');
  return TICKETS;
}

/** The assignee names for the filter's single select, loaded the same way. */
export async function loadAssignees(): Promise<readonly string[]> {
  const { ASSIGNEES } = await import('./data.js');
  return ASSIGNEES;
}
