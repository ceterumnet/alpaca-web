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
    default: () => [UIMode.OVERVIEW, UIMode.DETAILED, UIMode.FULLSCREEN]
  },
  idx: { type: [String, Number], required: false },
  deviceNum: { type: Number, required: false },
  apiBaseUrl: { type: String, default: '' }
})

// Define emits to update parent component
const emit = defineEmits(['close', 'configure', 'connect', 'modeChange'])

// Local reactive connection state
const currentMode = ref(UIMode.OVERVIEW)

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
const statusMessage = ref('')
const connectionStatus = ref('')
const lastImageUrl = ref<string | null>(null)
const exposureProgress = ref(0)
const isExposing = ref(false)

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
const percentComplete = computed(() => exposureProgress.value)

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

// Handle mode changes
function setMode(newMode: UIMode) {
  currentMode.value = newMode
  emit('modeChange', newMode)
}

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
    formData.append('Value', 'true')
    formData.append('Connected', 'true') // Required parameter
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

    // First check if the camera is connected
    const stateResp = await axios.get(getApiEndpoint('connected'))

    // Disconnect using form-encoded data
    const formData = new URLSearchParams()
    formData.append('Value', 'false')
    formData.append('Connected', 'false') // Required parameter
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
    exposureProgress.value = 0

    // Start an exposure via the API using form-encoded format
    const exposureForm = new URLSearchParams()
    exposureForm.append('Duration', exposureTime.value.toString())
    exposureForm.append('Light', 'true')
    exposureForm.append('ClientID', '1')
    exposureForm.append('ClientTransactionID', '1')

    await axios.put(getApiEndpoint('startexposure'), exposureForm, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    // Poll for exposure progress and completion
    const progressInterval = setInterval(async () => {
      // Check percent complete
      const percentResp = await axios.get(getApiEndpoint('percentcompleted'))
      exposureProgress.value = Number(percentResp.data.Value)

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
    | any[]
  imageType: string
  bytesPerPixel?: number
  bitsPerPixel?: number
  transmissionElementType?: number
}) {
  const { width, height, pixelData, imageType, transmissionElementType, bitsPerPixel } =
    processedData

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

  // For high bit-depth data, apply some stretch to improve visibility
  if (isHighBitDepth) {
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
      const newMin = min + (blackBin / 1023) * range
      const newMax = min + (whiteBin / 1023) * range
      console.log(`Adjusted range: min=${newMin}, max=${newMax} (original: ${min}-${max})`)
      min = newMin
      max = newMax
    }
  }

  const range = max - min
  console.log(`Final display range: min=${min}, max=${max}, range=${range}`)

  // Apply mild gamma correction for better visibility
  const gamma = 0.8 // Values < 1 enhance darker areas

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
          const clampedValue = Math.max(min, Math.min(max, pixel))
          normalizedValue = (clampedValue - min) / range

          // Apply gamma correction
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
</script>

<template>
  <EnhancedPanelComponent
    :panel-name="name"
    :connected="isConnected"
    :device-type="'camera'"
    :device-id="deviceId"
    :supported-modes="[UIMode.OVERVIEW, UIMode.DETAILED, UIMode.FULLSCREEN]"
    @connect="onConnect"
  >
    <!-- Overview Content (Simple Mode) -->
    <template #overview-content>
      <div class="camera-overview">
        <!-- Preview image section -->
        <div class="image-preview">
          <div v-if="previewImage" class="preview-container">
            <img :src="previewImage" alt="Camera Preview" />
          </div>
          <div v-else class="empty-preview">
            <span v-if="cameraData.isExposing">{{ cameraState }}... {{ percentComplete }}%</span>
            <span v-else-if="!isConnected">Camera disconnected</span>
            <span v-else>No image available</span>
          </div>
        </div>

        <!-- Quick controls -->
        <div class="quick-controls" :class="{ 'controls-disabled': !isConnected }">
          <div class="control-row">
            <label>Exposure:</label>
            <input
              type="number"
              v-model="exposureTime"
              :min="minExposure"
              :max="maxExposure"
              :disabled="cameraData.isExposing || !isConnected"
              step="0.1"
              @change="setExposureTime(exposureTime)"
            />
            <span class="unit">s</span>
          </div>

          <div class="control-row">
            <label>Binning:</label>
            <div class="binning-control">
              <input
                type="number"
                v-model.number="cameraData.binningX"
                min="1"
                max="4"
                :disabled="cameraData.isExposing || !isConnected"
                @change="setBinning(cameraData.binningX, cameraData.binningY)"
              />
              <span>×</span>
              <input
                type="number"
                v-model.number="cameraData.binningY"
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
              type="number"
              v-model.number="gain"
              :min="minGain"
              :max="maxGain"
              :disabled="cameraData.isExposing || !isConnected"
              @change="setGain(gain)"
            />
          </div>

          <div class="control-row" v-if="canAdjustOffset">
            <label>Offset:</label>
            <input
              type="number"
              v-model.number="offset"
              :min="minOffset"
              :max="maxOffset"
              :disabled="cameraData.isExposing || !isConnected"
              @change="setOffset(offset)"
            />
          </div>

          <div class="control-row" v-if="canAdjustReadMode && readModeOptions.length > 0">
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

          <div class="action-buttons">
            <button
              v-if="!cameraData.isExposing"
              class="action-button start-button"
              @click="startExposure"
              :disabled="!isConnected"
            >
              <Icon type="camera" />
              <span>Expose</span>
            </button>

            <button
              v-else
              class="action-button abort-button"
              @click="abortExposure"
              :disabled="!isConnected"
            >
              <Icon type="stop" />
              <span>Abort</span>
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Detailed Content -->
    <template #detailed-content>
      <div class="camera-detailed">
        <div class="detailed-top">
          <div class="preview-container">
            <div v-if="previewImage" class="preview-image">
              <img :src="previewImage" alt="Camera preview" />
            </div>
            <div v-else class="empty-preview">No preview available</div>
          </div>

          <div class="detailed-controls">
            <div class="control-group">
              <h3>Exposure</h3>
              <div class="control-row">
                <label for="exposureTime">Exposure Time:</label>
                <div class="input-group">
                  <input
                    type="number"
                    id="exposureTime"
                    v-model="exposureTime"
                    :disabled="!isConnected || cameraData.isExposing"
                    min="0.001"
                    step="0.1"
                  />
                  <span class="unit">s</span>
                </div>
              </div>

              <div class="control-row">
                <label for="gain">Gain:</label>
                <div class="input-group">
                  <input
                    type="number"
                    id="gain"
                    v-model="gain"
                    :disabled="!isConnected || cameraData.isExposing"
                    min="0"
                    max="100"
                  />
                  <span class="unit">%</span>
                </div>
              </div>

              <div class="control-row">
                <label for="offset">Offset:</label>
                <div class="input-group">
                  <input
                    type="number"
                    id="offset"
                    v-model="offset"
                    :disabled="!isConnected || cameraData.isExposing || !canAdjustOffset"
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div class="control-buttons">
                <button
                  @click="startExposure"
                  :disabled="!isConnected || cameraData.isExposing"
                  class="start-exposure"
                >
                  Start Exposure
                </button>
                <button
                  @click="abortExposure"
                  :disabled="!isConnected || !cameraData.isExposing"
                  class="abort-exposure"
                >
                  Abort
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="cameraData.isExposing" class="exposure-progress">
          <div class="progress-label">
            <span>Exposure in progress</span>
            <span>{{ percentComplete }}%</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill" :style="{ width: `${percentComplete}%` }"></div>
          </div>
          <div class="progress-time">
            Elapsed: {{ Math.round((Date.now() - exposureStartTime) / 1000) }}s / Total:
            {{ exposureTime }}s
          </div>
        </div>
      </div>
    </template>

    <!-- Fullscreen Content -->
    <template #fullscreen-content>
      <div class="camera-fullscreen">
        <div class="fullscreen-header">
          <h2>{{ name }}</h2>
          <div class="camera-meta">
            <div
              class="status-pill"
              :class="isConnected ? 'status-connected' : 'status-disconnected'"
            >
              {{ isConnected ? 'Connected' : 'Disconnected' }}
            </div>
            <div v-if="cameraData.isExposing" class="status-pill status-exposing">Exposing</div>
          </div>
        </div>

        <div class="fullscreen-grid">
          <!-- Image Panel (Left side) -->
          <div class="image-panel">
            <h3>Preview</h3>
            <div class="image-container">
              <div v-if="previewImage" class="preview-image-fullscreen">
                <img :src="previewImage" alt="Camera preview" />
              </div>
              <div v-else class="empty-preview-fullscreen">No image available</div>
            </div>
          </div>

          <!-- Analysis Panel (Top right) -->
          <div class="analysis-panel">
            <h3>Image Analysis</h3>
            <div class="analysis-container">
              <div class="histogram-fullscreen">
                <div v-if="previewImage" class="histogram-bars">
                  <!-- Placeholder for histogram bars -->
                  <div
                    v-for="i in 32"
                    :key="i"
                    class="histogram-bar"
                    :style="{ height: `${Math.random() * 100}%` }"
                  ></div>
                </div>
                <div v-else class="histogram-empty">No histogram data</div>
              </div>

              <div class="stats-grid">
                <div class="stat-item">
                  <span class="stat-label">Min</span>
                  <span class="stat-value">{{
                    previewImage ? Math.floor(Math.random() * 100) : '-'
                  }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Max</span>
                  <span class="stat-value">{{
                    previewImage ? Math.floor(Math.random() * 1000 + 1000) : '-'
                  }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Mean</span>
                  <span class="stat-value">{{
                    previewImage ? Math.floor(Math.random() * 500 + 500) : '-'
                  }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">FWHM</span>
                  <span class="stat-value">{{
                    previewImage ? (Math.random() * 3 + 1).toFixed(2) : '-'
                  }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">HFR</span>
                  <span class="stat-value">{{
                    previewImage ? (Math.random() * 2 + 0.5).toFixed(2) : '-'
                  }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Stars</span>
                  <span class="stat-value">{{
                    previewImage ? Math.floor(Math.random() * 200 + 50) : '-'
                  }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Settings Panel (Bottom right) -->
          <div class="settings-panel">
            <h3>Camera Settings</h3>
            <div class="settings-container">
              <div class="settings-grid">
                <div class="setting-group">
                  <h4>Exposure</h4>
                  <div class="setting-row">
                    <label for="fs-exposure">Exposure Time:</label>
                    <div class="input-with-unit">
                      <input
                        type="number"
                        id="fs-exposure"
                        v-model="exposureTime"
                        :disabled="!isConnected || cameraData.isExposing"
                        :min="minExposure"
                        :max="maxExposure"
                        step="0.1"
                      />
                      <span class="unit">s</span>
                    </div>
                  </div>
                </div>

                <div class="setting-group">
                  <h4>Binning</h4>
                  <div class="setting-row">
                    <label>Bin:</label>
                    <div class="binning-controls-fs">
                      <input
                        type="number"
                        v-model="cameraData.binningX"
                        :disabled="!isConnected || cameraData.isExposing"
                        min="1"
                        max="4"
                      />
                      <span>x</span>
                      <input
                        type="number"
                        v-model="cameraData.binningY"
                        :disabled="!isConnected || cameraData.isExposing"
                        min="1"
                        max="4"
                      />
                      <button
                        @click="setBinning(cameraData.binningX, cameraData.binningY)"
                        :disabled="!isConnected || cameraData.isExposing"
                        class="fs-button"
                      >
                        Set
                      </button>
                    </div>
                  </div>
                </div>

                <div class="setting-group">
                  <h4>Camera Controls</h4>
                  <div class="setting-row">
                    <label for="fs-gain">Gain:</label>
                    <div class="input-with-unit">
                      <input
                        type="number"
                        id="fs-gain"
                        v-model="gain"
                        :disabled="!isConnected || cameraData.isExposing"
                        :min="minGain"
                        :max="maxGain"
                      />
                      <span class="unit">%</span>
                    </div>
                  </div>

                  <div class="setting-row">
                    <label for="fs-offset">Offset:</label>
                    <div class="input-with-unit">
                      <input
                        type="number"
                        id="fs-offset"
                        v-model="offset"
                        :disabled="!isConnected || cameraData.isExposing || !canAdjustOffset"
                        :min="minOffset"
                        :max="maxOffset"
                      />
                    </div>
                  </div>

                  <div class="setting-row">
                    <label for="fs-readmode">Read Mode:</label>
                    <select
                      id="fs-readmode"
                      v-model="readMode"
                      :disabled="!isConnected || cameraData.isExposing || !canAdjustReadMode"
                    >
                      <option v-for="(mode, index) in readModeOptions" :key="index" :value="index">
                        {{ mode }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions Panel (Bottom) -->
          <div class="actions-panel">
            <h3>Capture</h3>
            <div class="actions-container">
              <div class="action-buttons-fs">
                <button
                  @click="startExposure"
                  :disabled="!isConnected || cameraData.isExposing"
                  class="fs-button start-button"
                >
                  <Icon type="camera" />
                  Start Exposure
                </button>
                <button
                  @click="abortExposure"
                  :disabled="!isConnected || !cameraData.isExposing"
                  class="fs-button abort-button"
                >
                  <Icon type="stop" />
                  Abort
                </button>
              </div>

              <div v-if="cameraData.isExposing" class="exposure-progress-fs">
                <div class="progress-label-fs">
                  <span>Exposure in progress</span>
                  <span>{{ percentComplete }}%</span>
                </div>
                <div class="progress-bar-container-fs">
                  <div class="progress-bar-fill-fs" :style="{ width: `${percentComplete}%` }"></div>
                </div>
                <div class="progress-time">
                  Elapsed: {{ Math.round((Date.now() - exposureStartTime) / 1000) }}s / Total:
                  {{ exposureTime }}s
                </div>
              </div>

              <div class="image-history">
                <h4>Recent Images</h4>
                <div class="history-placeholder">No recent images</div>
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
  min-height: 200px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.preview-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-container img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.empty-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--aw-panel-menu-bar-color);
  opacity: 0.7;
  font-style: italic;
}

/* Control Styles */
.quick-controls {
  padding: 10px;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.controls-disabled {
  opacity: 0.6;
  pointer-events: none;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-row label {
  width: 80px;
  font-size: 0.9em;
}

.control-row input[type='number'] {
  width: 70px;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--aw-panel-border-color);
  background-color: rgba(0, 0, 0, 0.1);
  color: var(--aw-panel-content-color);
}

.unit {
  font-size: 0.85em;
  opacity: 0.8;
}

.binning-control {
  display: flex;
  align-items: center;
  gap: 4px;
}

.binning-control input {
  width: 40px !important;
}

.action-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
}

.action-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
  cursor: pointer;
  transition: background-color 0.2s;
}

.action-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: rgba(0, 0, 0, 0.2);
}

.action-button span {
  margin-top: 4px;
  font-size: 0.85em;
}

.start-button {
  background-color: rgba(25, 118, 210, 0.6);
}

.start-button:disabled {
  background-color: rgba(25, 118, 210, 0.3);
}

.abort-button {
  background-color: rgba(211, 47, 47, 0.6);
}

.abort-button:disabled {
  background-color: rgba(211, 47, 47, 0.3);
}

/* Detailed Mode Styles */
.camera-detailed {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
}

.detailed-top {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.preview-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  overflow: hidden;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.detailed-controls {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.control-group {
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 6px;
  padding: 0.75rem;
}

.control-grid {
  display: grid;
  gap: 0.75rem;
}

.control-group label {
  font-size: 0.9rem;
  opacity: 0.9;
}

.control-group input[type='number'],
.control-group select {
  padding: 0.35rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--aw-panel-border-color);
  background-color: rgba(0, 0, 0, 0.1);
  color: var(--aw-panel-content-color);
  width: 100%;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.input-group input {
  flex: 1;
}

.binning-controls-fs {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.binning-controls-fs input {
  width: 50px;
}

.action-buttons.detailed {
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
}

.action-buttons.detailed .action-button {
  width: 100%;
  flex-direction: row;
  justify-content: center;
  padding: 0.5rem 0;
}

.exposure-progress {
  margin-top: auto;
  padding: 0.5rem;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.progress-label {
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
}

.progress-bar-container {
  height: 8px;
  background-color: rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background-color: rgba(255, 107, 107, 0.7);
  border-radius: 4px;
  transition: width 0.3s ease;
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
  gap: 5px;
}

.histogram-bar {
  background: linear-gradient(
    to top,
    var(--aw-panel-scrollbar-color-1),
    var(--aw-panel-scrollbar-color-2)
  );
  flex: 1;
  border-radius: 2px 2px 0 0;
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
    var(--aw-panel-scrollbar-color-1),
    var(--aw-panel-scrollbar-color-2)
  );
  border-radius: 0.25rem;
  transition: width 0.3s ease;
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
</style>
