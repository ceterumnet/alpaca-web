// Status: Good - Core UI Component // This is the notification center implementation that: // -
Manages and displays system notifications // - Handles notification queuing and prioritization // -
Implements smooth animations and transitions // - Supports accessibility features // - Provides
notification history management

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useNotificationStore, type Notification } from '@/stores/useNotificationStore'
import ToastNotification from '@/components/ui/ToastNotification.vue'

defineOptions({
  name: 'NotificationCenter'
})

// Get the notification store
const notificationStore = useNotificationStore()

// Track displayed notifications to handle animations
const displayedNotifications = ref<Map<string, boolean>>(new Map())

// Add notifications that are not yet displayed to the displayed set
const activeNotifications = computed(() => {
  return notificationStore.activeNotifications
})

// Maximum displayed notifications to prevent overwhelming the UI
const maxDisplayedNotifications = ref(5)

// Visible notifications, limited by maxDisplayedNotifications
const visibleNotifications = computed(() => {
  return activeNotifications.value.slice(0, maxDisplayedNotifications.value)
})

// Count of additional notifications not shown
const hiddenNotificationCount = computed(() => {
  return Math.max(0, activeNotifications.value.length - maxDisplayedNotifications.value)
})

// Watch for new notifications
watch(
  () => notificationStore.notifications,
  () => {
    // Update displayed notifications map
    const newMap = new Map(displayedNotifications.value)

    // Add any new notifications to the displayed map
    for (const notification of notificationStore.notifications) {
      if (!notification.read && !newMap.has(notification.id)) {
        newMap.set(notification.id, true)
      }
    }

    displayedNotifications.value = newMap
  },
  { deep: true }
)

// Handle notification close
function handleClose(notification: Notification): void {
  notificationStore.dismissNotification(notification.id)
}

// Handle keyboard events for accessibility
function handleKeyDown(event: KeyboardEvent, notification: Notification): void {
  if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
    event.preventDefault()
    handleClose(notification)
  }
}

// Clear notifications that are no longer active from the displayed map
function cleanupDisplayedNotifications(): void {
  const newMap = new Map<string, boolean>()

  for (const notification of notificationStore.activeNotifications) {
    if (displayedNotifications.value.has(notification.id)) {
      newMap.set(notification.id, true)
    }
  }

  displayedNotifications.value = newMap
}

// Set up periodic cleanup
let cleanupInterval: number | null = null

onMounted(() => {
  cleanupInterval = window.setInterval(cleanupDisplayedNotifications, 10000)
})

onBeforeUnmount(() => {
  if (cleanupInterval !== null) {
    clearInterval(cleanupInterval)
  }
})
</script>

<template>
  <div class="aw-notification-center">
    <!-- Main toast notification container -->
    <Teleport to="body">
      <TransitionGroup name="aw-toast-group">
        <ToastNotification
          v-for="notification in visibleNotifications"
          :key="notification.id"
          :message="notification.message"
          :type="notification.type"
          :duration="notification.duration"
          :position="notification.position"
          tabindex="0"
          role="alert"
          aria-live="polite"
          @close="() => handleClose(notification)"
          @keydown="(e: KeyboardEvent) => handleKeyDown(e, notification)"
        />
      </TransitionGroup>
    </Teleport>

    <!-- Hidden notification count indicator (only shown when needed) -->
    <Teleport to="body">
      <div
        v-if="hiddenNotificationCount > 0"
        class="aw-notification-center__counter"
        @click="notificationStore.dismissAllNotifications()"
      >
        +{{ hiddenNotificationCount }} more notifications
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.aw-notification-center {
  /* Container is only for organization - actual notifications are teleported to body */
}

.aw-toast-group-enter-active,
.aw-toast-group-leave-active {
  transition: all 0.3s ease;
}

.aw-toast-group-enter-from,
.aw-toast-group-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* Group move transition */
.aw-toast-group-move {
  transition: transform 0.3s;
}

.aw-notification-center__counter {
  position: fixed;
  bottom: var(--aw-spacing-md);
  right: var(--aw-spacing-md);
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
  padding: var(--aw-spacing-xs) var(--aw-spacing-sm);
  border-radius: var(--aw-border-radius-lg);
  font-size: 0.8rem;
  z-index: 9999;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: var(--aw-shadow-sm);
  /* stylelint-disable-next-line */
  border: 1px solid var(--aw-panel-border-color);
}

.aw-notification-center__counter:hover {
  background-color: var(--aw-panel-resize-bg-color);
  box-shadow: var(--aw-shadow-md);
}

/* Focus state for accessibility */
.aw-notification-center__counter:focus-visible {
  outline: 2px solid var(--aw-color-primary-500);
  outline-offset: 2px;
}
</style>
