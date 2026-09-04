/**
 * Scores one build against section 10 and writes `results/<build>.json`.
 *
 *   pnpm --filter @uilc/react-shadcn measure
 *   pnpm measure --build react-shadcn --all
 *
 * Bundle size and the ergonomics counts are read off the build output and the
 * source, so nobody types them. The two numbers a script cannot see, how many
 * section 9 requirements needed custom code and whether the modal, select, and
 * toast were hand built, come from a `comparison.json` the build declares. They are
 * counts, not opinions, and the write-up quotes them next to the automated ones.
 *
 * `results/` is committed. A scoring run then shows up as a diff a reader can check.
 */
import { gzipSync } from 'node:zlib';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUNDLE_BUDGET_KB, type BuildResult } from '../packages/harness/src/index.js';
import { ROSTER } from './roster.js';

const root = fileURLToPath(new URL('..', import.meta.url));

/** The fixture chunk is excluded from the total. Section 10 measures library weight. */
const FIXTURE_CHUNK = /^(tickets|data)-[A-Za-z0-9_-]+\.js$/;
const COUNTED = /\.(js|css|html)$/;

interface Declared {
  /** Section 9 requirements the library did not meet without custom code. */
  requirementsNeedingCustomCode: number;
  handBuilt: { modal: boolean; select: boolean; toast: boolean };
  /** Filled by the test run, so a failing suite cannot be scored as passing. */
  axeViolationsBeforeFixes?: number;
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function gzipKb(paths: string[]): number {
  const total = paths.reduce((sum, p) => sum + gzipSync(readFileSync(p)).byteLength, 0);
  return Math.round((total / 1024) * 100) / 100;
}

function bundleOf(dir: string): { totalGzipKb: number; fixtureGzipKb: number } {
  const emitted = walk(join(dir, 'dist')).filter((p) => COUNTED.test(p));
  if (emitted.length === 0) throw new Error(`${relative(root, dir)}: no dist output, run build first`);
  const fixture = emitted.filter((p) => FIXTURE_CHUNK.test(basename(p)));
  return { totalGzipKb: gzipKb(emitted.filter((p) => !fixture.includes(p))), fixtureGzipKb: gzipKb(fixture) };
}

/** Lines of application code, blank lines and comment-only lines dropped. */
function countAppCode(dir: string): number {
  return walk(join(dir, 'src'))
    .filter((p) => /\.(ts|tsx|vue|css)$/.test(p))
    .reduce((sum, p) => {
      const lines = readFileSync(p, 'utf8')
        .split('\n')
        .filter((l) => l.trim() !== '' && !/^\s*(\/\/|\/\*|\*)/.test(l));
      return sum + lines.length;
    }, 0);
}

function countImports(dir: string, library: string): number {
  const pkg = librarySpecifier(library);
  return walk(join(dir, 'src'))
    .filter((p) => /\.(ts|tsx|vue)$/.test(p))
    .reduce((sum, p) => {
      const source = readFileSync(p, 'utf8');
      const matches = source.match(new RegExp(`from ['"]${pkg}`, 'g'));
      return sum + (matches?.length ?? 0);
    }, 0);
}

/** `any`, `as unknown as`, and `@ts-expect-error`, counted the same way for all eight. */
function countTypeEscapes(dir: string): number {
  return walk(join(dir, 'src'))
    .filter((p) => /\.(ts|tsx|vue)$/.test(p))
    .reduce((sum, p) => {
      const source = readFileSync(p, 'utf8');
      const hits = source.match(/\bas\s+any\b|:\s*any\b|as unknown as|@ts-expect-error|@ts-ignore/g);
      return sum + (hits?.length ?? 0);
    }, 0);
}

function librarySpecifier(library: string): string {
  const map: Record<string, string> = {
    'shadcn/ui': '@/components/ui',
    'Material UI': '@mui',
    'Chakra UI': '@chakra-ui',
    'Ant Design': 'antd',
    'Headless UI': '@headlessui',
    Vuetify: 'vuetify',
    PrimeVue: 'primevue',
    Quasar: 'quasar',
  };
  const specifier = map[library];
  if (!specifier) throw new Error(`no import specifier known for ${library}`);
  return specifier;
}

function readDeclared(dir: string, build: string): Declared {
  const path = join(dir, 'comparison.json');
  if (!existsSync(path)) {
    throw new Error(
      `${build}: comparison.json is missing. Declare requirementsNeedingCustomCode and handBuilt before scoring.`,
    );
  }
  return JSON.parse(readFileSync(path, 'utf8')) as Declared;
}

/**
 * Lighthouse needs a served build and a browser, so CI supplies the median and a
 * local run records zero rather than inventing one. A published result with
 * `runs: 0` says the number has not been taken yet.
 */
function readLighthouse(dir: string): { lighthouseFcpMsMedian: number; runs: number } {
  const path = join(dir, 'lighthouse.json');
  if (!existsSync(path)) return { lighthouseFcpMsMedian: 0, runs: 0 };
  const raw = JSON.parse(readFileSync(path, 'utf8')) as { fcpMs: number[] };
  const sorted = [...raw.fcpMs].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  return { lighthouseFcpMsMedian: Math.round(median), runs: sorted.length };
}

/** Jest writes this after the shared suite runs, so a score always states what passed. */
function readCriteria(dir: string): BuildResult['criteria'] {
  const path = join(dir, 'criteria-results.json');
  if (!existsSync(path)) return { passed: 0, failed: 18, failedNumbers: Array.from({ length: 18 }, (_, i) => i + 1) };
  return JSON.parse(readFileSync(path, 'utf8')) as BuildResult['criteria'];
}

export function measure(build: string): BuildResult {
  const entry = ROSTER[build];
  if (!entry) throw new Error(`${build} is not one of the eight. Known: ${Object.keys(ROSTER).join(', ')}`);

  const dir = join(root, 'builds', build);
  if (!existsSync(dir)) throw new Error(`builds/${build} does not exist`);

  const baselineDir = join(root, 'baselines', entry.framework);
  const { totalGzipKb } = bundleOf(dir);
  const baselineGzipKb = bundleOf(baselineDir).totalGzipKb;
  const declared = readDeclared(dir, build);

  return {
    build,
    library: entry.library,
    framework: entry.framework,
    kind: entry.kind,
    bundle: {
      totalGzipKb,
      baselineGzipKb,
      deltaGzipKb: Math.round((totalGzipKb - baselineGzipKb) * 100) / 100,
      overBudget: totalGzipKb > BUNDLE_BUDGET_KB,
    },
    accessibility: {
      axeViolationsBeforeFixes: declared.axeViolationsBeforeFixes ?? 0,
      requirementsNeedingCustomCode: declared.requirementsNeedingCustomCode,
    },
    ergonomics: {
      linesOfAppCode: countAppCode(dir),
      libraryImports: countImports(dir, entry.library),
      typeEscapes: countTypeEscapes(dir),
      handBuilt: declared.handBuilt,
    },
    render: readLighthouse(dir),
    criteria: readCriteria(dir),
  };
}

function main(): void {
  const args = process.argv.slice(2);
  const all = args.includes('--all');
  const flagged = args[args.indexOf('--build') + 1];
  const targets = all ? Object.keys(ROSTER) : [flagged].filter((n): n is string => Boolean(n) && n !== '--all');

  if (targets.length === 0) {
    console.error('usage: tsx scripts/measure.ts --build <name> | --all');
    process.exit(1);
  }

  mkdirSync(join(root, 'results'), { recursive: true });
  let failed = 0;

  for (const build of targets) {
    try {
      const result = measure(build);
      writeFileSync(join(root, 'results', `${build}.json`), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
      const { totalGzipKb, deltaGzipKb, overBudget } = result.bundle;
      const budget = overBudget ? `OVER the ${BUNDLE_BUDGET_KB} KB budget` : 'within budget';
      console.log(`${build}: ${totalGzipKb} KB total, ${deltaGzipKb} KB delta, ${budget}`);
      if (result.criteria.failed > 0) {
        console.log(`  criteria failed: ${result.criteria.failedNumbers.join(', ')}`);
      }
    } catch (error) {
      failed += 1;
      console.error(`${build}: ${(error as Error).message}`);
    }
  }

  if (failed > 0) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
