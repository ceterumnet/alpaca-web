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
import SimplifiedCameraPanel from '@/components/devices/SimplifiedCameraPanel.vue'
import SimplifiedTelescopePanel from '@/components/devices/SimplifiedTelescopePanel.vue'
import type { GridLayoutDefinition, LayoutRow, LayoutCell as StoreLayoutCell } from '@/types/layouts/LayoutDefinition'
import SimplifiedFocuserPanel from '@/components/devices/SimplifiedFocuserPanel.vue'
import StaticLayoutChooser from '@/components/layout/StaticLayoutChooser.vue'

// Get stores and router
const layoutStore = useLayoutStore()
const unifiedStore = useUnifiedStore()
const router = useRouter()
const route = useRoute()

// Layout ID to display - default to 'default'
const currentLayoutId = ref(layoutStore.currentLayoutId || 'default')

const showStaticLayoutChooser = ref(false)

// Track the maximized panel
const maximizedPanelId = ref<string | null>(null)

// Function to toggle panel maximization
const toggleMaximizePanel = (panelId: string) => {
  if (maximizedPanelId.value === panelId) {
    // If clicking the same panel, minimize it
    maximizedPanelId.value = null
  } else {
    // Otherwise, maximize this panel
    maximizedPanelId.value = panelId
  }
  
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
    }
  }
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

interface DeviceComponentRef {
  type: string;
  deviceId: string;
  showing: boolean;
  currentCell: string | null;
}

// Global registry to hold all device instances - they never get recreated
const globalDeviceComponents = ref<Record<string, DeviceComponentRef>>({});

// Create global device components once and never recreate them
const initGlobalDeviceComponents = () => {
  console.log('Initializing global device components');
  
  // Iterate through all devices and create component instances
  unifiedStore.devicesList.forEach(device => {
    if (!device.id || !device.type) return;
    
    // Get device type
    const deviceType = device.type.toLowerCase();
    const deviceId = device.id;
    
    // Check if we already have this device
    const key = `${deviceType}-${deviceId}`;
    if (!globalDeviceComponents.value[key]) {
      console.log(`Creating persistent global component for ${deviceType} ${deviceId}`);
      
      // Create a persistent ref for this device
      globalDeviceComponents.value[key] = {
        type: deviceType,
        deviceId,
        showing: false,
        currentCell: null
      };
    }
  });
};

// Initialize global registry once
onMounted(() => {
  initGlobalDeviceComponents();
  
  // Refresh when devices change - using Vue's internal watch system
  watch(() => unifiedStore.devicesList, () => {
    initGlobalDeviceComponents();
  }, { deep: true });
});

// Track which components should be shown in which cells
const visibleComponentMap = ref<Record<string, { type: string, deviceId: string }>>({});

// Update visibleComponentMap when cell assignments change
watch(cellDeviceAssignments, (newAssignments) => {
  // Reset all to not showing
  Object.values(globalDeviceComponents.value).forEach(comp => {
    comp.showing = false;
    comp.currentCell = null;
  });
  
  // Set up mappings based on current assignments
  Object.entries(newAssignments).forEach(([cellId, deviceId]) => {
    if (!deviceId) return;
    
    const device = unifiedStore.getDeviceById(deviceId);
    if (!device || !device.type) return;
    
    const deviceType = device.type.toLowerCase();
    const key = `${deviceType}-${deviceId}`;
    
    if (globalDeviceComponents.value[key]) {
      // Update showing state
      globalDeviceComponents.value[key].showing = true;
      globalDeviceComponents.value[key].currentCell = cellId;
      
      // Update visible component map
      visibleComponentMap.value[cellId] = {
        type: deviceType,
        deviceId: deviceId
      };
    }
  });
  
  console.log('Updated visibleComponentMap:', visibleComponentMap.value);
}, { deep: true });

// Handle device changes from child panels
const handleDeviceChange = (deviceType: string, deviceId: string, cellId?: string) => {
  console.log('PanelLayoutView - handleDeviceChange called:', deviceType, deviceId)

  // Normalize to lowercase for consistent mapping
  deviceType = deviceType.toLowerCase()

  if (deviceType in deviceMap.value) {
    console.log(
      'PanelLayoutView - Updating deviceMap for type:',
      deviceType,
      'from',
      deviceMap.value[deviceType],
      'to',
      deviceId
    )
    deviceMap.value[deviceType] = deviceId

    // Auto-connect to device if not yet connected
    const device = unifiedStore.getDeviceById(deviceId)
    if (device && !device.isConnected) {
      console.log('PanelLayoutView - Auto-connecting to device:', deviceId)
      // NOTE: Auto-connect functionality removed due to type compatibility issues
      // This should be handled elsewhere in the UI where the user can explicitly connect
    }
    
    // When device is changed, update all panels using this device type
    if (currentDeviceLayout.value) {
      currentDeviceLayout.value.positions.forEach(position => {
        if (position.deviceType === deviceType) {
          console.log(`Updating all panels with type ${deviceType} to use device ${deviceId}`);
          // The actual device ID is managed in deviceMap, no need to update position
        }
      });
    }
    
    // If cellId was provided, update cell assignment
    if (cellId) {
      cellDeviceAssignments.value[cellId] = deviceId;
    }
  }
}

// Initialize cell device assignments when layout changes
watch(() => currentLayoutId.value, () => {
  // Log deviceMap BEFORE layout change
  console.log('LAYOUT CHANGE - deviceMap BEFORE:', { ...deviceMap.value });
  console.log('LAYOUT CHANGE - Current Layout ID:', currentLayoutId.value);
  
  // Wait for Vue to update the device layout
  nextTick(() => {
    // Initialize cell assignments from the layout if available
    if (currentDeviceLayout.value && currentDeviceLayout.value.positions) {
      const initialCellAssignments: Record<string, string> = {};
      
      // Preserve existing device assignments - store current assignments
      const existingAssignments = {...cellDeviceAssignments.value};
      
      // For each position in the layout
      currentDeviceLayout.value.positions.forEach(position => {
        if (position.deviceType && position.panelId) {
          const panelId = position.panelId;
          
          // First try to reuse existing assignment if it exists and is valid
          if (existingAssignments[panelId] && 
              unifiedStore.getDeviceById(existingAssignments[panelId])) {
            // Keep existing assignment
            initialCellAssignments[panelId] = existingAssignments[panelId];
            console.log(`Preserving existing assignment for ${panelId}: ${existingAssignments[panelId]}`);
          } else {
            // Otherwise find a device to assign
            const deviceType = position.deviceType.toLowerCase();
          
            // FIRST: Check if we already have a device of this type selected in deviceMap
            if (deviceType in deviceMap.value && deviceMap.value[deviceType]) {
              // Use the existing device selection instead of finding a random one
              initialCellAssignments[position.panelId] = deviceMap.value[deviceType]!;
              console.log(`Using existing device ${deviceMap.value[deviceType]} for ${deviceType} in cell ${position.panelId}`);
            } 
            // FALLBACK: If no device was previously selected for this type, find a device
            else {
              // Find a connected device of this type
              const matchingDevice = unifiedStore.devicesList.find(
                d => d.type?.toLowerCase() === deviceType && d.isConnected
              );
              
              if (matchingDevice) {
                // Assign this device to the cell
                initialCellAssignments[position.panelId] = matchingDevice.id;
                // Also update the deviceMap so future layout changes will use this device
                deviceMap.value[deviceType] = matchingDevice.id;
                console.log(`Assigning new device ${matchingDevice.id} to ${deviceType} in cell ${position.panelId}`);
              }
            }
          }
        }
      });
      
      // Instead of replacing all assignments, update only the new positions
      // This preserves existing assignments for positions that exist in both layouts
      Object.entries(initialCellAssignments).forEach(([cellId, deviceId]) => {
        cellDeviceAssignments.value[cellId] = deviceId;
      });
      
      // Log final state AFTER layout change
      console.log('LAYOUT CHANGE - deviceMap AFTER:', { ...deviceMap.value });
      console.log('LAYOUT CHANGE - cellDeviceAssignments:', { ...cellDeviceAssignments.value });
      
      // Log the cell and device type mapping for clarity
      const cellToDeviceTypeMap: Record<string, string> = {};
      currentDeviceLayout.value.positions.forEach(position => {
        if (position.deviceType && position.panelId) {
          cellToDeviceTypeMap[position.panelId] = position.deviceType;
        }
      });
      console.log('LAYOUT CHANGE - cell to deviceType mapping:', cellToDeviceTypeMap);
    }
  });
}, { immediate: true });
</script>

<template>
  <div class="panel-layout-view">

    <div v-if="currentLayout && currentDeviceLayout" class="layout-wrapper">
      <!-- Maximized panel overlay container -->
      <div v-show="maximizedPanelId !== null" class="maximized-panel-overlay">
        <div class="panel-header maximized-header">
          <h3>{{ maximizedPanelId }}</h3>
          <div class="header-controls">
            <button class="minimize-panel-btn" @click="toggleMaximizePanel(maximizedPanelId as string)">
              <span class="minimize-icon">□</span>
            </button>
          </div>
        </div>
        <!-- Container for the teleported content -->
        <div id="maximized-panel-container" class="maximized-panel-content"></div>
      </div>

      <LayoutContainer :layout-id="currentLayoutId" :class="{ 'layout-behind-maximized': maximizedPanelId !== null }">
        <!-- Dynamic Cell Slots - Generic device renderer -->
        <template v-for="i in 6" :key="`cell-${i}`" #[`cell-${i}`]="{ position }">
          <div v-if="position" :id="`panel-${position.panelId}`" class="universal-panel-container">
            <div class="panel-header">
              <h3>Cell {{position.panelId}}</h3>
              
              <div class="header-controls">
                <!-- Add maximize button -->
                <button class="maximize-panel-btn" @click="toggleMaximizePanel(position.panelId)">
                  <span class="maximize-icon">⬚</span>
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
            
            <div class="panel-content" :class="{ 'maximized': position.panelId === maximizedPanelId }">
              <!-- Use teleport when maximized to move the content instead of duplicating it -->
              <teleport
:to="position.panelId === maximizedPanelId ? '#maximized-panel-container' : `#panel-${position.panelId} .panel-content`" 
                       :disabled="position.panelId !== maximizedPanelId">
                <!-- We'll use component :is and keep-alive to preserve components -->
                <keep-alive>
                  <template v-if="cellDeviceAssignments[position.panelId]">
                    <SimplifiedCameraPanel 
                      v-if="unifiedStore.getDeviceById(cellDeviceAssignments[position.panelId])?.type?.toLowerCase() === 'camera'"
                      :key="`global-camera-${cellDeviceAssignments[position.panelId]}`"
                      :device-id="cellDeviceAssignments[position.panelId]"
                      :title="unifiedStore.getDeviceById(cellDeviceAssignments[position.panelId])?.name"
                      @device-change="(newDeviceId) => handleDeviceChange('camera', newDeviceId, position.panelId)"
                    />
                    
                    <SimplifiedTelescopePanel 
                      v-else-if="unifiedStore.getDeviceById(cellDeviceAssignments[position.panelId])?.type?.toLowerCase() === 'telescope'"
                      :key="`global-telescope-${cellDeviceAssignments[position.panelId]}`"
                      :device-id="cellDeviceAssignments[position.panelId]"
                      :title="unifiedStore.getDeviceById(cellDeviceAssignments[position.panelId])?.name"
                      @device-change="(newDeviceId) => handleDeviceChange('telescope', newDeviceId, position.panelId)"
                    />
                    
                    <SimplifiedFocuserPanel 
                      v-else-if="unifiedStore.getDeviceById(cellDeviceAssignments[position.panelId])?.type?.toLowerCase() === 'focuser'"
                      :key="`global-focuser-${cellDeviceAssignments[position.panelId]}`"
                      :device-id="cellDeviceAssignments[position.panelId]"
                      :title="unifiedStore.getDeviceById(cellDeviceAssignments[position.panelId])?.name"
                      @device-change="(newDeviceId) => handleDeviceChange('focuser', newDeviceId, position.panelId)"
                    />
                    
                    <div v-else class="empty-panel-state">
                      <p>No compatible device found</p>
                      <p class="panel-coordinates">Position: ({{ position.x }}, {{ position.y }})</p>
                    </div>
                  </template>
                  
                  <!-- Empty state when no device selected -->
                  <div v-else class="empty-panel-state">
                    <p>No device selected for this panel</p>
                    <p class="panel-coordinates">Position: ({{ position.x }}, {{ position.y }})</p>
                  </div>
                </keep-alive>
              </teleport>
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

/* Updated maximized panel styles */
.layout-behind-maximized {
  visibility: visible;
  opacity: 0.01; /* Nearly invisible but keeps component state */
  pointer-events: none;
}

.maximized-panel-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--aw-panel-bg-color, #2a2a2a);
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.maximized-header {
  background-color: var(--aw-panel-header-bg-color, #333);
  padding: 8px;
  border-bottom: 1px solid var(--aw-panel-border-color, #444);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.maximized-panel-content {
  flex: 1;
  overflow: auto;
}

.hidden {
  visibility: hidden;
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

.universal-panel-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
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

.panel-coordinates {
  margin-top: 1rem;
  font-size: 0.8rem;
  color: #888;
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
