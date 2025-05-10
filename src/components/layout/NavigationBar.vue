// Status: Updated - Core Navigation Component 
// This is the main navigation bar that: 
// - Integrates with new navigation components 
// - Provides primary navigation 
// - Shows device status
// - Handles theme switching 
// - Supports responsive design

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useUIPreferencesStore } from '@/stores/useUIPreferencesStore'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { useLayoutStore } from '@/stores/useLayoutStore'
import Icon from '@/components/ui/Icon.vue'
import type { IconType } from '@/components/ui/Icon.vue'
import DiscoveryIndicator from '@/components/navigation/DiscoveryIndicator.vue'

// Get stores
const uiStore = useUIPreferencesStore()
const unifiedStore = useUnifiedStore()
const layoutStore = useLayoutStore()
const route = useRoute()
const router = useRouter()

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

// Layout functionality
const currentLayoutId = ref(layoutStore.currentLayoutId || 'default')
const availableLayouts = computed(() => layoutStore.layouts)

// Change layout
const changeLayout = (layoutId: string) => {
  console.log(`Attempting to change layout to: ${layoutId}`)
  
  // Check if the layout exists
  const layoutExists = layoutStore.layouts.some((layout) => layout.id === layoutId)

  if (layoutExists) {
    console.log(`Layout ${layoutId} found, setting as current layout`)
    
    // Force layout change by clearing and resetting the store
    layoutStore.setCurrentLayout('')
    
    // Wait for the next tick to set the new layout
    setTimeout(() => {
      layoutStore.setCurrentLayout(layoutId)
      currentLayoutId.value = layoutId
      console.log(`Layout changed to: ${layoutId}`)
    }, 10)
  } else {
    console.warn(`Layout with ID ${layoutId} not found, using default layout`)
    if (layoutStore.layouts.length > 0) {
      // Use the first available layout if specified one doesn't exist
      const firstLayout = layoutStore.layouts[0]
      console.log(`Falling back to first available layout: ${firstLayout.id}`)
      layoutStore.setCurrentLayout(firstLayout.id)
      currentLayoutId.value = firstLayout.id
    }
  }
}

// Function to delete the current layout
function deleteCurrentLayout() {
  if (!currentLayoutId.value) return
  
  // Confirm deletion
  if (confirm(`Are you sure you want to delete this layout "${availableLayouts.value.find(l => l.id === currentLayoutId.value)?.name || currentLayoutId.value}"?`)) {
    // Delete from store
    layoutStore.deleteLayout(currentLayoutId.value)
    
    // Switch to first available layout or create default if none exists
    if (layoutStore.gridLayouts.length > 0) {
      currentLayoutId.value = layoutStore.gridLayouts[0].id
      layoutStore.setCurrentLayout(currentLayoutId.value)
    } else {
      // If we have no layouts left, create a new default one
      createAndAddDefaultLayout()
      currentLayoutId.value = 'default'
      layoutStore.setCurrentLayout(currentLayoutId.value) 
    }
  }
}

// Create and add a default layout
function createAndAddDefaultLayout() {
  // This matches the logic from the PanelLayoutView
  const defaultLayoutId = 'default'
  
  // Define proper types for priority
  type Priority = 'primary' | 'secondary' | 'tertiary';
  
  // Create a default grid layout
  const defaultGridLayout = {
    id: defaultLayoutId,
    name: 'Default Layout',
    description: 'Default panel layout with camera, telescope, and other panels',
    isDefault: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    layouts: {
      desktop: {
        rows: [
          {
            id: 'row-1-desktop',
            cells: [
              {
                id: 'camera',
                deviceType: 'camera',
                name: 'Camera',
                priority: 'primary' as Priority,
                width: 66.67
              },
              {
                id: 'telescope',
                deviceType: 'telescope',
                name: 'Telescope',
                priority: 'primary' as Priority,
                width: 33.33
              }
            ],
            height: 50
          },
          {
            id: 'row-2-desktop',
            cells: [
              {
                id: 'focuser',
                deviceType: 'focuser',
                name: 'Focuser',
                priority: 'secondary' as Priority,
                width: 33.33
              },
              {
                id: 'filterwheel',
                deviceType: 'filterwheel',
                name: 'Filter Wheel',
                priority: 'secondary' as Priority,
                width: 33.33
              },
              {
                id: 'weather',
                deviceType: 'weather',
                name: 'Weather',
                priority: 'secondary' as Priority,
                width: 33.33
              }
            ],
            height: 50
          }
        ],
        panelIds: ['camera', 'telescope', 'focuser', 'filterwheel', 'weather']
      },
      tablet: {
        rows: [
          {
            id: 'row-1-tablet',
            cells: [
              {
                id: 'camera',
                deviceType: 'camera',
                name: 'Camera',
                priority: 'primary' as Priority,
                width: 100
              }
            ],
            height: 50
          },
          {
            id: 'row-2-tablet',
            cells: [
              {
                id: 'telescope',
                deviceType: 'telescope',
                name: 'Telescope',
                priority: 'secondary' as Priority,
                width: 100
              }
            ],
            height: 50
          }
        ],
        panelIds: ['camera', 'telescope']
      },
      mobile: {
        rows: [
          {
            id: 'row-1-mobile',
            cells: [
              {
                id: 'camera',
                deviceType: 'camera',
                name: 'Camera',
                priority: 'primary' as Priority,
                width: 100
              }
            ],
            height: 100
          }
        ],
        panelIds: ['camera']
      }
    }
  }

  // Add to store
  layoutStore.addGridLayout(defaultGridLayout)
}

// Function to set the current layout as default
function setAsDefaultLayout() {
  if (!currentLayoutId.value) return
  
  // Update all layouts
  layoutStore.gridLayouts.forEach(layout => {
    if (layout.id === currentLayoutId.value) {
      layoutStore.updateGridLayout(layout.id, { isDefault: true })
    } else if (layout.isDefault) {
      layoutStore.updateGridLayout(layout.id, { isDefault: false })
    }
  })
}

// Open layout builder
const openLayoutBuilder = () => {
  router.push(`/layout-builder?layout=${currentLayoutId.value}`)
}

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
        
        <!-- Layout Controls (between Home and Settings) -->
        <div class="aw-navigation-bar__layout-controls">
          <select
            v-model="currentLayoutId"
            class="aw-navigation-bar__layout-select"
            :title="'Current layout: ' + (availableLayouts.find(l => l.id === currentLayoutId)?.name || 'Default')"
            @change="changeLayout(currentLayoutId)"
          >
            <option v-for="layout in availableLayouts" :key="layout.id" :value="layout.id">
              {{ layout.name }}{{ layout.isDefault ? ' ★' : '' }}
            </option>
          </select>
          
          <div class="aw-navigation-bar__layout-actions">
            <button class="aw-navigation-bar__icon-button" title="Set as default layout" @click="setAsDefaultLayout">
              <span class="aw-navigation-bar__icon">⭐</span>
            </button>
            <button class="aw-navigation-bar__icon-button" title="Edit layouts" @click="openLayoutBuilder">
              <span class="aw-navigation-bar__icon">✏️</span>
            </button>
            <button class="aw-navigation-bar__icon-button" title="Delete this layout" @click="deleteCurrentLayout">
              <span class="aw-navigation-bar__icon">🗑️</span>
            </button>
          </div>
        </div>
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

/* Layout control styles */
.aw-navigation-bar__layout-controls {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-xs);
  margin-left: var(--aw-spacing-sm);
  padding: var(--aw-spacing-xs) var(--aw-spacing-sm);
  background-color: var(--aw-panel-hover-bg-color);
  border-radius: var(--aw-border-radius-md);
}

.aw-navigation-bar__layout-select {
  background-color: var(--aw-input-bg-color, #333333);
  color: var(--aw-text-color, #ffffff);
  border: 1px solid var(--aw-border-color, #444444);
  border-radius: var(--aw-border-radius-sm);
  padding: 2px 4px;
  font-size: var(--aw-font-size-sm, 0.875rem);
  max-width: 150px;
}

.aw-navigation-bar__layout-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.aw-navigation-bar__icon-button {
  background: none;
  border: none;
  color: var(--aw-panel-menu-bar-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--aw-border-radius-sm);
  transition: all 0.2s ease;
}

.aw-navigation-bar__icon-button:hover {
  background-color: var(--aw-panel-content-bg-color);
}

.aw-navigation-bar__icon {
  font-size: 14px;
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
  
  .aw-navigation-bar__layout-controls {
    margin-left: 0;
    flex-direction: column;
    align-items: flex-start;
    padding: var(--aw-spacing-xs);
  }
  
  .aw-navigation-bar__layout-select {
    max-width: 100px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .aw-navigation-bar__layout-controls {
    display: none;
  }
}
</style>
