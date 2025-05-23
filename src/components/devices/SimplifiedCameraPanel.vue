<script setup lang="ts">

import log from '@/plugins/logger'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
// import CameraControls from '@/components/panels/CameraControls.vue'
import CameraImageDisplay from '@/components/panels/features/CameraImageDisplay.vue'
import CameraExposureControl from '@/components/panels/features/CameraExposureControl.vue'
import { setAlpacaProperty, getAlpacaProperties, getDeviceCapabilities } from '@/utils/alpacaPropertyAccess'
import Icon from '@/components/ui/Icon.vue'
import type { BayerPattern } from '@/lib/ASCOMImageBytes';
import '@/assets/components/forms.css'

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: 'Camera'
  },
  isConnected: {
    type: Boolean,
    required: true
  }
})

// Get unified store for device interaction
const store = useUnifiedStore()

// Get the current device
const currentDevice = computed(() => {
  return store.getDeviceById(props.deviceId)
})

// Computed properties for image dimensions with logging
const computedImageWidth = computed(() => {
  const width = Number(currentDevice.value?.properties?.numX);
  log.debug({deviceIds:[props.deviceId]}, `SimplifiedCameraPanel (${props.deviceId}): computedImageWidth is ${width}, raw value was: ${currentDevice.value?.properties?.numX}`);
  return isNaN(width) ? 0 : width; // Default to 0 if not a number
});

const computedImageHeight = computed(() => {
  const height = Number(currentDevice.value?.properties?.numY);
  log.debug({deviceIds:[props.deviceId]}, `SimplifiedCameraPanel (${props.deviceId}): computedImageHeight is ${height}, raw value was: ${currentDevice.value?.properties?.numY}`);
  return isNaN(height) ? 0 : height; // Default to 0 if not a number
});

// Get exposure range for the camera
const exposureMin = ref(0.001)
const exposureMax = ref(3600)

// Camera capabilities
const capabilities = ref({
  canSetCCDTemperature: false
})

// Camera settings
const gain = ref(0)
const offset = ref(0)
const binning = ref(1)
const coolerOn = ref(false)
const targetTemp = ref(-10)
const CCDTemperature = ref(0)

// Sensor Type and Detected Bayer Pattern
const cameraSensorType = ref<number | null>(null) // 0: Mono, 1: Color (no bayer), 2: RGGB, ...

// Loading states for settings
const isLoadingGain = ref(false)
const isLoadingOffset = ref(false)
const isLoadingBinning = ref(false)
const isTogglingCooler = ref(false)
const isLoadingTargetTemp = ref(false)
const isLoadingReadoutMode = ref(false)

// Error message for settings
const settingsError = ref<string | null>(null)

// Image data for CameraImageDisplay
const imageData = ref<ArrayBuffer>(new ArrayBuffer(0))

// Watch for imageData changes from the store (device properties)
watch(
  () => currentDevice.value?.properties?.imageData,
  (newImageData) => {
    if (newImageData instanceof ArrayBuffer && newImageData.byteLength > 0) {
      log.debug({deviceIds:[props.deviceId]}, `SimplifiedCameraPanel: imageData updated from store for device ${props.deviceId}, size: ${newImageData.byteLength}`);
      imageData.value = newImageData;
    } else if (newImageData === null || (newImageData instanceof ArrayBuffer && newImageData.byteLength === 0)) {
      // Handle case where image data is explicitly cleared in the store or props reset
      if (imageData.value.byteLength > 0) { // Only update if it actually changed to empty
        log.debug({deviceIds:[props.deviceId]}, `SimplifiedCameraPanel: imageData cleared (from store/props) for device ${props.deviceId}`);
        imageData.value = new ArrayBuffer(0);
      }
    }
  }
);

// Function to clear settings error
const clearSettingsError = () => {
  settingsError.value = null
}

// Toggle cooler
const toggleCooler = async () => {
  if (!capabilities.value.canSetCCDTemperature) return
  isTogglingCooler.value = true
  settingsError.value = null
  try {
    await setAlpacaProperty(props.deviceId, 'coolerOn', !coolerOn.value)
    coolerOn.value = !coolerOn.value
  } catch (error) {
    log.error({deviceIds:[props.deviceId]}, 'Error toggling cooler:', error)
    settingsError.value = `Failed to toggle cooler: ${error instanceof Error ? error.message : String(error)}`
  } finally {
    isTogglingCooler.value = false
  }
}

// Update camera settings
const updateGain = async () => {
  isLoadingGain.value = true
  settingsError.value = null
  try {
    await setAlpacaProperty(props.deviceId, 'gain', gain.value)
  } catch (error) {
    log.error({deviceIds:[props.deviceId]}, 'Error setting gain:', error)
    settingsError.value = `Failed to set gain: ${error instanceof Error ? error.message : String(error)}`
  } finally {
    isLoadingGain.value = false
  }
}

const updateOffset = async () => {
  isLoadingOffset.value = true
  settingsError.value = null
  try {
    await setAlpacaProperty(props.deviceId, 'offset', offset.value)
  } catch (error) {
    log.error({deviceIds:[props.deviceId]}, 'Error setting offset:', error)
    settingsError.value = `Failed to set offset: ${error instanceof Error ? error.message : String(error)}`
  } finally {
    isLoadingOffset.value = false
  }
}

const updateBinning = async () => {
  isLoadingBinning.value = true
  settingsError.value = null
  try {
    await setAlpacaProperty(props.deviceId, 'binX', binning.value)
    await setAlpacaProperty(props.deviceId, 'binY', binning.value)
  } catch (error) {
    log.error({deviceIds:[props.deviceId]}, 'Error setting binning:', error)
    settingsError.value = `Failed to set binning: ${error instanceof Error ? error.message : String(error)}`
  } finally {
    isLoadingBinning.value = false
  }
}

const updateTargetTemp = async () => {
  if (!capabilities.value.canSetCCDTemperature) return
  isLoadingTargetTemp.value = true
  settingsError.value = null
  try {
    await setAlpacaProperty(props.deviceId, 'setCCDTemperature', targetTemp.value)
  } catch (error) {
    log.error({deviceIds:[props.deviceId]}, 'Error setting target temperature:', error)
    settingsError.value = `Failed to set target temperature: ${error instanceof Error ? error.message : String(error)}`
  } finally {
    isLoadingTargetTemp.value = false
  }
}

// Event handlers for CameraExposureControl
const handleExposureStarted = (params: { duration: number; isLight: boolean }) => {
  // Clear any previous exposure-related errors if settingsError is used for this
  // settingsError.value = null; 
  log.debug({deviceIds:[props.deviceId]}, `SimplifiedCameraPanel: Exposure started: ${params.duration}s, Light: ${params.isLight}`)
  // You might want to set a specific loading state related to exposure if needed elsewhere in this panel
}

const handleExposureComplete = () => {
  log.debug({deviceIds:[props.deviceId]}, 'SimplifiedCameraPanel: Exposure complete')
  // Handle post-exposure actions if any specific to this panel
  // Note: Image data is now handled by the watcher on currentDevice.value.properties.imageData
}

// This handler is likely no longer called by CameraExposureControl with data,
// as image download responsibility moved to store actions.
// Keeping it for now in case of other uses, but the watcher above is the primary mechanism.
const handleImageDownloaded = () => {
  log.warn({deviceIds:[props.deviceId]}, 'SimplifiedCameraPanel: handleImageDownloaded called. This might be from a legacy path or an event without data. Image data should primarily come from store watcher.');
  // imageData.value = data // Commenting out to prefer store-driven updates
  // log.debug({deviceIds:[props.deviceId]}, `SimplifiedCameraPanel: Image downloaded (via event): ${data.byteLength} bytes`)
}

const handleExposureError = (error: string) => {
  log.error({deviceIds:[props.deviceId]}, 'SimplifiedCameraPanel: Exposure error:', error)
  settingsError.value = `Exposure failed: ${error}` // Display exposure error in the existing error display
}

// Handler for histogram generation from CameraImageDisplay
const handleHistogramGenerated = (histogram: number[]) => {
  log.debug({deviceIds:[props.deviceId]}, 'SimplifiedCameraPanel: Histogram generated with', histogram.length, 'bins')
  // Process histogram data if needed at this level
}

const detectedBayerPatternFromSensorType = computed<BayerPattern | null>(() => {
  if (cameraSensorType.value === 2) {
    return 'RGGB' // ASCOM SensorType 2 is RGGB
  }
  // Add other mappings if SensorType provides them for GRBG, GBRG, BGGR
  // For now, only RGGB is directly derived from SensorType standard values.
  return null
})

// Check device capabilities
const updateDeviceCapabilities = async () => {
  if (!props.isConnected || !props.deviceId) return
  
  try {
    const deviceCaps = await getDeviceCapabilities(props.deviceId, [
      'canSetCCDTemperature'
    ])
    
    capabilities.value = {
      canSetCCDTemperature: deviceCaps.canSetCCDTemperature || false
    }
    
  } catch (error) {
    log.error({deviceIds:[props.deviceId]}, 'Error checking device capabilities:', error)
  }
}

// Poll for camera status (temperature)
let statusTimer: number | undefined

const updateCameraStatus = async () => {
  if (!props.isConnected || !props.deviceId) return
  
  try {
    // Build property list based on device capabilities
    const propertiesToFetch = [
      'exposureMin', 'exposureMax', 
      'gain', 'offset', 'binX', 'binY', 
      'CCDTemperature', 'sensorType' // Added sensorType
    ]
    
    // Add optional properties based on capabilities
    if (capabilities.value.canSetCCDTemperature) {
      propertiesToFetch.push('coolerOn')
      propertiesToFetch.push('setCCDTemperature')
    }
    
    const properties = await getAlpacaProperties(props.deviceId, propertiesToFetch)
    
    // Update camera settings with current values
    if (properties.gain !== null && typeof properties.gain === 'number') {
      gain.value = properties.gain
    }
    
    if (properties.offset !== null && typeof properties.offset === 'number') {
      offset.value = properties.offset
    }
    
    if (properties.binX !== null && typeof properties.binX === 'number') {
      binning.value = properties.binX
    }
    
    if (properties.coolerOn !== null && typeof properties.coolerOn === 'boolean') {
      coolerOn.value = properties.coolerOn
    }
    if (properties.CCDTemperature !== null && typeof properties.CCDTemperature === 'number') {
      CCDTemperature.value = properties.CCDTemperature
    }

    if (capabilities.value.canSetCCDTemperature) {
  
      if (properties.setCCDTemperature !== null && typeof properties.setCCDTemperature === 'number') {
        targetTemp.value = properties.setCCDTemperature
      }
    }

    if (properties.sensorType !== null && typeof properties.sensorType === 'number') {
      cameraSensorType.value = properties.sensorType
    }

    // Update exposure limits if available
    if (properties.exposureMin !== null && typeof properties.exposureMin === 'number') {
      exposureMin.value = properties.exposureMin
    }
    
    if (properties.exposureMax !== null && typeof properties.exposureMax === 'number') {
      exposureMax.value = properties.exposureMax
    }
  } catch (error) {
    log.error({deviceIds:[props.deviceId]}, 'Error updating camera status:', error)
  }
}

// Reset all camera settings
const resetCameraSettings = () => {
  gain.value = 0
  offset.value = 0
  binning.value = 1
  coolerOn.value = false
  targetTemp.value = -10
  CCDTemperature.value = 0
  exposureMin.value = 0.001
  exposureMax.value = 3600
  cameraSensorType.value = null // Reset sensor type
  capabilities.value = {
    canSetCCDTemperature: false
  }
}

// Setup polling when mounted
onMounted(() => {
  if (props.isConnected && props.deviceId) {
    // First check device capabilities
    updateDeviceCapabilities()
    // Then get current status
    updateCameraStatus()
    // Start regular status polling
    if (!statusTimer) {
      statusTimer = window.setInterval(() => {
        updateCameraStatus()
      }, 5000)
    }
  } else {
    if (statusTimer) {
      window.clearInterval(statusTimer);
      statusTimer = undefined;
    }
  }
})

// Watch for changes in connection status (from parent)
watch(() => props.isConnected, (newIsConnected) => {
  log.debug({deviceIds:[props.deviceId]}, `SimplifiedCameraPanel: Connection status changed to ${newIsConnected} for device ${props.deviceId}`);
  if (newIsConnected) {
    // Reset capabilities
    resetCameraSettings() // Reset settings on new connection to ensure fresh state
    imageData.value = new ArrayBuffer(0) // Reset image data on new connection
    capabilities.value = {
      canSetCCDTemperature: false
    }
    
    // First check device capabilities
    updateDeviceCapabilities()
    
    // Then get current status
    updateCameraStatus()
    
    // Start regular status polling
    if (!statusTimer) { // Avoid multiple intervals
      statusTimer = window.setInterval(() => {
        updateCameraStatus()
      }, 5000)
    }
  } else {
    // Stop polling when disconnected
    if (statusTimer) {
      window.clearInterval(statusTimer)
      statusTimer = undefined;
    }
    resetCameraSettings() // Clear data when disconnected
  }
})

// Watch for device ID changes
watch(() => props.deviceId, (newDeviceId, oldDeviceId) => {
  if (newDeviceId !== oldDeviceId) {
    log.debug({deviceIds:[props.deviceId]}, `SimplifiedCameraPanel: Device changed from ${oldDeviceId} to ${newDeviceId}`);
    // Reset settings when device changes
    resetCameraSettings()
    imageData.value = new ArrayBuffer(0) // Also reset image data when device changes
    
    if (props.isConnected) {
      // Update capabilities for the new device
      updateDeviceCapabilities()
      // Update status for the new device
      updateCameraStatus()
      // Ensure polling is active if it wasn't
      if (!statusTimer) {
        statusTimer = window.setInterval(() => {
          updateCameraStatus()
        }, 5000)
      }
    } else {
      // If not connected, ensure polling is stopped
      if (statusTimer) {
        clearInterval(statusTimer);
        statusTimer = undefined;
      }
    }
  }
}, { immediate: true })

// Cleanup when unmounted
onUnmounted(() => {
  if (statusTimer) {
    window.clearInterval(statusTimer)
  }
})

// Computed properties for gain/offset modes and ranges
const gainMode = computed(() => {
  return currentDevice.value?.properties?.cam_gainMode || 'unknown';
});

const gainMin = computed(() => {
  const val = currentDevice.value?.properties?.gainmin
  return typeof val === 'number' && !isNaN(val) ? val : 0
})

const gainMax = computed(() => {
  const val = currentDevice.value?.properties?.gainmax
  return typeof val === 'number' && !isNaN(val) ? val : 100
})

const gainList = computed(() => currentDevice.value?.properties?.gains ?? [])

const offsetMode = computed(() => {
  return currentDevice.value?.properties?.cam_offsetMode || 'unknown';
});

const offsetMin = computed(() => {
  const val = currentDevice.value?.properties?.offsetmin
  return typeof val === 'number' && !isNaN(val) ? val : 0
})

const offsetMax = computed(() => {
  const val = currentDevice.value?.properties?.offsetmax
  return typeof val === 'number' && !isNaN(val) ? val : 100
})

const offsetList = computed(() => currentDevice.value?.properties?.offsets ?? [])

// Debug: Log all available camera properties for troubleshooting
watch(currentDevice, (val) => {
  if (val) {
     
    console.log('Camera properties:', val.properties)
  }
}, { immediate: true })

const cameraInfoProps = computed(() => {
  if (!currentDevice.value) return []
  const props = currentDevice.value.properties || {}
  // Map of label: [camelCaseKey, alpacaKey]
  const infoMap = [
    ['Sensor Name', ['sensorName', 'sensorname']],
    ['Camera X Size (px)', ['cameraXSize', 'cameraxsize']],
    ['Camera Y Size (px)', ['cameraYSize', 'cameraysize']],
    ['Start X', ['startX', 'startx']],
    ['Start Y', ['startY', 'starty']],
    ['Full Well Capacity (e-)', ['fullWellCapacity', 'fullwellcapacity']],
    ['Gain Min', ['gainMin', 'gainmin']],
    ['Gain Max', ['gainMax', 'gainmax']],
    ['Offset Min', ['offsetMin', 'offsetmin']],
    ['Offset Max', ['offsetMax', 'offsetmax']],
    ['Bin X', ['binX', 'binx']],
    ['Bin Y', ['binY', 'biny']],
    ['Pixel Size X (μm)', ['pixelSizeX', 'pixelsizex']],
    ['Pixel Size Y (μm)', ['pixelSizeY', 'pixelsizey']],
    ['CCD Temperature (°C)', ['ccdTemperature', 'ccdtemperature']],
    ['Cooler Enabled', ['coolerEnabled', 'cooleron']],
    ['Target Temperature (°C)', ['targetTemperature', 'setccdtemperature']],
    ['Cooler Power (%)', ['coolerPower', 'coolerpower']],
    ['Readout Mode', ['readoutMode', 'readoutmode']],
    ['Readout Modes', ['readoutModes', 'readoutmodes']],
    ['Sensor Type', ['sensorType', 'sensortype']],
    ['Exposure Min (s)', ['exposureMin', 'exposuremin']],
    ['Exposure Max (s)', ['exposureMax', 'exposuremax']],
    ['Exposure Resolution (s)', ['exposureResolution', 'exposureresolution']],
    ['Electrons/ADU', ['electronsPerADU', 'electronsperadu']],
    ['Max ADU', ['maxADU', 'maxadu']],
    ['Max Bin X', ['maxBinX', 'maxbinx']],
    ['Max Bin Y', ['maxBinY', 'maxbiny']],
    ['Num X', ['numX', 'numx']],
    ['Num Y', ['numY', 'numy']],
    ['Percent Completed', ['percentCompleted', 'percentcompleted']],
    ['Has Shutter', ['hasShutter', 'hasshutter']],
    ['Is Pulse Guiding', ['isPulseGuiding', 'ispulseguiding']],
    ['Last Exposure Duration', ['lastExposureDuration', 'lastexposureduration']],
    ['Last Exposure Start Time', ['lastExposureStartTime', 'lastexposurestarttime']],
    ['Bayer Offset X', ['bayerOffsetX', 'bayeroffsetx']],
    ['Bayer Offset Y', ['bayerOffsetY', 'bayeroffsety']],
    ['Sub Exposure Duration', ['subExposureDuration', 'subexposureduration']],
    ['Firmware Version', ['firmwareVersion']], // device root only
  ]
  // Only include properties that exist and are not null/undefined
  const result = infoMap.reduce((acc, [label, keys]) => {
    let val
    for (const key of keys) {
      if (key === 'firmwareVersion' && currentDevice.value && currentDevice.value.firmwareVersion) {
        val = currentDevice.value.firmwareVersion
        break
      }
      if (props[key] !== undefined && props[key] !== null && props[key] !== '') {
        val = props[key]
        break
      }
    }
    if (val !== undefined && val !== null && val !== '') {
      // Ensure the value is always a string
      let displayVal: string
      if (Array.isArray(val)) {
        displayVal = val.join(', ')
      } else if (typeof val === 'object') {
        displayVal = JSON.stringify(val)
      } else {
        displayVal = String(val)
      }
      acc.push([String(label), displayVal])
    }
    return acc
  }, [] as Array<[string, string]>) 
  return result
})

const readoutModes = computed<string[]>(() => {
  const modes = currentDevice.value?.properties?.readoutModes;
  return Array.isArray(modes) ? modes : [];
})

const currentReadoutModeIndex = computed({
  get() {
    const modes = readoutModes.value
    const current = currentDevice.value?.properties?.readoutMode
    if (!modes.length || current === undefined || current === null) return 0
    // If current is a string, find its index; if it's a number, use as index
    if (typeof current === 'number') return current
    const idx = modes.indexOf(current as string)
    return idx !== -1 ? idx : 0
  },
  set(idx: number) {
    updateReadoutMode(idx)
  }
})

async function updateReadoutMode(idx: number) {
  isLoadingReadoutMode.value = true
  settingsError.value = null
  try {
    await store.setCameraReadoutMode(props.deviceId, idx)
  } catch (error) {
    log.error({deviceIds:[props.deviceId]}, 'Error setting readout mode:', error)
    settingsError.value = `Failed to set readout mode: ${error instanceof Error ? error.message : String(error)}`
  } finally {
    isLoadingReadoutMode.value = false
  }
}

const binningOptions = computed(() => {
  const min = currentDevice.value?.properties?.minBinX ?? 1;
  const max = currentDevice.value?.properties?.maxBinX ?? 4;
  if (typeof min !== 'number' || typeof max !== 'number' || min > max) return [1];
  const opts = [];
  for (let i = min; i <= max; i++) opts.push(i);
  return opts;
});

</script>

<template>
  <div class="simplified-panel">
    <!-- Main panel content with sections -->
    <div class="panel-content">
      <!-- No device selected message -->
      <div v-if="!currentDevice" class="connection-notice">
        <div class="connection-message">No camera selected or available</div>
      </div>
      <!-- Connection status -->
      <div v-else-if="!isConnected" class="connection-notice">
        <div class="connection-message">Camera ({{ currentDevice.name }}) not connected.</div>
        <div class="panel-tip">Use the connect button in the panel header.</div>
      </div>
      <template v-else>
        <!-- Settings Error Display -->
        <div v-if="settingsError" class="panel-section panel-error-display">
          <div class="error-message-content">
            <Icon type="alert-triangle" class="error-icon" />
            <span>{{ settingsError }}</span>
          </div>
          <button class="dismiss-button" @click="clearSettingsError">
            <Icon type="close" />
          </button>
        </div>
        <div class="main-layout-grid">
          <!-- Left Column: Camera Image Display -->
          <div class="camera-controls-column">
            <CameraImageDisplay 
              :image-data="imageData"
              :width="computedImageWidth"
              :height="computedImageHeight"
              :sensor-type="cameraSensorType === null ? undefined : cameraSensorType" 
              :detected-bayer-pattern="detectedBayerPatternFromSensorType"
              @histogram-generated="handleHistogramGenerated"
            />
          </div>
          <!-- Right Column: Settings, Cooling & Exposure -->
          <div class="settings-cooling-column">
            <!-- Exposure Control Section -->
            <div class="panel-section exposure-controls-section">
              <h3>Exposure</h3>
              <CameraExposureControl
                :device-id="deviceId"
                :exposure-min="exposureMin"
                :exposure-max="exposureMax"
                @exposure-started="handleExposureStarted"
                @exposure-complete="handleExposureComplete"
                @image-downloaded="handleImageDownloaded"
                @error="handleExposureError"
              />
            </div>
            <!-- Camera Settings Section -->
            <div class="panel-section">
              <h3>Settings</h3>
              <div class="camera-settings">
                <!-- Gain Control -->
                <div class="setting-row slider-row">
                  <label for="gain-input">Gain:</label>
                  <div class="input-with-spinner slider-group">
                    <template v-if="gainMode === 'value'">
                      <input
                        id="gain-slider"
                        v-model.number="gain"
                        class="themed-slider"
                        type="range"
                        :min="Number(gainMin)"
                        :max="Number(gainMax)"
                        step="1"
                        :disabled="isLoadingGain"
                        aria-label="Gain slider"
                        @change="updateGain"
                      >
                      <input
                        id="gain-input"
                        v-model.number="gain"
                        type="number"
                        :min="Number(gainMin)"
                        :max="Number(gainMax)"
                        step="1"
                        :disabled="isLoadingGain"
                        aria-label="Gain value"
                        class="aw-input aw-input--sm"
                        @change="updateGain"
                      >
                    </template>
                    <template v-else-if="gainMode === 'list'">
                      <select
                        id="gain-select"
                        v-model="gain"
                        :disabled="isLoadingGain"
                        aria-label="Gain preset selector"
                        class="aw-select aw-select--sm"
                        @change="updateGain"
                      >
                        <option v-for="(name, idx) in gainList" :key="name" :value="idx">{{ name }}</option>
                      </select>
                    </template>
                    <Icon v-if="isLoadingGain" type="refresh" class="spinner-icon" animation="spin" />
                  </div>
                  <span v-if="gainMode === 'value'" class="slider-minmax">{{ gainMin }}</span>
                  <span v-if="gainMode === 'value'" class="slider-minmax">{{ gainMax }}</span>
                </div>
                <!-- Offset Control -->
                <div class="setting-row slider-row">
                  <label for="offset-input">Offset:</label>
                  <div class="input-with-spinner slider-group">
                    <template v-if="offsetMode === 'value'">
                      <input
                        id="offset-slider"
                        v-model.number="offset"
                        class="themed-slider"
                        type="range"
                        :min="Number(offsetMin)"
                        :max="Number(offsetMax)"
                        step="1"
                        :disabled="isLoadingOffset"
                        aria-label="Offset slider"
                        @change="updateOffset"
                      >
                      <input
                        id="offset-input"
                        v-model.number="offset"
                        type="number"
                        :min="Number(offsetMin)"
                        :max="Number(offsetMax)"
                        step="1"
                        :disabled="isLoadingOffset"
                        aria-label="Offset value"
                        class="aw-input aw-input--sm"
                        @change="updateOffset"
                      >
                    </template>
                    <template v-else-if="offsetMode === 'list'">
                      <select
                        id="offset-select"
                        v-model="offset"
                        :disabled="isLoadingOffset"
                        aria-label="Offset preset selector"
                        class="aw-select aw-select--sm"
                        @change="updateOffset"
                      >
                        <option v-for="(name, idx) in offsetList" :key="name" :value="idx">{{ name }}</option>
                      </select>
                    </template>
                    <Icon v-if="isLoadingOffset" type="refresh" class="spinner-icon" animation="spin" />
                  </div>
                  <span v-if="offsetMode === 'value'" class="slider-minmax">{{ offsetMin }}</span>
                  <span v-if="offsetMode === 'value'" class="slider-minmax">{{ offsetMax }}</span>
                </div>
                <div class="setting-row">
                  <label for="binning-input">Bin:</label>
                  <div class="input-with-spinner">
                    <select
                      id="binning-input"
                      v-model.number="binning"
                      :disabled="isLoadingBinning"
                      class="aw-select aw-select--sm"
                      @change="updateBinning"
                    >
                      <option v-for="opt in binningOptions" :key="opt" :value="opt">{{ opt }}x{{ opt }}</option>
                    </select>
                    <Icon v-if="isLoadingBinning" type="refresh" class="spinner-icon" animation="spin" />
                  </div>
                </div>
                <div v-if="readoutModes.length" class="setting-row">
                  <label for="readout-mode-select">Readout Mode:</label>
                  <div class="input-with-spinner">
                    <select
                      id="readout-mode-select"
                      v-model.number="currentReadoutModeIndex"
                      :disabled="isLoadingReadoutMode"
                      aria-label="Readout mode selector"
                      class="aw-select aw-select--sm"
                    >
                      <option v-for="(mode, idx) in readoutModes" :key="mode" :value="idx">{{ mode }}</option>
                    </select>
                    <Icon v-if="isLoadingReadoutMode" type="refresh" class="spinner-icon" animation="spin" />
                  </div>
                </div>
              </div>
            </div>
            <!-- Cooling Section -->
            <div class="panel-section">
              <h3>Cooling</h3>
              <div class="cooling-controls">
                <div class="cooling-status setting-row">
                  <span class="temperature-label">Current Temp:</span>
                  <span class="temperature-value">{{ CCDTemperature.toFixed(1) }}°C</span>
                </div>
                <div v-if="capabilities.canSetCCDTemperature" class="cooling-toggle setting-row">
                  <label for="cooler-toggle-checkbox">Cooler:</label>
                  <div class="input-with-spinner">
                    <label class="toggle">
                      <input id="cooler-toggle-checkbox" v-model="coolerOn" type="checkbox" :disabled="isTogglingCooler" @change="toggleCooler">
                      <span class="slider"></span>
                    </label>
                    <Icon v-if="isTogglingCooler" type="refresh" class="spinner-icon" animation="spin" />
                  </div>
                </div>
                <div v-if="capabilities.canSetCCDTemperature" class="temperature-target setting-row">
                  <label for="target-temp-input">Target Temp (°C):</label>
                  <div class="input-with-spinner">
                    <input id="target-temp-input" v-model.number="targetTemp" type="number" min="-50" max="50" step="1" :disabled="isLoadingTargetTemp" class="aw-input aw-input--sm" @change="updateTargetTemp">
                    <Icon v-if="isLoadingTargetTemp" type="refresh" class="spinner-icon" animation="spin" />
                  </div>
                </div>
              </div>
            </div>
            <!-- Camera Info Section -->
            <div v-if="currentDevice && cameraInfoProps.length" class="panel-section camera-info-section">
              <h3>Camera Info</h3>
              <dl class="camera-info-list">
                <template v-for="([label, value]) in cameraInfoProps" :key="label">
                  <dt class="camera-info-label">{{ label }}</dt>
                  <dd class="camera-info-value">{{ value }}</dd>
                </template>
              </dl>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.simplified-panel {
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-text-color);
  border-radius: var(--aw-border-radius);
  border: 1px solid var(--aw-panel-border-color);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
  container-type: inline-size; /* Define this as a query container */
  container-name: simplified-camera-panel; /* Optional: name the container */
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--aw-spacing-sm) var(--aw-spacing-md);
  border-bottom: 1px solid var(--aw-panel-border-color);
  background-color: var(--aw-panel-header-bg-color);
  color: var(--aw-panel-header-text-color);
}

.panel-header h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: var(--aw-font-weight-bold, 600);
}

/* Device selector styles */
.device-selector {
  position: relative;
  display: flex;
  align-items: center;
  padding: calc(var(--aw-spacing-xs) / 2) var(--aw-spacing-sm);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
  background-color: var(--aw-panel-content-bg-color);
  margin: var(--aw-spacing-xs) 0;
  min-width: 120px;
}

.device-name {
  font-size: 0.8rem;
  margin-right: var(--aw-spacing-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.device-toggle {
  font-size: 0.6rem;
  opacity: 0.7;
}

.device-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 200px;
  background-color: var(--aw-panel-bg-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-sm);
  z-index: 100;
  margin-top: var(--aw-spacing-xs);
  box-shadow: var(--aw-shadow-md);
}

.device-list {
  max-height: 200px;
  overflow-y: auto;
}

.device-item {
  padding: var(--aw-spacing-sm);
  cursor: pointer;
  border-bottom: 1px solid var(--aw-panel-border-color);
}

.device-item:hover {
  background-color: var(--aw-panel-hover-bg-color);
}

.device-selected {
  background-color: var(--aw-primary-color-transparent);
}

.device-info {
  display: flex;
  flex-direction: column;
}

.device-item-name {
  font-weight: var(--aw-font-weight-medium);
  margin-bottom: calc(var(--aw-spacing-xs) / 2);
}

.device-item-status {
  font-size: 0.7rem;
  opacity: 0.8;
}

.device-item-status.connected {
  color: var(--aw-success-color);
}

.device-item-status.disconnected {
  color: var(--aw-error-color);
}

.device-empty {
  padding: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs)) var(--aw-spacing-sm);
  text-align: center;
  color: var(--aw-text-secondary-color);
  font-size: 0.9rem;
}

.device-actions {
  padding: var(--aw-spacing-sm);
  border-top: 1px solid var(--aw-panel-border-color);
}

.discover-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(var(--aw-spacing-xs) * 1.5);
  width: 100%;
  padding: calc(var(--aw-spacing-xs) * 1.5) 0;
  background-color: var(--aw-button-primary-bg);
  color: var(--aw-button-primary-text);
  border: none;
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
  font-size: 0.8rem;
}

.discover-button:hover {
  background-color: var(--aw-button-primary-hover-bg);
}

.panel-content {
  overflow-y: auto;
  flex: 1;
  padding: var(--aw-spacing-md); /* Add some padding to the main content area */
}

.main-layout-grid {
  display: flex;
  flex-direction: row;
  gap: var(--aw-spacing-md);
  width: 100%;
}

.camera-controls-column {
  flex: 1 1 60%; /* Allow camera controls to take more space initially */
  min-width: 300px; /* Minimum width for camera controls */
}

.settings-cooling-column {
  flex: 1 1 40%;
  display: flex;
  flex-direction: column;
  gap: var(--aw-spacing-md);
  min-width: 250px; /* Minimum width for settings */
}

.panel-section {
  /* margin-bottom: calc(var(--aw-spacing-md) + var(--aw-spacing-xs)); */ /* Adjusted by flex gap */
  background-color: var(--aw-panel-content-bg-color);
  border-radius: calc(var(--aw-spacing-xs) * 1.5);
  padding: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
  border: 1px solid var(--aw-panel-border-color); /* Add border to sections */
}

.panel-section h3 {
  margin-top: 0;
  margin-bottom: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
  font-size: var(--aw-font-size-base);
  border-bottom: 1px solid var(--aw-panel-border-color);
  padding-bottom: calc(var(--aw-spacing-xs) * 1.5);
}

.camera-controls-wrapper {
  /* border: 1px solid var(--aw-panel-border-color); */ /* Removed as panel-section has border */
  border-radius: calc(var(--aw-spacing-xs) * 1.5);
  overflow: hidden;
  /* margin-top: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs)); */ /* No longer needed */
}

.camera-settings {
  display: grid;
  grid-template-columns: auto 1fr; /* Parent grid for label/input columns */
  column-gap: var(--aw-spacing-sm); /* Gap between label and input columns */
  row-gap: var(--aw-spacing-sm);    /* Gap between each setting row */
  /* align-items: center; */ /* Let .setting-row handle its internal vertical alignment */
}

.setting-row {
  grid-column: 1 / -1; /* Span all columns of the parent grid */
  display: grid; 
  grid-template-columns: subgrid; /* Inherit column tracks from parent */
  align-items: center; /* Vertically align label and input-container within the row */
  /* gap: var(--aw-spacing-sm); */ /* Gap is now handled by parent grid + subgrid inheritance */
}

.setting-row label {
  color: var(--aw-text-secondary-color);
  font-size: 0.9rem;
  white-space: nowrap; /* Prevent label text from wrapping */
  flex-shrink: 0; /* Prevent label from shrinking */
}

.setting-row .input-with-spinner {
  flex-grow: 1; /* Allow input to take available space */
  display: flex;
  align-items: center;
}

.setting-row input,
.setting-row .toggle {
  /* padding: var(--aw-spacing-sm); */ /* Padding is on input-with-spinner or input directly */
  background-color: var(--aw-input-bg-color);
  color: var(--aw-text-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-sm);
  flex-grow: 1;
}
.setting-row input {
   padding: var(--aw-spacing-xs); /* More compact input padding */
}


.cooling-controls {
  display: grid; /* Changed from flex to grid */
  grid-template-columns: auto 1fr; /* Parent grid for label/input columns */
  column-gap: var(--aw-spacing-sm); /* Gap between label and input columns */
  row-gap: var(--aw-spacing-sm);    /* Gap between each setting row */
  /* align-items: center; */ /* Let .setting-row handle its internal vertical alignment */
}

.cooling-status {
  /* display: flex; */ /* Already a setting-row */
  /* justify-content: space-between; */ /* From setting-row */
  /* align-items: center; */ /* From setting-row */
}

.temperature-label {
  color: var(--aw-text-secondary-color);
  flex-shrink: 0;
}

.temperature-value {
  font-weight: var(--aw-font-weight-medium);
  text-align: right;
  flex-grow: 1;
}

.cooling-toggle {
  /* display: flex; */ /* Already a setting-row */
  /* align-items: center; */ /* From setting-row */
  /* justify-content: space-between; */ /* From setting-row */
}

.cooling-toggle label[for="cooler-toggle-checkbox"] { /* More specific selector for the label */
   margin-bottom: 0; /* Override if any default margin exists */
}


.toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0; /* Prevent toggle from shrinking */
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--aw-input-bg-color);
  border: 1px solid var(--aw-panel-border-color);
  transition: .4s;
  border-radius: var(--aw-spacing-lg);
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: var(--aw-text-secondary-color);
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--aw-success-color);
}

input:checked + .slider:before {
  transform: translateX(calc(var(--aw-spacing-lg) - var(--aw-spacing-xs)));
  background-color: var(--aw-button-primary-text);
}

.temperature-target {
  /* display: flex; */ /* Already a setting-row */
  /* align-items: center; */ /* From setting-row */
  /* justify-content: space-between; */ /* From setting-row */
}

.temperature-target label {
  color: var(--aw-text-secondary-color);
  margin-bottom: 0; /* Override */
}

.temperature-target .input-with-spinner input { /* Target input within this specific structure */
  width: 60px; /* More compact target temp input */
  padding: var(--aw-spacing-xs);
  /* background-color: var(--aw-input-bg-color); */ /* Already set */
  /* color: var(--aw-text-color); */ /* Already set */
  /* border: 1px solid var(--aw-panel-border-color); */ /* Already set */
  /* border-radius: var(--aw-border-radius-sm); */ /* Already set */
  flex-grow: 0; /* Don't let it grow too much */
}

.connection-notice {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: var(--aw-panel-content-bg-color);
  border-radius: calc(var(--aw-spacing-xs) * 1.5);
  /* margin-bottom: calc(var(--aw-spacing-md) + var(--aw-spacing-xs)); */ /* Handled by parent padding/gap */
  gap: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
  padding: var(--aw-spacing-md);
  border: 1px solid var(--aw-panel-border-color); /* Add border */
  margin-bottom: var(--aw-spacing-md); /* Space before the main layout */
}

.connection-message {
  color: var(--aw-text-secondary-color);
  font-size: 1.1rem;
}

.panel-tip {
  font-size: 0.8rem;
  color: var(--aw-text-secondary-color);
}

.panel-error-display {
  background-color: var(--aw-color-error-muted, #f8d7da);
  color: var(--aw-color-error-700, #842029);
  padding: var(--aw-spacing-sm);
  /* margin-bottom: var(--aw-spacing-md); */ /* Handled by parent padding/gap */
  border-radius: var(--aw-border-radius-sm);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid var(--aw-color-error-border, #f5c6cb); /* Add specific error border */
  margin-bottom: var(--aw-spacing-md); /* Space before the main layout */
}

.error-message-content {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-sm);
}

.error-icon {
  font-size: 1.2rem; /* Make icon slightly larger */
}

.dismiss-button {
  background: none;
  border: none;
  color: var(--aw-color-error-700, #842029);
  cursor: pointer;
  padding: var(--aw-spacing-xs);
}

.dismiss-button .icon {
  font-size: 1rem;
}

.input-with-spinner {
  position: relative;
  display: flex;
  align-items: center;
  /* gap: var(--aw-spacing-xs); */ /* Add gap between input and spinner if desired */
}

/* .input-with-spinner input { */ /* General input styling moved to .setting-row input */
  /* flex-grow: 1; */
/* } */

.spinner-icon {
  margin-left: var(--aw-spacing-sm);
  color: var(--aw-text-secondary-color);
  flex-shrink: 0; /* Prevent spinner from being squeezed */
}

/* Ensure toggle switch is vertically aligned with spinner */
.cooling-toggle .input-with-spinner {
  /* display: flex; */ /* Already set */
  /* align-items: center; */ /* Already set */
  justify-content: flex-end; /* Align toggle to the right within its container */
}

/* .cooling-toggle .toggle { */
  /* margin-right: auto; */ /* Pushes spinner to the right if needed or centers */
/* } */

/* Adjustments for setting rows if they contain input-with-spinner */
.setting-row .input-with-spinner + .spinner-icon {
  /* If spinner is outside input-with-spinner, style it here */
  /* This case should not happen with current structure */
}

/* Responsive adjustments */
/* @media (max-width: 768px) { */ /* Old media query */
@container simplified-camera-panel (max-width: 768px) { /* New container query */
  .main-layout-grid {
    flex-direction: column;
  }
  .camera-controls-column,
  .settings-cooling-column {
    flex-basis: auto; /* Reset flex-basis for column layout */
    width: 100%;
    min-width: unset; /* Remove min-width for stacked layout */
  }
}

/* Add styles for slider-row, slider-group, themed-slider, and slider-minmax */
.slider-row {
  align-items: center;
  gap: 8px;
}
.slider-group {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 8px;
  min-width: 0;
}
.themed-slider {
  flex: 1 1 80px;
  min-width: 60px;
  max-width: 140px;
  accent-color: var(--aw-primary-color, #0077cc);
  background: transparent;
  height: 2px;
  margin: 0 4px;
}
.themed-slider::-webkit-slider-thumb {
  background: var(--aw-primary-color, #0077cc);
  border: 1px solid var(--aw-panel-border-color);
}
.themed-slider::-moz-range-thumb {
  background: var(--aw-primary-color, #0077cc);
  border: 1px solid var(--aw-panel-border-color);
}
.themed-slider::-ms-thumb {
  background: var(--aw-primary-color, #0077cc);
  border: 1px solid var(--aw-panel-border-color);
}
.slider-minmax {
  font-size: 0.8rem;
  color: var(--aw-text-secondary-color);
  min-width: 24px;
  text-align: center;
}

.camera-info-collapsible {
  margin-top: var(--aw-spacing-md);
  background: var(--aw-panel-content-bg-color);
  border-radius: var(--aw-border-radius-sm);
  border: 1px solid var(--aw-panel-border-color);
  box-shadow: var(--aw-shadow-sm);
  padding: var(--aw-spacing-sm) var(--aw-spacing-lg);
}

.camera-info-collapsible summary {
  cursor: pointer;
  font-weight: var(--aw-font-weight-medium, 500);
  color: var(--aw-text-secondary-color);
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-xs);
  font-size: 1rem;
}

.camera-info-summary-icon {
  font-size: 1.1rem;
  color: var(--aw-device-camera-color);
}

.camera-info-list {
  display: grid;
  grid-template-columns: max-content 1fr;
  row-gap: var(--aw-spacing-xs);
  column-gap: var(--aw-spacing-lg);
  margin: 0;
  padding: 0;
  font-size: 0.7rem;
}

.camera-info-label {
  font-weight: var(--aw-font-weight-medium, 500);
  color: var(--aw-text-secondary-color);
  text-align: left;
  padding-right: var(--aw-spacing-sm);
}

.camera-info-value {
  color: var(--aw-text-color);
  text-align: right;
  font-variant-numeric: tabular-nums;
  word-break: break-all;
}

@media (max-width: 600px) {
  .camera-info-list {
    grid-template-columns: 1fr;
  }
}
</style> 