<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import CameraControls from '@/components/panels/CameraControls.vue'
import { setAlpacaProperty, getAlpacaProperties, getDeviceCapabilities } from '@/utils/alpacaPropertyAccess'

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: 'Camera'
  },
  isConnected: {
    type: Boolean,
    required: true
  }
})

// Get unified store for device interaction
const store = useUnifiedStore()

// Get the current device
const currentDevice = computed(() => {
  return store.getDeviceById(props.deviceId)
})

// Get exposure range for the camera
const exposureMin = ref(0.001)
const exposureMax = ref(3600)

// Camera capabilities
const capabilities = ref({
  canSetCCDTemperature: false
})

// Camera settings
const gain = ref(0)
const offset = ref(0)
const binning = ref(1)
const coolerOn = ref(false)
const targetTemp = ref(-10)
const CCDTemperature = ref(0)

// Toggle cooler
const toggleCooler = async () => {
  if (!capabilities.value.canSetCCDTemperature) return
  
  try {
    await setAlpacaProperty(props.deviceId, 'coolerOn', !coolerOn.value)
    coolerOn.value = !coolerOn.value
  } catch (error) {
    console.error('Error toggling cooler:', error)
  }
}

// Update camera settings
const updateGain = async () => {
  
  try {
    await setAlpacaProperty(props.deviceId, 'gain', gain.value)
  } catch (error) {
    console.error('Error setting gain:', error)
  }
}

const updateOffset = async () => {
  
  try {
    await setAlpacaProperty(props.deviceId, 'offset', offset.value)
  } catch (error) {
    console.error('Error setting offset:', error)
  }
}

const updateBinning = async () => {
  
  try {
    await setAlpacaProperty(props.deviceId, 'binX', binning.value)
    await setAlpacaProperty(props.deviceId, 'binY', binning.value)
  } catch (error) {
    console.error('Error setting binning:', error)
  }
}

const updateTargetTemp = async () => {
  if (!capabilities.value.canSetCCDTemperature) return
  
  try {
    await setAlpacaProperty(props.deviceId, 'setCCDTemperature', targetTemp.value)
  } catch (error) {
    console.error('Error setting target temperature:', error)
  }
}

// Check device capabilities
const updateDeviceCapabilities = async () => {
  if (!props.isConnected || !props.deviceId) return
  
  try {
    const deviceCaps = await getDeviceCapabilities(props.deviceId, [
      'canSetCCDTemperature'
    ])
    
    capabilities.value = {
      canSetCCDTemperature: deviceCaps.canSetCCDTemperature || false
    }
    
  } catch (error) {
    console.error('Error checking device capabilities:', error)
  }
}

// Poll for camera status (temperature)
let statusTimer: number | undefined

const updateCameraStatus = async () => {
  if (!props.isConnected || !props.deviceId) return
  
  try {
    // Build property list based on device capabilities
    const propertiesToFetch = ['exposureMin', 'exposureMax', 'gain', 'offset', 'binX', 'binY', 'CCDTemperature'] // Always fetch exposure limits
    
    // Add optional properties based on capabilities
    if (capabilities.value.canSetCCDTemperature) {
      propertiesToFetch.push('coolerOn')
      propertiesToFetch.push('setCCDTemperature')
    }
    
    const properties = await getAlpacaProperties(props.deviceId, propertiesToFetch)
    
    // Update camera settings with current values
    if (properties.gain !== null && typeof properties.gain === 'number') {
      gain.value = properties.gain
    }
    
    if (properties.offset !== null && typeof properties.offset === 'number') {
      offset.value = properties.offset
    }
    
    if (properties.binX !== null && typeof properties.binX === 'number') {
      binning.value = properties.binX
    }
    
    if (properties.coolerOn !== null && typeof properties.coolerOn === 'boolean') {
      coolerOn.value = properties.coolerOn
    }
    if (properties.CCDTemperature !== null && typeof properties.CCDTemperature === 'number') {
      CCDTemperature.value = properties.CCDTemperature
    }

    if (capabilities.value.canSetCCDTemperature) {
  
      if (properties.setCCDTemperature !== null && typeof properties.setCCDTemperature === 'number') {
        targetTemp.value = properties.setCCDTemperature
      }
    }

    // Update exposure limits if available
    if (properties.exposureMin !== null && typeof properties.exposureMin === 'number') {
      exposureMin.value = properties.exposureMin
    }
    
    if (properties.exposureMax !== null && typeof properties.exposureMax === 'number') {
      exposureMax.value = properties.exposureMax
    }
  } catch (error) {
    console.error('Error updating camera status:', error)
  }
}

// Reset all camera settings
const resetCameraSettings = () => {
  gain.value = 0
  offset.value = 0
  binning.value = 1
  coolerOn.value = false
  targetTemp.value = -10
  CCDTemperature.value = 0
  exposureMin.value = 0.001
  exposureMax.value = 3600
  capabilities.value = {
    canSetCCDTemperature: false
  }
}

// Setup polling when mounted
onMounted(() => {
  if (props.isConnected && props.deviceId) {
    // First check device capabilities
    updateDeviceCapabilities()
    // Then get current status
    updateCameraStatus()
    // Start regular status polling
    if (!statusTimer) {
      statusTimer = window.setInterval(() => {
        updateCameraStatus()
      }, 5000)
    }
  } else {
    if (statusTimer) {
      window.clearInterval(statusTimer);
      statusTimer = undefined;
    }
  }
})

// Watch for changes in connection status (from parent)
watch(() => props.isConnected, (newIsConnected) => {
  console.log(`SimplifiedCameraPanel: Connection status changed to ${newIsConnected} for device ${props.deviceId}`);
  if (newIsConnected) {
    // Reset capabilities
    resetCameraSettings() // Reset settings on new connection to ensure fresh state
    capabilities.value = {
      canSetCCDTemperature: false
    }
    
    // First check device capabilities
    updateDeviceCapabilities()
    
    // Then get current status
    updateCameraStatus()
    
    // Start regular status polling
    if (!statusTimer) { // Avoid multiple intervals
      statusTimer = window.setInterval(() => {
        updateCameraStatus()
      }, 5000)
    }
  } else {
    // Stop polling when disconnected
    if (statusTimer) {
      window.clearInterval(statusTimer)
      statusTimer = undefined;
    }
    resetCameraSettings() // Clear data when disconnected
  }
})

// Watch for device ID changes
watch(() => props.deviceId, (newDeviceId, oldDeviceId) => {
  if (newDeviceId !== oldDeviceId) {
    console.log(`SimplifiedCameraPanel: Device changed from ${oldDeviceId} to ${newDeviceId}`);
    // Reset settings when device changes
    resetCameraSettings()
    
    if (props.isConnected) {
      // Update capabilities for the new device
      updateDeviceCapabilities()
      // Update status for the new device
      updateCameraStatus()
      // Ensure polling is active if it wasn't
      if (!statusTimer) {
        statusTimer = window.setInterval(() => {
          updateCameraStatus()
        }, 5000)
      }
    } else {
      // If not connected, ensure polling is stopped
      if (statusTimer) {
        clearInterval(statusTimer);
        statusTimer = undefined;
      }
    }
  }
}, { immediate: true })

// Cleanup when unmounted
onUnmounted(() => {
  if (statusTimer) {
    window.clearInterval(statusTimer)
  }
})

</script>

<template>
  <div class="simplified-panel">
    <!-- Main panel content with sections -->
    <div class="panel-content">
      <!-- No device selected message -->
      <div v-if="!currentDevice" class="connection-notice">
        <div class="connection-message">No camera selected or available</div>
      </div>
      
      <!-- Connection status -->
      <div v-else-if="!isConnected" class="connection-notice">
        <div class="connection-message">Camera ({{ currentDevice.name }}) not connected.</div>
        <div class="panel-tip">Use the connect button in the panel header.</div>
      </div>
      
      <template v-else>
        <!-- Camera Controls section - uses existing component to maintain proper image flow -->
        <div class="panel-section camera-controls-section">
          <h3>Camera Controls</h3>
          <div class="camera-controls-wrapper">
            <CameraControls 
              :device-id="deviceId"
              :exposure-min="exposureMin"
              :exposure-max="exposureMax"
            />
          </div>
        </div>
        
        <!-- Camera Settings Section -->
        <div class="panel-section">
          <h3>Settings</h3>
          <div class="camera-settings">
            <div class="setting-row">
              <label>Gain:</label>
              <input v-model.number="gain" type="number" min="0" max="100" step="1" @change="updateGain">
            </div>
            <div class="setting-row">
              <label>Offset:</label>
              <input v-model.number="offset" type="number" min="0" max="100" step="1" @change="updateOffset">
            </div>
            <div class="setting-row">
              <label>Binning:</label>
              <input v-model.number="binning" type="number" min="1" max="4" step="1" @change="updateBinning">
            </div>
          </div>
        </div>
        
        <!-- Cooling Section -->
        <div class="panel-section">
          <h3>Cooling</h3>
          <div class="cooling-controls">
            <div class="cooling-status">
              <span class="temperature-label">Current:</span>
              <span class="temperature-value">{{ CCDTemperature.toFixed(1) }}°C</span>
            </div>
            <div v-if="capabilities.canSetCCDTemperature" class="cooling-toggle">
              <span class="label">Cooler:</span>
              <label class="toggle">
                <input v-model="coolerOn" type="checkbox" @change="toggleCooler">
                <span class="slider"></span>
              </label>
            </div>
            <div v-if="capabilities.canSetCCDTemperature" class="temperature-target">
              <label>Target Temp (°C):</label>
              <input v-model.number="targetTemp" type="number" min="-50" max="50" step="1" @change="updateTargetTemp">
            </div>
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
  background-color: var(--aw-primary-color);
  color: var(--aw-button-primary-text);
  border: none;
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
  font-size: 0.8rem;
}

.discover-button:hover {
  background-color: var(--aw-primary-hover-color);
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

.camera-controls-section {
  padding: 0;
}

.camera-controls-wrapper {
  border: 1px solid var(--aw-panel-border-color);
  border-radius: calc(var(--aw-spacing-xs) * 1.5);
  overflow: hidden;
  margin-top: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
}

.camera-settings {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
}

.setting-row {
  display: flex;
  flex-direction: column;
}

.setting-row label {
  margin-bottom: var(--aw-spacing-xs);
  color: var(--aw-text-secondary-color);
  font-size: 0.9rem;
}

.setting-row input {
  padding: calc(var(--aw-spacing-xs) * 1.5);
  background-color: var(--aw-input-bg-color);
  color: var(--aw-text-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-sm);
}

.cooling-controls {
  display: flex;
  flex-direction: column;
  gap: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
}

.cooling-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.temperature-label {
  color: var(--aw-text-secondary-color);
}

.temperature-value {
  font-weight: var(--aw-font-weight-medium);
}

.cooling-toggle {
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
  background-color: var(--aw-input-bg-color);
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
  background-color: var(--aw-primary-color);
}

input:checked + .slider:before {
  transform: translateX(calc(var(--aw-spacing-lg) - var(--aw-spacing-xs)));
  background-color: var(--aw-button-primary-text);
}

.temperature-target {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.temperature-target label {
  color: var(--aw-text-secondary-color);
}

.temperature-target input {
  width: 80px;
  padding: calc(var(--aw-spacing-xs) * 1.5);
  background-color: var(--aw-input-bg-color);
  color: var(--aw-text-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-sm);
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

.panel-tip {
  font-size: 0.8rem;
  color: var(--aw-text-secondary-color);
}
</style> 