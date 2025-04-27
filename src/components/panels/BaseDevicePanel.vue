<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUnifiedStore } from '../../stores/UnifiedStore'
import type { Device } from '../../types/DeviceTypes'
import { UIMode } from '../../stores/useUIPreferencesStore'

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

const store = useUnifiedStore()
const currentMode = ref(UIMode.OVERVIEW)

// Get the device from the store
const device = computed<Device | null>(() => store.getDeviceById(props.deviceId))

// Derived properties for the panel
const isConnected = computed(() => device.value?.isConnected || false)
const deviceType = computed(() => device.value?.type || '')
const deviceNum = computed(() => parseInt(props.deviceId, 10) || 0)

// Event handlers
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
  isConnected,
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
