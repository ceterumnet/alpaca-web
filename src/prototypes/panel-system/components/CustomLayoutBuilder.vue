// Status: Legacy - Prototype Component // This is the custom layout builder prototype that: // -
Tests custom layout creation // - Provides responsive layout preview // - Demonstrates panel
positioning // - Supports device type assignment // - NOTE: Superseded by new panel system
implementation

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'

// Define the cell interface
interface Cell {
  id: string
  deviceType: string | null
  name: string
  priority: 'primary' | 'secondary' | 'tertiary'
  width: number // Percentage width within row
}

// Define the row interface
interface Row {
  id: string
  cells: Cell[]
  height: number // Height as percentage of container
}

// Define the layout interface for each device type
interface Layout {
  rows: Row[]
  panelIds: string[] // Keeps track of all panels included in this layout
}

// Define the viewport types for responsive preview
type Viewport = 'desktop' | 'tablet' | 'mobile'

// Current viewport for editing and preview
const currentViewport = ref<Viewport>('desktop')

// Track all device panels across layouts
const allPanels = reactive<
  Map<string, { deviceType: string; name: string; priority: 'primary' | 'secondary' | 'tertiary' }>
>(new Map())

// Layouts for each viewport type
const layouts = reactive<Record<Viewport, Layout>>({
  desktop: {
    rows: [
      {
        id: 'row-1-desktop',
        cells: [
          {
            id: 'cell-1',
            deviceType: 'camera',
            name: 'Main Camera',
            priority: 'primary',
            width: 100 // Full width for first cell
          }
        ],
        height: 33.33 // Default to 1/3 of vertical space
      },
      {
        id: 'row-2-desktop',
        cells: [
          {
            id: 'cell-2',
            deviceType: 'telescope',
            name: 'Telescope Control',
            priority: 'secondary',
            width: 50
          },
          {
            id: 'cell-3',
            deviceType: 'data',
            name: 'Data Panel',
            priority: 'secondary',
            width: 50
          }
        ],
        height: 33.33 // Default to 1/3 of vertical space
      },
      {
        id: 'row-3-desktop',
        cells: [
          {
            id: 'cell-4',
            deviceType: 'weather',
            name: 'Weather',
            priority: 'tertiary',
            width: 33.33
          },
          {
            id: 'cell-5',
            deviceType: 'focuser',
            name: 'Focuser',
            priority: 'tertiary',
            width: 33.33
          },
          {
            id: 'cell-6',
            deviceType: 'filterwheel',
            name: 'Filter Wheel',
            priority: 'tertiary',
            width: 33.33
          }
        ],
        height: 33.33 // Default to 1/3 of vertical space
      }
    ],
    panelIds: ['cell-1', 'cell-2', 'cell-3', 'cell-4', 'cell-5', 'cell-6']
  },
  tablet: {
    rows: [
      {
        id: 'row-1-tablet',
        cells: [
          {
            id: 'cell-1',
            deviceType: 'camera',
            name: 'Main Camera',
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
            id: 'cell-2',
            deviceType: 'telescope',
            name: 'Telescope Control',
            priority: 'secondary',
            width: 100
          }
        ],
        height: 30
      },
      {
        id: 'row-3-tablet',
        cells: [
          {
            id: 'cell-3',
            deviceType: 'data',
            name: 'Data Panel',
            priority: 'secondary',
            width: 50
          },
          {
            id: 'cell-5',
            deviceType: 'focuser',
            name: 'Focuser',
            priority: 'tertiary',
            width: 50
          }
        ],
        height: 30
      }
    ],
    panelIds: ['cell-1', 'cell-2', 'cell-3', 'cell-5']
  },
  mobile: {
    rows: [
      {
        id: 'row-1-mobile',
        cells: [
          {
            id: 'cell-1',
            deviceType: 'camera',
            name: 'Main Camera',
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
            id: 'cell-2',
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
            id: 'cell-3',
            deviceType: 'data',
            name: 'Data Panel',
            priority: 'secondary',
            width: 100
          }
        ],
        height: 33.33
      }
    ],
    panelIds: ['cell-1', 'cell-2', 'cell-3']
  }
})

// Initialize allPanels from the desktop layout
layouts.desktop.rows.forEach((row) => {
  row.cells.forEach((cell) => {
    allPanels.set(cell.id, {
      deviceType: cell.deviceType || 'any',
      name: cell.name,
      priority: cell.priority
    })
  })
})

// Available device types for cells
const deviceTypes = [
  { id: 'camera', name: 'Camera', icon: '📷' },
  { id: 'telescope', name: 'Telescope', icon: '🔭' },
  { id: 'focuser', name: 'Focuser', icon: '🔍' },
  { id: 'filterwheel', name: 'Filter Wheel', icon: '🎨' },
  { id: 'weather', name: 'Weather', icon: '☁️' },
  { id: 'dome', name: 'Dome', icon: '🏠' },
  { id: 'data', name: 'Data Display', icon: '📊' },
  { id: 'any', name: 'Any Device', icon: '📦' }
]

// Priority options
const priorityOptions = [
  { value: 'primary', label: 'Primary', description: 'Always visible, gets most space' },
  { value: 'secondary', label: 'Secondary', description: 'Visible on most screens' },
  { value: 'tertiary', label: 'Tertiary', description: 'May collapse on small screens' }
]

// Currently selected cell for editing
const selectedCellId = ref<string | null>(null)
const selectedRowId = ref<string | null>(null)

// Get the current layout based on viewport
const currentLayout = computed(() => {
  return layouts[currentViewport.value]
})

// Get the selected cell from the current layout
const selectedCell = computed(() => {
  if (!selectedCellId.value) return null

  for (const row of currentLayout.value.rows) {
    const cell = row.cells.find((cell) => cell.id === selectedCellId.value)
    if (cell) return cell
  }

  return null
})

// Get the row containing a cell in the current layout
function getRowContainingCell(cellId: string): Row | null {
  if (!cellId) return null

  for (const row of currentLayout.value.rows) {
    if (row.cells.some((cell) => cell.id === cellId)) {
      return row
    }
  }
  return null
}

// Add a new row to the current layout
function addRow() {
  const newRowId = `row-${Date.now()}-${currentViewport.value}`

  // Adjust heights of all rows when adding a new one
  const newRowCount = currentLayout.value.rows.length + 1
  const equalHeight = 100 / newRowCount

  // Adjust existing rows
  currentLayout.value.rows.forEach((row) => {
    row.height = equalHeight
  })

  // Add new row
  const newCell = {
    id: `cell-${Date.now()}`,
    deviceType: 'any',
    name: 'New Cell',
    priority: 'secondary',
    width: 100 // Full width by default
  }

  currentLayout.value.rows.push({
    id: newRowId,
    cells: [newCell],
    height: equalHeight
  })

  // Add to list of all panels
  allPanels.set(newCell.id, {
    deviceType: newCell.deviceType || 'any',
    name: newCell.name,
    priority: newCell.priority
  })

  // Update panelIds list
  currentLayout.value.panelIds.push(newCell.id)
}

// Add a cell to a specific row
function addCellToRow(rowId: string) {
  const row = currentLayout.value.rows.find((r) => r.id === rowId)
  if (!row) return

  // Calculate new width for all cells based on standard column layouts
  const cellCount = row.cells.length + 1

  // Use standard column widths based on cell count
  if (cellCount === 2) {
    // Two equal columns
    row.cells.forEach((cell) => {
      cell.width = 50
    })
  } else if (cellCount === 3) {
    // Three equal columns
    row.cells.forEach((cell) => {
      cell.width = 33.33
    })
  } else if (cellCount === 4) {
    // Four equal columns
    row.cells.forEach((cell) => {
      cell.width = 25
    })
  } else {
    // Default equal distribution
    const newWidth = 100 / cellCount
    row.cells.forEach((cell) => {
      cell.width = newWidth
    })
  }

  // Add new cell with appropriate width
  const newCell = {
    id: `cell-${Date.now()}`,
    deviceType: 'any',
    name: 'New Cell',
    priority: 'secondary',
    width: row.cells.length > 0 ? row.cells[0].width : 100
  }

  row.cells.push(newCell)

  // Add to list of all panels
  allPanels.set(newCell.id, {
    deviceType: newCell.deviceType || 'any',
    name: newCell.name,
    priority: newCell.priority
  })

  // Update panelIds list
  currentLayout.value.panelIds.push(newCell.id)
}

// Delete a row from the current layout
function deleteRow(rowId: string) {
  const index = currentLayout.value.rows.findIndex((row) => row.id === rowId)
  if (index !== -1) {
    if (currentLayout.value.rows.length > 1) {
      // Get the cell IDs to remove
      const cellsToRemove = currentLayout.value.rows[index].cells.map((cell) => cell.id)

      // Remove the row
      currentLayout.value.rows.splice(index, 1)

      // Redistribute heights
      const equalHeight = 100 / currentLayout.value.rows.length
      currentLayout.value.rows.forEach((row) => {
        row.height = equalHeight
      })

      // Update panelIds list
      currentLayout.value.panelIds = currentLayout.value.panelIds.filter(
        (id) => !cellsToRemove.includes(id)
      )
    } else {
      alert('Cannot delete the last row')
    }
  }
}

// Delete a cell from a row
function deleteCell(cellId: string) {
  const row = getRowContainingCell(cellId)
  if (!row) return

  // Can't delete the last cell in a row
  if (row.cells.length <= 1) {
    alert('Cannot delete the last cell in a row')
    return
  }

  const cellIndex = row.cells.findIndex((cell) => cell.id === cellId)
  if (cellIndex !== -1) {
    row.cells.splice(cellIndex, 1)

    // Recalculate widths based on standard column layouts
    const remainingCellCount = row.cells.length

    if (remainingCellCount === 1) {
      // One cell takes full width
      row.cells[0].width = 100
    } else if (remainingCellCount === 2) {
      // Two equal cells
      row.cells[0].width = 50
      row.cells[1].width = 50
    } else if (remainingCellCount === 3) {
      // Three equal cells
      row.cells.forEach((cell) => {
        cell.width = 33.33
      })
    } else {
      // Equal distribution
      const equalWidth = 100 / remainingCellCount
      row.cells.forEach((cell) => {
        cell.width = equalWidth
      })
    }

    // Update panelIds list
    currentLayout.value.panelIds = currentLayout.value.panelIds.filter((id) => id !== cellId)
  }
}

// Device panel selector
const availablePanels = computed(() => {
  // Filter panels that aren't already in the current layout
  const panelsInCurrentLayout = new Set(currentLayout.value.panelIds)

  // Get panels from other layouts that aren't in the current layout
  return Array.from(allPanels.entries())
    .filter(([id]) => !panelsInCurrentLayout.has(id))
    .map(([id, panel]) => ({
      id,
      deviceType: panel.deviceType,
      name: panel.name,
      priority: panel.priority
    }))
})

// Add an existing panel to the current layout
function addExistingPanelToRow(rowId: string, panelId: string) {
  const row = currentLayout.value.rows.find((r) => r.id === rowId)
  if (!row) return

  const panel = allPanels.get(panelId)
  if (!panel) return

  // Calculate new width for all cells
  const cellCount = row.cells.length + 1
  const newWidth = 100 / cellCount

  row.cells.forEach((cell) => {
    cell.width = newWidth
  })

  // Add the panel to the row
  row.cells.push({
    id: panelId,
    deviceType: panel.deviceType,
    name: panel.name,
    priority: panel.priority,
    width: newWidth
  })

  // Update panelIds list
  currentLayout.value.panelIds.push(panelId)
}

// Update panel properties across all layouts when edited
function updatePanelProperties(
  panelId: string,
  properties: {
    name?: string
    deviceType?: string
    priority?: 'primary' | 'secondary' | 'tertiary'
  }
) {
  // Update in allPanels map
  const panel = allPanels.get(panelId)
  if (panel) {
    if (properties.name) panel.name = properties.name
    if (properties.deviceType) panel.deviceType = properties.deviceType
    if (properties.priority) panel.priority = properties.priority
  }

  // Update in all layouts
  Object.values(layouts).forEach((layout) => {
    layout.rows.forEach((row) => {
      const cell = row.cells.find((c) => c.id === panelId)
      if (cell) {
        if (properties.name) cell.name = properties.name
        if (properties.deviceType) cell.deviceType = properties.deviceType
        if (properties.priority) cell.priority = properties.priority
      }
    })
  })
}

// Switch between different viewport layouts
function switchViewport(viewport: Viewport) {
  currentViewport.value = viewport
  selectedCellId.value = null
  selectedRowId.value = null
}

// Handle drag start on divider
function startDrag(event: MouseEvent, rowId: string, cellIndex: number) {
  event.preventDefault()

  const row = currentLayout.value.rows.find((r) => r.id === rowId)
  if (!row || cellIndex >= row.cells.length - 1) return

  const startX = event.clientX
  const cell1 = row.cells[cellIndex]
  const cell2 = row.cells[cellIndex + 1]
  const initialWidth1 = cell1.width
  const initialWidth2 = cell2.width
  const totalWidth = initialWidth1 + initialWidth2

  // Define standard column widths to snap to
  const columnSnapPoints = [
    // 2-column layouts
    25, 50, 75,
    // 3-column layouts
    33.33, 66.67,
    // 4-column layouts
    20, 40, 60, 80
  ].sort((a, b) => a - b) // Sort ascending

  const onMouseMove = (e: MouseEvent) => {
    const containerWidth = document.querySelector(`.row-${rowId}`)?.clientWidth || 1000
    const deltaX = e.clientX - startX
    const deltaPercentage = (deltaX / containerWidth) * 100

    // Calculate raw new width
    const rawWidth1 = initialWidth1 + deltaPercentage

    // Find the closest snap point
    let closestSnapPoint = 50 // Default to 50%
    let minDistance = 100 // Start with a large value

    // Find the closest snap point
    for (const snapPoint of columnSnapPoints) {
      const distance = Math.abs(rawWidth1 - snapPoint)
      if (distance < minDistance) {
        minDistance = distance
        closestSnapPoint = snapPoint
      }
    }

    // Apply snapped width if within 5% of a snap point
    let newWidth1 = minDistance < 5 ? closestSnapPoint : rawWidth1

    // Ensure within bounds (minimum 15%, maximum 85%)
    newWidth1 = Math.max(15, Math.min(85, newWidth1))
    const newWidth2 = totalWidth - newWidth1

    cell1.width = newWidth1
    cell2.width = newWidth2
  }

  const onMouseUp = () => {
    // Force exact snapping on mouse up
    let closestSnapPoint = 50 // Default to 50%
    let minDistance = 100

    // Find the closest snap point
    for (const snapPoint of columnSnapPoints) {
      const distance = Math.abs(cell1.width - snapPoint)
      if (distance < minDistance) {
        minDistance = distance
        closestSnapPoint = snapPoint
      }
    }

    // Apply exact snap on mouse up
    cell1.width = closestSnapPoint
    cell2.width = totalWidth - cell1.width

    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

// Handle dragging row divider to adjust height
function startRowHeightDrag(event: MouseEvent, rowIndex: number) {
  event.preventDefault()

  if (rowIndex >= currentLayout.value.rows.length - 1) return

  const row1 = currentLayout.value.rows[rowIndex]
  const row2 = currentLayout.value.rows[rowIndex + 1]
  const initialHeight1 = row1.height
  const initialHeight2 = row2.height
  const totalHeight = initialHeight1 + initialHeight2

  // Define standard height snap points
  const heightSnapPoints = [
    // Equal heights
    50,
    // 2:1 ratio
    33.33, 66.67,
    // 3:1 ratio
    25, 75,
    // 4:1 ratio
    20, 80
  ].sort((a, b) => a - b) // Sort ascending

  const layoutElement = document.querySelector('.custom-layout')
  const layoutHeight = layoutElement?.clientHeight || 600
  const startY = event.clientY

  const onMouseMove = (e: MouseEvent) => {
    const deltaY = e.clientY - startY
    const deltaPercentage = (deltaY / layoutHeight) * 100

    // Calculate raw new height
    const rawHeight1 = initialHeight1 + deltaPercentage

    // Find the closest snap point
    let closestSnapPoint = 50 // Default to 50%
    let minDistance = 100 // Start with a large value

    // Find the closest snap point
    for (const snapPoint of heightSnapPoints) {
      const distance = Math.abs(rawHeight1 - snapPoint)
      if (distance < minDistance) {
        minDistance = distance
        closestSnapPoint = snapPoint
      }
    }

    // Apply snapped height if within 5% of a snap point
    let newHeight1 = minDistance < 5 ? closestSnapPoint : rawHeight1

    // Ensure within bounds (minimum 15%, maximum 85%)
    newHeight1 = Math.max(15, Math.min(85, newHeight1))
    const newHeight2 = totalHeight - newHeight1

    row1.height = newHeight1
    row2.height = newHeight2
  }

  const onMouseUp = () => {
    // Force exact snapping on mouse up
    let closestSnapPoint = 50 // Default to 50%
    let minDistance = 100

    // Find the closest snap point
    for (const snapPoint of heightSnapPoints) {
      const distance = Math.abs(row1.height - snapPoint)
      if (distance < minDistance) {
        minDistance = distance
        closestSnapPoint = snapPoint
      }
    }

    // Apply exact snap on mouse up
    row1.height = closestSnapPoint
    row2.height = totalHeight - closestSnapPoint

    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

// Update the selected cell
function updateCellDetails(field: string, value: string | number) {
  if (!selectedCell.value) return

  const cell = selectedCell.value
  switch (field) {
    case 'name':
      cell.name = String(value)
      break
    case 'deviceType':
      cell.deviceType = String(value)
      break
    case 'priority':
      cell.priority = String(value) as 'primary' | 'secondary' | 'tertiary'
      break
  }
}

// Generate CSS code for the layout
function generateLayoutCSS() {
  let css = `/* Desktop Layout */
.custom-layout {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
}

.layout-row {
  display: flex;
  gap: 1rem;
  min-height: 150px;
}

`

  // Add cell-specific CSS
  currentLayout.value.rows.forEach((row) => {
    row.cells.forEach((cell) => {
      css += `.cell-${cell.id} {
  flex: ${cell.width} ${cell.width} 0%;
}

`
    })
  })

  // Add responsive CSS
  css += `/* Tablet Layout */
@media (max-width: 1024px) {
  .layout-row {
    flex-direction: column;
  }
  
  /* Primary cells remain visible */
`

  currentLayout.value.rows.forEach((row) => {
    row.cells.forEach((cell) => {
      if (cell.priority === 'primary') {
        css += `  .cell-${cell.id} {
    display: block;
    width: 100%;
    margin-bottom: 1rem;
  }
`
      } else if (cell.priority === 'secondary') {
        css += `  .cell-${cell.id} {
    display: block;
    width: 100%;
    margin-bottom: 1rem;
  }
`
      } else {
        css += `  .cell-${cell.id} {
    display: none;
  }
`
      }
    })
  })

  css += `}

/* Mobile Layout */
@media (max-width: 768px) {
  /* Only primary cells visible */
`

  currentLayout.value.rows.forEach((row) => {
    row.cells.forEach((cell) => {
      if (cell.priority === 'primary') {
        css += `  .cell-${cell.id} {
    display: block;
    width: 100%;
    margin-bottom: 1rem;
  }
`
      } else {
        css += `  .cell-${cell.id} {
    display: none;
  }
`
      }
    })
  })

  css += `}`

  return css
}
</script>

<template>
  <div class="custom-layout-builder">
    <div class="builder-toolbar">
      <h2>Custom Layout Builder</h2>
      <div class="viewport-selector">
        <button
          :class="{ active: currentViewport === 'desktop' }"
          @click="currentViewport = 'desktop'"
        >
          🖥️ Desktop
        </button>
        <button
          :class="{ active: currentViewport === 'tablet' }"
          @click="currentViewport = 'tablet'"
        >
          📱 Tablet
        </button>
        <button
          :class="{ active: currentViewport === 'mobile' }"
          @click="currentViewport = 'mobile'"
        >
          📱 Mobile
        </button>
      </div>
      <div class="layout-actions">
        <button class="action-button" @click="addRow">Add Row</button>
      </div>
    </div>

    <div class="builder-content">
      <div class="layout-preview" :class="currentViewport">
        <div class="custom-layout">
          <!-- Interleave rows and dividers -->
          <template v-for="(row, index) in currentLayout.rows" :key="row.id">
            <!-- Row -->
            <div
              :class="[
                'layout-row',
                `row-${row.id}`,
                { 'single-cell-row': row.cells.length === 1 }
              ]"
              :style="{
                height: `${row.height}%`,
                minHeight: '150px' // Minimum height for usability
              }"
            >
              <div
                v-for="(cell, cellIndex) in row.cells"
                :key="cell.id"
                :class="[
                  'layout-cell',
                  `cell-${cell.id}`,
                  {
                    selected: selectedCellId === cell.id,
                    'single-cell': row.cells.length === 1
                  }
                ]"
                :style="{
                  flex:
                    row.cells.length === 1
                      ? '1 1 auto'
                      : `0 0 calc(${cell.width}% - ${row.cells.length > 1 ? 0.95 * row.cells.length : 0}rem / ${row.cells.length})`
                }"
                @click="selectCell(cell.id)"
              >
                <div class="cell-content">
                  <div class="cell-header">
                    <span class="cell-icon">
                      {{ deviceTypes.find((d) => d.id === cell.deviceType)?.icon || '📦' }}
                    </span>
                    <span class="cell-name">{{ cell.name }}</span>
                    <span class="cell-priority" :class="cell.priority">
                      {{ priorityOptions.find((p) => p.value === cell.priority)?.label }}
                    </span>
                  </div>
                  <div class="cell-body">
                    <span class="device-type">
                      {{ deviceTypes.find((d) => d.id === cell.deviceType)?.name || 'Any Device' }}
                    </span>
                  </div>
                </div>

                <!-- Vertical divider between cells (except last cell) -->
                <div
                  v-if="cellIndex < row.cells.length - 1"
                  class="cell-divider vertical"
                  @mousedown="startDrag($event, row.id, cellIndex)"
                ></div>
              </div>

              <div class="row-actions">
                <button class="row-action-button" title="Add Cell" @click="addCellToRow(row.id)">
                  +
                </button>
                <button
                  class="row-action-button delete"
                  title="Delete Row"
                  :disabled="currentLayout.rows.length <= 1"
                  @click="deleteRow(row.id)"
                >
                  🗑️
                </button>
              </div>
            </div>

            <!-- Horizontal divider after row (except last row) -->
            <div
              v-if="index < currentLayout.rows.length - 1"
              :key="`divider-${row.id}`"
              class="row-divider"
              @mousedown="startRowHeightDrag($event, index)"
            ></div>
          </template>
        </div>
      </div>

      <div class="properties-panel">
        <div v-if="selectedCell" class="cell-properties">
          <h3>Cell Properties</h3>

          <div class="property-group">
            <label for="cell-name">Name:</label>
            <input
              id="cell-name"
              v-model="selectedCell.name"
              @input="
                (event: Event) =>
                  updateCellDetails('name', (event.target as HTMLInputElement).value)
              "
            />
          </div>

          <div class="property-group">
            <label for="device-type">Device Type:</label>
            <select
              id="device-type"
              :value="selectedCell.deviceType"
              @change="
                (event: Event) =>
                  updateCellDetails('deviceType', (event.target as HTMLSelectElement).value)
              "
            >
              <option v-for="type in deviceTypes" :key="type.id" :value="type.id">
                {{ type.icon }} {{ type.name }}
              </option>
            </select>
          </div>

          <div class="property-group">
            <label for="priority">Priority:</label>
            <select
              id="priority"
              :value="selectedCell.priority"
              @change="
                (event: Event) =>
                  updateCellDetails('priority', (event.target as HTMLSelectElement).value)
              "
            >
              <option v-for="option in priorityOptions" :key="option.value" :value="option.value">
                {{ option.label }} - {{ option.description }}
              </option>
            </select>
          </div>

          <div class="property-group">
            <label>Width: {{ selectedCell.width.toFixed(1) }}%</label>
          </div>

          <div class="property-actions">
            <button
              class="action-button delete"
              :disabled="
                !selectedCell ||
                !selectedCell.id ||
                (getRowContainingCell(selectedCell.id)?.cells.length || 0) <= 1
              "
              @click="deleteCell(selectedCell.id)"
            >
              Delete Cell
            </button>
          </div>
        </div>

        <div v-else class="no-selection">
          <p>Select a cell to edit its properties</p>
        </div>

        <div class="layout-code">
          <h3>Generated CSS</h3>
          <pre><code>{{ generateLayoutCSS() }}</code></pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-layout-builder {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
}

.builder-toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

.builder-toolbar h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.viewport-selector {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}

.viewport-selector button {
  padding: 0.5rem;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.viewport-selector button.active {
  background-color: #0078d4;
  color: white;
  border-color: #0078d4;
}

.layout-actions {
  display: flex;
  gap: 0.5rem;
}

.action-button {
  padding: 0.5rem 1rem;
  background-color: #0078d4;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.action-button:hover {
  background-color: #005a9e;
}

.action-button.delete {
  background-color: #d83b01;
}

.action-button.delete:hover {
  background-color: #a92d01;
}

.action-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.builder-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.layout-preview {
  flex: 2;
  padding: 1rem;
  background-color: #f9f9f9;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.layout-preview.tablet {
  max-width: 768px;
  margin: 0 auto;
}

.layout-preview.mobile {
  max-width: 375px;
  margin: 0 auto;
}

.custom-layout {
  display: flex;
  flex-direction: column;
  gap: 0; /* Remove gap for exact height calculations */
  height: 100%; /* Fixed height container */
  min-height: 600px; /* Reasonable minimum height */
  background-color: #f0f0f0;
  padding: 1rem;
  box-sizing: border-box;
  position: relative; /* For absolute positioning of row dividers */
  overflow: auto; /* Allow scrolling if rows have large min-heights */
}

.layout-row {
  display: flex;
  gap: 1rem;
  position: relative;
  background-image: none;
  padding: 0.5rem;
  box-sizing: border-box;
  width: calc(100% - 3rem);
  margin: 0 auto;
  overflow: visible; /* Allow divider to be visible */
}

/* Don't need additional margin since we're using template now */
.layout-row + .layout-row {
  margin-top: 0;
}

/* Style for vertical cell divider */
.cell-divider.vertical {
  position: absolute;
  top: 0;
  right: -0.5rem;
  width: 12px;
  height: 100%;
  background-color: transparent;
  cursor: col-resize;
  z-index: 20;
}

/* Keep existing divider styling */
.cell-divider::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 4px;
  height: 24px;
  background-color: rgba(0, 120, 212, 0.7);
  border-radius: 2px;
}

/* Horizontal row divider styling */
.row-divider {
  position: relative;
  height: 12px;
  width: calc(100% - 3rem);
  margin: 0 auto;
  cursor: row-resize;
  z-index: 20;
  background-color: transparent;
}

.row-divider::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  height: 4px;
  width: 24px;
  background-color: rgba(0, 120, 212, 0.7);
  border-radius: 2px;
}

.row-divider:hover {
  background-color: rgba(0, 120, 212, 0.2);
}

.row-divider:active {
  background-color: rgba(0, 120, 212, 0.3);
}

/* Add guide indicators for row heights */
.row-divider::before {
  content: '';
  position: absolute;
  left: -10px;
  top: 0;
  bottom: 0;
  width: 5px;
  background-image: 
    /* 1/2 marker */
    linear-gradient(
      to bottom,
      rgba(0, 120, 212, 1) calc(50% - 1px),
      rgba(0, 120, 212, 1) calc(50% + 1px),
      transparent calc(50% + 1px)
    ),
    /* 1/3 and 2/3 markers */
      linear-gradient(
        to bottom,
        rgba(0, 180, 0, 0.7) calc(33.33% - 1px),
        rgba(0, 180, 0, 0.7) calc(33.33% + 1px),
        transparent calc(33.33% + 1px),
        transparent calc(66.67% - 1px),
        rgba(0, 180, 0, 0.7) calc(66.67% - 1px),
        rgba(0, 180, 0, 0.7) calc(66.67% + 1px)
      );
  pointer-events: none;
}

.layout-cell {
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: relative;
  box-sizing: border-box; /* Ensure padding is included in width calc */
  max-width: 100%; /* Prevent overflow */
  overflow: hidden; /* Ensure content doesn't overflow */
}

/* Adjust single-cell to take full width */
.layout-cell.single-cell {
  width: 100%;
  flex: 1 1 auto !important;
  max-width: calc(100% - 1rem) !important; /* Exactly as user suggested */
}

.layout-cell.selected {
  border: 2px solid #0078d4;
  box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.2);
}

.cell-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.cell-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.cell-icon {
  font-size: 1.2rem;
}

.cell-name {
  font-weight: 600;
  flex: 1;
}

.cell-priority {
  font-size: 0.8rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
}

.cell-priority.primary {
  background-color: #107c10;
  color: white;
}

.cell-priority.secondary {
  background-color: #00b7c3;
  color: white;
}

.cell-priority.tertiary {
  background-color: #a4262c;
  color: white;
}

.cell-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f9f9f9;
  border-radius: 4px;
  padding: 1rem;
  margin-top: 0.5rem;
}

.row-actions {
  position: absolute;
  right: -2.5rem; /* Move slightly closer */
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.row-action-button {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background-color: white;
  border: 1px solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-weight: bold;
}

.row-action-button:hover {
  background-color: #f0f0f0;
}

.row-action-button.delete {
  color: #d83b01;
}

.row-action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.properties-panel {
  flex: 1;
  padding: 1rem;
  background-color: white;
  border-left: 1px solid #e0e0e0;
  overflow: auto;
}

.cell-properties {
  margin-bottom: 2rem;
}

.property-group {
  margin-bottom: 1rem;
}

.property-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.property-group input,
.property-group select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.property-actions {
  margin-top: 1.5rem;
}

.no-selection {
  padding: 2rem;
  text-align: center;
  color: #666;
  background-color: #f9f9f9;
  border-radius: 6px;
  margin-bottom: 2rem;
}

.layout-code {
  margin-top: 2rem;
}

.layout-code pre {
  background-color: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  max-height: 300px;
  overflow: auto;
  font-size: 0.8rem;
}

/* Responsive layout for builder itself */
@media (max-width: 1024px) {
  .builder-content {
    flex-direction: column;
  }

  .properties-panel {
    border-left: none;
    border-top: 1px solid #e0e0e0;
  }
}
</style>
