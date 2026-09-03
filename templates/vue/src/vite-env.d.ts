/// <reference types="vite/client" />

/** Without this, tsc cannot see a `.vue` import and every screen file errors. */
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}
