// Dev playground: mounts the canvas in a bare Vue 3 app (no Nuxt) - both a
// visual test bench and living proof the library has no Nuxt dependency.
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import PlaygroundApp from './PlaygroundApp.vue'

createApp(PlaygroundApp).use(createPinia()).mount('#app')
