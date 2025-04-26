<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

defineOptions({
  name: 'ToastNotification'
})

const props = defineProps({
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'success', // success, error, info, warning
    validator: (value: string) => ['success', 'error', 'info', 'warning'].includes(value)
  },
  duration: {
    type: Number,
    default: 3000 // milliseconds
  },
  position: {
    type: String,
    default: 'top-right', // top-right, top-left, bottom-right, bottom-left, top-center, bottom-center
    validator: (value: string) =>
      [
        'top-right',
        'top-left',
        'bottom-right',
        'bottom-left',
        'top-center',
        'bottom-center'
      ].includes(value)
  }
})

const emit = defineEmits(['close'])

const isVisible = ref(false)
let timeout: number | null = null

const close = () => {
  isVisible.value = false
  emit('close')
}

onMounted(() => {
  // Show toast after a brief delay to allow for animation
  setTimeout(() => {
    isVisible.value = true

    // Auto-hide after duration
    if (props.duration > 0) {
      timeout = window.setTimeout(close, props.duration)
    }
  }, 100)
})

onBeforeUnmount(() => {
  // Clear any existing timeout
  if (timeout !== null) {
    clearTimeout(timeout)
  }
})
</script>

<template>
  <div
    class="toast-notification"
    :class="[`toast-${type}`, `toast-${position}`, { 'toast-visible': isVisible }]"
  >
    <div class="toast-content">
      <div v-if="type === 'success'" class="toast-icon success">✓</div>
      <div v-else-if="type === 'error'" class="toast-icon error">✗</div>
      <div v-else-if="type === 'warning'" class="toast-icon warning">!</div>
      <div v-else-if="type === 'info'" class="toast-icon info">i</div>

      <div class="toast-message">{{ message }}</div>

      <button class="toast-close" @click="close">×</button>
    </div>
    <div class="toast-progress" :style="{ animationDuration: `${duration}ms` }"></div>
  </div>
</template>

<style scoped>
.toast-notification {
  position: fixed;
  min-width: 300px;
  max-width: 400px;
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-panel-content-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  padding: 16px;
  z-index: 1000;
  transition: all 0.3s ease;
  opacity: 0;
  transform: translateY(-20px);
  pointer-events: none;
  border-left: 4px solid transparent;
}

.toast-visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

/* Position styles */
.toast-top-right {
  top: 20px;
  right: 20px;
}

.toast-top-left {
  top: 20px;
  left: 20px;
}

.toast-bottom-right {
  bottom: 20px;
  right: 20px;
}

.toast-bottom-left {
  bottom: 20px;
  left: 20px;
}

.toast-top-center {
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
}

.toast-bottom-center {
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
}

.toast-visible.toast-top-center,
.toast-visible.toast-bottom-center {
  transform: translateX(-50%) translateY(0);
}

/* Type styles */
.toast-success {
  border-left-color: #4caf50;
}

.toast-error {
  border-left-color: #f44336;
}

.toast-warning {
  border-left-color: #ff9800;
}

.toast-info {
  border-left-color: #2196f3;
}

.toast-content {
  display: flex;
  align-items: center;
}

.toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  margin-right: 12px;
  font-weight: bold;
}

.toast-icon.success {
  background-color: #4caf50;
  color: white;
}

.toast-icon.error {
  background-color: #f44336;
  color: white;
}

.toast-icon.warning {
  background-color: #ff9800;
  color: white;
}

.toast-icon.info {
  background-color: #2196f3;
  color: white;
}

.toast-message {
  flex: 1;
}

.toast-close {
  background: none;
  border: none;
  color: var(--aw-panel-content-color);
  opacity: 0.5;
  font-size: 20px;
  cursor: pointer;
  margin-left: 8px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.toast-close:hover {
  opacity: 1;
}

.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 4px;
  background-color: rgba(255, 255, 255, 0.1);
  width: 100%;
  border-radius: 0 0 8px 8px;
  overflow: hidden;
}

.toast-progress::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 100%;
  background-color: rgba(255, 255, 255, 0.2);
  animation: progress-animation linear forwards;
}

@keyframes progress-animation {
  0% {
    width: 100%;
  }
  100% {
    width: 0%;
  }
}
</style>
