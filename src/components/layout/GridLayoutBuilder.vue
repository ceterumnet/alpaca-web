<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import type { GridBasedLayout, GridCell } from '@/types/layouts/GridLayoutDefinition'
import type { Viewport } from '@/types/layouts/LayoutDefinition'

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

// Track if there are unsaved changes
const hasUnsavedChanges = ref<boolean>(false)

// Current viewport for editing and preview
const currentViewport = ref<Viewport>('desktop')
const previewMode = ref<boolean>(false)

// Currently selected cell for editing
const selectedCellId = ref<string | null>(null)

// Currently selected grid position for adding new cells
const selectedGridPosition = reactive({
  row: 0,
  column: 0
})

// Resizing state
const isResizing = ref(false)
const resizingCellId = ref<string | null>(null)
const resizeDirection = ref<'horizontal' | 'vertical' | 'both' | null>(null)

// Layout name and description
const layoutName = ref<string>('New Grid Layout')
const layoutDescription = ref<string>('')
const isDefaultLayout = ref<boolean>(false)

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

// Default grid configuration
const defaultGridConfig = {
  desktop: {
    rows: 6,
    columns: 6,
    rowSizes: [16.67, 16.67, 16.67, 16.67, 16.67, 16.67],
    columnSizes: [16.67, 16.67, 16.67, 16.67, 16.67, 16.67],
    cells: [
      {
        id: `cell-1-${Date.now()}`,
        deviceType: 'camera',
        name: 'Main Camera',
        priority: 'primary' as const,
        gridRowStart: 1,
        gridRowEnd: 3,
        gridColumnStart: 1,
        gridColumnEnd: 4
      },
      {
        id: `cell-2-${Date.now()}`,
        deviceType: 'telescope',
        name: 'Telescope Control',
        priority: 'secondary' as const,
        gridRowStart: 1,
        gridRowEnd: 3,
        gridColumnStart: 4,
        gridColumnEnd: 7
      },
      {
        id: `cell-3-${Date.now()}`,
        deviceType: 'focuser',
        name: 'Focuser',
        priority: 'secondary' as const,
        gridRowStart: 3,
        gridRowEnd: 5,
        gridColumnStart: 1,
        gridColumnEnd: 3
      },
      {
        id: `cell-4-${Date.now()}`,
        deviceType: 'filterwheel',
        name: 'Filter Wheel',
        priority: 'tertiary' as const,
        priority: 'tertiary',
        gridRowStart: 3,
        gridRowEnd: 5,
        gridColumnStart: 3,
        gridColumnEnd: 5
      },
      {
        id: `cell-5-${Date.now()}`,
        deviceType: 'weather',
        name: 'Weather',
        priority: 'tertiary',
        gridRowStart: 3,
        gridRowEnd: 5,
        gridColumnStart: 5,
        gridColumnEnd: 7
      },
      {
        id: `cell-6-${Date.now()}`,
        deviceType: 'data',
        name: 'Data Panel',
        priority: 'primary',
        gridRowStart: 5,
        gridRowEnd: 7,
        gridColumnStart: 1,
        gridColumnEnd: 7
      }
    ]
  },
  tablet: {
    rows: 8,
    columns: 4,
    rowSizes: [12.5, 12.5, 12.5, 12.5, 12.5, 12.5, 12.5, 12.5],
    columnSizes: [25, 25, 25, 25],
    cells: [
      {
        id: `cell-1-${Date.now()}`,
        deviceType: 'camera',
        name: 'Main Camera',
        priority: 'primary',
        gridRowStart: 1,
        gridRowEnd: 3,
        gridColumnStart: 1,
        gridColumnEnd: 5
      },
      {
        id: `cell-2-${Date.now()}`,
        deviceType: 'telescope',
        name: 'Telescope Control',
        priority: 'secondary',
        gridRowStart: 3,
        gridRowEnd: 5,
        gridColumnStart: 1,
        gridColumnEnd: 5
      },
      {
        id: `cell-3-${Date.now()}`,
        deviceType: 'focuser',
        name: 'Focuser',
        priority: 'secondary',
        gridRowStart: 5,
        gridRowEnd: 7,
        gridColumnStart: 1,
        gridColumnEnd: 3
      },
      {
        id: `cell-4-${Date.now()}`,
        deviceType: 'filterwheel',
        name: 'Filter Wheel',
        priority: 'tertiary',
        gridRowStart: 5,
        gridRowEnd: 7,
        gridColumnStart: 3,
        gridColumnEnd: 5
      },
      {
        id: `cell-5-${Date.now()}`,
        deviceType: 'data',
        name: 'Data Panel',
        priority: 'primary',
        gridRowStart: 7,
        gridRowEnd: 9,
        gridColumnStart: 1,
        gridColumnEnd: 5
      }
    ]
  },
  mobile: {
    rows: 6,
    columns: 2,
    rowSizes: [16.67, 16.67, 16.67, 16.67, 16.67, 16.67],
    columnSizes: [50, 50],
    cells: [
      {
        id: `cell-1-${Date.now()}`,
        deviceType: 'camera',
        name: 'Main Camera',
        priority: 'primary',
        gridRowStart: 1,
        gridRowEnd: 3,
        gridColumnStart: 1,
        gridColumnEnd: 3
      },
      {
        id: `cell-2-${Date.now()}`,
        deviceType: 'telescope',
        name: 'Telescope Control',
        priority: 'secondary',
        gridRowStart: 3,
        gridRowEnd: 5,
        gridColumnStart: 1,
        gridColumnEnd: 3
      },
      {
        id: `cell-3-${Date.now()}`,
        deviceType: 'data',
        name: 'Data Panel',
        priority: 'secondary',
        gridRowStart: 5,
        gridRowEnd: 7,
        gridColumnStart: 1,
        gridColumnEnd: 3
      }
    ]
  }
}

// Current layouts for each viewport
const layouts = reactive<Record<Viewport, GridBasedLayout>>({
  desktop: {...defaultGridConfig.desktop},
  tablet: {...defaultGridConfig.tablet},
  mobile: {...defaultGridConfig.mobile}
})

// Get the current layout based on viewport
const currentLayout = computed(() => {
  return layouts[currentViewport.value]
})

// Get the selected cell from the current layout
const selectedCell = computed(() => {
  if (!selectedCellId.value) return null
  return currentLayout.value.cells.find(cell => cell.id === selectedCellId.value) || null
})

// Create CSS grid template for current layout
const gridTemplateRows = computed(() => {
  return currentLayout.value.rowSizes.map(size => `${size}%`).join(' ')
})

const gridTemplateColumns = computed(() => {
  return currentLayout.value.columnSizes.map(size => `${size}%`).join(' ')
})

// CSS styles for grid cells based on their position
function getCellStyle(cell: GridCell) {
  return {
    gridRowStart: cell.gridRowStart,
    gridRowEnd: cell.gridRowEnd,
    gridColumnStart: cell.gridColumnStart,
    gridColumnEnd: cell.gridColumnEnd
  }
}

// Select a cell for editing
function selectCell(cellId: string) {
  selectedCellId.value = cellId
}

// Initialize the layout with default values (or loaded values)
function initializeLayout() {
  // This would eventually load from props.layoutId if provided
  // For now, we're using the default configuration
  layouts.desktop = {...defaultGridConfig.desktop}
  layouts.tablet = {...defaultGridConfig.tablet}
  layouts.mobile = {...defaultGridConfig.mobile}
  
  // Mark as changed by default for new layouts
  hasUnsavedChanges.value = true
}

// Create a new cell at the specified grid position
function createCell(position: {row: number, column: number}, size: {rows: number, columns: number} = {rows: 1, columns: 1}) {
  const cell: GridCell = {
    id: `cell-${Date.now()}`,
    deviceType: 'any',
    name: 'New Panel',
    priority: 'secondary',
    gridRowStart: position.row,
    gridRowEnd: position.row + size.rows,
    gridColumnStart: position.column,
    gridColumnEnd: position.column + size.columns
  }
  
  currentLayout.value.cells.push(cell)
  selectedCellId.value = cell.id
  
  // Mark as changed
  hasUnsavedChanges.value = true
}

// Delete the selected cell
function deleteSelectedCell() {
  if (!selectedCellId.value) return
  
  const cellIndex = currentLayout.value.cells.findIndex(cell => cell.id === selectedCellId.value)
  if (cellIndex !== -1) {
    currentLayout.value.cells.splice(cellIndex, 1)
    selectedCellId.value = null
    
    // Mark as changed
    hasUnsavedChanges.value = true
  }
}

// Expand a cell in a specific direction
function expandCell(cellId: string, direction: 'up' | 'down' | 'left' | 'right') {
  const cell = currentLayout.value.cells.find(c => c.id === cellId)
  if (!cell) return
  
  // Check for grid boundaries
  switch (direction) {
    case 'up':
      if (cell.gridRowStart > 1) {
        cell.gridRowStart--
      }
      break
    case 'down':
      if (cell.gridRowEnd <= currentLayout.value.rows) {
        cell.gridRowEnd++
      }
      break
    case 'left':
      if (cell.gridColumnStart > 1) {
        cell.gridColumnStart--
      }
      break
    case 'right':
      if (cell.gridColumnEnd <= currentLayout.value.columns) {
        cell.gridColumnEnd++
      }
      break
  }
  
  // Mark as changed
  hasUnsavedChanges.value = true
}

// Shrink a cell in a specific direction
function shrinkCell(cellId: string, direction: 'up' | 'down' | 'left' | 'right') {
  const cell = currentLayout.value.cells.find(c => c.id === cellId)
  if (!cell) return
  
  // Prevent making cells too small
  const minRowSpan = 1
  const minColSpan = 1
  
  switch (direction) {
    case 'up':
      if (cell.gridRowEnd - cell.gridRowStart > minRowSpan) {
        cell.gridRowStart++
      }
      break
    case 'down':
      if (cell.gridRowEnd - cell.gridRowStart > minRowSpan) {
        cell.gridRowEnd--
      }
      break
    case 'left':
      if (cell.gridColumnEnd - cell.gridColumnStart > minColSpan) {
        cell.gridColumnStart++
      }
      break
    case 'right':
      if (cell.gridColumnEnd - cell.gridColumnStart > minColSpan) {
        cell.gridColumnEnd--
      }
      break
  }
  
  // Mark as changed
  hasUnsavedChanges.value = true
}

// Check if a cell can be moved in the given direction
function canMove(cell: GridCell, direction: 'up' | 'down' | 'left' | 'right'): boolean {
  switch (direction) {
    case 'up':
      return cell.gridRowStart > 1
    case 'down':
      return cell.gridRowEnd <= currentLayout.value.rows
    case 'left':
      return cell.gridColumnStart > 1
    case 'right':
      return cell.gridColumnEnd <= currentLayout.value.columns
    default:
      return false
  }
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

// Save the layout (would eventually save to a store)
function saveLayout() {
  // This would eventually save to a store
  console.log('Saving grid layout:', layouts)
  
  // Reset unsaved changes flag
  hasUnsavedChanges.value = false
  
  // Emit save event with layout data
  emit('save', {
    id: props.layoutId || `grid-layout-${Date.now()}`,
    name: layoutName.value,
    description: layoutDescription.value,
    layouts: layouts,
    isDefault: isDefaultLayout.value
  })
}

// Initialize on mount
onMounted(() => {
  initializeLayout()
})
</script>

<template>
  <div class="aw-grid-layout-builder">
    <div class="aw-grid-layout-builder__header">
      <div class="aw-grid-layout-builder__title">
        <h2>Grid Layout Builder</h2>
      </div>
      <div class="aw-grid-layout-builder__controls">
        <div class="aw-grid-layout-builder__viewport-selector">
          <button
            v-for="viewport in ['desktop', 'tablet', 'mobile']"
            :key="viewport"
            class="aw-grid-layout-builder__viewport-button"
            :class="{ 'aw-grid-layout-builder__viewport-button--active': currentViewport === viewport }"
            @click="currentViewport = viewport as Viewport"
          >
            {{ viewport }}
          </button>
        </div>
      </div>
    </div>
    
    <div class="aw-grid-layout-builder__content">
      <div class="aw-grid-layout-builder__sidebar">
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
        
        <!-- Selected cell editor -->
        <div v-if="selectedCell" class="aw-grid-layout-builder__cell-editor">
          <h3>Edit Panel</h3>
          
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
          
          <div class="aw-form-group">
            <h4>Grid Position</h4>
            <div class="aw-grid-position-editor">
              <div class="aw-grid-position-row">
                <label>Row Start:</label>
                <input 
                  v-model.number="selectedCell.gridRowStart" 
                  type="number" 
                  min="1" 
                  :max="selectedCell.gridRowEnd - 1"
                />
              </div>
              <div class="aw-grid-position-row">
                <label>Row End:</label>
                <input 
                  v-model.number="selectedCell.gridRowEnd" 
                  type="number" 
                  :min="selectedCell.gridRowStart + 1" 
                  :max="currentLayout.rows + 1"
                />
              </div>
              <div class="aw-grid-position-row">
                <label>Column Start:</label>
                <input 
                  v-model.number="selectedCell.gridColumnStart" 
                  type="number" 
                  min="1" 
                  :max="selectedCell.gridColumnEnd - 1"
                />
              </div>
              <div class="aw-grid-position-row">
                <label>Column End:</label>
                <input 
                  v-model.number="selectedCell.gridColumnEnd" 
                  type="number" 
                  :min="selectedCell.gridColumnStart + 1" 
                  :max="currentLayout.columns + 1"
                />
              </div>
            </div>
          </div>
          
          <div class="aw-grid-resize-controls">
            <div class="aw-grid-resize-row">
              <button 
                :disabled="!canMove(selectedCell, 'up')"
                class="aw-grid-resize-button"
                @click="expandCell(selectedCell.id, 'up')"
              >
                Expand ↑
              </button>
              <button 
                :disabled="!canMove(selectedCell, 'down')"
                class="aw-grid-resize-button"
                @click="expandCell(selectedCell.id, 'down')"
              >
                Expand ↓
              </button>
            </div>
            <div class="aw-grid-resize-row">
              <button 
                :disabled="!canMove(selectedCell, 'left')"
                class="aw-grid-resize-button"
                @click="expandCell(selectedCell.id, 'left')"
              >
                Expand ←
              </button>
              <button 
                :disabled="!canMove(selectedCell, 'right')"
                class="aw-grid-resize-button"
                @click="expandCell(selectedCell.id, 'right')"
              >
                Expand →
              </button>
            </div>
            
            <div class="aw-grid-resize-row">
              <button 
                :disabled="selectedCell.gridRowEnd - selectedCell.gridRowStart <= 1"
                class="aw-grid-resize-button"
                @click="shrinkCell(selectedCell.id, 'up')"
              >
                Shrink ↑
              </button>
              <button 
                :disabled="selectedCell.gridRowEnd - selectedCell.gridRowStart <= 1"
                class="aw-grid-resize-button"
                @click="shrinkCell(selectedCell.id, 'down')"
              >
                Shrink ↓
              </button>
            </div>
            <div class="aw-grid-resize-row">
              <button 
                :disabled="selectedCell.gridColumnEnd - selectedCell.gridColumnStart <= 1"
                class="aw-grid-resize-button"
                @click="shrinkCell(selectedCell.id, 'left')"
              >
                Shrink ←
              </button>
              <button 
                :disabled="selectedCell.gridColumnEnd - selectedCell.gridColumnStart <= 1"
                class="aw-grid-resize-button"
                @click="shrinkCell(selectedCell.id, 'right')"
              >
                Shrink →
              </button>
            </div>
          </div>
          
          <div class="aw-grid-layout-builder__controls">
            <button 
              class="aw-button aw-button--danger" 
              @click="deleteSelectedCell"
            >
              Delete Panel
            </button>
          </div>
        </div>
      </div>
      
      <div class="aw-grid-layout-builder__grid-container">
        <h3>{{ currentViewport }} Layout</h3>
        
        <!-- Grid layout container -->
        <div 
          class="aw-grid-layout-builder__grid" 
          :style="{ 
            gridTemplateRows,
            gridTemplateColumns,
          }"
        >
          <!-- Grid cells -->
          <div 
            v-for="cell in currentLayout.cells" 
            :key="cell.id"
            class="aw-grid-layout-builder__cell"
            :class="{
              'aw-grid-layout-builder__cell--selected': selectedCellId === cell.id,
              'aw-grid-layout-builder__cell--primary': cell.priority === 'primary',
              'aw-grid-layout-builder__cell--secondary': cell.priority === 'secondary',
              'aw-grid-layout-builder__cell--tertiary': cell.priority === 'tertiary'
            }"
            :style="getCellStyle(cell)"
            @click="selectCell(cell.id)"
          >
            <div class="aw-grid-layout-builder__cell-header">
              {{ cell.name }}
            </div>
            <div class="aw-grid-layout-builder__cell-content">
              {{ cell.deviceType }}
            </div>
            
            <!-- Resize handles (visible only for selected cell) -->
            <div v-if="selectedCellId === cell.id" class="aw-grid-layout-builder__resize-handles">
              <div class="aw-grid-layout-builder__resize-handle aw-grid-layout-builder__resize-handle--right"></div>
              <div class="aw-grid-layout-builder__resize-handle aw-grid-layout-builder__resize-handle--bottom"></div>
              <div class="aw-grid-layout-builder__resize-handle aw-grid-layout-builder__resize-handle--corner"></div>
            </div>
          </div>
        </div>
        
        <!-- Button to add new cell -->
        <div class="aw-grid-layout-builder__add-panel">
          <button 
            class="aw-button aw-button--primary"
            @click="createCell({row: 1, column: 1}, {rows: 1, columns: 1})"
          >
            Add New Panel
          </button>
        </div>
      </div>
    </div>
    
    <div class="aw-grid-layout-builder__footer">
      <button 
        class="aw-button aw-button--secondary"
        @click="handleCancel"
      >
        Cancel
      </button>
      <button 
        class="aw-button aw-button--primary"
        @click="saveLayout"
      >
        Save Layout
      </button>
    </div>
  </div>
</template>

<style scoped>
.aw-grid-layout-builder {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--aw-bg-color, #f5f5f5);
  color: var(--aw-text-color, #333);
}

.aw-grid-layout-builder__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--aw-border-color, #ddd);
}

.aw-grid-layout-builder__title h2 {
  margin: 0;
  font-size: 1.25rem;
}

.aw-grid-layout-builder__controls {
  display: flex;
  gap: 0.5rem;
}

.aw-grid-layout-builder__viewport-selector {
  display: flex;
  gap: 0.25rem;
}

.aw-grid-layout-builder__viewport-button {
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--aw-border-color, #ddd);
  border-radius: 0.25rem;
  background-color: var(--aw-button-bg, #fff);
  cursor: pointer;
  text-transform: capitalize;
}

.aw-grid-layout-builder__viewport-button--active {
  background-color: var(--aw-primary-color, #4a7adc);
  color: white;
  border-color: var(--aw-primary-color-dark, #3a6acc);
}

.aw-grid-layout-builder__content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.aw-grid-layout-builder__sidebar {
  width: 300px;
  padding: 1rem;
  border-right: 1px solid var(--aw-border-color, #ddd);
  overflow-y: auto;
  background-color: var(--aw-sidebar-bg, #f9f9f9);
}

.aw-form-group {
  margin-bottom: 1rem;
}

.aw-form-label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
}

.aw-input, .aw-select, .aw-textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--aw-border-color, #ddd);
  border-radius: 0.25rem;
}

.aw-textarea {
  min-height: 80px;
  resize: vertical;
}

.aw-grid-layout-builder__cell-editor {
  margin-top: 1rem;
  padding: 1rem;
  border: 1px solid var(--aw-border-color, #ddd);
  border-radius: 0.25rem;
  background-color: var(--aw-card-bg, #fff);
}

.aw-grid-layout-builder__cell-editor h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1rem;
}

.aw-grid-position-editor {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.aw-grid-position-row {
  display: flex;
  flex-direction: column;
}

.aw-grid-position-row label {
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
}

.aw-grid-position-row input {
  width: 100%;
  padding: 0.25rem;
  border: 1px solid var(--aw-border-color, #ddd);
  border-radius: 0.25rem;
}

.aw-grid-resize-controls {
  margin-top: 1rem;
}

.aw-grid-resize-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.aw-grid-resize-button {
  flex: 1;
  padding: 0.25rem;
  border: 1px solid var(--aw-border-color, #ddd);
  border-radius: 0.25rem;
  background-color: var(--aw-button-bg, #fff);
  cursor: pointer;
  font-size: 0.85rem;
}

.aw-grid-resize-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.aw-grid-layout-builder__grid-container {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

.aw-grid-layout-builder__grid-container h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1rem;
  text-transform: capitalize;
}

.aw-grid-layout-builder__grid {
  display: grid;
  height: 600px;
  border: 1px solid var(--aw-border-color, #ddd);
  background-color: var(--aw-grid-bg, #eee);
  gap: 2px;
  position: relative;
}

.aw-grid-layout-builder__cell {
  background-color: var(--aw-cell-bg, #fff);
  border: 1px solid var(--aw-border-color, #ddd);
  border-radius: 0.25rem;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease;
}

.aw-grid-layout-builder__cell:hover {
  box-shadow: 0 0 0 2px rgba(74, 122, 220, 0.3);
}

.aw-grid-layout-builder__cell--selected {
  box-shadow: 0 0 0 2px var(--aw-primary-color, #4a7adc);
  z-index: 1;
}

.aw-grid-layout-builder__cell--primary {
  background-color: rgba(74, 122, 220, 0.1);
}

.aw-grid-layout-builder__cell--secondary {
  background-color: rgba(76, 175, 80, 0.1);
}

.aw-grid-layout-builder__cell--tertiary {
  background-color: rgba(255, 152, 0, 0.1);
}

.aw-grid-layout-builder__cell-header {
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.aw-grid-layout-builder__cell-content {
  font-size: 0.85rem;
  color: var(--aw-text-secondary, #666);
}

.aw-grid-layout-builder__resize-handles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.aw-grid-layout-builder__resize-handle {
  position: absolute;
  background-color: var(--aw-primary-color, #4a7adc);
  pointer-events: auto;
  cursor: pointer;
}

.aw-grid-layout-builder__resize-handle--right {
  width: 6px;
  top: 0;
  bottom: 0;
  right: -3px;
  cursor: ew-resize;
}

.aw-grid-layout-builder__resize-handle--bottom {
  height: 6px;
  left: 0;
  right: 0;
  bottom: -3px;
  cursor: ns-resize;
}

.aw-grid-layout-builder__resize-handle--corner {
  width: 12px;
  height: 12px;
  right: -6px;
  bottom: -6px;
  border-radius: 50%;
  cursor: nwse-resize;
}

.aw-grid-layout-builder__add-panel {
  margin-top: 1rem;
  display: flex;
  justify-content: center;
}

.aw-grid-layout-builder__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem;
  border-top: 1px solid var(--aw-border-color, #ddd);
}

.aw-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-weight: 500;
}

.aw-button--primary {
  background-color: var(--aw-primary-color, #4a7adc);
  color: white;
}

.aw-button--secondary {
  background-color: var(--aw-button-secondary-bg, #eaeaea);
  color: var(--aw-text-color, #333);
}

.aw-button--danger {
  background-color: var(--aw-danger-color, #dc3545);
  color: white;
}
</style> 