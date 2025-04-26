<template>
  <div class="discovery-panel">
    <div class="panel-header">
      <h2>Device Discovery</h2>
      <div class="header-actions">
        <button class="discover-button" @click="toggleDiscovery">
          {{ props.store.isDiscovering ? 'Stop Discovery' : 'Start Discovery' }}
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
          <div class="device-name">{{ device.deviceName }}</div>
          <div class="device-type">{{ device.deviceType }}</div>
          <div class="device-address">{{ device.address }}</div>
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
import type { PropType } from 'vue'

// Type definition for LegacyDevice
interface LegacyDevice {
  id: string
  deviceName: string
  deviceType: string
  address?: string
  devicePort?: number
  isConnected?: boolean
  status?: string
  properties?: Record<string, unknown> | null
  telemetry?: Record<string, unknown>
  [key: string]: unknown
}

// Props
const props = defineProps({
  store: {
    type: Object as PropType<{
      discoveredDevices: LegacyDevice[]
      isDiscovering: boolean
      startDiscovery: () => boolean
      stopDiscovery: () => boolean
      connectToDevice: (deviceId: string) => Promise<boolean>
    }>,
    required: true
  }
})

// Emits
const emit = defineEmits(['discover', 'add-device', 'connect-device'])

// Computed properties
const discoveredDevices = computed(() => {
  return props.store?.discoveredDevices || []
})

// Methods
const toggleDiscovery = () => {
  console.log('Toggle discovery, current state:', props.store.isDiscovering)

  if (props.store.isDiscovering) {
    console.log('Calling stopDiscovery')
    props.store.stopDiscovery()
    emit('discover', false)
  } else {
    console.log('Calling startDiscovery')
    props.store.startDiscovery()
    emit('discover', true)
  }

  console.log('After toggle, state:', props.store.isDiscovering)
}

const selectDevice = (device: LegacyDevice) => {
  // Just store selected device for future use
  // Parameter intentionally unused in this minimal implementation
  void device
}

const connectToDevice = (device: LegacyDevice) => {
  emit('connect-device', device)
  props.store.connectToDevice(device.id)
}
</script>

<style scoped>
.discovery-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid #ccc;
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
  border: 1px solid #eee;
  border-radius: 4px;
  cursor: pointer;
}

.device-item:hover {
  background-color: #f9f9f9;
}

.device-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.device-name {
  font-weight: bold;
}

.device-type {
  font-size: 0.9em;
  color: #666;
}

.device-address {
  font-size: 0.8em;
  color: #888;
}

.no-devices {
  text-align: center;
  padding: 32px;
  color: #999;
}

button {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  background-color: #4a69bd;
  color: white;
  border: none;
  font-size: 14px;
}

button:hover {
  background-color: #3a56a9;
}

button:disabled {
  background-color: #a9b9e0;
  cursor: not-allowed;
}

.connect-button {
  padding: 6px 12px;
  font-size: 13px;
}
</style>
