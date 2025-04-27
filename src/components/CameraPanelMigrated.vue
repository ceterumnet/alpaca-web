<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import EnhancedCameraPanel from './EnhancedCameraPanel.vue'
import { useUnifiedStore } from '../stores/UnifiedStore'
import BaseDevicePanel from './BaseDevicePanel.vue'
import { debugLog } from '../utils/debugUtils'

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: 'Camera'
  },
  apiBaseUrl: {
    type: String,
    default: ''
  }
})

const basePanel = ref()
const store = useUnifiedStore()

// Get the device directly from the store to access its apiBaseUrl
// Instead of searching by ID, find the device by type and idx/deviceNum
// since the MainPanels component is passing deviceNum as deviceId
const device = computed(() => {
  // First try to get by ID directly
  const deviceById = store.getDeviceById(props.deviceId)
  if (deviceById) {
    debugLog('Found device by direct ID lookup:', deviceById.id)
    return deviceById
  }

  // If that fails, try to find the device by type and number
  // Convert deviceId to number if possible
  const deviceNum = parseInt(props.deviceId, 10)
  if (!isNaN(deviceNum)) {
    // Find camera device with matching idx
    const byIdx = store.devicesList.find(
      (d) =>
        (d.type === 'camera' || d.deviceType === 'camera') &&
        (d.idx === deviceNum || d.deviceNum === deviceNum)
    )

    if (byIdx) {
      debugLog('Found device by idx lookup:', byIdx.id)
      return byIdx
    }
  }

  // Try by standard formatted ID (type-number)
  if (props.deviceId.includes('-')) {
    const parts = props.deviceId.split('-')
    const num = parts[parts.length - 1]
    const standardId = `camera-${num}`

    const byStandardId = store.getDeviceById(standardId)
    if (byStandardId) {
      debugLog('Found device by standard ID format:', standardId)
      return byStandardId
    }
  }

  // Last resort - try to find by constructed ID
  const constructedId = `camera-0` // Common format from our AddDevice code
  const byConstructedId = store.getDeviceById(constructedId)
  if (byConstructedId) {
    debugLog('Found device by constructed ID:', constructedId)
    return byConstructedId
  }

  // If we found no matching device, check all devices for debugging
  debugLog(
    'All available devices:',
    store.devicesList.map((d) => ({
      id: d.id,
      type: d.type,
      idx: d.idx,
      apiBaseUrl: d.apiBaseUrl
    }))
  )

  return null
})

// Add debugging on mount
onMounted(() => {
  debugLog('CameraPanelMigrated mounted with props', {
    deviceId: props.deviceId,
    title: props.title,
    propsApiBaseUrl: props.apiBaseUrl
  })

  if (device.value) {
    debugLog('Device from store has apiBaseUrl', {
      deviceApiBaseUrl: device.value.apiBaseUrl,
      deviceId: device.value.id,
      deviceIdx: device.value.idx
    })
  } else {
    debugLog('No device found in store with ID', props.deviceId)

    // Log all devices in the store with their apiBaseUrl and IDs
    debugLog(
      'All devices in store with apiBaseUrl:',
      store.devicesList.map((d) => ({
        id: d.id,
        type: d.type,
        idx: d.idx,
        apiBaseUrl: d.apiBaseUrl
      }))
    )
  }
})

// Watch for changes in the device or props
watch(
  [() => device.value, () => props.apiBaseUrl],
  ([newDevice, newApiBaseUrl]) => {
    debugLog('Device or apiBaseUrl changed', {
      hasDevice: !!newDevice,
      deviceApiBaseUrl: newDevice?.apiBaseUrl,
      propsApiBaseUrl: newApiBaseUrl
    })
  },
  { immediate: true }
)

// Use computed property to get the correct apiBaseUrl
const effectiveApiBaseUrl = computed<string>(() => {
  // First check the prop - this comes from MainPanels
  if (props.apiBaseUrl && props.apiBaseUrl.trim() !== '') {
    return props.apiBaseUrl
  }

  // Then check the device from the store
  if (device.value && device.value.apiBaseUrl) {
    return String(device.value.apiBaseUrl)
  }

  // Fallback to empty string
  return ''
})

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
      :api-base-url="effectiveApiBaseUrl"
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
