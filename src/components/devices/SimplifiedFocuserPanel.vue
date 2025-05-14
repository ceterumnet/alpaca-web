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
    default: 'Focuser'
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

// Focuser position
const position = ref(0)
const isMoving = ref(false)
const temperature = ref<number | null>(null)

// Focuser settings
const stepSize = ref(10)
const maxStep = ref(1000)
const maxIncrement = ref(1000)
const tempComp = ref(false)

// Reset focuser state when device changes
const resetFocuserState = () => {
  position.value = 0
  isMoving.value = false
  temperature.value = null
  stepSize.value = 10
  maxStep.value = 1000
  maxIncrement.value = 1000
  tempComp.value = false
  targetPosition.value = 0
}

// Functions for movement
const moveToPosition = async (targetPosition: number) => {
  try {
    await callAlpacaMethod(props.deviceId, 'move', {
      position: targetPosition
    })
  } catch (error) {
    console.error('Error moving to position:', error)
  }
}

const moveIn = async () => {
  try {
    await callAlpacaMethod(props.deviceId, 'moveIn')
  } catch (error) {
    console.error('Error moving in:', error)
  }
}

const moveOut = async () => {
  try {
    await callAlpacaMethod(props.deviceId, 'moveOut')
  } catch (error) {
    console.error('Error moving out:', error)
  }
}

const halt = async () => {
  try {
    await callAlpacaMethod(props.deviceId, 'halt')
  } catch (error) {
    console.error('Error halting movement:', error)
  }
}

// Update settings
const updateStepSize = async () => {
  try {
    await setAlpacaProperty(props.deviceId, 'stepSize', stepSize.value)
  } catch (error) {
    console.error('Error setting step size:', error)
  }
}

const updateTempComp = async () => {
  try {
    await setAlpacaProperty(props.deviceId, 'tempComp', tempComp.value)
  } catch (error) {
    console.error('Error setting temperature compensation:', error)
  }
}

// Target position for move to
const targetPosition = ref(0)
const moveToTarget = async () => {
  await moveToPosition(targetPosition.value)
}

// Poll for focuser status
let statusTimer: number | undefined

const updateFocuserStatus = async () => {
  if (!props.isConnected || !props.deviceId) return
  
  try {
    const properties = await getAlpacaProperties(props.deviceId, [
      'position',
      'isMoving',
      'temperature',
      'stepSize',
      'maxStep',
      'maxIncrement',
      'tempComp'
    ])
    
    // Update local state with device values
    if (properties.position !== null && typeof properties.position === 'number') {
      position.value = properties.position
      // If we don't have a target position yet, initialize it to current position
      if (targetPosition.value === 0) {
        targetPosition.value = properties.position
      }
    }
    
    if (properties.isMoving !== null && typeof properties.isMoving === 'boolean') {
      isMoving.value = properties.isMoving
    }
    
    if (properties.temperature !== null && typeof properties.temperature === 'number') {
      temperature.value = properties.temperature
    } else {
      temperature.value = null
    }
    
    if (properties.stepSize !== null && typeof properties.stepSize === 'number') {
      stepSize.value = properties.stepSize
    }
    
    if (properties.maxStep !== null && typeof properties.maxStep === 'number') {
      maxStep.value = properties.maxStep
    }
    
    if (properties.maxIncrement !== null && typeof properties.maxIncrement === 'number') {
      maxIncrement.value = properties.maxIncrement
    }
    
    if (properties.tempComp !== null && typeof properties.tempComp === 'boolean') {
      tempComp.value = properties.tempComp
    }
  } catch (error) {
    console.error('Error updating focuser status:', error)
  }
}

// Setup polling when mounted
onMounted(() => {
  if (props.isConnected && props.deviceId) {
    updateFocuserStatus()
    if(!statusTimer) {
        statusTimer = window.setInterval(updateFocuserStatus, 1000)
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
  console.log(`SimplifiedFocuserPanel: Connection status changed to ${newIsConnected} for device ${props.deviceId}`);
  if (newIsConnected) {
    // Start polling when connected
    resetFocuserState() // Reset state on new connection
    updateFocuserStatus()
    if (!statusTimer) { // Avoid multiple intervals
      statusTimer = window.setInterval(updateFocuserStatus, 1000)
    }
  } else {
    // Stop polling when disconnected
    if (statusTimer) {
      window.clearInterval(statusTimer)
      statusTimer = undefined;
    }
    resetFocuserState() // Clear data when disconnected
  }
})

// Watch for device ID changes
watch(() => props.deviceId, (newDeviceId, oldDeviceId) => {
  if (newDeviceId !== oldDeviceId) {
    console.log(`SimplifiedFocuserPanel: Device changed from ${oldDeviceId} to ${newDeviceId}`);
    // Reset settings when device changes
    resetFocuserState()
    
    if (props.isConnected) {
      // Get updated status
      updateFocuserStatus()
      if (!statusTimer) {
        statusTimer = window.setInterval(updateFocuserStatus, 1000);
      }
    } else {
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
        <div class="connection-message">No focuser selected or available</div>
      </div>
      
      <!-- Connection status -->
      <div v-else-if="!props.isConnected" class="connection-notice">
        <div class="connection-message">Focuser ({{ currentDevice.name }}) not connected.</div>
        <div class="panel-tip">Use the connect button in the panel header.</div>
      </div>
      
      <template v-else>
        <!-- Position section -->
        <div class="panel-section">
          <h3>Position</h3>
          <div class="position-display">
            <div class="position-value">
              <span class="position-label">Current Position:</span>
              <span class="value">{{ position }}</span>
            </div>
            
            <div class="status-indicator" :class="{ moving: isMoving }">
              {{ isMoving ? 'Moving' : 'Idle' }}
            </div>
            
            <div class="position-controls">
              <div class="position-input">
                <label>Target:</label>
                <input v-model.number="targetPosition" type="number" min="0" :max="maxStep" step="1">
              </div>
              <button class="action-button" @click="moveToTarget">Move To</button>
              <button class="stop-button" :disabled="!isMoving" @click="halt">Stop</button>
            </div>
          </div>
        </div>
        
        <!-- Movement section -->
        <div class="panel-section">
          <h3>Movement</h3>
          <div class="movement-controls">
            <div class="step-size-control">
              <label>Step Size:</label>
              <input v-model.number="stepSize" type="number" min="1" :max="maxIncrement" step="1" @change="updateStepSize">
            </div>
            
            <div class="movement-buttons">
              <button class="direction-button" @click="moveIn">
                <span>◄ Move In</span>
              </button>
              <button class="direction-button" @click="moveOut">
                <span>Move Out ►</span>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Status section (only shown if temperature is available) -->
        <div v-if="temperature !== null" class="panel-section">
          <h3>Status</h3>
          <div class="status-display">
            <div class="temperature-info">
              <span class="label">Temperature:</span>
              <span class="value">{{ temperature.toFixed(1) }}°C</span>
            </div>
            
            <div class="temp-comp-control">
              <span class="label">Temperature Compensation:</span>
              <label class="toggle">
                <input v-model="tempComp" type="checkbox" @change="updateTempComp">
                <span class="slider"></span>
              </label>
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

.stop-button {
  background-color: var(--aw-error-color, #ef5350);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-weight: 500;
}

.stop-button:hover {
  background-color: #d32f2f;
}

.stop-button:disabled {
  background-color: #757575;
  cursor: not-allowed;
  opacity: 0.7;
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

/* Position display styles */
.position-display {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.position-value {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.position-label {
  color: var(--aw-text-secondary-color, #aaa);
}

.value {
  font-size: 1.1rem;
  font-weight: 500;
}

.status-indicator {
  text-align: right;
  font-size: 0.9rem;
  color: var(--aw-success-color, #66bb6a);
}

.status-indicator.moving {
  color: var(--aw-warning-color, #ffa726);
}

.position-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.position-input {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.position-input label {
  color: var(--aw-text-secondary-color, #aaa);
}

.position-input input {
  flex: 1;
  padding: 6px;
  background-color: var(--aw-panel-bg-color, #2a2a2a);
  color: var(--aw-text-color, #f0f0f0);
  border: 1px solid var(--aw-panel-border-color, #444);
  border-radius: 4px;
}

/* Movement controls styles */
.movement-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.step-size-control {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.step-size-control label {
  color: var(--aw-text-secondary-color, #aaa);
}

.step-size-control input {
  width: 100px;
  padding: 6px;
  background-color: var(--aw-panel-bg-color, #2a2a2a);
  color: var(--aw-text-color, #f0f0f0);
  border: 1px solid var(--aw-panel-border-color, #444);
  border-radius: 4px;
}

.movement-buttons {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.direction-button {
  flex: 1;
  background-color: var(--aw-panel-bg-color, #2a2a2a);
  color: var(--aw-text-color, #f0f0f0);
  border: 1px solid var(--aw-panel-border-color, #444);
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}

.direction-button:hover {
  background-color: var(--aw-panel-hover-bg-color, #444);
}

/* Status display styles */
.status-display {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.temperature-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.temp-comp-control {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  color: var(--aw-text-secondary-color, #aaa);
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
</style> 