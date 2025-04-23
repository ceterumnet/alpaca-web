<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useDiscoveredDevicesStore } from '@/stores/useDiscoveredDevicesStore'
import { useDevicesStore } from '@/stores/useDevicesStore'
import axios from 'axios'
import { DeviceFactory } from '@/types/Device'
import { Telescope } from '@/types/Telescope'
import { Camera } from '@/types/Camera'
import ManualDeviceConfig from './ManualDeviceConfig.vue'

const discoveredDevicesStore = useDiscoveredDevicesStore()
const devicesStore = useDevicesStore()

const isLoading = ref(false)
const selectedDeviceIndex = ref<number | null>(null)

// Format the discovery time
function formatDiscoveryTime(timeString: string): string {
  const date = new Date(timeString)
  return date.toLocaleTimeString()
}

// Connect to a discovered device
async function connectToDevice(index: number) {
  isLoading.value = true
  selectedDeviceIndex.value = index
  const device = discoveredDevicesStore.sortedDevices[index]

  try {
    // Use the proxy URL to avoid CORS issues
    const proxyUrl = discoveredDevicesStore.getProxyUrl(device)

    // Get the list of configured devices from this Alpaca server
    const response = await axios.get(`${proxyUrl}/management/v1/configureddevices`)
    const configuredDevices = response.data.Value

    // Process each configured device
    for (const configDevice of configuredDevices) {
      const deviceType = configDevice.DeviceType
      const deviceNumber = configDevice.DeviceNumber

      // Create appropriate device instance based on type
      let newDevice: any = null

      // Convert deviceType to lowercase for case-insensitive comparison
      const deviceTypeLower = deviceType.toLowerCase()

      switch (deviceTypeLower) {
        case 'telescope':
          newDevice = DeviceFactory.createDevice(Telescope)
          newDevice.idx = deviceNumber
          break
        case 'camera':
          newDevice = DeviceFactory.createDevice(Camera)
          newDevice.idx = deviceNumber
          break
        default:
          console.warn(`Unsupported device type: ${deviceType}`)
          continue
      }

      if (newDevice) {
        // Set the device's API URL to use our proxy
        newDevice.apiBaseUrl = `${proxyUrl}/api/v1/${deviceTypeLower}/${deviceNumber}`

        // Check if device is connected
        try {
          const stateResponse = await axios.get(`${newDevice.apiBaseUrl}/connected`)
          newDevice.connected = stateResponse.data.Value
        } catch (error) {
          console.error(`Error checking connection state for ${deviceType} ${deviceNumber}:`, error)
          newDevice.connected = false
        }

        // Add or update the device in our store
        devicesStore.devices.push(newDevice)
      }
    }

    console.log('Devices loaded from discovery:', devicesStore.devices)
  } catch (error) {
    console.error('Error connecting to discovered device:', error)
  } finally {
    isLoading.value = false
    selectedDeviceIndex.value = null
  }
}

// Run discovery when the component is mounted
onMounted(() => {
  discoveredDevicesStore.discoverDevices()
})
</script>

<template>
  <div class="discovered-devices">
    <div class="header">
      <h2>Discovered Alpaca Devices</h2>
      <button
        @click="discoveredDevicesStore.discoverDevices()"
        :disabled="discoveredDevicesStore.isDiscovering"
        class="discover-btn"
      >
        {{ discoveredDevicesStore.isDiscovering ? 'Discovering...' : 'Discover Devices' }}
      </button>
    </div>

    <div v-if="discoveredDevicesStore.lastDiscoveryTime" class="last-scan">
      Last scan: {{ discoveredDevicesStore.lastDiscoveryTime.toLocaleTimeString() }}
    </div>

    <div v-if="discoveredDevicesStore.isDiscovering" class="loading">Searching for devices...</div>

    <div v-else-if="discoveredDevicesStore.devices.length === 0" class="no-devices">
      No Alpaca devices found
    </div>

    <div v-else class="devices-list">
      <div
        v-for="(device, index) in discoveredDevicesStore.sortedDevices"
        :key="`${device.address}:${device.port}`"
        class="device-item"
        :class="{ 'manual-entry': device.isManualEntry }"
      >
        <div class="device-info">
          <div class="device-name">
            {{ device.ServerName || 'Unknown Device' }}
            <span v-if="device.isManualEntry" class="manual-badge">Manual</span>
          </div>
          <div class="device-details">
            {{ device.Manufacturer || 'Unknown' }} - {{ device.address }}:{{ device.port }}
          </div>
        </div>

        <button
          @click="connectToDevice(index)"
          :disabled="isLoading && selectedDeviceIndex === index"
          class="connect-btn"
        >
          {{ isLoading && selectedDeviceIndex === index ? 'Connecting...' : 'Connect' }}
        </button>
      </div>
    </div>

    <!-- Manual device configuration component -->
    <ManualDeviceConfig />
  </div>
</template>

<style scoped>
.discovered-devices {
  background-color: var(--aw-panel-bg-color);
  border-radius: 4px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.header h2 {
  margin: 0;
  font-size: 1.2rem;
}

.last-scan {
  font-size: 0.8rem;
  color: #888;
  margin-bottom: 1rem;
}

.loading,
.no-devices {
  padding: 1rem;
  text-align: center;
  color: #888;
}

.devices-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.device-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: var(--aw-form-bg-color);
  color: var(--aw-text-color);
}

.device-item.manual-entry {
  border-color: var(--aw-panel-border-color);
  border-style: dashed;
}

.device-name {
  font-weight: bold;
  color: var(--aw-text-color);
  display: flex;
  align-items: center;
}

.manual-badge {
  font-size: 0.7rem;
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  margin-left: 0.5rem;
}

.device-details {
  font-size: 0.8rem;
  color: var(--aw-text-color-secondary, #888);
}

.discover-btn,
.connect-btn {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--aw-panel-border-color);
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--text-color);
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: bold;
}

.discover-btn:hover,
.connect-btn:hover {
  background-color: var(--aw-panel-menu-bar-color);
  color: var(--aw-panel-menu-bar-bg-color);
}

.discover-btn:disabled,
.connect-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
