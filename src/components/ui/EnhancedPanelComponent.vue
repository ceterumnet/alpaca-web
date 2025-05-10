// Status: Legacy - To Be Replaced 
// This component is an older version of the panel system and
// should be replaced with the new panel components. 
// The new system uses BasePanel.vue as the
// foundation and provides: 
// - Clear feature categorization (Primary, Secondary, Tertiary) 
// - Better responsive design and layout management 
// - Improved device integration and context awareness 
// - Enhanced state management and event handling 
// - Better support for device-specific features

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, useSlots } from 'vue'
import type { PropType } from 'vue'
import Icon from './Icon.vue'
import { useResizeObserver } from '@vueuse/core'
import { useUIPreferencesStore, UIMode } from '@/stores/useUIPreferencesStore'

type Device = { id: string; name: string }

const props = defineProps({
  panelName: { type: String, required: true },
  connected: { type: Boolean, required: false, default: false },
  deviceType: { type: String, required: true },
  deviceId: { type: String, required: true }, // Updated to String only since Device.id is string
  minContentWidth: { type: Number, default: 320 },
  maxContentWidth: { type: Number, default: 800 },
  // Device selector integration
  availableDevices: { type: Array as PropType<Device[]>, default: () => [] },
  selectedDeviceId: { type: String, default: '' },
  deviceName: { type: String, default: '' },
  showDeviceSelector: { type: Boolean, default: false },
  recentlyUsedDevices: { type: Array as PropType<string[]>, default: () => [] },
  // Handlers
  onToggleDeviceSelector: { type: Function as PropType<(e: MouseEvent) => void>, default: null },
  onDeviceChange: { type: Function as PropType<(id: string) => void>, default: null },
  onOpenDiscovery: { type: Function as PropType<() => void>, default: null }
})

const emit = defineEmits(['connect', 'sizeChange', 'modeChange'])

// Get UI preferences store
const uiStore = useUIPreferencesStore()

// Access slots
const slots = useSlots()

// Panel DOM element reference
const panelRef = ref<HTMLElement | null>(null)
const contentWidth = ref(0)

// Size mode for responsive design
const sizeMode = ref<'compact' | 'standard' | 'expanded'>('standard')

// Debug helpers
const logSlots = () => {
  console.log('EnhancedPanelComponent - available slots:', {
    default: !!slots.default,
    overviewContent: !!slots['overview-content'],
    detailedContent: !!slots['detailed-content'],
    fullscreenContent: !!slots['fullscreen-content'],
    currentMode: sizeMode.value
  })
}

// Computed thresholds for responsive design
const compactThreshold = computed(() => props.minContentWidth + 80)
const expandedThreshold = computed(() => props.maxContentWidth - 200)

// Calculate panel classes based on mode
const panelClasses = computed(() => {
  return {
    'aw-panel': true,
    'aw-panel--compact': sizeMode.value === 'compact',
    'aw-panel--standard': sizeMode.value === 'standard',
    'aw-panel--expanded': sizeMode.value === 'expanded',
    'aw-panel--sidebar-expanded': uiStore.isSidebarVisible
  }
})

// Update size mode based on container width
const updateSizeMode = () => {
  if (!panelRef.value) return

  // Get parent dimensions
  contentWidth.value = panelRef.value.clientWidth
  // console.log('Panel dimensions detected:', {
  //   width: contentWidth.value,
  //   compactThreshold: compactThreshold.value,
  //   expandedThreshold: expandedThreshold.value
  // })

  const oldMode = sizeMode.value
  
  if (contentWidth.value <= compactThreshold.value) {
    sizeMode.value = 'compact'
    // Update UIMode for backward compatibility with BasePanel
    uiStore.setDeviceUIMode(props.deviceType, props.deviceId, UIMode.OVERVIEW)
  } else if (contentWidth.value >= expandedThreshold.value) {
    sizeMode.value = 'expanded'
    // Update UIMode for backward compatibility with BasePanel
    uiStore.setDeviceUIMode(props.deviceType, props.deviceId, UIMode.FULLSCREEN)
  } else {
    sizeMode.value = 'standard'
    // Update UIMode for backward compatibility with BasePanel
    uiStore.setDeviceUIMode(props.deviceType, props.deviceId, UIMode.DETAILED)
  }
  
  if (oldMode !== sizeMode.value) {
    // console.log('EnhancedPanelComponent - size mode changed:', oldMode, '->', sizeMode.value, 'width:', contentWidth.value)
    // console.log('EnhancedPanelComponent - thresholds:', { compact: compactThreshold.value, expanded: expandedThreshold.value })
    // logSlots()
    
    // Force re-render by emitting an event that BasePanel is listening for
    emit('modeChange', uiStore.getDeviceUIMode(props.deviceType, props.deviceId))
  }
  
  emit('sizeChange', sizeMode.value)
}

// Handle connect button click
function onConnect() {
  emit('connect')
}

// Use resize observer to track panel size changes
useResizeObserver(panelRef, () => {
  updateSizeMode()
})

// Initial setup
onMounted(() => {
  updateSizeMode()
  window.addEventListener('resize', updateSizeMode)
  console.log('EnhancedPanelComponent - mounted, initial size mode:', sizeMode.value)
  logSlots()
})

onUnmounted(() => {
  window.removeEventListener('resize', updateSizeMode)
})

const availableDevicesTyped = computed<Device[]>(() => {
  return Array.isArray(props.availableDevices)
    ? (props.availableDevices as Device[]).filter(d => d && typeof d.id === 'string' && typeof d.name === 'string')
    : []
})
const getDeviceNameById = (id: unknown) => {
  const idStr = String(id)
  const found = availableDevicesTyped.value.find(d => d.id === idStr)
  return found ? found.name : idStr
}

</script>

<template>
  <div ref="panelRef" :class="panelClasses">
    <div class="aw-panel__header">
      <!-- <span class="aw-panel__title vue-draggable-handle">{{ panelName }}</span> -->

      <div class="aw-panel__header-left">
        <div
          v-if="props.availableDevices && props.onToggleDeviceSelector"
          class="aw-panel__device-selector"
          @click="(e: MouseEvent) => props.onToggleDeviceSelector && props.onToggleDeviceSelector(e)"
        >
          <span class="aw-panel__device-name">{{ props.deviceName || 'No device selected' }}</span>
          <span class="aw-panel__device-selector-toggle">▼</span>
          <div v-if="props.showDeviceSelector" class="aw-panel__device-selector-dropdown">
            <div v-if="availableDevicesTyped.length > 0" class="aw-panel__device-list">
              <div
                v-for="dev in availableDevicesTyped"
                :key="dev.id"
                class="aw-panel__device-item"
                :class="{ selected: dev.id === props.selectedDeviceId }"
                @click.stop="props.onDeviceChange && props.onDeviceChange(dev.id)"
              >
                {{ dev.name }}
              </div>
            </div>
            <div v-else class="aw-panel__empty-device-list">
              <p>No {{ props.deviceType }} devices available</p>
            </div>
            <div class="aw-panel__device-selector-actions">
              <button class="aw-panel__discover-button" @click.stop="props.onOpenDiscovery && props.onOpenDiscovery()">
                <span class="icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                </span>
                Discover Devices
              </button>
            </div>
            <div v-if="props.recentlyUsedDevices.length > 0" class="aw-panel__recently-used">
              <h4>Recently Used</h4>
              <div
                v-for="id in props.recentlyUsedDevices"
                :key="id"
                class="aw-panel__recent-device"
                @click.stop="props.onDeviceChange && props.onDeviceChange(String(id))"
              >
                {{ getDeviceNameById(id) }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="aw-panel__header-right">
        <span
          v-if="connected"
          class="aw-panel__status aw-panel__status--connected"
          title="Connected"
          @click="onConnect"
        >
          <Icon type="connected" size="16" /> Connected
        </span>
        <span
          v-else
          class="aw-panel__status aw-panel__status--disconnected"
          title="Click to connect"
          @click="onConnect"
        >
          <Icon type="disconnected" size="16" /> Disconnected
        </span>
      </div>
    </div>

    <!-- Panel content area - no longer collapsible -->
    <div
      class="aw-panel__content no-drag"
      :class="{
        'aw-panel__content--compact': sizeMode === 'compact',
        'aw-panel__content--standard': sizeMode === 'standard',
        'aw-panel__content--expanded': sizeMode === 'expanded'
      }"
    >
      
      <!-- PRACTICAL SOLUTION: Always show content based on the best available slot -->
      <!-- For compact mode -->
      <template v-if="sizeMode === 'compact' && slots['overview-content']">
        <slot name="overview-content"></slot>
      </template>
      
      <!-- For standard mode -->
      <template v-else-if="sizeMode === 'standard' && slots['detailed-content']">
        <slot name="detailed-content"></slot>
      </template>
      
      <!-- For expanded mode - first try fullscreen, fallback to detailed content -->
      <template v-else-if="sizeMode === 'expanded'">
        <!-- Prefer detailed-content for expanded mode since fullscreen is empty -->
        <slot v-if="slots['detailed-content']" name="detailed-content"></slot>
        <slot v-else-if="slots['overview-content']" name="overview-content"></slot>
        <slot v-else name="fullscreen-content"></slot>
      </template>
      
      <!-- Fallbacks for any other case -->
      <template v-else>
        <slot v-if="slots['detailed-content']" name="detailed-content"></slot>
        <slot v-else-if="slots['overview-content']" name="overview-content"></slot>
        <slot v-else></slot>
      </template>
    </div>

    <!-- Status bar for additional information (only shown in standard mode when additional status info is provided) -->
    <div
      v-if="sizeMode === 'standard' && slots['status-bar']"
      class="aw-panel__statusbar"
    >
      <slot name="status-bar">
        <!-- This will only be shown if the slot is provided and contains content beyond the default connected/disconnected state already shown in header -->
      </slot>
    </div>
  </div>
</template>

<style scoped>
.aw-panel {
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

/* Panel modes - COMPACT: minimal, compact view */
.aw-panel--compact {
  font-size: 0.9em;
}

.aw-panel--compact .aw-panel__header {
  height: 30px;
}

.aw-panel--compact .aw-panel__content {
  padding: var(--aw-spacing-sm);
}

/* Panel modes - STANDARD: standard view with all controls */
.aw-panel--standard .aw-panel__content {
  padding: var(--aw-spacing-sm);
}

/* Panel modes - EXPANDED: expanded view with maximum content area */
.aw-panel--expanded {
  display: flex;
  flex-direction: column;
}

.aw-panel--expanded .aw-panel__content {
  padding: var(--aw-spacing-sm);
}

/* Panel header common styling */
.aw-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 30px;
  padding: 0 var(--aw-spacing-sm) 0 0;
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
  cursor: move;
  user-select: none;
}

.aw-panel__header-left,
.aw-panel__header-right {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-sm);
}

.aw-panel__header-left {
  flex: 1;
  justify-content: flex-start;
}

.aw-panel__header-right {
  justify-content: flex-end;
}

.aw-panel__title {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

/* Status indicator styling */
.aw-panel__status {
  display: flex;
  align-items: center;
  font-size: 0.75em;
  gap: 4px;
  padding: 3px 6px;
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
}

.aw-panel__status--connected {
  background-color: rgba(0, 128, 0, 0.3);
}

.aw-panel__status--disconnected {
  background-color: rgba(128, 0, 0, 0.3);
}

/* Panel content styling */
.aw-panel__content {
  flex: 1;
  overflow: auto;
  transition: all 0.3s ease;
}

/* Statusbar styling */
.aw-panel__statusbar {
  height: 28px;
  background-color: var(--aw-panel-content-bg-color);
  border-top: 1px solid var(--aw-panel-border-color);
  padding: 0 var(--aw-spacing-sm);
  display: flex;
  align-items: center;
  font-size: 0.8em;
  color: var(--aw-text-secondary-color);
}

/* Make sure drag operations don't interfere with interactive elements */
.no-drag {
  cursor: default;
}

/* Responsive styles */
@media (max-width: 768px) {
  .aw-panel__header {
    height: 40px;
  }

  .aw-panel__title {
    max-width: 100px;
  }

  .aw-panel__header-center {
    display: none;
  }

  .aw-panel__content {
    padding: var(--aw-spacing-sm);
  }
}

.aw-panel__device-selector {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border: 1px solid var(--aw-panel-border-color, #ccc);
  border-radius: 4px;
  cursor: pointer;
  background-color: var(--aw-panel-bg-color, #fff);
  font-size: 0.85em;
  margin-right: var(--aw-spacing-md);
  position: relative;
}
.aw-panel__device-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.aw-panel__device-selector-toggle {
  margin-left: 6px;
  font-size: 10px;
}
.aw-panel__device-selector-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 180px;
  z-index: 100;
  background-color: var(--aw-panel-bg-color, #fff);
  border: 1px solid var(--aw-panel-border-color, #ccc);
  border-radius: 4px;
  margin-top: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-height: 300px;
  overflow-y: auto;
}
.aw-panel__device-list {
  padding: 4px 0;
}
.aw-panel__device-item {
  padding: 8px 12px;
  cursor: pointer;
}
.aw-panel__device-item.selected {
  background-color: var(--aw-panel-content-bg-color, #e0e0e0);
}
.aw-panel__empty-device-list {
  padding: 12px;
  text-align: center;
  color: var(--aw-text-secondary-color, #666);
}
.aw-panel__device-selector-actions {
  padding: 8px 12px;
  border-top: 1px solid var(--aw-panel-border-color, #eee);
  display: flex;
  justify-content: center;
}
.aw-panel__discover-button {
  background-color: var(--aw-primary-color, #2196f3);
  color: var(--aw-primary-color);
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.aw-panel__discover-button:hover {
  background-color: var(--aw-primary-dark, #1976d2);
}
.aw-panel__recently-used {
  padding: 8px 12px;
  border-top: 1px solid var(--aw-panel-border-color, #eee);
}
.aw-panel__recently-used h4 {
  font-size: 13px;
  margin: 0 0 8px;
  color: var(--aw-text-secondary-color, #666);
}
.aw-panel__recent-device {
  padding: 6px 8px;
  cursor: pointer;
  font-size: 13px;
  border-radius: 4px;
}
.aw-panel__recent-device:hover {
  background-color: var(--aw-panels-bg-color, #f5f5f5);
}
</style>
