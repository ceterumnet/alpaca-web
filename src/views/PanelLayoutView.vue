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
import { useUIPreferencesStore } from '@/stores/useUIPreferencesStore'
import StaticLayoutChooser from '@/components/layout/StaticLayoutChooser.vue'

// Get stores and router
const layoutStore = useLayoutStore()
const unifiedStore = useUnifiedStore()
const router = useRouter()
const route = useRoute()
const uiStore = useUIPreferencesStore()

// Layout ID to display - default to 'default'
const currentLayoutId = ref(layoutStore.currentLayoutId || 'default')

const showStaticLayoutChooser = ref(false)

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

  if (!layoutStore.gridLayouts.length) {
    console.log('PanelLayoutView - onMounted - No layouts found, creating default layout')
    // Create default layout with Camera, Telescope, and Focuser panels
    const defaultLayout: GridLayoutDefinition = {
      id: 'default',
      name: 'Default Layout',
      description: 'Standard observation layout',
      layouts: {
        desktop: {
          rows: [
            {
              id: 'row-1-desktop',
              cells: [
                {
                  id: 'camera',
                  deviceType: 'camera',
                  name: 'Camera',
                  priority: 'primary',
                  width: 66.67 // 2/3 width
                },
                {
                  id: 'telescope',
                  deviceType: 'telescope',
                  name: 'Telescope',
                  priority: 'primary',
                  width: 33.33 // 1/3 width
                }
              ],
              height: 50 // 1/2 height
            },
            {
              id: 'row-2-desktop',
              cells: [
                {
                  id: 'focuser',
                  deviceType: 'focuser',
                  name: 'Focuser',
                  priority: 'secondary',
                  width: 33.33 // 1/3 width
                },
                {
                  id: 'filterwheel',
                  deviceType: 'filterwheel',
                  name: 'Filter Wheel',
                  priority: 'secondary',
                  width: 33.33 // 1/3 width
                },
                {
                  id: 'weather',
                  deviceType: 'weather',
                  name: 'Weather',
                  priority: 'secondary',
                  width: 33.33 // 1/3 width
                }
              ],
              height: 50 // 1/2 height
            }
          ],
          panelIds: ['camera', 'telescope', 'focuser', 'filterwheel', 'weather']
        },
        tablet: {
          rows: [
            {
              id: 'row-1-tablet',
              cells: [
                {
                  id: 'camera',
                  deviceType: 'camera',
                  name: 'Camera',
                  priority: 'primary',
                  width: 100
                }
              ],
              height: 40
            },
            {
              id: 'row-2-tablet',
              cells: [
                {
                  id: 'telescope',
                  deviceType: 'telescope',
                  name: 'Telescope Control',
                  priority: 'secondary',
                  width: 50
                },
                {
                  id: 'focuser',
                  deviceType: 'focuser',
                  name: 'Focuser',
                  priority: 'secondary',
                  width: 50
                }
              ],
              height: 30
            },
            {
              id: 'row-3-tablet',
              cells: [
                {
                  id: 'filterwheel',
                  deviceType: 'filterwheel',
                  name: 'Filter Wheel',
                  priority: 'tertiary',
                  width: 50
                },
                {
                  id: 'weather',
                  deviceType: 'weather',
                  name: 'Weather',
                  priority: 'tertiary',
                  width: 50
                }
              ],
              height: 30
            }
          ],
          panelIds: ['camera', 'telescope', 'focuser', 'filterwheel', 'weather']
        },
        mobile: {
          rows: [
            {
              id: 'row-1-mobile',
              cells: [
                {
                  id: 'camera',
                  deviceType: 'camera',
                  name: 'Camera',
                  priority: 'primary',
                  width: 100
                }
              ],
              height: 33.33
            },
            {
              id: 'row-2-mobile',
              cells: [
                {
                  id: 'telescope',
                  deviceType: 'telescope',
                  name: 'Telescope Control',
                  priority: 'secondary',
                  width: 100
                }
              ],
              height: 33.33
            },
            {
              id: 'row-3-mobile',
              cells: [
                {
                  id: 'focuser',
                  deviceType: 'focuser',
                  name: 'Focuser',
                  priority: 'secondary',
                  width: 100
                }
              ],
              height: 33.33
            }
          ],
          panelIds: ['camera', 'telescope', 'focuser']
        }
      },
      isDefault: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    // Add the default layout - the store will handle the conversion
    layoutStore.addGridLayout(defaultLayout)
    layoutStore.setCurrentLayout('default')
    currentLayoutId.value = 'default'
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

// Update connected devices
onMounted(() => {
  // Find existing connected devices and map them
  console.log('PanelLayoutView - Initial devicesList:', unifiedStore.devicesList)
  console.log('PanelLayoutView - Initial deviceMap:', deviceMap.value)

  unifiedStore.devicesList.forEach((device) => {
    console.log('PanelLayoutView - Processing device:', device.id, device.type, device.isConnected)
    if (device.isConnected && device.type) {
      const deviceType = device.type.toLowerCase()
      // Only update known device types
      if (deviceType in deviceMap.value) {
        console.log('PanelLayoutView - Mapping device to deviceMap:', deviceType, device.id)
        deviceMap.value[deviceType] = device.id
      }
    }
  })

  console.log('PanelLayoutView - Final deviceMap after initialization:', deviceMap.value)
})

// Handle device changes from child panels
const handleDeviceChange = (deviceType: string, deviceId: string) => {
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
  }
}

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
    
    // Force layout change by clearing and resetting the store
    layoutStore.setCurrentLayout('')
    
    // Wait for the next tick to set the new layout
    setTimeout(() => {
      layoutStore.setCurrentLayout(layoutId)
      currentLayoutId.value = layoutId
      console.log(`Layout changed to: ${layoutId}`)
    }, 10)
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
</script>

<template>
  <div class="panel-layout-view">

    <div v-if="currentLayout && currentDeviceLayout" class="layout-wrapper">
      <LayoutContainer :key="currentLayoutId" :layout-id="currentLayoutId">
        <!-- Camera Panel Slot -->
        <template #camera="{ position }">
          <SimplifiedCameraPanel
            v-if="position"
            :device-id="deviceMap.camera || ''"
            title="Camera"
            @device-change="handleDeviceChange('camera', $event)"
          />
        </template>

        <!-- Telescope Panel Slot -->
        <template #telescope="{ position }">
          <SimplifiedTelescopePanel 
            v-if="position"
            :device-id="deviceMap.telescope || ''"
            title="Telescope"
            @device-change="handleDeviceChange('telescope', $event)"
          />
        </template>

        <!-- Focuser Panel Slot -->
        <template #focuser="{ position }">
          <SimplifiedFocuserPanel
            v-if="position"
            :device-id="deviceMap.focuser || ''"
            title="Focuser"
            @device-change="handleDeviceChange('focuser', $event)"
          />
        </template>

        <!-- Dynamic Cell Slots - for grid layouts -->
        <template v-for="i in 6" :key="`cell-${i}`" #[`cell-${i}`]="{ position }">
          <!-- If the cell has a deviceType assigned, render the appropriate panel -->
          <SimplifiedCameraPanel
            v-if="position && position.deviceType === 'camera'"
            :device-id="deviceMap.camera || ''"
            :title="`Camera ${i}`"
            @device-change="handleDeviceChange('camera', $event)"
          />
          <SimplifiedTelescopePanel
            v-else-if="position && position.deviceType === 'telescope'"
            :device-id="deviceMap.telescope || ''"
            :title="`Telescope ${i}`"
            @device-change="handleDeviceChange('telescope', $event)"
          />
          <SimplifiedFocuserPanel
            v-else-if="position && position.deviceType === 'focuser'"
            :device-id="deviceMap.focuser || ''"
            :title="`Focuser ${i}`"
            @device-change="handleDeviceChange('focuser', $event)"
          />
          <!-- Default cell display if no device type -->
          <div v-else-if="position" class="hybrid-panel" :class="`hybrid-cell-${i}`">
            <h3>Cell {{i}}</h3>
            <p>Width: {{ position.width }} columns</p>
            <p v-if="position.height > 1">Height: {{ position.height }} rows</p>
            <p class="panel-coordinates">Position: ({{ position.x }}, {{ position.y }})</p>
          </div>
        </template>
      </LayoutContainer>
    </div>

    <div v-else class="no-layout">
      <p>No layout configured. Select or create a layout to continue.</p>
      <button class="create-layout-btn" @click="openLayoutBuilder">Create New Layout</button>
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
</style>
