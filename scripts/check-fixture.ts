/**
 * A phase one guard: the criteria assume things about the fixture, such as a
 * ticket sitting on each Created boundary and a search that matches one row.
 * Regenerating the fixture runs this, so an assumption breaking is loud.
 */
import { TICKETS } from '../packages/fixture/src/data.js';
import {
  applyFilters,
  countMatching,
  pickAssignee,
  pickCombination,
  sortedSubjects,
} from '../packages/criteria/src/expected.js';

const checks: Array<[string, boolean, unknown]> = [];
const add = (label: string, ok: boolean, detail: unknown) => checks.push([label, ok, detail]);

add('240 rows, unique ids', TICKETS.length === 240 && new Set(TICKETS.map((t) => t.id)).size === 240, TICKETS.length);
add('c4 TCK-0007 matches one row', countMatching({ search: 'TCK-0007' }) === 1, countMatching({ search: 'TCK-0007' }));

const openPending = countMatching({ status: ['open', 'pending'] });
add('c5 open and pending have rows', openPending > 0 && openPending < 240, openPending);

const combo = pickCombination();
add('c6 a status and priority pair has rows', combo.count > 0, combo);

const march = applyFilters(TICKETS, { createdFrom: '2026-03-01', createdTo: '2026-03-31' });
const boundaries = march.some((t) => t.id === 'TCK-0100') && march.some((t) => t.id === 'TCK-0101');
add('c7 range holds both boundary rows', boundaries && march.length < 240, { rows: march.length, boundaries });

const assignee = pickAssignee();
add('c8 a named assignee has rows', assignee.count > 0, assignee);

const [firstAsc] = sortedSubjects('asc');
const [firstDesc] = sortedSubjects('desc');
add('c2 subjects span A to Z', firstAsc !== firstDesc && firstAsc?.[0] === 'A' && firstDesc?.[0] === 'Z', { firstAsc, firstDesc });

add('c15 the no-match search finds nothing', countMatching({ search: 'zzzz-no-such-ticket' }) === 0, 0);
add('subjects fit 120 characters', TICKETS.every((t) => t.subject.length >= 1 && t.subject.length <= 120), Math.max(...TICKETS.map((t) => t.subject.length)));
add('updatedAt is never before createdAt', TICKETS.every((t) => t.updatedAt >= t.createdAt), true);

let failed = 0;
for (const [label, ok, detail] of checks) {
  if (!ok) failed += 1;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${label}`, detail);
}
if (failed > 0) {
  console.error(`\n${failed} fixture assumption(s) broken. Fix before any build starts.`);
  process.exit(1);
}
console.log('\nall fixture assumptions hold');
