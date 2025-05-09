<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { useBaseControl } from './BaseControlMixin'

interface Option {
  value: string | number
  label: string
}

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
  options: {
    type: Array as () => Option[],
    required: true
  }
})

const emit = defineEmits(['change', 'success', 'error'])

// Initialize with the device ID

// Use the base control mixin which will create a reactive deviceId ref
const {
  store,
  deviceId,
  isConnected,
  isLoading,
  error,
  safeExecute,
  getDeviceProperty,
  setDeviceProperty,
  logStoreState
} = useBaseControl(props.deviceId)

const currentValue = ref<string | number | null>(null)
const isSaving = ref(false)

// Internal options generated dynamically when parent doesn't provide them
const internalOptions = ref<Option[]>([])

// Find the label for the current value
const currentLabel = computed(() => {
  if (isLoading.value) {
    return 'Loading...'
  }

  if (currentValue.value === null) {
    return 'Unknown'
  }
  
  // Special handling for readoutmode - if we have readoutmodes in the store
  if (props.property.toLowerCase() === 'readoutmode') {
    const device = store.getDeviceById(deviceId.value)
    const modes = device?.properties?.readoutmodes
    
    if (Array.isArray(modes) && typeof currentValue.value === 'number') {
      const index = currentValue.value
      if (index >= 0 && index < modes.length) {
        // Use the mode name directly from the store
        return modes[index]
      }
    }
  }

  // Check internal options first if parent didn't provide any
  if (internalOptions.value.length > 0 && props.options.length === 0) {
    const internalOption = internalOptions.value.find(opt => opt.value === currentValue.value)
    if (internalOption) {
      return internalOption.label
    }
  }
  
  // Then check parent options
  const option = props.options.find((opt) => opt.value === currentValue.value)
  return option ? option.label : String(currentValue.value)
})

// Automatically derive the plural property name (e.g., "readoutmode" -> "readoutmodes")
function getPluralPropertyName(singularName: string): string {
  const name = singularName.toLowerCase();
  
  // Handle common patterns
  if (name.endsWith('mode')) {
    return name + 's';
  } else if (name.endsWith('property')) {
    return name.replace(/property$/, 'properties');
  } else {
    // Generic case - just add 's'
    return name + 's';
  }
}

// Fetch the current value from the device
async function fetchValue() {
  // Get the current device ID - make sure to use the latest value using .value since it's a ref
  const currentId = deviceId.value;
  
  // Bail out immediately if no device ID 
  if (!currentId) {
    error.value = 'No device ID';
    return;
  }
  
  try {
    // Get device directly from store - avoid any reactivity issues
    const storeDevice = store.getDeviceById(currentId);
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
    
    // Check if this might be an index-based property (like readoutmode)
    const propertyEndsWithMode = props.property.toLowerCase().endsWith('mode');
    
    // If this is a mode property and we have no options, try to fetch the related modes list
    if (propertyEndsWithMode && props.options.length === 0) {
      // Determine the plural property name (e.g., readoutmode -> readoutmodes)
      const pluralProperty = getPluralPropertyName(props.property);
      
      // Check if plural property already exists in store
      let modesArray: string[] | null = null;
      
      // Try to get modes from store
      if (storeDevice.properties && pluralProperty in storeDevice.properties) {
        modesArray = storeDevice.properties[pluralProperty];
      } 
      // If not, try to fetch it from the device
      else {
        try {
          // Try to get the plural property (e.g., readoutmodes)
          const modesResult = await store.getDeviceProperty(currentId, pluralProperty);
          
          if (modesResult !== null && modesResult !== undefined) {
            modesArray = Array.isArray(modesResult) 
                         ? modesResult 
                         : typeof modesResult === 'string' 
                         ? modesResult.split(',').map(m => m.trim())
                         : null;
          }
        } catch (modesErr) {
          // Silently continue - we'll use default options if available
        }
      }
      
      // Process the modes array if we found it
      if (Array.isArray(modesArray) && modesArray.length > 0) {
        // Create local options when parent doesn't provide them
        if (props.options.length === 0) {
          // Initialize options based on the modes array
          const dynamicOptions = modesArray.map((mode, index) => {
            return {
              value: index,
              label: String(mode)
            };
          });

          // Store these options for internal use
          internalOptions.value = dynamicOptions;
        }
      }
    }
    
    // Try to get the property directly from store cache first
    if (storeDevice.properties && props.property in storeDevice.properties) {
      processReceivedValue(storeDevice.properties[props.property]);
      return;
    }
    
    try {
      // Try using the mixin helper first
      if (typeof getDeviceProperty === 'function') {
        const result = await getDeviceProperty(props.property);
        
        if (result !== null && result !== undefined) {
          processReceivedValue(result);
          return;
        }
      }
      
      // Make direct API call as a last resort
      const result = await store.getDeviceProperty(currentId, props.property);
      
      if (result !== null && result !== undefined) {
        processReceivedValue(result);
        return;
      }
    } catch (directError) {
      throw directError; // Re-throw to be caught by outer try/catch
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
  // Special handling for index-based values (like readoutmode which references readoutmodes)
  const isNumericValue = typeof result === 'number' || (typeof result === 'string' && !isNaN(Number(result)));
  const propertyEndsWithMode = props.property.toLowerCase().endsWith('mode');
  const hasPluralProperty = props.property.toLowerCase().endsWith('mode') && 
                            props.options.length > 0;
  
  // Special handling for readoutmode property since it's a common case
  if (props.property.toLowerCase() === 'readoutmode' && isNumericValue) {
    // For readoutmode, see if we can find readoutmodes in the store
    const readoutIndex = Number(result);

    // Check if we can access store device directly
    const device = store.getDeviceById(deviceId.value);
    if (device?.properties?.readoutmodes) {
      const modes = device.properties.readoutmodes;

      // Use the mode at the specified index if available
      if (Array.isArray(modes) && readoutIndex >= 0 && readoutIndex < modes.length) {
        currentValue.value = readoutIndex;
      } else {
        currentValue.value = result;
      }
    } else {
      // Use generic index-based handling as before
      const index = Number(result);
      const matchingOption = props.options.find((opt, idx) => idx === index || Number(opt.value) === index);
      
      if (matchingOption) {
        currentValue.value = matchingOption.value;
      } else {
        currentValue.value = result;
      }
    }
  }
  // Generic handling for other index-based properties
  else if (isNumericValue && hasPluralProperty) {
    const index = Number(result);
    
    // Try to find the option with this index or value
    const matchingOption = props.options.find((opt, idx) => idx === index || Number(opt.value) === index);
    
    if (matchingOption) {
      currentValue.value = matchingOption.value;
    } else {
      currentValue.value = result;
    }
  } 
  // Regular direct value processing
  else if (typeof result === 'string' || typeof result === 'number') {
    currentValue.value = result;
  } else {
    // Try to convert to string as fallback
    currentValue.value = String(result);
  }
}

// Save the selected value to the device
async function saveValue(newValue: string | number) {
  if (newValue === currentValue.value) {
    return;
  }

  isSaving.value = true;

  try {
    // Special handling for index-based properties (like readoutmode)
    const propertyEndsWithMode = props.property.toLowerCase().endsWith('mode');
    const hasPluralProperty = props.property.toLowerCase().endsWith('mode') && 
                             props.options.length > 0;
    
    // Determine actual value to send to the device
    let valueToSend: string | number = newValue;
    
    // If this is an index-based property, we may need to send the index instead of the value
    if (propertyEndsWithMode && hasPluralProperty) {
      // Find the option's index in the options array
      const optionIndex = props.options.findIndex(opt => 
        opt.value === newValue || String(opt.value) === String(newValue)
      );
      
      if (optionIndex !== -1) {
        valueToSend = optionIndex;
      }
    }
    
    const success = await setDeviceProperty(props.property, valueToSend);
    
    if (success) {
      // Update current value and emit success
      currentValue.value = newValue;
      emit('success', newValue);
      emit('change', newValue);
    } else if (error.value) {
      // Error already set by mixin, just forward it
      emit('error', error.value);
    }
  } catch (err) {
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

// Handle selection change
function handleChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  const value = target.value;

  // Convert to number if the original option was a number
  const selectedOption = props.options.find((opt) => String(opt.value) === value);
  if (selectedOption) {
    saveValue(selectedOption.value);
  }
}

// Listen for global force update events
const setupForceUpdateListener = () => {
  const handleForceUpdate = (event: CustomEvent) => {
    // Get current device ID using .value since it's a ref
    const currentId = deviceId.value;
    
    // Check if this event is for our device
    if (event.detail && event.detail.deviceId === currentId) {
      // Wait a brief moment for store updates to propagate
      setTimeout(() => {
        // Get fresh device data directly from store
        const deviceData = store.getDeviceById(currentId);
        
        // Only fetch if device exists and is connected
        if (deviceData && deviceData.isConnected) {
          fetchValue().catch(() => {
            // Silent catch - error is already set in fetchValue
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
  (newDeviceId, oldDeviceId) => {
    // Update our local reference properly using .value since it's a ref
    deviceId.value = newDeviceId;
    
    if (newDeviceId) {
      // Wait briefly for client initialization and then fetch values
      setTimeout(() => fetchValue(), 50);
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
  <div class="select-setting" :class="{ 'is-loading': isLoading, 'has-error': !!error }">
    <div class="setting-header">
      <label class="setting-label">{{ label }}</label>
      <div class="current-value">{{ currentLabel }}</div>
    </div>

    <select
      class="select-control"
      :disabled="isLoading || isSaving"
      :value="currentValue === null ? '' : String(currentValue)"
      @change="handleChange"
    >
      <!-- Use internal options if available and no parent options provided -->
      <option v-for="option in internalOptions.length > 0 && props.options.length === 0 ? internalOptions : props.options"
              :key="String(option.value)" 
              :value="String(option.value)">
        {{ option.label }}
      </option>
    </select>

    <div v-if="error" class="error-message">{{ error }}</div>
  </div>
</template>

<style scoped>
.select-setting {
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

.select-control {
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-background-soft);
  color: var(--color-text);
  cursor: pointer;
}

.select-control:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-message {
  color: var(--color-error);
  font-size: 0.85em;
}

.select-setting.is-loading {
  opacity: 0.7;
}

.select-setting.has-error .setting-label,
.select-setting.has-error .current-value {
  color: var(--color-error);
}
</style>