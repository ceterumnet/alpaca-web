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
  { name: 'Devices', path: '/', icon: 'devices' },
  { name: 'Discovery', path: '/discovery', icon: 'search' },
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
        class="btn btn-secondary theme-toggle"
        :title="uiStore.isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
        @click="toggleDarkMode"
      >
        <span v-if="uiStore.isDarkMode">☀️ Light Mode</span>
        <span v-else>🌙 Dark Mode</span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.navigation-bar {
  height: var(--header-height);
  background-color: var(--aw-panel-menu-bar-bg-color);
  border-bottom: 1px solid var(--aw-panel-border-color);
  color: var(--aw-panel-menu-bar-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 10;
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
}

.nav-left {
  display: flex;
  align-items: center;
}

.nav-right {
  display: flex;
  align-items: center;
}

.app-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  color: var(--aw-panel-menu-bar-color);
}

.app-title {
  margin: 0;
  font-size: var(--font-size-xl);
  color: var(--aw-panel-menu-bar-color);
  font-weight: var(--font-weight-bold);
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
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: background-color 0.2s ease;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.15);
}

.nav-link.active {
  background-color: var(--aw-panel-resize-bg-color);
  color: var(--aw-panel-resize-color);
}

.nav-icon {
  margin-right: 8px;
  font-size: var(--font-size-base);
}

.device-status {
  margin-right: 16px;
}

.status-indicator {
  font-size: var(--font-size-xs);
  color: var(--aw-panel-menu-bar-color);
  background-color: rgba(0, 0, 0, 0.2);
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: var(--font-weight-medium);
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

.gear::before {
  content: '⚙️';
}
</style>
