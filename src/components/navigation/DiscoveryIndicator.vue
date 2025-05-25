// Status: New - Discovery Navigation Integration
// This component provides discovery status indicators and triggers in the navigation area
// - Runs discovery automatically when the app loads
// - Performs periodic discovery checks
// - Shows spinner during discovery
// - Generates notifications when new devices are found

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useEnhancedDiscoveryStore } from '@/stores/useEnhancedDiscoveryStore'
import { useNotificationStore } from '@/stores/useNotificationStore'
import Icon from '@/components/ui/Icon.vue'

defineOptions({
  name: 'DiscoveryIndicator'
})

// Props
const props = defineProps({
  showLabel: {
    type: Boolean,
    default: true
  }
})

// Get stores
const discoveryStore = useEnhancedDiscoveryStore()
const notificationStore = useNotificationStore()

// Animation control
const isAnimating = ref(false)
const discoveryInterval = ref<number | null>(null)
const previousDeviceCount = ref(0)

// Show loading animation for 1 second when clicked
function animateDiscovery() {
  isAnimating.value = true
  setTimeout(() => {
    isAnimating.value = false
  }, 1000)
}

// Computed properties
const discoveryStatus = computed(() => discoveryStore.status)
const lastDiscoveryTime = computed(() => discoveryStore.lastDiscoveryTime)
const hasDevices = computed(() => discoveryStore.availableDevices.length > 0)
const availableDeviceCount = computed(() => discoveryStore.availableDevices.length)

// Format the last discovery time
const formattedLastDiscoveryTime = computed(() => {
  if (!lastDiscoveryTime.value) return 'Never'

  const date = new Date(lastDiscoveryTime.value)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})

// Handle discovery trigger click - just trigger discovery, don't navigate
function handleDiscoveryClick() {
  triggerDiscovery()
}

// Trigger device discovery
async function triggerDiscovery() {
  animateDiscovery()
  try {
    const prevCount = discoveryStore.availableDevices.length
    await discoveryStore.discoverDevices()
    
    // Get new count after discovery
    const newCount = discoveryStore.availableDevices.length
    const newDevicesFound = newCount - prevCount
    
    // Notify if new devices were found
    if (newDevicesFound > 0) {
      notificationStore.showSuccess(
        `${newDevicesFound} new ${newDevicesFound === 1 ? 'device' : 'devices'} discovered`,
        {
          autoDismiss: true,
          position: 'top-right',
          duration: 5000
        }
      )
    }
  } catch (error) {
    console.error('Discovery failed:', error)
    notificationStore.showError(`Discovery failed: ${error}`, {
      autoDismiss: false,
      position: 'top-right'
    })
  }
}

// Set up periodic discovery (every 60 seconds)
function setupPeriodicDiscovery() {
  // Clear any existing interval
  if (discoveryInterval.value) {
    clearInterval(discoveryInterval.value)
  }
  
  // Do NOT run discovery immediately on mount here, App.vue handles initial discovery
  // triggerDiscovery() // OLD: Removed immediate trigger
  
  // Set up interval (every minute) - this will start the first periodic check after 60s
  discoveryInterval.value = window.setInterval(() => {
    triggerDiscovery()
  }, 60000) // 60 seconds
}

// Lifecycle hooks
onMounted(() => {
  setupPeriodicDiscovery() // This will now only set up the interval
  
  // Track initial device count - this might be 0 if App.vue's discovery hasn't run yet
  // This is fine, as the indicator will update reactively when discoveryStore changes.
  previousDeviceCount.value = discoveryStore.availableDevices.length
})

onUnmounted(() => {
  // Clean up interval on component unmount
  if (discoveryInterval.value) {
    clearInterval(discoveryInterval.value)
  }
})
</script>

<template>
  <div
    class="aw-discovery-indicator"
    :class="{
      'aw-discovery-indicator--discovering': discoveryStatus === 'discovering' || isAnimating,
      'aw-discovery-indicator--has-devices': hasDevices
    }"
  >
    <button
      class="aw-discovery-indicator__button"
      :title="
        hasDevices
          ? `${availableDeviceCount} available devices found`
          : 'Find devices on your network'
      "
      @click="handleDiscoveryClick"
    >
      <div class="aw-discovery-indicator__icon-wrapper">
        <Icon type="search" class="aw-discovery-indicator__icon" />
        <span v-if="hasDevices" class="aw-discovery-indicator__device-badge">{{ availableDeviceCount }}</span>
      </div>
      <span v-if="props.showLabel" class="aw-discovery-indicator__label">
        {{ discoveryStatus === 'discovering' ? 'Discovering...' : 'Discovery' }}
      </span>
    </button>

    <div v-if="lastDiscoveryTime" class="aw-discovery-indicator__info">
      Last scan: {{ formattedLastDiscoveryTime }}
    </div>
  </div>
</template>

<style scoped>
.aw-discovery-indicator {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.aw-discovery-indicator__button {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-sm);
  padding: calc(var(--aw-spacing-xs) * 1.5) calc(var(--aw-spacing-sm) + var(--aw-spacing-xs) / 2);
  border: none;
  border-radius: var(--aw-border-radius-md);
  background-color: var(--aw-panel-hover-bg-color);

  /* color: var(--aw-panel-content-color); */
  cursor: pointer;
  transition: all 0.2s ease;
}

.aw-discovery-indicator__button:hover {
  background-color: var(--aw-panel-button-hover-bg);
  transform: translateY(-1px);
}

.aw-discovery-indicator__button:focus {
  outline: 2px solid var(--aw-color-primary-300);
  outline-offset: 1px;
}

.aw-discovery-indicator__icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.aw-discovery-indicator__icon {
  width: 18px;
  height: 18px;
  opacity: 0.9;
  transition: transform 0.3s ease;
}

.aw-discovery-indicator--discovering .aw-discovery-indicator__icon {
  animation: pulse 1.5s infinite ease-in-out;
}

.aw-discovery-indicator__label {
  font-size: var(--aw-font-size-xs, 0.75rem);
  font-weight: 500;
}

.aw-discovery-indicator__device-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: var(--aw-color-success-500);
  color: var(--aw-button-success-text);
  font-size: 10px;
  font-weight: 700;
}

.aw-discovery-indicator__info {
  margin-top: var(--aw-spacing-xs);
  font-size: 10px;
  color: var(--aw-panel-content-secondary-color);
  opacity: 0.8;
}

.aw-discovery-indicator--has-devices .aw-discovery-indicator__button {
  background-color: var(--aw-success-muted);
  color: var(--aw-success-color);
}

.aw-discovery-indicator--has-devices .aw-discovery-indicator__button:hover {
  background-color: var(--aw-success-muted-hover);
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.7;
  }

  50% {
    transform: scale(1.1);
    opacity: 1;
  }

  100% {
    transform: scale(1);
    opacity: 0.7;
  }
}

/* Responsive styles */
@media (width <= 768px) {
  .aw-discovery-indicator__info {
    display: none;
  }
}
</style>
