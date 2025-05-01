// Status: Good - Core Type Definition
// This module provides notification type definitions that:
// - Defines notification severity levels and interfaces
// - Supports notification actions and acknowledgments
// - Provides type safety for notification properties
// - Implements notification lifecycle management
// - Maintains consistent notification structure

/**
 * Notification severity levels
 */
export enum NotificationLevel {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
  Critical = 'critical'
}

/**
 * Notification object
 */
export interface Notification {
  id: string
  level: NotificationLevel
  title: string
  message: string
  source?: string
  timestamp: number
  autoDismiss?: boolean
  dismissAfter?: number
  requiresAcknowledgment?: boolean
  acknowledged?: boolean
  actions?: NotificationAction[]
}

/**
 * Action that can be performed on a notification
 */
export interface NotificationAction {
  label: string
  action: string
  params?: Record<string, unknown>
}
