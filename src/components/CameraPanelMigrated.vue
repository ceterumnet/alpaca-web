<script setup lang="ts">
import { ref } from 'vue'
import EnhancedCameraPanel from './EnhancedCameraPanel.vue'
import UnifiedStore from '../stores/UnifiedStore'
import BaseDevicePanel from './BaseDevicePanel.vue'

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: 'Camera'
  }
})

const basePanel = ref()
const store = new UnifiedStore()

// Handle camera-specific actions
const handleStartExposure = (exposureTime: number) => {
  store.emit('callDeviceMethod', props.deviceId, 'startExposure', [exposureTime])
}

const handleAbortExposure = () => {
  store.emit('callDeviceMethod', props.deviceId, 'abortExposure', [])
}

const handleSetCooler = (enabled: boolean, temperature?: number) => {
  store.updateDeviceProperties(props.deviceId, {
    coolerEnabled: enabled,
    ...(temperature !== undefined ? { targetTemperature: temperature } : {})
  })
}

const handleSetGain = (value: number) => {
  store.updateDeviceProperties(props.deviceId, { gain: value })
}

const handleSetOffset = (value: number) => {
  store.updateDeviceProperties(props.deviceId, { offset: value })
}

const handleSetReadMode = (mode: number) => {
  store.updateDeviceProperties(props.deviceId, { readoutMode: mode })
}
</script>

<template>
  <BaseDevicePanel ref="basePanel" :device-id="deviceId" :title="title">
    <EnhancedCameraPanel
      :panel-name="title"
      :connected="basePanel?.connected === true"
      :device-type="basePanel?.deviceType || 'camera'"
      :device-id="deviceId"
      :device-num="basePanel?.deviceNum || 0"
      :idx="deviceId"
      @connect="basePanel?.handleConnect"
      @mode-change="basePanel?.handleModeChange"
      @start-exposure="handleStartExposure"
      @abort-exposure="handleAbortExposure"
      @set-cooler="handleSetCooler"
      @set-gain="handleSetGain"
      @set-offset="handleSetOffset"
      @set-read-mode="handleSetReadMode"
    />
  </BaseDevicePanel>
</template>
