export interface DiscoveredDevice {
  address: string
  port: number
  discoveryTime: string
  AlpacaPort: number
  ServerName?: string
  Manufacturer?: string
  ManufacturerVersion?: string
  Location?: string
  isManualEntry?: boolean

  // Additional properties used in the component
  serverAddress?: string
  serverPort?: number
  serverName?: string
  manufacturer?: string
  deviceType?: string
  deviceNumber?: number
  deviceName?: string
  apiBaseUrl?: string
}
