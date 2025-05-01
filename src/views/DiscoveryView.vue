// Status: Enhanced - Navigation Integration 
// This view is part of the device discovery system
// - Fully integrated with the navigation components 
// - Uses centralized notification system 
// - Properly handles navigation states 
// - Supports BreadcrumbNav integration 
// - Maintains consistent UI with the new design system

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/useNotificationStore'
import { useEnhancedDiscoveryStore } from '@/stores/useEnhancedDiscoveryStore'
import DiscoveredDevices from '@/components/devices/DiscoveredDevices.vue'

defineOptions({
  name: 'DiscoveryView'
})

// Get router and stores
const router = useRouter()
const notificationStore = useNotificationStore()
const discoveryStore = useEnhancedDiscoveryStore()

// State
const isRefreshing = ref(false)

// Method to go to devices view after adding devices
const goToDevicesView = () => {
  router.push('/devices')
}

// Refresh device discovery
const refreshDiscovery = async () => {
  if (isRefreshing.value) return

  isRefreshing.value = true
  try {
    await discoveryStore.discoverDevices()
    notificationStore.showSuccess('Device discovery completed', {
      autoDismiss: true,
      position: 'top-right',
      duration: 2000
    })
  } catch (error) {
    notificationStore.showError(`Discovery failed: ${error}`, {
      autoDismiss: false,
      position: 'top-right'
    })
  } finally {
    isRefreshing.value = false
  }
}

// Handle successful device connection with notifications
const handleDeviceConnected = (deviceName: string) => {
  notificationStore.showSuccess(`Device "${deviceName}" connected successfully`, {
    autoDismiss: true,
    position: 'top-right',
    duration: 3000
  })

  // Navigate to devices view
  goToDevicesView()
}

// Handle device connection error
const handleConnectionError = (deviceName: string, error: string) => {
  notificationStore.showError(`Failed to connect to "${deviceName}": ${error}`, {
    autoDismiss: false,
    position: 'top-right'
  })
}

onMounted(() => {
  // Set page title - useful for screen readers and browser history
  document.title = 'Device Discovery - Alpaca Web'

  // Auto-refresh discovery on mount
  refreshDiscovery()
})
</script>

<template>
  <div class="discovery-view">
    <div class="discovery-container">
      <div class="discovery-header">
        <div class="header-left">
          <h1>Device Discovery</h1>
          <p class="discovery-description">
            Search for and connect to ASCOM Alpaca-compatible devices on your network.
          </p>
        </div>

        <div class="header-right">
          <button
            class="refresh-button"
            :disabled="isRefreshing"
            :class="{ 'is-refreshing': isRefreshing }"
            @click="refreshDiscovery"
          >
            <span class="refresh-icon">↻</span>
            <span class="refresh-text">{{ isRefreshing ? 'Scanning...' : 'Refresh' }}</span>
          </button>
        </div>
      </div>

      <DiscoveredDevices
        @device-connected="handleDeviceConnected"
        @connection-error="handleConnectionError"
      />
    </div>
  </div>
</template>

<style scoped>
.discovery-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: auto;
  padding: var(--spacing-md);
}

.discovery-container {
  background-color: var(--aw-panel-bg-color);
  border-radius: var(--border-radius-md);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  padding: var(--spacing-lg);
  max-width: 1200px;
  margin: 0 auto;
}

.discovery-header {
  margin-bottom: var(--spacing-lg);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left {
  flex-grow: 1;
}

.discovery-header h1 {
  margin: 0;
  color: var(--aw-heading-color);
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
}

.discovery-description {
  margin-top: var(--spacing-xs);
  color: var(--aw-text-secondary-color);
  font-size: var(--font-size-base);
}

.header-right {
  display: flex;
  align-items: center;
}

.refresh-button {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: var(--aw-primary-light);
  color: var(--aw-primary-dark);
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease;
}

.refresh-button:hover:not(:disabled) {
  background-color: var(--aw-primary-light-hover);
  transform: translateY(-1px);
}

.refresh-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-icon {
  font-size: var(--font-size-lg);
  transition: transform 0.3s ease;
}

.is-refreshing .refresh-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .discovery-view {
    padding: var(--spacing-sm);
  }

  .discovery-container {
    padding: var(--spacing-md);
  }

  .discovery-header {
    flex-direction: column;
    gap: 12px;
  }

  .header-right {
    width: 100%;
  }

  .refresh-button {
    width: 100%;
    justify-content: center;
  }
}
</style>
