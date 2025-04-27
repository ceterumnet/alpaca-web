<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import EnhancedTelescopePanel from './EnhancedTelescopePanel.vue'
import { useUnifiedStore } from '../stores/UnifiedStore'
import BaseDevicePanel from './BaseDevicePanel.vue'
import type { TelescopeDevice } from '../types/DeviceTypes'
import { debugLog } from '../utils/debugUtils'

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: 'Telescope'
  },
  apiBaseUrl: {
    type: String,
    default: ''
  }
})

const basePanel = ref()
const store = useUnifiedStore()

// Get the device directly from the store using either ID or deviceNum
// This is needed because MainPanels passes deviceNum as deviceId
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
    // Find telescope device with matching idx
    const byIdx = store.devicesList.find(
      (d) =>
        (d.type === 'telescope' || d.deviceType === 'telescope') &&
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
    const standardId = `telescope-${num}`

    const byStandardId = store.getDeviceById(standardId)
    if (byStandardId) {
      debugLog('Found device by standard ID format:', standardId)
      return byStandardId
    }
  }

  // Last resort - try to find by constructed ID
  const constructedId = `telescope-0` // Common format from our AddDevice code
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

// Get the telescope device from the unified store
const telescope = computed(() => {
  return device.value?.type === 'telescope' ? (device.value as TelescopeDevice) : null
})

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

// Add debugging on mount
onMounted(() => {
  debugLog('TelescopePanelMigrated mounted with props', {
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
      :api-base-url="effectiveApiBaseUrl"
      @connect="basePanel?.handleConnect"
      @mode-change="basePanel?.handleModeChange"
      @slew="handleSlew"
      @toggle-tracking="handleTrackingToggle"
      @park="handlePark"
      @unpark="handleUnpark"
    />
  </BaseDevicePanel>
</template>
