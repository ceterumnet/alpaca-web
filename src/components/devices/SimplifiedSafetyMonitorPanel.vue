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
import { computed, watch, onMounted, onUnmounted } from 'vue';
import { useUnifiedStore } from '@/stores/UnifiedStore';
import type { SafetyMonitorDevice } from '@/types/device.types';

const props = defineProps({
  deviceId: {
    type: String,
    required: true,
  },
  isConnected: {
    type: Boolean,
    required: true,
  },
});

const store = useUnifiedStore();

const currentDevice = computed(() => {
  return store.getDeviceById(props.deviceId) as 
    (Partial<SafetyMonitorDevice> & { safety_isSafe?: boolean | null; name?: string; description?: string }) | null;
});

const isSafe = computed(() => {
  return currentDevice.value?.safety_isSafe ?? null;
});

const safetyStatusText = computed(() => {
  if (isSafe.value === null) return 'Status: Unknown';
  return isSafe.value ? 'Status: SAFE' : 'Status: UNSAFE';
});

const safetyStatusClass = computed(() => {
  if (isSafe.value === null) return 'status-unknown';
  return isSafe.value ? 'status-safe' : 'status-unsafe';
});

onMounted(() => {
  if (props.deviceId && props.isConnected) {
    store.handleSafetyMonitorConnected(props.deviceId);
  }
});

watch(
  () => props.isConnected,
  (newIsConnected) => {
    if (props.deviceId) {
      if (newIsConnected) {
        store.handleSafetyMonitorConnected(props.deviceId);
      } else {
        store.handleSafetyMonitorDisconnected(props.deviceId);
      }
    }
  }
);

watch(
  () => props.deviceId,
  (newDeviceId, oldDeviceId) => {
    if (oldDeviceId) {
      store.handleSafetyMonitorDisconnected(oldDeviceId);
    }
    if (newDeviceId && props.isConnected) {
      store.handleSafetyMonitorConnected(newDeviceId);
    }
  }
);

onUnmounted(() => {
  if (props.deviceId) {
    store.handleSafetyMonitorDisconnected(props.deviceId);
  }
});
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