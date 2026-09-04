/**
 * The preset comes from @uilc/criteria so all ten apps run Jest the same way,
 * but `packages/criteria/jest-preset.json` is not valid JSON: its `transform` key
 * is `"^.+\.(t|j)sx?$"`, and `\.` is not a legal JSON escape (it needs `\\.`), so
 * `JSON.parse` throws before any build can load it, whether through the
 * package's `./jest-preset` export or a direct path. Filed for the phase one
 * owner (see handoff.md, gotchas). This inlines the same settings, correctly
 * escaped, plus the `.vue` and PrimeVue wiring this build needs, rather than
 * touching that shared file from inside a build.
 *
 * This runs Jest in plain CommonJS mode, not the ESM mode react-headless uses.
 * Two reasons:
 *   - `@vue/vue3-jest` always runs a Vue SFC's compiled `<template>` through
 *     `@babel/core` with no `caller` metadata, so `@babel/preset-env` never
 *     sees an ESM-capable caller and downlevels it to CommonJS regardless of
 *     Jest's own ESM settings. A `.vue` file's transformed output is
 *     CommonJS no matter what this config asks for, so asking Jest to link it
 *     as an ES module fails with "does not provide an export named 'default'".
 *   - PrimeVue ships `.mjs` only, no CommonJS build, which is normally the
 *     reason to prefer ESM mode. Under CommonJS mode those files instead need
 *     `transformIgnorePatterns` to stop excluding them and a transform that
 *     downlevels them, which `ts-jest` does for plain JS too (`allowJs`).
 */
export default {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.vue$': '@vue/vue3-jest',
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { types: ['jest', 'node'] } }],
    '^.+\\.m?js$': [
      'ts-jest',
      { tsconfig: { allowJs: true, module: 'commonjs', target: 'es2020', esModuleInterop: true }, isolatedModules: true },
    ],
  },
  // PrimeVue (and its @primevue/* and @primeuix/* dependencies) publish ESM
  // only, so the default "don't transform node_modules" has to make an
  // exception for them or Jest's CommonJS loader chokes on their `import`.
  transformIgnorePatterns: ['node_modules/(?!.*(primevue|primeuix))'],
  moduleFileExtensions: ['vue', 'ts', 'tsx', 'js', 'mjs', 'json'],
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  testTimeout: 15000,
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  setupFiles: ['<rootDir>/test/setup.ts'],
  reporters: ['default', '<rootDir>/test/reporter.cjs'],
};
