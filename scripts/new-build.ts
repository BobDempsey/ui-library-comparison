/**
 * Stamps `templates/build` into `builds/<name>`. Eight builds starting from the
 * same package.json shape, the same Jest wiring, and the same adapter stub is
 * what lets CI run a matrix without special casing a library.
 *
 *   pnpm new-build react-shadcn
 *
 * A build starts from `templates/common` plus the `templates/react` or
 * `templates/vue` overlay, so all eight arrive with the same scripts, the same
 * Jest wiring, and a screen component already loading the fixture.
 *
 * The library name, framework, and kind come from the roster below, so a typo
 * fails here rather than showing up as a mislabelled row in the write-up.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ROSTER } from './roster.js';

const root = fileURLToPath(new URL('..', import.meta.url));

function stamp(dir: string, tokens: Record<string, string>): void {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      stamp(path, tokens);
      continue;
    }
    let text = readFileSync(path, 'utf8');
    for (const [token, value] of Object.entries(tokens)) {
      text = text.split(token).join(value);
    }
    writeFileSync(path, text, 'utf8');
    if (path.endsWith('.tmpl')) renameSync(path, path.slice(0, -'.tmpl'.length));
  }
}

const name = process.argv[2];
if (!name) {
  console.error(`usage: pnpm new-build <name>\nknown builds: ${Object.keys(ROSTER).join(', ')}`);
  process.exit(1);
}

const entry = ROSTER[name];
if (!entry) {
  console.error(`${name} is not one of the eight. Known: ${Object.keys(ROSTER).join(', ')}`);
  process.exit(1);
}

const target = join(root, 'builds', name);
if (existsSync(target)) {
  console.error(`${target} already exists. A build is scaffolded once and then owned by one worker.`);
  process.exit(1);
}

mkdirSync(join(root, 'builds'), { recursive: true });
// Common first, then the framework overlay on top. React and Vue differ in the
// entry file, the Vite plugin, and the dependencies, and nothing else.
cpSync(join(root, 'templates', 'common'), target, { recursive: true });
cpSync(join(root, 'templates', entry.framework), target, { recursive: true, force: true });
stamp(target, {
  __BUILD__: name,
  __LIBRARY__: entry.library,
  __FRAMEWORK__: entry.framework === 'react' ? 'React' : 'Vue 3',
  __KIND__: entry.kind,
});

console.log(`created builds/${name} for ${entry.library}`);
console.log('next: pnpm install, then read spec/screen-spec.md sections 2 to 9');
