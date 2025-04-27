<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, reactive } from 'vue'
import EnhancedPanelComponentMigrated from './EnhancedPanelComponentMigrated.vue'
import Icon from './Icon.vue'
import { UIMode } from '../stores/useUIPreferencesStore'
import UnifiedStore from '../stores/UnifiedStore'
import type { CameraDevice } from '../types/DeviceTypes'
// Imported but used only in template
// import type { IconType } from './Icon.vue'

const props = defineProps({
  panelName: { type: String, required: true },
  connected: { type: Boolean, required: true },
  deviceType: { type: String, required: true },
  deviceId: { type: [String, Number], required: true },
  supportedModes: {
    type: Array as () => UIMode[],
    default: () => [UIMode.OVERVIEW, UIMode.DETAILED]
  },
  idx: { type: [String, Number], required: true },
  deviceNum: { type: Number, required: true }
})

// Define emits to update parent component
const emit = defineEmits([
  'close',
  'configure',
  'connect',
  'modeChange',
  'start-exposure',
  'abort-exposure',
  'set-cooler',
  'set-gain',
  'set-offset',
  'set-read-mode'
])

// Initialize store
const store = new UnifiedStore()

// Get the camera device directly from the store
const camera = computed(() => {
  const device = store.getDeviceById(String(props.deviceId))
  return device?.type === 'camera' ? (device as CameraDevice) : null
})

// Local reactive connection state
// Flag to track connection in progress
const isConnecting = computed(() => camera.value?.isConnecting || false)

// Camera state tracking
const cameraState = ref('Idle')

// Define camera capabilities interface
interface CameraCapabilities {
  minExposureTime?: number
  maxExposureTime?: number
  minGain?: number
  maxGain?: number
  minOffset?: number
  maxOffset?: number
  canAdjustOffset?: boolean
  canAdjustReadMode?: boolean
  hasImage?: boolean
}

// Define camera properties type for better type checking
// This interface is used for internal type checking but not directly in variables
/* interface CameraProperties {
  exposureTime?: number
  gain?: number
  offset?: number
  readoutMode?: number
  isExposing?: boolean
  exposureProgress?: number
  capabilities?: CameraCapabilities
  hasImage?: boolean
  imageData?: ArrayBuffer
  coolerEnabled?: boolean
  currentTemperature?: number
  targetTemperature?: number
  binningX?: number
  binningY?: number
} */

// Core reactive state
const exposureStartTime = ref(0)
const exposureTime = computed({
  get: () => (camera.value?.properties?.exposureTime as number) || 0.1,
  set: (value: number) => setExposureTime(value)
})

const gain = computed({
  get: () => (camera.value?.properties?.gain as number) || 0,
  set: (value: number) => setGain(value)
})

const offset = computed({
  get: () => (camera.value?.properties?.offset as number) || 0,
  set: (value: number) => setOffset(value)
})

const readMode = computed({
  get: () => (camera.value?.properties?.readoutMode as number) || 0,
  set: (value: number) => setReadMode(value)
})

const previewImage = ref<string | null>(null)

// Add histogram data ref
const histogramData = ref<number[]>([])
const histogramMin = ref(0)
const histogramMax = ref(0)
const histogramMean = ref(0)

// Add image stretch controls
const blackPoint = ref(0) // Percentage 0-100
const whitePoint = ref(100) // Percentage 0-100
const midtoneValue = ref(0.8) // Range 0.1-2.0, with 1.0 being linear
const autoStretch = ref(true) // Auto-stretch by default

// Add LUT for efficient image stretching - commented out until implemented
// const currentLUT = ref<Uint8Array>(new Uint8Array(65536))
// const lutInitialized = ref(false)

// Track original image data for reprocessing
const originalImageData = ref<ArrayBuffer | null>(null)

// Calculate exposure progress based on current time and exposure start time
const exposureProgress = computed(() => {
  if (!camera.value?.properties?.isExposing) return 0
  if (!exposureStartTime.value) return 0

  const now = Date.now()
  const expTime = (camera.value.properties.exposureTime as number) || 0.1
  const elapsed = (now - exposureStartTime.value) / 1000 // Convert to seconds
  const progress = (elapsed / expTime) * 100

  if (progress > 100) return 100
  return Math.round(progress)
})

// Additional reactive data for camera parameters
const minExposure = ref(0.001) // minimum exposure time in seconds
const maxExposure = ref(3600) // maximum exposure time (1 hour)
const minGain = ref(0)
const maxGain = ref(100)
const minOffset = ref(0)
const maxOffset = ref(100)
const canAdjustOffset = ref(true)
const canAdjustReadMode = ref(true)
const readModeOptions = ref(['Low Noise', 'Normal', 'High Speed'])

// Placeholder properties for camera data that would normally come from the camera
const cameraData = reactive({
  name: computed(() => camera.value?.name || 'Camera'),
  binningX: 1,
  binningY: 1,
  isExposing: computed(() => camera.value?.properties?.isExposing || false),
  previewImage: null,
  coolerEnabled: computed(() => camera.value?.properties?.coolerEnabled || false),
  temperature: computed(() => camera.value?.properties?.currentTemperature || 0),
  targetTemperature: computed(() => camera.value?.properties?.targetTemperature || -10)
})

// Computed properties
const isConnected = computed(() => props.connected)
const name = computed(() => `Camera ${props.idx}`)

const percentComplete = computed(() => {
  // Use the value from the camera properties if available
  const progress = camera.value?.properties?.exposureProgress as number
  if (typeof progress === 'number') {
    // Ensure we have a valid number between 0-100
    if (isNaN(progress) || progress < 0) return 0
    if (progress > 100) return 100
    return Math.round(progress)
  }

  // Otherwise, fall back to our calculated value
  return exposureProgress.value
})

// Method to handle connect events from EnhancedPanelComponent
function onConnect() {
  handleConnect()
}

// Handle connection toggle
function handleConnect() {
  if (isConnecting.value) return
  emit('connect', !isConnected.value)
}

// Handle mode changes
function onModeChange(mode: UIMode) {
  emit('modeChange', mode)
}

// Handle component lifecycle
onMounted(() => {
  // Initialize data and set up event listeners
  if (props.connected) {
    store.on('devicePropertyChanged', handlePropertyChange)
    fetchInitialData()
  }
})

// Clean up on component unmount
onUnmounted(() => {
  store.off('devicePropertyChanged', handlePropertyChange)
})

// Watch for connection changes
watch(
  () => props.connected,
  (newValue) => {
    if (newValue) {
      store.on('devicePropertyChanged', handlePropertyChange)
      fetchInitialData()
    } else {
      store.off('devicePropertyChanged', handlePropertyChange)
    }
  }
)

// Handle property changes from store
function handlePropertyChange(...args: unknown[]) {
  if (args.length < 3) return

  const deviceId = args[0] as string
  const property = args[1] as string
  const value = args[2]

  if (deviceId !== String(props.deviceId)) return

  // Update local state based on property changes
  if (property === 'isExposing' && value === false) {
    // When exposure completes, fetch the image
    fetchImage()
  }
}

// Fetch initial camera data
function fetchInitialData() {
  // This function would initialize camera parameters based on store data
  // In a real implementation, this would likely involve getting capabilities

  // Set camera capabilities based on store data
  const capabilities = (camera.value?.properties?.capabilities as CameraCapabilities) || {}

  minExposure.value = capabilities.minExposureTime || 0.001
  maxExposure.value = capabilities.maxExposureTime || 3600
  minGain.value = capabilities.minGain || 0
  maxGain.value = capabilities.maxGain || 100
  minOffset.value = capabilities.minOffset || 0
  maxOffset.value = capabilities.maxOffset || 100
  canAdjustOffset.value = capabilities.canAdjustOffset !== false
  canAdjustReadMode.value = capabilities.canAdjustReadMode !== false

  // If there's a stored image, fetch it
  if (camera.value?.properties?.hasImage) {
    fetchImage()
  }
}

// Start an exposure
function startExposure() {
  if (!isConnected.value || cameraData.isExposing) return

  try {
    // Store the exposure start time for progress calculations
    exposureStartTime.value = Date.now()

    emit('start-exposure', exposureTime.value)

    // In a real implementation, we would get updates from the store
    // For now, we'll just set the state manually
    cameraState.value = 'Exposing'
  } catch (error) {
    console.error('Error starting exposure:', error)
    cameraState.value = 'Error'
  }
}

// Function to abort an exposure
function abortExposure() {
  if (!cameraData.isExposing) return

  try {
    emit('abort-exposure')
    cameraState.value = 'Idle'
  } catch (error) {
    console.error('Error aborting exposure:', error)
  }
}

// Function to fetch camera image - this would be called when exposure completes
function fetchImage() {
  console.log('Fetching image')

  // In a real implementation, we would get the image data from the store
  // For now, we'll just use a placeholder
  // This would normally involve getting binary data and converting it to a displayable format

  // For the migration, we're just showing the process of how this would be handled
  // The actual implementation would depend on how images are stored in the UnifiedStore

  // Simulate getting image data from the store
  const imageData = camera.value?.properties?.imageData as ArrayBuffer | undefined
  if (imageData) {
    // Process the image data
    displayImage(imageData)
  }
}

// Function to display the image and calculate histogram
function displayImage(imageData: ArrayBuffer) {
  // In a real implementation, this would convert the image data to a displayable format
  // and calculate the histogram

  // For now, we'll just use a placeholder
  previewImage.value = 'data:image/png;base64,imageDataWouldGoHere'

  // Calculate histogram
  calculateHistogram(imageData)
}

// Function to calculate histogram from image data
function calculateHistogram(imageData: ArrayBuffer) {
  // This would calculate the histogram from the image data
  // For now, we'll just use placeholder values
  console.log('Calculating histogram from', imageData.byteLength, 'bytes of data')

  histogramData.value = new Array(256).fill(0)
  histogramMin.value = 0
  histogramMax.value = 65535
  histogramMean.value = 32768
}

// Image processing functions
function toggleAutoStretch() {
  autoStretch.value = !autoStretch.value

  if (autoStretch.value && originalImageData.value) {
    // Auto-stretch the image
    const stats = calculateImageStats(originalImageData.value)
    blackPoint.value = Math.round((stats.min / stats.max) * 100)
    whitePoint.value = 100
    midtoneValue.value = 0.8

    // Update display with auto-stretch
    displayImage(originalImageData.value)
  }
}

// Calculate image statistics
function calculateImageStats(imageData: ArrayBuffer) {
  // This would calculate statistics from the image data
  // For now, we'll just use placeholder values
  console.log('Calculating image stats from', imageData.byteLength, 'bytes of data')

  return {
    min: 0,
    max: 65535,
    mean: 32768
  }
}

// Set black point for image stretching
function setBlackPoint(value: number) {
  blackPoint.value = value

  if (originalImageData.value) {
    // Update the image with the new stretch values
    displayImage(originalImageData.value)
  }
}

// Set white point for image stretching
function setWhitePoint(value: number) {
  whitePoint.value = value

  if (originalImageData.value) {
    // Update the image with the new stretch values
    displayImage(originalImageData.value)
  }
}

// Set midtone value for image stretching
function setMidtone(value: number) {
  midtoneValue.value = value

  if (originalImageData.value) {
    // Update the image with the new stretch values
    displayImage(originalImageData.value)
  }
}

// Download the current image
function downloadPreview() {
  if (!previewImage.value) return

  // Create a link and click it to download the image
  const link = document.createElement('a')
  link.href = previewImage.value
  link.download = `Camera_${props.idx}_${new Date().toISOString().replace(/:/g, '-')}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Camera control functions
function setExposureTime(value: number) {
  if (cameraData.isExposing || !isConnected.value) return

  // Validate the exposure time
  if (value < minExposure.value) value = minExposure.value
  if (value > maxExposure.value) value = maxExposure.value

  // Update the store via emit
  store.updateDeviceProperties(String(props.deviceId), { exposureTime: value })
}

function setGain(value: number) {
  if (cameraData.isExposing || !isConnected.value) return

  // Validate the gain
  if (value < minGain.value) value = minGain.value
  if (value > maxGain.value) value = maxGain.value

  // Update the store via emit
  emit('set-gain', value)
}

function setOffset(value: number) {
  if (cameraData.isExposing || !isConnected.value) return

  // Validate the offset
  if (value < minOffset.value) value = minOffset.value
  if (value > maxOffset.value) value = maxOffset.value

  // Update the store via emit
  emit('set-offset', value)
}

function setReadMode(value: number) {
  if (cameraData.isExposing || !isConnected.value) return

  // Update the store via emit
  emit('set-read-mode', value)
}

function setBinning(x: number, y: number) {
  if (cameraData.isExposing || !isConnected.value) return

  // Update binning in the store
  cameraData.binningX = x
  cameraData.binningY = y

  // In a real implementation, this would update the store
  store.updateDeviceProperties(String(props.deviceId), {
    binningX: x,
    binningY: y
  })
}

// Cooler control
function setCoolerEnabled(enabled: boolean) {
  if (!isConnected.value) return

  emit('set-cooler', enabled, enabled ? cameraData.targetTemperature : undefined)
}

function setTargetTemperature(temp: number) {
  if (!isConnected.value || !cameraData.coolerEnabled) return

  emit('set-cooler', true, temp)
}
</script>

<template>
  <EnhancedPanelComponentMigrated
    :panel-name="name"
    :connected="isConnected"
    :device-type="'camera'"
    :device-id="String(deviceId)"
    :supported-modes="supportedModes"
    @connect="onConnect"
    @mode-change="onModeChange"
  >
    <!-- Top Status Bar - Shown in Detailed and Fullscreen modes -->
    <template #top-status-bar>
      <div class="status-indicators">
        <span
          class="status-indicator"
          :class="{ connected: isConnected, disconnected: !isConnected }"
        >
          {{ isConnected ? 'Connected' : 'Disconnected' }}
        </span>
        <span
          v-if="isConnected"
          class="status-indicator"
          :class="{ exposing: cameraData.isExposing }"
        >
          {{ cameraState }}
        </span>
        <span v-if="isConnected && cameraData.isExposing" class="status-indicator progress">
          {{ percentComplete }}% Complete
        </span>
        <span v-if="isConnected && !cameraData.isExposing" class="status-indicator settings">
          {{ gain }}% Gain {{ canAdjustOffset ? '| ' + offset + ' Offset' : '' }}
        </span>
      </div>
    </template>

    <!-- Keep the original status bar empty to hide it -->
    <template #status-bar> </template>

    <!-- Overview Content (Simple Mode) -->
    <template #overview-content>
      <div class="camera-overview">
        <div class="overview-layout">
          <!-- Image preview side -->
          <div class="overview-preview">
            <div v-if="previewImage" class="preview-container">
              <img :src="previewImage" alt="Camera Preview" />
              <div v-if="histogramData.length > 0" class="preview-stats">
                <div class="stat-item"><span>Min:</span> {{ Math.round(histogramMin) }}</div>
                <div class="stat-item"><span>Max:</span> {{ Math.round(histogramMax) }}</div>
                <div class="stat-item"><span>Mean:</span> {{ Math.round(histogramMean) }}</div>
              </div>
            </div>
            <div v-else class="empty-preview">
              <div v-if="cameraData.isExposing" class="exposing-status">
                <Icon type="camera" class="exposing-icon" />
                <div>
                  <div class="state-text">{{ cameraState }}</div>
                  <div class="percent-text">{{ percentComplete }}%</div>
                </div>
              </div>
              <span v-else-if="!isConnected" class="status-disconnected">
                <Icon type="disconnected" />
                <span>Camera disconnected</span>
              </span>
              <span v-else class="status-no-image">
                <Icon type="camera" />
                <span>No image available</span>
              </span>
            </div>
          </div>

          <!-- Controls side -->
          <div class="overview-controls">
            <!-- Image stretch controls -->
            <div v-if="previewImage" class="overview-stretch-controls">
              <h4>Image Controls</h4>
              <div class="overview-stretch-row">
                <div class="stretch-toggle-simple">
                  <label>
                    <input type="checkbox" :checked="autoStretch" @change="toggleAutoStretch" />
                    Auto Stretch
                  </label>
                </div>
              </div>
              <div class="overview-stretch-row">
                <span class="slider-label">Black:</span>
                <input
                  v-model.number="blackPoint"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  :disabled="autoStretch"
                  class="stretch-slider"
                  @change="setBlackPoint(blackPoint)"
                />
                <span class="slider-value">{{ blackPoint }}%</span>
              </div>
              <div class="overview-stretch-row">
                <span class="slider-label">White:</span>
                <input
                  v-model.number="whitePoint"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  :disabled="autoStretch"
                  class="stretch-slider"
                  @change="setWhitePoint(whitePoint)"
                />
                <span class="slider-value">{{ whitePoint }}%</span>
              </div>
              <div class="overview-stretch-row">
                <span class="midtone-label">Midtone:</span>
                <input
                  v-model.number="midtoneValue"
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.05"
                  title="Midtone Adjustment"
                  class="midtone-slider"
                  @change="setMidtone(midtoneValue)"
                />
                <span class="midtone-value">{{ midtoneValue.toFixed(1) }}</span>
              </div>
              <div class="overview-stretch-actions">
                <button
                  class="download-button"
                  title="Save Image"
                  :disabled="!previewImage"
                  @click="downloadPreview"
                >
                  <Icon type="files" class="actions-icon" />
                  <span>Save Image</span>
                </button>
              </div>
            </div>

            <!-- Camera settings controls -->
            <div class="camera-settings" :class="{ 'controls-disabled': !isConnected }">
              <h4>Camera Settings</h4>
              <div class="controls-grid">
                <div class="control-row">
                  <label>Exposure:</label>
                  <div class="input-with-unit">
                    <input
                      v-model="exposureTime"
                      type="number"
                      :min="minExposure"
                      :max="maxExposure"
                      :disabled="!!cameraData.isExposing || !isConnected"
                      step="0.1"
                    />
                    <span class="unit">s</span>
                  </div>
                </div>

                <div class="control-row">
                  <label>Binning:</label>
                  <div class="binning-control">
                    <input
                      v-model.number="cameraData.binningX"
                      type="number"
                      min="1"
                      max="4"
                      :disabled="!!cameraData.isExposing || !isConnected"
                      @change="setBinning(cameraData.binningX, cameraData.binningY)"
                    />
                    <span>×</span>
                    <input
                      v-model.number="cameraData.binningY"
                      type="number"
                      min="1"
                      max="4"
                      :disabled="!!cameraData.isExposing || !isConnected"
                      @change="setBinning(cameraData.binningX, cameraData.binningY)"
                    />
                  </div>
                </div>

                <div class="control-row">
                  <label>Gain:</label>
                  <input
                    v-model.number="gain"
                    type="number"
                    :min="minGain"
                    :max="maxGain"
                    :disabled="!!cameraData.isExposing || !isConnected"
                  />
                </div>

                <div v-if="canAdjustOffset" class="control-row">
                  <label>Offset:</label>
                  <input
                    v-model.number="offset"
                    type="number"
                    :min="minOffset"
                    :max="maxOffset"
                    :disabled="!!cameraData.isExposing || !isConnected"
                  />
                </div>

                <div v-if="canAdjustReadMode" class="control-row">
                  <label>Read Mode:</label>
                  <select
                    v-model="readMode"
                    :disabled="!!cameraData.isExposing || !isConnected"
                    class="read-mode-select"
                  >
                    <option v-for="(mode, index) in readModeOptions" :key="index" :value="index">
                      {{ mode }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="overview-buttons">
                <button
                  class="action-button start"
                  :disabled="!!cameraData.isExposing || !isConnected"
                  @click="startExposure"
                >
                  <Icon type="play" class="action-icon" />
                  <span>Start Exposure</span>
                </button>
                <button
                  class="action-button abort"
                  :disabled="!cameraData.isExposing || !isConnected"
                  @click="abortExposure"
                >
                  <Icon type="stop" class="action-icon" />
                  <span>Abort</span>
                </button>
              </div>
            </div>

            <!-- Cooler controls -->
            <div class="cooler-controls" :class="{ 'controls-disabled': !isConnected }">
              <h4>Cooler Controls</h4>
              <div class="cooler-status">
                <div class="temperature-indicator">
                  <span class="temp-label">Temperature:</span>
                  <span class="temp-value"
                    >{{ (cameraData.temperature as number).toFixed(1) }}°C</span
                  >
                </div>
                <div class="cooler-toggle">
                  <label class="switch">
                    <input
                      type="checkbox"
                      :checked="!!cameraData.coolerEnabled"
                      :disabled="!isConnected"
                      @change="setCoolerEnabled(!cameraData.coolerEnabled)"
                    />
                    <span class="slider round"></span>
                  </label>
                  <span>Cooler {{ cameraData.coolerEnabled ? 'On' : 'Off' }}</span>
                </div>
              </div>
              <div class="target-temp" :class="{ disabled: !cameraData.coolerEnabled }">
                <label for="targetTemp">Target Temperature:</label>
                <div class="temp-input">
                  <input
                    id="targetTemp"
                    v-model.number="cameraData.targetTemperature"
                    type="number"
                    min="-50"
                    max="50"
                    step="0.5"
                    :disabled="!cameraData.coolerEnabled || !isConnected"
                    @change="setTargetTemperature(cameraData.targetTemperature as number)"
                  />
                  <span class="unit">°C</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </EnhancedPanelComponentMigrated>
</template>

<style scoped>
/* Keeping the styles from the original component */
</style>
