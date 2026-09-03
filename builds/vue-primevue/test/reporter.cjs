/**
 * `scripts/measure.ts` reads `criteria-results.json` for the pass/fail counts
 * behind section 10's scoring, but nothing in the shared packages writes it
 * (see handoff.md section 6). This is a plain Jest reporter, local to this
 * build, that turns the 18 acceptance criteria's own pass/fail state into that
 * file after the suite runs. It reads Jest's test titles ("1. renders 25 rows
 * ...") for the criterion number; it does not touch what passes or fails.
 * Copied from builds/react-headless/test/reporter.cjs, unchanged.
 */
const fs = require('node:fs');
const path = require('node:path');

class CriteriaResultsReporter {
  onRunComplete(_contexts, results) {
    const failedNumbers = [];
    let passed = 0;
    let failed = 0;

    for (const suite of results.testResults) {
      for (const test of suite.testResults) {
        const match = test.title.match(/^(\d+)\./);
        if (!match) continue;
        if (test.status === 'passed') {
          passed += 1;
        } else if (test.status === 'failed') {
          failed += 1;
          failedNumbers.push(Number(match[1]));
        }
        // Other statuses (skipped, pending, todo) are deliberately not counted
        // as a pass; this suite never skips a criterion.
      }
    }

    failedNumbers.sort((a, b) => a - b);
    const outPath = path.join(__dirname, '..', 'criteria-results.json');
    fs.writeFileSync(outPath, `${JSON.stringify({ passed, failed, failedNumbers }, null, 2)}\n`, 'utf8');
  }
}

module.exports = CriteriaResultsReporter;
