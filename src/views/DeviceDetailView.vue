// Status: Good - Core View 
// This is the device detail view that: 
// - Shows detailed device information 
// - Provides device-specific controls 
// - Handles device configuration 
// - Supports device monitoring 
// - Maintains device state display

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { UIMode } from '@/stores/useUIPreferencesStore'

// Import the responsive panel components
import ResponsiveCameraPanel from '@/components/devices/ResponsiveCameraPanel.vue'
import ResponsiveTelescopePanel from '@/components/devices/ResponsiveTelescopePanel.vue'
import ResponsiveFocuserPanel from '@/components/devices/ResponsiveFocuserPanel.vue'
import EnhancedPanelComponent from '@/components/ui/EnhancedPanelComponent.vue'

defineOptions({
  name: 'DeviceDetailView'
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
      // @ts-expect-error - TypeScript error with store implementation, but works at runtime
      await store.disconnectDevice(device.value.id)
    } else {
      // @ts-expect-error - TypeScript error with store implementation, but works at runtime
      await store.connectDevice(device.value.id)
    }
  } catch (error) {
    console.error('Error toggling device connection:', error)
  } finally {
    isConnectionChanging.value = false
  }
}

// Panel configuration for backward compatibility
const panelConfig = ref({
  panelName: computed(() => device.value?.name || 'Device'),
  deviceId: computed(() => device.value?.id || ''),
  deviceType: computed(() => device.value?.type || ''),
  connected: computed(() => device.value?.isConnected || false),
  supportedModes: [UIMode.OVERVIEW, UIMode.DETAILED]
})
</script>

<template>
  <div class="aw-device-detail">
    <div class="aw-device-detail__header">
      <button class="aw-device-detail__back-button" @click="goBack">← Back to Devices</button>
      <h1>{{ device?.name || 'Device Not Found' }}</h1>
    </div>

    <div v-if="device" class="aw-device-detail__content">
      <div class="aw-device-detail__info">
        <div class="aw-device-detail__info-item">
          <span class="aw-device-detail__info-label">Type:</span>
          <span class="aw-device-detail__info-value">{{ device.type }}</span>
        </div>
        <div class="aw-device-detail__info-item">
          <span class="aw-device-detail__info-label">ID:</span>
          <span class="aw-device-detail__info-value">{{ device.id }}</span>
        </div>
        <div class="aw-device-detail__info-item">
          <span class="aw-device-detail__info-label">Connection:</span>
          <span class="aw-device-detail__info-value">{{ device.apiBaseUrl || 'Not configured' }}</span>
        </div>
        <div class="aw-device-detail__info-item">
          <span class="aw-device-detail__info-label">Status:</span>
          <span 
            class="aw-device-detail__info-value" 
            :class="device.isConnected ? 'aw-device-detail__info-value--connected' : 'aw-device-detail__info-value--disconnected'"
          >
            {{ device.isConnected ? 'Connected' : 'Disconnected' }}
          </span>
        </div>
      </div>

      <div class="aw-device-detail__actions">
        <button
          class="aw-device-detail__action-button"
          :class="{
            'aw-device-detail__action-button--connect': !device.isConnected,
            'aw-device-detail__action-button--disconnect': device.isConnected,
            'aw-device-detail__action-button--loading': isConnectionChanging
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

      <!-- Device control panel - use responsive panels -->
      <div v-if="device.isConnected" class="aw-device-detail__panel-container">
        <!-- Choose the appropriate panel based on device type -->
        <ResponsiveCameraPanel
          v-if="device.type === 'camera'"
          :device-id="device.id"
          :title="device.name"
        />
        <ResponsiveTelescopePanel
          v-else-if="device.type === 'telescope'"
          :device-id="device.id"
          :title="device.name"
        />
        <ResponsiveFocuserPanel
          v-else-if="device.type === 'focuser'"
          :device-id="device.id"
          :title="device.name"
        />
        <!-- Legacy fallback for device types without responsive panels -->
        <EnhancedPanelComponent
          v-else
          :panel-name="panelConfig.panelName"
          :device-id="panelConfig.deviceId"
          :device-type="panelConfig.deviceType"
          :connected="panelConfig.connected"
          :supported-modes="panelConfig.supportedModes"
        />
      </div>

      <!-- Show placeholder when not connected -->
      <div v-else class="aw-device-detail__placeholder">
        <p>Connect to the device to access controls.</p>
      </div>
    </div>

    <div v-else class="aw-device-detail__not-found">
      <p>The requested device could not be found.</p>
      <button class="aw-device-detail__action-button" @click="goBack">Go Back</button>
    </div>
  </div>
</template>

<style scoped>
.aw-device-detail {
  padding: var(--aw-spacing-lg, 20px);
  max-width: 1200px;
  margin: 0 auto;
}

.aw-device-detail__header {
  display: flex;
  align-items: center;
  margin-bottom: var(--aw-spacing-lg, 20px);
  gap: var(--aw-spacing-md, 16px);
}

.aw-device-detail__header h1 {
  margin: 0;
  font-size: 1.8rem;
  color: var(--aw-panel-content-color);
}

.aw-device-detail__back-button {
  padding: var(--aw-spacing-sm, 8px) var(--aw-spacing-md, 16px);
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-sm, 4px);
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.aw-device-detail__back-button:hover {
  background-color: var(--aw-panel-resize-bg-color);
}

.aw-device-detail__content,
.aw-device-detail__not-found {
  background-color: var(--aw-panel-bg-color);
  padding: var(--aw-spacing-lg, 20px);
  border-radius: var(--aw-border-radius-md, 8px);
  box-shadow: var(--aw-shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.1));
}

.aw-device-detail__info {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--aw-spacing-md, 16px);
  margin-bottom: var(--aw-spacing-lg, 24px);
}

.aw-device-detail__info-item {
  display: flex;
  flex-direction: column;
  padding: var(--aw-spacing-sm, 10px);
  background-color: var(--aw-panel-content-bg-color);
  border-radius: var(--aw-border-radius-sm, 6px);
}

.aw-device-detail__info-label {
  font-size: 0.9rem;
  opacity: 0.7;
  margin-bottom: 4px;
  color: var(--aw-text-secondary-color);
}

.aw-device-detail__info-value {
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--aw-text-color);
}

.aw-device-detail__info-value--connected {
  color: var(--aw-success-color);
}

.aw-device-detail__info-value--disconnected {
  color: var(--aw-error-color);
}

.aw-device-detail__actions {
  margin-bottom: var(--aw-spacing-lg, 24px);
}

.aw-device-detail__action-button {
  padding: var(--aw-spacing-sm, 10px) var(--aw-spacing-lg, 20px);
  font-size: 1rem;
  border-radius: var(--aw-border-radius-sm, 4px);
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.aw-device-detail__action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.aw-device-detail__action-button--loading {
  opacity: 0.8;
  cursor: wait;
}

.aw-device-detail__action-button--connect {
  background-color: var(--aw-success-color);
  color: white;
}

.aw-device-detail__action-button--disconnect {
  background-color: var(--aw-error-color);
  color: white;
}

.aw-device-detail__action-button--connect:hover:not(:disabled) {
  background-color: var(--aw-button-success-hover-bg, #43a047);
}

.aw-device-detail__action-button--disconnect:hover:not(:disabled) {
  background-color: var(--aw-button-danger-hover-bg, #e53935);
}

.aw-device-detail__panel-container {
  margin-top: var(--aw-spacing-lg, 24px);
  background-color: var(--aw-panel-content-bg-color);
  border-radius: var(--aw-border-radius-sm, 6px);
  overflow: hidden;
}

.aw-device-detail__placeholder {
  background-color: var(--aw-panel-content-bg-color);
  padding: 40px;
  border-radius: var(--aw-border-radius-sm, 6px);
  text-align: center;
  margin-top: var(--aw-spacing-lg, 24px);
  border: 2px dashed var(--aw-panel-border-color);
}

.aw-device-detail__not-found {
  text-align: center;
  padding: 40px;
}
</style>
