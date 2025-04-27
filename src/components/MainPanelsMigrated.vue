<script setup lang="ts">
import { GridLayout, GridItem } from 'grid-layout-plus'
import { onMounted, ref, watch, onUnmounted } from 'vue'
import EnhancedPanelComponentMigrated from './EnhancedPanelComponentMigrated.vue'
import TelescopePanelMigrated from './TelescopePanelMigrated.vue'
import CameraPanelMigrated from './CameraPanelMigrated.vue'
import { type UnifiedDevice } from '@/types/DeviceTypes'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import DiscoveredDevicesMigrated from './DiscoveredDevicesMigrated.vue'
import { UIMode } from '@/stores/useUIPreferencesStore'
import { useLayoutStore, type LayoutItem } from '@/stores/useLayoutStore'
import Icon from './Icon.vue'

// Extended LayoutItem interface to include type property
interface ExtendedLayoutItem extends LayoutItem {
  type?: string
}

// Use the layout store instead of local state
const layoutStore = useLayoutStore()
// Create a computed reference to the layout
const layout = ref(layoutStore.layout)

// Initialize UnifiedStore via Pinia
const store = useUnifiedStore()

const getComponent = function (lookupBy: ExtendedLayoutItem | UnifiedDevice) {
  // Check if deviceType exists and use it to determine the component
  const deviceType =
    lookupBy.deviceType?.toLowerCase() ||
    ('type' in lookupBy ? lookupBy.type?.toLowerCase() : undefined)

  if (deviceType === 'telescope') {
    return TelescopePanelMigrated
  }
  if (deviceType === 'camera') {
    return CameraPanelMigrated
  }

  return EnhancedPanelComponentMigrated
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

  // Add new device to layout
  const xPos = layout.value.length % 2 === 0 ? 0 : 6
  const yPos = Math.floor(layout.value.length / 2) * 20

  // Get the device's apiBaseUrl if available
  const deviceApiBaseUrl = (device.apiBaseUrl as string) || ''

  console.log('Adding new device to layout:', {
    deviceType: device.deviceType || device.type,
    deviceId: device.id,
    apiBaseUrl: deviceApiBaseUrl
  })

  layout.value.push({
    x: xPos,
    y: yPos,
    w: 6,
    h: 20,
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

function handleConnectionChanged(...args: unknown[]) {
  // Extract parameters based on how they are used
  const deviceId = args[0] as string
  const isConnected = args[1] as boolean

  // Find the device in the layout
  const layoutItem = layout.value.find((item: LayoutItem) => item.deviceId === deviceId)

  if (layoutItem) {
    // Update the connection state
    layoutItem.connected = isConnected
    // Update the layout
    layoutStore.updateLayout(layout.value)
  }
}

// Handle device updated event that contains connection state changes
function handleDeviceUpdated(...args: unknown[]) {
  const event = args[0] as { deviceId: string; updates: { isConnected?: boolean } }

  if (event && event.deviceId && event.updates && 'isConnected' in event.updates) {
    handleConnectionChanged(event.deviceId, !!event.updates.isConnected)
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

// Handle layout changes from the grid layout component
function onLayoutUpdate(newLayout: LayoutItem[]) {
  layoutStore.updateLayout(newLayout)
}

// Reset the layout to defaults
function resetLayout() {
  if (confirm('Are you sure you want to reset the layout? This will remove all panels.')) {
    layoutStore.resetLayout()
  }
}

// Save the current layout as a preset (placeholder for future preset functionality)
function saveLayoutPreset() {
  // We'll implement presets in a separate feature
  alert('Layout saved successfully!')
}

onMounted(() => {
  // Initialize the layout from saved layout if available
  layoutStore.initLayout()

  // Set up event listeners for device changes
  store.on('deviceAdded', handleDeviceAdded)
  store.on('deviceRemoved', handleDeviceRemoved)
  store.on('deviceUpdated', handleDeviceUpdated)
})

onUnmounted(() => {
  // Clean up event listeners
  store.off('deviceAdded', handleDeviceAdded)
  store.off('deviceRemoved', handleDeviceRemoved)
  store.off('deviceUpdated', handleDeviceUpdated)
})

function getPanelName(item: LayoutItem): string {
  if (item.deviceType) {
    return `${item.deviceType.charAt(0).toUpperCase() + item.deviceType.slice(1)} ${item.deviceNum || ''}`
  }
  return `Panel ${item.i}`
}

function getSupportedModes(): UIMode[] {
  // Only support overview and detailed modes for all panels
  return [UIMode.OVERVIEW, UIMode.DETAILED]
}

// Handle removing a panel
function removePanel(itemId: string) {
  layout.value = layout.value.filter((layoutItem: LayoutItem) => layoutItem.i !== itemId)
  layoutStore.updateLayout(layout.value)
}

// Handle panel connection state changes
function handleConnect(connected: boolean, itemId: string) {
  console.log(`Panel ${itemId} connection state changed to: ${connected}`)

  // Find the panel in the layout
  const panelItem = layout.value.find((item: LayoutItem) => item.i === itemId)

  if (panelItem && panelItem.deviceId) {
    // Update the connection state in the layout
    panelItem.connected = connected

    // Update the device connection state in the store
    // This will trigger the deviceConnectionChanged event which will update the layout
    if (connected) {
      store.connectDevice(panelItem.deviceId)
    } else {
      store.disconnectDevice(panelItem.deviceId)
    }

    // Save the updated layout
    layoutStore.updateLayout(layout.value)
  }
}
</script>

<template>
  <DiscoveredDevicesMigrated class="discovery-section" />

  <div class="layout-actions">
    <button class="layout-action-button" @click="resetLayout">
      <Icon type="close" />
      <span>Reset Layout</span>
    </button>
    <button class="layout-action-button" @click="saveLayoutPreset">
      <Icon type="gear" />
      <span>Save Layout</span>
    </button>
  </div>

  <div class="grid-container">
    <GridLayout v-model:layout="layout" :row-height="30" @update:layout="onLayoutUpdate">
      <GridItem
        v-for="item in layout"
        :key="item.i"
        :x="item.x"
        :y="item.y"
        :w="item.w"
        :h="item.h"
        :i="item.i"
        drag-allow-from=".vue-draggable-handle"
        drag-ignore-from=".no-drag"
      >
        <component
          :is="getComponent(item)"
          :connected="item.connected"
          :panel-name="getPanelName(item)"
          :device-type="item.deviceType"
          :device-id="String(item.deviceId || item.deviceNum || item.i)"
          :supported-modes="getSupportedModes()"
          :idx="item.i"
          :device-num="item.deviceNum"
          :api-base-url="item.apiBaseUrl"
          @close="removePanel(item.i)"
          @configure="() => {}"
          @connect="(connected: boolean) => handleConnect(connected, item.i)"
          @mounted="
            () =>
              console.log('Panel mounted with props:', {
                deviceId: item.deviceId,
                deviceNum: item.deviceNum,
                deviceType: item.deviceType,
                apiBaseUrl: item.apiBaseUrl
              })
          "
        ></component>
      </GridItem>
    </GridLayout>
  </div>
</template>

<style scoped>
.discovery-section {
  margin-bottom: 20px;
  background-color: var(--aw-panel-content-bg-color);
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid var(--aw-panel-border-color);
}

.layout-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.layout-action-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.layout-action-button:hover {
  background-color: var(--aw-panel-resize-bg-color);
  transform: translateY(-1px);
}

.layout-action-button:active {
  transform: translateY(0);
}

.grid-container {
  position: relative;
  overflow: visible;
}

.vgl-layout {
  background-color: var(--aw-panels-bg-color);
}

/* Style the grid items with proper rounded corners */
:deep(.vgl-item:not(.vgl-item--placeholder)) {
  background-color: var(--aw-panel-resize-bg-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 6px;
  overflow: hidden; /* Ensure children don't overflow the rounded corners */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

:deep(.vgl-item--resizing) {
  opacity: 90%;
}

:deep(.vgl-item--static) {
  background-color: var(--aw-panel-bg-color);
}

:deep(.vgl-item__resizer::before) {
  border-color: var(--aw-panel-resize-color);
}

/* Set the drag handle styling */
:deep(.vue-draggable-handle) {
  color: var(--aw-panel-menu-bar-color);
  cursor: move;
}

:deep(.panel-header) {
  cursor: move;
}

:deep(.no-drag) {
  text-align: left;
  position: relative;
  width: 100%;
  background-color: var(--aw-panel-content-bg-color);
  color: var(--aw-panel-content-color);
  scrollbar-color: var(--aw-panel-scrollbar-color-1) var(--aw-panel-scrollbar-color-2);
  overflow-y: auto;
}

/* Scrollbar styling */
:deep(.panel-content::-webkit-scrollbar) {
  width: 8px;
  height: 8px;
}

:deep(.panel-content::-webkit-scrollbar-track) {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

:deep(.panel-content::-webkit-scrollbar-thumb) {
  background: var(--aw-panel-scrollbar-color-1, #8b0000);
  border-radius: 4px;
}

:deep(.panel-content::-webkit-scrollbar-thumb:hover) {
  background: var(--aw-panel-scrollbar-color-2, #6b0000);
}

:deep(.panel-title *) {
  color: var(--aw-panel-menu-bar-color);
}
</style>
