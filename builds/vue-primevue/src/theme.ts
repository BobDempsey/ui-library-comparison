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

/**
 * PrimeVue's own default for `darkModeSelector` is `'system'`, which wraps
 * the preset's dark `colorScheme` tokens in `@media (prefers-color-scheme:
 * dark)`. This screen's own markup (`styles.css`) is light-only and never
 * offers a way to opt into dark mode, so on a system with a dark OS/browser
 * preference the PrimeVue-themed controls and table silently switched to the
 * preset's dark tokens while the surrounding page stayed on its hardcoded
 * light colors, splitting the screen. It also flipped the badges' inherited
 * text color to the dark scheme's near-white `text.color` against their own
 * fixed light-grey pill background, an unreadable pairing. Disabling dark
 * resolution keeps this screen on the preset's light `colorScheme` tokens
 * unconditionally, matching the light-only page it actually ships.
 */
export const options = { darkModeSelector: false };
