<script setup lang="ts">
import { ref } from 'vue'
import { useDiscoveredDevicesStore } from '@/stores/useDiscoveredDevicesStore'
import UnifiedStore from '@/stores/UnifiedStore'
import axios from 'axios'

// We still need useDiscoveredDevicesStore for discovery capabilities
const discoveredDevicesStore = useDiscoveredDevicesStore()
// Get the UnifiedStore instance
const unifiedStore = new UnifiedStore()

const showForm = ref(false)
const deviceAddress = ref('localhost')
const devicePort = ref(11111)
const isSubmitting = ref(false)
const errorMessage = ref('')

function toggleForm() {
  showForm.value = !showForm.value
  errorMessage.value = ''
}

async function addManualDevice() {
  if (!deviceAddress.value || !devicePort.value) {
    errorMessage.value = 'Address and port are required'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    // First, verify the device using the discovery store
    const manualDevice = await discoveredDevicesStore.addManualDevice(
      deviceAddress.value,
      devicePort.value
    )
    const proxyUrl = discoveredDevicesStore.getProxyUrl(manualDevice)

    // Get the configured devices from this server
    const response = await axios.get(`${proxyUrl}/management/v1/configureddevices`)
    const configuredDevices = response.data.Value

    // Process each configured device and add to UnifiedStore
    for (const configDevice of configuredDevices) {
      const deviceType = configDevice.DeviceType.toLowerCase()
      const deviceNumber = configDevice.DeviceNumber

      // Only process supported device types
      if (deviceType !== 'telescope' && deviceType !== 'camera') {
        continue
      }

      // Create unique device ID
      const deviceId = `${deviceAddress.value}:${devicePort.value}:${deviceType}:${deviceNumber}`

      // Create device object for UnifiedStore
      const device = {
        id: deviceId,
        name: `${configDevice.DeviceType} ${deviceNumber}`,
        type: deviceType,
        ipAddress: deviceAddress.value,
        port: devicePort.value,
        isConnected: false,
        isConnecting: false,
        isDisconnecting: false,
        properties: {
          discoveryTime: new Date().toISOString(),
          alpacaPort: devicePort.value,
          serverName: manualDevice.ServerName || 'Manual Entry',
          manufacturer: manualDevice.Manufacturer || 'Unknown',
          location: manualDevice.Location,
          isManualEntry: true,
          deviceNumber: deviceNumber,
          apiBaseUrl: `${proxyUrl}/api/v1/${deviceType}/${deviceNumber}`
        }
      }

      // Add device to UnifiedStore
      unifiedStore.addDevice(device)
    }

    // Reset form after successful addition
    deviceAddress.value = 'localhost'
    devicePort.value = 11111
    showForm.value = false
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to add device'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="manual-device-config">
    <div class="header">
      <button class="toggle-btn" @click="toggleForm">
        {{ showForm ? 'Cancel' : 'Add Device Manually' }}
      </button>
    </div>

    <div v-if="showForm" class="config-form">
      <div class="form-group">
        <label for="deviceAddress">Alpaca Server Address:</label>
        <input
          id="deviceAddress"
          v-model="deviceAddress"
          type="text"
          placeholder="e.g., localhost or 192.168.1.100"
        />
      </div>

      <div class="form-group">
        <label for="devicePort">Alpaca Management Port:</label>
        <input id="devicePort" v-model="devicePort" type="number" min="1" max="65535" />
      </div>

      <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>

      <button :disabled="isSubmitting" class="add-btn" @click="addManualDevice">
        {{ isSubmitting ? 'Adding...' : 'Add Device' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.manual-device-config {
  margin-top: 1rem;
  border-top: 1px solid var(--aw-panel-border-color);
  padding-top: 1rem;
}

.header {
  display: flex;
  justify-content: flex-end;
}

.toggle-btn {
  font-size: 0.9rem;
  padding: 0.25rem 0.5rem;
  background-color: transparent;
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 4px;
  color: var(--aw-text-color);
  cursor: pointer;
}

.toggle-btn:hover {
  background-color: var(--aw-panel-menu-bar-bg-color);
}

.config-form {
  margin-top: 1rem;
  padding: 1rem;
  background-color: var(--aw-form-bg-color);
  border-radius: 4px;
  border: 1px solid var(--aw-panel-border-color);
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
}

.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 4px;
  background-color: var(--aw-input-bg-color, #fff);
  color: var(--aw-text-color);
}

.error-message {
  color: #e53935;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.add-btn {
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

.add-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.add-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
