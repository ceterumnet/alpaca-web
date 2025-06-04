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
            <div>
              <span class="label">Shutter:</span> <span class="value">{{ shutterStatusText }}</span>
            </div>
            <div>
              <span class="label">Slewing:</span> <span class="value">{{ domeSlewing === null ? 'N/A' : domeSlewing ? 'Yes' : 'No' }}</span>
            </div>
            <div>
              <span class="label">At Home:</span> <span class="value">{{ domeAtHome === null ? 'N/A' : domeAtHome ? 'Yes' : 'No' }}</span>
            </div>
            <div>
              <span class="label">At Park:</span> <span class="value">{{ domeAtPark === null ? 'N/A' : domeAtPark ? 'Yes' : 'No' }}</span>
            </div>
          </div>
        </div>

        <div class="panel-section">
          <h3>Position</h3>
          <div class="status-grid">
            <div>
              <span class="label">Altitude:</span>
              <span class="value">{{ typeof domeAltitude === 'number' ? domeAltitude.toFixed(2) + '°' : 'N/A' }}</span>
            </div>
            <div>
              <span class="label">Azimuth:</span>
              <span class="value">{{ typeof domeAzimuth === 'number' ? domeAzimuth.toFixed(2) + '°' : 'N/A' }}</span>
            </div>
          </div>
        </div>

        <div class="panel-section">
          <h3>Controls</h3>
          <div class="control-buttons">
            <button class="action-button" :disabled="domeSlewing === true || domeShutterStatus === 0 || domeShutterStatus === 2" @click="openShutter">
              Open Shutter
            </button>
            <button
              class="action-button"
              :disabled="domeSlewing === true || domeShutterStatus === 1 || domeShutterStatus === 3"
              @click="closeShutter"
            >
              Close Shutter
            </button>
            <button class="action-button" :disabled="domeSlewing === true" @click="parkDome">Park Dome</button>
            <button class="action-button" :disabled="domeSlewing === true" @click="findHome">Find Home</button>
            <button class="stop-button" :disabled="domeSlewing !== true" @click="abortSlew">Abort Slew</button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'

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

// Computed properties to get dome state from store
const domeAltitude = computed(() => currentDevice.value?.properties?.altitude as number | null)
const domeAzimuth = computed(() => currentDevice.value?.properties?.azimuth as number | null)
const domeAtHome = computed(() => currentDevice.value?.properties?.atHome as boolean | null)
const domeAtPark = computed(() => currentDevice.value?.properties?.atPark as boolean | null)
const domeShutterStatus = computed(() => currentDevice.value?.properties?.shutterStatus as number | null)
const domeSlewing = computed(() => currentDevice.value?.properties?.slewing as boolean | null)

const shutterStatusText = computed(() => {
  if (domeShutterStatus.value === null) return 'Unknown'
  switch (domeShutterStatus.value) {
    case 0:
      return 'Open'
    case 1:
      return 'Closed'
    case 2:
      return 'Opening'
    case 3:
      return 'Closing'
    case 4:
      return 'Error'
    default:
      return 'Invalid Status'
  }
})

// Actions (dispatch to store)
const openShutter = () => store.openDomeShutter(props.deviceId)
const closeShutter = () => store.closeDomeShutter(props.deviceId)
const parkDome = () => store.parkDomeDevice(props.deviceId)
const findHome = () => store.findDomeHome(props.deviceId)
const abortSlew = () => store.abortDomeSlew(props.deviceId)

// Lifecycle hooks and watchers for store interaction
onMounted(() => {
  if (props.deviceId && props.isConnected) {
    // Initial fetch might be triggered by store's connect logic
    // store.fetchDomeStatus(props.deviceId); // Or ensure it happens on connect
  }
})

watch(
  () => props.isConnected,
  (newIsConnected) => {
    if (props.deviceId) {
      if (newIsConnected) {
        store.handleDomeConnected(props.deviceId) // Managed by core device connect logic
        store.fetchDomeStatus(props.deviceId) // Explicitly fetch on reconnect or first connect if panel loaded later
      } else {
        // store.handleDomeDisconnected(props.deviceId); // Managed by core device connect logic
      }
    }
  }
)

watch(
  () => props.deviceId,
  (newDeviceId) => {
    if (newDeviceId && props.isConnected) {
      // store.handleDomeConnected(newDeviceId); // Managed by core device connect logic
      store.fetchDomeStatus(newDeviceId)
    }
  },
  { immediate: true }
)

// onUnmounted: Polling is managed by the store.
</script>

<style scoped>
/* Styles remain the same */
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
  align-items: center;
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

.action-button,
.stop-button {
  flex-grow: 1;
  min-width: 120px;
  background-color: var(--aw-button-primary-bg);
  color: var(--aw-button-primary-text);
  border: none;
  border-radius: var(--aw-border-radius-sm);
  padding: calc(var(--aw-spacing-xs) * 1.5) calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
  cursor: pointer;
  font-weight: var(--aw-font-weight-medium);
  text-align: center;
}

.action-button:hover {
  background-color: var(--aw-button-primary-hover-bg);
}

.action-button:disabled {
  background-color: var(--aw-color-neutral-300);
  cursor: not-allowed;
  opacity: 0.7;
}

.stop-button {
  background-color: var(--aw-button-danger-bg);
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
