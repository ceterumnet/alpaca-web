<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import EnhancedTelescopePanelMigrated from '@/components/devices/EnhancedTelescopePanelMigrated.vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import BaseDevicePanel from '@/components/panels/BaseDevicePanel.vue'
import { debugLog } from '@/utils/debugUtils'

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
  console.log(
    'TelescopePanelMigrated: Slewing to coordinates:',
    ra,
    dec,
    'deviceId:',
    props.deviceId
  )

  // Update telescope properties
  store.updateDeviceProperties(props.deviceId, {
    targetRa: ra,
    targetDec: dec,
    slewing: true
  })

  // Call the API directly - this addresses the issue with connect/disconnect not working
  store
    .callDeviceMethod(props.deviceId, 'slew', [ra, dec])
    .then(() => {
      console.log('Slew method called successfully')
    })
    .catch((error) => {
      console.error('Error calling slew method:', error)
    })

  // Keep the emit for compatibility with tests
  store.emit('callDeviceMethod', props.deviceId, 'slew', [ra, dec])

  // Simulate slew completion after a realistic delay
  setTimeout(() => {
    store.updateDeviceProperties(props.deviceId, {
      slewing: false,
      // Update current position to target after slew completes
      rightAscension: ra,
      declination: dec
    })
  }, 5000) // Simulate 5 seconds of slewing
}

const handleTrackingToggle = (enabled: boolean) => {
  console.log('TelescopePanelMigrated: Setting tracking:', enabled, 'deviceId:', props.deviceId)

  // Update device properties
  store.updateDeviceProperties(props.deviceId, {
    tracking: enabled,
    trackingEnabled: enabled
  })

  // Call the API directly
  store
    .callDeviceMethod(props.deviceId, 'setTracking', [enabled])
    .then(() => {
      console.log('setTracking method called successfully')
    })
    .catch((error) => {
      console.error('Error calling setTracking method:', error)
    })
}

const handlePark = () => {
  console.log('TelescopePanelMigrated: Parking telescope, deviceId:', props.deviceId)

  // Update device properties
  store.updateDeviceProperties(props.deviceId, {
    parking: true,
    parked: false
  })

  // Call the API directly
  store
    .callDeviceMethod(props.deviceId, 'park', [])
    .then(() => {
      console.log('Park method called successfully')
    })
    .catch((error) => {
      console.error('Error calling park method:', error)
    })

  // Keep the emit for compatibility with tests
  store.emit('callDeviceMethod', props.deviceId, 'park', [])

  // Simulate parking completion
  setTimeout(() => {
    store.updateDeviceProperties(props.deviceId, {
      parking: false,
      parked: true,
      slewing: false
    })
  }, 3000) // Simulate 3 seconds of parking
}

const handleUnpark = () => {
  console.log('TelescopePanelMigrated: Unparking telescope, deviceId:', props.deviceId)

  // Update device properties
  store.updateDeviceProperties(props.deviceId, {
    parking: true,
    parked: true
  })

  // Call the API directly
  store
    .callDeviceMethod(props.deviceId, 'unpark', [])
    .then(() => {
      console.log('Unpark method called successfully')
    })
    .catch((error) => {
      console.error('Error calling unpark method:', error)
    })

  // Keep the emit for compatibility with tests
  store.emit('callDeviceMethod', props.deviceId, 'unpark', [])

  // Simulate unparking completion
  setTimeout(() => {
    store.updateDeviceProperties(props.deviceId, {
      parking: false,
      parked: false
    })
  }, 2000) // Simulate 2 seconds of unparking
}
</script>

<template>
  <BaseDevicePanel
    ref="basePanel"
    :device-id="deviceId"
    :title="title"
    :api-base-url="effectiveApiBaseUrl"
  >
    <EnhancedTelescopePanelMigrated
      :panel-name="title"
      :connected="basePanel?.isConnected === undefined ? false : basePanel.isConnected"
      :device-type="basePanel?.deviceType || 'telescope'"
      :device-id="deviceId"
      :device-num="basePanel?.deviceNum || 0"
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
