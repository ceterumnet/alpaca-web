// Status: Good - Core Component // This is the base panel implementation that: // - Provides core
panel functionality and structure // - Handles device selection and connection // - Manages feature
visibility and priority // - Implements responsive layout behavior // - Supports component
resolution and rendering /** * Base Panel Component * * Core panel component that all device panels
extend */
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { useUIPreferencesStore, UIMode } from '@/stores/useUIPreferencesStore'
import { useEnhancedDiscoveryStore } from '@/stores/useEnhancedDiscoveryStore'
import EnhancedPanelComponent from '@/components/ui/EnhancedPanelComponent.vue'
import type { PanelFeatureDefinition } from '@/types/panels/FeatureTypes'
import { PriorityLevel } from '@/types/panels/FeatureTypes'
import { debugLog } from '@/utils/debugUtils'

const props = defineProps({
  panelId: {
    type: String,
    required: true
  },
  deviceType: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  deviceId: {
    type: String,
    default: ''
  },
  features: {
    type: Array as () => PanelFeatureDefinition[],
    default: () => []
  },
  supportedModes: {
    type: Array as () => UIMode[],
    default: () => [UIMode.OVERVIEW, UIMode.DETAILED, UIMode.FULLSCREEN]
  }
})

const emit = defineEmits([
  'close',
  'connect',
  'disconnect',
  'deviceChange',
  'modeChange',
  'openDiscovery'
])

// Stores
const unifiedStore = useUnifiedStore()
const uiStore = useUIPreferencesStore()
const discoveryStore = useEnhancedDiscoveryStore()

// Local state
const selectedDeviceId = ref(props.deviceId)
const showDeviceSelector = ref(false)
const showDiscoveryButton = ref(false)
const recentlyUsedDevices = ref<string[]>([])

// Computed properties
const device = computed(() =>
  selectedDeviceId.value ? unifiedStore.getDeviceById(selectedDeviceId.value) : null
)
const isConnected = computed(() => device.value?.isConnected || false)

// Get available devices based on device type
const availableDevices = computed(() => {
  const deviceTypeNormalized = props.deviceType.toLowerCase()
  console.log('BasePanel - Looking for devices of type:', deviceTypeNormalized)

  // Log each device's type comparison
  unifiedStore.devicesList.forEach((d) => {
    const deviceType = d.type || ''
    console.log('BasePanel - Checking device:', d.id, {
      deviceType: deviceType,
      deviceTypeLower: deviceType.toLowerCase(),
      matchesRequestedType: deviceType.toLowerCase() === deviceTypeNormalized,
      isConnected: d.isConnected
    })
  })

  const filteredDevices = unifiedStore.devicesList.filter(
    (d) => (d.type || '').toLowerCase() === deviceTypeNormalized
  )

  console.log('BasePanel - Available devices for type:', props.deviceType)
  console.log(
    'BasePanel - All devices in store:',
    unifiedStore.devicesList.map((d) => ({ id: d.id, type: d.type }))
  )
  console.log(
    'BasePanel - Filtered devices:',
    filteredDevices.map((d) => ({ id: d.id, type: d.type }))
  )

  return filteredDevices
})

// Feature visibility based on priority and mode
const visibleFeatures = computed(() => {
  const currentMode = uiStore.getDeviceUIMode(props.deviceType, selectedDeviceId.value)

  // Filter features based on current mode
  return props.features.filter((feature) => {
    // In Overview mode, only show primary features
    if (currentMode === UIMode.OVERVIEW) {
      return feature.priority === PriorityLevel.Primary
    }

    // In Detailed mode, show primary and secondary features
    if (currentMode === UIMode.DETAILED) {
      return (
        feature.priority === PriorityLevel.Primary || feature.priority === PriorityLevel.Secondary
      )
    }

    // In Fullscreen mode, show all features
    return true
  })
})

// Event handlers
const handleModeChange = (mode: UIMode) => {
  emit('modeChange', mode)
}

const handleConnect = () => {
  if (!selectedDeviceId.value) return

  if (device.value?.isConnected) {
    unifiedStore.disconnectDevice(selectedDeviceId.value)
    emit('disconnect')
  } else {
    unifiedStore
      .connectDevice(selectedDeviceId.value)
      .then((success) => {
        if (success) {
          emit('connect')
          // Add to recently used devices
          addToRecentlyUsed(selectedDeviceId.value)
        }
      })
      .catch((error) => {
        console.error('Connection error:', error)
      })
  }
}

const handleDeviceChange = (newDeviceId: string) => {
  console.log('BasePanel - handleDeviceChange called:', newDeviceId)
  console.log('BasePanel - Current selectedDeviceId:', selectedDeviceId.value)

  if (newDeviceId !== selectedDeviceId.value) {
    // Disconnect from current device if connected
    if (device.value?.isConnected) {
      console.log('BasePanel - Disconnecting from current device')
      unifiedStore.disconnectDevice(selectedDeviceId.value)
    }

    console.log('BasePanel - Updating selectedDeviceId to:', newDeviceId)
    selectedDeviceId.value = newDeviceId
    emit('deviceChange', newDeviceId)

    // Add to recently used devices
    addToRecentlyUsed(newDeviceId)
  }

  showDeviceSelector.value = false
}

const toggleDeviceSelector = () => {
  showDeviceSelector.value = !showDeviceSelector.value
  console.log('BasePanel - Toggled device selector:', showDeviceSelector.value)
  console.log('BasePanel - Available devices:', availableDevices.value)

  // If opening the selector and no devices available, show discovery button
  if (showDeviceSelector.value && availableDevices.value.length === 0) {
    console.log('BasePanel - No devices available, showing discovery button')
    showDiscoveryButton.value = true
  }
}

const handleClose = () => {
  emit('close')
}

// Discovery integration
const openDiscovery = async () => {
  // Check if we already have results, otherwise perform discovery
  if (discoveryStore.servers.length === 0) {
    await discoveryStore.discoverDevices()
  }

  // Go to the discovery view
  // Note: This would typically use a router or event system to navigate
  // For now, we'll just emit an event that can be handled by parent components
  emit('openDiscovery', props.deviceType)

  // Close the device selector
  showDeviceSelector.value = false
}

// Recently used devices management
const addToRecentlyUsed = (deviceId: string) => {
  // Remove if already exists (to move to front)
  const index = recentlyUsedDevices.value.indexOf(deviceId)
  if (index > -1) {
    recentlyUsedDevices.value.splice(index, 1)
  }

  // Add to front of list
  recentlyUsedDevices.value.unshift(deviceId)

  // Keep only most recent 5
  if (recentlyUsedDevices.value.length > 5) {
    recentlyUsedDevices.value = recentlyUsedDevices.value.slice(0, 5)
  }

  // Save to localStorage for persistence
  localStorage.setItem(
    `recentlyUsed:${props.deviceType}`,
    JSON.stringify(recentlyUsedDevices.value)
  )
}

const loadRecentlyUsed = () => {
  const stored = localStorage.getItem(`recentlyUsed:${props.deviceType}`)
  if (stored) {
    try {
      recentlyUsedDevices.value = JSON.parse(stored)
    } catch (e) {
      console.error('Error loading recently used devices:', e)
    }
  }
}

// Watch for deviceId prop changes from parent
watch(
  () => props.deviceId,
  (newId) => {
    if (newId && newId !== selectedDeviceId.value) {
      selectedDeviceId.value = newId
    }
  }
)

onMounted(() => {
  debugLog('BasePanel mounted', {
    panelId: props.panelId,
    deviceType: props.deviceType,
    deviceId: selectedDeviceId.value
  })

  console.log('BasePanel - Mounted with deviceId:', props.deviceId)
  console.log('BasePanel - deviceType:', props.deviceType)
  console.log('BasePanel - Available devices:', availableDevices.value)

  // Load recently used devices
  loadRecentlyUsed()

  // Auto-select first available device if none selected
  if (!selectedDeviceId.value && availableDevices.value.length > 0) {
    console.log('BasePanel - Auto-selecting first available device:', availableDevices.value[0].id)
    selectedDeviceId.value = availableDevices.value[0].id
    emit('deviceChange', selectedDeviceId.value)
  }
})
</script>

<template>
  <EnhancedPanelComponent
    :panel-name="title"
    :connected="isConnected"
    :device-type="deviceType"
    :device-id="selectedDeviceId"
    :supported-modes="supportedModes"
    @close="handleClose"
    @connect="handleConnect"
    @mode-change="handleModeChange"
  >
    <template #overview-content>
      <div class="panel-device-selector">
        <div class="selected-device" @click="toggleDeviceSelector">
          <span>{{ device?.name || 'No device selected' }}</span>
          <span class="device-selector-toggle">▼</span>
        </div>

        <div v-if="showDeviceSelector" class="device-selector-dropdown">
          <div v-if="availableDevices.length > 0" class="device-list">
            <div
              v-for="dev in availableDevices"
              :key="dev.id"
              class="device-item"
              :class="{ selected: dev.id === selectedDeviceId }"
              @click="handleDeviceChange(dev.id)"
            >
              {{ dev.name }}
            </div>
          </div>

          <div v-else class="empty-device-list">
            <p>No {{ deviceType }} devices available</p>
          </div>

          <div class="device-selector-actions">
            <button class="discover-button" @click="openDiscovery">
              <span class="icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              </span>
              Discover Devices
            </button>
          </div>

          <div v-if="recentlyUsedDevices.length > 0" class="recently-used">
            <h4>Recently Used</h4>
            <div
              v-for="id in recentlyUsedDevices"
              :key="id"
              class="recent-device"
              @click="handleDeviceChange(id)"
            >
              {{ unifiedStore.getDeviceById(id)?.name || id }}
            </div>
          </div>
        </div>
      </div>

      <div class="panel-feature-container">
        <slot name="features" :features="visibleFeatures">
          <!-- Default implementation renders feature components -->
          <div
            v-for="feature in visibleFeatures"
            :key="feature.id"
            class="panel-feature"
            :class="`feature-${feature.priority}`"
          >
            <!-- Add debug info -->
            <div v-if="!feature.component" class="error-message">
              No component defined for feature {{ feature.id }}
            </div>
            <div v-else-if="typeof feature.component !== 'string'" class="error-message">
              Component must be a string: {{ feature.id }} ({{ typeof feature.component }})
            </div>
            <div
              v-else
              class="component-info"
              style="font-size: 10px; color: #999; margin-bottom: 4px"
            >
              Component: {{ feature.component }}
            </div>

            <component
              :is="feature.component"
              v-bind="feature.props || {}"
              :device-id="selectedDeviceId"
            />
          </div>
        </slot>
      </div>
    </template>

    <template #detailed-content>
      <slot name="detailed" :features="visibleFeatures">
        <!-- Use the same content as overview by default -->
        <div class="panel-device-selector">
          <div class="selected-device" @click="toggleDeviceSelector">
            <span>{{ device?.name || 'No device selected' }}</span>
            <span class="device-selector-toggle">▼</span>
          </div>

          <div v-if="showDeviceSelector" class="device-selector-dropdown">
            <div v-if="availableDevices.length > 0" class="device-list">
              <div
                v-for="dev in availableDevices"
                :key="dev.id"
                class="device-item"
                :class="{ selected: dev.id === selectedDeviceId }"
                @click="handleDeviceChange(dev.id)"
              >
                {{ dev.name }}
              </div>
            </div>

            <div v-else class="empty-device-list">
              <p>No {{ deviceType }} devices available</p>
            </div>

            <div class="device-selector-actions">
              <button class="discover-button" @click="openDiscovery">
                <span class="icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                </span>
                Discover Devices
              </button>
            </div>

            <div v-if="recentlyUsedDevices.length > 0" class="recently-used">
              <h4>Recently Used</h4>
              <div
                v-for="id in recentlyUsedDevices"
                :key="id"
                class="recent-device"
                @click="handleDeviceChange(id)"
              >
                {{ unifiedStore.getDeviceById(id)?.name || id }}
              </div>
            </div>
          </div>
        </div>

        <div class="panel-feature-container">
          <slot name="features" :features="visibleFeatures">
            <!-- Detailed mode feature rendering -->
            <div
              v-for="feature in visibleFeatures"
              :key="feature.id"
              class="panel-feature"
              :class="`feature-${feature.priority}`"
            >
              <component
                :is="feature.component"
                v-bind="feature.props || {}"
                :device-id="selectedDeviceId"
              />
            </div>
          </slot>
        </div>
      </slot>
    </template>

    <template #fullscreen-content>
      <slot name="features" :features="visibleFeatures">
        <!-- More comprehensive layout for fullscreen mode -->
        <div class="panel-fullscreen-container">
          <div class="fullscreen-header">
            <div class="panel-device-selector large">
              <div class="selected-device" @click="toggleDeviceSelector">
                <span>{{ device?.name || 'No device selected' }}</span>
                <span class="device-selector-toggle">▼</span>
              </div>

              <div v-if="showDeviceSelector" class="device-selector-dropdown">
                <div class="device-list">
                  <div
                    v-for="dev in availableDevices"
                    :key="dev.id"
                    class="device-item"
                    :class="{ selected: dev.id === selectedDeviceId }"
                    @click="handleDeviceChange(dev.id)"
                  >
                    {{ dev.name }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="fullscreen-content">
            <div class="panel-feature-container fullscreen">
              <div
                v-for="feature in visibleFeatures"
                :key="feature.id"
                class="panel-feature"
                :class="`feature-${feature.priority}`"
              >
                <component
                  :is="feature.component"
                  v-bind="feature.props || {}"
                  :device-id="selectedDeviceId"
                />
              </div>
            </div>
          </div>
        </div>
      </slot>
    </template>
  </EnhancedPanelComponent>
</template>

<style scoped>
.panel-device-selector {
  position: relative;
  margin-bottom: 12px;
}

.selected-device {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid var(--aw-panel-border-color, #ccc);
  border-radius: 4px;
  cursor: pointer;
  background-color: var(--aw-panel-bg-color, #fff);
}

.device-selector-toggle {
  margin-left: 8px;
  font-size: 10px;
}

.device-selector-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 100;
  background-color: var(--aw-panel-bg-color, #fff);
  border: 1px solid var(--aw-panel-border-color, #ccc);
  border-radius: 4px;
  margin-top: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-height: 300px;
  overflow-y: auto;
}

.device-list {
  padding: 4px 0;
}

.device-item {
  padding: 8px 12px;
  cursor: pointer;
}

.device-item:hover {
  background-color: var(--aw-panels-bg-color, #f5f5f5);
}

.device-item.selected {
  background-color: var(--aw-panel-content-bg-color, #e0e0e0);
}

.empty-device-list {
  padding: 12px;
  text-align: center;
  color: var(--aw-text-secondary-color, #666);
}

.panel-feature-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-feature {
  background-color: var(--aw-panels-bg-color, #f9f9f9);
  border-radius: 4px;
  padding: 12px;
}

.error-message {
  color: var(--aw-error-color, #e53935);
  font-size: 12px;
  margin-bottom: 8px;
}

.device-selector-actions {
  padding: 8px 12px;
  border-top: 1px solid var(--aw-panel-border-color, #eee);
  display: flex;
  justify-content: center;
}

.discover-button {
  background-color: var(--aw-primary-color, #2196f3);
  color: var(--aw-primary-color);
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.discover-button:hover {
  background-color: var(--aw-primary-dark, #1976d2);
}

.recently-used {
  padding: 8px 12px;
  border-top: 1px solid var(--aw-panel-border-color, #eee);
}

.recently-used h4 {
  font-size: 14px;
  margin: 0 0 8px;
  color: var(--aw-text-secondary-color, #666);
}

.recent-device {
  padding: 6px 8px;
  cursor: pointer;
  font-size: 14px;
  border-radius: 4px;
}

.recent-device:hover {
  background-color: var(--aw-panels-bg-color, #f5f5f5);
}

.panel-fullscreen-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.fullscreen-header {
  padding: 12px;
  border-bottom: 1px solid var(--aw-panel-border-color);
}

.fullscreen-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.panel-device-selector.large .selected-device {
  padding: 12px 16px;
  font-size: 1.2em;
}
</style>
