<script setup lang="ts">
import { ref } from 'vue'
import EnhancedTelescopePanel from '../EnhancedTelescopePanel.vue'
import UnifiedStore from '../../stores/UnifiedStore'
import BaseDevicePanel from './BaseDevicePanel.vue'

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
const store = UnifiedStore

// Handle telescope actions
const handleSlew = (ra: string, dec: string) => {
  store.emit('callDeviceMethod', props.deviceId, 'slewToCoordinates', [ra, dec])
}

const handleTrackingToggle = (enabled: boolean) => {
  store.updateDeviceProperties(props.deviceId, { tracking: enabled })
}

const handlePark = () => {
  store.emit('callDeviceMethod', props.deviceId, 'park', [])
}

const handleUnpark = () => {
  store.emit('callDeviceMethod', props.deviceId, 'unpark', [])
}
</script>

<template>
  <BaseDevicePanel ref="basePanel" :device-id="deviceId" :title="title">
    <EnhancedTelescopePanel
      :panel-name="title"
      :connected="basePanel?.isConnected"
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
