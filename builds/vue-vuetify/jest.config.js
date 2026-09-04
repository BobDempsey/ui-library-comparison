/**
 * The preset comes from @uilc/criteria so all ten apps run Jest the same way.
 * Add setup files if your library needs them. Do not change the transform or the
 * environment, or the suite stops being the same suite.
 */
/**
 * `packages/criteria/jest-preset.json` is not valid JSON: its `transform` key is
 * `"^.+\.(t|j)sx?$"`, and `\.` is not a legal JSON escape (it needs `\\.`), so
 * `JSON.parse` throws before any build can load it, whether through the
 * package's `./jest-preset` export or a direct path. Filed for the phase one
 * owner (see `builds/react-headless/jest.config.js` for the same note on the
 * first build). This inlines the same settings, correctly escaped, plus a
 * `.vue` transform, rather than touching that file from inside a build.
 *
 * Unlike react-headless, this runs Jest in its classic CommonJS mode rather
 * than under `--experimental-vm-modules`: `@vue/vue3-jest` compiles `<script
 * setup>` blocks to CommonJS output, and Jest's native-ESM loader rejects that
 * output when a file's extension is marked ESM (`does not provide an export
 * named 'default'`). Running Jest in plain CJS mode transforms every `.ts`
 * file (including the workspace's `type: module` packages, like
 * `@uilc/fixture`) to CommonJS uniformly, which sidesteps the mismatch.
 */
export default {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.vue$': '@vue/vue3-jest',
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.js$': 'babel-jest',
  },
  // Vuetify ships ESM-only (no CommonJS build), so its `node_modules` source
  // has to be transformed like application code rather than skipped, the way
  // Jest treats `node_modules` by default. pnpm nests the real package under
  // `node_modules/.pnpm/vuetify@<version>/node_modules/vuetify/...`, so the
  // usual `/node_modules/(?!pkg)` recipe (written for a flat node_modules)
  // has to target the `.pnpm/<pkg>@` segment instead.
  transformIgnorePatterns: ['node_modules/\\.pnpm/(?!vuetify@)'],
  moduleFileExtensions: ['vue', 'ts', 'js', 'json'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Jest's CJS-oriented transform pipeline chokes on Vue's default
    // `vue.runtime.esm-bundler.js` entry point (a raw `import` statement in a
    // node_modules file Jest does not transform by default). Point it at the
    // package's own CJS build instead, which is what most Jest + Vue 3 setups do.
    '^vue$': 'vue/dist/vue.cjs.js',
    '\\.(css|sass|scss)$': '<rootDir>/test/styleMock.cjs',
  },
  testTimeout: 15000,
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  setupFiles: ['<rootDir>/test/setup.ts'],
  reporters: ['default', '<rootDir>/test/reporter.cjs'],
};
