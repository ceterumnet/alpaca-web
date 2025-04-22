<script setup lang="ts">
import PanelComponent from './PanelComponent.vue'
import Icon from './Icon.vue'
import { onMounted, reactive, computed, ref, watch, onUnmounted } from 'vue'
import axios from 'axios'

const props = defineProps({
  panelName: { type: String, required: true },
  connected: { type: Boolean, required: true },
  idx: { type: Number, required: true },
  deviceNum: { type: Number, required: true }
})

// Define emits to update parent component
const emit = defineEmits(['update:connected'])

// Local reactive connection state
const isConnected = ref(props.connected)

// Watch for prop changes to sync with local state
watch(
  () => props.connected,
  (newValue) => {
    isConnected.value = newValue
  }
)

// Update connected state and notify parent
function updateConnectionState(connected: boolean) {
  isConnected.value = connected
  emit('update:connected', connected)
}

// Define a more specific interface for camera data instead of using Record
interface CameraDataType {
  // Camera settings with default values
  exposureTime: number
  gain: number
  offset: number
  readMode: number
  usbTraffic: number
  binningX: number
  binningY: number
  isExposing: boolean
  previewImage: string | null
  // Allow other properties from API with string indexing
  [key: string]: string | number | boolean | null | { x: number; y: number } | any[] | undefined
}

// Image history interface to store previous captures
interface ImageHistoryItem {
  thumbnail: string
  fullImage: string
  timestamp: Date
  exposureTime: number
  gain: number
  binning: { x: number; y: number }
}

// Instead of separate variables, initialize cameraData with default values
const cameraData = reactive<CameraDataType>({
  // Camera settings with default values
  exposureTime: 0.1, // Default exposure time in seconds
  gain: 0, // Default gain
  offset: 0, // Default offset
  readMode: 0, // Default read mode
  usbTraffic: 0, // Default USB traffic control
  binningX: 1, // Default binning X
  binningY: 1, // Default binning Y
  isExposing: false, // Exposure state
  previewImage: null // Preview image data
})

// Create computed properties that access the centralized cameraData object
const isExposing = computed({
  get: () => Boolean(cameraData.isExposing),
  set: (value: boolean) => {
    cameraData.isExposing = value
  }
})

const previewImage = computed({
  get: () => cameraData.previewImage as string | null,
  set: (value: string | null) => {
    cameraData.previewImage = value
  }
})

const exposureTime = computed({
  get: () => Number(cameraData.exposureTime),
  set: (value: number) => {
    cameraData.exposureTime = value
  }
})

const gain = computed({
  get: () => Number(cameraData.gain),
  set: (value: number) => {
    cameraData.gain = value
  }
})

const offset = computed({
  get: () => Number(cameraData.offset),
  set: (value: number) => {
    cameraData.offset = value
  }
})

const readMode = computed({
  get: () => Number(cameraData.readMode),
  set: (value: number) => {
    cameraData.readMode = value
  }
})

const usbTraffic = computed({
  get: () => Number(cameraData.usbTraffic),
  set: (value: number) => {
    cameraData.usbTraffic = value
  }
})

// Special handling for binning object
const binning = computed({
  get: () => ({
    x: Number(cameraData.binningX),
    y: Number(cameraData.binningY)
  }),
  set: (value: { x: number; y: number }) => {
    cameraData.binningX = value.x
    cameraData.binningY = value.y
  }
})

const isConnecting = ref(false)

// Image processing controls
const imageControls = reactive({
  contrast: 1.0,
  brightness: 0,
  gamma: 1.0,
  colorMap: 'grayscale' as 'grayscale' | 'heat' | 'viridis' | 'plasma',
  showHistogram: true
})

// Add temporary/pending values for sliders
const pendingControls = reactive({
  contrast: 1.0,
  brightness: 0,
  gamma: 1.0,
  colorMap: 'grayscale' as 'grayscale' | 'heat' | 'viridis' | 'plasma'
})

// Initialize with current values
onMounted(() => {
  pendingControls.contrast = imageControls.contrast
  pendingControls.brightness = imageControls.brightness
  pendingControls.gamma = imageControls.gamma
  pendingControls.colorMap = imageControls.colorMap
})

// Update computed properties to show pending values during adjustment
const formattedControls = computed(() => {
  return {
    contrast: isNaN(Number(pendingControls.contrast))
      ? '1.0'
      : Number(pendingControls.contrast).toFixed(1),
    brightness: isNaN(Number(pendingControls.brightness))
      ? '0'
      : String(Math.round(Number(pendingControls.brightness))),
    gamma: isNaN(Number(pendingControls.gamma)) ? '1.0' : Number(pendingControls.gamma).toFixed(1)
  }
})

// Function to apply pending changes and update the image
function applyPendingControls() {
  // Only update if values changed
  const contrastChanged = imageControls.contrast !== Number(pendingControls.contrast)
  const brightnessChanged = imageControls.brightness !== Number(pendingControls.brightness)
  const gammaChanged = imageControls.gamma !== Number(pendingControls.gamma)
  const colorMapChanged = imageControls.colorMap !== pendingControls.colorMap

  if (!contrastChanged && !brightnessChanged && !gammaChanged && !colorMapChanged) {
    return // No changes, skip processing
  }

  // Update values
  imageControls.contrast = Number(pendingControls.contrast)
  imageControls.brightness = Number(pendingControls.brightness)
  imageControls.gamma = Number(pendingControls.gamma)
  imageControls.colorMap = pendingControls.colorMap

  // If we have an image, process it with the new settings
  if (lastProcessedImage.value && normalizedImageCache.value) {
    // Use preview mode for slider adjustments
    isPreviewMode.value = true
    displayProcessedImage(lastProcessedImage.value, false)
  }
}

// Histogram data
const histogramData = ref<number[]>([])
const originalHistogramData = ref<number[]>([]) // Store original histogram before adjustments
const histogramCanvas = ref<HTMLCanvasElement | null>(null)

// Color map functions
const colorMaps = {
  grayscale: (value: number) => [value, value, value],
  heat: (value: number) => {
    const r = Math.min(255, value * 2)
    const g = Math.max(0, value * 2 - 255)
    const b = 0
    return [r, g, b]
  },
  viridis: (value: number) => {
    // Simplified viridis colormap
    const r = Math.floor(value * 0.8)
    const g = Math.floor(value * 1.2)
    const b = Math.floor(value * 1.5)
    return [r, g, b]
  },
  plasma: (value: number) => {
    // Simplified plasma colormap
    const r = Math.floor(value * 1.2)
    const g = Math.floor(value * 0.8)
    const b = Math.floor(value * 1.3)
    return [r, g, b]
  }
}

// Group properties by category
const propertyGroups = computed(() => {
  const groups = {
    status: ['connected', 'camerastate', 'imageready', 'percentcompleted'],
    exposure: [
      'exposuremin',
      'exposuremax',
      'exposureresolution',
      'canabortexposure',
      'canstopexposure'
    ],
    image: [
      'binx',
      'biny',
      'maxx',
      'maxy',
      'minx',
      'miny',
      'xsize',
      'ysize',
      'pixelsizex',
      'pixelsizey',
      'cameraxsize',
      'cameraysize',
      'startx',
      'starty',
      'numx',
      'numy'
    ],
    gain: [
      'gain',
      'gainmin',
      'gainmax',
      'hasadjustablegain',
      'offset',
      'offsetmin',
      'offsetmax',
      'hasadjustableoffset'
    ],
    temperature: [
      'ccdtemperature',
      'setccdtemperature',
      'cansetccdtemperature',
      'cangetcoolerpower',
      'coolerpower',
      'cooleron'
    ],
    readout: [
      'readoutmode',
      'readoutmodes',
      'readoutrate',
      'readoutrates',
      'fastreadout',
      'hasfastreadout',
      'usbtraffic'
    ],
    hardware: [
      'hasshutter',
      'shutterstatus',
      'cancontrolshutter',
      'hasport',
      'numports',
      'port',
      'ports',
      'sensortype',
      'bayeroffsetx',
      'bayeroffsety'
    ],
    info: [
      'description',
      'driverinfo',
      'driverversion',
      'interfaceversion',
      'name',
      'sensorname',
      'sensortype',
      'maxadu',
      'electronsperadu',
      'fullwellcapacity',
      'gainunit'
    ]
  }

  // Create organized data structure
  const organizedData: Record<string, Record<string, string | number>> = {}

  for (const [group, properties] of Object.entries(groups)) {
    organizedData[group] = {}
    for (const prop of properties) {
      if (prop in cameraData) {
        organizedData[group][prop] = cameraData[prop] as string | number
      }
    }
  }

  return organizedData
})
// Add helper function to safely check for properties regardless of case
function hasProperty(name: string) {
  const lowercaseName = name.toLowerCase()
  const pascalCaseName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
  return (
    name in cameraData ||
    lowercaseName in cameraData ||
    pascalCaseName in cameraData ||
    name.toUpperCase() in cameraData
  )
}

// Enhanced version of getPropertyValue to handle falsy values properly
function getPropertyValue(name: string, defaultValue: any = undefined) {
  // Try exact case first
  if (name in cameraData) {
    return cameraData[name]
  }

  // Try lowercase version
  const lowercaseName = name.toLowerCase()
  const lowercaseKey = Object.keys(cameraData).find((key) => key.toLowerCase() === lowercaseName)
  if (lowercaseKey) {
    return cameraData[lowercaseKey]
  }

  // Try PascalCase or camelCase versions
  const pascalCaseName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
  const camelCaseName = name.charAt(0).toLowerCase() + name.slice(1)

  if (pascalCaseName in cameraData) {
    return cameraData[pascalCaseName]
  }

  if (camelCaseName in cameraData) {
    return cameraData[camelCaseName]
  }

  // If all attempts fail, return the default value
  return defaultValue
}

// Add a function to check if a property exists (regardless of its value)
function propertyExists(name: string) {
  const value = getPropertyValue(name, undefined)
  return value !== undefined
}

// Add the canAdjustExposure property which was dropped
const canAdjustExposure = computed(() => !isExposing.value)

// Update the canAdjustGain computed property - gain is always settable in Alpaca
const canAdjustGain = computed(() => {
  // Gain is always a settable value in Alpaca
  return true
})

// Update the canAdjustOffset computed property - offset is always settable in Alpaca
const canAdjustOffset = computed(() => {
  // Offset is always a settable value in Alpaca
  return true
})

// Update the canAdjustReadMode computed property - show if ReadoutModes property exists
const canAdjustReadMode = computed(() => {
  // The standard property name is ReadoutModes in ASCOM
  return hasProperty('ReadoutModes')
})

// Update the canAdjustUSBTraffic computed property - only show if property exists
const canAdjustUSBTraffic = computed(() => {
  // USBTraffic is not a standard property, so only show if it exists
  const hasTraffic = hasProperty('usbtraffic') || hasProperty('USBTraffic')
  return hasTraffic
})

// Update the hasFastReadout computed property
const hasFastReadout = computed(() => {
  // FastReadout is a standard property but not all cameras support it
  return hasProperty('fastreadout') || hasProperty('FastReadout')
})

// Update the canSetTemperature computed property
const canSetTemperature = computed(() => {
  const primaryValue = getPropertyValue('cansetccdtemperature')
  const fallbackValue = primaryValue ?? getPropertyValue('CanSetCCDTemperature', false)
  return fallbackValue === true || fallbackValue === 'true'
})

// Update other computed properties as well
const minExposure = computed(() => {
  // ExposureMin is the standard property name, fallback to 0.001
  return Number(getPropertyValue('exposuremin', getPropertyValue('ExposureMin', 0.001)))
})
const maxExposure = computed(() => {
  // ExposureMax is the standard property name, fallback to 3600
  return Number(getPropertyValue('exposuremax', getPropertyValue('ExposureMax', 3600)))
})
const minGain = computed(() => {
  // GainMin is the standard property name, fallback to 0
  return Number(getPropertyValue('gainmin', getPropertyValue('GainMin', 0)))
})
const maxGain = computed(() => {
  // GainMax is the standard property name, fallback to reasonable value
  return Number(getPropertyValue('gainmax', getPropertyValue('GainMax', 100)))
})
const minOffset = computed(() => {
  // OffsetMin is the standard property name, fallback to 0
  return Number(getPropertyValue('offsetmin', getPropertyValue('OffsetMin', 0)))
})
const maxOffset = computed(() => {
  // OffsetMax is the standard property name, fallback to reasonable value
  return Number(getPropertyValue('offsetmax', getPropertyValue('OffsetMax', 100)))
})
const minUSBTraffic = computed(() => 0)
const maxUSBTraffic = computed(() => 100)

// Update readModeOptions computed property - ReadoutModes is a standard property
const readModeOptions = computed(() => {
  // The standard property name is ReadoutModes in ASCOM
  const modes = getPropertyValue('ReadoutModes', [])

  // Handle different formats
  if (Array.isArray(modes)) {
    return modes
  } else if (typeof modes === 'string') {
    // Try to parse as JSON if it's a string
    try {
      const parsed = JSON.parse(modes)
      return Array.isArray(parsed) ? parsed : []
    } catch (e) {
      // If it's not valid JSON, split by comma
      return modes.split(',').map((m) => m.trim())
    }
  }

  return []
})

// Add cache for the last processed image data
const lastProcessedImage = ref<any>(null)

// Add normalized image cache for faster adjustment
const normalizedImageCache = ref<any>(null)

// Add a scale factor for preview mode
const previewScaleFactor = ref(1) // 1 = full resolution, 4 = quarter resolution
const isPreviewMode = ref(true) // Start with preview mode enabled

// Add debounced final render function
let renderTimeout: ReturnType<typeof setTimeout> | null = null
function debouncedFinalRender() {
  // Clear existing timeout if any
  if (renderTimeout) clearTimeout(renderTimeout)

  // Schedule full render after a short delay
  renderTimeout = setTimeout(() => {
    renderFinalImage()
    renderTimeout = null
  }, 200) // 200ms delay
}

// Add function to render final full-resolution image when done with adjustments
function renderFinalImage() {
  if (lastProcessedImage.value && normalizedImageCache.value) {
    // Set to full resolution
    isPreviewMode.value = false
    displayProcessedImage(lastProcessedImage.value, false)
  }
}

async function fetchData() {
  try {
    console.log('Fetching camera data for device:', props.deviceNum)
    const resp = await axios.get(`/api/v1/camera/${props.deviceNum}/devicestate`)
    console.log('resp from camera: ', resp.data)

    // Handle different data formats from the API
    if (resp.data && resp.data.Value) {
      // Standard Alpaca response format
      for (const item of resp.data.Value) {
        if (item && item.Name) {
          cameraData[item.Name.toLowerCase()] = item.Value
        }
      }
    } else if (resp.data && Array.isArray(resp.data)) {
      // Alternative format where data is directly an array
      for (const item of resp.data) {
        if (item && item.Name) {
          cameraData[item.Name.toLowerCase()] = item.Value
        }
      }
    } else if (resp.data && typeof resp.data === 'object') {
      // If data is just an object with properties
      Object.entries(resp.data).forEach(([key, value]) => {
        // Store both uppercase original and lowercase version for compatibility
        if (typeof value === 'object' && value !== null) {
          const objValue = value as Record<string, any>
          cameraData[key] = (objValue.Value !== undefined ? objValue.Value : value) as
            | string
            | number
          cameraData[key.toLowerCase()] = (
            objValue.Value !== undefined ? objValue.Value : value
          ) as string | number
        } else {
          cameraData[key] = value as string | number
          cameraData[key.toLowerCase()] = value as string | number
        }
      })
    }

    console.log('Camera data parsed:', cameraData)

    // Update local control values from API data
    updateControlsFromCameraData()

    // Fetch specific properties directly
    await fetchCameraState()
  } catch (e) {
    console.error('Error fetching camera data:', e)
  }
}

// Additional fetch functions for camera specifications
async function fetchCameraXSize() {
  if (!isConnected.value) return

  try {
    console.log('Fetching camera X size')
    const response = await axios.get(`/api/v1/camera/${props.deviceNum}/cameraxsize`, {
      params: {
        ClientID: '1',
        ClientTransactionID: '1'
      }
    })

    if (response.data && response.data.Value !== undefined) {
      console.log('Received camera X size:', response.data.Value)
      cameraData.CameraXSize = response.data.Value
    }
  } catch (error) {
    console.error('Error fetching camera X size:', error)
  }
}

async function fetchCameraYSize() {
  if (!isConnected.value) return

  try {
    console.log('Fetching camera Y size')
    const response = await axios.get(`/api/v1/camera/${props.deviceNum}/cameraysize`, {
      params: {
        ClientID: '1',
        ClientTransactionID: '1'
      }
    })

    if (response.data && response.data.Value !== undefined) {
      console.log('Received camera Y size:', response.data.Value)
      cameraData.CameraYSize = response.data.Value
    }
  } catch (error) {
    console.error('Error fetching camera Y size:', error)
  }
}

async function fetchSensorInfo() {
  if (!isConnected.value) return

  try {
    console.log('Fetching sensor info')
    // Fetch sensor name
    const nameResponse = await axios
      .get(`/api/v1/camera/${props.deviceNum}/sensorname`, {
        params: {
          ClientID: '1',
          ClientTransactionID: '1'
        }
      })
      .catch((e) => {
        console.log('SensorName not available for this camera:', e)
        return { data: { Value: 'Unknown' } }
      })

    if (nameResponse.data && nameResponse.data.Value !== undefined) {
      console.log('Received sensor name:', nameResponse.data.Value)
      cameraData.SensorName = nameResponse.data.Value
    }

    // Fetch sensor type
    const typeResponse = await axios
      .get(`/api/v1/camera/${props.deviceNum}/sensortype`, {
        params: {
          ClientID: '1',
          ClientTransactionID: '1'
        }
      })
      .catch((e) => {
        console.log('SensorType not available for this camera:', e)
        return { data: { Value: 'Unknown' } }
      })

    if (typeResponse.data && typeResponse.data.Value !== undefined) {
      console.log('Received sensor type:', typeResponse.data.Value)
      cameraData.SensorType = typeResponse.data.Value
    }

    // Fetch electrons per ADU value
    const electronsResponse = await axios
      .get(`/api/v1/camera/${props.deviceNum}/electronsperadu`, {
        params: {
          ClientID: '1',
          ClientTransactionID: '1'
        }
      })
      .catch((e) => {
        console.log('ElectronsPerADU not available for this camera:', e)
        return { data: { Value: null } }
      })

    if (
      electronsResponse.data &&
      electronsResponse.data.Value !== undefined &&
      electronsResponse.data.Value !== null
    ) {
      console.log('Received electrons per ADU:', electronsResponse.data.Value)
      cameraData.ElectronsPerADU = electronsResponse.data.Value
    }

    // Fetch max ADU value if available
    const maxADUResponse = await axios
      .get(`/api/v1/camera/${props.deviceNum}/maxadu`, {
        params: {
          ClientID: '1',
          ClientTransactionID: '1'
        }
      })
      .catch((e) => {
        console.log('MaxADU not available for this camera:', e)
        return { data: { Value: null } }
      })

    if (
      maxADUResponse.data &&
      maxADUResponse.data.Value !== undefined &&
      maxADUResponse.data.Value !== null
    ) {
      console.log('Received max ADU value:', maxADUResponse.data.Value)
      cameraData.MaxADU = maxADUResponse.data.Value
    }
  } catch (error) {
    console.error('Error fetching sensor info:', error)
  }
}

// Add a dedicated function to fetch sensor type
async function fetchSensorType() {
  if (!isConnected.value) return

  try {
    console.log('Fetching sensor type')
    const response = await axios.get(`/api/v1/camera/${props.deviceNum}/sensortype`, {
      params: {
        ClientID: '1',
        ClientTransactionID: '1'
      }
    })

    if (response.data && response.data.Value !== undefined) {
      console.log('Received sensor type:', response.data.Value)
      cameraData.SensorType = response.data.Value
    }
  } catch (error) {
    console.error('Error fetching sensor type:', error)
  }
}

// Update the function to handle case variations
function updateControlsFromCameraData() {
  // Helper function to get property value regardless of case
  function getProperty(name: string) {
    // Try exact case first
    if (name in cameraData && cameraData[name] !== undefined) {
      return cameraData[name]
    }

    // Try lowercase version
    const lowercaseName = name.toLowerCase()
    if (lowercaseName in cameraData && cameraData[lowercaseName] !== undefined) {
      return cameraData[lowercaseName]
    }

    // Try uppercase version
    const uppercaseName = name.toUpperCase()
    if (uppercaseName in cameraData && cameraData[uppercaseName] !== undefined) {
      return cameraData[uppercaseName]
    }

    // Try capitalizing first letter (camelCase to PascalCase)
    const pascalCaseName = name.charAt(0).toUpperCase() + name.slice(1)
    if (pascalCaseName in cameraData && cameraData[pascalCaseName] !== undefined) {
      return cameraData[pascalCaseName]
    }

    return undefined
  }

  // Update gain if available
  const gainValue = getProperty('gain') || getProperty('Gain')
  if (gainValue !== undefined) {
    console.log('Updating gain from API:', gainValue)
    cameraData.gain = Number(gainValue)
  }

  // Update binning if available
  const binX = getProperty('binx') || getProperty('BinX')
  const binY = getProperty('biny') || getProperty('BinY')

  if (binX !== undefined && binY !== undefined) {
    console.log('Updating binning from API:', binX, binY)
    cameraData.binningX = Number(binX) || 1
    cameraData.binningY = Number(binY) || 1
  }

  // Update exposure time if available
  const exposureTimeValue = getProperty('exposuretime') || getProperty('ExposureTime')
  if (exposureTimeValue !== undefined) {
    console.log('Updating exposure time from API:', exposureTimeValue)
    cameraData.exposureTime = Number(exposureTimeValue) || 0.1
  }

  // Also check for min/max values
  const gainMinValue = getProperty('gainmin') || getProperty('GainMin')
  if (gainMinValue !== undefined) {
    console.log('Setting min gain:', gainMinValue)
    cameraData.gainmin = Number(gainMinValue)
  }

  const gainMaxValue = getProperty('gainmax') || getProperty('GainMax')
  if (gainMaxValue !== undefined) {
    console.log('Setting max gain:', gainMaxValue)
    cameraData.gainmax = Number(gainMaxValue)
  }

  // Update offset if available
  const offsetValue = getProperty('offset') || getProperty('Offset')
  if (offsetValue !== undefined) {
    console.log('Updating offset from API:', offsetValue)
    cameraData.offset = Number(offsetValue)
  }

  // Also check for min/max offset values
  const offsetMinValue = getProperty('offsetmin') || getProperty('OffsetMin')
  if (offsetMinValue !== undefined) {
    console.log('Setting min offset:', offsetMinValue)
    cameraData.offsetmin = Number(offsetMinValue)
  }

  const offsetMaxValue = getProperty('offsetmax') || getProperty('OffsetMax')
  if (offsetMaxValue !== undefined) {
    console.log('Setting max offset:', offsetMaxValue)
    cameraData.offsetmax = Number(offsetMaxValue)
  }

  // Update read mode if available
  const readModeValue = getProperty('ReadoutMode')
  if (readModeValue !== undefined) {
    console.log('Updating read mode from API:', readModeValue)
    cameraData.readMode = Number(readModeValue)
  }

  // Update USB traffic if available
  const usbTrafficValue = getProperty('usbtraffic') || getProperty('USBTraffic')
  if (usbTrafficValue !== undefined) {
    console.log('Updating USB traffic from API:', usbTrafficValue)
    cameraData.usbTraffic = Number(usbTrafficValue)
  }

  // Update fast readout if available
  const fastReadoutValue = getProperty('fastreadout')
  if (fastReadoutValue !== undefined) {
    console.log('Updating fast readout from API:', fastReadoutValue)
    cameraData.fastreadout =
      fastReadoutValue === 1 ||
      fastReadoutValue === '1' ||
      fastReadoutValue === 'true' ||
      String(fastReadoutValue).toLowerCase() === 'true'
  }

  // Update target temperature if available
  const targetTempValue = getProperty('setccdtemperature')
  if (targetTempValue !== undefined) {
    console.log('Updating target temperature from API:', targetTempValue)
    cameraData.setccdtemperature = Number(targetTempValue)
  }

  // Update subframe settings if available
  const startXValue = getPropertyValue('startx', getPropertyValue('StartX'))
  if (startXValue !== undefined) {
    console.log('Updating startX from API:', startXValue)
    cameraData.startX = Number(startXValue)
  }

  const startYValue = getPropertyValue('starty', getPropertyValue('StartY'))
  if (startYValue !== undefined) {
    console.log('Updating startY from API:', startYValue)
    cameraData.startY = Number(startYValue)
  }

  const numXValue = getPropertyValue('numx', getPropertyValue('NumX'))
  if (numXValue !== undefined) {
    console.log('Updating numX from API:', numXValue)
    cameraData.numX = Number(numXValue)
  } else if (getPropertyValue('cameraXSize') !== undefined) {
    // If numX not available but cameraXSize is, use that
    cameraData.numX = Number(getPropertyValue('cameraXSize'))
  }

  const numYValue = getPropertyValue('numy', getPropertyValue('NumY'))
  if (numYValue !== undefined) {
    console.log('Updating numY from API:', numYValue)
    cameraData.numY = Number(numYValue)
  } else if (getPropertyValue('cameraYSize') !== undefined) {
    // If numY not available but cameraYSize is, use that
    cameraData.numY = Number(getPropertyValue('cameraYSize'))
  }
}

// Function to explicitly fetch readout modes from the camera
async function fetchReadoutModes() {
  if (!isConnected.value) return

  try {
    console.log('Fetching camera readout modes')
    const response = await axios.get(`/api/v1/camera/${props.deviceNum}/readoutmodes`, {
      params: {
        ClientID: '1',
        ClientTransactionID: '1'
      }
    })

    if (response.data && response.data.Value !== undefined) {
      console.log('Received readout modes:', response.data.Value)
      // Store the readout modes in cameraData
      cameraData.ReadoutModes = response.data.Value
    }
  } catch (error) {
    console.error('Error fetching readout modes:', error)
  }
}

// Function to fetch current readout mode
async function fetchReadoutMode() {
  if (!isConnected.value) return

  try {
    console.log('Fetching current readout mode')
    const response = await axios.get(`/api/v1/camera/${props.deviceNum}/readoutmode`, {
      params: {
        ClientID: '1',
        ClientTransactionID: '1'
      }
    })

    if (response.data && response.data.Value !== undefined) {
      console.log('Received current readout mode:', response.data.Value)
      // Update camera data and local state with the current readout mode
      cameraData.ReadoutMode = response.data.Value
      cameraData.readMode = Number(response.data.Value)
    }
  } catch (error) {
    console.error('Error fetching current readout mode:', error)
  }
}

// Individual setter functions for camera settings
async function setGain(newValue: number | string) {
  if (!isConnected.value) return

  try {
    console.log('Setting gain to:', newValue)
    const gainForm = new URLSearchParams()
    // Standard Alpaca property is "Gain"
    gainForm.append('Gain', newValue.toString())
    gainForm.append('ClientID', '1')
    gainForm.append('ClientTransactionID', '1')

    await axios.put(`/api/v1/camera/${props.deviceNum}/gain`, gainForm, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    // Update local value after successful API call
    cameraData.gain = Number(newValue)
  } catch (error) {
    console.error('Error setting gain:', error)
  }
}

async function setBinningX(newValue: number | string) {
  if (!isConnected.value) return

  try {
    console.log('Setting binning X to:', newValue)
    const binXForm = new URLSearchParams()
    binXForm.append('BinX', newValue.toString())
    binXForm.append('ClientID', '1')
    binXForm.append('ClientTransactionID', '1')

    await axios.put(`/api/v1/camera/${props.deviceNum}/binx`, binXForm, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    // Update local value after successful API call
    cameraData.binningX = Number(newValue)
  } catch (error) {
    console.error('Error setting binning X:', error)
  }
}

async function setBinningY(newValue: number | string) {
  if (!isConnected.value) return

  try {
    console.log('Setting binning Y to:', newValue)
    const binYForm = new URLSearchParams()
    binYForm.append('BinY', newValue.toString())
    binYForm.append('ClientID', '1')
    binYForm.append('ClientTransactionID', '1')

    await axios.put(`/api/v1/camera/${props.deviceNum}/biny`, binYForm, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    // Update local value after successful API call
    cameraData.binningY = Number(newValue)
  } catch (error) {
    console.error('Error setting binning Y:', error)
  }
}

async function setExposureTime(newValue: number | string) {
  if (!isConnected.value) return

  try {
    console.log('Setting exposure time to:', newValue)
    const exposureForm = new URLSearchParams()
    exposureForm.append('ExposureTime', newValue.toString())
    exposureForm.append('ClientID', '1')
    exposureForm.append('ClientTransactionID', '1')

    await axios.put(`/api/v1/camera/${props.deviceNum}/exposuretime`, exposureForm, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    // Update local value after successful API call
    cameraData.exposureTime = Number(newValue)
  } catch (error) {
    console.error('Error setting exposure time:', error)
  }
}

async function setOffset(newValue: number | string) {
  if (!isConnected.value) return

  try {
    console.log('Setting offset to:', newValue)
    const offsetForm = new URLSearchParams()
    // Standard Alpaca property is "Offset"
    offsetForm.append('Offset', newValue.toString())
    offsetForm.append('ClientID', '1')
    offsetForm.append('ClientTransactionID', '1')

    await axios.put(`/api/v1/camera/${props.deviceNum}/offset`, offsetForm, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    // Update local value after successful API call
    cameraData.offset = Number(newValue)
  } catch (error) {
    console.error('Error setting offset:', error)
  }
}

async function setReadMode(newValue: number | string) {
  if (!isConnected.value) return

  try {
    console.log('Setting read mode to:', newValue)
    const readModeForm = new URLSearchParams()

    // Use the standard property name ReadoutMode
    readModeForm.append('ReadoutMode', newValue.toString())
    readModeForm.append('ClientID', '1')
    readModeForm.append('ClientTransactionID', '1')

    await axios.put(`/api/v1/camera/${props.deviceNum}/readoutmode`, readModeForm, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    // Update local value after successful API call
    cameraData.readMode = Number(newValue)
  } catch (error) {
    console.error('Error setting read mode:', error)
  }
}

async function setUSBTraffic(newValue: number | string) {
  if (!isConnected.value) return

  try {
    console.log('Setting USB traffic to:', newValue)
    const usbTrafficForm = new URLSearchParams()
    usbTrafficForm.append('USBTraffic', newValue.toString())
    usbTrafficForm.append('ClientID', '1')
    usbTrafficForm.append('ClientTransactionID', '1')

    await axios.put(`/api/v1/camera/${props.deviceNum}/usbtraffic`, usbTrafficForm, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    // Update local value after successful API call
    cameraData.usbTraffic = Number(newValue)
  } catch (error) {
    console.error('Error setting USB traffic:', error)
  }
}

async function startExposure() {
  console.log('startExposure')
  if (!isConnected.value || isExposing.value) return

  try {
    cameraData.isExposing = true

    // NOTE: Binning and gain are now set directly when user changes their values
    // We keep this commented for reference in case we need to revert
    /*
    // Set binning if supported
    if (cameraData.hasasymmetricbins !== false) {
      const binXForm = new URLSearchParams()
      binXForm.append('BinX', binning.value.x.toString())
      binXForm.append('ClientID', '1')
      binXForm.append('ClientTransactionID', '1')

      const binYForm = new URLSearchParams()
      binYForm.append('BinY', binning.value.y.toString())
      binYForm.append('ClientID', '1')
      binYForm.append('ClientTransactionID', '1')

      await axios.put(`/api/v1/camera/${props.deviceNum}/binx`, binXForm, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
      await axios.put(`/api/v1/camera/${props.deviceNum}/biny`, binYForm, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
    }

    // Set gain if supported
    if (canAdjustGain.value) {
      const gainForm = new URLSearchParams()
      gainForm.append('Gain', gain.value.toString())
      gainForm.append('ClientID', '1')
      gainForm.append('ClientTransactionID', '1')

      await axios.put(`/api/v1/camera/${props.deviceNum}/gain`, gainForm, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
    }
    */

    // Start the exposure
    const startXForm = new URLSearchParams()
    startXForm.append('StartX', '0')
    startXForm.append('ClientID', '1')
    startXForm.append('ClientTransactionID', '1')
    const startYForm = new URLSearchParams()
    startYForm.append('StartY', '0')
    startYForm.append('ClientID', '1')
    startYForm.append('ClientTransactionID', '1')

    const numXForm = new URLSearchParams()
    numXForm.append('NumX', (Number(cameraData.xsize) || 0).toString())
    numXForm.append('ClientID', '1')
    numXForm.append('ClientTransactionID', '1')

    const numYForm = new URLSearchParams()
    numYForm.append('NumY', (Number(cameraData.ysize) || 0).toString())
    numYForm.append('ClientID', '1')
    numYForm.append('ClientTransactionID', '1')

    // Create startexposure form with required parameters
    const exposureForm = new URLSearchParams()
    exposureForm.append('Duration', exposureTime.value.toString()) // Required: exposure duration in seconds
    exposureForm.append('Light', 'true') // Required: true for light frame, false for dark
    exposureForm.append('ClientID', '1')
    exposureForm.append('ClientTransactionID', '1')

    await axios.put(`/api/v1/camera/${props.deviceNum}/startx`, startXForm, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    await axios.put(`/api/v1/camera/${props.deviceNum}/starty`, startYForm, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    await axios.put(`/api/v1/camera/${props.deviceNum}/numx`, numXForm, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    await axios.put(`/api/v1/camera/${props.deviceNum}/numy`, numYForm, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    await axios.put(`/api/v1/camera/${props.deviceNum}/startexposure`, exposureForm, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    // Start polling for image completion
    pollForImage()
  } catch (error) {
    console.error('Error starting exposure:', error)
    cameraData.isExposing = false
  }
}

async function stopExposure() {
  if (!isConnected.value || !isExposing.value) return

  try {
    const formData = new URLSearchParams()
    formData.append('ClientID', '1')
    formData.append('ClientTransactionID', '1')

    if (
      cameraData.canstopexposure === 1 ||
      cameraData.canstopexposure === '1' ||
      cameraData.canstopexposure === 'true' ||
      String(cameraData.canstopexposure).toLowerCase() === 'true'
    ) {
      await axios.put(`/api/v1/camera/${props.deviceNum}/stopexposure`, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
    } else if (
      cameraData.canabortexposure === 1 ||
      cameraData.canabortexposure === '1' ||
      cameraData.canabortexposure === 'true' ||
      String(cameraData.canabortexposure).toLowerCase() === 'true'
    ) {
      await axios.put(`/api/v1/camera/${props.deviceNum}/abortexposure`, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
    }
    cameraData.isExposing = false
  } catch (error) {
    console.error('Error stopping exposure:', error)
  }
}

// Add a continuous mode flag
const isContinuousRunning = ref(false)

// Update takeImage function to be clearer about its one-shot nature
async function takeImage() {
  if (!isConnected.value || isExposing.value) return

  try {
    await startExposure()
    // The image will be handled by the polling function
  } catch (error) {
    console.error('Error taking image:', error)
  }
}

// Add a new function for continuous exposure
async function toggleContinuousMode() {
  if (!isConnected.value) return

  if (isContinuousRunning.value) {
    // Stop continuous mode
    isContinuousRunning.value = false
    if (isExposing.value) {
      await stopExposure()
    }
  } else {
    // Start continuous mode
    isContinuousRunning.value = true
    startContinuousCapture()
  }
}

// Function to handle continuous capture
async function startContinuousCapture() {
  if (!isConnected.value || !isContinuousRunning.value) return

  try {
    await startExposure()
    // The polling function will handle restarting
    // the exposure when complete if continuous mode is on
  } catch (error) {
    console.error('Error in continuous capture:', error)
    isContinuousRunning.value = false
  }
}

// Update pollForImage to support continuous mode
async function pollForImage() {
  if (!isExposing.value) return

  try {
    const stateResp = await axios.get(`/api/v1/camera/${props.deviceNum}/imageready`)
    if (stateResp.data.Value === true) {
      // Image is ready, download it
      const imageResp = await axios.get(`/api/v1/camera/${props.deviceNum}/imagearray`, {
        responseType: 'arraybuffer',
        headers: {
          Accept: 'application/imagebytes'
        }
      })

      console.log('Received image data, size:', imageResp.data.byteLength)

      // Process ImageBytes format
      const processedData = processImageBytes(imageResp.data)

      // Clear the normalized cache as we have new data
      normalizedImageCache.value = null

      // Store processed data for reuse when adjusting image settings
      lastProcessedImage.value = processedData

      // Display the image - force reprocessing as it's a new image
      displayProcessedImage(processedData, true)

      cameraData.isExposing = false

      // If in continuous mode, start the next exposure after a short delay
      if (isContinuousRunning.value) {
        setTimeout(() => {
          startContinuousCapture()
        }, 500) // 500ms delay between exposures
      }
    } else {
      // Continue polling
      setTimeout(pollForImage, 1000)
    }
  } catch (error) {
    console.error('Error polling for image:', error)
    cameraData.isExposing = false
    isContinuousRunning.value = false
  }
}

// New function to display processed image data
function displayProcessedImage(processedData: any, forceReprocess = false) {
  if (!processedData || !processedData.pixelData || !processedData.width || !processedData.height) {
    console.error('Invalid image data', processedData)
    return
  }

  // Get image dimensions from processed data
  const width = processedData.width
  const height = processedData.height
  console.log('Image dimensions:', width, 'x', height)

  // If no valid dimensions, exit early
  if (width <= 0 || height <= 0) {
    console.error('Invalid image dimensions')
    return
  }

  // Check if we need to reprocess from raw data or can use cached normalized data
  if (!normalizedImageCache.value || forceReprocess) {
    console.time('Initial image normalization')

    // Process the full image once and cache at full resolution
    processFullImage(processedData)

    console.timeEnd('Initial image normalization')
  }

  // Determine if we should render at full or preview resolution
  const scale = isPreviewMode.value ? previewScaleFactor.value : 1
  const targetWidth = Math.floor(width / scale)
  const targetHeight = Math.floor(height / scale)
  console.log(`Rendering at scale: 1/${scale}, dimensions: ${targetWidth}x${targetHeight}`)

  // Apply adjustments to the cached data (this should be fast)
  console.time('Apply adjustments')

  // Create a canvas with target dimensions
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Could not get canvas context')
  }
  canvas.width = targetWidth
  canvas.height = targetHeight

  // Create ImageData at the appropriate size
  const imageData = ctx.createImageData(targetWidth, targetHeight)
  const outData = imageData.data

  // Skip histogram in preview mode for speed
  const skipHistogram = isPreviewMode.value && scale > 1
  let histogramArray = skipHistogram ? [] : new Array(1024).fill(0)

  // Use the appropriate cached data
  const normalizedData = normalizedImageCache.value.data

  // Fast direct array operations - less function calls, more speed
  // Pre-compute lookup tables for gamma to avoid expensive math
  const contrastFactor = Number(imageControls.contrast) || 1.0
  const brightnessFactor = Number(imageControls.brightness) || 0
  const gammaFactor = Number(imageControls.gamma) || 1.0
  const useColorMap = imageControls.colorMap !== 'grayscale' && colorMaps[imageControls.colorMap]

  // Pre-calculate gamma lookup table if needed
  const gammaLut = new Uint8Array(256)
  if (gammaFactor !== 1.0) {
    for (let i = 0; i < 256; i++) {
      gammaLut[i] = Math.min(255, Math.max(0, Math.round(255 * Math.pow(i / 255, 1 / gammaFactor))))
    }
  } else {
    // Identity LUT
    for (let i = 0; i < 256; i++) gammaLut[i] = i
  }

  // Fast path: Apply adjustments directly for grayscale
  if (!useColorMap) {
    // Process using scaling to handle preview mode
    for (let targetY = 0; targetY < targetHeight; targetY++) {
      const sourceY = targetY * scale

      for (let targetX = 0; targetX < targetWidth; targetX++) {
        const sourceX = targetX * scale

        // Get source and target indices
        const sourceIdx = sourceY * width + sourceX
        const targetIdx = targetY * targetWidth + targetX

        // Get the normalized value
        const value = normalizedData[sourceIdx]

        // Fast, optimized adjustment path - directly inline math
        // Apply brightness
        let adjusted = value + brightnessFactor

        // Apply contrast
        adjusted = 128 + (adjusted - 128) * contrastFactor

        // Clamp to 0-255 range
        adjusted = Math.min(255, Math.max(0, adjusted))

        // Apply gamma using lookup table (much faster than Math.pow)
        const finalValue = gammaLut[Math.round(adjusted)]

        // Set RGB (grayscale)
        outData[targetIdx * 4] = finalValue
        outData[targetIdx * 4 + 1] = finalValue
        outData[targetIdx * 4 + 2] = finalValue
        outData[targetIdx * 4 + 3] = 255 // Alpha

        // Update histogram if needed
        if (!skipHistogram) {
          const histogramBin = Math.min(1024 - 1, Math.floor((finalValue / 255) * 1024))
          histogramArray[histogramBin]++
        }
      }
    }
  } else {
    // Color map path (slower but needed for color maps)
    const colorMap = colorMaps[imageControls.colorMap]

    for (let targetY = 0; targetY < targetHeight; targetY++) {
      const sourceY = targetY * scale

      for (let targetX = 0; targetX < targetWidth; targetX++) {
        const sourceX = targetX * scale

        // Get source and target indices
        const sourceIdx = sourceY * width + sourceX
        const targetIdx = targetY * targetWidth + targetX

        // Get the normalized value
        const value = normalizedData[sourceIdx]

        // Apply adjustments (inline for speed)
        let adjusted = value + brightnessFactor
        adjusted = 128 + (adjusted - 128) * contrastFactor
        adjusted = Math.min(255, Math.max(0, adjusted))

        // Apply gamma using lookup table
        const mappedValue = gammaLut[Math.round(adjusted)]

        // Apply color map
        const colorValue = colorMap(mappedValue)

        // Set RGBA values
        outData[targetIdx * 4] = colorValue[0]
        outData[targetIdx * 4 + 1] = colorValue[1]
        outData[targetIdx * 4 + 2] = colorValue[2]
        outData[targetIdx * 4 + 3] = 255

        // Update histogram if not skipping
        if (!skipHistogram) {
          const avgValue = Math.floor((colorValue[0] + colorValue[1] + colorValue[2]) / 3)
          const histogramBin = Math.min(1024 - 1, Math.floor((avgValue / 255) * 1024))
          histogramArray[histogramBin]++
        }
      }
    }
  }

  // Only update adjusted histogram when not in preview mode
  if (!skipHistogram) {
    histogramData.value = histogramArray

    // Update the histogram visualization
    if (imageControls.showHistogram) {
      drawHistogram()
    }
  }

  // Put the image data on the canvas
  ctx.putImageData(imageData, 0, 0)

  // Convert canvas to data URL and update the image
  const imageUrl = canvas.toDataURL('image/jpeg', 0.85) // Use JPEG for speed
  cameraData.previewImage = imageUrl

  // If this is a new image (not just adjusting an existing one), add it to history
  if (forceReprocess) {
    // Create a smaller thumbnail for history
    const thumbCanvas = document.createElement('canvas')
    const thumbCtx = thumbCanvas.getContext('2d')
    if (!thumbCtx) {
      throw new Error('Could not get thumbnail canvas context')
    }
    // Make thumbnail 150px wide, maintain aspect ratio
    const thumbWidth = 150
    const thumbHeight = Math.floor((height / width) * thumbWidth)
    thumbCanvas.width = thumbWidth
    thumbCanvas.height = thumbHeight

    // Create the thumbnail by drawing the full canvas onto the smaller one
    thumbCtx.drawImage(canvas, 0, 0, width, height, 0, 0, thumbWidth, thumbHeight)

    // Add to history
    const historyItem: ImageHistoryItem = {
      thumbnail: thumbCanvas.toDataURL('image/jpeg', 0.6),
      fullImage: imageUrl,
      timestamp: new Date(),
      exposureTime: Number(cameraData.exposureTime),
      gain: Number(cameraData.gain),
      binning: { x: Number(cameraData.binningX), y: Number(cameraData.binningY) }
    }

    // Add to beginning of array and limit to 5 items
    imageHistory.value.unshift(historyItem)
    if (imageHistory.value.length > 5) {
      imageHistory.value.pop()
    }
  }

  // Always draw histogram at the end, regardless of preview mode
  if (imageControls.showHistogram) {
    // If we skipped histogram generation during preview, generate it now
    if (skipHistogram) {
      // Generate histogram from normalizedData for display
      const tempHistogram = new Array(1024).fill(0)
      for (let i = 0; i < normalizedData.length; i += scale) {
        const value = normalizedData[i]
        // Apply adjustments (simplified for histogram only)
        let adjusted = value + brightnessFactor
        adjusted = 128 + (adjusted - 128) * contrastFactor
        adjusted = Math.min(255, Math.max(0, Math.round(adjusted)))
        const histogramBin = Math.min(1024 - 1, Math.floor((adjusted / 255) * 1024))
        tempHistogram[histogramBin]++
      }
      histogramData.value = tempHistogram
    }

    drawHistogram()
  }

  console.timeEnd('Apply adjustments')
}

// Update processFullImage to capture original histogram
function processFullImage(processedData: any) {
  const width = processedData.width
  const height = processedData.height

  // Use the processed pixel data
  const pixelData = processedData.pixelData
  const bitsPerPixel = processedData.bitsPerPixel
  const transmissionElementType = processedData.transmissionElementType
  console.log(
    'Bits per pixel:',
    bitsPerPixel,
    'Element type:',
    transmissionElementType,
    'Data type:',
    pixelData.constructor.name
  )

  // Determine value range for proper normalization
  let minVal = Infinity
  let maxVal = -Infinity

  // Check data type for array access method
  const isTypedArray = ArrayBuffer.isView(pixelData) && !(pixelData instanceof DataView)

  // First pass to find min/max for proper normalization
  if (bitsPerPixel > 8 && isTypedArray) {
    const length = Math.min(width * height, (pixelData as unknown as any[]).length)
    for (let i = 0; i < length; i++) {
      const value = (pixelData as unknown as any[])[i]
      if (!isNaN(value)) {
        minVal = Math.min(minVal, value)
        maxVal = Math.max(maxVal, value)
      }
    }

    // Ensure we have a reasonable range
    if (!isFinite(minVal) || !isFinite(maxVal) || maxVal - minVal < 10) {
      // Use theoretical range based on bit depth
      minVal = 0
      maxVal = bitsPerPixel <= 8 ? 255 : bitsPerPixel <= 16 ? 65535 : (1 << 24) - 1
    }

    console.log(`Value range for ${bitsPerPixel}-bit data: min=${minVal}, max=${maxVal}`)
  } else {
    // 8-bit data or non-typed array
    minVal = 0
    maxVal = 255
  }

  // Create normalized image cache (0-255 values)
  const normalizedArray = new Uint8Array(width * height)

  // Create histogram data array with more bins for finer resolution
  const histogramArray = new Array(1024).fill(0)

  // Convert data to normalized 8-bit values and store in cache
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Calculate source index for Alpaca data (column-major order)
      const sourceIdx = x * height + y

      // Target index for our cache (row-major order)
      const targetIdx = y * width + x

      // Get the pixel value, handling different array types
      let pixelValue = 0

      if (sourceIdx < pixelData.length || isTypedArray) {
        pixelValue = pixelData[sourceIdx]

        // Normalize value to 0-255 range
        let normalizedValue
        if (bitsPerPixel > 8) {
          // Handle potential NaN or infinity values
          if (!isFinite(pixelValue)) {
            normalizedValue = 0
          } else {
            // Proper normalization based on actual data range
            normalizedValue = Math.round(((pixelValue - minVal) / (maxVal - minVal)) * 255)
          }
        } else {
          normalizedValue = Math.min(255, Math.max(0, pixelValue))
        }

        // Store in normalized cache
        normalizedArray[targetIdx] = normalizedValue

        // Update histogram with normalized value - scale to our bin count
        const histogramBin = Math.min(1024 - 1, Math.floor((normalizedValue / 255) * 1024))
        histogramArray[histogramBin]++
      }
    }
  }

  // Store the normalized data and dimensions for reuse
  normalizedImageCache.value = {
    width,
    height,
    data: normalizedArray
  }

  // Update histogram data
  histogramData.value = histogramArray

  // IMPORTANT: Store the original histogram data for comparison
  originalHistogramData.value = [...histogramArray]

  // Draw histogram immediately if enabled
  if (imageControls.showHistogram) {
    // Make sure to set a small timeout to ensure the DOM is updated
    setTimeout(() => {
      drawHistogram()
    }, 50)
  }
}

// Update drawHistogram function to show both original and adjusted histograms
function drawHistogram() {
  // Make sure we have histogram data and the canvas element
  if (
    (!histogramData.value || histogramData.value.length === 0) &&
    (!originalHistogramData.value || originalHistogramData.value.length === 0)
  ) {
    console.log('No histogram data available')
    return
  }

  if (!histogramCanvas.value) {
    console.log('Histogram canvas not available yet, will retry')
    // Try again in a moment (Vue might not have updated the DOM)
    setTimeout(drawHistogram, 50)
    return
  }

  const canvas = histogramCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    console.error('Could not get canvas context')
    return
  }

  const width = canvas.width
  const height = canvas.height
  const currentData = histogramData.value || []
  const originalData = originalHistogramData.value || []

  // Apply smoothing to reduce noise in high-resolution histogram for both datasets
  const smoothedCurrent = smoothHistogram(currentData)
  const smoothedOriginal = smoothHistogram(originalData)

  // Clear canvas
  ctx.clearRect(0, 0, width, height)

  // Find maximum value for scaling (consider both datasets)
  const maxCurrentValue = Math.max(...smoothedCurrent)
  const maxOriginalValue = Math.max(...smoothedOriginal)
  const maxValue = Math.max(maxCurrentValue, maxOriginalValue)

  if (maxValue === 0) {
    console.log('Histogram is empty (all values are 0)')
    return
  }

  // Draw original histogram first (in a different color)
  if (originalData.length > 0) {
    drawHistogramCurve(
      ctx,
      smoothedOriginal,
      maxValue,
      width,
      height,
      'rgba(173, 216, 230, 0.5)', // Light blue fill
      '#1E90FF' // Dodger blue stroke
    )
  }

  // Draw current histogram on top
  if (currentData.length > 0) {
    drawHistogramCurve(
      ctx,
      smoothedCurrent,
      maxValue,
      width,
      height,
      'rgba(76, 175, 80, 0.3)', // Green fill (original color)
      '#4CAF50' // Green stroke (original color)
    )
  }

  // Add a legend with better responsive sizing
  addHistogramLegend(ctx, width, height)
}

// Helper function to smooth histogram data
function smoothHistogram(data: any[]) {
  if (!data || data.length === 0) return []

  const smoothedData = new Array(data.length)
  const smoothingRadius = 3 // Adjust this value for more/less smoothing

  // Simple moving average for smoothing
  for (let i = 0; i < data.length; i++) {
    let sum = 0
    let count = 0
    for (
      let j = Math.max(0, i - smoothingRadius);
      j <= Math.min(data.length - 1, i + smoothingRadius);
      j++
    ) {
      sum += data[j]
      count++
    }
    smoothedData[i] = sum / count
  }

  return smoothedData
}

// Helper function to draw a histogram curve
function drawHistogramCurve(
  ctx: any,
  data: any[],
  maxValue: any,
  width: any,
  height: any,
  fillColor: any,
  strokeColor: any
) {
  ctx.beginPath()
  ctx.strokeStyle = strokeColor
  ctx.fillStyle = fillColor
  ctx.lineWidth = 1

  // Start at bottom left
  ctx.moveTo(0, height)

  // Draw curve with points
  for (let i = 0; i < data.length; i++) {
    const x = (i / data.length) * width
    const y = height - (data[i] / maxValue) * height
    ctx.lineTo(x, y)
  }

  // Complete the path to the bottom right
  ctx.lineTo(width, height)
  ctx.closePath()

  // Fill and stroke
  ctx.fill()
  ctx.stroke()
}

// Helper function to add a legend with better responsive sizing
function addHistogramLegend(ctx: any, width: any, height: any) {
  // Use a fixed percentage approach that's more stable
  const legendWidth = Math.min(Math.max(80, width * 0.2), 150) // Between 80-150px, 20% of width
  const legendHeight = Math.min(Math.max(36, height * 0.2), 60) // Between 36-60px, 20% of height

  // Fixed minimum sizes regardless of canvas dimensions
  const fontSize = Math.min(12, Math.max(9, height * 0.06))
  const boxWidth = Math.min(15, Math.max(8, legendWidth * 0.1))
  const boxHeight = Math.min(8, Math.max(4, legendHeight * 0.15))

  // Position legend with fixed padding
  const padding = 5
  const xPos = width - legendWidth - padding
  const yPos = padding

  // Clear the area where the legend will be drawn (in case of overlapping elements)
  ctx.clearRect(xPos - 1, yPos - 1, legendWidth + 2, legendHeight + 2)

  // Get the current color scheme (light or dark)
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches

  // Legend background with stronger opacity
  ctx.fillStyle = isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(240, 240, 240, 0.9)'
  ctx.fillRect(xPos, yPos, legendWidth, legendHeight)
  ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.5)'
  ctx.lineWidth = 1
  ctx.strokeRect(xPos, yPos, legendWidth, legendHeight)

  // Set font with explicit size
  ctx.font = `${fontSize}px sans-serif`

  // Calculated positions for items in the legend
  const textPadding = 5
  const itemPadding = legendHeight * 0.25

  // First legend item (Original)
  const y1 = yPos + itemPadding + fontSize
  ctx.fillStyle = '#1E90FF' // Blue
  ctx.fillRect(xPos + padding, y1 - fontSize * 0.8, boxWidth, boxHeight)
  ctx.fillStyle = isDarkMode ? 'white' : '#333333'
  ctx.fillText('Original', xPos + padding + boxWidth + textPadding, y1)

  // Second legend item (Adjusted)
  const y2 = y1 + legendHeight * 0.4
  ctx.fillStyle = '#4CAF50' // Green
  ctx.fillRect(xPos + padding, y2 - fontSize * 0.8, boxWidth, boxHeight)
  ctx.fillStyle = isDarkMode ? 'white' : '#333333'
  ctx.fillText('Adjusted', xPos + padding + boxWidth + textPadding, y2)
}

// Watch for changes in image controls - we only need this for histogram toggle now
// since other controls are handled by applyPendingControls
watch(
  () => imageControls.showHistogram,
  (newValue) => {
    try {
      console.log('Histogram visibility changed:', newValue)
      if (newValue && lastProcessedImage.value) {
        drawHistogram()
      }
    } catch (error) {
      console.error('Error updating histogram visibility:', error)
    }
  }
)

function onConnectButtonClick() {
  console.log('Connect button clicked - explicit handler')
  console.log('Current connection state:', isConnected.value)

  if (isConnected.value) {
    disconnectCamera()
  } else {
    connectCamera()
  }
}

// Add a polling interval ref
const dataPollingInterval = ref<number | null>(null)

// Add function to start data polling
function startDataPolling() {
  // Clear any existing interval first
  stopDataPolling()

  // Only start polling if camera is connected
  if (isConnected.value) {
    console.log('Starting camera data polling')
    dataPollingInterval.value = window.setInterval(async () => {
      if (isConnected.value) {
        await fetchData()
      } else {
        // Stop polling if camera becomes disconnected
        stopDataPolling()
      }
    }, 2000) // Poll every 2 seconds
  }
}

// Add function to stop data polling
function stopDataPolling() {
  if (dataPollingInterval.value) {
    console.log('Stopping camera data polling')
    clearInterval(dataPollingInterval.value)
    dataPollingInterval.value = null
  }
}

async function connectCamera() {
  if (isConnecting.value) return

  try {
    isConnecting.value = true
    console.log('Attempting to connect to camera:', props.deviceNum)

    // First check if the camera is already connected
    const stateResp = await axios.get(`/api/v1/camera/${props.deviceNum}/connected`)
    console.log('Current connection state:', stateResp.data.Value)

    if (stateResp.data.Value === true) {
      console.log('Camera already connected')
      updateConnectionState(true)
      await fetchData() // Refresh camera data as we're already connected

      startDataPolling() // Start polling after connecting
      return
    }

    // Connect to the camera using form-encoded data with additional Connected parameter
    const formData = new URLSearchParams()
    formData.append('Value', 'true')
    formData.append('Connected', 'true') // Additional required parameter
    formData.append('ClientID', '1')
    formData.append('ClientTransactionID', '1')

    await axios.put(`/api/v1/camera/${props.deviceNum}/connected`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    console.log('Connection request sent')

    // Verify connection
    const verifyResp = await axios.get(`/api/v1/camera/${props.deviceNum}/connected`)
    console.log('Verified connection state:', verifyResp.data.Value)

    if (verifyResp.data.Value === true) {
      // Update local state and emit to parent
      updateConnectionState(true)
      await fetchData() // Refresh camera data after connection
      console.log('Camera data fetched successfully')

      // Ensure controls are up to date after loading camera data
      updateControlsFromCameraData()

      // Specifically fetch all camera properties
      await fetchCameraState()
      await fetchPixelSizeX()
      await fetchPixelSizeY()
      await fetchReadoutModes()
      await fetchReadoutMode()
      await fetchNumX()
      await fetchNumY()
      await fetchStartX() // Add this line
      await fetchStartY() // Add this line
      await fetchReadoutModes()
      await fetchReadoutMode()

      // Fetch additional camera specifications
      await fetchCameraXSize()
      await fetchCameraYSize()
      await fetchSensorInfo()
      await fetchSensorType() // Add this line
      // Start data polling
      startDataPolling()
    } else {
      throw new Error('Camera connection verification failed')
    }
  } catch (error) {
    console.error('Error connecting to camera:', error)
    // Try to get more detailed error information
    try {
      const errorResp = await axios.get(`/api/v1/camera/${props.deviceNum}/connected`)
      console.log('Error state check:', errorResp.data)
    } catch (e) {
      console.error('Error checking connection state:', e)
    }
  } finally {
    isConnecting.value = false
  }
}

async function disconnectCamera() {
  if (isConnecting.value) return

  try {
    isConnecting.value = true
    console.log('Attempting to disconnect from camera:', props.deviceNum)

    // Stop data polling immediately when disconnecting
    stopDataPolling()

    // First check if the camera is connected
    const stateResp = await axios.get(`/api/v1/camera/${props.deviceNum}/connected`)
    console.log('Current connection state:', stateResp.data.Value)

    // Disconnect from the camera using form-encoded data with additional Connected parameter
    const formData = new URLSearchParams()
    formData.append('Value', 'false')
    formData.append('Connected', 'false') // Additional required parameter
    formData.append('ClientID', '1')
    formData.append('ClientTransactionID', '1')

    await axios.put(`/api/v1/camera/${props.deviceNum}/connected`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    console.log('Disconnection request sent')

    // Verify disconnection
    const verifyResp = await axios.get(`/api/v1/camera/${props.deviceNum}/connected`)
    console.log('Verified connection state:', verifyResp.data.Value)

    if (verifyResp.data.Value === false) {
      // Update local state and emit to parent
      updateConnectionState(false)
      // Clear camera data on disconnect
      Object.keys(cameraData).forEach((key) => delete cameraData[key])
      cameraData.previewImage = null
      histogramData.value = []
      console.log('Camera disconnected successfully')
    } else {
      throw new Error('Camera disconnection verification failed')
    }
  } catch (error) {
    console.error('Error disconnecting from camera:', error)
    // Try to get more detailed error information
    try {
      const errorResp = await axios.get(`/api/v1/camera/${props.deviceNum}/connected`)
      console.log('Error state check:', errorResp.data)
    } catch (e) {
      console.error('Error checking connection state:', e)
    }
  } finally {
    isConnecting.value = false
  }
}

// Function to check the actual connection state from API
async function checkConnectionState() {
  try {
    const stateResp = await axios.get(`/api/v1/camera/${props.deviceNum}/connected`)
    console.log('API connection state:', stateResp.data.Value)

    // Update local state and emit if different from current
    if (isConnected.value !== stateResp.data.Value) {
      updateConnectionState(stateResp.data.Value)
    }

    return stateResp.data.Value
  } catch (error) {
    console.error('Error checking connection state:', error)
    // If we can't connect to check, assume disconnected
    if (isConnected.value) {
      updateConnectionState(false)
    }
    return false
  }
}

// Ensure histogram canvas properly handles resize
function setupHistogramResizing() {
  if (!histogramCanvas.value) return

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target === histogramCanvas.value) {
        // Update canvas dimensions if they don't match the display size
        const canvas = histogramCanvas.value
        const displayWidth = canvas.clientWidth
        const displayHeight = canvas.clientHeight

        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
          canvas.width = displayWidth
          canvas.height = displayHeight
          // Redraw histogram with new dimensions
          drawHistogram()
        }
      }
    }
  })

  resizeObserver.observe(histogramCanvas.value)

  // Store observer for cleanup
  if (typeof window !== 'undefined') {
    ;(window as any).histogramResizeObserver = resizeObserver
  }
}

// Update onMounted to initialize the resize observer
onMounted(async () => {
  console.log('Camera panel mounted for device:', props.deviceNum)

  // Set up histogram resize handling
  setTimeout(() => {
    setupHistogramResizing()
  }, 100)

  // Set up periodic connection check (every 30 seconds)
  const connectionCheckIntervalId = setInterval(async () => {
    await checkConnectionState()
  }, 30000)

  // Store on window for access in onUnmounted
  if (typeof window !== 'undefined') {
    ;(window as any).connectionCheckIntervalId = connectionCheckIntervalId
  }

  // Store intervalId for cleanup in onUnmounted
  pendingControls.contrast = imageControls.contrast
  pendingControls.brightness = imageControls.brightness
  pendingControls.gamma = imageControls.gamma
  pendingControls.colorMap = imageControls.colorMap

  // Get actual connection state from API
  const apiConnected = await checkConnectionState()
  console.log('Initial API connection state:', apiConnected)

  // Only fetch data if connected
  if (apiConnected) {
    await fetchData()
    // Start polling if connected
    startDataPolling()
  }
})

// Update onUnmounted to clean up polling interval
onUnmounted(() => {
  console.log('Camera panel unmounted for device:', props.deviceNum)

  // Stop data polling
  stopDataPolling()

  // Clear any pending timeouts or intervals
  if (renderTimeout) {
    clearTimeout(renderTimeout)
    renderTimeout = null
  }

  // Clear the connection check interval
  if (typeof window !== 'undefined' && (window as any).connectionCheckIntervalId) {
    clearInterval((window as any).connectionCheckIntervalId)
    ;(window as any).connectionCheckIntervalId = null
  }

  // Clean up resize observer
  if (typeof window !== 'undefined' && (window as any).histogramResizeObserver) {
    ;(window as any).histogramResizeObserver.disconnect()(window as any).histogramResizeObserver =
      null
  }
})

function processImageBytes(data: any) {
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
    return { width: 0, height: 0, bytesPerPixel: 1, pixelData: [] }
  }

  // Determine image dimensions
  const width = dimension1
  const height = dimension2

  // Determine original bit depth and transmission bit depth
  let origBitsPerPixel = 8
  let transmissionBytesPerPixel = 1
  let pixelData

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
      console.warn('Unknown transmission element type')
      transmissionBytesPerPixel = 1
      pixelData = new Uint8Array(data, dataStart) // Default to 8-bit
      break
    case 6: // Byte
      transmissionBytesPerPixel = 1
      pixelData = new Uint8Array(data, dataStart)
      break
    case 1: // Int16
      console.log('this is 2 bytes per pixel (Int16)!')
      transmissionBytesPerPixel = 2
      // Create a typed array view directly into the buffer
      pixelData = new Int16Array(data, dataStart)
      break
    case 8: // UInt16
      console.log('this is 2 bytes per pixel (UInt16)!')
      transmissionBytesPerPixel = 2
      // Create a typed array view directly into the buffer
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
    case 7: // Int64
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
      return { width: 0, height: 0, bytesPerPixel: 1, pixelData: [] }
  }

  // Determine if this is monochrome or color based on rank and dimension3
  let imageType = 'monochrome'
  if (rank === 3 && dimension3 === 3) {
    imageType = 'color'
  }

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

// Define separate handler methods instead of inline functions
function handleContrastInput(e: any) {
  if (e && typeof e === 'object' && e.target) {
    pendingControls.contrast = Number(e.target.value)
  } else {
    pendingControls.contrast = Number(e)
  }
  previewScaleFactor.value = 4
  applyPendingControls()
}

function handleContrastChange(e: any) {
  if (e && typeof e === 'object' && e.target) {
    pendingControls.contrast = Number(e.target.value)
  } else {
    pendingControls.contrast = Number(e)
  }
  applyPendingControls()
  debouncedFinalRender()
}

function handleBrightnessInput(e: any) {
  if (e && typeof e === 'object' && e.target) {
    pendingControls.brightness = Number(e.target.value)
  } else {
    pendingControls.brightness = Number(e)
  }
  previewScaleFactor.value = 4
  applyPendingControls()
}

function handleBrightnessChange(e: any) {
  if (e && typeof e === 'object' && e.target) {
    pendingControls.brightness = Number(e.target.value)
  } else {
    pendingControls.brightness = Number(e)
  }
  applyPendingControls()
  debouncedFinalRender()
}

function handleGammaInput(e: any) {
  if (e && typeof e === 'object' && e.target) {
    pendingControls.gamma = Number(e.target.value)
  } else {
    pendingControls.gamma = Number(e)
  }
  previewScaleFactor.value = 4
  applyPendingControls()
}

function handleGammaChange(e: any) {
  if (e && typeof e === 'object' && e.target) {
    pendingControls.gamma = Number(e.target.value)
  } else {
    pendingControls.gamma = Number(e)
  }
  applyPendingControls()
  debouncedFinalRender()
}

function handleColorMapChange(e: any) {
  if (e && typeof e === 'object' && e.target) {
    pendingControls.colorMap = e.target.value as 'grayscale' | 'heat' | 'viridis' | 'plasma'
  } else {
    pendingControls.colorMap = e as 'grayscale' | 'heat' | 'viridis' | 'plasma'
  }
  applyPendingControls()
  debouncedFinalRender()
}

// Add a reset function for image controls
function resetImageControls() {
  // Reset to default values
  pendingControls.contrast = 1.0
  pendingControls.brightness = 0
  pendingControls.gamma = 1.0
  pendingControls.colorMap = 'grayscale'

  // Apply the reset values
  applyPendingControls()

  // Render the final image with reset values
  debouncedFinalRender()
}

// Add a showAdvancedSettings ref for the toggle
const showAdvancedSettings = ref(false)

// Add more camera capability refs
const fastReadout = ref(false)
const targetTemperature = ref(0)

// Add additional setter functions
async function setFastReadout(newValue: any) {
  if (!isConnected.value) return

  try {
    console.log('Setting fast readout to:', newValue)
    const fastReadoutForm = new URLSearchParams()
    fastReadoutForm.append('FastReadout', newValue.toString())
    fastReadoutForm.append('ClientID', '1')
    fastReadoutForm.append('ClientTransactionID', '1')

    await axios.put(`/api/v1/camera/${props.deviceNum}/fastreadout`, fastReadoutForm, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    // Update local value after successful API call
    cameraData.fastreadout = newValue
  } catch (error) {
    console.error('Error setting fast readout:', error)
  }
}

async function setTemperature(newValue: any) {
  if (!isConnected.value) return

  try {
    console.log('Setting target temperature to:', newValue)
    const tempForm = new URLSearchParams()
    tempForm.append('SetCCDTemperature', newValue.toString())
    tempForm.append('ClientID', '1')
    tempForm.append('ClientTransactionID', '1')

    await axios.put(`/api/v1/camera/${props.deviceNum}/setccdtemperature`, tempForm, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    // Update local value after successful API call
    cameraData.setccdtemperature = Number(newValue)
  } catch (error) {
    console.error('Error setting target temperature:', error)
  }
}

// Add max binning computed properties
const maxBinX = computed(() => {
  // MaxBinX is the standard property name, fallback to reasonable value
  return Number(getPropertyValue('maxbinx', getPropertyValue('MaxBinX', 4)))
})

const maxBinY = computed(() => {
  // MaxBinY is the standard property name, fallback to reasonable value
  return Number(getPropertyValue('maxbiny', getPropertyValue('MaxBinY', 4)))
})

// Then update the binning input template to use these properties
// <input
//   type="number"
//   v-model="binning.x"
//   :min="1"
//   :max="maxBinX"
//   :disabled="!canAdjustExposure"
//   @change="setBinningX(binning.x)"
// />

// Add subframe control refs
const startX = ref(0)
const startY = ref(0)
const numX = ref(0)
const numY = ref(0)

// Add computed properties for max values
const maxStartX = computed(() => {
  // Max startX is cameraXSize - numX
  const cameraXSize = Number(getPropertyValue('cameraxsize', getPropertyValue('CameraXSize', 1000)))
  return Math.max(0, cameraXSize - numX.value)
})

const maxStartY = computed(() => {
  // Max startY is cameraYSize - numY
  const cameraYSize = Number(getPropertyValue('cameraysize', getPropertyValue('CameraYSize', 1000)))
  return Math.max(0, cameraYSize - numY.value)
})

const maxNumX = computed(() => {
  // Max numX is cameraXSize - startX
  const cameraXSize = Number(getPropertyValue('cameraxsize', getPropertyValue('CameraXSize', 1000)))
  return Math.max(1, cameraXSize - startX.value)
})

const maxNumY = computed(() => {
  // Max numY is cameraYSize - startY
  const cameraYSize = Number(getPropertyValue('cameraysize', getPropertyValue('CameraYSize', 1000)))
  return Math.max(1, cameraYSize - startY.value)
})

// Add setter functions
async function setStartX(newValue: any) {
  if (!isConnected.value) return

  try {
    console.log('Setting startX to:', newValue)
    const startXForm = new URLSearchParams()
    startXForm.append('StartX', newValue.toString())
    startXForm.append('ClientID', '1')
    startXForm.append('ClientTransactionID', '1')

    await axios.put(`/api/v1/camera/${props.deviceNum}/startx`, startXForm, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    // Update local value after successful API call
    cameraData.startX = Number(newValue)
  } catch (error) {
    console.error('Error setting startX:', error)
  }
}

async function setStartY(newValue: any) {
  if (!isConnected.value) return

  try {
    console.log('Setting startY to:', newValue)
    const startYForm = new URLSearchParams()
    startYForm.append('StartY', newValue.toString())
    startYForm.append('ClientID', '1')
    startYForm.append('ClientTransactionID', '1')

    await axios.put(`/api/v1/camera/${props.deviceNum}/starty`, startYForm, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    // Update local value after successful API call
    cameraData.startY = Number(newValue)
  } catch (error) {
    console.error('Error setting startY:', error)
  }
}

async function setNumX(newValue: any) {
  if (!isConnected.value) return

  try {
    console.log('Setting numX to:', newValue)
    const numXForm = new URLSearchParams()
    numXForm.append('NumX', newValue.toString())
    numXForm.append('ClientID', '1')
    numXForm.append('ClientTransactionID', '1')

    await axios.put(`/api/v1/camera/${props.deviceNum}/numx`, numXForm, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    // Update local value after successful API call
    cameraData.numX = Number(newValue)
  } catch (error) {
    console.error('Error setting numX:', error)
  }
}

async function setNumY(newValue: any) {
  if (!isConnected.value) return

  try {
    console.log('Setting numY to:', newValue)
    const numYForm = new URLSearchParams()
    numYForm.append('NumY', newValue.toString())
    numYForm.append('ClientID', '1')
    numYForm.append('ClientTransactionID', '1')

    await axios.put(`/api/v1/camera/${props.deviceNum}/numy`, numYForm, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    // Update local value after successful API call
    cameraData.numY = Number(newValue)
  } catch (error) {
    console.error('Error setting numY:', error)
  }
}

// Function to fetch camera state
async function fetchCameraState() {
  if (!isConnected.value) return

  try {
    console.log('Fetching camera state')
    const response = await axios.get(`/api/v1/camera/${props.deviceNum}/camerastate`, {
      params: {
        ClientID: '1',
        ClientTransactionID: '1'
      }
    })

    if (response.data && response.data.Value !== undefined) {
      console.log('Received camera state:', response.data.Value)
      cameraData.CameraState = response.data.Value
    }
  } catch (error) {
    console.error('Error fetching camera state:', error)
  }
}

// Function to fetch pixel size X
async function fetchPixelSizeX() {
  if (!isConnected.value) return

  try {
    console.log('Fetching pixel size X')
    const response = await axios.get(`/api/v1/camera/${props.deviceNum}/pixelsizex`, {
      params: {
        ClientID: '1',
        ClientTransactionID: '1'
      }
    })

    if (response.data && response.data.Value !== undefined) {
      console.log('Received pixel size X:', response.data.Value)
      // Validate that the value is a number before storing it
      const value = response.data.Value
      const parsedValue = parseFloat(String(value))
      if (!isNaN(parsedValue)) {
        cameraData.PixelSizeX = parsedValue
      } else {
        console.warn('Received non-numeric pixel size X:', value)
        cameraData.PixelSizeX = 0 // Use a default value
      }
    }
  } catch (error) {
    console.error('Error fetching pixel size X:', error)
  }
}

// Function to fetch pixel size Y
async function fetchPixelSizeY() {
  if (!isConnected.value) return

  try {
    console.log('Fetching pixel size Y')
    const response = await axios.get(`/api/v1/camera/${props.deviceNum}/pixelsizey`, {
      params: {
        ClientID: '1',
        ClientTransactionID: '1'
      }
    })

    if (response.data && response.data.Value !== undefined) {
      console.log('Received pixel size Y:', response.data.Value)
      // Validate that the value is a number before storing it
      const value = response.data.Value
      const parsedValue = parseFloat(String(value))
      if (!isNaN(parsedValue)) {
        cameraData.PixelSizeY = parsedValue
      } else {
        console.warn('Received non-numeric pixel size Y:', value)
        cameraData.PixelSizeY = 0 // Use a default value
      }
    }
  } catch (error) {
    console.error('Error fetching pixel size Y:', error)
  }
}

// Add a computed property to map camera state values to human-readable text
const cameraStateText = computed(() => {
  // Get the camera state value, default to undefined if not available
  const stateValue = getPropertyValue('CameraState', undefined)

  if (stateValue === undefined) return 'Unknown'

  // Convert to number to ensure proper comparison
  const stateNum = Number(stateValue)

  switch (stateNum) {
    case 0:
      return 'Idle'
    case 1:
      return 'Waiting'
    case 2:
      return 'Exposing'
    case 3:
      return 'Reading'
    case 4:
      return 'Downloading'
    case 5:
      return 'Error'
    default:
      return `Unknown (${stateNum})`
  }
})

// Add a computed property for camera state class to show appropriate color
const cameraStateClass = computed(() => {
  const stateValue = getPropertyValue('CameraState', undefined)
  if (stateValue === undefined) return 'state-unknown'

  const stateNum = Number(stateValue)
  switch (stateNum) {
    case 0:
      return 'state-idle'
    case 1:
      return 'state-waiting'
    case 2:
      return 'state-exposing'
    case 3:
      return 'state-reading'
    case 4:
      return 'state-downloading'
    case 5:
      return 'state-error'
    default:
      return 'state-unknown'
  }
})

// Add a computed property for camera state description
const cameraStateDescription = computed(() => {
  const stateValue = getPropertyValue('CameraState', undefined)
  if (stateValue === undefined) return 'Camera state is unknown'

  const stateNum = Number(stateValue)
  switch (stateNum) {
    case 0:
      return 'Camera is idle and available to start exposure'
    case 1:
      return 'Exposure started but waiting (shutter, trigger, filter wheel, etc.)'
    case 2:
      return 'Exposure currently in progress'
    case 3:
      return 'Sensor array is being read out (digitized)'
    case 4:
      return 'Downloading data to host computer'
    case 5:
      return 'Camera error condition serious enough to prevent operations'
    default:
      return `Unknown state (${stateNum})`
  }
})

function formatBitDepth(maxADU: any): string {
  // Convert to number and handle invalid values
  const maxValue = Number(maxADU)
  if (isNaN(maxValue) || maxValue <= 0) return 'Unknown'

  // Calculate bit depth (log base 2 of maxADU + 1)
  // For example, 8-bit: 2^8 = 256, maxADU = 255
  const bitDepth = Math.log2(maxValue + 1)

  // Round to nearest integer for standard bit depths
  const roundedBitDepth = Math.round(bitDepth)

  // Return formatted bit depth
  return `${roundedBitDepth}`
}

// Add image history array to store the last 5 images
const imageHistory = ref<ImageHistoryItem[]>([])
const showImageHistory = ref(false)
const selectedHistoryImage = ref<ImageHistoryItem | null>(null)

// Function to display a history image
function displayHistoryImage(historyItem: ImageHistoryItem) {
  selectedHistoryImage.value = historyItem
  cameraData.previewImage = historyItem.fullImage
}

// Function to go back to live view
function returnToLiveView() {
  selectedHistoryImage.value = null
  if (lastProcessedImage.value) {
    displayProcessedImage(lastProcessedImage.value, false)
  }
}

// Add these new fetch functions after the other fetch functions (around line 2080-2100)
async function fetchNumX() {
  if (!isConnected.value) return

  try {
    console.log('Fetching NumX value')
    const response = await axios.get(`/api/v1/camera/${props.deviceNum}/numx`, {
      params: {
        ClientID: '1',
        ClientTransactionID: '1'
      }
    })

    if (response.data && response.data.Value !== undefined) {
      console.log('Received NumX value:', response.data.Value)
      cameraData.numX = Number(response.data.Value)
      numX.value = Number(response.data.Value)
    }
  } catch (error) {
    console.error('Error fetching NumX:', error)
  }
}

async function fetchNumY() {
  if (!isConnected.value) return

  try {
    console.log('Fetching NumY value')
    const response = await axios.get(`/api/v1/camera/${props.deviceNum}/numy`, {
      params: {
        ClientID: '1',
        ClientTransactionID: '1'
      }
    })

    if (response.data && response.data.Value !== undefined) {
      console.log('Received NumY value:', response.data.Value)
      cameraData.numY = Number(response.data.Value)
      numY.value = Number(response.data.Value)
    }
  } catch (error) {
    console.error('Error fetching NumY:', error)
  }
}

// Add these new fetch functions after fetchNumY
async function fetchStartX() {
  if (!isConnected.value) return

  try {
    console.log('Fetching StartX value')
    const response = await axios.get(`/api/v1/camera/${props.deviceNum}/startx`, {
      params: {
        ClientID: '1',
        ClientTransactionID: '1'
      }
    })

    if (response.data && response.data.Value !== undefined) {
      console.log('Received StartX value:', response.data.Value)
      cameraData.startX = Number(response.data.Value)
      startX.value = Number(response.data.Value)
    }
  } catch (error) {
    console.error('Error fetching StartX:', error)
  }
}

async function fetchStartY() {
  if (!isConnected.value) return

  try {
    console.log('Fetching StartY value')
    const response = await axios.get(`/api/v1/camera/${props.deviceNum}/starty`, {
      params: {
        ClientID: '1',
        ClientTransactionID: '1'
      }
    })

    if (response.data && response.data.Value !== undefined) {
      console.log('Received StartY value:', response.data.Value)
      cameraData.startY = Number(response.data.Value)
      startY.value = Number(response.data.Value)
    }
  } catch (error) {
    console.error('Error fetching StartY:', error)
  }
}

// Add a function to convert sensor type enum to descriptive text
function sensorTypeToString(typeValue: any): string {
  if (typeValue === undefined || typeValue === null) return 'Unknown'

  // Convert to number for comparison if it's a string
  const typeNum = typeof typeValue === 'string' ? parseInt(typeValue, 10) : typeValue

  // Return descriptive text based on enum value
  switch (typeNum) {
    case 0:
      return 'Monochrome (Single-plane)'
    case 1:
      return 'Color (Multiple-plane)'
    case 2:
      return 'RGGB (Bayer matrix)'
    case 3:
      return 'CMYG (Bayer matrix)'
    case 4:
      return 'CMYG2 (Bayer matrix)'
    case 5:
      return 'LRGB (Bayer matrix)'
    default:
      return `Unknown (${typeValue})`
  }
}
</script>

<template>
  <PanelComponent :panel-name="`Camera ${deviceNum}`">
    <div class="camera-panel">
      <div class="status-bar">
        <span
          class="status-indicator"
          :class="{ 'status-connected': isConnected, 'status-disconnected': !isConnected }"
        >
          {{ isConnected ? 'Connected' : 'Disconnected' }}
        </span>
        <span
          v-if="getPropertyValue('CameraState') !== undefined"
          class="camera-state"
          :class="cameraStateClass"
          :title="cameraStateDescription"
        >
          State: {{ cameraStateText }}
        </span>
        <span v-if="cameraData.percentcompleted !== undefined" class="exposure-progress">
          {{ Math.round(Number(cameraData.percentcompleted)) }}%
        </span>
        <button
          class="connect-button"
          :class="{ connected: isConnected }"
          @click="onConnectButtonClick"
          type="button"
        >
          {{ isConnecting ? 'Connecting...' : isConnected ? 'Disconnect' : 'Connect' }}
        </button>
      </div>

      <div class="panel-layout">
        <div class="camera-content">
          <div class="preview-container">
            <div v-if="previewImage" class="preview-image">
              <div class="image-wrapper">
                <img :src="previewImage" alt="Camera preview" />
              </div>
            </div>
            <div v-else class="preview-placeholder">No image available</div>
          </div>

          <!-- Histogram as a separate widget -->
          <div v-if="imageControls.showHistogram" class="histogram-widget">
            <h3>Histogram</h3>
            <canvas ref="histogramCanvas" class="histogram-canvas"></canvas>
          </div>

          <div class="controls-container">
            <div class="control-group">
              <div class="group-header">
                <h3>Image Processing</h3>
                <button
                  class="reset-button"
                  @click="resetImageControls"
                  :disabled="!canAdjustExposure"
                  title="Reset all adjustments to default values"
                >
                  Reset
                </button>
              </div>
              <div class="control-row">
                <label>Contrast:</label>
                <input
                  type="range"
                  :value="pendingControls.contrast"
                  @input="handleContrastInput"
                  @change="handleContrastChange"
                  min="0.1"
                  max="3"
                  step="0.1"
                  :disabled="!canAdjustExposure"
                />
                <span class="control-value">{{ formattedControls.contrast }}</span>
              </div>
              <div class="control-row">
                <label>Brightness:</label>
                <input
                  type="range"
                  :value="pendingControls.brightness"
                  @input="handleBrightnessInput"
                  @change="handleBrightnessChange"
                  min="-128"
                  max="128"
                  step="1"
                  :disabled="!canAdjustExposure"
                />
                <span class="control-value">{{ formattedControls.brightness }}</span>
              </div>
              <div class="control-row">
                <label>Gamma:</label>
                <input
                  type="range"
                  :value="pendingControls.gamma"
                  @input="handleGammaInput"
                  @change="handleGammaChange"
                  min="0.1"
                  max="3"
                  step="0.1"
                  :disabled="!canAdjustExposure"
                />
                <span class="control-value">{{ formattedControls.gamma }}</span>
              </div>
              <div class="control-row">
                <label>Color Map:</label>
                <select
                  :value="pendingControls.colorMap"
                  @change="handleColorMapChange"
                  :disabled="!canAdjustExposure"
                >
                  <option value="grayscale">Grayscale</option>
                  <option value="heat">Heat</option>
                  <option value="viridis">Viridis</option>
                  <option value="plasma">Plasma</option>
                </select>
              </div>
              <div class="control-row">
                <label>Show Histogram:</label>
                <input
                  type="checkbox"
                  v-model="imageControls.showHistogram"
                  :disabled="!canAdjustExposure"
                />
              </div>
            </div>

            <div class="control-group">
              <h3>Exposure Settings</h3>
              <div class="control-note-block">
                Standard ASCOM camera settings that control image acquisition.
              </div>
              <div class="control-row">
                <label>Exposure Time (s):</label>
                <input
                  type="number"
                  v-model="exposureTime"
                  :min="minExposure"
                  :max="maxExposure"
                  :step="0.1"
                  :disabled="!canAdjustExposure"
                  @change="setExposureTime(exposureTime)"
                />
              </div>
              <div class="control-row">
                <label>Binning:</label>
                <div class="binning-controls">
                  <input
                    type="number"
                    v-model="binning.x"
                    :min="1"
                    :max="maxBinX"
                    :disabled="!canAdjustExposure"
                    @change="setBinningX(binning.x)"
                  />
                  <span>×</span>
                  <input
                    type="number"
                    v-model="binning.y"
                    :min="1"
                    :max="maxBinY"
                    :disabled="!canAdjustExposure"
                    @change="setBinningY(binning.y)"
                  />
                </div>
              </div>
              <div class="control-row" :class="{ 'feature-not-supported': !canAdjustGain }">
                <label>Gain:</label>
                <input
                  type="number"
                  v-model.number="gain"
                  :min="minGain"
                  :max="maxGain"
                  :disabled="!canAdjustExposure || !canAdjustGain"
                  @change="setGain(gain)"
                />
                <span class="control-value">{{ gain }}</span>
                <span v-if="!canAdjustGain" class="not-supported-text">Not supported</span>
              </div>
              <div class="control-row" :class="{ 'feature-not-supported': !canAdjustOffset }">
                <label>Offset:</label>
                <input
                  type="number"
                  v-model.number="offset"
                  :min="minOffset"
                  :max="maxOffset"
                  :disabled="!canAdjustExposure || !canAdjustOffset"
                  @change="setOffset(offset)"
                />
                <span class="control-value">{{ offset }}</span>
                <span v-if="!canAdjustOffset" class="not-supported-text">Not supported</span>
              </div>
            </div>

            <div class="control-group">
              <div class="group-header">
                <h3>Advanced Settings</h3>
                <button
                  class="toggle-button"
                  @click="showAdvancedSettings = !showAdvancedSettings"
                  type="button"
                >
                  {{ showAdvancedSettings ? 'Hide' : 'Show' }}
                </button>
              </div>

              <div v-if="showAdvancedSettings">
                <div class="control-note-block">
                  Additional camera settings that may not be available on all cameras.
                </div>

                <!-- Subframe Controls Section -->
                <div class="subframe-section">
                  <h4>Subframe Settings</h4>
                  <div class="subframe-controls">
                    <div class="subframe-row">
                      <div class="subframe-item">
                        <label>Start X:</label>
                        <input
                          type="number"
                          v-model.number="startX"
                          min="0"
                          :max="maxStartX"
                          :disabled="!canAdjustExposure"
                          @change="setStartX(startX)"
                        />
                      </div>
                      <div class="subframe-item">
                        <label>Start Y:</label>
                        <input
                          type="number"
                          v-model.number="startY"
                          min="0"
                          :max="maxStartY"
                          :disabled="!canAdjustExposure"
                          @change="setStartY(startY)"
                        />
                      </div>
                    </div>
                    <div class="subframe-row">
                      <div class="subframe-item">
                        <label>Width:</label>
                        <input
                          type="number"
                          v-model.number="numX"
                          min="1"
                          :max="maxNumX"
                          :disabled="!canAdjustExposure"
                          @change="setNumX(numX)"
                        />
                      </div>
                      <div class="subframe-item">
                        <label>Height:</label>
                        <input
                          type="number"
                          v-model.number="numY"
                          min="1"
                          :max="maxNumY"
                          :disabled="!canAdjustExposure"
                          @change="setNumY(numY)"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div class="control-row" :class="{ 'feature-not-supported': !canAdjustReadMode }">
                  <label>Read Mode:</label>
                  <select
                    v-model="readMode"
                    @change="(e: any) => setReadMode(e.target.value)"
                    :disabled="!canAdjustExposure || !canAdjustReadMode"
                  >
                    <option v-for="(mode, index) in readModeOptions" :key="index" :value="index">
                      {{ mode }}
                    </option>
                  </select>
                  <span v-if="!canAdjustReadMode" class="not-supported-text">Not supported</span>
                </div>
                <div class="control-row" :class="{ 'feature-not-supported': !canAdjustUSBTraffic }">
                  <label>USB Traffic:</label>
                  <input
                    type="number"
                    v-model.number="usbTraffic"
                    :min="minUSBTraffic"
                    :max="maxUSBTraffic"
                    :disabled="!canAdjustExposure || !canAdjustUSBTraffic"
                    @change="setUSBTraffic(usbTraffic)"
                  />
                  <span class="control-value">{{ usbTraffic }}</span>
                  <span v-if="!canAdjustUSBTraffic" class="not-supported-text">Not supported</span>
                </div>
                <div class="control-row" :class="{ 'feature-not-supported': !hasFastReadout }">
                  <label>Fast Readout:</label>
                  <input
                    type="checkbox"
                    v-model="fastReadout"
                    @change="setFastReadout(fastReadout)"
                    :disabled="!canAdjustExposure || !hasFastReadout"
                  />
                  <span v-if="!hasFastReadout" class="not-supported-text">Not supported</span>
                </div>
                <div class="control-row" :class="{ 'feature-not-supported': !canSetTemperature }">
                  <label>Target Temperature:</label>
                  <input
                    type="number"
                    v-model.number="targetTemperature"
                    min="-20"
                    max="25"
                    step="1"
                    :disabled="!canAdjustExposure || !canSetTemperature"
                    @change="setTemperature(targetTemperature)"
                  />
                  <span class="control-value">{{ targetTemperature }}°C</span>
                  <span v-if="!canSetTemperature" class="not-supported-text">Not supported</span>
                </div>
                <div
                  class="control-row"
                  :class="{
                    'feature-not-supported':
                      !canSetTemperature || cameraData.ccdtemperature === undefined
                  }"
                >
                  <label>Current Temp:</label>
                  <span class="control-value" v-if="cameraData.ccdtemperature !== undefined">
                    {{ Number(cameraData.ccdtemperature).toFixed(1) }}°C
                  </span>
                  <span v-else class="control-value">-</span>
                  <span v-if="cameraData.coolerpower !== undefined" class="control-note">
                    (Power: {{ Math.round(Number(cameraData.coolerpower)) }}%)
                  </span>
                  <span
                    v-if="!canSetTemperature || cameraData.ccdtemperature === undefined"
                    class="not-supported-text"
                    >Not supported</span
                  >
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="camera-controls">
          <h3 class="controls-title">Camera Controls</h3>
          <div class="controls-grid">
            <div
              class="control-button"
              @click="takeImage"
              :class="{ disabled: !isConnected || isExposing }"
              title="Take a single image with current settings"
            >
              <Icon type="camera"></Icon>
              <span class="button-label">Single Shot</span>
            </div>
            <div
              class="control-button"
              @click="toggleContinuousMode"
              :class="{
                disabled: !isConnected,
                active: isContinuousRunning
              }"
              title="Start/stop continuous image capture"
            >
              <Icon type="exposure"></Icon>
              <span class="button-label">{{
                isContinuousRunning ? 'Stop Series' : 'Start Series'
              }}</span>
            </div>
            <div
              class="control-button"
              @click="stopExposure"
              :class="{ disabled: !isConnected || !isExposing }"
              title="Abort current exposure"
            >
              <Icon type="stop"></Icon>
              <span class="button-label">Abort</span>
            </div>
            <div
              class="control-button"
              @click="showImageHistory = !showImageHistory"
              :class="{ active: showImageHistory }"
              title="Show/hide image history"
            >
              <Icon type="history"></Icon>
              <span class="button-label">History</span>
            </div>
          </div>

          <!-- Image History Panel -->
          <div v-if="showImageHistory" class="image-history-panel">
            <h3>
              Image History
              <span class="history-count">({{ imageHistory.length }} of 5)</span>
            </h3>
            <div class="history-items">
              <div v-if="imageHistory.length === 0" class="empty-history">
                No images captured yet
              </div>
              <div
                v-for="(item, index) in imageHistory"
                :key="index"
                class="history-item"
                :class="{ selected: selectedHistoryImage === item }"
                @click="displayHistoryImage(item)"
              >
                <div class="thumbnail">
                  <img :src="item.thumbnail" alt="Captured image" />
                </div>
                <div class="image-info">
                  <div class="image-time">{{ item.timestamp.toLocaleTimeString() }}</div>
                  <div class="image-settings">
                    {{ item.exposureTime.toFixed(2) }}s, Gain: {{ item.gain }}, Bin:
                    {{ item.binning.x }}x{{ item.binning.y }}
                  </div>
                </div>
              </div>
            </div>
            <div v-if="selectedHistoryImage" class="back-to-live">
              <button @click="returnToLiveView">Back to Live View</button>
            </div>
          </div>

          <!-- Add sensor info section -->
          <div class="sensor-info" v-if="isConnected">
            <h3 class="controls-title">Sensor Details</h3>
            <div class="info-grid">
              <div v-if="propertyExists('PixelSizeX')" class="info-item">
                <div class="info-label">Pixel Size</div>
                <div class="info-value">
                  {{
                    getPropertyValue('PixelSizeX')
                      ? parseFloat(String(getPropertyValue('PixelSizeX'))).toFixed(2)
                      : '0.00'
                  }}
                  ×
                  {{
                    getPropertyValue('PixelSizeY')
                      ? parseFloat(String(getPropertyValue('PixelSizeY'))).toFixed(2)
                      : '0.00'
                  }}
                  <span class="info-unit">μm</span>
                </div>
              </div>
              <div
                v-if="propertyExists('CameraXSize') && propertyExists('CameraYSize')"
                class="info-item"
              >
                <div class="info-label">Resolution</div>
                <div class="info-value">
                  {{ getPropertyValue('CameraXSize') }} × {{ getPropertyValue('CameraYSize') }}
                  <span class="info-unit">px</span>
                </div>
              </div>
              <div v-if="propertyExists('SensorName')" class="info-item">
                <div class="info-label">Sensor Model</div>
                <div class="info-value">{{ getPropertyValue('SensorName') }}</div>
              </div>
              <div v-if="propertyExists('SensorType')" class="info-item">
                <div class="info-label">Sensor Type</div>
                <div class="info-value">
                  {{ sensorTypeToString(getPropertyValue('SensorType')) }}
                </div>
              </div>
              <div v-if="propertyExists('ElectronsPerADU')" class="info-item">
                <div class="info-label">Gain Ratio</div>
                <div class="info-value">
                  {{
                    typeof getPropertyValue('ElectronsPerADU') === 'number'
                      ? parseFloat(String(getPropertyValue('ElectronsPerADU'))).toFixed(2)
                      : getPropertyValue('ElectronsPerADU')
                  }}
                  <span class="info-unit">e-/ADU</span>
                </div>
              </div>
              <div v-if="getPropertyValue('MaxADU')" class="info-item">
                <div class="info-label">Dynamic Range</div>
                <div class="info-value">
                  {{ formatBitDepth(getPropertyValue('MaxADU')) }}
                  <span class="info-unit">bit</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </PanelComponent>
</template>

<style scoped>
/* Add CSS variables for text colors that adapt to theme */
:root {
  --text-color: var(--aw-panel-menu-bar-color);
  --text-color-secondary: rgba(var(--aw-panel-menu-bar-color-rgb, 255, 255, 255), 0.7);
}

/* Light mode text colors */
@media (prefers-color-scheme: light) {
  :root {
    --text-color: #333333;
    --text-color-secondary: #555555;
  }
}

.camera-panel {
  position: relative;
  height: 100%;
  padding: 10px;
  color: var(--text-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-layout {
  display: flex;
  gap: 15px;
  position: relative;
  height: calc(100vh - 120px);
  overflow-y: auto;
}

.camera-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 15px;
  overflow-y: auto;
  max-height: 100%;
}

.status-bar {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
  padding: 5px;
  background-color: var(--aw-panel-menu-bar-bg-color);
  border-radius: 4px;
  position: sticky;
  top: 0;
  z-index: 20;
}

.status-indicator {
  font-weight: bold;
}

.camera-state {
  color: var(--text-color);
}

.exposure-progress {
  color: var(--text-color);
}

.preview-container {
  background-color: var(--aw-panel-content-bg-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 4px;
  padding: 10px;
  min-height: 200px;
  height: auto;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: sticky;
  top: 10px;
  overflow: hidden;
  width: 100%;
  z-index: 10;
}

.preview-image {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  max-height: 100%;
}

.image-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  max-height: 80vh;
  overflow: hidden;
}

.preview-image img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
}

.preview-placeholder {
  color: var(--text-color-secondary);
  opacity: 0.7;
}

.controls-container {
  background-color: var(--aw-panel-content-bg-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 4px;
  padding: 10px;
  margin-top: 10px;
}

.control-group {
  margin-bottom: 15px;
}

.control-group h3 {
  margin: 0 0 10px 0;
  color: var(--text-color);
  font-size: 0.9em;
}

.control-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.control-row label {
  width: 120px;
  color: var(--text-color);
}

.control-row input {
  width: 80px;
  padding: 4px;
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 4px;
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--text-color);
}

.control-row input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.binning-controls {
  display: flex;
  align-items: center;
  gap: 5px;
}

.properties-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.property-group {
  background-color: var(--aw-panel-content-bg-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 4px;
  padding: 10px;
}

.group-title {
  margin: 0 0 10px 0;
  padding-bottom: 5px;
  border-bottom: 1px solid var(--aw-panel-border-color);
  color: var(--text-color);
  font-size: 0.9em;
}

.device-properties {
  width: 100%;
  border-collapse: collapse;
}

.device-properties tr,
.device-properties td {
  padding: 0.3em 0.5em;
  border: 1px dashed var(--aw-panel-border-color);
  color: var(--text-color);
}

.property-name {
  color: var(--text-color);
  font-size: 0.9em;
}

.property-value {
  text-align: right;
}

.camera-controls {
  width: 150px;
  background-color: var(--aw-panel-content-bg-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 4px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-self: flex-start;
  position: sticky;
  top: 10px;
  max-height: calc(100vh - 140px);
  overflow-y: auto;
}

.controls-title {
  margin: 0 0 10px 0;
  color: var(--text-color);
  font-size: 0.9em;
  text-align: center;
  padding-bottom: 5px;
  border-bottom: 1px solid var(--aw-panel-border-color);
}

.controls-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.control-button {
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--text-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 4px;
  cursor: pointer;
  padding: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  transition: all 0.2s ease;
}

.control-button:hover {
  background-color: var(--aw-panel-menu-bar-color);
  color: var(--aw-panel-menu-bar-bg-color);
}

.control-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.control-button.active {
  background-color: #4caf50;
  color: white;
  border-color: #45a049;
}

.control-button.active:hover {
  background-color: #45a049;
}

.button-label {
  font-size: 0.8em;
  margin-top: 5px;
}

.status-connected {
  color: #4caf50;
}

.status-disconnected {
  color: #ff4444;
}

.histogram-widget {
  background-color: var(--aw-panel-content-bg-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 4px;
  padding: 10px;
  margin-top: 15px;
  margin-bottom: 15px;
  width: 100%;
  position: relative;
  z-index: 5;
}

.histogram-widget h3 {
  margin: 0 0 10px 0;
  color: var(--text-color);
  font-size: 0.9em;
}

.histogram-canvas {
  width: 100%;
  height: 150px; /* Increase height for better visualization */
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.control-value {
  min-width: 40px;
  text-align: right;
  color: var(--text-color);
}

select {
  padding: 4px;
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 4px;
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--text-color);
}

select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

input[type='range'] {
  flex: 1;
  margin: 0 10px;
}

input[type='checkbox'] {
  margin-left: auto;
}

.connect-button {
  margin-left: auto;
  padding: 4px 12px;
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 4px;
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--text-color);
  cursor: pointer !important;
  transition: all 0.2s ease;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  display: inline-block;
  min-width: 80px;
  text-align: center;
  z-index: 10;
  position: relative;
}

.connect-button:hover {
  background-color: var(--aw-panel-menu-bar-color);
  color: var(--aw-panel-menu-bar-bg-color);
}

.connect-button.connected {
  background-color: #4caf50;
  color: white;
  border-color: #45a049;
}

.connect-button.connected:hover {
  background-color: #45a049;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.group-header h3 {
  margin: 0;
}

.reset-button {
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--text-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 0.8em;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-button:hover {
  background-color: var(--aw-panel-menu-bar-color);
  color: var(--aw-panel-menu-bar-bg-color);
}

.reset-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Add additional styles to ensure all input values are visible */
input[type='number'],
input[type='text'],
.binning-controls span {
  color: var(--text-color);
}

/* Ensure text in the binning controls is visible */
.binning-controls span {
  padding: 0 4px;
}

/* Fix hover states to ensure they work with theme-aware colors */
.control-button:hover,
.reset-button:hover,
.connect-button:hover {
  background-color: var(--aw-panel-menu-bar-color);
  color: var(--aw-panel-menu-bar-bg-color);
}

.toggle-button {
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--text-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 0.8em;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-button:hover {
  background-color: var(--aw-panel-menu-bar-color);
  color: var(--aw-panel-menu-bar-bg-color);
}

.control-note {
  margin-left: 5px;
  color: var(--text-color-secondary);
  font-size: 0.85em;
  font-style: italic;
}

.control-note-block {
  margin-bottom: 10px;
  color: var(--text-color-secondary);
  font-size: 0.85em;
  font-style: italic;
}

.subframe-section {
  margin-bottom: 15px;
}

.subframe-section h4 {
  margin: 5px 0;
  font-size: 0.9em;
  color: var(--text-color);
}

.subframe-controls {
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 4px;
  padding: 8px;
  background-color: rgba(0, 0, 0, 0.05);
}

.subframe-row {
  display: flex;
  gap: 10px;
  margin-bottom: 5px;
}

.subframe-item {
  display: flex;
  align-items: center;
  flex: 1;
}

.subframe-item label {
  width: 60px;
  font-size: 0.9em;
}

.subframe-item input {
  width: 60px;
  padding: 3px;
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 3px;
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--text-color);
}

/* Camera state colors */
.camera-state {
  display: flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  margin-right: 8px;
  font-size: 0.9em;
}

.camera-state::before {
  content: '';
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 5px;
}

.state-idle::before {
  background-color: #4caf50; /* Green */
}

.state-waiting::before {
  background-color: #ffc107; /* Amber */
}

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

.sensor-info {
  margin-top: 20px;
  width: 100%;
  font-size: 0.9em;
  border-top: 1px solid var(--aw-panel-border-color, rgba(255, 255, 255, 0.15));
  padding-top: 15px;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 5px;
}

.info-item {
  display: flex;
  flex-direction: column;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--aw-panel-border-color, rgba(255, 255, 255, 0.1));
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-weight: 600;
  color: var(--text-color-secondary);
  font-size: 0.85em;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  color: var(--text-color);
  word-break: break-word;
  font-weight: 500;
  padding-left: 5px;
}

.info-unit {
  font-size: 0.8em;
  color: var(--text-color-secondary);
}

.not-supported-text {
  font-size: 0.8em;
  margin-left: 5px;
  font-style: italic;
}

.feature-not-supported {
  opacity: 0.85;
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
  padding: 4px;
  border: 1px dashed var(--aw-panel-border-color);
  margin-bottom: 10px;
}

.feature-not-supported label {
  color: var(--text-color-secondary);
}

.feature-not-supported .not-supported-text {
  color: var(--text-color-secondary);
}

/* Image History Styles */
.image-history-panel {
  margin-top: 15px;
  padding: 10px;
  background-color: rgba(0, 0, 0, 0.15);
  border-radius: 6px;
}

.image-history-panel h3 {
  font-size: 14px;
  margin-top: 0;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
}

.history-count {
  font-size: 12px;
  color: #999;
  font-weight: normal;
}

.history-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.empty-history {
  font-size: 12px;
  color: #999;
  text-align: center;
  padding: 10px;
}

.history-item {
  display: flex;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  padding: 5px;
}

.history-item:hover {
  background-color: rgba(30, 30, 30, 0.5);
}

.history-item.selected {
  background-color: rgba(25, 50, 80, 0.6);
  border: 1px solid #48a;
}

.thumbnail {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumbnail img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.image-info {
  flex: 1;
  margin-left: 10px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.image-time {
  font-size: 12px;
  font-weight: bold;
}

.image-settings {
  font-size: 11px;
  color: #ccc;
  margin-top: 4px;
}

.back-to-live {
  text-align: center;
  margin-top: 8px;
}

.back-to-live button {
  background-color: #555;
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  color: white;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
}

.back-to-live button:hover {
  background-color: #777;
}
</style>
