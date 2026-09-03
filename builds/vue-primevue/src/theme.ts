/**
 * `@primevue/themes/aura`'s default export merges token presets for all ~90
 * PrimeVue components, and Rollup cannot tree-shake the unused ones out of
 * that merge. This screen only mounts Button, DataTable/Paginator, Dialog,
 * ConfirmDialog, Select, MultiSelect, InputText, Message, and Skeleton, so the
 * preset is assembled from just those token modules rather than paying for
 * the other eighty. Shared by `main.ts` and the test adapter so both
 * configure PrimeVue identically.
 *
 * Imported from `@primeuix/themes` (declared as a direct dependency) rather
 * than through the `@primevue/themes/aura/<name>` subpaths the full preset
 * itself re-exports from there: `@primevue/themes`'s own `package.json`
 * exposes those subpaths under an `import` condition only, with no `require`
 * fallback, which Jest's CommonJS module resolution cannot follow. The
 * `@primeuix/themes` subpaths carry the same tokens with a `default`
 * fallback, so both the Vite build and the Jest suite resolve them the same
 * way.
 */
import base from '@primeuix/themes/aura/base';
import button from '@primeuix/themes/aura/button';
import confirmdialog from '@primeuix/themes/aura/confirmdialog';
import dialog from '@primeuix/themes/aura/dialog';
import inputtext from '@primeuix/themes/aura/inputtext';
import message from '@primeuix/themes/aura/message';
import multiselect from '@primeuix/themes/aura/multiselect';
import datatable from '@primeuix/themes/aura/datatable';
import paginator from '@primeuix/themes/aura/paginator';
import ripple from '@primeuix/themes/aura/ripple';
import select from '@primeuix/themes/aura/select';
import skeleton from '@primeuix/themes/aura/skeleton';

export const preset = {
  ...base,
  components: { button, confirmdialog, datatable, dialog, inputtext, message, multiselect, paginator, ripple, select, skeleton },
};
