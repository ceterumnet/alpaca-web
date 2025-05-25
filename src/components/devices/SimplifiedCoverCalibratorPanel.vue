<template>
  <div class="simplified-panel simplified-covercalibrator-panel">
    <div class="panel-content">
      <div v-if="!currentDevice" class="connection-notice">
        <div class="connection-message">No Cover Calibrator selected or available</div>
      </div>
      <div v-else-if="!isConnected" class="connection-notice">
        <div class="connection-message">Cover Calibrator ({{ currentDevice?.name }}) not connected.</div>
        <div class="panel-tip">Use the connect button in the panel header.</div>
      </div>
      <template v-else>
        <!-- Cover Control Section -->
        <div class="panel-section">
          <h3>Cover Control</h3>
          <div class="control-grid">
            <button :disabled="isCoverOperationInProgress || coverStateComputed === 'Open'" @click="openCoverHandler">Open Cover</button>
            <button :disabled="isCoverOperationInProgress || coverStateComputed === 'Closed'" @click="closeCoverHandler">Close Cover</button>
            <button :disabled="!isCoverOperationInProgress" @click="haltCoverHandler">Halt Cover</button>
          </div>
          <p>Cover Status: <strong>{{ coverStateComputed }}</strong></p>
        </div>

        <!-- Calibrator Control Section -->
        <div class="panel-section">
          <h3>Calibrator Control</h3>
          <div class="control-grid">
            <button :disabled="calibratorStateComputed === 'Ready' || calibratorStateComputed === 'NotReady' || !deviceState || deviceState.maxBrightness == null || deviceState.maxBrightness <= 0" @click="calibratorOnHandler">Turn On</button>
            <button :disabled="calibratorStateComputed === 'Off' || calibratorStateComputed === 'Unknown' || !deviceState || deviceState.maxBrightness == null || deviceState.maxBrightness <= 0" @click="calibratorOffHandler">Turn Off</button>
          </div>
          <div v-if="deviceState && deviceState.maxBrightness != null && deviceState.maxBrightness > 0" class="brightness-control">
            <label :for="deviceId + '-brightness'">Brightness (0 - {{ deviceState.maxBrightness }}):</label>
            <input
              :id="deviceId + '-brightness'"
              v-model.number="targetBrightnessInput"
              type="number"
              min="0"
              :max="Number(deviceState.maxBrightness)"
              :disabled="calibratorStateComputed === 'Off' || calibratorStateComputed === 'Unknown'"
            />
          </div>
          <p>Calibrator Status: <strong>{{ calibratorStateComputed }}</strong></p>
          <p v-if="deviceState && deviceState.maxBrightness != null && deviceState.maxBrightness > 0">Current Brightness: <strong>{{ deviceState?.currentBrightness ?? 'N/A' }}</strong></p>
          <p v-else-if="deviceState && deviceState.maxBrightness === 0">Calibrator light not available.</p>
        </div>

        <!-- Device Status Section -->
        <div class="panel-section">
          <h3>Device Information</h3>
          <p>Device Name: <strong>{{ currentDevice?.name }}</strong></p>
          <!-- Removed description as it's not typically in simplified panels and not in store state for covercalibrator -->
          <!-- <p>Description: <strong>{{ currentDevice.description }}</strong></p> -->
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
// Removed: import { callAlpacaMethod, getAlpacaProperties } from '@/utils/alpacaPropertyAccess'
import type { Device } from '@/stores/types/device-store.types' // Kept for currentDevice typing

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

// Enum-like objects for states - can remain in panel for display logic
const CoverStates: Record<number, string> = {
  0: 'Unknown', // Alpaca: Unknown
  1: 'Not Present', // Alpaca: NotPresent
  2: 'Closed', // Alpaca: Closed
  3: 'Moving', // Alpaca: Moving
  4: 'Open', // Alpaca: Open
  5: 'Error' // Alpaca: Error
}
const CalibratorStates: Record<number, string> = {
  0: 'Unknown', // Alpaca: Unknown
  1: 'Off', // Alpaca: Off
  2: 'NotReady', // Alpaca: NotReady (Calibrator is warming up)
  3: 'Ready', // Alpaca: Ready (Calibrator is ready for use)
  4: 'Error' // Alpaca: Error
}

const store = useUnifiedStore()
const currentDevice = computed(() => store.getDeviceById(props.deviceId) as Device | undefined)

// Computed property to get CoverCalibrator state from the store
const deviceState = computed(() => {
  return store.coverCalibratorData.get(props.deviceId)
})

const targetBrightnessInput = ref(0)

let pollTimer: number | undefined

const resetLocalInputs = () => {
  // targetBrightnessInput.value = 0 // Reset based on preference, or sync with currentBrightness from store
}

const fetchDeviceStatus = async () => {
  if (!props.deviceId || !props.isConnected) {
    return
  }
  try {
    await store.fetchCoverCalibratorStatus(props.deviceId)
  } catch (error) {
    console.error(`Error fetching CoverCalibrator status for ${props.deviceId} via store:`, error)
  }
}

const coverStateComputed = computed(() => {
  const stateVal = deviceState.value?.coverState
  return stateVal !== null && stateVal !== undefined ? (CoverStates[stateVal] || `Error (Unknown State ${stateVal})`) : 'N/A'
})

const calibratorStateComputed = computed(() => {
  const stateVal = deviceState.value?.calibratorState
  return stateVal !== null && stateVal !== undefined ? (CalibratorStates[stateVal] || `Error (Unknown State ${stateVal})`) : 'N/A'
})

const isCoverOperationInProgress = computed(() => deviceState.value?.coverState === 3) // 3 = Moving

// --- Cover Methods ---
const openCoverHandler = async () => {
  if (!props.deviceId) return
  try {
    await store.openCover(props.deviceId)
  } catch (error) {
    console.error('Error opening cover via store:', error)
  }
}

const closeCoverHandler = async () => {
  if (!props.deviceId) return
  try {
    await store.closeCover(props.deviceId)
  } catch (error) {
    console.error('Error closing cover via store:', error)
  }
}

const haltCoverHandler = async () => {
  if (!props.deviceId) return
  try {
    await store.haltCover(props.deviceId)
  } catch (error) {
    console.error('Error halting cover via store:', error)
  }
}

// --- Calibrator Methods ---
const calibratorOnHandler = async () => {
  if (!props.deviceId) return
  const currentMaxBrightness = deviceState.value?.maxBrightness
  if (currentMaxBrightness === null || currentMaxBrightness === undefined || currentMaxBrightness <= 0) return
  
  try {
    let brightnessToSend = targetBrightnessInput.value
    if (brightnessToSend > currentMaxBrightness) {
      brightnessToSend = currentMaxBrightness
    }
    if (brightnessToSend < 0) {
      brightnessToSend = 0
    }
    await store.calibratorOn(props.deviceId, brightnessToSend)
  } catch (error) {
    console.error('Error turning calibrator on via store:', error)
  }
}

const calibratorOffHandler = async () => {
  if (!props.deviceId) return
  const currentMaxBrightness = deviceState.value?.maxBrightness;
  if (currentMaxBrightness === null || currentMaxBrightness === undefined || currentMaxBrightness <= 0) return;
  try { await store.calibratorOff(props.deviceId) } catch (e) { console.error('Error calibratorOff:', e) }
}

// Sync targetBrightnessInput with currentBrightness from store when it changes and is not zero
watch(() => deviceState.value?.currentBrightness, (newBrightness) => {
  if (newBrightness !== null && newBrightness !== undefined) {
    targetBrightnessInput.value = newBrightness
  }
}, { immediate: true })

// Watchers for connection and deviceId changes
const startPolling = () => {
  if (pollTimer) clearInterval(pollTimer)
  if (props.isConnected && props.deviceId) {
    pollTimer = window.setInterval(fetchDeviceStatus, 5000) // Poll every 5 seconds
  }
}

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = undefined
  }
}

onMounted(() => {
  if (props.deviceId) {
    store.initializeCoverCalibratorState(props.deviceId)
    if (props.isConnected) {
      fetchDeviceStatus()
      startPolling()
    }
  }
})

watch(() => props.isConnected, (newIsConnected) => {
  if (props.deviceId) {
    if (newIsConnected) {
      store.initializeCoverCalibratorState(props.deviceId) // Ensure state exists
      fetchDeviceStatus()
      startPolling()
    } else {
      stopPolling()
      // store.clearCoverCalibratorState(props.deviceId) // Clear state on disconnect - decide if needed or keep last state
      resetLocalInputs()
    }
  }
})

watch(() => props.deviceId, (newDeviceId, oldDeviceId) => {
  if (oldDeviceId) {
    stopPolling()
    // store.clearCoverCalibratorState(oldDeviceId) // Clear state for old device
  }
  if (newDeviceId) {
    store.initializeCoverCalibratorState(newDeviceId)
    resetLocalInputs() // Reset inputs for the new device
    if (props.isConnected) {
      fetchDeviceStatus()
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
  // if (props.deviceId) store.clearCoverCalibratorState(props.deviceId)
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
  margin-bottom: calc(var(--aw-spacing-sm));
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


.control-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--aw-spacing-sm);
  margin-bottom: var(--aw-spacing-sm);
}

.control-grid button, .action-button {
  padding: calc(var(--aw-spacing-xs) * 1.5) var(--aw-spacing-sm);
  background-color: var(--aw-button-primary-bg);
  color: var(--aw-button-primary-text);
  border: none;
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
  font-weight: var(--aw-font-weight-medium);
  text-align: center;
}

.control-grid button:hover:not(:disabled), .action-button:hover:not(:disabled) {
  background-color: var(--aw-button-primary-hover-bg);
}

.control-grid button:disabled, .action-button:disabled {
  background-color: var(--aw-color-neutral-300);
  cursor: not-allowed;
  opacity: 0.7;
}

.brightness-control {
  margin-top: var(--aw-spacing-sm);
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-sm);
}

.brightness-control label {
  font-size: 0.9rem;
  color: var(--aw-text-secondary-color);
}

.brightness-control input[type="number"] {
  width: 80px;
  padding: var(--aw-spacing-xs);
  background-color: var(--aw-input-bg-color, var(--aw-panel-bg-color));
  color: var(--aw-text-color);
  border: 1px solid var(--aw-input-border-color, var(--aw-panel-border-color));
  border-radius: var(--aw-border-radius-sm);
}

.simplified-covercalibrator-panel p {
  margin: calc(var(--aw-spacing-xs) / 2) 0;
  font-size: 0.9rem;
}

.simplified-covercalibrator-panel strong {
  font-weight: var(--aw-font-weight-medium);
}

/* Styles for specific states could be added here using classes if needed */

/* e.g. .status-open, .status-closed, .calibrator-ready */
</style> 