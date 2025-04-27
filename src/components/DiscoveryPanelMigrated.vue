<template>
  <div class="discovery-panel">
    <div class="panel-header">
      <h2>Device Discovery</h2>
      <div class="header-actions">
        <button class="discover-button" @click="toggleDiscovery">
          {{ store.isDiscovering ? 'Stop Discovery' : 'Start Discovery' }}
        </button>
      </div>
    </div>

    <div class="devices-list">
      <div v-if="discoveredDevices.length === 0" class="no-devices">No devices discovered yet</div>

      <div
        v-for="device in discoveredDevices"
        :key="device.id"
        class="device-item"
        @click="selectDevice(device)"
      >
        <div class="device-info">
          <div class="device-name">{{ device.name }}</div>
          <div class="device-type">{{ device.type }}</div>
          <div class="device-address">{{ device.ipAddress }}:{{ device.port }}</div>
        </div>

        <div class="device-actions">
          <button
            class="connect-button"
            :disabled="device.isConnected"
            @click.stop="connectToDevice(device)"
          >
            {{ device.isConnected ? 'Connected' : 'Connect' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import type { UnifiedDevice } from '@/types/DeviceTypes'

// Get the unified store
const store = useUnifiedStore()

// Emits
const emit = defineEmits(['discover', 'add-device', 'connect-device'])

// Computed properties
const discoveredDevices = computed(() => {
  return store.devicesList
})

// Methods
const toggleDiscovery = () => {
  console.log('Toggle discovery, current state:', store.isDiscovering)

  if (store.isDiscovering) {
    console.log('Stopping discovery')
    store.stopDiscovery()
    emit('discover', false)
  } else {
    console.log('Starting discovery')
    store.startDiscovery()
    emit('discover', true)
  }

  console.log('After toggle, state:', store.isDiscovering)
}

const selectDevice = (device: UnifiedDevice) => {
  // Just store selected device for future use
  // Parameter intentionally unused in this minimal implementation
  void device
}

const connectToDevice = (device: UnifiedDevice) => {
  emit('connect-device', device)
  store.connectDevice(device.id)
}
</script>

<style scoped>
.discovery-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 4px;
  padding: 16px;
  max-width: 800px;
  font-family: sans-serif;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.devices-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.device-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--aw-panel-border-subtle-color);
  border-radius: 4px;
  cursor: pointer;
  background-color: var(--aw-panel-content-bg-color);
}

.device-item:hover {
  background-color: var(--aw-panel-hover-bg-color);
}

.device-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.device-name {
  font-weight: bold;
  color: var(--aw-panel-content-color);
}

.device-type {
  font-size: 0.9em;
  color: var(--aw-panel-content-subtle-color);
}

.device-address {
  font-size: 0.8em;
  color: var(--aw-panel-content-subtle-color);
}

.no-devices {
  text-align: center;
  padding: 32px;
  color: var(--aw-panel-content-subtle-color);
}

button {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  background-color: var(--aw-panel-resize-bg-color);
  color: white;
  border: none;
  font-size: 14px;
}

button:hover {
  background-color: var(--aw-panel-resize-hover-bg-color);
}

button:disabled {
  background-color: var(--aw-panel-disabled-bg-color);
  cursor: not-allowed;
}

.connect-button {
  padding: 6px 12px;
  font-size: 13px;
}

.discover-button {
  min-width: 120px;
}
</style>
