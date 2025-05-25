<script setup lang="ts">

import log from '@/plugins/logger'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { setAlpacaProperty, callAlpacaMethod } from '@/utils/alpacaPropertyAccess'
import { formatRaNumber, formatDecNumber, parseRaString, parseDecString } from '@/utils/astroCoordinates'
import CollapsibleSection from '@/components/ui/CollapsibleSection.vue'
import { useNotificationStore } from '@/stores/useNotificationStore'
import DeviceInfo from '@/components/ui/DeviceInfo.vue'

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
const isSlewingFlag = computed(() => {
  return !!currentDevice.value?.properties?.slewing
})
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
    log.error({deviceIds:[props.deviceId]}, 'Slew failed:', error)
  } finally {
    isSlewingLocal.value = false
  }
}

// Computed properties for display, derived from the store
const rightAscension = computed(() => {
  const props = currentDevice.value?.properties;
  return (props?.rightAscension as number | undefined) ?? 0;
})
const declination = computed(() => {
  const props = currentDevice.value?.properties;
  return (props?.declination as number | undefined) ?? 0;
})
const altitude = computed(() => {
  const props = currentDevice.value?.properties;
  return (props?.altitude as number | undefined) ?? 0;
})
const azimuth = computed(() => {
  const props = currentDevice.value?.properties;
  return (props?.azimuth as number | undefined) ?? 0;
})

const tracking = computed({
  get: (): boolean => {
    const props = currentDevice.value?.properties;
    return (props?.tracking as boolean | undefined) ?? false;
  },
  set: async (newValue: boolean) => {
    if (!props.deviceId) return;
    try {
      await setAlpacaProperty(props.deviceId, 'tracking', newValue)
    } catch (error) {
      log.error({deviceIds:[props.deviceId]}, 'Error toggling tracking:', error)
    }
  }
})

// Selected tracking rate
const selectedTrackingRate = computed({
  get: (): number => {
    const props = currentDevice.value?.properties;
    return (props?.trackingRate as number | undefined) ?? 0;
  },
  set: async (newValue: number) => {
    if (!props.deviceId) return;
    try {
      await setAlpacaProperty(props.deviceId, 'trackingRate', newValue)
    } catch (error) {
      log.error({deviceIds:[props.deviceId]}, 'Error setting tracking rate:', error)
    }
  }
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
watch(() => props.deviceId, (newDeviceId, oldDeviceId) => {
  if (newDeviceId !== oldDeviceId) {
    log.debug({deviceIds:[props.deviceId]}, `SimplifiedTelescopePanel: Device changed from ${oldDeviceId} to ${newDeviceId}`)
    resetTelescopeState() // Reset local UI state like targets
    // No need to call updateCoordinates() anymore. Data flows from store.
  }
}, { immediate: true })

// Format right ascension as HH:MM:SS
const formattedRA = computed<string>(() => {
  return formatRaNumber(rightAscension.value);
})

// Format declination as +/-DD:MM:SS
const formattedDec = computed<string>(() => {
  return formatDecNumber(declination.value);
})

// Simple slew to coordinates
const slewToCoordinates = async () => {
  try {
    await callAlpacaMethod(props.deviceId, 'slewToCoordinates', {
      rightAscension: targetRA.value,
      declination: targetDec.value
    })
  } catch (error) {
    log.error({deviceIds:[props.deviceId]}, 'Error slewing to coordinates:', error)
  }
}

// Direction control buttons for manual slew
const moveDirection = async (direction: string) => {
  try {
    if (direction === 'stop') {
      await callAlpacaMethod(props.deviceId, 'abortSlew')
      return
    }
    
    let axisParam = null
    
    switch (direction) {
      case 'up': // North
        axisParam = { axis: 1, rate: 0.5 }
        break
      case 'down': // South
        axisParam = { axis: 1, rate: -0.5 }
        break
      case 'left': // West
        axisParam = { axis: 0, rate: -0.5 }
        break
      case 'right': // East
        axisParam = { axis: 0, rate: 0.5 }
        break
    }
    
    if (axisParam) {
      await callAlpacaMethod(props.deviceId, 'moveAxis', axisParam)
    }
  } catch (error) {
    log.error({deviceIds:[props.deviceId]}, `Error moving telescope ${direction}:`, error)
  }
}

// Add computed for sync support and live status flags
const canSync = computed(() => {
  // Check if the device supports syncToCoordinates (store or device property)
  return typeof store.syncToCoordinates === 'function'
})
const isParked = computed(() => {
  return !!currentDevice.value?.properties?.atpark
})
const isTracking = computed(() => {
  return !!currentDevice.value?.properties?.tracking
})

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
    log.error({deviceIds:[props.deviceId]}, 'Error parking telescope:', error)
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
    log.error({deviceIds:[props.deviceId]}, 'Error unparking telescope:', error)
  } finally {
    isUnparking.value = false
  }
}
async function findHome() {
  notificationStore.showError('Find Home is not supported on this system.')
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
    doesRefraction: typeof props.doesRefraction !== 'undefined' ? String(props.doesRefraction) : (typeof props.doesrefraction !== 'undefined' ? String(props.doesrefraction) : '--'),
    trackingRates: Array.isArray(props.trackingRates) ? props.trackingRates : (Array.isArray(props.trackingrates) ? props.trackingrates : undefined),
    mountType: props.mountType || '--',
  }
})

// Setup polling when mounted
onMounted(() => {
  // No need to call updateCoordinates(). Data flows from store.
  // resetTelescopeState() might be called if needed on mount for initial UI state.
  if (props.deviceId) { // ensure deviceId is present before resetting state based on it
      resetTelescopeState()
  }
})

// Watch for changes in connection status (from parent)
watch(() => props.isConnected, (newIsConnected) => {
  log.debug({deviceIds:[props.deviceId]}, `SimplifiedTelescopePanel: Connection status changed to ${newIsConnected} for device ${props.deviceId}`);
  if (newIsConnected) {
    // Data will flow from the store.
    // Call resetTelescopeState if local UI elements (like targets) need resetting on new connection.
    resetTelescopeState()
    // No need to call updateCoordinates()
  } else {
    resetTelescopeState() // Clear data when disconnected
  }
}, { immediate: false })

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
const panelStatus = ref<string>('Idle') // e.g., 'Slewing', 'Parked', etc.

// Example: Watch for device status changes to update status bar
watch(currentDevice, (dev) => {
  // TODO: Update panelStatus based on device properties (slewing, parked, etc.)
  // panelStatus.value = ...
}, { immediate: true })

// Example: Error handling (to be replaced with notification system integration)
function showError(msg: string) {
  panelError.value = msg
  // TODO: Also send to notification system
  log.error({deviceIds:[props.deviceId]}, msg)
}
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
  ] as [string, string][]
})

</script>

<template>
  <div class="simplified-panel">
    <!-- Error/Status Bar -->
    <div v-if="panelError" class="panel-error-display">
      <span class="error-message-content">{{ panelError }}</span>
      <button class="dismiss-button" aria-label="Dismiss error" @click="clearError">×</button>
    </div>
    <div class="panel-status-bar">
      <span class="status-label">Status:</span>
      <span class="status-value">{{ panelStatus }}</span>
      <!-- TODO: Add icons/colors for slewing, parked, etc. -->
    </div>

    <div class="panel-content">
      <div class="sections-grid">
        <!-- Position Section -->
        <CollapsibleSection title="Position" :default-open="true">
          <div class="position-grid">
            <div class="coordinate-row">
              <label class="aw-label" aria-label="Right Ascension">RA:</label>
              <span class="aw-value">{{ formattedRA }}</span>
            </div>
            <div class="coordinate-row">
              <label class="aw-label" aria-label="Declination">Dec:</label>
              <span class="aw-value">{{ formattedDec }}</span>
            </div>
            <div class="coordinate-row">
              <label class="aw-label" aria-label="Altitude">Alt:</label>
              <span class="aw-value">{{ altitude.toFixed(2) }}°</span>
            </div>
            <div class="coordinate-row">
              <label class="aw-label" aria-label="Azimuth">Az:</label>
              <span class="aw-value">{{ azimuth.toFixed(2) }}°</span>
            </div>
            <div class="coordinate-row">
              <label class="aw-label" aria-label="Side of Pier">Side of Pier:</label>
              <span class="aw-value">--</span>
            </div>
            <div class="status-flags">
              <span v-if="isSlewingLocal" class="status-badge">Slewing</span>
              <span v-if="isParked" class="status-badge">Parked</span>
              <span v-if="isTracking" class="status-badge">Tracking</span>
            </div>
            <div class="tracking-controls" style="margin-top: 8px;">
              <label class="aw-label" for="tracking-toggle">Tracking:</label>
              <input id="tracking-toggle" v-model="tracking" type="checkbox" class="aw-input" aria-label="Tracking toggle" />
              <label class="aw-label" for="tracking-rate-select">Rate:</label>
              <select id="tracking-rate-select" v-model="selectedTrackingRate" class="aw-select aw-select--sm" aria-label="Tracking rate">
                <option v-for="rate in trackingRates" :key="rate.value" :value="rate.value">
                  {{ rate.label }}
                </option>
              </select>
            </div>
          </div>
        </CollapsibleSection>

        <!-- Movement Section -->
        <CollapsibleSection title="Movement" :default-open="true">
          <div class="movement-controls">
            <div class="slew-coords">
              <label for="ra-input" class="aw-label">RA</label>
              <input
id="ra-input" v-model="raInput" type="text" class="aw-input aw-input--sm" aria-label="Target RA"
                :disabled="isSlewingLocal" :class="{ 'input-error': raInputError }" placeholder="e.g. 12:34:56 or 12.58" />
              <span class="input-hint">(HH:MM:SS or decimal hours)</span>
              <span v-if="raInputError" class="input-error-message">{{ raInputError }}</span>
              <label for="dec-input" class="aw-label">Dec</label>
              <input
id="dec-input" v-model="decInput" type="text" class="aw-input aw-input--sm" aria-label="Target Dec"
                :disabled="isSlewingLocal" :class="{ 'input-error': decInputError }" placeholder="e.g. +12:34:56 or 12.58" />
              <span class="input-hint">(±DD:MM:SS or decimal degrees)</span>
              <span v-if="decInputError" class="input-error-message">{{ decInputError }}</span>
              <button class="aw-btn aw-btn--primary aw-btn--sm" aria-label="Slew to coordinates" :disabled="isSlewingLocal" @click="handleSlew">Slew</button>
              <button class="aw-btn aw-btn--secondary aw-btn--sm" aria-label="Reset coordinates" :disabled="isSlewingLocal" @click="resetTelescopeState">Reset</button>
            </div>
            <div class="sync-coords">
              <!-- Sync to Coordinates button removed -->
            </div>
            <div class="direction-pad">
              <button class="direction-btn" aria-label="Move North" @click="moveDirection('up')">▲</button>
              <div>
                <button class="direction-btn" aria-label="Move West" @click="moveDirection('left')">◄</button>
                <button class="direction-btn" aria-label="Stop" @click="moveDirection('stop')">■</button>
                <button class="direction-btn" aria-label="Move East" @click="moveDirection('right')">►</button>
              </div>
              <button class="direction-btn" aria-label="Move South" @click="moveDirection('down')">▼</button>
            </div>
            <div class="pulse-guide">
              <!-- TODO: Add Pulse Guiding controls if supported -->
            </div>
            <div class="advanced-controls" style="margin-top: 8px;">
              <button class="aw-btn aw-btn--primary aw-btn--sm" aria-label="Park telescope" :disabled="isParking" @click="parkTelescope">Park</button>
              <button class="aw-btn aw-btn--secondary aw-btn--sm" aria-label="Unpark telescope" :disabled="isUnparking" @click="unparkTelescope">Unpark</button>
              <button class="aw-btn aw-btn--secondary aw-btn--sm" aria-label="Find home" :disabled="isFindingHome" @click="findHome">Find Home</button>
            </div>
          </div>
        </CollapsibleSection>

        <!-- Telescope Info Section -->
        <CollapsibleSection title="Telescope Info" :default-open="false">
          <DeviceInfo :info="telescopeInfoArray" title="Telescope Info" />
        </CollapsibleSection>
      </div>
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
  container-type: inline-size;
}
.panel-header {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-md);
  padding: var(--aw-spacing-sm) var(--aw-spacing-md);
  border-bottom: 1px solid var(--aw-panel-border-color);
  background-color: var(--aw-panel-header-bg-color);
}
.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--aw-error-color);
  display: inline-block;
}
.status-indicator.connected {
  background: var(--aw-success-color);
}
.status-indicator.disconnected {
  background: var(--aw-error-color);
}
.device-name {
  font-size: 0.9rem;
  color: var(--aw-text-secondary-color);
}
.panel-error-display {
  background-color: var(--aw-color-error-muted);
  color: var(--aw-color-error-700);
  padding: var(--aw-spacing-sm);
  border-radius: var(--aw-border-radius-sm);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid var(--aw-color-error-border);
  margin: var(--aw-spacing-sm) var(--aw-spacing-md);
}
.error-message-content {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-sm);
}
.dismiss-button {
  background: none;
  border: none;
  color: var(--aw-color-error-700);
  cursor: pointer;
  padding: var(--aw-spacing-xs);
  font-size: 1.2rem;
}
.panel-status-bar {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-sm);
  padding: 0 var(--aw-spacing-md);
  font-size: 0.95rem;
  color: var(--aw-text-secondary-color);
}
.status-label {
  font-weight: 500;
}
.status-value {
  font-weight: 600;
  color: var(--aw-text-color);
}
.panel-content {
  overflow-y: auto;
  flex: 1;
  padding: var(--aw-spacing-md);
}
.position-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--aw-spacing-sm);
}
.coordinate-row {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-xs);
}
.status-flags {
  grid-column: 1 / -1;
  display: flex;
  gap: var(--aw-spacing-xs);
  margin-top: var(--aw-spacing-xs);
}
.status-badge {
  background: var(--aw-panel-header-bg-color);
  color: var(--aw-text-secondary-color);
  border-radius: var(--aw-border-radius-sm);
  padding: 2px 8px;
  font-size: 0.8rem;
}
.movement-controls {
  display: flex;
  flex-direction: column;
  gap: var(--aw-spacing-md);
}
.slew-coords {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-xs);
  flex-wrap: wrap;
}
.sync-coords {
  margin-top: var(--aw-spacing-xs);
}
.direction-pad {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin-top: var(--aw-spacing-sm);
}
.direction-btn {
  width: 36px;
  height: 36px;
  background: var(--aw-panel-bg-color);
  color: var(--aw-text-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-sm);
  font-size: 1.2rem;
  margin: 1px;
  cursor: pointer;
}
.direction-btn:hover {
  background: var(--aw-panel-hover-bg-color);
}
.tracking-controls {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-sm);
}
.tracking-controls .aw-select {
  min-width: 120px;
  flex: 1 1 0;
}
.advanced-controls {
  display: flex;
  gap: var(--aw-spacing-sm);
  flex-wrap: wrap;
}
.telescope-info-list {
  display: grid;
  grid-template-columns: max-content 1fr;
  row-gap: 0;
  column-gap: var(--aw-spacing-lg);
  margin: 0;
  padding: 0;
  font-size: 0.85rem;
  background: var(--aw-panel-bg-color);
  border-radius: var(--aw-border-radius-sm);
  box-shadow: none;
  border: 1px solid var(--aw-panel-border-color);
  overflow: hidden;
}
.info-row {
  display: contents;
}
.telescope-info-list dt {
  color: var(--aw-text-secondary-color);
  font-weight: 500;
  text-align: left;
  padding: 8px 12px 8px 0;
  border-bottom: 1px solid var(--aw-panel-border-color);
  font-size: 0.85em;
  background: none;
}
.telescope-info-list dd {
  color: var(--aw-text-color);
  font-weight: 600;
  text-align: right;
  font-variant-numeric: tabular-nums;
  word-break: break-all;
  padding: 8px 0 8px 12px;
  border-bottom: 1px solid var(--aw-panel-border-color);
  background: none;
}
.telescope-info-list dt:last-child,
.telescope-info-list dd:last-child {
  border-bottom: none;
}
@media (max-width: 600px) {
  .telescope-info-list {
    font-size: 0.8rem;
    grid-template-columns: 1fr;
  }
  .telescope-info-list dt, .telescope-info-list dd {
    padding: 6px 8px;
  }
}
.sections-grid {
  display: grid;
  gap: var(--aw-spacing-md);
  grid-template-columns: 1fr 1fr;
}
@container (max-width: 600px) {
  .sections-grid {
    grid-template-columns: 1fr;
  }
}
.input-hint {
  font-size: 0.8rem;
  color: var(--aw-text-secondary-color);
}
.input-error-message {
  color: var(--aw-color-error-700);
  font-size: 0.8rem;
}
</style> 