// Status: Good - Core Component // This is the app sidebar component that: // - Provides
application sidebar // - Handles sidebar content // - Supports collapsible sections // - Manages
sidebar state // - Maintains sidebar layout

<script setup lang="ts">
import { computed } from 'vue'
import Icon from '@/components/ui/Icon.vue'
import type { IconType } from '@/components/ui/Icon.vue'
import { useUIPreferencesStore } from '@/stores/useUIPreferencesStore'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import type { Device } from '@/stores/UnifiedStore'

// Define emits for the component
const emit = defineEmits(['device-select', 'toggle-sidebar'])

// Use the Pinia store with the composition API
const unifiedStore = useUnifiedStore()

// UI Preferences store for sidebar visibility state
const uiPreferencesStore = useUIPreferencesStore()

// Group devices by their type/category
const devicesByCategory = computed(() => {
  const categories: Record<string, Device[]> = {}

  // Use the devicesList computed property from the store
  unifiedStore.devicesList.forEach((device) => {
    if (!categories[device.type]) {
      categories[device.type] = []
    }
    categories[device.type].push(device)
  })

  return categories
})

// Get appropriate icon based on device type
const getIconForDeviceType = (type: string): IconType => {
  const iconMap: Record<string, IconType> = {
    telescope: 'search',
    camera: 'camera',
    focuser: 'focus',
    filter_wheel: 'filter',
    dome: 'dome',
    weather: 'cloud',
    // Add more device types and their corresponding icons as needed
    default: 'device-unknown'
  }

  return iconMap[type] || iconMap.default
}

// Handle sidebar toggle
const handleSidebarToggle = () => {
  uiPreferencesStore.toggleSidebar()
  emit('toggle-sidebar', uiPreferencesStore.isSidebarVisible)
}

// Handle device selection
const handleDeviceSelect = (device: Device) => {
  unifiedStore.selectDevice(device.id)
  emit('device-select', device)
}

// Computed for sidebar visibility
const isSidebarVisible = computed(() => uiPreferencesStore.isSidebarVisible)
</script>

<template>
  <div class="aw-app-sidebar" :class="{ 'aw-app-sidebar--collapsed': !isSidebarVisible }">
    <!-- Sidebar header -->
    <div class="aw-app-sidebar__header">
      <h2 v-if="isSidebarVisible">Devices</h2>
      <button class="aw-app-sidebar__toggle" @click="handleSidebarToggle">
        <Icon :type="isSidebarVisible ? 'chevron-left' : 'chevron-right'" />
      </button>
    </div>

    <!-- Sidebar content (expanded view) -->
    <div v-if="isSidebarVisible" class="aw-app-sidebar__content">
      <div v-for="(devices, category) in devicesByCategory" :key="category" class="aw-app-sidebar__category">
        <h3 class="aw-app-sidebar__category-title">{{ category }}</h3>
        <div
          v-for="device in devices"
          :key="device.id"
          class="aw-app-sidebar__device"
          :class="{ 'aw-app-sidebar__device--connected': device.isConnected }"
          @click="handleDeviceSelect(device)"
        >
          <div class="aw-app-sidebar__device-icon">
            <Icon :type="getIconForDeviceType(device.type)" />
          </div>
          <div class="aw-app-sidebar__device-info">
            <div class="aw-app-sidebar__device-name">{{ device.name }}</div>
            <div class="aw-app-sidebar__device-status">
              {{ device.isConnected ? 'Connected' : 'Disconnected' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Collapsed view -->
    <div v-else class="aw-app-sidebar__collapsed-content">
      <div v-for="device in unifiedStore.devicesList" :key="device.id">
        <div
          class="aw-app-sidebar__collapsed-device"
          :class="{ 'aw-app-sidebar__collapsed-device--connected': device.isConnected }"
          :title="device.name"
          @click="handleDeviceSelect(device)"
        >
          <Icon :type="getIconForDeviceType(device.type)" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.aw-app-sidebar {
  height: 100%;
  width: 250px;
  background-color: var(--aw-panel-bg-color);
  transition: width 0.3s ease;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--aw-panel-border-color);
}

.aw-app-sidebar--collapsed {
  width: 60px;
}

.aw-app-sidebar__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--aw-spacing-md);
  border-bottom: 1px solid var(--aw-panel-border-color);
}

.aw-app-sidebar__header h2 {
  margin: 0;
  font-size: var(--aw-font-size-lg, 1.2rem);
  font-weight: 600;
  color: var(--aw-text-color);
}

.aw-app-sidebar__toggle {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--aw-text-secondary-color);
  padding: var(--aw-spacing-xs);
  border-radius: var(--aw-border-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.aw-app-sidebar__toggle:hover {
  background-color: var(--aw-panel-hover-bg-color);
}

.aw-app-sidebar__toggle:focus {
  outline: 2px solid var(--aw-color-primary-300);
  outline-offset: 2px;
}

.aw-app-sidebar__content {
  padding: var(--aw-spacing-md);
}

.aw-app-sidebar__category {
  margin-bottom: var(--aw-spacing-lg);
}

.aw-app-sidebar__category-title {
  font-size: 0.9rem;
  text-transform: uppercase;
  color: var(--aw-text-secondary-color);
  margin-bottom: var(--aw-spacing-sm);
  font-weight: 600;
}

.aw-app-sidebar__device {
  display: flex;
  align-items: center;
  padding: var(--aw-spacing-sm);
  border-radius: var(--aw-border-radius-md);
  margin-bottom: var(--aw-spacing-xs);
  cursor: pointer;
  transition: all 0.2s ease;
}

.aw-app-sidebar__device:hover {
  background-color: var(--aw-panel-hover-bg-color);
}

.aw-app-sidebar__device--connected {
  border-left: 3px solid var(--aw-color-primary-500);
}

.aw-app-sidebar__device-icon {
  margin-right: var(--aw-spacing-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.aw-app-sidebar__device-info {
  flex: 1;
}

.aw-app-sidebar__device-name {
  font-weight: 500;
  margin-bottom: var(--aw-spacing-xs);
  color: var(--aw-text-color);
}

.aw-app-sidebar__device-status {
  font-size: 0.8rem;
  color: var(--aw-text-secondary-color);
}

.aw-app-sidebar__collapsed-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--aw-spacing-md) 0;
}

.aw-app-sidebar__collapsed-device {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--aw-border-radius-sm);
  margin-bottom: var(--aw-spacing-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.aw-app-sidebar__collapsed-device:hover {
  background-color: var(--aw-panel-hover-bg-color);
}

.aw-app-sidebar__collapsed-device:focus {
  outline: 2px solid var(--aw-color-primary-300);
  outline-offset: 2px;
}

.aw-app-sidebar__collapsed-device--connected {
  border-left: 3px solid var(--aw-color-primary-500);
  color: var(--aw-color-primary-500);
}
</style>
