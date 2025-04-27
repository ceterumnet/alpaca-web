<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Icon from './Icon.vue'
import { useUIPreferencesStore, UIMode } from '@/stores/useUIPreferencesStore'

const props = defineProps({
  panelName: { type: String, required: true },
  connected: { type: Boolean, required: false, default: false },
  deviceType: { type: String, required: true },
  deviceId: { type: String, required: true }, // Updated to String only since Device.id is string
  supportedModes: {
    type: Array as () => UIMode[],
    default: () => [UIMode.OVERVIEW, UIMode.DETAILED]
  }
})

const emit = defineEmits(['close', 'configure', 'connect', 'modeChange'])

// Get UI preferences store
const uiStore = useUIPreferencesStore()

// Determine which mode to use for this panel
const currentMode = computed(() => {
  return uiStore.getDeviceUIMode(props.deviceType, props.deviceId)
})

// Check if mode is supported by this panel
const isCurrentModeSupported = computed(() => {
  return props.supportedModes.includes(currentMode.value)
})

// Set the effective mode (fallback to OVERVIEW if current is unsupported)
const effectiveMode = computed(() => {
  return isCurrentModeSupported.value ? currentMode.value : UIMode.OVERVIEW
})

// Calculate panel classes based on mode
const panelClasses = computed(() => {
  return {
    'panel-container': true,
    'panel-overview': effectiveMode.value === UIMode.OVERVIEW,
    'panel-detailed': effectiveMode.value === UIMode.DETAILED,
    'panel-fullscreen': effectiveMode.value === UIMode.FULLSCREEN,
    'sidebar-expanded': uiStore.isSidebarVisible
  }
})

// Determine if the panel content area should be collapsed
const isContentCollapsed = ref(false)

// Toggle content collapse state
function toggleCollapse() {
  isContentCollapsed.value = !isContentCollapsed.value
}

// Change the panel's UI mode
function changeMode(mode: UIMode) {
  // Only apply supported modes
  if (props.supportedModes.includes(mode)) {
    uiStore.setDeviceUIMode(props.deviceType, props.deviceId, mode)
    emit('modeChange', mode)
  }
}

// Handle close button click
function onClose() {
  emit('close')
}

// Handle configure button click
function onConfigure() {
  emit('configure')
}

// Handle connect button click
function onConnect() {
  emit('connect')
}

// If panel switches to fullscreen, make sure content is not collapsed
watch(
  () => effectiveMode.value,
  (newMode) => {
    if (newMode === UIMode.FULLSCREEN) {
      isContentCollapsed.value = false
    }
  }
)
</script>

<template>
  <div :class="panelClasses">
    <div class="panel-header">
      <!-- Left header section - panel title and collapse button -->
      <div class="header-left">
        <span class="panel-title vue-draggable-handle">{{ panelName }}</span>
        <button
          v-if="effectiveMode !== UIMode.FULLSCREEN"
          class="collapse-button"
          :title="isContentCollapsed ? 'Expand' : 'Collapse'"
          @click="toggleCollapse"
        >
          <Icon :type="isContentCollapsed ? 'expand' : 'collapse'" />
        </button>
      </div>

      <!-- Center section - mode selector -->
      <div class="header-center">
        <div class="mode-selector">
          <button
            v-if="supportedModes.includes(UIMode.OVERVIEW)"
            :class="{ active: effectiveMode === UIMode.OVERVIEW }"
            title="Overview Mode"
            @click="changeMode(UIMode.OVERVIEW)"
          >
            <Icon type="compact" />
          </button>
          <button
            v-if="supportedModes.includes(UIMode.DETAILED)"
            :class="{ active: effectiveMode === UIMode.DETAILED }"
            title="Detailed Mode"
            @click="changeMode(UIMode.DETAILED)"
          >
            <Icon type="detailed" />
          </button>
          <button
            v-if="supportedModes.includes(UIMode.FULLSCREEN)"
            :class="{ active: effectiveMode === UIMode.FULLSCREEN }"
            title="Fullscreen Mode"
            @click="changeMode(UIMode.FULLSCREEN)"
          >
            <Icon type="fullscreen" />
          </button>
        </div>
      </div>

      <!-- Right header section - action buttons with status indicator -->
      <div class="header-right">
        <span
          v-if="connected"
          class="status-indicator connected header-status"
          title="Connected"
          @click="onConnect"
        >
          <Icon type="connected" /> Connected
        </span>
        <span
          v-else
          class="status-indicator disconnected header-status"
          title="Click to connect"
          @click="onConnect"
        >
          <Icon type="disconnected" /> Disconnected
        </span>
        <Icon class="configure-handle" type="gear" title="Configure" @click="onConfigure" />
        <Icon class="close-handle" type="close" title="Close" @click="onClose" />
      </div>
    </div>

    <!-- Panel content area - collapses as needed -->
    <div
      class="panel-content no-drag"
      :class="{
        'content-collapsed': isContentCollapsed,
        'content-overview': effectiveMode === UIMode.OVERVIEW,
        'content-detailed': effectiveMode === UIMode.DETAILED,
        'content-fullscreen': effectiveMode === UIMode.FULLSCREEN
      }"
    >
      <!-- Overview mode content -->
      <div v-if="effectiveMode === UIMode.OVERVIEW" class="overview-content">
        <slot name="overview-content">
          <!-- Default overview content if no slot provided -->
          <slot></slot>
        </slot>
      </div>

      <!-- Detailed mode content -->
      <div v-else-if="effectiveMode === UIMode.DETAILED" class="detailed-content">
        <slot name="detailed-content">
          <!-- Default to regular slot if detailed not provided -->
          <slot></slot>
        </slot>
      </div>

      <!-- Fullscreen mode content -->
      <div v-else-if="effectiveMode === UIMode.FULLSCREEN" class="fullscreen-content">
        <slot name="fullscreen-content">
          <!-- Default to detailed content if fullscreen not provided -->
          <slot name="detailed-content">
            <slot></slot>
          </slot>
        </slot>
      </div>
    </div>

    <!-- Status bar for additional information (only shown in detailed mode when additional status info is provided) -->
    <div
      v-if="!isContentCollapsed && effectiveMode === UIMode.DETAILED && $slots['status-bar']"
      class="panel-statusbar"
    >
      <slot name="status-bar">
        <!-- This will only be shown if the slot is provided and contains content beyond the default connected/disconnected state already shown in header -->
      </slot>
    </div>
  </div>
</template>

<style scoped>
.panel-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  color: var(--aw-panel-content-color);
  transition: all 0.3s ease;
  overflow: hidden;
  /* Remove border-radius from the container - let GridLayout handle the outer border */
  border: none;
  background-color: var(--aw-panel-content-bg-color);
}

/* Panel modes - OVERVIEW: minimal, compact view */
.panel-overview {
  font-size: 0.9em;
}

.panel-overview .panel-header {
  height: 36px;
}

.panel-overview .panel-content {
  padding: 8px;
}

/* Panel modes - DETAILED: standard view with all controls */
.panel-detailed .panel-content {
  padding: 12px;
}

/* Panel modes - FULLSCREEN: maximal view */
.panel-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100vh;
  margin: 0;
  z-index: 1000;
  background-color: var(--aw-panel-content-bg-color);
  border-radius: 0;
  border: none;
  overflow: auto;
  /* Adjust position to account for app structure */
  padding: 0;
  box-sizing: border-box;
  /* This ensures the panel respects the main content area */
  max-width: calc(100vw - var(--sidebar-collapsed-width));
  /* left: var(--sidebar-collapsed-width); */
  transition:
    left 0.3s ease,
    max-width 0.3s ease;
}

/* Adjust fullscreen width when sidebar is expanded */
.panel-fullscreen.sidebar-expanded {
  max-width: calc(100vw - var(--sidebar-width));
  /* left: var(--sidebar-width); */
}

.panel-fullscreen .panel-content {
  padding: 16px;
  height: calc(100vh - 46px - 28px); /* Viewport height minus header and status bar */
  overflow-y: auto;
}

/* Header section */
.panel-header {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 40px;
  padding: 0 12px;
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
  cursor: move; /* Make the whole header draggable */
  border-bottom: 1px solid var(--aw-panel-border-color);
  user-select: none; /* Prevent text selection while dragging */
  /* Apply border radius only to the top of the header */
  border-top-left-radius: 5px;
  border-top-right-radius: 5px;
  transition: all 0.3s ease;
}

.panel-fullscreen .panel-header {
  cursor: default;
  border-radius: 0;
  height: 46px;
  background-color: var(--aw-panel-menu-bar-bg-color);
}

.header-left,
.header-center,
.header-right {
  display: flex;
  align-items: center;
}

.header-left {
  flex: 1;
}

.header-right {
  gap: 8px;
}

.panel-title {
  font-weight: 600;
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 8px;
}

.panel-fullscreen .panel-title {
  font-size: 1.1rem;
}

.collapse-button {
  background: none;
  border: none;
  color: var(--aw-panel-menu-bar-color);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.collapse-button:hover {
  opacity: 1;
}

/* Mode selector */
.mode-selector {
  display: flex;
  gap: 2px;
  background-color: rgba(0, 0, 0, 0.15);
  padding: 3px;
  border-radius: 4px;
}

.mode-selector button {
  background: none;
  border: none;
  color: var(--aw-panel-menu-bar-color);
  cursor: pointer;
  padding: 4px 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  opacity: 0.7;
  transition: all 0.2s ease;
}

.mode-selector button:hover {
  opacity: 1;
}

.mode-selector button.active {
  background-color: rgba(255, 255, 255, 0.15);
  opacity: 1;
}

/* Mode-specific tooltips */
.mode-selector button::after {
  position: absolute;
  content: attr(title);
  display: none;
  background: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  bottom: -30px;
  white-space: nowrap;
  z-index: 10;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.mode-selector button:hover::after {
  display: block;
}

/* Icon styling */
.connect-handle,
.configure-handle,
.close-handle {
  cursor: pointer;
  opacity: 0.8;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.connect-handle:hover,
.configure-handle:hover,
.close-handle:hover {
  opacity: 1;
  transform: scale(1.1);
}

/* Content area */
.panel-content {
  flex: 1;
  overflow: auto;
  padding: 12px;
  background-color: var(--aw-panel-content-bg-color);
  transition: all 0.3s ease;
}

.content-collapsed {
  max-height: 0;
  padding: 0 12px;
  overflow: hidden;
}

/* Specific styling for fullscreen content */
.panel-fullscreen .panel-content {
  padding: 16px;
  height: calc(100vh - 46px - 28px); /* Viewport height minus header and status bar */
  overflow-y: auto;
}

.fullscreen-content {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

/* Status bar */
.panel-statusbar {
  height: 24px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
  font-size: 0.8rem;
  opacity: 0.8;
  border-top: 1px solid var(--aw-panel-border-color);
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
}

.panel-fullscreen .panel-statusbar {
  border-radius: 0;
  height: 28px;
}

/* Status indicator for both header and status bar */
.status-indicator {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
}

.header-status {
  cursor: pointer;
  transition: all 0.2s ease;
}

.header-status:hover {
  filter: brightness(1.1);
}

.status-indicator.connected {
  background-color: rgba(53, 205, 68, 0.2);
  color: #35cd44;
}

.status-indicator.disconnected {
  background-color: rgba(245, 101, 101, 0.2);
  color: #f56565;
}

/* Mode-specific content containers */
.overview-content,
.detailed-content,
.fullscreen-content {
  height: 100%;
  transition: all 0.3s ease;
}

/* Night mode specific adjustments */
.dark-theme .panel-container {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.dark-theme .panel-content {
  filter: brightness(0.95);
}

/* Dim brightness slightly for overview mode to reduce brightness for night vision */
.dark-theme .panel-overview .panel-content {
  filter: brightness(0.9);
}
</style>
