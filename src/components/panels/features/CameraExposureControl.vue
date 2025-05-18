// Status: Good - Part of new panel system 
// This component handles camera exposure control with
// proper ASCOM Alpaca protocol support
// Features: 
// - Exposure start/abort 
// - Progress tracking
// - Image ready polling 
// - Error handling 
// - Event emission for UI updates
<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, onMounted } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import Icon from '@/components/ui/Icon.vue'

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
    default: 'Start Exposure'
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
  },
  exposureMin: {
    type: Number,
    default: 0.001
  },
  exposureMax: {
    type: Number,
    default: 3600
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

const durationPresets = ref([0.01, 0.1, 1, 5, 10, 30, 60, 120, 300]);

// Method to clear the error message
const clearError = () => {
  error.value = ''
}

// Method to validate and clamp exposure duration
const validateExposureDuration = () => {
  if (exposureDuration.value < props.exposureMin) {
    exposureDuration.value = props.exposureMin
  }
  if (exposureDuration.value > props.exposureMax) {
    exposureDuration.value = props.exposureMax
  }
}

const setExposureDuration = (presetValue: number) => {
  exposureDuration.value = presetValue;
  validateExposureDuration(); // Ensure it's within min/max if presets are outside
};

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
  return props.label
})

// Method to start an exposure
const startExposure = async () => {
  if (!isConnected.value) {
    error.value = 'Device not connected'
    emit('error', error.value)
    return
  }

  console.log('exposureMin', props.exposureMin)
  console.log('exposureMax', props.exposureMax)
  // Validate exposure duration is within allowed range
  if (exposureDuration.value < props.exposureMin || exposureDuration.value > props.exposureMax) {
    error.value = `Exposure duration must be between ${props.exposureMin} and ${props.exposureMax} seconds`
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
  const isCameraClient = false // Always use store/service abstraction

  if (exposureInProgress.value) {
    // If exposure is already in progress, abort it
    try {
      // Always use callDeviceMethod for abortexposure
      console.log('Using callDeviceMethod for abortexposure')
      await unifiedStore.callDeviceMethod(props.deviceId, props.stopMethod)
      
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
      // Always use callDeviceMethod for startexposure
      console.log('Using callDeviceMethod for startexposure')
      await unifiedStore.callDeviceMethod(props.deviceId, props.method, [
        { Duration: exposureDuration.value, Light: isLight.value }
      ])
    } else {
      // Use the store/service abstraction
      console.log('Using store/service abstraction for startexposure')
      await unifiedStore.startCameraExposure(props.deviceId, exposureDuration.value, isLight.value)
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
      percentComplete.value = typeof percent === 'number' ? Math.min(Math.max(percent, 0), 100) : 0

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
          'color: #4caf50'
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
          'color: #4caf50'
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
      
      // Always use direct GET request for imagearray as per Alpaca spec
      const imageData: ArrayBuffer | null = null
      if (device?.apiBaseUrl) {
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
  <div class="aw-exposure-control" :class="{ 'is-connected': isConnected, 'exposure-active': exposureInProgress }">
    <div v-if="error" class="error-message">
      <Icon type="alert-triangle" class="error-icon" />
      <span>{{ error }}</span>
      <button class="dismiss-error-button" @click="clearError">
        <Icon type="close" />
      </button>
    </div>

    <div class="exposure-inputs">
      <div class="input-group duration-input-group">
        <label for="exposure-duration">Duration (s):</label>
        <input
          id="exposure-duration"
          v-model.number="exposureDuration"
          type="number"
          :min="exposureMin"
          :max="exposureMax"
          step="0.1"
          :disabled="exposureInProgress || !isConnected"
          class="aw-input"
          @change="validateExposureDuration"
        />
      </div>
      <div class="duration-presets">
        <button
          v-for="preset in durationPresets"
          :key="preset"
          :disabled="exposureInProgress || !isConnected"
          class="preset-button"
          :class="{ 'active': exposureDuration === preset }"
          @click="setExposureDuration(preset)"
        >
          {{ preset }}s
        </button>
      </div>

      <div class="input-group frame-type-group">
        <label class="frame-type-label">Frame Type:</label>
        <div class="frame-type-radios">
          <label class="radio-label">
            <input 
              v-model="isLight" 
              type="radio"
              name="frameType" 
              :value="true" 
              :disabled="exposureInProgress || !isConnected"
            >
            <span class="radio-text">Light</span>
          </label>
          <label class="radio-label">
            <input 
              v-model="isLight" 
              type="radio"
              name="frameType" 
              :value="false" 
              :disabled="exposureInProgress || !isConnected"
            >
            <span class="radio-text">Dark</span>
          </label>
        </div>
      </div>
    </div>

    <button
      class="exposure-button"
      :disabled="!isConnected || (exposureInProgress && percentComplete < 100)"
      @click="startExposure"
    >
      <Icon v-if="exposureInProgress && percentComplete < 100" type="refresh" animation="spin" class="button-icon" />
      <Icon v-else-if="buttonText === 'Abort'" type="player-stop" class="button-icon" />
      <Icon v-else type="camera" class="button-icon" />
      <span>{{ buttonText }}</span>
    </button>

    <div v-if="exposureInProgress" class="progress-bar-container">
      <div class="progress-bar" :style="{ width: percentComplete + '%' }"></div>
      <span class="progress-text">{{ percentComplete.toFixed(0) }}%</span>
    </div>
  </div>
</template>

<style scoped>
.aw-exposure-control {
  display: flex;
  flex-direction: column;
  gap: var(--aw-spacing-sm);
  padding: var(--aw-spacing-sm);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-sm);
  background-color: var(--aw-panel-content-bg-color);
}

.aw-exposure-control.exposure-active {
  border-color: var(--aw-color-primary-500);
}

.error-message {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-xs);
  background-color: var(--aw-color-error-muted);
  color: var(--aw-color-error-700);
  padding: var(--aw-spacing-sm);
  border-radius: var(--aw-border-radius-sm);
  font-size: 0.85rem;
}

.error-icon {
  font-size: 1.1rem;
}

.dismiss-error-button {
  background: none;
  border: none;
  color: var(--aw-color-error-700);
  cursor: pointer;
  margin-left: auto;
  padding: var(--aw-spacing-xxs);
}

.exposure-inputs {
  display: flex;
  flex-direction: column;
  gap: var(--aw-spacing-md);
  align-items: stretch;
}

.input-group {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-xs);
  width: 100%;
}

.input-group label {
  font-size: 0.9rem;
  color: var(--aw-text-secondary-color);
  white-space: nowrap;
  margin-right: var(--aw-spacing-sm);
}

.duration-input-group {
  width: 100%;
  display: flex;
  align-items: center;
}

.duration-input-group input[type="number"].aw-input {
  flex-grow: 1;
  width: auto;
}

.duration-presets {
  display: flex;
  flex-wrap: wrap;
  gap: var(--aw-spacing-sm);
  margin-top: var(--aw-spacing-xxs);
  margin-bottom: var(--aw-spacing-xs);
}

.preset-button {
  padding: var(--aw-spacing-xs) var(--aw-spacing-sm);
  font-size: 0.8rem;
  background-color: var(--aw-input-bg-color);
  color: var(--aw-text-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;
}

.preset-button:hover:not(:disabled) {
  background-color: var(--aw-panel-button-hover-bg);
  border-color: var(--aw-color-primary-500);
}

.preset-button.active {
  background-color: var(--aw-color-primary-500);
  color: var(--aw-button-primary-text);
  border-color: var(--aw-color-primary-500);
}

.preset-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.frame-type-group {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.frame-type-label {
  font-size: 0.9rem;
  color: var(--aw-text-secondary-color);
  white-space: nowrap;
  margin-right: var(--aw-spacing-sm);
}

.frame-type-radios {
  display: flex;
  gap: var(--aw-spacing-md);
}

.radio-label {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-xxs);
  font-size: 0.9rem;
  cursor: pointer;
}

.radio-label input[type="radio"] {
  margin-right: var(--aw-spacing-xxs);
}

.exposure-button {
  padding: var(--aw-spacing-sm) var(--aw-spacing-md);
  font-size: 0.9rem;
  background-color: var(--aw-button-primary-bg);
  color: var(--aw-button-primary-text);
  border: none;
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--aw-spacing-xs);
  transition: background-color 0.2s, box-shadow 0.2s, border-color 0.2s;
  width: 100%;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.exposure-button:hover:not(:disabled) {
  background-color: var(--aw-button-primary-hover-bg);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.07);
}

.exposure-button:disabled {
  background-color: var(--aw-color-neutral-300);
  color: var(--aw-button-primary-text);
  border: none;
  box-shadow: none;
  cursor: not-allowed;
  opacity: 0.7;
}

.button-icon {
  font-size: 1.1rem;
}

.progress-bar-container {
  width: 100%;
  height: 20px;
  background-color: var(--aw-input-bg-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-sm);
  overflow: hidden;
  position: relative;
}

.progress-bar {
  height: 100%;
  background-color: var(--aw-color-primary-500);
  transition: width 0.3s ease;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.8rem;
  color: var(--aw-text-color);
  mix-blend-mode: difference;
  filter: invert(1) grayscale(1) contrast(100);
}

/* Responsive adjustments for smaller containers if needed */
@media (max-width: 400px) { /* Example breakpoint for when controls are in a very narrow space */
  .exposure-inputs {
    flex-direction: column; /* Stack inputs vertically */
    align-items: stretch; /* Stretch items to full width */
    gap: var(--aw-spacing-sm);
  }
  .input-group {
    justify-content: space-between; /* Space out label and input fully */
  }
  .duration-input-group,
  .frame-type-group {
    min-width: unset; /* Remove min-width */
    flex-basis: auto;
  }
  .input-group input[type="number"] {
    width: auto; /* Allow input to grow */
    flex-grow: 1;
  }
}

.toggle-switch-container { display: none; } /* Hide old toggle if necessary */
</style>
