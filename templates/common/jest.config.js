/**
 * The preset comes from @bakeoff/criteria so all ten apps run Jest the same way.
 * Add setup files if your library needs them. Do not change the transform or the
 * environment, or the suite stops being the same suite.
 */
export default {
  preset: '@bakeoff/criteria/jest-preset',
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.test.ts'],
};
