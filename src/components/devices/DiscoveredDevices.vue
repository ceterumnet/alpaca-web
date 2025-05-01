// Status: Enhanced - Navigation Integration 
// This component handles device discovery and connection, now integrated with: 
// - Improved navigation system integration 
// - Proper event emission for connection status 
// - Better error handling and user feedback 
// - Responsive styling consistent with the new UI system
// - Optimized performance with state management 
// The core business logic still needs extraction into a dedicated service in a future update.

<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useDiscoveredDevicesStore } from '@/stores/useDiscoveredDevicesStore'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import axios from 'axios'
import ManualDeviceConfig from '@/components/devices/ManualDeviceConfig.vue'
import type { Device } from '@/stores/UnifiedStore'
import { debugLog } from '@/utils/debugUtils'

// Define emits
const emit = defineEmits<{
  'device-connected': [deviceName: string]
  'connection-error': [deviceName: string, error: string]
}>()

// Create/get UnifiedStore instance using Pinia
const unifiedStore = useUnifiedStore()
// Keep using the discovery store until it's also migrated
const discoveredDevicesStore = useDiscoveredDevicesStore()

const isLoading = ref(false)
const selectedDeviceIndex = ref<number | null>(null)
const discoveredAlpacaDevices = ref<Device[]>([])

// Track the last refresh time to avoid duplicate refreshes
const lastRefreshTime = ref<Date | null>(null)

// Check if a device is already added to the devices store
function isDeviceAdded(alpacaDevice: Device) {
  // We consider a device added if any device in the store matches ALL the following:
  // 1. Same API base URL, OR
  // 2. Same device type AND device number AND server address AND port
  return unifiedStore.devicesList.some((device) => {
    // Check if API URLs match (most reliable)
    const deviceApiUrl = device.properties?.apiBaseUrl as string | undefined
    const alpacaApiUrl = alpacaDevice.properties?.apiBaseUrl as string | undefined

    if (deviceApiUrl === alpacaApiUrl && deviceApiUrl) {
      return true
    }

    // If URLs don't match, check more detailed criteria
    const deviceTypeMatch = device.type === alpacaDevice.type
    const deviceNumMatch = device.properties?.deviceNumber === alpacaDevice.properties?.deviceNumber
    const serverAddressMatch = device.ipAddress === alpacaDevice.ipAddress
    const serverPortMatch = device.port === alpacaDevice.port

    // Device is considered the same only if ALL criteria match
    return deviceTypeMatch && deviceNumMatch && serverAddressMatch && serverPortMatch
  })
}

// Computed property to filter out already added devices
const availableDevices = computed(() => {
  return discoveredAlpacaDevices.value.filter((device) => !isDeviceAdded(device))
})

// Refresh the list of discovered Alpaca devices
async function refreshDiscoveredDevicesList() {
  debugLog('Starting device list refresh')
  discoveredAlpacaDevices.value = []
  isLoading.value = true

  try {
    // Create a Set to track unique device identifiers
    const deviceSet = new Set()

    // Process each discovered server
    for (const server of discoveredDevicesStore.sortedDevices) {
      const proxyUrl = discoveredDevicesStore.getProxyUrl(server)
      debugLog(`Fetching devices from ${server.address}:${server.port}`)

      // Fetch server description
      try {
        const descResponse = await axios.get(`${proxyUrl}/management/v1/description`)
        const descValue = descResponse.data.Value
        server.ServerName = descValue.ServerName
        server.Manufacturer = descValue.Manufacturer
        server.ManufacturerVersion = descValue.ManufacturerVersion
        server.Location = descValue.Location
        debugLog(`Fetched description for ${server.address}:${server.port}`)
      } catch (descError) {
        console.error(
          `Error fetching description from ${server.address}:${server.port}:`,
          descError
        )
      }

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
          const deviceId = `alpaca-${deviceTypeLower}-${deviceNumber}-${server.address.replace(/\./g, '_')}-${server.port}`

          // Skip if we've already processed this device
          if (deviceSet.has(deviceId)) {
            console.log(`Skipping duplicate device: ${deviceId}`)
            continue
          }
          deviceSet.add(deviceId)

          // Add this device to our discovery list
          discoveredAlpacaDevices.value.push({
            id: deviceId,
            name: `${deviceType} ${deviceNumber}`,
            type: deviceTypeLower,
            ipAddress: server.address,
            port: server.port,
            isConnected: false,
            isConnecting: false,
            isDisconnecting: false,
            status: 'idle',
            apiBaseUrl: `${proxyUrl}/api/v1/${deviceTypeLower}/${deviceNumber}`,
            properties: {
              discoveryTime: new Date().toISOString(),
              alpacaPort: server.AlpacaPort,
              serverName: server.ServerName || 'Unknown Server',
              manufacturer: server.Manufacturer || 'Unknown',
              manufacturerVersion: server.ManufacturerVersion,
              location: server.Location,
              isManualEntry: server.isManualEntry,
              deviceNumber: deviceNumber
            }
          })
          debugLog(
            `Added device: ${deviceType} ${deviceNumber} from ${server.address}:${server.port}`
          )
        }
      } catch (error) {
        console.error(`Error fetching devices from ${server.address}:${server.port}:`, error)
      }
    }
    debugLog(`Refresh complete, found ${discoveredAlpacaDevices.value.length} unique devices`)
  } finally {
    isLoading.value = false
  }
}

// Connect to a specific device
async function connectToDevice(index: number) {
  isLoading.value = true
  selectedDeviceIndex.value = index

  // Get the actual device from the filtered availableDevices list
  const alpacaDevice = availableDevices.value[index]
  const deviceName = alpacaDevice.name

  console.log('==== DEVICE CONNECTION DEBUG ====')
  console.log('Connecting to device:', {
    id: alpacaDevice.id,
    name: alpacaDevice.name,
    type: alpacaDevice.type,
    lowerType: alpacaDevice.type.toLowerCase(),
    apiBaseUrl: alpacaDevice.apiBaseUrl
  })
  console.log(
    'Current devicesList before add:',
    unifiedStore.devicesList.map((d) => ({
      id: d.id,
      type: d.type,
      lowerType: d.type.toLowerCase()
    }))
  )

  try {
    // Add device to the store directly
    console.log('About to add device with type:', alpacaDevice.type)
    const addResult = unifiedStore.addDevice(alpacaDevice)
    console.log('Device added to store result:', addResult)

    // Check current devices in store
    console.log(
      'Current devices in store after add:',
      unifiedStore.devicesList.map((d) => ({
        id: d.id,
        type: d.type,
        lowerType: d.type.toLowerCase()
      }))
    )

    // TODO: Review this and see if we need to connect to the device or make it a setting
    // Connect to device
    // await unifiedStore.connectDevice(alpacaDevice.id)
    // console.log(
    //   'Device connected, checking store again:',
    //   unifiedStore.devicesList.map((d) => ({
    //     id: d.id,
    //     type: d.type,
    //     lowerType: d.type.toLowerCase(),
    //     isConnected: d.isConnected
    //   }))
    // )

    // Log details about the store size
    console.log('------ Device Store Debug ------')
    console.log('Devices in store:', unifiedStore.devicesList.length)
    console.log('Devices map size:', unifiedStore.devices.size)
    console.log('Connected devices:', unifiedStore.devicesList.filter((d) => d.isConnected).length)
    console.log('==============================')

    debugLog('Device added and connected:', alpacaDevice)

    // Emit success event
    emit('device-connected', deviceName)
  } catch (error) {
    console.error('Error connecting to device:', error)

    // Emit error event
    let errorMessage = 'Unknown error occurred'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    }

    emit('connection-error', deviceName, errorMessage)
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
      debugLog('Discovery time changed, refreshing device list', {
        newTime: newTime?.toISOString(),
        oldTime: oldTime?.toISOString(),
        lastRefresh: lastRefreshTime.value?.toISOString()
      })
      lastRefreshTime.value = new Date()
      refreshDiscoveredDevicesList()
    } else if (newTime) {
      debugLog('Skipping duplicate refresh', {
        newTime: newTime?.toISOString(),
        oldTime: oldTime?.toISOString(),
        lastRefresh: lastRefreshTime.value?.toISOString()
      })
    }
  },
  { immediate: true }
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
        :disabled="discoveredDevicesStore.isDiscovering || isLoading"
        class="discover-btn"
        @click="discoveredDevicesStore.discoverDevices()"
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
            <path
              d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"
              opacity=".5"
            />
            <path d="M20 12h2A10 10 0 0 0 12 2v2a8 8 0 0 1 8 8z" />
          </svg>
        </span>
        {{ discoveredDevicesStore.isDiscovering ? 'Scanning...' : 'Scan for Devices' }}
      </button>
    </div>

    <div class="device-list">
      <div v-if="isLoading" class="loading-indicator">Loading devices...</div>

      <div v-else-if="availableDevices.length === 0" class="no-devices">
        <p v-if="discoveredAlpacaDevices.length === 0">
          No devices discovered. Click "Scan for Devices" to search the network.
        </p>
        <p v-else>All discovered devices have been added to the workspace.</p>
      </div>

      <div v-else class="device-grid">
        <div
          v-for="(device, index) in availableDevices"
          :key="device.id"
          class="device-card"
          :class="{ 'is-loading': selectedDeviceIndex === index }"
        >
          <div class="device-card-content">
            <div class="device-card-header">
              <div class="device-icon">
                <svg
                  v-if="device.type === 'telescope'"
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  fill="currentColor"
                >
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-12h2v6h-2zm0 8h2v2h-2z"
                  />
                </svg>
                <svg
                  v-else-if="device.type === 'camera'"
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  fill="currentColor"
                >
                  <path
                    d="M9 3L7.17 5H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2h-3.17L15 3H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"
                  />
                  <path
                    d="M12 17c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"
                    opacity=".5"
                  />
                </svg>
                <svg v-else viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
                  />
                </svg>
              </div>
              <div class="device-info">
                <h3 class="device-name">{{ device.name }}</h3>
                <div class="device-type">{{ device.type }}</div>
              </div>
            </div>

            <div class="device-details">
              <div class="detail-row">
                <span class="detail-label">Server:</span>
                <span class="detail-value">{{ device.properties?.serverName || 'Unknown' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Address:</span>
                <span class="detail-value">{{ device.ipAddress }}:{{ device.port }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Manufacturer:</span>
                <span class="detail-value">{{ device.properties?.manufacturer || 'Unknown' }}</span>
              </div>
            </div>

            <div class="device-actions">
              <button
                class="connect-btn"
                :disabled="selectedDeviceIndex !== null"
                @click="connectToDevice(index)"
              >
                <span v-if="selectedDeviceIndex === index">Connecting...</span>
                <span v-else>Add to Workspace</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="manual-section">
      <h3>Can't find your device?</h3>
      <ManualDeviceConfig />
    </div>
  </div>
</template>

<style scoped>
.discovered-devices {
  padding: 1rem;
  width: 100%;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.header-left {
  display: flex;
  flex-direction: column;
}

.header-left h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.last-scan {
  font-size: 0.8rem;
  color: var(--aw-text-secondary-color, #666);
}

.discover-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: var(--aw-button-primary-bg, #4a89dc);
  color: var(--aw-button-primary-text, white);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.discover-btn:hover {
  background-color: var(--aw-button-primary-hover-bg, #3a69bc);
}

.discover-btn:disabled {
  background-color: var(--aw-input-border-color, #ccc);
  cursor: not-allowed;
}

.btn-icon {
  display: flex;
  align-items: center;
}

.spin {
  animation: spin 1.5s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.device-list {
  margin-bottom: 1.5rem;
  background-color: var(--aw-bg-color);
  padding: 1rem;
  border-radius: 8px;
}

.loading-indicator,
.no-devices {
  text-align: center;
  padding: 2rem;
  background-color: var(--aw-panel-content-bg-color, #f9f9f9);
  border-radius: 8px;
  color: var(--aw-text-secondary-color, #666);
}

.device-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.device-card {
  background-color: var(--aw-form-bg-color, white);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: box-shadow 0.3s;
}

.device-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.device-card.is-loading {
  opacity: 0.7;
  pointer-events: none;
}

.device-card-content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.device-card-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.device-icon {
  background-color: var(--aw-panel-content-bg-color, #eef2fa);
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  color: var(--aw-primary-color, #4a89dc);
}

.device-info {
  flex: 1;
}

.device-name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--aw-text-color, inherit);
}

.device-type {
  font-size: 0.85rem;
  color: var(--aw-text-secondary-color, #666);
  text-transform: capitalize;
}

.device-details {
  flex: 1;
  margin-bottom: 1rem;
}

.detail-row {
  display: flex;
  margin-bottom: 0.4rem;
  font-size: 0.9rem;
}

.detail-label {
  width: 110px;
  color: var(--aw-text-secondary-color, #666);
}

.detail-value {
  flex: 1;
  word-break: break-word;
  color: var(--aw-text-color, inherit);
}

.device-actions {
  margin-top: auto;
}

.connect-btn {
  width: 100%;
  padding: 0.5rem;
  background-color: var(--aw-button-primary-bg, #4a89dc);
  color: var(--aw-button-primary-text, white);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.connect-btn:hover {
  background-color: var(--aw-button-primary-hover-bg, #3a69bc);
}

.connect-btn:disabled {
  background-color: var(--aw-input-border-color, #ccc);
  cursor: not-allowed;
}

.manual-section {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--aw-panel-border-color, #eee);
}

.manual-section h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.2rem;
  font-weight: 500;
}
</style>
