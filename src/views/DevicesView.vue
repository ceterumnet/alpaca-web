<script setup lang="ts">
import { useRouter } from 'vue-router'
import EnhancedSidebar from '@/components/layout/EnhancedSidebar.vue'
import { useUIPreferencesStore } from '@/stores/useUIPreferencesStore'
import { useLegacyDeviceStore } from '@/stores/deviceStoreAdapter'
import { type Device } from '@/stores/useAstroDeviceStore'

defineOptions({
  name: 'DevicesView'
})

// Get stores and router
const uiStore = useUIPreferencesStore()
const deviceStore = useLegacyDeviceStore()
const router = useRouter()

// Event handlers
const handleToggleTheme = () => {
  uiStore.isDarkMode = !uiStore.isDarkMode
}

const handleToggleDevice = (device: Device) => {
  deviceStore.toggleDeviceConnection(device.id)
}

const handleDeviceAction = ({ device, action }: { device: Device; action: string }) => {
  console.log(`Action ${action} on device ${device.name}`)

  if (action === 'toggleFavorite') {
    deviceStore.toggleFavorite(device.id)
  } else if (action === 'discover') {
    // Navigate to discovery view
    router.push('/discovery')
  }
}

// Navigate to device detail view
const navigateToDeviceDetail = (deviceId: string) => {
  router.push(`/devices/${deviceId}`)
}
</script>

<template>
  <div class="devices-view">
    <div class="devices-sidebar">
      <EnhancedSidebar
        :devices="deviceStore.devices"
        :is-dark-mode="uiStore.isDarkMode"
        @toggle-theme="handleToggleTheme"
        @toggle-device="handleToggleDevice"
        @device-action="handleDeviceAction"
        @toggle-sidebar="(isExpanded: boolean) => console.log('Sidebar toggled:', isExpanded)"
      />
    </div>
    <div class="devices-content">
      <div class="content-header">
        <h1>Device Management</h1>
      </div>
      <div class="content-body">
        <p>Select a device from the sidebar to control it.</p>
        <p v-if="deviceStore.devices.length === 0" class="no-devices-message">
          No devices available. Go to the <a @click="router.push('/discovery')">Discovery</a> page
          to add devices.
        </p>
        <div v-else>
          <div class="device-stats">
            <div class="stat-item">
              <span class="stat-label">Total Devices:</span>
              <span class="stat-value">{{ deviceStore.devices.length }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Connected:</span>
              <span class="stat-value">{{
                deviceStore.devices.filter((d) => d.connected).length
              }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Favorite:</span>
              <span class="stat-value">{{
                deviceStore.devices.filter((d) => d.favorite).length
              }}</span>
            </div>
          </div>

          <div class="device-grid">
            <div
              v-for="device in deviceStore.devices"
              :key="device.id"
              class="device-card"
              @click="navigateToDeviceDetail(device.id)"
            >
              <div class="device-icon" :class="device.type"></div>
              <div class="device-info">
                <h3>{{ device.name }}</h3>
                <div class="device-meta">
                  <span class="device-type">{{ device.type }}</span>
                  <span class="device-location">{{ device.location }}</span>
                </div>
                <div class="device-status" :class="{ connected: device.connected }">
                  {{ device.connected ? 'Connected' : 'Disconnected' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.devices-view {
  display: flex;
  height: 100%;
  width: 100%;
  overflow: hidden;
  padding: 0;
}

.devices-sidebar {
  flex: 0 0 auto;
  height: 100vh; /* Make sidebar full height */
}

.devices-content {
  flex: 1;
  padding: 20px;
  overflow: auto;
}

.content-header {
  margin-bottom: 20px;
}

.content-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--aw-panel-content-color);
}

.content-body {
  background-color: var(--aw-panel-bg-color);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.no-devices-message {
  margin-top: 20px;
  font-style: italic;
}

.no-devices-message a {
  color: var(--aw-panel-resize-bg-color);
  cursor: pointer;
  text-decoration: underline;
}

.device-stats {
  display: flex;
  margin-top: 20px;
  gap: 20px;
  flex-wrap: wrap;
}

.stat-item {
  background-color: var(--aw-panel-content-bg-color);
  padding: 10px 15px;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-label {
  font-weight: bold;
  margin-right: 8px;
}

.stat-value {
  font-weight: 600;
  color: var(--aw-panel-resize-bg-color);
}

.device-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.device-card {
  display: flex;
  padding: 16px;
  background-color: var(--aw-panel-content-bg-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.device-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-color: var(--aw-panel-resize-bg-color);
}

.device-icon {
  width: 40px;
  height: 40px;
  margin-right: 16px;
  background-color: var(--aw-panel-menu-bar-bg-color);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: var(--aw-panel-menu-bar-color);
}

.device-icon.telescope::after {
  content: '🔭';
}

.device-icon.camera::after {
  content: '📷';
}

.device-icon.focuser::after {
  content: '🔍';
}

.device-icon.filterwheel::after {
  content: '🎡';
}

.device-info {
  flex: 1;
  overflow: hidden;
}

.device-info h3 {
  margin: 0 0 8px 0;
  color: var(--aw-panel-content-color);
  font-size: 1.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.device-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 0.9rem;
  color: var(--aw-panel-content-color);
  opacity: 0.7;
}

.device-type {
  text-transform: capitalize;
}

.device-status {
  font-size: 0.85rem;
  font-weight: 600;
  color: #f44336;
}

.device-status.connected {
  color: #4caf50;
}
</style>
