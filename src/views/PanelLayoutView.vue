// Status: Core View 
// This view implements the main panel layout system with: 
// - Grid-based layout using LayoutContainer 
// - Support for multiple device panels 
// - Integration with layout store for persistence 
// - Proper responsive behavior

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useLayoutStore } from '@/stores/useLayoutStore'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import LayoutContainer from '@/components/layout/LayoutContainer.vue'
import ResponsiveCameraPanel from '@/components/devices/ResponsiveCameraPanel.vue'
import ResponsiveTelescopePanel from '@/components/devices/ResponsiveTelescopePanel.vue'
import ResponsiveFocuserPanel from '@/components/devices/ResponsiveFocuserPanel.vue'
import type { GridLayoutDefinition } from '@/types/layouts/LayoutDefinition'

// Get stores and router
const layoutStore = useLayoutStore()
const unifiedStore = useUnifiedStore()
const router = useRouter()
const route = useRoute()

// Layout ID to display - default to 'default'
const currentLayoutId = ref(layoutStore.currentLayoutId || 'default')

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
const availableLayouts = computed(() => {
  console.log('Computing available layouts:', layoutStore.layouts.map(l => `${l.id} (${l.name})`))
  return layoutStore.layouts
})

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

// Function to delete the current layout
function deleteCurrentLayout() {
  if (!currentLayoutId.value) return
  
  // Confirm deletion
  if (confirm(`Are you sure you want to delete this layout "${availableLayouts.value.find(l => l.id === currentLayoutId.value)?.name || currentLayoutId.value}"?`)) {
    // Delete from store
    layoutStore.deleteLayout(currentLayoutId.value)
    
    // Switch to first available layout or create default if none exists
    if (layoutStore.gridLayouts.length > 0) {
      currentLayoutId.value = layoutStore.gridLayouts[0].id
      layoutStore.setCurrentLayout(currentLayoutId.value)
    } else {
      // If we have no layouts left, create a new default one
      createAndAddDefaultLayout()
      currentLayoutId.value = 'default'
      layoutStore.setCurrentLayout(currentLayoutId.value)
    }
  }
}

// Create and add a default layout
function createAndAddDefaultLayout() {
  // This should match the logic from createDefaultLayout in the component
  const defaultLayoutId = 'default'
  
  // Define proper types for priority
  type Priority = 'primary' | 'secondary' | 'tertiary';
  
  // Create a default grid layout
  const defaultGridLayout = {
    id: defaultLayoutId,
    name: 'Default Layout',
    description: 'Default panel layout with camera, telescope, and other panels',
    isDefault: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
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
                priority: 'primary' as Priority,
                width: 66.67
              },
              {
                id: 'telescope',
                deviceType: 'telescope',
                name: 'Telescope',
                priority: 'primary' as Priority,
                width: 33.33
              }
            ],
            height: 50
          },
          {
            id: 'row-2-desktop',
            cells: [
              {
                id: 'focuser',
                deviceType: 'focuser',
                name: 'Focuser',
                priority: 'secondary' as Priority,
                width: 33.33
              },
              {
                id: 'filterwheel',
                deviceType: 'filterwheel',
                name: 'Filter Wheel',
                priority: 'secondary' as Priority,
                width: 33.33
              },
              {
                id: 'weather',
                deviceType: 'weather',
                name: 'Weather',
                priority: 'secondary' as Priority,
                width: 33.33
              }
            ],
            height: 50
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
                priority: 'primary' as Priority,
                width: 100
              }
            ],
            height: 50
          },
          {
            id: 'row-2-tablet',
            cells: [
              {
                id: 'telescope',
                deviceType: 'telescope',
                name: 'Telescope',
                priority: 'secondary' as Priority,
                width: 100
              }
            ],
            height: 50
          }
        ],
        panelIds: ['camera', 'telescope']
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
                priority: 'primary' as Priority,
                width: 100
              }
            ],
            height: 100
          }
        ],
        panelIds: ['camera']
      }
    }
  }

  // Add to store
  layoutStore.addGridLayout(defaultGridLayout)
}

// Function to set the current layout as default
function setAsDefaultLayout() {
  if (!currentLayoutId.value) return
  
  // Update all layouts
  layoutStore.gridLayouts.forEach(layout => {
    if (layout.id === currentLayoutId.value) {
      layoutStore.updateGridLayout(layout.id, { isDefault: true })
    } else if (layout.isDefault) {
      layoutStore.updateGridLayout(layout.id, { isDefault: false })
    }
  })
}
</script>

<template>
  <div class="panel-layout-view">
    <div class="layout-controls">
      <div class="layout-selector">
        <label for="layout-select">Layout:</label>
        <select
          id="layout-select"
          v-model="currentLayoutId"
          class="layout-select"
          @change="changeLayout(currentLayoutId)"
        >
          <option v-for="layout in availableLayouts" :key="layout.id" :value="layout.id">
            {{ layout.name }}{{ layout.isDefault ? ' (Default)' : '' }}
          </option>
        </select>
      </div>
      <div class="layout-actions">
        <button class="layout-action-btn" title="Set as default layout" @click="setAsDefaultLayout">
          <span class="icon">⭐</span>
        </button>
        <button class="layout-action-btn" title="Delete this layout" @click="deleteCurrentLayout">
          <span class="icon">🗑️</span>
        </button>
        <button class="edit-layout-btn" @click="openLayoutBuilder">
          <span class="icon">✏️</span> Edit Layouts
        </button>
      </div>
    </div>

    <div v-if="currentLayout && currentDeviceLayout" class="layout-wrapper">
      <LayoutContainer :key="currentLayoutId" :layout-id="currentLayoutId">
        <!-- Camera Panel Slot -->
        <template #camera="{ position }">
          <ResponsiveCameraPanel
            v-if="position"
            :device-id="deviceMap.camera || ''"
            title="Camera"
            @device-change="handleDeviceChange('camera', $event)"
          />
        </template>

        <!-- Telescope Panel Slot -->
        <template #telescope="{ position }">
          <ResponsiveTelescopePanel
            v-if="position"
            :device-id="deviceMap.telescope || ''"
            title="Telescope"
            @device-change="handleDeviceChange('telescope', $event)"
          />
        </template>

        <!-- Focuser Panel Slot -->
        <template #focuser="{ position }">
          <ResponsiveFocuserPanel
            v-if="position"
            :device-id="deviceMap.focuser || ''"
            title="Focuser"
            @device-change="handleDeviceChange('focuser', $event)"
          />
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

.layout-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: var(--aw-panel-menu-bar-bg-color, #252525);
  border-bottom: 1px solid var(--aw-border-color, #333333);
}

.layout-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.layout-select {
  padding: 0.3rem 0.5rem;
  background-color: var(--aw-input-bg-color, #333333);
  color: var(--aw-text-color, #ffffff);
  border: 1px solid var(--aw-border-color, #444444);
  border-radius: 4px;
}

.layout-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.layout-action-btn {
  padding: 0.3rem 0.5rem;
  background-color: var(--aw-button-bg-color, #333333);
  color: var(--aw-text-color, #ffffff);
  border: 1px solid var(--aw-border-color, #444444);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.layout-action-btn:hover {
  background-color: var(--aw-button-hover-bg-color, #444444);
}

.edit-layout-btn,
.create-layout-btn {
  padding: 0.3rem 0.75rem;
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

.edit-layout-btn:hover,
.create-layout-btn:hover {
  background-color: var(--aw-button-hover-bg-color, #444444);
  border-color: var(--aw-primary-color, #1e88e5);
}

.icon {
  font-size: 0.9rem;
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
}

@media (max-width: 768px) {
  .layout-controls {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }

  .layout-selector {
    width: 100%;
  }

  .layout-select {
    flex: 1;
  }
  
  .layout-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
