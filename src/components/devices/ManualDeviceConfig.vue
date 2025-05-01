// Status: Enhanced - Navigation Integration // This component handles manual device configuration,
now integrated with: // - Event emission for connected devices // - Improved error handling // - UI
styling consistent with the new design system

<script setup lang="ts">
import { ref } from 'vue'
import { useDiscoveredDevicesStore } from '@/stores/useDiscoveredDevicesStore'
import { useUnifiedStore } from '@/stores/UnifiedStore'

// Define emits
const emit = defineEmits<{
  'device-connected': [deviceName: string]
  'connection-error': [deviceName: string, error: string]
}>()

// We still need useDiscoveredDevicesStore for discovery capabilities
const discoveredDevicesStore = useDiscoveredDevicesStore()
// Get the UnifiedStore instance
const unifiedStore = useUnifiedStore()

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

  const deviceName = `${deviceAddress.value}:${devicePort.value}`

  try {
    // First, verify the device using the discovery store
    const manualDevice = await discoveredDevicesStore.addManualDevice(
      deviceAddress.value,
      devicePort.value
    )

    // Get the configured devices from this server using the store
    const configuredDevices = await discoveredDevicesStore.getConfiguredDevices(manualDevice)

    // Check if any devices were found
    if (!configuredDevices || configuredDevices.length === 0) {
      throw new Error('No compatible devices found on this server')
    }

    let connectedDevice: string | null = null

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
      const fullDeviceName = `${configDevice.DeviceType} ${deviceNumber}`

      // Create device object for UnifiedStore
      const device = {
        id: deviceId,
        name: fullDeviceName,
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
          apiBaseUrl: `${discoveredDevicesStore.getProxyUrl(manualDevice)}/api/v1/${deviceType}/${deviceNumber}`
        }
      }

      // Add device to UnifiedStore
      const added = unifiedStore.addDevice(device)

      if (added && !connectedDevice) {
        // Try to connect to the first successful device
        try {
          await unifiedStore.connectDevice(deviceId)
          connectedDevice = fullDeviceName
        } catch (connectionError) {
          console.error(`Failed to connect to ${fullDeviceName}:`, connectionError)
        }
      }
    }

    // Reset form after successful addition
    deviceAddress.value = 'localhost'
    devicePort.value = 11111
    showForm.value = false

    // Emit success if a device was connected
    if (connectedDevice) {
      emit('device-connected', connectedDevice)
    } else {
      emit('connection-error', deviceName, 'Devices added but could not connect automatically')
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to add device'
    errorMessage.value = errorMsg
    emit('connection-error', deviceName, errorMsg)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="manual-device-config" data-testid="manual-device-config">
    <div class="header">
      <button class="toggle-btn" aria-label="Toggle manual device form" @click="toggleForm">
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
          aria-label="Device IP address or hostname"
        />
      </div>

      <div class="form-group">
        <label for="devicePort">Alpaca Management Port:</label>
        <input
          id="devicePort"
          v-model="devicePort"
          type="number"
          min="1"
          max="65535"
          aria-label="Device management port number"
        />
      </div>

      <div v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</div>

      <button
        :disabled="isSubmitting"
        class="add-btn"
        aria-label="Add device with manual configuration"
        @click="addManualDevice"
      >
        <span v-if="isSubmitting" class="loading-icon"></span>
        {{ isSubmitting ? 'Adding...' : 'Add Device' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.manual-device-config {
  margin-top: var(--spacing-md);
}

.header {
  display: flex;
  justify-content: flex-end;
}

.toggle-btn {
  font-size: var(--font-size-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: transparent;
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--border-radius-sm);
  color: var(--aw-text-color);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.toggle-btn:hover {
  background-color: var(--aw-panel-menu-bar-bg-color);
}

.config-form {
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  background-color: var(--aw-form-bg-color);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--aw-panel-border-color);
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-group label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--aw-text-secondary-color);
}

.form-group input {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--border-radius-sm);
  background-color: var(--aw-input-bg-color, #fff);
  color: var(--aw-text-color);
  font-size: var(--font-size-base);
}

.error-message {
  color: var(--aw-error-color, #e53935);
  margin-bottom: var(--spacing-md);
  font-size: var(--font-size-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--aw-error-bg-color, rgba(229, 57, 53, 0.1));
  border-radius: var(--border-radius-sm);
}

.add-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--aw-primary-color, #4a89dc);
  color: white;
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
  transition: all 0.2s ease;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-xs);
}

.add-btn:hover:not(:disabled) {
  background-color: var(--aw-primary-hover-color, #3a69bc);
}

.add-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-icon {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
