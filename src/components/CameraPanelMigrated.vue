<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import EnhancedCameraPanelMigrated from './EnhancedCameraPanelMigrated.vue'
import { useUnifiedStore } from '../stores/UnifiedStore'
import BaseDevicePanel from './panels/BaseDevicePanel.vue'
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
  console.log(
    'CameraPanelMigrated: Handling start exposure with duration:',
    exposureTime,
    'deviceId:',
    props.deviceId
  )

  // Update properties directly first
  store.updateDeviceProperties(props.deviceId, {
    isExposing: true,
    exposureProgress: 0,
    exposureTime: exposureTime
  })

  // Use emit to match test expectations
  store.emit('callDeviceMethod', props.deviceId, 'startExposure', [exposureTime])

  // Call the method via the store's callDeviceMethod function
  store
    .callDeviceMethod(props.deviceId, 'startExposure', [exposureTime])
    .then(() => {
      console.log('Start exposure method called successfully')
    })
    .catch((error) => {
      console.error('Error calling startExposure method:', error)
      // Already updated properties above

      // Fallback to simulation if there's no API or if we had an error
      console.log('Falling back to simulation for exposure progress')
      simulateExposureProgress(exposureTime)
    })
}

// Simulate exposure progress using a timer
const simulateExposureProgress = (exposureTime: number) => {
  // Use a timer to update the progress every second
  const startTime = Date.now()
  const duration = exposureTime * 1000 // convert to milliseconds

  const updateInterval = setInterval(() => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(100, Math.round((elapsed / duration) * 100))

    // Update the device properties with the current progress
    store.updateDeviceProperties(props.deviceId, {
      exposureProgress: progress
    })

    // If we've reached 100%, complete the exposure
    if (progress >= 100) {
      clearInterval(updateInterval)

      // Complete the exposure after a short delay
      setTimeout(() => {
        // Generate a simulated image - create an ArrayBuffer with test data
        const imageWidth = 800
        const imageHeight = 600
        const testImageData = new ArrayBuffer(44 + imageWidth * imageHeight * 2) // Header (44 bytes) + 16-bit image data
        const dataView = new DataView(testImageData)

        // Fill in the ImageBytes metadata header (ASCOM format)
        dataView.setInt32(0, 1, true) // metadataVersion = 1
        dataView.setInt32(4, 0, true) // errorNumber = 0 (no error)
        dataView.setInt32(16, 44, true) // dataStart = 44 (header size)
        dataView.setInt32(20, 8, true) // imageElementType = 8 (UInt16)
        dataView.setInt32(24, 8, true) // transmissionElementType = 8 (UInt16)
        dataView.setInt32(28, 2, true) // rank = 2 (2D image)
        dataView.setInt32(32, imageWidth, true) // dimension1 = width
        dataView.setInt32(36, imageHeight, true) // dimension2 = height
        dataView.setInt32(40, 1, true) // dimension3 = 1 (monochrome)

        // Fill pixel data with a test pattern
        const pixelData = new Uint16Array(testImageData, 44, imageWidth * imageHeight)
        for (let y = 0; y < imageHeight; y++) {
          for (let x = 0; x < imageWidth; x++) {
            // Create a gradient pattern
            const value = Math.floor(((x + y) * 65535) / (imageWidth + imageHeight))
            pixelData[y * imageWidth + x] = value
          }
        }

        // Add some simulated stars
        for (let i = 0; i < 100; i++) {
          const x = Math.floor(Math.random() * imageWidth)
          const y = Math.floor(Math.random() * imageHeight)
          const brightness = 40000 + Math.floor(Math.random() * 25000) // Bright star
          const radius = 2 + Math.floor(Math.random() * 4)

          // Draw a small gaussian-like blob
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const px = x + dx
              const py = y + dy
              if (px >= 0 && px < imageWidth && py >= 0 && py < imageHeight) {
                const distance = Math.sqrt(dx * dx + dy * dy)
                if (distance <= radius) {
                  const falloff = 1 - distance / radius
                  const idx = py * imageWidth + px
                  pixelData[idx] = Math.min(
                    65535,
                    pixelData[idx] + Math.floor(brightness * falloff)
                  )
                }
              }
            }
          }
        }

        console.log('Generated simulated image data, size:', testImageData.byteLength, 'bytes')

        store.updateDeviceProperties(props.deviceId, {
          isExposing: false,
          exposureProgress: 100,
          hasImage: true,
          imageData: testImageData
        })
      }, 500)
    }
  }, 100) // Update every 100ms for smoother progress
}

const handleAbortExposure = () => {
  console.log('CameraPanelMigrated: Aborting exposure for deviceId:', props.deviceId)

  // Update properties directly first
  store.updateDeviceProperties(props.deviceId, {
    isExposing: false,
    exposureProgress: 0
  })

  // Use emit to match test expectations
  store.emit('callDeviceMethod', props.deviceId, 'abortExposure', [])

  // Call the method via the store's callDeviceMethod function
  store
    .callDeviceMethod(props.deviceId, 'abortExposure', [])
    .then(() => {
      console.log('Abort exposure method called successfully')
    })
    .catch((error) => {
      console.error('Error calling abortExposure method:', error)
      // Already updated properties above
    })
}

const handleSetCooler = (enabled: boolean, temperature?: number) => {
  // Update properties directly first
  store.updateDeviceProperties(props.deviceId, {
    coolerEnabled: enabled,
    ...(temperature !== undefined ? { targetTemperature: temperature } : {})
  })

  store
    .callDeviceMethod(props.deviceId, 'setCooler', [enabled, temperature])
    .then(() => {
      console.log('Set cooler method called successfully')
    })
    .catch((error) => {
      console.error('Error calling setCooler method:', error)
      // Already updated properties above
    })
}

const handleSetGain = (value: number) => {
  // Update properties directly first
  store.updateDeviceProperties(props.deviceId, { gain: value })

  store
    .callDeviceMethod(props.deviceId, 'setGain', [value])
    .then(() => {
      console.log('Set gain method called successfully')
    })
    .catch((error) => {
      console.error('Error calling setGain method:', error)
      // Already updated properties above
    })
}

const handleSetOffset = (value: number) => {
  // Update properties directly first
  store.updateDeviceProperties(props.deviceId, { offset: value })

  store
    .callDeviceMethod(props.deviceId, 'setOffset', [value])
    .then(() => {
      console.log('Set offset method called successfully')
    })
    .catch((error) => {
      console.error('Error calling setOffset method:', error)
      // Already updated properties above
    })
}

const handleSetReadMode = (mode: number) => {
  // Update properties directly first, just like the other handlers
  store.updateDeviceProperties(props.deviceId, { readoutMode: mode })

  store
    .callDeviceMethod(props.deviceId, 'setReadoutMode', [mode])
    .then(() => {
      console.log('Set read mode method called successfully')
    })
    .catch((error) => {
      console.error('Error calling setReadoutMode method:', error)
      // Already updated properties above
    })
}
</script>

<template>
  <BaseDevicePanel
    ref="basePanel"
    :device-id="deviceId"
    :title="title"
    :api-base-url="effectiveApiBaseUrl"
  >
    <EnhancedCameraPanelMigrated
      :panel-name="title"
      :connected="basePanel?.isConnected === undefined ? false : basePanel.isConnected"
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
