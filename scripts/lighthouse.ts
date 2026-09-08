/**
 * Measures time to first render for one build, or all eight.
 *
 *   pnpm lighthouse --build react-shadcn
 *   pnpm lighthouse --all
 *
 * Section 10 asks for Lighthouse on the static build, median of 5 runs. This
 * serves `builds/<name>/dist` and drives Lighthouse against it, then writes
 * `builds/<name>/lighthouse.json` as `{ fcpMs: number[] }`. `scripts/measure.ts`
 * reads that file and takes the median, so this script records the runs and
 * never the summary; a rescore recomputes it.
 *
 * The number is first contentful paint in milliseconds under Lighthouse's
 * mobile defaults, which throttle CPU and network. It is a relative figure for
 * comparing eight builds measured the same way on the same machine, not an
 * absolute claim about any real device. The run count and the machine belong in
 * the write-up next to it.
 *
 * `lighthouse.json` is committed for the same reason `results/` is: a rerun
 * then shows up as a diff a reader can check.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { ROSTER } from './roster.js';

const root = fileURLToPath(new URL('..', import.meta.url));

/** Section 10 says median of 5. */
const RUNS = 5;

/** Away from the dev server ports in each `vite.config.ts`, so the two never collide. */
const PORT = 4180;

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/**
 * Serves one `dist` folder in this process rather than shelling out to
 * `vite preview`. A child process that outlives its kill keeps the port, and
 * the next build then measures the previous build's screen while reporting the
 * new build's name. An in-process server closes when this script says so.
 *
 * It gzips what it serves, because every static host does and because the
 * bundle number this comparison publishes is gzipped. Serving the raw bytes
 * under Lighthouse's throttling charges each library for compressible weight it
 * would never ship, and charges the biggest bundles most.
 */
function serve(distDir: string, port: number): Promise<Server> {
  const server = createServer((req, res) => {
    const path = (req.url ?? '/').split('?')[0] ?? '/';
    // Anything without an extension is a route, so it gets the SPA shell.
    const relative = extname(path) === '' ? 'index.html' : decodeURIComponent(path).replace(/^\/+/, '');
    const file = join(distDir, normalize(relative));
    if (!file.startsWith(distDir + sep) || !existsSync(file)) {
      res.writeHead(404).end('not found');
      return;
    }
    const type = CONTENT_TYPES[extname(file)] ?? 'application/octet-stream';
    const gzip = (req.headers['accept-encoding'] ?? '').includes('gzip');
    const body = readFileSync(file);
    res.writeHead(200, gzip ? { 'content-type': type, 'content-encoding': 'gzip' } : { 'content-type': type });
    res.end(gzip ? gzipSync(body) : body);
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

/**
 * Reads the served title back and compares it to the one in the build's own
 * `dist/index.html`. Every build titles its page after its library, so this
 * catches a stale server holding the port before five runs are spent on the
 * wrong screen. That is the bug the in-process server above removed, and this
 * is the check that would have caught it.
 */
async function assertServingBuild(url: string, distDir: string): Promise<void> {
  const titleOf = (html: string) => /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '';
  const expected = titleOf(readFileSync(join(distDir, 'index.html'), 'utf8'));
  const served = titleOf(await (await fetch(url)).text());
  if (served !== expected) throw new Error(`${url} served "${served}", expected "${expected}"`);
}

/**
 * One Lighthouse pass in its own Chrome, so a run never inherits the last one's
 * cache. Lighthouse runs as its CLI rather than as an import: it serialises its
 * own functions into the page, and under tsx's esbuild loader those arrive
 * carrying a `__name` helper the page does not have, so every run dies with
 * `__name is not defined`. A subprocess runs the published code untouched.
 */
async function firstContentfulPaint(url: string): Promise<number> {
  const dir = mkdtempSync(join(tmpdir(), 'uilc-lh-'));
  const out = join(dir, 'run.json');
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        'pnpm',
        [
          'exec',
          'lighthouse',
          url,
          '--only-audits=first-contentful-paint',
          '--output=json',
          `--output-path=${out}`,
          '--chrome-flags=--headless=new',
          '--quiet',
        ],
        { cwd: root, shell: process.platform === 'win32', stdio: ['ignore', 'ignore', 'pipe'] },
      );
      let stderr = '';
      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      child.on('error', reject);
      child.on('exit', (code) =>
        code === 0 ? resolve() : reject(new Error(`lighthouse exited with ${code}. ${stderr.trim()}`)),
      );
    });

    const report = JSON.parse(readFileSync(out, 'utf8')) as {
      audits: Record<string, { numericValue?: number } | undefined>;
    };
    const value = report.audits['first-contentful-paint']?.numericValue;
    if (typeof value !== 'number') throw new Error('Lighthouse returned no first-contentful-paint value');
    return Math.round(value);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export async function runBuild(build: string): Promise<number[]> {
  if (!ROSTER[build]) throw new Error(`${build} is not one of the eight. Known: ${Object.keys(ROSTER).join(', ')}`);

  const dir = join(root, 'builds', build);
  const distDir = join(dir, 'dist');
  if (!existsSync(join(distDir, 'index.html'))) {
    throw new Error(`builds/${build}/dist is missing. Run pnpm --filter @uilc/${build} build first`);
  }

  const server = await serve(distDir, PORT);
  try {
    const url = `http://localhost:${PORT}/tickets`;
    await assertServingBuild(url, distDir);
    const fcpMs: number[] = [];
    for (let i = 0; i < RUNS; i += 1) fcpMs.push(await firstContentfulPaint(url));
    writeFileSync(join(dir, 'lighthouse.json'), `${JSON.stringify({ fcpMs }, null, 2)}\n`, 'utf8');
    return fcpMs;
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const all = args.includes('--all');
  const flagged = args[args.indexOf('--build') + 1];
  const targets = all ? Object.keys(ROSTER) : [flagged].filter((n): n is string => Boolean(n) && n !== '--all');

  if (targets.length === 0) {
    console.error('usage: tsx scripts/lighthouse.ts --build <name> | --all');
    process.exit(1);
  }

  let failed = 0;
  for (const build of targets) {
    try {
      const fcpMs = await runBuild(build);
      console.log(`${build}: ${median(fcpMs)} ms median FCP over ${fcpMs.length} runs (${fcpMs.join(', ')})`);
    } catch (error) {
      failed += 1;
      console.error(`${build}: ${(error as Error).message}`);
    }
  }

  if (failed > 0) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) void main();
