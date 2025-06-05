/**
 * DeviceTypes.ts
 *
 * This file contains standardized device type definitions that can be
 * used consistently across the application. These types support both
 * the legacy store and the new unified store approach.
 */

// Status: Good - Core Type Definition
// This module provides device type definitions that:
// - Defines core device interfaces and types
// - Supports both legacy and unified store approaches
// - Provides type safety for device-specific properties
// - Implements type guards for device type checking
// - Maintains consistent device type structure
// - Defines specialized device interfaces (Telescope, Camera, etc.)
// - Supports device type validation and discrimination

/**
 * Valid device states
 */
export type DeviceStatus = 'idle' | 'connecting' | 'connected' | 'disconnecting' | 'error'

/**
 * Device state transition type
 */
export type DeviceStateTransition = {
  from: DeviceStatus
  to: DeviceStatus
  timestamp: number
}

/**
 * Device interface used in the UnifiedStore
 */
export interface UnifiedDevice {
  id: string
  name: string
  type: string
  isConnected: boolean
  properties: Record<string, unknown>
  displayName?: string
  isConnecting: boolean
  isDisconnecting: boolean
  discoveredAt?: string
  lastConnected?: string
  deviceType?: string // For compatibility with older code
  ipAddress?: string
  address?: string
  port?: number

  // This might be redundant with port and may have been a typo
  devicePort?: number

  status: DeviceStatus // Changed from string to DeviceState
  firmwareVersion?: string

  apiBaseUrl?: string

  // I just added these...I'm not sure if they are correct.
  driverInfo?: string
  driverVersion?: string
  supportedActions?: string[]
  description?: string
  interfaceVersion?: number
  connected?: boolean
  uniqueId?: string

  // We need to have just one of these deviceNumber or or deviceNum.
  deviceNum?: number
  idx?: number
  capabilities?: Record<string, boolean>

  // I think this is weird and probably came from a previous implementation. There is still some code wired up to this...
  deviceAttributes?: Record<string, unknown>

  // This is wired up, but I'm not sure it's useful.
  stateHistory?: DeviceStateTransition[] // Track state transitions

  // We need to have just one of these deviceNumber or or deviceNum.
  deviceNumber?: number
  // [key: string]: unknown // Allow for additional properties
}

/**
 * Standard Device type for use throughout the application
 */
export type Device = UnifiedDevice

/**
 * Telescope-specific device interface
 */
export interface TelescopeDevice extends UnifiedDevice {
  type: 'telescope'
  // Core tracking properties
  trackingEnabled?: boolean
  currentRa?: string
  currentDec?: string
  targetRa?: string
  targetDec?: string
  slewRate?: number
  isPierEast?: boolean

  // Capability flags
  canSlew?: boolean
  canSync?: boolean
  canPark?: boolean
  isParked?: boolean
  canSetTracking?: boolean
  canFindHome?: boolean
  canMoveAxis?: boolean
  canPulseGuide?: boolean
  canSetDeclinationRate?: boolean
  canSetGuideRate?: boolean
  canSetPark?: boolean
  canSetPierSide?: boolean
  canSetRightAscensionRate?: boolean
  canSlewAltAz?: boolean
  canSlewAltAzAsync?: boolean
  canSlewAsync?: boolean
  canSyncAltAz?: boolean
  canUnpark?: boolean

  // Mount state
  alignmentMode?: string
  altitude?: number
  apertureArea?: number
  apertureDiameter?: number
  atHome?: boolean
  atPark?: boolean
  axisRates?: Record<string, unknown>
  azimuth?: number
  declination?: number
  declinationRate?: number
  destinationSideOfPier?: string
  doesRefraction?: boolean
  equatorialSystem?: number
  focalLength?: number
  guideRateDeclination?: number
  guideRateRightAscension?: number
  isPulseGuiding?: boolean
  rightAscension?: number
  rightAscensionRate?: number
  sideOfPier?: string
  siderealTime?: number
  siteElevation?: number
  siteLatitude?: number
  siteLongitude?: number
  slewing?: boolean
  slewSettleTime?: number
  trackingRate?: number
  trackingRates?: unknown[]
  utcDate?: string
}

/**
 * Camera-specific device interface
 */
export interface CameraDevice extends UnifiedDevice {
  type: 'camera'
  // Core camera properties
  exposureTime?: number
  gain?: number
  coolerEnabled?: boolean
  currentTemperature?: number
  targetTemperature?: number
  binning?: number
  readoutMode?: string
  sensorWidth?: number
  sensorHeight?: number

  // Capability flags
  canCool?: boolean
  canSetGain?: boolean
  canSetBinning?: boolean
  canAbortExposure?: boolean
  canFastReadout?: boolean
  canGetCoolerPower?: boolean
  canPulseGuide?: boolean
  canSetCCDTemperature?: boolean
  canStopExposure?: boolean
  hasAdjustableFan?: boolean
  hasAdjustableGain?: boolean
  hasAdjustableOffset?: boolean
  hasAdjustablePort?: boolean
  hasAdjustableShutter?: boolean
  hasAdjustableTemperature?: boolean
  hasAsymmetricBins?: boolean
  hasFastReadout?: boolean
  hasPort?: boolean
  hasReadoutModes?: boolean
  hasReversibleCooler?: boolean
  hasReversibleFan?: boolean
  hasReversiblePort?: boolean
  hasReversibleShutter?: boolean
  hasShutter?: boolean
  isPrimary?: boolean

  // Camera state
  binX?: number
  binY?: number
  cameraState?: string
  ccdTemperature?: number
  coolerPower?: number
  electronsPerADU?: number
  exposureMax?: number
  exposureMin?: number
  exposureResolution?: number
  fastReadout?: boolean
  fullWellCapacity?: number
  gainMax?: number
  gainMin?: number
  gains?: number[]
  imageReady?: boolean
  lastTemperature?: number
  maxADU?: number
  maxBinX?: number
  maxBinY?: number
  maxGain?: number
  maxOffset?: number
  maxPort?: number
  maxReadoutRate?: number
  maxX?: number
  maxY?: number
  minBinX?: number
  minBinY?: number
  minGain?: number
  minOffset?: number
  minPort?: number
  minReadoutRate?: number
  minX?: number
  minY?: number
  numPorts?: number
  offset?: number
  offsetMax?: number
  offsetMin?: number
  percentCompleted?: number
  pixelSizeX?: number
  pixelSizeY?: number
  port?: number
  ports?: string[]
  readoutModes?: string[]
  readoutRate?: number
  readoutRates?: number[]
  sensorName?: string
  sensorType?: string
  shutterStatus?: string
  startX?: number
  startY?: number
  subExposureDuration?: number
  temperature?: number
  xSize?: number
  ySize?: number
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
  absolute?: number
  // Capability flags
  canAbsoluteMove?: boolean
  canRelativeMove?: boolean
  canSetTemperature?: boolean
  stepSize?: number | null
  maxStep?: number | null
  maxIncrement?: number | null
  tempComp?: boolean | null
  tempCompAvailable?: boolean | null
}

/**
 * FilterWheel-specific device interface
 */
export interface FilterWheelDevice extends UnifiedDevice {
  type: 'filterwheel'
  position?: number | null
  filterNames?: string[] | null
  filterCount?: number
  currentFilter?: string
  isMoving?: boolean | null
  focusOffsets?: number[] | null
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
 * ObservingConditions-specific device interface
 */
export interface ObservingConditionsDevice extends UnifiedDevice {
  type: 'observingconditions' // Standardized type name
  averageperiod?: number
  cloudcover?: number
  dewpoint?: number
  humidity?: number
  pressure?: number
  rainrate?: number
  skybrightness?: number
  skyquality?: number
  skytemperature?: number
  starfwhm?: number
  temperature?: number // Overlaps with WeatherDevice, but context is different
  winddirection?: number
  windgust?: number
  windspeed?: number // Overlaps with WeatherDevice
}

/**
 * Dome-specific device interface
 */
export interface DomeDevice extends UnifiedDevice {
  type: 'dome'
  // Core properties
  azimuth?: number
  altitude?: number
  isOpen?: boolean
  isParked?: boolean
  isMoving?: boolean

  // Capability flags
  canPark?: boolean
  canSetAzimuth?: boolean
  canSetAltitude?: boolean
  canOpen?: boolean
}

/**
 * CoverCalibrator-specific device interface
 */
export interface CoverCalibratorDevice extends UnifiedDevice {
  type: 'covercalibrator'
  // Core properties
  coverState?: number // 0=NotPresent, 1=Closed, 2=Moving, 3=Open, 4=Unknown, 5=Error
  calibratorState?: number // 0=NotPresent, 1=Off, 2=NotReady, 3=Ready, 4=Unknown, 5=Error
  brightness?: number
  maxBrightness?: number

  // Capability flags
  canSetBrightness?: boolean
  canSetCoverState?: boolean
  canSetCalibratorState?: boolean
  hasCover?: boolean
  hasCalibrator?: boolean
}

/**
 * Rotator-specific device interface
 */
export interface RotatorDevice extends UnifiedDevice {
  type: 'rotator'
  // Core properties
  position?: number
  targetPosition?: number
  isMoving?: boolean
  reverse?: boolean
  stepSize?: number
  canReverse?: boolean

  // Mechanical properties
  mechanicalPosition?: number
}

// export interface RotatorDeviceProperties {
//   position?: number
//   mechanicalPosition?: number
//   isMoving?: boolean | null
//   targetPosition?: number
//   canReverse?: boolean | null
//   reverse?: boolean | null
//   _rt_isPollingStatus?: boolean // Internal flag for UI/polling logic
//   // Add any other rotator-specific properties here as needed
// }

/**
 * SafetyMonitor-specific device interface
 */
export interface SafetyMonitorDevice extends UnifiedDevice {
  type: 'safetymonitor'
  // Core properties
  isSafe?: boolean | null
  sensorStates?: Record<string, boolean>
  alertConditions?: Record<string, boolean>
  alertMessages?: Record<string, string>
  alertLevels?: Record<string, number> // 0=None, 1=Warning, 2=Critical
  lastUpdateTime?: string
}

/**
 * Switch-specific device interface
 */

export interface ISwitchDetail {
  name: string
  value: number | boolean // Switches can be boolean or have numeric values
  description: string
  min?: number
  max?: number
  step?: number
  canAsync?: boolean
  canWrite?: boolean
}

export interface SwitchDevice extends UnifiedDevice {
  type: 'switch'
  // Core properties
  switchStates?: Record<string, boolean>
  switchNames?: string[]
  switchValues?: Record<string, number>
  switchRanges?: Record<string, [number, number]>
  switchDescriptions?: Record<string, string>
  switchTypes?: Record<string, string> // 'boolean', 'analog', 'digital'
  switchUnits?: Record<string, string>
  switchMinValues?: Record<string, number>
  switchMaxValues?: Record<string, number>
  switchStepSizes?: Record<string, number>
  maxSwitch?: number | null
  // we may need a switchDetails interface here.
  switches?: ISwitchDetail[] | null
  usingDeviceState?: boolean
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

export function isWeather(device: UnifiedDevice): device is WeatherDevice {
  return device.type === 'weather'
}

export function isObservingConditions(device: UnifiedDevice): device is ObservingConditionsDevice {
  return device.type === 'observingconditions'
}

export function isDome(device: UnifiedDevice): device is DomeDevice {
  return device.type === 'dome'
}

export function isCoverCalibrator(device: UnifiedDevice): device is CoverCalibratorDevice {
  return device.type === 'covercalibrator'
}

export function isRotator(device: UnifiedDevice): device is RotatorDevice {
  return device.type === 'rotator'
}

export function isSafetyMonitor(device: UnifiedDevice | null | undefined): device is SafetyMonitorDevice {
  return !!device && device.type === 'safetymonitor'
}

export function isSwitch(device: UnifiedDevice): device is SwitchDevice {
  return device.type === 'switch'
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
  | ObservingConditionsDevice
  | DomeDevice
  | CoverCalibratorDevice
  | RotatorDevice
  | SafetyMonitorDevice
  | SwitchDevice

/**
 * Type guard functions to check device types and properties
 */

/**
 * Check if a state transition is valid
 */
export function isValidStateTransition(from: DeviceStatus, to: DeviceStatus): boolean {
  const validTransitions: Record<DeviceStatus, DeviceStatus[]> = {
    idle: ['connecting', 'error'],
    connecting: ['connected', 'error', 'idle'],
    connected: ['disconnecting', 'error'],
    disconnecting: ['idle', 'error'],
    error: ['idle']
  }

  return validTransitions[from]?.includes(to) ?? false
}
