import { createApp } from 'vue';
import { Quasar } from 'quasar';
import 'quasar/src/css/index.sass';
import TicketsScreen from './TicketsScreen.vue';
import './styles.css';

const app = createApp(TicketsScreen);
app.use(Quasar, { plugins: {} });
app.mount('#app');
