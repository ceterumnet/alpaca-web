<script setup lang="ts">
import log from '@/plugins/logger'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'

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

// Get the current device from the store
const currentDevice = computed(() => {
  return store.getDeviceById(props.deviceId)
})

// --- Computed properties deriving state from the store ---
const position = computed(() => {
  const val = currentDevice.value?.properties.focuser_position
  return typeof val === 'number' ? val : 0
})
const isMoving = computed(() => currentDevice.value?.properties.focuser_isMoving ?? false)
const temperature = computed(() => {
  const val = currentDevice.value?.properties.focuser_temperature
  return typeof val === 'number' ? val : null
})
const stepSize = computed(() => {
  const val = currentDevice.value?.properties.focuser_stepSize
  return typeof val === 'number' ? val : 10
})
const maxStep = computed(() => {
  const val = currentDevice.value?.properties.focuser_maxStep
  return typeof val === 'number' ? val : 1000
})

const tempComp = computed({
  get: () => currentDevice.value?.properties.focuser_tempComp ?? false,
  set: (newValue: boolean) => {
    if (!props.deviceId) return
    store.setFocuserTempComp(props.deviceId, newValue)
  }
})

// Local UI state (not directly from device properties)
const targetPosition = ref(0)

// Initialize targetPosition when current position becomes available or changes
watch(
  position,
  (newPos) => {
    // Only set initially or if panel is reset and new device has different position
    if (targetPosition.value === 0 || targetPosition.value !== newPos) {
      targetPosition.value = newPos
    }
  },
  { immediate: true }
)

// Reset focuser state (local UI state) when device changes or disconnects
const resetFocuserPanelState = () => {
  // Device properties are now reactive from the store, so no need to reset them here.
  // We only reset local UI state not directly tied to store properties.
  const currentPos = position.value
  targetPosition.value = currentPos // Reset target to current actual position
}

// --- Actions that call store methods ---
const moveToPosition = async (targetPositionValue: number) => {
  if (!props.deviceId) return
  store.moveFocuser(props.deviceId, targetPositionValue)
}

const moveIn = async () => {
  if (!props.deviceId) return
  // position and stepSize are now guaranteed to be numbers by computed properties
  await store.moveFocuser(props.deviceId, position.value - stepSize.value)
}

const moveOut = async () => {
  if (!props.deviceId) return
  // position and stepSize are now guaranteed to be numbers by computed properties
  await store.moveFocuser(props.deviceId, position.value + stepSize.value)
}

const halt = async () => {
  if (!props.deviceId) return
  store.haltFocuser(props.deviceId)
}

// updateTempComp is handled by the computed setter for tempComp

const moveToTarget = async () => {
  await moveToPosition(targetPosition.value)
}

// Polling is now handled by focuserActions.ts in the store.
// Removed statusTimer and updateFocuserStatus

// Setup when mounted
onMounted(() => {
  // Data flows from the store.
  // Call resetFocuserPanelState if local UI elements (like targets) need resetting on mount.
  if (props.isConnected && props.deviceId) {
    // Initial data fetch is handled by handleFocuserConnected in store
    // Initialize local UI state
    resetFocuserPanelState()
  }
})

// Watch for changes in connection status (from parent)
watch(
  () => props.isConnected,
  (newIsConnected) => {
    log.debug({ deviceIds: [props.deviceId] }, `SimplifiedFocuserPanel: Connection status changed to ${newIsConnected} for device ${props.deviceId}`)
    if (newIsConnected && props.deviceId) {
      // Connection logic (fetching details, starting polling) is handled by
      // handleFocuserConnected in focuserActions.ts when the store detects connection.
      resetFocuserPanelState() // Reset local UI state
    } else {
      resetFocuserPanelState() // Clear/reset local UI data when disconnected
    }
  }
)

// Watch for device ID changes
watch(
  () => props.deviceId,
  (newDeviceId, oldDeviceId) => {
    if (newDeviceId !== oldDeviceId) {
      log.debug({ deviceIds: [props.deviceId] }, `SimplifiedFocuserPanel: Device changed from ${oldDeviceId} to ${newDeviceId}`)
      resetFocuserPanelState() // Reset local UI state for the new device

      // If connected, the store's connection handler for the new device would have already
      // fetched initial data and started polling.
      // If we need to ensure targetPosition is specifically updated for the new device's current position:
      if (props.isConnected && currentDevice.value) {
        // Use the computed, type-checked position value
        targetPosition.value = position.value
      }
    }
  },
  { immediate: true }
) // immediate: true to run on initial setup

// Cleanup when unmounted
onUnmounted(() => {
  // Polling is managed by the store, so no interval to clear here.
  // The store's handleFocuserDisconnected or a general device removal logic
  // should handle stopping polling for this deviceId if the panel is destroyed.
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
                <input v-model.number="targetPosition" type="number" min="0" :max="maxStep" step="1" />
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
              <label>Step Size (microns):</label>
              <!-- StepSize is typically read-only from device, display it -->
              <input v-model.number="stepSize" type="number" readonly />
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
                <input v-model="tempComp" type="checkbox" />
                <!-- No @change needed, computed setter handles it -->
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
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-text-color);
  border-radius: var(--aw-border-radius);
  border: 1px solid var(--aw-panel-border-color);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
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

.stop-button {
  background-color: var(--aw-button-danger-bg);
  color: var(--aw-button-danger-text);
  border: none;
  border-radius: var(--aw-border-radius-sm);
  padding: calc(var(--aw-spacing-xs) * 1.5) calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
  cursor: pointer;
  font-weight: var(--aw-font-weight-medium);
}

.stop-button:hover {
  background-color: var(--aw-button-danger-hover-bg);
}

.stop-button:disabled {
  background-color: var(--aw-color-neutral-300);
  cursor: not-allowed;
  opacity: 0.7;
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

/* Position display styles */
.position-display {
  display: flex;
  flex-direction: column;
  gap: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
}

.position-value {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.position-label {
  color: var(--aw-text-secondary-color);
}

.value {
  font-size: 1.1rem;
  font-weight: var(--aw-font-weight-medium);
}

.status-indicator {
  text-align: right;
  font-size: 0.9rem;
  color: var(--aw-success-color);
}

.status-indicator.moving {
  color: var(--aw-warning-color);
}

.position-controls {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-sm);
  margin-top: var(--aw-spacing-sm);
}

.position-input {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-sm);
}

.position-input label {
  color: var(--aw-text-secondary-color);
}

.position-input input {
  flex: 1;
  padding: calc(var(--aw-spacing-xs) * 1.5);
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-text-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-sm);
}

/* Movement controls styles */
.movement-controls {
  display: flex;
  flex-direction: column;
  gap: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
}

.step-size-control {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.step-size-control label {
  color: var(--aw-text-secondary-color);
}

.step-size-control input {
  width: 100px;
  padding: calc(var(--aw-spacing-xs) * 1.5);
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-text-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-sm);
}

.movement-buttons {
  display: flex;
  justify-content: space-between;
  gap: var(--aw-spacing-sm);
}

.direction-button {
  flex: 1;
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-text-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-sm);
  padding: var(--aw-spacing-sm) calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
  cursor: pointer;
  font-weight: var(--aw-font-weight-medium);
  display: flex;
  align-items: center;
  justify-content: center;
}

.direction-button:hover {
  background-color: var(--aw-panel-hover-bg-color);
}

/* Status display styles */
.status-display {
  display: flex;
  flex-direction: column;
  gap: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
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
  color: var(--aw-text-secondary-color);
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
  inset: 0;
  background-color: var(--aw-panel-bg-color);
  border: 1px solid var(--aw-panel-border-color);
  transition: 0.4s;
  border-radius: var(--aw-spacing-lg);
}

.slider::before {
  position: absolute;
  content: '';
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: var(--aw-text-secondary-color);
  transition: 0.4s;
  border-radius: var(--aw-border-radius-sm);
}

input:checked + .slider {
  background-color: var(--aw-success-color);
}

input:checked + .slider::before {
  transform: translateX(calc(var(--aw-spacing-lg) - var(--aw-spacing-xs)));
  background-color: var(--aw-button-primary-text);
}

.panel-tip {
  font-size: 0.8rem;
  color: var(--aw-text-secondary-color);
}
</style>
