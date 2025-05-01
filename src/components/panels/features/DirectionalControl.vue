<template>
  <div class="directional-control">
    <div class="direction-controls">
      <button class="dir-btn north" :disabled="disabled" @click="moveNorth">
        <span>N</span>
      </button>
      <div class="middle-row">
        <button class="dir-btn west" :disabled="disabled" @click="moveWest">
          <span>W</span>
        </button>
        <button class="dir-btn stop" :disabled="!isSlewing" @click="stopSlew">
          <span>Stop</span>
        </button>
        <button class="dir-btn east" :disabled="disabled" @click="moveEast">
          <span>E</span>
        </button>
      </div>
      <button class="dir-btn south" :disabled="disabled" @click="moveSouth">
        <span>S</span>
      </button>
      <button class="dir-btn home" :disabled="disabled" @click="findHome">
        <span>Home</span>
      </button>
    </div>
    <div v-if="hasError" class="error-message">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const isSlewing = ref(false)
const hasError = ref(false)
const errorMessage = ref('')
const store = useUnifiedStore()

// Clear error state
function clearError() {
  hasError.value = false
  errorMessage.value = ''
}

// Handle error from Alpaca response
function handleError(error: unknown, action: string) {
  console.error(`Error ${action}:`, error)
  hasError.value = true

  // Extract error message from AlpacaError if available
  if (error && typeof error === 'object' && 'deviceError' in error) {
    const alpacaError = error as { deviceError?: { errorNumber: number; errorMessage: string } }
    if (alpacaError.deviceError?.errorMessage) {
      errorMessage.value = alpacaError.deviceError.errorMessage
    } else if (alpacaError.deviceError?.errorNumber) {
      errorMessage.value = `Error code: ${alpacaError.deviceError.errorNumber}`
    } else {
      errorMessage.value = `Failed to ${action}`
    }
  } else if (error && error instanceof Error) {
    errorMessage.value = error.message
  } else {
    errorMessage.value = `Failed to ${action}`
  }

  // Reset slewing state when error occurs
  isSlewing.value = false
}

async function moveNorth() {
  clearError()
  isSlewing.value = true
  try {
    // @ts-expect-error - TypeScript context issues with store method
    await store.callDeviceMethod(props.deviceId, 'MoveAxis', [{ Axis: 1, Rate: 0.5 }])
  } catch (error) {
    handleError(error, 'move telescope north')
  }
}

async function moveSouth() {
  clearError()
  isSlewing.value = true
  try {
    // @ts-expect-error - TypeScript context issues with store method
    await store.callDeviceMethod(props.deviceId, 'MoveAxis', [{ Axis: 1, Rate: -0.5 }])
  } catch (error) {
    handleError(error, 'move telescope south')
  }
}

async function moveEast() {
  clearError()
  isSlewing.value = true
  try {
    // @ts-expect-error - TypeScript context issues with store method
    await store.callDeviceMethod(props.deviceId, 'MoveAxis', [{ Axis: 0, Rate: 0.5 }])
  } catch (error) {
    handleError(error, 'move telescope east')
  }
}

async function moveWest() {
  clearError()
  isSlewing.value = true
  try {
    // @ts-expect-error - TypeScript context issues with store method
    await store.callDeviceMethod(props.deviceId, 'MoveAxis', [{ Axis: 0, Rate: -0.5 }])
  } catch (error) {
    handleError(error, 'move telescope west')
  }
}

async function stopSlew() {
  clearError()
  try {
    // @ts-expect-error - TypeScript context issues with store method
    await store.callDeviceMethod(props.deviceId, 'AbortSlew', [])
    isSlewing.value = false
  } catch (error) {
    handleError(error, 'stop telescope slew')
  }
}

async function findHome() {
  clearError()
  try {
    // @ts-expect-error - TypeScript context issues with store method
    await store.callDeviceMethod(props.deviceId, 'FindHome', [])
  } catch (error) {
    handleError(error, 'find home position')
  }
}
</script>

<style scoped>
.directional-control {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.direction-controls {
  display: grid;
  grid-template-rows: auto auto auto auto;
  justify-items: center;
  gap: 8px;
  margin-top: 10px;
}

.middle-row {
  display: grid;
  grid-template-columns: auto auto auto;
  gap: 8px;
  width: 100%;
}

.dir-btn {
  width: 60px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dir-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.25);
  transform: translateY(-2px);
}

.dir-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dir-btn.stop {
  background: rgba(244, 67, 54, 0.15);
  color: #f44336;
}

.dir-btn.stop:hover:not(:disabled) {
  background: rgba(244, 67, 54, 0.25);
}

.dir-btn.home {
  background: rgba(33, 150, 243, 0.15);
  color: #2196f3;
  width: 100%;
  margin-top: 8px;
}

.dir-btn.home:hover:not(:disabled) {
  background: rgba(33, 150, 243, 0.25);
}

.error-message {
  color: #f44336;
  margin-top: 10px;
  padding: 8px;
  background: rgba(244, 67, 54, 0.1);
  border-radius: 4px;
  text-align: center;
  width: 100%;
  font-size: 0.9rem;
}
</style>
