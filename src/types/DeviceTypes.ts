/**
 * DeviceTypes.ts
 *
 * This file contains standardized device type definitions that can be
 * used consistently across the application. These types support both
 * the legacy store and the new unified store approach.
 */

/**
 * Base device interface that all device types should extend
 */
export interface BaseDevice {
  id: string
  name: string
  type: string
  isConnected: boolean
  properties: Record<string, unknown>
}

/**
 * Device interface used in the UnifiedStore
 */
export interface UnifiedDevice extends BaseDevice {
  displayName?: string
  isConnecting: boolean
  isDisconnecting: boolean
  discoveredAt?: string
  lastConnected?: string
  deviceType?: string // For compatibility with older code
  ipAddress?: string
  address?: string
  port?: number
  status?: string
  telemetry?: Record<string, unknown>
  lastSeen?: string | number
  firmwareVersion?: string
  [key: string]: unknown // Allow for additional properties
}

/**
 * Legacy device interface for backward compatibility
 */
export interface LegacyDevice {
  id: string
  deviceName: string
  deviceType: string
  address?: string
  devicePort?: number
  isConnected?: boolean
  status?: string
  properties?: Record<string, unknown> | null
  telemetry?: Record<string, unknown>
  lastSeen?: number | string
  firmwareVersion?: string
  _original?: unknown // Reference to original for internal use
  [key: string]: unknown // Allow for additional properties
}

/**
 * Telescope-specific device interface
 */
export interface TelescopeDevice extends UnifiedDevice {
  type: 'telescope'
  trackingEnabled?: boolean
  currentRa?: string
  currentDec?: string
  targetRa?: string
  targetDec?: string
  slewRate?: number
  isPierEast?: boolean
  canSlew?: boolean
  canSync?: boolean
  canPark?: boolean
  isParked?: boolean
  canSetTracking?: boolean
}

/**
 * Camera-specific device interface
 */
export interface CameraDevice extends UnifiedDevice {
  type: 'camera'
  exposureTime?: number
  gain?: number
  coolerEnabled?: boolean
  currentTemperature?: number
  targetTemperature?: number
  binning?: number
  canCool?: boolean
  canSetGain?: boolean
  canSetBinning?: boolean
  readoutMode?: string
  sensorWidth?: number
  sensorHeight?: number
}

/**
 * Focuser-specific device interface
 */
export interface FocuserDevice extends UnifiedDevice {
  type: 'focuser'
  position?: number
  temperature?: number
  isMoving?: boolean
  maxPosition?: number
  canAbsoluteMove?: boolean
  canRelativeMove?: boolean
  canSetTemperature?: boolean
}

/**
 * FilterWheel-specific device interface
 */
export interface FilterWheelDevice extends UnifiedDevice {
  type: 'filterwheel'
  position?: number
  filterNames?: string[]
  filterCount?: number
  currentFilter?: string
  isMoving?: boolean
}

/**
 * Weather Station-specific device interface
 */
export interface WeatherDevice extends UnifiedDevice {
  type: 'weather'
  temperature?: number
  humidity?: number
  pressure?: number
  cloudCover?: number
  windSpeed?: number
  windDirection?: string
  rainRate?: number
  dewPoint?: number
}

/**
 * Dome-specific device interface
 */
export interface DomeDevice extends UnifiedDevice {
  type: 'dome'
  azimuth?: number
  altitude?: number
  isOpen?: boolean
  canSetAzimuth?: boolean
  canSetAltitude?: boolean
  canOpen?: boolean
  canPark?: boolean
  isParked?: boolean
  isMoving?: boolean
}

/**
 * Type guard functions to check device types
 */
export function isTelescope(device: UnifiedDevice): device is TelescopeDevice {
  return device.type === 'telescope'
}

export function isCamera(device: UnifiedDevice): device is CameraDevice {
  return device.type === 'camera'
}

export function isFocuser(device: UnifiedDevice): device is FocuserDevice {
  return device.type === 'focuser'
}

export function isFilterWheel(device: UnifiedDevice): device is FilterWheelDevice {
  return device.type === 'filterwheel'
}

export function isWeatherStation(device: UnifiedDevice): device is WeatherDevice {
  return device.type === 'weather'
}

export function isDome(device: UnifiedDevice): device is DomeDevice {
  return device.type === 'dome'
}

/**
 * Union type of all specific device types
 */
export type SpecificDevice =
  | TelescopeDevice
  | CameraDevice
  | FocuserDevice
  | FilterWheelDevice
  | WeatherDevice
  | DomeDevice
