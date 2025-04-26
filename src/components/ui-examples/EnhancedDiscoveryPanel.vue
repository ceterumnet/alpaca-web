<script setup lang="ts">
import { ref, computed } from 'vue'
import { Lightning, Settings } from './icons'

// Type definitions
interface DeviceServer {
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
  server: DeviceServer
  isAdded: boolean
  capabilities: string[]
}

// Props
const props = defineProps({
  servers: {
    type: Array as () => DeviceServer[],
    default: () => []
  },
  devices: {
    type: Array as () => DiscoveredDevice[],
    default: () => []
  },
  isDiscovering: {
    type: Boolean,
    default: false
  },
  lastDiscoveryTime: {
    type: Date,
    default: null
  }
})

// Emits
const emit = defineEmits(['discover', 'connectDevice', 'addServer'])

// Local state
const activeView = ref('devices') // 'devices' or 'servers'
const searchQuery = ref('')
const selectedDevice = ref<DiscoveredDevice | null>(null)
const showManualServerForm = ref(false)
const manualServer = ref({
  address: '',
  port: 11111,
  name: '',
  isSecure: false
})

// Computed properties
const filteredDevices = computed(() => {
  let result = props.devices

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(
      (device) =>
        device.name.toLowerCase().includes(query) ||
        device.type.toLowerCase().includes(query) ||
        device.server.name.toLowerCase().includes(query) ||
        device.server.address.toLowerCase().includes(query)
    )
  }

  return result
})

// Device count by type
const deviceCountByType = computed(() => {
  const counts: Record<string, { total: number; added: number }> = {}

  props.devices.forEach((device) => {
    const type = device.type.toLowerCase()
    if (!counts[type]) {
      counts[type] = { total: 0, added: 0 }
    }
    counts[type].total++
    if (device.isAdded) {
      counts[type].added++
    }
  })

  return counts
})

// Server online status
const serversStatus = computed(() => {
  const online = props.servers.filter((s) => s.isOnline).length
  const total = props.servers.length
  return { online, total }
})

// Handle device selection
const selectDevice = (device: DiscoveredDevice) => {
  selectedDevice.value = device
}

// Connect to selected device
const connectDevice = () => {
  if (selectedDevice.value) {
    emit('connectDevice', selectedDevice.value)
    selectedDevice.value = null
  }
}

// Format relative time
const formatRelativeTime = (date: Date) => {
  if (!date) return 'never'

  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return `${seconds} seconds ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  return `${Math.floor(seconds / 86400)} days ago`
}

// Submit manual server form
const submitManualServer = () => {
  emit('addServer', {
    address: manualServer.value.address,
    port: manualServer.value.port,
    name: manualServer.value.name || 'Custom Server',
    isSecure: manualServer.value.isSecure
  })

  // Reset form
  manualServer.value = {
    address: '',
    port: 11111,
    name: '',
    isSecure: false
  }
  showManualServerForm.value = false
}

// Start discovery
const startDiscovery = () => {
  emit('discover')
}
</script>

<template>
  <div class="discovery-panel">
    <!-- Header -->
    <div class="panel-header">
      <div class="header-left">
        <h2>Example: Device Discovery</h2>
        <div class="discovery-stats">
          <div class="stat-item">
            <span class="stat-label">Servers:</span>
            <span class="stat-value">
              {{ serversStatus.online }}/{{ serversStatus.total }} online
            </span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-label">Last scan:</span>
            <span v-if="lastDiscoveryTime" class="stat-value">
              {{ formatRelativeTime(lastDiscoveryTime) }}
            </span>
            <span v-else class="stat-value">never</span>
          </div>
        </div>
      </div>

      <div class="header-actions">
        <button class="secondary-button" @click="showManualServerForm = !showManualServerForm">
          <Settings class="button-icon" />
          <span>Add Server</span>
        </button>

        <button
          class="primary-button discover-button"
          :disabled="isDiscovering"
          @click="startDiscovery"
        >
          <span v-if="isDiscovering" class="spin-icon">↻</span>
          <Lightning v-else class="button-icon" />
          <span>{{ isDiscovering ? 'Scanning...' : 'Discover Devices' }}</span>
        </button>
      </div>
    </div>

    <!-- Manual Server Form -->
    <div v-if="showManualServerForm" class="server-form">
      <h3>Add Custom Alpaca Server</h3>

      <div class="form-row">
        <div class="form-group">
          <label for="server-address">Server Address</label>
          <input
            id="server-address"
            v-model="manualServer.address"
            type="text"
            placeholder="192.168.1.100"
            required
          />
        </div>

        <div class="form-group small">
          <label for="server-port">Port</label>
          <input id="server-port" v-model="manualServer.port" type="number" min="1" max="65535" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="server-name">Display Name (optional)</label>
          <input
            id="server-name"
            v-model="manualServer.name"
            type="text"
            placeholder="My Telescope Server"
          />
        </div>

        <div class="form-group checkbox">
          <label class="checkbox-label">
            <input v-model="manualServer.isSecure" type="checkbox" />
            <span>Use HTTPS</span>
          </label>
        </div>
      </div>

      <div class="form-actions">
        <button class="secondary-button" @click="showManualServerForm = false">Cancel</button>
        <button
          class="primary-button"
          :disabled="!manualServer.address"
          @click="submitManualServer"
        >
          Add Server
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div v-if="!showManualServerForm" class="panel-tabs">
      <button
        class="tab-button"
        :class="{ active: activeView === 'devices' }"
        @click="activeView = 'devices'"
      >
        Discovered Devices
      </button>
      <button
        class="tab-button"
        :class="{ active: activeView === 'servers' }"
        @click="activeView = 'servers'"
      >
        Servers
      </button>

      <div class="tab-actions">
        <div class="search-container">
          <input v-model="searchQuery" type="text" placeholder="Search..." class="search-input" />
          <button v-if="searchQuery" class="clear-search" @click="searchQuery = ''">×</button>
        </div>
      </div>
    </div>

    <!-- Devices View -->
    <div v-if="activeView === 'devices' && !showManualServerForm" class="device-list-container">
      <!-- Device type summary -->
      <div class="device-summary">
        <div v-for="(counts, type) in deviceCountByType" :key="type" class="summary-item">
          <span class="summary-label">{{ type }}s:</span>
          <span class="summary-value"> {{ counts.added }}/{{ counts.total }} added </span>
        </div>
      </div>

      <!-- Devices list -->
      <div v-if="filteredDevices.length > 0" class="devices-grid">
        <div
          v-for="device in filteredDevices"
          :key="device.id"
          class="device-card"
          :class="{
            'device-added': device.isAdded,
            'device-selected': selectedDevice && selectedDevice.id === device.id
          }"
          @click="selectDevice(device)"
        >
          <div class="device-header">
            <div class="device-type-badge">{{ device.type }}</div>
            <div v-if="device.isAdded" class="device-status">Added</div>
          </div>

          <div class="device-content">
            <h3 class="device-name">{{ device.name }}</h3>
            <div class="device-details">
              <div class="detail-item">
                <span class="detail-label">Server:</span>
                <span class="detail-value">{{ device.server.name }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Address:</span>
                <span class="detail-value"
                  >{{ device.server.address }}:{{ device.server.port }}</span
                >
              </div>
              <div class="detail-item">
                <span class="detail-label">Location:</span>
                <span class="detail-value">{{ device.server.location || 'Unknown' }}</span>
              </div>
            </div>

            <div
              v-if="device.capabilities && device.capabilities.length > 0"
              class="device-capabilities"
            >
              <span v-for="cap in device.capabilities" :key="cap" class="capability-badge">
                {{ cap }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="empty-state">
        <Lightning class="empty-icon" />
        <p v-if="props.devices.length === 0">No devices have been discovered yet</p>
        <p v-else>No devices match your search</p>
        <button class="primary-button" :disabled="isDiscovering" @click="startDiscovery">
          {{ isDiscovering ? 'Scanning...' : 'Discover Devices' }}
        </button>
      </div>
    </div>

    <!-- Servers View -->
    <div v-else-if="activeView === 'servers' && !showManualServerForm" class="servers-container">
      <div v-if="props.servers.length > 0" class="servers-grid">
        <div
          v-for="server in props.servers"
          :key="server.id"
          class="server-card"
          :class="{ 'server-offline': !server.isOnline }"
        >
          <div class="server-status-indicator" :class="{ online: server.isOnline }">
            <span class="sr-only">{{ server.isOnline ? 'Online' : 'Offline' }}</span>
          </div>

          <div class="server-content">
            <div class="server-header">
              <h3 class="server-name">{{ server.name }}</h3>
              <span v-if="server.isManualEntry" class="server-type-badge">Manual</span>
            </div>

            <div class="server-details">
              <div class="detail-item">
                <span class="detail-label">Address:</span>
                <span class="detail-value">{{ server.address }}:{{ server.port }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Manufacturer:</span>
                <span class="detail-value">{{ server.manufacturer || 'Unknown' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Version:</span>
                <span class="detail-value">{{ server.version || 'Unknown' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Last seen:</span>
                <span class="detail-value">{{ formatRelativeTime(server.lastSeen) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="empty-state">
        <Settings class="empty-icon" />
        <p>No servers have been discovered</p>
        <button class="secondary-button" @click="showManualServerForm = true">
          Add Server Manually
        </button>
      </div>
    </div>

    <!-- Selected Device Panel -->
    <div v-if="selectedDevice && !showManualServerForm" class="selected-device-panel">
      <div class="panel-header">
        <h3>Connect to Device</h3>
        <button class="close-button" @click="selectedDevice = null">×</button>
      </div>

      <div class="panel-content">
        <h4>{{ selectedDevice.name }}</h4>
        <p class="device-description">
          {{ selectedDevice.type }} #{{ selectedDevice.number }} on server
          {{ selectedDevice.server.name }}
        </p>

        <div
          v-if="selectedDevice.capabilities && selectedDevice.capabilities.length > 0"
          class="capability-list"
        >
          <h5>Capabilities</h5>
          <ul>
            <li v-for="cap in selectedDevice.capabilities" :key="cap">{{ cap }}</li>
          </ul>
        </div>

        <div class="server-info">
          <h5>Server Information</h5>
          <div class="detail-grid">
            <div class="detail-row">
              <span class="detail-key">Address:</span>
              <span class="detail-value"
                >{{ selectedDevice.server.address }}:{{ selectedDevice.server.port }}</span
              >
            </div>
            <div class="detail-row">
              <span class="detail-key">Manufacturer:</span>
              <span class="detail-value">{{
                selectedDevice.server.manufacturer || 'Unknown'
              }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-key">Location:</span>
              <span class="detail-value">{{ selectedDevice.server.location || 'Unknown' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="panel-footer">
        <button class="secondary-button" @click="selectedDevice = null">Cancel</button>
        <button class="primary-button" :disabled="selectedDevice.isAdded" @click="connectDevice">
          {{ selectedDevice.isAdded ? 'Already Added' : 'Connect Device' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.discovery-panel {
  background-color: var(--aw-panel-content-bg-color);
  border-radius: 8px;
  border: 1px solid var(--aw-panel-border-color);
  overflow: hidden;
  position: relative;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background-color: var(--aw-panel-menu-bar-bg-color);
  border-bottom: 1px solid var(--aw-panel-border-color);
}

.header-left {
  display: flex;
  flex-direction: column;
}

.panel-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--aw-panel-menu-bar-color);
}

.discovery-stats {
  display: flex;
  align-items: center;
  margin-top: 6px;
  font-size: 0.85rem;
  color: var(--aw-panel-menu-bar-color);
  opacity: 0.85;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-divider {
  width: 1px;
  height: 12px;
  background-color: var(--aw-panel-menu-bar-color);
  opacity: 0.4;
  margin: 0 10px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.primary-button,
.secondary-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.primary-button {
  background-color: var(--aw-panel-resize-bg-color);
  color: var(--aw-panel-resize-color);
}

.primary-button:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.secondary-button {
  background-color: rgba(var(--aw-panel-content-color-rgb, 255, 255, 255), 0.1);
  color: var(--aw-panel-content-color);
  border: 1px solid var(--aw-panel-border-color);
}

.secondary-button:hover:not(:disabled) {
  background-color: rgba(var(--aw-panel-content-color-rgb, 255, 255, 255), 0.15);
}

.primary-button:disabled,
.secondary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.button-icon {
  width: 16px;
  height: 16px;
}

.spin-icon {
  display: inline-block;
  animation: spin 1.5s linear infinite;
  font-weight: bold;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Panel Tabs */
.panel-tabs {
  display: flex;
  border-bottom: 1px solid var(--aw-panel-border-color);
  padding: 0 20px;
  background-color: var(--aw-panel-bg-color);
}

.tab-button {
  padding: 12px 16px;
  background: transparent;
  border: none;
  color: var(--aw-panel-content-color);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  position: relative;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.tab-button.active {
  opacity: 1;
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: var(--aw-panel-resize-bg-color);
}

.tab-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  padding: 8px 0;
}

.search-container {
  position: relative;
}

.search-input {
  padding: 6px 28px 6px 12px;
  border-radius: 16px;
  border: 1px solid var(--aw-panel-border-color);
  background-color: var(--aw-input-bg-color);
  color: var(--aw-panel-content-color);
  font-size: 0.9rem;
  width: 200px;
  transition: width 0.3s;
}

.search-input:focus {
  width: 240px;
  outline: none;
  border-color: var(--aw-panel-resize-bg-color);
}

.clear-search {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--aw-panel-content-color);
  cursor: pointer;
  opacity: 0.6;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
}

/* Device Summary */
.device-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px 20px;
  background-color: rgba(var(--aw-panel-content-color-rgb, 255, 255, 255), 0.03);
  border-bottom: 1px solid var(--aw-panel-border-color);
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
}

.summary-label {
  font-weight: 500;
  text-transform: capitalize;
}

.summary-value {
  opacity: 0.8;
}

/* Devices Grid */
.devices-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding: 20px;
  overflow-y: auto;
  max-height: 400px;
}

.device-card {
  background-color: var(--aw-panel-bg-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s;
  cursor: pointer;
  position: relative;
}

.device-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: var(--aw-panel-resize-bg-color);
}

.device-card.device-selected {
  border-color: var(--aw-panel-resize-bg-color);
  box-shadow: 0 0 0 2px var(--aw-panel-resize-bg-color);
}

.device-card.device-added {
  opacity: 0.7;
}

.device-header {
  display: flex;
  justify-content: space-between;
  padding: 10px 12px;
  background-color: rgba(var(--aw-panel-content-color-rgb, 255, 255, 255), 0.05);
  border-bottom: 1px solid var(--aw-panel-border-color);
}

.device-type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
  font-size: 0.8rem;
  text-transform: capitalize;
}

.device-status {
  font-size: 0.8rem;
  color: #4ade80;
}

.device-content {
  padding: 12px;
}

.device-name {
  margin: 0 0 8px 0;
  font-size: 1rem;
  font-weight: 600;
}

.device-details {
  margin-bottom: 12px;
}

.detail-item {
  display: flex;
  margin-bottom: 4px;
  font-size: 0.85rem;
  line-height: 1.4;
}

.detail-label {
  width: 70px;
  font-weight: 500;
}

.detail-value {
  flex: 1;
  opacity: 0.8;
}

.device-capabilities {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.capability-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: rgba(var(--aw-panel-content-color-rgb, 255, 255, 255), 0.1);
  color: var(--aw-panel-content-color);
  font-size: 0.75rem;
}

/* Servers Grid */
.servers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding: 20px;
  overflow-y: auto;
  max-height: 400px;
}

.server-card {
  display: flex;
  background-color: var(--aw-panel-bg-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s;
}

.server-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.server-card.server-offline {
  opacity: 0.7;
}

.server-status-indicator {
  width: 6px;
  background-color: #ef4444;
  transition: background-color 0.3s;
}

.server-status-indicator.online {
  background-color: #4ade80;
}

.server-content {
  flex: 1;
  padding: 12px;
}

.server-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.server-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.server-type-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: rgba(var(--aw-panel-content-color-rgb, 255, 255, 255), 0.1);
  color: var(--aw-panel-content-color);
  font-size: 0.75rem;
}

/* Selected Device Panel */
.selected-device-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 320px;
  height: 100%;
  background-color: var(--aw-panel-bg-color);
  border-left: 1px solid var(--aw-panel-border-color);
  box-shadow: -5px 0 15px rgba(0, 0, 0, 0.1);
  z-index: 5;
  display: flex;
  flex-direction: column;
}

.close-button {
  background: none;
  border: none;
  color: var(--aw-panel-menu-bar-color);
  font-size: 1.5rem;
  cursor: pointer;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.close-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.panel-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.panel-content h4 {
  margin: 0 0 4px 0;
  font-size: 1.1rem;
}

.device-description {
  color: var(--aw-panel-content-color);
  opacity: 0.8;
  margin-bottom: 20px;
}

.capability-list h5,
.server-info h5 {
  margin: 0 0 8px 0;
  font-size: 0.95rem;
  color: var(--aw-panel-content-color);
  opacity: 0.9;
}

.capability-list ul {
  list-style-type: none;
  padding: 0;
  margin: 0 0 20px 0;
}

.capability-list li {
  padding: 4px 0;
  font-size: 0.9rem;
  position: relative;
  padding-left: 20px;
}

.capability-list li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #4ade80;
}

.detail-grid {
  font-size: 0.9rem;
}

.detail-row {
  display: flex;
  margin-bottom: 8px;
}

.detail-key {
  width: 100px;
  font-weight: 500;
}

.detail-value {
  flex: 1;
  opacity: 0.8;
}

.panel-footer {
  padding: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid var(--aw-panel-border-color);
}

/* Empty States */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  width: 40px;
  height: 40px;
  opacity: 0.4;
  margin-bottom: 16px;
}

.empty-state p {
  margin: 0 0 20px 0;
  font-size: 1.1rem;
  opacity: 0.8;
}

/* Server Form */
.server-form {
  padding: 20px;
}

.server-form h3 {
  margin: 0 0 20px 0;
  font-size: 1.1rem;
}

.form-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.form-group.small {
  flex: 0 0 100px;
}

.form-group.checkbox {
  flex-direction: row;
  align-items: center;
}

.form-group label {
  margin-bottom: 6px;
  font-size: 0.9rem;
  font-weight: 500;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.form-group input[type='text'],
.form-group input[type='number'] {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--aw-panel-border-color);
  background-color: var(--aw-input-bg-color);
  color: var(--aw-panel-content-color);
  font-size: 0.95rem;
}

.form-group input:focus {
  outline: none;
  border-color: var(--aw-panel-resize-bg-color);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}

/* Screen reader only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
