<script setup lang="ts">
import { ref, computed } from 'vue'
import EnhancedTelescopePanel from './EnhancedTelescopePanel.vue'
import UnifiedStore from '../stores/UnifiedStore'
import BaseDevicePanel from './BaseDevicePanel.vue'
import type { TelescopeDevice } from '../types/DeviceTypes'

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: 'Telescope'
  }
})

const basePanel = ref()
const store = new UnifiedStore()

// Get the telescope device from the unified store
const telescope = computed(() => {
  const device = store.getDeviceById(props.deviceId)
  return device?.type === 'telescope' ? (device as TelescopeDevice) : null
})

// Handle telescope-specific actions
const handleSlew = (ra: string, dec: string) => {
  if (telescope.value) {
    // Update telescope properties
    store.updateDeviceProperties(props.deviceId, {
      targetRa: ra,
      targetDec: dec
    })

    // Call device method
    store.emit('callDeviceMethod', props.deviceId, 'slew', [ra, dec])
  }
}

const handleTrackingToggle = (enabled: boolean) => {
  if (telescope.value) {
    store.updateDeviceProperties(props.deviceId, {
      trackingEnabled: enabled
    })
  }
}

const handlePark = () => {
  if (telescope.value) {
    store.emit('callDeviceMethod', props.deviceId, 'park', [])
  }
}

const handleUnpark = () => {
  if (telescope.value) {
    store.emit('callDeviceMethod', props.deviceId, 'unpark', [])
  }
}
</script>

<template>
  <BaseDevicePanel ref="basePanel" :device-id="deviceId" :title="title">
    <EnhancedTelescopePanel
      :panel-name="title"
      :connected="basePanel?.connected"
      :device-type="basePanel?.deviceType || 'telescope'"
      :device-id="deviceId"
      :device-num="basePanel?.deviceNum"
      :idx="deviceId"
      @connect="basePanel?.handleConnect"
      @mode-change="basePanel?.handleModeChange"
      @slew="handleSlew"
      @toggle-tracking="handleTrackingToggle"
      @park="handlePark"
      @unpark="handleUnpark"
    />
  </BaseDevicePanel>
</template>
