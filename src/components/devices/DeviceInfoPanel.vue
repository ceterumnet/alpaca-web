<script setup lang="ts">
import { computed } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  }
})

// Get unified store for device interaction
const store = useUnifiedStore()

// Get the current device
const currentDevice = computed(() => {
  return store.getDeviceById(props.deviceId)
})

// Compute device connection info
const connectionInfo = computed(() => {
  if (!currentDevice.value) return null
  
  const device = currentDevice.value
  return {
    ipAddress: device.ipAddress || device.address || 'Unknown',
    port: device.port || 0,
    alpacaPort: device.properties?.alpacaPort || device.port || 0,
    serverName: device.properties?.serverName || 'Unknown Server',
    manufacturer: device.properties?.manufacturer || 'Unknown Manufacturer',
    location: device.properties?.location || 'Unknown Location',
    version: device.properties?.version || 'Unknown Version',
    deviceNumber: device.properties?.deviceNumber || 0,
    isManualEntry: device.properties?.isManualEntry || false,
    discoveryTime: device.properties?.discoveryTime 
      ? new Date(device.properties.discoveryTime as string).toLocaleString() 
      : 'Unknown'
  }
})
</script>

<template>
  <div class="device-info-panel">
    <!-- Only show if we have a device -->
    <div v-if="currentDevice && connectionInfo" class="panel-section">
      <h3>Device Information</h3>
      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">Server:</span>
          <span class="info-value">{{ connectionInfo.serverName }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Address:</span>
          <span class="info-value">{{ connectionInfo.ipAddress }}:{{ connectionInfo.alpacaPort }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Manufacturer:</span>
          <span class="info-value">{{ connectionInfo.manufacturer }}</span>
        </div>
        <div v-if="connectionInfo.version" class="info-row">
          <span class="info-label">Version:</span>
          <span class="info-value">{{ connectionInfo.version }}</span>
        </div>
        <div v-if="connectionInfo.location" class="info-row">
          <span class="info-label">Location:</span>
          <span class="info-value">{{ connectionInfo.location }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Device #:</span>
          <span class="info-value">{{ connectionInfo.deviceNumber }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Discovered:</span>
          <span class="info-value">{{ connectionInfo.discoveryTime }}</span>
        </div>
        <div v-if="connectionInfo.isManualEntry" class="info-row">
          <span class="info-label">Manual Entry:</span>
          <span class="info-value">Yes</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.device-info-panel {
  width: 100%;
}

.panel-section {
  margin-bottom: 20px;
  background-color: var(--aw-panel-content-bg-color, #3a3a3a);
  border-radius: 6px;
  padding: 12px;
}

.panel-section h3 {
  margin-top: 0;
  margin-bottom: 12px;
  font-size: 1rem;
  border-bottom: 1px solid var(--aw-panel-border-color, #444);
  padding-bottom: 6px;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
}

.info-label {
  font-weight: 500;
  color: var(--aw-text-secondary-color, #aaa);
}

.info-value {
  color: var(--aw-text-color, #f0f0f0);
}
</style> 