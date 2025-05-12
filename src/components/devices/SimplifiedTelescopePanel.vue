<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { setAlpacaProperty, callAlpacaMethod, getAlpacaProperties } from '@/utils/alpacaPropertyAccess'

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: 'Telescope'
  },
  useInternalDeviceSelection: {
    type: Boolean,
    default: true
  }
})


// Get unified store for device interaction
const store = useUnifiedStore()

// Local device selection state
const selectedDeviceId = ref(props.deviceId)


// Watch for props change to update local state only when not using internal selection
// or when component is initially mounted
watch(() => props.deviceId, (newDeviceId) => {
  if (!props.useInternalDeviceSelection || !selectedDeviceId.value) {
    selectedDeviceId.value = newDeviceId
  }
}, { immediate: true })

// Device status
const isConnected = computed(() => {
  const device = store.getDeviceById(selectedDeviceId.value)
  return device?.isConnected || false
})

// Get the current device
const currentDevice = computed(() => {
  return store.getDeviceById(selectedDeviceId.value)
})

// Watch for device ID changes to update our state
let coordUpdateInterval: number | undefined
watch(() => selectedDeviceId.value, (newDeviceId, oldDeviceId) => {
  if (newDeviceId !== oldDeviceId) {
    console.log(`Device changed from ${oldDeviceId} to ${newDeviceId}`)
    
    // Reset coordinate values
    resetTelescopeState()
    
    // If we have a new device, start monitoring it
    if (isConnected.value) {
      // Stop existing interval if any
      if (coordUpdateInterval) {
        clearInterval(coordUpdateInterval)
      }
      
      // Start a new polling interval
      coordUpdateInterval = window.setInterval(updateCoordinates, 1000)
      
      // Initial update
      updateCoordinates()
    }
  }
})

// Tracking state
const tracking = ref(false)
const toggleTracking = async () => {
  try {
    await setAlpacaProperty(selectedDeviceId.value, 'tracking', !tracking.value)
    // Let the update come from polling rather than setting it directly
  } catch (error) {
    console.error('Error toggling tracking:', error)
  }
}

// Tracking rate options
const trackingRates = [
  { value: 0, label: 'Sidereal' },
  { value: 1, label: 'Lunar' },
  { value: 2, label: 'Solar' },
  { value: 3, label: 'King' }
]
const selectedTrackingRate = ref(0)

// Update tracking rate
const updateTrackingRate = async () => {
  try {
    await setAlpacaProperty(selectedDeviceId.value, 'trackingRate', selectedTrackingRate.value)
  } catch (error) {
    console.error('Error setting tracking rate:', error)
  }
}

// Watch for changes in the tracking rate dropdown
watch(selectedTrackingRate, updateTrackingRate)

// Coordinates (will be updated by polling)
const rightAscension = ref(0)
const declination = ref(0)
const altitude = ref(0)
const azimuth = ref(0)

// Reset telescope state when device changes
const resetTelescopeState = () => {
  rightAscension.value = 0
  declination.value = 0
  altitude.value = 0
  azimuth.value = 0
  tracking.value = false
  selectedTrackingRate.value = 0
  targetRA.value = 0
  targetDec.value = 0
}

// Format right ascension as HH:MM:SS
const formattedRA = computed(() => {
  const value = rightAscension.value
  const hours = Math.floor(value)
  const minutes = Math.floor((value - hours) * 60)
  const seconds = Math.floor(((value - hours) * 60 - minutes) * 60)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
})

// Format declination as +/-DD:MM:SS
const formattedDec = computed(() => {
  const value = declination.value
  const sign = value >= 0 ? '+' : '-'
  const absDec = Math.abs(value)
  const degrees = Math.floor(absDec)
  const minutes = Math.floor((absDec - degrees) * 60)
  const seconds = Math.floor(((absDec - degrees) * 60 - minutes) * 60)
  return `${sign}${degrees.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
})

// Simple slew to coordinates
const targetRA = ref(0)
const targetDec = ref(0)
const slewToCoordinates = async () => {
  try {
    await callAlpacaMethod(selectedDeviceId.value, 'slewToCoordinates', {
      rightAscension: targetRA.value,
      declination: targetDec.value
    })
  } catch (error) {
    console.error('Error slewing to coordinates:', error)
  }
}

// Direction control buttons for manual slew
const moveDirection = async (direction: string) => {
  try {
    if (direction === 'stop') {
      await callAlpacaMethod(selectedDeviceId.value, 'abortSlew')
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
      await callAlpacaMethod(selectedDeviceId.value, 'moveAxis', axisParam)
    }
  } catch (error) {
    console.error(`Error moving telescope ${direction}:`, error)
  }
}

// Advanced functions
const parkTelescope = async () => {
  try {
    await callAlpacaMethod(selectedDeviceId.value, 'park')
  } catch (error) {
    console.error('Error parking telescope:', error)
  }
}

const unparkTelescope = async () => {
  try {
    await callAlpacaMethod(selectedDeviceId.value, 'unpark')
  } catch (error) {
    console.error('Error unparking telescope:', error)
  }
}

const findHome = async () => {
  try {
    await callAlpacaMethod(selectedDeviceId.value, 'findHome')
  } catch (error) {
    console.error('Error finding home position:', error)
  }
}

// Poll for coordinates
const updateCoordinates = async () => {
  if (!isConnected.value) return
  
  try {
    const properties = await getAlpacaProperties(selectedDeviceId.value, [
      'rightAscension',
      'declination',
      'altitude',
      'azimuth',
      'tracking',
      'trackingRate'
    ])
    
    // Update coordinates
    if (properties.rightAscension !== null && typeof properties.rightAscension === 'number') {
      rightAscension.value = properties.rightAscension
    }
    
    if (properties.declination !== null && typeof properties.declination === 'number') {
      declination.value = properties.declination
    }
    
    if (properties.altitude !== null && typeof properties.altitude === 'number') {
      altitude.value = properties.altitude
    }
    
    if (properties.azimuth !== null && typeof properties.azimuth === 'number') {
      azimuth.value = properties.azimuth
    }
    
    // Update tracking state
    if (properties.tracking !== null && typeof properties.tracking === 'boolean') {
      tracking.value = properties.tracking
    }
    
    // Update tracking rate
    if (properties.trackingRate !== null && typeof properties.trackingRate === 'number') {
      selectedTrackingRate.value = properties.trackingRate
    }
  } catch (error) {
    console.error('Error updating coordinates:', error)
  }
}

// Setup polling when mounted
onMounted(() => {
  if (isConnected.value) {
    // Initial update
    updateCoordinates()
    
    // Start regular polling
    coordUpdateInterval = window.setInterval(updateCoordinates, 1000)
  }
})

// Watch for changes in connection status
watch(isConnected, (newValue) => {
  if (newValue) {
    // Start polling when connected
    updateCoordinates()
    coordUpdateInterval = window.setInterval(updateCoordinates, 1000)
  } else {
    // Stop polling when disconnected
    if (coordUpdateInterval) {
      window.clearInterval(coordUpdateInterval)
    }
  }
})

// Add document click handler
onMounted(() => {
})

// Cleanup when unmounted
onUnmounted(() => {
  if (coordUpdateInterval) {
    window.clearInterval(coordUpdateInterval)
  }
})

// Function to connect to the selected device
const connectDevice = async () => {
  if (!selectedDeviceId.value) return
  
  try {
    // @ts-expect-error - TypeScript has issues with the store's this context
    await store.connectDevice(selectedDeviceId.value)
    console.log(`Connected to device ${selectedDeviceId.value}`)
  } catch (error) {
    console.error(`Error connecting to device ${selectedDeviceId.value}:`, error)
  }
}

</script>

<template>
  <div class="simplified-panel">
    <!-- Main panel content with sections -->
    <div class="panel-content">
      <!-- No device selected message -->
      <div v-if="!currentDevice" class="connection-notice">
        <div class="connection-message">No telescope selected</div>
      </div>
      
      <!-- Connection status -->
      <div v-else-if="!isConnected" class="connection-notice">
        <div class="connection-message">Telescope not connected</div>
        <button class="connect-button action-button" @click="connectDevice">Connect</button>
      </div>
      
      <template v-else>
        <!-- Position section -->
        <div class="panel-section">
          <h3>Position</h3>
          <div class="coordinate-display">
            <div class="coordinate">
              <span class="label">RA:</span>
              <span class="value">{{ formattedRA }}</span>
            </div>
            <div class="coordinate">
              <span class="label">Dec:</span>
              <span class="value">{{ formattedDec }}</span>
            </div>
          </div>
          <div class="coordinate-display">
            <div class="coordinate">
              <span class="label">Alt:</span>
              <span class="value">{{ altitude.toFixed(2) }}°</span>
            </div>
            <div class="coordinate">
              <span class="label">Az:</span>
              <span class="value">{{ azimuth.toFixed(2) }}°</span>
            </div>
          </div>
        </div>
        
        <!-- Movement section -->
        <div class="panel-section">
          <h3>Movement</h3>
          <div class="slew-coordinates">
            <div class="slew-input">
              <label>Target RA:</label>
              <input v-model="targetRA" type="number" min="0" max="24" step="0.01">
            </div>
            <div class="slew-input">
              <label>Target Dec:</label>
              <input v-model="targetDec" type="number" min="-90" max="90" step="0.01">
            </div>
            <button class="action-button" @click="slewToCoordinates">Slew</button>
          </div>
          
          <!-- Direction control pad -->
          <div class="direction-control">
            <div class="direction-row">
              <button class="direction-button" @click="moveDirection('up')">▲</button>
            </div>
            <div class="direction-row">
              <button class="direction-button" @click="moveDirection('left')">◄</button>
              <button class="direction-button" @click="moveDirection('stop')">■</button>
              <button class="direction-button" @click="moveDirection('right')">►</button>
            </div>
            <div class="direction-row">
              <button class="direction-button" @click="moveDirection('down')">▼</button>
            </div>
          </div>
        </div>
        
        <!-- Tracking section -->
        <div class="panel-section">
          <h3>Tracking</h3>
          <div class="tracking-control">
            <div class="tracking-toggle">
              <span class="label">Tracking:</span>
              <label class="toggle">
                <input v-model="tracking" type="checkbox" @change="toggleTracking">
                <span class="slider"></span>
              </label>
            </div>
            <div class="tracking-rate">
              <span class="label">Rate:</span>
              <select v-model="selectedTrackingRate">
                <option v-for="rate in trackingRates" :key="rate.value" :value="rate.value">
                  {{ rate.label }}
                </option>
              </select>
            </div>
          </div>
        </div>
        
        <!-- Advanced section -->
        <div class="panel-section">
          <h3>Advanced</h3>
          <div class="advanced-buttons">
            <button class="action-button" @click="parkTelescope">Park</button>
            <button class="action-button" @click="unparkTelescope">Unpark</button>
            <button class="action-button" @click="findHome">Find Home</button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.simplified-panel {
  background-color: var(--aw-panel-bg-color, #2a2a2a);
  color: var(--aw-text-color, #f0f0f0);
  border-radius: var(--aw-border-radius, 8px);
  border: 1px solid var(--aw-panel-border-color, #444);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0px 8px;
  border-bottom: 1px solid var(--aw-panel-border-color, #444);
  background-color: var(--aw-panel-header-bg-color, #333);
}

.panel-header h2 {
  margin: 0;
  font-size: 0.8rem;
}

/* Device selector styles */
.device-selector {
  position: relative;
  display: flex;
  align-items: center;
  padding: 2px 8px;
  border: 1px solid var(--aw-panel-border-color, #444);
  border-radius: 4px;
  cursor: pointer;
  background-color: var(--aw-panel-content-bg-color, #3a3a3a);
  margin: 4px 0;
  min-width: 120px;
}

.device-name {
  font-size: 0.8rem;
  margin-right: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.device-toggle {
  font-size: 0.6rem;
  opacity: 0.7;
}

.device-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 200px;
  background-color: var(--aw-panel-bg-color, #2a2a2a);
  border: 1px solid var(--aw-panel-border-color, #444);
  border-radius: 4px;
  z-index: 100;
  margin-top: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.device-list {
  max-height: 200px;
  overflow-y: auto;
}

.device-item {
  padding: 8px;
  cursor: pointer;
  border-bottom: 1px solid var(--aw-panel-border-color, #444);
}

.device-item:hover {
  background-color: var(--aw-panel-hover-bg-color, #444);
}

.device-selected {
  background-color: var(--aw-primary-color-transparent, rgba(0, 119, 204, 0.2));
}

.device-info {
  display: flex;
  flex-direction: column;
}

.device-item-name {
  font-weight: 500;
  margin-bottom: 2px;
}

.device-item-status {
  font-size: 0.7rem;
  opacity: 0.8;
}

.device-item-status.connected {
  color: var(--aw-success-color, #66bb6a);
}

.device-item-status.disconnected {
  color: var(--aw-error-color, #ef5350);
}

.device-empty {
  padding: 12px 8px;
  text-align: center;
  color: var(--aw-text-secondary-color, #aaa);
  font-size: 0.9rem;
}

.device-actions {
  padding: 8px;
  border-top: 1px solid var(--aw-panel-border-color, #444);
}

.discover-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 6px 0;
  background-color: var(--aw-primary-color, #0077cc);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.discover-button:hover {
  background-color: var(--aw-primary-hover-color, #0066b3);
}

.panel-content {
  overflow-y: auto;
  flex: 1;
}

.panel-section {
  margin-bottom: 20px;
  background-color: var(--aw-panel-content-bg-color, #3a3a3a);
  border-radius: 6px;
  padding: 12px;
}

.panel-section h3 {
  margin-top: 0;
  margin-bottom: 12px;
  font-size: 1rem;
  border-bottom: 1px solid var(--aw-panel-border-color, #444);
  padding-bottom: 6px;
}

.coordinate-display {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.coordinate {
  display: flex;
  flex-direction: column;
  width: 48%;
}

.label {
  color: var(--aw-text-secondary-color, #aaa);
  font-size: 0.9rem;
  margin-bottom: 2px;
}

.value {
  font-size: 1.1rem;
  font-weight: 500;
}

.slew-coordinates {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.slew-input {
  flex: 1;
  min-width: 120px;
}

.slew-input label {
  display: block;
  margin-bottom: 4px;
  color: var(--aw-text-secondary-color, #aaa);
  font-size: 0.9rem;
}

.slew-input input {
  width: 100%;
  background-color: var(--aw-panel-bg-color, #2a2a2a);
  color: var(--aw-text-color, #f0f0f0);
  border: 1px solid var(--aw-panel-border-color, #444);
  border-radius: 4px;
  padding: 4px 8px;
}

.action-button {
  background-color: var(--aw-primary-color, #0077cc);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-weight: 500;
}

.action-button:hover {
  background-color: var(--aw-primary-hover-color, #0066b3);
}

.direction-control {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.direction-row {
  display: flex;
  justify-content: center;
  gap: 4px;
  margin: 2px 0;
}

.direction-button {
  width: 40px;
  height: 40px;
  background-color: var(--aw-panel-bg-color, #2a2a2a);
  color: var(--aw-text-color, #f0f0f0);
  border: 1px solid var(--aw-panel-border-color, #444);
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

.direction-button:hover {
  background-color: var(--aw-panel-hover-bg-color, #3d3d3d);
}

.tracking-control {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tracking-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle input {
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
  background-color: var(--aw-panel-bg-color, #2a2a2a);
  border: 1px solid var(--aw-panel-border-color, #444);
  transition: .4s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: var(--aw-text-secondary-color, #aaa);
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--aw-primary-color, #0077cc);
}

input:checked + .slider:before {
  transform: translateX(20px);
  background-color: white;
}

.tracking-rate {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tracking-rate select {
  background-color: var(--aw-panel-bg-color, #2a2a2a);
  color: var(--aw-text-color, #f0f0f0);
  border: 1px solid var(--aw-panel-border-color, #444);
  border-radius: 4px;
  padding: 4px 8px;
  width: 120px;
}

.advanced-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.connection-notice {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100px;
  background-color: var(--aw-panel-content-bg-color, #3a3a3a);
  border-radius: 6px;
  margin-bottom: 20px;
  gap: 12px;
  padding: 16px;
}

.connection-message {
  color: var(--aw-text-secondary-color, #aaa);
  font-size: 1.1rem;
}

.connect-button {
  min-width: 100px;
}
</style> 