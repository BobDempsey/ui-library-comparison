/**
 * The preset comes from @bakeoff/criteria so all ten apps run Jest the same way.
 * `packages/criteria/jest-preset.json` is not valid JSON: its `transform` key is
 * `"^.+\.(t|j)sx?$"`, and `\.` is not a legal JSON escape (it needs `\\.`), so
 * `JSON.parse` throws before any build can load it. Filed for the phase one
 * owner; do not edit that shared file. This inlines the same settings,
 * correctly escaped, instead.
 */
export default {
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.(t|j)sx?$': ['ts-jest', { useESM: true, tsconfig: { jsx: 'react-jsx' } }],
  },
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  testTimeout: 15000,
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  setupFiles: ['<rootDir>/test/setup.ts'],
  reporters: ['default', '<rootDir>/test/reporter.cjs'],
};
