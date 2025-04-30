<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, Lightning, Settings, Moon, Sun } from '@/components/icons'
import DeviceTypeIcon from '@/components/ui/Icon.vue'

// Types definition for devices
interface Device {
  id: string
  name: string
  type: string
  location: string
  server: string
  connected: boolean
  connecting: boolean
  hasError: boolean
  favorite: boolean
  lastConnected?: Date
}

// Props
const props = defineProps({
  devices: {
    type: Array as () => Device[],
    default: () => []
  },
  isDarkMode: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['toggleTheme', 'toggleDevice', 'deviceAction', 'toggleSidebar'])

// Local state
const isExpanded = ref(true)
const activeTab = ref('devices')
const searchQuery = ref('')
const activeFilters = ref({
  connected: false,
  disconnected: false,
  favorites: false,
  telescope: false,
  camera: false,
  focuser: false,
  filterwheel: false
})
const showFilterMenu = ref(false)
const viewMode = ref('list') // list or grid

// Function to map device type to IconType
const mapDeviceTypeToIcon = (deviceType: string) => {
  const type = deviceType.toLowerCase()
  if (type === 'camera') return 'camera'
  if (type === 'telescope') return 'focus'
  if (type === 'focuser') return 'focus'
  if (type === 'filterwheel') return 'filter'
  return 'device-unknown'
}

// Computed properties
const filteredDevices = computed(() => {
  let result = props.devices

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(
      (device) =>
        device.name.toLowerCase().includes(query) ||
        device.type.toLowerCase().includes(query) ||
        device.location.toLowerCase().includes(query) ||
        device.server.toLowerCase().includes(query)
    )
  }

  // Apply type filters
  const typeFilters = ['telescope', 'camera', 'focuser', 'filterwheel'].filter(
    (type) => activeFilters.value[type as keyof typeof activeFilters.value]
  )
  if (typeFilters.length > 0) {
    result = result.filter((device) => typeFilters.includes(device.type.toLowerCase()))
  }

  // Apply status filters
  if (activeFilters.value.connected && !activeFilters.value.disconnected) {
    result = result.filter((device) => device.connected)
  } else if (!activeFilters.value.connected && activeFilters.value.disconnected) {
    result = result.filter((device) => !device.connected)
  }

  // Apply favorites filter
  if (activeFilters.value.favorites) {
    result = result.filter((device) => device.favorite)
  }

  return result
})

// Group devices by location
const devicesByLocation = computed(() => {
  const groups: Record<string, Device[]> = {}

  filteredDevices.value.forEach((device) => {
    const location = device.location || 'Unknown Location'
    if (!groups[location]) {
      groups[location] = []
    }
    groups[location].push(device)
  })

  return groups
})

// Toggle a filter
const changeFilter = (filter: string) => {
  activeFilters.value[filter as keyof typeof activeFilters.value] =
    !activeFilters.value[filter as keyof typeof activeFilters.value]
}

// Toggle device connection
const toggleDevice = (device: Device) => {
  emit('toggleDevice', device)
}

// Toggle expanded/collapsed view
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
  emit('toggleSidebar', isExpanded.value)
}

// Clear all filters
const clearFilters = () => {
  Object.keys(activeFilters.value).forEach((key) => {
    activeFilters.value[key as keyof typeof activeFilters.value] = false
  })
  searchQuery.value = ''
}

// Handle context menu for a device
const handleDeviceAction = (device: Device, action: string) => {
  emit('deviceAction', { device, action })
}

// Toggle favorite status for device
const toggleFavorite = (device: Device) => {
  handleDeviceAction(device, 'toggleFavorite')
}
</script>

<template>
  <aside class="enhanced-sidebar" :class="{ 'sidebar-collapsed': !isExpanded }">
    <!-- Sidebar Header -->
    <div class="sidebar-header">
      <div v-if="isExpanded" class="sidebar-title">
        <h2>Example: AlpacaWeb</h2>
      </div>
      <button class="sidebar-toggle" @click="toggleExpanded">
        <span v-if="isExpanded" class="icon-chevron-left" aria-hidden="true"></span>
        <span v-else class="icon-chevron-right" aria-hidden="true"></span>
      </button>
    </div>

    <!-- Tabs -->
    <div v-if="isExpanded" class="sidebar-tabs">
      <button
        class="tab-button"
        :class="{ active: activeTab === 'devices' }"
        @click="activeTab = 'devices'"
      >
        Devices
      </button>
      <button
        class="tab-button"
        :class="{ active: activeTab === 'servers' }"
        @click="activeTab = 'servers'"
      >
        Servers
      </button>
    </div>

    <!-- Search and Filters -->
    <div v-if="isExpanded" class="sidebar-tools">
      <div class="search-container">
        <Search class="search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search devices..."
          class="search-input"
        />
        <button v-if="searchQuery" class="clear-search" @click="searchQuery = ''">×</button>
      </div>

      <div class="filter-section">
        <div class="filter-bar">
          <button
            class="view-toggle"
            :class="{ active: viewMode === 'list' }"
            title="List View"
            @click="viewMode = 'list'"
          >
            <span class="icon-list" aria-hidden="true"></span>
          </button>
          <button
            class="view-toggle"
            :class="{ active: viewMode === 'grid' }"
            title="Grid View"
            @click="viewMode = 'grid'"
          >
            <span class="icon-grid" aria-hidden="true"></span>
          </button>

          <button
            class="filter-toggle"
            :class="{ active: showFilterMenu }"
            title="Filter Options"
            @click="showFilterMenu = !showFilterMenu"
          >
            <span class="icon-filter" aria-hidden="true"></span>
            <span v-if="Object.values(activeFilters).some((v) => v)" class="filter-badge"></span>
          </button>
        </div>

        <!-- Filter Menu Dropdown -->
        <div v-if="showFilterMenu" class="filter-menu">
          <div class="filter-group">
            <h4>Status</h4>
            <label class="filter-option">
              <input
                v-model="activeFilters.connected"
                type="checkbox"
                @change="changeFilter('connected')"
              />
              <span>Connected</span>
            </label>
            <label class="filter-option">
              <input
                v-model="activeFilters.disconnected"
                type="checkbox"
                @change="changeFilter('disconnected')"
              />
              <span>Disconnected</span>
            </label>
            <label class="filter-option">
              <input
                v-model="activeFilters.favorites"
                type="checkbox"
                @change="changeFilter('favorites')"
              />
              <span>Favorites</span>
            </label>
          </div>

          <div class="filter-group">
            <h4>Device Type</h4>
            <label class="filter-option">
              <input v-model="activeFilters.telescope" type="checkbox" />
              <span>Telescope</span>
            </label>
            <label class="filter-option">
              <input v-model="activeFilters.camera" type="checkbox" />
              <span>Camera</span>
            </label>
            <label class="filter-option">
              <input v-model="activeFilters.focuser" type="checkbox" />
              <span>Focuser</span>
            </label>
            <label class="filter-option">
              <input v-model="activeFilters.filterwheel" type="checkbox" />
              <span>Filter Wheel</span>
            </label>
          </div>

          <div class="filter-actions">
            <button
              class="filter-clear"
              :disabled="!Object.values(activeFilters).some((v) => v) && !searchQuery"
              @click="clearFilters"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Devices List -->
    <div class="sidebar-content">
      <template v-if="isExpanded && filteredDevices.length > 0">
        <!-- List View -->
        <div v-if="viewMode === 'list'" class="device-list">
          <div
            v-for="(locationDevices, location) in devicesByLocation"
            :key="location"
            class="location-group"
          >
            <div class="location-header">
              <h3>{{ location }}</h3>
              <span class="device-count">{{ locationDevices.length }}</span>
            </div>

            <div
              v-for="device in locationDevices"
              :key="device.id"
              class="device-item"
              :class="{
                'device-connected': device.connected,
                'device-connecting': device.connecting,
                'device-error': device.hasError
              }"
            >
              <div class="device-icon">
                <DeviceTypeIcon :type="mapDeviceTypeToIcon(device.type)" />
              </div>

              <div class="device-info">
                <div class="device-name-row">
                  <span class="device-name">{{ device.name }}</span>
                  <button
                    class="favorite-toggle"
                    :class="{ 'is-favorite': device.favorite }"
                    @click="toggleFavorite(device)"
                  >
                    <span
                      :class="device.favorite ? 'icon-star-filled' : 'icon-star'"
                      aria-hidden="true"
                    ></span>
                  </button>
                </div>
                <span class="device-details">{{ device.server }}</span>
              </div>

              <div class="device-actions">
                <button
                  class="connect-toggle"
                  :class="{
                    'is-connected': device.connected,
                    'is-connecting': device.connecting,
                    'has-error': device.hasError
                  }"
                  :disabled="device.connecting"
                  @click="toggleDevice(device)"
                >
                  <span v-if="device.connected">Disconnect</span>
                  <span v-else-if="device.connecting">Connecting...</span>
                  <span v-else>Connect</span>
                </button>

                <button
                  class="device-menu"
                  @click="($event) => handleDeviceAction(device, 'openMenu')"
                >
                  <span class="icon-dots-vertical" aria-hidden="true"></span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Grid View -->
        <div v-else-if="viewMode === 'grid'" class="device-grid">
          <div
            v-for="(locationDevices, location) in devicesByLocation"
            :key="location"
            class="location-group"
          >
            <div class="location-header">
              <h3>{{ location }}</h3>
              <span class="device-count">{{ locationDevices.length }}</span>
            </div>

            <div class="grid-layout">
              <div
                v-for="device in locationDevices"
                :key="device.id"
                class="device-card"
                :class="{
                  'device-connected': device.connected,
                  'device-connecting': device.connecting,
                  'device-error': device.hasError
                }"
              >
                <div class="card-header">
                  <button
                    class="favorite-toggle"
                    :class="{ 'is-favorite': device.favorite }"
                    @click="toggleFavorite(device)"
                  >
                    <span
                      :class="device.favorite ? 'icon-star-filled' : 'icon-star'"
                      aria-hidden="true"
                    ></span>
                  </button>
                  <button
                    class="device-menu"
                    @click="($event) => handleDeviceAction(device, 'openMenu')"
                  >
                    <span class="icon-dots-vertical" aria-hidden="true"></span>
                  </button>
                </div>

                <div class="card-content">
                  <div class="device-icon-large">
                    <DeviceTypeIcon :type="mapDeviceTypeToIcon(device.type)" size="large" />
                  </div>
                  <div class="device-info">
                    <span class="device-name">{{ device.name }}</span>
                    <span class="device-details">{{ device.server }}</span>
                  </div>
                </div>

                <div class="card-footer">
                  <button
                    class="connect-toggle full-width"
                    :class="{
                      'is-connected': device.connected,
                      'is-connecting': device.connecting,
                      'has-error': device.hasError
                    }"
                    :disabled="device.connecting"
                    @click="toggleDevice(device)"
                  >
                    <span v-if="device.connected">Disconnect</span>
                    <span v-else-if="device.connecting">Connecting...</span>
                    <span v-else>Connect</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <span class="icon-info" aria-hidden="true"></span>
          <p>No devices match your filters</p>
          <button class="filter-clear" @click="clearFilters">Clear Filters</button>
        </div>
      </template>

      <!-- Collapsed View - Just Icons -->
      <div v-else-if="!isExpanded" class="collapsed-devices">
        <div
          v-for="device in filteredDevices"
          :key="device.id"
          class="collapsed-device-item"
          :class="{
            'device-connected': device.connected,
            'device-connecting': device.connecting,
            'device-error': device.hasError
          }"
          :title="device.name"
        >
          <DeviceTypeIcon :type="mapDeviceTypeToIcon(device.type)" size="small" />
          <span
            class="connection-indicator"
            :class="{
              connected: device.connected,
              connecting: device.connecting,
              error: device.hasError
            }"
          ></span>
        </div>
      </div>

      <!-- No Devices -->
      <div v-else-if="isExpanded && filteredDevices.length === 0" class="empty-state">
        <Lightning class="empty-icon" />
        <p>No devices found</p>
        <button class="primary-button" @click="$emit('deviceAction', { action: 'discover' })">
          Discover Devices
        </button>
      </div>
    </div>

    <!-- Sidebar Footer with settings -->
    <div class="sidebar-footer">
      <button
        v-if="isExpanded"
        class="footer-button"
        @click="$emit('deviceAction', { action: 'openSettings' })"
      >
        <Settings class="footer-icon" />
        <span>Settings</span>
      </button>

      <button class="footer-button theme-toggle" @click="$emit('toggleTheme')">
        <Moon v-if="isDarkMode" class="footer-icon" />
        <Sun v-else class="footer-icon" />
        <span v-if="isExpanded">{{ isDarkMode ? 'Light Mode' : 'Dark Mode' }}</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.enhanced-sidebar {
  display: flex;
  flex-direction: column;
  width: 280px;
  height: 100vh;
  background-color: var(--aw-panel-bg-color);
  border-right: 1px solid var(--aw-panel-border-color);
  color: var(--aw-panel-content-color);
  transition: width 0.3s ease;
  overflow: hidden;
  position: relative;
}

.sidebar-collapsed {
  width: 60px;
}

.sidebar-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid var(--aw-panel-border-color);
  background-color: var(--aw-panel-menu-bar-bg-color);
}

.sidebar-title h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--aw-panel-menu-bar-color);
}

.sidebar-toggle {
  background: transparent;
  border: none;
  color: var(--aw-panel-menu-bar-color);
  width: 28px;
  height: 28px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.sidebar-toggle:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.sidebar-tabs {
  display: flex;
  border-bottom: 1px solid var(--aw-panel-border-color);
}

.tab-button {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--aw-panel-content-color);
  padding: 12px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
  opacity: 0.7;
}

.tab-button.active {
  opacity: 1;
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: var(--aw-panel-resize-bg-color);
}

.sidebar-tools {
  padding: 12px;
  border-bottom: 1px solid var(--aw-panel-border-color);
}

.search-container {
  position: relative;
  margin-bottom: 12px;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--aw-panel-content-color);
  opacity: 0.6;
  width: 16px;
  height: 16px;
}

.search-input {
  width: 100%;
  padding: 8px 30px 8px 32px;
  border-radius: 6px;
  border: 1px solid var(--aw-panel-border-color);
  background-color: var(--aw-input-bg-color);
  color: var(--aw-panel-content-color);
  font-size: 0.9rem;
}

.clear-search {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--aw-panel-content-color);
  cursor: pointer;
  opacity: 0.6;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
}

.filter-section {
  position: relative;
}

.filter-bar {
  display: flex;
  justify-content: space-between;
}

.view-toggle,
.filter-toggle {
  background: transparent;
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 4px;
  color: var(--aw-panel-content-color);
  padding: 6px 8px;
  font-size: 0.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.view-toggle {
  flex: 1;
  margin-right: 6px;
}

.view-toggle.active,
.filter-toggle.active {
  background-color: var(--aw-panel-resize-bg-color);
  color: var(--aw-panel-resize-color);
}

.filter-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--aw-panel-resize-bg-color);
}

.filter-menu {
  position: absolute;
  top: 100%;
  right: 0;
  width: 220px;
  background-color: var(--aw-form-bg-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  margin-top: 8px;
  padding: 12px;
}

.filter-group {
  margin-bottom: 12px;
}

.filter-group h4 {
  margin: 0 0 8px 0;
  font-size: 0.9rem;
  color: var(--aw-panel-content-color);
  opacity: 0.7;
  font-weight: 500;
}

.filter-option {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}

.filter-option input {
  margin-right: 8px;
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
  border-top: 1px solid var(--aw-panel-border-color);
}

.filter-clear {
  background: transparent;
  border: none;
  color: var(--aw-panel-content-color);
  padding: 6px 10px;
  font-size: 0.85rem;
  cursor: pointer;
  border-radius: 4px;
}

.filter-clear:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.05);
}

.filter-clear:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.device-list {
  padding: 0;
}

.location-group {
  margin-bottom: 12px;
}

.location-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 8px;
}

.location-header h3 {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--aw-panel-content-color);
  opacity: 0.7;
}

.device-count {
  background-color: rgba(var(--aw-panel-content-color-rgb, 255, 255, 255), 0.1);
  color: var(--aw-panel-content-color);
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 10px;
}

.device-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-left: 3px solid transparent;
  transition: background-color 0.2s;
  cursor: pointer;
}

.device-item:hover {
  background-color: rgba(var(--aw-panel-content-color-rgb, 255, 255, 255), 0.05);
}

.device-item.device-connected {
  border-left-color: #4ade80;
}

.device-item.device-connecting {
  border-left-color: #f59e0b;
}

.device-item.device-error {
  border-left-color: #ef4444;
}

.device-icon {
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--aw-panel-content-color);
  opacity: 0.8;
}

.device-info {
  flex: 1;
  min-width: 0;
}

.device-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.device-name {
  font-weight: 500;
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.device-details {
  font-size: 0.8rem;
  opacity: 0.7;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.device-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.connect-toggle {
  font-size: 0.8rem;
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid var(--aw-panel-border-color);
  background-color: transparent;
  color: var(--aw-panel-content-color);
  cursor: pointer;
  transition: all 0.2s;
}

.connect-toggle.is-connected {
  background-color: rgba(74, 222, 128, 0.1);
  border-color: rgba(74, 222, 128, 0.5);
  color: #4ade80;
}

.connect-toggle.is-connecting {
  background-color: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.5);
  color: #f59e0b;
}

.connect-toggle.has-error {
  background-color: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.5);
  color: #ef4444;
}

.connect-toggle:hover:not(:disabled) {
  background-color: rgba(var(--aw-panel-content-color-rgb, 255, 255, 255), 0.1);
}

.connect-toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.device-menu,
.favorite-toggle {
  background: transparent;
  border: none;
  color: var(--aw-panel-content-color);
  width: 26px;
  height: 26px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.7;
  transition: all 0.2s;
}

.device-menu:hover,
.favorite-toggle:hover {
  background-color: rgba(var(--aw-panel-content-color-rgb, 255, 255, 255), 0.1);
  opacity: 1;
}

.favorite-toggle.is-favorite {
  color: #f59e0b;
  opacity: 1;
}

/* Grid view styling */
.device-grid {
  padding: 0;
}

.grid-layout {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 0 12px;
}

.device-card {
  background-color: rgba(var(--aw-panel-content-color-rgb, 255, 255, 255), 0.03);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--aw-panel-border-color);
  transition: all 0.2s;
}

.device-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.device-card.device-connected {
  border-color: rgba(74, 222, 128, 0.4);
}

.device-card.device-connecting {
  border-color: rgba(245, 158, 11, 0.4);
}

.device-card.device-error {
  border-color: rgba(239, 68, 68, 0.4);
}

.card-header {
  display: flex;
  justify-content: space-between;
  padding: 8px;
}

.card-content {
  padding: 4px 8px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.device-icon-large {
  margin-bottom: 8px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-footer {
  padding: 8px;
  border-top: 1px solid var(--aw-panel-border-color);
}

.full-width {
  width: 100%;
}

/* Collapsed view */
.collapsed-devices {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
}

.collapsed-device-item {
  position: relative;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  color: var(--aw-panel-content-color);
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.collapsed-device-item:hover {
  background-color: rgba(var(--aw-panel-content-color-rgb, 255, 255, 255), 0.05);
}

.connection-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #6b7280;
  transition: all 0.2s;
}

.connection-indicator.connected {
  background-color: #4ade80;
  box-shadow: 0 0 4px rgba(74, 222, 128, 0.6);
}

.connection-indicator.connecting {
  background-color: #f59e0b;
  animation: pulse 1.5s infinite;
}

.connection-indicator.error {
  background-color: #ef4444;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.6);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(245, 158, 11, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0);
  }
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: var(--aw-panel-content-color);
  opacity: 0.7;
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: 12px;
  opacity: 0.5;
  width: 40px;
  height: 40px;
}

.empty-state p {
  margin: 0 0 16px 0;
  font-size: 0.95rem;
}

.primary-button {
  background-color: var(--aw-panel-resize-bg-color);
  color: var(--aw-panel-resize-color);
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.primary-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

/* Footer */
.sidebar-footer {
  border-top: 1px solid var(--aw-panel-border-color);
  padding: 12px;
  display: flex;
  justify-content: space-between;
}

.footer-button {
  background: transparent;
  border: none;
  color: var(--aw-panel-content-color);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 0.9rem;
}

.footer-button:hover {
  background-color: rgba(var(--aw-panel-content-color-rgb, 255, 255, 255), 0.05);
}

.footer-icon {
  width: 18px;
  height: 18px;
  opacity: 0.8;
}

/* Icons for list and grid views */
.icon-list::before {
  content: '≡';
}

.icon-grid::before {
  content: '⊞';
}

.icon-filter::before {
  content: '⊲';
}

.icon-info::before {
  content: 'ℹ';
}

.icon-star::before {
  content: '☆';
}

.icon-star-filled::before {
  content: '★';
}

.icon-dots-vertical::before {
  content: '⋮';
}

.icon-chevron-left::before {
  content: '〈';
}

.icon-chevron-right::before {
  content: '〉';
}
</style>
