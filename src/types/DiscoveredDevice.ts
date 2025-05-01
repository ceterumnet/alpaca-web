// Status: Legacy - To Be Refactored
// This module provides device discovery types that:
// - Will be consolidated with UnifiedDevice interface
// - Currently used for device discovery process
// - Needs restructuring for new discovery service
// - Contains redundant properties to be removed
// - Will be simplified in future updates

export interface DiscoveredDevice {
  // Core discovery properties
  address: string
  port: number
  discoveryTime: string
  AlpacaPort: number

  // Optional server information
  ServerName?: string
  Manufacturer?: string
  ManufacturerVersion?: string
  Location?: string

  // Discovery metadata
  isManualEntry?: boolean

  // Runtime properties (to be moved to UnifiedDevice)
  deviceType?: string
  deviceNumber?: number
  deviceName?: string
  apiBaseUrl?: string
}
