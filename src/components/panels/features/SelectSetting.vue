<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'

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

const store = useUnifiedStore()
const currentValue = ref<string | number | null>(null)
const isLoading = ref(true)
const isSaving = ref(false)
const error = ref('')

// Find the label for the current value
const currentLabel = computed(() => {
  if (isLoading.value) {
    return 'Loading...'
  }

  if (currentValue.value === null) {
    return 'Unknown'
  }

  const option = props.options.find((opt) => opt.value === currentValue.value)
  return option ? option.label : String(currentValue.value)
})

// Fetch the current value from the device
async function fetchValue() {
  isLoading.value = true
  error.value = ''

  try {
    // Get the property value
    console.log(`SelectSetting: Fetching property ${props.property} for device ${props.deviceId}`);
    
    // Get the device to check for apiBaseUrl
    const device = store.getDeviceById(props.deviceId);
    
    // Try the store method first - with error handling for TypeScript issues
    try {
      const result = await store.getDeviceProperty(props.deviceId, props.property);
      console.log(`SelectSetting: Received value for ${props.property}:`, result);
      
      // Process the result
      processReceivedValue(result);
      return; // Exit if successful
    } catch (storeError) {
      console.warn(`SelectSetting: Store method failed, trying direct API call:`, storeError);
      
      // If the store method fails, try a direct API call if we have the URL
      if (device?.apiBaseUrl) {
        // Use direct API call as fallback
        const endpoint = `${device.apiBaseUrl}/${props.property.toLowerCase()}`;
        console.log(`SelectSetting: Direct fetch from ${endpoint}`);
        
        const response = await fetch(endpoint, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'AlpacaWeb'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`SelectSetting: Direct fetch returned:`, data);
          
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
    console.error('Error in SelectSetting.fetchValue:', err);
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
  // Store the raw value - handle unknown type from API
  if (typeof result === 'string' || typeof result === 'number') {
    currentValue.value = result;
  } else {
    // Try to convert to string as fallback
    currentValue.value = String(result);
    console.warn(`SelectSetting: Unexpected type for ${props.property}, converted to string:`, result);
  }
}

// Save the selected value to the device
async function saveValue(newValue: string | number) {
  if (newValue === currentValue.value) {
    return
  }

  isSaving.value = true
  error.value = ''

  try {
    console.log(`SelectSetting: Setting property ${props.property} to ${newValue} for device ${props.deviceId}`);
    
    // Get the device
    const device = store.getDeviceById(props.deviceId);
    
    // Try the store method first with TypeScript error handling
    try {
      // @ts-expect-error - The store has context typing issues that need to be fixed in a larger refactor
      await store.setDeviceProperty(props.deviceId, props.property, newValue)
      console.log(`SelectSetting: Successfully set ${props.property}`);
    } catch (storeError) {
      console.warn(`SelectSetting: Store method failed, trying direct API call:`, storeError);
      
      // Fallback to direct API call if store method fails
      if (device?.apiBaseUrl) {
        const endpoint = `${device.apiBaseUrl}/${props.property.toLowerCase()}`;
        console.log(`SelectSetting: Direct PUT to ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'AlpacaWeb',
          },
          body: JSON.stringify({ Value: newValue, ClientID: 1, ClientTransactionID: Date.now() })
        });
        
        if (!response.ok) {
          throw new Error(`Direct API call failed with status ${response.status}`);
        }
        
        console.log(`SelectSetting: Successfully set ${props.property} via direct API call`);
      } else {
        throw new Error('No API URL available for direct call');
      }
    }

    // Update current value and emit success
    currentValue.value = newValue
    emit('success', newValue)
    emit('change', newValue)
  } catch (err) {
    console.error('Error in SelectSetting.saveValue:', err);
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

// Handle selection change
function handleChange(event: Event) {
  const target = event.target as HTMLSelectElement
  const value = target.value

  // Convert to number if the original option was a number
  const selectedOption = props.options.find((opt) => String(opt.value) === value)
  if (selectedOption) {
    saveValue(selectedOption.value)
  }
}

// Listen for global force update events
const setupForceUpdateListener = () => {
  const handleForceUpdate = (event: CustomEvent) => {
    // Check if this event is for our device
    if (event.detail && event.detail.deviceId === props.deviceId) {
      console.log(`SelectSetting: Received force update event for ${props.property}`);
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

  console.log(`SelectSetting: Mounted for ${props.property} on device ${props.deviceId}`);
  
  // Try to ensure client exists before fetching
  const device = store.getDeviceById(props.deviceId);
  if (device) {
    console.log(`SelectSetting: Found device ${props.deviceId} with apiBaseUrl:`, device.apiBaseUrl);
  }
  
  // Setup force update listener
  const cleanup = setupForceUpdateListener();
  
  // Add a small delay to give time for client creation in parent components
  setTimeout(() => {
    fetchValue()
      .catch(err => {
        console.warn(`SelectSetting: Initial fetch failed, retrying in 500ms...`, err);
        
        // Retry after a short delay - parent components might still be setting up connections
        setTimeout(() => {
          console.log(`SelectSetting: Retrying fetch for ${props.property}`);
          fetchValue().catch(err => {
            console.error(`SelectSetting: Retry fetch also failed`, err);
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
      <option v-for="option in options" :key="String(option.value)" :value="String(option.value)">
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
}

.current-value {
  font-size: 0.9em;
  font-weight: 500;
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
