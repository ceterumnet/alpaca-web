<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import CameraControls from '@/components/panels/CameraControls.vue'
import { setAlpacaProperty, getAlpacaProperties } from '@/utils/alpacaPropertyAccess'

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: 'Camera'
  }
})

const emit = defineEmits(['device-change'])

// Get unified store for device interaction
const store = useUnifiedStore()

// Handle device selection changes
const handleDeviceChange = (newDeviceId: string) => {
  emit('device-change', newDeviceId)
}

// Device status
const isConnected = computed(() => {
  const device = store.getDeviceById(props.deviceId)
  return device?.isConnected || false
})

// Get the current device
const currentDevice = computed(() => {
  return store.getDeviceById(props.deviceId)
})

// Get available camera devices
const availableDevices = computed(() => {
  return store.devicesList.filter(d => 
    (d.type || '').toLowerCase() === 'camera'
  )
})

// Device selector dropdown state
const showDeviceSelector = ref(false)
const toggleDeviceSelector = () => {
  showDeviceSelector.value = !showDeviceSelector.value
}

// Get exposure range for the camera
const exposureMin = ref(0.001)
const exposureMax = ref(3600)

// Camera settings
const gain = ref(0)
const offset = ref(0)
const binning = ref(1)
const coolerOn = ref(false)
const targetTemp = ref(-10)
const currentTemp = ref(0)

// Toggle cooler
const toggleCooler = async () => {
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
  try {
    await setAlpacaProperty(props.deviceId, 'setCCDTemperature', targetTemp.value)
  } catch (error) {
    console.error('Error setting target temperature:', error)
  }
}

// Poll for camera status (temperature)
let statusTimer: number | undefined

const updateCameraStatus = async () => {
  if (!isConnected.value) return
  
  try {
    const properties = await getAlpacaProperties(props.deviceId, [
      'gain',
      'offset',
      'binX',
      'coolerOn',
      'ccdTemperature',
      'setCCDTemperature',
      'exposureMin',
      'exposureMax'
    ])
    
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
    
    if (properties.ccdTemperature !== null && typeof properties.ccdTemperature === 'number') {
      currentTemp.value = properties.ccdTemperature
    }
    
    if (properties.setCCDTemperature !== null && typeof properties.setCCDTemperature === 'number') {
      targetTemp.value = properties.setCCDTemperature
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

// Setup polling when mounted
onMounted(() => {
  if (isConnected.value) {
    updateCameraStatus()
    statusTimer = window.setInterval(updateCameraStatus, 5000)
  }
})

// Watch for changes in connection status
watch(isConnected, (newValue) => {
  if (newValue) {
    // Start status polling when connected
    updateCameraStatus()
    statusTimer = window.setInterval(updateCameraStatus, 5000)
  } else {
    // Stop polling when disconnected
    if (statusTimer) {
      window.clearInterval(statusTimer)
    }
  }
})

// Cleanup when unmounted
onUnmounted(() => {
  if (statusTimer) {
    window.clearInterval(statusTimer)
  }
  
  // Close device selector if open
  showDeviceSelector.value = false
})

// Function to open device discovery panel
const openDiscovery = () => {
  // TODO: Implement discovery navigation
  console.log('Open discovery panel')
  showDeviceSelector.value = false
}

// When clicking outside the device selector, close it
const closeDeviceSelector = (event: MouseEvent) => {
  if (showDeviceSelector.value && !event.target) {
    showDeviceSelector.value = false
  }
}

// Add document click handler
onMounted(() => {
  document.addEventListener('click', closeDeviceSelector)
})

onUnmounted(() => {
  document.removeEventListener('click', closeDeviceSelector)
})

// Function to connect to the selected device
const connectDevice = async () => {
  if (!props.deviceId) return
  try {
    // @ts-expect-error - TypeScript has issues with the store's this context
    await store.connectDevice(props.deviceId)
    console.log(`Connected to device ${props.deviceId}`)
  } catch (error) {
    console.error(`Error connecting to device ${props.deviceId}:`, error)
  }
}
</script>

<template>
  <div class="simplified-panel">
    <!-- Header with title and device selector -->
    <div class="panel-header">
      <h2>{{ props.title }}</h2>
      <div class="device-selector" @click.stop="toggleDeviceSelector">
        <span class="device-name">{{ currentDevice?.name || 'Select device' }}</span>
        <span class="device-toggle">▼</span>
        
        <div v-if="showDeviceSelector" class="device-dropdown">
          <div v-if="availableDevices.length > 0" class="device-list">
            <div
              v-for="device in availableDevices"
              :key="device.id"
              class="device-item"
              :class="{ 'device-selected': device.id === props.deviceId }"
              @click.stop="handleDeviceChange(device.id)"
            >
              <div class="device-info">
                <span class="device-item-name">{{ device.name }}</span>
                <span class="device-item-status" :class="device.isConnected ? 'connected' : 'disconnected'">
                  {{ device.isConnected ? 'Connected' : 'Disconnected' }}
                </span>
              </div>
            </div>
          </div>
          <div v-else class="device-empty">
            <span>No camera devices found</span>
          </div>
          <div class="device-actions">
            <button class="discover-button" @click.stop="openDiscovery">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <span>Discover Devices</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Main panel content with sections -->
    <div class="panel-content">
      <!-- No device selected message -->
      <div v-if="!currentDevice" class="connection-notice">
        <div class="connection-message">No camera selected</div>
      </div>
      
      <!-- Connection status -->
      <div v-else-if="!isConnected" class="connection-notice">
        <div class="connection-message">Camera not connected</div>
        <button class="connect-button action-button" @click="connectDevice">Connect</button>
      </div>
      
      <template v-else>
        <!-- Camera Controls section - uses existing component to maintain proper image flow -->
        <div class="panel-section camera-controls-section">
          <h3>Camera Controls</h3>
          <div class="camera-controls-wrapper">
            <CameraControls 
              :device-id="props.deviceId"
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
              <span class="temperature-value">{{ currentTemp.toFixed(1) }}°C</span>
            </div>
            <div class="cooling-toggle">
              <span class="label">Cooler:</span>
              <label class="toggle">
                <input v-model="coolerOn" type="checkbox" @change="toggleCooler">
                <span class="slider"></span>
              </label>
            </div>
            <div class="temperature-target">
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
  padding: 16px;
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

/* Camera controls wrapper */
.camera-controls-wrapper {
  width: 100%;
}

/* Camera settings styles */
.camera-settings {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.setting-row label {
  flex: 1;
  color: var(--aw-text-secondary-color, #aaa);
}

.setting-row input {
  flex: 2;
  padding: 6px;
  background-color: var(--aw-panel-bg-color, #2a2a2a);
  color: var(--aw-text-color, #f0f0f0);
  border: 1px solid var(--aw-panel-border-color, #444);
  border-radius: 4px;
}

/* Cooling control styles */
.cooling-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cooling-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.temperature-label {
  color: var(--aw-text-secondary-color, #aaa);
}

.temperature-value {
  font-weight: 500;
}

.cooling-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.temperature-target {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.temperature-target label {
  flex: 1;
  color: var(--aw-text-secondary-color, #aaa);
}

.temperature-target input {
  flex: 1;
  padding: 6px;
  background-color: var(--aw-panel-bg-color, #2a2a2a);
  color: var(--aw-text-color, #f0f0f0);
  border: 1px solid var(--aw-panel-border-color, #444);
  border-radius: 4px;
}

.label {
  color: var(--aw-text-secondary-color, #aaa);
}

.toggle {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.slider {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
  background-color: var(--aw-panel-bg-color, #2a2a2a);
  border-radius: 20px;
  border: 1px solid var(--aw-panel-border-color, #444);
  transition: all 0.3s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 1px;
  background-color: var(--aw-text-secondary-color, #aaa);
  border-radius: 50%;
  transition: all 0.3s;
}

input:checked + .slider {
  background-color: var(--aw-primary-color, #0077cc);
}

input:checked + .slider:before {
  transform: translateX(20px);
  background-color: white;
}
</style> 