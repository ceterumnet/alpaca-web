import { useNotificationStore, type NotificationOptions } from '@/stores/useNotificationStore'

/**
 * NotificationService - A singleton service that provides easy access to the notification system
 */
class NotificationService {
  private static instance: NotificationService | null = null

  /**
   * Get the NotificationService instance (singleton)
   */
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  /**
   * Show a success notification
   * @param message The notification message
   * @param options Optional configuration
   * @returns The notification ID
   */
  public success(message: string, options: NotificationOptions = {}): string {
    const store = useNotificationStore()
    return store.showSuccess(message, options)
  }

  /**
   * Show an error notification
   * @param message The notification message
   * @param options Optional configuration
   * @returns The notification ID
   */
  public error(message: string, options: NotificationOptions = {}): string {
    const store = useNotificationStore()
    return store.showError(message, options)
  }

  /**
   * Show an info notification
   * @param message The notification message
   * @param options Optional configuration
   * @returns The notification ID
   */
  public info(message: string, options: NotificationOptions = {}): string {
    const store = useNotificationStore()
    return store.showInfo(message, options)
  }

  /**
   * Show a warning notification
   * @param message The notification message
   * @param options Optional configuration
   * @returns The notification ID
   */
  public warning(message: string, options: NotificationOptions = {}): string {
    const store = useNotificationStore()
    return store.showWarning(message, options)
  }

  /**
   * Show a generic notification
   * @param message The notification message
   * @param type The notification type (success, error, info, warning)
   * @param options Optional configuration
   * @returns The notification ID
   */
  public notify(
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
    options: NotificationOptions = {}
  ): string {
    const store = useNotificationStore()
    return store.addNotification(message, type, options)
  }

  /**
   * Dismiss a specific notification
   * @param id The notification ID
   */
  public dismiss(id: string): void {
    const store = useNotificationStore()
    store.dismissNotification(id)
  }

  /**
   * Dismiss all active notifications
   */
  public dismissAll(): void {
    const store = useNotificationStore()
    store.dismissAllNotifications()
  }

  /**
   * Clear the notification history
   */
  public clearHistory(): void {
    const store = useNotificationStore()
    store.clearHistory()
  }
}

// Export the singleton instance
export const notificationService = NotificationService.getInstance()

// Export default instance for easier imports
export default notificationService
