import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import TicketsScreen from './TicketsScreen.vue';
import { options, preset } from './theme.js';
import './styles.css';

const app = createApp(TicketsScreen);
app.use(PrimeVue, { theme: { preset, options } });
app.use(ConfirmationService);
app.mount('#app');
