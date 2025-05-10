// Status: Updated - Core Navigation Component 
// This is the main navigation bar that: 
// - Integrates with new navigation components 
// - Provides primary navigation 
// - Shows device status
// - Handles theme switching 
// - Supports responsive design

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useUIPreferencesStore } from '@/stores/useUIPreferencesStore'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import Icon from '@/components/ui/Icon.vue'
import type { IconType } from '@/components/ui/Icon.vue'
import DiscoveryIndicator from '@/components/navigation/DiscoveryIndicator.vue'

// Get stores
const uiStore = useUIPreferencesStore()
const unifiedStore = useUnifiedStore()
const route = useRoute()

// Define interface for nav links with proper typing
interface NavLink {
  name: string
  path: string
  icon: IconType
  description: string
}

// Navigation links with improved structure
const navLinks: NavLink[] = [
  {
    name: 'Home',
    path: '/panel-layout',
    icon: 'files',
    description: 'Customizable panel layout view'
  },
  // {
  //   name: 'Layout Builder',
  //   path: '/layout-builder',
  //   icon: 'expand',
  //   description: 'Create and edit custom layouts'
  // },
  // {
  //   name: 'Discovery',
  //   path: '/discovery',
  //   icon: 'search',
  //   description: 'Find and connect devices'
  // },
  // {
  //   name: 'UI Components',
  //   path: '/ui-components',
  //   icon: 'detailed',
  //   description: 'UI component showcase'
  // },
  {
    name: 'Settings',
    path: '/settings',
    icon: 'gear',
    description: 'Application settings'
  }
]

// Toggle between dark and light mode
function toggleDarkMode() {
  uiStore.isDarkMode = !uiStore.isDarkMode
  if (uiStore.isDarkMode) {
    document.documentElement.classList.add('dark-theme')
  } else {
    document.documentElement.classList.remove('dark-theme')
  }
  localStorage.setItem('dark-theme-preference', uiStore.isDarkMode.toString())
}

// Responsive breakpoints
const isSmallScreen = ref(false)
const isMobileDevice = ref(false)

// Check screen size on mount and when window resizes
function updateScreenSize() {
  isSmallScreen.value = window.innerWidth < 768
  isMobileDevice.value = window.innerWidth < 480
}

onMounted(() => {
  updateScreenSize()
  window.addEventListener('resize', updateScreenSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateScreenSize)
})

// Get connected device count
const connectedDeviceCount = computed(() => {
  return unifiedStore.connectedDevices.length
})

// Total device count
const totalDeviceCount = computed(() => {
  return unifiedStore.devicesList.length
})

// Active link computation
const isActiveLink = (path: string) => {
  return route.path.startsWith(path)
}
</script>

<template>
  <nav class="aw-navigation-bar">
    <div class="aw-navigation-bar__left">
      <div class="aw-navigation-bar__app-logo">
        <Icon type="home" />
      </div>
      <h1 v-if="!isSmallScreen" class="aw-navigation-bar__app-title">Alpaca Web</h1>

      <!-- Navigation links -->
      <div class="aw-navigation-bar__links">
        <RouterLink
          v-for="link in navLinks"
          :key="link.path"
          :to="link.path"
          class="aw-navigation-bar__link"
          :class="{ 'aw-navigation-bar__link--active': isActiveLink(link.path) }"
          :title="link.description"
        >
          <Icon :type="link.icon" class="aw-navigation-bar__link-icon" />
          <span v-if="!isMobileDevice" class="aw-navigation-bar__link-text">{{ link.name }}</span>
        </RouterLink>
      </div>
    </div>

    <div class="aw-navigation-bar__right">
      <!-- Action slot for additional buttons/components -->
      <slot name="actions"></slot>

      <!-- Discovery indicator -->
      <DiscoveryIndicator :show-label="!isMobileDevice" />

      <!-- Device status indicator -->
      <div v-if="totalDeviceCount > 0" class="aw-navigation-bar__device-status">
        <span class="aw-navigation-bar__status-indicator">
          <span class="aw-navigation-bar__device-count">{{ connectedDeviceCount }}</span>
          <span v-if="!isMobileDevice">/ {{ totalDeviceCount }} devices</span>
        </span>
      </div>

      <!-- Theme toggle button -->
      <button
        class="aw-navigation-bar__theme-toggle"
        :title="uiStore.isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
        @click="toggleDarkMode"
      >
        <Icon :type="uiStore.isDarkMode ? 'sun' : 'moon'" />
      </button>
    </div>
  </nav>
</template>

<style scoped>
.aw-navigation-bar {
  height: var(--header-height, 60px);
  background-color: var(--aw-panel-menu-bar-bg-color);
  border-bottom: 1px solid var(--aw-panel-border-color);
  color: var(--aw-panel-menu-bar-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--aw-spacing-md);
  box-shadow: var(--aw-shadow-sm);
  z-index: 10;
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
}

.aw-navigation-bar__left {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-md);
}

.aw-navigation-bar__right {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-md);
}

.aw-navigation-bar__app-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--aw-panel-menu-bar-color);
}

.aw-navigation-bar__app-title {
  margin: 0;
  font-size: var(--aw-font-size-xl, 1.25rem);
  color: var(--aw-panel-menu-bar-color);
  font-weight: 700;
}

.aw-navigation-bar__links {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-sm);
}

.aw-navigation-bar__link {
  color: var(--aw-panel-menu-bar-color);
  text-decoration: none;
  padding: var(--aw-spacing-sm) var(--aw-spacing-md);
  border-radius: var(--aw-border-radius-md);
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-sm);
  font-size: var(--aw-font-size-sm, 0.875rem);
  font-weight: 500;
  transition: all 0.2s ease;
}

.aw-navigation-bar__link:hover {
  background-color: var(--aw-panel-hover-bg-color);
  transform: translateY(-1px);
}

.aw-navigation-bar__link--active {
  background-color: var(--aw-color-primary-700);
  color: var(--aw-panel-resize-color);
  box-shadow: var(--aw-shadow-sm);
}

.aw-navigation-bar__link-icon {
  width: 20px;
  height: 20px;
  opacity: 0.9;
}

.aw-navigation-bar__device-status {
  display: flex;
  align-items: center;
}

.aw-navigation-bar__status-indicator {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-xs);
  font-size: var(--aw-font-size-sm, 0.875rem);
  background-color: var(--aw-color-primary-700);
  padding: var(--aw-spacing-xs) var(--aw-spacing-sm);
  border-radius: var(--aw-border-radius-md);
}

.aw-navigation-bar__device-count {
  font-weight: 700;
  color: var(--aw-panel-menu-bar-color);
}

.aw-navigation-bar__theme-toggle {
  background: none;
  border: none;
  color: var(--aw-panel-menu-bar-color);
  padding: var(--aw-spacing-xs);
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.aw-navigation-bar__theme-toggle:hover {
  background-color: var(--aw-panel-hover-bg-color);
  transform: translateY(-1px);
}

.aw-navigation-bar__theme-toggle:focus {
  outline: 2px solid var(--aw-color-primary-300);
  outline-offset: 2px;
}

@media (max-width: 768px) {
  .aw-navigation-bar {
    padding: 0 var(--aw-spacing-sm);
  }

  .aw-navigation-bar__left,
  .aw-navigation-bar__right {
    gap: var(--aw-spacing-sm);
  }

  .aw-navigation-bar__link {
    padding: var(--aw-spacing-xs) var(--aw-spacing-sm);
  }
}
</style>
