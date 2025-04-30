<script setup lang="ts">
import EnhancedPanelComponentMigrated from '@/components/ui/EnhancedPanelComponentMigrated.vue'
import Icon from '@/components/ui/Icon.vue'
import { onMounted, ref, computed, onUnmounted } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { UIMode } from '@/stores/useUIPreferencesStore'
import type { TelescopeDevice } from '@/types/DeviceTypes'

const props = defineProps({
  panelName: { type: String, required: true },
  connected: { type: Boolean, required: true },
  deviceType: { type: String, required: true },
  deviceId: { type: String, required: true },
  supportedModes: {
    type: Array as () => UIMode[],
    default: () => [UIMode.OVERVIEW, UIMode.DETAILED]
  },
  idx: { type: [String, Number], required: true },
  deviceNum: { type: Number, required: true }
})

const emit = defineEmits(['close', 'configure', 'connect', 'modeChange', 'viewDeviceInfo'])

// Initialize store
const store = useUnifiedStore()

// Get the telescope device directly from the store
const telescope = computed(() => {
  return store.getDeviceById(props.deviceId) as TelescopeDevice | null
})

// Define the coordinate types for TypeScript
interface Coordinates {
  rightAscension: number
  declination: number
  altitude: number
  azimuth: number
  lst?: string
}

// Extend TelescopeDevice interface to include coordinates
declare module '@/types/DeviceTypes' {
  interface TelescopeDevice {
    coordinates?: Coordinates
  }
}

// Local state
const currentMode = ref<UIMode>(props.supportedModes[0])
const targetRA = ref<string>('')
const targetDec = ref<string>('')
const lastError = ref<string | null>(null)
const isConnecting = ref(false)
const isSlewing = ref(false)

// Slew rates
const slewRateOptions = ['Guide', 'Centering', 'Find', 'Max']
const selectedSlewRate = ref(slewRateOptions[1]) // Default to 'Centering'
const slewRateMapping = {
  Guide: 1,
  Centering: 3,
  Find: 6,
  Max: 9
}

// Telescope coordinate data
const detailedData = computed(() => ({
  rightAscension: formatRADec(telescope.value?.coordinates?.rightAscension || 0, true),
  declination: formatRADec(telescope.value?.coordinates?.declination || 0, false),
  altitude: formatAltAz(telescope.value?.coordinates?.altitude || 0),
  azimuth: formatAltAz(telescope.value?.coordinates?.azimuth || 0),
  parkingState: telescope.value?.properties?.parked ? 'Parked' : 'Not Parked'
}))

// Status computed properties
const trackingEnabled = computed(() => {
  return telescope.value?.properties?.tracking || false
})

// Event handlers
async function toggleTracking() {
  if (!props.connected) return

  try {
    if (trackingEnabled.value) {
      // Turn tracking off
      await store.callDeviceMethod(props.deviceId, 'setTracking', [false])

      // Keep emit for compatibility with tests
      store.emit('telescope.stopTracking', props.deviceId)
    } else {
      // Turn tracking on
      await store.callDeviceMethod(props.deviceId, 'setTracking', [true])

      // Keep emit for compatibility with tests
      store.emit('telescope.startTracking', props.deviceId)
    }
  } catch (error) {
    console.error('Error toggling tracking:', error)
    lastError.value = `Failed to toggle tracking: ${error instanceof Error ? error.message : String(error)}`
  }
}

async function slewToCoordinates() {
  if (!props.connected || isSlewing.value) return

  try {
    isSlewing.value = true

    // Call the device API
    await store.callDeviceMethod(props.deviceId, 'slew', [targetRA.value, targetDec.value])

    // Keep emit for compatibility with tests
    store.emit('telescope.slewToCoordinates', props.deviceId, {
      rightAscension: targetRA.value,
      declination: targetDec.value
    })

    // In a real implementation, we would wait for a confirmation that the slew is complete
    // For this example, we'll simulate it with a timeout
    setTimeout(() => {
      isSlewing.value = false
    }, 5000)
  } catch (error) {
    console.error('Error slewing to coordinates:', error)
    lastError.value = `Failed to slew to coordinates: ${error instanceof Error ? error.message : String(error)}`
    isSlewing.value = false
  }
}

async function moveNorth() {
  if (!props.connected || isSlewing.value) return

  try {
    isSlewing.value = true

    // Call the device API
    await store.callDeviceMethod(props.deviceId, 'moveAxis', [
      'North',
      slewRateMapping[selectedSlewRate.value as keyof typeof slewRateMapping]
    ])

    // Keep emit for compatibility with tests
    store.emit('telescope.move', props.deviceId, {
      direction: 'North',
      rate: slewRateMapping[selectedSlewRate.value as keyof typeof slewRateMapping]
    })
  } catch (error) {
    console.error('Error moving telescope north:', error)
    lastError.value = `Failed to move telescope north: ${error instanceof Error ? error.message : String(error)}`
    isSlewing.value = false
  }
}

async function moveSouth() {
  if (!props.connected || isSlewing.value) return

  try {
    isSlewing.value = true

    // Call the device API
    await store.callDeviceMethod(props.deviceId, 'moveAxis', [
      'South',
      slewRateMapping[selectedSlewRate.value as keyof typeof slewRateMapping]
    ])

    // Keep emit for compatibility with tests
    store.emit('telescope.move', props.deviceId, {
      direction: 'South',
      rate: slewRateMapping[selectedSlewRate.value as keyof typeof slewRateMapping]
    })
  } catch (error) {
    console.error('Error moving telescope south:', error)
    lastError.value = `Failed to move telescope south: ${error instanceof Error ? error.message : String(error)}`
    isSlewing.value = false
  }
}

async function moveEast() {
  if (!props.connected || isSlewing.value) return

  try {
    isSlewing.value = true

    // Call the device API
    await store.callDeviceMethod(props.deviceId, 'moveAxis', [
      'East',
      slewRateMapping[selectedSlewRate.value as keyof typeof slewRateMapping]
    ])

    // Keep emit for compatibility with tests
    store.emit('telescope.move', props.deviceId, {
      direction: 'East',
      rate: slewRateMapping[selectedSlewRate.value as keyof typeof slewRateMapping]
    })
  } catch (error) {
    console.error('Error moving telescope east:', error)
    lastError.value = `Failed to move telescope east: ${error instanceof Error ? error.message : String(error)}`
    isSlewing.value = false
  }
}

async function moveWest() {
  if (!props.connected || isSlewing.value) return

  try {
    isSlewing.value = true

    // Call the device API
    await store.callDeviceMethod(props.deviceId, 'moveAxis', [
      'West',
      slewRateMapping[selectedSlewRate.value as keyof typeof slewRateMapping]
    ])

    // Keep emit for compatibility with tests
    store.emit('telescope.move', props.deviceId, {
      direction: 'West',
      rate: slewRateMapping[selectedSlewRate.value as keyof typeof slewRateMapping]
    })
  } catch (error) {
    console.error('Error moving telescope west:', error)
    lastError.value = `Failed to move telescope west: ${error instanceof Error ? error.message : String(error)}`
    isSlewing.value = false
  }
}

async function stopSlew() {
  if (!props.connected || !isSlewing.value) return

  try {
    // Call the device API
    await store.callDeviceMethod(props.deviceId, 'abortSlew', [])

    // Keep emit for compatibility with tests
    store.emit('telescope.abortSlew', props.deviceId)

    isSlewing.value = false
  } catch (error) {
    console.error('Error stopping slew:', error)
    lastError.value = `Failed to stop slew: ${error instanceof Error ? error.message : String(error)}`
  }
}

async function parkTelescope() {
  if (!props.connected || isSlewing.value) return

  try {
    // Call the device API
    await store.callDeviceMethod(props.deviceId, 'park', [])

    // Keep emit for compatibility with tests
    store.emit('telescope.park', props.deviceId)

    // Update UI state
    store.updateDeviceProperties(props.deviceId, {
      parking: true,
      parked: false
    })

    // In real implementation, we would wait for confirmation from the device
    setTimeout(() => {
      store.updateDeviceProperties(props.deviceId, {
        parking: false,
        parked: true
      })
    }, 3000)
  } catch (error) {
    console.error('Error parking telescope:', error)
    lastError.value = `Failed to park telescope: ${error instanceof Error ? error.message : String(error)}`
    isSlewing.value = false
  }
}

async function unparkTelescope() {
  if (!props.connected || detailedData.value.parkingState !== 'Parked') return

  try {
    // Call the device API
    await store.callDeviceMethod(props.deviceId, 'unpark', [])

    // Keep emit for compatibility with tests
    store.emit('telescope.unpark', props.deviceId)

    // Update UI state
    store.updateDeviceProperties(props.deviceId, {
      parking: true,
      parked: true
    })

    // In real implementation, we would wait for confirmation from the device
    setTimeout(() => {
      store.updateDeviceProperties(props.deviceId, {
        parking: false,
        parked: false
      })
    }, 2000)
  } catch (error) {
    console.error('Error unparking telescope:', error)
    lastError.value = `Failed to unpark telescope: ${error instanceof Error ? error.message : String(error)}`
  }
}

// Helper functions
function formatRADec(value: number, isRa: boolean): string {
  // Format RA as HH:MM:SS or Dec as DD:MM:SS
  // This is a simple placeholder - in a real app you'd use a proper astronomy library
  const sign = !isRa && value < 0 ? '-' : ''
  const absValue = Math.abs(value)

  const hours = Math.floor(absValue)
  const minutes = Math.floor((absValue - hours) * 60)
  const seconds = Math.floor(((absValue - hours) * 60 - minutes) * 60)

  return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function formatAltAz(value: number): string {
  // Format altitude or azimuth as degrees
  return `${value.toFixed(1)}°`
}

// Handle mode changes
function handleModeChange(newMode: UIMode) {
  currentMode.value = newMode
  emit('modeChange', { deviceType: props.deviceType, deviceId: props.deviceId, mode: newMode })
}

// Lifecycle hooks
onMounted(() => {
  // Initialize any necessary data
  console.log(`Telescope panel mounted for device ${props.deviceId}`)

  // In a real app, we might want to subscribe to device updates
  if (telescope.value) {
    // Populate the initial coordinates
    if (telescope.value.coordinates) {
      targetRA.value = formatRADec(telescope.value.coordinates.rightAscension, true)
      targetDec.value = formatRADec(telescope.value.coordinates.declination, false)
    }
  }
})

onUnmounted(() => {
  // Clean up any subscriptions
  console.log(`Telescope panel unmounted for device ${props.deviceId}`)
})
</script>

<template>
  <EnhancedPanelComponentMigrated
    :panel-name="panelName"
    :connected="connected"
    :device-type="deviceType"
    :device-id="deviceId"
    :supported-modes="supportedModes"
    :current-mode="currentMode"
    :idx="idx"
    @close="$emit('close')"
    @configure="$emit('configure')"
    @connect="$emit('connect')"
    @mode-change="handleModeChange"
  >
    <!-- Use the default slot for all content -->
    <div class="telescope-panel">
      <!-- Action buttons at the top - moved from header-actions -->
      <div class="panel-actions">
        <button
          class="action-button"
          :disabled="!connected || Boolean(isSlewing)"
          :title="trackingEnabled ? 'Stop Tracking' : 'Start Tracking'"
          @click="toggleTracking"
        >
          <Icon :type="trackingEnabled ? 'connected' : 'disconnected'" />
          <span>{{ trackingEnabled ? 'Stop Tracking' : 'Start Tracking' }}</span>
        </button>

        <button
          class="action-button"
          :disabled="!connected || Boolean(telescope?.properties?.parked)"
          title="Park Telescope"
          @click="parkTelescope"
        >
          <Icon type="stop" />
          <span>Park</span>
        </button>
      </div>

      <!-- Connection Status -->
      <div v-if="connected" class="status-connected">
        <Icon type="connected" />
        <span>Connected</span>
      </div>

      <div v-else-if="isConnecting" class="status-connecting">
        <Icon type="disconnected" class="loading-icon" />
        <span>Connecting...</span>
      </div>

      <div v-else class="status-disconnected">
        <Icon type="disconnected" />
        <span>Disconnected</span>
      </div>

      <!-- Error display -->
      <div v-if="lastError" class="error-message">
        <span>{{ lastError }}</span>
        <button @click="lastError = null">Dismiss</button>
      </div>

      <!-- Overview Mode -->
      <div v-if="currentMode === 'overview'" class="overview-section">
        <!-- Position Display -->
        <div class="position-section">
          <h3>Position</h3>
          <div class="position-grid">
            <div class="position-group">
              <h4>Equatorial</h4>
              <div class="position-row">
                <span class="coord-label">RA:</span>
                <span class="coord-value">{{ detailedData.rightAscension }}</span>
              </div>
              <div class="position-row">
                <span class="coord-label">Dec:</span>
                <span class="coord-value">{{ detailedData.declination }}</span>
              </div>
            </div>
            <div class="position-group">
              <h4>Horizontal</h4>
              <div class="position-row">
                <span class="coord-label">Alt:</span>
                <span class="coord-value">{{ detailedData.altitude }}</span>
              </div>
              <div class="position-row">
                <span class="coord-label">Az:</span>
                <span class="coord-value">{{ detailedData.azimuth }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Status and Controls -->
        <div class="status-section">
          <h3>Status</h3>
          <div class="status-badges">
            <div class="status-badge" :class="{ active: trackingEnabled }">
              <Icon :type="trackingEnabled ? 'connected' : 'disconnected'" />
              <span>{{ trackingEnabled ? 'Tracking' : 'Not Tracking' }}</span>
            </div>
            <div v-if="isSlewing" class="status-badge slewing">
              <Icon type="arrow-right" />
              <span>Slewing</span>
            </div>
          </div>

          <div class="control-section">
            <h3>Controls</h3>
            <div class="control-grid">
              <div class="directional-controls">
                <div class="slew-control">
                  <button
                    class="slew-btn north"
                    :disabled="!connected || Boolean(isSlewing)"
                    @click="moveNorth"
                  >
                    <Icon type="arrow-up" />
                  </button>
                  <div class="east-west">
                    <button
                      class="slew-btn west"
                      :disabled="!connected || Boolean(isSlewing)"
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
                      :disabled="!connected || Boolean(isSlewing)"
                      @click="moveEast"
                    >
                      <Icon type="arrow-right" />
                    </button>
                  </div>
                  <button
                    class="slew-btn south"
                    :disabled="!connected || Boolean(isSlewing)"
                    @click="moveSouth"
                  >
                    <Icon type="arrow-down" />
                  </button>
                </div>

                <div class="slew-rate">
                  <select
                    v-model="selectedSlewRate"
                    :disabled="!connected || Boolean(isSlewing)"
                    class="slew-rate-select"
                  >
                    <option v-for="rate in slewRateOptions" :key="rate" :value="rate">
                      {{ rate }}
                    </option>
                  </select>
                </div>

                <button
                  class="control-btn"
                  :class="{ active: trackingEnabled }"
                  :disabled="!connected"
                  @click="toggleTracking"
                >
                  <Icon :type="trackingEnabled ? 'connected' : 'disconnected'" />
                  <span>{{ trackingEnabled ? 'Tracking' : 'Track' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Detailed Mode -->
      <div v-else-if="currentMode === 'detailed'" class="detailed-view">
        <!-- Detailed Position Information -->
        <div class="position-details">
          <div class="position-column">
            <h3>Equatorial Coordinates</h3>
            <div class="coord-row">
              <span class="label">Right Ascension:</span>
              <span class="value">{{ detailedData.rightAscension }}</span>
            </div>
            <div class="coord-row">
              <span class="label">Declination:</span>
              <span class="value">{{ detailedData.declination }}</span>
            </div>
            <div class="coord-row">
              <span class="label">Local Sidereal Time:</span>
              <span class="value">{{ telescope?.coordinates?.lst || '00:00:00' }}</span>
            </div>
          </div>
          <div class="position-column">
            <h3>Horizontal Coordinates</h3>
            <div class="coord-row">
              <span class="label">Altitude:</span>
              <span class="value">{{ detailedData.altitude }}</span>
            </div>
            <div class="coord-row">
              <span class="label">Azimuth:</span>
              <span class="value">{{ detailedData.azimuth }}</span>
            </div>
          </div>
        </div>

        <!-- Status and Quick Actions -->
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
                <Icon :type="trackingEnabled ? 'connected' : 'disconnected'" />
                <span>{{ trackingEnabled ? 'Stop Tracking' : 'Start Tracking' }}</span>
              </button>

              <button
                class="action-btn"
                :disabled="!connected || Boolean(isSlewing)"
                @click="parkTelescope"
              >
                <Icon type="stop" />
                <span>Park</span>
              </button>

              <button
                class="action-btn"
                :disabled="!connected || detailedData.parkingState !== 'Parked'"
                @click="unparkTelescope"
              >
                <Icon type="connected" />
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
                :disabled="!connected || Boolean(isSlewing)"
                class="slew-to-coords"
                @click="slewToCoordinates"
              >
                <Icon type="search" />
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
                :disabled="!connected || Boolean(isSlewing)"
              >
                <option v-for="rate in slewRateOptions" :key="rate" :value="rate">
                  {{ rate }}
                </option>
              </select>
            </div>
            <div class="direction-controls">
              <button
                class="dir-btn north"
                :disabled="!connected || Boolean(isSlewing)"
                @click="moveNorth"
              >
                <Icon type="arrow-up" />
              </button>
              <div class="middle-row">
                <button
                  class="dir-btn west"
                  :disabled="!connected || Boolean(isSlewing)"
                  @click="moveWest"
                >
                  <Icon type="arrow-left" />
                </button>
                <button class="dir-btn stop" :disabled="!connected || !isSlewing" @click="stopSlew">
                  <Icon type="stop" />
                </button>
                <button
                  class="dir-btn east"
                  :disabled="!connected || Boolean(isSlewing)"
                  @click="moveEast"
                >
                  <Icon type="arrow-right" />
                </button>
              </div>
              <button
                class="dir-btn south"
                :disabled="!connected || Boolean(isSlewing)"
                @click="moveSouth"
              >
                <Icon type="arrow-down" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
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

.panel-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.15);
  border: none;
  border-radius: 4px;
  color: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.action-button:hover:not(:disabled) {
  background: var(--aw-panel-action-color, #2196f3);
  color: white;
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
