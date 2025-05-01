// Status: Updated - Core Navigation Component 
// This is the enhanced sidebar that: 
// - Integrates with new navigation system 
// - Provides device management 
// - Supports search and filtering 
// - Shows device status 
// - Handles responsive design

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import Icon from '@/components/ui/Icon.vue'
import type { IconType } from '@/components/ui/Icon.vue'

// Get router and store
const router = useRouter()
const unifiedStore = useUnifiedStore()

// State
const isExpanded = ref(true)
const searchQuery = ref('')
const viewMode = ref<'list' | 'grid'>('list')
const showFilterMenu = ref(false)
const activeFilters = ref({
  connected: false,
  disconnected: false,
  camera: false,
  telescope: false,
  dome: false,
  filterwheel: false,
  focuser: false,
  rotator: false,
  switch: false,
  safety: false
})

// Type for filter keys
type FilterKey = keyof typeof activeFilters.value

// Computed properties
const filteredDevices = computed(() => {
  let devices = unifiedStore.devicesList

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    devices = devices.filter(
      (device) =>
        device.name.toLowerCase().includes(query) || device.type.toLowerCase().includes(query)
    )
  }

  // Apply status filters
  if (activeFilters.value.connected) {
    devices = devices.filter((device) => device.isConnected)
  }
  if (activeFilters.value.disconnected) {
    devices = devices.filter((device) => !device.isConnected)
  }

  // Apply type filters
  const typeFilters = Object.entries(activeFilters.value)
    .filter(([key, value]) => value && key !== 'connected' && key !== 'disconnected')
    .map(([key]) => key as FilterKey)

  if (typeFilters.length > 0) {
    devices = devices.filter((device) =>
      typeFilters.includes(device.type.toLowerCase() as FilterKey)
    )
  }

  return devices
})

// Methods
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

const clearFilters = () => {
  Object.keys(activeFilters.value).forEach((key) => {
    activeFilters.value[key as FilterKey] = false
  })
}

const navigateToDevice = (deviceId: string) => {
  router.push(`/devices/${deviceId}`)
}

// Watch for route changes to update active state
watch(
  () => router.currentRoute.value.params.deviceId,
  () => {
    // Update active state if needed
  }
)
</script>

<template>
  <aside class="aw-sidebar" :class="{ 'aw-sidebar--expanded': isExpanded }">
    <!-- Sidebar header -->
    <div class="aw-sidebar__header">
      <button
        class="aw-sidebar__expand-button"
        :title="isExpanded ? 'Collapse' : 'Expand'"
        @click="toggleExpand"
      >
        <Icon v-if="isExpanded" type="chevron-left" />
        <Icon v-else type="chevron-right" />
      </button>
      <h2 v-if="isExpanded" class="aw-sidebar__title">Available Devices</h2>
    </div>

    <!-- Search and filters -->
    <div v-if="isExpanded" class="aw-sidebar__tools">
      <div class="aw-sidebar__search-container">
        <Icon type="search" class="aw-sidebar__search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search devices..."
          class="aw-sidebar__search-input"
        />
        <button v-if="searchQuery" class="aw-sidebar__clear-search" @click="searchQuery = ''">
          <Icon type="close" />
        </button>
      </div>

      <div class="aw-sidebar__filter-section">
        <div class="aw-sidebar__filter-bar">
          <button
            class="aw-sidebar__view-toggle"
            :class="{ 'aw-sidebar__view-toggle--active': viewMode === 'list' }"
            title="List View"
            @click="viewMode = 'list'"
          >
            <Icon type="detailed" />
          </button>
          <button
            class="aw-sidebar__view-toggle"
            :class="{ 'aw-sidebar__view-toggle--active': viewMode === 'grid' }"
            title="Grid View"
            @click="viewMode = 'grid'"
          >
            <Icon type="compact" />
          </button>

          <button
            class="aw-sidebar__filter-toggle"
            :class="{ 'aw-sidebar__filter-toggle--active': showFilterMenu }"
            title="Filter Options"
            @click="showFilterMenu = !showFilterMenu"
          >
            <Icon type="filter" />
            <span v-if="Object.values(activeFilters).some((v) => v)" class="aw-sidebar__filter-badge"></span>
          </button>
        </div>

        <!-- Filter Menu -->
        <div v-if="showFilterMenu" class="aw-sidebar__filter-menu">
          <div class="aw-sidebar__filter-group">
            <h3>Status</h3>
            <label class="aw-sidebar__filter-option">
              <input
                v-model="activeFilters.connected"
                type="checkbox"
                @change="showFilterMenu = false"
              />
              Connected
            </label>
            <label class="aw-sidebar__filter-option">
              <input
                v-model="activeFilters.disconnected"
                type="checkbox"
                @change="showFilterMenu = false"
              />
              Disconnected
            </label>
          </div>

          <div class="aw-sidebar__filter-group">
            <h3>Device Type</h3>
            <label
              v-for="(value, key) in activeFilters"
              v-show="!['connected', 'disconnected'].includes(key)"
              :key="key"
              class="aw-sidebar__filter-option"
            >
              <input
                v-model="activeFilters[key]"
                type="checkbox"
                @change="showFilterMenu = false"
              />
              {{ key.charAt(0).toUpperCase() + key.slice(1) }}
            </label>
          </div>

          <button class="aw-sidebar__clear-filters" @click="clearFilters">Clear Filters</button>
        </div>
      </div>
    </div>

    <!-- Device list -->
    <div class="aw-sidebar__device-list" :class="viewMode">
      <div
        v-for="device in filteredDevices"
        :key="device.id"
        class="aw-sidebar__device-item"
        :class="{ 'aw-sidebar__device-item--connected': device.isConnected }"
        @click="navigateToDevice(device.id)"
      >
        <Icon :type="device.type.toLowerCase() as IconType" class="aw-sidebar__device-icon" />
        <div v-if="isExpanded" class="aw-sidebar__device-info">
          <span class="aw-sidebar__device-name">{{ device.name }}</span>
          <span class="aw-sidebar__device-type">{{ device.type }}</span>
        </div>
        <div class="aw-sidebar__device-status">
          <Icon :type="device.isConnected ? 'connected' : 'disconnected'" />
        </div>
      </div>
    </div>

    <!-- Sidebar footer -->
    <div class="aw-sidebar__footer">
      <button class="aw-sidebar__footer-button" title="Add Device">
        <Icon type="expand" />
        <span v-if="isExpanded">Add Device</span>
      </button>
      <button class="aw-sidebar__footer-button" title="Settings">
        <Icon type="gear" />
        <span v-if="isExpanded">Settings</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.aw-sidebar {
  width: 280px;
  height: 100%;
  background-color: var(--aw-panel-bg-color);
  border-right: 1px solid var(--aw-panel-border-color);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
}

.aw-sidebar:not(.aw-sidebar--expanded) {
  width: 60px;
}

.aw-sidebar__header {
  height: var(--header-height, 60px);
  display: flex;
  align-items: center;
  padding: 0 var(--aw-spacing-md);
  border-bottom: 1px solid var(--aw-panel-border-color);
}

.aw-sidebar__expand-button {
  background: none;
  border: none;
  color: var(--aw-panel-content-color);
  cursor: pointer;
  padding: var(--aw-spacing-sm);
  border-radius: var(--aw-border-radius-sm);
  transition: background-color 0.2s;
}

.aw-sidebar__expand-button:hover {
  background-color: var(--aw-panel-hover-bg-color);
}

.aw-sidebar__expand-button:focus {
  outline: 2px solid var(--aw-color-primary-300);
  outline-offset: 2px;
}

.aw-sidebar__title {
  margin: 0;
  margin-left: var(--aw-spacing-md);
  font-size: var(--aw-font-size-lg, 1.125rem);
  font-weight: 700;
  color: var(--aw-panel-content-color);
}

.aw-sidebar__tools {
  padding: var(--aw-spacing-md);
  border-bottom: 1px solid var(--aw-panel-border-color);
}

.aw-sidebar__search-container {
  position: relative;
  margin-bottom: var(--aw-spacing-md);
}

.aw-sidebar__search-icon {
  position: absolute;
  left: var(--aw-spacing-sm);
  top: 50%;
  transform: translateY(-50%);
  color: var(--aw-panel-content-secondary-color);
}

.aw-sidebar__search-input {
  width: 100%;
  padding: var(--aw-spacing-sm) var(--aw-spacing-xl);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-sm);
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-panel-content-color);
}

.aw-sidebar__search-input:focus {
  outline: 2px solid var(--aw-color-primary-300);
  outline-offset: -1px;
  border-color: transparent;
}

.aw-sidebar__clear-search {
  position: absolute;
  right: var(--aw-spacing-sm);
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--aw-panel-content-secondary-color);
  cursor: pointer;
  padding: var(--aw-spacing-xs);
  border-radius: var(--aw-border-radius-sm);
}

.aw-sidebar__clear-search:hover {
  background-color: var(--aw-panel-hover-bg-color);
}

.aw-sidebar__filter-bar {
  display: flex;
  gap: var(--aw-spacing-sm);
}

.aw-sidebar__view-toggle,
.aw-sidebar__filter-toggle {
  background: none;
  border: 1px solid var(--aw-panel-border-color);
  color: var(--aw-panel-content-color);
  cursor: pointer;
  padding: 6px;
  border-radius: var(--aw-border-radius-sm);
  transition: all 0.2s;
}

.aw-sidebar__view-toggle:hover,
.aw-sidebar__filter-toggle:hover {
  background-color: var(--aw-panel-hover-bg-color);
}

.aw-sidebar__view-toggle:focus,
.aw-sidebar__filter-toggle:focus {
  outline: 2px solid var(--aw-color-primary-300);
  outline-offset: 2px;
}

.aw-sidebar__view-toggle--active,
.aw-sidebar__filter-toggle--active {
  background-color: var(--aw-color-primary-700);
  border-color: var(--aw-color-primary-700);
  color: var(--aw-panel-resize-color);
}

.aw-sidebar__filter-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  background-color: var(--aw-color-primary-500);
  border-radius: 50%;
}

.aw-sidebar__filter-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--aw-panel-bg-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-sm);
  padding: var(--aw-spacing-md);
  margin-top: var(--aw-spacing-xs);
  z-index: 100;
  box-shadow: var(--aw-shadow-md);
}

.aw-sidebar__filter-group {
  margin-bottom: var(--aw-spacing-md);
}

.aw-sidebar__filter-group h3 {
  margin: 0 0 var(--aw-spacing-sm);
  font-size: var(--aw-font-size-sm, 0.875rem);
  color: var(--aw-panel-content-secondary-color);
}

.aw-sidebar__filter-option {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-sm);
  padding: var(--aw-spacing-xs) 0;
  color: var(--aw-panel-content-color);
  cursor: pointer;
}

.aw-sidebar__clear-filters {
  width: 100%;
  padding: var(--aw-spacing-sm);
  background: none;
  border: 1px solid var(--aw-panel-border-color);
  color: var(--aw-panel-content-color);
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
  transition: all 0.2s;
}

.aw-sidebar__clear-filters:hover {
  background-color: var(--aw-panel-hover-bg-color);
}

.aw-sidebar__clear-filters:focus {
  outline: 2px solid var(--aw-color-primary-300);
  outline-offset: 2px;
}

.aw-sidebar__device-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--aw-spacing-md);
}

.aw-sidebar__device-list.list {
  display: flex;
  flex-direction: column;
  gap: var(--aw-spacing-sm);
}

.aw-sidebar__device-list.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: var(--aw-spacing-md);
}

.aw-sidebar__device-item {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-md);
  padding: var(--aw-spacing-sm);
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
  transition: all 0.2s;
}

.aw-sidebar__device-item:hover {
  background-color: var(--aw-panel-hover-bg-color);
}

.aw-sidebar__device-item--connected {
  background-color: var(--aw-panel-hover-bg-color);
}

.aw-sidebar__device-icon {
  width: 24px;
  height: 24px;
  opacity: 0.9;
}

.aw-sidebar__device-info {
  flex: 1;
  min-width: 0;
}

.aw-sidebar__device-name {
  display: block;
  font-weight: 500;
  color: var(--aw-panel-content-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.aw-sidebar__device-type {
  display: block;
  font-size: var(--aw-font-size-xs, 0.75rem);
  color: var(--aw-panel-content-secondary-color);
}

.aw-sidebar__device-status {
  display: flex;
  align-items: center;
}

.aw-sidebar__footer {
  padding: var(--aw-spacing-md);
  border-top: 1px solid var(--aw-panel-border-color);
  display: flex;
  justify-content: space-between;
}

.aw-sidebar__footer-button {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-sm);
  padding: var(--aw-spacing-sm);
  background: none;
  border: none;
  color: var(--aw-panel-content-color);
  cursor: pointer;
  border-radius: var(--aw-border-radius-sm);
  transition: background-color 0.2s;
}

.aw-sidebar__footer-button:hover {
  background-color: var(--aw-panel-hover-bg-color);
}

.aw-sidebar__footer-button:focus {
  outline: 2px solid var(--aw-color-primary-300);
  outline-offset: 2px;
}

/* Responsive styles */
@media (max-width: 768px) {
  .aw-sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 100;
    transform: translateX(-100%);
  }

  .aw-sidebar.aw-sidebar--expanded {
    transform: translateX(0);
  }
}

.aw-sidebar__filter-section {
  position: relative;
}
</style>
