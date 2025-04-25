<script setup lang="ts">
// import '@primevue/themes'
import { onMounted, watch } from 'vue'
import MainPanels from './components/MainPanels.vue'
import AppSidebar from './components/AppSidebar.vue'
import { useUIPreferencesStore } from './stores/useUIPreferencesStore'

// Get stores
const uiStore = useUIPreferencesStore()

// Watch for dark mode changes from the UI store
watch(
  () => uiStore.isDarkMode,
  (isDarkMode) => {
    if (isDarkMode) {
      document.body.classList.add('dark-theme')
    } else {
      document.body.classList.remove('dark-theme')
    }
  }
)

// Toggle between dark and light mode
function toggleDarkMode() {
  uiStore.toggleDarkMode()
}

onMounted(() => {
  console.log('App mounted')
  // Initialize dark mode
  uiStore.initializeDarkMode()
  // fetchConfiguredDevices()
})
</script>

<template>
  <div class="app-container" :class="{ 'sidebar-expanded': uiStore.isSidebarVisible }">
    <!-- Sidebar for navigation -->
    <AppSidebar />

    <!-- Main content area -->
    <div class="app-content">
      <header class="app-header">
        <div class="header-left">
          <div class="app-logo">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
          </div>
          <h1 class="app-title">Alpaca Web</h1>
        </div>

        <div class="header-right">
          <button class="header-button theme-toggle" @click="toggleDarkMode">
            <svg
              v-if="uiStore.isDarkMode"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="currentColor"
            >
              <path
                d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06z"
              ></path>
            </svg>
            <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path
                d="M9.37 5.51c-.18.64-.27 1.31-.27 1.99 0 4.08 3.32 7.4 7.4 7.4.68 0 1.35-.09 1.99-.27C17.45 17.19 14.93 19 12 19c-3.86 0-7-3.14-7-7 0-2.93 1.81-5.45 4.37-6.49zM12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"
              ></path>
            </svg>
            <span>{{ uiStore.isDarkMode ? 'Light' : 'Dark' }}</span>
          </button>
        </div>
      </header>

      <main class="main-content">
        <!-- Main panel system -->
        <MainPanels />
      </main>
    </div>
  </div>
</template>

<style>
/* Global styles */
:root {
  --sidebar-width: 240px;
  --sidebar-collapsed-width: 54px;
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
  margin-left: var(--sidebar-collapsed-width);
  width: calc(100% - var(--sidebar-collapsed-width));
  transition:
    margin-left 0.3s ease,
    width 0.3s ease;
}

.sidebar-expanded .app-content {
  margin-left: var(--sidebar-width);
  width: calc(100% - var(--sidebar-width));
}

.app-header {
  height: var(--header-height);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  background-color: var(--aw-panel-bg-color);
  border-bottom: 1px solid var(--aw-panel-border-color);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
}

.app-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  color: var(--aw-panel-content-color);
}

.app-title {
  margin: 0;
  font-size: 1.5rem;
  color: var(--aw-panel-content-color);
  font-weight: 600;
}

.header-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.header-button:hover {
  background-color: var(--aw-panel-resize-bg-color);
}

.theme-toggle {
  padding: 6px 12px;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background-color: var(--aw-panels-bg-color);
}
</style>
