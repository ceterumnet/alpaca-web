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

// Log initial deviceId for debugging
console.log(`SelectSetting(${props.property}): Initializing with deviceId: ${props.deviceId}`);

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
    console.warn(`SelectSetting: No device ID provided when fetching ${props.property}`);
    return;
  }
  
  try {
    console.log(`SelectSetting: Starting fetch for ${props.property} (deviceId=${currentId})`);
    
    // Get device directly from store - avoid any reactivity issues
    const storeDevice = store.getDeviceById(currentId);
    const deviceExists = !!storeDevice;
    const isDeviceConnected = storeDevice?.isConnected || false;
    
    console.log(`SelectSetting: Fetching ${props.property} for device ${currentId}`, {
      deviceExists,
      isConnected: isDeviceConnected,
      storeDeviceCount: store.devicesList.length,
      hasProperties: storeDevice ? Object.keys(storeDevice.properties || {}).length > 0 : 0
    });
    
    // If device doesn't exist or isn't connected in store, don't attempt fetch
    if (!deviceExists) {
      console.warn(`SelectSetting: Device ${currentId} not found in store, skipping fetch`);
      return;
    }
    
    if (!isDeviceConnected) {
      console.warn(`SelectSetting: Device ${currentId} exists but not connected, skipping fetch`);
      return;
    }
    
    // Check if this might be an index-based property (like readoutmode)
    const propertyEndsWithMode = props.property.toLowerCase().endsWith('mode');
    
    // If this is a mode property and we have no options, try to fetch the related modes list
    if (propertyEndsWithMode && props.options.length === 0) {
      // Determine the plural property name (e.g., readoutmode -> readoutmodes)
      const pluralProperty = getPluralPropertyName(props.property);
      console.log(`SelectSetting: This appears to be an index-based property. Will check ${pluralProperty} for options.`);
      
      // Check if plural property already exists in store
      let modesArray: string[] | null = null;
      
      // Try to get modes from store
      if (storeDevice.properties && pluralProperty in storeDevice.properties) {
        modesArray = storeDevice.properties[pluralProperty];
        console.log(`SelectSetting: Found ${pluralProperty} in store:`, modesArray);
      } 
      // If not, try to fetch it from the device
      else {
        try {
          // Try to get the plural property (e.g., readoutmodes)
          console.log(`SelectSetting: Fetching ${pluralProperty} from device`);
          const modesResult = await store.getDeviceProperty(currentId, pluralProperty);
          
          if (modesResult !== null && modesResult !== undefined) {
            modesArray = Array.isArray(modesResult) 
                         ? modesResult 
                         : typeof modesResult === 'string' 
                         ? modesResult.split(',').map(m => m.trim())
                         : null;
            
            console.log(`SelectSetting: Fetched ${pluralProperty}:`, modesArray);
          }
        } catch (modesErr) {
          console.warn(`SelectSetting: Error fetching ${pluralProperty}:`, modesErr);
        }
      }
      
      // Process the modes array if we found it
      if (Array.isArray(modesArray) && modesArray.length > 0) {
        console.log(`SelectSetting: Using modes array for options:`, modesArray);

        // Debug the current options to see what's available
        console.log(`SelectSetting: Current options:`, props.options);

        // Create local options if needed (if props.options is empty)
        if (props.options.length === 0) {
          // This should be performed by the parent component, but we can handle it here as well
          console.log(`SelectSetting: No options provided by parent, will use ${pluralProperty} values`);

          // Log this important case for debugging
          console.warn(`SelectSetting: IMPORTANT - readoutmodes is available but parent didn't provide options`);

          // Initialize options based on the modes array
          // Note: We can't modify props directly, but we can use this for value display
          const dynamicOptions = modesArray.map((mode, index) => {
            return {
              value: index,
              label: String(mode)
            };
          });

          // Store these options for internal use
          internalOptions.value = dynamicOptions;
          console.log(`SelectSetting: Created internal options:`, internalOptions.value);
        }

        console.log(`SelectSetting: Modes array will be used to interpret index values`);
      }
    }
    
    // Try to get the property directly from store cache first
    if (storeDevice.properties && props.property in storeDevice.properties) {
      console.log(`SelectSetting: Using cached value for ${props.property} from store`);
      processReceivedValue(storeDevice.properties[props.property]);
      return;
    }
    
    try {
      // Try using the mixin helper first
      if (typeof getDeviceProperty === 'function') {
        console.log(`SelectSetting: Using mixin getDeviceProperty function`);
        const result = await getDeviceProperty(props.property);
        
        console.log(`SelectSetting: Mixin helper result for ${props.property}:`, result);
        if (result !== null && result !== undefined) {
          processReceivedValue(result);
          return;
        }
      } else {
        console.warn(`SelectSetting: getDeviceProperty is not a function! Type=`, typeof getDeviceProperty);
      }
      
      // Make direct API call as a last resort
      console.log(`SelectSetting: Falling back to direct API call for ${props.property}`);
      const result = await store.getDeviceProperty(currentId, props.property);
      console.log(`SelectSetting: Direct API call result for ${props.property}:`, result);
      
      if (result !== null && result !== undefined) {
        processReceivedValue(result);
        return;
      }
    } catch (directError) {
      console.warn(`SelectSetting: API call failed:`, directError);
      throw directError; // Re-throw to be caught by outer try/catch
    }
  } catch (err) {
    console.error(`SelectSetting: Error fetching ${props.property}:`, err);
    error.value = `Failed to fetch ${props.property}: ${err instanceof Error ? err.message : 'Unknown error'}`;
  }
}

// Helper to process and set the received value
function processReceivedValue(result: unknown) {
  console.log(`SelectSetting: Processing value for ${props.property}:`, result);
  
  // Special handling for index-based values (like readoutmode which references readoutmodes)
  const isNumericValue = typeof result === 'number' || (typeof result === 'string' && !isNaN(Number(result)));
  const propertyEndsWithMode = props.property.toLowerCase().endsWith('mode');
  const hasPluralProperty = props.property.toLowerCase().endsWith('mode') && 
                            props.options.length > 0;
  
  // Special handling for readoutmode property since it's a common case
  if (props.property.toLowerCase() === 'readoutmode' && isNumericValue) {
    // For readoutmode, see if we can find readoutmodes in the store
    const readoutIndex = Number(result);
    console.log(`SelectSetting: readoutmode is ${readoutIndex}, checking for readoutmodes in store`);

    // Check if we can access store device directly
    const device = store.getDeviceById(deviceId.value);
    if (device?.properties?.readoutmodes) {
      const modes = device.properties.readoutmodes;
      console.log(`SelectSetting: Found readoutmodes in store:`, modes);

      // Use the mode at the specified index if available
      if (Array.isArray(modes) && readoutIndex >= 0 && readoutIndex < modes.length) {
        const modeName = modes[readoutIndex];
        console.log(`SelectSetting: Setting readoutmode display value to ${modeName} (index ${readoutIndex})`);
        currentValue.value = readoutIndex;

        // Log a warning if options don't match
        if (props.options.length > 0 &&
            !props.options.some(opt => opt.value === readoutIndex || opt.label === modeName)) {
          console.warn(`SelectSetting: readoutmode options don't match readoutmodes from API`);
        }
      } else {
        console.log(`SelectSetting: Invalid readoutmode index ${readoutIndex}, using raw value`);
        currentValue.value = result;
      }
    } else {
      console.log(`SelectSetting: readoutmodes not found in device properties, using generic handling`);

      // Use generic index-based handling as before
      const index = Number(result);
      const matchingOption = props.options.find((opt, idx) => idx === index || Number(opt.value) === index);

      if (matchingOption) {
        console.log(`SelectSetting: Found matching option at index ${index}:`, matchingOption);
        currentValue.value = matchingOption.value;
      } else {
        console.log(`SelectSetting: No matching option found at index ${index}, using raw value`);
        currentValue.value = result;
      }
    }
  }
  // Generic handling for other index-based properties
  else if (isNumericValue && hasPluralProperty) {
    const index = Number(result);
    console.log(`SelectSetting: ${props.property} appears to be an index (${index}) into a modes array`);

    // Try to find the option with this index or value
    const matchingOption = props.options.find((opt, idx) => idx === index || Number(opt.value) === index);

    if (matchingOption) {
      console.log(`SelectSetting: Found matching option at index ${index}:`, matchingOption);
      currentValue.value = matchingOption.value;
    } else {
      console.log(`SelectSetting: No matching option found at index ${index}, using raw value`);
      currentValue.value = result;
    }
  } 
  // Regular direct value processing
  else if (typeof result === 'string' || typeof result === 'number') {
    currentValue.value = result;
  } else {
    // Try to convert to string as fallback
    currentValue.value = String(result);
    console.warn(`SelectSetting: Unexpected type for ${props.property}, converted to string:`, result);
  }
  
  console.log(`SelectSetting: Final currentValue for ${props.property}:`, currentValue.value);
}

// Save the selected value to the device
async function saveValue(newValue: string | number) {
  if (newValue === currentValue.value) {
    return;
  }

  isSaving.value = true;

  try {
    // Special handling for index-based properties (like readoutmode)
    const isNumericValue = typeof newValue === 'number' || (typeof newValue === 'string' && !isNaN(Number(newValue)));
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
        console.log(`SelectSetting: Mapping ${props.property} value ${newValue} to index ${optionIndex}`);
        valueToSend = optionIndex;
      }
    }
    
    console.log(`SelectSetting: Setting ${props.property} to ${valueToSend} (original: ${newValue})`);
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
    console.error(`SelectSetting: Error saving ${props.property}:`, err);
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
      console.log(`SelectSetting: Force update received for ${props.property}, deviceId: ${currentId}`);
      
      // Wait a brief moment for store updates to propagate
      setTimeout(() => {
        // Get fresh device data directly from store
        const deviceData = store.getDeviceById(currentId);
        console.log(`SelectSetting: Device status direct check: exists=${!!deviceData}, connected=${deviceData?.isConnected}`);
        
        // Only fetch if device exists and is connected
        if (deviceData && deviceData.isConnected) {
          fetchValue().catch(err => {
            console.error(`Force update failed for ${props.property}:`, err);
          });
        } else {
          console.warn(`SelectSetting: Skipping fetch for ${props.property} - device not ready yet`);
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
    console.log(`SelectSetting: deviceId changed from ${oldDeviceId} to ${newDeviceId}`);

    // Update our local reference properly using .value since it's a ref
    deviceId.value = newDeviceId;

    if (newDeviceId) {
      // Log store state for debugging
      logStoreState();
      // Wait briefly for client initialization and then fetch values
      setTimeout(() => fetchValue(), 50);
    }
  }
)

// Initial fetch on component mount with retry logic
onMounted(() => {
  // Setup force update listener
  const cleanup = setupForceUpdateListener();
  
  // Debug current store state
  console.log(`SelectSetting(${props.property}): Mounted with deviceId ${props.deviceId || 'none'}`);
  
  if (props.deviceId) {
    logStoreState();
    
    // Add a tiered retry strategy to handle initialization timing issues
    setTimeout(() => {
      console.log(`SelectSetting: First attempt for ${props.property} on device ${props.deviceId}`);
      fetchValue().catch(err => {
        console.log(`SelectSetting: First attempt failed for ${props.property}, retrying...`);
        
        // First retry after 300ms
        setTimeout(() => {
          console.log(`SelectSetting: Retry 1 for ${props.property} on device ${props.deviceId}`);
          fetchValue().catch(err => {
            console.log(`SelectSetting: Retry 1 failed for ${props.property}, retrying...`);
            
            // Second retry after 1000ms
            setTimeout(() => {
              console.log(`SelectSetting: Retry 2 for ${props.property} on device ${props.deviceId}`);
              fetchValue().catch(err => {
                console.error(`SelectSetting: All retries failed for ${props.property}:`, err);
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