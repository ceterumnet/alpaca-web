<script setup lang="ts">

import log from '@/plugins/logger'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { setAlpacaProperty, callAlpacaMethod } from '@/utils/alpacaPropertyAccess'
import { formatRaNumber, formatDecNumber } from '@/utils/astroCoordinates'

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

// Advanced functions
const parkTelescope = async () => {
  try {
    await callAlpacaMethod(props.deviceId, 'park')
  } catch (error) {
    log.error({deviceIds:[props.deviceId]}, 'Error parking telescope:', error)
  }
}

const unparkTelescope = async () => {
  try {
    await callAlpacaMethod(props.deviceId, 'unpark')
  } catch (error) {
    log.error({deviceIds:[props.deviceId]}, 'Error unparking telescope:', error)
  }
}

const findHome = async () => {
  try {
    await callAlpacaMethod(props.deviceId, 'findHome')
  } catch (error) {
    log.error({deviceIds:[props.deviceId]}, 'Error finding home position:', error)
  }
}

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

</script>

<template>
  <div class="simplified-panel">
    <!-- Main panel content with sections -->
    <div class="panel-content">
      <!-- No device selected message -->
      <div v-if="!currentDevice" class="connection-notice">
        <div class="connection-message">No telescope selected or available</div>
      </div>
      
      <!-- Connection status (now handled by parent, show message if not connected) -->
      <div v-else-if="!isConnected" class="connection-notice">
        <div class="connection-message">Telescope ({{ currentDevice.name }}) not connected.</div>
        <div class="panel-tip">Use the connect button in the panel header.</div>
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
                <input v-model="tracking" type="checkbox">
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
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-text-color);
  border-radius: var(--aw-border-radius);
  border: 1px solid var(--aw-panel-border-color);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--aw-spacing-sm);
  border-bottom: 1px solid var(--aw-panel-border-color);
  background-color: var(--aw-panel-header-bg-color);
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
  padding: calc(var(--aw-spacing-xs) / 2) var(--aw-spacing-sm);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
  background-color: var(--aw-panel-content-bg-color);
  margin: var(--aw-spacing-xs) 0;
  min-width: 120px;
}

.device-name {
  font-size: 0.8rem;
  margin-right: var(--aw-spacing-sm);
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
  background-color: var(--aw-panel-bg-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-sm);
  z-index: 100;
  margin-top: var(--aw-spacing-xs);
  box-shadow: var(--aw-shadow-md);
}

.device-list {
  max-height: 200px;
  overflow-y: auto;
}

.device-item {
  padding: var(--aw-spacing-sm);
  cursor: pointer;
  border-bottom: 1px solid var(--aw-panel-border-color);
}

.device-item:hover {
  background-color: var(--aw-panel-hover-bg-color);
}

.device-selected {
  background-color: var(--aw-primary-color-transparent);
}

.device-info {
  display: flex;
  flex-direction: column;
}

.device-item-name {
  font-weight: var(--aw-font-weight-medium);
  margin-bottom: calc(var(--aw-spacing-xs) / 2);
}

.device-item-status {
  font-size: 0.7rem;
  opacity: 0.8;
}

.device-item-status.connected {
  color: var(--aw-success-color);
}

.device-item-status.disconnected {
  color: var(--aw-error-color);
}

.device-empty {
  padding: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs)) var(--aw-spacing-sm);
  text-align: center;
  color: var(--aw-text-secondary-color);
  font-size: 0.9rem;
}

.device-actions {
  padding: var(--aw-spacing-sm);
  border-top: 1px solid var(--aw-panel-border-color);
}

.discover-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(var(--aw-spacing-xs) * 1.5);
  width: 100%;
  padding: calc(var(--aw-spacing-xs) * 1.5) 0;
  background-color: var(--aw-button-primary-bg);
  color: var(--aw-button-primary-text);
  border: none;
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
  font-size: 0.8rem;
}

.discover-button:hover {
  background-color: var(--aw-button-primary-hover-bg);
}

.panel-content {
  overflow-y: auto;
  flex: 1;
}

.panel-section {
  margin-bottom: calc(var(--aw-spacing-md) + var(--aw-spacing-xs));
  background-color: var(--aw-panel-content-bg-color);
  border-radius: calc(var(--aw-spacing-xs) * 1.5);
  padding: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
}

.panel-section h3 {
  margin-top: 0;
  margin-bottom: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
  font-size: var(--aw-font-size-base);
  border-bottom: 1px solid var(--aw-panel-border-color);
  padding-bottom: calc(var(--aw-spacing-xs) * 1.5);
}

.coordinate-display {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--aw-spacing-sm);
}

.coordinate {
  display: flex;
  flex-direction: column;
  width: 48%;
}

.label {
  color: var(--aw-text-secondary-color);
  font-size: 0.9rem;
  margin-bottom: calc(var(--aw-spacing-xs) / 2);
}

.value {
  font-size: 1.1rem;
  font-weight: var(--aw-font-weight-medium);
}

.slew-coordinates {
  display: flex;
  flex-wrap: wrap;
  gap: var(--aw-spacing-sm);
  margin-bottom: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
}

.slew-input {
  flex: 1;
  min-width: 120px;
}

.slew-input label {
  display: block;
  margin-bottom: var(--aw-spacing-xs);
  color: var(--aw-text-secondary-color);
  font-size: 0.9rem;
}

.slew-input input {
  width: 100%;
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-text-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-sm);
  padding: var(--aw-spacing-xs) var(--aw-spacing-sm);
}

.action-button {
  background-color: var(--aw-button-primary-bg);
  color: var(--aw-button-primary-text);
  border: none;
  border-radius: var(--aw-border-radius-sm);
  padding: calc(var(--aw-spacing-xs) * 1.5) calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
  cursor: pointer;
  font-weight: var(--aw-font-weight-medium);
}

.action-button:hover {
  background-color: var(--aw-button-primary-hover-bg);
}

.direction-control {
  margin-top: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
  display: flex;
  flex-direction: column;
  align-items: center;
}

.direction-row {
  display: flex;
  justify-content: center;
  gap: var(--aw-spacing-xs);
  margin: calc(var(--aw-spacing-xs) / 2) 0;
}

.direction-button {
  width: 40px;
  height: 40px;
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-text-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-sm);
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

.direction-button:hover {
  background-color: var(--aw-panel-hover-bg-color);
}

.tracking-control {
  display: flex;
  flex-direction: column;
  gap: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
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
  background-color: var(--aw-panel-bg-color);
  border: 1px solid var(--aw-panel-border-color);
  transition: .4s;
  border-radius: var(--aw-spacing-lg);
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: var(--aw-text-secondary-color);
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--aw-success-color);
}

input:checked + .slider:before {
  transform: translateX(calc(var(--aw-spacing-lg) - var(--aw-spacing-xs)));
  background-color: var(--aw-button-primary-text);
}

.tracking-rate {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tracking-rate select {
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-text-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-sm);
  padding: var(--aw-spacing-xs) var(--aw-spacing-sm);
  width: 120px;
}

.advanced-buttons {
  display: flex;
  gap: var(--aw-spacing-sm);
  flex-wrap: wrap;
}

.connection-notice {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100px;
  background-color: var(--aw-panel-content-bg-color);
  border-radius: calc(var(--aw-spacing-xs) * 1.5);
  margin-bottom: calc(var(--aw-spacing-md) + var(--aw-spacing-xs));
  gap: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
  padding: var(--aw-spacing-md);
}

.connection-message {
  color: var(--aw-text-secondary-color);
  font-size: 1.1rem;
}

.connect-button {
  min-width: 100px;
}

.panel-tip {
  font-size: 0.8rem;
  color: var(--aw-text-secondary-color);
}
</style> 