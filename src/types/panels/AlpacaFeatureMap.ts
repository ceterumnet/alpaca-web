// Status: Good - Core Type Definition
// This module provides Alpaca feature mapping types that:
// - Maps panel features to ASCOM Alpaca API
// - Defines property and method mappings
// - Supports parameter and return type definitions
// - Implements polling configuration
// - Maintains API integration structure

/**
 * Maps panel features to ASCOM Alpaca API methods and properties
 */
export interface AlpacaFeatureMapping {
  featureId: string
  alpacaProperty?: string // If mapped to an ASCOM Alpaca property
  alpacaMethod?: string // If mapped to an ASCOM Alpaca method
  parameters?: string[] // Required parameters for methods
  returnType?: string // Return type for properties/methods
  pollingInterval?: number // Recommended polling interval for dynamic data in milliseconds
  defaultValue?: unknown // Default value to use if property/method is not available
}
