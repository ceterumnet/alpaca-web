// Status: Good - Core Type Definition
// This module provides navigation context type definitions that:
// - Defines panel context and event interfaces
// - Implements context-aware navigation rules
// - Provides action definitions for context rules
// - Supports dynamic UI adaptation
// - Maintains type safety for context operations

/**
 * Represents the context of a panel
 */
export interface PanelContext {
  panelId: string
  deviceType: string
  deviceId?: string
  states: Record<string, unknown>
}

/**
 * Event emitted by a panel
 */
export interface ContextEvent {
  type: string
  source: string
  data: unknown
  timestamp: number
}

/**
 * Rule for context-aware navigation items
 */
export interface ContextRule {
  id: string
  name: string
  condition: (contexts: PanelContext[], events: ContextEvent[]) => boolean
  actions: ContextRuleAction[]
}

/**
 * Action to perform when a context rule is triggered
 */
export interface ContextRuleAction {
  type: 'showNavItem' | 'hideNavItem' | 'enableFeature' | 'disableFeature' | 'showNotification'
  target: string
  params?: Record<string, unknown>
}
