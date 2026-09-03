import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

/** Same build settings as every build, so the delta subtracts like for like. */
export default defineConfig({
  plugins: [vue()],
  build: { outDir: 'dist', target: 'es2022', sourcemap: false },
});
