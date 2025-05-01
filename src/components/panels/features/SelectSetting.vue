<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
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
    const result = await store.getDeviceProperty(props.deviceId, props.property)
    currentValue.value = result as string | number
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

// Save the selected value to the device
async function saveValue(newValue: string | number) {
  if (newValue === currentValue.value) {
    return
  }

  isSaving.value = true
  error.value = ''

  try {
    // Use the put method to set the property
    await store.setDeviceProperty(props.deviceId, props.property, newValue)

    // Update current value and emit success
    currentValue.value = newValue
    emit('success', newValue)
    emit('change', newValue)
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
