// Status: Legacy - To Be Migrated 
// This component is part of the old panel system and should be
// migrated to the new panel architecture. 
// The new panel system uses NewPanelSystemView.vue as the
// main container and implements: 
// - Device-specific panel definitions with feature categorization 
// - Responsive layouts based on priority levels 
// - Improved device integration and context awareness
// - Better layout management and persistence

<script setup lang="ts">
import { onMounted, ref, watch, onUnmounted } from 'vue'
import type { UnifiedDevice } from '@/types/device.types'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { useLayoutStore, type LayoutItem } from '@/stores/useLayoutStore'

// Use the layout store instead of local state
const layoutStore = useLayoutStore()
// Create a computed reference to the layout
const layout = ref(layoutStore.layout)

// Initialize UnifiedStore via Pinia
const store = useUnifiedStore()

// Responsive breakpoints
const isSmallScreen = ref(false)
const isMobileDevice = ref(false)

// Check screen size on mount and when window resizes
function updateScreenSize() {
  isSmallScreen.value = window.innerWidth < 768
  isMobileDevice.value = window.innerWidth < 480
}

// Event handlers
function handleDeviceAdded(...args: unknown[]) {
  const device = args[0] as UnifiedDevice

  // Check if device is already in layout
  const deviceExists = layout.value.some(
    (item: LayoutItem) =>
      item.deviceId === device.id ||
      (item.deviceType?.toLowerCase() === (device.deviceType || device.type)?.toLowerCase() &&
        item.deviceNum === Number(device.id))
  )

  if (deviceExists) return

  // Add new device to layout with responsive sizing
  let xPos = 0
  let yPos = 0
  let width = 6
  const height = 8

  // Adjust panel position and size based on screen size
  if (isSmallScreen.value) {
    width = isMobileDevice.value ? 4 : 8
    // Find the lowest y position to place new panel
    layout.value.forEach((item: LayoutItem) => {
      yPos = Math.max(yPos, item.y + item.h)
    })
  } else {
    // Place panels side by side in desktop view
    const rightCol = layout.value.filter((item: LayoutItem) => item.x >= 6)
    const leftCol = layout.value.filter((item: LayoutItem) => item.x < 6)

    if (leftCol.length <= rightCol.length) {
      xPos = 0
      yPos = leftCol.reduce((max, item) => Math.max(max, item.y + item.h), 0)
    } else {
      xPos = 6
      yPos = rightCol.reduce((max, item) => Math.max(max, item.y + item.h), 0)
    }
  }

  // Get the device's apiBaseUrl if available
  const deviceApiBaseUrl = (device.apiBaseUrl as string) || ''

  layout.value.push({
    x: xPos,
    y: yPos,
    w: width,
    h: height,
    i: `${device.deviceType || device.type}-${device.id}`,
    deviceNum: Number(device.id),
    deviceType: device.deviceType || device.type,
    deviceId: device.id,
    connected: device.isConnected || false,
    apiBaseUrl: deviceApiBaseUrl
  })

  // Update the store with the new layout
  layoutStore.updateLayout(layout.value)
}

function handleDeviceRemoved(...args: unknown[]) {
  const deviceId = args[0] as string

  // Remove the device from the layout
  layout.value = layout.value.filter((layoutItem: LayoutItem) => layoutItem.deviceId !== deviceId)
  layoutStore.updateLayout(layout.value)
}

// Handle device updated event that contains connection state changes
function handleDeviceUpdated(...args: unknown[]) {
  const updatedDevice = args[0] as UnifiedDevice

  if (updatedDevice && updatedDevice.id) {
    // Find the device in the layout
    const layoutItem = layout.value.find((item: LayoutItem) => item.deviceId === updatedDevice.id)

    if (layoutItem) {
      // Update the connection state
      layoutItem.connected = updatedDevice.isConnected || false
      // Update the layout
      layoutStore.updateLayout(layout.value)
    }
  }
}

// Watch for changes in the devices store and update layout accordingly
watch(
  () => store.devicesList,
  (newDevices) => {
    if (!newDevices || !newDevices.length) return

    // Filter for devices not already in layout
    const devicesToAdd = newDevices.filter((device) => {
      return !layout.value.some(
        (item: LayoutItem) =>
          item.deviceId === device.id ||
          (item.deviceType?.toLowerCase() === (device.deviceType || device.type)?.toLowerCase() &&
            item.deviceNum === Number(device.id))
      )
    })

    // Add new devices to layout
    for (const device of devicesToAdd) {
      handleDeviceAdded(device)
    }
  },
  { deep: true }
)

// Reset the layout to defaults
function resetLayout() {
  if (
    import.meta.env.MODE === 'test' ||
    confirm('Are you sure you want to reset the layout? This will remove all panels.')
  ) {
    layoutStore.resetLayout()
  }
}

// Save the current layout as a preset
function saveLayoutPreset() {
  if (import.meta.env.MODE !== 'test') {
    alert('Layout saved successfully!')
  }
  layoutStore.saveLayout()
}

onMounted(() => {
  // Initialize the layout from saved layout if available
  layoutStore.initLayout()

  // Set initial values for responsive layout
  updateScreenSize()

  // Add event listener for window resize
  window.addEventListener('resize', updateScreenSize)

  // Set up event listeners for device changes
  store.on('deviceAdded', handleDeviceAdded)
  store.on('deviceRemoved', handleDeviceRemoved)
  store.on('deviceUpdated', handleDeviceUpdated)
})

onUnmounted(() => {
  // Clean up event listeners
  window.removeEventListener('resize', updateScreenSize)
  store.off('deviceAdded', handleDeviceAdded)
  store.off('deviceRemoved', handleDeviceRemoved)
  store.off('deviceUpdated', handleDeviceUpdated)
})
</script>

<template>
  <div class="aw-panels" data-testid="main-panels">
    <!-- Layout controls -->
    <div class="aw-panels__controls">
      <button class="aw-button aw-button--secondary" @click="resetLayout">
        <span class="aw-panels__icon aw-panels__icon--reset"></span>
        Reset Layout
      </button>
      <button class="aw-button aw-button--primary" @click="saveLayoutPreset">
        <span class="aw-panels__icon aw-panels__icon--save"></span>
        Save Layout
      </button>
    </div>
  </div>
</template>

<style scoped>
.aw-panels {
  padding: var(--aw-spacing-md);
  height: 100%;
  overflow: auto;
  background-color: var(--aw-panels-bg-color);
}

.aw-panels__controls {
  display: flex;
  gap: var(--aw-spacing-md);
  margin-bottom: var(--aw-spacing-md);
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: var(--aw-panels-bg-color);
  padding: var(--aw-spacing-sm) 0;
  box-shadow: var(--aw-shadow-sm);
  border-radius: var(--aw-border-radius-md);
}

.aw-panels__panel {
  height: 100%;
  width: 100%;
  border-radius: var(--aw-border-radius-md);
  overflow: hidden;
  box-shadow: var(--aw-shadow-sm);
  transition: all 0.3s ease;
  background-color: var(--aw-panel-bg-color);
}

.aw-panels__panel--connected {
  box-shadow:
    0 0 0 2px var(--aw-color-primary-500),
    var(--aw-shadow-sm);
}

.aw-panels__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  text-align: center;
  background-color: var(--aw-panel-bg-color);
  border-radius: var(--aw-border-radius-md);
  padding: var(--aw-spacing-xl);
  margin: var(--aw-spacing-xl) 0;
  color: var(--aw-panel-content-secondary-color);
}

.aw-panels__empty-icon {
  font-size: 3rem;
  margin-bottom: var(--aw-spacing-md);
}

/* Icon styles */
.aw-panels__icon {
  display: inline-block;
  width: 1em;
  height: 1em;
  margin-right: var(--aw-spacing-xs);
}

.aw-panels__icon--reset::before {
  content: '🔄';
}

.aw-panels__icon--save::before {
  content: '💾';
}

@media (max-width: 768px) {
  .aw-panels {
    padding: var(--aw-spacing-sm);
  }

  .aw-panels__controls {
    gap: var(--aw-spacing-sm);
    margin-bottom: var(--aw-spacing-sm);
    flex-wrap: wrap;
  }

  .aw-panels__empty {
    height: 200px;
    padding: var(--aw-spacing-md);
    margin: var(--aw-spacing-md) 0;
  }
}
</style>
