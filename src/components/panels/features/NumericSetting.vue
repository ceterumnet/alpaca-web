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
  deviceId,
  isLoading,
  error,
  getDeviceProperty,
  setDeviceProperty,
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
  if (!deviceId.value) {
    error.value = 'No device ID';
    return;
  }
  
  try {
    // Get device directly from store - avoid any reactivity issues
    const storeDevice = store.getDeviceById(deviceId.value);
    const deviceExists = !!storeDevice;
    const isDeviceConnected = storeDevice?.isConnected || false;
    
    // If device doesn't exist or isn't connected in store, don't attempt fetch
    if (!deviceExists) {
      error.value = 'Device not found';
      return;
    }
    
    if (!isDeviceConnected) {
      error.value = 'Device not connected';
      return;
    }
    
    // Try to get the property directly from store cache first
    if (storeDevice.properties && props.property in storeDevice.properties) {
      processReceivedValue(storeDevice.properties[props.property]);
      return;
    }
    
    // Try to get from API
    const result = await getDeviceProperty(props.property);
    if (result !== null) {
      processReceivedValue(result);
    }
  } catch (err) {
    if (err instanceof Error) {
      error.value = err.message;
    } else {
      error.value = 'Unknown error occurred';
    }
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
    if (event.detail && event.detail.deviceId === deviceId.value) {
      // Wait a brief moment for store updates to propagate
      setTimeout(() => {
        // Get fresh device data directly from store
        const deviceData = store.getDeviceById(deviceId.value);
        
        // Only fetch if device exists and is connected
        if (deviceData && deviceData.isConnected) {
          fetchValue().catch(() => {
            // Silent catch - error is set in fetchValue
          });
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
  (newDeviceId) => {
    // Update local ref
    deviceId.value = newDeviceId;
    
    if (newDeviceId) {
      // Clear values first
      currentValue.value = null
      editedValue.value = null
      // Wait briefly for client initialization and then fetch values
      setTimeout(() => fetchValue(), 50)
    }
  }
)

// Initial fetch on component mount with retry logic
onMounted(() => {
  // Setup force update listener
  const cleanup = setupForceUpdateListener();
  
  if (props.deviceId) {
    // Add a tiered retry strategy to handle initialization timing issues
    setTimeout(() => {
      fetchValue().catch(() => {
        // First retry after 300ms
        setTimeout(() => {
          fetchValue().catch(() => {
            // Second retry after 1000ms
            setTimeout(() => {
              fetchValue();
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
    <div class="setting-row">
      <label class="setting-label">{{ label }}</label>
      <input
        type="number"
        :min="min"
        :max="max"
        :step="step"
        :value="editedValue"
        :disabled="isLoading || isSaving"
        class="aw-input aw-input--sm numeric-input"
        @input="handleInputChange"
        @blur="handleSave"
      />
      <span v-if="unit" class="unit-label">{{ unit }}</span>
      <span class="current-value" :title="displayValue">{{ displayValue }}</span>
    </div>
    <input
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="editedValue"
      :disabled="isLoading || isSaving"
      class="aw-slider"
      @input="handleSliderChange"
      @change="handleSave"
    />
    <div v-if="error" class="error-message">{{ error }}</div>
  </div>
</template>

<style scoped>
.numeric-setting {
  display: flex;
  flex-direction: column;
  gap: var(--aw-spacing-sm);
  padding: var(--aw-spacing-sm) var(--aw-spacing-md);
  background: var(--aw-panel-content-bg-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-md);
  transition: box-shadow 0.2s;
}
.numeric-setting:hover, .numeric-setting:focus-within {
  box-shadow: 0 0 0 2px var(--aw-color-primary-300);
}

.setting-row {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-sm);
  width: 100%;
  box-sizing: border-box;
  padding-top: 2px;
  padding-bottom: 2px;
}

.setting-label {
  font-size: 0.8em;
  color: var(--aw-panel-content-color);
  font-weight: 600;
  min-width: 80px;
  flex-shrink: 0;
}

.aw-input.numeric-input {
  width: 56px;
  min-width: 0;
  text-align: right;
  margin-right: var(--aw-spacing-xs);
}

.unit-label {
  font-size: 0.92em;
  color: var(--aw-text-secondary-color);
  margin-left: 2px;
  margin-right: 8px;
}

.current-value {
  font-size: 0.92em;
  color: var(--aw-color-primary-500);
  margin-left: auto;
  min-width: 60px;
  max-width: 100px;
  text-align: right;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aw-slider {
  width: 100%;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background-color: var(--aw-color-neutral-300);
  outline: none;
  margin-top: 0;
  margin-bottom: 0;
  transition: background 0.2s;
}
.aw-slider:hover, .aw-slider:focus {
  background-color: var(--aw-color-primary-100);
}
.aw-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: var(--aw-color-primary-500);
  cursor: pointer;
  border: 2px solid var(--aw-panel-border-color);
  transition: background 0.2s, border 0.2s;
}
.aw-slider:focus::-webkit-slider-thumb {
  background-color: var(--aw-color-primary-700);
  border-color: var(--aw-color-primary-500);
}
.aw-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: var(--aw-color-primary-500);
  cursor: pointer;
  border: 2px solid var(--aw-panel-border-color);
  transition: background 0.2s, border 0.2s;
}
.aw-slider:focus::-moz-range-thumb {
  background-color: var(--aw-color-primary-700);
  border-color: var(--aw-color-primary-500);
}
.aw-slider::-ms-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: var(--aw-color-primary-500);
  cursor: pointer;
  border: 2px solid var(--aw-panel-border-color);
  transition: background 0.2s, border 0.2s;
}
.aw-slider:focus::-ms-thumb {
  background-color: var(--aw-color-primary-700);
  border-color: var(--aw-color-primary-500);
}

.error-message {
  color: var(--aw-error-color);
  font-size: 0.85em;
  margin-top: var(--aw-spacing-xs);
}

.numeric-setting.is-loading {
  opacity: 0.7;
}

.numeric-setting.has-error .setting-label,
.numeric-setting.has-error .current-value {
  color: var(--aw-error-color);
}
</style>