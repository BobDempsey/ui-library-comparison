import { createApp } from 'vue';
import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg';
import 'vuetify/styles';
import TicketsScreen from './TicketsScreen.vue';
import './styles.css';

/**
 * Two things `autoImport: true` in vite-plugin-vuetify does not do on its
 * own: it per-component-imports each `<v-*>` tag used, but it does not pull
 * in Vuetify's own base stylesheet (the `import 'vuetify/styles'` above),
 * and it does not configure an icon set. Without the first, `VField`'s
 * outlined-variant CSS (the floating label transition and the notch cut into
 * the outline) never loads, so an empty field shows its label sitting static
 * across the middle of the border instead of floated into the notch. Without
 * the second, Vuetify defaults to the `mdi` iconset, which expects the
 * `@mdi/font` icon font's CSS classes; with no font installed or linked, the
 * dropdown caret and other icons render as nothing.
 *
 * `mdi-svg` (bundled inside `vuetify` itself, no extra dependency) renders
 * icons as inline SVG paths instead of font glyphs, so it fixes the missing
 * caret without adding an icon font's weight to the bundle.
 */
const vuetify = createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
});

createApp(TicketsScreen).use(vuetify).mount('#app');
