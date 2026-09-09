/**
 * Captures the two committed screenshots for one build, or all eight.
 *
 *   pnpm screenshots --build react-shadcn
 *   pnpm screenshots --all
 *
 * spec/site-spec.md section 6: eight screens are too heavy to embed live on
 * one route, so the scoreboard carries a picture instead and the live screen
 * is one click behind it. This writes those pictures.
 *
 * Serves `builds/<name>/dist` the same way `scripts/lighthouse.ts` does, one
 * port per build starting at 4200 so a run over `--all` never reuses a port
 * between builds, drives it with `puppeteer-core` over its own fresh
 * `chrome-launcher` instance per build, and waits for the 25 rows criterion 1
 * guarantees before shooting. Two shots per build, at the two widths the
 * section 9/12 screen reviews already used: 1440x900 and 375x812, viewport
 * only so all sixteen share an aspect ratio per width.
 *
 * Run by hand, never in CI: it needs a real Chrome, and its output is
 * committed once a human has looked at it. `site/dist` build fails if a
 * screenshot named here is missing.
 */
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, type LaunchedChrome } from 'chrome-launcher';
import puppeteer, { type Browser } from 'puppeteer-core';
import { ROSTER } from './roster.js';
import { assertServingBuild, serve } from './serve.js';

const root = fileURLToPath(new URL('..', import.meta.url));

/**
 * One port per build, 4200 upward in roster order, rather than one port
 * reused across builds. Reusing a single port meant closing one build's
 * server and opening the next's on the same port in quick succession, and
 * Chrome would intermittently try to reuse a pooled keep-alive connection
 * from the one just torn down, failing the next build's request with
 * `fetch failed` or `net::ERR_ABORTED`. A fresh port per build has nothing
 * to reuse. Starts at 4200, not 4190: port 4190 is on the Fetch spec's
 * blocked-port list (Sieve mail filter protocol), and both `fetch` and
 * Chrome's navigation refuse to connect to it or its immediate neighbors.
 */
const PORTS = Object.fromEntries(Object.keys(ROSTER).map((build, i) => [build, 4200 + i]));

/** 150 KB cap from spec/site-spec.md section 6, kept here as the enforced number. */
const MAX_BYTES = 150 * 1024;

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '375', width: 375, height: 812 },
] as const;

async function captureBuild(build: string, outDir: string): Promise<void> {
  let chrome: LaunchedChrome | undefined;
  let browser: Browser | undefined;
  try {
    chrome = await launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });
    browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${chrome.port}` });
    await captureInBrowser(browser, build, outDir);
  } finally {
    await browser?.disconnect();
    chrome?.kill();
  }
}

/**
 * One fresh Chrome per build rather than one shared across all eight. A
 * shared browser worked for the first few builds and then grew slower and
 * eventually stalled on a later one (`react-antd`, the heaviest bundle) with
 * no error, just no progress, under load this repeats without a code
 * change to point at. A fresh Chrome for each build starts from the same
 * state every time.
 */
async function captureInBrowser(browser: Browser, build: string, outDir: string): Promise<void> {
  const dir = join(root, 'builds', build);
  const distDir = join(dir, 'dist');
  if (!existsSync(join(distDir, 'index.html'))) {
    throw new Error(`builds/${build}/dist is missing. Run pnpm --filter @uilc/${build} build first`);
  }

  const port = PORTS[build];
  if (port === undefined) throw new Error(`${build} has no assigned screenshot port`);
  const server = await serve(distDir, port);
  try {
    // 127.0.0.1, not localhost: the server binds IPv4 only, and Windows'
    // resolver can pick ::1 for "localhost" and fail the connection.
    const url = `http://127.0.0.1:${port}/tickets`;
    await assertServingBuild(url, distDir);

    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage();
      try {
        await page.setViewport({ width: viewport.width, height: viewport.height });
        await page.goto(url, { waitUntil: 'networkidle0' });
        // Criterion 1: 25 rows on first paint. Wait for the 25th so a shot
        // never catches a loading state.
        await page.waitForFunction(() => document.querySelectorAll('tbody tr').length >= 25, { timeout: 15000 });

        const file = join(outDir, `${build}-${viewport.name}.webp`);
        await page.screenshot({ path: file as `${string}.webp`, type: 'webp' });

        const { size } = statSync(file);
        if (size > MAX_BYTES) {
          throw new Error(`${file} is ${(size / 1024).toFixed(1)} KB, over the ${MAX_BYTES / 1024} KB cap`);
        }
      } finally {
        await page.close();
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const all = args.includes('--all');
  const flagged = args[args.indexOf('--build') + 1];
  const targets = all ? Object.keys(ROSTER) : [flagged].filter((n): n is string => Boolean(n) && n !== '--all');

  if (targets.length === 0) {
    console.error('usage: tsx scripts/screenshots.ts --build <name> | --all');
    process.exit(1);
  }
  for (const build of targets) {
    if (!ROSTER[build]) {
      console.error(`${build} is not one of the eight. Known: ${Object.keys(ROSTER).join(', ')}`);
      process.exit(1);
    }
  }

  const outDir = join(root, 'site', 'public', 'screenshots');
  mkdirSync(outDir, { recursive: true });

  let failed = 0;
  for (const build of targets) {
    // One retry: this machine's network stack occasionally drops the first
    // connection to a freshly opened local port (`fetch failed`,
    // `net::ERR_ABORTED`), unrelated to which build or port is involved.
    // A second attempt with a fresh Chrome has always cleared it in testing.
    let lastError: Error | undefined;
    let ok = false;
    for (let attempt = 1; attempt <= 2 && !ok; attempt += 1) {
      try {
        await captureBuild(build, outDir);
        ok = true;
      } catch (error) {
        lastError = error as Error;
        if (attempt === 1) console.error(`${build}: attempt 1 failed (${lastError.message}), retrying`);
      }
    }
    if (ok) {
      console.log(`${build}: wrote ${build}-1440.webp and ${build}-375.webp`);
    } else {
      failed += 1;
      console.error(`${build}: ${lastError?.message}`);
    }
  }

  // puppeteer-core leaves a handle open on the WebSocket transport even after
  // disconnect(), which keeps the event loop alive. Exit explicitly rather
  // than let a screenshot run hang forever after its last line of output.
  process.exit(failed > 0 ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) void main();
