<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import Icon from '@/components/ui/Icon.vue'

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  property: {
    type: String,
    required: false,
    default: ''
  },
  method: {
    type: String,
    required: false,
    default: ''
  },
  params: {
    type: Object,
    default: () => ({})
  },
  label: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'toggle', // toggle, value, action
    validator: (value: string) => ['toggle', 'value', 'action'].includes(value)
  }
})

const emit = defineEmits(['change', 'success', 'error'])

const store = useUnifiedStore()
const isLoading = ref(false)
const error = ref('')
const currentValue = ref<boolean | number | string | null>(null)

// Fetch the current value if property is provided
async function fetchValue() {
  if (!props.property) return

  isLoading.value = true
  error.value = ''

  try {
    const result = await store.getDeviceProperty(props.deviceId, props.property)
    currentValue.value = result
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

// Execute action if method is provided
async function executeAction() {
  if (!props.method) return

  isLoading.value = true
  error.value = ''

  try {
    const result = await store.callDeviceMethod(props.deviceId, props.method, [props.params])
    emit('success', result)
  } catch (err) {
    if (err instanceof Error) {
      error.value = err.message
    } else {
      error.value = 'Unknown error'
    }
    emit('error', error.value)
  } finally {
    isLoading.value = false
  }
}

// Toggle boolean value
async function toggleValue() {
  if (!props.property || typeof currentValue.value !== 'boolean') return

  isLoading.value = true
  error.value = ''

  try {
    await store.setDeviceProperty(props.deviceId, props.property, !currentValue.value)
    currentValue.value = !currentValue.value
    emit('change', currentValue.value)
    emit('success', currentValue.value)
  } catch (err) {
    if (err instanceof Error) {
      error.value = err.message
    } else {
      error.value = 'Unknown error'
    }
    emit('error', error.value)
  } finally {
    isLoading.value = false
  }
}

// Handle click based on component type
function handleClick() {
  if (props.type === 'toggle') {
    toggleValue()
  } else if (props.type === 'action') {
    executeAction()
  }
}

// Formatted display value
const displayValue = computed(() => {
  if (isLoading.value) return '...'
  if (currentValue.value === null) return '—'

  if (typeof currentValue.value === 'boolean') {
    return currentValue.value ? 'ON' : 'OFF'
  }

  if (typeof currentValue.value === 'number') {
    // Format number to 2 decimal places if needed
    return currentValue.value.toString().includes('.')
      ? currentValue.value.toFixed(2)
      : currentValue.value.toString()
  }

  return String(currentValue.value)
})

// CSS classes based on component state
const buttonClasses = computed(() => ({
  'is-loading': isLoading.value,
  'has-error': !!error.value,
  'is-active': props.type === 'toggle' && currentValue.value === true,
  'is-value': props.type === 'value',
  'is-action': props.type === 'action',
  'is-toggle': props.type === 'toggle'
}))

// Initialize
if (props.property) {
  fetchValue()
}
</script>

<template>
  <div class="compact-control" :class="buttonClasses" @click="handleClick">
    <Icon v-if="icon" :name="icon" class="control-icon" />
    <span class="control-label">{{ label }}</span>
    <span v-if="type === 'value'" class="control-value">{{ displayValue }}</span>
    <span v-if="error" class="error-tooltip">{{ error }}</span>
  </div>
</template>

<style scoped>
.compact-control {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 4px;
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  font-size: 0.85rem;
  cursor: pointer;
  position: relative;
  min-height: 32px;
  max-width: 100%;
  transition: all 0.2s ease;
}

.compact-control:hover {
  background-color: var(--color-background-mute);
}

.compact-control.is-loading {
  opacity: 0.7;
  cursor: wait;
}

.compact-control.has-error {
  border-color: var(--color-error);
}

.compact-control.is-active {
  background-color: var(--color-primary-light);
  border-color: var(--color-primary);
}

.control-icon {
  margin-right: 6px;
  font-size: 1rem;
}

.control-label {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.control-value {
  margin-left: auto;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.is-value .control-value {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.error-tooltip {
  position: absolute;
  bottom: -20px;
  left: 0;
  background-color: var(--color-error);
  color: white;
  padding: 2px 6px;
  border-radius: 2px;
  font-size: 0.75rem;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.has-error:hover .error-tooltip {
  opacity: 1;
}
</style>
