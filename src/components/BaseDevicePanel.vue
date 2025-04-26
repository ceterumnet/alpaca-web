<script setup lang="ts">
import { computed, ref } from 'vue'
import UnifiedStore from '../stores/UnifiedStore'
import { UIMode } from '../stores/useUIPreferencesStore'

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  }
})

// Create a UnifiedStore instance instead of using the adapter
const store = new UnifiedStore()
const currentMode = ref(UIMode.OVERVIEW)

// Get the device from the store directly
const device = computed(() => store.getDeviceById(props.deviceId))

// Derived properties for the panel
const connected = computed(() => device.value?.isConnected || false)
const deviceType = computed(() => device.value?.type || '')
const deviceNum = computed(() => {
  // Extract numeric part from device ID if possible
  const match = props.deviceId.match(/\d+/)
  return match ? parseInt(match[0], 10) : 0
})

// Event handlers using direct store methods
const handleConnect = () => {
  if (device.value) {
    if (device.value.isConnected) {
      store.disconnectDevice(device.value.id)
    } else {
      store.connectDevice(device.value.id)
    }
  }
}

const handleModeChange = (mode: UIMode) => {
  currentMode.value = mode
}

// Export variables and functions for composition
defineExpose({
  device,
  connected,
  deviceType,
  deviceNum,
  currentMode,
  handleConnect,
  handleModeChange
})
</script>

<template>
  <div>
    <slot></slot>
  </div>
</template>
