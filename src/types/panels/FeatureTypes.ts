/**
 * Status: Good - Core Component
 * This is the panel feature type definitions that:
 * - Define core panel feature interfaces
 * - Support feature priority levels
 * - Handle interaction types
 * - Provide type safety for panel components
 * - Maintain feature system extensibility
 */

export enum FeatureSource {
  CoreAlpaca = 'core',
  Extended = 'extended'
}

export enum InteractionType {
  Action = 'action',
  DynamicData = 'dynamic',
  Setting = 'setting',
  Mode = 'mode'
}

export enum PriorityLevel {
  Primary = 'primary',
  Secondary = 'secondary',
  Tertiary = 'tertiary'
}

/**
 * Context for evaluating visibility rules
 */
export interface VisibilityContext {
  deviceProperties: Record<string, unknown>
  screenSize: {
    width: number
    height: number
  }
  mode: string
  [key: string]: unknown
}

/**
 * Rule for determining when a feature should be visible
 */
export interface VisibilityRule {
  type: 'deviceProperty' | 'mode' | 'screenSize' | 'custom'
  property?: string
  value?: unknown
  condition?: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains'
  customEvaluator?: (context: VisibilityContext) => boolean
}

/**
 * Definition of a feature in a panel
 */
export interface PanelFeatureDefinition {
  id: string
  label: string
  source: FeatureSource
  interactionType: InteractionType
  priority: PriorityLevel
  component: string
  props?: Record<string, unknown>
  visibilityRules?: VisibilityRule[]
  section?: string
  icon?: string
}
