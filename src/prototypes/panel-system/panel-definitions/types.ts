// Panel Definition Types - Based on Alpaca specification
import { UIMode } from '@/stores/useUIPreferencesStore'

// Feature priority levels
export type FeaturePriority = 'primary' | 'secondary' | 'tertiary'

// Interaction types for better categorization
export enum InteractionType {
  ACTION = 'action',
  DYNAMIC_DATA = 'dynamicData',
  SETTING = 'setting',
  MODE = 'mode',
  FEATURE = 'feature'
}

// Common base interface for all panel features
export interface PanelFeature {
  id: string
  name: string
  description: string
  priority: FeaturePriority
  alpacaMethod?: string // The corresponding Alpaca API method
  alpacaProperty?: string // The corresponding Alpaca API property
  interactionType?: InteractionType // The type of interaction this feature represents
  modes: UIMode[] // In which UI modes this feature should be visible
  disabled?: boolean // For optional features that may be disabled based on capabilities
  parameters?: Record<string, unknown> // Parameters for the feature
  isExtended?: boolean // Whether this feature is part of the extended functionality
  visibleWhen?: Record<string, unknown> // Conditional visibility based on other settings/modes
}

// Panel definition interface
export interface PanelDefinition {
  deviceType: string
  name: string
  description: string
  features: PanelFeature[]

  // Default layout settings
  defaultWidth?: number
  defaultHeight?: number

  // Method to filter features based on device capabilities
  filterFeaturesByCapabilities?: (
    features: PanelFeature[],
    capabilities: Record<string, unknown>
  ) => PanelFeature[]
}

// Common capabilities for all device types
export interface CommonCapabilities {
  connected: boolean
  name: string
  description?: string
  driverinfo?: string
  driverversion?: string
  interfaceversion?: number
  supportedactions?: string[]
}
