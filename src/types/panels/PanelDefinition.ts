// Status: Good - Core Type Definition
// This module provides panel definition types that:
// - Defines core panel structure and properties
// - Supports device type identification
// - Implements feature configuration
// - Provides default device handling
// - Maintains panel metadata

import type { PanelFeatureDefinition } from './FeatureTypes'

/**
 * Definition of a device panel
 */
export interface PanelDefinition {
  id: string
  deviceType: string
  title: string
  features: PanelFeatureDefinition[]
  defaultDevice?: string
  description?: string
}
