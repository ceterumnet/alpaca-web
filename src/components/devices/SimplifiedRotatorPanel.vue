<template>
  <div class="simplified-panel simplified-rotator-panel">
    <div class="panel-content">
      <div v-if="!currentDevice" class="connection-notice">
        <div class="connection-message">No rotator selected or available</div>
      </div>
      <div v-else-if="!props.isConnected" class="connection-notice">
        <div class="connection-message">Rotator ({{ currentDevice.name }}) not connected.</div>
        <div class="panel-tip">Use the connect button in the panel header.</div>
      </div>

      <template v-else>
        <!-- Status Section -->
        <div class="panel-section">
          <h3>Status</h3>
          <div class="status-grid">
            <div><span class="label">Sky Angle:</span> <span class="value">{{ rotatorState?.position?.toFixed(2) ?? 'N/A' }}°</span></div>
            <div><span class="label">Mech Angle:</span> <span class="value">{{ rotatorState?.mechanicalPosition?.toFixed(2) ?? 'N/A' }}°</span></div>
            <div><span class="label">Moving:</span> <span class="value">{{ rotatorState?.isMoving === null ? 'N/A' : (rotatorState?.isMoving ? 'Yes' : 'No') }}</span></div>
            <div><span class="label">Target:</span> <span class="value">{{ rotatorState?.targetPosition?.toFixed(2) ?? 'N/A' }}°</span></div>
            <div v-if="rotatorState?.canReverse !== null"><span class="label">Reversed:</span> <span class="value">{{ rotatorState?.reverse === null ? 'N/A' : (rotatorState?.reverse ? 'Yes' : 'No') }}</span></div>
          </div>
        </div>

        <!-- Movement Section -->
        <div class="panel-section">
          <h3>Movement</h3>
          <div class="movement-controls">
            <div class="input-group">
              <label for="targetAngle">Target Sky Angle (°):</label>
              <input id="targetAngle" v-model.number="targetAngleInput" type="number" step="0.1" />
              <button class="action-button" :disabled="rotatorState?.isMoving === true" @click="moveAbsoluteHandler">Move Absolute</button>
            </div>
            <div class="input-group">
              <label for="relativeAngle">Relative Move (°):</label>
              <input id="relativeAngle" v-model.number="relativeAngleInput" type="number" step="0.1" />
              <button class="action-button" :disabled="rotatorState?.isMoving === true" @click="moveRelativeHandler">Move Relative</button>
            </div>
            <button class="stop-button wide-button" :disabled="rotatorState?.isMoving !== true" @click="haltHandler">Halt</button>
          </div>
        </div>

        <!-- Advanced Section -->
        <div class="panel-section">
          <h3>Advanced</h3>
          <div class="advanced-controls">
            <div v-if="rotatorState?.canReverse === true" class="input-group">
              <label class="toggle-label">Reverse Direction:</label>
              <label class="toggle">
                <input v-model="reverseInput" type="checkbox" :disabled="rotatorState?.isMoving === true" @change="setReverseHandler">
                <span class="slider"></span>
              </label>
            </div>
            <div class="input-group">
              <label for="syncAngle">Sync Sky Angle (°):</label>
              <input id="syncAngle" v-model.number="syncAngleInput" type="number" step="0.1" />
              <button class="action-button" :disabled="rotatorState?.isMoving === true" @click="syncHandler">Sync</button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import type { RotatorDeviceProperties } from '@/types/device.types.ts'
// Removed: import { callAlpacaMethod, getAlpacaProperties, checkDeviceCapability } from '@/utils/alpacaPropertyAccess'

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  isConnected: {
    type: Boolean,
    required: true
  }
})

const store = useUnifiedStore()

const currentDevice = computed(() => {
  return store.getDeviceById(props.deviceId)
})

// Computed property to get rotator state from the store, now correctly typed
const rotatorState = computed(() => {
  return currentDevice.value?.properties as RotatorDeviceProperties | undefined
})

// Input refs - these remain local to the component for form handling
const targetAngleInput = ref<number>(0)
const relativeAngleInput = ref<number>(0)
const syncAngleInput = ref<number>(0)
const reverseInput = ref<boolean>(false) // This will be synced with store.rotatorData.reverse

const resetLocalInputs = () => {
  targetAngleInput.value = 0
  relativeAngleInput.value = 0
  syncAngleInput.value = 0
  // reverseInput is managed by watcher below
}

const updateRotatorStatus = async () => {
  if (!props.isConnected || !props.deviceId) return
  try {
    await store.fetchRotatorStatus(props.deviceId)
  } catch (error) {
    console.error('Error updating rotator status via store:', error)
  }
}

const fetchCapabilities = async () => {
  if (!props.deviceId) return;
  try {
    await store.fetchRotatorCapabilities(props.deviceId)
  } catch (error) {
    console.error('Error fetching rotator capabilities via store:', error)
  }
}

// Watch for changes in store's rotator state to update local inputs if necessary
watch(() => rotatorState.value?.reverse, (newReverse) => {
  if (newReverse !== null && newReverse !== undefined) {
    reverseInput.value = newReverse
  }
}, { immediate: true })

watch(() => rotatorState.value?.position, (newPosition) => {
  if (newPosition !== null && newPosition !== undefined && targetAngleInput.value === 0) {
    targetAngleInput.value = parseFloat(newPosition.toFixed(1))
  }
  if (newPosition !== null && newPosition !== undefined && syncAngleInput.value === 0) {
    syncAngleInput.value = parseFloat(newPosition.toFixed(1)) // Also init sync input
  }
}, { immediate: true })

// Alpaca actions - now dispatch to store
const moveAbsoluteHandler = async () => {
  if (!props.deviceId || targetAngleInput.value === null) return
  try {
    await store.moveAbsolute(props.deviceId, targetAngleInput.value)
  } catch (error) {
    console.error('Error moving absolute via store:', error)
  }
}

const moveRelativeHandler = async () => {
  if (!props.deviceId || relativeAngleInput.value === null) return
  try {
    await store.moveRelative(props.deviceId, relativeAngleInput.value)
  } catch (error) {
    console.error('Error moving relative via store:', error)
  }
}

const haltHandler = async () => {
  if (!props.deviceId) return
  try {
    await store.haltRotator(props.deviceId)
  } catch (error) {
    console.error('Error halting rotator via store:', error)
  }
}

const syncHandler = async () => {
  if (!props.deviceId || syncAngleInput.value === null) return
  try {
    await store.syncToPosition(props.deviceId, syncAngleInput.value)
  } catch (error) {
    console.error('Error syncing rotator via store:', error)
  }
}

const setReverseHandler = async () => {
  if (!props.deviceId || reverseInput.value === null) return
  try {
    await store.setRotatorReverse(props.deviceId, reverseInput.value)
  } catch (error) {
    console.error('Error setting reverse state via store:', error)
    // If store action handles reverting optimistic updates or re-fetches state, this might not be needed
    // For safety, ensure reverseInput reflects the actual store state after an error
    if (rotatorState.value?.reverse !== null && rotatorState.value?.reverse !== undefined) {
      reverseInput.value = rotatorState.value.reverse
    }
  }
}

let statusTimer: number | undefined

const startPolling = () => {
  if (statusTimer) clearInterval(statusTimer);
  if (props.isConnected && props.deviceId) {
    statusTimer = window.setInterval(updateRotatorStatus, 2000) // Poll every 2 seconds
  }
}

const stopPolling = () => {
  if (statusTimer) {
    window.clearInterval(statusTimer)
    statusTimer = undefined
  }
}

onMounted(async () => {
  if (props.deviceId) {
    store.initializeRotatorState(props.deviceId)
    if (props.isConnected) {
      await fetchCapabilities()
      await updateRotatorStatus()
      startPolling()
    }
  }
})

watch(() => props.isConnected, async (newIsConnected) => {
  if (props.deviceId) {
    if (newIsConnected) {
      store.initializeRotatorState(props.deviceId) // Ensure state is ready
      await fetchCapabilities()
      await updateRotatorStatus()
      startPolling()
    } else {
      stopPolling()
      store.clearRotatorState(props.deviceId) // Clear state on disconnect
      resetLocalInputs()
    }
  }
})

watch(() => props.deviceId, async (newDeviceId, oldDeviceId) => {
  if (oldDeviceId) {
    stopPolling()
    store.clearRotatorState(oldDeviceId) // Clear state for old device
  }
  if (newDeviceId) {
    store.initializeRotatorState(newDeviceId)
    resetLocalInputs() // Reset inputs for the new device
    if (props.isConnected) {
      await fetchCapabilities()
      await updateRotatorStatus()
      startPolling()
    }
  } else {
    stopPolling()
    resetLocalInputs()
  }
}, { immediate: true })

onUnmounted(() => {
  stopPolling()
  // Optionally clear state if component is truly destroyed and device no longer relevant
  // if (props.deviceId) store.clearRotatorState(props.deviceId)
})

</script>

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

.panel-content {
  overflow-y: auto;
  flex: 1;
  padding: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
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

.connection-notice {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100px;
  background-color: var(--aw-panel-content-bg-color);
  border-radius: calc(var(--aw-spacing-xs) * 1.5);
  margin-bottom: calc(var(--aw-spacing-md) + var(--aw-spacing-xs));
  padding: var(--aw-spacing-md);
  color: var(--aw-text-secondary-color);
}

.connection-message { font-size: 1.1rem; }
.panel-tip { font-size: 0.8rem; }

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--aw-spacing-sm);
}

.status-grid > div {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label, .toggle-label {
  color: var(--aw-text-secondary-color);
  font-size: 0.9rem;
}

.value {
  font-size: 0.9rem;
  font-weight: var(--aw-font-weight-medium);
  text-align: right;
}

.movement-controls, .advanced-controls {
  display: flex;
  flex-direction: column;
  gap: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
}

.input-group {
  display: flex;
  flex-wrap: wrap; /* Allow wrapping for smaller screens */
  align-items: center;
  gap: var(--aw-spacing-sm);
}

.input-group label:not(.toggle) {
  flex-basis: 120px; /* Give labels a consistent starting width */
}

.input-group input[type="number"] {
  flex-grow: 1;
  padding: var(--aw-spacing-xs);
  background-color: var(--aw-input-bg-color, var(--aw-panel-bg-color));
  color: var(--aw-text-color);
  border: 1px solid var(--aw-input-border-color, var(--aw-panel-border-color));
  border-radius: var(--aw-border-radius-sm);
  min-width: 80px;
}

.action-button, .stop-button {
  padding: calc(var(--aw-spacing-xs) * 1.5) var(--aw-spacing-sm);
  background-color: var(--aw-button-primary-bg);
  color: var(--aw-button-primary-text);
  border: none;
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
  font-weight: var(--aw-font-weight-medium);
  text-align: center;
  flex-grow: 1; /* Allow buttons to grow if space allows */
}

.action-button:hover { background-color: var(--aw-button-primary-hover-bg); }

.action-button:disabled { 
  background-color: var(--aw-color-neutral-300);
  cursor: not-allowed;
  opacity: 0.7; 
}

.stop-button {
  background-color: var(--aw-button-danger-bg);
  color: var(--aw-button-danger-text);
}

.stop-button.wide-button {
    width: 100%; /* Make halt button full width in its flex container */
}

.stop-button:hover { background-color: var(--aw-button-danger-hover-bg); }

.stop-button:disabled { 
  background-color: var(--aw-color-neutral-300);
  cursor: not-allowed;
  opacity: 0.7; 
}

/* Toggle switch styles */
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
  transition: .4s;
  border-radius: var(--aw-spacing-lg);
}

.slider::before {
  position: absolute;
  content: "";
  height: 16px; width: 16px;
  left: 3px; bottom: 3px;
  background-color: var(--aw-text-secondary-color);
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider { background-color: var(--aw-success-color); }

input:checked + .slider::before {
  transform: translateX(calc(var(--aw-spacing-lg) - var(--aw-spacing-xs)));
  background-color: var(--aw-button-primary-text);
}
</style> 