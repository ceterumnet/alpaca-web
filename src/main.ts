// import 'materialize-css/dist/css/materialize.min.css'
import './assets/main.css'
// import '@primevue/themes/aura/'
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'

const app = createApp(App)

app.use(createPinia())
// app.use(PrimeVue, { theme: { preset: Aura, prefix: 'p' } })
app.mount('#app')
