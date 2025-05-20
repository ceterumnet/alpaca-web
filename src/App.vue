// Status: Good - Core Component 
// This is the main application component that: 
// - Serves as the application root 
// - Manages global layout and routing 
// - Handles device connection state 
// - Provides global UI components 
// - Maintains application-wide state
// - Initiates automatic device discovery

<script setup lang="ts">
// import '@primevue/themes'
import { computed, onMounted, ref } from 'vue'
import { useUIPreferencesStore } from '@/stores/useUIPreferencesStore'
import { useNotificationStore } from '@/stores/useNotificationStore'
import { useEnhancedDiscoveryStore } from '@/stores/useEnhancedDiscoveryStore'
import { useLogger } from 'vue-logger-plugin' // Import useLogger
// import '@/assets/colors.css' // Import the CSS
import NavigationBar from '@/components/layout/NavigationBar.vue'
import NotificationCenter from '@/components/ui/NotificationCenter.vue'
import NotificationManager from '@/components/ui/NotificationManager.vue'
import Icon from '@/components/ui/Icon.vue' // Import Icon component

// Get stores
const uiStore = useUIPreferencesStore()
const notificationStore = useNotificationStore()
const discoveryStore = useEnhancedDiscoveryStore()
const log = useLogger() // Get logger instance

// Show/hide notification manager
const showNotificationManager = ref(false)

// Define theme styles based on dark mode
const themeStyles = computed(() => {
  return {
    'font-family': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  }
})

// Toggle notification manager
function toggleNotificationManager() {
  showNotificationManager.value = !showNotificationManager.value

  // Create a test notification when opening the manager
  if (showNotificationManager.value) {
    notificationStore.showInfo('Notification manager opened', {
      autoDismiss: true,
      position: 'top-right',
      duration: 3000
    })
  }
}

// Function to run discovery with a delay after app start
function runInitialDiscovery() {
  // Start an initial discovery after a short delay
  setTimeout(async () => {
    try {
      await discoveryStore.discoverDevices({ timeout: 3000 })
      log.info('Initial device discovery completed') // Use log instead of this.$log
    } catch (error) {
      log.error('Initial device discovery failed:', error) // Use log instead of this.$log
    }
  }, 2000) // Wait 2 seconds after app load before starting discovery
}

onMounted(() => {
  log.info('App mounted') // Use log instead of this.$log

  // Check for stored preference
  const storedPref = localStorage.getItem('dark-theme-preference')
  if (storedPref !== null) {
    uiStore.isDarkMode = storedPref === 'true'
  }

  // Apply theme on initial load
  if (uiStore.isDarkMode) {
    document.documentElement.classList.add('dark-theme')
  } else {
    document.documentElement.classList.remove('dark-theme')
  }

  log.debug('Initial dark mode:', uiStore.isDarkMode) // Use log instead of this.$log
  log.debug('Has dark-theme class:', document.documentElement.classList.contains('dark-theme')) // Use log instead of this.$log

  // Create a welcome notification
  setTimeout(() => {
    notificationStore.showSuccess('Welcome to Alpaca Web', {
      autoDismiss: true,
      position: 'top-right',
      duration: 5000
    })
  }, 1000)
  
  // Start automatic device discovery
  runInitialDiscovery()
})
</script>

<template>
  <div class="app-container" :class="{ 'dark-theme': uiStore.isDarkMode }" :style="themeStyles">
    <!-- Main app structure -->
    <div class="app-layout">
      <div class="main-content-area">
        <NavigationBar>
          <template #actions>
            <button
              class="nav-icon-button"
              title="Open Notification Manager"
              @click="toggleNotificationManager"
            >
              <Icon type="bell" size="20" />
            </button>
          </template>
        </NavigationBar>

        <main class="main-content">
          <!-- Router view with transition -->
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </main>
      </div>
    </div>

    <!-- Global notification center -->
    <NotificationCenter />

    <!-- Notification Manager Modal -->
    <transition name="fade">
      <div
        v-if="showNotificationManager"
        class="notification-modal-backdrop"
        @click="showNotificationManager = false"
      >
        <div class="notification-modal" @click.stop>
          <div class="notification-modal-header">
            <h2>Notification Manager</h2>
            <button class="close-button" @click="showNotificationManager = false">×</button>
          </div>
          <div class="notification-modal-body">
            <NotificationManager />
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style>
/* Global styles */
:root {
  --header-height: 60px;

  /* Font sizes */
  --font-size-xs: 0.75rem; /* 12px */
  --font-size-sm: 0.875rem; /* 14px */
  --font-size-base: 1rem; /* 16px */
  --font-size-lg: 1.125rem; /* 18px */
  --font-size-xl: 1.25rem; /* 20px */
  --font-size-2xl: 1.5rem; /* 24px */

  /* Font weights */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-bold: 600;
  --font-weight-extrabold: 700;

  /* Line heights */
  --line-height-tight: 1.2;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;

  /* Spacing */
  --spacing-xs: 0.25rem; /* 4px */
  --spacing-sm: 0.5rem; /* 8px */
  --spacing-md: 1rem; /* 16px */
  --spacing-lg: 1.5rem; /* 24px */
  --spacing-xl: 2rem; /* 32px */

  /* Border radius */
  --border-radius-sm: 4px;
  --border-radius-md: 8px;
  --border-radius-lg: 12px;
  --border-radius-xl: 16px;
  --border-radius-circle: 50%;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  height: 100%;
  width: 100%;
}

body {
  margin: 0;
  padding: 0;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    'Open Sans',
    'Helvetica Neue',
    sans-serif;
  font-size: var(--font-size-base);
  line-height: var(--line-height-normal);
  background-color: var(--aw-bg-color);
  color: var(--aw-color);
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
}

.app-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--aw-bg-color);
  color: var(--aw-text-color);
}

.app-layout {
  display: flex;
  flex-direction: row;
  flex: 1;
  height: 100%;
  overflow: hidden;
}

.main-content-area {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow: auto;
  padding: 0;
  background-color: var(--aw-bg-color);
}

/* Typography classes */
h1,
h2,
h3,
h4,
h5,
h6 {
  margin-top: 0;
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  color: var(--aw-text-color);
}

h1 {
  font-size: var(--font-size-2xl);
}

h2 {
  font-size: var(--font-size-xl);
}

h3 {
  font-size: var(--font-size-lg);
}

p {
  margin-top: 0;
  margin-bottom: var(--spacing-md);
}

/* Add transition styles */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Notification Modal */
.notification-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.notification-modal {
  width: 90%;
  max-width: 800px;
  height: 80%;
  max-height: 800px;
  background-color: var(--aw-panel-bg-color);
  border-radius: var(--border-radius-lg);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.notification-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--aw-panel-border-color);
}

.notification-modal-header h2 {
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--aw-panel-content-color);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-modal-body {
  flex: 1;
  overflow: hidden;
}

.nav-icon-button {
  background: none;
  border: none;
  color: var(--aw-nav-text-color);
  cursor: pointer;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.nav-icon-button:hover {
  background-color: var(--aw-nav-hover-bg-color);
}

/*
.icon-notification::before {
  content: '🔔';
  font-size: 1.2rem;
}
*/
</style>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: var(--aw-bg-color);
  color: var(--aw-color);
}

.app-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.main-content-area {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow: auto;
  padding: 0;
  background-color: var(--aw-bg-color);
}
</style>
