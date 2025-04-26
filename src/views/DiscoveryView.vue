<script setup lang="ts">
import { ref } from 'vue'
import EnhancedDiscoveryPanel from '../components/ui-examples/EnhancedDiscoveryPanel.vue'

defineOptions({
  name: 'DiscoveryView'
})

// Define interfaces
interface Server {
  id: string
  address: string
  port: number
  name: string
  manufacturer: string
  location: string
  version: string
  isOnline: boolean
  isManualEntry: boolean
  lastSeen: Date
}

interface DiscoveredDevice {
  id: string
  name: string
  type: string
  number: number
  server: Server
  isAdded: boolean
  capabilities: string[]
}

interface ServerData {
  address: string
  port: number
  name: string
  isSecure: boolean
}

// Sample data for the discovery panel
const servers = ref<Server[]>([
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

const discoveredDevices = ref<DiscoveredDevice[]>([
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

// Event handlers
const handleDiscover = () => {
  isDiscovering.value = true
  // Simulate discovery
  setTimeout(() => {
    isDiscovering.value = false
    lastDiscoveryTime.value = new Date()
  }, 2000)
}

const handleConnectDevice = (device: DiscoveredDevice) => {
  console.log(`Connecting to device: ${device.name}`)
  device.isAdded = true
}

const handleAddServer = (serverData: ServerData) => {
  const newServer: Server = {
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
  <div class="discovery-view">
    <div class="discovery-container">
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
  </div>
</template>

<style scoped>
.discovery-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  padding: 20px;
}

.discovery-container {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}
</style>
