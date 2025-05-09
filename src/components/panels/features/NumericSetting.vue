// Status: Good - Core Component // This is the numeric setting implementation that: // - Provides
type-safe numeric value control // - Handles proper value validation and constraints // - Supports
both slider and direct input // - Implements proper error handling // - Provides real-time value
updates /** * Numeric Setting Component * * Provides numeric value control with slider and direct
input */
<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'

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

const store = useUnifiedStore()
const currentValue = ref<number | null>(null)
const editedValue = ref<number | null>(null)
const isLoading = ref(true)
const isSaving = ref(false)
const error = ref('')

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
  isLoading.value = true
  error.value = ''

  // Special tracing for gain and offset
  const isCriticalProperty = props.property === 'gain' || props.property === 'offset';
  if (isCriticalProperty) {
    console.log(`%c[TRACE] NumericSetting: Fetching ${props.property} for device ${props.deviceId}`, 'background: #ffd; color: #363; font-weight: bold');
  }

  try {
    // Get the property value
    console.log(`NumericSetting: Fetching property ${props.property} for device ${props.deviceId}`);
    
    // Get the device to check for apiBaseUrl
    const device = store.getDeviceById(props.deviceId);
    
    // Special tracing for device state
    if (isCriticalProperty && device) {
      console.log(`%c[TRACE] Device state for ${props.deviceId}:`, 'background: #ffd; color: #363;');
      console.log(`- isConnected: ${device.isConnected}`);
      console.log(`- apiBaseUrl: ${device.apiBaseUrl}`);
      console.log(`- properties:`, device.properties);
      
      // Check if property is in device properties
      if (device.properties && props.property in device.properties) {
        console.log(`%c[TRACE] ${props.property} FOUND in device.properties: ${device.properties[props.property]}`, 
                    'background: #dfd; color: #363; font-weight: bold');
      } else {
        console.log(`%c[TRACE] ${props.property} NOT FOUND in device.properties`, 
                    'background: #fdd; color: #633; font-weight: bold');
      }
    }
    
    // Try the store method first - with error handling for TypeScript issues
    try {
      const result = await store.getDeviceProperty(props.deviceId, props.property);
      
      if (isCriticalProperty) {
        console.log(`%c[TRACE] NumericSetting: Received ${props.property} value:`, 
                   'background: #dfd; color: #363; font-weight: bold', result);
      } else {
        console.log(`NumericSetting: Received value for ${props.property}:`, result);
      }
      
      // Process the result
      processReceivedValue(result);
      return; // Exit if successful
    } catch (storeError) {
      console.warn(`NumericSetting: Store method failed, trying direct API call:`, storeError);
      
      // If the store method fails, try a direct API call if we have the URL
      if (device?.apiBaseUrl) {
        // Use direct API call as fallback
        const endpoint = `${device.apiBaseUrl}/${props.property.toLowerCase()}`;
        console.log(`NumericSetting: Direct fetch from ${endpoint}`);
        
        const response = await fetch(endpoint, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'AlpacaWeb'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`NumericSetting: Direct fetch returned:`, data);
          
          if (data && data.Value !== undefined) {
            // Process the result from the direct API call
            processReceivedValue(data.Value);
            return; // Exit if successful
          }
        } else {
          console.error(`Direct API call failed with status ${response.status}`);
          throw new Error(`HTTP error ${response.status}`);
        }
      } else {
        // Re-throw the original error if we couldn't do a direct call
        throw storeError;
      }
    }
  } catch (err) {
    console.error('Error in NumericSetting.fetchValue:', err);
    if (err instanceof Error) {
      error.value = err.message
    } else {
      error.value = 'Unknown error occurred'
    }
  } finally {
    isLoading.value = false
  }
}

// Helper to process and set the received value
function processReceivedValue(result: unknown) {
  // Special tracing for gain and offset
  const isCriticalProperty = props.property === 'gain' || props.property === 'offset';
  
  if (isCriticalProperty) {
    console.log(`%c[TRACE] NumericSetting: Processing ${props.property} value:`, 
               'background: #ffd; color: #363; font-weight: bold', result);
  }

  // Convert to number if possible
  if (typeof result === 'number') {
    if (isCriticalProperty) {
      console.log(`%c[TRACE] NumericSetting: Setting ${props.property} to numeric value ${result}`, 
                 'background: #dfd; color: #363; font-weight: bold');
    }
    currentValue.value = result
    if (editedValue.value === null) {
      editedValue.value = result
    }
  } else if (typeof result === 'string') {
    // Try to parse as number
    const parsed = parseFloat(result)
    if (!isNaN(parsed)) {
      if (isCriticalProperty) {
        console.log(`%c[TRACE] NumericSetting: Converting string to number: ${result} -> ${parsed}`, 
                   'background: #dfd; color: #363; font-weight: bold');
      }
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
  error.value = ''

  try {
    console.log(`NumericSetting: Setting property ${props.property} to ${editedValue.value} for device ${props.deviceId}`);
    
    // Get the device
    const device = store.getDeviceById(props.deviceId);
    
    // Try the store method first with TypeScript error handling
    try {
      // @ts-expect-error - The store has context typing issues that need to be fixed in a larger refactor
      await store.setDeviceProperty(props.deviceId, props.property, editedValue.value)
      console.log(`NumericSetting: Successfully set ${props.property}`);
    } catch (storeError) {
      console.warn(`NumericSetting: Store method failed, trying direct API call:`, storeError);
      
      // Fallback to direct API call if store method fails
      if (device?.apiBaseUrl) {
        const endpoint = `${device.apiBaseUrl}/${props.property.toLowerCase()}`;
        console.log(`NumericSetting: Direct PUT to ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'AlpacaWeb',
          },
          body: JSON.stringify({ Value: editedValue.value, ClientID: 1, ClientTransactionID: Date.now() })
        });
        
        if (!response.ok) {
          throw new Error(`Direct API call failed with status ${response.status}`);
        }
        
        console.log(`NumericSetting: Successfully set ${props.property} via direct API call`);
      } else {
        throw new Error('No API URL available for direct call');
      }
    }

    // Update current value and emit success
    currentValue.value = editedValue.value
    emit('success', editedValue.value)
    emit('change', editedValue.value)
  } catch (err) {
    console.error('Error in NumericSetting.saveValue:', err);
    if (err instanceof Error) {
      error.value = err.message
    } else {
      error.value = 'Unknown error occurred'
    }
    emit('error', error.value)
  } finally {
    isSaving.value = false
  }
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
      console.log(`NumericSetting: Received force update event for ${props.property}`);
      fetchValue().catch(err => {
        console.warn(`Error during forced update: ${err}`);
      });
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
  () => {
    if (props.deviceId) {
      fetchValue()
    }
  }
)

// Initial fetch on component mount with retry logic
onMounted(() => {
  if (!props.deviceId) return;

  console.log(`NumericSetting: Mounted for ${props.property} on device ${props.deviceId}`);
  
  // Check if device exists
  console.log(`NumericSetting: Device exists:`, !!store.getDeviceById(props.deviceId));
  
  // Setup force update listener
  const cleanup = setupForceUpdateListener();
  
  // Add a small delay to give time for client creation in parent components
  setTimeout(() => {
    fetchValue()
      .catch(err => {
        console.warn(`NumericSetting: Initial fetch failed, retrying in 500ms...`, err);
        
        // Retry after a short delay - parent components might still be setting up connections
        setTimeout(() => {
          console.log(`NumericSetting: Retrying fetch for ${props.property}`);
          fetchValue().catch(err => {
            console.error(`NumericSetting: Retry fetch also failed`, err);
          });
        }, 500);
      });
  }, 100);
  
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
