<script setup lang="ts">
import { computed } from 'vue'
import { useUIPreferencesStore } from '@/stores/useUIPreferencesStore'
import UnifiedStore from '@/stores/UnifiedStore'
import Icon from './Icon.vue'
import type { Device } from '@/types/DeviceTypes'

const uiStore = useUIPreferencesStore()
const store = new UnifiedStore()

// Sidebar collapse state
const isCollapsed = computed({
  get: () => !uiStore.isSidebarVisible,
  set: (value) => {
    uiStore.isSidebarVisible = !value
  }
})

// Toggle sidebar collapse
function toggleSidebar() {
  uiStore.toggleSidebar()
}

// Get categorized devices for display
const categorizedDevices = computed(() => {
  const devicesByType: Record<string, Device[]> = {}

  store.devices.forEach((device: Device) => {
    const type = device.type || 'other'
    if (!devicesByType[type]) {
      devicesByType[type] = []
    }
    devicesByType[type].push(device)
  })

  return devicesByType
})

// Get device icon based on type
function getDeviceIcon(type: string): 'search' | 'camera' | 'exposure' | 'gear' {
  switch (type.toLowerCase()) {
    case 'telescope':
      return 'search'
    case 'camera':
      return 'camera'
    case 'focuser':
      return 'exposure'
    case 'filterwheel':
      return 'gear'
    default:
      return 'gear'
  }
}

// Get device connection status
function isDeviceConnected(device: Device): boolean {
  return device.isConnected || false
}
</script>

<template>
  <div class="sidebar" :class="{ 'sidebar-collapsed': isCollapsed }">
    <!-- Sidebar header with collapse toggle -->
    <div class="sidebar-header">
      <h2 v-if="!isCollapsed">Devices</h2>
      <button class="collapse-toggle" @click="toggleSidebar">
        <Icon :type="isCollapsed ? 'arrow-right' : 'arrow-left'" />
      </button>
    </div>

    <!-- Device categories and items -->
    <div class="sidebar-content">
      <template v-for="(devices, category) in categorizedDevices" :key="category">
        <div v-if="!isCollapsed" class="device-category">
          <h3 class="category-title">{{ category }}</h3>
          <div
            v-for="device in devices"
            :key="`${device.type}-${device.id}`"
            class="device-item"
            :class="{ 'device-connected': isDeviceConnected(device) }"
          >
            <Icon :type="getDeviceIcon(category)" class="device-icon" />
            <span class="device-name">{{ device.type }} {{ device.id }}</span>
            <span
              class="connection-status"
              :class="{ connected: isDeviceConnected(device) }"
            ></span>
          </div>
        </div>

        <!-- Collapsed view with just icons -->
        <div v-else class="collapsed-devices">
          <div
            v-for="device in devices"
            :key="`${device.type}-${device.id}`"
            class="collapsed-device-item"
            :class="{ 'device-connected': isDeviceConnected(device) }"
            :title="`${device.type} ${device.id}`"
          >
            <Icon :type="getDeviceIcon(category)" />
            <span class="connection-dot" :class="{ connected: isDeviceConnected(device) }"></span>
          </div>
        </div>
      </template>
    </div>

    <!-- Sidebar footer with actions -->
    <div class="sidebar-footer">
      <button class="action-button" title="Settings">
        <Icon type="gear" />
        <span v-if="!isCollapsed">Settings</span>
      </button>
      <button class="action-button" title="Dark/Light Toggle">
        <Icon type="exposure" />
        <span v-if="!isCollapsed">Theme</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 240px;
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-panel-content-color);
  border-right: 1px solid var(--aw-panel-border-color);
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  z-index: 100;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.06);
}

.sidebar-collapsed {
  width: 54px;
}

.sidebar-header {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid var(--aw-panel-border-color);
  position: relative;
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
}

.sidebar-header h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  flex: 1;
}

.collapse-toggle {
  background: transparent;
  border: none;
  color: var(--aw-panel-menu-bar-color);
  cursor: pointer;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.collapse-toggle:hover {
  background-color: rgba(255, 255, 255, 0.15);
  transform: scale(1.05);
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
}

.device-category {
  margin-bottom: 20px;
}

.category-title {
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--aw-panel-content-color);
  opacity: 0.7;
  margin: 0 0 10px 16px;
  letter-spacing: 0.5px;
}

.device-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all 0.2s ease;
  margin-bottom: 2px;
}

.device-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.device-item.device-connected {
  border-left-color: #48bb78;
  background-color: rgba(72, 187, 120, 0.05);
}

.device-icon {
  margin-right: 12px;
  opacity: 0.8;
}

.device-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.95rem;
}

.connection-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #888;
  box-shadow: 0 0 0 rgba(136, 136, 136, 0.4);
  animation: none;
}

.connection-status.connected {
  background-color: #48bb78;
  box-shadow: 0 0 0 rgba(72, 187, 120, 0.4);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(72, 187, 120, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(72, 187, 120, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(72, 187, 120, 0);
  }
}

.collapsed-devices {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0;
}

.collapsed-device-item {
  position: relative;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.collapsed-device-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.collapsed-device-item.device-connected {
  background-color: rgba(72, 187, 120, 0.05);
}

.connection-dot {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #888;
  bottom: 2px;
  right: 2px;
}

.connection-dot.connected {
  background-color: #48bb78;
}

.sidebar-footer {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border-top: 1px solid var(--aw-panel-border-color);
}

.action-button {
  display: flex;
  align-items: center;
  background: transparent;
  border: none;
  color: var(--aw-panel-content-color);
  padding: 8px;
  margin-bottom: 4px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.action-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.action-button span {
  margin-left: 8px;
}
</style>
