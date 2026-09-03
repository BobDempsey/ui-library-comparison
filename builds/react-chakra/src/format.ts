/** Section 3: `createdAt` renders as `MMM d, yyyy`, `updatedAt` as a relative time. */

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Formats an ISO date as `Mar 4, 2026`. Uses UTC so the calendar day never shifts with the viewer's timezone. */
export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/** Formats an ISO date as a relative time, such as `3 days ago`. */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const diffMs = new Date(iso).getTime() - now.getTime();
  const abs = Math.abs(diffMs);

  if (abs < MINUTE) return relativeFormatter.format(Math.round(diffMs / SECOND), 'second');
  if (abs < HOUR) return relativeFormatter.format(Math.round(diffMs / MINUTE), 'minute');
  if (abs < DAY) return relativeFormatter.format(Math.round(diffMs / HOUR), 'hour');
  if (abs < MONTH) return relativeFormatter.format(Math.round(diffMs / DAY), 'day');
  if (abs < YEAR) return relativeFormatter.format(Math.round(diffMs / MONTH), 'month');
  return relativeFormatter.format(Math.round(diffMs / YEAR), 'year');
}
