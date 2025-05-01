<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
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

const store = useUnifiedStore()
const isOn = ref(false)
const isLoading = ref(true)
const isSaving = ref(false)
const error = ref('')

// Formatted label based on current state
const stateLabel = computed(() => {
  if (isLoading.value) {
    return 'Loading...'
  }

  return isOn.value ? props.onLabel : props.offLabel
})

// Fetch the current state from the device
async function fetchState() {
  isLoading.value = true
  error.value = ''

  try {
    // Get the property value
    const result = await store.getDeviceProperty(props.deviceId, props.property)

    // Convert to boolean if possible
    if (typeof result === 'boolean') {
      isOn.value = result
    } else if (typeof result === 'number') {
      isOn.value = result !== 0
    } else if (typeof result === 'string') {
      isOn.value = result.toLowerCase() === 'true' || result === '1'
    } else {
      error.value = 'Unexpected value type'
    }
  } catch (err) {
    if (err instanceof Error) {
      error.value = err.message
    } else {
      error.value = 'Unknown error occurred'
    }
  } finally {
    isLoading.value = false
  }
}

// Save the new state to the device
async function saveState(newState: boolean) {
  isSaving.value = true
  error.value = ''

  try {
    // Use the put method to set the property
    await store.setDeviceProperty(props.deviceId, props.property, newState)

    // Update state and emit success
    isOn.value = newState
    emit('success', newState)
    emit('change', newState)
  } catch (err) {
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

// Handle toggle change
function handleToggle() {
  if (isLoading.value || isSaving.value) {
    return
  }

  saveState(!isOn.value)
}

// Watch for device ID changes
watch(
  () => props.deviceId,
  () => {
    if (props.deviceId) {
      fetchState()
    }
  }
)

// Initial fetch on component mount
onMounted(() => {
  if (props.deviceId) {
    fetchState()
  }
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

.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
  margin-top: 4px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-background-mute);
  transition: 0.4s;
  border-radius: 24px;
  border: 1px solid var(--color-border);
}

.slider:before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 2px;
  background-color: var(--color-text);
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--color-primary);
}

input:focus + .slider {
  box-shadow: 0 0 1px var(--color-primary);
}

input:checked + .slider:before {
  transform: translateX(24px);
  background-color: white;
}

input:disabled + .slider {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  color: var(--color-error);
  font-size: 0.85em;
  margin-top: 4px;
}

.toggle-switch.is-loading {
  opacity: 0.7;
}

.toggle-switch.has-error .toggle-label,
.toggle-switch.has-error .toggle-value {
  color: var(--color-error);
}
</style>
