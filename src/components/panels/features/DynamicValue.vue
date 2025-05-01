// Status: Good - Core Component // This is the dynamic value implementation that: // - Provides
real-time value display // - Supports custom value formatting // - Handles proper value updates // -
Implements error handling // - Supports configurable refresh rates /** * Dynamic Value Component * *
Displays real-time device property values with formatting */
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  property: {
    type: String,
    required: true
  },
  unit: {
    type: String,
    default: ''
  },
  formatter: {
    type: Function,
    default: (val: unknown) => val
  },
  pollInterval: {
    type: Number,
    default: 2000 // 2 seconds by default
  }
})

const store = useUnifiedStore()
const value = ref<unknown>(null)
const displayValue = ref<unknown>(null) // Separate display value to prevent flickering
const isInitialLoading = ref(true) // Only true for the very first load
const isUpdating = ref(false) // Used for background updates
const error = ref('')
const pollingInterval = ref<number | null>(null)

// Update display value when actual value changes
watch(value, (newVal) => {
  displayValue.value = newVal
})

// Formatted value with units
const formattedValue = computed(() => {
  // Only show loading when we don't have a value yet AND it's the initial load
  if (isInitialLoading.value && displayValue.value === null) {
    return 'Loading...'
  }

  const formatted = props.formatter(displayValue.value)
  return props.unit ? `${formatted} ${props.unit}` : formatted
})

// Determine if we should show the error indicator
const hasError = computed(() => {
  return !!error.value
})

// Get the detailed error message for tooltip
const errorTooltip = computed(() => {
  if (!error.value) return ''

  // Extract error from AlpacaError if available
  if (error.value.includes('deviceError')) {
    try {
      const errorObj = JSON.parse(error.value.replace(/^Error: /, ''))
      if (errorObj.deviceError?.errorMessage) {
        return errorObj.deviceError.errorMessage
      }
      if (errorObj.deviceError?.errorNumber) {
        return `Error code: ${errorObj.deviceError.errorNumber}`
      }
    } catch {
      // If we can't parse JSON, use the original error
    }
  }

  return error.value
})

// Fetch the property value
async function fetchValue() {
  isUpdating.value = true
  error.value = ''

  try {
    // Use the store's optimized method that tries devicestate first
    const result = await store.getDevicePropertyOptimized(props.deviceId, props.property)

    // Only update the value if it has actually changed to prevent unnecessary re-renders
    if (JSON.stringify(result) !== JSON.stringify(value.value)) {
      value.value = result
    }
  } catch (err) {
    // console.error(`Error fetching property ${props.property}:`, err)

    // Extract error details if it's an AlpacaError
    if (err && typeof err === 'object' && 'deviceError' in err) {
      const alpacaError = err as { deviceError?: { errorNumber: number; errorMessage: string } }
      if (alpacaError.deviceError?.errorMessage) {
        error.value = alpacaError.deviceError.errorMessage
      } else if (alpacaError.deviceError?.errorNumber) {
        error.value = `Error code: ${alpacaError.deviceError.errorNumber}`
      } else {
        error.value = String(err)
      }
    } else if (err instanceof Error) {
      error.value = err.message
    } else {
      error.value = 'Unknown error'
    }
  } finally {
    isUpdating.value = false

    // Only clear the initial loading state after the first successful load
    if (isInitialLoading.value) {
      isInitialLoading.value = false
    }
  }
}

// Start polling
function startPolling() {
  // Stop any existing polling
  stopPolling()

  // Start new polling interval
  pollingInterval.value = window.setInterval(() => {
    fetchValue()
  }, props.pollInterval)
}

// Stop polling
function stopPolling() {
  if (pollingInterval.value !== null) {
    clearInterval(pollingInterval.value)
    pollingInterval.value = null
  }
}

// Initial fetch and setup polling
onMounted(() => {
  fetchValue()
  startPolling()
})

// Clean up polling on component destroy
onBeforeUnmount(() => {
  stopPolling()
})
</script>

<template>
  <div class="dynamic-value">
    <div class="value-header">
      <div class="value-label">{{ label }}</div>
    </div>
    <div
      class="value-content"
      :class="{
        'initial-loading': isInitialLoading && displayValue === null,
        'is-updating': isUpdating
      }"
    >
      <span class="value-text">{{ formattedValue }}</span>
      <div v-if="hasError" class="error-indicator" :title="errorTooltip">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="currentColor"
        >
          <path
            d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dynamic-value {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.value-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.value-label {
  font-size: 0.9em;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.value-content {
  font-size: 1.1em;
  font-weight: 600;
  color: var(--color-text);
  padding: 6px 8px;
  background-color: var(--color-background-soft);
  border-radius: 4px;
  border: 1px solid var(--color-border);
  min-height: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: opacity 0.2s ease;
}

.initial-loading {
  opacity: 0.7;
}

.is-updating {
  /* Very subtle indication of update - barely noticeable */
  opacity: 0.95;
}

.error-indicator {
  color: #f44336;
  cursor: help;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 4px;
}

.value-text {
  flex: 1;
  transition: color 0.2s ease;
}
</style>
