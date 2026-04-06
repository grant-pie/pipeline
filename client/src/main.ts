/**
 * main.ts — Application entry point.
 *
 * Creates the Vue app instance, installs plugins (Pinia for state management
 * and Vue Router for navigation), imports global styles, then mounts the app
 * onto the #app element in index.html.
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './assets/main.css';

const app = createApp(App);

app.use(createPinia()); // Register Pinia store manager
app.use(router);        // Register Vue Router

app.mount('#app');
