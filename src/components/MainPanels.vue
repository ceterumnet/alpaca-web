<script setup lang="ts">
import { GridLayout, GridItem } from 'grid-layout-plus'
import { onMounted, ref, watch } from 'vue'
import EnhancedPanelComponentMigrated from './EnhancedPanelComponentMigrated.vue'
import TelescopePanelMigrated from './TelescopePanelMigrated.vue'
import CameraPanelMigrated from './CameraPanelMigrated.vue'
import { type Device } from '@/types/Device'
import { getLegacyDevicesAdapter } from '@/stores/deviceStoreAdapter'
import DiscoveredDevices from './DiscoveredDevices.vue'
import { UIMode } from '@/stores/useUIPreferencesStore'
import { useLayoutStore, type LayoutItem } from '@/stores/useLayoutStore'
import Icon from './Icon.vue'

// Use the layout store instead of local state
const layoutStore = useLayoutStore()
// Create a computed reference to the layout
const layout = ref(layoutStore.layout)

const getComponent = function (lookupBy: LayoutItem | Device) {
  // Check if deviceType exists and use it to determine the component
  if (lookupBy.deviceType) {
    const deviceType = lookupBy.deviceType.toLowerCase()
    if (deviceType === 'telescope') {
      return TelescopePanelMigrated
    }
    if (deviceType === 'camera') {
      return CameraPanelMigrated
    }
  }
  return EnhancedPanelComponentMigrated
}

// Use the adapter for compatibility with existing code
const deviceStore = getLegacyDevicesAdapter()

// Watch for changes in the devices store and update layout accordingly
watch(
  () => deviceStore.devices,
  (newDevices) => {
    if (!newDevices.length) return

    // Filter for devices not already in layout
    const devicesToAdd = newDevices.filter((device) => {
      return !layout.value.some(
        (item: LayoutItem) =>
          item.deviceType?.toLowerCase() === device.deviceType.toLowerCase() &&
          item.deviceNum === device.idx
      )
    })

    // Add new devices to layout
    let devicesAdded = 0
    for (const device of devicesToAdd) {
      const xPos = devicesAdded % 2 === 0 ? 0 : 6
      const yPos = Math.floor(devicesAdded / 2) * 20
      devicesAdded++

      // Get the device's apiBaseUrl
      const deviceApiBaseUrl = (device as Device & { apiBaseUrl?: string }).apiBaseUrl || ''

      // Get the device's ID if available (from the UnifiedStore)
      const deviceId = (device as Device & { id?: string }).id || ''

      console.log('Adding new device to layout:', {
        deviceType: device.deviceType,
        deviceNum: device.idx,
        deviceId,
        apiBaseUrl: deviceApiBaseUrl
      })

      layout.value.push({
        x: xPos,
        y: yPos,
        w: 6,
        h: 20,
        i: `${device.deviceType}-${device.idx}`,
        deviceNum: device.idx,
        deviceType: device.deviceType,
        deviceId: deviceId, // Store the UUID
        connected: device.connected || false,
        apiBaseUrl: deviceApiBaseUrl
      })
    }

    // Update the store with the new layout
    layoutStore.updateLayout(layout.value)
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
  // Try to initialize from saved layout first
  layoutStore.initLayout()
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
