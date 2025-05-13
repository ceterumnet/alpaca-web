// Status: Good - Core Store
// This is the layout store that:
// - Manages application layout state
// - Handles panel positioning and sizing
// - Provides layout customization options
// - Supports responsive layouts
// - Maintains layout persistence

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type {
  LayoutDefinition,
  GridLayoutDefinition,
  Viewport,
  DeviceLayout,
  PanelPosition,
  LayoutCell,
  LayoutRow
} from '@/types/layouts/LayoutDefinition'
import { staticLayouts, type LayoutTemplate } from '@/types/layouts/StaticLayoutTemplates'

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
    // console.log('Converting grid layout to position layout:', gridLayout.id, gridLayout.name)

    const deviceLayouts: DeviceLayout[] = []

    for (const [viewportType, gridLayoutObj] of Object.entries(gridLayout.layouts)) {
      const viewport = viewportType as Viewport
      // console.log(`Processing viewport: ${viewport} with ${gridLayoutObj.rows.length} rows`)

      // Debugging: Log the structure of each row and cell
      // gridLayoutObj.rows.forEach((row, rowIndex) => {
      //   console.log(`Row ${rowIndex + 1}: ${row.cells.length} cells`)
      //   row.cells.forEach((cell, cellIndex) => {
      //     console.log(`  Cell ${cellIndex + 1}: id=${cell.id}, width=${cell.width}%, rowSpan=${(cell as any).rowSpan || 1}`)
      //   })
      // })

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
          // Special case for the second row in a hybrid layout
          if (rowIndex === 1 && row.cells.length === 1) {
            // This might be the special case for hybrid layout bottom row
            // console.log(`  Found potential bottom row cell: ${cell.id}`)

            // Check if the cell id is cell-3 (typical for hybrid layouts)
            if (cell.id === 'cell-3') {
              // This is the bottom right cell in a hybrid layout
              // console.log(`  Detected bottom right cell in hybrid layout: ${cell.id}`)

              // Force it to position correctly in the grid
              const cellWidth = Math.round((cell.width / 100) * 12)

              positions.push({
                panelId: cell.id,
                x: 12 - cellWidth, // Position it at the right side
                y: 1, // Second row
                width: cellWidth,
                height: 1
              })

              // console.log(`  Added special position for bottom right cell: x=${12 - cellWidth}, y=1, width=${cellWidth}, height=1`)
              continue
            }
          }

          // Skip cells that have already been processed
          const posKey = `${xPos},${yPos}`
          if (occupiedPositions.has(posKey)) {
            console.log(`  Skipping position ${posKey} (already occupied)`)
            xPos += Math.round((cell.width / 100) * 12) // Still advance the xPos
            continue
          }

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

          // console.log(`  Adding position for cell ${cell.id}: x=${xPos}, y=${yPos}, width=${cellWidth}, height=${rowSpan}`)

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
              const posToMark = `${xPos + c},${yPos + r}`
              occupiedPositions.set(posToMark, true)
              // console.log(`    Marking position ${posToMark} as occupied`)
            }
          }

          // Move x position forward
          xPos += cellWidth
        }

        // Move to next row
        yPos += 1
      }

      // console.log(`Created ${positions.length} positions for viewport ${viewport}`)
      // positions.forEach((pos, index) => {
      //   console.log(`  Position ${index + 1}: panelId=${pos.panelId}, x=${pos.x}, y=${pos.y}, width=${pos.width}, height=${pos.height}`)
      // })

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

    // If no grid layouts, create a default one from the first static template
    if (gridLayouts.value.length === 0) {
      console.log('No layouts found, creating default layout from static template')
      // Use the 2x2 grid as the default layout
      const defaultTemplate = staticLayouts.find((l) => l.id === '2x2') || staticLayouts[0]
      const defaultLayout = createLayoutFromTemplate('default', defaultTemplate, true)

      // Set as current layout
      currentLayoutId.value = defaultLayout.id
    }

    // Load current layout ID if not already set
    const savedCurrentLayoutId = localStorage.getItem(CURRENT_LAYOUT_ID_STORAGE_KEY)
    if (savedCurrentLayoutId && !currentLayoutId.value) {
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

  // Utility function to create a grid layout from a static template
  function createLayoutFromTemplate(layoutId: string, template: LayoutTemplate, isDefault: boolean = false): GridLayoutDefinition {
    // Create a unique ID for the new layout if not provided
    const newLayoutId = layoutId || `static-${template.id}-${Date.now()}`

    // Handle layout creation based on layout type
    const isHybridLayout = template.id.startsWith('hybrid-')

    // Create the appropriate layout structure
    let gridLayout: GridLayoutDefinition

    if (isHybridLayout) {
      // Create hybrid layout
      const hybridLayoutResult = createHybridLayout(template)
      gridLayout = {
        id: newLayoutId,
        name: template.name,
        description: template.name,
        layouts: {
          desktop: {
            rows: hybridLayoutResult.rows,
            panelIds: hybridLayoutResult.panelIds
          },
          tablet: {
            rows: hybridLayoutResult.rows,
            panelIds: hybridLayoutResult.panelIds
          },
          mobile: {
            rows: hybridLayoutResult.rows,
            panelIds: hybridLayoutResult.panelIds
          }
        },
        isDefault: isDefault,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    } else {
      // Regular grid layout
      const viewportLayout = createViewportLayout(template)
      gridLayout = {
        id: newLayoutId,
        name: template.name,
        description: template.name,
        layouts: {
          desktop: viewportLayout,
          tablet: viewportLayout,
          mobile: viewportLayout
        },
        isDefault: isDefault,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    }

    // Add the layout to the store
    addGridLayout(gridLayout)
    return gridLayout
  }

  // Create a viewport layout from a static template
  function createViewportLayout(template: LayoutTemplate) {
    // Special handling for hybrid layouts
    if (template.id === 'hybrid-50' || template.id === 'hybrid-60') {
      return createHybridLayout(template)
    }

    // For regular grid layouts
    return {
      rows: convertStaticToRows(template),
      panelIds: template.cells.map((cell) => cell.id)
    }
  }

  // Special handler for hybrid layouts
  function createHybridLayout(template: LayoutTemplate) {
    const spanningCell = template.cells.find((cell) => cell.rowSpan === 2)
    const topRightCell = template.cells.find((cell) => cell.row === 0 && cell.col === 1)
    const bottomRightCell = template.cells.find((cell) => cell.row === 1 && cell.col === 1)

    if (!spanningCell || !topRightCell || !bottomRightCell) {
      console.error('Invalid hybrid layout structure')
      return {
        rows: convertStaticToRows(template),
        panelIds: template.cells.map((cell) => cell.id)
      }
    }

    // Get the correct width values
    const leftWidth = spanningCell.width || 50
    const rightWidth = 100 - leftWidth

    // For hybrid layouts, manually position each cell
    const rows = [
      // First row: Left spanning cell + top right cell
      {
        id: 'row-1',
        cells: [
          // Left spanning cell (spans 2 rows)
          {
            id: spanningCell.id,
            deviceType: spanningCell.deviceType || 'any',
            name: spanningCell.name || spanningCell.id,
            priority: 'primary' as 'primary' | 'secondary' | 'tertiary',
            width: leftWidth,
            rowSpan: 2 // Preserve rowSpan
          },
          // Top right cell
          {
            id: topRightCell.id,
            deviceType: topRightCell.deviceType || 'any',
            name: topRightCell.name || topRightCell.id,
            priority: 'primary' as 'primary' | 'secondary' | 'tertiary',
            width: rightWidth
          }
        ],
        height: 50
      },
      // Second row: Contains the bottom right cell only
      {
        id: 'row-2',
        cells: [
          // Bottom right cell - explicitly positioned in second row
          {
            id: bottomRightCell.id,
            deviceType: bottomRightCell.deviceType || 'any',
            name: bottomRightCell.name || bottomRightCell.id,
            priority: 'primary' as 'primary' | 'secondary' | 'tertiary',
            width: rightWidth
          }
        ],
        height: 50
      }
    ]

    return {
      rows,
      panelIds: [spanningCell.id, topRightCell.id, bottomRightCell.id]
    }
  }

  function convertStaticToRows(template: LayoutTemplate) {
    const rows: LayoutRow[] = []

    // Use a special approach to handle cells with rowSpan
    const spanningCells = template.cells.filter((cell) => cell.rowSpan && cell.rowSpan > 1)
    const normalCells = template.cells.filter((cell) => !cell.rowSpan || cell.rowSpan === 1)

    // Handle rows
    for (let r = 0; r < template.rows; r++) {
      // Find normal cells for this row
      const rowCells = normalCells.filter((cell) => cell.row === r)

      // Find spanning cells that start at this row
      const spanningCellsForRow = spanningCells.filter((cell) => cell.row === r)

      // Calculate total width of spanning cells in this row
      const spanningCellsWidth = spanningCellsForRow.reduce((total, cell) => total + (cell.width || 50), 0)

      // Calculate remaining width for normal cells
      const remainingWidth = 100 - spanningCellsWidth
      const normalCellsCount = rowCells.length

      // Create row
      rows.push({
        id: `row-${r + 1}`,
        cells: [
          // Add spanning cells first
          ...spanningCellsForRow.map((cell) => ({
            id: cell.id,
            deviceType: cell.deviceType || 'any',
            name: cell.name || cell.id,
            priority: 'primary' as 'primary' | 'secondary' | 'tertiary',
            width: cell.width || 50, // Use cell's width or default to 50%
            rowSpan: cell.rowSpan // Preserve rowSpan
          })),

          // Add normal cells
          ...rowCells.map((cell) => ({
            id: cell.id,
            deviceType: cell.deviceType || 'any',
            name: cell.name || cell.id,
            priority: 'primary' as 'primary' | 'secondary' | 'tertiary',
            width: cell.width || (normalCellsCount ? remainingWidth / normalCellsCount : 100)
          }))
        ],
        height: 100 / template.rows
      })
    }

    return rows
  }

  // Find an existing layout that matches a template
  function findLayoutByTemplate(templateId: string): GridLayoutDefinition | undefined {
    return gridLayouts.value.find((gl) => gl.id.startsWith(`static-${templateId}-`))
  }

  // Get or create a layout from a template
  function getOrCreateTemplateLayout(templateId: string): GridLayoutDefinition {
    // Find the template
    const template = staticLayouts.find((l) => l.id === templateId)
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`)
    }

    // Check if we already have a layout with this template
    const existingLayout = findLayoutByTemplate(templateId)
    if (existingLayout) {
      return existingLayout
    }

    // Create a new layout from the template
    return createLayoutFromTemplate(`static-${templateId}-${Date.now()}`, template)
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
    initLayouts,

    // Template utility methods
    createLayoutFromTemplate,
    findLayoutByTemplate,
    getOrCreateTemplateLayout,

    // Internal utility methods (exposed to support components if needed)
    createViewportLayout,
    createHybridLayout,
    convertStaticToRows
  }
})
