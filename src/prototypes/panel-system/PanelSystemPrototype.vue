// Status: Legacy - Prototype Component // This is the panel system prototype that: // - Tests panel
system concepts // - Provides layout templates // - Supports custom layout building // -
Demonstrates panel definitions // - NOTE: Superseded by new panel system implementation

<script setup lang="ts">
import { ref, computed } from 'vue'
import DevicePalette from './components/DevicePalette.vue'
import WorkspacePanel from './components/WorkspacePanel.vue'
import LayoutControls from './components/LayoutControls.vue'
import CustomLayoutBuilder from './components/CustomLayoutBuilder.vue'
import PanelDefinitionViewer from './components/PanelDefinitionViewer.vue'

// Define available tabs in the prototype
const VIEW_TABS = {
  WORKSPACE: 'workspace',
  CUSTOM_BUILDER: 'custom-builder',
  PANEL_DEFINITIONS: 'panel-definitions'
}

// Panel interface
interface Panel {
  id: string
  deviceType: string
  deviceName: string
  gridArea: string
}

// Define a type for the template IDs
type TemplateId = 'imaging' | 'control' | 'monitoring' | 'custom'

// Active view tab
const activeTab = ref(VIEW_TABS.WORKSPACE)

// Layout templates
const templates = [
  { id: 'imaging' as TemplateId, name: 'Imaging', icon: '📷' },
  { id: 'control' as TemplateId, name: 'Telescope Control', icon: '🔭' },
  { id: 'monitoring' as TemplateId, name: 'Monitoring', icon: '📊' },
  { id: 'custom' as TemplateId, name: 'Custom Layout', icon: '🧩' }
]

// Current selected template
const selectedTemplate = ref<TemplateId>('imaging')

// Edit mode toggle
const isEditMode = ref(false)

// Show/hide device palette
const showPalette = ref(false)

// Toggle edit mode
function toggleEditMode() {
  isEditMode.value = !isEditMode.value
  // Show palette when entering edit mode
  if (isEditMode.value) {
    showPalette.value = true
  } else {
    showPalette.value = false
  }
}

// Handle template selection
function selectTemplate(templateId: string) {
  selectedTemplate.value = templateId as TemplateId
}

// Mock panels for each template (would be from a store in the actual app)
const allPanels: Record<TemplateId, Panel[]> = {
  imaging: [
    { id: 'camera-1', deviceType: 'camera', deviceName: 'Main Camera', gridArea: 'main' },
    {
      id: 'telescope-1',
      deviceType: 'telescope',
      deviceName: 'Mount Control',
      gridArea: 'sidebar-top'
    },
    { id: 'focuser-1', deviceType: 'focuser', deviceName: 'Focuser', gridArea: 'sidebar-middle' },
    {
      id: 'catalog-1',
      deviceType: 'catalog',
      deviceName: 'Object Catalog',
      gridArea: 'sidebar-bottom'
    }
  ],
  control: [
    {
      id: 'telescope-2',
      deviceType: 'telescope',
      deviceName: 'Telescope Control',
      gridArea: 'main'
    },
    {
      id: 'focuser-2',
      deviceType: 'focuser',
      deviceName: 'Focus Control',
      gridArea: 'bottom'
    }
  ],
  monitoring: [
    { id: 'camera-3', deviceType: 'camera', deviceName: 'Camera Status', gridArea: 'cell-1' },
    { id: 'telescope-3', deviceType: 'telescope', deviceName: 'Mount Status', gridArea: 'cell-2' },
    { id: 'focuser-3', deviceType: 'focuser', deviceName: 'Focuser Status', gridArea: 'cell-3' },
    { id: 'weather-1', deviceType: 'weather', deviceName: 'Weather', gridArea: 'cell-4' },
    {
      id: 'filterwheel-1',
      deviceType: 'filterwheel',
      deviceName: 'Filter Wheel',
      gridArea: 'cell-5'
    }
  ],
  custom: []
}

// Computed property to get the active panels for the selected template
const activePanels = computed(() => {
  return allPanels[selectedTemplate.value]
})
</script>

<template>
  <div class="panel-system-prototype">
    <header class="prototype-header">
      <h1>Panel System Prototype</h1>
      <div class="header-controls">
        <button
          v-if="activeTab === VIEW_TABS.WORKSPACE"
          :class="['edit-button', { active: isEditMode }]"
          @click="toggleEditMode"
        >
          <span class="button-icon">{{ isEditMode ? '✓' : '✏️' }}</span>
          {{ isEditMode ? 'Exit Edit Mode' : 'Edit Layout' }}
        </button>

        <button
          :class="['view-button', { active: activeTab === VIEW_TABS.WORKSPACE }]"
          @click="activeTab = VIEW_TABS.WORKSPACE"
        >
          <span class="button-icon">📋</span>
          Workspace View
        </button>

        <button
          :class="['view-button', { active: activeTab === VIEW_TABS.CUSTOM_BUILDER }]"
          @click="activeTab = VIEW_TABS.CUSTOM_BUILDER"
        >
          <span class="button-icon">🧩</span>
          Custom Builder
        </button>

        <button
          :class="['view-button', { active: activeTab === VIEW_TABS.PANEL_DEFINITIONS }]"
          @click="activeTab = VIEW_TABS.PANEL_DEFINITIONS"
        >
          <span class="button-icon">📚</span>
          Panel Definitions
        </button>
      </div>
    </header>

    <main class="prototype-content">
      <!-- Custom Layout Builder -->
      <div v-if="activeTab === VIEW_TABS.CUSTOM_BUILDER" class="custom-builder-container">
        <CustomLayoutBuilder />
      </div>

      <!-- Panel Definitions Viewer -->
      <div
        v-else-if="activeTab === VIEW_TABS.PANEL_DEFINITIONS"
        class="panel-definitions-container"
      >
        <PanelDefinitionViewer />
      </div>

      <!-- Workspace View -->
      <template v-else>
        <div
          v-if="activeTab === VIEW_TABS.WORKSPACE"
          class="device-palette-container"
          :class="{ expanded: showPalette }"
        >
          <DevicePalette />
        </div>

        <div class="workspace-container">
          <LayoutControls
            :templates="templates"
            :selected-template="selectedTemplate"
            @select-template="selectTemplate"
          />

          <div class="workspace" :class="selectedTemplate" data-testid="workspace">
            <!-- Render active panels -->
            <WorkspacePanel
              v-for="panel in activePanels"
              :key="panel.id"
              :device-type="panel.deviceType"
              :name="panel.deviceName"
              :style="{ gridArea: panel.gridArea }"
            />

            <!-- Placeholder for main area in control layout -->
            <div
              v-if="
                isEditMode &&
                selectedTemplate === 'control' &&
                !activePanels.some((p) => p.gridArea === 'main')
              "
              class="panel-placeholder main-area"
              style="grid-area: main"
            >
              <div class="placeholder-content">
                <span class="placeholder-icon">🔭</span>
                <span class="placeholder-text">Drop Telescope Controls Here</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </main>

    <footer class="prototype-footer">
      <p>
        This is an isolated prototype. Once you've evaluated it, you can safely delete the entire
        prototype directory.
      </p>
    </footer>
  </div>
</template>

<style scoped>
.panel-system-prototype {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--aw-bg-color);
  color: var(--aw-text-color);
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
}

.prototype-header {
  padding: 1rem 2rem;
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.header-controls {
  display: flex;
  gap: 0.5rem;
}

.header-controls button {
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  border: none;
  background-color: rgba(0, 0, 0, 0.2);
  color: var(--aw-panel-menu-bar-color);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-controls button:hover {
  background-color: rgba(0, 0, 0, 0.3);
}

.header-controls button.active {
  background-color: var(--aw-primary-dark);
}

.header-controls button.exit-button {
  background-color: var(--aw-primary-color);
}

.prototype-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.custom-builder-container,
.panel-definitions-container {
  flex: 1;
  overflow: auto;
  padding: 1rem;
}

.device-palette-container {
  width: 0;
  transition: width 0.3s ease;
  overflow: hidden;
  background-color: var(--aw-panel-bg-color);
  border-right: 1px solid var(--aw-panel-border-color);
  z-index: 5;
}

.device-palette-container.expanded {
  width: 300px;
}

.workspace-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.workspace {
  flex: 1;
  padding: 1rem;
  display: grid;
  gap: 1rem;
  overflow: auto;
  background-color: var(--aw-panels-bg-color);
}

/* Imaging layout */
.workspace.imaging {
  grid-template-columns: 3fr 1fr;
  grid-template-rows: auto auto 1fr;
  grid-template-areas:
    'main sidebar-top'
    'main sidebar-middle'
    'main sidebar-bottom';
}

/* Control layout */
.workspace.control {
  grid-template-columns: 1fr;
  grid-template-rows: 2fr 1fr;
  grid-template-areas:
    'main'
    'bottom';
}

/* Monitoring layout */
.workspace.monitoring {
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
  grid-template-areas:
    'cell-1 cell-2 cell-3'
    'cell-4 cell-5 cell-6';
}

/* Custom layout */
.workspace.custom {
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(3, 1fr);
  grid-template-areas:
    'cell-1 cell-2 cell-3 cell-4'
    'cell-5 cell-6 cell-7 cell-8'
    'cell-9 cell-10 cell-11 cell-12';
}

.panel-placeholder {
  background-color: rgba(var(--aw-primary-color-rgb, 74, 122, 220), 0.1);
  border: 2px dashed var(--aw-primary-color);
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 150px;
}

.panel-placeholder.main-area {
  min-height: 400px;
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  opacity: 0.7;
}

.placeholder-icon {
  font-size: 2rem;
}

.placeholder-text {
  font-size: 1rem;
  font-weight: 500;
}

.prototype-footer {
  padding: 1rem;
  background-color: var(--aw-panel-bg-color);
  border-top: 1px solid var(--aw-panel-border-color);
  text-align: center;
  font-size: 0.875rem;
  color: var(--aw-text-secondary-color);
}

.button-icon {
  font-size: 1.1em;
}
</style>
