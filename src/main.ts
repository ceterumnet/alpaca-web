// Status: Good - Core Component
// This is the application entry point that:
// - Initializes the Vue application
// - Sets up global plugins and components
// - Configures routing and state management
// - Mounts the application to the DOM
// - Establishes core application services

import './assets/main.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// Import panel components
import panelComponents from './components/panels'
import featureComponents from './components/panels/features'

// Create the app instance
const app = createApp(App)

// Create and configure the Pinia store
const pinia = createPinia()

// Add Pinia to the app
app.use(pinia)
app.use(router)

// Register panel and feature components
app.use(panelComponents)
app.use(featureComponents)

// Mount the app
app.mount('#app')
