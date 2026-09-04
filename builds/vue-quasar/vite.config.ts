import vue from '@vitejs/plugin-vue';
import { quasar, transformAssetUrls } from '@quasar/vite-plugin';
import { defineConfig } from 'vite';

/**
 * The same settings as `baselines/vue`, plus what Quasar needs: the official
 * Vite plugin, which per-component-imports and tree-shakes the library rather
 * than bundling the whole framework. `sassVariables: true` uses Quasar's own
 * default color palette instead of a hand-authored variables file, since this
 * screen has no brand palette of its own. No manual chunking and no
 * external-ing Quasar: that would move weight out of the number the
 * comparison is about.
 */
export default defineConfig({
  plugins: [vue({ template: { transformAssetUrls } }), quasar({ sassVariables: true })],
  server: { port: 5180, strictPort: true },
  build: { outDir: 'dist', target: 'es2022', sourcemap: false },
});
