import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * The same settings as `baselines/react`, so the delta subtracts like for like.
 * No manual chunking and no external-ing Ant Design: that would move weight out
 * of the number the comparison is about.
 */
export default defineConfig({
  plugins: [react()],
  server: { port: 5177, strictPort: true },
  build: { outDir: 'dist', target: 'es2022', sourcemap: false },
});
