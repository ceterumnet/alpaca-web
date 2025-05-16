<template>
  <div class="simplified-panel simplified-covercalibrator-panel">
    <div class="panel-content">
      <div v-if="!currentDevice" class="connection-notice">
        <div class="connection-message">No Cover Calibrator selected or available</div>
      </div>
      <div v-else-if="!isConnected" class="connection-notice">
        <div class="connection-message">Cover Calibrator ({{ currentDevice.name }}) not connected.</div>
        <div class="panel-tip">Use the connect button in the panel header.</div>
      </div>
      <template v-else>
        <!-- Cover Control Section -->
        <div class="panel-section">
          <h3>Cover Control</h3>
          <div class="control-grid">
            <button :disabled="isCoverOperationInProgress || coverStateComputed === 'Open'" @click="openCover">Open Cover</button>
            <button :disabled="isCoverOperationInProgress || coverStateComputed === 'Closed'" @click="closeCover">Close Cover</button>
            <button :disabled="!isCoverOperationInProgress" @click="haltCover">Halt Cover</button>
          </div>
          <p>Cover Status: <strong>{{ coverStateComputed }}</strong></p>
        </div>

        <!-- Calibrator Control Section -->
        <div class="panel-section">
          <h3>Calibrator Control</h3>
          <div class="control-grid">
            <button :disabled="calibratorStateComputed === 'Ready' || calibratorStateComputed === 'NotReady' || (maxBrightness !== null && maxBrightness <= 0)" @click="calibratorOnHandler">Turn On</button>
            <button :disabled="calibratorStateComputed === 'Off' || calibratorStateComputed === 'Unknown' || (maxBrightness !== null && maxBrightness <= 0)" @click="calibratorOff">Turn Off</button>
          </div>
          <div v-if="maxBrightness !== null && maxBrightness > 0" class="brightness-control">
            <label :for="deviceId + '-brightness'">Brightness (0 - {{ maxBrightness }}):</label>
            <input
              :id="deviceId + '-brightness'"
              v-model.number="targetBrightness"
              type="number"
              min="0"
              :max="maxBrightness !== null ? Number(maxBrightness) : undefined"
              :disabled="calibratorStateComputed === 'Off' || calibratorStateComputed === 'Unknown'"
            />
          </div>
          <p>Calibrator Status: <strong>{{ calibratorStateComputed }}</strong></p>
          <p v-if="maxBrightness !== null && maxBrightness > 0">Current Brightness: <strong>{{ currentBrightness ?? 'N/A' }}</strong></p>
          <p v-else-if="maxBrightness === 0">Calibrator light not available.</p>
        </div>

        <!-- Device Status Section -->
        <div class="panel-section">
          <h3>Device Information</h3>
          <p>Device Name: <strong>{{ currentDevice.name }}</strong></p>
          <p>Description: <strong>{{ currentDevice.description }}</strong></p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { callAlpacaMethod, getAlpacaProperties } from '@/utils/alpacaPropertyAccess' // Assuming getAlpacaProperties is also used or needed
import type { Device } from '@/stores/types/device-store.types'

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

// Enum-like objects for states
const CoverStates: Record<number, string> = {
  0: 'Unknown', 1: 'Not Present', 2: 'Closed', 3: 'Moving', 4: 'Open', 5: 'Error'
}
const CalibratorStates: Record<number, string> = {
  0: 'Unknown', 1: 'Off', 2: 'NotReady', 3: 'Ready', 4: 'Error'
}

const store = useUnifiedStore()
const currentDevice = computed(() => store.getDeviceById(props.deviceId) as Device | undefined)

const coverState = ref<number | null>(null)
const calibratorState = ref<number | null>(null)
const currentBrightness = ref<number | null>(null)
const maxBrightness = ref<number | null>(null)
const targetBrightness = ref(0)

let pollInterval: number | undefined

const resetState = () => {
  coverState.value = null
  calibratorState.value = null
  currentBrightness.value = null
  maxBrightness.value = null
  // targetBrightness.value = 0 // Keep user input or reset based on preference
}

const fetchDeviceProperties = async () => {
  if (!props.deviceId || !props.isConnected) {
    resetState()
    return
  }
  try {
    // Using getAlpacaProperties for batch fetching if preferred
    const properties = await getAlpacaProperties(props.deviceId, ['coverstate', 'calibratorstate', 'maxbrightness', 'brightness'])
    
    coverState.value = properties.coverstate as number ?? null
    calibratorState.value = properties.calibratorstate as number ?? null
    maxBrightness.value = properties.maxbrightness as number ?? null

    if (maxBrightness.value !== null && maxBrightness.value > 0) {
      currentBrightness.value = properties.brightness as number ?? null
      if (targetBrightness.value === 0 && currentBrightness.value !== null) {
         targetBrightness.value = currentBrightness.value
      }
    } else {
      currentBrightness.value = null // No brightness if maxBrightness is 0 or null
    }

  } catch (error) {
    console.error(`Error fetching CoverCalibrator properties for ${props.deviceId}:`, error)
    resetState()
  }
}

const coverStateComputed = computed(() => {
  return coverState.value !== null ? CoverStates[coverState.value] || 'Error (Unknown State)' : 'N/A'
})

const calibratorStateComputed = computed(() => {
  return calibratorState.value !== null ? CalibratorStates[calibratorState.value] || 'Error (Unknown State)' : 'N/A'
})

const isCoverOperationInProgress = computed(() => coverState.value === 3) // Moving

// --- Cover Methods ---
const openCover = async () => {
  if (!props.deviceId) return
  try {
    await callAlpacaMethod(props.deviceId, 'opencover', {})
    fetchDeviceProperties()
  } catch (error) {
    console.error('Error opening cover:', error)
  }
}

const closeCover = async () => {
  if (!props.deviceId) return
  try {
    await callAlpacaMethod(props.deviceId, 'closecover', {})
    fetchDeviceProperties()
  } catch (error) {
    console.error('Error closing cover:', error)
  }
}

const haltCover = async () => {
  if (!props.deviceId) return
  try {
    await callAlpacaMethod(props.deviceId, 'haltcover', {})
    fetchDeviceProperties()
  } catch (error) {
    console.error('Error halting cover:', error)
  }
}

// --- Calibrator Methods ---
const calibratorOnHandler = async () => {
  if (!props.deviceId || (maxBrightness.value !== null && maxBrightness.value <= 0)) return
  try {
    let brightnessToSend = targetBrightness.value
    if (maxBrightness.value !== null && brightnessToSend > maxBrightness.value) {
      brightnessToSend = maxBrightness.value
    }
    if (brightnessToSend < 0) {
      brightnessToSend = 0
    }
    await callAlpacaMethod(props.deviceId, 'calibratoron', { Brightness: brightnessToSend })
    fetchDeviceProperties()
  } catch (error) {
    console.error('Error turning calibrator on:', error)
  }
}

const calibratorOff = async () => {
  if (!props.deviceId || (maxBrightness.value !== null && maxBrightness.value <= 0)) return
  try {
    await callAlpacaMethod(props.deviceId, 'calibratoroff', {})
    fetchDeviceProperties()
  } catch (error) {
    console.error('Error turning calibrator off:', error)
  }
}

watch(() => props.deviceId, (newId, oldId) => {
  if (newId !== oldId) {
    resetState()
    if (props.isConnected) {
        fetchDeviceProperties()
    }
  }
}, { immediate: true })

watch(() => props.isConnected, (newIsConnected) => {
  if (newIsConnected && props.deviceId) {
    fetchDeviceProperties()
    if (!pollInterval) {
      pollInterval = window.setInterval(fetchDeviceProperties, 5000)
    }
  } else {
    resetState()
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = undefined
    }
  }
}, { immediate: true })

onMounted(() => {
  if (props.isConnected && props.deviceId) {
     fetchDeviceProperties()
     if (!pollInterval) {
        pollInterval = window.setInterval(fetchDeviceProperties, 5000)
     }
  }
})

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = undefined
  }
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
  background-color: var(--aw-primary-color);
  color: var(--aw-button-primary-text);
  border: none;
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
  font-weight: var(--aw-font-weight-medium);
  text-align: center;
}

.control-grid button:hover:not(:disabled), .action-button:hover:not(:disabled) {
  background-color: var(--aw-primary-hover-color);
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