import { createApp } from 'vue';
import { createVuetify } from 'vuetify';
import TicketsScreen from './TicketsScreen.vue';
import './styles.css';

const vuetify = createVuetify();

createApp(TicketsScreen).use(vuetify).mount('#app');
