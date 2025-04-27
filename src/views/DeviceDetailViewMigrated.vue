<script setup lang="ts">
import { computed, ref, markRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUnifiedStore } from '../stores/UnifiedStore'
import { UIMode } from '../stores/useUIPreferencesStore'
import TelescopePanelMigrated from '../components/TelescopePanelMigrated.vue'
import CameraPanelMigrated from '../components/CameraPanelMigrated.vue'
import EnhancedPanelComponentMigrated from '../components/EnhancedPanelComponentMigrated.vue'

defineOptions({
  name: 'DeviceDetailViewMigrated'
})

const route = useRoute()
const router = useRouter()
const store = useUnifiedStore()

// Get device ID from route params
const deviceId = computed(() => route.params.id as string)

// Get the device from the store
const device = computed(() => store.getDeviceById(deviceId.value))

// Flag to track connection state changes
const isConnectionChanging = ref(false)

// Navigate back to devices view
const goBack = () => {
  router.push('/devices')
}

// Handle device connection toggle
const toggleConnection = async () => {
  if (!device.value) return

  isConnectionChanging.value = true

  try {
    if (device.value.isConnected) {
      await store.disconnectDevice(device.value.id)
    } else {
      await store.connectDevice(device.value.id)
    }
  } catch (error) {
    console.error('Error toggling device connection:', error)
  } finally {
    isConnectionChanging.value = false
  }
}

// Determine which panel component to show based on device type
const getPanelComponent = computed(() => {
  if (!device.value) return null

  switch (device.value.type) {
    case 'telescope':
      return markRaw(TelescopePanelMigrated)
    case 'camera':
      return markRaw(CameraPanelMigrated)
    default:
      return markRaw(EnhancedPanelComponentMigrated)
  }
})

// Panel configuration
const panelConfig = ref({
  panelName: computed(() => device.value?.name || 'Device'),
  deviceId: computed(() => device.value?.id || ''),
  deviceType: computed(() => device.value?.type || ''),
  connected: computed(() => device.value?.isConnected || false),
  supportedModes: [UIMode.OVERVIEW, UIMode.DETAILED]
})
</script>

<template>
  <div class="device-detail">
    <div class="detail-header">
      <button class="back-button" @click="goBack">← Back to Devices</button>
      <h1>{{ device?.name || 'Device Not Found' }}</h1>
    </div>

    <div v-if="device" class="detail-content">
      <div class="device-info">
        <div class="info-item">
          <span class="info-label">Type:</span>
          <span class="info-value">{{ device.type }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Location:</span>
          <span class="info-value">{{ device.location || 'Unknown' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Server:</span>
          <span class="info-value">{{ device.server || 'Unknown' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Status:</span>
          <span class="info-value" :class="device.isConnected ? 'connected' : 'disconnected'">
            {{ device.isConnected ? 'Connected' : 'Disconnected' }}
          </span>
        </div>
      </div>

      <div class="device-actions">
        <button
          class="action-button"
          :class="{
            'connect-button': !device.isConnected,
            'disconnect-button': device.isConnected,
            loading: isConnectionChanging
          }"
          :disabled="device.isConnecting || device.isDisconnecting || isConnectionChanging"
          @click="toggleConnection"
        >
          <span v-if="device.isConnecting || (isConnectionChanging && !device.isConnected)"
            >Connecting...</span
          >
          <span v-else-if="device.isDisconnecting || (isConnectionChanging && device.isConnected)"
            >Disconnecting...</span
          >
          <span v-else>{{ device.isConnected ? 'Disconnect' : 'Connect' }}</span>
        </button>
      </div>

      <!-- Device control panel -->
      <div v-if="device.isConnected" class="device-panel-container">
        <component
          :is="getPanelComponent"
          :panel-name="panelConfig.panelName"
          :device-id="panelConfig.deviceId"
          :device-type="panelConfig.deviceType"
          :connected="panelConfig.connected"
          :supported-modes="panelConfig.supportedModes"
        />
      </div>

      <!-- Show placeholder when not connected -->
      <div v-else class="detail-content-placeholder">
        <p>Connect to the device to access controls.</p>
      </div>
    </div>

    <div v-else class="not-found">
      <p>The requested device could not be found.</p>
      <button class="action-button" @click="goBack">Go Back</button>
    </div>
  </div>
</template>

<style scoped>
.device-detail {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.detail-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  gap: 16px;
}

.detail-header h1 {
  margin: 0;
  font-size: 1.8rem;
  color: var(--aw-panel-content-color);
}

.back-button {
  padding: 8px 16px;
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.back-button:hover {
  background-color: var(--aw-panel-resize-bg-color);
}

.detail-content,
.not-found {
  background-color: var(--aw-panel-bg-color);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.device-info {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.info-item {
  display: flex;
  flex-direction: column;
  padding: 10px;
  background-color: var(--aw-panel-content-bg-color);
  border-radius: 6px;
}

.info-label {
  font-size: 0.9rem;
  opacity: 0.7;
  margin-bottom: 4px;
}

.info-value {
  font-weight: 600;
  font-size: 1.1rem;
}

.info-value.connected {
  color: #4caf50;
}

.info-value.disconnected {
  color: #f44336;
}

.device-actions {
  margin-bottom: 24px;
}

.action-button {
  padding: 10px 20px;
  font-size: 1rem;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-button.loading {
  opacity: 0.8;
  cursor: wait;
}

.connect-button {
  background-color: #4caf50;
  color: white;
}

.disconnect-button {
  background-color: #f44336;
  color: white;
}

.connect-button:hover:not(:disabled) {
  background-color: #43a047;
}

.disconnect-button:hover:not(:disabled) {
  background-color: #e53935;
}

.device-panel-container {
  margin-top: 24px;
  background-color: var(--aw-panel-content-bg-color);
  border-radius: 6px;
  overflow: hidden;
}

.detail-content-placeholder {
  background-color: var(--aw-panel-content-bg-color);
  padding: 40px;
  border-radius: 6px;
  text-align: center;
  margin-top: 24px;
  border: 2px dashed var(--aw-panel-border-color);
}

.not-found {
  text-align: center;
  padding: 40px;
}
</style>
