<template>
  <div class="simplified-panel simplified-safetymonitor-panel">
    <div class="panel-content">
      <div v-if="!currentDevice" class="connection-notice">
        <div class="connection-message">No safety monitor selected or available</div>
      </div>
      <div v-else-if="!props.isConnected" class="connection-notice">
        <div class="connection-message">Safety Monitor ({{ currentDevice.name }}) not connected.</div>
        <div class="panel-tip">Use the connect button in the panel header.</div>
      </div>
      <template v-else>
        <div class="panel-section safety-status-section" :class="safetyStatusClass">
          <h3>Safety Status</h3>
          <div class="status-text">
            {{ isSafe === null ? 'Status: Unknown' : (isSafe ? 'Status: SAFE' : 'Status: UNSAFE') }}
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { getAlpacaProperties } from '@/utils/alpacaPropertyAccess'

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
  return store.getDeviceById(props.deviceId)
})

const isSafe = ref<boolean | null>(null)

const safetyStatusClass = computed(() => {
  if (isSafe.value === null) return 'status-unknown'
  return isSafe.value ? 'status-safe' : 'status-unsafe'
})

const resetSafetyMonitorState = () => {
  isSafe.value = null
}

const updateSafetyStatus = async () => {
  if (!props.isConnected || !props.deviceId) return
  try {
    const properties = await getAlpacaProperties(props.deviceId, ['issafe'])
    isSafe.value = properties.issafe as boolean ?? null
  } catch (error) {
    console.error('Error updating safety monitor status:', error)
    isSafe.value = null // Set to null on error to indicate unknown status
  }
}

let pollTimer: number | undefined

onMounted(async () => {
  if (props.isConnected && props.deviceId) {
    await updateSafetyStatus()
    if (!pollTimer) {
      pollTimer = window.setInterval(updateSafetyStatus, 5000) // Poll every 5 seconds
    }
  }
})

watch(() => props.isConnected, async (newIsConnected) => {
  if (newIsConnected && props.deviceId) {
    resetSafetyMonitorState()
    await updateSafetyStatus()
    if (!pollTimer) {
      pollTimer = window.setInterval(updateSafetyStatus, 5000)
    }
  } else {
    if (pollTimer) {
      window.clearInterval(pollTimer)
      pollTimer = undefined
    }
    resetSafetyMonitorState()
  }
})

watch(() => props.deviceId, async (newDeviceId, oldDeviceId) => {
  if (newDeviceId !== oldDeviceId) {
    resetSafetyMonitorState()
    if (props.isConnected) {
      await updateSafetyStatus()
      if (!pollTimer) {
        pollTimer = window.setInterval(updateSafetyStatus, 5000)
      }
    } else {
      if (pollTimer) {
        clearInterval(pollTimer)
        pollTimer = undefined
      }
    }
  }
}, { immediate: true })

onUnmounted(() => {
  if (pollTimer) {
    window.clearInterval(pollTimer)
  }
})

</script>

<style scoped>
.simplified-panel {
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-text-color);
  border-radius: var(--aw-border-radius);
  border: 1px solid var(--aw-panel-border-color);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-content {
  overflow-y: auto;
  flex: 1;
  padding: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
  display: flex; /* For centering content */
  flex-direction: column; /* For centering content */
  justify-content: center; /* For centering content */
}

.panel-section {
  margin-bottom: calc(var(--aw-spacing-md) + var(--aw-spacing-xs));
  background-color: var(--aw-panel-content-bg-color);
  border-radius: calc(var(--aw-spacing-xs) * 1.5);
  padding: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
}

.panel-section h3 {
  margin-top: 0;
  margin-bottom: calc(var(--aw-spacing-sm));
  font-size: var(--aw-font-size-base);
  border-bottom: 1px solid var(--aw-panel-border-color);
  padding-bottom: calc(var(--aw-spacing-xs) * 1.5);
}

.connection-notice {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100px;
  padding: var(--aw-spacing-md);
  color: var(--aw-text-secondary-color);
  text-align: center;
}

.safety-status-section {
  text-align: center;
  padding: var(--aw-spacing-lg) var(--aw-spacing-md); /* Larger padding */
}

.status-text {
  font-size: 1.8rem; /* Larger font for status */
  font-weight: var(--aw-font-weight-bold);
  margin: var(--aw-spacing-md) 0;
}

.status-safe .status-text {
  color: var(--aw-success-color, green);
}

.status-unsafe .status-text {
  color: var(--aw-error-color, red);
}

.status-unknown .status-text {
  color: var(--aw-text-secondary-color, orange);
}

.device-description {
  font-size: 0.9rem;
  color: var(--aw-text-secondary-color);
  margin-top: var(--aw-spacing-sm);
}

</style> 