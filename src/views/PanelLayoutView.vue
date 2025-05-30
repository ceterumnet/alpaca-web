// Status: Core View 
// This view implements the main panel layout system with: 
// - Grid-based layout using LayoutContainer 
// - Support for multiple device panels 
// - Integration with layout store for persistence 
// - Proper responsive behavior

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

// Import the device component registry
import deviceComponentRegistry from '@/services/DeviceComponentRegistry'

// Get stores and router
const layoutStore = useLayoutStore()
const unifiedStore = useUnifiedStore()
const router = useRouter()
const route = useRoute()

// Layout ID to display - default to 'default'
const currentLayoutId = ref(layoutStore.currentLayoutId || 'default')

const showStaticLayoutChooser = ref(false)

// Computed prop to check if any panel is maximized
const hasMaximizedPanel = computed(() => {
  return deviceComponentRegistry.hasMaximizedPanel()
})

// Function to toggle panel maximization using the registry
const toggleMaximizePanel = (panelId: string) => {
  // Find the device assigned to this cell
  const deviceRef = deviceComponentRegistry.getDeviceForCell(panelId)
  
  if (!deviceRef) {
    log.warn(`No device found for panel ${panelId}, cannot maximize`)
    return
  }
  
  // Check if this panel is already maximized
  const isCurrentlyMaximized = deviceRef.isMaximized
  
  // Toggle maximized state using the registry
  deviceComponentRegistry.setMaximized(deviceRef.id, deviceRef.type, !isCurrentlyMaximized)
  
  // Force a layout recalculation after toggling
  nextTick(() => {
    window.dispatchEvent(new Event('resize'))
  })
}

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
  log.debug('PanelLayoutView - onMounted - Current layouts in store:', layoutStore.layouts.map(l => l.id))
  log.debug('PanelLayoutView - onMounted - Current grid layouts:', layoutStore.gridLayouts.map(l => l.id))
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
  log.debug('PanelLayoutView - onMounted - Current layouts in store:', layoutStore.layouts.map(l => l.id))
  log.debug('PanelLayoutView - onMounted - Current grid layouts:', layoutStore.gridLayouts.map(l => l.id))
  log.debug('PanelLayoutView - onMounted - Current layout ID:', layoutStore.currentLayoutId)
  
  // Register all available devices with the component registry
  unifiedStore.devicesList.forEach(device => {
    if (device.id && device.type) {
      deviceComponentRegistry.registerDevice(device.id, device.type);
      log.debug({deviceIds: [device.id]}, `Registered device with registry: ${device.type} ${device.id}`);
    }
  });
  
  // Set up watcher for device list changes
  watch(() => unifiedStore.devicesList, (newDevices) => {
    // Register any new devices with the registry
    newDevices.forEach(device => {
      if (device.id && device.type) {
        deviceComponentRegistry.registerDevice(device.id, device.type);
      }
    });
  }, { deep: true });
  
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
const cellDeviceAssignments = ref<Record<string, string>>({});

// Track connection status for each cell
const cellConnectionStatus = ref<Record<string, boolean>>({});

// Track if a connection attempt is in progress for a cell
const cellConnectionAttemptStatus = ref<Record<string, boolean>>({});

// Computed property for watching only relevant device statuses (id and isConnected)
const relevantDeviceStatuses = computed(() => 
  unifiedStore.devicesList.map(device => ({
    id: device.id,
    isConnected: device.isConnected
    // Add other properties here if the watcher below needs them, but aim for minimal set
  }))
);

// Handle device selection for a specific cell
const assignDeviceToCell = (cellId: string, deviceId: string) => {
  log.debug({deviceIds: [deviceId]}, `Assigning device ${deviceId} to cell ${cellId}`);
  
  // Performance measurement
  const startTime = performance.now();
  
  // Update cell assignment
  cellDeviceAssignments.value[cellId] = deviceId;
  
  // Initialize connection status for the cell
  if (deviceId) {
    const device = unifiedStore.getDeviceById(deviceId);
    cellConnectionStatus.value[cellId] = device?.isConnected || false;
    cellConnectionAttemptStatus.value[cellId] = false; // Reset attempt status
  } else {
    delete cellConnectionStatus.value[cellId];
    delete cellConnectionAttemptStatus.value[cellId];
  }
  
  // Get device type to update the deviceMap
  if (deviceId) {
    const device = unifiedStore.getDeviceById(deviceId);
    if (device && device.type) {
      const deviceType = device.type.toLowerCase();
      
      // Update deviceMap to maintain device selection by type
      log.debug({deviceIds: [deviceId]}, `Updating deviceMap: ${deviceType} -> ${deviceId}`);
      deviceMap.value[deviceType] = deviceId;
      
      // Register with component registry to ensure state preservation
      deviceComponentRegistry.assignToCell(deviceId, deviceType, cellId);
    }
  } else {
    // If removing a device, clear the component registry assignment
    const currentDevice = deviceComponentRegistry.getDeviceForCell(cellId);
    if (currentDevice) {
      deviceComponentRegistry.assignToCell(currentDevice.id, currentDevice.type, '');
    }
  }
  
  // Log performance of the operation
  const assignmentTime = performance.now() - startTime;
  log.debug({cellId}, `Device assignment to cell ${cellId} took ${assignmentTime.toFixed(2)}ms`);
};

// Toggle connection for a device in a cell
const toggleCellConnection = async (cellId: string) => {
  const deviceId = cellDeviceAssignments.value[cellId];
  if (!deviceId || cellConnectionAttemptStatus.value[cellId]) return;

  const device = unifiedStore.getDeviceById(deviceId);
  if (!device) {
    log.error({deviceIds: [deviceId]}, `Device ${deviceId} not found for cell ${cellId}`);
    return;
  }

  cellConnectionAttemptStatus.value[cellId] = true;
  try {
    if (device.isConnected) {
      log.info({deviceIds: [deviceId]}, `Disconnecting device ${deviceId} in cell ${cellId}`);
      await unifiedStore.disconnectDevice(deviceId);
      cellConnectionStatus.value[cellId] = false;
      log.debug({deviceIds: [deviceId]}, `Device ${deviceId} disconnected successfully in cell ${cellId}`);
    } else {
      log.info({deviceIds: [deviceId]}, `Connecting device ${deviceId} in cell ${cellId}`);
      await unifiedStore.connectDevice(deviceId);
      cellConnectionStatus.value[cellId] = true;
      log.debug({deviceIds: [deviceId]}, `Device ${deviceId} connected successfully in cell ${cellId}`);
    }
  } catch (error) {
    log.error({deviceIds: [deviceId]}, `Error toggling connection for device ${deviceId} in cell ${cellId}:`, error);
    // Revert status on error if needed, or rely on watcher
    const updatedDevice = unifiedStore.getDeviceById(deviceId);
    cellConnectionStatus.value[cellId] = updatedDevice?.isConnected || false;
  } finally {
    cellConnectionAttemptStatus.value[cellId] = false;
  }
};

// Watch for external changes to device connection statuses (Optimized)
watch(relevantDeviceStatuses, (currentDeviceStatuses /*, previousDeviceStatuses */) => {
  // The watcher now fires only if id or isConnected changes for any device, or if devices are added/removed.
  log.debug('PanelLayoutView - relevantDeviceStatuses changed, updating cell connection statuses.');
  
  currentDeviceStatuses.forEach(deviceStatus => {
    // Iterate over cells to find which ones are assigned this device
    Object.entries(cellDeviceAssignments.value).forEach(([cellId, assignedDeviceId]) => {
      if (assignedDeviceId === deviceStatus.id) {
        // Check if the connection status for this cell needs an update
        if (cellConnectionStatus.value[cellId] !== deviceStatus.isConnected) {
          log.debug({deviceIds: [deviceStatus.id]}, `Updating connection status for cell ${cellId} (device ${deviceStatus.id}) to ${deviceStatus.isConnected}`);
          cellConnectionStatus.value[cellId] = deviceStatus.isConnected;
        }
      }
    });
  });
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
}, { deep: true, immediate: true });

// Get all available devices (not filtered by type)
const allAvailableDevices = computed(() => {
  return unifiedStore.devicesList.filter(d => !!d.type);
});

// Open layout builder
const openLayoutBuilder = () => {
  router.push(`/layout-builder?layout=${currentLayoutId.value}`)
}

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

interface LayoutCell {
  id: string;
  row: number;
  col: number;
  rowSpan?: number;
  colSpan?: number;
  width?: number;
  deviceType?: string;
  name?: string;
}

interface LayoutTemplate {
  id: string;
  name: string;
  rows: number;
  cols: number;
  cells: LayoutCell[];
}

function handleStaticLayoutSave(layout: LayoutTemplate) {
  // Save the chosen layout as a new grid layout and switch to it
  const layoutId = `static-${layout.id}-${Date.now()}`
  const desktopRows = convertStaticToRows(layout)
  
  // Extract device assignments from the cells
  const deviceAssignments = layout.cells.reduce((acc, cell) => {
    if (cell.deviceType) {
      acc[cell.id] = cell.deviceType;
    }
    return acc;
  }, {} as Record<string, string>);
  
  // For demo, use the same layout for all viewports
  const gridLayout: GridLayoutDefinition = {
    id: layoutId,
    name: layout.name,
    description: layout.name,
    layouts: {
      desktop: {
        rows: desktopRows,
        panelIds: layout.cells.map(cell => cell.id)
      },
      tablet: {
        rows: desktopRows,
        panelIds: layout.cells.map(cell => cell.id)
      },
      mobile: {
        rows: desktopRows,
        panelIds: layout.cells.map(cell => cell.id)
      }
    },
    isDefault: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  
  // Update device map based on cell assignments
  Object.entries(deviceAssignments).forEach(([cellId, deviceType]) => {
    if (deviceType in deviceMap.value) {
      // Store the assigned device type in the cell ID -> device type mapping
      log.debug(`Assigning device type ${deviceType} to cell ${cellId}`);
    }
  });
  
  layoutStore.addGridLayout(gridLayout)
  layoutStore.setCurrentLayout(layoutId)
  currentLayoutId.value = layoutId
  showStaticLayoutChooser.value = false
}

function convertStaticToRows(layout: LayoutTemplate): LayoutRow[] {
  // Group cells by row
  const rows: LayoutRow[] = []
  for (let r = 0; r < layout.rows; r++) {
    const rowCells: StoreLayoutCell[] = layout.cells.filter((cell: LayoutCell) => cell.row === r).map((cell: LayoutCell) => ({
      id: cell.id,
      deviceType: cell.deviceType || 'any',
      name: cell.name || cell.id,
      priority: 'primary',
      width: cell.width || (100 / layout.cells.filter(c => c.row === r).length)
    }))
    rows.push({
      id: `row-${r + 1}`,
      cells: rowCells,
      height: 100 / layout.rows
    })
  }
  return rows
}

// Now let's make sure the deviceType is propagated to the panel positions
// We need to add a function to ensure device types are passed correctly
const ensureDeviceTypesInPositions = () => {
  if (!currentDeviceLayout.value) return;
  
  // For each panel position, set the deviceType from the corresponding grid cell
  if (layoutStore.currentGridLayout) {
    const gridRows = layoutStore.currentGridLayout.layouts[layoutStore.currentViewport].rows;
    
    // Extract all cells from all rows
    const cells = gridRows.flatMap(row => row.cells);
    
    // For each position, find the matching cell by ID and copy its deviceType
    currentDeviceLayout.value.positions.forEach(position => {
      const matchingCell = cells.find(cell => cell.id === position.panelId);
      if (matchingCell) {
        // Copy the deviceType from the cell to the position
        position.deviceType = matchingCell.deviceType || undefined;
      }
    });
  }
};

// Watch for layout changes to apply the device type updates
watch(
  () => layoutStore.currentLayoutId,
  () => {
    // Wait for Vue to update the DOM
    nextTick(() => {
      ensureDeviceTypesInPositions();
    });
  }
);

// Also call it on mount to apply to current layout
onMounted(() => {
  nextTick(() => {
    ensureDeviceTypesInPositions();
  });
});

// Initialize cell device assignments when layout changes - optimized version
watch(() => currentLayoutId.value, () => {
  log.debug('LAYOUT CHANGE - Current Layout ID:', currentLayoutId.value);
  
  // Performance measurement
  const startTime = performance.now();
  
  // Wait for Vue to update the device layout
  nextTick(() => {
    // Initialize cell assignments from the layout if available
    if (currentDeviceLayout.value && currentDeviceLayout.value.positions) {
      const initialAssignments: Record<string, string> = {};
      
      // Initialize connection status for pre-assigned devices
      const initialConnectionStatus: Record<string, boolean> = {};
      const initialAttemptStatus: Record<string, boolean> = {};

      // Process layout positions and determine assignments
      currentDeviceLayout.value.positions.forEach(position => {
        if (position.deviceType && position.panelId) {
          const cellId = position.panelId;
          const deviceType = position.deviceType.toLowerCase();
          
          // Try existing assignment first
          const existingDeviceId = cellDeviceAssignments.value[cellId];
          const existingDevice = existingDeviceId ? unifiedStore.getDeviceById(existingDeviceId) : null;
          
          if (existingDeviceId && existingDevice) {
            // Keep existing assignment if device still exists
            initialAssignments[cellId] = existingDeviceId;
            initialConnectionStatus[cellId] = existingDevice.isConnected;
            initialAttemptStatus[cellId] = false;
          } 
          // Otherwise use deviceMap for consistent device selection by type
          else if (deviceType in deviceMap.value && deviceMap.value[deviceType]) {
            initialAssignments[cellId] = deviceMap.value[deviceType]!;
            const mappedDevice = unifiedStore.getDeviceById(deviceMap.value[deviceType]!);
            initialConnectionStatus[cellId] = mappedDevice?.isConnected || false;
            initialAttemptStatus[cellId] = false;
          }
          // If no device of this type is selected, find a suitable one
          else {
            const matchingDevice = unifiedStore.devicesList.find(
              d => d.type?.toLowerCase() === deviceType && d.isConnected
            );
            
            if (matchingDevice) {
              initialAssignments[cellId] = matchingDevice.id;
              deviceMap.value[deviceType] = matchingDevice.id;
              initialConnectionStatus[cellId] = matchingDevice.isConnected;
              initialAttemptStatus[cellId] = false;
            }
          }
        }
      });
      
      // Update cell assignments and register with component registry
      Object.entries(initialAssignments).forEach(([cellId, deviceId]) => {
        cellDeviceAssignments.value[cellId] = deviceId;
        
        const device = unifiedStore.getDeviceById(deviceId);
        if (device?.type) {
          deviceComponentRegistry.assignToCell(deviceId, device.type, cellId);
        }
      });

      // Batch update connection statuses
      Object.assign(cellConnectionStatus.value, initialConnectionStatus);
      Object.assign(cellConnectionAttemptStatus.value, initialAttemptStatus);

      // Log performance metrics after layout change is complete
      const layoutChangeTime = performance.now() - startTime;
      log.debug(`Layout change to ${currentLayoutId.value} took ${layoutChangeTime.toFixed(2)}ms`);
      
      // Log component registry metrics to monitor performance
      deviceComponentRegistry.logPerformanceMetrics();
    }
  });
}, { immediate: true });

// Get device type for event handling
const getDeviceType = (cellId: string): string => {
  const deviceId = cellDeviceAssignments.value[cellId];
  if (!deviceId) return '';
  
  const device = unifiedStore.getDeviceById(deviceId);
  if (!device) {
    log.warn(`PanelLayoutView: Device ${deviceId} not found in store for cell ${cellId} during getDeviceType.`);
    return ''; // Device not found in store
  }
  
  // Ensure device.type is a valid, non-empty string
  if (!device.type || typeof device.type !== 'string' || device.type.trim() === '') {
    log.warn(`PanelLayoutView: Invalid or missing device.type for device ${deviceId} (cell ${cellId}). Type: '${device.type}'.`);
    return ''; 
  }
  
  return device.type.toLowerCase();
};

// Helper functions for getting components from the registry
// Get the component for a given cell
const getComponentForCell = (cellId: string) => {
  // First check if there's a device assigned to this cell
  const deviceId = cellDeviceAssignments.value[cellId];
  if (!deviceId) return null;
  
  // Get the device to determine its type
  const device = unifiedStore.getDeviceById(deviceId);
  if (!device) {
    log.warn(`PanelLayoutView: Device ${deviceId} not found in store for cell ${cellId} during getComponentForCell.`);
    return null; // Device not found in store
  }
  
  // Ensure device.type is a valid, non-empty string
  if (!device.type || typeof device.type !== 'string' || device.type.trim() === '') {
    log.warn(`PanelLayoutView: Invalid or missing device.type for device ${deviceId} (cell ${cellId}). Type: '${device.type}'.`);
    return null; 
  }
  
  // Get the component from the registry
  const component = deviceComponentRegistry.getComponent(deviceId, device.type);
  if (!component) {
    log.warn(`PanelLayoutView: No component registered for type '${device.type}' (device ${deviceId}, cell ${cellId}).`);
  }
  return component; // This might still be null if type not in registry
};

// Get device title/name for a cell
const getDeviceTitle = (cellId: string): string => {
  const deviceId = cellDeviceAssignments.value[cellId];
  if (!deviceId) return '';
  
  const device = unifiedStore.getDeviceById(deviceId);
  return device?.name || '';
};

// Get device connection info for a cell to display in header
const getDeviceConnectionInfo = (cellId: string): string => {
  const deviceId = cellDeviceAssignments.value[cellId];
  if (!deviceId) return '';
  
  const device = unifiedStore.getDeviceById(deviceId);
  if (!device) return '';
  
  // Get connection details from device properties
  const ipAddress = device.ipAddress || device.address || '';
  const port = device.properties?.alpacaPort || device.port || '';
  const serverName = device.properties?.serverName || '';
  
  let connectionInfo = '';
  
  // Include server name if available
  if (serverName) {
    connectionInfo += `${serverName}`;
  }
  
  // Add IP:port if available
  if (ipAddress && port) {
    if (connectionInfo) connectionInfo += ' - ';
    connectionInfo += `${ipAddress}:${port}`;
  }
  
  return connectionInfo;
};

// Handle device changes from child panels - simplified version using component registry
const handleDeviceChange = (deviceType: string, deviceId: string, cellId?: string) => {
  log.debug('PanelLayoutView - handleDeviceChange called:', deviceType, deviceId);

  // Normalize to lowercase for consistent mapping
  const normalizedType = deviceType.toLowerCase();

  if (normalizedType in deviceMap.value) {
    log.debug({deviceIds: [deviceId]}, 'PanelLayoutView - Updating deviceMap for type:', normalizedType, 'from', deviceMap.value[normalizedType], 'to', deviceId);
    
    // Update the deviceMap for this type
    deviceMap.value[normalizedType] = deviceId;
    
    // Register device with the component registry if needed
    deviceComponentRegistry.registerDevice(deviceId, normalizedType);
    
    // If cellId was provided, update cell assignment
    if (cellId) {
      cellDeviceAssignments.value[cellId] = deviceId;
      deviceComponentRegistry.assignToCell(deviceId, normalizedType, cellId);
      log.debug(`Updated cell assignment for ${cellId} to ${normalizedType} ${deviceId}`);
    }
  }
};

// Helper function to check if a panel is maximized
const isPanelMaximized = (panelId: string): boolean => {
  const deviceRef = deviceComponentRegistry.getDeviceForCell(panelId)
  return deviceRef ? deviceRef.isMaximized : false
}

// Get a friendly name for a panel when no device is selected
const getPanelTypeName = (panelId: string): string => {
  // If there's a current device layout, try to get the device type from the position
  if (currentDeviceLayout.value) {
    const position = currentDeviceLayout.value.positions.find(pos => pos.panelId === panelId);
    if (position && position.deviceType) {
      // Convert deviceType to a more user-friendly name
      const deviceType = position.deviceType.toLowerCase();
      switch (deviceType) {
        case 'camera': return 'Camera Panel';
        case 'telescope': return 'Telescope Panel';
        case 'focuser': return 'Focuser Panel';
        case 'filterwheel': return 'Filter Wheel Panel';
        case 'dome': return 'Dome Panel';
        case 'rotator': return 'Rotator Panel';
        case 'weather': return 'Weather Panel';
        case 'safetymonitor': return 'Safety Monitor Panel';
        case 'switch': return 'Switch Panel';
        case 'covercalibrator': return 'Cover/Calibrator Panel';
        default: return `${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)} Panel`;
      }
    }
  }
  
  // Fallback to a generic name if no device type is found
  return `Device Panel ${panelId}`;
};
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
              'maximized': isPanelMaximized(position.panelId),
              'hidden-panel': hasMaximizedPanel && !isPanelMaximized(position.panelId)
            }"
          >
            <div class="panel-header">
              <!-- Show device name or "Cell X" if no device selected -->
              <div class="panel-title">
                <h3 v-if="!cellDeviceAssignments[position.panelId]">{{ getPanelTypeName(position.panelId) }}</h3>
                <template v-else>
                  <div style="display: flex; align-items: center; gap: 0.5em;">
                    <!-- Live status indicator -->
                    <span
                      :title="cellConnectionStatus[position.panelId] ? 'Connected' : 'Disconnected'"
                      :aria-label="cellConnectionStatus[position.panelId] ? 'Device connected' : 'Device disconnected'"
                      :style="{
                        display: 'inline-block',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: cellConnectionStatus[position.panelId] ? 'var(--aw-success-color)' : 'var(--aw-error-color)',
                        border: '1px solid var(--aw-panel-border-color)'
                      }"
                    ></span>
                    <h3 style="margin: 0;">{{ getDeviceTitle(position.panelId) }}</h3>
                    <div v-if="getDeviceConnectionInfo(position.panelId)" class="connection-info">
                      {{ getDeviceConnectionInfo(position.panelId) }}
                    </div>
                  </div>
                  <!-- <div v-if="getDeviceConnectionInfo(position.panelId)" class="connection-info">
                    {{ getDeviceConnectionInfo(position.panelId) }}
                  </div> -->
                </template>
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
                  v-if="cellDeviceAssignments[position.panelId]"
                  class="connect-disconnect-btn"
                  :class="{ 
                    'connected': cellConnectionStatus[position.panelId], 
                    'disconnected': !cellConnectionStatus[position.panelId],
                    'connecting': cellConnectionAttemptStatus[position.panelId]
                  }"
                  :disabled="cellConnectionAttemptStatus[position.panelId]"
                  :title="cellConnectionStatus[position.panelId] ? 'Disconnect device' : 'Connect device'"
                  :aria-label="cellConnectionStatus[position.panelId] ? 'Disconnect device' : 'Connect device'"
                  @click="toggleCellConnection(position.panelId)"
                >
                  {{ cellConnectionAttemptStatus[position.panelId] ? '...' : (cellConnectionStatus[position.panelId] ? 'Disconnect' : 'Connect') }}
                </button>

                <!-- Universal device selector dropdown with proper event typing -->
                <select 
                  :value="cellDeviceAssignments[position.panelId]" 
                  class="device-selector-dropdown"
                  :title="'Select device for this panel'"
                  aria-label="Select device for this panel"
                  @change="(e) => assignDeviceToCell(position.panelId, (e.target as HTMLSelectElement).value)"
                >
                  <option value="">Select Device</option>
                  <option v-for="device in allAvailableDevices" :key="device.id" :value="device.id">
                    {{ device.name }} ({{ device.type }})
                  </option>
                </select>
              </div>
            </div>
            
            <div class="panel-content">
              <keep-alive>
                <template v-if="cellDeviceAssignments[position.panelId] && getComponentForCell(position.panelId)">
                  <component 
                    :is="getComponentForCell(position.panelId)"
                    :key="cellDeviceAssignments[position.panelId] || position.panelId"
                    :device-id="cellDeviceAssignments[position.panelId]"
                    :title="getDeviceTitle(position.panelId)"
                    :is-connected="cellConnectionStatus[position.panelId] || false"
                    @device-change="(newDeviceId: string) => handleDeviceChange(getDeviceType(position.panelId), newDeviceId, position.panelId)"
                  />
                </template>
                <div v-else class="empty-panel-state">
                  <p>{{ cellDeviceAssignments[position.panelId] ? 'No compatible device component' : 'No device selected' }}</p>
                  <p v-if="!cellDeviceAssignments[position.panelId] && getDeviceType(position.panelId)" class="panel-device-type">
                    Type restriction: {{ getDeviceType(position.panelId) }}
                  </p>
                  <p v-if="cellDeviceAssignments[position.panelId] && !cellConnectionStatus[position.panelId]" class="panel-tip">
                    Device is not connected. Use the "Connect" button in the header.
                  </p>
                  <p v-else class="panel-tip">Select a device using the dropdown above.</p>
                </div>
              </keep-alive>
            </div>
          </div>
        </template>
      </LayoutContainer>
    </div>

    <div v-else class="no-layout">
      <p>No layout configured. Select or create a layout to continue.</p>
      <button class="create-layout-btn" @click="openLayoutBuilder">Create New Layout</button>
    </div>
    
    <!-- Static Layout Chooser Modal -->
    <div v-if="showStaticLayoutChooser" class="static-layout-modal">
      <div class="static-layout-modal-content">
        <button class="close-modal-btn" @click="showStaticLayoutChooser = false">×</button>
        <StaticLayoutChooser @save="handleStaticLayoutSave" @cancel="showStaticLayoutChooser = false" />
      </div>
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
}

.connection-info {
  font-size: 0.7rem;
  color: var(--aw-text-secondary-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  color: var(--aw-text-color);
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
