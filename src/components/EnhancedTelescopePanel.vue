<script setup lang="ts">
import EnhancedPanelComponent from './EnhancedPanelComponent.vue'
import Icon from './Icon.vue'
import { onMounted, reactive, ref, computed, watch, onUnmounted } from 'vue'
import axios from 'axios'
import { UIMode } from '@/stores/useUIPreferencesStore'

const props = defineProps({
  panelName: { type: String, required: true },
  connected: { type: Boolean, required: true },
  deviceType: { type: String, required: true },
  deviceId: { type: [String, Number], required: true },
  supportedModes: {
    type: Array as () => UIMode[],
    default: () => [UIMode.OVERVIEW, UIMode.DETAILED, UIMode.FULLSCREEN]
  },
  idx: { type: [String, Number], required: true },
  deviceNum: { type: Number, required: true },
  apiBaseUrl: { type: String, default: '' }
})

const emit = defineEmits(['close', 'configure', 'connect', 'modeChange'])

type TelescopeDataType = Record<string, string | number>
const telescopeData = reactive<TelescopeDataType>({})
const currentMode = ref(UIMode.OVERVIEW)
const trackingEnabled = ref(false)
const slewRateOptions = ['Guide', 'Center', 'Find', 'Max']
const selectedSlewRate = ref('Center')
// Define axis indices and slew rate mapping (degrees per second)
const TelescopeAxes = { Primary: 0, Secondary: 1 }
const slewRateMapping: Record<string, number> = {
  Guide: 0.1,
  Center: 0.5,
  Find: 1.0,
  Max: 2.0
}
const lastError = ref('')
const isSlewing = ref(false)
const rightAscension = ref('00:00:00')
const declination = ref('+00:00:00')
const altitude = ref(0)
const azimuth = ref(0)
// Add connected status handling for a smoother UI
const isConnecting = ref(false)

// More detailed telescope data for DETAILED and FULLSCREEN modes
const detailedData = reactive({
  sideOfPier: 'Unknown',
  siderealTime: '00:00:00',
  targetRightAscension: '00:00:00',
  targetDeclination: '+00:00:00',
  parkingState: 'Unknown',
  trackingRate: 0
})

// Target coordinates for manual input
const targetRA = ref('00:00:00')
const targetDec = ref('+00:00:00')

// Computed values
const connectionStatus = computed(() => (props.connected ? 'Connected' : 'Disconnected'))
const formattedRA = computed(() => rightAscension.value)
const formattedDec = computed(() => declination.value)
const formattedAlt = computed(() => `${altitude.value.toFixed(2)}°`)
const formattedAz = computed(() => `${azimuth.value.toFixed(2)}°`)

// Define tracking rate mapping
const trackingRates: Record<number, string> = {
  0: 'Sidereal (15.041″/sec)',
  1: 'Lunar (14.685″/sec)',
  2: 'Solar (15.0″/sec)',
  3: 'King (15.0369″/sec)'
}

// Available tracking rate options (will be fetched from API)
const availableTrackingRates = ref<number[]>([0, 1, 2, 3])

// Get the API base endpoint
function getApiEndpoint(endpoint: string) {
  const baseUrl = props.apiBaseUrl || `/api/v1/telescope/${props.deviceNum}`
  return `${baseUrl}/${endpoint}`
}

// Fetch telescope data periodically based on the current mode
let dataFetchTimer: number | null = null

function startDataFetching() {
  if (!dataFetchTimer) {
    fetchData() // Fetch immediately

    // Set up interval based on mode - more frequent updates for detailed/fullscreen
    // Reduce polling frequency in overview mode to save resources
    const interval = currentMode.value === UIMode.OVERVIEW ? 5000 : 2000
    dataFetchTimer = window.setInterval(fetchData, interval)
  }
}

function stopDataFetching() {
  if (dataFetchTimer) {
    window.clearInterval(dataFetchTimer)
    dataFetchTimer = null
  }
}

// Handle connection toggle
async function handleConnectionToggle() {
  if (isConnecting.value) return // Prevent multiple rapid connection attempts

  isConnecting.value = true
  emit('connect', !props.connected)

  // Start or stop data fetching based on connection state
  if (!props.connected) {
    startDataFetching()
  } else {
    stopDataFetching()
  }

  // Reset connecting state after a short delay
  setTimeout(() => {
    isConnecting.value = false
  }, 1000)
}

// Handle mode changes
function onModeChange(mode: UIMode) {
  currentMode.value = mode

  // If connected, fetch detailed data when switching to detailed or fullscreen mode
  if (props.connected) {
    if (mode !== UIMode.OVERVIEW) {
      fetchDetailedData()
    }

    // Adjust the data fetching interval based on the new mode
    if (dataFetchTimer) {
      stopDataFetching()
      startDataFetching()
    }
  }
}

// Handle component lifecycle
onMounted(() => {
  if (props.connected) {
    startDataFetching()
    fetchAvailableTrackingRates()
  }
})

watch(
  () => props.connected,
  (newValue) => {
    if (newValue) {
      startDataFetching()
    } else {
      stopDataFetching()
    }
  }
)

// Clean up on component unmount
onUnmounted(() => {
  stopDataFetching()
})

// Fetch basic telescope data
async function fetchData() {
  if (!props.connected) return

  try {
    const response = await axios.get(getApiEndpoint('devicestate'))
    console.log('Telescope data:', response.data)

    // Check if response.data.Value exists and is an array
    if (response.data && response.data.Value && Array.isArray(response.data.Value)) {
      for (let index = 0; index < response.data.Value.length; index++) {
        const item = response.data.Value[index]
        telescopeData[item.Name] = item.Value

        // Handle specific properties
        switch (item.Name) {
          case 'RightAscension':
            rightAscension.value = formatRA(item.Value)
            break
          case 'Declination':
            declination.value = formatDec(item.Value)
            break
          case 'Altitude':
            altitude.value = parseFloat(item.Value)
            break
          case 'Azimuth':
            azimuth.value = parseFloat(item.Value)
            break
          case 'Tracking':
            trackingEnabled.value = item.Value === true || item.Value === 'True'
            break
          case 'SideOfPier':
            detailedData.sideOfPier = item.Value
            break
          case 'SiderealTime':
            detailedData.siderealTime = formatRA(item.Value)
            break
          case 'Slewing':
            isSlewing.value = item.Value === true || item.Value === 'True'
            break
          case 'TrackingRate':
            detailedData.trackingRate = parseInt(item.Value)
            break
        }
      }
    } else {
      console.log('Unexpected API response format:', response.data)
      // Handle the case where the Value property is not an array
      if (response.data && typeof response.data.Value === 'object') {
        // Try to process as a single object
        const data = response.data.Value
        Object.keys(data).forEach((key) => {
          telescopeData[key] = data[key]

          // Handle specific properties
          switch (key) {
            case 'RightAscension':
              rightAscension.value = formatRA(data[key])
              break
            case 'Declination':
              declination.value = formatDec(data[key])
              break
            case 'Altitude':
              altitude.value = parseFloat(data[key])
              break
            case 'Azimuth':
              azimuth.value = parseFloat(data[key])
              break
            case 'Tracking':
              trackingEnabled.value = data[key] === true || data[key] === 'True'
              break
            case 'SideOfPier':
              detailedData.sideOfPier = data[key]
              break
            case 'SiderealTime':
              detailedData.siderealTime = formatRA(data[key])
              break
            case 'Slewing':
              isSlewing.value = data[key] === true || data[key] === 'True'
              break
            case 'TrackingRate':
              detailedData.trackingRate = parseInt(data[key])
              break
          }
        })
      }
    }

    // Get additional data only for detailed/fullscreen modes to reduce API calls
    if (currentMode.value !== UIMode.OVERVIEW) {
      fetchDetailedData()
      // Only fetch tracking rates when in detailed/fullscreen mode and when tracking is enabled
      if (trackingEnabled.value) {
        fetchAvailableTrackingRates()
      }
    }
  } catch (error) {
    console.error('Error fetching telescope data:', error)
    lastError.value = 'Failed to fetch telescope data'
  }
}

// Format RA from hours to HH:MM:SS
function formatRA(ra: number | string): string {
  const hours = parseFloat(ra as string)
  const h = Math.floor(hours)
  const m = Math.floor((hours - h) * 60)
  const s = Math.floor(((hours - h) * 60 - m) * 60)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// Format Dec from degrees to DD:MM:SS
function formatDec(dec: number | string): string {
  const degrees = parseFloat(dec as string)
  const sign = degrees < 0 ? '-' : '+'
  const absDeg = Math.abs(degrees)
  const d = Math.floor(absDeg)
  const m = Math.floor((absDeg - d) * 60)
  const s = Math.floor(((absDeg - d) * 60 - m) * 60)
  return `${sign}${d.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// Telescope control functions
async function toggleTracking() {
  try {
    const formData = new URLSearchParams()
    formData.append('Tracking', !trackingEnabled.value ? 'True' : 'False')
    formData.append('ClientID', '1')
    formData.append('ClientTransactionID', '1')

    await axios.put(getApiEndpoint('tracking'), formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    trackingEnabled.value = !trackingEnabled.value
  } catch (error) {
    console.error('Error toggling tracking:', error)
    lastError.value = 'Failed to toggle tracking'
  }
}

// Telescope movement controls
async function moveNorth() {
  try {
    const rate =
      slewRateMapping[selectedSlewRate.value] || parseFloat(String(selectedSlewRate.value))
    const formData = new URLSearchParams()
    formData.append('Axis', TelescopeAxes.Secondary.toString())
    formData.append('Rate', rate.toString())
    formData.append('ClientID', '1')
    formData.append('ClientTransactionID', '1')

    await axios.put(getApiEndpoint('moveaxis'), formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    isSlewing.value = true
  } catch (error) {
    console.error('Error moving telescope North:', error)
    lastError.value = 'Failed to move telescope North'
  }
}

async function moveSouth() {
  try {
    const rate =
      slewRateMapping[selectedSlewRate.value] || parseFloat(String(selectedSlewRate.value))
    const formData = new URLSearchParams()
    formData.append('Axis', TelescopeAxes.Secondary.toString())
    formData.append('Rate', (-rate).toString())
    formData.append('ClientID', '1')
    formData.append('ClientTransactionID', '1')

    await axios.put(getApiEndpoint('moveaxis'), formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    isSlewing.value = true
  } catch (error) {
    console.error('Error moving telescope South:', error)
    lastError.value = 'Failed to move telescope South'
  }
}

async function moveEast() {
  try {
    const rate =
      slewRateMapping[selectedSlewRate.value] || parseFloat(String(selectedSlewRate.value))
    const formData = new URLSearchParams()
    formData.append('Axis', TelescopeAxes.Primary.toString())
    formData.append('Rate', rate.toString())
    formData.append('ClientID', '1')
    formData.append('ClientTransactionID', '1')

    await axios.put(getApiEndpoint('moveaxis'), formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    isSlewing.value = true
  } catch (error) {
    console.error('Error moving telescope East:', error)
    lastError.value = 'Failed to move telescope East'
  }
}

async function moveWest() {
  try {
    const rate =
      slewRateMapping[selectedSlewRate.value] || parseFloat(String(selectedSlewRate.value))
    const formData = new URLSearchParams()
    formData.append('Axis', TelescopeAxes.Primary.toString())
    formData.append('Rate', (-rate).toString())
    formData.append('ClientID', '1')
    formData.append('ClientTransactionID', '1')

    await axios.put(getApiEndpoint('moveaxis'), formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    isSlewing.value = true
  } catch (error) {
    console.error('Error moving telescope West:', error)
    lastError.value = 'Failed to move telescope West'
  }
}

async function stopSlew() {
  try {
    const formData = new URLSearchParams()
    formData.append('ClientID', '1')
    formData.append('ClientTransactionID', '1')

    await axios.put(getApiEndpoint('abortslew'), formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    isSlewing.value = false
  } catch (error) {
    console.error('Error stopping telescope slew:', error)
    lastError.value = 'Failed to stop telescope slew'
  }
}

// Fetch additional detailed data
async function fetchDetailedData() {
  try {
    // For actual implementation, this would make additional API calls
    const response = await axios.get(getApiEndpoint('devicestate'))

    if (response.data && response.data.Value) {
      const data = response.data.Value
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.Name === 'TargetRightAscension') {
            detailedData.targetRightAscension = formatRA(item.Value)
          } else if (item.Name === 'TargetDeclination') {
            detailedData.targetDeclination = formatDec(item.Value)
          } else if (item.Name === 'AtPark') {
            detailedData.parkingState = item.Value ? 'True' : 'False'
          }
        }
      } else {
        if (data.TargetRightAscension) {
          detailedData.targetRightAscension = formatRA(data.TargetRightAscension)
        }
        if (data.TargetDeclination) {
          detailedData.targetDeclination = formatDec(data.TargetDeclination)
        }
        if (data.AtPark !== undefined) {
          detailedData.parkingState = data.AtPark ? 'True' : 'False'
        }
      }
    }
  } catch (error) {
    console.error('Error fetching detailed data:', error)
  }
}

// Fetch available tracking rates
async function fetchAvailableTrackingRates() {
  try {
    const response = await axios.get(getApiEndpoint('trackingrates'))
    if (response.data && response.data.Value) {
      // Update available rates based on what the telescope supports
      if (Array.isArray(response.data.Value)) {
        availableTrackingRates.value = response.data.Value.map((rate: unknown) =>
          typeof rate === 'object' && rate !== null && 'Value' in rate && rate.Value !== undefined
            ? parseInt(String(rate.Value))
            : parseInt(String(rate))
        ).filter((rate: number) => !isNaN(rate))
      } else {
        // If not an array, check if it's an object with supported rates
        const rates = []
        if (response.data.Value.Sidereal) rates.push(0)
        if (response.data.Value.Lunar) rates.push(1)
        if (response.data.Value.Solar) rates.push(2)
        if (response.data.Value.King) rates.push(3)

        if (rates.length > 0) {
          availableTrackingRates.value = rates
        }
      }
    }
  } catch (error) {
    console.error('Error fetching available tracking rates:', error)
    // Default to all rates if fetching fails
    availableTrackingRates.value = [0, 1, 2, 3]
  }
}

// Set tracking rate
async function setTrackingRate(rateId: number) {
  try {
    const formData = new URLSearchParams()
    formData.append('TrackingRate', rateId.toString())
    formData.append('ClientID', '1')
    formData.append('ClientTransactionID', '1')

    await axios.put(getApiEndpoint('trackingrate'), formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    detailedData.trackingRate = rateId
  } catch (error) {
    console.error('Error setting tracking rate:', error)
    lastError.value = 'Failed to set tracking rate'
  }
}

// Handle tracking rate selection
function handleTrackingRateChange(event: Event) {
  const select = event.target as HTMLSelectElement
  const rateId = parseInt(select.value)

  if (!isNaN(rateId) && props.connected && trackingEnabled.value) {
    setTrackingRate(rateId)
  }
}

// Park telescope
async function parkTelescope() {
  try {
    const formData = new URLSearchParams()
    formData.append('ClientID', '1')
    formData.append('ClientTransactionID', '1')

    await axios.put(getApiEndpoint('park'), formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    detailedData.parkingState = 'Parking...'
    // Fetch updated status after a delay
    setTimeout(() => fetchDetailedData(), 2000)
  } catch (error) {
    console.error('Error parking telescope:', error)
    lastError.value = 'Failed to park telescope'
  }
}

// Unpark telescope
async function unparkTelescope() {
  try {
    const formData = new URLSearchParams()
    formData.append('ClientID', '1')
    formData.append('ClientTransactionID', '1')

    await axios.put(getApiEndpoint('unpark'), formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    detailedData.parkingState = 'Unparking...'
    // Fetch updated status after a delay
    setTimeout(() => fetchDetailedData(), 2000)
  } catch (error) {
    console.error('Error unparking telescope:', error)
    lastError.value = 'Failed to unpark telescope'
  }
}

// Move telescope to home position
async function homePosition() {
  try {
    const formData = new URLSearchParams()
    formData.append('ClientID', '1')
    formData.append('ClientTransactionID', '1')

    await axios.put(getApiEndpoint('findhome'), formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    isSlewing.value = true
    // Fetch updated status after a delay
    setTimeout(() => fetchDetailedData(), 2000)
  } catch (error) {
    console.error('Error homing telescope:', error)
    lastError.value = 'Failed to home telescope'
  }
}

// Slew telescope to target coordinates
async function slewToCoordinates() {
  try {
    // Parse the input coordinates
    const formattedRA = targetRA.value
    const formattedDec = targetDec.value

    // Convert HH:MM:SS to decimal hours
    const raParts = formattedRA.split(':').map(Number)
    const raDecimal = raParts[0] + raParts[1] / 60 + raParts[2] / 3600

    // Convert +/-DD:MM:SS to decimal degrees
    const decSign = formattedDec.startsWith('-') ? -1 : 1
    const decParts = formattedDec.replace(/^[+-]/, '').split(':').map(Number)
    const decDecimal = decSign * (decParts[0] + decParts[1] / 60 + decParts[2] / 3600)

    // Prepare and send the coordinates
    const formData = new URLSearchParams()
    formData.append('RightAscension', raDecimal.toString())
    formData.append('Declination', decDecimal.toString())
    formData.append('ClientID', '1')
    formData.append('ClientTransactionID', '1')

    await axios.put(getApiEndpoint('slewtocoordinatesasync'), formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    isSlewing.value = true
    // Update target coordinates in the detailed data
    detailedData.targetRightAscension = formattedRA
    detailedData.targetDeclination = formattedDec

    // Fetch updated status after a delay
    setTimeout(() => fetchDetailedData(), 2000)
  } catch (error) {
    console.error('Error slewing to coordinates:', error)
    lastError.value = 'Failed to slew telescope to coordinates'
  }
}
</script>

<template>
  <EnhancedPanelComponent
    :panel-name="panelName"
    :connected="connected"
    :device-type="deviceType"
    :device-id="deviceId"
    :supported-modes="supportedModes"
    @close="$emit('close')"
    @configure="$emit('configure')"
    @connect="handleConnectionToggle"
    @mode-change="onModeChange"
  >
    <!-- Overview Mode - Compact, Essential Controls -->
    <template #overview-content>
      <div class="telescope-overview">
        <!-- Connection status indicator at the top when disconnected -->
        <div v-if="!connected" class="status-disconnected">
          <Icon type="disconnected" />
          <span>Telescope disconnected</span>
        </div>

        <div v-else-if="isConnecting" class="status-connecting">
          <Icon type="history" class="loading-icon" />
          <span>Connecting...</span>
        </div>

        <!-- Position display now more visually prominent -->
        <div class="overview-position">
          <div class="position-primary">
            <div class="pos-box ra-dec">
              <div class="coord-label">RA</div>
              <div class="coord-value">{{ formattedRA }}</div>
            </div>
            <div class="pos-box ra-dec">
              <div class="coord-label">Dec</div>
              <div class="coord-value">{{ formattedDec }}</div>
            </div>
          </div>

          <div class="position-secondary">
            <div class="pos-box alt-az">
              <div class="coord-label">Alt</div>
              <div class="coord-value">{{ formattedAlt }}</div>
            </div>
            <div class="pos-box alt-az">
              <div class="coord-label">Az</div>
              <div class="coord-value">{{ formattedAz }}</div>
            </div>
          </div>
        </div>

        <!-- Status badges -->
        <div class="status-badges">
          <div class="status-badge" :class="{ active: trackingEnabled }">
            <Icon :type="trackingEnabled ? 'tracking-on' : 'tracking-off'" />
            <span>{{ trackingEnabled ? 'Tracking' : 'Not Tracking' }}</span>
          </div>
          <div v-if="isSlewing" class="status-badge slewing">
            <Icon type="arrow-up" />
            <span>Slewing</span>
          </div>
        </div>

        <!-- Controls with slew and tracking in a grid layout -->
        <div class="overview-controls">
          <div class="directional-controls">
            <div class="slew-control">
              <button class="slew-btn north" :disabled="!connected || isSlewing" @click="moveNorth">
                <Icon type="arrow-up" />
              </button>
              <div class="east-west">
                <button class="slew-btn west" :disabled="!connected || isSlewing" @click="moveWest">
                  <Icon type="arrow-left" />
                </button>
                <button
                  class="slew-btn stop"
                  :disabled="!connected || !isSlewing"
                  @click="stopSlew"
                >
                  <Icon type="stop" />
                </button>
                <button class="slew-btn east" :disabled="!connected || isSlewing" @click="moveEast">
                  <Icon type="arrow-right" />
                </button>
              </div>
              <button class="slew-btn south" :disabled="!connected || isSlewing" @click="moveSouth">
                <Icon type="arrow-down" />
              </button>
            </div>
          </div>

          <div class="overview-actions">
            <select
              v-model="selectedSlewRate"
              :disabled="!connected || isSlewing"
              class="slew-rate-select"
            >
              <option v-for="rate in slewRateOptions" :key="rate" :value="rate">
                {{ rate }} Rate
              </option>
            </select>

            <button
              class="control-btn"
              :class="{ active: trackingEnabled }"
              :disabled="!connected || isConnecting"
              @click="toggleTracking"
            >
              <Icon :type="trackingEnabled ? 'tracking-on' : 'tracking-off'" />
              <span>{{ trackingEnabled ? 'Tracking' : 'Track' }}</span>
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Detailed Mode - More Controls and Data -->
    <template #detailed-content>
      <div class="telescope-detailed">
        <!-- Optimized Layout: Position & Status Side-by-Side -->
        <div class="detailed-top-section">
          <!-- Position Information -->
          <div class="position-info-optimized">
            <div class="position-grid-optimized">
              <div class="position-column">
                <h3>Equatorial</h3>
                <div class="coord-row">
                  <span class="label">RA:</span>
                  <span class="value">{{ formattedRA }}</span>
                </div>
                <div class="coord-row">
                  <span class="label">Dec:</span>
                  <span class="value">{{ formattedDec }}</span>
                </div>
                <div class="coord-row">
                  <span class="label">Target RA:</span>
                  <span class="value">{{ detailedData.targetRightAscension }}</span>
                </div>
                <div class="coord-row">
                  <span class="label">Target Dec:</span>
                  <span class="value">{{ detailedData.targetDeclination }}</span>
                </div>
              </div>
              <div class="position-column">
                <h3>Horizontal</h3>
                <div class="coord-row">
                  <span class="label">Alt:</span>
                  <span class="value">{{ formattedAlt }}</span>
                </div>
                <div class="coord-row">
                  <span class="label">Az:</span>
                  <span class="value">{{ formattedAz }}</span>
                </div>
                <div class="coord-row">
                  <span class="label">LST:</span>
                  <span class="value">{{ detailedData.siderealTime }}</span>
                </div>
                <div class="coord-row">
                  <span class="label">Side of Pier:</span>
                  <span class="value">{{ detailedData.sideOfPier }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Status & Controls -->
          <div class="status-controls-optimized">
            <div class="status-section">
              <h3>Status</h3>
              <div class="status-badges-detailed">
                <div class="status-badge" :class="{ active: connected }">
                  <span class="badge-label">Connection:</span>
                  <span class="badge-value">{{ connected ? 'Connected' : 'Disconnected' }}</span>
                </div>
                <div class="status-badge" :class="{ active: trackingEnabled }">
                  <span class="badge-label">Tracking:</span>
                  <span class="badge-value">{{ trackingEnabled ? 'On' : 'Off' }}</span>
                </div>
                <div class="status-badge" :class="{ active: isSlewing }">
                  <span class="badge-label">Slew Status:</span>
                  <span class="badge-value">{{ isSlewing ? 'Slewing' : 'Stationary' }}</span>
                </div>
                <div v-if="detailedData.parkingState !== 'Unknown'" class="status-badge">
                  <span class="badge-label">Parked:</span>
                  <span class="badge-value">{{ detailedData.parkingState }}</span>
                </div>
              </div>
            </div>

            <div class="quick-actions">
              <h3>Quick Actions</h3>
              <div class="quick-buttons">
                <button
                  class="action-btn"
                  :class="{ active: trackingEnabled }"
                  :disabled="!connected"
                  @click="toggleTracking"
                >
                  <Icon :type="trackingEnabled ? 'tracking-on' : 'tracking-off'" />
                  <span>{{ trackingEnabled ? 'Stop Tracking' : 'Start Tracking' }}</span>
                </button>
                <button
                  class="action-btn"
                  :disabled="!connected || detailedData.parkingState === 'Parked'"
                  @click="parkTelescope"
                >
                  <Icon type="home" />
                  <span>Park</span>
                </button>
                <button
                  class="action-btn"
                  :disabled="!connected || detailedData.parkingState !== 'Parked'"
                  @click="unparkTelescope"
                >
                  <Icon type="home" />
                  <span>Unpark</span>
                </button>
                <button
                  class="action-btn"
                  :disabled="!connected || isSlewing"
                  @click="homePosition"
                >
                  <Icon type="home" />
                  <span>Home</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Movement Controls & Target Coordinates -->
        <div class="detailed-bottom-section">
          <!-- Movement Controls -->
          <div class="movement-controls-optimized">
            <h3>Movement Controls</h3>
            <div class="slew-controls-grid">
              <div class="slew-control">
                <button
                  class="slew-btn north"
                  :disabled="!connected || isSlewing"
                  @click="moveNorth"
                >
                  <Icon type="arrow-up" />
                </button>
                <div class="east-west">
                  <button
                    class="slew-btn west"
                    :disabled="!connected || isSlewing"
                    @click="moveWest"
                  >
                    <Icon type="arrow-left" />
                  </button>
                  <button
                    class="slew-btn stop"
                    :disabled="!connected || !isSlewing"
                    @click="stopSlew"
                  >
                    <Icon type="stop" />
                  </button>
                  <button
                    class="slew-btn east"
                    :disabled="!connected || isSlewing"
                    @click="moveEast"
                  >
                    <Icon type="arrow-right" />
                  </button>
                </div>
                <button
                  class="slew-btn south"
                  :disabled="!connected || isSlewing"
                  @click="moveSouth"
                >
                  <Icon type="arrow-down" />
                </button>
              </div>
              <div class="slew-settings">
                <div class="slew-rate">
                  <label for="slew-rate-select">Slew Rate:</label>
                  <select
                    id="slew-rate-select"
                    v-model="selectedSlewRate"
                    :disabled="!connected || isSlewing"
                    class="slew-rate-select"
                  >
                    <option v-for="rate in slewRateOptions" :key="rate" :value="rate">
                      {{ rate }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Target Coordinates -->
          <div class="target-coordinates-optimized">
            <h3>Target Coordinates</h3>
            <div class="target-inputs">
              <div class="target-row">
                <label for="target-ra">Target RA:</label>
                <input
                  id="target-ra"
                  v-model="targetRA"
                  type="text"
                  placeholder="HH:MM:SS"
                  :disabled="!connected || isSlewing"
                />
              </div>
              <div class="target-row">
                <label for="target-dec">Target Dec:</label>
                <input
                  id="target-dec"
                  v-model="targetDec"
                  type="text"
                  placeholder="+DD:MM:SS"
                  :disabled="!connected || isSlewing"
                />
              </div>
              <button
                class="slew-to-target-btn"
                :disabled="!connected || isSlewing"
                @click="slewToCoordinates"
              >
                <Icon type="arrow-right" />
                <span>Slew to Target</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Error Message Display -->
        <div v-if="lastError" class="error-message">
          <Icon type="stop" />
          <span>{{ lastError }}</span>
        </div>
      </div>
    </template>

    <!-- Fullscreen Mode - Maximum Data and Controls -->
    <template #fullscreen-content>
      <div class="telescope-fullscreen">
        <!-- Connection status indicator for fullscreen mode -->
        <div v-if="!connected" class="fullscreen-disconnected">
          <Icon type="disconnected" size="large" />
          <span>Telescope disconnected</span>
          <button class="connect-btn" :disabled="isConnecting" @click="handleConnectionToggle">
            Connect Telescope
          </button>
        </div>

        <div v-else class="fullscreen-grid">
          <div class="position-panel">
            <h2>Position</h2>
            <div class="position-grid-optimized">
              <div class="position-column">
                <h3>Equatorial</h3>
                <div class="coord-row">
                  <span class="label">Right Ascension:</span>
                  <span class="value">{{ formattedRA }}</span>
                </div>
                <div class="coord-row">
                  <span class="label">Declination:</span>
                  <span class="value">{{ formattedDec }}</span>
                </div>
                <div class="coord-row">
                  <span class="label">Target RA:</span>
                  <span class="value">{{ detailedData.targetRightAscension }}</span>
                </div>
                <div class="coord-row">
                  <span class="label">Target Dec:</span>
                  <span class="value">{{ detailedData.targetDeclination }}</span>
                </div>
              </div>
              <div class="position-column">
                <h3>Horizontal</h3>
                <div class="coord-row">
                  <span class="label">Altitude:</span>
                  <span class="value">{{ formattedAlt }}</span>
                </div>
                <div class="coord-row">
                  <span class="label">Azimuth:</span>
                  <span class="value">{{ formattedAz }}</span>
                </div>
                <div class="coord-row">
                  <span class="label">Sidereal Time:</span>
                  <span class="value">{{ detailedData.siderealTime }}</span>
                </div>
                <div class="coord-row">
                  <span class="label">Side of Pier:</span>
                  <span class="value">{{ detailedData.sideOfPier }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="status-panel">
            <h2>Telescope Status</h2>
            <div class="status-grid">
              <div class="status-item">
                <span class="label">Connection:</span>
                <span class="value" :class="{ connected: connected }">
                  {{ connected ? 'Connected' : 'Disconnected' }}
                </span>
              </div>
              <div class="status-item">
                <span class="label">Slew Status:</span>
                <span class="value" :class="{ slewing: isSlewing }">
                  {{ isSlewing ? 'Slewing' : 'Idle' }}
                </span>
              </div>
              <div class="status-item">
                <span class="label">Tracking:</span>
                <span class="value" :class="{ tracking: trackingEnabled }">
                  {{ trackingEnabled ? 'Enabled' : 'Disabled' }}
                </span>
              </div>
              <div class="status-item">
                <span class="label">Tracking Rate:</span>
                <span class="value">{{ trackingRates[detailedData.trackingRate] }}</span>
              </div>
              <div class="status-item">
                <span class="label">Sidereal Time:</span>
                <span class="value">{{ detailedData.siderealTime }}</span>
              </div>
              <div class="status-item">
                <span class="label">Side of Pier:</span>
                <span class="value">{{ detailedData.sideOfPier }}</span>
              </div>
              <div class="status-item">
                <span class="label">Park State:</span>
                <span class="value">{{ detailedData.parkingState }}</span>
              </div>
            </div>
          </div>

          <div class="controls-panel">
            <h2>Telescope Controls</h2>
            <div class="controls-wrapper">
              <div class="slew-panel">
                <h3>Motion Control</h3>
                <div class="slew-settings">
                  <div class="slew-rate">
                    <label for="slew-rate-fs">Slew Rate:</label>
                    <select
                      id="slew-rate-fs"
                      v-model="selectedSlewRate"
                      :disabled="!connected || isSlewing"
                      class="control-select"
                    >
                      <option v-for="rate in slewRateOptions" :key="rate" :value="rate">
                        {{ rate }}
                      </option>
                    </select>
                  </div>
                </div>
                <div class="directional-controls fullscreen">
                  <div class="slew-control">
                    <button
                      class="slew-btn north"
                      :disabled="!connected || isSlewing"
                      @click="moveNorth"
                    >
                      <Icon type="arrow-up" />
                    </button>
                    <div class="east-west">
                      <button
                        class="slew-btn west"
                        :disabled="!connected || isSlewing"
                        @click="moveWest"
                      >
                        <Icon type="arrow-left" />
                      </button>
                      <button
                        class="slew-btn stop"
                        :disabled="!connected || !isSlewing"
                        @click="stopSlew"
                      >
                        <Icon type="stop" />
                      </button>
                      <button
                        class="slew-btn east"
                        :disabled="!connected || isSlewing"
                        @click="moveEast"
                      >
                        <Icon type="arrow-right" />
                      </button>
                    </div>
                    <button
                      class="slew-btn south"
                      :disabled="!connected || isSlewing"
                      @click="moveSouth"
                    >
                      <Icon type="arrow-down" />
                    </button>
                  </div>
                </div>
              </div>

              <div class="tracking-panel">
                <h3>Tracking Controls</h3>
                <div class="tracking-actions">
                  <button
                    class="control-btn large"
                    :class="{ active: trackingEnabled }"
                    :disabled="!connected"
                    @click="toggleTracking"
                  >
                    <Icon :type="trackingEnabled ? 'tracking-on' : 'tracking-off'" />
                    <span>{{ trackingEnabled ? 'Disable Tracking' : 'Enable Tracking' }}</span>
                  </button>
                  <div class="tracking-rate-selector">
                    <label for="tracking-rate">Tracking Rate:</label>
                    <select
                      id="tracking-rate"
                      v-model="detailedData.trackingRate"
                      :disabled="!connected || !trackingEnabled"
                      class="control-select"
                      @change="handleTrackingRateChange"
                    >
                      <option
                        v-for="rateId in availableTrackingRates"
                        :key="rateId"
                        :value="rateId"
                      >
                        {{ trackingRates[rateId] }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="parking-panel">
                <h3>Parking</h3>
                <div class="parking-actions">
                  <button
                    class="control-btn"
                    :disabled="
                      !connected ||
                      isSlewing ||
                      detailedData.parkingState === 'True' ||
                      detailedData.parkingState === 'Parking...'
                    "
                    @click="parkTelescope"
                  >
                    <Icon type="home" />
                    <span>Park Telescope</span>
                  </button>
                  <button
                    class="control-btn"
                    :disabled="!connected || isSlewing || detailedData.parkingState !== 'True'"
                    @click="unparkTelescope"
                  >
                    <Icon type="home" />
                    <span>Unpark Telescope</span>
                  </button>
                  <button
                    class="control-btn"
                    :disabled="!connected || isSlewing"
                    @click="homePosition"
                  >
                    <Icon type="home" />
                    <span>Home Position</span>
                  </button>
                </div>
              </div>

              <div class="coordinates-panel">
                <h3>Go To Coordinates</h3>
                <div class="coordinate-inputs">
                  <div class="input-group">
                    <label for="target-ra">RA (HH:MM:SS):</label>
                    <input
                      id="target-ra"
                      v-model="targetRA"
                      type="text"
                      pattern="[0-9]{2}:[0-9]{2}:[0-9]{2}"
                      placeholder="00:00:00"
                      :disabled="!connected || isSlewing"
                      class="input-field"
                    />
                  </div>
                  <div class="input-group">
                    <label for="target-dec">Dec (+/-DD:MM:SS):</label>
                    <input
                      id="target-dec"
                      v-model="targetDec"
                      type="text"
                      pattern="[+-][0-9]{2}:[0-9]{2}:[0-9]{2}"
                      placeholder="+00:00:00"
                      :disabled="!connected || isSlewing"
                      class="input-field"
                    />
                  </div>
                  <button
                    class="control-btn"
                    :disabled="!connected || isSlewing"
                    @click="slewToCoordinates"
                  >
                    <Icon type="arrow-right" />
                    <span>Slew to Target</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Status Bar content - now shown at the top instead of bottom -->
    <template #top-status-bar>
      <div class="status-indicators">
        <span class="status-indicator" :class="{ connected: connected, disconnected: !connected }">
          {{ connectionStatus }}
        </span>
        <span v-if="connected" class="status-indicator" :class="{ tracking: trackingEnabled }">
          {{ trackingEnabled ? 'Tracking' : 'Not Tracking' }}
        </span>
        <span v-if="connected" class="status-indicator" :class="{ slewing: isSlewing }">
          {{ isSlewing ? 'Slewing' : 'Idle' }}
        </span>
        <span v-if="lastError" class="status-indicator error">
          {{ lastError }}
        </span>
      </div>
    </template>

    <!-- Keep the original status bar empty to hide it -->
    <template #status-bar> </template>
  </EnhancedPanelComponent>
</template>

<style scoped>
/* Panel structure - ensure proper containment */
:deep(.panel-component) {
  max-height: calc(100vh - 20px);
  display: flex;
  flex-direction: column;
  /* Account for left menu width in calculations */
  max-width: 100vw - var(--sidebar-collapsed-width);
}

:deep(.panel-body) {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

:deep(.panel-content) {
  flex: 1;
  overflow: auto;
  /* Ensure content doesn't overflow the container */
  max-width: 100%;
}

/* Media query for smaller screens where menu might collapse */
@media (max-width: 992px) {
  :deep(.panel-component) {
    max-width: calc(100vw - 60px); /* Adjust for collapsed menu */
  }
}

/* Media query for mobile views */
@media (max-width: 768px) {
  :deep(.panel-component) {
    max-width: 100vw; /* Full width on mobile (menu might be hidden) */
  }
}

/* Telescope panels - fit content within parent */
.telescope-overview,
.telescope-detailed,
.telescope-fullscreen {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0.5rem;
}

/* Common styles */
h2,
h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: var(--aw-panel-content-color);
}

h2 {
  font-size: 1.25rem;
  border-bottom: 1px solid var(--aw-panel-border-color);
  padding-bottom: 0.5rem;
}

h3 {
  font-size: 1rem;
  margin-bottom: 0.75rem;
}

.label {
  font-weight: 500;
  color: var(--aw-panel-content-color);
  opacity: 0.8;
}

.value {
  font-family: monospace;
  font-weight: 600;
}

.connected,
.tracking {
  color: #ff6b6b;
}

.disconnected {
  color: #f56565;
}

.slewing {
  color: #ffb300;
}

.error {
  color: #ff4d4d;
}

/* Loading animation */
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-icon {
  animation: spin 1.5s linear infinite;
}

/* Status indicators */
.status-disconnected,
.status-connecting {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  text-align: center;
  color: var(--aw-panel-content-color);
  opacity: 0.8;
  gap: 0.5rem;
}

.fullscreen-disconnected {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 1rem;
  text-align: center;
}

.connect-btn {
  padding: 0.75rem 1.5rem;
  background-color: #ff6b6b;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 1rem;
}

.connect-btn:hover:not(:disabled) {
  background-color: #ff8080;
}

.connect-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Form controls */
.select-field,
.input-field {
  width: 100%;
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--aw-panel-border-color);
  background-color: var(--aw-panel-content-bg-color);
  color: var(--aw-panel-content-color);
}

.select-field:focus,
.input-field:focus {
  outline: none;
  border-color: #ff6b6b;
}

.select-field:disabled,
.input-field:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Overview Mode - Optimized */
.telescope-overview {
  padding: 0.5rem;
  gap: 0.75rem;
}

.position-primary,
.position-secondary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.position-secondary {
  margin-top: 0.25rem;
}

.pos-box {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 0.5rem;
  border-radius: 4px;
  text-align: center;
}

.ra-dec {
  background-color: rgba(0, 0, 0, 0.15);
}

.alt-az {
  background-color: rgba(0, 0, 0, 0.1);
}

.coord-label {
  font-size: 0.8rem;
  opacity: 0.8;
  margin-bottom: 0.25rem;
}

.coord-value {
  font-family: monospace;
  font-weight: bold;
  font-size: 1.1rem;
}

.status-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.25rem 0;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.1);
  font-size: 0.8rem;
}

.status-badge.active {
  background-color: rgba(255, 107, 107, 0.2);
}

.status-badge.slewing {
  background-color: rgba(255, 179, 0, 0.2);
}

.overview-controls {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-gap: 0.5rem;
  align-items: center;
}

.overview-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-left: 0.5rem;
}

.slew-rate-select {
  padding: 0.25rem;
  border-radius: 4px;
  border: 1px solid var(--aw-panel-border-color);
  background-color: var(--aw-panel-content-bg-color);
  color: var(--aw-panel-content-color);
}

/* Other controls */
.directional-controls {
  display: flex;
  justify-content: center;
}

.slew-control {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.east-west {
  display: flex;
  gap: 0.25rem;
}

.slew-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 4px;
  border: 1px solid var(--aw-panel-border-color);
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.slew-btn:hover:not(:disabled) {
  background-color: var(--aw-panel-resize-bg-color);
}

.slew-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.slew-btn.stop {
  background-color: rgba(255, 0, 0, 0.2);
}

.slew-btn.stop:hover:not(:disabled) {
  background-color: rgba(255, 0, 0, 0.4);
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  border: 1px solid var(--aw-panel-border-color);
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-btn:hover:not(:disabled) {
  background-color: var(--aw-panel-resize-bg-color);
}

.control-btn.active {
  background-color: rgba(255, 107, 107, 0.2);
  color: var(--aw-panel-resize-color);
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Detailed Mode */
.telescope-detailed {
  gap: 1rem;
  padding: 0.75rem;
}

.detailed-top-section,
.detailed-bottom-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.position-info-optimized,
.status-controls-optimized,
.movement-controls-optimized,
.target-coordinates-optimized {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  padding: 0.75rem;
}

.position-grid-optimized {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.position-column h3 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-size: 0.95rem;
  color: var(--aw-panel-content-color);
}

.coord-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.35rem;
}

.coord-row .label {
  font-weight: normal;
  opacity: 0.8;
  flex: 0 0 48%;
}

.coord-row .value {
  font-weight: 600;
  flex: 0 0 52%;
  text-align: right;
  font-family: monospace;
}

.status-badges-detailed {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.status-badges-detailed .status-badge {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  background-color: rgba(0, 0, 0, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.9rem;
}

.status-badges-detailed .status-badge.active {
  background-color: rgba(0, 128, 0, 0.3);
  color: rgb(200, 255, 200);
}

.status-section h3,
.quick-actions h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 1rem;
  color: var(--aw-panel-content-color);
}

.quick-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.action-btn {
  background-color: rgba(50, 50, 80, 0.5);
  color: var(--aw-panel-content-color);
  border: none;
  border-radius: 4px;
  padding: 0.4rem;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover:not(:disabled) {
  background-color: rgba(70, 70, 120, 0.6);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.active {
  background-color: rgba(0, 100, 0, 0.5);
}

.action-btn.active:hover:not(:disabled) {
  background-color: rgba(0, 120, 0, 0.6);
}

.slew-controls-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem;
  align-items: center;
}

.movement-controls-optimized h3,
.target-coordinates-optimized h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 1rem;
  color: var(--aw-panel-content-color);
}

.target-inputs {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.target-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.target-row label {
  flex: 0 0 30%;
  text-align: right;
}

.target-row input {
  flex: 1;
  background-color: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: var(--aw-panel-content-color);
  padding: 0.4rem;
}

.slew-to-target-btn {
  margin-top: 0.5rem;
  background-color: rgba(0, 100, 150, 0.5);
  color: var(--aw-panel-content-color);
  border: none;
  border-radius: 4px;
  padding: 0.5rem;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.slew-to-target-btn:hover:not(:disabled) {
  background-color: rgba(0, 120, 180, 0.6);
}

.slew-to-target-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  margin-top: 0.5rem;
  background-color: rgba(150, 0, 0, 0.3);
  color: rgb(255, 200, 200);
  padding: 0.5rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .detailed-top-section,
  .detailed-bottom-section {
    grid-template-columns: 1fr;
  }

  .position-grid-optimized {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .status-badges-detailed {
    grid-template-columns: 1fr;
  }

  .quick-buttons {
    grid-template-columns: 1fr;
  }

  .slew-controls-grid {
    grid-template-columns: 1fr;
  }
}

/* Fullscreen Mode */
.telescope-fullscreen {
  padding: 0.75rem;
  max-width: 100%;
  box-sizing: border-box;
  height: 100%;
}

.fullscreen-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  overflow-y: auto;
  flex: 1;
  max-height: calc(100vh - 100px);
}

/* Position panel, status panel styles */
.position-panel,
.status-panel,
.controls-panel {
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  padding: 0.75rem;
  height: auto;
  max-height: calc(100vh - 150px);
  overflow-y: auto;
}

.position-grid,
.status-grid {
  display: grid;
  gap: 1rem;
}

.controls-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
}

.slew-panel,
.tracking-panel,
.parking-panel,
.coordinates-panel {
  padding: 0.75rem;
  background-color: rgba(0, 0, 0, 0.03);
  border-radius: 6px;
  margin-bottom: 1rem;
}

.slew-settings {
  margin-bottom: 0.75rem;
}

.directional-controls.fullscreen .slew-btn {
  width: 2.75rem;
  height: 2.75rem;
}

.tracking-actions,
.parking-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.control-btn.large {
  padding: 0.5rem 1rem;
  justify-content: center;
}

.tracking-rate-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-select {
  padding: 0.5rem;
  width: 100%;
}

/* Status bar styling */
.status-indicators {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.status-indicator {
  font-size: 0.85rem;
  white-space: nowrap;
}

/* Night vision mode specific adjustments */
:root .dark-theme .position-block,
:root .dark-theme .status-info,
:root .dark-theme .slew-controls,
:root .dark-theme .tracking-section,
:root .dark-theme .coordinates-section,
:root .dark-theme .position-panel,
:root .dark-theme .status-panel,
:root .dark-theme .controls-panel,
:root .dark-theme .slew-panel,
:root .dark-theme .tracking-panel,
:root .dark-theme .parking-panel,
:root .dark-theme .coordinates-panel {
  background-color: rgba(70, 0, 0, 0.15);
}

:root .dark-theme .pos-box,
:root .dark-theme .status-badge {
  background-color: rgba(70, 0, 0, 0.25);
}

:root .dark-theme .ra-dec {
  background-color: rgba(70, 0, 0, 0.3);
}

:root .dark-theme .status-badge.active {
  background-color: rgba(255, 107, 107, 0.3);
}

:root .dark-theme .status-badge.slewing {
  background-color: rgba(255, 179, 0, 0.3);
}

:root .dark-theme .slew-btn.stop {
  background-color: rgba(255, 0, 0, 0.3);
}

:root .dark-theme .slew-btn.stop:hover:not(:disabled) {
  background-color: rgba(255, 0, 0, 0.5);
}

:root .dark-theme select,
:root .dark-theme .control-select,
:root .dark-theme input,
:root .dark-theme .select-field,
:root .dark-theme .input-field {
  background-color: rgba(70, 0, 0, 0.2);
  border-color: var(--aw-panel-border-color);
}

:root .dark-theme .control-btn.active {
  background-color: rgba(255, 107, 107, 0.3);
}

/* Coordinate input styles */
.coordinate-inputs {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.input-group label {
  font-size: 0.9rem;
  color: var(--aw-panel-content-color);
  opacity: 0.8;
}

@media (min-width: 768px) {
  .coordinate-inputs {
    flex-direction: row;
    align-items: flex-end;
  }

  .input-group {
    flex: 1;
  }
}

/* Media query for responsive layout */
@media (max-width: 767px) {
  .telescope-overview {
    padding: 0.35rem;
  }

  .overview-controls {
    grid-template-columns: 1fr;
  }

  .overview-actions {
    flex-direction: row;
    margin-left: 0;
    margin-top: 0.5rem;
  }

  .fullscreen-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    overflow-y: auto;
  }

  .detailed-top-section,
  .detailed-bottom-section {
    grid-template-columns: 1fr;
  }

  .position-grid-optimized {
    grid-template-columns: 1fr;
  }

  .status-badges-detailed {
    grid-template-columns: 1fr;
  }

  .quick-buttons {
    grid-template-columns: 1fr;
  }

  .slew-controls-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-height: 800px) {
  .fullscreen-grid {
    max-height: calc(100vh - 80px);
  }

  .position-panel,
  .status-panel,
  .controls-panel {
    max-height: calc(100vh - 130px);
  }
}

@media (max-height: 600px) {
  .fullscreen-grid {
    grid-template-columns: repeat(3, minmax(200px, 1fr));
  }
}

/* Responsive sizing for different viewport sizes */
@media (min-height: 1000px) {
  .fullscreen-grid {
    max-height: calc(100vh - 120px);
  }

  .position-panel,
  .status-panel,
  .controls-panel {
    max-height: calc(100vh - 170px);
  }
}

/* Restore responsive layouts */
@media (min-width: 1200px) {
  .fullscreen-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 768px) and (max-width: 1199px) {
  .fullscreen-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Adjust panel sizing for very small screens */
@media (max-width: 480px) {
  .telescope-detailed,
  .telescope-fullscreen {
    padding: 0.25rem;
  }

  .telescope-overview {
    padding: 0.25rem;
  }

  .pos-box {
    padding: 0.35rem;
  }

  .coord-value {
    font-size: 0.95rem;
  }

  .fullscreen-grid {
    gap: 0.5rem;
  }

  .slew-panel,
  .tracking-panel,
  .parking-panel,
  .coordinates-panel {
    padding: 0.5rem;
    margin-bottom: 0.5rem;
  }

  /* Smaller UI elements for small screens */
  .slew-btn {
    width: 2rem;
    height: 2rem;
  }

  .directional-controls.fullscreen .slew-btn {
    width: 2.25rem;
    height: 2.25rem;
  }

  h2 {
    font-size: 1rem;
    margin-bottom: 0.35rem;
  }

  h3 {
    font-size: 0.9rem;
    margin-bottom: 0.35rem;
  }
}

:deep(.fullscreen-content) {
  /* Ensure fullscreen mode respects left menu width */
  max-height: calc(100vh - 40px);
  overflow: hidden;
}

@media (max-width: 992px) {
  :deep(.fullscreen-content) {
    max-width: calc(100vw - 60px); /* Adjust for collapsed menu */
  }
}

@media (max-width: 768px) {
  :deep(.fullscreen-content) {
    max-width: 100vw; /* Full width on mobile */
  }
}
</style>
