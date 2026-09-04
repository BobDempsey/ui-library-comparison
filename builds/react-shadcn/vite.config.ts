import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * The same settings as `baselines/react`, so the delta subtracts like for like.
 * No manual chunking and no external-ing shadcn/ui: that would move weight out
 * of the number the comparison is about. The Tailwind plugin and the `@` alias
 * are additions shadcn/ui itself requires (its components import from `@/lib`
 * and `@/components/ui`, and shadcn is Tailwind utility classes, not a CSS-in-JS
 * runtime).
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5174, strictPort: true },
  build: { outDir: 'dist', target: 'es2022', sourcemap: false },
});
