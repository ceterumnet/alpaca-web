<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, reactive } from 'vue'
import axios from 'axios'
import EnhancedPanelComponent from './EnhancedPanelComponent.vue'
import Icon from './Icon.vue'
import { UIMode } from '../stores/useUIPreferencesStore'

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
  deviceNum: { type: Number, required: true },
  apiBaseUrl: { type: String, default: '' }
})

// Define emits to update parent component
const emit = defineEmits(['close', 'configure', 'connect', 'modeChange'])

// Local reactive connection state
// Flag to track connection in progress
const isConnecting = ref(false)

// Camera state tracking
const cameraState = ref('Idle')

// Core reactive state
const exposureStartTime = ref(0)
const exposureTime = ref(0.1)
const gain = ref(0)
const offset = ref(0)
const readMode = ref(0)
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

const connectionStatus = ref('')

const exposureProgress = ref(0)

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
  name: 'Camera',
  binningX: 1,
  binningY: 1,
  isExposing: false,
  previewImage: null
  // Add other properties as needed
})

// Computed properties
const isConnected = computed(() => !!props.deviceId && connectionStatus.value === 'CONNECTED')
const name = computed(() => `Camera ${props.idx}`)
const percentComplete = computed(() => {
  // Ensure we have a valid number between 0-100
  const progress = Number(exposureProgress.value)
  if (isNaN(progress) || progress < 0) return 0
  if (progress > 100) return 100
  return progress
})

// Watch for prop changes to sync with local state
watch(
  () => props.connected,
  (newValue) => {
    connectionStatus.value = newValue ? 'CONNECTED' : 'DISCONNECTED'
    if (newValue) {
      fetchData()
    }
  },
  { immediate: true }
)

// Add transactionId variable
const transactionId = ref(1)

// Method to handle connect events from EnhancedPanelComponent
function onConnect() {
  console.log('Connect event from panel component')
  handleConnect()
}

// Fetch initial camera data
async function fetchData() {
  try {
    // First check connection status since camera can be disconnected externally
    const connectedResp = await axios.get(getApiEndpoint('connected'))
    const isCurrentlyConnected = Boolean(connectedResp.data.Value)

    // If connection status has changed, update our UI state
    if (isConnected.value !== isCurrentlyConnected) {
      console.log('Connection status changed externally:', isCurrentlyConnected)
      if (isCurrentlyConnected) {
        connectionStatus.value = 'CONNECTED'
      } else {
        connectionStatus.value = 'DISCONNECTED'
      }
      emit('connect', isCurrentlyConnected)

      // If we just detected a connection, fetch static properties
      if (isCurrentlyConnected) {
        await fetchCameraStaticProperties()
      }

      // If we just detected a disconnection, stop processing
      if (!isCurrentlyConnected) {
        return
      }
    }

    // Don't continue if not connected
    if (!isConnected.value) {
      return
    }

    // Fetch camera state
    const stateResp = await axios.get(getApiEndpoint('camerastate'))
    const stateNum = Number(stateResp.data.Value)

    switch (stateNum) {
      case 0:
        cameraState.value = 'Idle'
        break
      case 1:
        cameraState.value = 'Waiting'
        break
      case 2:
        cameraState.value = 'Exposing'
        break
      case 3:
        cameraState.value = 'Reading'
        break
      case 4:
        cameraState.value = 'Downloading'
        break
      default:
        cameraState.value = 'Unknown'
    }

    if (stateNum > 0 && stateNum < 5) {
      cameraData.isExposing = true

      // Fetch percent complete
      const percentResp = await axios.get(getApiEndpoint('percentcompleted'))
      exposureProgress.value = Number(percentResp.data.Value)
    } else {
      // If the camera state is idle, reset the exposing flag
      cameraData.isExposing = false
    }

    // Fetch current values (not static properties)
    const promises = [
      axios.get(getApiEndpoint('gain')).then((resp) => (gain.value = Number(resp.data.Value))),
      axios
        .get(getApiEndpoint('offset'))
        .then((resp) => (offset.value = Number(resp.data.Value)))
        .catch(() => {
          /* Already handled in fetchOffsetMin */
        }),

      // Fetch current readout mode
      axios
        .get(getApiEndpoint('readoutmode'))
        .then((resp) => (readMode.value = Number(resp.data.Value)))
        .catch(() => {
          /* Already handled in fetchReadoutModes */
        })
    ]

    await Promise.allSettled(promises)
  } catch (error) {
    console.error('Error fetching camera data:', error)
    // On any error, attempt to check if the camera is still connected
    try {
      const connectedResp = await axios.get(getApiEndpoint('connected'))
      const isCurrentlyConnected = Boolean(connectedResp.data.Value)
      if (!isCurrentlyConnected && isConnected.value) {
        console.log('Camera disconnected during data fetch')
        connectionStatus.value = 'DISCONNECTED'
        emit('connect', false)
      }
    } catch (connectionError) {
      console.error('Error checking connection status:', connectionError)
      // If we can't even check the connection, assume disconnected
      if (isConnected.value) {
        console.log('Unable to verify connection, assuming disconnected')
        connectionStatus.value = 'DISCONNECTED'
        emit('connect', false)
      }
    }
  }
}

// Handle connect button click
function handleConnect() {
  console.log('Connect button clicked')
  if (isConnected.value) {
    disconnectCamera()
  } else {
    connectCamera()
  }
}

// Function to connect to the camera
async function connectCamera() {
  if (isConnecting.value) return

  try {
    isConnecting.value = true
    console.log('Attempting to connect to camera:', props.deviceNum)

    // First check if the camera is already connected
    const stateResp = await axios.get(getApiEndpoint('connected'))
    console.log('Current connection state:', stateResp.data.Value)

    if (stateResp.data.Value === true) {
      console.log('Camera already connected')
      connectionStatus.value = 'CONNECTED'
      emit('connect', true)

      // Fetch static properties first, then regular data
      await fetchCameraStaticProperties()
      await fetchData()
      return
    }

    // Connect to the camera using form-encoded data
    const formData = new URLSearchParams()
    formData.append('Value', 'True')
    formData.append('Connected', 'True') // Required parameter
    formData.append('ClientID', '1')
    formData.append('ClientTransactionID', '1')

    await axios.put(getApiEndpoint('connected'), formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    // Verify connection
    const verifyResp = await axios.get(getApiEndpoint('connected'))

    if (verifyResp.data.Value === true) {
      // Update local state and emit to parent
      connectionStatus.value = 'CONNECTED'
      emit('connect', true)

      // Fetch static properties first, then regular data
      await fetchCameraStaticProperties()
      await fetchData()
    } else {
      throw new Error('Camera connection verification failed')
    }
  } catch (error) {
    console.error('Error connecting to camera:', error)
  } finally {
    isConnecting.value = false
  }
}

// Function to disconnect from the camera
async function disconnectCamera() {
  if (isConnecting.value) return

  try {
    isConnecting.value = true
    console.log('Attempting to disconnect from camera:', props.deviceNum)

    // Skip connection check since we're disconnecting anyway
    await axios.get(getApiEndpoint('connected'))

    // Disconnect using form-encoded data
    const formData = new URLSearchParams()
    formData.append('Value', 'False')
    formData.append('Connected', 'False') // Required parameter
    formData.append('ClientID', '1')
    formData.append('ClientTransactionID', '1')

    await axios.put(getApiEndpoint('connected'), formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    // Verify disconnection
    const verifyResp = await axios.get(getApiEndpoint('connected'))

    if (verifyResp.data.Value === false) {
      // Update local state and emit to parent
      connectionStatus.value = 'DISCONNECTED'
      emit('connect', false)
      // Clear image data
      previewImage.value = null
    } else {
      throw new Error('Camera disconnection verification failed')
    }
  } catch (error) {
    console.error('Error disconnecting from camera:', error)
  } finally {
    isConnecting.value = false
  }
}

// Helper function to get API endpoint URL
function getApiEndpoint(endpoint: string) {
  const baseUrl = props.apiBaseUrl || `/api/v1/camera/${props.deviceNum}`
  return `${baseUrl}/${endpoint}`
}

// Functions to fetch values that only need to be retrieved once
async function fetchCameraStaticProperties() {
  try {
    console.log('Fetching camera static properties')
    const promises = [
      fetchExposureMin(),
      fetchExposureMax(),
      fetchGainMin(),
      fetchGainMax(),
      fetchOffsetMin(),
      fetchOffsetMax(),
      fetchReadoutModes()
    ]
    await Promise.allSettled(promises)
  } catch (error) {
    console.error('Error fetching camera static properties:', error)
  }
}

async function fetchExposureMin() {
  try {
    const resp = await axios.get(getApiEndpoint('ExposureMin'))
    minExposure.value = Number(resp.data.Value)
    console.log('Fetched ExposureMin:', minExposure.value)
  } catch (error) {
    console.error('Error fetching ExposureMin:', error)
  }
}

async function fetchExposureMax() {
  try {
    const resp = await axios.get(getApiEndpoint('ExposureMax'))
    maxExposure.value = Number(resp.data.Value)
    console.log('Fetched ExposureMax:', maxExposure.value)
  } catch (error) {
    console.error('Error fetching ExposureMax:', error)
  }
}

async function fetchGainMin() {
  try {
    const resp = await axios.get(getApiEndpoint('gainmin'))
    minGain.value = Number(resp.data.Value)
    console.log('Fetched GainMin:', minGain.value)
  } catch (error) {
    console.error('Error fetching GainMin:', error)
  }
}

async function fetchGainMax() {
  try {
    const resp = await axios.get(getApiEndpoint('gainmax'))
    maxGain.value = Number(resp.data.Value)
    console.log('Fetched GainMax:', maxGain.value)
  } catch (error) {
    console.error('Error fetching GainMax:', error)
  }
}

async function fetchOffsetMin() {
  try {
    const resp = await axios.get(getApiEndpoint('offsetmin'))
    minOffset.value = Number(resp.data.Value)
    console.log('Fetched OffsetMin:', minOffset.value)
  } catch (error) {
    console.error('Error fetching OffsetMin:', error)
    canAdjustOffset.value = false
  }
}

async function fetchOffsetMax() {
  try {
    const resp = await axios.get(getApiEndpoint('offsetmax'))
    maxOffset.value = Number(resp.data.Value)
    console.log('Fetched OffsetMax:', maxOffset.value)
  } catch (error) {
    console.error('Error fetching OffsetMax:', error)
    // Error already handled in offsetmin
  }
}

async function fetchReadoutModes() {
  try {
    const resp = await axios.get(getApiEndpoint('readoutmodes'))
    if (resp.data.Value && Array.isArray(resp.data.Value)) {
      readModeOptions.value = resp.data.Value
    } else if (resp.data.Value && typeof resp.data.Value === 'string') {
      try {
        const parsed = JSON.parse(resp.data.Value)
        if (Array.isArray(parsed)) readModeOptions.value = parsed
      } catch {
        readModeOptions.value = resp.data.Value.split(',').map((m: string) => m.trim())
      }
    }
    console.log('Fetched ReadoutModes:', readModeOptions.value)
  } catch (error) {
    console.error('Error fetching ReadoutModes:', error)
    canAdjustReadMode.value = false
  }
}

// Function to start an exposure
async function startExposure() {
  if (cameraData.isExposing) return

  try {
    // Set the exposure state to active
    cameraData.isExposing = true
    cameraState.value = 'Exposing'
    exposureProgress.value = 0 // Ensure we start at 0

    // Set the exposure start time to the current time
    exposureStartTime.value = Date.now()
    console.log('Exposure started at:', new Date(exposureStartTime.value).toISOString())

    // Start an exposure via the API using form-encoded format
    const exposureForm = new URLSearchParams()
    exposureForm.append('Duration', exposureTime.value.toString())
    exposureForm.append('Light', 'True')
    exposureForm.append('ClientID', '1')
    exposureForm.append('ClientTransactionID', '1')

    await axios.put(getApiEndpoint('startexposure'), exposureForm, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    // Poll for exposure progress and completion
    const progressInterval = setInterval(async () => {
      try {
        // Check percent complete
        const percentResp = await axios.get(getApiEndpoint('percentcompleted'))
        exposureProgress.value = Number(percentResp.data.Value)
        console.log(
          'Exposure progress:',
          exposureProgress.value,
          '%, elapsed:',
          Math.round((Date.now() - exposureStartTime.value) / 1000),
          's'
        )

        // Check exposure state
        const stateResp = await axios.get(getApiEndpoint('camerastate'))
        const stateNum = Number(stateResp.data.Value)

        if (stateNum === 0) {
          // Idle, exposure completed
          clearInterval(progressInterval)
          cameraData.isExposing = false
          cameraState.value = 'Idle'

          // Check if an image is ready
          const imageReadyResp = await axios.get(getApiEndpoint('imageready'))
          if (imageReadyResp.data.Value) {
            // Image is ready, download it
            fetchImage()
          }
        } else if (stateNum === 2) {
          cameraState.value = 'Exposing'
        } else if (stateNum === 3) {
          cameraState.value = 'Reading'
        } else if (stateNum === 4) {
          cameraState.value = 'Downloading'
        }
      } catch (error) {
        console.error('Error in progress polling:', error)
        // Don't clear the interval to allow for recovery
      }
    }, 500)
  } catch (error) {
    console.error('Error starting exposure:', error)
    cameraData.isExposing = false
    cameraState.value = 'Error'
  }
}

// Function to abort an exposure
async function abortExposure() {
  if (!cameraData.isExposing) return

  try {
    const formData = new URLSearchParams()
    formData.append('ClientID', '1')
    formData.append('ClientTransactionID', '1')

    await axios.put(getApiEndpoint('abortexposure'), formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    cameraData.isExposing = false
    cameraState.value = 'Idle'
    exposureProgress.value = 0
  } catch (error) {
    console.error('Error aborting exposure:', error)
  }
}

// Function to fetch camera image
async function fetchImage() {
  console.log('Fetching image')
  try {
    // Fetch the image from the camera
    const response = await axios.get(getApiEndpoint('imagearray'), {
      responseType: 'arraybuffer',
      headers: {
        Accept: 'application/imagebytes'
      }
    })

    console.log('Received image data, size:', response.data.byteLength)

    // Process the image data
    const processedData = processImageBytes(response.data)
    if (processedData && processedData.width > 0 && processedData.height > 0) {
      displayImage(processedData)
    } else {
      console.error('Invalid image data received')
    }
  } catch (error) {
    console.error('Error fetching image:', error)
  }
}

// Function to process the binary image data according to ASCOM standard
function processImageBytes(data: ArrayBuffer) {
  // Parse the binary metadata according to Alpaca specification 7.6/7.7
  const dataView = new DataView(data)

  // Parse metadata fields
  const metadataVersion = dataView.getInt32(0, true) // Bytes 0-3, true for little-endian
  const errorNumber = dataView.getInt32(4, true) // Bytes 4-7
  // const clientTransactionID = dataView.getUint32(8, true) // Bytes 8-11
  // const serverTransactionID = dataView.getUint32(12, true) // Bytes 12-15
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

  // Map element types to bit depths
  // Element type values from ASCOM standard:
  // 0=Unknown, 1=Int8, 2=UInt8, 3=Int16, 4=UInt16, 5=Int32, 6=UInt32, 7=Int64, 8=UInt64, 9=Float32, 10=Float64

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
    case 2: // Int32
      transmissionBytesPerPixel = 4
      pixelData = new Int32Array(data, dataStart)
      break
    case 9: // UInt32
      transmissionBytesPerPixel = 4
      pixelData = new Uint32Array(data, dataStart)
      break
    case 5: // UInt64
      transmissionBytesPerPixel = 8
      console.warn('64-bit integer types not fully supported, will be truncated')
      // Create a view to read 64-bit values as 32-bit pairs
      pixelData = new Array(width * height)
      {
        const dataView = new DataView(data, dataStart)
        for (let i = 0; i < width * height; i++) {
          // Read only lower 32 bits for display (limitation of JavaScript)
          pixelData[i] = dataView.getUint32(i * 8, true)
        }
      }
      break
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

  console.log(
    `Image processed: ${width}x${height}, original: ${origBitsPerPixel}-bit, transmitted: ${transmissionBytesPerPixel * 8}-bit`
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
}

// Function to display the processed image
function displayImage(processedData: {
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
  bytesPerPixel?: number
  bitsPerPixel?: number
  transmissionElementType?: number
}) {
  const { width, height, pixelData, bitsPerPixel } = processedData

  // Create a canvas to render the image
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    console.error('Could not get canvas context')
    return
  }

  canvas.width = width
  canvas.height = height

  // Create image data to hold the pixel values
  const imageData = ctx.createImageData(width, height)
  const outputData = imageData.data

  // Simple normalization to find min/max values
  let min = Number.MAX_VALUE
  let max = Number.MIN_VALUE

  // For high bit-depth, sample the values to find reasonable min/max
  const isHighBitDepth = bitsPerPixel && bitsPerPixel > 8

  // IMPORTANT: ASCOM Alpaca sends image data in column-major order
  // We need to properly access the pixel data when finding min/max
  // First pass to determine range from column-major data
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Calculate source index for Alpaca data (column-major order)
      const sourceIdx = x * height + y

      if (sourceIdx < pixelData.length) {
        // Handle potentially large numbers safely
        const val = Number(pixelData[sourceIdx])
        if (!isNaN(val) && isFinite(val)) {
          min = val < min ? val : min
          max = val > max ? val : max
        }
      }
    }
  }

  console.log(`Display normalization: raw min=${min}, max=${max}`)

  // Check for potential issues with the range
  if (!isFinite(min) || !isFinite(max) || max <= min) {
    console.warn('Invalid pixel value range, using defaults')
    min = 0
    max = isHighBitDepth ? 65535 : 255
  }

  let autoMin = min
  let autoMax = max

  // For high bit-depth data, apply some stretch to improve visibility only if auto-stretch is enabled
  if (isHighBitDepth && autoStretch.value) {
    // Use histogram-like approach to find better black/white points
    const histogram = new Uint32Array(1024)
    const totalPixels = width * height
    const range = max - min

    // Build a simple histogram with proper column-major to row-major conversion
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Calculate source index for Alpaca data (column-major order)
        const sourceIdx = x * height + y

        if (sourceIdx < pixelData.length) {
          const val = Number(pixelData[sourceIdx])
          if (isFinite(val)) {
            const bin = Math.min(1023, Math.floor(((val - min) / range) * 1023))
            if (bin >= 0 && bin < 1024) {
              histogram[bin]++
            }
          }
        }
      }
    }

    // Find better black point (skip bottom 1%)
    let blackCount = 0
    let blackBin = 0
    const blackThreshold = totalPixels * 0.01
    while (blackBin < 1023 && blackCount < blackThreshold) {
      blackCount += histogram[blackBin]
      blackBin++
    }

    // Find better white point (skip top 0.5%)
    let whiteCount = 0
    let whiteBin = 1023
    const whiteThreshold = totalPixels * 0.005
    while (whiteBin > 0 && whiteCount < whiteThreshold) {
      whiteCount += histogram[whiteBin]
      whiteBin--
    }

    // Apply the new min/max if they make sense
    if (whiteBin > blackBin) {
      autoMin = min + (blackBin / 1023) * range
      autoMax = min + (whiteBin / 1023) * range
      console.log(`Adjusted range: min=${autoMin}, max=${autoMax} (original: ${min}-${max})`)
    }
  }

  // Calculate the actual min/max values based on user's stretch controls or auto values
  const userMin = min + (blackPoint.value / 100) * (max - min)
  const userMax = min + (whitePoint.value / 100) * (max - min)

  // Use auto-calculated values or user-defined stretch
  const displayMin = autoStretch.value ? autoMin : userMin
  const displayMax = autoStretch.value ? autoMax : userMax

  const range = displayMax - displayMin
  console.log(
    `Final display range: min=${displayMin}, max=${displayMax}, range=${range}, midtone=${midtoneValue.value}`
  )

  // Generate histogram data for display
  generateHistogram(pixelData, min, max, width, height)

  // Use the midtone value as the gamma correction factor
  const gamma = midtoneValue.value

  // Convert column-major order (Alpaca) to row-major order (canvas)
  // while also normalizing values for display
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Calculate source index for Alpaca data (column-major order)
      const sourceIdx = x * height + y

      // Target index for our canvas (row-major order)
      const targetIdx = y * width + x

      // Get the pixel value
      let normalizedValue = 0

      if (sourceIdx < pixelData.length) {
        const pixel = Number(pixelData[sourceIdx])

        // Normalize value to 0-1 range
        if (range <= 0) {
          normalizedValue = 0 // Avoid division by zero
        } else {
          // Clamp values to the min-max range
          const clampedValue = Math.max(displayMin, Math.min(displayMax, pixel))
          normalizedValue = (clampedValue - displayMin) / range

          // Apply gamma correction (midtone adjustment)
          normalizedValue = Math.pow(normalizedValue, gamma)
        }
      }

      // Convert to 8-bit value
      const pixelValue = Math.max(0, Math.min(255, Math.round(normalizedValue * 255)))

      // Set RGB (grayscale)
      const outIdx = targetIdx * 4
      outputData[outIdx] = pixelValue
      outputData[outIdx + 1] = pixelValue
      outputData[outIdx + 2] = pixelValue
      outputData[outIdx + 3] = 255 // Alpha
    }
  }

  // Put the image data on the canvas
  ctx.putImageData(imageData, 0, 0)

  // Convert canvas to data URL
  previewImage.value = canvas.toDataURL('image/jpeg', 0.9)
}

// Generate histogram data for display
function generateHistogram(
  pixelData:
    | Uint8Array
    | Uint16Array
    | Int16Array
    | Int32Array
    | Uint32Array
    | Float32Array
    | Float64Array
    | number[],
  min: number,
  max: number,
  width?: number,
  height?: number
) {
  // Use 32 bins for the histogram (matching the UI display)
  const numBins = 32
  const bins = new Array(numBins).fill(0)
  const range = max - min

  if (range <= 0) {
    // If there's no range, we can't generate a meaningful histogram
    histogramData.value = [...bins]
    histogramMin.value = min
    histogramMax.value = max
    histogramMean.value = min
    return
  }

  // If width and height are not provided or invalid, try to estimate or use direct sampling
  if (!width || !height || width * height !== pixelData.length) {
    // Try to estimate dimensions for square images
    const estDimension = Math.sqrt(pixelData.length)

    // If it's a perfect square, use those dimensions
    if (Number.isInteger(estDimension)) {
      width = estDimension
      height = estDimension
      console.log(`Estimated square dimensions: ${width}x${height}`)
    } else {
      console.log('Using direct array sampling for histogram (dimensions unknown or invalid)')
      // Count pixels in each bin
      let sum = 0
      let count = 0

      // Sample the pixels (for large images, sampling improves performance)
      const totalPixels = pixelData.length
      const sampleStep = totalPixels > 1000000 ? Math.floor(totalPixels / 100000) : 1

      for (let i = 0; i < totalPixels; i += sampleStep) {
        const val = Number(pixelData[i])
        if (!isNaN(val) && isFinite(val)) {
          // Clamp to min-max range
          const clampedVal = Math.max(min, Math.min(max, val))

          // Calculate bin index
          const binIndex = Math.min(numBins - 1, Math.floor(((clampedVal - min) / range) * numBins))

          bins[binIndex]++
          sum += val
          count++
        }
      }

      // Calculate the mean
      const mean = count > 0 ? sum / count : 0

      // Log the raw bin counts
      console.log('Raw histogram bins (direct):', bins.join(','))

      // Normalize the bins for display (tallest bar will be 100%)
      const maxBinValue = Math.max(...bins)
      console.log('Maximum bin value:', maxBinValue)

      if (maxBinValue > 0) {
        for (let i = 0; i < numBins; i++) {
          bins[i] = (bins[i] / maxBinValue) * 100
        }
      }

      // Update reactive data for display - ensure we don't interfere with progress calculations
      histogramData.value = [...bins] // Create a new array to ensure reactivity
      histogramMin.value = min
      histogramMax.value = max
      histogramMean.value = mean

      console.log(`Histogram generated: min=${min}, max=${max}, mean=${mean.toFixed(2)}`)
      return
    }
  }

  // If we have proper dimensions, use them to access column-major data correctly
  console.log(`Generating histogram using dimensions: ${width}x${height}`)

  // Count pixels in each bin using proper column-major access
  let sum = 0
  let count = 0

  // Sample step for performance
  const sampleXStep = width > 1000 ? Math.ceil(width / 250) : 1
  const sampleYStep = height > 1000 ? Math.ceil(height / 250) : 1

  // Access data using column-major indexing (x * height + y)
  for (let x = 0; x < width; x += sampleXStep) {
    for (let y = 0; y < height; y += sampleYStep) {
      const sourceIdx = x * height + y

      if (sourceIdx < pixelData.length) {
        const val = Number(pixelData[sourceIdx])
        if (!isNaN(val) && isFinite(val)) {
          // Clamp to min-max range
          const clampedVal = Math.max(min, Math.min(max, val))

          // Calculate bin index
          const binIndex = Math.min(numBins - 1, Math.floor(((clampedVal - min) / range) * numBins))

          bins[binIndex]++
          sum += val
          count++
        }
      }
    }
  }

  // Calculate the mean
  const mean = count > 0 ? sum / count : 0

  // Log the raw bin counts
  console.log('Raw histogram bins (column-major):', bins.join(','))

  // Normalize the bins for display (tallest bar will be 100%)
  const maxBinValue = Math.max(...bins)
  console.log('Maximum bin value:', maxBinValue)

  if (maxBinValue > 0) {
    for (let i = 0; i < numBins; i++) {
      bins[i] = (bins[i] / maxBinValue) * 100
    }
  }

  // Log the normalized bins
  console.log('Normalized histogram bins:', bins.join(','))

  // Update reactive data for display - ensure we don't interfere with progress calculations
  histogramData.value = [...bins] // Create a new array to ensure reactivity
  histogramMin.value = min
  histogramMax.value = max
  histogramMean.value = mean

  console.log(`Histogram generated: min=${min}, max=${max}, mean=${mean.toFixed(2)}`)
}

// Function to set exposure time
async function setExposureTime(time: number) {
  // Just update the local value - it will be used when startExposure is called
  exposureTime.value = time
  console.log('Local exposure time set to:', time)
}

// Function to set binning
async function setBinning(x: number, y: number) {
  if (cameraData.isExposing) return

  try {
    // Send binX value to camera (API uses "binx")
    const binXForm = new URLSearchParams()
    binXForm.append('BinX', x.toString())
    binXForm.append('ClientID', '1')
    binXForm.append('ClientTransactionID', '1')

    await axios.put(getApiEndpoint('binx'), binXForm, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    // Send binY value to camera (API uses "biny")
    const binYForm = new URLSearchParams()
    binYForm.append('BinY', y.toString())
    binYForm.append('ClientID', '1')
    binYForm.append('ClientTransactionID', '1')

    await axios.put(getApiEndpoint('biny'), binYForm, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
  } catch (error) {
    console.error('Error setting binning:', error)
  } finally {
    // Always read back the current binning values from the camera
    try {
      // API uses "binx" and "biny"
      const binXResp = await axios.get(getApiEndpoint('binx'))
      const binYResp = await axios.get(getApiEndpoint('biny'))

      // But our local state uses "binningX" and "binningY"
      if (binXResp.data && binXResp.data.Value !== undefined) {
        cameraData.binningX = Number(binXResp.data.Value)
        console.log('Current binX from camera:', cameraData.binningX)
      }

      if (binYResp.data && binYResp.data.Value !== undefined) {
        cameraData.binningY = Number(binYResp.data.Value)
        console.log('Current binY from camera:', cameraData.binningY)
      }
    } catch (fetchError) {
      console.error('Error fetching current binning values:', fetchError)
    }
  }
}

// Function to set gain
async function setGain(gainValue: number) {
  if (cameraData.isExposing) return

  try {
    // Send to API with form encoding
    const gainForm = new URLSearchParams()
    gainForm.append('Gain', gainValue.toString())
    gainForm.append('ClientID', '1')
    gainForm.append('ClientTransactionID', '1')

    await axios.put(getApiEndpoint('gain'), gainForm, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
  } catch (error) {
    console.error('Error setting gain:', error)
  } finally {
    // Always read back the current gain from the camera
    try {
      const response = await axios.get(getApiEndpoint('gain'))
      if (response.data && response.data.Value !== undefined) {
        const currentGain = Number(response.data.Value)
        gain.value = currentGain
        console.log('Current gain from camera:', currentGain)
      }
    } catch (fetchError) {
      console.error('Error fetching current gain:', fetchError)
    }
  }
}

// Function to set offset
async function setOffset(offsetValue: number) {
  if (cameraData.isExposing) return

  try {
    // Send to API with form encoding
    const offsetForm = new URLSearchParams()
    offsetForm.append('Offset', offsetValue.toString())
    offsetForm.append('ClientID', '1')
    offsetForm.append('ClientTransactionID', '1')

    await axios.put(getApiEndpoint('offset'), offsetForm, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
  } catch (error) {
    console.error('Error setting offset:', error)
  } finally {
    // Always read back the current offset from the camera
    try {
      const response = await axios.get(getApiEndpoint('offset'))
      if (response.data && response.data.Value !== undefined) {
        const currentOffset = Number(response.data.Value)
        offset.value = currentOffset
        console.log('Current offset from camera:', currentOffset)
      }
    } catch (fetchError) {
      console.error('Error fetching current offset:', fetchError)
    }
  }
}

// Function to set read mode
async function setReadMode(modeValue: number) {
  if (cameraData.isExposing) return

  try {
    // Send to API with form encoding
    const readModeForm = new URLSearchParams()
    readModeForm.append('ReadoutMode', modeValue.toString())
    readModeForm.append('ClientID', '1')
    readModeForm.append('ClientTransactionID', transactionId.value.toString())
    transactionId.value++

    await axios.put(getApiEndpoint('readoutmode'), readModeForm, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
  } catch (error) {
    console.error('Error setting readout mode:', error)
  } finally {
    // Always fetch the current readout mode from the camera
    try {
      const response = await axios.get(getApiEndpoint('readoutmode'))
      if (response.data && response.data.Value !== undefined) {
        console.log('Current readout mode from camera:', response.data.Value)
        readMode.value = Number(response.data.Value)
      }
    } catch (fetchError) {
      console.error('Error fetching current readout mode:', fetchError)
    }
  }
}

onMounted(() => {
  if (isConnected.value) {
    // For already connected cameras, fetch static properties first, then regular data
    fetchCameraStaticProperties().then(() => fetchData())
  }

  // Set up a polling interval for status updates
  const statusInterval = setInterval(async () => {
    // Always attempt to check connection status and fetch data if connected
    try {
      await fetchData() // Now includes connection checking
    } catch (error) {
      console.error('Error during polling interval:', error)
    }
  }, 2000)

  // Clean up on component unmount
  onUnmounted(() => {
    clearInterval(statusInterval)
  })
})

// Function to download the current preview image
function downloadPreview() {
  if (!previewImage.value) return

  try {
    // Create an anchor element
    const link = document.createElement('a')
    // Set the download attribute with a filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    link.download = `camera-image-${timestamp}.jpg`
    // Set the href to the preview image
    link.href = previewImage.value
    // Append to the document
    document.body.appendChild(link)
    // Trigger the download
    link.click()
    // Clean up
    document.body.removeChild(link)
  } catch (error) {
    console.error('Error downloading image:', error)
  }
}

// Add function to redisplay the image with new stretching settings
function reprocessImage() {
  // Only attempt to redisplay if there's an image already displayed
  if (!previewImage.value) return

  // Function to force redisplay
  console.log('Reprocessing image with new stretch settings')
  console.log(
    `Black: ${blackPoint.value}%, White: ${whitePoint.value}%, Midtone: ${midtoneValue.value}`
  )

  // Re-fetch the image to apply new stretch settings
  // In a real implementation, we'd store the original image data and reprocess without a new API call
  fetchImage()
}

// Functions to set stretch parameters
function setBlackPoint(value: number) {
  // Ensure values stay in range and don't cross
  blackPoint.value = Math.max(0, Math.min(whitePoint.value - 1, value))
  if (previewImage.value && !autoStretch.value) reprocessImage()
}

function setWhitePoint(value: number) {
  // Ensure values stay in range and don't cross
  whitePoint.value = Math.max(blackPoint.value + 1, Math.min(100, value))
  if (previewImage.value && !autoStretch.value) reprocessImage()
}

function setMidtone(value: number) {
  // Ensure value stays in range
  midtoneValue.value = Math.max(0.1, Math.min(2.0, value))
  if (previewImage.value) reprocessImage()
}
</script>

<template>
  <EnhancedPanelComponent
    :panel-name="name"
    :connected="isConnected"
    :device-type="'camera'"
    :device-id="deviceId"
    :supported-modes="[UIMode.OVERVIEW, UIMode.DETAILED]"
    @connect="onConnect"
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
        <!-- Preview image section -->
        <div class="image-preview">
          <div v-if="previewImage" class="preview-container">
            <img :src="previewImage" alt="Camera Preview" />
            <div v-if="histogramData.length > 0" class="preview-stats">
              <div class="stat-item"><span>Min:</span> {{ Math.round(histogramMin) }}</div>
              <div class="stat-item"><span>Max:</span> {{ Math.round(histogramMax) }}</div>
              <div class="stat-item"><span>Mean:</span> {{ Math.round(histogramMean) }}</div>
            </div>

            <!-- Overview Stretch Controls -->
            <div class="overview-stretch-controls">
              <div class="stretch-toggle-simple">
                <label>
                  <input v-model="autoStretch" type="checkbox" @input="reprocessImage" />
                  Auto
                </label>
              </div>
              <input
                v-model.number="midtoneValue"
                type="range"
                min="0.1"
                max="2.0"
                step="0.05"
                title="Midtone Adjustment"
                @change="setMidtone(midtoneValue)"
              />
              <span class="midtone-value">{{ midtoneValue.toFixed(1) }}</span>
              <button
                class="download-button"
                title="Save Image"
                :disabled="!previewImage"
                @click="downloadPreview"
              >
                <Icon v-if="previewImage" type="files" />
                <span class="sr-only">Save Image</span>
              </button>
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

        <!-- Quick controls section -->
        <div class="quick-controls" :class="{ 'controls-disabled': !isConnected }">
          <div class="controls-grid">
            <div class="control-row">
              <label>Exposure:</label>
              <div class="input-with-unit">
                <input
                  v-model="exposureTime"
                  type="number"
                  :min="minExposure"
                  :max="maxExposure"
                  :disabled="cameraData.isExposing || !isConnected"
                  step="0.1"
                  @change="setExposureTime(exposureTime)"
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
                  :disabled="cameraData.isExposing || !isConnected"
                  @change="setBinning(cameraData.binningX, cameraData.binningY)"
                />
                <span>×</span>
                <input
                  v-model.number="cameraData.binningY"
                  type="number"
                  min="1"
                  max="4"
                  :disabled="cameraData.isExposing || !isConnected"
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
                :disabled="cameraData.isExposing || !isConnected"
                @change="setGain(gain)"
              />
            </div>

            <div v-if="canAdjustOffset" class="control-row">
              <label>Offset:</label>
              <input
                v-model.number="offset"
                type="number"
                :min="minOffset"
                :max="maxOffset"
                :disabled="cameraData.isExposing || !isConnected"
                @change="setOffset(offset)"
              />
            </div>

            <div v-if="canAdjustReadMode && readModeOptions.length > 0" class="control-row">
              <label>Read Mode:</label>
              <select
                v-model.number="readMode"
                :disabled="cameraData.isExposing || !isConnected"
                @change="setReadMode(readMode)"
              >
                <option v-for="(mode, index) in readModeOptions" :key="index" :value="index">
                  {{ mode }}
                </option>
              </select>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="action-buttons">
            <button
              v-if="!cameraData.isExposing"
              class="action-button start-button"
              :disabled="!isConnected"
              @click="startExposure"
            >
              <Icon type="camera" />
              <span>Expose</span>
            </button>

            <button
              v-else
              class="action-button abort-button"
              :disabled="!isConnected"
              @click="abortExposure"
            >
              <Icon type="stop" />
              <span>Abort</span>
            </button>
          </div>
        </div>

        <!-- Progress bar for overview mode -->
        <div v-if="cameraData.isExposing" class="exposure-progress-overview">
          <div class="progress-label">
            <span>{{ cameraState }} </span>
            <span>{{ percentComplete }}%</span>
          </div>
          <div class="progress-bar-container-overview">
            <div
              class="progress-bar-fill-overview"
              :style="'width: ' + percentComplete + '%'"
            ></div>
          </div>
          <div class="progress-time">
            {{ Math.round((Date.now() - exposureStartTime) / 1000) }}s / {{ exposureTime }}s
          </div>
        </div>
      </div>
    </template>

    <!-- Detailed Content -->
    <template #detailed-content>
      <div class="camera-detailed">
        <div class="detailed-grid-optimized">
          <!-- Image Preview Section (Reduced height) -->
          <div class="detailed-preview-optimized">
            <div v-if="previewImage" class="preview-image-optimized">
              <img :src="previewImage" alt="Camera preview" />
            </div>
            <div v-else class="empty-preview-detailed-optimized">
              <div v-if="cameraData.isExposing" class="exposing-status">
                <Icon type="camera" class="exposing-icon" />
                <div>
                  <div class="state-text">{{ cameraState }}</div>
                  <div class="percent-text">{{ percentComplete }}%</div>
                </div>
              </div>
              <div v-else-if="!isConnected" class="status-disconnected">
                <Icon type="disconnected" />
                <span>Camera disconnected</span>
              </div>
              <div v-else class="status-no-image">
                <Icon type="camera" />
                <span>No image available</span>
              </div>
            </div>
          </div>

          <!-- Stats & Controls - Side by Side Layout -->
          <div class="detailed-content-grid">
            <!-- Histogram & Stats Section -->
            <div v-if="previewImage && histogramData.length > 0" class="detailed-stats-optimized">
              <h3>Image Statistics</h3>
              <div class="histogram-optimized">
                <div class="histogram-bars">
                  <div
                    v-for="(value, i) in histogramData"
                    :key="`hist-${i}`"
                    class="histogram-bar"
                    :style="{ height: `${value}%` }"
                  ></div>
                </div>
              </div>
              <div class="stats-grid-optimized">
                <div class="stat-item">
                  <span class="stat-label">Min:</span>
                  <span class="stat-value">{{ Math.round(histogramMin) }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Max:</span>
                  <span class="stat-value">{{ Math.round(histogramMax) }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Mean:</span>
                  <span class="stat-value">{{ Math.round(histogramMean) }}</span>
                </div>
              </div>

              <!-- Image Stretch Controls -->
              <div class="stretch-controls">
                <h4>Stretch Controls</h4>
                <div class="stretch-toggle">
                  <label>
                    <input v-model="autoStretch" type="checkbox" @input="reprocessImage" />
                    Auto Stretch
                  </label>
                </div>

                <div class="stretch-sliders" :class="{ disabled: autoStretch }">
                  <div class="slider-row">
                    <label>Black Point:</label>
                    <input
                      v-model.number="blackPoint"
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      :disabled="autoStretch"
                      @change="setBlackPoint(blackPoint)"
                    />
                    <span class="slider-value">{{ blackPoint }}%</span>
                  </div>

                  <div class="slider-row">
                    <label>White Point:</label>
                    <input
                      v-model.number="whitePoint"
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      :disabled="autoStretch"
                      @change="setWhitePoint(whitePoint)"
                    />
                    <span class="slider-value">{{ whitePoint }}%</span>
                  </div>

                  <div class="slider-row">
                    <label>Midtone:</label>
                    <input
                      v-model.number="midtoneValue"
                      type="range"
                      min="0.1"
                      max="2.0"
                      step="0.05"
                      @change="setMidtone(midtoneValue)"
                    />
                    <span class="slider-value">{{ midtoneValue.toFixed(2) }}</span>
                  </div>
                </div>

                <!-- Add download button in detailed view -->
                <div class="stretch-actions">
                  <button class="download-button" title="Save Image" @click="downloadPreview">
                    <Icon type="files" />
                    <span>Save Image</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Controls Section - Compact Layout -->
            <div class="detailed-controls-optimized">
              <h3>Camera Settings</h3>
              <div class="controls-container-optimized">
                <div class="control-section">
                  <div class="control-compact-grid">
                    <!-- Exposure row -->
                    <div class="control-row-optimized">
                      <label for="exposureTime">Exposure:</label>
                      <div class="input-with-unit">
                        <input
                          id="exposureTime"
                          v-model="exposureTime"
                          type="number"
                          :disabled="!isConnected || cameraData.isExposing"
                          :min="minExposure"
                          :max="maxExposure"
                          step="0.1"
                          @change="setExposureTime(exposureTime)"
                        />
                        <span class="unit">s</span>
                      </div>
                    </div>

                    <!-- Binning row -->
                    <div class="control-row-optimized">
                      <label for="binning">Binning:</label>
                      <div class="binning-control">
                        <input
                          id="binningX"
                          v-model.number="cameraData.binningX"
                          type="number"
                          min="1"
                          max="4"
                          :disabled="!isConnected || cameraData.isExposing"
                          @change="setBinning(cameraData.binningX, cameraData.binningY)"
                        />
                        <span>×</span>
                        <input
                          id="binningY"
                          v-model.number="cameraData.binningY"
                          type="number"
                          min="1"
                          max="4"
                          :disabled="!isConnected || cameraData.isExposing"
                          @change="setBinning(cameraData.binningX, cameraData.binningY)"
                        />
                      </div>
                    </div>

                    <!-- Gain row -->
                    <div class="control-row-optimized">
                      <label for="gainInput">Gain:</label>
                      <input
                        id="gainInput"
                        v-model.number="gain"
                        type="number"
                        :min="minGain"
                        :max="maxGain"
                        :disabled="!isConnected || cameraData.isExposing"
                        @change="setGain(gain)"
                      />
                    </div>

                    <!-- Offset row (if available) -->
                    <div v-if="canAdjustOffset" class="control-row-optimized">
                      <label for="offsetInput">Offset:</label>
                      <input
                        id="offsetInput"
                        v-model.number="offset"
                        type="number"
                        :min="minOffset"
                        :max="maxOffset"
                        :disabled="!isConnected || cameraData.isExposing"
                        @change="setOffset(offset)"
                      />
                    </div>

                    <!-- Read Mode row (if available) -->
                    <div
                      v-if="canAdjustReadMode && readModeOptions.length > 0"
                      class="control-row-optimized"
                    >
                      <label for="readModeSelect">Read Mode:</label>
                      <select
                        id="readModeSelect"
                        v-model.number="readMode"
                        :disabled="!isConnected || cameraData.isExposing"
                        @change="setReadMode(readMode)"
                      >
                        <option
                          v-for="(mode, index) in readModeOptions"
                          :key="index"
                          :value="index"
                        >
                          {{ mode }}
                        </option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </EnhancedPanelComponent>
</template>

<style scoped>
/* Base Styles */
.label {
  font-weight: bold;
  color: var(--aw-panel-menu-bar-color);
  opacity: 0.8;
}

.value {
  font-family: monospace;
  font-weight: 600;
}

h3,
h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: var(--aw-panel-content-color);
}

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
  gap: 12px;
  height: 100%;
  padding-top: 2px; /* Add top padding to prevent overlap with the panel title */
}

.image-preview {
  flex: 1;
  min-height: 180px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

.preview-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.preview-container img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.preview-stats {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: space-around;
  padding: 6px;
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
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--aw-panel-menu-bar-color);
  opacity: 0.8;
  font-size: 0.9rem;
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
.quick-controls {
  padding: 12px;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.controls-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

.controls-disabled {
  opacity: 0.6;
  pointer-events: none;
}

.control-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.control-row label {
  font-size: 0.85rem;
  opacity: 0.9;
}

.input-with-unit {
  display: flex;
  align-items: center;
}

.control-row input[type='number'],
.control-row select {
  width: 100%;
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid var(--aw-panel-border-color);
  background-color: rgba(0, 0, 0, 0.1);
  color: var(--aw-panel-content-color);
}

.unit {
  margin-left: 6px;
  font-size: 0.85em;
  opacity: 0.8;
}

.binning-control {
  display: flex;
  align-items: center;
  gap: 4px;
}

.binning-control input {
  width: 45% !important;
}

.binning-control span {
  opacity: 0.8;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 6px;
}

.action-button {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  min-width: 110px;
}

.action-button:hover {
  background-color: rgba(255, 255, 255, 0.15);
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: rgba(0, 0, 0, 0.2);
}

.start-button {
  background-color: rgba(25, 118, 210, 0.7);
}

.start-button:hover:not(:disabled) {
  background-color: rgba(25, 118, 210, 0.9);
}

.abort-button {
  background-color: rgba(211, 47, 47, 0.7);
}

.abort-button:hover:not(:disabled) {
  background-color: rgba(211, 47, 47, 0.9);
}

/* Exposure progress styles for overview mode */
.exposure-progress-overview {
  margin-top: 8px;
  padding: 12px;
  background-color: rgba(0, 0, 0, 0.15);
  border-radius: 6px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.85rem;
}

.progress-bar-container-overview {
  height: 8px;
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  overflow: hidden;
  width: 100%;
  position: relative;
  margin-bottom: 8px;
}

.progress-bar-fill-overview {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background-color: var(--aw-panel-action-color, #2196f3);
  border-radius: 4px;
  transition: width 0.3s ease;
  min-width: 3px;
}

.progress-time {
  text-align: right;
  font-size: 0.8rem;
  opacity: 0.8;
}

/* Detailed Mode Styles */
.camera-detailed {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  padding: 0.5rem;
}

.detailed-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-template-rows: auto 1fr;
  gap: 1rem;
  flex: 1;
}

.detailed-preview {
  grid-column: 1;
  grid-row: 1 / span 2;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  overflow: hidden;
  min-height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detailed-stats {
  grid-column: 2;
  grid-row: 1;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
}

.detailed-controls {
  grid-column: 2;
  grid-row: 2;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
}

.histogram {
  height: 100px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  padding: 5px;
  margin-bottom: 10px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}

.histogram-bars {
  display: flex;
  align-items: flex-end;
  width: 100%;
  height: 100%;
  gap: 2px;
}

.histogram-bar {
  background-color: var(--aw-panel-action-color, rgba(33, 150, 243, 0.7));
  flex: 1;
  border-radius: 2px 2px 0 0;
  min-height: 1px;
}

.preview-image {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.empty-preview-detailed {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--aw-panel-content-color);
  opacity: 0.7;
  font-size: 1rem;
}

.controls-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
}

.control-section {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  padding: 0.75rem;
}

.control-section h4 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
  color: var(--aw-panel-content-color);
  opacity: 0.9;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 0.35rem;
}

.binning-control-detailed {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.binning-control-detailed input {
  flex: 1;
  max-width: 60px;
}

.binning-button {
  background-color: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: var(--aw-panel-content-color);
  padding: 4px 8px;
  font-size: 0.8rem;
  cursor: pointer;
}

.binning-button:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.1);
}

.binning-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.detailed-action-buttons {
  display: flex;
  gap: 1rem;
  margin-top: auto;
}

.detailed-action-buttons button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.6rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.detailed-start-button {
  background-color: rgba(25, 118, 210, 0.7);
  color: white;
}

.detailed-start-button:hover:not(:disabled) {
  background-color: rgba(25, 118, 210, 0.9);
}

.detailed-abort-button {
  background-color: rgba(211, 47, 47, 0.7);
  color: white;
}

.detailed-abort-button:hover:not(:disabled) {
  background-color: rgba(211, 47, 47, 0.9);
}

.detailed-action-buttons button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.exposure-progress {
  margin-top: auto;
  padding: 0.75rem;
  background-color: rgba(0, 0, 0, 0.15);
  border-radius: 6px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.stats-grid .stat-item {
  background-color: rgba(0, 0, 0, 0.2);
  padding: 6px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 0.75rem;
  opacity: 0.7;
}

.stat-value {
  font-weight: 600;
  font-size: 0.9rem;
}

/* Status Bar Styles */
.status-bar-content {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.status-item {
  font-size: 0.9em;
}

.camera-state {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.85em;
  font-weight: 500;
  display: flex;
  align-items: center;
}

.camera-state::before {
  content: '';
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 5px;
}

.state-idle::before {
  background-color: #4caf50; /* Green */
}

.state-waiting::before,
.state-exposing::before {
  background-color: #2196f3; /* Blue */
}

.state-reading::before,
.state-downloading::before {
  background-color: #9c27b0; /* Purple */
}

.state-error::before {
  background-color: #f44336; /* Red */
}

.state-unknown::before {
  background-color: #9e9e9e; /* Gray */
}

.progress-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-track {
  width: 100px;
  height: 6px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #2196f3;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.8em;
  min-width: 36px;
}

/* Night vision mode adjustments */
:root .dark-theme .preview-container.detailed,
:root .dark-theme .control-panel,
:root .dark-theme .exposure-progress {
  background-color: rgba(70, 0, 0, 0.1);
}

:root .dark-theme .preview-image,
:root .dark-theme .histogram {
  background-color: rgba(70, 0, 0, 0.2);
}

:root .dark-theme .control-group input[type='number'],
:root .dark-theme .control-group select {
  background-color: rgba(70, 0, 0, 0.15);
  border-color: rgba(100, 0, 0, 0.3);
}

:root .dark-theme .histogram-bar {
  background-color: rgba(255, 107, 107, 0.6);
}

:root .dark-theme .progress-bar-fill {
  background-color: rgba(255, 107, 107, 0.6);
}

/* Fullscreen mode styles */
.camera-fullscreen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: auto;
  color: var(--aw-panel-content-color);
  padding: 0.5rem;
}

.fullscreen-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.fullscreen-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--aw-panel-content-color);
}

.camera-meta {
  display: flex;
  gap: 0.5rem;
}

.status-pill {
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
  font-size: 0.8rem;
  font-weight: 600;
}

.status-connected {
  background-color: rgba(0, 128, 0, 0.6);
  color: white;
}

.status-disconnected {
  background-color: rgba(128, 0, 0, 0.6);
  color: white;
}

.status-exposing {
  background-color: rgba(0, 0, 128, 0.6);
  animation: pulse 1.5s infinite;
  color: white;
}

@keyframes pulse {
  0% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.7;
  }
}

.fullscreen-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-template-rows: auto auto;
  gap: 1rem;
  flex: 1;
  overflow: hidden;
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

.actions-panel {
  grid-column: 1 / span 2;
  grid-row: 3;
}

.image-panel h3,
.analysis-panel h3,
.settings-panel h3,
.actions-panel h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
  color: var(--aw-panel-content-color);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 0.5rem;
}

.preview-image-fullscreen {
  width: 100%;
  height: calc(100% - 2rem);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.3);
}

.preview-image-fullscreen img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.empty-preview-fullscreen {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: calc(100% - 2rem);
  background-color: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}

.image-container,
.analysis-container,
.settings-container,
.actions-container {
  flex: 1;
  overflow: auto;
}

.histogram-fullscreen {
  height: 150px;
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  padding: 0.5rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
}

.histogram-bars {
  display: flex;
  align-items: flex-end;
  width: 100%;
  height: 100%;
  gap: 2px;
}

.histogram-bar {
  background: linear-gradient(
    to top,
    var(--aw-panel-scrollbar-color-1, rgba(100, 100, 255, 0.8)),
    var(--aw-panel-scrollbar-color-2, rgba(160, 160, 255, 0.8))
  );
  flex: 1;
  border-radius: 2px 2px 0 0;
  min-height: 1px; /* Ensure even tiny values are visible */
}

.histogram-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.stat-item {
  background-color: rgba(0, 0, 0, 0.2);
  padding: 0.5rem;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
}

.stat-label {
  color: rgba(255, 255, 255, 0.7);
}

.stat-value {
  font-weight: 600;
}

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.setting-group {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  padding: 0.5rem;
}

.setting-group h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: var(--aw-panel-content-color);
  opacity: 0.8;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.setting-row:last-child {
  margin-bottom: 0;
}

.input-with-unit {
  display: flex;
  align-items: center;
}

.unit {
  margin-left: 0.25rem;
  color: rgba(255, 255, 255, 0.7);
}

.binning-controls-fs {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.binning-controls-fs input {
  width: 50px;
}

.action-buttons-fs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.fs-button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: none;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.start-button {
  background-color: rgba(0, 128, 0, 0.7);
  color: white;
}

.start-button:hover:not(:disabled) {
  background-color: rgba(0, 128, 0, 0.9);
}

.abort-button {
  background-color: rgba(128, 0, 0, 0.7);
  color: white;
}

.abort-button:hover:not(:disabled) {
  background-color: rgba(128, 0, 0, 0.9);
}

.fs-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.image-history {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 0.5rem;
  height: 100px;
}

.image-history h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: var(--aw-panel-content-color);
  opacity: 0.8;
}

.history-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(100% - 1.5rem);
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}

.exposure-progress-fs {
  margin-top: 1rem;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  padding: 0.75rem;
}

.progress-label-fs {
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
}

.progress-bar-container-fs {
  width: 100%;
  height: 0.5rem;
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 0.25rem;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-bar-fill-fs {
  height: 100%;
  background: linear-gradient(
    to right,
    var(--aw-panel-scrollbar-color-1, rgba(255, 107, 107, 0.7)),
    var(--aw-panel-scrollbar-color-2, rgba(255, 155, 155, 0.9))
  );
  border-radius: 0.25rem;
  transition: width 0.3s ease;
  min-width: 3px;
}

.progress-time {
  text-align: right;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
}

/* Ensure controls are styled consistently across all modes */
.camera-fullscreen input[type='number'],
.camera-fullscreen select {
  background-color: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: var(--aw-panel-content-color);
  padding: 0.25rem 0.5rem;
  width: 120px;
}

.camera-fullscreen input[type='number']:focus,
.camera-fullscreen select:focus {
  outline: none;
  border-color: var(--aw-panel-scrollbar-color-1);
}

.camera-fullscreen input[type='number']:disabled,
.camera-fullscreen select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Night mode optimizations */
.panel-fullscreen:has(.camera-fullscreen) {
  background-color: rgba(20, 0, 0, 0.9);
}

@media (prefers-color-scheme: dark) {
  .camera-fullscreen .preview-image-fullscreen,
  .camera-fullscreen .empty-preview-fullscreen {
    filter: brightness(0.85) contrast(1.1);
  }
}

.debug-info {
  margin-top: 1rem;
  font-size: 0.8rem;
  background-color: rgba(0, 0, 0, 0.2);
  padding: 0.5rem;
  border-radius: 4px;
}

.debug-label {
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.debug-values {
  font-family: monospace;
  word-break: break-all;
}

/* Progress bar styles for overview mode */
.exposure-progress-overview {
  margin-top: 8px;
  padding: 8px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 0.85rem;
}

.progress-bar-container-overview {
  height: 8px; /* Make it taller */
  background-color: rgba(0, 0, 0, 0.3); /* Darker background for contrast */
  border-radius: 3px;
  overflow: hidden;
  width: 100%; /* Ensure the container spans full width */
  position: relative; /* Needed for absolute positioning of child */
}

.progress-bar-fill-overview {
  position: absolute; /* Absolute positioning to force width to work */
  top: 0;
  left: 0;
  height: 100%;
  background-color: #ff6b6b; /* Brighter color for visibility */
  border-radius: 3px;
  transition: width 0.3s ease;
  min-width: 3px; /* Ensure it's always visible when progress starts */
}

/* Ensure the detailed view progress bar works correctly too */
.progress-bar-container {
  height: 8px;
  background-color: rgba(0, 0, 0, 0.3); /* Darker for contrast */
  border-radius: 4px;
  overflow: hidden;
  width: 100%;
  position: relative; /* Needed for absolute positioning of child */
}

.progress-bar-fill {
  position: absolute; /* Absolute positioning to force width to work */
  top: 0;
  left: 0;
  height: 100%;
  background-color: #ff6b6b; /* Brighter color */
  border-radius: 4px;
  transition: width 0.3s ease;
  min-width: 3px;
}

.exposure-progress-fs {
  margin-top: 1rem;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  padding: 0.75rem;
}

.progress-bar-container-fs {
  width: 100%;
  height: 0.5rem;
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 0.25rem;
  overflow: hidden;
  margin-bottom: 0.5rem;
  position: relative; /* Needed for absolute positioning of child */
}

.progress-bar-fill-fs {
  position: absolute; /* Absolute positioning to force width to work */
  top: 0;
  left: 0;
  height: 100%;
  background-color: #ff6b6b; /* Solid color instead of gradient for better visibility */
  border-radius: 0.25rem;
  transition: width 0.3s ease;
  min-width: 3px;
}

/* ... rest of existing styles ... */

/* Night vision mode optimizations */
.dark-theme .camera-overview,
.dark-theme .camera-detailed,
.dark-theme .camera-fullscreen {
  color: rgba(255, 200, 200, 0.9);
}

.dark-theme .action-button,
.dark-theme .fs-button,
.dark-theme .detailed-action-buttons button {
  color: rgba(255, 200, 200, 0.9);
}

.dark-theme .image-preview,
.dark-theme .detailed-preview,
.dark-theme .fs-panel {
  background-color: rgba(50, 0, 0, 0.3);
}

.dark-theme .quick-controls,
.dark-theme .detailed-controls,
.dark-theme .detailed-stats,
.dark-theme .control-section,
.dark-theme .setting-group {
  background-color: rgba(50, 0, 0, 0.2);
}

.dark-theme .histogram,
.dark-theme .histogram-fullscreen {
  background-color: rgba(50, 0, 0, 0.4);
}

.dark-theme .preview-container img,
.dark-theme .preview-image img,
.dark-theme .preview-image-fullscreen img {
  filter: brightness(0.85) contrast(1.1);
}

.dark-theme .progress-bar-fill-overview,
.dark-theme .progress-bar-fill,
.dark-theme .progress-bar-fill-fs {
  background-color: rgba(255, 80, 80, 0.7);
}

.dark-theme .histogram-bar {
  background-color: rgba(255, 80, 80, 0.7);
}

.dark-theme .primary-action {
  background-color: rgba(50, 150, 50, 0.6);
}

.dark-theme .warning-action {
  background-color: rgba(180, 50, 50, 0.6);
}

.dark-theme .connect-action {
  background-color: rgba(50, 100, 180, 0.6);
}

.dark-theme .status-connected {
  background-color: rgba(50, 150, 50, 0.7);
}

.dark-theme .status-disconnected {
  background-color: rgba(180, 50, 50, 0.7);
}

.dark-theme .status-exposing {
  background-color: rgba(50, 100, 180, 0.7);
}

/* Optimized detailed layout */
.detailed-grid-optimized {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  height: 100%;
  overflow: hidden;
}

.detailed-preview-optimized {
  height: 40%; /* Reduced from original size */
  min-height: 180px;
  border-radius: 4px;
  overflow: hidden;
  background-color: rgba(0, 0, 0, 0.3);
  position: relative;
}

.preview-image-optimized {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-image-optimized img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.empty-preview-detailed-optimized {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgba(255, 255, 255, 0.6);
}

.detailed-content-grid {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(200px, 1.5fr);
  gap: 0.75rem;
  height: 50%;
  min-height: 160px;
}

.detailed-stats-optimized,
.detailed-controls-optimized {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  padding: 0.5rem;
  height: 100%;
  overflow: auto;
}

.histogram-optimized {
  height: 80px;
  margin: 0.5rem 0;
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  padding: 0.25rem;
}

.stats-grid-optimized {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.controls-container-optimized {
  height: calc(100% - 2rem);
  overflow-y: auto;
}

.control-compact-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.control-row-optimized {
  display: flex;
  flex-direction: column;
  margin-bottom: 0.5rem;
}

.control-row-optimized label {
  margin-bottom: 0.25rem;
  font-size: 0.85rem;
}

.detailed-action-buttons-optimized {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.detailed-action-buttons-optimized button {
  flex: 1;
  padding: 0.5rem;
  font-size: 0.85rem;
}

/* Media query for smaller screens */
@media (max-width: 600px) {
  .detailed-content-grid {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
  }

  .control-compact-grid {
    grid-template-columns: 1fr;
  }
}

.status-indicators {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.status-indicator {
  font-size: 0.85rem;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 12px;
}

.status-indicator.connected {
  background-color: rgba(0, 128, 0, 0.2);
  color: #4caf50;
}

.status-indicator.disconnected {
  background-color: rgba(245, 101, 101, 0.2);
  color: #f56565;
}

.status-indicator.exposing {
  background-color: rgba(255, 179, 0, 0.2);
  color: #ffb300;
}

.status-indicator.progress {
  background-color: rgba(33, 150, 243, 0.2);
  color: #2196f3;
}

.status-indicator.settings {
  background-color: rgba(156, 39, 176, 0.2);
  color: #9c27b0;
}

/* CSS for stretch controls */
.overview-stretch-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 4px 8px;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.stretch-toggle-simple {
  font-size: 0.8rem;
  white-space: nowrap;
  min-width: 50px;
}

.midtone-value {
  min-width: 24px;
  text-align: right;
  font-size: 0.8rem;
}

.stretch-controls {
  margin-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  padding-top: 12px;
}

.stretch-controls h4 {
  margin: 0 0 8px 0;
  font-size: 1rem;
  font-weight: 500;
}

.stretch-toggle {
  margin-bottom: 8px;
}

.stretch-sliders {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stretch-sliders.disabled {
  opacity: 0.5;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.slider-row label {
  min-width: 90px;
  font-size: 0.9rem;
}

.slider-row input[type='range'] {
  flex: 1;
}

.slider-value {
  min-width: 45px;
  text-align: right;
  font-size: 0.9rem;
}

/* Add CSS for the download button */
.download-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 0.8rem;
  gap: 4px;
}

.download-button:hover {
  background-color: #0d8aee;
}

.download-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.stretch-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>
