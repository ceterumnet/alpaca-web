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
            <div><span class="label">Sky Angle:</span> <span class="value">{{ position?.toFixed(2) ?? 'N/A' }}°</span></div>
            <div><span class="label">Mech Angle:</span> <span class="value">{{ mechanicalPosition?.toFixed(2) ?? 'N/A' }}°</span></div>
            <div><span class="label">Moving:</span> <span class="value">{{ isMoving === null ? 'N/A' : (isMoving ? 'Yes' : 'No') }}</span></div>
            <div><span class="label">Target:</span> <span class="value">{{ targetPositionDisplay?.toFixed(2) ?? 'N/A' }}°</span></div>
            <div v-if="canReverse !== null"><span class="label">Reversed:</span> <span class="value">{{ reverse === null ? 'N/A' : (reverse ? 'Yes' : 'No') }}</span></div>
          </div>
        </div>

        <!-- Movement Section -->
        <div class="panel-section">
          <h3>Movement</h3>
          <div class="movement-controls">
            <div class="input-group">
              <label for="targetAngle">Target Sky Angle (°):</label>
              <input id="targetAngle" v-model.number="targetAngleInput" type="number" step="0.1" />
              <button class="action-button" :disabled="isMoving === true" @click="moveAbsoluteHandler">Move Absolute</button>
            </div>
            <div class="input-group">
              <label for="relativeAngle">Relative Move (°):</label>
              <input id="relativeAngle" v-model.number="relativeAngleInput" type="number" step="0.1" />
              <button class="action-button" :disabled="isMoving === true" @click="moveRelativeHandler">Move Relative</button>
            </div>
            <button class="stop-button wide-button" :disabled="isMoving !== true" @click="haltHandler">Halt</button>
          </div>
        </div>

        <!-- Advanced Section -->
        <div class="panel-section">
          <h3>Advanced</h3>
          <div class="advanced-controls">
            <div v-if="canReverse === true" class="input-group">
              <label class="toggle-label">Reverse Direction:</label>
              <label class="toggle">
                <input v-model="reverseInput" type="checkbox" :disabled="isMoving === true" @change="setReverseHandler">
                <span class="slider"></span>
              </label>
            </div>
            <div class="input-group">
              <label for="syncAngle">Sync Sky Angle (°):</label>
              <input id="syncAngle" v-model.number="syncAngleInput" type="number" step="0.1" />
              <button class="action-button" :disabled="isMoving === true" @click="syncHandler">Sync</button>
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
import { callAlpacaMethod, getAlpacaProperties, checkDeviceCapability } from '@/utils/alpacaPropertyAccess'

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

// Rotator state refs
const position = ref<number | null>(null)
const mechanicalPosition = ref<number | null>(null)
const isMoving = ref<boolean | null>(null)
const reverse = ref<boolean | null>(null)
const canReverse = ref<boolean | null>(null)
const targetPositionDisplay = ref<number | null>(null) // For displaying target position from device

// Input refs
const targetAngleInput = ref<number>(0)
const relativeAngleInput = ref<number>(0)
const syncAngleInput = ref<number>(0)
const reverseInput = ref<boolean>(false)

const resetRotatorState = () => {
  position.value = null
  mechanicalPosition.value = null
  isMoving.value = null
  reverse.value = null
  // canReverse is a capability, should not reset frequently, fetched once
  targetPositionDisplay.value = null
  targetAngleInput.value = 0
  relativeAngleInput.value = 0
  syncAngleInput.value = 0
  // reverseInput should be updated from reverse.value when status updates
}

const updateRotatorStatus = async () => {
  if (!props.isConnected || !props.deviceId) return

  try {
    const properties = await getAlpacaProperties(props.deviceId, [
      'position',
      'mechanicalposition',
      'ismoving',
      'reverse',
      'targetposition' // Fetching targetposition to display
    ])

    position.value = properties.position as number ?? null
    mechanicalPosition.value = properties.mechanicalposition as number ?? null
    isMoving.value = properties.ismoving as boolean ?? null
    reverse.value = properties.reverse as boolean ?? null
    targetPositionDisplay.value = properties.targetposition as number ?? null

    // Update reverseInput to match current device state if not already matching
    if (reverse.value !== null && reverseInput.value !== reverse.value) {
      reverseInput.value = reverse.value
    }
    // Initialize targetAngleInput if position is known
    if (position.value !== null && targetAngleInput.value === 0) {
        targetAngleInput.value = parseFloat(position.value.toFixed(1));
    }

  } catch (error) {
    console.error('Error updating rotator status:', error)
  }
}

const fetchCapabilities = async () => {
  if (!props.deviceId) return;
  canReverse.value = await checkDeviceCapability(props.deviceId, 'canreverse', false)
}

// Alpaca actions
const moveAbsoluteHandler = async () => {
  if (!props.deviceId || targetAngleInput.value === null) return
  try {
    await callAlpacaMethod(props.deviceId, 'moveAbsolute', { Position: targetAngleInput.value })
    updateRotatorStatus()
  } catch (error) {
    console.error('Error moving absolute:', error)
  }
}

const moveRelativeHandler = async () => {
  if (!props.deviceId || relativeAngleInput.value === null) return
  try {
    await callAlpacaMethod(props.deviceId, 'move', { Position: relativeAngleInput.value })
    updateRotatorStatus()
  } catch (error) {
    console.error('Error moving relative:', error)
  }
}

const haltHandler = async () => {
  if (!props.deviceId) return
  try {
    await callAlpacaMethod(props.deviceId, 'halt')
    updateRotatorStatus()
  } catch (error) {
    console.error('Error halting rotator:', error)
  }
}

const syncHandler = async () => {
  if (!props.deviceId || syncAngleInput.value === null) return
  try {
    await callAlpacaMethod(props.deviceId, 'syncToPosition', { Position: syncAngleInput.value })
    updateRotatorStatus()
  } catch (error) {
    console.error('Error syncing rotator:', error)
  }
}

const setReverseHandler = async () => {
  if (!props.deviceId || reverseInput.value === null) return
  try {
    await callAlpacaMethod(props.deviceId, 'setReverse', { Reverse: reverseInput.value })
    updateRotatorStatus()
  } catch (error) {
    console.error('Error setting reverse state:', error)
    if (reverse.value !== null) reverseInput.value = reverse.value;
  }
}

let statusTimer: number | undefined

onMounted(async () => {
  await fetchCapabilities() // Fetch capabilities once
  if (props.isConnected && props.deviceId) {
    await updateRotatorStatus()
    if (!statusTimer) {
      statusTimer = window.setInterval(updateRotatorStatus, 2000) // Poll every 2 seconds
    }
  } else {
    if (statusTimer) {
      window.clearInterval(statusTimer)
      statusTimer = undefined
    }
  }
})

watch(() => props.isConnected, async (newIsConnected) => {
  if (newIsConnected && props.deviceId) {
    resetRotatorState()
    await fetchCapabilities() // Re-fetch capabilities on new connection
    await updateRotatorStatus()
    if (!statusTimer) {
      statusTimer = window.setInterval(updateRotatorStatus, 2000)
    }
  } else {
    if (statusTimer) {
      window.clearInterval(statusTimer)
      statusTimer = undefined
    }
    resetRotatorState()
  }
})

watch(() => props.deviceId, async (newDeviceId, oldDeviceId) => {
  if (newDeviceId !== oldDeviceId) {
    resetRotatorState()
    await fetchCapabilities()
    if (props.isConnected) {
      await updateRotatorStatus()
      if (!statusTimer) {
        statusTimer = window.setInterval(updateRotatorStatus, 2000)
      }
    } else {
      if (statusTimer) {
        clearInterval(statusTimer)
        statusTimer = undefined
      }
    }
  }
}, { immediate: true })

onUnmounted(() => {
  if (statusTimer) {
    window.clearInterval(statusTimer)
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
  background-color: var(--aw-primary-color);
  color: var(--aw-button-primary-text);
  border: none;
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
  font-weight: var(--aw-font-weight-medium);
  text-align: center;
  flex-grow: 1; /* Allow buttons to grow if space allows */
}

.action-button:hover { background-color: var(--aw-primary-hover-color); }
.action-button:disabled { 
  background-color: var(--aw-color-neutral-300);
  cursor: not-allowed;
  opacity: 0.7; 
}

.stop-button {
  background-color: var(--aw-error-color);
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

.toggle input { opacity: 0; width: 0; height: 0; }

.slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: var(--aw-panel-bg-color);
  border: 1px solid var(--aw-panel-border-color);
  transition: .4s;
  border-radius: var(--aw-spacing-lg);
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px; width: 16px;
  left: 3px; bottom: 3px;
  background-color: var(--aw-text-secondary-color);
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider { background-color: var(--aw-primary-color); }
input:checked + .slider:before {
  transform: translateX(calc(var(--aw-spacing-lg) - var(--aw-spacing-xs)));
  background-color: var(--aw-button-primary-text);
}
</style> 