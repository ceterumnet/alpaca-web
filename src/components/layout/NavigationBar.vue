// Status: Updated - Core Navigation Component // This is the main navigation bar that: // - Integrates with new navigation components // - Provides
primary navigation // - Shows device status // - Handles theme switching // - Supports responsive design

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useUIPreferencesStore } from '@/stores/useUIPreferencesStore'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { useLayoutStore } from '@/stores/useLayoutStore'
import Icon from '@/components/ui/Icon.vue'
import type { IconType } from '@/components/ui/Icon.vue'
import DiscoveryIndicator from '@/components/navigation/DiscoveryIndicator.vue'
import { staticLayouts } from '@/types/layouts/StaticLayoutTemplates'

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
    path: '/',
    icon: 'home',
    description: 'Customizable panel layout view'
  },
  {
    name: 'Settings',
    path: '/settings',
    icon: 'gear',
    description: 'Application settings'
  }
]

// Layout functionality
const currentLayoutId = ref(layoutStore.currentLayoutId || 'default')

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

// Define LayoutCell and LayoutTemplate interfaces
interface LayoutCell {
  id: string
  row: number
  col: number
  rowSpan?: number
  colSpan?: number
  width?: number
}

interface LayoutTemplate {
  id: string
  name: string
  rows: number
  cols: number
  cells: LayoutCell[]
}

// Layout modal control
const showLayoutModal = ref(false)

// For handling thumbnail labels
const activeLabelInfo = ref({ text: '', x: 0, y: 0, visible: false })

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

function showThumbnailLabel(event: MouseEvent, layout: LayoutTemplate) {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()

  // Calculate the position (center bottom of thumbnail)
  activeLabelInfo.value = {
    text: layout.name,
    x: rect.left + rect.width / 2,
    y: rect.bottom + 5,
    visible: true
  }
}

function hideThumbnailLabel() {
  activeLabelInfo.value.visible = false
}

// Function to select a static layout
function selectStaticLayout(layoutId: string) {
  const template = staticLayouts.find((l) => l.id === layoutId)
  if (!template) return

  // Get or create a layout based on this template using the store utility
  const gridLayout = layoutStore.getOrCreateTemplateLayout(layoutId)

  // Use setTimeout to ensure DOM updates between changes
  setTimeout(() => {
    // Then set the layout as current
    layoutStore.setCurrentLayout(gridLayout.id)
    currentLayoutId.value = gridLayout.id

    // Force a window resize event to ensure layout container updates
    window.dispatchEvent(new Event('resize'))
  }, 10)
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
</script>

<template>
  <nav class="aw-navigation-bar">
    <div class="aw-navigation-bar__left">
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
          <!-- Inline layout thumbnails for larger screens -->
          <div v-if="!isMobileDevice" class="aw-navigation-bar__inline-thumbnails">
            <div
              v-for="layout in staticLayouts"
              :key="layout.id"
              class="aw-navigation-bar__thumbnail"
              :title="layout.name"
              :data-active="currentLayoutId.includes(layout.id)"
              @click="handleStaticLayoutClick(layout.id)"
              @mouseenter="showThumbnailLabel($event, layout)"
              @mouseleave="hideThumbnailLabel"
            >
              <div
                class="aw-navigation-bar__thumbnail-preview"
                :style="{
                  gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
                  gridTemplateColumns: layout.id === 'hybrid-60' ? '3fr 2fr' : '1fr 1fr'
                }"
              >
                <div
                  v-for="cell in layout.cells"
                  :key="cell.id"
                  class="aw-navigation-bar__thumbnail-cell"
                  :style="{
                    gridRow: `${cell.row + 1} / span ${cell.rowSpan || 1}`,
                    gridColumn: `${cell.col + 1} / span ${cell.colSpan || 1}`
                  }"
                ></div>
              </div>
            </div>
            <div class="aw-navigation-bar__more-indicator" title="More layouts" @click="openLayoutModal">
              <Icon type="layout-grid" />
            </div>
          </div>

          <!-- Global thumbnail label -->
          <div
            v-if="activeLabelInfo.visible"
            class="thumbnail-global-label"
            :style="{
              left: `${activeLabelInfo.x}px`,
              top: `${activeLabelInfo.y}px`
            }"
          >
            {{ activeLabelInfo.text }}
          </div>

          <!-- Layout modal for smaller screens or when clicking "More" -->
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
  /* stylelint-disable-next-line */
  border-bottom: 1px solid var(--aw-panel-border-color);
  color: var(--aw-panel-menu-bar-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--aw-spacing-md);
  box-shadow: var(--aw-shadow-sm);
  z-index: 100;
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
  position: relative;
}

.aw-navigation-bar__left {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-md);
  overflow: visible !important;
  z-index: auto;
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
  overflow: visible !important;
  z-index: auto;
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
  gap: var(--aw-spacing-sm);
  margin-left: var(--aw-spacing-sm);
  border-radius: var(--aw-border-radius-md);
  position: relative;
  height: var(--header-height, 60px);
  z-index: 101;
}

.aw-navigation-bar__layout-select {
  background-color: var(--aw-input-bg-color);
  color: var(--aw-text-color);
  /* stylelint-disable-next-line */
  border: 1px solid var(--aw-border-color);
  border-radius: var(--aw-border-radius-sm);
  padding: calc(var(--aw-spacing-xs) / 2) var(--aw-spacing-xs);
  font-size: var(--aw-font-size-sm, 0.875rem);
  max-width: 150px;
}

.aw-navigation-bar__layout-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.aw-navigation-bar__icon-button {
  background-color: transparent;
  /* stylelint-disable-next-line */
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
  background-color: transparent;
  /* stylelint-disable-next-line */
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

@media (width >= 1200px) {
  .aw-navigation-bar__inline-thumbnails {
    max-width: 400px;
  }
}

@media (width >= 992px) and (width <= 1199px) {
  .aw-navigation-bar__inline-thumbnails {
    max-width: 300px;
  }
}

@media (width >= 769px) and (width <= 991px) {
  .aw-navigation-bar__inline-thumbnails {
    max-width: 200px;
  }
}

@media (width <= 768px) {
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

  .aw-navigation-bar__inline-thumbnails {
    display: none;
  }
}

@media (width <= 480px) {
  .aw-navigation-bar__layout-controls {
    display: none;
  }
}

/* Navbar inline thumbnails */
.aw-navigation-bar__inline-thumbnails {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  overflow-y: visible !important;
  max-width: 400px;
  scrollbar-width: thin;
  margin-left: 4px;
  padding: 4px;
  height: 36px;
  position: relative;
  z-index: 102;
}

.aw-navigation-bar__inline-thumbnails::-webkit-scrollbar {
  height: 4px;
}

.aw-navigation-bar__inline-thumbnails::-webkit-scrollbar-thumb {
  background-color: var(--aw-color-primary-500);
  border-radius: var(--aw-border-radius-sm);
}

.aw-navigation-bar__thumbnail {
  cursor: pointer;
  /* stylelint-disable-next-line */
  border: 1px solid transparent;
  border-radius: var(--aw-border-radius-sm);
  padding: 2px;
  background: var(--aw-panel-content-bg-color);
  transition:
    border-color 0.2s,
    transform 0.2s;
  position: relative;
  height: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 103;
}

.aw-navigation-bar__thumbnail:hover {
  border-color: var(--aw-color-primary-400);
  transform: translateY(-1px);
  /* stylelint-disable-next-line */
  box-shadow: 0 2px 6px rgb(0 0 0 / 15%);
}

.aw-navigation-bar__thumbnail[data-active='true'] {
  border-color: var(--aw-color-primary-500);
  background: var(--aw-color-primary-100);
}

.aw-navigation-bar__thumbnail-preview {
  display: grid;
  gap: 1px;
  background: var(--aw-panel-bg-color);
  /* stylelint-disable-next-line */
  border-radius: 2px;
  width: 32px;
  height: 22px;
  overflow: hidden;
}

.aw-navigation-bar__thumbnail-cell {
  background: var(--aw-color-primary-300);
  min-width: 0;
  min-height: 0;
}

.aw-navigation-bar__more-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  /* stylelint-disable-next-line */
  border-radius: 50%;
  background-color: var(--aw-navigation-icon-color-bg);
  cursor: pointer;
  color: var(--aw-navigation-icon-color);
  transition: background-color 0.2s;
}

.aw-navigation-bar__more-indicator:hover {
  background-color: var(--aw-navigation-icon-color-hover-bg);
  color: var(--aw-navigation-icon-color-hover);
}

.layout-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  /* stylelint-disable-next-line */
  background: rgb(0 0 0 / 45%);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.layout-modal {
  background: var(--aw-panel-bg-color);
  /* stylelint-disable-next-line */
  border-radius: 12px;
  box-shadow: var(--aw-shadow-lg);
  padding: 2rem 2.5rem;
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
  background-color: transparent;
  border: none;
  font-size: 2rem;
  color: var(--aw-text-color);
  cursor: pointer;
  z-index: 1;
}

.layout-modal__title {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: var(--aw-color-primary-500);
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
  background: var(--aw-panel-content-bg-color);
  /* stylelint-disable-next-line */
  border-radius: 8px;
  padding: 1rem;
  width: 180px;
  cursor: pointer;
  transition:
    box-shadow 0.2s,
    border-color 0.2s;
  box-shadow: var(--aw-shadow-sm);
  /* stylelint-disable-next-line */
  border: 1.5px solid transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.layout-modal__card:hover {
  box-shadow: var(--aw-shadow-md);
  border-color: var(--aw-color-primary-500);
}

.layout-modal__card-title {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--aw-text-color);
}

.layout-modal__preview {
  display: grid;
  gap: 0;
  background: var(--aw-color-neutral-50);
  /* stylelint-disable-next-line */
  border-radius: 4px;
  /* stylelint-disable-next-line */
  border: 1px solid var(--aw-color-neutral-300);
  margin: 0 auto;
  width: 120px;
  aspect-ratio: 3 / 2;
}

.layout-modal__cell-preview {
  background: var(--aw-panel-content-bg-color);
  /* stylelint-disable-next-line */
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  min-height: 0;
  min-width: 0;
  /* stylelint-disable-next-line */
  border: 1px solid var(--aw-color-neutral-300);
  border-right: none;
  border-bottom: none;
  flex-direction: column;
}

.layout-modal__cell-preview:last-child,
.layout-modal__cell-preview[style*='grid-column: 2 / span 1'] {
  /* stylelint-disable-next-line */
  border-right: 1px solid var(--aw-color-neutral-300);
}

.layout-modal__cell-preview[style*='grid-row: 2 / span 1'] {
  /* stylelint-disable-next-line */
  border-bottom: 1px solid var(--aw-color-neutral-300);
}

.layout-modal__cell-id {
  color: var(--aw-text-secondary-color);
  font-size: 0.8rem;
}

.aw-navigation-bar__thumbnail-label {
  display: none;
}

/* Add styles for the global thumbnail label */
.thumbnail-global-label {
  position: fixed;
  transform: translateX(-50%);
  background: var(--aw-color-primary-700);
  color: var(--aw-button-primary-text);
  padding: var(--aw-spacing-xs) var(--aw-spacing-sm);
  /* stylelint-disable-next-line */
  border-radius: 4px;
  font-size: 11px;
  white-space: nowrap;
  pointer-events: none;
  /* stylelint-disable-next-line */
  box-shadow: 0 3px 6px rgb(0 0 0 / 20%);
  z-index: 99999;
  text-align: center;
}
</style>
