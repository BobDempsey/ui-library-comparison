/**
 * `packages/criteria/jest-preset.json` is not valid JSON: its `transform` key is
 * `"^.+\.(t|j)sx?$"`, and `\.` is not a legal JSON escape (it needs `\\.`), so
 * `JSON.parse` throws before any build can load it, whether through the
 * package's `./jest-preset` export or a direct path. `react-headless` filed
 * this for the phase one owner and worked around it by inlining the same
 * settings, correctly escaped, in its own `jest.config.js` rather than editing
 * the shared file. This build hits the same bug and does the same thing.
 *
 * Unlike react-headless, this build runs Jest's classic (CommonJS) transform
 * pipeline rather than its native ESM mode: `@vue/vue3-jest` compiles `.vue`
 * files to CommonJS `require()`/`exports` regardless of Jest's ESM settings,
 * and mixing that with `--experimental-vm-modules` produced unresolvable
 * `ERR_REQUIRE_ESM` / "does not provide an export named 'default'" failures
 * once a `.vue` file's compiled output reached `@bakeoff/fixture` (an
 * ESM-only workspace package) or one of this build's own `.ts` composables.
 * ts-jest's default (non-ESM) output is CommonJS too, so pointing every
 * transform at CommonJS keeps the whole graph in one module system. ts-jest
 * still transpiles `@bakeoff/fixture`'s TypeScript source (its real path
 * resolves outside `node_modules` through the pnpm symlink, so the default
 * `transformIgnorePatterns` does not exempt it), so its `import`/`export` and
 * dynamic `import()` never reach Jest as raw ESM in the first place.
 */
export default {
  testEnvironment: 'jsdom',
  // Jest's jsdom environment defaults to the "browser" export condition, which
  // for the Vue package's exports map falls through to the esm-bundler build
  // (meant to be further processed by a bundler, not run directly). Vue's
  // "node" condition points at a build meant for direct execution instead.
  testEnvironmentOptions: { customExportConditions: ['node', 'node-addons'] },
  moduleFileExtensions: ['vue', 'ts', 'tsx', 'js', 'json'],
  transform: {
    '^.+\\.vue$': '@vue/vue3-jest',
    // Quasar's package resolves the bare specifier to an SSR-only CJS build by
    // default (its "require" export condition); that build throws without an
    // ssrContext outside actual SSR. The real client build only ships as ESM
    // source, so it needs the same CommonJS transpile as our own TypeScript
    // rather than a raw `require()`.
    'quasar\\.client\\.js$': ['ts-jest', { tsconfig: { allowJs: true, checkJs: false } }],
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'preserve' } }],
  },
  // Path separators differ by OS (pnpm's nested store puts this under a
  // `.pnpm\quasar@<version>\node_modules\...` directory on Windows), so this
  // matches on the literal directory/file names rather than `/`, and excludes
  // only the one file that needs transforming out of the default ignore.
  transformIgnorePatterns: ['node_modules(?!.*quasar\\.client\\.js)'],
  moduleNameMapper: {
    '^quasar$': '<rootDir>/node_modules/quasar/dist/quasar.client.js',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testTimeout: 15000,
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  setupFiles: ['<rootDir>/test/setup.ts'],
  reporters: ['default', '<rootDir>/test/reporter.cjs'],
};
