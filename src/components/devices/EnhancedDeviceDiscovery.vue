<template>
  <div class="enhanced-device-discovery">
    <div class="discovery-header">
      <h2>Discover Devices</h2>
      <div class="header-controls">
        <button class="refresh-button" :disabled="isDiscovering" @click="refreshDevices">
          <span class="icon" :class="{ spin: isDiscovering }">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
          </span>
          {{ isDiscovering ? 'Discovering...' : 'Refresh' }}
        </button>
        <button class="manual-button" @click="showManualDialog = true">
          <span class="icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </span>
          Add Manual Device
        </button>
      </div>
    </div>

    <!-- Discovery status message -->
    <div v-if="error" class="error-message">
      <span class="icon">⚠️</span>
      <span>{{ error }}</span>
    </div>

    <!-- Discovery results -->
    <div v-if="sortedServers.length > 0" class="discovery-results">
      <div
        v-for="server in sortedServers"
        :key="server.id"
        class="server-card"
        :class="{ expanded: expandedServers.has(server.id) }"
      >
        <div class="server-header" @click="toggleServer(server.id)">
          <div class="server-info">
            <h3>{{ server.serverName || 'Unknown Server' }}</h3>
            <div class="server-address">{{ server.address }}:{{ server.port }}</div>
            <div v-if="server.manufacturer" class="server-details">
              {{ server.manufacturer }} {{ server.version || '' }}
            </div>
          </div>
          <div class="server-controls">
            <span class="device-count">
              {{ server.devices.length }} {{ server.devices.length === 1 ? 'device' : 'devices' }}
            </span>
            <span class="toggle-icon" :class="{ expanded: expandedServers.has(server.id) }">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </div>
        </div>

        <!-- Devices List -->
        <div v-if="expandedServers.has(server.id)" class="device-list">
          <div v-if="server.devices.length === 0" class="no-devices">
            No devices found on this server
          </div>

          <div
            v-for="device in server.devices"
            :key="device.id"
            class="device-card"
            :class="{
              'is-added': isDeviceAdded(server.id, device.id),
              'is-connecting': connectingDevices.has(device.id)
            }"
          >
            <div class="device-info">
              <div class="device-type">{{ formatDeviceType(device.type) }}</div>
              <div class="device-name">{{ device.name || `Device ${device.deviceNumber}` }}</div>
              <div class="device-id">ID: {{ device.deviceNumber }}</div>
            </div>
            <div class="device-controls">
              <button
                v-if="!isDeviceAdded(server.id, device.id)"
                :disabled="connectingDevices.has(device.id)"
                class="connect-button"
                @click="connectToDevice(server.id, device.id)"
              >
                <span v-if="connectingDevices.has(device.id)" class="connecting-spinner">
                  <svg
                    class="spin"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  </svg>
                </span>
                {{ connectingDevices.has(device.id) ? 'Connecting...' : 'Connect' }}
              </button>
              <div v-else class="already-connected"><span class="icon">✓</span> Connected</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!isDiscovering && !error" class="empty-state">
      <div class="empty-icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      </div>
      <h3>No devices found</h3>
      <p>Click Refresh to discover devices or add a device manually</p>
    </div>

    <!-- Loading state -->
    <div v-else-if="isDiscovering && !error" class="loading-state">
      <div class="loading-spinner">
        <svg
          class="spin"
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1"
        >
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
      </div>
      <h3>Discovering devices...</h3>
      <p>This may take a few moments</p>
    </div>

    <!-- Manual device dialog -->
    <div
      v-if="showManualDialog"
      class="manual-dialog-overlay"
      @click.self="showManualDialog = false"
    >
      <div class="manual-dialog">
        <div class="dialog-header">
          <h3>Add Manual Device</h3>
          <button class="close-button" @click="showManualDialog = false">×</button>
        </div>
        <div class="dialog-content">
          <div class="form-group">
            <label for="device-address">IP Address</label>
            <input
              id="device-address"
              v-model="manualDevice.address"
              type="text"
              placeholder="e.g. 192.168.1.100"
              :disabled="isAddingManual"
            />
          </div>
          <div class="form-group">
            <label for="device-port">Port</label>
            <input
              id="device-port"
              v-model.number="manualDevice.port"
              type="number"
              placeholder="e.g. 11111"
              :disabled="isAddingManual"
            />
          </div>
          <div class="form-group">
            <label for="device-name">Name (Optional)</label>
            <input
              id="device-name"
              v-model="manualDevice.name"
              type="text"
              placeholder="e.g. My Telescope"
              :disabled="isAddingManual"
            />
          </div>
          <div v-if="manualError" class="error-message">
            {{ manualError }}
          </div>
        </div>
        <div class="dialog-actions">
          <button
            class="cancel-button"
            :disabled="isAddingManual"
            @click="showManualDialog = false"
          >
            Cancel
          </button>
          <button
            class="add-button"
            :disabled="!canAddManual || isAddingManual"
            @click="addManualDevice"
          >
            <span v-if="isAddingManual" class="connecting-spinner">
              <svg
                class="spin"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
              </svg>
            </span>
            {{ isAddingManual ? 'Adding...' : 'Add Device' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useEnhancedDiscoveryStore } from '@/stores/useEnhancedDiscoveryStore'
import type { ManualDeviceParams } from '@/services/interfaces/DeviceDiscoveryInterface'

// Define emits
const emit = defineEmits<{
  'device-connected': [deviceName: string]
  'connection-error': [deviceName: string, error: string]
}>()

// Use the enhanced discovery store
const discoveryStore = useEnhancedDiscoveryStore()

// Local state
const expandedServers = ref(new Set<string>())
const connectingDevices = ref(new Set<string>())
const showManualDialog = ref(false)
const manualDevice = ref<ManualDeviceParams>({
  address: '',
  port: 11111,
  name: ''
})
const manualError = ref<string | null>(null)
const isAddingManual = ref(false)

// Computed properties
const sortedServers = computed(() => discoveryStore.sortedServers)
const isDiscovering = computed(() => discoveryStore.isDiscovering)
const error = computed(() => discoveryStore.error)
const canAddManual = computed(() => {
  return manualDevice.value.address.trim() !== '' && manualDevice.value.port > 0
})

// Initialize component
onMounted(() => {
  // Start discovery on mount
  refreshDevices()
})

// Toggle server expansion
function toggleServer(serverId: string) {
  if (expandedServers.value.has(serverId)) {
    expandedServers.value.delete(serverId)
  } else {
    expandedServers.value.add(serverId)
  }
}

// Refresh device list
async function refreshDevices() {
  try {
    await discoveryStore.discoverDevices()

    // Expand servers with available devices
    discoveryStore.servers.forEach((server) => {
      if (discoveryStore.serverHasAvailableDevices.get(server.id)) {
        expandedServers.value.add(server.id)
      }
    })
  } catch (err) {
    console.error('Error refreshing devices:', err)
  }
}

// Connect to a device
async function connectToDevice(serverId: string, deviceId: string) {
  connectingDevices.value.add(deviceId)

  try {
    await discoveryStore.connectToDevice(serverId, deviceId)

    // Find the device to get its name for the event
    const server = discoveryStore.servers.find((s) => s.id === serverId)
    const device = server?.devices.find((d) => d.id === deviceId)

    emit('device-connected', device?.name || 'Unknown device')
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    console.error('Error connecting to device:', error)

    // Find the device to get its name for the event
    const server = discoveryStore.servers.find((s) => s.id === serverId)
    const device = server?.devices.find((d) => d.id === deviceId)

    emit('connection-error', device?.name || 'Unknown device', error)
  } finally {
    connectingDevices.value.delete(deviceId)
  }
}

// Add a manual device
async function addManualDevice() {
  if (!canAddManual.value) return

  isAddingManual.value = true
  manualError.value = null

  try {
    const server = await discoveryStore.addManualDevice(manualDevice.value)

    // If successful, close dialog and expand the new server
    showManualDialog.value = false
    expandedServers.value.add(server.id)

    // Reset manual device form
    manualDevice.value = {
      address: '',
      port: 11111,
      name: ''
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to add device'
    manualError.value = errorMessage
    console.error('Error adding manual device:', errorMessage)
  } finally {
    isAddingManual.value = false
  }
}

// Check if a device is already added
function isDeviceAdded(serverId: string, deviceId: string): boolean {
  return discoveryStore.isDeviceAdded(serverId, deviceId)
}

// Format device type for display
function formatDeviceType(type: string): string {
  // Capitalize first letter
  return type.charAt(0).toUpperCase() + type.slice(1)
}
</script>

<style scoped>
.enhanced-device-discovery {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  height: 100%;
  overflow-y: auto;
}

.discovery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.header-controls {
  display: flex;
  gap: 0.5rem;
}

.refresh-button,
.manual-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  cursor: pointer;
  font-size: 0.9rem;
}

.refresh-button:hover,
.manual-button:hover {
  background: var(--color-background-mute);
}

.refresh-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.spin {
  animation: spin 1.5s linear infinite;
}

@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: rgba(220, 38, 38, 0.1);
  border: 1px solid rgba(220, 38, 38, 0.3);
  color: rgb(220, 38, 38);
  border-radius: 4px;
  margin-bottom: 1rem;
}

.discovery-results {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.server-card {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;
  background: var(--color-background-soft);
}

.server-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.server-header:hover {
  background: var(--color-background-mute);
}

.server-info h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
}

.server-address {
  color: var(--color-text-soft);
  font-size: 0.9rem;
}

.server-details {
  font-size: 0.8rem;
  color: var(--color-text-mute);
  margin-top: 0.25rem;
}

.server-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.device-count {
  font-size: 0.8rem;
  color: var(--color-text-soft);
}

.toggle-icon {
  transition: transform 0.2s;
}

.toggle-icon.expanded {
  transform: rotate(180deg);
}

.device-list {
  padding: 0.5rem 1rem;
  background: var(--color-background);
  border-top: 1px solid var(--color-border);
}

.no-devices {
  padding: 1rem;
  text-align: center;
  color: var(--color-text-soft);
  font-style: italic;
}

.device-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border-radius: 4px;
  margin: 0.5rem 0;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.device-card.is-added {
  background: rgba(22, 163, 74, 0.05);
  border-color: rgba(22, 163, 74, 0.3);
}

.device-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.device-type {
  font-weight: 500;
  font-size: 0.9rem;
}

.device-name {
  font-size: 1rem;
}

.device-id {
  font-size: 0.8rem;
  color: var(--color-text-mute);
}

.device-controls {
  display: flex;
  align-items: center;
}

.connect-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: none;
  background: var(--color-primary);
  color: white;
  cursor: pointer;
  font-size: 0.9rem;
}

.connect-button:hover {
  background: var(--color-primary-dark);
}

.connect-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.already-connected {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgb(22, 163, 74);
  font-size: 0.9rem;
}

.empty-state,
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
  color: var(--color-text-soft);
}

.empty-icon,
.loading-spinner {
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state h3,
.loading-state h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
}

.empty-state p,
.loading-state p {
  margin: 0;
  font-size: 0.9rem;
}

.manual-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.manual-dialog {
  background: var(--color-background);
  border-radius: 8px;
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.dialog-header h3 {
  margin: 0;
  font-size: 1.2rem;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--color-text-soft);
}

.dialog-content {
  padding: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: var(--color-text-soft);
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background-soft);
  color: var(--color-text);
  font-size: 1rem;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem;
  border-top: 1px solid var(--color-border);
}

.cancel-button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  cursor: pointer;
}

.add-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: none;
  background: var(--color-primary);
  color: white;
  cursor: pointer;
}

.add-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.connecting-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
