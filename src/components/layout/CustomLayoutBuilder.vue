// Status: Good - Core Component 
// This is the layout builder component that: 
// - Provides layout customization 
// - Handles drag-and-drop operations 
// - Supports grid-based layouts 
// - Manages layout persistence 
// - Maintains layout state

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useLayoutStore } from '@/stores/useLayoutStore'
import type { LayoutRow, GridLayout, Viewport } from '@/types/layouts/LayoutDefinition'

// Define props
const props = defineProps({
  layoutId: {
    type: String,
    default: null,
    required: false
  }
})

// Define emits
const emit = defineEmits(['save', 'cancel'])

// Initialize layout store
const layoutStore = useLayoutStore()

// Track if there are unsaved changes
const hasUnsavedChanges = ref<boolean>(false)
const originalLayoutData = ref<string | null>(null)

// Current viewport for editing and preview
const currentViewport = ref<Viewport>('desktop')
const previewMode = ref<boolean>(false)
const previewViewport = ref<Viewport>('desktop')

// Track all device panels across layouts
const allPanels = reactive(
  new Map<
    string,
    {
      deviceType: string
      name: string
      priority: 'primary' | 'secondary' | 'tertiary'
    }
  >()
)

// Layouts for each viewport type
const layouts = reactive<Record<Viewport, GridLayout>>({
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
  
  // Make sure all rows have proper cell widths
  recalculateRowCellWidths(row);
})

// Available device types for cells
const deviceTypes = [
  { id: 'camera', name: 'Camera', icon: '📷' },
  { id: 'telescope', name: 'Telescope', icon: '🔭' },
  { id: 'focuser', name: 'Focuser', icon: '🔍' },
  { id: 'filterwheel', name: 'Filter Wheel', icon: '🎨' },
  { id: 'weather', name: 'Weather', icon: '☁️' },
  { id: 'dome', name: 'Dome', icon: '🏠' },
  { id: 'rotator', name: 'Rotator', icon: '🔄' },
  { id: 'observingconditions', name: 'Observing Conditions', icon: '🌡️' },
  { id: 'safetymonitor', name: 'Safety Monitor', icon: '🛡️' },
  { id: 'switch', name: 'Switch', icon: '🔌' },
  { id: 'covercalibrator', name: 'Cover Calibrator', icon: '🔦' },
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

// Layout name and description
const layoutName = ref<string>('New Layout')
const layoutDescription = ref<string>('')
const isDefaultLayout = ref<boolean>(false)
const isEditingExistingLayout = ref<boolean>(false)

// Get the current layout based on viewport
const currentLayout = computed(() => {
  return layouts[currentViewport.value]
})

// Get the selected row from the current layout
const selectedRow = computed(() => {
  if (!selectedRowId.value) return null
  return currentLayout.value.rows.find(row => row.id === selectedRowId.value)
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
function getRowContainingCell(cellId: string): LayoutRow | null {
  if (!cellId) return null

  for (const row of currentLayout.value.rows) {
    if (row.cells.some((cell) => cell.id === cellId)) {
      return row
    }
  }
  return null
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
      
      // Mark as changed
      markAsChanged();
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
    // Remove the cell
    row.cells.splice(cellIndex, 1)
    
    // Recalculate widths to fill 100%
    recalculateRowCellWidths(row)

    // Update panelIds list
    currentLayout.value.panelIds = currentLayout.value.panelIds.filter((id) => id !== cellId)
  }
}

// Select a cell for editing
function selectCell(cellId: string) {
  selectedCellId.value = cellId
  selectedRowId.value = null
}

// Select a row for editing
function selectRow(rowId: string) {
  selectedRowId.value = rowId
  selectedCellId.value = null
}

// Save the layout to the store
function saveLayout() {
  const layoutId = props.layoutId || `layout-${Date.now()}`
  console.log('CustomLayoutBuilder - Saving layout with ID:', layoutId)
  
  // Create GridLayoutDefinition (current format used by builder)
  const gridLayoutData = {
    id: layoutId,
    name: layoutName.value,
    description: layoutDescription.value,
    layouts: layouts,
    isDefault: isDefaultLayout.value,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  
  console.log('CustomLayoutBuilder - Created grid layout data:', gridLayoutData)

  // Save to store - the store will handle converting to position layout if needed
  layoutStore.addGridLayout(gridLayoutData)
  
  // If this is set as default, update all other layouts
  if (isDefaultLayout.value) {
    // Set all other layouts to non-default
    layoutStore.gridLayouts
      .filter(layout => layout.id !== layoutId)
      .forEach(layout => {
        if (layout.isDefault) {
          layoutStore.updateGridLayout(layout.id, { isDefault: false })
        }
      })
  }
  
  console.log('CustomLayoutBuilder - Grid layout saved to store')
  
  // Reset unsaved changes flag
  hasUnsavedChanges.value = false
  
  // Emit save event with layout ID
  emit('save', layoutId)
}

// Handle cancel button click
function handleCancel() {
  if (hasUnsavedChanges.value) {
    // Show confirmation dialog
    if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
      emit('cancel')
    }
    // If user clicks cancel in the dialog, stay on the page
  } else {
    // No changes, just cancel
    emit('cancel')
  }
}

// Mark that changes have been made
function markAsChanged() {
  hasUnsavedChanges.value = true
}

// Reset to new layout
function createNewLayout() {
  // Check for unsaved changes first
  if (hasUnsavedChanges.value) {
    if (!confirm('You have unsaved changes. Discard changes and create a new layout?')) {
      return;
    }
  }
  
  // Reset layout name and description
  layoutName.value = 'New Layout';
  layoutDescription.value = '';
  isDefaultLayout.value = false;
  isEditingExistingLayout.value = false;
  
  // Reset to default template layouts for all viewports
  layouts.desktop = {
    rows: [
      {
        id: `row-1-desktop-${Date.now()}`,
        cells: [
          {
            id: `cell-1-${Date.now()}`,
            deviceType: 'camera',
            name: 'Main Camera',
            priority: 'primary',
            width: 100 // Full width for first cell
          }
        ],
        height: 33.33 // Default to 1/3 of vertical space
      },
      {
        id: `row-2-desktop-${Date.now()}`,
        cells: [
          {
            id: `cell-2-${Date.now()}`,
            deviceType: 'telescope',
            name: 'Telescope Control',
            priority: 'secondary',
            width: 50
          },
          {
            id: `cell-3-${Date.now()}`,
            deviceType: 'data',
            name: 'Data Panel',
            priority: 'secondary',
            width: 50
          }
        ],
        height: 33.33 // Default to 1/3 of vertical space
      },
      {
        id: `row-3-desktop-${Date.now()}`,
        cells: [
          {
            id: `cell-4-${Date.now()}`,
            deviceType: 'weather',
            name: 'Weather',
            priority: 'tertiary',
            width: 33.33
          },
          {
            id: `cell-5-${Date.now()}`,
            deviceType: 'focuser',
            name: 'Focuser',
            priority: 'tertiary',
            width: 33.33
          },
          {
            id: `cell-6-${Date.now()}`,
            deviceType: 'filterwheel',
            name: 'Filter Wheel',
            priority: 'tertiary',
            width: 33.33
          }
        ],
        height: 33.33 // Default to 1/3 of vertical space
      }
    ],
    panelIds: []
  };
  
  // Update panelIds after creating cells
  layouts.desktop.panelIds = layouts.desktop.rows.flatMap(row => 
    row.cells.map(cell => cell.id)
  );
  
  // Create tablet layout
  layouts.tablet = {
    rows: [
      {
        id: `row-1-tablet-${Date.now()}`,
        cells: [
          {
            id: layouts.desktop.rows[0].cells[0].id,
            deviceType: 'camera',
            name: 'Main Camera',
            priority: 'primary',
            width: 100
          }
        ],
        height: 40
      },
      {
        id: `row-2-tablet-${Date.now()}`,
        cells: [
          {
            id: layouts.desktop.rows[1].cells[0].id,
            deviceType: 'telescope',
            name: 'Telescope Control',
            priority: 'secondary',
            width: 100
          }
        ],
        height: 30
      },
      {
        id: `row-3-tablet-${Date.now()}`,
        cells: [
          {
            id: layouts.desktop.rows[1].cells[1].id,
            deviceType: 'data',
            name: 'Data Panel',
            priority: 'secondary',
            width: 50
          },
          {
            id: layouts.desktop.rows[2].cells[1].id,
            deviceType: 'focuser',
            name: 'Focuser',
            priority: 'tertiary',
            width: 50
          }
        ],
        height: 30
      }
    ],
    panelIds: [
      layouts.desktop.rows[0].cells[0].id,
      layouts.desktop.rows[1].cells[0].id,
      layouts.desktop.rows[1].cells[1].id,
      layouts.desktop.rows[2].cells[1].id
    ]
  };
  
  // Create mobile layout
  layouts.mobile = {
    rows: [
      {
        id: `row-1-mobile-${Date.now()}`,
        cells: [
          {
            id: layouts.desktop.rows[0].cells[0].id,
            deviceType: 'camera',
            name: 'Main Camera',
            priority: 'primary',
            width: 100
          }
        ],
        height: 33.33
      },
      {
        id: `row-2-mobile-${Date.now()}`,
        cells: [
          {
            id: layouts.desktop.rows[1].cells[0].id,
            deviceType: 'telescope',
            name: 'Telescope Control',
            priority: 'secondary',
            width: 100
          }
        ],
        height: 33.33
      },
      {
        id: `row-3-mobile-${Date.now()}`,
        cells: [
          {
            id: layouts.desktop.rows[1].cells[1].id,
            deviceType: 'data',
            name: 'Data Panel',
            priority: 'secondary',
            width: 100
          }
        ],
        height: 33.33
      }
    ],
    panelIds: [
      layouts.desktop.rows[0].cells[0].id,
      layouts.desktop.rows[1].cells[0].id,
      layouts.desktop.rows[1].cells[1].id
    ]
  };
  
  // Rebuild allPanels map from desktop layout
  allPanels.clear();
  layouts.desktop.rows.forEach((row) => {
    row.cells.forEach((cell) => {
      allPanels.set(cell.id, {
        deviceType: cell.deviceType || 'any',
        name: cell.name,
        priority: cell.priority
      });
    });
  });
  
  // Make sure all layouts have proper cell widths
  for (const viewport of ['desktop', 'tablet', 'mobile'] as Viewport[]) {
    layouts[viewport].rows.forEach(row => {
      recalculateRowCellWidths(row);
    });
  }
  
  // Mark as changed
  markAsChanged();
  
  // Reset selection
  selectedCellId.value = null;
  selectedRowId.value = null;
}

// Load existing layout data if layoutId is provided
onMounted(() => {
  console.log('CustomLayoutBuilder - Mounted with props:', props)
  console.log('CustomLayoutBuilder - LayoutId prop:', props.layoutId)
  console.log('CustomLayoutBuilder - Available grid layouts:', 
    layoutStore.gridLayouts.map(l => `${l.id} (${l.name})`))
    
  if (props.layoutId) {
    console.log('CustomLayoutBuilder - Loading existing layout with ID:', props.layoutId)
    // First try to find in gridLayouts (primary source)
    let existingLayout = layoutStore.gridLayouts.find(
      layout => layout.id === props.layoutId
    )
    
    // If not found in gridLayouts, try to find in converted layouts
    if (!existingLayout) {
      console.log('CustomLayoutBuilder - Layout not found in gridLayouts, checking converted layouts')
      const convertedLayout = layoutStore.layouts.find(layout => layout.id === props.layoutId)
      if (convertedLayout) {
        console.log('CustomLayoutBuilder - Found in converted layouts, using that instead')
        // Use the gridLayout version that would have been converted from this
        existingLayout = layoutStore.gridLayouts.find(
          layout => layout.id === convertedLayout.id
        )
      }
    }
    
    if (existingLayout) {
      console.log('CustomLayoutBuilder - Found existing layout:', existingLayout)
      
      // Update name and description
      layoutName.value = existingLayout.name
      layoutDescription.value = existingLayout.description || ''
      isDefaultLayout.value = existingLayout.isDefault || false
      isEditingExistingLayout.value = true
      
      // Replace layouts for each viewport
      if (existingLayout.layouts) {
        // Copy layout data for each viewport
        for (const [viewportType, gridLayout] of Object.entries(existingLayout.layouts)) {
          const viewport = viewportType as Viewport
          if (layouts[viewport]) {
            console.log(`CustomLayoutBuilder - Updating ${viewport} layout`)
            layouts[viewport] = JSON.parse(JSON.stringify(gridLayout))
          }
        }
        
        // Rebuild allPanels map from loaded layout
        allPanels.clear()
        layouts.desktop.rows.forEach((row) => {
          row.cells.forEach((cell) => {
            allPanels.set(cell.id, {
              deviceType: cell.deviceType || 'any',
              name: cell.name,
              priority: cell.priority
            })
          })
          
          // Ensure row cells have proper widths after loading
          recalculateRowCellWidths(row);
        })
        
        // Also recalculate all widths for all viewports to ensure they fill 100%
        for (const viewport of ['tablet', 'mobile'] as Viewport[]) {
          layouts[viewport].rows.forEach(row => {
            recalculateRowCellWidths(row);
          });
        }
      }
      
      // Store original layout data to compare later for unsaved changes
      originalLayoutData.value = JSON.stringify(existingLayout);
    } else {
      console.warn('CustomLayoutBuilder - No existing layout found with ID:', props.layoutId)
      console.log('CustomLayoutBuilder - Available grid layout IDs:', 
        layoutStore.gridLayouts.map(l => l.id))
    }
  } else {
    console.log('CustomLayoutBuilder - No layoutId provided, using default template')
    
    // Ensure default template has proper cell widths
    for (const viewport of ['desktop', 'tablet', 'mobile'] as Viewport[]) {
      layouts[viewport].rows.forEach(row => {
        recalculateRowCellWidths(row);
      });
    }
    
    // For new layouts, mark as changed by default
    hasUnsavedChanges.value = true;
  }
})

// Switch between different viewport layouts in preview mode
function switchPreviewViewport(viewport: Viewport) {
  previewViewport.value = viewport
}

// Toggle preview mode
function togglePreviewMode() {
  previewMode.value = !previewMode.value
  // When entering preview mode, reset the preview viewport to current viewport
  if (previewMode.value) {
    previewViewport.value = currentViewport.value
  }
}

// Drag and drop state
const draggedCellId = ref<string | null>(null)
const dragTargetRowId = ref<string | null>(null)
const dragOverCellId = ref<string | null>(null)

// Add a new ref for tracking when we're dragging over the "new row" zone
const dragOverNewRowZone = ref<boolean>(false)

// Track if we're dragging over the trash zone
const dragOverTrashZone = ref<boolean>(false);

// Handle start of cell dragging
function handleDragStart(cellId: string) {
  console.log('Drag start:', cellId)
  draggedCellId.value = cellId
}

// Handle cell dragging over row
function handleDragOverRow(rowId: string, event: DragEvent) {
  event.preventDefault()
  // Only set row and clear cell if we're not actively over a cell
  // This prevents the dragOverCellId from being cleared when dragging over the row
  if (!dragOverCellId.value) {
    dragTargetRowId.value = rowId
  }
  console.log('Drag over row:', rowId, 'Current dragOverCellId:', dragOverCellId.value)
}

// Handle cell dragging over another cell
function handleDragOverCell(cellId: string, event: DragEvent) {
  event.preventDefault()
  dragOverCellId.value = cellId
  console.log('Drag over cell:', cellId)
}

// Handle drag end
function handleDragEnd() {
  console.log('Drag ended - Last dragged cell:', draggedCellId.value, 'Last target cell:', dragOverCellId.value);
  draggedCellId.value = null;
  dragTargetRowId.value = null;
  dragOverCellId.value = null;
  dragOverTrashZone.value = false;
}

// Handle dragging over the new row zone
function handleDragOverNewRowZone(event: DragEvent) {
  event.preventDefault()
  dragOverNewRowZone.value = true
  // Clear other drag targets to prioritize this action
  dragOverCellId.value = null
  dragTargetRowId.value = null
  console.log('Dragging over new row zone')
}

// Handle dragging leave from the new row zone
function handleDragLeaveNewRowZone() {
  dragOverNewRowZone.value = false
}

// Handle dragging over the trash zone
function handleDragOverTrashZone(event: DragEvent) {
  event.preventDefault();
  // Only allow trash dropping for existing cells, not new devices
  if (draggedCellId.value) {
    dragOverTrashZone.value = true;
    // Clear other drag targets to prioritize this action
    dragOverCellId.value = null;
    dragTargetRowId.value = null;
    dragOverNewRowZone.value = false;
    console.log('Dragging over trash zone');
  }
}

// Handle dragging leave from the trash zone
function handleDragLeaveTrashZone() {
  dragOverTrashZone.value = false;
}

// Handle dropping a cell on the trash
function handleTrashDrop(event: DragEvent) {
  event.preventDefault();
  
  if (!draggedCellId.value) {
    console.log('No cell to delete');
    return;
  }
  
  const cellToDelete = draggedCellId.value;
  const rowWithCell = getRowContainingCell(cellToDelete);
  
  if (!rowWithCell) {
    console.log('Row not found for cell:', cellToDelete);
    return;
  }
  
  // Check if this is the last cell in the row
  if (rowWithCell.cells.length <= 1) {
    // If it's the last cell, delete the entire row
    const rowIndex = currentLayout.value.rows.findIndex(row => row.id === rowWithCell.id);
    
    // Don't allow deleting if it's the only row in the layout
    if (currentLayout.value.rows.length <= 1) {
      alert('Cannot delete the last row in the layout.');
      dragOverTrashZone.value = false;
      return;
    }
    
    if (rowIndex !== -1) {
      // Get the cell IDs to remove
      const cellsToRemove = rowWithCell.cells.map(cell => cell.id);
      
      // Remove the row
      currentLayout.value.rows.splice(rowIndex, 1);
      
      // Redistribute heights
      const equalHeight = 100 / currentLayout.value.rows.length;
      currentLayout.value.rows.forEach(row => {
        row.height = equalHeight;
      });
      
      // Update panelIds list
      currentLayout.value.panelIds = currentLayout.value.panelIds.filter(
        id => !cellsToRemove.includes(id)
      );
      
      console.log('Deleted entire row since it contained only one cell');
      
      // Mark as changed
      markAsChanged();
    }
  } else {
    // If there are multiple cells, just delete the cell
    const cellIndex = rowWithCell.cells.findIndex(cell => cell.id === cellToDelete);
    if (cellIndex !== -1) {
      rowWithCell.cells.splice(cellIndex, 1);
      
      // Recalculate cell widths in the row
      recalculateRowCellWidths(rowWithCell);
      
      // Remove from panelIds list
      currentLayout.value.panelIds = currentLayout.value.panelIds.filter(id => id !== cellToDelete);
      
      console.log('Cell deleted:', cellToDelete);
      
      // Mark as changed
      markAsChanged();
    }
  }
  
  // Reset drag states
  handleDragEnd();
  dragOverTrashZone.value = false;
}

// Handle drop of cell
function handleDrop(event: DragEvent) {
  event.preventDefault()
  console.log('Drop event - dragged cell:', draggedCellId.value, 
    'target cell:', dragOverCellId.value, 
    'target row:', dragTargetRowId.value, 
    'new row zone:', dragOverNewRowZone.value)
  
  if (!draggedCellId.value) {
    console.log('No dragged cell ID found')
    return
  }
  
  // Find source cell and row
  const sourceCell = findCellById(draggedCellId.value)
  const sourceRow = getRowContainingCell(draggedCellId.value)
  
  if (!sourceCell || !sourceRow) {
    console.log('Source cell or row not found:', draggedCellId.value)
    handleDragEnd()
    return
  }
  
  console.log('Source cell found:', sourceCell.id, 'in row:', sourceRow.id)
  
  // Get source index
  const sourceCellIndex = sourceRow.cells.findIndex(cell => cell.id === draggedCellId.value)
  console.log('Source cell index:', sourceCellIndex)
  
  // Flag to track if we need to remove the source row after the operation
  let shouldRemoveSourceRow = false
  
  // CASE: Dropping in the "new row" zone
  if (dragOverNewRowZone.value) {
    console.log('CREATING NEW ROW - Source row before:', sourceRow.cells.map(c => c.id).join(', '))
    
    // Check if this is the only cell in the row
    if (sourceRow.cells.length === 1) {
      console.log('Moving the only cell from a row - will remove source row after moving')
      shouldRemoveSourceRow = true
    }
    
    try {
      // Create a deep copy of the cell to move
      const cellToMove = JSON.parse(JSON.stringify(sourceCell))
      
      // Explicitly set the width to 100% since it will be the only cell in the new row
      cellToMove.width = 100
      
      // Generate a new row ID
      const newRowId = `row-${Date.now()}-${currentViewport.value}`
      
      // Calculate new heights
      const newRowCount = currentLayout.value.rows.length + 1
      const equalHeight = 100 / newRowCount
      
      // Adjust existing rows' heights
      currentLayout.value.rows.forEach(row => {
        row.height = equalHeight
      })
      
      // Create the new row with the cell
      const newRow = {
        id: newRowId,
        cells: [cellToMove],
        height: equalHeight
      }
      
      // Add the new row to the layout
      currentLayout.value.rows.push(newRow)
      
      // Remove the cell from the source row
      const sourceCellsArray = [...sourceRow.cells]
      sourceCellsArray.splice(sourceCellIndex, 1)
      sourceRow.cells = sourceCellsArray
      
      // Recalculate widths for source row if it still has cells
      if (sourceRow.cells.length > 0) {
        recalculateRowCellWidths(sourceRow);
      }
      
      // Make sure the new row's cell has correct width
      recalculateRowCellWidths(newRow);
      
      console.log('NEW ROW CREATED with cell:', cellToMove.id, 'Row ID:', newRowId)
    } catch (err) {
      console.error('Error creating new row with cell:', err)
    }
  }
  // Handling drop on another cell
  else if (dragOverCellId.value && dragOverCellId.value !== draggedCellId.value) {
    // Find target cell and row
    const targetCell = findCellById(dragOverCellId.value)
    const targetRow = getRowContainingCell(dragOverCellId.value)
    
    if (!targetCell || !targetRow) {
      console.log('Target cell or row not found:', dragOverCellId.value)
      handleDragEnd()
      return
    }
    
    const targetCellIndex = targetRow.cells.findIndex(cell => cell.id === dragOverCellId.value)
    console.log('Target cell found:', targetCell.id, 'in row:', targetRow.id, 'at index:', targetCellIndex)
    
    // Case 1: Moving within the same row
    if (sourceRow.id === targetRow.id) {
      console.log('SAME ROW REORDERING - Before:', sourceRow.cells.map(c => c.id).join(', '))
      
      try {
        // Make a simple reordering with a temporary array
        const cellsArray = [...sourceRow.cells]
        const cellToMove = cellsArray.splice(sourceCellIndex, 1)[0]
        cellsArray.splice(targetCellIndex, 0, cellToMove)
        
        // Now replace the entire array
        sourceRow.cells = cellsArray
        
        // Ensure cells fill the row
        recalculateRowCellWidths(sourceRow);
        
        console.log('SAME ROW REORDERING - After:', sourceRow.cells.map(c => c.id).join(', '))
      } catch (err) {
        console.error('Error reordering cells within row:', err)
      }
    } 
    // Case 2: Moving between different rows
    else {
      console.log('BETWEEN ROWS - Source row before:', sourceRow.cells.map(c => c.id).join(', '))
      console.log('BETWEEN ROWS - Target row before:', targetRow.cells.map(c => c.id).join(', '))
      
      // Check if this is the only cell in the row
      if (sourceRow.cells.length === 1) {
        console.log('Moving the only cell from a row - will remove source row after moving')
        shouldRemoveSourceRow = true
      }
      
      try {
        // Create copies of the cell arrays
        const sourceCellsArray = [...sourceRow.cells]
        const targetCellsArray = [...targetRow.cells]
        
        // Remove cell from source row
        const cellToMove = JSON.parse(JSON.stringify(sourceCellsArray.splice(sourceCellIndex, 1)[0]))
        
        // Add to target row
        targetCellsArray.splice(targetCellIndex, 0, cellToMove)
        
        // Update both rows
        sourceRow.cells = sourceCellsArray
        targetRow.cells = targetCellsArray
        
        // Recalculate widths in both rows
        if (sourceRow.cells.length > 0) {
          recalculateRowCellWidths(sourceRow);
        }
        recalculateRowCellWidths(targetRow);
        
        console.log('BETWEEN ROWS - Source row after:', sourceRow.cells.map(c => c.id).join(', '))
        console.log('BETWEEN ROWS - Target row after:', targetRow.cells.map(c => c.id).join(', '))
      } catch (err) {
        console.error('Error moving cells between rows:', err)
      }
    }
  }
  // Handling drop on a row (not on a specific cell)
  else if (dragTargetRowId.value) {
    const targetRow = currentLayout.value.rows.find(r => r.id === dragTargetRowId.value)
    
    if (!targetRow) {
      console.log('Target row not found')
      handleDragEnd()
      return
    }
    
    // IMPORTANT: Allow dropping on the same row for reordering at the end
    if (targetRow.id === sourceRow.id) {
      console.log('SAME ROW REORDERING (append) - Before:', sourceRow.cells.map(c => c.id).join(', '))
      try {
        // Make a simple reordering with a temporary array
        const cellsArray = [...sourceRow.cells]
        // Remove the cell from its original position and get a reference to it
        const cellToMove = cellsArray.splice(sourceCellIndex, 1)[0]
        // Add it back at the end
        cellsArray.push(cellToMove)
        
        // Now replace the entire array
        sourceRow.cells = cellsArray
        
        // Ensure cells fill the row
        recalculateRowCellWidths(sourceRow);
        
        console.log('SAME ROW REORDERING (append) - After:', sourceRow.cells.map(c => c.id).join(', '))
      } catch (err) {
        console.error('Error reordering cells within row (append):', err)
      }
      handleDragEnd()
      return
    }
    
    console.log('DROP ON DIFFERENT ROW - Source row before:', sourceRow.cells.map(c => c.id).join(', '))
    console.log('DROP ON DIFFERENT ROW - Target row before:', targetRow.cells.map(c => c.id).join(', '))
    
    // Check if this is the only cell in the row
    if (sourceRow.cells.length === 1) {
      console.log('Moving the only cell from a row - will remove source row after moving')
      shouldRemoveSourceRow = true
    }
    
    try {
      // Create copies of the cell arrays
      const sourceCellsArray = [...sourceRow.cells]
      const targetCellsArray = [...targetRow.cells]
      
      // Remove from source row and make a deep copy
      const cellToMove = JSON.parse(JSON.stringify(sourceCellsArray.splice(sourceCellIndex, 1)[0]))
      
      // Add to end of target row
      targetCellsArray.push(cellToMove)
      
      // Update both rows
      sourceRow.cells = sourceCellsArray
      targetRow.cells = targetCellsArray
      
      // Recalculate widths in both rows
      if (sourceRow.cells.length > 0) {
        recalculateRowCellWidths(sourceRow);
      }
      recalculateRowCellWidths(targetRow);
      
      console.log('DROP ON DIFFERENT ROW - Source row after:', sourceRow.cells.map(c => c.id).join(', '))
      console.log('DROP ON DIFFERENT ROW - Target row after:', targetRow.cells.map(c => c.id).join(', '))
    } catch (err) {
      console.error('Error moving cell to row:', err)
    }
  } else if (!dragOverNewRowZone.value) {
    console.log('No valid drop target found')
  }
  
  // If we need to remove the source row (it's now empty)
  if (shouldRemoveSourceRow) {
    console.log('Removing empty source row:', sourceRow.id)
    
    // Find index of the row to remove
    const rowIndex = currentLayout.value.rows.findIndex(r => r.id === sourceRow.id)
    if (rowIndex !== -1) {
      // Remove the row
      currentLayout.value.rows.splice(rowIndex, 1)
      
      // Redistribute heights for remaining rows
      const equalHeight = 100 / currentLayout.value.rows.length
      currentLayout.value.rows.forEach(row => {
        row.height = equalHeight
      })
      
      console.log('Removed row and redistributed heights')
    }
  }
  
  // Reset drag states
  handleDragEnd()
  dragOverNewRowZone.value = false
  
  // Mark layout as changed after drop
  markAsChanged();
}

// Helper to recalculate cell widths in a row to ensure 100% fill
function recalculateRowCellWidths(row: LayoutRow) {
  if (!row || !row.cells || !row.cells.length) return;
  
  const cellCount = row.cells.length;
  
  if (cellCount === 1) {
    // One cell always takes full width
    row.cells[0].width = 100;
    return;
  }
  
  // For multiple cells, distribute evenly and handle any rounding issues
  const equalWidth = Math.floor(100 / cellCount * 100) / 100; // Round to 2 decimal places
  let totalWidth = 0;
  
  // Set equal width for all cells except the last one
  for (let i = 0; i < cellCount - 1; i++) {
    row.cells[i].width = equalWidth;
    totalWidth += equalWidth;
  }
  
  // Give the last cell the remaining width to ensure exactly 100%
  const lastCellWidth = 100 - totalWidth;
  row.cells[cellCount - 1].width = Math.max(0, lastCellWidth); // Ensure no negative values
  
  console.log(`Recalculated widths for row ${row.id}: ${row.cells.map(c => c.width).join(', ')} (total: ${row.cells.reduce((sum, c) => sum + c.width, 0)}%)`);
}

// Handle manual cell width change through the UI
function handleCellWidthChange() {
  if (!selectedCellId.value) return;
  
  // Find the row containing this cell
  const row = getRowContainingCell(selectedCellId.value);
  if (!row) return;
  
  // If only one cell, force to 100% regardless of user input
  if (row.cells.length === 1) {
    row.cells[0].width = 100;
    return;
  }
  
  // For multiple cells, validate input and adjust other cells
  const selectedCellIndex = row.cells.findIndex(c => c.id === selectedCellId.value);
  if (selectedCellIndex === -1) return;
  
  // Get the selected cell's width (clamped between 10 and 90 for UX)
  let selectedWidth = row.cells[selectedCellIndex].width;
  
  // Enforce minimum and maximum constraints
  // For good UX, don't allow a cell to be too small or take up the entire row
  const minCellWidth = 10;
  const maxCellWidth = 90;
  
  if (selectedWidth < minCellWidth) {
    selectedWidth = minCellWidth;
    row.cells[selectedCellIndex].width = minCellWidth;
  } else if (selectedWidth > maxCellWidth) {
    selectedWidth = maxCellWidth;
    row.cells[selectedCellIndex].width = maxCellWidth;
  }
  
  // Calculate how much width remains for other cells
  const remainingWidth = 100 - selectedWidth;
  
  // Count how many other cells need to share the remaining width
  const otherCellsCount = row.cells.length - 1;
  
  if (otherCellsCount <= 0) return;
  
  // Simple method with better distribution logic
  // First pass: Calculate equal width for other cells
  const equalWidth = Math.floor((remainingWidth / otherCellsCount) * 100) / 100;
  
  // Second pass: Distribute width equally among all cells except the last one
  let distributedWidth = selectedWidth;
  
  for (let i = 0; i < row.cells.length; i++) {
    if (i !== selectedCellIndex) {
      // Apply equal width to all cells except the selected and the last adjustment cell
      if (i !== row.cells.length - 1 && selectedCellIndex !== row.cells.length - 1) {
        row.cells[i].width = equalWidth;
        distributedWidth += equalWidth;
      } else if (i !== row.cells.length - 1) {
        // If selected cell is the last one, still distribute to all but the new last adjustment cell
        row.cells[i].width = equalWidth;
        distributedWidth += equalWidth;
      }
    }
  }
  
  // Find the adjustment cell (usually the last unselected cell)
  const adjustmentCellIndex = selectedCellIndex === row.cells.length - 1 
    ? row.cells.length - 2 // If selected is last, adjust second-to-last
    : row.cells.length - 1; // Otherwise, adjust last
  
  // Calculate precise final value to ensure exactly 100%
  const adjustmentCellWidth = Math.max(minCellWidth, 100 - (distributedWidth - (row.cells[adjustmentCellIndex].width || 0)));
  row.cells[adjustmentCellIndex].width = adjustmentCellWidth;
  
  // Validate the total equals 100% exactly
  const totalWidth = row.cells.reduce((sum, cell) => sum + cell.width, 0);
  console.log(`After manual width change: ${row.cells.map(c => c.width).join(', ')} (total: ${totalWidth}%)`);
  
  // If there's still a small rounding error, adjust the last cell one more time
  if (Math.abs(totalWidth - 100) > 0.01) {
    row.cells[adjustmentCellIndex].width += (100 - totalWidth);
    console.log(`Final adjustment: ${row.cells.map(c => c.width).join(', ')} (total: ${row.cells.reduce((sum, cell) => sum + cell.width, 0)}%)`);
  }
  
  // Mark as changed
  markAsChanged();
}

// Helper to find a cell by ID
function findCellById(cellId: string) {
  for (const row of currentLayout.value.rows) {
    const cell = row.cells.find(c => c.id === cellId)
    if (cell) return cell
  }
  return null
}

// Handle drag from device palette
function handleDeviceDragStart(event: DragEvent, deviceType: string) {
  // Store device type in dataTransfer
  if (event.dataTransfer) {
    event.dataTransfer.setData('deviceType', deviceType);
    event.dataTransfer.effectAllowed = 'copy';
    
    // Find the corresponding device icon to display during drag
    const deviceIcon = deviceTypes.find(d => d.id === deviceType)?.icon || '📦';
    
    // Create a custom drag image (optional)
    const dragImage = document.createElement('div');
    dragImage.textContent = deviceIcon;
    dragImage.style.fontSize = '24px';
    dragImage.style.padding = '10px';
    dragImage.style.background = 'rgba(0,0,0,0.5)';
    dragImage.style.borderRadius = '4px';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    
    event.dataTransfer.setDragImage(dragImage, 15, 15);
    
    // Clean up the drag image element after the drag operation
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
  }
  
  console.log('Device drag started:', deviceType);
}

// Handle dropping a device onto the layout
function handleDeviceDrop(event: DragEvent) {
  event.preventDefault();
  
  // Get the dragged device type
  const deviceType = event.dataTransfer?.getData('deviceType') || '';
  if (!deviceType) {
    console.log('No device type found in drop event');
    return;
  }
  
  console.log('Device dropped:', deviceType);
  
  // Find the device details
  const deviceInfo = deviceTypes.find(d => d.id === deviceType);
  if (!deviceInfo) return;
  
  // Create a new cell for this device
  const newCell = {
    id: `cell-${Date.now()}`,
    deviceType: deviceType,
    name: deviceInfo.name,
    priority: 'secondary' as const,
    width: 100 // Will be adjusted during recalculation
  };
  
  // Determine where to drop the device
  if (dragOverCellId.value) {
    // When dropping onto an existing cell, add the new cell to that row
    const targetRow = getRowContainingCell(dragOverCellId.value);
    if (targetRow) {
      const cellIndex = targetRow.cells.findIndex(cell => cell.id === dragOverCellId.value);
      if (cellIndex !== -1) {
        // Insert the new cell after the target cell
        targetRow.cells.splice(cellIndex + 1, 0, newCell);
        
        // Recalculate row cell widths
        recalculateRowCellWidths(targetRow);
        
        console.log('Added new device cell to row after existing cell');
      }
    }
  } else if (dragTargetRowId.value) {
    // Add to existing row
    const targetRow = currentLayout.value.rows.find(row => row.id === dragTargetRowId.value);
    if (targetRow) {
      // Add cell to this row
      targetRow.cells.push(newCell);
      
      // Recalculate row cell widths
      recalculateRowCellWidths(targetRow);
      
      console.log('Added new device to existing row');
    }
  } else if (dragOverNewRowZone.value) {
    // Create a new row with this cell
    
    // Calculate new heights
    const newRowCount = currentLayout.value.rows.length + 1;
    const equalHeight = 100 / newRowCount;
    
    // Adjust existing rows' heights
    currentLayout.value.rows.forEach(row => {
      row.height = equalHeight;
    });
    
    // Create a new row with the device
    const newRowId = `row-${Date.now()}-${currentViewport.value}`;
    const newRow = {
      id: newRowId,
      cells: [newCell],
      height: equalHeight
    };
    
    // Add the new row to the layout
    currentLayout.value.rows.push(newRow);
    
    console.log('Created new row with device');
  }
  
  // Add the new cell to the panelIds list
  currentLayout.value.panelIds.push(newCell.id);
  
  // Add to list of all panels
  allPanels.set(newCell.id, {
    deviceType: newCell.deviceType,
    name: newCell.name,
    priority: newCell.priority
  });
  
  // Mark as changed
  markAsChanged();
  
  // Reset drag states
  dragOverCellId.value = null;
  dragTargetRowId.value = null;
  dragOverNewRowZone.value = false;
}
</script>

<template>
  <div class="aw-layout-builder">
    <div class="aw-layout-builder__header">
      <div class="aw-layout-builder__title-area">
        <h2>
          {{ isEditingExistingLayout ? 'Edit Layout' : 'New Layout' }}
        </h2>
        <span v-if="isEditingExistingLayout" class="aw-layout-builder__editing-name">
          {{ layoutName }}
        </span>
      </div>
      <div class="aw-layout-builder__header-actions">
        <button 
          v-if="isEditingExistingLayout"
          class="aw-button aw-button--secondary" 
          title="Create a new layout from scratch"
          @click="createNewLayout"
        >
          New Layout
        </button>
        <div v-if="!previewMode" class="aw-layout-builder__viewport-selector">
          <button
            v-for="viewport in ['desktop', 'tablet', 'mobile']"
            :key="viewport"
            class="aw-layout-builder__viewport-button"
            :class="{ 'aw-layout-builder__viewport-button--active': currentViewport === viewport }"
            @click="currentViewport = viewport as Viewport"
          >
            {{ viewport }}
          </button>
        </div>
        <button 
          class="aw-button aw-button--secondary" 
          @click="togglePreviewMode"
        >
          {{ previewMode ? 'Exit Preview' : 'Preview Layout' }}
        </button>
      </div>
    </div>

    <div v-if="previewMode" class="aw-layout-builder__preview-mode">
      <div class="aw-layout-builder__preview-controls">
        <div class="aw-layout-builder__preview-viewport-selector">
          <button
            v-for="viewport in ['desktop', 'tablet', 'mobile']"
            :key="viewport"
            class="aw-layout-builder__viewport-button"
            :class="{ 'aw-layout-builder__viewport-button--active': previewViewport === viewport }"
            @click="switchPreviewViewport(viewport as Viewport)"
          >
            {{ viewport }}
          </button>
        </div>
      </div>
      <div
:class="[
        'aw-layout-builder__preview-container',
        `aw-layout-builder__preview-container--${previewViewport}`
      ]">
        <div class="aw-layout-builder__full-preview">
          <div
            v-for="row in layouts[previewViewport].rows"
            :key="row.id"
            class="aw-layout-builder__preview-row"
            :style="{ height: `${row.height}%` }"
          >
            <div
              v-for="cell in row.cells"
              :key="cell.id"
              class="aw-layout-builder__preview-cell"
              :class="{
                'aw-layout-builder__preview-cell--primary': cell.priority === 'primary',
                'aw-layout-builder__preview-cell--secondary': cell.priority === 'secondary',
                'aw-layout-builder__preview-cell--tertiary': cell.priority === 'tertiary'
              }"
              :style="{ width: `${cell.width}%` }"
            >
              <div class="aw-layout-builder__preview-cell-content">
                <div class="aw-layout-builder__preview-cell-header">{{ cell.name }}</div>
                <div class="aw-layout-builder__preview-cell-type">{{ cell.deviceType }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="aw-layout-builder__content">
      <div class="aw-layout-builder__panel-left">
        <div class="aw-form-group">
          <label for="layout-name" class="aw-form-label">Layout Name</label>
          <input
            id="layout-name"
            v-model="layoutName"
            type="text"
            class="aw-input"
            placeholder="Enter layout name"
          />
        </div>

        <div class="aw-form-group">
          <label for="layout-description" class="aw-form-label">Description</label>
          <textarea
            id="layout-description"
            v-model="layoutDescription"
            class="aw-textarea"
            placeholder="Describe this layout"
          ></textarea>
        </div>
        
        <div class="aw-form-group">
          <label class="aw-checkbox-container">
            Set as default layout
            <input
              id="is-default"
              v-model="isDefaultLayout"
              type="checkbox"
            />
            <span class="aw-checkbox"></span>
          </label>
        </div>

        <div class="aw-layout-builder__form-group">
          <h3 class="aw-layout-builder__subheading">Device Palette</h3>
          <p class="aw-layout-builder__hint">Drag devices onto the preview to create panels</p>
          
          <div class="aw-layout-builder__device-palette">
            <div 
              v-for="device in deviceTypes" 
              :key="device.id"
              class="aw-layout-builder__device-item"
              draggable="true"
              @dragstart="handleDeviceDragStart($event, device.id)"
            >
              <span class="aw-layout-builder__device-icon">{{ device.icon }}</span>
              <span class="aw-layout-builder__device-name">{{ device.name }}</span>
            </div>
          </div>
        </div>

        <div v-if="selectedRowId || selectedCellId" class="aw-layout-builder__editor">
          <h3 class="aw-layout-builder__subheading">
            {{ selectedCellId ? 'Edit Panel' : 'Edit Row' }}
          </h3>

          <!-- Row editor -->
          <div v-if="selectedRowId && !selectedCellId && selectedRow" class="aw-layout-builder__row-editor">
            <div class="aw-form-group">
              <label for="row-height" class="aw-form-label">Height (%)</label>
              <input
                id="row-height"
                v-model.number="selectedRow.height"
                type="number"
                min="10"
                max="100"
                class="aw-input"
              />
            </div>

            <div class="aw-layout-builder__controls">
              <button
                class="aw-button aw-button--danger aw-layout-builder__button"
                @click="deleteRow(selectedRowId)"
              >
                Delete Row
              </button>
            </div>
          </div>

          <!-- Cell editor -->
          <div v-if="selectedCellId && selectedCell" class="aw-layout-builder__cell-editor">
            <div class="aw-form-group">
              <label for="cell-name" class="aw-form-label">Panel Name</label>
              <input
                id="cell-name"
                v-model="selectedCell.name"
                type="text"
                class="aw-input"
                placeholder="Panel name"
              />
            </div>

            <div class="aw-form-group">
              <label for="cell-device-type" class="aw-form-label">Device Type</label>
              <select
                id="cell-device-type"
                v-model="selectedCell.deviceType"
                class="aw-select"
              >
                <option
                  v-for="deviceType in deviceTypes"
                  :key="deviceType.id"
                  :value="deviceType.id"
                >
                  {{ deviceType.icon }} {{ deviceType.name }}
                </option>
              </select>
            </div>

            <div class="aw-form-group">
              <label for="cell-width" class="aw-form-label">Width (%)</label>
              <input
                id="cell-width"
                v-model.number="selectedCell.width"
                type="number"
                min="10"
                max="100"
                class="aw-input"
                @change="handleCellWidthChange"
              />
            </div>

            <div class="aw-form-group">
              <label for="cell-priority" class="aw-form-label">Display Priority</label>
              <select
                id="cell-priority"
                v-model="selectedCell.priority"
                class="aw-select"
              >
                <option
                  v-for="priority in priorityOptions"
                  :key="priority.value"
                  :value="priority.value"
                >
                  {{ priority.label }} - {{ priority.description }}
                </option>
              </select>
            </div>

            <div class="aw-layout-builder__controls">
              <button
                class="aw-button aw-button--danger aw-layout-builder__button"
                @click="deleteCell(selectedCellId)"
              >
                Delete Panel
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="aw-layout-builder__panel-right">
        <div class="aw-layout-builder__panel-right-header">
          <h3 class="aw-layout-builder__preview-title">
            {{ currentViewport }} Layout Preview
          </h3>
          
          <!-- Trash zone for deleting panels - only show when dragging -->
          <div 
            v-if="draggedCellId"
            class="aw-layout-builder__trash-zone"
            :class="{ 'aw-layout-builder__trash-zone--active': dragOverTrashZone }"
            @dragover="handleDragOverTrashZone"
            @dragleave="handleDragLeaveTrashZone"
            @drop.prevent="handleTrashDrop"
          >
            <span class="aw-layout-builder__trash-icon">🗑️</span>
            <span class="aw-layout-builder__trash-text">Drop to delete</span>
          </div>
        </div>

        <div 
          class="aw-layout-builder__preview" 
          @drop="handleDrop($event)" 
          @dragover.prevent
          @drop.prevent="handleDeviceDrop($event)"
        >
          <div
            v-for="row in currentLayout.rows"
            :key="row.id"
            class="aw-layout-builder__preview-row"
            :class="{ 
              'aw-layout-builder__preview-row--selected': selectedRowId === row.id,
              'aw-layout-builder__preview-row--dragover': dragTargetRowId === row.id && !dragOverCellId
            }"
            :style="{ height: `${row.height}%` }"
            @click="selectRow(row.id)"
            @dragover="handleDragOverRow(row.id, $event)"
          >
            <div
              v-for="cell in row.cells"
              :key="cell.id"
              class="aw-layout-builder__preview-cell"
              :class="{
                'aw-layout-builder__preview-cell--selected': selectedCellId === cell.id,
                'aw-layout-builder__preview-cell--primary': cell.priority === 'primary',
                'aw-layout-builder__preview-cell--secondary': cell.priority === 'secondary',
                'aw-layout-builder__preview-cell--tertiary': cell.priority === 'tertiary',
                'aw-layout-builder__preview-cell--dragging': draggedCellId === cell.id,
                'aw-layout-builder__preview-cell--dragover': dragOverCellId === cell.id
              }"
              :style="{ width: `${cell.width}%` }"
              draggable="true"
              @click.stop="selectCell(cell.id)"
              @dragstart="handleDragStart(cell.id)"
              @dragend="handleDragEnd"
              @dragover="handleDragOverCell(cell.id, $event)"
            >
              <div class="aw-layout-builder__preview-cell-content">
                <div class="aw-layout-builder__preview-cell-drag-handle">
                  <div class="aw-layout-builder__preview-cell-drag-icon">⋮⋮</div>
                </div>
                <div class="aw-layout-builder__preview-cell-header">{{ cell.name }}</div>
                <div class="aw-layout-builder__preview-cell-type">{{ cell.deviceType }}</div>
              </div>
            </div>
          </div>
          
          <!-- New Row Drop Zone - only show when dragging -->
          <div 
            v-if="draggedCellId"
            class="aw-layout-builder__new-row-zone"
            :class="{ 'aw-layout-builder__new-row-zone--active': dragOverNewRowZone }"
            @dragover="handleDragOverNewRowZone"
            @dragleave="handleDragLeaveNewRowZone"
          >
            <div class="aw-layout-builder__new-row-zone-text">
              <span>Drop to create new row</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="aw-layout-builder__footer">
      <button class="aw-button aw-button--secondary" @click="handleCancel">Cancel</button>
      <button class="aw-button aw-button--primary" @click="saveLayout">
        {{ isEditingExistingLayout ? 'Save Changes' : 'Save New Layout' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.aw-layout-builder {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--aw-bg-color);
  color: var(--aw-text-color);
}

.aw-layout-builder__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--aw-spacing-md);
  border-bottom: 1px solid var(--aw-panel-border-color);
  background-color: var(--aw-panel-bg-color);
}

.aw-layout-builder__header h2 {
  margin: 0;
  font-size: var(--aw-font-size-lg, 1.25rem);
  font-weight: 600;
}

.aw-layout-builder__header-actions {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-md);
}

.aw-layout-builder__viewport-selector {
  display: flex;
  gap: var(--aw-spacing-xs);
}

.aw-layout-builder__viewport-button {
  padding: var(--aw-spacing-xs) var(--aw-spacing-sm);
  border: 1px solid var(--aw-panel-border-color);
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-text-color);
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
  text-transform: capitalize;
  transition: all 0.2s ease;
}

.aw-layout-builder__viewport-button:hover {
  background-color: var(--aw-panel-hover-bg-color);
}

.aw-layout-builder__viewport-button--active {
  background-color: var(--aw-color-primary-500);
  color: white;
  border-color: var(--aw-color-primary-700);
}

.aw-layout-builder__content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.aw-layout-builder__panel-left {
  width: 350px;
  padding: var(--aw-spacing-md);
  border-right: 1px solid var(--aw-panel-border-color);
  background-color: var(--aw-panel-bg-color);
  overflow-y: auto;
}

.aw-layout-builder__panel-right {
  flex: 1;
  padding: var(--aw-spacing-md);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.aw-layout-builder__preview-title {
  margin-top: 0;
  margin-bottom: var(--aw-spacing-md);
  font-size: var(--aw-font-size-md, 1rem);
  font-weight: 500;
  text-transform: capitalize;
}

.aw-layout-builder__form-group {
  margin-bottom: var(--aw-spacing-md);
}

.aw-layout-builder__label {
  display: block;
  margin-bottom: var(--aw-spacing-xs);
  font-weight: 500;
}

.aw-layout-builder__input,
.aw-layout-builder__select,
.aw-layout-builder__textarea {
  width: 100%;
  padding: var(--aw-spacing-sm);
  border: 1px solid var(--aw-input-border-color);
  border-radius: var(--aw-border-radius-sm);
  background-color: var(--aw-input-bg-color);
  color: var(--aw-text-color);
}

.aw-layout-builder__textarea {
  min-height: 80px;
  resize: vertical;
}

.aw-layout-builder__subheading {
  margin-top: 0;
  margin-bottom: var(--aw-spacing-sm);
  font-size: 1rem;
  font-weight: 500;
}

.aw-layout-builder__hint {
  margin-top: 0;
  margin-bottom: var(--aw-spacing-md);
  font-size: 0.9rem;
  color: var(--aw-text-secondary-color);
  font-style: italic;
}

.aw-layout-builder__controls {
  display: flex;
  gap: var(--aw-spacing-sm);
  margin-top: var(--aw-spacing-md);
}

.aw-layout-builder__button {
  flex: 1;
}

.aw-layout-builder__preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-md);
  overflow: hidden;
  background-color: var(--aw-panel-content-bg-color);
  box-shadow: var(--aw-shadow-sm);
}

.aw-layout-builder__preview-row {
  display: flex;
  min-height: 50px;
  border-bottom: 1px dashed var(--aw-panel-border-color);
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease;
}

.aw-layout-builder__preview-row:last-child {
  border-bottom: none;
}

.aw-layout-builder__preview-row--selected {
  background-color: rgba(var(--aw-color-primary-rgb, 74, 122, 220), 0.1);
  outline: 2px solid var(--aw-color-primary-500);
}

.aw-layout-builder__preview-row--dragover {
  background-color: rgba(var(--aw-color-success-rgb, 76, 175, 80), 0.1);
  outline: 2px dashed var(--aw-color-success-500);
}

.aw-layout-builder__preview-cell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: var(--aw-spacing-sm);
  border-right: 1px dashed var(--aw-panel-border-color);
  cursor: pointer;
  min-height: 80px;
  transition: all 0.2s ease;
  position: relative;
}

.aw-layout-builder__preview-cell:last-child {
  border-right: none;
}

.aw-layout-builder__preview-cell--selected {
  outline: 2px solid var(--aw-color-primary-700);
  background-color: rgba(var(--aw-color-primary-rgb, 74, 122, 220), 0.2);
  z-index: 1;
}

.aw-layout-builder__preview-cell--primary {
  background-color: rgba(var(--aw-color-primary-rgb, 74, 122, 220), 0.1);
}

.aw-layout-builder__preview-cell--secondary {
  background-color: rgba(var(--aw-color-success-rgb, 76, 175, 80), 0.1);
}

.aw-layout-builder__preview-cell--tertiary {
  background-color: rgba(var(--aw-color-warning-rgb, 255, 152, 0), 0.1);
}

.aw-layout-builder__preview-cell-content {
  text-align: center;
  pointer-events: none;
}

.aw-layout-builder__preview-cell-drag-handle {
  position: absolute;
  top: 0.25rem;
  left: 0.25rem;
  cursor: grab;
  font-size: 0.85rem;
  opacity: 0.7;
  color: var(--aw-panel-border-color);
}

.aw-layout-builder__preview-cell:hover .aw-layout-builder__preview-cell-drag-handle {
  opacity: 1;
}

.aw-layout-builder__preview-cell--dragging {
  opacity: 0.5;
  box-shadow: 0 0 0 2px var(--aw-color-primary-500);
}

.aw-layout-builder__preview-cell--dragover {
  background-color: rgba(var(--aw-color-primary-rgb, 74, 122, 220), 0.2);
  box-shadow: 0 0 0 2px var(--aw-color-primary-700);
}

.aw-layout-builder__editor {
  margin-top: var(--aw-spacing-md);
  padding: var(--aw-spacing-md);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-md);
  background-color: var(--aw-panel-content-bg-color);
}

.aw-layout-builder__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--aw-spacing-md);
  padding: var(--aw-spacing-md);
  border-top: 1px solid var(--aw-panel-border-color);
  background-color: var(--aw-panel-bg-color);
}

.aw-layout-builder__checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-sm);
  margin-bottom: var(--aw-spacing-sm);
}

.aw-layout-builder__checkbox {
  margin: 0;
}

.aw-layout-builder__checkbox-label {
  font-weight: 400;
  cursor: pointer;
}

.aw-layout-builder__preview-mode {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.aw-layout-builder__preview-controls {
  display: flex;
  justify-content: center;
  padding: var(--aw-spacing-md);
  border-bottom: 1px solid var(--aw-panel-border-color);
  background-color: var(--aw-panel-bg-color);
}

.aw-layout-builder__preview-viewport-selector {
  display: flex;
  gap: var(--aw-spacing-xs);
}

.aw-layout-builder__preview-container {
  flex: 1;
  padding: var(--aw-spacing-md);
  overflow: auto;
  display: flex;
  justify-content: center;
  background-color: var(--aw-panel-content-bg-color, #f0f0f0);
}

.aw-layout-builder__preview-container--desktop {
  padding: var(--aw-spacing-lg);
}

.aw-layout-builder__preview-container--tablet {
  padding: var(--aw-spacing-lg);
}

.aw-layout-builder__preview-container--tablet .aw-layout-builder__full-preview {
  max-width: 768px;
}

.aw-layout-builder__preview-container--mobile .aw-layout-builder__full-preview {
  max-width: 375px;
}

.aw-layout-builder__full-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-md);
  overflow: hidden;
  background-color: var(--aw-bg-color);
  box-shadow: var(--aw-shadow-md);
  max-width: 1200px;
}

.aw-layout-builder__new-row-zone {
  height: 60px;
  border: 2px dashed var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-md);
  margin-top: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(var(--aw-panel-bg-color-rgb, 30, 30, 30), 0.5);
  transition: all 0.2s ease;
}

.aw-layout-builder__new-row-zone--active {
  background-color: rgba(var(--aw-color-success-rgb, 76, 175, 80), 0.2);
  border-color: var(--aw-color-success-500);
  border-style: solid;
}

.aw-layout-builder__new-row-zone-text {
  font-size: var(--aw-font-size-sm, 0.875rem);
  color: var(--aw-text-secondary-color);
  opacity: 0.7;
}

.aw-layout-builder__new-row-zone:hover,
.aw-layout-builder__new-row-zone--active .aw-layout-builder__new-row-zone-text {
  color: var(--aw-text-color);
  opacity: 1;
}

/* Device palette styles */
.aw-layout-builder__device-palette {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: var(--aw-spacing-sm);
  margin-bottom: var(--aw-spacing-md);
}

.aw-layout-builder__device-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--aw-spacing-sm);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-sm);
  background-color: var(--aw-panel-content-bg-color);
  cursor: grab;
  transition: all 0.2s ease;
  text-align: center;
  height: 80px;
}

.aw-layout-builder__device-item:hover {
  background-color: var(--aw-panel-hover-bg-color);
  border-color: var(--aw-color-primary-500);
  transform: translateY(-2px);
  box-shadow: var(--aw-shadow-sm);
}

.aw-layout-builder__device-icon {
  font-size: 1.8rem;
  margin-bottom: var(--aw-spacing-xs);
}

.aw-layout-builder__device-name {
  font-size: var(--aw-font-size-sm, 0.875rem);
  color: var(--aw-text-color);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.aw-layout-builder__panel-right-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--aw-spacing-md);
  min-height: 30px; /* Ensure consistent height even when trash zone is hidden */
}

.aw-layout-builder__trash-zone {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-xs);
  padding: var(--aw-spacing-sm) var(--aw-spacing-md);
  border: 2px dashed var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-md);
  background-color: rgba(var(--aw-panel-bg-color-rgb, 30, 30, 30), 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
}

.aw-layout-builder__trash-zone--active {
  background-color: rgba(var(--aw-color-danger-rgb, 220, 53, 69), 0.2);
  border-color: var(--aw-color-danger-500);
  border-style: solid;
}

.aw-layout-builder__trash-icon {
  font-size: 1.25rem;
}

.aw-layout-builder__trash-text {
  font-size: var(--aw-font-size-sm, 0.875rem);
  /* Always show text since trash zone only appears during dragging */
  display: inline;
}

.aw-layout-builder__title-area {
  display: flex;
  align-items: baseline;
  gap: var(--aw-spacing-sm);
}

.aw-layout-builder__editing-name {
  font-size: var(--aw-font-size-md, 1rem);
  color: var(--aw-text-secondary-color);
  font-weight: normal;
  font-style: italic;
}
</style>
