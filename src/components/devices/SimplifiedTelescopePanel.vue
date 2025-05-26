<script setup lang="ts">
import log from '@/plugins/logger'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { formatRaNumber, formatDecNumber, parseRaString, parseDecString, formatSiderealTime } from '@/utils/astroCoordinates'
import CollapsibleSection from '@/components/ui/CollapsibleSection.vue'
import { useNotificationStore } from '@/stores/useNotificationStore'
import DeviceInfo from '@/components/ui/DeviceInfo.vue'
import Icon from '@/components/ui/Icon.vue'

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: 'Telescope'
  },
  isConnected: {
    type: Boolean,
    required: true
  }
})

// Get unified store for device interaction
const store = useUnifiedStore()

// Get the current device from the store, this will be our source of truth
const currentDevice = computed(() => {
  return store.getDeviceById(props.deviceId)
})

// Local refs for UI interaction (e.g., slew targets)
const targetRA = ref(0)
const targetDec = ref(0)

// Add refs for human-friendly RA/Dec input
const raInput = ref('')
const decInput = ref('')
const raInputError = ref('')
const decInputError = ref('')

// Helper: parse RA/Dec input (autodetect decimal or sexagesimal)
function parseRaInput(val: string): number | null {
  try {
    if (val.trim() === '') return null
    // Try sexagesimal first
    return parseRaString(val)
  } catch {
    // Try decimal
    const num = Number(val)
    if (!isNaN(num) && num >= 0 && num < 24) return num
    return null
  }
}
function parseDecInput(val: string): number | null {
  try {
    if (val.trim() === '') return null
    // Try sexagesimal first
    return parseDecString(val)
  } catch {
    // Try decimal
    const num = Number(val)
    if (!isNaN(num) && num >= -90 && num <= 90) return num
    return null
  }
}

// Slew action with validation and notification
const notificationStore = useNotificationStore()

// Add a local ref for UI state during slew
const isSlewingLocal = ref(false)
async function handleSlew() {
  raInputError.value = ''
  decInputError.value = ''
  const ra = parseRaInput(raInput.value)
  const dec = parseDecInput(decInput.value)
  let valid = true
  if (ra === null) {
    raInputError.value = 'Invalid RA (use HH:MM:SS or decimal hours)'
    valid = false
  }
  if (dec === null) {
    decInputError.value = 'Invalid Dec (use ±DD:MM:SS or decimal degrees)'
    valid = false
  }
  if (!valid) return
  isSlewingLocal.value = true
  try {
    // Only call if both are numbers
    if (typeof ra === 'number' && typeof dec === 'number') {
      await store.slewToCoordinates(props.deviceId, ra, dec)
      notificationStore.showSuccess('Slew started.')
    }
  } catch (error) {
    notificationStore.showError('Slew failed: ' + (error instanceof Error ? error.message : String(error)))
    log.error({ deviceIds: [props.deviceId] }, 'Slew failed:', error)
  } finally {
    isSlewingLocal.value = false
  }
}

// Computed properties for display, derived from the store
const rightAscension = computed(() => {
  const props = currentDevice.value?.properties
  return (props?.rightAscension as number | undefined) ?? 0
})
const declination = computed(() => {
  const props = currentDevice.value?.properties
  return (props?.declination as number | undefined) ?? 0
})
const altitude = computed(() => {
  const props = currentDevice.value?.properties
  return (props?.altitude as number | undefined) ?? 0
})
const azimuth = computed(() => {
  const props = currentDevice.value?.properties
  return (props?.azimuth as number | undefined) ?? 0
})

// --- Info Table Computed Properties ---
const siderealTime = computed(() => {
  const props = currentDevice.value?.properties
  // Try both camelCase and lower-case
  return (props?.siderealTime ?? props?.siderealtime) as number | undefined
})
const formattedLST = computed(() => {
  return siderealTime.value !== undefined ? formatSiderealTime(siderealTime.value) : '--'
})

const utcDate = computed(() => {
  const props = currentDevice.value?.properties
  // Try both camelCase and lower-case
  return (props?.utcDate ?? props?.utcdate) as string | undefined
})

const formattedUTCDate = computed(() => {
  if (!utcDate.value) return '--'
  // Show as UTC, but in a readable format without subseconds
  try {
    const d = new Date(utcDate.value)
    // Format: YYYY-MM-DD HH:MM:SS UTC
    const iso = d.toISOString().replace('T', ' ').replace('Z', ' UTC')
    return iso.replace(/\.(\d+)(?= UTC)/, '') // Remove subseconds
  } catch {
    return utcDate.value
  }
})

const siteLatitude = computed(() => {
  const props = currentDevice.value?.properties
  return props?.siteLatitude ?? props?.sitelatitude
})
const siteLongitude = computed(() => {
  const props = currentDevice.value?.properties
  return props?.siteLongitude ?? props?.sitelongitude
})
const formattedLat = computed(() => {
  return siteLatitude.value !== undefined ? Number(siteLatitude.value).toFixed(6) : '--'
})
const formattedLon = computed(() => {
  return siteLongitude.value !== undefined ? Number(siteLongitude.value).toFixed(6) : '--'
})

const tracking = computed({
  get: (): boolean => {
    const props = currentDevice.value?.properties
    return (props?.tracking as boolean | undefined) ?? false
  },
  set: async (newValue: boolean) => {
    if (!props.deviceId) return
    try {
      await store.setTelescopeTracking(props.deviceId, newValue, selectedTrackingRate.value)
    } catch (error) {
      log.error({ deviceIds: [props.deviceId] }, 'Error toggling tracking:', error)
    }
  }
})

// Selected tracking rate
const selectedTrackingRate = computed({
  get: (): number => {
    const props = currentDevice.value?.properties
    return (props?.trackingRate as number | undefined) ?? 0
  },
  set: async (newValue: number) => {
    if (!props.deviceId) return
    try {
      await store.setTelescopeTracking(props.deviceId, tracking.value, newValue)
    } catch (error) {
      log.error({ deviceIds: [props.deviceId] }, 'Error setting tracking rate:', error)
    }
  }
})

// Add after selectedTrackingRate computed
const trackingRateLocal = ref(selectedTrackingRate.value)
watch(selectedTrackingRate, (newVal) => {
  trackingRateLocal.value = newVal
})

// Reset telescope state (simplified: mainly for slew targets if needed)
const resetTelescopeState = () => {
  // Values from store will update automatically.
  // Reset local UI state not directly tied to store properties.
  targetRA.value = 0
  targetDec.value = 0
  // The local refs for RA, Dec, etc., are gone, so no need to reset them here.
  // selectedTrackingRate will be derived from store, no need to reset its local ref if it becomes fully computed.
}

// Watch for device ID changes to update our state
watch(
  () => props.deviceId,
  (newDeviceId, oldDeviceId) => {
    if (newDeviceId !== oldDeviceId) {
      log.debug({ deviceIds: [props.deviceId] }, `SimplifiedTelescopePanel: Device changed from ${oldDeviceId} to ${newDeviceId}`)
      resetTelescopeState() // Reset local UI state like targets
      // No need to call updateCoordinates() anymore. Data flows from store.
    }
  },
  { immediate: true }
)

// Format right ascension as HH:MM:SS
const formattedRA = computed<string>(() => {
  return formatRaNumber(rightAscension.value)
})

// Format declination as +/-DD:MM:SS
const formattedDec = computed<string>(() => {
  return formatDecNumber(declination.value)
})

const SIDEREAL_RATE = 0.004178 // degrees per second
const COMMON_MULTIPLIERS = [0.5, 1, 4, 8, 20, 60, 120]
const axisRates = ref<{ label: string; value: number }[]>([])
const selectedAxisRate = ref(0.5)

function isAxisRateRange(r: unknown): r is { Minimum: number; Maximum: number } {
  return (
    typeof r === 'object' &&
    r !== null &&
    typeof (r as { Minimum?: unknown }).Minimum === 'number' &&
    typeof (r as { Maximum?: unknown }).Maximum === 'number'
  )
}

async function fetchAxisRates() {
  if (!props.deviceId) return
  try {
    const ratesRaw = await store.getAxisRates(props.deviceId, 0)
    // Support both array and object-with-Value formats
    let valueArr: unknown[] = []
    if (Array.isArray(ratesRaw)) {
      valueArr = ratesRaw
    } else if (ratesRaw && typeof ratesRaw === 'object' && !Array.isArray(ratesRaw) && Array.isArray((ratesRaw as { Value?: unknown }).Value)) {
      valueArr = (ratesRaw as { Value: unknown[] }).Value
    }
    const ranges = valueArr.filter(isAxisRateRange)
    console.log('ratesRaw', ratesRaw)
    console.log('ranges', ranges)
    if (ranges.length > 0) {
      // Generate candidate rates from multipliers
      const candidateRates = COMMON_MULTIPLIERS.map((mult) => ({
        label: `${mult}x (${(mult * SIDEREAL_RATE).toFixed(4)}°/s)`,
        value: +(mult * SIDEREAL_RATE).toFixed(6)
      }))
      // Add Max as the highest Maximum from all ranges
      const maxRate = Math.max(...ranges.map((r) => r.Maximum))
      candidateRates.push({ label: `Max (${maxRate.toFixed(4)}°/s)`, value: +maxRate.toFixed(6) })
      // Filter candidates to those within any of the device's min/max ranges
      axisRates.value = candidateRates.filter((rate) => ranges.some((r) => rate.value >= r.Minimum && rate.value <= r.Maximum))
      // If nothing matches, fallback to just Max
      if (axisRates.value.length === 0) {
        axisRates.value = [{ label: `Max (${maxRate.toFixed(4)}°/s)`, value: +maxRate.toFixed(6) }]
      }
      selectedAxisRate.value = axisRates.value[0].value
    } else {
      axisRates.value = [{ label: 'Default', value: 0.5 }]
      selectedAxisRate.value = 0.5
    }
  } catch (_e) {
    axisRates.value = [{ label: 'Default', value: 0.5 }]
    selectedAxisRate.value = 0.5
  }
}

onMounted(fetchAxisRates)
watch(() => props.deviceId, fetchAxisRates)

// Update moveDirection to use selectedAxisRate
const moveDirection = async (direction: string) => {
  try {
    if (direction === 'stop') {
      await store.abortSlew(props.deviceId)
      return
    }
    let axisParam = null
    const rate = selectedAxisRate.value
    switch (direction) {
      case 'up': // North
        axisParam = { axis: 1, rate }
        break
      case 'down': // South
        axisParam = { axis: 1, rate: -rate }
        break
      case 'left': // West
        axisParam = { axis: 0, rate: -rate }
        break
      case 'right': // East
        axisParam = { axis: 0, rate }
        break
    }
    if (axisParam) {
      await store.moveAxis(props.deviceId, axisParam.axis, axisParam.rate)
    }
  } catch (error) {
    log.error({ deviceIds: [props.deviceId] }, `Error moving telescope ${direction}:`, error)
  }
}

// Update Park/Unpark/Find Home to use notifications
const isParking = ref(false)
const isUnparking = ref(false)
const isFindingHome = ref(false)
async function parkTelescope() {
  isParking.value = true
  try {
    await store.parkTelescope(props.deviceId)
    notificationStore.showSuccess('Telescope parked.')
  } catch (error) {
    notificationStore.showError('Park failed: ' + (error instanceof Error ? error.message : String(error)))
    log.error({ deviceIds: [props.deviceId] }, 'Error parking telescope:', error)
  } finally {
    isParking.value = false
  }
}
async function unparkTelescope() {
  isUnparking.value = true
  try {
    await store.unparkTelescope(props.deviceId)
    notificationStore.showSuccess('Telescope unparked.')
  } catch (error) {
    notificationStore.showError('Unpark failed: ' + (error instanceof Error ? error.message : String(error)))
    log.error({ deviceIds: [props.deviceId] }, 'Error unparking telescope:', error)
  } finally {
    isUnparking.value = false
  }
}
async function findHome() {
  isFindingHome.value = true
  try {
    await store.findHome(props.deviceId)
    notificationStore.showSuccess('Find Home started.')
  } catch (error) {
    notificationStore.showError('Find Home failed: ' + (error instanceof Error ? error.message : String(error)))
    log.error({ deviceIds: [props.deviceId] }, 'Error finding home:', error)
  } finally {
    isFindingHome.value = false
  }
}

// Telescope Info computed
const telescopeInfo = computed(() => {
  const props = currentDevice.value?.properties || {}
  return {
    model: props.model || '--',
    firmwareVersion: props.firmwareVersion || props.firmware || '--',
    alignmentMode: props.alignmentMode ?? props.alignmentmode ?? '--',
    equatorialSystem: props.equatorialSystem ?? props.equatorialsystem ?? '--',
    apertureArea: props.apertureArea ?? props.aperturearea ?? '--',
    apertureDiameter: props.apertureDiameter ?? props.aperturediameter ?? '--',
    focalLength: props.focalLength ?? props.focallength ?? '--',
    siteLatitude: props.siteLatitude ?? props.sitelatitude ?? '--',
    siteLongitude: props.siteLongitude ?? props.sitelongitude ?? '--',
    siteElevation: props.siteElevation ?? props.siteelevation ?? '--',
    doesRefraction:
      typeof props.doesRefraction !== 'undefined'
        ? String(props.doesRefraction)
        : typeof props.doesrefraction !== 'undefined'
          ? String(props.doesrefraction)
          : '--',
    trackingRates: Array.isArray(props.trackingRates) ? props.trackingRates : Array.isArray(props.trackingrates) ? props.trackingrates : undefined,
    mountType: props.mountType || '--'
  }
})

// Setup polling when mounted
onMounted(() => {
  // No need to call updateCoordinates(). Data flows from store.
  // resetTelescopeState() might be called if needed on mount for initial UI state.
  if (props.deviceId) {
    // ensure deviceId is present before resetting state based on it
    resetTelescopeState()
  }
})

// Watch for changes in connection status (from parent)
watch(
  () => props.isConnected,
  (newIsConnected) => {
    log.debug(
      { deviceIds: [props.deviceId] },
      `SimplifiedTelescopePanel: Connection status changed to ${newIsConnected} for device ${props.deviceId}`
    )
    if (newIsConnected) {
      // Data will flow from the store.
      // Call resetTelescopeState if local UI elements (like targets) need resetting on new connection.
      resetTelescopeState()
      // No need to call updateCoordinates()
    } else {
      resetTelescopeState() // Clear data when disconnected
    }
  },
  { immediate: false }
)

// Cleanup when unmounted
onUnmounted(() => {
  // if (coordUpdateInterval) { // No longer needed
  //   window.clearInterval(coordUpdateInterval)
  //   // coordUpdateInterval = undefined; // Also clear the variable itself
  // }
})

// Tracking rate options (this is fine)
const trackingRates = [
  { value: 0, label: 'Sidereal' },
  { value: 1, label: 'Lunar' },
  { value: 2, label: 'Solar' },
  { value: 3, label: 'King' }
]

// Error/status bar state
const panelError = ref<string | null>(null)
// const panelStatus = ref<string>('Idle') // e.g., 'Slewing', 'Parked', etc.

// Improved: Computed status based on device and local flags
const panelStatus = computed(() => {
  if (isParking.value) return 'Parking...'
  if (isUnparking.value) return 'Unparking...'
  if (isFindingHome.value) return 'Finding Home...'
  if (isSlewingLocal.value || currentDevice.value?.properties?.slewing) return 'Slewing'
  if (currentDevice.value?.properties?.athome) return 'At Home'
  if (currentDevice.value?.properties?.atpark) return 'Parked'
  if (currentDevice.value?.properties?.tracking) return 'Tracking'
  return 'Idle'
})

function clearError() {
  panelError.value = null
}

// TODO: Add notification and logging hooks for all actions

const telescopeInfoArray = computed(() => {
  const t = telescopeInfo.value
  function toStr(val: unknown) {
    if (val === null || val === undefined) return '--'
    if (Array.isArray(val)) return val.join(', ')
    return String(val)
  }
  return [
    ['Model', toStr(t.model)],
    ['Firmware Version', toStr(t.firmwareVersion)],
    ['Alignment Mode', toStr(t.alignmentMode)],
    ['Equatorial System', toStr(t.equatorialSystem)],
    ['Aperture Area', toStr(t.apertureArea)],
    ['Aperture Diameter', toStr(t.apertureDiameter)],
    ['Focal Length', toStr(t.focalLength)],
    ['Site Latitude', toStr(t.siteLatitude)],
    ['Site Longitude', toStr(t.siteLongitude)],
    ['Site Elevation', toStr(t.siteElevation)],
    ['Does Refraction', toStr(t.doesRefraction)],
    ['Tracking Rates', toStr(t.trackingRates)],
    ['Mount Type', toStr(t.mountType)],
    ['Side of Pier', sideOfPierDisplay.value]
  ] as [string, string][]
})

// Computed property for status badge class
const statusBadgeClass = computed(() => {
  switch (panelStatus.value.toLowerCase()) {
    case 'slewing':
      return 'slewing'
    case 'parked':
      return 'parked'
    case 'tracking':
      return 'tracking'
    case 'at home':
      return 'home'
    case 'idle':
      return 'idle'
    default:
      return ''
  }
})

const sideOfPierDisplay = computed(() => {
  const props = currentDevice.value?.properties
  const val = props?.sideOfPier ?? props?.sideofpier
  if (val === 0 || val === '0') return 'East'
  if (val === 1 || val === '1') return 'West'
  if (val === -1 || val === '-1') return 'Unknown'
  if (val === undefined || val === null || val === '' || isNaN(Number(val))) return 'Unknown'
  // Fallback for any other value
  return String(val)
})
</script>

<template>
  <div class="aw-form-group">
    <!-- Error/Status Bar -->
    <div v-if="panelError" class="aw-form-group aw-error-display">
      <span class="aw-error-message-content">{{ panelError }}</span>
      <button class="aw-dismiss-button" aria-label="Dismiss error" @click="clearError">×</button>
    </div>
    <div class="aw-panel-status-bar">
      <span class="aw-status-label">Status:</span>
      <span class="aw-status-value">
        <span :class="['aw-status-badge', statusBadgeClass]">{{ panelStatus }}</span>
      </span>
    </div>

    <div class="aw-panel-content">
      <!-- Main Info + NESW Layout -->
      <div class="aw-main-grid">
        <!-- Info Table -->
        <div class="aw-info-table" role="table" aria-label="Telescope Position and Site Info">
          <div class="aw-info-row" role="row">
            <div class="aw-info-label" role="cell">RA</div>
            <div class="aw-info-value" role="cell">{{ formattedRA }}</div>
          </div>
          <div class="aw-info-row" role="row">
            <div class="aw-info-label" role="cell">Dec</div>
            <div class="aw-info-value" role="cell">{{ formattedDec }}</div>
          </div>
          <div class="aw-info-row" role="row">
            <div class="aw-info-label" role="cell">Alt</div>
            <div class="aw-info-value" role="cell">{{ altitude.toFixed(2) }}°</div>
          </div>
          <div class="aw-info-row" role="row">
            <div class="aw-info-label" role="cell">Az</div>
            <div class="aw-info-value" role="cell">{{ azimuth.toFixed(2) }}°</div>
          </div>
          <div class="aw-info-row" role="row">
            <div class="aw-info-label" role="cell">LST</div>
            <div class="aw-info-value" role="cell">{{ formattedLST }}</div>
          </div>
          <div class="aw-info-row" role="row">
            <div class="aw-info-label" role="cell">Time</div>
            <div class="aw-info-value" role="cell">{{ formattedUTCDate }}</div>
          </div>
          <div class="aw-info-row" role="row">
            <div class="aw-info-label" role="cell">Lat</div>
            <div class="aw-info-value" role="cell">{{ formattedLat }}</div>
          </div>
          <div class="aw-info-row" role="row">
            <div class="aw-info-label" role="cell">Lon</div>
            <div class="aw-info-value" role="cell">{{ formattedLon }}</div>
          </div>
          <div class="aw-info-row" role="row">
            <div class="aw-info-label" role="cell">Side of Pier</div>
            <div class="aw-info-value" role="cell">{{ sideOfPierDisplay }}</div>
          </div>
        </div>
        <div class="aw-movement-controls-row">
          <!-- NESW 3x3 Grid -->
          <div class="aw-direction-pad-3x3 aw-direction-pad-vertical">
            <!-- Top row: Find Home, North, empty -->
            <span></span>
            <button class="aw-btn aw-btn--secondary" aria-label="Move North" @click="moveDirection('up')">
              <Icon type="arrow-up" size="24" />
            </button>
            <span></span>
            <!-- Middle row: West, Stop, East -->
            <button class="aw-btn aw-btn--secondary" aria-label="Move West" @click="moveDirection('left')">
              <Icon type="arrow-left" size="24" />
            </button>
            <button class="aw-btn aw-btn--secondary" aria-label="Stop" @click="moveDirection('stop')">
              <Icon type="stop" size="24" />
            </button>
            <button class="aw-btn aw-btn--secondary" aria-label="Move East" @click="moveDirection('right')">
              <Icon type="arrow-right" size="24" />
            </button>
            <!-- Bottom row: Park, South, Unpark -->
            <span></span>
            <button class="aw-btn aw-btn--secondary" aria-label="Move South" @click="moveDirection('down')">
              <Icon type="arrow-down" size="24" />
            </button>
            <span></span>
          </div>

          <div class="aw-direction-pad-supplemental aw-direction-pad-vertical">
            <button class="aw-btn aw-btn--secondary" aria-label="Find Home" :disabled="isFindingHome" @click="findHome">
              <span v-if="isFindingHome" class="aw-spinner"></span>
              <Icon type="home" size="24" />
            </button>
            <button class="aw-btn aw-btn--secondary" aria-label="Park telescope" :disabled="isParking" @click="parkTelescope">
              <span v-if="isParking" class="aw-spinner"></span>
              <Icon type="park" size="24" />
            </button>
            <button class="aw-btn aw-btn--secondary" aria-label="Unpark telescope" :disabled="isUnparking" @click="unparkTelescope">
              <span v-if="isUnparking" class="aw-spinner"></span>
              <Icon type="unpark" size="24" />
            </button>
          </div>
        </div>
        <!-- Slew to RA/Dec Inputs -->
        <div class="aw-slew-coords-group">
          <!-- RA Row -->
          <div class="aw-input-label">RA</div>
          <input
            id="ra-input"
            v-model="raInput"
            class="aw-input-field"
            :class="{ 'aw-input-error': raInputError }"
            placeholder="e.g. 12:34:56 or 12.5"
            autocomplete="off"
          />
          <div class="aw-input-error-message">{{ raInputError }}</div>
          <!-- Dec Row -->
          <div class="aw-input-label">Dec</div>
          <input
            id="dec-input"
            v-model="decInput"
            class="aw-input-field"
            :class="{ 'aw-input-error': decInputError }"
            placeholder="e.g. +12:34:56 or -12.5"
            autocomplete="off"
          />
          <div class="aw-input-error-message">{{ decInputError }}</div>
          <!-- Buttons Row -->

          <div></div>
          <button class="aw-btn aw-btn--primary" :disabled="isSlewingLocal" @click="handleSlew">Slew</button>
        </div>
        <!-- Tracking Controls -->
        <div class="aw-tracking-controls-row" style="margin-bottom: var(--aw-spacing-md); align-items: center; gap: var(--aw-spacing-md)">
          <label class="aw-tracking-label" for="tracking-enabled-checkbox">Tracking Enabled</label>
          <input id="tracking-enabled-checkbox" v-model="tracking" type="checkbox" class="aw-tracking-checkbox" />
          <label class="aw-tracking-label" for="tracking-rate-select">Tracking Rate</label>
          <select
            id="tracking-rate-select"
            v-model.number="trackingRateLocal"
            class="aw-tracking-select aw-input-field"
            @change="selectedTrackingRate = trackingRateLocal"
          >
            <option v-for="rate in trackingRates" :key="rate.value" :value="rate.value">{{ rate.label }}</option>
          </select>
          <!-- Movement Speed Selector -->
          <label for="axis-rate-select" class="aw-input-label">Movement Speed</label>
          <select id="axis-rate-select" v-model.number="selectedAxisRate" class="aw-input-field">
            <option v-for="rate in axisRates" :key="rate.value" :value="rate.value">
              {{ rate.label }}
            </option>
          </select>
        </div>
      </div>

      <div class="aw-section-divider"></div>
      <!-- Telescope Info Section -->
      <section class="aw-section">
        <CollapsibleSection title="Telescope Info" :default-open="false">
          <DeviceInfo :info="telescopeInfoArray" title="Telescope Info" />
        </CollapsibleSection>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* Panel group and layout */
.aw-form-group {
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-text-color);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
  margin: 0;
  font-family: var(--aw-font-family, inherit);
}

.aw-panel-status-bar {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-sm);
  padding: var(--aw-spacing-xs) var(--aw-spacing-md);
  font-size: var(--aw-font-size-base, 1rem);
  color: var(--aw-text-secondary-color);
  border-bottom: 1px solid var(--aw-panel-border-color);
}

.aw-status-label {
  font-weight: 500;
}

.aw-status-value {
  font-weight: 600;
}

.aw-status-badge {
  display: inline-block;
  border-radius: var(--aw-border-radius-sm);
  padding: var(--aw-spacing-xs) var(--aw-spacing-md);
  font-size: var(--aw-font-size-base, 1em);
  font-family: inherit;
  font-weight: 700;
  background: var(--aw-success-color);
  color: var(--aw-button-primary-text);
}

.aw-status-badge.idle {
  background: var(--aw-panel-border-color);
  color: var(--aw-text-secondary-color);
}

.aw-status-badge.slewing {
  background: var(--aw-warning-color);
  color: var(--aw-warning-text-color);
}

.aw-status-badge.parked {
  background: var(--aw-control-park-color);
  color: var(--aw-text-color);
}

.aw-status-badge.tracking {
  background: var(--aw-status-tracking-on-color);
  color: var(--aw-text-color);
}

.aw-status-badge.home {
  background: var(--aw-panel-header-bg-color);
  color: var(--aw-panel-header-text-color);
}

.aw-panel-content {
  overflow-y: auto;
  flex: 1;
  padding: var(--aw-spacing-lg) var(--aw-spacing-md) var(--aw-spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--aw-spacing-lg);
}

.aw-section {
  width: 100%;
  margin-bottom: var(--aw-spacing-sm);
}

.aw-section-header {
  font-size: var(--aw-font-size-lg, 1.1em);
  font-weight: 700;
  margin-bottom: var(--aw-spacing-xs);
  color: var(--aw-text-color);
  letter-spacing: 0.01em;
}

.aw-section-divider {
  border-bottom: 1px solid var(--aw-panel-border-color);
  margin: var(--aw-spacing-md) 0;
}

.aw-section-table {
  display: grid;
  grid-template-columns: var(--aw-label-width, 90px) 1fr var(--aw-label-width, 90px) 1fr;
  gap: var(--aw-spacing-xs) var(--aw-spacing-md);
  align-items: start;
  margin-bottom: var(--aw-spacing-lg);
}

.aw-row {
  display: contents;
}

.aw-label {
  text-align: right;
  color: var(--aw-text-secondary-color);
  font-weight: 500;
  font-size: var(--aw-font-size-sm, 0.95em);
}

.aw-value {
  text-align: left;
  font-family: var(--aw-font-family-mono, inherit);
  color: var(--aw-text-color);
  min-width: 90px;
  letter-spacing: 0.04em;
  font-size: var(--aw-font-size-sm, 0.95em);
}

/* Only apply background, border-radius, and padding to .aw-value when it does not contain input, select, or checkbox */
.aw-value:not(:has(input, select, textarea)) {
  background: var(--aw-input-bg-color);
  border-radius: var(--aw-border-radius-sm);
  padding: var(--aw-spacing-xs) var(--aw-spacing-md);
}

.aw-tracking-controls-row {
  display: grid;
  grid-template-columns: 0.5fr 1fr;
  grid-template-rows: 1fr;
  align-items: center;
  gap: var(--aw-spacing-md);
  font-size: var(--aw-font-size-sm);
}

.aw-tracking-label {
  font-size: var(--aw-font-size-base, 1em);
  font-weight: 500;
  min-width: 70px;
}

.aw-tracking-checkbox {
  width: 1.2em;
  height: 1.2em;
  margin-right: var(--aw-spacing-xs);
}

.aw-tracking-select {
  min-width: 120px;
  font-size: var(--aw-font-size-base, 1em);
}

.aw-movement-inputs {
  display: flex;
  flex-direction: row;
  gap: var(--aw-spacing-lg);
  margin-bottom: var(--aw-spacing-xs);
}

.aw-coord-input-group {
  display: flex;
  flex-direction: column;
  gap: var(--aw-spacing-xs);
  min-width: 160px;
}

.aw-input-label {
  font-size: var(--aw-font-size-base, 1em);
  font-weight: 500;
  margin-bottom: var(--aw-spacing-xxs, 2px);
}

.aw-input-field {
  font-size: var(--aw-font-size-base, 1em);
  padding: var(--aw-spacing-xs) var(--aw-spacing-md);
  border-radius: var(--aw-border-radius-sm);
  border: 1px solid var(--aw-panel-border-color);
  background: var(--aw-input-bg-color);
  color: var(--aw-text-color);
  font-family: var(--aw-font-family-mono, inherit);
}

.aw-input-hint {
  font-size: var(--aw-font-size-sm, 0.85em);
  color: var(--aw-text-secondary-color);
}

.aw-input-error-message {
  color: var(--aw-error-text-color);
  font-size: var(--aw-font-size-sm, 0.85em);
}

.aw-input-error {
  border-color: var(--aw-color-error-700);
  background: var(--aw-error-muted);
}

.aw-movement-actions {
  display: flex;
  flex-direction: row;
  gap: var(--aw-spacing-md);
  margin-bottom: var(--aw-spacing-xs);
}

.aw-btn {
  font-size: var(--aw-font-size-base, 1em);
  padding: var(--aw-spacing-xs) var(--aw-spacing-lg);
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
}

.aw-btn.primary {
  background: var(--aw-button-primary-bg);
  color: var(--aw-button-primary-text);
}

.aw-btn.secondary {
  background: var(--aw-button-secondary-bg);
  color: var(--aw-button-secondary-text);
}

.aw-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.aw-manual-rate-row {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-md);
  margin-bottom: var(--aw-spacing-xs);
}

.aw-direction-pad-3x3 {
  display: grid;
  grid-template-columns: repeat(3, 48px);
  grid-template-rows: repeat(3, 48px);
  gap: var(--aw-spacing-xs);
  justify-content: center;
  align-items: center;
  margin: var(--aw-spacing-xs) 0 var(--aw-spacing-md);
}

.aw-direction-pad-supplemental {
  display: grid;
  grid-template-columns: repeat(3, 48px);

  /* grid-template-rows: repeat(1, 48px); */
  gap: var(--aw-spacing-xs);
  justify-content: center;
  align-items: center;
  margin: var(--aw-spacing-xs) 0 var(--aw-spacing-md);
}

/* NESW pad button sizing */
.aw-direction-pad-3x3 .aw-btn,
.aw-direction-pad-supplemental .aw-btn {
  width: 48px;
  height: 48px;
  font-size: var(--aw-font-size-xl, 1.5em);
  display: flex;
  align-items: center;
  justify-content: center;
}

.aw-direction-pad-3x3 .aw-btn:hover,
.aw-direction-pad-supplemental .aw-btn:hover {
  background: var(--aw-button-primary-bg);
  color: var(--aw-button-primary-text);
}

@media (width <=600px) {
  .aw-form-group {
    max-width: 100vw;
    padding: 0;
  }

  .aw-panel-content {
    padding: var(--aw-spacing-md) var(--aw-spacing-xs) var(--aw-spacing-sm);
  }

  .aw-live-data-row,
  .aw-tracking-controls-row,
  .aw-movement-inputs,
  .aw-manual-rate-row,
  .aw-actions-row {
    flex-direction: column;
    gap: var(--aw-spacing-xs);
    align-items: flex-start;
  }
}

.aw-actions-row {
  display: flex;
  flex-direction: row;
  gap: var(--aw-spacing-md);
  justify-content: flex-start;
}

.aw-section-table .aw-value > .aw-input-field {
  width: 100%;
  box-sizing: border-box;
}

/* --- Main Info + NESW Layout --- */
.aw-main-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--aw-spacing-sm);
  align-items: start;
  margin-bottom: var(--aw-spacing-lg);
}

.aw-info-table {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-radius: var(--aw-border-radius-sm);
  border: 1px solid var(--aw-panel-border-color);
  background: var(--aw-panel-bg-color);
  min-width: 220px;
  max-width: 320px;
  font-size: var(--aw-font-size-sm, 0.95em);
  box-shadow: none;
}

.aw-info-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  border-bottom: 1px solid var(--aw-panel-border-color);
  min-height: 28px;
  padding: 0 var(--aw-spacing-md);
}

.aw-info-row:last-child {
  /* No border for last child */
}

.aw-info-label {
  flex: 0 0 90px;
  text-align: left;
  color: var(--aw-text-secondary-color);
  font-weight: 500;
  padding: var(--aw-spacing-xs) 0;
}

.aw-info-value {
  flex: 1 1 auto;
  text-align: right;
  color: var(--aw-text-color);
  font-family: var(--aw-font-family-mono, inherit);
  padding: var(--aw-spacing-xs) 0;
}

/* Adjust NESW grid for vertical alignment with info table */
.aw-direction-pad-vertical {
  /* align-self: start; */
}

/* Fix: Prevent icon collapse due to reset's max-width */
.aw-direction-pad-3x3 div.aw-icon,
svg {
  /* color: blue; */
  max-width: none !important;
}

.aw-slew-coords-group {
  display: grid;
  grid-template-columns: 0.25fr 0.5fr 2fr;
  grid-gap: var(--aw-spacing-xs) var(--aw-spacing-md);
  align-items: center;
  font-size: var(--aw-font-size-md);
}

.aw-slew-coords-group input {
  font-size: var(--aw-font-size-md);
}

/* Move this rule above the more specific one to fix linter error */
.aw-input-error-message:empty {
  visibility: hidden;
}

.aw-movement-controls-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--aw-spacing-md);
  font-size: var(--aw-font-size-sm);
}

.aw-movement-speed-selector {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--aw-spacing-md);
}

@media (width <=900px) {
  .aw-main-grid {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
    gap: var(--aw-spacing-md);
  }

  .aw-direction-pad-vertical {
    justify-self: start;
    margin-top: var(--aw-spacing-md);
  }

  .aw-info-table {
    min-width: 0;
    max-width: 100%;
  }
}
</style>
