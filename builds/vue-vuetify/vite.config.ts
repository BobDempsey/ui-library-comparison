import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import vuetify from 'vite-plugin-vuetify';

/**
 * The same settings as `baselines/vue`, so the delta subtracts like for like.
 * No manual chunking and no external-ing Vuetify: that would move weight out
 * of the number the comparison is about. `vite-plugin-vuetify` only adds
 * automatic per-component imports (the standard way Vuetify is installed with
 * Vite); it does not chunk or externalize anything.
 */
export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: true })],
  server: { port: 5178, strictPort: true },
  build: { outDir: 'dist', target: 'es2022', sourcemap: false },
});
