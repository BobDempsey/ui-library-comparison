import tickets from '../tickets.json' with { type: 'json' };
import type { Ticket } from './types.js';

/**
 * The committed 240 rows, in source order. This entry point is loaded on its own
 * so a build's bundler emits it as a separate chunk. Section 10 excludes the
 * fixture from the size total, and `scripts/measure.ts` can only do that if the
 * rows are not inlined into the application chunk.
 *
 * Import this directly from tests. Application code uses `loadTickets`.
 */
export const TICKETS: readonly Ticket[] = tickets as Ticket[];

/** The assignee names present in the fixture, sorted, for the single select in section 5. */
export const ASSIGNEES: readonly string[] = [
  ...new Set(TICKETS.map((t) => t.assignee).filter((a): a is string => a !== null)),
].sort((a, b) => a.localeCompare(b));
