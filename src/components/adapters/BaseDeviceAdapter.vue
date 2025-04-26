<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLegacyDeviceStore } from '../../stores/deviceStoreAdapter'
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

const deviceStore = useLegacyDeviceStore()
const currentMode = ref(UIMode.OVERVIEW)

// Get the device from the store
const device = computed(() => deviceStore.getDeviceById(props.deviceId))

// Derived properties for the panel
const connected = computed(() => device.value?.connected || false)
const deviceType = computed(() => device.value?.type || '')
const deviceNum = computed(() => parseInt(props.deviceId, 10) || 0)

// Event handlers
const handleConnect = () => {
  if (device.value) {
    deviceStore.toggleDeviceConnection(device.value.id)
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
