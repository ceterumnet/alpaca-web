<script setup lang="ts">
import { ref } from 'vue'

// Define mock device data directly in the component
interface Device {
  id: string
  name: string
  type: string
  isConnected: boolean
}

// Mock devices for the prototype
const devices = ref<Device[]>([
  { id: 'camera1', name: 'Main Camera', type: 'camera', isConnected: true },
  { id: 'telescope1', name: 'Primary Telescope', type: 'telescope', isConnected: true },
  { id: 'focuser1', name: 'Main Focuser', type: 'focuser', isConnected: false },
  { id: 'filterwheel1', name: 'Filter Wheel', type: 'filterwheel', isConnected: true },
  { id: 'weather1', name: 'Weather Station', type: 'weather', isConnected: true }
])

// Group devices by type
const devicesByType = ref<Record<string, Device[]>>({})

// Process devices into groups
function groupDevicesByType() {
  const grouped: Record<string, Device[]> = {}

  devices.value.forEach((device) => {
    if (!grouped[device.type]) {
      grouped[device.type] = []
    }
    grouped[device.type].push(device)
  })

  devicesByType.value = grouped
}

// Initialize device groups
groupDevicesByType()

// Get icon for device type
function getDeviceIcon(type: string): string {
  switch (type.toLowerCase()) {
    case 'camera':
      return '📷'
    case 'telescope':
      return '🔭'
    case 'focuser':
      return '🔍'
    case 'filterwheel':
      return '🎨'
    case 'weather':
      return '☁️'
    case 'dome':
      return '🏠'
    default:
      return '📦'
  }
}
</script>

<template>
  <div class="aw-device-palette">
    <div class="aw-device-palette__header">
      <h2>Devices</h2>
      <p class="aw-device-palette__hint">Drag devices onto workspace areas</p>
    </div>

    <div v-if="Object.keys(devicesByType).length === 0" class="aw-device-palette__empty">
      <p>No devices available</p>
    </div>

    <div v-for="(devicesOfType, type) in devicesByType" :key="type" class="aw-device-palette__group">
      <h3 class="aw-device-palette__type">{{ type.charAt(0).toUpperCase() + type.slice(1) + 's' }}</h3>

      <div class="aw-device-palette__list">
        <div
          v-for="device in devicesOfType"
          :key="device.id"
          class="aw-device-palette__item"
          :class="{
            'aw-device-palette__item--connected': device.isConnected,
            'aw-device-palette__item--disconnected': !device.isConnected
          }"
          title="Click to add to workspace"
          draggable="true"
        >
          <div class="aw-device-palette__icon">{{ getDeviceIcon(device.type) }}</div>
          <div class="aw-device-palette__info">
            <div class="aw-device-palette__name">{{ device.name }}</div>
            <div class="aw-device-palette__status">{{ device.isConnected ? 'Connected' : 'Disconnected' }}</div>
          </div>
          <div class="aw-device-palette__add">+</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.aw-device-palette {
  height: 100%;
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-text-color);
  overflow-y: auto;
  padding: var(--aw-spacing-md, 1rem);
  display: flex;
  flex-direction: column;
  gap: var(--aw-spacing-md, 1rem);
}

.aw-device-palette__header {
  padding-bottom: var(--aw-spacing-xs, 0.5rem);
  border-bottom: 1px solid var(--aw-panel-border-color);
}

.aw-device-palette__header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--aw-primary-color);
}

.aw-device-palette__hint {
  font-size: 0.875rem;
  color: var(--aw-text-secondary-color);
  margin: var(--aw-spacing-xs, 0.5rem) 0 0;
}

.aw-device-palette__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  color: var(--aw-text-secondary-color);
  font-style: italic;
}

.aw-device-palette__group {
  display: flex;
  flex-direction: column;
  gap: var(--aw-spacing-xs, 0.5rem);
}

.aw-device-palette__type {
  font-size: 1rem;
  font-weight: 500;
  margin: 0;
  color: var(--aw-text-secondary-color);
}

.aw-device-palette__list {
  display: flex;
  flex-direction: column;
  gap: var(--aw-spacing-xs, 0.5rem);
}

.aw-device-palette__item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: var(--aw-border-radius-sm, 0.375rem);
  background-color: var(--aw-panel-content-bg-color);
  border: 1px solid var(--aw-panel-border-color);
  transition: all 0.2s ease;
  position: relative;
}

.aw-device-palette__item--connected {
  border-left: 3px solid var(--aw-success-color);
}

.aw-device-palette__item--disconnected {
  border-left: 3px solid var(--aw-text-secondary-color);
  opacity: 0.7;
}

.aw-device-palette__item:hover {
  transform: translateY(-2px);
  box-shadow: var(--aw-shadow-sm, 0 2px 5px rgba(0, 0, 0, 0.1));
  cursor: pointer;
}

.aw-device-palette__icon {
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.aw-device-palette__info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.aw-device-palette__name {
  font-weight: 500;
}

.aw-device-palette__status {
  font-size: 0.8rem;
  color: var(--aw-text-secondary-color);
}

.aw-device-palette__add {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background-color: var(--aw-primary-color);
  color: white;
  border-radius: 50%;
  font-size: 1.2rem;
  font-weight: bold;
}
</style>
