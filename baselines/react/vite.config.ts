import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/** Same build settings as every build, so the delta subtracts like for like. */
export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist', target: 'es2022', sourcemap: false },
});
