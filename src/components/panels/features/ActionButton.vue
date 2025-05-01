// Status: Good - Core Component // This is the action button implementation that: // - Provides
device method execution // - Handles loading and error states // - Supports custom button styling //
- Implements proper error handling // - Provides action feedback /** * Action Button Component * *
Executes device methods with loading and error states */
<script setup lang="ts">
import { ref } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import Button from '@/components/ui/Button.vue'

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  method: {
    type: String,
    required: true
  },
  params: {
    type: Object,
    default: () => ({})
  },
  icon: {
    type: String,
    default: ''
  },
  confirmText: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['success', 'error'])

const store = useUnifiedStore()
const isLoading = ref(false)
const lastError = ref('')

// Execute the action on the device
async function executeAction() {
  // If there's confirmation text, ask for confirmation
  if (props.confirmText && !window.confirm(props.confirmText)) {
    return
  }

  isLoading.value = true
  lastError.value = ''

  try {
    // Call the device method with parameters
    const result = await store.callDeviceMethod(props.deviceId, props.method, [props.params])

    // Emit success event with result
    emit('success', result)
  } catch (error) {
    // Store and emit error
    if (error instanceof Error) {
      lastError.value = error.message
    } else {
      lastError.value = 'Unknown error occurred'
    }
    emit('error', lastError.value)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="action-button-feature">
    <Button :disabled="isLoading" :icon="icon" class="visible-button" @click="executeAction">
      {{ label }}
    </Button>

    <div v-if="lastError" class="error-message">
      {{ lastError }}
    </div>
  </div>
</template>

<style scoped>
.action-button-feature {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.visible-button {
  color: var(--color-text);
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.error-message {
  color: var(--color-error);
  font-size: 0.85em;
  margin-top: 4px;
}
</style>
