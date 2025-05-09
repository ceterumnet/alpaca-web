// Status: Good - Core Component // This is the numeric setting implementation that: // - Provides
// type-safe numeric value control // - Handles proper value validation and constraints // - Supports
// both slider and direct input // - Implements proper error handling // - Provides real-time value
// updates /** * Numeric Setting Component * * Provides numeric value control with slider and direct
// input */
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
  min: {
    type: Number,
    default: 0
  },
  max: {
    type: Number,
    default: 100
  },
  step: {
    type: Number,
    default: 1
  },
  unit: {
    type: String,
    default: ''
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

const currentValue = ref<number | null>(null)
const editedValue = ref<number | null>(null)
const isSaving = ref(false)

// Formatted display value with units
const displayValue = computed(() => {
  if (currentValue.value === null) {
    return 'Loading...'
  }

  if (typeof currentValue.value === 'number') {
    return props.unit ? `${currentValue.value} ${props.unit}` : currentValue.value.toString()
  }

  return String(currentValue.value)
})

// Fetch the current value from the device
async function fetchValue() {
  // Bail out immediately if no device ID 
  if (!props.deviceId) {
    console.warn(`NumericSetting: No device ID provided when fetching ${props.property}`);
    return;
  }
  
  try {
    // Get device directly from store - avoid any reactivity issues
    const storeDevice = store.getDeviceById(props.deviceId);
    const deviceExists = !!storeDevice;
    const isDeviceConnected = storeDevice?.isConnected || false;
    
    console.log(`NumericSetting: Fetching ${props.property} for device ${props.deviceId}`, {
      deviceExists,
      isConnected: isDeviceConnected,
      storeDeviceCount: store.devicesList.length,
      hasProperties: storeDevice ? Object.keys(storeDevice.properties || {}).length > 0 : 0
    });
    
    // If device doesn't exist or isn't connected in store, don't attempt fetch
    if (!deviceExists) {
      console.warn(`NumericSetting: Device ${props.deviceId} not found in store, skipping fetch`);
      return;
    }
    
    if (!isDeviceConnected) {
      console.warn(`NumericSetting: Device ${props.deviceId} exists but not connected, skipping fetch`);
      return;
    }
    
    // Try to get the property directly from store cache first
    if (storeDevice.properties && props.property in storeDevice.properties) {
      console.log(`NumericSetting: Using cached value for ${props.property} from store`);
      processReceivedValue(storeDevice.properties[props.property]);
      return;
    }
    
    // Otherwise try to get the property via API
    console.log(`NumericSetting: Fetching ${props.property} from API`);
    const result = await store.getDeviceProperty(props.deviceId, props.property);
    
    console.log(`NumericSetting: Fetch result for ${props.property}: ${result !== null ? 'success' : 'failure'}`)
    if (result !== null) {
      processReceivedValue(result);
    }
  } catch (err) {
    console.error(`NumericSetting: Error fetching ${props.property}:`, err);
    error.value = `Failed to fetch ${props.property}: ${err instanceof Error ? err.message : 'Unknown error'}`;
  }
}

// Helper to process and set the received value
function processReceivedValue(result: unknown) {
  // Convert to number if possible
  if (typeof result === 'number') {
    currentValue.value = result
    if (editedValue.value === null) {
      editedValue.value = result
    }
  } else if (typeof result === 'string') {
    // Try to parse as number
    const parsed = parseFloat(result)
    if (!isNaN(parsed)) {
      currentValue.value = parsed
      if (editedValue.value === null) {
        editedValue.value = parsed
      }
    } else {
      error.value = 'Value is not a number'
    }
  } else {
    error.value = 'Unexpected value type'
  }
}

// Save the edited value to the device
async function saveValue() {
  if (editedValue.value === null || editedValue.value === currentValue.value) {
    return
  }

  isSaving.value = true

  const success = await setDeviceProperty(props.property, editedValue.value)

  if (success) {
    // Update current value and emit success
    currentValue.value = editedValue.value
    emit('success', editedValue.value)
    emit('change', editedValue.value)
  } else if (error.value) {
    // Error already set by mixin, just forward it
    emit('error', error.value)
  }

  isSaving.value = false
}

// Handle slider/input change
function handleInputChange(event: Event) {
  const target = event.target as HTMLInputElement
  const value = parseFloat(target.value)
  if (!isNaN(value)) {
    editedValue.value = value
  }
}

// Handle slider change event
function handleSliderChange(event: Event) {
  const target = event.target as HTMLInputElement
  const value = parseFloat(target.value)
  if (!isNaN(value)) {
    editedValue.value = value
  }
}

// Handle save button
function handleSave() {
  saveValue()
}

// Listen for global force update events
const setupForceUpdateListener = () => {
  const handleForceUpdate = (event: CustomEvent) => {
    // Check if this event is for our device
    if (event.detail && event.detail.deviceId === props.deviceId) {
      console.log(`NumericSetting: Force update received for ${props.property}, deviceId: ${props.deviceId}`);
      
      // Wait a brief moment for store updates to propagate
      setTimeout(() => {
        // Get fresh device data directly from store
        const deviceData = store.getDeviceById(props.deviceId);
        console.log(`NumericSetting: Device status direct check: exists=${!!deviceData}, connected=${deviceData?.isConnected}`);
        
        // Only fetch if device exists and is connected
        if (deviceData && deviceData.isConnected) {
          fetchValue().catch(err => {
            console.error(`Force update failed for ${props.property}:`, err);
          });
        } else {
          console.warn(`NumericSetting: Skipping fetch for ${props.property} - device not ready yet`);
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
    console.log(`NumericSetting: deviceId changed from ${oldDeviceId} to ${newDeviceId}`)
    if (newDeviceId) {
      // Clear values first
      currentValue.value = null
      editedValue.value = null
      // Log store state for debugging
      logStoreState()
      // Wait briefly for client initialization and then fetch values
      setTimeout(() => fetchValue(), 50)
    }
  }
)

// Initial fetch on component mount with retry logic
onMounted(() => {
  // Setup force update listener
  const cleanup = setupForceUpdateListener();
  
  // Debug current store state
  console.log(`NumericSetting(${props.property}): Mounted with deviceId ${props.deviceId || 'none'}`)
  
  if (props.deviceId) {
    logStoreState();
    
    // Add a tiered retry strategy to handle initialization timing issues
    setTimeout(() => {
      console.log(`NumericSetting: First attempt for ${props.property} on device ${props.deviceId}`)
      fetchValue().catch(err => {
        console.log(`NumericSetting: First attempt failed for ${props.property}, retrying...`)
        
        // First retry after 300ms
        setTimeout(() => {
          console.log(`NumericSetting: Retry 1 for ${props.property} on device ${props.deviceId}`)
          fetchValue().catch(err => {
            console.log(`NumericSetting: Retry 1 failed for ${props.property}, retrying...`)
            
            // Second retry after 1000ms
            setTimeout(() => {
              console.log(`NumericSetting: Retry 2 for ${props.property} on device ${props.deviceId}`)
              fetchValue().catch(err => {
                console.error(`NumericSetting: All retries failed for ${props.property}:`, err);
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
  <div class="numeric-setting" :class="{ 'is-loading': isLoading, 'has-error': !!error }">
    <div class="setting-header">
      <label class="setting-label">{{ label }}</label>
      <div class="current-value">{{ displayValue }}</div>
    </div>

    <div class="setting-controls">
      <input
        type="range"
        :min="min"
        :max="max"
        :step="step"
        :value="editedValue"
        :disabled="isLoading || isSaving"
        @input="handleSliderChange"
        @change="handleSave"
      />

      <div class="input-group">
        <input
          type="number"
          :min="min"
          :max="max"
          :step="step"
          :value="editedValue"
          :disabled="isLoading || isSaving"
          class="numeric-input"
          @input="handleInputChange"
          @blur="handleSave"
        />
        <span v-if="unit" class="unit-label">{{ unit }}</span>
      </div>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>
  </div>
</template>

<style scoped>
.numeric-setting {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.setting-label {
  font-size: 0.9em;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.current-value {
  font-size: 0.9em;
  font-weight: 500;
  color: var(--color-text);
}

.setting-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

input[type='range'] {
  width: 100%;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background-color: var(--color-background-mute);
  outline: none;
}

input[type='range']::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: var(--color-primary);
  cursor: pointer;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.numeric-input {
  width: 70px;
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-background-soft);
  color: var(--color-text);
  font-size: 0.9em;
}

.unit-label {
  font-size: 0.9em;
  color: var(--color-text-secondary);
}

.error-message {
  color: var(--color-error);
  font-size: 0.85em;
}

.numeric-setting.is-loading {
  opacity: 0.7;
}

.numeric-setting.has-error .setting-label,
.numeric-setting.has-error .current-value {
  color: var(--color-error);
}
</style>