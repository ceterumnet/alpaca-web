<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import EnhancedSidebar from '../components/ui-examples/EnhancedSidebar.vue'
import { useUIPreferencesStore } from '../stores/useUIPreferencesStore'

defineOptions({
  name: 'DevicesView'
})

// Get UI store and router
const uiStore = useUIPreferencesStore()
const router = useRouter()

// Define proper interfaces
interface Device {
  id: string
  name: string
  type: string
  location: string
  server: string
  connected: boolean
  connecting: boolean
  hasError: boolean
  favorite: boolean
}

// Sample data for the devices
const devices = ref<Device[]>([
  {
    id: '1',
    name: 'Main Telescope',
    type: 'telescope',
    location: 'Observatory',
    server: 'Main Server',
    connected: true,
    connecting: false,
    hasError: false,
    favorite: true
  },
  {
    id: '2',
    name: 'CCD Camera',
    type: 'camera',
    location: 'Observatory',
    server: 'Main Server',
    connected: false,
    connecting: false,
    hasError: false,
    favorite: false
  },
  {
    id: '3',
    name: 'Secondary Telescope',
    type: 'telescope',
    location: 'Home Setup',
    server: 'Home Server',
    connected: false,
    connecting: false,
    hasError: true,
    favorite: false
  },
  {
    id: '4',
    name: 'Auto Focuser',
    type: 'focuser',
    location: 'Home Setup',
    server: 'Home Server',
    connected: false,
    connecting: false,
    hasError: false,
    favorite: false
  },
  {
    id: '5',
    name: 'Filter Wheel',
    type: 'filterwheel',
    location: 'Observatory',
    server: 'Main Server',
    connected: true,
    connecting: false,
    hasError: false,
    favorite: true
  }
])

// Event handlers
const handleToggleTheme = () => {
  uiStore.isDarkMode = !uiStore.isDarkMode
}

const handleToggleDevice = (device: Device) => {
  // Simulate connection
  device.connecting = true
  setTimeout(() => {
    device.connected = !device.connected
    device.connecting = false
  }, 1000)
}

const handleDeviceAction = ({ device, action }: { device: Device; action: string }) => {
  console.log(`Action ${action} on device ${device.name}`)

  if (action === 'toggleFavorite') {
    device.favorite = !device.favorite
  } else if (action === 'discover') {
    // Navigate to discovery view
    router.push('/discovery')
  }
}
</script>

<template>
  <div class="devices-view">
    <div class="devices-sidebar">
      <EnhancedSidebar
        :devices="devices"
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
}

.devices-sidebar {
  flex: 0 0 auto;
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
</style>
