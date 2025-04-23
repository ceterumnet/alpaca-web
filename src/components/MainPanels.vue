<script setup lang="ts">
import { GridLayout, GridItem } from 'grid-layout-plus'
import { onMounted, reactive, ref, watch } from 'vue'
import EnhancedPanelComponent from './EnhancedPanelComponent.vue'
import TelescopePanel from './TelescopePanel.vue'
import EnhancedTelescopePanel from './EnhancedTelescopePanel.vue'
import CameraPanel from './CameraPanel.vue'
import EnhancedCameraPanel from './EnhancedCameraPanel.vue'
import { DeviceFactory, type Device } from '@/types/Device'
import LoggerPanel from './LoggerPanel.vue'
import { useDevicesStore } from '@/stores/useDevicesStore'
import { useDiscoveredDevicesStore } from '@/stores/useDiscoveredDevicesStore'
import DiscoveredDevices from './DiscoveredDevices.vue'
import { UIMode } from '@/stores/useUIPreferencesStore'
import { useLayoutStore, type LayoutItem } from '@/stores/useLayoutStore'
import Icon from './Icon.vue'

// Use the layout store instead of local state
const layoutStore = useLayoutStore()
// Create a computed reference to the layout
const layout = ref(layoutStore.layout)

// Flag to track if a logger panel is added
const loggerPanelAdded = ref(false)

function isDevice(obj: Device | object): obj is Device {
  return (obj as Device).deviceType !== undefined
}

const getComponent = function (lookupBy: LayoutItem | Device) {
  // Check if deviceType exists and use it to determine the component
  if (lookupBy.deviceType) {
    const deviceType = lookupBy.deviceType.toLowerCase()
    if (deviceType === 'telescope') {
      return EnhancedTelescopePanel
    }
    if (deviceType === 'camera') {
      return EnhancedCameraPanel
    }
    if (deviceType === 'logger') {
      return LoggerPanel
    }
  }
  return EnhancedPanelComponent
}

// Add a logger panel if it doesn't exist
function addLoggerPanel() {
  if (!loggerPanelAdded.value) {
    layout.value.push({
      x: 0,
      y: Math.max(...layout.value.map((item: any) => item.y + item.h), 0),
      w: 12,
      h: 8,
      i: 'logger',
      deviceType: 'logger',
      static: false,
      connected: false
    })
    layoutStore.updateLayout(layout.value)
    loggerPanelAdded.value = true
  }
}

const deviceStore = useDevicesStore()
const discoveredDevicesStore = useDiscoveredDevicesStore()

// Watch for changes in the devices store and update layout accordingly
watch(
  () => deviceStore.devices,
  (newDevices) => {
    if (!newDevices.length) return

    // Filter for devices not already in layout
    const devicesToAdd = newDevices.filter((device) => {
      return !layout.value.some(
        (item: any) =>
          item.deviceType?.toLowerCase() === device.deviceType.toLowerCase() &&
          item.deviceNum === device.idx
      )
    })

    // Add new devices to layout
    let devicesAdded = 0
    for (const device of devicesToAdd) {
      let xPos = devicesAdded % 2 === 0 ? 0 : 6
      let yPos = Math.floor(devicesAdded / 2) * 20
      devicesAdded++

      layout.value.push({
        x: xPos,
        y: yPos,
        w: 6,
        h: 20,
        i: `${device.deviceType}-${device.idx}`,
        deviceNum: device.idx,
        deviceType: device.deviceType,
        connected: device.connected || false,
        apiBaseUrl: (device as any).apiBaseUrl || ''
      })
    }

    // Update the store with the new layout
    layoutStore.updateLayout(layout.value)

    // If we added devices and there's no logger panel, add one
    if (devicesAdded > 0) {
      addLoggerPanel()
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
    // Make sure we have the logger panel at minimum
    addLoggerPanel()
  }
}

// Save the current layout as a preset (placeholder for future preset functionality)
function saveLayoutPreset() {
  // We'll implement presets in a separate feature
  alert('Layout saved successfully!')
}

onMounted(() => {
  // Try to initialize from saved layout first
  const hasLoadedLayout = layoutStore.initLayout()

  // If no saved layout, create default layout
  if (!hasLoadedLayout) {
    // Add a logger panel at startup if needed
    addLoggerPanel()
  } else {
    // Check if the loaded layout has a logger panel
    loggerPanelAdded.value = layout.value.some((item) => item.deviceType === 'logger')
    if (!loggerPanelAdded.value) {
      addLoggerPanel()
    }
  }
})

function getPanelName(item: any): string {
  if (item.deviceType) {
    return `${item.deviceType.charAt(0).toUpperCase() + item.deviceType.slice(1)} ${item.deviceNum || ''}`
  }
  return `Panel ${item.i}`
}

function getSupportedModes(item: any): UIMode[] {
  // Default modes for all panels
  const modes = [UIMode.OVERVIEW, UIMode.DETAILED]

  // Add fullscreen mode for certain device types
  if (['camera', 'telescope'].includes(item.deviceType?.toLowerCase())) {
    modes.push(UIMode.FULLSCREEN)
  }

  return modes
}

// Handle removing a panel
function removePanel(itemId: string) {
  layout.value = layout.value.filter((layoutItem: any) => layoutItem.i !== itemId)
  layoutStore.updateLayout(layout.value)
}

// Handle panel connection state changes
function handleConnect(connected: boolean, itemId: string) {
  console.log(`Panel ${itemId} connection state changed to: ${connected}`)
  // Find the panel in the layout
  const panelItem = layout.value.find((item: any) => item.i === itemId)
  if (panelItem) {
    // Update the connection state
    panelItem.connected = connected
    // Save the updated layout
    layoutStore.updateLayout(layout.value)
  }
}
</script>

<template>
  <DiscoveredDevices class="discovery-section" />

  <div class="layout-actions">
    <button class="layout-action-button" @click="resetLayout">
      <Icon type="close" />
      <span>Reset Layout</span>
    </button>
    <button class="layout-action-button" @click="saveLayoutPreset">
      <Icon type="files" />
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
          :device-id="item.deviceNum || item.i"
          :supported-modes="getSupportedModes(item)"
          :idx="item.i"
          :device-num="item.deviceNum"
          :api-base-url="item.apiBaseUrl"
          @close="removePanel(item.i)"
          @configure="() => {}"
          @connect="(connected) => handleConnect(connected, item.i)"
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

:deep(.vgl-item:not(.vgl-item--placeholder)) {
  background-color: var(--aw-panel-resize-bg-color);
  border: 1px solid var(--aw-panel-border-color);
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

/* This styling was for the old panel structure, but causes issues with EnhancedPanelComponent */
/* We'll set the drag handle differently for EnhancedPanelComponent */
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
  top: 20px;
  width: 100%;
  height: calc(100% - 33px);
  background-color: var(--aw-panel-content-bg-color);
  color: var(--aw-panel-content-color);
  scrollbar-color: var(--aw-panel-scrollbar-color-1) var(--aw-panel-scrollbar-color-2);
  overflow-y: scroll;
}

:deep(.panel-title *) {
  color: var(--aw-panel-menu-bar-color);
}
</style>
