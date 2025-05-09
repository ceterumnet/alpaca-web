// Status: Good - Core Component // This is the base panel implementation that: // - Provides core
panel functionality and structure // - Handles device selection and connection // - Manages feature
visibility and priority // - Implements responsive layout behavior // - Supports component
resolution and rendering /** * Base Panel Component * * Core panel component that all device panels
extend */
<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { useUIPreferencesStore, UIMode } from '@/stores/useUIPreferencesStore'
import { useEnhancedDiscoveryStore } from '@/stores/useEnhancedDiscoveryStore'
import EnhancedPanelComponent from '@/components/ui/EnhancedPanelComponent.vue'
import DeviceConnectionDiagnostic from '@/components/ui/DeviceConnectionDiagnostic.vue'
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

// Add debug logging for reactivity
const deviceLoadingState = ref('idle')
const deviceLastUpdated = ref(Date.now())

// Computed properties
const device = computed(() =>
  selectedDeviceId.value ? unifiedStore.getDeviceById(selectedDeviceId.value) : null
)
const isConnected = computed(() => {
  const connected = device.value?.isConnected || false
  console.log(`[ReactivityDebug] isConnected computed:`, {
    deviceId: selectedDeviceId.value,
    connected,
    deviceLoadingState: deviceLoadingState.value,
    lastUpdate: deviceLastUpdated.value
  })
  return connected
})

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

// Add a computed property to check if a client exists for the device
const hasClient = computed(() => {
  if (!selectedDeviceId.value) return false;

  // Use getDeviceClient to check if a client exists
  try {
    // Check if the method exists first before calling it
    if (typeof unifiedStore.getDeviceClient === 'function') {
      const client = unifiedStore.getDeviceClient(selectedDeviceId.value);
      return !!client;
    } else {
      // Method not available, try alternative approaches
      console.warn('getDeviceClient method not available in unifiedStore');
      
      // Alternative check: see if the device has apiBaseUrl (which is required for clients)
      const device = unifiedStore.getDeviceById(selectedDeviceId.value);
      return !!(device && device.apiBaseUrl);
    }
  } catch (error) {
    console.warn(`Error checking for client: ${error}`);
    return false;
  }
});

// Event handlers
const handleModeChange = (mode: UIMode) => {
  emit('modeChange', mode)
}

// Add a method to force UI updates
const forceUIUpdate = () => {
  deviceLastUpdated.value = Date.now()
  deviceLoadingState.value = isConnected.value ? 'connected' : 'idle'
  console.log(`[ReactivityDebug] Forcing UI update at ${deviceLastUpdated.value}`)
  
  // Force components to update their values
  if (selectedDeviceId.value) {
    // Broadcast a custom event that components can listen for
    const event = new CustomEvent('alpaca-force-update', { 
      detail: { deviceId: selectedDeviceId.value, timestamp: deviceLastUpdated.value }
    });
    window.dispatchEvent(event);
    
    console.log(`[ReactivityDebug] Dispatched force update event`);
  }
}

// Modify the handleConnect method to force updates
const handleConnect = () => {
  if (!selectedDeviceId.value) return

  try {
    console.log(`=== CONNECTION DEBUG START ===`)
    console.log(`Connecting to device ID: ${selectedDeviceId.value}`)
    console.log(`Full device object:`, JSON.stringify(device.value, null, 2))
    
    // Check if device is in error state that requires reset
    if (device.value && device.value.status === 'error') {
      console.log(`Device ${selectedDeviceId.value} is in error state, resetting before connecting`)
      // @ts-expect-error - The store has 'this' context typing issues that need to be fixed in a larger refactor
      unifiedStore.updateDevice(selectedDeviceId.value, {
        status: 'idle',
        isConnected: false,
        isConnecting: false,
        isDisconnecting: false
      })
      
      // Re-fetch device after update
      console.log(`Device after reset:`, JSON.stringify(unifiedStore.getDeviceById(selectedDeviceId.value), null, 2))
      forceUIUpdate()
    }
    
    // Check if there's a device client for this device and create one if needed
    let deviceClient = null;
    // Safely check if getDeviceClient exists before calling it
    if (typeof unifiedStore.getDeviceClient === 'function') {
      deviceClient = unifiedStore.getDeviceClient(selectedDeviceId.value)
    }
    
    const apiBaseUrl = device.value?.properties?.apiBaseUrl
    
    console.log(`Device client check result:`, {
      deviceId: selectedDeviceId.value,
      hasClient: !!deviceClient,
      apiBaseUrl,
      deviceType: device.value?.type,
      deviceNum: device.value?.properties?.deviceNumber
    })
    
    // If no client exists and we have apiBaseUrl in properties, promote it to top level
    if (!deviceClient && device.value && apiBaseUrl) {
      console.log(`No client found for device ${selectedDeviceId.value}, creating one by updating device`)
      console.log(`API Base URL: ${apiBaseUrl}`)
      
      // Try explicit client creation via store action by promoting apiBaseUrl to top level
      // @ts-expect-error - The store has 'this' context typing issues that need to be fixed in a larger refactor
      unifiedStore.updateDevice(selectedDeviceId.value, {
        apiBaseUrl,
        // Add these to ensure all required fields are present
        type: device.value.type,
        deviceNum: device.value.properties?.deviceNumber || 0
      })
      
      // Force UI update after client creation
      forceUIUpdate()
    }
    
    // Connection logic
    if (device.value?.isConnected) {
      console.log(`Disconnecting device ${selectedDeviceId.value}`)
      // @ts-expect-error - The store has 'this' context typing issues that need to be fixed in a larger refactor
      unifiedStore.disconnectDevice(selectedDeviceId.value)
      emit('disconnect')
      forceUIUpdate()
    } else {
      console.log(`Connecting to device ${selectedDeviceId.value}`)
      console.log(`Device state before connecting:`, device.value)
      
      // Use the store's connection method which handles client creation and setup
      // @ts-expect-error - The store has 'this' context typing issues that need to be fixed in a larger refactor
      unifiedStore.connectDevice(selectedDeviceId.value).then((success) => {
        console.log(`Connect result: ${success ? 'SUCCESS' : 'FAILED'}`)
        if (success) {
          emit('connect')
          addToRecentlyUsed(selectedDeviceId.value)
          
          // Force UI update after successful connection
          forceUIUpdate()
          
          // Update after a short delay to ensure all props are propagated
          setTimeout(forceUIUpdate, 500)
        }
        console.log(`=== CONNECTION DEBUG END ===`)
      }).catch((error) => {
        console.error('Connection error:', error)
        console.log(`=== CONNECTION DEBUG END ===`)
      })
    }
  } catch (error) {
    console.error('Connection error:', error)
    console.log(`=== CONNECTION DEBUG END ===`)
  }
}

// Handle device change
const handleDeviceChange = (newDeviceId: string) => {
  console.log('BasePanel - handleDeviceChange called:', newDeviceId)
  console.log('BasePanel - Current selectedDeviceId:', selectedDeviceId.value)

  if (newDeviceId !== selectedDeviceId.value) {
    try {
      // Disconnect from current device if connected
      if (device.value?.isConnected) {
        console.log('BasePanel - Disconnecting from current device')
        // @ts-expect-error - The store has 'this' context typing issues that need to be fixed in a larger refactor
        unifiedStore.disconnectDevice(selectedDeviceId.value)
        forceUIUpdate()
      }

      console.log('BasePanel - Updating selectedDeviceId to:', newDeviceId)
      selectedDeviceId.value = newDeviceId
      emit('deviceChange', newDeviceId)

      // Add to recently used devices
      addToRecentlyUsed(newDeviceId)
      
      // Force UI update after device change
      forceUIUpdate()
      
      // Check if we should auto-connect
      const newDevice = unifiedStore.getDeviceById(newDeviceId)
      if (newDevice && !newDevice.isConnected) {
        console.log('BasePanel - Attempting auto-connect for newly selected device')
        // Schedule connection after a short delay to ensure UI is updated
        setTimeout(() => {
          handleConnect()
        }, 100)
      }
    } catch (error) {
      console.error('Device change error:', error)
    }
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

// Add a watcher to log device changes
watch(() => device.value, (newDevice) => {
  deviceLastUpdated.value = Date.now()
  console.log(`[ReactivityDebug] Device changed:`, {
    id: newDevice?.id,
    isConnected: newDevice?.isConnected,
    lastUpdate: deviceLastUpdated.value,
    hasProperties: newDevice ? Object.keys(newDevice.properties || {}).length > 0 : false
  })
  
  // Force refresh hasClient computed when device changes
  deviceLoadingState.value = newDevice?.isConnected ? 'connected' : 'idle'
}, { deep: true })

// Add explicit watch on connection status change
watch(() => isConnected.value, (connected) => {
  console.log(`[ReactivityDebug] Connection status changed to: ${connected ? 'connected' : 'disconnected'}`)
  deviceLoadingState.value = connected ? 'connected' : 'idle'
})

// Add a method to signal components to force update
const signalComponentUpdate = () => {
  console.log('BasePanel - Signaling component update');
  deviceLastUpdated.value = Date.now();
}

// Add a timer to periodically refresh components to ensure they get updated
let componentRefreshTimer: number | null = null;

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
  
  // Direct client creation workaround - ensure client creation for selected device
  if (selectedDeviceId.value) {
    ensureClientExists(selectedDeviceId.value);
  }
  
  // Setup periodic check for client existence
  const clientCheckInterval = setInterval(() => {
    if (selectedDeviceId.value) {
      const device = unifiedStore.getDeviceById(selectedDeviceId.value);
      if (device && device.isConnected && !hasClient.value) {
        console.log('BasePanel - Periodic check: Device connected but no client, attempting to create');
        ensureClientExists(selectedDeviceId.value);
      }
    }
  }, 3000); // Check every 3 seconds
  
  // Setup timer to refresh components periodically
  componentRefreshTimer = window.setInterval(() => {
    if (selectedDeviceId.value && isConnected.value) {
      signalComponentUpdate();
    }
  }, 5000); // Refresh every 5 seconds
  
  // Clean up interval on unmount
  onBeforeUnmount(() => {
    clearInterval(clientCheckInterval);
    if (componentRefreshTimer) {
      clearInterval(componentRefreshTimer);
      componentRefreshTimer = null;
    }
  });
})

// Helper function to ensure client exists
const ensureClientExists = (deviceId: string) => {
  console.log('BasePanel - Attempting to ensure client exists for device:', deviceId);
  
  const device = unifiedStore.getDeviceById(deviceId);
  if (!device) {
    console.warn('BasePanel - Device not found:', deviceId);
    return;
  }
  
  if (!hasClient.value) {
    // Check if device has apiBaseUrl or if we can construct one
    if (!device.apiBaseUrl) {
      // Try multiple approaches to get apiBaseUrl
      
      // Approach 1: Check properties
      if (device.properties?.apiBaseUrl) {
        console.log(`BasePanel - Found apiBaseUrl in properties, promoting to top level:`, device.properties.apiBaseUrl);
        // @ts-expect-error - The store has 'this' context typing issues that need to be fixed in a larger refactor
        unifiedStore.updateDevice(deviceId, {
          apiBaseUrl: device.properties.apiBaseUrl as string,
          deviceNum: (device.properties.deviceNumber as number) || 0
        });
      } 
      // Approach 2: Try to parse from device ID
      else if (device.id && device.id.includes(':')) {
        try {
          // Try to parse from device ID format like "192.168.4.169:8080:camera:0"
          const parts = device.id.split(':');
          if (parts.length >= 4) {
            const ip = parts[0];
            const port = parts[1];
            const type = parts[2].toLowerCase();
            const deviceNum = parseInt(parts[3], 10);
            if (!isNaN(deviceNum)) {
              const apiBaseUrl = `http://${ip}:${port}/api/v1/${type}/${deviceNum}`;
              console.log(`BasePanel - Constructed API URL from device ID parts: ${apiBaseUrl}`);
              
              // @ts-expect-error - The store has 'this' context typing issues that need to be fixed in a larger refactor
              unifiedStore.updateDevice(deviceId, {
                apiBaseUrl,
                deviceNum
              });
            }
          }
        } catch (err) {
          console.error(`BasePanel - Failed to parse device ID ${device.id}:`, err);
        }
      }
    }
    
    // Force UI update
    forceUIUpdate();
    
    // Set a timer to check if client creation worked
    setTimeout(() => {
      const updatedHasClient = hasClient.value;
      console.log(`BasePanel - Client creation result:`, { hasClient: updatedHasClient });
      
      if (!updatedHasClient) {
        console.warn('BasePanel - Client still not available after update');
      }
    }, 200);
  }
}
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

      <!-- Show diagnostic component when needed -->
      <div v-if="selectedDeviceId && !hasClient" class="panel-diagnostic-section">
        <DeviceConnectionDiagnostic :device-id="selectedDeviceId" />
      </div>

      <div class="panel-feature-container">
        <slot name="features" :features="visibleFeatures">
          <!-- Default implementation renders feature components -->
          <div
            v-for="feature in visibleFeatures"
            :key="`${feature.id}-${deviceLoadingState}-${deviceLastUpdated}`"
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
              :key="`comp-${selectedDeviceId}-${deviceLoadingState}-${deviceLastUpdated}`"
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

        <!-- Show diagnostic component when needed -->
        <div v-if="selectedDeviceId && !hasClient" class="panel-diagnostic-section">
          <DeviceConnectionDiagnostic :device-id="selectedDeviceId" />
        </div>

        <div class="panel-feature-container">
          <slot name="features" :features="visibleFeatures">
            <!-- Detailed mode feature rendering -->
            <div
              v-for="feature in visibleFeatures"
              :key="`${feature.id}-${deviceLoadingState}-${deviceLastUpdated}`"
              class="panel-feature"
              :class="`feature-${feature.priority}`"
            >
              <component
                :is="feature.component"
                v-bind="feature.props || {}"
                :key="`comp-${selectedDeviceId}-${deviceLoadingState}-${deviceLastUpdated}`"
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
                :key="`${feature.id}-${deviceLoadingState}-${deviceLastUpdated}`"
                class="panel-feature"
                :class="`feature-${feature.priority}`"
              >
                <component
                  :is="feature.component"
                  v-bind="feature.props || {}"
                  :key="`comp-${selectedDeviceId}-${deviceLoadingState}-${deviceLastUpdated}`"
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

.panel-diagnostic-section {
  margin: 12px 0;
  padding: 8px;
  border-radius: 4px;
  background-color: var(--aw-panel-bg-color, #fff);
}
</style>
