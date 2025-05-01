// Status: Good - Core UI Component // This is the toast notification implementation that: // -
Provides user feedback through notifications // - Supports multiple notification types (success,
error, info, warning) // - Handles auto-dismissal and manual close // - Implements proper
positioning and animations // - Supports customizable duration and position

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
    class="aw-toast"
    :class="[
      `aw-toast--${type}`, 
      `aw-toast--${position}`, 
      { 'aw-toast--visible': isVisible }
    ]"
  >
    <div class="aw-toast__content">
      <div v-if="type === 'success'" class="aw-toast__icon aw-toast__icon--success">✓</div>
      <div v-else-if="type === 'error'" class="aw-toast__icon aw-toast__icon--error">✗</div>
      <div v-else-if="type === 'warning'" class="aw-toast__icon aw-toast__icon--warning">!</div>
      <div v-else-if="type === 'info'" class="aw-toast__icon aw-toast__icon--info">i</div>

      <div class="aw-toast__message">{{ message }}</div>

      <button class="aw-toast__close" @click="close">×</button>
    </div>
    <div class="aw-toast__progress" :style="{ animationDuration: `${duration}ms` }"></div>
  </div>
</template>

<style scoped>
.aw-toast {
  position: fixed;
  min-width: 300px;
  max-width: 400px;
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-panel-content-color);
  box-shadow: var(--aw-shadow-md);
  border-radius: var(--aw-border-radius-md);
  padding: var(--aw-spacing-md);
  z-index: 9999;
  transition: all 0.3s ease;
  opacity: 0;
  transform: translateY(-20px);
  pointer-events: none;
  border-left: 4px solid transparent;
}

.aw-toast--visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

/* Position styles */
.aw-toast--top-right {
  top: 80px;
  right: var(--aw-spacing-md);
}

.aw-toast--top-left {
  top: 80px;
  left: var(--aw-spacing-md);
}

.aw-toast--bottom-right {
  bottom: var(--aw-spacing-md);
  right: var(--aw-spacing-md);
}

.aw-toast--bottom-left {
  bottom: var(--aw-spacing-md);
  left: var(--aw-spacing-md);
}

.aw-toast--top-center {
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
}

.aw-toast--bottom-center {
  bottom: var(--aw-spacing-md);
  left: 50%;
  transform: translateX(-50%);
}

.aw-toast--visible.aw-toast--top-center,
.aw-toast--visible.aw-toast--bottom-center {
  transform: translateX(-50%) translateY(0);
}

/* Type styles */
.aw-toast--success {
  border-left-color: var(--aw-color-success-500);
}

.aw-toast--error {
  border-left-color: var(--aw-color-error-500);
}

.aw-toast--warning {
  border-left-color: var(--aw-color-warning-500);
}

.aw-toast--info {
  border-left-color: var(--aw-color-primary-500);
}

.aw-toast__content {
  display: flex;
  align-items: center;
}

.aw-toast__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  margin-right: var(--aw-spacing-md);
  font-weight: bold;
}

.aw-toast__icon--success {
  background-color: var(--aw-color-success-500);
  color: white;
}

.aw-toast__icon--error {
  background-color: var(--aw-color-error-500);
  color: white;
}

.aw-toast__icon--warning {
  background-color: var(--aw-color-warning-500);
  color: white;
}

.aw-toast__icon--info {
  background-color: var(--aw-color-primary-500);
  color: white;
}

.aw-toast__message {
  flex: 1;
}

.aw-toast__close {
  background: none;
  border: none;
  color: var(--aw-panel-content-color);
  opacity: 0.5;
  font-size: 20px;
  cursor: pointer;
  margin-left: var(--aw-spacing-sm);
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  transition: opacity 0.2s ease;
}

.aw-toast__close:hover {
  opacity: 1;
}

.aw-toast__progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 4px;
  background-color: rgba(0, 0, 0, 0.1);
  width: 100%;
  border-radius: 0 0 var(--aw-border-radius-md) var(--aw-border-radius-md);
  overflow: hidden;
}

.aw-toast__progress::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 100%;
  background-color: var(--aw-color-primary-300, rgba(0, 0, 0, 0.2));
  animation: progress-animation linear forwards;
}

@keyframes progress-animation {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(100%);
  }
}

/* Dark theme adjustments */
:root .dark-theme .aw-toast__progress {
  background-color: rgba(255, 255, 255, 0.1);
}

:root .dark-theme .aw-toast__progress::after {
  background-color: var(--aw-color-primary-300, rgba(255, 255, 255, 0.2));
}
</style>
