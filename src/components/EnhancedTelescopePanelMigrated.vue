<script setup lang="ts">
import EnhancedPanelComponentMigrated from './EnhancedPanelComponentMigrated.vue'
import Icon from './Icon.vue'
import { onMounted, reactive, ref, computed, watch, onUnmounted } from 'vue'
import UnifiedStore from '../stores/UnifiedStore'
import { UIMode } from '../stores/useUIPreferencesStore'
import type { TelescopeDevice } from '../types/DeviceTypes'

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

const emit = defineEmits([
  'close',
  'configure',
  'connect',
  'modeChange',
  'slew',
  'toggle-tracking',
  'park',
  'unpark'
])

// Initialize store
const store = new UnifiedStore()

// Get the telescope device directly from the store
const telescope = computed(() => {
  const device = store.getDeviceById(String(props.deviceId))
  return device?.type === 'telescope' ? (device as TelescopeDevice) : null
})

const currentMode = ref(UIMode.OVERVIEW)
const trackingEnabled = computed(() => telescope.value?.properties?.trackingEnabled || false)
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
const isSlewing = computed(() => telescope.value?.properties?.isSlewing || false)
const rightAscension = computed(() => {
  const ra = telescope.value?.properties?.rightAscension
  return typeof ra === 'number' || typeof ra === 'string' ? formatRA(ra) : '00:00:00'
})
const declination = computed(() => {
  const dec = telescope.value?.properties?.declination
  return typeof dec === 'number' || typeof dec === 'string' ? formatDec(dec) : '+00:00:00'
})
const altitude = computed(() => {
  const alt = telescope.value?.properties?.altitude
  return typeof alt === 'number' ? alt : 0
})
const azimuth = computed(() => {
  const az = telescope.value?.properties?.azimuth
  return typeof az === 'number' ? az : 0
})
// Add connected status handling for a smoother UI
const isConnecting = computed(() => telescope.value?.isConnecting || false)

// More detailed telescope data for DETAILED and FULLSCREEN modes
const detailedData = {
  sideOfPier: computed(() => {
    const sideOfPier = telescope.value?.properties?.pierSide
    return typeof sideOfPier === 'string' ? sideOfPier : 'Unknown'
  }),
  siderealTime: computed(() => {
    const time = telescope.value?.properties?.siderealTime
    return typeof time === 'number' || typeof time === 'string' ? formatRA(time) : '00:00:00'
  }),
  targetRightAscension: computed(() => {
    const targetRA = telescope.value?.properties?.targetRightAscension
    return typeof targetRA === 'number' || typeof targetRA === 'string'
      ? formatRA(targetRA)
      : '00:00:00'
  }),
  targetDeclination: computed(() => {
    const targetDec = telescope.value?.properties?.targetDeclination
    return typeof targetDec === 'number' || typeof targetDec === 'string'
      ? formatDec(targetDec)
      : '+00:00:00'
  }),
  parkingState: computed(() => {
    const parked = telescope.value?.properties?.parked
    return parked === true ? 'Parked' : 'Not Parked'
  }),
  trackingRate: computed(() => {
    const rate = telescope.value?.properties?.trackingRate
    return typeof rate === 'number' ? rate : 0
  })
}

// Target coordinates for manual input
const targetRA = ref('00:00:00')
const targetDec = ref('+00:00:00')

// Computed values
const formattedRA = computed(() => rightAscension.value)
const formattedDec = computed(() => declination.value)
const formattedAlt = computed(() => `${altitude.value.toFixed(2)}°`)
const formattedAz = computed(() => `${azimuth.value.toFixed(2)}°`)

// Handle connection toggle
function handleConnectionToggle() {
  if (isConnecting.value) return // Prevent multiple rapid connection attempts
  emit('connect', !props.connected)
}

// Handle mode changes
function onModeChange(mode: UIMode) {
  currentMode.value = mode
  emit('modeChange', mode)
}

// Handle component lifecycle
onMounted(() => {
  if (props.connected) {
    // Add event listeners for property changes
    store.on('devicePropertyChanged', handlePropertyChangeEvent)
  }
})

// Clean up on component unmount
onUnmounted(() => {
  // Remove event listeners
  store.off('devicePropertyChanged', handlePropertyChangeEvent)
})

// Watch for connection changes
watch(
  () => props.connected,
  (newValue) => {
    if (newValue) {
      // Add event listeners for property changes when connected
      store.on('devicePropertyChanged', handlePropertyChangeEvent)
    } else {
      // Remove event listeners when disconnected
      store.off('devicePropertyChanged', handlePropertyChangeEvent)
    }
  }
)

// Handle property changes from store
function handlePropertyChangeEvent(...args: unknown[]) {
  if (args.length < 3) return

  const deviceId = args[0] as string
  const property = args[1] as string
  const value = args[2]

  if (deviceId !== String(props.deviceId)) return

  // Handle specific property updates if needed
  if (property === 'error') {
    lastError.value = String(value)
  }
}

// Format RA from hours to HH:MM:SS
function formatRA(ra: number | string): string {
  const hours = parseFloat(String(ra))
  if (isNaN(hours)) return '00:00:00'

  const h = Math.floor(hours)
  const m = Math.floor((hours - h) * 60)
  const s = Math.floor(((hours - h) * 60 - m) * 60)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// Format Dec from degrees to DD:MM:SS
function formatDec(dec: number | string): string {
  const degrees = parseFloat(String(dec))
  if (isNaN(degrees)) return '+00:00:00'

  const sign = degrees < 0 ? '-' : '+'
  const absDeg = Math.abs(degrees)
  const d = Math.floor(absDeg)
  const m = Math.floor((absDeg - d) * 60)
  const s = Math.floor(((absDeg - d) * 60 - m) * 60)
  return `${sign}${d.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// Telescope control functions
function toggleTracking() {
  try {
    emit('toggle-tracking', !trackingEnabled.value)
  } catch (error) {
    console.error('Error toggling tracking:', error)
    lastError.value = 'Failed to toggle tracking'
  }
}

// Slew to coordinates
function slewToCoordinates() {
  try {
    emit('slew', targetRA.value, targetDec.value)
  } catch (error) {
    console.error('Error slewing to coordinates:', error)
    lastError.value = 'Failed to slew to coordinates'
  }
}

// Park/unpark functions
function parkTelescope() {
  try {
    emit('park')
  } catch (error) {
    console.error('Error parking telescope:', error)
    lastError.value = 'Failed to park telescope'
  }
}

function unparkTelescope() {
  try {
    emit('unpark')
  } catch (error) {
    console.error('Error unparking telescope:', error)
    lastError.value = 'Failed to unpark telescope'
  }
}

// Telescope movement controls
function moveNorth() {
  try {
    store.emit('callDeviceMethod', String(props.deviceId), 'moveAxis', [
      TelescopeAxes.Secondary,
      slewRateMapping[selectedSlewRate.value] || parseFloat(String(selectedSlewRate.value))
    ])
  } catch (error) {
    console.error('Error moving telescope North:', error)
    lastError.value = 'Failed to move telescope North'
  }
}

function moveSouth() {
  try {
    store.emit('callDeviceMethod', String(props.deviceId), 'moveAxis', [
      TelescopeAxes.Secondary,
      -(slewRateMapping[selectedSlewRate.value] || parseFloat(String(selectedSlewRate.value)))
    ])
  } catch (error) {
    console.error('Error moving telescope South:', error)
    lastError.value = 'Failed to move telescope South'
  }
}

function moveEast() {
  try {
    store.emit('callDeviceMethod', String(props.deviceId), 'moveAxis', [
      TelescopeAxes.Primary,
      slewRateMapping[selectedSlewRate.value] || parseFloat(String(selectedSlewRate.value))
    ])
  } catch (error) {
    console.error('Error moving telescope East:', error)
    lastError.value = 'Failed to move telescope East'
  }
}

function moveWest() {
  try {
    store.emit('callDeviceMethod', String(props.deviceId), 'moveAxis', [
      TelescopeAxes.Primary,
      -(slewRateMapping[selectedSlewRate.value] || parseFloat(String(selectedSlewRate.value)))
    ])
  } catch (error) {
    console.error('Error moving telescope West:', error)
    lastError.value = 'Failed to move telescope West'
  }
}

function stopSlew() {
  try {
    store.emit('callDeviceMethod', String(props.deviceId), 'abortSlew', [])
  } catch (error) {
    console.error('Error stopping telescope slew:', error)
    lastError.value = 'Failed to stop telescope slew'
  }
}
</script>

<template>
  <EnhancedPanelComponentMigrated
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
                  :disabled="!connected || isSlewing"
                  @click="parkTelescope"
                >
                  <Icon type="parking" />
                  <span>Park</span>
                </button>

                <button
                  class="action-btn"
                  :disabled="!connected || detailedData.parkingState !== 'Parked'"
                  @click="unparkTelescope"
                >
                  <Icon type="unparking" />
                  <span>Unpark</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Slew Controls Section -->
        <div class="slew-section">
          <div class="section-header">
            <h3>Slew Controls</h3>
          </div>

          <div class="slew-controls-grid">
            <!-- Manual Coordinates Entry -->
            <div class="target-coords">
              <h4>Target Coordinates</h4>
              <div class="coords-inputs">
                <div class="coord-input">
                  <label for="targetRA">RA:</label>
                  <input
                    id="targetRA"
                    v-model="targetRA"
                    type="text"
                    placeholder="HH:MM:SS"
                    :disabled="!connected"
                  />
                </div>
                <div class="coord-input">
                  <label for="targetDec">Dec:</label>
                  <input
                    id="targetDec"
                    v-model="targetDec"
                    type="text"
                    placeholder="+DD:MM:SS"
                    :disabled="!connected"
                  />
                </div>
                <button
                  :disabled="!connected || isSlewing"
                  class="slew-to-coords"
                  @click="slewToCoordinates"
                >
                  <Icon type="target" />
                  <span>Slew to Coordinates</span>
                </button>
              </div>
            </div>

            <!-- Directional Control Pad -->
            <div class="directional-pad">
              <h4>Manual Control</h4>
              <div class="slew-rate">
                <label for="slewRate">Slew Rate:</label>
                <select
                  id="slewRate"
                  v-model="selectedSlewRate"
                  :disabled="!connected || isSlewing"
                >
                  <option v-for="rate in slewRateOptions" :key="rate" :value="rate">
                    {{ rate }}
                  </option>
                </select>
              </div>
              <div class="direction-controls">
                <button
                  class="dir-btn north"
                  :disabled="!connected || isSlewing"
                  @click="moveNorth"
                >
                  <Icon type="arrow-up" />
                </button>
                <div class="middle-row">
                  <button
                    class="dir-btn west"
                    :disabled="!connected || isSlewing"
                    @click="moveWest"
                  >
                    <Icon type="arrow-left" />
                  </button>
                  <button
                    class="dir-btn stop"
                    :disabled="!connected || !isSlewing"
                    @click="stopSlew"
                  >
                    <Icon type="stop" />
                  </button>
                  <button
                    class="dir-btn east"
                    :disabled="!connected || isSlewing"
                    @click="moveEast"
                  >
                    <Icon type="arrow-right" />
                  </button>
                </div>
                <button
                  class="dir-btn south"
                  :disabled="!connected || isSlewing"
                  @click="moveSouth"
                >
                  <Icon type="arrow-down" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </EnhancedPanelComponentMigrated>
</template>

<style scoped>
/* Telescope Panel Styles */
.telescope-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

/* Overview Mode */
.overview-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 12px;
  overflow: hidden;
}

/* Status Indicators */
.status-indicators {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 12px;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-label {
  font-size: 0.85rem;
  opacity: 0.8;
  width: 90px;
}

.status-value {
  font-weight: 600;
  font-size: 0.9rem;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.8rem;
  gap: 6px;
}

.status-badge.active {
  background: rgba(33, 150, 243, 0.15);
  color: var(--aw-panel-action-color, #2196f3);
}

/* Position Section */
.position-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 12px;
}

.position-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.position-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.position-group h4 {
  margin: 0;
  font-size: 0.85rem;
  opacity: 0.7;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 4px;
}

.position-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.coord-label {
  font-size: 0.85rem;
  opacity: 0.8;
  width: 40px;
}

.coord-value {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  font-size: 0.9rem;
}

/* Controls */
.control-section {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 12px;
}

.control-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--aw-panel-action-color, #2196f3);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.control-btn:hover:not(:disabled) {
  transform: translateY(-2px);
}

.control-btn.active {
  background: #4caf50;
}

.control-btn.warning {
  background: #ff9800;
}

.slew-title {
  margin-top: 4px;
  margin-bottom: 8px;
  font-size: 0.9rem;
  font-weight: 600;
}

.slew-inputs {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.slew-input {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.slew-input label {
  font-size: 0.8rem;
  opacity: 0.8;
}

.slew-input input {
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.2);
  color: inherit;
  font-family: 'Courier New', monospace;
}

/* Detailed Mode */

.detailed-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  height: 100%;
  overflow: auto;
}

.position-details {
  display: flex;
  gap: 20px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 16px;
}

.position-column {
  flex: 1;
}

.position-column h3 {
  margin-top: 0;
  margin-bottom: 12px;
  font-size: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 6px;
}

.coord-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.coord-row .label {
  width: 80px;
  font-size: 0.85rem;
  opacity: 0.8;
}

.coord-row .value {
  font-family: 'Courier New', monospace;
  font-weight: 600;
}

.status-controls-optimized {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.status-section,
.quick-actions {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 16px;
}

.status-section h3,
.quick-actions h3 {
  margin-top: 0;
  margin-bottom: 12px;
  font-size: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 6px;
}

.status-badges-detailed {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-badges-detailed .status-badge {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  padding: 8px 12px;
}

.status-badges-detailed .status-badge.active {
  background: rgba(33, 150, 243, 0.15);
}

.badge-label {
  width: 100px;
  font-size: 0.85rem;
  opacity: 0.8;
}

.badge-value {
  font-weight: 600;
}

.quick-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.15);
  border: none;
  border-radius: 4px;
  color: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.25);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.active {
  background: rgba(33, 150, 243, 0.15);
  color: var(--aw-panel-action-color, #2196f3);
}

.slew-section {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 16px;
}

.section-header {
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  font-size: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 6px;
}

.slew-controls-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.target-coords,
.directional-pad {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 6px;
  padding: 12px;
}

.target-coords h4,
.directional-pad h4 {
  margin-top: 0;
  margin-bottom: 12px;
  font-size: 0.9rem;
  opacity: 0.9;
}

.coords-inputs {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.coord-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.coord-input label {
  width: 40px;
  font-size: 0.85rem;
  opacity: 0.8;
}

.coord-input input {
  flex: 1;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.1);
  color: inherit;
  font-family: 'Courier New', monospace;
}

.slew-to-coords {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 8px 0;
  margin-top: 8px;
  background: var(--aw-panel-action-color, #2196f3);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.slew-to-coords:hover:not(:disabled) {
  transform: translateY(-2px);
}

.slew-to-coords:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.slew-rate {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.slew-rate label {
  font-size: 0.85rem;
  opacity: 0.8;
}

.slew-rate select {
  flex: 1;
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.1);
  color: inherit;
}

.direction-controls {
  display: grid;
  grid-template-rows: auto auto auto;
  justify-items: center;
  gap: 8px;
}

.middle-row {
  display: grid;
  grid-template-columns: auto auto auto;
  gap: 8px;
  width: 100%;
}

.dir-btn {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.15);
  border: none;
  border-radius: 4px;
  color: inherit;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dir-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.25);
}

.dir-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dir-btn.stop {
  background: rgba(244, 67, 54, 0.15);
  color: #f44336;
}

.dir-btn.stop:hover:not(:disabled) {
  background: rgba(244, 67, 54, 0.25);
}
</style>
