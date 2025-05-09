// Status: Good - Part of new panel system // This component handles camera exposure control with
proper ASCOM Alpaca protocol support // Features: // - Exposure start/abort // - Progress tracking
// - Image ready polling // - Error handling // - Event emission for UI updates
<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, onMounted } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { CameraClient } from '@/api/alpaca/camera-client'

// Add a debug function
function debugClientStatus(store: {
  getDeviceById: (id: string) => Record<string, unknown> | null;
  getDeviceClient: (id: string) => unknown | null;
}, deviceId: string) {
  const device = store.getDeviceById(deviceId)
  console.log(`DEBUG - Device status for ${deviceId}:`, {
    device: device ? {
      id: device.id,
      type: device.type,
      isConnected: device.isConnected,
      apiBaseUrl: device.apiBaseUrl,
      hasProperties: !!device.properties
    } : null,
    hasClient: !!store.getDeviceClient(deviceId)
  })
}

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  label: {
    type: String,
    default: 'Exposure'
  },
  method: {
    type: String,
    default: 'startexposure'
  },
  stopMethod: {
    type: String,
    default: 'abortexposure'
  },
  downloadMethod: {
    type: String,
    default: 'imagearray'
  }
})

const emit = defineEmits(['exposureStarted', 'exposureComplete', 'imageDownloaded', 'error'])

// Store
const unifiedStore = useUnifiedStore()

// State
const exposureDuration = ref(1.0)
const isLight = ref(true)
const exposureInProgress = ref(false)
const percentComplete = ref(0)
const imageReady = ref(false)
const error = ref('')
const pollingIntervals = ref<number[]>([])

// Add reactive refs for component state tracking
const componentState = ref({
  lastPropsUpdate: Date.now(),
  lastStoreUpdate: Date.now(),
  deviceConnectionChecked: false,
  deviceHasClient: false,
  lastError: ''
})

// Computed properties
const isConnected = computed(() => {
  const device = unifiedStore.getDeviceById(props.deviceId)
  return device?.isConnected || false
})

const buttonText = computed(() => {
  if (exposureInProgress.value) {
    return 'Abort'
  }
  return props.label || 'Expose'
})

// Method to start an exposure
const startExposure = async () => {
  if (!isConnected.value) {
    error.value = 'Device not connected'
    emit('error', error.value)
    return
  }

  // Debug client status before operation
  debugClientStatus(unifiedStore, props.deviceId)

  // Verify we're dealing with a camera device
  const device = unifiedStore.getDeviceById(props.deviceId)
  if (!device || device.type !== 'camera') {
    error.value = `Device ${props.deviceId} is not a camera (type: ${device?.type})`
    console.error(error.value)
    emit('error', error.value)
    return
  }
  
  // Get the client - check if it's a CameraClient for direct method access
  const client = unifiedStore.getDeviceClient(props.deviceId)
  const isCameraClient = client && typeof client === 'object' && 'startExposure' in client

  if (exposureInProgress.value) {
    // If exposure is already in progress, abort it
    try {
      if (isCameraClient) {
        // Use direct camera client method if available (still uses PUT but with type safety)
        console.log('Using CameraClient.abortExposure() for proper abort')
        const cameraClient = client as CameraClient
        await cameraClient.abortExposure()
      } else {
        // Fall back to callDeviceMethod (which uses PUT correctly for this method)
        console.log('Using callDeviceMethod for abortexposure')
        // @ts-expect-error - Store has TypeScript 'this' context issues that need to be fixed
        await unifiedStore.callDeviceMethod(props.deviceId, props.stopMethod)
      }
      
      console.log('Exposure aborted')
      exposureInProgress.value = false
      percentComplete.value = 0
      clearPollingIntervals()
    } catch (err) {
      error.value = `Failed to abort exposure: ${err}`
      console.error(`Abort error:`, err)
      emit('error', error.value)
    }
    return
  }

  // Start a new exposure
  try {
    error.value = ''
    exposureInProgress.value = true
    percentComplete.value = 0
    imageReady.value = false

    if (isCameraClient) {
      // Use direct camera client method if available (uses PUT correctly)
      console.log('Using CameraClient.startExposure() for proper exposure start')
      const cameraClient = client as CameraClient
      await cameraClient.startExposure(exposureDuration.value, isLight.value)
    } else {
      // Fall back to callDeviceMethod (which uses PUT correctly for this method)
      console.log('Using callDeviceMethod for startexposure')
      // @ts-expect-error - Store has TypeScript 'this' context issues that need to be fixed
      await unifiedStore.callDeviceMethod(props.deviceId, props.method, [
        { Duration: exposureDuration.value, Light: isLight.value }
      ])
    }

    emit('exposureStarted', { duration: exposureDuration.value, isLight: isLight.value })

    // Set up polling for percentcompleted and imageready
    setupPolling()
  } catch (err) {
    exposureInProgress.value = false
    error.value = `Failed to start exposure: ${err}`
    console.error(`Start exposure error:`, err)
    emit('error', error.value)
  }
}

// Set up polling for exposure progress and image ready status
const setupPolling = () => {
  clearPollingIntervals()

  console.log('%c🔄 CameraExposureControl: Starting exposure polling', 'color: purple')

  // Poll for percent completed (every 500ms)
  const progressInterval = window.setInterval(async () => {
    try {
      const percent = await unifiedStore.getDeviceProperty(props.deviceId, 'percentcompleted')
      percentComplete.value = typeof percent === 'number' ? percent : 0

      // Check if the exposure is complete
      if (percentComplete.value >= 100) {
        exposureInProgress.value = false
        emit('exposureComplete')
        // Clear this interval since exposure is complete
        clearInterval(progressInterval)

        // Remove from our tracking array
        pollingIntervals.value = pollingIntervals.value.filter((id) => id !== progressInterval)

        console.log(
          '%c✅ CameraExposureControl: Exposure complete, starting image ready polling',
          'color: green'
        )

        // Start image ready polling only after exposure is complete
        startImageReadyPolling()
      }
    } catch (err) {
      console.error('Error polling exposure progress:', err)
    }
  }, 500)

  // Add interval to our tracking array
  pollingIntervals.value.push(progressInterval)
}

// Separate function to start image ready polling
const startImageReadyPolling = () => {
  // Poll for image ready (every 1 second)
  const readyInterval = window.setInterval(async () => {
    try {
      console.log('%c🔍 CameraExposureControl: Polling imageready', 'color: orange')
      const ready = await unifiedStore.getDeviceProperty(props.deviceId, 'imageready')
      imageReady.value = Boolean(ready)

      // If image is ready, download it
      if (imageReady.value) {
        console.log(
          '%c📷 CameraExposureControl: Image ready detected, stopping polling',
          'color: green'
        )
        // Stop polling for image ready
        clearInterval(readyInterval)

        // Remove from our tracking array
        pollingIntervals.value = pollingIntervals.value.filter((id) => id !== readyInterval)

        // Download the image
        await downloadImage()
      }
    } catch (err) {
      console.error('Error polling image ready status:', err)
    }
  }, 1000)

  // Add interval to our tracking array
  pollingIntervals.value.push(readyInterval)
}

// Clear all polling intervals
const clearPollingIntervals = () => {
  pollingIntervals.value.forEach((id) => clearInterval(id))
  pollingIntervals.value = []
}

// Download the image from the camera using the correct ASCOM Alpaca ImageBytes format
const downloadImage = async () => {
  try {
    console.log('Downloading image...')
    debugClientStatus(unifiedStore, props.deviceId)

    try {
      // Get device information
      const device = unifiedStore.getDeviceById(props.deviceId)
      if (!device) {
        throw new Error(`Device ${props.deviceId} not found`)
      }
      
      // Get the client - we'll check if it's a CameraClient
      const client = unifiedStore.getDeviceClient(props.deviceId)
      
      // Try different methods to get the image, storing the result in this variable
      let imageData: ArrayBuffer | null = null
      
      if (client && typeof client === 'object' && 'getImageData' in client) {
        // If the client has a getImageData method (CameraClient), use it directly
        // This uses GET as specified in the ASCOM standard
        console.log('Using CameraClient.getImageData() for proper GET request')
        const cameraClient = client as CameraClient
        imageData = await cameraClient.getImageData()
        
        if (imageData) {
          console.log(`Successfully received image data, size: ${imageData.byteLength} bytes`)
          emit('imageDownloaded', imageData)
          return
        }
      } else {
        console.log('Client does not have getImageData method, trying alternative approaches')
      }
      
      // Fallback to a custom direct GET request
      // This section creates a direct GET request instead of using callDeviceMethod
      if (!imageData && device?.apiBaseUrl) {
        try {
          // Create a URL for direct image download
          const apiBaseUrl = device.apiBaseUrl
          const endpoint = `${apiBaseUrl}/${props.downloadMethod}`
          console.log(`Attempting direct image download with GET from: ${endpoint}`)
          
          // Use fetch API with proper headers for Alpaca ImageBytes format
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              Accept: 'application/imagebytes,application/json',
              'User-Agent': 'AlpacaWeb'
            }
          })
          
          if (!response.ok) {
            throw new Error(`HTTP error: ${response.status} ${response.statusText}`)
          }
          
          // Get binary data as ArrayBuffer
          const fetchedData = await response.arrayBuffer()
          console.log(`Successfully received image data via direct GET, size: ${fetchedData.byteLength} bytes`)
          emit('imageDownloaded', fetchedData)
          return
        } catch (fetchError) {
          console.warn(`Direct fetch failed: ${fetchError}`)
          // Continue to next approach
        }
      }
      
      // Last resort: Try JSON array format (this is highly inefficient but might work with older devices)
      if (!imageData) {
        try {
          console.warn('Falling back to JSON array format (this will be slow)')
          // Need to use a direct fetch with GET for imagearray
          const jsonEndpoint = `${device?.apiBaseUrl}/imagearray`
          const jsonResponse = await fetch(jsonEndpoint, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              'User-Agent': 'AlpacaWeb'
            }
          })
          
          if (jsonResponse.ok) {
            const jsonData = await jsonResponse.json()
            if (jsonData && jsonData.Value && Array.isArray(jsonData.Value)) {
              // Convert JSON array to typed array
              const typedArray = new Uint8Array(jsonData.Value)
              const jsonImageData = typedArray.buffer
              console.log(`Successfully received image data via JSON, size: ${jsonImageData.byteLength} bytes`)
              emit('imageDownloaded', jsonImageData)
              return
            }
          }
        } catch (jsonError) {
          console.warn(`JSON fallback failed: ${jsonError}`)
        }
      }
      
      throw new Error('All image download attempts failed')
    } catch (err) {
      console.error(`Image download error:`, err)
      error.value = `Failed to download image: ${err}`
      emit('error', error.value)
    }
  } catch (error) {
    console.error('Connection error:', error)
    console.log(`=== CONNECTION DEBUG END ===`)
  }
}

// Add a watcher for deviceId changes to force refresh
watch(() => props.deviceId, (newId, oldId) => {
  if (newId !== oldId) {
    // Clear intervals and reset state if the device changes
    clearPollingIntervals()
    exposureInProgress.value = false
    percentComplete.value = 0
    imageReady.value = false
    error.value = ''
    
    // Update component state tracking
    componentState.value.lastPropsUpdate = Date.now()
    console.log(`[CameraExposureControl] Device ID changed from ${oldId} to ${newId}`)
    
    // Force debug check of device state
    debugClientStatus(unifiedStore, newId)
    
    // Check device connection
    const device = unifiedStore.getDeviceById(newId)
    componentState.value.deviceConnectionChecked = true
    componentState.value.deviceHasClient = device?.isConnected || false
    
    console.log(`[CameraExposureControl] State after device change:`, {
      deviceId: newId,
      deviceFound: !!device,
      isConnected: device?.isConnected,
      componentState: { ...componentState.value }
    })
  }
}, { immediate: true })

// Add explicit update for isConnected value
const forceUpdateDisplay = () => {
  componentState.value.lastStoreUpdate = Date.now()
  const device = unifiedStore.getDeviceById(props.deviceId)
  componentState.value.deviceHasClient = device?.isConnected || false
}

// Periodic check for updates - helps with reactivity issues
onMounted(() => {
  const updateInterval = setInterval(() => {
    forceUpdateDisplay()
  }, 2000) // check every 2 seconds
  
  // Clean up on unmount
  onBeforeUnmount(() => {
    clearInterval(updateInterval)
  })
})
</script>

<template>
  <div class="aw-camera-exposure-control">
    <div class="aw-camera-exposure-control__settings">
      <div class="aw-form-group">
        <label for="exposure-duration" class="aw-form-label">Duration (s):</label>
        <input
          id="exposure-duration"
          v-model.number="exposureDuration"
          type="number"
          min="0.001"
          max="3600"
          step="0.1"
          class="aw-input"
          :disabled="exposureInProgress"
        />
      </div>

      <div class="aw-form-group">
        <label for="exposure-type" class="aw-form-label">Type:</label>
        <select 
          id="exposure-type" 
          v-model="isLight" 
          class="aw-select"
          :disabled="exposureInProgress"
        >
          <option :value="true">Light</option>
          <option :value="false">Dark</option>
        </select>
      </div>
    </div>

    <div class="aw-camera-exposure-control__action">
      <button
        class="aw-button"
        :class="{
          'aw-button--primary': !exposureInProgress,
          'aw-button--danger': exposureInProgress
        }"
        :disabled="!isConnected"
        @click="startExposure"
      >
        {{ buttonText }}
      </button>
    </div>

    <div v-if="exposureInProgress || percentComplete > 0" class="aw-camera-exposure-control__progress">
      <div class="aw-camera-exposure-control__progress-bar">
        <div class="aw-camera-exposure-control__progress-fill" :style="{ width: `${percentComplete}%` }"></div>
      </div>
      <div class="aw-camera-exposure-control__progress-text">{{ percentComplete.toFixed(0) }}%</div>
    </div>

    <div v-if="error" class="aw-form-error">{{ error }}</div>
  </div>
</template>

<style scoped>
.aw-camera-exposure-control {
  display: flex;
  flex-direction: column;
  gap: var(--aw-spacing-md);
  width: 100%;
}

.aw-camera-exposure-control__settings {
  display: flex;
  flex-wrap: wrap;
  gap: var(--aw-spacing-md);
}

.aw-camera-exposure-control__action {
  display: flex;
  justify-content: flex-start;
}

.aw-camera-exposure-control__progress {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-md);
}

.aw-camera-exposure-control__progress-bar {
  flex: 1;
  height: 0.75rem;
  background-color: var(--aw-color-neutral-300);
  border-radius: var(--aw-border-radius-sm);
  overflow: hidden;
}

.aw-camera-exposure-control__progress-fill {
  height: 100%;
  background-color: var(--aw-color-primary-500);
  transition: width 0.3s ease-in-out;
}

.aw-camera-exposure-control__progress-text {
  min-width: 3rem;
  text-align: right;
  font-weight: 500;
}
</style>
