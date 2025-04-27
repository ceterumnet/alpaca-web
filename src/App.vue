<script setup lang="ts">
// import '@primevue/themes'
import { computed, onMounted } from 'vue'
import { useUIPreferencesStore } from './stores/useUIPreferencesStore'
import './assets/colors.css' // Import the CSS
import NavigationBarMigrated from './components/NavigationBarMigrated.vue'
import NotificationCenterMigrated from './components/NotificationCenterMigrated.vue'

// Get stores
const uiStore = useUIPreferencesStore()

// Define theme styles based on dark mode
const themeStyles = computed(() => {
  if (uiStore.isDarkMode) {
    return {
      '--aw-bg-color': '#1a0000',
      '--aw-color': '#ff9e9e',
      '--aw-panel-bg-color': '#2d0000',
      '--aw-panels-bg-color': '#220000',
      '--aw-panel-resize-bg-color': '#700000',
      '--aw-panel-resize-color': '#ff6b6b',
      '--aw-panel-border-color': '#5a0000',
      '--aw-panel-menu-bar-color': '#ffcaca',
      '--aw-panel-menu-bar-bg-color': '#4d0000',
      '--aw-panel-content-bg-color': '#2d0000',
      '--aw-panel-content-color': '#ffd5d5',
      '--aw-panel-scrollbar-color-1': '#8b0000',
      '--aw-panel-scrollbar-color-2': '#6b0000',
      '--aw-text-color': '#ffd5d5',
      '--aw-form-bg-color': '#2d0000',
      '--aw-input-bg-color': '#4d0000'
    }
  } else {
    return {
      '--aw-bg-color': 'white',
      '--aw-color': 'black',
      '--aw-panel-bg-color': 'white',
      '--aw-panel-menu-bar-color': 'white',
      '--aw-panels-bg-color': 'white',
      '--aw-panel-resize-bg-color': '#93d4ff',
      '--aw-panel-resize-color': 'white',
      '--aw-panel-border-color': 'rgb(39, 39, 39)',
      '--aw-panel-menu-bar-bg-color': '#6b6b6b',
      '--aw-panel-content-bg-color': 'rgb(225, 225, 225)',
      '--aw-panel-content-color': 'rgb(2, 2, 2)',
      '--aw-text-color': 'rgb(2, 2, 2)',
      '--aw-form-bg-color': 'white',
      '--aw-input-bg-color': 'white'
    }
  }
})

onMounted(() => {
  console.log('App mounted')

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

  console.log('Initial dark mode:', uiStore.isDarkMode)
  console.log('Has dark-theme class:', document.documentElement.classList.contains('dark-theme'))
})
</script>

<template>
  <div class="app-container" :style="themeStyles">
    <!-- Main content area without sidebar -->
    <div class="app-content">
      <!-- Use the migrated navigation bar component -->
      <NavigationBarMigrated />

      <main class="main-content">
        <!-- Router view with transition -->
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>

      <!-- Global notification center -->
      <NotificationCenterMigrated />
    </div>
  </div>
</template>

<style>
/* Global styles */
:root {
  --header-height: 60px;
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
</style>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.app-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  background-color: var(--aw-panels-bg-color);
}
</style>
