// Status: Good - Core Component // This is the numeric setting implementation that: // - Provides
type-safe numeric value control // - Handles proper value validation and constraints // - Supports
both slider and direct input // - Implements proper error handling // - Provides real-time value
updates /** * Numeric Setting Component * * Provides numeric value control with slider and direct
input */
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

  try {
    // Get the property value
    const result = await store.getDeviceProperty(props.deviceId, props.property)

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

// Save the edited value to the device
async function saveValue() {
  if (editedValue.value === null || editedValue.value === currentValue.value) {
    return
  }

  isSaving.value = true
  error.value = ''

  try {
    // Use the put method to set the property
    await store.setDeviceProperty(props.deviceId, props.property, editedValue.value)

    // Update current value and emit success
    currentValue.value = editedValue.value
    emit('success', editedValue.value)
    emit('change', editedValue.value)
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

// Watch for device ID changes
watch(
  () => props.deviceId,
  () => {
    if (props.deviceId) {
      fetchValue()
    }
  }
)

// Initial fetch on component mount
onMounted(() => {
  if (props.deviceId) {
    fetchValue()
  }
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
