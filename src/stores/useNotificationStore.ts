import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { v4 as uuidv4 } from 'uuid'

export type NotificationType = 'success' | 'error' | 'info' | 'warning'

export interface Notification {
  id: string
  message: string
  type: NotificationType
  timestamp: number
  duration?: number
  read: boolean
  autoDismiss: boolean
  position?:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-center'
    | 'bottom-center'
}

export interface NotificationOptions {
  duration?: number
  autoDismiss?: boolean
  position?:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-center'
    | 'bottom-center'
}

export const useNotificationStore = defineStore('notifications', () => {
  // State
  const notifications = ref<Notification[]>([])
  const maxHistory = ref(50)

  // Computed properties
  const unreadNotifications = computed(() => {
    return notifications.value.filter((n) => !n.read)
  })

  const activeNotifications = computed(() => {
    return notifications.value.filter((n) => !n.read && n.autoDismiss)
  })

  const notificationHistory = computed(() => {
    return [...notifications.value].sort((a, b) => b.timestamp - a.timestamp)
  })

  // Add a notification
  function addNotification(
    message: string,
    type: NotificationType = 'info',
    options: NotificationOptions = {}
  ): string {
    const id = uuidv4()
    const notification: Notification = {
      id,
      message,
      type,
      timestamp: Date.now(),
      duration: options.duration ?? 5000, // Default 5 seconds
      read: false,
      autoDismiss: options.autoDismiss ?? true,
      position: options.position ?? 'top-right'
    }

    notifications.value.push(notification)

    // Trim history if needed
    if (notifications.value.length > maxHistory.value) {
      // Remove read notifications first
      const firstUnread = notifications.value.findIndex((n) => !n.read)
      if (firstUnread > 0) {
        notifications.value.splice(0, firstUnread)
      }
      // If still over limit, remove oldest
      if (notifications.value.length > maxHistory.value) {
        notifications.value = notifications.value.slice(-maxHistory.value)
      }
    }

    return id
  }

  // Type-specific helpers
  function showSuccess(message: string, options: NotificationOptions = {}): string {
    return addNotification(message, 'success', options)
  }

  function showError(message: string, options: NotificationOptions = {}): string {
    return addNotification(message, 'error', options)
  }

  function showInfo(message: string, options: NotificationOptions = {}): string {
    return addNotification(message, 'info', options)
  }

  function showWarning(message: string, options: NotificationOptions = {}): string {
    return addNotification(message, 'warning', options)
  }

  // Mark notification as read
  function markAsRead(id: string): void {
    const notification = notifications.value.find((n) => n.id === id)
    if (notification) {
      notification.read = true
    }
  }

  // Dismiss a notification
  function dismissNotification(id: string): void {
    markAsRead(id)
  }

  // Dismiss all notifications
  function dismissAllNotifications(): void {
    notifications.value.forEach((n) => (n.read = true))
  }

  // Clear notification history
  function clearHistory(): void {
    // Keep unread notifications
    notifications.value = notifications.value.filter((n) => !n.read)
  }

  // Set up listeners for UnifiedStore events
  function setupStoreListeners(): void {
    const unifiedStore = useUnifiedStore()

    // Add event listeners
    unifiedStore.addEventListener((event) => {
      switch (event.type) {
        case 'deviceAdded':
          showSuccess(`Device added: ${event.device.name}`)
          break
        case 'deviceRemoved':
          showInfo(`Device removed`)
          break
        case 'deviceUpdated':
          if (event.updates.isConnected === true) {
            showSuccess(
              `Connected to ${unifiedStore.getDeviceById(event.deviceId)?.name || 'device'}`
            )
          } else if (event.updates.isConnected === false) {
            showInfo(
              `Disconnected from ${unifiedStore.getDeviceById(event.deviceId)?.name || 'device'}`
            )
          }
          break
        case 'discoveryStarted':
          showInfo('Device discovery started')
          break
        case 'discoveryStopped':
          showInfo('Device discovery completed')
          break
      }
    })
  }

  // Call setup on store creation
  setupStoreListeners()

  return {
    // State
    notifications,
    maxHistory,

    // Computed
    unreadNotifications,
    activeNotifications,
    notificationHistory,

    // Methods
    addNotification,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    markAsRead,
    dismissNotification,
    dismissAllNotifications,
    clearHistory
  }
})
