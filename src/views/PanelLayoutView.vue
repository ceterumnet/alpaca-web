// Status: Core View 
// This view implements the main panel layout system with: 
// - Grid-based layout using LayoutContainer 
// - Support for multiple device panels 
// - Integration with layout store for persistence 
// - Proper responsive behavior

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useLayoutStore } from '@/stores/useLayoutStore'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import LayoutContainer from '@/components/layout/LayoutContainer.vue'
import type { GridLayoutDefinition, LayoutRow, LayoutCell as StoreLayoutCell } from '@/types/layouts/LayoutDefinition'
import StaticLayoutChooser from '@/components/layout/StaticLayoutChooser.vue'

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
    console.log(`No device found for panel ${panelId}, cannot maximize`)
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
      console.log('PanelLayoutView - layoutStore.currentLayoutId changed to:', newLayoutId)
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
  console.log('PanelLayoutView - onMounted - Current layouts in store:', layoutStore.layouts.map(l => l.id))
  console.log('PanelLayoutView - onMounted - Current grid layouts:', layoutStore.gridLayouts.map(l => l.id))
  console.log('PanelLayoutView - onMounted - Current layout ID:', layoutStore.currentLayoutId)
  
  // Check if there's a layout parameter in the URL
  if (route.query.layout) {
    const layoutId = route.query.layout as string
    console.log('PanelLayoutView - onMounted - Layout ID from URL:', layoutId)
    changeLayout(layoutId)
  }
})

// Updated with component registry integration
onMounted(() => {
  console.log('PanelLayoutView - onMounted - Current layouts in store:', layoutStore.layouts.map(l => l.id))
  console.log('PanelLayoutView - onMounted - Current grid layouts:', layoutStore.gridLayouts.map(l => l.id))
  console.log('PanelLayoutView - onMounted - Current layout ID:', layoutStore.currentLayoutId)
  
  // Register all available devices with the component registry
  unifiedStore.devicesList.forEach(device => {
    if (device.id && device.type) {
      deviceComponentRegistry.registerDevice(device.id, device.type);
      console.log(`Registered device with registry: ${device.type} ${device.id}`);
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
    console.log('PanelLayoutView - onMounted - Layout ID from URL:', layoutId)
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

// Handle device selection for a specific cell
const assignDeviceToCell = (cellId: string, deviceId: string) => {
  console.log(`Assigning device ${deviceId} to cell ${cellId}`);
  
  // Performance measurement
  const startTime = performance.now();
  
  // Update cell assignment
  cellDeviceAssignments.value[cellId] = deviceId;
  
  // Get device type to update the deviceMap
  if (deviceId) {
    const device = unifiedStore.getDeviceById(deviceId);
    if (device && device.type) {
      const deviceType = device.type.toLowerCase();
      
      // Update deviceMap to maintain device selection by type
      console.log(`Updating deviceMap: ${deviceType} -> ${deviceId}`);
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
  console.log(`Device assignment to cell ${cellId} took ${assignmentTime.toFixed(2)}ms`);
};

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
  console.log(`Attempting to change layout to: ${layoutId}`)
  
  // Check if the layout exists
  const layoutExists = layoutStore.layouts.some((layout) => layout.id === layoutId)

  if (layoutExists) {
    console.log(`Layout ${layoutId} found, setting as current layout`)
    
    // Directly set the current layout without resetting first
    layoutStore.setCurrentLayout(layoutId)
    currentLayoutId.value = layoutId
    console.log(`Layout changed to: ${layoutId}`)
  } else {
    console.warn(`Layout with ID ${layoutId} not found, using default layout`)
    if (layoutStore.layouts.length > 0) {
      // Use the first available layout if specified one doesn't exist
      const firstLayout = layoutStore.layouts[0]
      console.log(`Falling back to first available layout: ${firstLayout.id}`)
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
      console.log(`Assigning device type ${deviceType} to cell ${cellId}`);
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
  console.log('LAYOUT CHANGE - Current Layout ID:', currentLayoutId.value);
  
  // Performance measurement
  const startTime = performance.now();
  
  // Wait for Vue to update the device layout
  nextTick(() => {
    // Initialize cell assignments from the layout if available
    if (currentDeviceLayout.value && currentDeviceLayout.value.positions) {
      const initialAssignments: Record<string, string> = {};
      
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
          } 
          // Otherwise use deviceMap for consistent device selection by type
          else if (deviceType in deviceMap.value && deviceMap.value[deviceType]) {
            initialAssignments[cellId] = deviceMap.value[deviceType]!;
          }
          // If no device of this type is selected, find a suitable one
          else {
            const matchingDevice = unifiedStore.devicesList.find(
              d => d.type?.toLowerCase() === deviceType && d.isConnected
            );
            
            if (matchingDevice) {
              initialAssignments[cellId] = matchingDevice.id;
              deviceMap.value[deviceType] = matchingDevice.id;
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

      // Log performance metrics after layout change is complete
      const layoutChangeTime = performance.now() - startTime;
      console.log(`Layout change to ${currentLayoutId.value} took ${layoutChangeTime.toFixed(2)}ms`);
      
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
  return device?.type?.toLowerCase() || '';
};

// Helper functions for getting components from the registry
// Get the component for a given cell
const getComponentForCell = (cellId: string) => {
  // First check if there's a device assigned to this cell
  const deviceId = cellDeviceAssignments.value[cellId];
  if (!deviceId) return null;
  
  // Get the device to determine its type
  const device = unifiedStore.getDeviceById(deviceId);
  if (!device || !device.type) return null;
  
  // Get the component from the registry
  return deviceComponentRegistry.getComponent(deviceId, device.type);
};

// Get device title/name for a cell
const getDeviceTitle = (cellId: string): string => {
  const deviceId = cellDeviceAssignments.value[cellId];
  if (!deviceId) return '';
  
  const device = unifiedStore.getDeviceById(deviceId);
  return device?.name || '';
};

// Handle device changes from child panels - simplified version using component registry
const handleDeviceChange = (deviceType: string, deviceId: string, cellId?: string) => {
  console.log('PanelLayoutView - handleDeviceChange called:', deviceType, deviceId);

  // Normalize to lowercase for consistent mapping
  const normalizedType = deviceType.toLowerCase();

  if (normalizedType in deviceMap.value) {
    console.log(
      'PanelLayoutView - Updating deviceMap for type:',
      normalizedType,
      'from',
      deviceMap.value[normalizedType],
      'to',
      deviceId
    );
    
    // Update the deviceMap for this type
    deviceMap.value[normalizedType] = deviceId;
    
    // Register device with the component registry if needed
    deviceComponentRegistry.registerDevice(deviceId, normalizedType);
    
    // If cellId was provided, update cell assignment
    if (cellId) {
      cellDeviceAssignments.value[cellId] = deviceId;
      deviceComponentRegistry.assignToCell(deviceId, normalizedType, cellId);
      console.log(`Updated cell assignment for ${cellId} to ${normalizedType} ${deviceId}`);
    }
  }
};

// Helper function to check if a panel is maximized
const isPanelMaximized = (panelId: string): boolean => {
  const deviceRef = deviceComponentRegistry.getDeviceForCell(panelId)
  return deviceRef ? deviceRef.isMaximized : false
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
              'maximized': isPanelMaximized(position.panelId),
              'hidden-panel': hasMaximizedPanel && !isPanelMaximized(position.panelId)
            }"
          >
            <div class="panel-header">
              <h3>Cell {{position.panelId}}</h3>
              
              <div class="header-controls">
                <!-- Toggle maximize button with different icon based on state -->
                <button 
                  class="maximize-panel-btn" 
                  :title="isPanelMaximized(position.panelId) ? 'Restore panel' : 'Maximize panel'"
                  @click="toggleMaximizePanel(position.panelId)"
                >
                  <span class="maximize-icon">{{ isPanelMaximized(position.panelId) ? '□' : '⬚' }}</span>
                </button>
                
                <!-- Universal device selector dropdown with proper event typing -->
                <select 
                  :value="cellDeviceAssignments[position.panelId]" 
                  class="device-selector-dropdown"
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
                    :key="cellDeviceAssignments[position.panelId]"
                    :device-id="cellDeviceAssignments[position.panelId]"
                    :title="getDeviceTitle(position.panelId)"
                    @device-change="(newDeviceId: string) => handleDeviceChange(getDeviceType(position.panelId), newDeviceId, position.panelId)"
                  />
                </template>
                <div v-else class="empty-panel-state">
                  <p>{{ cellDeviceAssignments[position.panelId] ? 'No compatible device component' : 'No device selected' }}</p>
                  <p class="panel-coordinates">Position: ({{ position.x }}, {{ position.y }})</p>
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
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  z-index: 1000 !important;
  width: 100% !important;
  height: 100% !important;
  background-color: var(--aw-panel-bg-color, #2a2a2a);
}

.hidden-panel {
  opacity: 0.1;
  pointer-events: none;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--aw-panel-header-bg-color, #333);
  padding: 8px;
  border-bottom: 1px solid var(--aw-panel-border-color, #444);
}

.panel-header h3 {
  margin: 0;
  font-size: 0.9rem;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.maximize-panel-btn,
.minimize-panel-btn {
  background: none;
  border: none;
  color: var(--aw-text-color, #f0f0f0);
  cursor: pointer;
  font-size: 1rem;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
}

.maximize-panel-btn:hover,
.minimize-panel-btn:hover {
  background-color: var(--aw-panel-hover-bg-color, #444);
}

.maximize-icon,
.minimize-icon {
  line-height: 1;
}

.device-selector-dropdown {
  background-color: var(--aw-panel-content-bg-color, #3a3a3a);
  color: var(--aw-text-color, #f0f0f0);
  border: 1px solid var(--aw-panel-border-color, #444);
  border-radius: 4px;
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
  color: var(--aw-text-color, #ffffff);
  font-size: 1.2rem;
  opacity: 0.7;
  padding: 2rem;
  text-align: center;
  gap: 1rem;
}

.create-layout-btn {
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
  background-color: var(--aw-button-bg-color, #333333);
  color: var(--aw-text-color, #ffffff);
  border: 1px solid var(--aw-border-color, #444444);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: all 0.2s ease;
}

.create-layout-btn:hover {
  background-color: var(--aw-button-hover-bg-color, #444444);
  border-color: var(--aw-primary-color, #1e88e5);
}

@media (max-width: 768px) {
  .panel-layout-view {
    padding-bottom: 0.5rem;
  }
}

.panel-layout-controls {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 16px;
  background-color: var(--aw-secondary-bg-color, #1e1e1e);
  border-bottom: 1px solid var(--aw-border-color, #333);
}

.toggle-panel-btn {
  background-color: var(--aw-primary-color, #0077cc);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 0.9rem;
}

.toggle-panel-btn:hover {
  background-color: var(--aw-primary-hover-color, #0066b3);
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
  background-color: rgba(66, 135, 245, 0.15);
  border-left: 4px solid rgb(66, 135, 245);
}

.hybrid-cell-2 {
  background-color: rgba(77, 175, 124, 0.15);
  border-left: 4px solid rgb(77, 175, 124);
}

.hybrid-cell-3 {
  background-color: rgba(255, 159, 67, 0.15);
  border-left: 4px solid rgb(255, 159, 67);
}

.panel-coordinates {
  margin-top: auto;
  font-size: 0.8rem;
  color: #888;
}

.empty-panel-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 1rem;
  color: var(--aw-text-secondary-color, #aaa);
  text-align: center;
}

.select-layout-btn {
  background-color: var(--aw-primary-color, #0077cc);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.select-layout-btn:hover {
  background-color: var(--aw-primary-hover-color, #0066b3);
}

.static-layout-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.static-layout-modal-content {
  background-color: var(--aw-panel-bg-color, #2a2a2a);
  border-radius: 8px;
  max-width: 90%;
  max-height: 90%;
  overflow: auto;
  position: relative;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.close-modal-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  color: var(--aw-text-color, #f0f0f0);
  font-size: 1.5rem;
  cursor: pointer;
  z-index: 10;
}

.close-modal-btn:hover {
  color: var(--aw-primary-color, #0077cc);
}

.loading-device {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--aw-text-secondary-color, #aaa);
}
</style>
