<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
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
  contextProperty: {
    type: String,
    required: true
  },
  conditions: {
    type: Array as () => Array<{
      value: any
      component: string
      props?: Record<string, any>
    }>,
    required: true
  },
  defaultComponent: {
    type: String,
    default: ''
  },
  defaultProps: {
    type: Object,
    default: () => ({})
  },
  pollingInterval: {
    type: Number,
    default: 2000 // ms
  }
})

const emit = defineEmits(['contextChange'])

const store = useUnifiedStore()
const contextValue = ref<any>(null)
const isLoading = ref(false)
const error = ref('')
let pollingTimer: number | null = null

// Determine which component to show based on context
const activeComponent = computed(() => {
  // If we have no context value yet, use default
  if (contextValue.value === null) {
    return {
      component: props.defaultComponent,
      props: props.defaultProps
    }
  }

  // Find matching condition
  const matchingCondition = props.conditions.find((condition) => {
    if (Array.isArray(condition.value)) {
      return condition.value.includes(contextValue.value)
    }
    return condition.value === contextValue.value
  })

  if (matchingCondition) {
    return {
      component: matchingCondition.component,
      props: matchingCondition.props || {}
    }
  }

  // Fallback to default
  return {
    component: props.defaultComponent,
    props: props.defaultProps
  }
})

// Fetch the context property value
async function fetchContextValue() {
  if (!props.deviceId || !props.contextProperty) return

  isLoading.value = true
  error.value = ''

  try {
    const result = await store.getDeviceProperty(props.deviceId, props.contextProperty)
    contextValue.value = result
    emit('contextChange', {
      property: props.contextProperty,
      value: result,
      component: activeComponent.value.component
    })
  } catch (err) {
    if (err instanceof Error) {
      error.value = err.message
    } else {
      error.value = 'Unknown error'
    }
  } finally {
    isLoading.value = false
  }
}

// Start polling for context property
function startPolling() {
  if (pollingTimer !== null) {
    clearInterval(pollingTimer)
  }

  fetchContextValue() // Initial fetch

  // Set up interval
  pollingTimer = window.setInterval(() => {
    fetchContextValue()
  }, props.pollingInterval)
}

// Stop polling
function stopPolling() {
  if (pollingTimer !== null) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

// Watch for device ID changes
watch(
  () => props.deviceId,
  (newId) => {
    if (newId) {
      startPolling()
    } else {
      stopPolling()
    }
  }
)

// Cleanup when component is destroyed
onMounted(() => {
  if (props.deviceId) {
    startPolling()
  }

  return () => {
    stopPolling()
  }
})
</script>

<template>
  <div class="context-sensitive-control" :class="{ 'is-loading': isLoading, 'has-error': !!error }">
    <div class="control-header">
      <label class="control-label">{{ label }}</label>
      <div v-if="isLoading" class="loading-indicator">Loading...</div>
      <div v-if="error" class="error-message">{{ error }}</div>
    </div>

    <div class="control-content">
      <component :is="activeComponent.component" v-bind="{ ...activeComponent.props, deviceId }" />
    </div>
  </div>
</template>

<style scoped>
.context-sensitive-control {
  margin-bottom: 16px;
}

.control-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.control-label {
  font-weight: 500;
  color: var(--color-text);
}

.loading-indicator {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  font-style: italic;
}

.error-message {
  color: var(--color-error);
  font-size: 0.85rem;
}

.control-content {
  position: relative;
  transition: all 0.3s ease;
}

.is-loading .control-content {
  opacity: 0.7;
}
</style>
