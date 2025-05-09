<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { useBaseControl } from './BaseControlMixin'

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  property: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  onLabel: {
    type: String,
    default: 'On'
  },
  offLabel: {
    type: String,
    default: 'Off'
  }
})

const emit = defineEmits(['change', 'success', 'error'])

// Use the base control mixin
const {
  store,
  isConnected,
  isLoading,
  error,
  safeExecute,
  getDeviceProperty,
  setDeviceProperty,
  logStoreState
} = useBaseControl(props.deviceId)

const isOn = ref(false)
const isSaving = ref(false)

// Formatted label based on current state
const stateLabel = computed(() => {
  if (isLoading.value) {
    return 'Loading...'
  }

  return isOn.value ? props.onLabel : props.offLabel
})

// Fetch the current state from the device
async function fetchState() {
  // Bail out immediately if no device ID 
  if (!props.deviceId) {
    console.warn(`ToggleSwitch: No device ID provided when fetching ${props.property}`);
    return;
  }
  
  try {
    // Get device directly from store - avoid any reactivity issues
    const storeDevice = store.getDeviceById(props.deviceId);
    const deviceExists = !!storeDevice;
    const isDeviceConnected = storeDevice?.isConnected || false;
    
    console.log(`ToggleSwitch: Fetching ${props.property} for device ${props.deviceId}`, {
      deviceExists,
      isConnected: isDeviceConnected,
      storeDeviceCount: store.devicesList.length,
      hasProperties: storeDevice ? Object.keys(storeDevice.properties || {}).length > 0 : 0
    });
    
    // If device doesn't exist or isn't connected in store, don't attempt fetch
    if (!deviceExists) {
      console.warn(`ToggleSwitch: Device ${props.deviceId} not found in store, skipping fetch`);
      return;
    }
    
    if (!isDeviceConnected) {
      console.warn(`ToggleSwitch: Device ${props.deviceId} exists but not connected, skipping fetch`);
      return;
    }
    
    // Try to get the property directly from store cache first
    if (storeDevice.properties && props.property in storeDevice.properties) {
      console.log(`ToggleSwitch: Using cached value for ${props.property} from store`);
      processReceivedValue(storeDevice.properties[props.property]);
      return;
    }
    
    // Otherwise try to get the property via API
    console.log(`ToggleSwitch: Fetching ${props.property} from API`);
    const result = await getDeviceProperty(props.property);
    
    console.log(`ToggleSwitch: Fetch result for ${props.property}: ${result !== null ? 'success' : 'failure'}`);
    if (result !== null) {
      processReceivedValue(result);
    }
  } catch (err) {
    console.error(`ToggleSwitch: Error fetching ${props.property}:`, err);
    error.value = `Failed to fetch ${props.property}: ${err instanceof Error ? err.message : 'Unknown error'}`;
  }
}

// Helper to process and set the received value
function processReceivedValue(result: unknown) {
  // Convert to boolean if possible
  if (typeof result === 'boolean') {
    isOn.value = result
  } else if (typeof result === 'number') {
    isOn.value = result !== 0
  } else if (typeof result === 'string') {
    isOn.value = result.toLowerCase() === 'true' || result === '1'
  } else {
    console.warn(`ToggleSwitch: Unexpected value type for ${props.property}:`, result);
    error.value = 'Unexpected value type'
  }
}

// Save the new state to the device
async function saveState(newState: boolean) {
  isSaving.value = true;

  try {
    console.log(`ToggleSwitch: Setting ${props.property} to ${newState}`);
    const success = await setDeviceProperty(props.property, newState);
    
    if (success) {
      // Update state and emit success
      isOn.value = newState;
      emit('success', newState);
      emit('change', newState);
    } else if (error.value) {
      // Error already set by mixin, just forward it
      emit('error', error.value);
    }
  } catch (err) {
    console.error(`ToggleSwitch: Error saving ${props.property}:`, err);
    if (err instanceof Error) {
      error.value = err.message;
    } else {
      error.value = 'Unknown error occurred';
    }
    emit('error', error.value);
  } finally {
    isSaving.value = false;
  }
}

// Handle toggle change
function handleToggle() {
  if (isLoading.value || isSaving.value) {
    return
  }

  saveState(!isOn.value)
}

// Listen for global force update events
const setupForceUpdateListener = () => {
  const handleForceUpdate = (event: CustomEvent) => {
    // Check if this event is for our device
    if (event.detail && event.detail.deviceId === props.deviceId) {
      console.log(`ToggleSwitch: Force update received for ${props.property}, deviceId: ${props.deviceId}`);
      
      // Wait a brief moment for store updates to propagate
      setTimeout(() => {
        // Get fresh device data directly from store
        const deviceData = store.getDeviceById(props.deviceId);
        console.log(`ToggleSwitch: Device status direct check: exists=${!!deviceData}, connected=${deviceData?.isConnected}`);
        
        // Only fetch if device exists and is connected
        if (deviceData && deviceData.isConnected) {
          fetchState().catch(err => {
            console.error(`Force update failed for ${props.property}:`, err);
          });
        } else {
          console.warn(`ToggleSwitch: Skipping fetch for ${props.property} - device not ready yet`);
        }
      }, 100);
    }
  };

  // Add event listener
  window.addEventListener('alpaca-force-update', handleForceUpdate as EventListener);

  // Return cleanup function
  return () => {
    window.removeEventListener('alpaca-force-update', handleForceUpdate as EventListener);
  };
};

// Watch for device ID changes
watch(
  () => props.deviceId,
  (newDeviceId, oldDeviceId) => {
    console.log(`ToggleSwitch: deviceId changed from ${oldDeviceId} to ${newDeviceId}`);
    if (newDeviceId) {
      // Log store state for debugging
      logStoreState();
      // Wait briefly for client initialization and then fetch values
      setTimeout(() => fetchState(), 50);
    }
  }
)

// Initial fetch on component mount with retry logic
onMounted(() => {
  // Setup force update listener
  const cleanup = setupForceUpdateListener();
  
  // Debug current store state
  console.log(`ToggleSwitch(${props.property}): Mounted with deviceId ${props.deviceId || 'none'}`);
  
  if (props.deviceId) {
    logStoreState();
    
    // Add a tiered retry strategy to handle initialization timing issues
    setTimeout(() => {
      console.log(`ToggleSwitch: First attempt for ${props.property} on device ${props.deviceId}`);
      fetchState().catch(err => {
        console.log(`ToggleSwitch: First attempt failed for ${props.property}, retrying...`);
        
        // First retry after 300ms
        setTimeout(() => {
          console.log(`ToggleSwitch: Retry 1 for ${props.property} on device ${props.deviceId}`);
          fetchState().catch(err => {
            console.log(`ToggleSwitch: Retry 1 failed for ${props.property}, retrying...`);
            
            // Second retry after 1000ms
            setTimeout(() => {
              console.log(`ToggleSwitch: Retry 2 for ${props.property} on device ${props.deviceId}`);
              fetchState().catch(err => {
                console.error(`ToggleSwitch: All retries failed for ${props.property}:`, err);
              });
            }, 1000);
          });
        }, 300);
      });
    }, 100);
  }

  // Cleanup on unmount
  onBeforeUnmount(() => {
    cleanup();
  });
})
</script>

<template>
  <div class="toggle-switch" :class="{ 'is-loading': isLoading, 'has-error': !!error }">
    <div class="toggle-header">
      <label class="toggle-label">{{ label }}</label>
      <div class="toggle-value">{{ stateLabel }}</div>
    </div>

    <button
      class="toggle-button"
      :class="{ 'is-on': isOn, 'is-disabled': isLoading || isSaving }"
      :disabled="isLoading || isSaving"
      :title="error || undefined"
      @click="handleToggle"
    >
      <div class="toggle-slider">
        <div class="toggle-handle"></div>
      </div>
    </button>

    <div v-if="error" class="error-message">{{ error }}</div>
  </div>
</template>

<style scoped>
.toggle-switch {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toggle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toggle-label {
  font-size: 0.9em;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.toggle-value {
  font-size: 0.9em;
  font-weight: 500;
  color: var(--color-text);
}

.toggle-button {
  position: relative;
  width: 50px;
  height: 24px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.toggle-button.is-disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.toggle-slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-background-mute);
  border-radius: 24px;
  border: 1px solid var(--color-border);
  transition: background-color 0.2s;
}

.toggle-button.is-on .toggle-slider {
  background-color: var(--color-primary);
}

.toggle-handle {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 2px;
  background-color: var(--color-text);
  border-radius: 50%;
  transition: transform 0.2s, background-color 0.2s;
}

.toggle-button.is-on .toggle-handle {
  transform: translateX(24px);
  background-color: white;
}

.error-message {
  color: var(--color-error);
  font-size: 0.85em;
}

.toggle-switch.is-loading {
  opacity: 0.7;
}

.toggle-switch.has-error .toggle-label,
.toggle-switch.has-error .toggle-value {
  color: var(--color-error);
}
</style>