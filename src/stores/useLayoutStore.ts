// Status: Good - Core Store
// This is the layout store that:
// - Manages application layout state
// - Handles panel positioning and sizing
// - Provides layout customization options
// - Supports responsive layouts
// - Maintains layout persistence

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { LayoutDefinition, GridLayoutDefinition, Viewport, DeviceLayout, PanelPosition, LayoutCell } from '@/types/layouts/LayoutDefinition'

export const LAYOUT_STORAGE_KEY = 'alpaca-web-layout'
export const LAYOUTS_STORAGE_KEY = 'alpaca-web-layouts'
export const GRID_LAYOUTS_STORAGE_KEY = 'alpaca-web-grid-layouts'
export const CURRENT_LAYOUT_ID_STORAGE_KEY = 'alpaca-web-current-layout-id'

// Define the layout item interface for backward compatibility
export interface LayoutItem {
  x: number
  y: number
  w: number
  h: number
  i: string
  deviceType: string
  deviceNum?: number
  deviceId?: string
  connected?: boolean
  apiBaseUrl?: string
  static?: boolean
}

/**
 * Store for managing panel layouts
 */
export const useLayoutStore = defineStore('layout', () => {
  // State for layout system
  const gridLayouts = ref<GridLayoutDefinition[]>([])
  const currentLayoutId = ref<string | null>(null)
  const currentViewport = ref<Viewport>('desktop')

  // Backward compatibility - maintain legacy layout state
  const layout = ref<LayoutItem[]>([])

  // Watch layout changes and save to localStorage for backward compatibility
  watch(
    layout,
    () => {
      saveLayout()
    },
    { deep: true }
  )

  // Watch changes to gridLayouts and save to localStorage
  watch(
    gridLayouts,
    () => {
      localStorage.setItem(GRID_LAYOUTS_STORAGE_KEY, JSON.stringify(gridLayouts.value))

      // Also save converted layouts for backward compatibility
      localStorage.setItem(LAYOUTS_STORAGE_KEY, JSON.stringify(convertedLayouts.value))
    },
    { deep: true }
  )

  watch(currentLayoutId, () => {
    if (currentLayoutId.value) {
      localStorage.setItem(CURRENT_LAYOUT_ID_STORAGE_KEY, currentLayoutId.value)
    }
  })

  // Calculate current viewport based on screen width
  function detectViewport(): Viewport {
    const width = window.innerWidth
    if (width < 768) {
      return 'mobile'
    } else if (width < 1200) {
      return 'tablet'
    } else {
      return 'desktop'
    }
  }

  // Update current viewport
  function updateViewport() {
    currentViewport.value = detectViewport()
  }

  // Function to convert a grid layout to position-based layout
  function gridToPositionLayout(gridLayout: GridLayoutDefinition): LayoutDefinition {
    const deviceLayouts: DeviceLayout[] = []

    for (const [viewportType, gridLayoutObj] of Object.entries(gridLayout.layouts)) {
      const viewport = viewportType as Viewport
      const positions: PanelPosition[] = []

      // First, create a map of occupied positions to avoid overlap for spanning cells
      const occupiedPositions = new Map<string, boolean>()

      // Go through rows and process normal cells first
      let yPos = 0
      for (let rowIndex = 0; rowIndex < gridLayoutObj.rows.length; rowIndex++) {
        const row = gridLayoutObj.rows[rowIndex]
        let xPos = 0

        // Process cells in this row
        for (const cell of row.cells) {
          // Skip cells that have already been processed
          const posKey = `${xPos},${yPos}`
          if (occupiedPositions.has(posKey)) continue

          // Check if this cell spans multiple rows
          interface CellWithSpan extends LayoutCell {
            rowSpan?: number
          }
          const cellWithSpan = cell as CellWithSpan
          const rowSpan = cellWithSpan.rowSpan || 1

          // Calculate the cell width in grid units (out of 12)
          const cellWidth = Math.round((cell.width / 100) * 12)

          // Determine the panel ID
          const deviceType = cell.deviceType || 'any'
          const panelId = ['camera', 'telescope', 'focuser', 'filterwheel', 'dome', 'rotator', 'weather'].includes(deviceType)
            ? deviceType // Use device type as panel ID for known types
            : cell.id // Use cell ID for custom panels

          // Add the position
          positions.push({
            panelId,
            x: xPos,
            y: yPos,
            width: cellWidth,
            height: rowSpan
          })

          // Mark all positions that this cell occupies as used
          for (let r = 0; r < rowSpan; r++) {
            for (let c = 0; c < cellWidth; c++) {
              occupiedPositions.set(`${xPos + c},${yPos + r}`, true)
            }
          }

          // Move x position forward
          xPos += cellWidth
        }

        // Move to next row
        yPos += 1
      }

      deviceLayouts.push({
        deviceType: viewport,
        positions
      })
    }

    return {
      id: gridLayout.id,
      name: gridLayout.name,
      description: gridLayout.description,
      layouts: deviceLayouts,
      isDefault: gridLayout.isDefault,
      createdBy: gridLayout.createdBy,
      createdAt: gridLayout.createdAt,
      updatedAt: gridLayout.updatedAt,
      icon: gridLayout.icon
    }
  }

  // Computed property to convert all grid layouts to position layouts
  const convertedLayouts = computed((): LayoutDefinition[] => {
    return gridLayouts.value.map((layout) => gridToPositionLayout(layout))
  })

  // Computed properties that maintain the existing API
  const layouts = computed(() => convertedLayouts.value)

  const currentGridLayout = computed(() => {
    return gridLayouts.value.find((layout) => layout.id === currentLayoutId.value) || null
  })

  const currentLayout = computed(() => {
    const gridLayout = currentGridLayout.value
    if (!gridLayout) return null
    return gridToPositionLayout(gridLayout)
  })

  const currentDeviceLayout = computed(() => {
    if (!currentLayout.value) return null
    return currentLayout.value.layouts.find((layout) => layout.deviceType === currentViewport.value) || null
  })

  const currentViewportLayout = computed(() => {
    if (!currentGridLayout.value) return null
    return currentGridLayout.value.layouts[currentViewport.value] || null
  })

  // Legacy methods for backward compatibility
  function initLayout(): boolean {
    const savedLayout = loadLayout()
    if (savedLayout.length > 0) {
      layout.value = savedLayout
      return true
    }
    return false
  }

  // Initialize layouts from localStorage
  function initLayouts() {
    // Load grid layouts - now the primary source of truth
    const savedGridLayouts = localStorage.getItem(GRID_LAYOUTS_STORAGE_KEY)
    if (savedGridLayouts) {
      try {
        gridLayouts.value = JSON.parse(savedGridLayouts)
        console.log(
          'Loaded grid layouts:',
          gridLayouts.value.map((l) => l.id)
        )
      } catch (e) {
        console.error('Failed to parse saved grid layouts:', e)
      }
    }

    // If no grid layouts but we have legacy layouts, convert them
    if (gridLayouts.value.length === 0) {
      const savedLayouts = localStorage.getItem(LAYOUTS_STORAGE_KEY)
      if (savedLayouts) {
        try {
          // const parsedLayouts: LayoutDefinition[] = JSON.parse(savedLayouts)
          console.log('No grid layouts found, but found legacy layouts. Converting...')
          // TODO: Add logic to convert position layouts to grid layouts if needed
          // This would require a reverse conversion function
        } catch (e) {
          console.error('Failed to parse saved layouts:', e)
        }
      }
    }

    // Load current layout ID
    const savedCurrentLayoutId = localStorage.getItem(CURRENT_LAYOUT_ID_STORAGE_KEY)
    if (savedCurrentLayoutId) {
      currentLayoutId.value = savedCurrentLayoutId
    }
  }

  function loadLayout(): LayoutItem[] {
    const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (savedLayout) {
      try {
        return JSON.parse(savedLayout)
      } catch (e) {
        console.error('Failed to parse saved layout:', e)
      }
    }
    return []
  }

  function saveLayout() {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout.value))
  }

  function resetLayout() {
    layout.value = []
    saveLayout()
  }

  function updateLayout(newLayout: LayoutItem[]) {
    layout.value = newLayout
    saveLayout()
  }

  // New layout system actions
  function addLayout(layoutDef: LayoutDefinition) {
    console.warn('addLayout is deprecated. Use addGridLayout instead.')
    // For backward compatibility, try to find existing grid layout with same ID
    const existingGridLayout = gridLayouts.value.find((gl) => gl.id === layoutDef.id)
    if (existingGridLayout) {
      console.log(`Found existing grid layout with ID: ${layoutDef.id}, updating it instead of adding converted layout`)
      return
    }

    // TODO: Convert LayoutDefinition to GridLayoutDefinition if needed
    console.log(`Layout with ID ${layoutDef.id} not added - direct LayoutDefinition storage is deprecated`)
  }

  function addGridLayout(layout: GridLayoutDefinition) {
    // Check if layout with this ID already exists and remove it
    const existingIndex = gridLayouts.value.findIndex((l) => l.id === layout.id)
    if (existingIndex >= 0) {
      console.log(`Replacing existing grid layout with ID: ${layout.id}`)
      gridLayouts.value.splice(existingIndex, 1)
    }
    gridLayouts.value.push(layout)
    console.log(`Added/updated grid layout: ${layout.id}`)
    console.log(
      'Current grid layouts:',
      gridLayouts.value.map((l) => l.id)
    )
  }

  function updateLayoutById(id: string, updates: Partial<LayoutDefinition>) {
    console.warn('updateLayoutById is deprecated. Use updateGridLayout instead.')
    // Find the corresponding grid layout and update it
    const gridLayout = gridLayouts.value.find((gl) => gl.id === id)
    if (gridLayout) {
      if (updates.name) gridLayout.name = updates.name
      if (updates.description) gridLayout.description = updates.description
      if (updates.isDefault) gridLayout.isDefault = updates.isDefault
      if (updates.icon) gridLayout.icon = updates.icon
      if (updates.updatedAt) gridLayout.updatedAt = updates.updatedAt
      // Note: layouts/positions updates would require conversion
    }
  }

  function updateGridLayout(id: string, updates: Partial<GridLayoutDefinition>) {
    const index = gridLayouts.value.findIndex((layout) => layout.id === id)
    if (index !== -1) {
      gridLayouts.value[index] = { ...gridLayouts.value[index], ...updates }
    }
  }

  function deleteLayout(id: string) {
    deleteGridLayout(id)
  }

  function deleteGridLayout(id: string) {
    const index = gridLayouts.value.findIndex((layout) => layout.id === id)
    if (index !== -1) {
      gridLayouts.value.splice(index, 1)
      if (currentLayoutId.value === id) {
        // Reset current layout if we're deleting the active one
        currentLayoutId.value = gridLayouts.value.length > 0 ? gridLayouts.value[0].id : null
      }
    }
  }

  function setCurrentLayout(id: string) {
    console.log(`Setting current layout ID to: ${id}`)

    // Only change if layout exists or ID is empty (for reset)
    if (id === '' || gridLayouts.value.some((l) => l.id === id)) {
      currentLayoutId.value = id
      console.log(`Current layout ID set to: ${id}`)

      // Force reactive update by creating a shallow copy
      gridLayouts.value = [...gridLayouts.value]
    } else {
      console.warn(`Attempted to set layout to non-existent ID: ${id}`)
    }
  }

  function setViewport(viewport: Viewport) {
    currentViewport.value = viewport
  }

  // Initialize viewport detection and load saved layouts
  if (typeof window !== 'undefined') {
    updateViewport()
    window.addEventListener('resize', updateViewport)
    initLayouts()
  }

  return {
    // Legacy state for backward compatibility
    layout,
    layouts, // Now a computed property that converts grid layouts

    // Legacy methods for backward compatibility
    initLayout,
    loadLayout,
    saveLayout,
    resetLayout,
    updateLayout,

    // New state
    gridLayouts,
    currentLayoutId,
    currentViewport,

    // Computed
    currentLayout,
    currentGridLayout,
    currentDeviceLayout,
    currentViewportLayout,

    // Conversion helpers
    gridToPositionLayout,

    // New actions
    addLayout, // Maintained for backward compatibility
    addGridLayout,
    updateLayoutById, // Maintained for backward compatibility
    updateGridLayout,
    deleteLayout,
    deleteGridLayout,
    setCurrentLayout,
    setViewport,
    updateViewport,
    initLayouts
  }
})
