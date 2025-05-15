<script setup lang="ts">
import { ref } from 'vue'

// Device types (copied from CustomLayoutBuilder.vue)
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

interface LayoutCell {
  id: string;
  row: number;
  col: number;
  rowSpan?: number;
  colSpan?: number;
  width?: number;
}

interface LayoutTemplate {
  id: string;
  name: string;
  rows: number;
  cols: number;
  cells: LayoutCell[];
}

const layoutTemplates: LayoutTemplate[] = [
  {
    id: '2x2',
    name: '2x2 Grid',
    rows: 2,
    cols: 2,
    cells: [
      { id: 'cell-1', row: 0, col: 0 },
      { id: 'cell-2', row: 0, col: 1 },
      { id: 'cell-3', row: 1, col: 0 },
      { id: 'cell-4', row: 1, col: 1 },
    ]
  },
  {
    id: '1x2',
    name: '1x2 Grid',
    rows: 1,
    cols: 2,
    cells: [
      { id: 'cell-1', row: 0, col: 0 },
      { id: 'cell-2', row: 0, col: 1 },
    ]
  },
  {
    id: '3x2',
    name: '3x2 Grid',
    rows: 3,
    cols: 2,
    cells: [
      { id: 'cell-1', row: 0, col: 0 },
      { id: 'cell-2', row: 0, col: 1 },
      { id: 'cell-3', row: 1, col: 0 },
      { id: 'cell-4', row: 1, col: 1 },
      { id: 'cell-5', row: 2, col: 0 },
      { id: 'cell-6', row: 2, col: 1 },
    ]
  },
  {
    id: 'hybrid-50',
    name: 'Hybrid 50/50',
    rows: 2,
    cols: 2,
    cells: [
      { id: 'cell-1', row: 0, col: 0, rowSpan: 2, colSpan: 1 }, // left, spans both rows
      { id: 'cell-2', row: 0, col: 1 }, // right top
      { id: 'cell-3', row: 1, col: 1 }, // right bottom
    ]
  },
  {
    id: 'hybrid-60',
    name: 'Hybrid 60/40',
    rows: 2,
    cols: 2,
    cells: [
      { id: 'cell-1', row: 0, col: 0, rowSpan: 2, colSpan: 1, width: 60 }, // left, spans both rows, 60%
      { id: 'cell-2', row: 0, col: 1, width: 40 }, // right top, 40%
      { id: 'cell-3', row: 1, col: 1, width: 40 }, // right bottom, 40%
    ]
  },
]

const selectedTemplate = ref<LayoutTemplate | null>(null)
const cellAssignments = ref<Record<string, string>>({}) // cellId -> deviceType

function selectTemplate(template: LayoutTemplate) {
  selectedTemplate.value = template
  cellAssignments.value = {}
  
  // Pre-assign device types based on cell ID if possible
  template.cells.forEach((cell, index) => {
    // For demonstration purposes, assign default device types to first 3 cells if available
    if (index === 0 && deviceTypes.some(d => d.id === 'camera')) {
      cellAssignments.value[cell.id] = 'camera';
    } else if (index === 1 && deviceTypes.some(d => d.id === 'telescope')) {
      cellAssignments.value[cell.id] = 'telescope';
    } else if (index === 2 && deviceTypes.some(d => d.id === 'focuser')) {
      cellAssignments.value[cell.id] = 'focuser';
    }
  });
}

function getDeviceName(deviceType: string) {
  return deviceTypes.find(d => d.id === deviceType)?.name || ''
}

function handleDone() {
  if (!selectedTemplate.value) return;
  // Build the final layout object with device assignments
  const layout = {
    ...selectedTemplate.value,
    cells: selectedTemplate.value.cells.map((cell) => ({
      ...cell,
      deviceType: cellAssignments.value[cell.id] || null,
      name: getDeviceName(cellAssignments.value[cell.id]) || 'Unassigned',
    }))
  }
  // Emit the layout
  emit('save', layout)
}

const emit = defineEmits(['save', 'cancel'])
</script>

<template>
  <div class="static-layout-chooser">
    <div v-if="!selectedTemplate" class="layout-chooser__options">
      <h2>Choose a Layout</h2>
      <div class="layout-chooser__grid">
        <div v-for="template in layoutTemplates" :key="template.id" class="layout-chooser__card" @click="selectTemplate(template)">
          <div class="layout-chooser__card-title">{{ template.name }}</div>
          <div
            class="layout-chooser__preview"
            :style="{
              gridTemplateRows: `repeat(${template.rows}, 1fr)`,
              gridTemplateColumns: template.id === 'hybrid-60' ? '3fr 2fr' : '1fr 1fr',
              width: '120px'
            }"
          >
            <div
              v-for="cell in template.cells"
              :key="cell.id"
              class="layout-chooser__cell-preview"
              :style="{
                gridRow: `${cell.row + 1} / span ${cell.rowSpan || 1}`,
                gridColumn: `${cell.col + 1} / span ${cell.colSpan || 1}`
              }"
            >
              <span class="layout-chooser__cell-id">{{ cell.id }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="layout-chooser__assign">
      <h2>Assign Devices</h2>
      <div class="layout-chooser__preview" :style="{ gridTemplateRows: `repeat(${selectedTemplate.rows}, 1fr)`, gridTemplateColumns: selectedTemplate.id === 'hybrid-60' ? '3fr 2fr' : '1fr 1fr', width: '120px' }">
        <div v-for="cell in selectedTemplate.cells" :key="cell.id" class="layout-chooser__cell-preview layout-chooser__cell-assign" :style="{ gridRow: `${cell.row + 1} / span ${cell.rowSpan || 1}`, gridColumn: `${cell.col + 1} / span ${cell.colSpan || 1}` }">
          <div class="layout-chooser__cell-title">
            <span v-if="cellAssignments[cell.id]">
              {{ getDeviceName(cellAssignments[cell.id]) }}
            </span>
            <span v-else class="layout-chooser__cell-unassigned">Unassigned</span>
          </div>
          <select v-model="cellAssignments[cell.id]" class="layout-chooser__device-select">
            <option disabled value="">Select device</option>
            <option v-for="device in deviceTypes" :key="device.id" :value="device.id">
              {{ device.icon }} {{ device.name }}
            </option>
          </select>
        </div>
      </div>
      <div class="layout-chooser__actions">
        <button class="aw-button aw-button--secondary" @click="selectedTemplate = null">Back</button>
        <button class="aw-button aw-button--primary" :disabled="Object.keys(cellAssignments).length !== selectedTemplate.cells.length || Object.values(cellAssignments).some(v => !v)" @click="handleDone">Done</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.static-layout-chooser {
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
}
.layout-chooser__options {
  text-align: center;
}
.layout-chooser__grid {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 2rem;
}
.layout-chooser__card {
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 8px;
  padding: 1rem;
  width: 180px;
  cursor: pointer;
  background: var(--aw-panel-bg-color);
  transition: box-shadow 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.layout-chooser__card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.10);
  border-color: var(--aw-color-primary-500);
}
.layout-chooser__card-title {
  font-weight: 600;
  margin-bottom: 0.5rem;
}
.layout-chooser__preview {
  display: grid;
  gap: 0;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #eee;
  margin: 0 auto;
  width: 120px;
  aspect-ratio: 3 / 2;
}
.layout-chooser__cell-preview {
  background: var(--aw-panel-content-bg-color);
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  min-height: 0;
  min-width: 0;
  border: 1px solid #ddd;
  border-right: none;
  border-bottom: none;
  flex-direction: column;
}
.layout-chooser__cell-preview:last-child,
.layout-chooser__cell-preview[style*='grid-column: 2 / span 1'] {
  border-right: 1px solid #ddd;
}
.layout-chooser__cell-preview[style*='grid-row: 2 / span 1'] {
  border-bottom: 1px solid #ddd;
}
.layout-chooser__cell-id {
  color: var(--aw-text-secondary-color);
  font-size: 0.8rem;
}
.layout-chooser__assign {
  text-align: center;
}
.layout-chooser__cell-assign {
  flex-direction: column;
  padding: 0.5rem 0.25rem;
}
.layout-chooser__cell-title {
  font-weight: 500;
  margin-bottom: 0.5rem;
}
.layout-chooser__cell-unassigned {
  color: var(--aw-color-neutral-500);
  font-style: italic;
}
.layout-chooser__device-select {
  width: 100%;
  margin-top: 0.25rem;
  padding: 0.25rem;
  border-radius: 4px;
  border: 1px solid #ccc;
}
.layout-chooser__actions {
  margin-top: 2rem;
  display: flex;
  gap: 1rem;
  justify-content: center;
}
</style> 