// Status: Good - Core Store
// This is the notification store that:
// - Manages global notification state
// - Handles notification queuing and lifecycle
// - Provides notification actions and getters
// - Supports different notification types
// - Maintains notification history

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
  acknowledged?: boolean
  requiresAcknowledgment?: boolean
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
  requiresAcknowledgment?: boolean
}

export interface NotificationFilter {
  types?: NotificationType[]
  readState?: boolean
  acknowledgedState?: boolean
  timeRange?: {
    start?: number
    end?: number
  }
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

  // Filter notifications based on criteria
  function filterNotifications(filter: NotificationFilter = {}) {
    return notifications.value.filter((notification) => {
      // Filter by type
      if (filter.types && filter.types.length > 0) {
        if (!filter.types.includes(notification.type)) {
          return false
        }
      }

      // Filter by read state
      if (typeof filter.readState === 'boolean') {
        if (notification.read !== filter.readState) {
          return false
        }
      }

      // Filter by acknowledged state
      if (typeof filter.acknowledgedState === 'boolean') {
        if ((notification.acknowledged ?? false) !== filter.acknowledgedState) {
          return false
        }
      }

      // Filter by time range
      if (filter.timeRange) {
        if (filter.timeRange.start && notification.timestamp < filter.timeRange.start) {
          return false
        }
        if (filter.timeRange.end && notification.timestamp > filter.timeRange.end) {
          return false
        }
      }

      return true
    })
  }

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
      position: options.position ?? 'top-right',
      requiresAcknowledgment: options.requiresAcknowledgment ?? false,
      acknowledged: false
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

  // Acknowledge a notification
  function acknowledgeNotification(id: string): void {
    const notification = notifications.value.find((n) => n.id === id)
    if (notification) {
      notification.acknowledged = true
      // If it doesn't require being kept visible after acknowledgment, mark as read
      if (!notification.requiresAcknowledgment) {
        notification.read = true
      }
    }
  }

  // Acknowledge all notifications
  function acknowledgeAll(): void {
    notifications.value.forEach((n) => {
      n.acknowledged = true
      if (!n.requiresAcknowledgment) {
        n.read = true
      }
    })
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

  // Export notification history to JSON file
  function exportNotificationHistory(): string {
    const historyData = notificationHistory.value.map((notification) => ({
      id: notification.id,
      message: notification.message,
      type: notification.type,
      timestamp: notification.timestamp,
      time: new Date(notification.timestamp).toISOString(),
      read: notification.read,
      acknowledged: notification.acknowledged
    }))

    const dataStr = JSON.stringify(historyData, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)

    return dataUri
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
    clearHistory,
    filterNotifications,
    acknowledgeNotification,
    acknowledgeAll,
    exportNotificationHistory
  }
})
