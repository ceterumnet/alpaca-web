<template>
  <div class="simplified-panel simplified-dome-panel">
    <div class="panel-content">
      <div v-if="!currentDevice" class="connection-notice">
        <div class="connection-message">No dome selected or available</div>
      </div>
      <div v-else-if="!props.isConnected" class="connection-notice">
        <div class="connection-message">Dome ({{ currentDevice.name }}) not connected.</div>
        <div class="panel-tip">Use the connect button in the panel header.</div>
      </div>

      <template v-else>
        <div class="panel-section">
          <h3>Status</h3>
          <div class="status-grid">
            <div><span class="label">Shutter:</span> <span class="value">{{ shutterStatusText }}</span></div>
            <div><span class="label">Slewing:</span> <span class="value">{{ slewing === null ? 'N/A' : (slewing ? 'Yes' : 'No') }}</span></div>
            <div><span class="label">At Home:</span> <span class="value">{{ atHome === null ? 'N/A' : (atHome ? 'Yes' : 'No') }}</span></div>
            <div><span class="label">At Park:</span> <span class="value">{{ atPark === null ? 'N/A' : (atPark ? 'Yes' : 'No') }}</span></div>
          </div>
        </div>

        <div class="panel-section">
          <h3>Position</h3>
           <div class="status-grid">
            <div><span class="label">Altitude:</span> <span class="value">{{ altitude === null ? 'N/A' : altitude.toFixed(2) + '°' }}</span></div>
            <div><span class="label">Azimuth:</span> <span class="value">{{ azimuth === null ? 'N/A' : azimuth.toFixed(2) + '°' }}</span></div>
          </div>
        </div>

        <div class="panel-section">
          <h3>Controls</h3>
          <div class="control-buttons">
            <button class="action-button" :disabled="slewing === true || shutterStatus === 0 || shutterStatus === 2" @click="openShutter">Open Shutter</button>
            <button class="action-button" :disabled="slewing === true || shutterStatus === 1 || shutterStatus === 3" @click="closeShutter">Close Shutter</button>
            <button class="action-button" :disabled="slewing === true" @click="parkDome">Park Dome</button>
            <button class="action-button" :disabled="slewing === true" @click="findHomeDome">Find Home</button>
            <button class="stop-button" :disabled="slewing !== true" @click="abortSlewDome">Abort Slew</button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { callAlpacaMethod, getAlpacaProperties } from '@/utils/alpacaPropertyAccess'
// import type { Device } from '@/stores/types/device-store.types' // Not directly used, currentDevice is typed by store

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

// Dome state refs
const altitude = ref<number | null>(null)
const azimuth = ref<number | null>(null)
const atHome = ref<boolean | null>(null)
const atPark = ref<boolean | null>(null)
const shutterStatus = ref<number | null>(null) // 0=Open, 1=Closed, 2=Opening, 3=Closing, 4=Error
const slewing = ref<boolean | null>(null)

const shutterStatusText = computed(() => {
  if (shutterStatus.value === null) return 'Unknown'
  switch (shutterStatus.value) {
    case 0: return 'Open'
    case 1: return 'Closed'
    case 2: return 'Opening'
    case 3: return 'Closing'
    case 4: return 'Error'
    default: return 'Invalid Status'
  }
})

const resetDomeState = () => {
  altitude.value = null
  azimuth.value = null
  atHome.value = null
  atPark.value = null
  shutterStatus.value = null
  slewing.value = null
}

// Alpaca actions
const openShutter = async () => {
  if (!props.deviceId) return
  try {
    await callAlpacaMethod(props.deviceId, 'openShutter')
    updateDomeStatus() // Refresh status after action
  } catch (error) {
    console.error('Error opening shutter:', error)
  }
}

const closeShutter = async () => {
  if (!props.deviceId) return
  try {
    await callAlpacaMethod(props.deviceId, 'closeShutter')
    updateDomeStatus() // Refresh status after action
  } catch (error) {
    console.error('Error closing shutter:', error)
  }
}

const parkDome = async () => {
  if (!props.deviceId) return
  try {
    await callAlpacaMethod(props.deviceId, 'parkDome') 
    updateDomeStatus() // Refresh status after action
  } catch (error) {
    console.error('Error parking dome:', error)
  }
}

const findHomeDome = async () => {
  if (!props.deviceId) return
  try {
    await callAlpacaMethod(props.deviceId, 'findHomeDome') 
    updateDomeStatus() // Refresh status after action
  } catch (error) {
    console.error('Error finding home for dome:', error)
  }
}

const abortSlewDome = async () => {
  if (!props.deviceId) return
  try {
    await callAlpacaMethod(props.deviceId, 'abortSlewDome') 
    updateDomeStatus() // Refresh status after action
  } catch (error) {
    console.error('Error aborting dome slew:', error)
  }
}

let statusTimer: number | undefined

const updateDomeStatus = async () => {
  if (!props.isConnected || !props.deviceId) return

  try {
    const properties = await getAlpacaProperties(props.deviceId, [
      'altitude',
      'azimuth',
      'athome',
      'atpark',
      'shutterstatus',
      'slewing'
    ])

    altitude.value = properties.altitude as number ?? null
    azimuth.value = properties.azimuth as number ?? null
    atHome.value = properties.athome as boolean ?? null
    atPark.value = properties.atpark as boolean ?? null
    shutterStatus.value = properties.shutterstatus as number ?? null
    slewing.value = properties.slewing as boolean ?? null
  } catch (error) {
    console.error('Error updating dome status:', error)
    // resetDomeState() // Avoid resetting on every poll error, could flash UI
  }
}

onMounted(() => {
  if (props.isConnected && props.deviceId) {
    updateDomeStatus()
    if (!statusTimer) {
      statusTimer = window.setInterval(updateDomeStatus, 2000) // Poll every 2 seconds
    }
  } else {
    if (statusTimer) {
      window.clearInterval(statusTimer)
      statusTimer = undefined
    }
  }
})

watch(() => props.isConnected, (newIsConnected) => {
  if (newIsConnected && props.deviceId) {
    resetDomeState() // Reset state on new connection or device change
    updateDomeStatus()
    if (!statusTimer) {
      statusTimer = window.setInterval(updateDomeStatus, 2000)
    }
  } else {
    if (statusTimer) {
      window.clearInterval(statusTimer)
      statusTimer = undefined
    }
    resetDomeState()
  }
})

watch(() => props.deviceId, (newDeviceId, oldDeviceId) => {
  if (newDeviceId !== oldDeviceId) {
    resetDomeState()
    if (props.isConnected) {
      updateDomeStatus()
      if (!statusTimer) {
        statusTimer = window.setInterval(updateDomeStatus, 2000)
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
/* Using styles similar to SimplifiedFocuserPanel and SimplifiedTelescopePanel */
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
  padding: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs)); /* Added padding to content area */
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

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--aw-spacing-sm);
}

.status-grid > div {
  display: flex;
  justify-content: space-between;
  align-items: center; /* Vertically align items */
}

.label {
  color: var(--aw-text-secondary-color);
  font-size: 0.9rem;
}

.value {
  font-size: 0.9rem;
  font-weight: var(--aw-font-weight-medium);
  text-align: right;
}

.control-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--aw-spacing-sm);
}

.action-button, .stop-button {
  flex-grow: 1;
  min-width: 120px; /* Ensure buttons have a minimum width */
  background-color: var(--aw-primary-color);
  color: var(--aw-button-primary-text);
  border: none;
  border-radius: var(--aw-border-radius-sm);
  padding: calc(var(--aw-spacing-xs) * 1.5) calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
  cursor: pointer;
  font-weight: var(--aw-font-weight-medium);
  text-align: center;
}

.action-button:hover {
  background-color: var(--aw-primary-hover-color);
}

.action-button:disabled {
  background-color: var(--aw-color-neutral-300);
  cursor: not-allowed;
  opacity: 0.7;
}

.stop-button {
  background-color: var(--aw-error-color);
  color: var(--aw-button-danger-text);
}

.stop-button:hover {
  background-color: var(--aw-button-danger-hover-bg);
}

.stop-button:disabled {
  background-color: var(--aw-color-neutral-300);
  cursor: not-allowed;
  opacity: 0.7;
}

</style> 