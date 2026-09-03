import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

/**
 * The same settings as `baselines/vue`, so the delta subtracts like for like.
 * No manual chunking and no external-ing PrimeVue: that would move weight out
 * of the number the comparison is about.
 */
export default defineConfig({
  plugins: [vue()],
  build: { outDir: 'dist', target: 'es2022', sourcemap: false },
});
