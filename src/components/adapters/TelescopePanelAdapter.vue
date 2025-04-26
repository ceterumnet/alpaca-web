<script setup lang="ts">
import { ref } from 'vue'
import EnhancedTelescopePanel from '../EnhancedTelescopePanel.vue'
import { useDeviceStore } from '../../stores/useDeviceStore'
import BaseDeviceAdapter from './BaseDeviceAdapter.vue'

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

const baseAdapter = ref()
const deviceStore = useDeviceStore()

// Handle telescope actions
const handleSlew = (ra: string, dec: string) => {
  deviceStore.slewToCoordinates(props.deviceId, ra, dec)
}

const handleTrackingToggle = (enabled: boolean) => {
  deviceStore.setTelescopeTracking(props.deviceId, enabled)
}

const handlePark = () => {
  deviceStore.parkTelescope(props.deviceId)
}

const handleUnpark = () => {
  deviceStore.unparkTelescope(props.deviceId)
}
</script>

<template>
  <BaseDeviceAdapter ref="baseAdapter" :device-id="deviceId" :title="title">
    <EnhancedTelescopePanel
      :panel-name="title"
      :connected="baseAdapter?.connected"
      :device-type="baseAdapter?.deviceType || 'telescope'"
      :device-id="deviceId"
      :device-num="baseAdapter?.deviceNum"
      :idx="deviceId"
      @connect="baseAdapter?.handleConnect"
      @mode-change="baseAdapter?.handleModeChange"
      @slew="handleSlew"
      @toggle-tracking="handleTrackingToggle"
      @park="handlePark"
      @unpark="handleUnpark"
    />
  </BaseDeviceAdapter>
</template>
