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
const lastError = ref('')
const isSlewing = ref(false)
const rightAscension = ref('00:00:00')
const declination = ref('+00:00:00')
const altitude = ref(0)
const azimuth = ref(0)

// More detailed telescope data for DETAILED and FULLSCREEN modes
const detailedData = reactive({
  sideOfPier: 'Unknown',
  siderealTime: '00:00:00',
  targetRightAscension: '00:00:00',
  targetDeclination: '+00:00:00',
  parkingState: 'Unknown',
  trackingRate: 'Sidereal'
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
  emit('connect', !props.connected)

  // Start or stop data fetching based on connection state
  if (!props.connected) {
    startDataFetching()
  } else {
    stopDataFetching()
  }
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
          }
        })
      }
    }

    // Get additional data for detailed mode
    if (currentMode.value !== UIMode.OVERVIEW) {
      fetchDetailedData()
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
    formData.append('Value', (!trackingEnabled.value).toString())
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

// Telescope movement controls - implementation details omitted for brevity
async function moveNorth() {
  try {
    const formData = new URLSearchParams()
    formData.append('Direction', 'North')
    formData.append('Rate', selectedSlewRate.value)
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
    const formData = new URLSearchParams()
    formData.append('Direction', 'South')
    formData.append('Rate', selectedSlewRate.value)
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
    const formData = new URLSearchParams()
    formData.append('Direction', 'East')
    formData.append('Rate', selectedSlewRate.value)
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
    const formData = new URLSearchParams()
    formData.append('Direction', 'West')
    formData.append('Rate', selectedSlewRate.value)
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
    const response = await axios.get(getApiEndpoint('targetstate'))

    if (response.data && response.data.Value) {
      const data = response.data.Value
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.Name === 'TargetRightAscension') {
            detailedData.targetRightAscension = formatRA(item.Value)
          } else if (item.Name === 'TargetDeclination') {
            detailedData.targetDeclination = formatDec(item.Value)
          } else if (item.Name === 'AtPark') {
            detailedData.parkingState = item.Value ? 'Parked' : 'Unparked'
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
          detailedData.parkingState = data.AtPark ? 'Parked' : 'Unparked'
        }
      }
    }
  } catch (error) {
    console.error('Error fetching detailed data:', error)
  }
}

// Set tracking rate
async function setTrackingRate(rate: string) {
  try {
    const formData = new URLSearchParams()
    formData.append('Value', rate)
    formData.append('ClientID', '1')
    formData.append('ClientTransactionID', '1')

    await axios.put(getApiEndpoint('trackingrate'), formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    detailedData.trackingRate = rate
  } catch (error) {
    console.error('Error setting tracking rate:', error)
    lastError.value = 'Failed to set tracking rate'
  }
}

// Watch for tracking rate changes
watch(
  () => detailedData.trackingRate,
  (newRate) => {
    if (props.connected && trackingEnabled.value) {
      setTrackingRate(newRate)
    }
  }
)

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
        <div class="overview-position">
          <div class="pos-box ra-dec">
            <span class="label">RA:</span>
            <span class="value">{{ formattedRA }}</span>
          </div>
          <div class="pos-box ra-dec">
            <span class="label">Dec:</span>
            <span class="value">{{ formattedDec }}</span>
          </div>
          <div class="actions">
            <button
              class="control-btn"
              :class="{ active: trackingEnabled }"
              :disabled="!connected"
              @click="toggleTracking"
            >
              <Icon :type="trackingEnabled ? 'tracking-on' : 'tracking-off'" />
              <span>{{ trackingEnabled ? 'Tracking' : 'Track' }}</span>
            </button>
          </div>
        </div>
        <div class="directional-controls">
          <div class="slew-control">
            <button class="slew-btn north" :disabled="!connected || isSlewing" @click="moveNorth">
              <Icon type="arrow-up" />
            </button>
            <div class="east-west">
              <button class="slew-btn west" :disabled="!connected || isSlewing" @click="moveWest">
                <Icon type="arrow-left" />
              </button>
              <button class="slew-btn stop" :disabled="!connected || !isSlewing" @click="stopSlew">
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
      </div>
    </template>

    <!-- Detailed Mode - More Controls and Data -->
    <template #detailed-content>
      <div class="telescope-detailed">
        <div class="detailed-header">
          <div class="position-info">
            <div class="position-block">
              <h3>Equatorial</h3>
              <div class="pos-grid">
                <span class="label">RA:</span>
                <span class="value">{{ formattedRA }}</span>
                <span class="label">Dec:</span>
                <span class="value">{{ formattedDec }}</span>
              </div>
            </div>
            <div class="position-block">
              <h3>Horizontal</h3>
              <div class="pos-grid">
                <span class="label">Alt:</span>
                <span class="value">{{ formattedAlt }}</span>
                <span class="label">Az:</span>
                <span class="value">{{ formattedAz }}</span>
              </div>
            </div>
          </div>
          <div class="status-info">
            <div class="status-item">
              <span class="label">Status:</span>
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
              <span class="label">LST:</span>
              <span class="value">{{ detailedData.siderealTime }}</span>
            </div>
          </div>
        </div>

        <div class="controls-section">
          <div class="slew-controls">
            <h3>Motion Control</h3>
            <div class="slew-rate">
              <label for="slew-rate">Slew Rate:</label>
              <select id="slew-rate" v-model="selectedSlewRate" :disabled="!connected || isSlewing">
                <option v-for="rate in slewRateOptions" :key="rate" :value="rate">
                  {{ rate }}
                </option>
              </select>
            </div>
            <div class="directional-controls detailed">
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

          <div class="tracking-section">
            <h3>Tracking</h3>
            <div class="tracking-controls">
              <button
                class="control-btn"
                :class="{ active: trackingEnabled }"
                :disabled="!connected"
                @click="toggleTracking"
              >
                <Icon :type="trackingEnabled ? 'tracking-on' : 'tracking-off'" />
                <span>{{ trackingEnabled ? 'Disable Tracking' : 'Enable Tracking' }}</span>
              </button>
              <select
                v-model="detailedData.trackingRate"
                :disabled="!connected || !trackingEnabled"
                class="tracking-rate"
              >
                <option value="Sidereal">Sidereal</option>
                <option value="Lunar">Lunar</option>
                <option value="Solar">Solar</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
          </div>
        </div>

        <div class="coordinates-section">
          <h3>Go To Coordinates</h3>
          <div class="coordinate-inputs">
            <div class="input-group">
              <label for="detailed-target-ra">RA (HH:MM:SS):</label>
              <input
                id="detailed-target-ra"
                v-model="targetRA"
                type="text"
                pattern="[0-9]{2}:[0-9]{2}:[0-9]{2}"
                placeholder="00:00:00"
                :disabled="!connected || isSlewing"
              />
            </div>
            <div class="input-group">
              <label for="detailed-target-dec">Dec (+/-DD:MM:SS):</label>
              <input
                id="detailed-target-dec"
                v-model="targetDec"
                type="text"
                pattern="[+-][0-9]{2}:[0-9]{2}:[0-9]{2}"
                placeholder="+00:00:00"
                :disabled="!connected || isSlewing"
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
    </template>

    <!-- Fullscreen Mode - Maximum Data and Controls -->
    <template #fullscreen-content>
      <div class="telescope-fullscreen">
        <div class="fullscreen-grid">
          <div class="position-panel">
            <h2>Position</h2>
            <div class="position-grid">
              <div class="position-block">
                <h3>Equatorial</h3>
                <div class="pos-grid">
                  <span class="label">Right Ascension:</span>
                  <span class="value">{{ formattedRA }}</span>
                  <span class="label">Declination:</span>
                  <span class="value">{{ formattedDec }}</span>
                  <span class="label">Target RA:</span>
                  <span class="value">{{ detailedData.targetRightAscension }}</span>
                  <span class="label">Target Dec:</span>
                  <span class="value">{{ detailedData.targetDeclination }}</span>
                </div>
              </div>
              <div class="position-block">
                <h3>Horizontal</h3>
                <div class="pos-grid">
                  <span class="label">Altitude:</span>
                  <span class="value">{{ formattedAlt }}</span>
                  <span class="label">Azimuth:</span>
                  <span class="value">{{ formattedAz }}</span>
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
                <span class="label">Motion Status:</span>
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
                <span class="value">{{ detailedData.trackingRate }}</span>
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
                <span class="label">Parking State:</span>
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
                    >
                      <option value="Sidereal">Sidereal</option>
                      <option value="Lunar">Lunar</option>
                      <option value="Solar">Solar</option>
                      <option value="Custom">Custom</option>
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
                      detailedData.parkingState === 'Parked' ||
                      detailedData.parkingState === 'Parking...'
                    "
                    @click="parkTelescope"
                  >
                    <Icon type="park" />
                    <span>Park Telescope</span>
                  </button>
                  <button
                    class="control-btn"
                    :disabled="!connected || isSlewing || detailedData.parkingState !== 'Parked'"
                    @click="unparkTelescope"
                  >
                    <Icon type="park" />
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

    <!-- Status Bar - Only shown in Detailed and Fullscreen modes -->
    <template #status-bar>
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
      </div>
    </template>
  </EnhancedPanelComponent>
</template>

<style scoped>
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

.connected {
  color: #ff6b6b;
}

.disconnected {
  color: #f56565;
}

.tracking {
  color: #ff6b6b;
}

.slewing {
  color: #ff9e9e;
}

/* Overview Mode */
.telescope-overview {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.overview-position {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
}

.pos-box {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  width: 100%;
  justify-content: space-between;
}

.actions {
  margin-top: 0.5rem;
  display: flex;
  justify-content: center;
  width: 100%;
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
  background-color: var(--aw-panel-resize-bg-color);
  color: var(--aw-panel-resize-color);
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.directional-controls {
  display: flex;
  justify-content: center;
  margin-top: 0.5rem;
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

/* Detailed Mode */
.telescope-detailed {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: 100%;
}

.detailed-header {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.position-info,
.status-info {
  flex: 1;
  min-width: 200px;
}

.position-block {
  margin-bottom: 1rem;
  padding: 0.75rem;
  border-radius: 6px;
  background-color: rgba(0, 0, 0, 0.05);
}

.pos-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem 1rem;
  align-items: center;
}

.status-info {
  padding: 0.75rem;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 6px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.controls-section {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.slew-controls,
.tracking-section {
  flex: 1;
  min-width: 200px;
  padding: 0.75rem;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 6px;
}

.slew-rate {
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

select {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--aw-panel-border-color);
  background-color: var(--aw-panel-content-bg-color);
  color: var(--aw-panel-content-color);
}

.directional-controls.detailed {
  margin-top: 1rem;
}

.tracking-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tracking-rate {
  width: 100%;
  padding: 0.5rem;
}

.coordinates-section {
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 6px;
}

/* Fullscreen Mode */
.telescope-fullscreen {
  padding: 1rem;
  height: 100%;
  overflow: auto;
}

.fullscreen-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.position-panel,
.status-panel,
.controls-panel {
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  padding: 1rem;
  height: min-content;
}

.position-grid,
.status-grid {
  display: grid;
  gap: 1rem;
}

.controls-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.slew-panel,
.tracking-panel,
.parking-panel {
  padding: 1rem;
  background-color: rgba(0, 0, 0, 0.03);
  border-radius: 6px;
}

.slew-settings {
  margin-bottom: 1rem;
}

.directional-controls.fullscreen .slew-btn {
  width: 3rem;
  height: 3rem;
}

.tracking-actions,
.parking-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
  background-color: rgba(70, 0, 0, 0.1);
}

:root .dark-theme .slew-btn.stop {
  background-color: rgba(255, 0, 0, 0.3);
}

:root .dark-theme .slew-btn.stop:hover:not(:disabled) {
  background-color: rgba(255, 0, 0, 0.5);
}

:root .dark-theme select,
:root .dark-theme .control-select,
:root .dark-theme input {
  background-color: rgba(70, 0, 0, 0.2);
  border-color: var(--aw-panel-border-color);
}

/* Coordinate input styles */
.coordinates-panel {
  padding: 0.75rem;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 6px;
  margin-top: 1rem;
}

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

.input-group input {
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--aw-panel-border-color);
  background-color: var(--aw-panel-content-bg-color);
  color: var(--aw-panel-content-color);
  font-family: monospace;
}

/* Layout adjustments */
.controls-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
</style>
