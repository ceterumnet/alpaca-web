<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, reactive } from 'vue'
import EnhancedPanelComponentMigrated from '@/components/ui/EnhancedPanelComponentMigrated.vue'
import Icon from '@/components/ui/Icon.vue'
import { UIMode } from '@/stores/useUIPreferencesStore'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import type { CameraDevice } from '@/types/DeviceTypes'

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

// Initialize store using Pinia composition API
const store = useUnifiedStore()

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

// Store-synced values (current values from the store)
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

// Form values (local state that won't be overwritten)
const formExposureTime = ref(0.1)
const formGain = ref(0)
const formOffset = ref(0)
const formReadMode = ref(0)
// Binning values
const formBinningX = ref(1)
const formBinningY = ref(1)

// Initialize form values from store when component mounts
onMounted(() => {
  formExposureTime.value = exposureTime.value
  formGain.value = gain.value
  formOffset.value = offset.value
  formReadMode.value = readMode.value
  formBinningX.value = (camera.value?.properties?.binningX as number) || 1
  formBinningY.value = (camera.value?.properties?.binningY as number) || 1
  if (props.connected) {
    store.on('devicePropertyChanged', boundPropertyChangeHandler)
    fetchInitialData()
  }
})

// Update form values when store values change and user is not actively editing
watch(exposureTime, (newValue) => {
  if (!cameraData.isExposing) {
    formExposureTime.value = newValue
  }
})

watch(gain, (newValue) => {
  if (!cameraData.isExposing) {
    formGain.value = newValue
  }
})

watch(offset, (newValue) => {
  if (!cameraData.isExposing) {
    formOffset.value = newValue
  }
})

watch(readMode, (newValue) => {
  if (!cameraData.isExposing) {
    formReadMode.value = newValue
  }
})

watch(
  () => camera.value?.properties?.binningX,
  (newValue) => {
    if (!cameraData.isExposing && newValue !== undefined) {
      formBinningX.value = newValue as number
    }
  }
)

watch(
  () => camera.value?.properties?.binningY,
  (newValue) => {
    if (!cameraData.isExposing && newValue !== undefined) {
      formBinningY.value = newValue as number
    }
  }
)

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

// Local reference to the bound event handler to ensure proper cleanup
const boundPropertyChangeHandler = function (...args: unknown[]) {
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

// Clean up on component unmount
onUnmounted(() => {
  // Make sure we properly unregister the event listener
  store.off('devicePropertyChanged', boundPropertyChangeHandler)
})

// Watch for connection changes
watch(
  () => props.connected,
  (newValue) => {
    if (newValue) {
      store.on('devicePropertyChanged', boundPropertyChangeHandler)
      fetchInitialData()
    } else {
      store.off('devicePropertyChanged', boundPropertyChangeHandler)
    }
  }
)

// Handle property changes from store function defined earlier as boundPropertyChangeHandler

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

    // Apply form values to the camera settings before starting exposure
    if (formExposureTime.value !== exposureTime.value) {
      setExposureTime(formExposureTime.value)
    }
    if (formGain.value !== gain.value) {
      setGain(formGain.value)
    }
    if (formOffset.value !== offset.value) {
      setOffset(formOffset.value)
    }
    if (formReadMode.value !== readMode.value) {
      setReadMode(formReadMode.value)
    }
    if (formBinningX.value !== cameraData.binningX || formBinningY.value !== cameraData.binningY) {
      setBinning(formBinningX.value, formBinningY.value)
    }

    // Start the exposure using the updated settings
    emit('start-exposure', formExposureTime.value)

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
  console.log('Fetching image from camera properties')

  // Get the image data from the store
  const imageData = camera.value?.properties?.imageData as ArrayBuffer | undefined

  if (imageData) {
    console.log('Image data found in camera properties, size:', imageData.byteLength, 'bytes')
    // Process the image data
    displayImage(imageData)
  } else {
    console.log('No image data found in camera properties')
  }
}

// Function to display the image and calculate histogram
function displayImage(imageData: ArrayBuffer) {
  console.log('Processing image data for display, size:', imageData.byteLength, 'bytes')

  // Process the binary image data according to ASCOM standard
  const processedData = processImageBytes(imageData)

  if (processedData && processedData.width > 0 && processedData.height > 0) {
    // Store the original image data for reprocessing with different stretch settings
    originalImageData.value = imageData

    // Create a canvas to render the image
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.error('Could not get canvas context')
      return
    }

    canvas.width = processedData.width
    canvas.height = processedData.height

    // Create image data to hold the pixel values
    const canvasImageData = ctx.createImageData(processedData.width, processedData.height)
    const outputData = canvasImageData.data

    // Apply simple linear normalization to visualize the image
    let min = Number.MAX_VALUE
    let max = Number.MIN_VALUE

    // First pass to determine range (ASCOM Alpaca sends image data in column-major order)
    for (let y = 0; y < processedData.height; y++) {
      for (let x = 0; x < processedData.width; x++) {
        // Calculate source index for Alpaca data (column-major order)
        const sourceIdx = x * processedData.height + y

        if (sourceIdx < processedData.pixelData.length) {
          // Handle potentially large numbers safely
          const val = Number(processedData.pixelData[sourceIdx])
          if (!isNaN(val) && isFinite(val)) {
            min = val < min ? val : min
            max = val > max ? val : max
          }
        }
      }
    }

    console.log(
      `Image value range: min=${min}, max=${max}, bit depth=${processedData.bitsPerPixel || 8}-bit`
    )

    // Check for potential issues with the range
    if (!isFinite(min) || !isFinite(max) || max <= min) {
      console.warn('Invalid pixel value range, using defaults')
      min = 0
      max = processedData.bitsPerPixel && processedData.bitsPerPixel > 8 ? 65535 : 255
    }

    // Store statistics for histogramming
    histogramMin.value = min
    histogramMax.value = max

    // Create a safe scaling function that handles large values properly
    const scaleValue = (value: number): number => {
      // Ensure value is within expected range
      value = Math.max(min, Math.min(max, value))

      // Apply scaling based on black/white points
      let scaledValue = 0
      if (max > min) {
        // Map value to 0-1 range based on black/white points
        let rangeMin = min
        let rangeMax = max

        if (!autoStretch.value) {
          // Apply manual black/white points (percentage based)
          rangeMin = min + (blackPoint.value / 100.0) * (max - min)
          rangeMax = min + (whitePoint.value / 100.0) * (max - min)
        }

        // Normalize to 0-1 range
        const normalizedValue = (value - rangeMin) / (rangeMax - rangeMin)

        // Apply midtone correction (gamma)
        const gamma = midtoneValue.value
        let correctedValue = normalizedValue
        if (normalizedValue > 0) {
          correctedValue = Math.pow(normalizedValue, 1.0 / gamma)
        }

        // Convert to 8-bit (0-255)
        scaledValue = Math.round(correctedValue * 255)
      }

      // Clamp to 0-255 range
      return Math.max(0, Math.min(255, scaledValue))
    }

    // Apply the transformation for each pixel
    for (let y = 0; y < processedData.height; y++) {
      for (let x = 0; x < processedData.width; x++) {
        // Calculate source index (column-major) and target index (row-major for canvas)
        const sourceIdx = x * processedData.height + y
        const targetIdx = (y * processedData.width + x) * 4

        if (sourceIdx < processedData.pixelData.length && targetIdx + 3 < outputData.length) {
          // Get pixel value and scale it safely
          const value = Number(processedData.pixelData[sourceIdx])
          const displayValue = scaleValue(value)

          // Set RGB values (grayscale)
          outputData[targetIdx] = displayValue
          outputData[targetIdx + 1] = displayValue
          outputData[targetIdx + 2] = displayValue
          outputData[targetIdx + 3] = 255 // Alpha
        }
      }
    }

    // Put the image data onto the canvas
    ctx.putImageData(canvasImageData, 0, 0)

    // Convert canvas to data URL for display
    previewImage.value = canvas.toDataURL('image/png')

    // Calculate histogram from the processed data
    calculateHistogram(processedData)
  } else {
    // Just use a placeholder if processing failed
    previewImage.value = 'data:image/png;base64,imageDataWouldGoHere'

    // Create empty histogram
    histogramData.value = new Array(256).fill(0)
    histogramMin.value = 0
    histogramMax.value = 65535
    histogramMean.value = 32768
  }
}

// Function to process binary image data according to ASCOM standard
function processImageBytes(data: ArrayBuffer) {
  try {
    // Parse the binary metadata according to Alpaca specification 7.6/7.7
    const dataView = new DataView(data)

    // Parse metadata fields
    const metadataVersion = dataView.getInt32(0, true) // Bytes 0-3, true for little-endian
    const errorNumber = dataView.getInt32(4, true) // Bytes 4-7
    const dataStart = dataView.getInt32(16, true) // Bytes 16-19
    const imageElementType = dataView.getInt32(20, true) // Bytes 20-23
    const transmissionElementType = dataView.getInt32(24, true) // Bytes 24-27
    const rank = dataView.getInt32(28, true) // Bytes 28-31
    const dimension1 = dataView.getInt32(32, true) // Bytes 32-35
    const dimension2 = dataView.getInt32(36, true) // Bytes 36-39
    const dimension3 = dataView.getInt32(40, true) // Bytes 40-43

    console.log(
      `ImageBytes metadata: version=${metadataVersion}, error=${errorNumber}, ` +
        `imageElementType=${imageElementType}, transmissionElementType=${transmissionElementType}, ` +
        `dimensions=${dimension1}x${dimension2}x${dimension3}, rank=${rank}`
    )

    // Check if operation succeeded
    if (errorNumber !== 0) {
      // Operation failed, extract error message
      const errorData = new Uint8Array(data, dataStart)
      const errorMessage = new TextDecoder().decode(errorData)
      console.error(`ImageBytes error: ${errorMessage}`)
      return {
        width: 0,
        height: 0,
        bytesPerPixel: 1,
        pixelData: new Uint8Array(0),
        imageType: 'monochrome',
        bitsPerPixel: 8,
        originalElementType: imageElementType,
        transmissionElementType
      }
    }

    // Determine image dimensions
    const width = dimension1
    const height = dimension2

    // Determine original bit depth and transmission bit depth
    let origBitsPerPixel = 8
    let transmissionBytesPerPixel = 1
    let pixelData:
      | Uint8Array
      | Uint16Array
      | Int16Array
      | Int32Array
      | Uint32Array
      | Float32Array
      | Float64Array
      | number[] = new Uint8Array(0)

    // Determine original bit depth from imageElementType
    switch (imageElementType) {
      case 0: // Unknown
        origBitsPerPixel = 8 // Assume 8-bit
        break
      case 1: // Int16
        origBitsPerPixel = 16
        break
      case 2: // Int32
        origBitsPerPixel = 32
        break
      case 3: // Double
        origBitsPerPixel = 64 // 64-bit floating point
        break
      case 4: // Single
        origBitsPerPixel = 32 // 32-bit floating point
        break
      case 5: // UInt64
        origBitsPerPixel = 64
        break
      case 6: // Byte
        origBitsPerPixel = 8
        break
      case 7: // Int64
        origBitsPerPixel = 64
        break
      case 8: // UInt16
        origBitsPerPixel = 16
        break
      case 9: // UInt32
        origBitsPerPixel = 32
        break
      default:
        console.warn(`Unknown imageElementType: ${imageElementType}, assuming 8-bit`)
        origBitsPerPixel = 8
    }

    // Process data based on transmissionElementType (how the data was sent)
    switch (transmissionElementType) {
      case 0: // Unknown
      case 6: // Byte (UInt8)
        transmissionBytesPerPixel = 1
        pixelData = new Uint8Array(data, dataStart)
        break
      case 1: // Int16
        transmissionBytesPerPixel = 2
        pixelData = new Int16Array(data, dataStart)
        // Convert Int16 to Uint16 if needed
        if (transmissionElementType === 1) {
          console.log('Converting Int16 to Uint16 for proper image processing')

          const tempBuffer = new ArrayBuffer(pixelData.length * 2)
          const tempUint16 = new Uint16Array(tempBuffer)

          // Copy values correctly by using bitwise operation to convert signed to unsigned
          for (let i = 0; i < pixelData.length; i++) {
            tempUint16[i] = pixelData[i] & 0xffff
          }

          pixelData = tempUint16
        }
        break
      case 8: // UInt16
        transmissionBytesPerPixel = 2
        pixelData = new Uint16Array(data, dataStart)
        break
      case 2: {
        // Int32
        transmissionBytesPerPixel = 4
        pixelData = new Int32Array(data, dataStart)
        // Convert Int32 to Uint32 for proper visualization
        console.log('Converting Int32 to Uint32 for proper image processing')

        const tempBuffer32 = new ArrayBuffer(pixelData.length * 4)
        const tempUint32 = new Uint32Array(tempBuffer32)

        // Copy values correctly by using bitwise operation to convert signed to unsigned
        for (let i = 0; i < pixelData.length; i++) {
          tempUint32[i] = pixelData[i] >>> 0 // Unsigned right shift to convert to uint32
        }

        pixelData = tempUint32
        break
      }
      case 9: // UInt32
        transmissionBytesPerPixel = 4
        pixelData = new Uint32Array(data, dataStart)
        break
      case 7: {
        // Int64
        transmissionBytesPerPixel = 8
        console.warn(
          '64-bit integer types not fully supported, will be converted to unsigned 32-bit'
        )
        // Create a view to read 64-bit values and convert to unsigned 32-bit
        pixelData = new Array(width * height)

        const dataView = new DataView(data, dataStart)
        for (let i = 0; i < width * height; i++) {
          // Read lower 32 bits and convert to unsigned for display
          pixelData[i] = dataView.getInt32(i * 8, true) >>> 0
        }
        break
      }
      case 5: {
        // UInt64
        transmissionBytesPerPixel = 8
        console.warn('64-bit integer types not fully supported, will be truncated')
        // Create a view to read 64-bit values as 32-bit pairs
        pixelData = new Array(width * height)

        const dataView = new DataView(data, dataStart)
        for (let i = 0; i < width * height; i++) {
          // Read only lower 32 bits for display (limitation of JavaScript)
          pixelData[i] = dataView.getUint32(i * 8, true)
        }
        break
      }
      case 4: // Single (Float32)
        transmissionBytesPerPixel = 4
        pixelData = new Float32Array(data, dataStart)
        break
      case 3: // Double (Float64)
        transmissionBytesPerPixel = 8
        pixelData = new Float64Array(data, dataStart)
        break
      default:
        console.error(`Unsupported transmission element type: ${transmissionElementType}`)
        return {
          width: 0,
          height: 0,
          bytesPerPixel: 1,
          pixelData: new Uint8Array(0),
          imageType: 'monochrome',
          bitsPerPixel: 8,
          originalElementType: imageElementType,
          transmissionElementType
        }
    }

    // Determine if this is monochrome or color based on rank and dimension3
    let imageType = 'monochrome'
    if (rank === 3 && dimension3 === 3) {
      imageType = 'color'
    }

    // Log min and max pixel values for debugging
    let minVal = Number.MAX_VALUE
    let maxVal = Number.MIN_VALUE

    // Sample the data to avoid performance issues with large images
    const sampleStep = pixelData.length > 1000000 ? Math.floor(pixelData.length / 1000) : 1

    for (let i = 0; i < pixelData.length; i += sampleStep) {
      const val = Number(pixelData[i])
      if (!isNaN(val)) {
        minVal = Math.min(minVal, val)
        maxVal = Math.max(maxVal, val)
      }
    }

    console.log(
      `Image pixel value range: min=${minVal}, max=${maxVal}, original: ${origBitsPerPixel}-bit, transmitted: ${transmissionBytesPerPixel * 8}-bit`
    )

    return {
      width,
      height,
      bytesPerPixel: transmissionBytesPerPixel,
      pixelData,
      imageType,
      bitsPerPixel: origBitsPerPixel,
      originalElementType: imageElementType,
      transmissionElementType
    }
  } catch (error) {
    console.error('Error processing ImageBytes data:', error)
    return null
  }
}

// Function to calculate histogram from processed image data
function calculateHistogram(
  processedData: {
    width: number
    height: number
    pixelData:
      | Uint8Array
      | Uint16Array
      | Int16Array
      | Int32Array
      | Uint32Array
      | Float32Array
      | Float64Array
      | number[]
    imageType: string
    bitsPerPixel?: number
  } | null
) {
  if (!processedData) {
    histogramData.value = new Array(256).fill(0)
    return
  }

  const { width, height, pixelData, bitsPerPixel } = processedData

  // Create a histogram with appropriate size
  // We'll use 256 bins regardless of bit depth for UI display
  const histSize = 256
  const histogram = new Array(histSize).fill(0)

  // Calculate the scaling factor based on bit depth
  const maxPixelValue = bitsPerPixel ? Math.pow(2, bitsPerPixel) - 1 : 255
  const scaleFactor = (histSize - 1) / maxPixelValue

  // Count pixel values
  let sum = 0
  let count = 0

  // Sample the data to avoid performance issues with large images
  const sampleStep = Math.max(1, Math.floor((width * height) / 10000))

  // ASCOM Alpaca sends data in column-major order
  for (let y = 0; y < height; y += sampleStep) {
    for (let x = 0; x < width; x += sampleStep) {
      const sourceIdx = x * height + y

      if (sourceIdx < pixelData.length) {
        const value = Number(pixelData[sourceIdx])
        if (!isNaN(value) && isFinite(value)) {
          // Scale the value to fit in our histogram bins
          const scaledValue = Math.min(histSize - 1, Math.max(0, Math.floor(value * scaleFactor)))
          histogram[scaledValue]++
          sum += value
          count++
        }
      }
    }
  }

  // Update the histogram data
  histogramData.value = histogram

  // Calculate simple statistics
  histogramMean.value = count > 0 ? sum / count : 0
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
  // Process the image data first
  const processedData = processImageBytes(imageData)
  if (!processedData) {
    return { min: 0, max: 65535, mean: 32768 }
  }

  // Calculate actual min/max/mean from the processed data
  let min = Number.MAX_VALUE
  let max = Number.MIN_VALUE
  let sum = 0
  let count = 0

  // Use the pixel data from the processed image
  const { width, height, pixelData } = processedData

  // Sample the data to avoid performance issues with large images
  const sampleStep = pixelData.length > 1000000 ? Math.floor(pixelData.length / 1000) : 1

  // ASCOM Alpaca sends data in column-major order
  for (let y = 0; y < height; y += sampleStep) {
    for (let x = 0; x < width; x += sampleStep) {
      const sourceIdx = x * height + y

      if (sourceIdx < pixelData.length) {
        const value = Number(pixelData[sourceIdx])
        if (!isNaN(value) && isFinite(value)) {
          min = Math.min(min, value)
          max = Math.max(max, value)
          sum += value
          count++
        }
      }
    }
  }

  // Handle edge cases
  if (!isFinite(min) || !isFinite(max) || max <= min || count === 0) {
    console.warn('Invalid image statistics, using defaults')
    return { min: 0, max: 65535, mean: 32768 }
  }

  const mean = sum / count

  return { min, max, mean }
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

// Watch for changes in image data from the camera
watch(
  () => camera.value?.properties?.imageData,
  (newImageData) => {
    if (newImageData && newImageData instanceof ArrayBuffer) {
      console.log('Detected image data change, updating display')
      displayImage(newImageData)
    }
  }
)

// Expose fetchImage for testing
defineExpose({
  fetchImage
})
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
                  <Icon type="gear" class="actions-icon" />
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
                      v-model="formExposureTime"
                      type="number"
                      :min="minExposure"
                      :max="maxExposure"
                      :disabled="!!cameraData.isExposing || !isConnected"
                      step="0.1"
                    />
                    <span class="unit">s</span>
                  </div>
                  <span v-if="formExposureTime !== exposureTime" class="current-value">
                    Current: {{ exposureTime.toFixed(1) }}s
                  </span>
                </div>

                <div class="control-row">
                  <label>Binning:</label>
                  <div class="binning-control">
                    <input
                      v-model.number="formBinningX"
                      type="number"
                      min="1"
                      max="4"
                      :disabled="!!cameraData.isExposing || !isConnected"
                    />
                    <span>×</span>
                    <input
                      v-model.number="formBinningY"
                      type="number"
                      min="1"
                      max="4"
                      :disabled="!!cameraData.isExposing || !isConnected"
                    />
                  </div>
                  <span
                    v-if="
                      formBinningX !== cameraData.binningX || formBinningY !== cameraData.binningY
                    "
                    class="current-value"
                  >
                    Current: {{ cameraData.binningX }}×{{ cameraData.binningY }}
                  </span>
                </div>

                <div class="control-row">
                  <label>Gain:</label>
                  <input
                    v-model.number="formGain"
                    type="number"
                    :min="minGain"
                    :max="maxGain"
                    :disabled="!!cameraData.isExposing || !isConnected"
                  />
                  <span v-if="formGain !== gain" class="current-value"> Current: {{ gain }} </span>
                </div>

                <div v-if="canAdjustOffset" class="control-row">
                  <label>Offset:</label>
                  <input
                    v-model.number="formOffset"
                    type="number"
                    :min="minOffset"
                    :max="maxOffset"
                    :disabled="!!cameraData.isExposing || !isConnected"
                  />
                  <span v-if="formOffset !== offset" class="current-value">
                    Current: {{ offset }}
                  </span>
                </div>

                <div v-if="canAdjustReadMode" class="control-row">
                  <label>Read Mode:</label>
                  <select
                    v-model="formReadMode"
                    :disabled="!!cameraData.isExposing || !isConnected"
                    class="read-mode-select"
                  >
                    <option v-for="(mode, index) in readModeOptions" :key="index" :value="index">
                      {{ mode }}
                    </option>
                  </select>
                  <span v-if="formReadMode !== readMode" class="current-value">
                    Current: {{ readModeOptions[readMode] }}
                  </span>
                </div>
              </div>

              <div class="overview-buttons">
                <button
                  class="action-button start"
                  :disabled="!!cameraData.isExposing || !isConnected"
                  @click="startExposure"
                >
                  <Icon type="exposure" class="action-icon" />
                  <span>Start Exposure</span>
                </button>
                <button
                  class="action-button abort"
                  :disabled="!cameraData.isExposing || !isConnected"
                  @click="abortExposure"
                >
                  <Icon type="close" class="action-icon" />
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
/* Camera Panel Styles */
h3 {
  font-size: 1rem;
  border-bottom: 1px solid var(--aw-panel-border-color);
  padding-bottom: 0.35rem;
  margin-bottom: 0.75rem;
}

h4 {
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

/* Overview Mode Layout */
.camera-overview {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 8px;
  overflow: hidden;
}

.overview-layout {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 16px;
  height: 100%;
  overflow: hidden;
}

.overview-preview {
  background-color: rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  height: 100%;
}

.overview-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  overflow: auto;
}

.preview-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.preview-container img {
  flex: 1;
  width: 100%;
  height: calc(100% - 36px); /* Adjust for stats bar */
  object-fit: contain;
  padding: 8px;
  background-color: rgba(0, 0, 0, 0.05);
}

.preview-stats {
  background-color: rgba(0, 0, 0, 0.3);
  padding: 8px;
  display: flex;
  justify-content: space-around;
  gap: 8px;
  font-size: 0.8rem;
}

.preview-stats .stat-item {
  display: flex;
  gap: 8px;
}

.preview-stats .stat-item span {
  opacity: 0.8;
}

.empty-preview {
  padding: 24px;
  text-align: center;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.exposing-status {
  display: flex;
  align-items: center;
  gap: 10px;
}

.exposing-icon {
  font-size: 1.5rem;
  animation: pulse 1.5s infinite;
}

.state-text {
  font-weight: bold;
}

.percent-text {
  font-size: 1.2rem;
  font-weight: bold;
  color: var(--aw-panel-action-color, #2196f3);
}

.status-disconnected,
.status-no-image {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  opacity: 0.7;
}

@keyframes pulse {
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.6;
  }
}

/* Control Styles */
.camera-settings,
.cooler-controls,
.histogram-controls {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 12px;
}

.controls-disabled {
  opacity: 0.6;
  pointer-events: none;
}

.controls-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-row label {
  width: 80px;
  font-size: 0.85rem;
}

.control-row input,
.control-row select {
  flex: 1;
  background-color: var(--aw-panel-input-bg-color);
  color: var(--aw-panel-input-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 0.9rem;
}

.current-value {
  font-size: 0.8rem;
  color: var(--aw-panel-secondary-color, #999);
  margin-left: auto;
  white-space: nowrap;
  min-width: 100px;
  text-align: right;
}

.input-with-unit {
  display: flex;
  align-items: center;
  flex: 1;
}

.input-with-unit input {
  flex: 1;
}

.input-with-unit .unit {
  margin-left: 8px;
  font-size: 0.8rem;
  opacity: 0.8;
}

.binning-control {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.binning-control input {
  width: 50px;
  text-align: center;
}

.overview-buttons {
  display: flex;
  gap: 8px;
}

.action-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-button.start {
  background-color: var(--aw-panel-action-color, #2196f3);
  color: white;
}

.action-button.abort {
  background-color: var(--aw-panel-danger-color, #f44336);
  color: white;
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-button:hover:not(:disabled) {
  transform: translateY(-2px);
}

.action-icon {
  font-size: 1rem;
}

/* Cooler Controls Styles */
.cooler-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.temperature-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.temp-label {
  font-size: 0.85rem;
}

.temp-value {
  font-size: 1rem;
  font-weight: bold;
}

.cooler-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
}

.target-temp {
  display: flex;
  align-items: center;
  gap: 8px;
}

.target-temp.disabled {
  opacity: 0.5;
}

.target-temp label {
  font-size: 0.85rem;
  flex: 1;
}

.temp-input {
  display: flex;
  align-items: center;
  flex: 1;
}

.temp-input input {
  flex: 1;
}

/* Toggle switch styling */
.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
}

.switch input {
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
  background-color: #ccc;
  transition: 0.4s;
}

.slider:before {
  position: absolute;
  content: '';
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: 0.4s;
}

input:checked + .slider {
  background-color: var(--aw-panel-action-color, #2196f3);
}

input:focus + .slider {
  box-shadow: 0 0 1px var(--aw-panel-action-color, #2196f3);
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.slider.round {
  border-radius: 20px;
}

.slider.round:before {
  border-radius: 50%;
}

/* Histogram Controls */
.overview-stretch-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.auto-stretch-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
}

.overview-stretch-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.slider-label,
.midtone-label {
  width: 50px;
  font-size: 0.8rem;
}

.stretch-slider,
.midtone-slider {
  flex: 1;
}

.slider-value,
.midtone-value {
  width: 40px;
  text-align: right;
  font-size: 0.8rem;
}

.overview-stretch-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.download-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background-color: var(--aw-panel-action-color, #2196f3);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.download-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.download-button:hover:not(:disabled) {
  transform: translateY(-2px);
}

.actions-icon {
  font-size: 0.9rem;
}

/* Detailed and Fullscreen Modes */
.fullscreen-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-template-rows: auto auto;
  gap: 1rem;
  flex: 1;
  overflow: hidden;
  height: 100%;
}

.image-panel,
.analysis-panel,
.settings-panel,
.actions-panel {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  padding: 0.75rem;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.image-panel {
  grid-column: 1;
  grid-row: 1 / span 2;
}

.analysis-panel {
  grid-column: 2;
  grid-row: 1;
}

.settings-panel {
  grid-column: 2;
  grid-row: 2;
}

.image-panel h3,
.analysis-panel h3,
.settings-panel h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
  color: var(--aw-panel-content-color);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 0.5rem;
}
</style>
