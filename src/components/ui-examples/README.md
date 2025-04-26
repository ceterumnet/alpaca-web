# AlpacaWeb UI Enhancement Components

This directory contains improved UI components that can be implemented separately from the existing codebase. These components provide enhanced user experience, better visual organization, and improved interactions.

## Components Overview

### 1. EnhancedSidebar.vue

A completely redesigned sidebar that offers:

- Collapsible interface with compact view when collapsed
- Device filtering and search functionality
- Group devices by location
- Multiple view options (list/grid)
- Visual indicators for connection states
- Actions menu for common device operations
- Favorite device functionality
- Better visual hierarchy

### 2. EnhancedDiscoveryPanel.vue

A reimagined device discovery panel with:

- Tabbed interface for devices and servers
- Detailed device cards with better information hierarchy
- Connection dialog with capability display
- Server management with status indicators
- Manual server addition form
- Responsive grid layouts
- Improved empty states
- Device type summaries and statistics

### 3. DeviceTypeIcon.vue

A reusable component for displaying device type icons with:

- Support for different sizes
- Consistent visual language
- Type-based icon selection

### 4. icons.ts

A utility module that provides SVG icon components:

- Implements standard icons using Vue's render functions
- Consistent styling across the application
- Supports custom sizing and coloring

## How to Use These Components

These components are designed to be used independently from your existing codebase. To implement them:

1. Copy the components to your project
2. Update imports as needed for your project structure
3. Use the components in your application

### Using EnhancedSidebar

```vue
<script setup>
import EnhancedSidebar from './components/ui-examples/EnhancedSidebar.vue'
import { ref } from 'vue'

// Sample data - replace with your actual data source
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
  }
  // More devices...
])

const isDarkMode = ref(true)

// Event handlers
const handleToggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
}

const handleToggleDevice = (device) => {
  // Your connection logic here
  device.connecting = true
  // Simulate connection
  setTimeout(() => {
    device.connected = !device.connected
    device.connecting = false
  }, 1000)
}

const handleDeviceAction = ({ device, action }) => {
  // Handle various device actions
  console.log(`Action ${action} on device ${device.name}`)

  if (action === 'toggleFavorite') {
    device.favorite = !device.favorite
  }
}
</script>

<template>
  <EnhancedSidebar
    :devices="devices"
    :is-dark-mode="isDarkMode"
    @toggle-theme="handleToggleTheme"
    @toggle-device="handleToggleDevice"
    @device-action="handleDeviceAction"
  />
</template>
```

### Using EnhancedDiscoveryPanel

```vue
<script setup>
import EnhancedDiscoveryPanel from './components/ui-examples/EnhancedDiscoveryPanel.vue'
import { ref } from 'vue'

// Sample data - replace with your actual data sources
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
  }
  // More servers...
])

const devices = ref([
  {
    id: '1',
    name: 'CCD Camera',
    type: 'camera',
    number: 0,
    server: servers.value[0],
    isAdded: false,
    capabilities: ['Cooling', 'ReadMode', 'Gain Control']
  }
  // More devices...
])

const isDiscovering = ref(false)
const lastDiscoveryTime = ref(new Date())

// Event handlers
const handleDiscover = () => {
  isDiscovering.value = true
  // Your discovery logic here
  setTimeout(() => {
    isDiscovering.value = false
    lastDiscoveryTime.value = new Date()
  }, 2000)
}

const handleConnectDevice = (device) => {
  // Your device connection logic
  console.log(`Connecting to device: ${device.name}`)
  device.isAdded = true
}

const handleAddServer = (serverData) => {
  // Logic to add a manual server
  const newServer = {
    id: Date.now().toString(),
    address: serverData.address,
    port: serverData.port,
    name: serverData.name,
    manufacturer: '',
    location: '',
    version: '',
    isOnline: false,
    isManualEntry: true,
    lastSeen: new Date()
  }

  servers.value.push(newServer)
}
</script>

<template>
  <EnhancedDiscoveryPanel
    :servers="servers"
    :devices="devices"
    :is-discovering="isDiscovering"
    :last-discovery-time="lastDiscoveryTime"
    @discover="handleDiscover"
    @connect-device="handleConnectDevice"
    @add-server="handleAddServer"
  />
</template>
```

## Integration with Existing Code

To integrate these components with your existing codebase:

1. Update the data models to match your current data structures
2. Connect the event handlers to your existing logic
3. Ensure your CSS variables match those used in the components
4. Update any external dependencies and imports

## Customization

These components use CSS variables for styling, making them adaptable to your theme. They use the same variable naming convention (`--aw-*`) as your existing codebase.

Key variables used:

- `--aw-panel-bg-color`
- `--aw-panel-content-color`
- `--aw-panel-border-color`
- `--aw-panel-resize-bg-color`
- `--aw-panel-resize-color`
- `--aw-panel-menu-bar-bg-color`
- `--aw-panel-menu-bar-color`
- `--aw-form-bg-color`
- `--aw-input-bg-color`

## Browser Compatibility

These components are designed to work in modern browsers that support CSS Grid, Flexbox, and CSS Variables.
