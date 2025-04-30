<script setup lang="ts">
import { ref } from 'vue'
import EnhancedCameraPanelMigrated from '@/components/devices/EnhancedCameraPanelMigrated.vue'
import { useLegacyDeviceStore } from '@/stores/deviceStoreAdapter'
import BaseDeviceAdapter from './BaseDeviceAdapter.vue'

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

const baseAdapter = ref()
const deviceStore = useLegacyDeviceStore()

// Handle camera-specific actions
const handleStartExposure = (exposureTime: number) => {
  deviceStore.startExposure(props.deviceId, exposureTime)
}

const handleAbortExposure = () => {
  // Implement this method in device store if needed
  console.log('Abort exposure requested for camera', props.deviceId)
}

const handleSetCooler = (enabled: boolean, temperature?: number) => {
  deviceStore.setCooler(props.deviceId, enabled, temperature)
}

const handleSetGain = (value: number) => {
  const device = baseAdapter.value?.device?.value
  if (device) {
    device.gain = value
  }
}

const handleSetOffset = (value: number) => {
  // Implement this method in device store if needed
  console.log('Set offset requested for camera', props.deviceId, 'value:', value)
}

const handleSetReadMode = (mode: number) => {
  // Implement this method in device store if needed
  console.log('Set read mode requested for camera', props.deviceId, 'mode:', mode)
}
</script>

<template>
  <BaseDeviceAdapter ref="baseAdapter" :device-id="deviceId" :title="title">
    <EnhancedCameraPanelMigrated
      :panel-name="title"
      :connected="baseAdapter?.connected"
      :device-type="baseAdapter?.deviceType || 'camera'"
      :device-id="deviceId"
      :device-num="baseAdapter?.deviceNum"
      :idx="deviceId"
      @connect="baseAdapter?.handleConnect"
      @mode-change="baseAdapter?.handleModeChange"
      @start-exposure="handleStartExposure"
      @abort-exposure="handleAbortExposure"
      @set-cooler="handleSetCooler"
      @set-gain="handleSetGain"
      @set-offset="handleSetOffset"
      @set-read-mode="handleSetReadMode"
    />
  </BaseDeviceAdapter>
</template>
