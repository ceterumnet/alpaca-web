<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useDiscoveredDevicesStore } from '@/stores/useDiscoveredDevicesStore'
import { useDevicesStore } from '@/stores/useDevicesStore'
import axios from 'axios'
import { DeviceFactory } from '@/types/Device'
import { Telescope } from '@/types/Telescope'
import { Camera } from '@/types/Camera'
import type { DiscoveredDevice } from '@/types/DiscoveredDevice'
import ManualDeviceConfig from './ManualDeviceConfig.vue'

const discoveredDevicesStore = useDiscoveredDevicesStore()
const devicesStore = useDevicesStore()

const isLoading = ref(false)
const selectedDeviceIndex = ref<number | null>(null)
const discoveredAlpacaDevices = ref<any[]>([])

// Track the last refresh time to avoid duplicate refreshes
const lastRefreshTime = ref<Date | null>(null)

// Format the discovery time
function formatDiscoveryTime(timeString: string): string {
  const date = new Date(timeString)
  return date.toLocaleTimeString()
}

// Check if a device is already added to the devices store
function isDeviceAdded(alpacaDevice: any) {
  // We consider a device added if any device in the store has the same API base URL
  return devicesStore.devices.some((device) => {
    const deviceWithApiUrl = device as any
    return deviceWithApiUrl.apiBaseUrl === alpacaDevice.apiBaseUrl
  })
}

// Computed property to filter out already added devices
const availableDevices = computed(() => {
  return discoveredAlpacaDevices.value.filter((device) => !isDeviceAdded(device))
})

// Refresh the list of discovered Alpaca devices
async function refreshDiscoveredDevicesList() {
  console.log('Starting device list refresh')
  discoveredAlpacaDevices.value = []
  isLoading.value = true

  try {
    // Create a Set to track unique device identifiers
    const deviceSet = new Set()

    // Process each discovered server
    for (const server of discoveredDevicesStore.sortedDevices) {
      const proxyUrl = discoveredDevicesStore.getProxyUrl(server)
      console.log(`Fetching devices from ${server.address}:${server.port}`)

      try {
        // Get the list of configured devices from this Alpaca server
        const response = await axios.get(`${proxyUrl}/management/v1/configureddevices`)
        const configuredDevices = response.data.Value
        console.log(
          `Found ${configuredDevices.length} configured devices at ${server.address}:${server.port}`
        )

        // Process each configured device
        for (const configDevice of configuredDevices) {
          const deviceType = configDevice.DeviceType
          const deviceNumber = configDevice.DeviceNumber

          // Only process supported device types
          const deviceTypeLower = deviceType.toLowerCase()
          if (deviceTypeLower !== 'telescope' && deviceTypeLower !== 'camera') {
            continue
          }

          // Create a unique identifier for this device
          const deviceId = `${server.address}:${server.port}:${deviceTypeLower}:${deviceNumber}`

          // Skip if we've already processed this device
          if (deviceSet.has(deviceId)) {
            console.log(`Skipping duplicate device: ${deviceId}`)
            continue
          }
          deviceSet.add(deviceId)

          // Add this device to our discovery list
          discoveredAlpacaDevices.value.push({
            serverAddress: server.address,
            serverPort: server.port,
            serverName: server.ServerName || 'Unknown Server',
            manufacturer: server.Manufacturer || 'Unknown',
            deviceType: deviceTypeLower,
            deviceNumber: deviceNumber,
            deviceName: `${deviceType} ${deviceNumber}`,
            apiBaseUrl: `${proxyUrl}/api/v1/${deviceTypeLower}/${deviceNumber}`,
            isManualEntry: server.isManualEntry
          })
          console.log(
            `Added device: ${deviceType} ${deviceNumber} from ${server.address}:${server.port}`
          )
        }
      } catch (error) {
        console.error(`Error fetching devices from ${server.address}:${server.port}:`, error)
      }
    }
    console.log(`Refresh complete, found ${discoveredAlpacaDevices.value.length} unique devices`)
  } finally {
    isLoading.value = false
  }
}

// Connect to a specific device
async function connectToDevice(index: number) {
  isLoading.value = true
  selectedDeviceIndex.value = index
  const alpacaDevice = discoveredAlpacaDevices.value[index]

  try {
    // Create appropriate device instance based on type
    let newDevice: any = null

    switch (alpacaDevice.deviceType) {
      case 'telescope':
        newDevice = DeviceFactory.createDevice(Telescope)
        newDevice.idx = alpacaDevice.deviceNumber
        break
      case 'camera':
        newDevice = DeviceFactory.createDevice(Camera)
        newDevice.idx = alpacaDevice.deviceNumber
        break
    }

    if (newDevice) {
      // Set the device's API URL
      newDevice.apiBaseUrl = alpacaDevice.apiBaseUrl

      // Check if device is connected
      try {
        const stateResponse = await axios.get(`${newDevice.apiBaseUrl}/connected`)
        newDevice.connected = stateResponse.data.Value
      } catch (error) {
        console.error(`Error checking connection state:`, error)
        newDevice.connected = false
      }

      // Add the device in our store if it doesn't already exist
      const deviceExists = devicesStore.devices.some((existingDevice) => {
        const existingDeviceWithApi = existingDevice as any
        return existingDeviceWithApi.apiBaseUrl === newDevice.apiBaseUrl
      })

      if (!deviceExists) {
        devicesStore.devices.push(newDevice)
        console.log('Device added to panels:', newDevice)
      }
    }
  } catch (error) {
    console.error('Error connecting to device:', error)
  } finally {
    isLoading.value = false
    selectedDeviceIndex.value = null
  }
}

// Run discovery when the component is mounted
onMounted(() => {
  // Just trigger discovery, the watch will handle the refresh
  discoveredDevicesStore.discoverDevices()
})

// When devices are re-discovered, refresh our detailed device list
watch(
  () => discoveredDevicesStore.lastDiscoveryTime,
  (newTime, oldTime) => {
    // Only refresh if the discovery time has changed and we haven't refreshed recently
    if (
      newTime &&
      (!lastRefreshTime.value || newTime.getTime() > lastRefreshTime.value.getTime() + 1000)
    ) {
      console.log('Discovery time changed, refreshing device list', {
        newTime: newTime?.toISOString(),
        oldTime: oldTime?.toISOString(),
        lastRefresh: lastRefreshTime.value?.toISOString()
      })
      lastRefreshTime.value = new Date()
      refreshDiscoveredDevicesList()
    } else if (newTime) {
      console.log('Skipping duplicate refresh', {
        newTime: newTime?.toISOString(),
        oldTime: oldTime?.toISOString(),
        lastRefresh: lastRefreshTime.value?.toISOString()
      })
    }
  },
  { immediate: false }
)
</script>

<template>
  <div class="discovered-devices">
    <div class="header">
      <div class="header-left">
        <h2>Discovered Devices</h2>
        <div v-if="discoveredDevicesStore.lastDiscoveryTime" class="last-scan">
          Last scan: {{ discoveredDevicesStore.lastDiscoveryTime.toLocaleTimeString() }}
        </div>
      </div>
      <button
        @click="discoveredDevicesStore.discoverDevices()"
        :disabled="discoveredDevicesStore.isDiscovering || isLoading"
        class="discover-btn"
      >
        <span class="btn-icon">
          <svg
            v-if="discoveredDevicesStore.isDiscovering || isLoading"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="currentColor"
            class="spin"
          >
            <path
              d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"
              opacity=".5"
            />
            <path d="M20 12h2A10 10 0 0 0 12 2v2a8 8 0 0 1 8 8z" />
          </svg>
          <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm6 9h-5V6h-2v5H6v2h5v5h2v-5h5z" />
          </svg>
        </span>
        <span>{{
          discoveredDevicesStore.isDiscovering || isLoading ? 'Scanning...' : 'Discover'
        }}</span>
      </button>
    </div>

    <div v-if="discoveredDevicesStore.isDiscovering || isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">
        {{ isLoading ? 'Loading device details...' : 'Searching for devices...' }}
      </div>
    </div>

    <div v-else-if="discoveredAlpacaDevices.length === 0" class="empty-state">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" opacity="0.5">
        <path
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
        />
      </svg>
      <p>No Alpaca devices found</p>
      <button @click="discoveredDevicesStore.discoverDevices()" class="retry-btn">Try Again</button>
    </div>

    <div v-else-if="availableDevices.length === 0" class="empty-state">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" opacity="0.5">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
      </svg>
      <p>All discovered devices have been added</p>
    </div>

    <div v-else class="devices-grid">
      <div
        v-for="device in availableDevices"
        :key="`${device.apiBaseUrl}`"
        class="device-card"
        :class="{ 'manual-entry': device.isManualEntry }"
      >
        <div class="device-icon">
          <svg v-if="device.deviceType === 'telescope'" viewBox="0 0 24 24" width="24" height="24">
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"
              fill="currentColor"
            />
          </svg>
          <svg
            v-else-if="device.deviceType === 'camera'"
            viewBox="0 0 24 24"
            width="24"
            height="24"
          >
            <path
              d="M9 3L7.17 5H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2h-3.17L15 3H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"
              fill="currentColor"
            />
            <path
              d="M12 17c1.65 0 3-1.35 3-3s-1.35-3-3-3-3 1.35-3 3 1.35 3 3 3z"
              fill="currentColor"
            />
          </svg>
        </div>

        <div class="device-info">
          <div class="device-name">
            {{ device.deviceName }}
            <span v-if="device.isManualEntry" class="manual-badge">Manual</span>
          </div>
          <div class="device-details">
            <div class="manufacturer">{{ device.manufacturer }}</div>
            <div class="server-info">{{ device.serverName }}</div>
            <div class="address-info">{{ device.serverAddress }}:{{ device.serverPort }}</div>
          </div>
        </div>

        <button
          @click="connectToDevice(discoveredAlpacaDevices.indexOf(device))"
          :disabled="selectedDeviceIndex === discoveredAlpacaDevices.indexOf(device)"
          class="connect-btn"
        >
          <span v-if="selectedDeviceIndex === discoveredAlpacaDevices.indexOf(device)">
            Connecting...
          </span>
          <span v-else>Add Device</span>
        </button>
      </div>
    </div>

    <ManualDeviceConfig />
  </div>
</template>

<style scoped>
.discovered-devices {
  position: relative;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  flex-direction: column;
}

.header h2 {
  margin: 0 0 4px 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--aw-panel-content-color);
}

.last-scan {
  font-size: 0.8rem;
  color: var(--aw-panel-content-color);
  opacity: 0.7;
}

.discover-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.discover-btn:hover:not(:disabled) {
  background-color: var(--aw-panel-resize-bg-color);
  transform: translateY(-1px);
}

.discover-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.spin {
  animation: spin 1.5s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top-color: var(--aw-panel-resize-color);
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.loading-text {
  color: var(--aw-panel-content-color);
  opacity: 0.8;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: var(--aw-panel-content-color);
  opacity: 0.8;
}

.empty-state p {
  margin: 16px 0;
}

.retry-btn {
  padding: 8px 16px;
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 8px;
}

.retry-btn:hover {
  background-color: var(--aw-panel-resize-bg-color);
}

.devices-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.device-card {
  display: flex;
  flex-direction: column;
  background-color: var(--aw-panel-content-bg-color);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--aw-panel-border-color);
  transition: all 0.2s ease;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.device-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.device-card.manual-entry {
  border-left: 3px solid var(--aw-panel-resize-color);
}

.device-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
  margin: 0 auto 16px;
}

.device-info {
  flex: 1;
  margin-bottom: 16px;
  text-align: center;
}

.device-name {
  font-weight: 600;
  font-size: 1.1rem;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.manual-badge {
  font-size: 0.7rem;
  background-color: var(--aw-panel-resize-color);
  color: var(--aw-panel-content-bg-color);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.device-details {
  font-size: 0.85rem;
  color: var(--aw-panel-content-color);
  opacity: 0.8;
  line-height: 1.4;
}

.manufacturer {
  font-weight: 500;
  margin-bottom: 2px;
}

.server-info,
.address-info {
  margin-bottom: 2px;
}

.connect-btn {
  padding: 8px 16px;
  background-color: var(--aw-panel-resize-bg-color);
  color: var(--aw-panel-resize-color);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  width: 100%;
}

.connect-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.connect-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
