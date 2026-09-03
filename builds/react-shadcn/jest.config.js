/**
 * The preset comes from @bakeoff/criteria so all ten apps run Jest the same way.
 * Add setup files if your library needs them. Do not change the transform or the
 * environment, or the suite stops being the same suite.
 */
/**
 * `packages/criteria/jest-preset.json` is not valid JSON: its `transform` key is
 * `"^.+\.(t|j)sx?$"`, and `\.` is not a legal JSON escape (it needs `\\.`), so
 * `JSON.parse` throws before any build can load it, whether through the
 * package's `./jest-preset` export or a direct path. Filed for the phase one
 * owner (react-headless hit the same thing first). This inlines the same
 * settings, correctly escaped, rather than touching that file from inside a
 * build, and adds a `moduleNameMapper` entry for the `@/` alias vite.config.ts
 * declares for shadcn/ui's `@/components/ui`, `@/lib` imports.
 */
export default {
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.(t|j)sx?$': ['ts-jest', { useESM: true, tsconfig: { jsx: 'react-jsx' } }],
  },
  moduleNameMapper: {
    '^@/(.*)\\.js$': '<rootDir>/src/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testTimeout: 15000,
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  setupFiles: ['<rootDir>/test/setup.ts'],
  reporters: ['default', '<rootDir>/test/reporter.cjs'],
};
