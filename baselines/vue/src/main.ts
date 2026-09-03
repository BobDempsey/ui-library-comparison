import { createApp, h } from 'vue';

/**
 * Mounts Vue 3 and renders nothing. Its gzipped size is the framework floor
 * subtracted from every Vue build's total. Never published.
 */
createApp({ render: () => h('div') }).mount('#app');
