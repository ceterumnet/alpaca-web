// Status: Updated - Core Navigation Component 
// This is the main navigation bar that: 
// - Integrates with new navigation components 
// - Provides primary navigation 
// - Shows device status
// - Handles theme switching 
// - Supports responsive design

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useUIPreferencesStore } from '@/stores/useUIPreferencesStore'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { useLayoutStore } from '@/stores/useLayoutStore'
import Icon from '@/components/ui/Icon.vue'
import type { IconType } from '@/components/ui/Icon.vue'
import DiscoveryIndicator from '@/components/navigation/DiscoveryIndicator.vue'

// Get stores
const uiStore = useUIPreferencesStore()
const unifiedStore = useUnifiedStore()
const layoutStore = useLayoutStore()
const route = useRoute()

// Define interface for nav links with proper typing
interface NavLink {
  name: string
  path: string
  icon: IconType
  description: string
}

// Navigation links with improved structure
const navLinks: NavLink[] = [
  {
    name: 'Home',
    path: '/panel-layout',
    icon: 'files',
    description: 'Customizable panel layout view'
  },
  // {
  //   name: 'Layout Builder',
  //   path: '/layout-builder',
  //   icon: 'expand',
  //   description: 'Create and edit custom layouts'
  // },
  // {
  //   name: 'Discovery',
  //   path: '/discovery',
  //   icon: 'search',
  //   description: 'Find and connect devices'
  // },
  // {
  //   name: 'UI Components',
  //   path: '/ui-components',
  //   icon: 'detailed',
  //   description: 'UI component showcase'
  // },
  {
    name: 'Settings',
    path: '/settings',
    icon: 'gear',
    description: 'Application settings'
  }
]

// Layout functionality
const currentLayoutId = ref(layoutStore.currentLayoutId || 'default')

// Define LayoutCell and LayoutTemplate interfaces
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

// Static layout templates (copied from StaticLayoutChooser)
const staticLayouts: LayoutTemplate[] = [
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
      { id: 'cell-1', row: 0, col: 0, rowSpan: 2, colSpan: 1 },
      { id: 'cell-2', row: 0, col: 1 },
      { id: 'cell-3', row: 1, col: 1 },
    ]
  },
  {
    id: 'hybrid-60',
    name: 'Hybrid 60/40',
    rows: 2,
    cols: 2,
    cells: [
      { id: 'cell-1', row: 0, col: 0, rowSpan: 2, colSpan: 1, width: 60 },
      { id: 'cell-2', row: 0, col: 1, width: 40 },
      { id: 'cell-3', row: 1, col: 1, width: 40 },
    ]
  },
]

// Change layout

// Function to delete the current layout

// Create and add a default layout

// Function to set the current layout as default

// Open layout builder

// Toggle between dark and light mode
function toggleDarkMode() {
  uiStore.isDarkMode = !uiStore.isDarkMode
  if (uiStore.isDarkMode) {
    document.documentElement.classList.add('dark-theme')
  } else {
    document.documentElement.classList.remove('dark-theme')
  }
  localStorage.setItem('dark-theme-preference', uiStore.isDarkMode.toString())
}

// Responsive breakpoints
const isSmallScreen = ref(false)
const isMobileDevice = ref(false)

// Check screen size on mount and when window resizes
function updateScreenSize() {
  isSmallScreen.value = window.innerWidth < 768
  isMobileDevice.value = window.innerWidth < 480
}

onMounted(() => {
  updateScreenSize()
  window.addEventListener('resize', updateScreenSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateScreenSize)
})

// Get connected device count
const connectedDeviceCount = computed(() => {
  return unifiedStore.connectedDevices.length
})

// Total device count
const totalDeviceCount = computed(() => {
  return unifiedStore.devicesList.length
})

// Active link computation
const isActiveLink = (path: string) => {
  return route.path.startsWith(path)
}

function selectStaticLayout(layoutId: string) {
  const layout = staticLayouts.find((l) => l.id === layoutId)
  if (!layout) return
  
  // Create a unique ID for the new layout
  const newLayoutId = `static-${layout.id}-${Date.now()}`
  
  // Handle layout creation based on layout type
  const isHybridLayout = layoutId.startsWith('hybrid-');
  let gridLayout;
  
  if (isHybridLayout) {
    // Get hybrid layout with positions
    const hybridLayoutResult = createHybridLayout(layout);
    gridLayout = {
      id: newLayoutId,
      name: layout.name,
      description: layout.name,
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
      isDefault: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  } else {
    // Regular grid layout
    gridLayout = {
      id: newLayoutId,
      name: layout.name,
      description: layout.name,
      layouts: {
        desktop: createViewportLayout(layout),
        tablet: createViewportLayout(layout),
        mobile: createViewportLayout(layout)
      },
      isDefault: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }
  
  // First add the layout to the store
  layoutStore.addGridLayout(gridLayout)
  
  // Clear the current layout first (to force reactivity)
  layoutStore.setCurrentLayout('')
  
  // Use setTimeout to ensure DOM updates between changes
  setTimeout(() => {
    // Then set the new layout as current
    layoutStore.setCurrentLayout(gridLayout.id)
    currentLayoutId.value = gridLayout.id
    
    // Force a window resize event to ensure layout container updates
    window.dispatchEvent(new Event('resize'))
  }, 10)
}

// Create a viewport layout from a static template
function createViewportLayout(layout: LayoutTemplate) {
  // Special handling for hybrid layouts
  if (layout.id === 'hybrid-50' || layout.id === 'hybrid-60') {
    return createHybridLayout(layout)
  }
  
  // For regular grid layouts
  return {
    rows: convertStaticToRows(layout),
    panelIds: layout.cells.map(cell => cell.id)
  }
}

// Special handler for hybrid layouts
function createHybridLayout(layout: LayoutTemplate) {
  console.log('Creating hybrid layout for', layout.id)
  console.log('Layout cells:', layout.cells)
  
  const spanningCell = layout.cells.find(cell => cell.rowSpan === 2)
  const topRightCell = layout.cells.find(cell => cell.row === 0 && cell.col === 1)
  const bottomRightCell = layout.cells.find(cell => cell.row === 1 && cell.col === 1)
  
  console.log('Found cells:', {
    spanningCell,
    topRightCell,
    bottomRightCell
  })
  
  if (!spanningCell || !topRightCell || !bottomRightCell) {
    console.error('Invalid hybrid layout structure')
    return {
      rows: convertStaticToRows(layout),
      panelIds: layout.cells.map(cell => cell.id)
    }
  }
  
  // Get the correct width values
  const leftWidth = spanningCell.width || 50
  const rightWidth = 100 - leftWidth
  
  // For hybrid layouts, the key is to manually position each cell
  const rows = [
    // First row: Left spanning cell + top right cell
    {
      id: 'row-1',
      cells: [
        // Left spanning cell (spans 2 rows)
        {
          id: spanningCell.id,
          deviceType: 'any',
          name: spanningCell.id,
          priority: 'primary' as 'primary' | 'secondary' | 'tertiary',
          width: leftWidth,
          rowSpan: 2 // Preserve rowSpan
        },
        // Top right cell
        {
          id: topRightCell.id,
          deviceType: 'any',
          name: topRightCell.id,
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
          deviceType: 'any',
          name: bottomRightCell.id,
          priority: 'primary' as 'primary' | 'secondary' | 'tertiary',
          width: rightWidth 
        }
      ],
      height: 50
    }
  ]
  
  console.log('Created hybrid layout rows:', rows)
  
  return {
    rows,
    panelIds: [spanningCell.id, topRightCell.id, bottomRightCell.id]
  }
}

function convertStaticToRows(layout: LayoutTemplate) {
  const rows = []
  
  // Use a special approach to handle cells with rowSpan
  const spanningCells = layout.cells.filter(cell => cell.rowSpan && cell.rowSpan > 1)
  const normalCells = layout.cells.filter(cell => !cell.rowSpan || cell.rowSpan === 1)
  
  // Handle rows
  for (let r = 0; r < layout.rows; r++) {
    // Find normal cells for this row
    const rowCells = normalCells.filter(cell => cell.row === r)
    
    // Find spanning cells that start at this row
    const spanningCellsForRow = spanningCells.filter(cell => cell.row === r)
    
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
        ...spanningCellsForRow.map(cell => ({
          id: cell.id,
          deviceType: 'any',
          name: cell.id,
          priority: 'primary' as 'primary' | 'secondary' | 'tertiary',
          width: cell.width || 50, // Use cell's width or default to 50%
          rowSpan: cell.rowSpan // Preserve rowSpan
        })),
        
        // Add normal cells
        ...rowCells.map(cell => ({
          id: cell.id,
          deviceType: 'any',
          name: cell.id,
          priority: 'primary' as 'primary' | 'secondary' | 'tertiary',
          width: cell.width || (normalCellsCount ? remainingWidth / normalCellsCount : 100)
        }))
      ],
      height: 100 / layout.rows
    })
  }
  
  return rows
}

const showLayoutModal = ref(false)

function openLayoutModal() {
  showLayoutModal.value = true
}
function closeLayoutModal() {
  showLayoutModal.value = false
}

function handleStaticLayoutClick(layoutId: string) {
  selectStaticLayout(layoutId)
  closeLayoutModal()
}
</script>

<template>
  <nav class="aw-navigation-bar">
    <div class="aw-navigation-bar__left">
      <div class="aw-navigation-bar__app-logo">
        <Icon type="home" />
      </div>
      <h1 v-if="!isSmallScreen" class="aw-navigation-bar__app-title">Alpaca Web</h1>

      <!-- Navigation links -->
      <div class="aw-navigation-bar__links">
        <RouterLink
          v-for="link in navLinks"
          :key="link.path"
          :to="link.path"
          class="aw-navigation-bar__link"
          :class="{ 'aw-navigation-bar__link--active': isActiveLink(link.path) }"
          :title="link.description"
        >
          <Icon :type="link.icon" class="aw-navigation-bar__link-icon" />
          <span v-if="!isMobileDevice" class="aw-navigation-bar__link-text">{{ link.name }}</span>
        </RouterLink>
        <!-- Layout Controls (between Home and Settings) -->
        <div class="aw-navigation-bar__layout-controls">
            <button class="aw-button aw-button--primary" @click="openLayoutModal">Choose Layout</button>
            <div v-if="showLayoutModal" class="layout-modal-overlay">
              <div class="layout-modal">
                <button class="layout-modal__close" title="Close" @click="closeLayoutModal">×</button>
                <h2 class="layout-modal__title">Choose a Layout</h2>
                <div class="layout-modal__grid">
                  <div v-for="layout in staticLayouts" :key="layout.id" class="layout-modal__card" @click="handleStaticLayoutClick(layout.id)">
                    <div class="layout-modal__card-title">{{ layout.name }}</div>
                    <div
                      class="layout-modal__preview"
                      :style="{
                        gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
                        gridTemplateColumns: layout.id === 'hybrid-60' ? '3fr 2fr' : '1fr 1fr',
                        width: '120px',
                        aspectRatio: '3 / 2'
                      }"
                    >
                      <div
                        v-for="cell in layout.cells"
                        :key="cell.id"
                        class="layout-modal__cell-preview"
                        :style="{
                          gridRow: `${cell.row + 1} / span ${cell.rowSpan || 1}`,
                          gridColumn: `${cell.col + 1} / span ${cell.colSpan || 1}`
                        }"
                      >
                        <span class="layout-modal__cell-id">{{ cell.id }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>

    <div class="aw-navigation-bar__right">
      <!-- Action slot for additional buttons/components -->
      <slot name="actions"></slot>

      <!-- Discovery indicator -->
      <DiscoveryIndicator :show-label="!isMobileDevice" />

      <!-- Device status indicator -->
      <div v-if="totalDeviceCount > 0" class="aw-navigation-bar__device-status">
        <span class="aw-navigation-bar__status-indicator">
          <span class="aw-navigation-bar__device-count">{{ connectedDeviceCount }}</span>
          <span v-if="!isMobileDevice">/ {{ totalDeviceCount }} devices</span>
        </span>
      </div>

      <!-- Theme toggle button -->
      <button
        class="aw-navigation-bar__theme-toggle"
        :title="uiStore.isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
        @click="toggleDarkMode"
      >
        <Icon :type="uiStore.isDarkMode ? 'sun' : 'moon'" />
      </button>
    </div>
  </nav>
</template>

<style scoped>
.aw-navigation-bar {
  height: var(--header-height, 60px);
  background-color: var(--aw-panel-menu-bar-bg-color);
  border-bottom: 1px solid var(--aw-panel-border-color);
  color: var(--aw-panel-menu-bar-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--aw-spacing-md);
  box-shadow: var(--aw-shadow-sm);
  z-index: 10;
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
}

.aw-navigation-bar__left {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-md);
}

.aw-navigation-bar__right {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-md);
}

.aw-navigation-bar__app-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--aw-panel-menu-bar-color);
}

.aw-navigation-bar__app-title {
  margin: 0;
  font-size: var(--aw-font-size-xl, 1.25rem);
  color: var(--aw-panel-menu-bar-color);
  font-weight: 700;
}

.aw-navigation-bar__links {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-sm);
}

.aw-navigation-bar__link {
  color: var(--aw-panel-menu-bar-color);
  text-decoration: none;
  padding: var(--aw-spacing-sm) var(--aw-spacing-md);
  border-radius: var(--aw-border-radius-md);
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-sm);
  font-size: var(--aw-font-size-sm, 0.875rem);
  font-weight: 500;
  transition: all 0.2s ease;
}

.aw-navigation-bar__link:hover {
  background-color: var(--aw-panel-hover-bg-color);
  transform: translateY(-1px);
}

.aw-navigation-bar__link--active {
  background-color: var(--aw-color-primary-700);
  color: var(--aw-panel-resize-color);
  box-shadow: var(--aw-shadow-sm);
}

.aw-navigation-bar__link-icon {
  width: 20px;
  height: 20px;
  opacity: 0.9;
}

/* Layout control styles */
.aw-navigation-bar__layout-controls {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-xs);
  margin-left: var(--aw-spacing-sm);
  padding: var(--aw-spacing-xs) var(--aw-spacing-sm);
  background-color: var(--aw-panel-hover-bg-color);
  border-radius: var(--aw-border-radius-md);
}

.aw-navigation-bar__layout-select {
  background-color: var(--aw-input-bg-color, #333333);
  color: var(--aw-text-color, #ffffff);
  border: 1px solid var(--aw-border-color, #444444);
  border-radius: var(--aw-border-radius-sm);
  padding: 2px 4px;
  font-size: var(--aw-font-size-sm, 0.875rem);
  max-width: 150px;
}

.aw-navigation-bar__layout-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.aw-navigation-bar__icon-button {
  background: none;
  border: none;
  color: var(--aw-panel-menu-bar-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--aw-border-radius-sm);
  transition: all 0.2s ease;
}

.aw-navigation-bar__icon-button:hover {
  background-color: var(--aw-panel-content-bg-color);
}

.aw-navigation-bar__icon {
  font-size: 14px;
}

.aw-navigation-bar__device-status {
  display: flex;
  align-items: center;
}

.aw-navigation-bar__status-indicator {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-xs);
  font-size: var(--aw-font-size-sm, 0.875rem);
  background-color: var(--aw-color-primary-700);
  padding: var(--aw-spacing-xs) var(--aw-spacing-sm);
  border-radius: var(--aw-border-radius-md);
}

.aw-navigation-bar__device-count {
  font-weight: 700;
  color: var(--aw-panel-menu-bar-color);
}

.aw-navigation-bar__theme-toggle {
  background: none;
  border: none;
  color: var(--aw-panel-menu-bar-color);
  padding: var(--aw-spacing-xs);
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.aw-navigation-bar__theme-toggle:hover {
  background-color: var(--aw-panel-hover-bg-color);
  transform: translateY(-1px);
}

.aw-navigation-bar__theme-toggle:focus {
  outline: 2px solid var(--aw-color-primary-300);
  outline-offset: 2px;
}

@media (max-width: 768px) {
  .aw-navigation-bar {
    padding: 0 var(--aw-spacing-sm);
  }

  .aw-navigation-bar__left,
  .aw-navigation-bar__right {
    gap: var(--aw-spacing-sm);
  }

  .aw-navigation-bar__link {
    padding: var(--aw-spacing-xs) var(--aw-spacing-sm);
  }
  
  .aw-navigation-bar__layout-controls {
    margin-left: 0;
    flex-direction: column;
    align-items: flex-start;
    padding: var(--aw-spacing-xs);
  }
  
  .aw-navigation-bar__layout-select {
    max-width: 100px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .aw-navigation-bar__layout-controls {
    display: none;
  }
}

.layout-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.45);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.layout-modal {
  background: var(--aw-panel-bg-color, #222);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.25);
  padding: 2rem 2.5rem 2rem 2.5rem;
  min-width: 350px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.layout-modal__close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 2rem;
  color: var(--aw-text-color, #fff);
  cursor: pointer;
  z-index: 1;
}
.layout-modal__title {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: var(--aw-color-primary-500, #4a7adc);
  font-size: 1.3rem;
  font-weight: 600;
  text-align: center;
}
.layout-modal__grid {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  justify-content: center;
}
.layout-modal__card {
  background: var(--aw-panel-content-bg-color, #333);
  border-radius: 8px;
  padding: 1rem;
  width: 180px;
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  border: 1.5px solid transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.layout-modal__card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.10);
  border-color: var(--aw-color-primary-500, #4a7adc);
}
.layout-modal__card-title {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--aw-text-color, #fff);
}
.layout-modal__preview {
  display: grid;
  gap: 0;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #eee;
  margin: 0 auto;
  width: 120px;
  aspect-ratio: 3 / 2;
}
.layout-modal__cell-preview {
  background: var(--aw-panel-content-bg-color, #e9e9e9);
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
.layout-modal__cell-preview:last-child,
.layout-modal__cell-preview[style*='grid-column: 2 / span 1'] {
  border-right: 1px solid #ddd;
}
.layout-modal__cell-preview[style*='grid-row: 2 / span 1'] {
  border-bottom: 1px solid #ddd;
}
.layout-modal__cell-id {
  color: #aaa;
  font-size: 0.8rem;
}
</style>
