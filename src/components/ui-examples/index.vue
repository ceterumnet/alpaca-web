<script setup lang="ts">
import { ref } from 'vue'
import EnhancedSidebar from './EnhancedSidebar.vue'
import EnhancedDiscoveryPanel from './EnhancedDiscoveryPanel.vue'

// Sample data for the sidebar
const devices = ref([
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

const isDarkMode = ref(true)

// Sample data for the discovery panel
const servers = ref([
  {
    id: '1',
    address: '192.168.1.100',
    port: 11111,
    name: 'Main Observatory Server',
    manufacturer: 'Alpaca Systems',
    location: 'Observatory',
    version: '1.0.0',
    isOnline: true,
    isManualEntry: false,
    lastSeen: new Date()
  },
  {
    id: '2',
    address: '192.168.1.101',
    port: 11111,
    name: 'Home Setup Server',
    manufacturer: 'ASCOM Remote',
    location: 'Home Setup',
    version: '2.1.0',
    isOnline: true,
    isManualEntry: false,
    lastSeen: new Date()
  },
  {
    id: '3',
    address: '10.0.0.50',
    port: 8000,
    name: 'Remote Mount Server',
    manufacturer: 'AlpacaSwift',
    location: 'Remote Site',
    version: '1.5.2',
    isOnline: false,
    isManualEntry: true,
    lastSeen: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
  }
])

const discoveredDevices = ref([
  {
    id: '1',
    name: 'CCD Camera',
    type: 'camera',
    number: 0,
    server: servers.value[0],
    isAdded: true,
    capabilities: ['Cooling', 'ReadMode', 'Gain Control']
  },
  {
    id: '2',
    name: 'German Equatorial Mount',
    type: 'telescope',
    number: 0,
    server: servers.value[0],
    isAdded: true,
    capabilities: ['Tracking', 'Goto', 'PulseGuide']
  },
  {
    id: '3',
    name: 'CMOS Camera',
    type: 'camera',
    number: 1,
    server: servers.value[1],
    isAdded: false,
    capabilities: ['Cooling', 'ROI', 'BinningMode']
  },
  {
    id: '4',
    name: 'Alt-Az Mount',
    type: 'telescope',
    number: 0,
    server: servers.value[1],
    isAdded: false,
    capabilities: ['Tracking', 'Goto']
  },
  {
    id: '5',
    name: 'Motor Focuser',
    type: 'focuser',
    number: 0,
    server: servers.value[0],
    isAdded: false,
    capabilities: ['AbsolutePosition', 'Temperature']
  },
  {
    id: '6',
    name: 'Filter Wheel',
    type: 'filterwheel',
    number: 0,
    server: servers.value[0],
    isAdded: true,
    capabilities: ['8 Positions', 'NamedFilters']
  }
])

const isDiscovering = ref(false)
const lastDiscoveryTime = ref(new Date())
const activeComponent = ref('sidebar') // 'sidebar' or 'discovery'

// Event handlers
const handleToggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
}

const handleToggleDevice = (device: any) => {
  // Simulate connection
  device.connecting = true
  setTimeout(() => {
    device.connected = !device.connected
    device.connecting = false
  }, 1000)
}

const handleDeviceAction = ({ device, action }: { device: any; action: string }) => {
  console.log(`Action ${action} on device ${device.name}`)

  if (action === 'toggleFavorite') {
    device.favorite = !device.favorite
  } else if (action === 'discover') {
    activeComponent.value = 'discovery'
  }
}

const handleDiscover = () => {
  isDiscovering.value = true
  // Simulate discovery
  setTimeout(() => {
    isDiscovering.value = false
    lastDiscoveryTime.value = new Date()
  }, 2000)
}

const handleConnectDevice = (device: any) => {
  console.log(`Connecting to device: ${device.name}`)
  device.isAdded = true

  // Also add to the sidebar devices
  const matchingDevice = devices.value.find(
    (d) => d.type === device.type && (d.name.includes(device.type) || device.name.includes(d.type))
  )

  if (matchingDevice) {
    matchingDevice.connected = true
  }
}

const handleAddServer = (serverData: any) => {
  const newServer = {
    id: Date.now().toString(),
    address: serverData.address,
    port: serverData.port,
    name: serverData.name,
    manufacturer: '',
    location: 'Custom Location',
    version: '',
    isOnline: true,
    isManualEntry: true,
    lastSeen: new Date()
  }

  servers.value.push(newServer)
}
</script>

<template>
  <div class="ui-demo" :class="{ 'dark-theme': isDarkMode }">
    <header class="demo-header">
      <h1>AlpacaWeb UI Component Examples</h1>
      <div class="demo-controls">
        <button
          class="demo-button"
          :class="{ active: activeComponent === 'sidebar' }"
          @click="activeComponent = 'sidebar'"
        >
          Show Sidebar
        </button>
        <button
          class="demo-button"
          :class="{ active: activeComponent === 'discovery' }"
          @click="activeComponent = 'discovery'"
        >
          Show Discovery Panel
        </button>
        <button class="demo-button theme-toggle" @click="handleToggleTheme">
          {{ isDarkMode ? 'Light Theme' : 'Dark Theme' }}
        </button>
      </div>
    </header>

    <main class="demo-content">
      <div v-if="activeComponent === 'sidebar'" class="demo-layout with-sidebar">
        <EnhancedSidebar
          :devices="devices"
          :is-dark-mode="isDarkMode"
          @toggle-theme="handleToggleTheme"
          @toggle-device="handleToggleDevice"
          @device-action="handleDeviceAction"
          @toggle-sidebar="(isExpanded) => console.log('Sidebar toggled:', isExpanded)"
        />
        <div class="demo-main-area">
          <div class="demo-info">
            <h2>Enhanced Sidebar Component</h2>
            <p>
              This example shows the enhanced sidebar with various device types, connection states,
              and locations.
            </p>
            <ul class="feature-list">
              <li>Try toggling between list and grid views</li>
              <li>Filter devices by type or connection status</li>
              <li>Search for devices by name or location</li>
              <li>Toggle the favorite status of devices</li>
              <li>Collapse the sidebar using the button in the header</li>
              <li>Toggle the app theme using the button in the footer</li>
            </ul>
          </div>
        </div>
      </div>

      <div v-else-if="activeComponent === 'discovery'" class="demo-layout">
        <div class="demo-discovery-container">
          <EnhancedDiscoveryPanel
            :servers="servers"
            :devices="discoveredDevices"
            :is-discovering="isDiscovering"
            :last-discovery-time="lastDiscoveryTime"
            @discover="handleDiscover"
            @connect-device="handleConnectDevice"
            @add-server="handleAddServer"
          />
        </div>
        <div class="demo-info below">
          <h2>Enhanced Discovery Panel Component</h2>
          <p>
            This example shows the enhanced device discovery interface with various device types and
            servers.
          </p>
          <ul class="feature-list">
            <li>Try switching between the Devices and Servers tabs</li>
            <li>Click on a device to view its details and connect to it</li>
            <li>Click "Add Server" to see the manual server form</li>
            <li>Search for devices or servers</li>
            <li>Click "Discover Devices" to simulate a discovery scan</li>
          </ul>
        </div>
      </div>
    </main>
  </div>
</template>

<style>
:root {
  /* Light theme variables */
  --demo-bg-color: #f5f5f5;
  --demo-text-color: #333;
  --demo-panel-bg-color: #ffffff;
  --demo-highlight-color: #0066cc;
  --demo-border-color: #ddd;

  /* Default AlpacaWeb variables */
  --aw-bg-color: white;
  --aw-color: black;
  --aw-panel-bg-color: white;
  --aw-panel-menu-bar-color: white;
  --aw-panels-bg-color: white;
  --aw-panel-resize-bg-color: #93d4ff;
  --aw-panel-resize-color: white;
  --aw-panel-border-color: rgb(39, 39, 39);
  --aw-panel-menu-bar-bg-color: #6b6b6b;
  --aw-panel-content-bg-color: rgb(225, 225, 225);
  --aw-panel-content-color: rgb(2, 2, 2);
  --aw-text-color: rgb(2, 2, 2);
  --aw-form-bg-color: white;
  --aw-input-bg-color: white;
  --aw-panel-content-color-rgb: 2, 2, 2;
}

.dark-theme {
  /* Dark theme variables */
  --demo-bg-color: #121212;
  --demo-text-color: #e0e0e0;
  --demo-panel-bg-color: #1e1e1e;
  --demo-highlight-color: #4a9cf5;
  --demo-border-color: #333;

  /* Dark theme AlpacaWeb variables */
  --aw-bg-color: #1a0000;
  --aw-color: #ff9e9e;
  --aw-panel-bg-color: #2d0000;
  --aw-panels-bg-color: #220000;
  --aw-panel-resize-bg-color: #700000;
  --aw-panel-resize-color: #ff6b6b;
  --aw-panel-border-color: #5a0000;
  --aw-panel-menu-bar-color: #ffcaca;
  --aw-panel-menu-bar-bg-color: #4d0000;
  --aw-panel-content-bg-color: #2d0000;
  --aw-panel-content-color: #ffd5d5;
  --aw-panel-scrollbar-color-1: #8b0000;
  --aw-panel-scrollbar-color-2: #6b0000;
  --aw-text-color: #ffd5d5;
  --aw-form-bg-color: #2d0000;
  --aw-input-bg-color: #4d0000;
  --aw-panel-content-color-rgb: 255, 213, 213;
}

body {
  margin: 0;
  padding: 0;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    'Open Sans',
    'Helvetica Neue',
    sans-serif;
}

.ui-demo {
  min-height: 100vh;
  background-color: var(--demo-bg-color);
  color: var(--demo-text-color);
}

.demo-header {
  padding: 20px;
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.demo-header h1 {
  margin: 0 0 20px 0;
  font-size: 1.5rem;
  text-align: center;
}

.demo-controls {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.demo-button {
  padding: 8px 16px;
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--aw-panel-menu-bar-color);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.demo-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.demo-button.active {
  background-color: var(--aw-panel-resize-bg-color);
  color: var(--aw-panel-resize-color);
}

.demo-content {
  padding: 20px;
}

.demo-layout {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.demo-layout.with-sidebar {
  flex-direction: row;
}

.demo-main-area {
  flex: 1;
  padding: 20px;
  background-color: var(--demo-panel-bg-color);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--demo-border-color);
}

.demo-discovery-container {
  width: 100%;
}

.demo-info {
  padding: 20px;
  background-color: var(--demo-panel-bg-color);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--demo-border-color);
}

.demo-info.below {
  margin-top: 20px;
}

.demo-info h2 {
  margin-top: 0;
  color: var(--demo-highlight-color);
  font-size: 1.25rem;
}

.feature-list {
  list-style-type: none;
  padding: 0;
  margin: 16px 0 0 0;
}

.feature-list li {
  padding: 6px 0 6px 24px;
  position: relative;
}

.feature-list li::before {
  content: '→';
  position: absolute;
  left: 0;
  color: var(--demo-highlight-color);
}

@media (max-width: 960px) {
  .demo-layout.with-sidebar {
    flex-direction: column;
  }
}
</style>
