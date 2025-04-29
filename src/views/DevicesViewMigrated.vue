<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppSidebarMigrated from '../components/AppSidebarMigrated.vue'
import MainPanelsMigrated from '../components/MainPanelsMigrated.vue'
import { useUIPreferencesStore } from '../stores/useUIPreferencesStore'
import { useUnifiedStore } from '../stores/UnifiedStore'
import type { UnifiedDevice } from '../types/DeviceTypes'
import { ref, onMounted } from 'vue'

defineOptions({
  name: 'DevicesViewMigrated'
})

// Get stores and router
const uiStore = useUIPreferencesStore()
const store = useUnifiedStore()
const router = useRouter()
const isLoading = ref(true)

// Initialize component
onMounted(() => {
  // Simulate loading time or actual data fetching
  setTimeout(() => {
    isLoading.value = false
  }, 500)
})

// Event handlers
const handleToggleTheme = () => {
  uiStore.isDarkMode = !uiStore.isDarkMode
}

const handleToggleDevice = (device: UnifiedDevice) => {
  if (device.isConnected) {
    store.disconnectDevice(device.id)
  } else {
    store.connectDevice(device.id)
  }
}

const handleDeviceAction = ({ device, action }: { device: UnifiedDevice; action: string }) => {
  console.log(`Action ${action} on device ${device.name}`)

  if (action === 'toggleFavorite') {
    store.updateDevice(device.id, {
      properties: {
        ...device.properties,
        isFavorite: !device.properties?.isFavorite
      }
    })
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
      <AppSidebarMigrated
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

        <div v-if="isLoading" class="loading-indicator">
          <span>Loading devices...</span>
        </div>

        <template v-else-if="store.devicesList.length === 0">
          <p class="no-devices-message">
            No devices available. Go to the <a @click="router.push('/discovery')">Discovery</a> page
            to add devices.
          </p>
        </template>

        <div v-else>
          <div class="device-stats">
            <div class="stat-item">
              <span class="stat-label">Total Devices:</span>
              <span class="stat-value">{{ store.devicesList.length }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Connected:</span>
              <span class="stat-value">{{
                store.devicesList.filter((d) => d.isConnected).length
              }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Favorite:</span>
              <span class="stat-value">{{
                store.devicesList.filter((d) => d.properties && d.properties.isFavorite).length
              }}</span>
            </div>
          </div>

          <div class="device-grid">
            <div
              v-for="device in store.devicesList"
              :key="device.id"
              class="device-card"
              @click="navigateToDeviceDetail(device.id)"
            >
              <div class="device-icon" :class="device.type"></div>
              <div class="device-info">
                <h3>{{ device.name }}</h3>
                <div class="device-meta">
                  <span class="device-type">{{ device.type || 'Unknown' }}</span>
                  <span class="device-location">{{
                    device.properties && device.properties.location
                      ? device.properties.location
                      : 'Unknown'
                  }}</span>
                </div>
                <div class="device-status" :class="{ connected: device.isConnected }">
                  {{ device.isConnected ? 'Connected' : 'Disconnected' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <MainPanelsMigrated />
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
  border-color: var(--aw-panel-resize-bg-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.device-icon {
  width: 60px;
  height: 60px;
  background-color: var(--aw-panel-menu-bar-bg-color);
  border-radius: 50%;
  margin-right: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.device-icon.telescope::before {
  content: '🔭';
  font-size: 24px;
}

.device-icon.camera::before {
  content: '📷';
  font-size: 24px;
}

.device-icon.focuser::before {
  content: '🎯';
  font-size: 24px;
}

.device-icon.filterwheel::before {
  content: '🎨';
  font-size: 24px;
}

.device-icon.other::before {
  content: '🔧';
  font-size: 24px;
}

.device-info {
  flex: 1;
}

.device-info h3 {
  margin: 0 0 4px 0;
  font-size: 1.1rem;
  color: var(--aw-panel-content-color);
}

.device-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.device-type {
  text-transform: capitalize;
  color: var(--aw-panel-content-subtle-color);
}

.device-location {
  color: var(--aw-panel-content-subtle-color);
}

.device-status {
  font-size: 0.85rem;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: rgba(255, 0, 0, 0.1);
  color: #e53935;
  display: inline-block;
}

.device-status.connected {
  background-color: rgba(76, 175, 80, 0.1);
  color: #4caf50;
}

.loading-indicator {
  display: flex;
  justify-content: center;
  padding: 20px;
  font-style: italic;
  color: var(--aw-panel-content-subtle-color);
}
</style>
