// Status: Core View // This view implements the main panel layout system with: // - Grid-based layout using LayoutContainer // - Support for multiple
device panels // - Integration with layout store for persistence // - Proper responsive behavior

<script setup lang="ts">
import log from '@/plugins/logger'

import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useLayoutStore } from '@/stores/useLayoutStore'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import LayoutContainer from '@/components/layout/LayoutContainer.vue'
import type { GridLayoutDefinition, LayoutRow, LayoutCell as StoreLayoutCell } from '@/types/layouts/LayoutDefinition'
// import StaticLayoutChooser from '@/components/layout/StaticLayoutChooser.vue'
import Icon from '@/components/ui/Icon.vue'
import type { Component } from 'vue'

// Import the device component registry
import deviceComponentRegistry from '@/services/DeviceComponentRegistry'
import { panelRegistry, getOrCreatePanelInstance } from '@/services/DeviceComponentRegistry'

// Get stores and router
const layoutStore = useLayoutStore()
const unifiedStore = useUnifiedStore()
// const router = useRouter()
const route = useRoute()

// Layout ID to display - default to 'default'
const currentLayoutId = ref(layoutStore.currentLayoutId || 'default')

const showStaticLayoutChooser = ref(false)

const maximizedPanelId = ref<string | null>(null)

function isPanelMaximized(panelId: string): boolean {
  return maximizedPanelId.value === panelId
}

function toggleMaximizePanel(panelId: string) {
  maximizedPanelId.value = maximizedPanelId.value === panelId ? null : panelId
  nextTick(() => {
    window.dispatchEvent(new Event('resize'))
  })
}

const hasMaximizedPanel = computed(() => maximizedPanelId.value !== null)

// Watch for changes in the current layout in the store
watch(
  () => layoutStore.currentLayoutId,
  (newLayoutId) => {
    if (newLayoutId && newLayoutId !== currentLayoutId.value) {
      log.debug('PanelLayoutView - layoutStore.currentLayoutId changed to:', newLayoutId)
      currentLayoutId.value = newLayoutId

      // Force component re-render
      nextTick(() => {
        window.dispatchEvent(new Event('resize'))
      })
    }
  }
)

// Create a default layout if none exists
onMounted(() => {
  log.debug(
    'PanelLayoutView - onMounted - Current layouts in store:',
    layoutStore.layouts.map((l) => l.id)
  )
  log.debug(
    'PanelLayoutView - onMounted - Current grid layouts:',
    layoutStore.gridLayouts.map((l) => l.id)
  )
  log.debug('PanelLayoutView - onMounted - Current layout ID:', layoutStore.currentLayoutId)

  // Check if there's a layout parameter in the URL
  if (route.query.layout) {
    const layoutId = route.query.layout as string
    log.debug('PanelLayoutView - onMounted - Layout ID from URL:', layoutId)
    changeLayout(layoutId)
  }
})

// Updated with component registry integration
onMounted(() => {
  log.debug(
    'PanelLayoutView - onMounted - Current layouts in store:',
    layoutStore.layouts.map((l) => l.id)
  )
  log.debug(
    'PanelLayoutView - onMounted - Current grid layouts:',
    layoutStore.gridLayouts.map((l) => l.id)
  )
  log.debug('PanelLayoutView - onMounted - Current layout ID:', layoutStore.currentLayoutId)

  // Register all available devices with the component registry
  unifiedStore.devicesList.forEach((device) => {
    if (device.id && device.type) {
      deviceComponentRegistry.registerDevice(device.id, device.type)
      log.debug({ deviceIds: [device.id] }, `Registered device with registry: ${device.type} ${device.id}`)
    }
  })

  // Set up watcher for device list changes
  watch(
    () => unifiedStore.devicesList,
    (newDevices) => {
      // Register any new devices with the registry
      newDevices.forEach((device) => {
        if (device.id && device.type) {
          deviceComponentRegistry.registerDevice(device.id, device.type)
        }
      })
    },
    { deep: true }
  )

  // Check if there's a layout parameter in the URL
  if (route.query.layout) {
    const layoutId = route.query.layout as string
    log.debug('PanelLayoutView - onMounted - Layout ID from URL:', layoutId)
    changeLayout(layoutId)
  }
})

// Watch for route changes to update layout
watch(
  () => route.query.layout,
  (newLayoutId) => {
    if (newLayoutId) {
      changeLayout(newLayoutId as string)
    }
  }
)

// Compute current layout and viewport
const currentLayout = computed(() => layoutStore.currentLayout)
const currentDeviceLayout = computed(() => layoutStore.currentDeviceLayout)

// Map of device types to panels for those already connected
type DeviceTypeMap = {
  camera: string | null
  telescope: string | null
  focuser: string | null
  [key: string]: string | null
}

const deviceMap = ref<DeviceTypeMap>({
  camera: null,
  telescope: null,
  focuser: null
})

// Track cell-to-device assignments
const cellDeviceAssignments = ref<Record<string, string>>({})

// Track connection status for each cell
const cellConnectionStatus = ref<Record<string, boolean>>({})

// Track if a connection attempt is in progress for a cell
const cellConnectionAttemptStatus = ref<Record<string, boolean>>({})

// Computed property for watching only relevant device statuses (id and isConnected)
const relevantDeviceStatuses = computed(() =>
  unifiedStore.devicesList.map((device) => ({
    id: device.id,
    isConnected: device.isConnected
    // Add other properties here if the watcher below needs them, but aim for minimal set
  }))
)

function isDevicePanelAssigned(cellId: string): boolean {
  const assignment = cellPanelAssignments.value[cellId]
  return !!assignment && panelRegistry[assignment.panelType]?.type === 'device' && !!assignment.deviceId
}

function getDeviceConnectionStatus(cellId: string): boolean {
  const assignment = cellPanelAssignments.value[cellId]
  if (assignment && assignment.deviceId) {
    const device = unifiedStore.getDeviceById(assignment.deviceId)
    return !!device?.isConnected
  }
  return false
}

async function toggleCellConnection(cellId: string) {
  const assignment = cellPanelAssignments.value[cellId]
  if (!assignment || !assignment.deviceId || cellConnectionAttemptStatus.value[cellId]) return

  const device = unifiedStore.getDeviceById(assignment.deviceId)
  if (!device) {
    log.error({ deviceIds: [assignment.deviceId] }, `Device ${assignment.deviceId} not found for cell ${cellId}`)
    return
  }

  cellConnectionAttemptStatus.value[cellId] = true
  try {
    if (device.isConnected) {
      log.info({ deviceIds: [assignment.deviceId] }, `Disconnecting device ${assignment.deviceId} in cell ${cellId}`)
      await unifiedStore.disconnectDevice(assignment.deviceId)
      // No need to update cellConnectionStatus, it's now derived
      log.debug({ deviceIds: [assignment.deviceId] }, `Device ${assignment.deviceId} disconnected successfully in cell ${cellId}`)
    } else {
      log.info({ deviceIds: [assignment.deviceId] }, `Connecting device ${assignment.deviceId} in cell ${cellId}`)
      await unifiedStore.connectDevice(assignment.deviceId)
      log.debug({ deviceIds: [assignment.deviceId] }, `Device ${assignment.deviceId} connected successfully in cell ${cellId}`)
    }
  } catch (error) {
    log.error({ deviceIds: [assignment.deviceId] }, `Error toggling connection for device ${assignment.deviceId} in cell ${cellId}:`, error)
  } finally {
    cellConnectionAttemptStatus.value[cellId] = false
  }
}

// Watch for external changes to device connection statuses (Optimized)
watch(
  relevantDeviceStatuses,
  (currentDeviceStatuses /*, previousDeviceStatuses */) => {
    // The watcher now fires only if id or isConnected changes for any device, or if devices are added/removed.
    log.debug('PanelLayoutView - relevantDeviceStatuses changed, updating cell connection statuses.')

    currentDeviceStatuses.forEach((deviceStatus) => {
      // Iterate over cells to find which ones are assigned this device
      Object.entries(cellDeviceAssignments.value).forEach(([cellId, assignedDeviceId]) => {
        if (assignedDeviceId === deviceStatus.id) {
          // Check if the connection status for this cell needs an update
          if (cellConnectionStatus.value[cellId] !== deviceStatus.isConnected) {
            log.debug(
              { deviceIds: [deviceStatus.id] },
              `Updating connection status for cell ${cellId} (device ${deviceStatus.id}) to ${deviceStatus.isConnected}`
            )
            cellConnectionStatus.value[cellId] = deviceStatus.isConnected
          }
        }
      })
    })
    // Note: No need for { deep: true } on relevantDeviceStatuses if we are careful about how it's constructed.
    // Vue's default watcher for a computed property returning an array of objects will trigger if the array
    // reference changes or if items are added/removed. If isConnected mutates on an existing object within
    // devicesList and relevantDeviceStatuses.map creates new objects, the watcher will fire.
    // If devicesList itself is replaced, relevantDeviceStatuses recomputes, watcher fires.
    // If a device object within devicesList has its isConnected property mutated directly, AND
    // relevantDeviceStatuses.map re-uses existing device objects (it does not, it creates new ones),
    // then deep:true would be needed. But since .map creates new objects, it should be fine.
    // Let's keep deep: true for safety for now, as per the original optimization note,
    // but it might be removable if the store guarantees devicesList array itself is replaced on changes.
  },
  { deep: true, immediate: true }
)

// Get all available devices (not filtered by type)
const allAvailableDevices = computed(() => {
  return unifiedStore.devicesList.filter((d) => !!d.type)
})

// Change layout
const changeLayout = (layoutId: string) => {
  log.debug(`Attempting to change layout to: ${layoutId}`)

  // Check if the layout exists
  const layoutExists = layoutStore.layouts.some((layout) => layout.id === layoutId)

  if (layoutExists) {
    log.debug(`Layout ${layoutId} found, setting as current layout`)

    // Directly set the current layout without resetting first
    layoutStore.setCurrentLayout(layoutId)
    currentLayoutId.value = layoutId
    log.debug(`Layout changed to: ${layoutId}`)
  } else {
    log.warn(`Layout with ID ${layoutId} not found, using default layout`)
    if (layoutStore.layouts.length > 0) {
      // Use the first available layout if specified one doesn't exist
      const firstLayout = layoutStore.layouts[0]
      log.debug(`Falling back to first available layout: ${firstLayout.id}`)
      layoutStore.setCurrentLayout(firstLayout.id)
      currentLayoutId.value = firstLayout.id
    }
  }
}

// Now let's make sure the deviceType is propagated to the panel positions
// We need to add a function to ensure device types are passed correctly
const ensureDeviceTypesInPositions = () => {
  if (!currentDeviceLayout.value) return

  // For each panel position, set the deviceType from the corresponding grid cell
  if (layoutStore.currentGridLayout) {
    const gridRows = layoutStore.currentGridLayout.layouts[layoutStore.currentViewport].rows

    // Extract all cells from all rows
    const cells = gridRows.flatMap((row) => row.cells)

    // For each position, find the matching cell by ID and copy its deviceType
    currentDeviceLayout.value.positions.forEach((position) => {
      const matchingCell = cells.find((cell) => cell.id === position.panelId)
      if (matchingCell) {
        // Copy the deviceType from the cell to the position
        position.deviceType = matchingCell.deviceType || undefined
      }
    })
  }
}

// Watch for layout changes to apply the device type updates
watch(
  () => layoutStore.currentLayoutId,
  () => {
    // Wait for Vue to update the DOM
    nextTick(() => {
      ensureDeviceTypesInPositions()
    })
  }
)

// Also call it on mount to apply to current layout
onMounted(() => {
  nextTick(() => {
    ensureDeviceTypesInPositions()
  })
})

// Initialize cell device assignments when layout changes - optimized version
watch(
  () => currentLayoutId.value,
  () => {
    log.debug('LAYOUT CHANGE - Current Layout ID:', currentLayoutId.value)

    // Performance measurement
    const startTime = performance.now()

    // Wait for Vue to update the device layout
    nextTick(() => {
      // Initialize cell assignments from the layout if available
      if (currentDeviceLayout.value && currentDeviceLayout.value.positions) {
        const initialAssignments: Record<string, string> = {}

        // Initialize connection status for pre-assigned devices
        const initialConnectionStatus: Record<string, boolean> = {}
        const initialAttemptStatus: Record<string, boolean> = {}

        // Process layout positions and determine assignments
        currentDeviceLayout.value.positions.forEach((position) => {
          if (position.deviceType && position.panelId) {
            const cellId = position.panelId
            const deviceType = position.deviceType.toLowerCase()

            // Try existing assignment first
            const existingDeviceId = cellDeviceAssignments.value[cellId]
            const existingDevice = existingDeviceId ? unifiedStore.getDeviceById(existingDeviceId) : null

            if (existingDeviceId && existingDevice) {
              // Keep existing assignment if device still exists
              initialAssignments[cellId] = existingDeviceId
              initialConnectionStatus[cellId] = existingDevice.isConnected
              initialAttemptStatus[cellId] = false
            }
            // Otherwise use deviceMap for consistent device selection by type
            else if (deviceType in deviceMap.value && deviceMap.value[deviceType]) {
              initialAssignments[cellId] = deviceMap.value[deviceType]!
              const mappedDevice = unifiedStore.getDeviceById(deviceMap.value[deviceType]!)
              initialConnectionStatus[cellId] = mappedDevice?.isConnected || false
              initialAttemptStatus[cellId] = false
            }
            // If no device of this type is selected, find a suitable one
            else {
              const matchingDevice = unifiedStore.devicesList.find((d) => d.type?.toLowerCase() === deviceType && d.isConnected)

              if (matchingDevice) {
                initialAssignments[cellId] = matchingDevice.id
                deviceMap.value[deviceType] = matchingDevice.id
                initialConnectionStatus[cellId] = matchingDevice.isConnected
                initialAttemptStatus[cellId] = false
              }
            }
          }
        })

        // Update cell assignments and register with component registry
        Object.entries(initialAssignments).forEach(([cellId, deviceId]) => {
          cellDeviceAssignments.value[cellId] = deviceId

          const device = unifiedStore.getDeviceById(deviceId)
          if (device?.type) {
            deviceComponentRegistry.assignToCell(deviceId, device.type, cellId)
          }
        })

        // Batch update connection statuses
        Object.assign(cellConnectionStatus.value, initialConnectionStatus)
        Object.assign(cellConnectionAttemptStatus.value, initialAttemptStatus)

        // Log performance metrics after layout change is complete
        const layoutChangeTime = performance.now() - startTime
        log.debug(`Layout change to ${currentLayoutId.value} took ${layoutChangeTime.toFixed(2)}ms`)

        // Log component registry metrics to monitor performance
        deviceComponentRegistry.logPerformanceMetrics()
      }
    })
  },
  { immediate: true }
)

const devicePanelTypes = Object.entries(panelRegistry)
  .filter(([_, entry]) => entry.type === 'device')
  .map(([key, entry]) => ({ key, label: entry.label }))

const utilityPanelTypes = Object.entries(panelRegistry)
  .filter(([_, entry]) => entry.type === 'utility')
  .map(([key, entry]) => ({ key, label: entry.label }))

interface DeviceOption {
  panel: { key: string; label: string }
  device: { id: string; name: string; type: string }
}

const devicePanelOptions = computed(() => {
  const options: DeviceOption[] = []
  devicePanelTypes.forEach((panel) => {
    allAvailableDevices.value
      .filter((d) => d.type === panel.key)
      .forEach((device) => {
        options.push({ panel, device })
      })
  })
  return options
})

const cellPanelAssignments = ref<Record<string, { panelType: string; deviceId?: string }>>({})

function onPanelAssignmentChange(cellId: string, event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (value) {
    cellPanelAssignments.value[cellId] = JSON.parse(value)
  } else {
    delete cellPanelAssignments.value[cellId]
  }
}

function getPanelAssignment(cellId: string) {
  const assignment = cellPanelAssignments.value[cellId]
  return assignment ? JSON.stringify(assignment) : ''
}

function getPanelProps(assignment: { panelType: string; deviceId?: string }) {
  const entry = panelRegistry[assignment.panelType]
  if (entry && entry.type === 'device' && assignment.deviceId) {
    const device = unifiedStore.getDeviceById(assignment.deviceId)
    return {
      deviceId: assignment.deviceId,
      isConnected: device?.isConnected ?? false
    }
  }
  // Utility panels get no device props
  return {}
}

function getPanelComponentForCell(cellId: string): Component | null {
  const assignment = cellPanelAssignments.value[cellId]
  if (!assignment) return null
  return getOrCreatePanelInstance(cellId, assignment.panelType).component
}

function getPanelHeaderContext(cellId: string) {
  const assignment = cellPanelAssignments.value[cellId]
  if (!assignment) return { isDevice: false, label: '', device: null, connectionInfo: '' }

  const entry = panelRegistry[assignment.panelType]
  if (!entry) return { isDevice: false, label: '', device: null, connectionInfo: '' }

  if (entry.type === 'device' && assignment.deviceId) {
    const device = unifiedStore.getDeviceById(assignment.deviceId)
    let connectionInfo = ''
    if (device) {
      const ipAddress = device.ipAddress || device.address || ''
      const port = device.properties?.alpacaPort || device.port || ''
      const deviceNumber = device.deviceNum?.toString()

      if (ipAddress && port) {
        if (connectionInfo) connectionInfo += ' - '
        connectionInfo += `${ipAddress}:${port}`
      }
      if (deviceNumber) connectionInfo += ` | ${device.type}:${deviceNumber}`
    }
    return {
      isDevice: true,
      label: device?.name || entry.label,
      device,
      connectionInfo
    }
  }
  // Utility panel
  return {
    isDevice: false,
    label: entry.label,
    device: null,
    connectionInfo: ''
  }
}
</script>

<template>
  <div class="panel-layout-view">
    <div v-if="currentLayout && currentDeviceLayout" class="layout-wrapper">
      <LayoutContainer :layout-id="currentLayoutId" :class="{ 'has-maximized-panel': hasMaximizedPanel }">
        <!-- Dynamic Cell Slots - Generic device renderer -->
        <template v-for="i in 6" :key="`cell-${i}`" #[`cell-${i}`]="{ position }">
          <div
            v-if="position"
            :id="`panel-${position.panelId}`"
            class="universal-panel-container"
            :class="{
              maximized: isPanelMaximized(position.panelId),
              'hidden-panel': hasMaximizedPanel && !isPanelMaximized(position.panelId)
            }"
          >
            <div class="panel-header">
              <div class="panel-title">
                <div style="display: flex; align-items: center; gap: 0.5em">
                  <span
                    v-if="getPanelHeaderContext(position.panelId).isDevice"
                    :title="getPanelHeaderContext(position.panelId).device?.isConnected ? 'Connected' : 'Disconnected'"
                    :aria-label="getPanelHeaderContext(position.panelId).device?.isConnected ? 'Device connected' : 'Device disconnected'"
                    :style="{
                      display: 'inline-block',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: getPanelHeaderContext(position.panelId).device?.isConnected
                        ? 'var(--aw-success-color)'
                        : 'var(--aw-error-color)',
                      border: '1px solid var(--aw-panel-border-color)'
                    }"
                  ></span>
                  <h3 style="margin: 0">
                    {{ getPanelHeaderContext(position.panelId).label }}
                  </h3>
                  <div
                    v-if="getPanelHeaderContext(position.panelId).isDevice && getPanelHeaderContext(position.panelId).connectionInfo"
                    class="connection-info"
                  >
                    {{ getPanelHeaderContext(position.panelId).connectionInfo }}
                  </div>
                </div>
              </div>

              <div class="header-controls">
                <!-- Toggle maximize button with different icon based on state -->
                <button
                  class="maximize-panel-btn"
                  :title="isPanelMaximized(position.panelId) ? 'Restore panel' : 'Maximize panel'"
                  :aria-label="isPanelMaximized(position.panelId) ? 'Restore panel' : 'Maximize panel'"
                  @click="toggleMaximizePanel(position.panelId)"
                >
                  <Icon :type="isPanelMaximized(position.panelId) ? 'arrows-minimize' : 'arrows-maximize'" size="16" />
                </button>

                <!-- Connect/Disconnect Button -->
                <button
                  v-if="isDevicePanelAssigned(position.panelId)"
                  class="connect-disconnect-btn"
                  :class="{
                    connected: getDeviceConnectionStatus(position.panelId),
                    disconnected: !getDeviceConnectionStatus(position.panelId),
                    connecting: cellConnectionAttemptStatus[position.panelId]
                  }"
                  :disabled="cellConnectionAttemptStatus[position.panelId]"
                  :title="getDeviceConnectionStatus(position.panelId) ? 'Disconnect device' : 'Connect device'"
                  :aria-label="getDeviceConnectionStatus(position.panelId) ? 'Disconnect device' : 'Connect device'"
                  @click="toggleCellConnection(position.panelId)"
                >
                  {{ cellConnectionAttemptStatus[position.panelId] ? '...' : getDeviceConnectionStatus(position.panelId) ? 'Disconnect' : 'Connect' }}
                </button>

                <!-- Universal device selector dropdown with proper event typing -->
                <select
                  :value="getPanelAssignment(position.panelId)"
                  class="device-selector-dropdown"
                  @change="(event: Event) => onPanelAssignmentChange(position.panelId, event)"
                >
                  <optgroup label="Devices">
                    <option
                      v-for="opt in devicePanelOptions"
                      :key="opt.panel.key + '-' + opt.device.id"
                      :value="JSON.stringify({ panelType: opt.panel.key, deviceId: opt.device.id })"
                    >
                      {{ opt.panel.label }}: {{ opt.device.name }}
                    </option>
                  </optgroup>
                  <optgroup label="Utility Panels">
                    <option v-for="panel in utilityPanelTypes" :key="panel.key" :value="JSON.stringify({ panelType: panel.key })">
                      {{ panel.label }}
                    </option>
                  </optgroup>
                </select>
              </div>
            </div>

            <div class="panel-content">
              <template v-if="cellPanelAssignments[position.panelId]">
                <keep-alive>
                  <component
                    :is="getPanelComponentForCell(position.panelId)"
                    v-bind="getPanelProps(cellPanelAssignments[position.panelId])"
                    :key="position.panelId + '-' + (cellPanelAssignments[position.panelId]?.deviceId || '')"
                  />
                </keep-alive>
              </template>
              <div v-else class="empty-panel-state">
                <p>No panel selected.</p>
              </div>
            </div>
          </div>
        </template>
      </LayoutContainer>
    </div>

    <div v-else class="no-layout">
      <p>No layout configured. Select a layout to continue.</p>
    </div>
  </div>
</template>

<style scoped>
.panel-layout-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.layout-wrapper {
  flex: 1;
  overflow: auto;
  position: relative;
}

/* Panel maximization styles */
.has-maximized-panel {
  position: relative;
}

.universal-panel-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  transition: all 0.3s ease;
}

.universal-panel-container.maximized {
  position: fixed !important;
  inset: 0 !important;
  z-index: 1000 !important;
  width: 100% !important;
  height: 100% !important;
  background-color: var(--aw-panel-bg-color);
}

.hidden-panel {
  opacity: 0.1;
  pointer-events: none;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--aw-panel-header-bg-color);
  padding: 8px;
  /* stylelint-disable-next-line */
  border-bottom: 1px solid var(--aw-panel-border-color);

  /* height: 51px; */
}

.panel-title {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header h3 {
  margin: 0;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--aw-panel-header-text-color);
  text-shadow: 1px 1px 2px var(--aw-color-black-40);
}

.connection-info {
  font-size: 0.7rem;
  color: var(--aw-panel-header-text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 1px 1px 2px var(--aw-color-black-40);
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.maximize-panel-btn,
.minimize-panel-btn {
  background: transparent;
  border: none;
  color: var(--aw-panel-header-text-color);
  cursor: pointer;
  font-size: 1rem;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--aw-border-radius-sm);
}

.maximize-panel-btn:hover,
.minimize-panel-btn:hover {
  background-color: var(--aw-panel-hover-bg-color);
}

.device-selector-dropdown {
  background-color: var(--aw-panel-content-bg-color);
  color: var(--aw-text-color);
  /* stylelint-disable-next-line */
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-sm);
  padding: 4px;
  font-size: 0.8rem;
  max-width: 180px;
}

.panel-content {
  flex: 1;
  overflow: auto;
}

.no-layout {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: var(--aw-text-color);
  font-size: 1.2rem;
  opacity: 0.7;
  padding: 2rem;
  text-align: center;
  gap: 1rem;
}

.create-layout-btn {
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
  background-color: var(--aw-button-bg-color);
  color: var(--aw-text-color);
  /* stylelint-disable-next-line */
  border: 1px solid var(--aw-border-color);
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: all 0.2s ease;
}

.create-layout-btn:hover {
  background-color: var(--aw-button-hover-bg-color);
  border-color: var(--aw-primary-color);
}

@media (width <= 768px) {
  .panel-layout-view {
    padding-bottom: 0.5rem;
  }
}

.panel-layout-controls {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: var(--aw-spacing-sm) var(--aw-spacing-md);
  background-color: var(--aw-secondary-bg-color);
  /* stylelint-disable-next-line */
  border-bottom: 1px solid var(--aw-border-color);
}

.toggle-panel-btn {
  background-color: var(--aw-primary-color);
  color: var(--aw-button-primary-text);
  border: none;
  border-radius: var(--aw-border-radius-sm);
  padding: calc(var(--aw-spacing-xs) * 1.5) calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
  cursor: pointer;
  font-size: 0.9rem;
}

.toggle-panel-btn:hover {
  background-color: var(--aw-primary-hover-color);
}

/* Hybrid panel styles */
.hybrid-panel {
  padding: 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.hybrid-cell-1 {
  /* stylelint-disable-next-line */
  background-color: rgb(66 135 245 / 15%);
  /* stylelint-disable-next-line */
  border-left: 4px solid rgb(66 135 245);
}

.hybrid-cell-2 {
  /* stylelint-disable-next-line */
  background-color: rgb(77 175 124 / 15%);
  /* stylelint-disable-next-line */
  border-left: 4px solid rgb(77 175 124);
}

.hybrid-cell-3 {
  /* stylelint-disable-next-line */
  background-color: rgb(255 159 67 / 15%);
  /* stylelint-disable-next-line */
  border-left: 4px solid rgb(255 159 67);
}

.panel-coordinates {
  margin-top: auto;
  font-size: 0.8rem;
  color: var(--aw-text-secondary-color);
}

.empty-panel-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 1rem;
  color: var(--aw-text-secondary-color);
  text-align: center;
}

.select-layout-btn {
  background-color: var(--aw-primary-color);
  color: var(--aw-button-primary-text);
  border: none;
  border-radius: var(--aw-border-radius-sm);
  padding: var(--aw-spacing-sm) var(--aw-spacing-md);
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.select-layout-btn:hover {
  background-color: var(--aw-primary-hover-color);
}

.static-layout-modal {
  position: fixed;
  inset: 0;
  /* stylelint-disable-next-line */
  background-color: rgb(0 0 0 / 70%);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.static-layout-modal-content {
  background-color: var(--aw-panel-bg-color);
  border-radius: var(--aw-border-radius-md);
  max-width: 90%;
  max-height: 90%;
  overflow: auto;
  position: relative;
  box-shadow: var(--aw-shadow-md);
}

.close-modal-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background-color: transparent;
  border: none;
  color: var(--aw-text-color);
  font-size: 1.5rem;
  cursor: pointer;
  z-index: 10;
}

.close-modal-btn:hover {
  color: var(--aw-primary-color);
}

.loading-device {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--aw-text-secondary-color);
}

.panel-device-type {
  font-size: 0.9rem;
  margin: 8px 0;
  color: var(--aw-text-color);
}

.panel-tip {
  font-size: 0.8rem;
  margin-top: 12px;
  color: var(--aw-text-secondary-color);
  font-style: italic;
}

.connect-disconnect-btn {
  padding: var(--aw-spacing-xs) var(--aw-spacing-sm);
  /* stylelint-disable-next-line */
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
  font-size: 0.8rem;
  min-width: 80px; /* Ensure consistent width */
  text-align: center;
}

.connect-disconnect-btn.connected {
  background-color: var(--aw-error-color);
  color: var(--aw-button-danger-text);
}

.connect-disconnect-btn.disconnected {
  background-color: var(--aw-success-color);
  color: var(--aw-button-success-text);
}

.connect-disconnect-btn.connecting {
  background-color: var(--aw-panel-content-bg-color);
  color: var(--aw-text-secondary-color);
  cursor: wait;
}

@media (width <= 600px) {
  .panel-header {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .header-controls {
    flex-wrap: wrap;
    justify-content: flex-start;
    gap: 8px 4px;
  }

  .panel-title {
    margin-bottom: 4px;
  }
}
</style>
