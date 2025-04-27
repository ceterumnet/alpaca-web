<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useUIPreferencesStore } from '@/stores/useUIPreferencesStore'
import { useUnifiedStore } from '@/stores/UnifiedStore'

// Get stores
const uiStore = useUIPreferencesStore()
const unifiedStore = useUnifiedStore()
const route = useRoute()

// Navigation links
const navLinks = [
  { name: 'Home', path: '/', icon: 'home' },
  { name: 'Devices', path: '/devices', icon: 'devices' },
  { name: 'Discovery', path: '/discovery', icon: 'search' },
  { name: 'UI Demo', path: '/ui-demo', icon: 'palette' },
  { name: 'Settings', path: '/settings', icon: 'gear' }
]

// Toggle between dark and light mode
function toggleDarkMode() {
  // Toggle the value in the store
  uiStore.isDarkMode = !uiStore.isDarkMode

  // Apply directly to document
  if (uiStore.isDarkMode) {
    document.documentElement.classList.add('dark-theme')
  } else {
    document.documentElement.classList.remove('dark-theme')
  }

  // Save preference
  localStorage.setItem('dark-theme-preference', uiStore.isDarkMode.toString())
}

// Use ref instead of computed for window size detection
const isMobile = ref(false)

// Check if mobile on mount and when window resizes
function updateMobileStatus() {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  // Set initial value
  updateMobileStatus()

  // Add event listener for window resize
  window.addEventListener('resize', updateMobileStatus)
})

onUnmounted(() => {
  // Clean up event listener
  window.removeEventListener('resize', updateMobileStatus)
})

// Get connected device count
const connectedDeviceCount = computed(() => {
  return unifiedStore.connectedDevices.length
})

// Total device count
const totalDeviceCount = computed(() => {
  return unifiedStore.devicesList.length
})
</script>

<template>
  <nav class="navigation-bar">
    <div class="nav-left">
      <div class="app-logo">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
        </svg>
      </div>
      <h1 v-if="!isMobile" class="app-title">Alpaca Web</h1>

      <!-- Navigation links -->
      <div class="nav-links">
        <RouterLink
          v-for="link in navLinks"
          :key="link.path"
          :to="link.path"
          class="nav-link"
          :class="{ active: route.path === link.path }"
        >
          <span class="nav-icon" :class="link.icon"></span>
          <span v-if="!isMobile" class="nav-text">{{ link.name }}</span>
        </RouterLink>
      </div>
    </div>

    <div class="nav-right">
      <!-- Device status indicator -->
      <div v-if="totalDeviceCount > 0" class="device-status">
        <span class="status-indicator">
          {{ connectedDeviceCount }} / {{ totalDeviceCount }} devices connected
        </span>
      </div>

      <!-- Theme toggle button -->
      <button
        class="theme-toggle"
        :title="uiStore.isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
        @click="toggleDarkMode"
      >
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
        <span v-if="!isMobile">{{ uiStore.isDarkMode ? 'Light Mode' : 'Dark Mode' }}</span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.navigation-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  background-color: var(--aw-panel-bg-color);
  border-bottom: 1px solid var(--aw-panel-border-color);
  padding: 0 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  width: 100%;
  box-sizing: border-box;
}

.nav-left,
.nav-right {
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
  margin-right: 20px;
}

.nav-links {
  display: flex;
  align-items: center;
}

.nav-link {
  color: var(--aw-panel-menu-bar-color);
  text-decoration: none;
  margin-right: 15px;
  padding: 8px 12px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  transition: background-color 0.2s ease;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.nav-link.active {
  background-color: var(--aw-panel-resize-bg-color);
  color: var(--aw-panel-resize-color);
}

.nav-icon {
  margin-right: 8px;
  font-size: 1.2rem;
}

.theme-toggle {
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

.theme-toggle:hover {
  background-color: var(--aw-panel-resize-bg-color);
}

.device-status {
  margin-right: 16px;
}

.status-indicator {
  font-size: 0.85rem;
  color: var(--aw-panel-menu-bar-color);
  background-color: var(--aw-panel-menu-bar-bg-color);
  padding: 4px 8px;
  border-radius: 12px;
}

/* Responsive styles */
@media (max-width: 768px) {
  .navigation-bar {
    padding: 0 10px;
  }

  .nav-link {
    padding: 8px;
    margin-right: 8px;
  }

  .theme-toggle {
    padding: 8px;
  }
}

/* Icon styles */
.home::before {
  content: '🏠';
}

.devices::before {
  content: '📡';
}

.search::before {
  content: '🔍';
}

.palette::before {
  content: '🎨';
}
</style>
