<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useUnifiedStore } from '../stores/UnifiedStore'
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

// Use the Pinia store
const store = useUnifiedStore()
const currentMode = ref(UIMode.OVERVIEW)

// Get the device from the store directly
const device = computed(() => {
  // First try to get by ID directly
  const deviceById = store.getDeviceById(props.deviceId)
  if (deviceById) {
    return deviceById
  }

  // If that fails and the deviceId looks like a number, try to find by idx
  const deviceNum = parseInt(props.deviceId, 10)
  if (!isNaN(deviceNum)) {
    return store.devicesList.find((d) => d.idx === deviceNum)
  }

  return null
})

// Add debugging on mount
onMounted(() => {
  console.log('BaseDevicePanel mounted with deviceId:', props.deviceId)
  console.log('Device from store:', device.value)
  // Print all the devices in the store for debugging
  console.log('All devices in store:', store.devicesList)
})

// Derived properties for the panel
const connected = computed(() => device.value?.isConnected || false)
const deviceType = computed(() => device.value?.type || '')
const deviceNum = computed(() => {
  if (device.value?.idx !== undefined) {
    return device.value.idx
  }
  // Extract numeric part from device ID if possible
  const match = props.deviceId.match(/\d+/)
  return match ? parseInt(match[0], 10) : 0
})

// Event handlers using direct store methods
const handleConnect = () => {
  if (device.value) {
    console.log('Connecting device with ID:', device.value.id)
    console.log('Device details:', device.value)
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
