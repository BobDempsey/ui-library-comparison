import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PRIORITIES, STATUSES, TICKET_COUNT, type Ticket } from './types.js';

/**
 * The 240 tickets are generated, not hand written, so anyone can reproduce them.
 * The seed is fixed and the output is committed as `tickets.json`. Regenerating
 * must produce a byte identical file, otherwise the bundle and render numbers
 * from earlier runs stop comparing.
 */
export const SEED = 0x5eed_1e55;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SUBJECT_LEADS = [
  'Attachment upload fails',
  'Billing export is empty',
  'CSV import drops rows',
  'Dashboard shows stale counts',
  'Email digest never arrives',
  'Filters reset on refresh',
  'Group permissions ignored',
  'Header search returns nothing',
  'Invoice PDF is blank',
  'Job queue stalls overnight',
  'Keyboard shortcuts conflict',
  'Login loops after timeout',
  'Mobile layout overlaps',
  'Notifications duplicate',
  'Onboarding step is skipped',
  'Password reset link expires early',
  'Queue depth alert misfires',
  'Report totals disagree',
  'Session drops on idle',
  'Timezone shown as UTC',
  'Upload progress freezes',
  'Validation message is wrong',
  'Webhook retries too fast',
  'XML feed rejects unicode',
  'Yearly rollup misses December',
  'Zip download is truncated',
];

const SUBJECT_TAILS = [
  'for enterprise accounts',
  'on the trial plan',
  'after the March release',
  'when SSO is enabled',
  'for read only members',
  'in the EU region',
  'on slow connections',
  'once the cache warms',
];

const NAMES = [
  'Priya Raman',
  'Marcus Webb',
  'Sofia Duarte',
  'Ken Ito',
  'Nadia Osei',
  'Tomas Lindqvist',
  'Grace Mbeki',
  'Daniel Reyes',
];

/** Every date falls inside this window, so a filter range can be reasoned about. */
export const WINDOW_START = Date.UTC(2026, 0, 6);
export const WINDOW_END = Date.UTC(2026, 5, 30);
const DAY = 86_400_000;
const WINDOW_DAYS = Math.round((WINDOW_END - WINDOW_START) / DAY);

function pick<T>(rand: () => number, list: readonly T[]): T {
  return list[Math.floor(rand() * list.length)] as T;
}

export function generateTickets(seed: number = SEED): Ticket[] {
  const rand = mulberry32(seed);
  const tickets: Ticket[] = [];

  for (let i = 0; i < TICKET_COUNT; i += 1) {
    const id = `TCK-${String(i + 1).padStart(4, '0')}`;
    const subject = `${pick(rand, SUBJECT_LEADS)} ${pick(rand, SUBJECT_TAILS)}`;
    const createdOffset = Math.floor(rand() * (WINDOW_DAYS + 1));
    const created = WINDOW_START + createdOffset * DAY;
    // updatedAt is always at or after createdAt, and never past the window end.
    const maxUpdateGap = Math.max(0, WINDOW_DAYS - createdOffset);
    const updated = created + Math.floor(rand() * (maxUpdateGap + 1)) * DAY;

    tickets.push({
      id,
      subject,
      status: pick(rand, STATUSES),
      priority: pick(rand, PRIORITIES),
      // Roughly one in five is unassigned, so the `Unassigned` option has rows.
      assignee: rand() < 0.2 ? null : pick(rand, NAMES),
      createdAt: new Date(created).toISOString(),
      updatedAt: new Date(updated).toISOString(),
    });
  }

  // Criterion 7 needs rows sitting exactly on a range boundary. Two are pinned
  // so the test can assert inclusivity without hunting for a lucky row.
  pinCreated(tickets, 'TCK-0100', Date.UTC(2026, 2, 1));
  pinCreated(tickets, 'TCK-0101', Date.UTC(2026, 2, 31));

  return tickets;
}

function pinCreated(tickets: Ticket[], id: string, ms: number): void {
  const ticket = tickets.find((t) => t.id === id);
  if (!ticket) throw new Error(`cannot pin ${id}: not generated`);
  ticket.createdAt = new Date(ms).toISOString();
  if (Date.parse(ticket.updatedAt) < ms) ticket.updatedAt = ticket.createdAt;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const out = new URL('../tickets.json', import.meta.url);
  writeFileSync(out, `${JSON.stringify(generateTickets(), null, 2)}\n`, 'utf8');
  console.log(`wrote ${TICKET_COUNT} tickets to ${fileURLToPath(out)}`);
}
