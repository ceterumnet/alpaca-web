// Status: Good - Part of new panel system // This component handles camera exposure control with
proper ASCOM Alpaca protocol support // Features: // - Exposure start/abort // - Progress tracking
// - Image ready polling // - Error handling // - Event emission for UI updates
<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'

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

// Helper function to safely call device methods
const safeCallDeviceMethod = async (deviceId: string, method: string, args?: unknown[]) => {
  // @ts-expect-error - ignore TypeScript errors for this method call due to 'this' context issues
  return await unifiedStore.callDeviceMethod(deviceId, method, args)
}

// Helper function to safely get device properties
const safeGetDeviceProperty = async (deviceId: string, property: string) => {
  return await unifiedStore.getDeviceProperty(deviceId, property)
}

// Method to start an exposure
const startExposure = async () => {
  if (!isConnected.value) {
    error.value = 'Device not connected'
    emit('error', error.value)
    return
  }

  // Verify we're dealing with a camera device
  const device = unifiedStore.getDeviceById(props.deviceId)
  if (!device || device.type !== 'camera') {
    error.value = `Device ${props.deviceId} is not a camera (type: ${device?.type})`
    console.error(error.value)
    emit('error', error.value)
    return
  }

  if (exposureInProgress.value) {
    // If exposure is already in progress, abort it
    try {
      await safeCallDeviceMethod(props.deviceId, props.stopMethod)
      console.log('Exposure aborted')
      exposureInProgress.value = false
      percentComplete.value = 0
      clearPollingIntervals()
    } catch (err) {
      error.value = `Failed to abort exposure: ${err}`
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

    // Call the startexposure method on the device
    await safeCallDeviceMethod(props.deviceId, props.method, [
      { Duration: exposureDuration.value, Light: isLight.value }
    ])

    emit('exposureStarted', { duration: exposureDuration.value, isLight: isLight.value })

    // Set up polling for percentcompleted and imageready
    setupPolling()
  } catch (err) {
    exposureInProgress.value = false
    error.value = `Failed to start exposure: ${err}`
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
      const percent = await safeGetDeviceProperty(props.deviceId, 'percentcompleted')
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
      const ready = await safeGetDeviceProperty(props.deviceId, 'imageready')
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

    // Get the device client to make low-level requests
    // @ts-expect-error - ignore TypeScript errors for this method call due to 'this' context issues
    const client = unifiedStore.getDeviceClient(props.deviceId)
    let imageData: ArrayBuffer | null = null

    if (client) {
      try {
        // Access base client's protected methods safely by casting
        const baseClient = client as any // Using any since we don't have the type
        const url = baseClient['getDeviceUrl'](props.downloadMethod)
        console.log(`Fetching image data from ${url}`)

        // Add ClientID as URL parameter
        const urlWithParams = new URL(url, window.location.origin)
        const clientId = baseClient.clientId || 1
        urlWithParams.searchParams.append('ClientID', clientId.toString())

        // Create request with the correct header for ImageBytes format
        const response = await fetch(urlWithParams.toString(), {
          method: 'GET',
          headers: {
            Accept: 'application/imagebytes',
            'User-Agent': 'AlpacaWeb'
          }
        })

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status} ${response.statusText}`)
        }

        // Get binary data as ArrayBuffer
        imageData = await response.arrayBuffer()
        console.log(`Successfully received image data, size: ${imageData.byteLength} bytes`)
      } catch (err) {
        console.error(`Error fetching image data: ${err}`)
        // Fall back to JSON mode as last resort
        console.log(`Falling back to JSON image data`)
        try {
          const jsonData = await safeCallDeviceMethod(props.deviceId, props.downloadMethod, [])
          if (jsonData && Array.isArray(jsonData)) {
            const typedArray = new Uint8Array(jsonData as number[])
            imageData = typedArray.buffer
          }
        } catch (jsonError) {
          console.error(`Error fetching image as JSON: ${jsonError}`)
          throw err // Rethrow the original error
        }
      }
    } else {
      // Fallback to standard method call if we don't have a client
      console.log('No direct client available, using standard method call')
      const jsonData = await safeCallDeviceMethod(props.deviceId, props.downloadMethod, [])
      if (jsonData && Array.isArray(jsonData)) {
        const typedArray = new Uint8Array(jsonData as number[])
        imageData = typedArray.buffer
      }
    }

    if (imageData) {
      console.log(`Downloaded image data, size: ${imageData.byteLength} bytes`)

      // Update device with image data via UnifiedStore
      // @ts-expect-error - ignore TypeScript errors for this method call due to 'this' context issues
      unifiedStore.updateDeviceProperties(props.deviceId, {
        imageData,
        hasImage: true
      })

      // Emit the image downloaded event with the ArrayBuffer
      emit('imageDownloaded', imageData)
    } else {
      throw new Error('Failed to download image data')
    }
  } catch (err) {
    error.value = `Failed to download image: ${err}`
    emit('error', error.value)
  }
}

// Clean up polling intervals when the component is unmounted
onBeforeUnmount(() => {
  clearPollingIntervals()
})

// Watch for deviceId changes
watch(
  () => props.deviceId,
  (newId, oldId) => {
    if (newId !== oldId) {
      // Clear intervals and reset state if the device changes
      clearPollingIntervals()
      exposureInProgress.value = false
      percentComplete.value = 0
      imageReady.value = false
      error.value = ''
    }
  }
)
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
