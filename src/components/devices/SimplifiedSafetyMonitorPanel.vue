<template>
  <div class="simplified-panel simplified-safetymonitor-panel">
    <div class="panel-content">
      <div v-if="!currentDevice" class="connection-notice">
        <div class="connection-message">No safety monitor selected or available</div>
      </div>
      <div v-else-if="!props.isConnected" class="connection-notice">
        <div class="connection-message">Safety Monitor ({{ currentDevice.name ? currentDevice.name : 'N/A' }}) not connected.</div>
        <div class="panel-tip">Use the connect button in the panel header.</div>
      </div>
      <template v-else>
        <div class="panel-section safety-status-section" :class="safetyStatusClass">
          <h3>Safety Status</h3>
          <div class="status-text">
            {{ safetyStatusText }}
          </div>
          <div v-if="currentDevice?.description" class="device-description">
            {{ currentDevice.description }}
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import type { SafetyMonitorDevice } from '@/types/device.types'

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  isConnected: {
    type: Boolean,
    required: true
  }
})

const store = useUnifiedStore()

const currentDevice = computed(() => {
  return store.getDeviceById(props.deviceId) as
    | (Partial<SafetyMonitorDevice> & { safety_isSafe?: boolean | null; name?: string; description?: string })
    | null
})

const isSafe = computed(() => {
  return currentDevice.value?.safety_isSafe ?? null
})

const safetyStatusText = computed(() => {
  if (isSafe.value === null) return 'Status: Unknown'
  return isSafe.value ? 'Status: SAFE' : 'Status: UNSAFE'
})

const safetyStatusClass = computed(() => {
  if (isSafe.value === null) return 'status-unknown'
  return isSafe.value ? 'status-safe' : 'status-unsafe'
})

onMounted(() => {
  if (props.deviceId && props.isConnected) {
    store.handleSafetyMonitorConnected(props.deviceId)
  }
})

watch(
  () => props.isConnected,
  (newIsConnected) => {
    if (props.deviceId) {
      if (newIsConnected) {
        store.handleSafetyMonitorConnected(props.deviceId)
      } else {
        store.handleSafetyMonitorDisconnected(props.deviceId)
      }
    }
  }
)

watch(
  () => props.deviceId,
  (newDeviceId, oldDeviceId) => {
    if (oldDeviceId) {
      store.handleSafetyMonitorDisconnected(oldDeviceId)
    }
    if (newDeviceId && props.isConnected) {
      store.handleSafetyMonitorConnected(newDeviceId)
    }
  }
)

onUnmounted(() => {
  if (props.deviceId) {
    store.handleSafetyMonitorDisconnected(props.deviceId)
  }
})
</script>

<style scoped>
.safety-status-section {
  text-align: center;
  margin: var(--aw-spacing-lg) var(--aw-spacing-md); /* Larger padding */
}

.status-text {
  font-size: 1.8rem; /* Larger font for status */
  font-weight: var(--aw-font-weight-bold);
  margin: var(--aw-spacing-md) 0;
}

.status-safe .status-text {
  color: var(--aw-success-color);
}

.status-unsafe .status-text {
  color: var(--aw-error-color);
}

.status-unknown .status-text {
  color: var(--aw-text-secondary-color);
}

.device-description {
  font-size: 0.9rem;
  color: var(--aw-text-secondary-color);
  margin-top: var(--aw-spacing-sm);
}
</style>
