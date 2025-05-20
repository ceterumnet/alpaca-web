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
 * Valid device states
 */
export type DeviceState = 'idle' | 'connecting' | 'connected' | 'disconnecting' | 'error'

/**
 * Device state transition type
 */
export type DeviceStateTransition = {
  from: DeviceState
  to: DeviceState
  timestamp: number
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
  devicePort?: number
  status: DeviceState // Changed from string to DeviceState
  telemetry?: Record<string, unknown>
  lastSeen?: string | number
  firmwareVersion?: string
  apiBaseUrl?: string
  deviceNum?: number
  idx?: number
  capabilities?: Record<string, boolean>
  deviceAttributes?: Record<string, unknown>
  stateHistory?: DeviceStateTransition[] // Track state transitions
  [key: string]: unknown // Allow for additional properties
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
  offsetResolution?: number
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
  canAbsoluteMove?: boolean
  canRelativeMove?: boolean
  canSetTemperature?: boolean
}

/**
 * Properties specific to FilterWheel devices managed by filterWheelActions.ts.
 * These are typically stored within the UnifiedDevice.properties object.
 */
export interface FilterWheelDeviceProperties {
  fw_currentPosition?: number | null
  fw_filterNames?: string[] | null
  fw_focusOffsets?: number[] | null
  fw_isMoving?: boolean | null // If the filter wheel supports reporting this
  [key: string]: unknown // Added index signature back for compatibility with UnifiedDevice updates
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
  canSync?: boolean
  canHome?: boolean
  canPark?: boolean
  isParked?: boolean
  isHomed?: boolean
  minPosition?: number
  maxPosition?: number
  // Mechanical properties
  mechanicalPosition?: number
  mechanicalTargetPosition?: number
  mechanicalStepSize?: number
  mechanicalReverse?: boolean
  mechanicalCanReverse?: boolean
  mechanicalCanSync?: boolean
  mechanicalCanHome?: boolean
  mechanicalCanPark?: boolean
  mechanicalIsParked?: boolean
  mechanicalIsHomed?: boolean
  mechanicalMinPosition?: number
  mechanicalMaxPosition?: number
}

export interface RotatorDeviceProperties {
  position?: number
  mechanicalPosition?: number
  isMoving?: boolean | null
  targetPosition?: number
  canReverse?: boolean | null
  reverse?: boolean | null
  // Add any other rotator-specific properties here as needed
}

/**
 * SafetyMonitor-specific device interface
 */
export interface SafetyMonitorDevice extends UnifiedDevice {
  type: 'safetymonitor'
  // Core properties
  isSafe?: boolean
  sensorStates?: Record<string, boolean>
  alertConditions?: Record<string, boolean>
  alertMessages?: Record<string, string>
  alertLevels?: Record<string, number> // 0=None, 1=Warning, 2=Critical
  lastUpdateTime?: string
}

/**
 * Switch-specific device interface
 */
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

export function isSafetyMonitor(device: UnifiedDevice): device is SafetyMonitorDevice {
  return device.type === 'safetymonitor'
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
 * Check if a value is a valid device type
 */
export function isValidDeviceType(type: string): type is SpecificDevice['type'] {
  return ['telescope', 'camera', 'focuser', 'filterwheel', 'weather', 'dome', 'covercalibrator', 'rotator', 'safetymonitor', 'switch'].includes(type)
}

/**
 * Check if a value is a valid device
 */
export function isDevice(value: unknown): value is Device {
  return typeof value === 'object' && value !== null && 'id' in value && 'name' in value && 'type' in value && 'isConnected' in value
}

/**
 * Check if a device has a specific property
 */
export function hasProperty<T extends Device>(device: T, property: keyof T): device is T & { [K in typeof property]: NonNullable<T[K]> } {
  return property in device && device[property] !== undefined && device[property] !== null
}

/**
 * Check if a device has all required properties
 */
export function hasRequiredProperties<T extends Device>(
  device: T,
  properties: Array<keyof T>
): device is T & { [K in (typeof properties)[number]]: NonNullable<T[K]> } {
  return properties.every((prop) => hasProperty(device, prop))
}

/**
 * Check if a device has a specific capability
 */
export function hasCapability<T extends Device>(device: T, capability: string): boolean {
  return device.properties?.[capability] === true
}

/**
 * Check if a device has all required capabilities
 */
export function hasRequiredCapabilities<T extends Device>(device: T, capabilities: string[]): boolean {
  return capabilities.every((cap) => hasCapability(device, cap))
}

/**
 * Device-specific property guards
 */

/**
 * Check if a telescope has tracking capabilities
 */
export function hasTrackingCapabilities(device: TelescopeDevice): boolean {
  return hasRequiredCapabilities(device, ['canSetTracking', 'canGetTracking'])
}

/**
 * Check if a telescope has park capabilities
 */
export function hasParkCapabilities(device: TelescopeDevice): boolean {
  return hasRequiredCapabilities(device, ['canPark', 'canUnpark', 'canFindHome'])
}

/**
 * Check if a camera has temperature control
 */
export function hasCameraTemperatureControl(device: CameraDevice): boolean {
  return hasRequiredCapabilities(device, ['canSetCCDTemperature', 'canGetCoolerPower'])
}

/**
 * Check if a camera has exposure control
 */
export function hasCameraExposureControl(device: CameraDevice): boolean {
  return hasRequiredCapabilities(device, ['canAbortExposure', 'canStopExposure'])
}

/**
 * Check if a focuser has absolute positioning
 */
export function hasAbsolutePositioning(device: FocuserDevice): boolean {
  return hasRequiredCapabilities(device, ['canAbsoluteMove'])
}

/**
 * Check if a dome has shutter control
 */
export function hasDomeShutterControl(device: DomeDevice): boolean {
  return hasRequiredCapabilities(device, ['canOpen', 'canClose'])
}

/**
 * Check if a device is ready for operation
 */
export function isDeviceReady<T extends Device>(device: T): boolean {
  return device.isConnected && !device.isConnecting && !device.isDisconnecting && device.status !== 'error'
}

/**
 * Check if a device is in a valid state for a specific operation
 */
export function isDeviceStateValid<T extends Device>(device: T, requiredState: DeviceState): boolean {
  return device.status === requiredState
}

/**
 * Additional device-specific property guards
 */

/**
 * Telescope-specific guards
 */
export function hasGuideCapabilities(device: TelescopeDevice): boolean {
  return hasRequiredCapabilities(device, ['canPulseGuide', 'canSetGuideRate'])
}

export function hasSlewCapabilities(device: TelescopeDevice): boolean {
  return hasRequiredCapabilities(device, ['canSlew', 'canSlewAsync', 'canSlewToCoordinates'])
}

export function hasHomeCapabilities(device: TelescopeDevice): boolean {
  return hasRequiredCapabilities(device, ['canFindHome', 'canSetHome'])
}

export function isTelescopeParked(device: TelescopeDevice): boolean {
  return device.properties?.atpark === true
}

export function isTelescopeSlewing(device: TelescopeDevice): boolean {
  return device.properties?.slewing === true
}

export function isTelescopeTracking(device: TelescopeDevice): boolean {
  return device.properties?.tracking === true
}

/**
 * Camera-specific guards
 */
export function hasBinningControl(device: CameraDevice): boolean {
  return hasRequiredCapabilities(device, ['canSetBinning'])
}

export function hasGainControl(device: CameraDevice): boolean {
  return hasRequiredCapabilities(device, ['canSetGain', 'hasAdjustableGain'])
}

export function hasCameraShutterControl(device: CameraDevice): boolean {
  return hasRequiredCapabilities(device, ['hasShutter', 'hasAdjustableShutter'])
}

export function hasPortControl(device: CameraDevice): boolean {
  return hasRequiredCapabilities(device, ['hasPort', 'hasAdjustablePort'])
}

export function isCameraExposing(device: CameraDevice): boolean {
  return device.cameraState === 'exposing'
}

export function isCameraImageReady(device: CameraDevice): boolean {
  return device.imageReady === true
}

export function isCameraCooling(device: CameraDevice): boolean {
  return device.coolerOn === true
}

/**
 * Focuser-specific guards
 */
export function hasRelativeMoveCapabilities(device: FocuserDevice): boolean {
  return hasRequiredCapabilities(device, ['canRelativeMove'])
}

export function hasFocuserTemperatureControl(device: FocuserDevice): boolean {
  return hasRequiredCapabilities(device, ['canSetTemperature'])
}

export function isFocuserMoving(device: FocuserDevice): boolean {
  return device.properties?.ismoving === true
}

/**
 * FilterWheel-specific guards
 */
export function hasFilterNames(device: FilterWheelDevice): boolean {
  return Array.isArray(device.filterNames) && device.filterNames.length > 0
}

export function isFilterWheelMoving(device: FilterWheelDevice): boolean {
  return device.properties?.ismoving === true
}

/**
 * Weather-specific guards
 */
export function hasTemperatureSensor(device: WeatherDevice): boolean {
  return typeof device.temperature === 'number'
}

export function hasHumiditySensor(device: WeatherDevice): boolean {
  return typeof device.humidity === 'number'
}

export function hasPressureSensor(device: WeatherDevice): boolean {
  return typeof device.pressure === 'number'
}

export function hasCloudCoverSensor(device: WeatherDevice): boolean {
  return typeof device.cloudCover === 'number'
}

/**
 * Dome-specific guards
 */
export function hasAltitudeControl(device: DomeDevice): boolean {
  return hasRequiredCapabilities(device, ['canSetAltitude'])
}

export function hasAzimuthControl(device: DomeDevice): boolean {
  return hasRequiredCapabilities(device, ['canSetAzimuth'])
}

export function isDomeMoving(device: DomeDevice): boolean {
  return device.properties?.ismoving === true
}

export function isDomeParked(device: DomeDevice): boolean {
  return device.properties?.atpark === true
}

/**
 * Range guards for Telescope
 */
export function isTelescopeAltitudeInRange(device: TelescopeDevice, altitude: number): boolean {
  return altitude >= -90 && altitude <= 90
}

export function isTelescopeAzimuthInRange(device: TelescopeDevice, azimuth: number): boolean {
  return azimuth >= 0 && azimuth <= 360
}

/**
 * Range guards for Camera
 */
export function isCameraExposureInRange(device: CameraDevice, exposure: number): boolean {
  return exposure >= (device.exposureMin || 0) && exposure <= (device.exposureMax || Number.MAX_VALUE)
}

export function isCameraGainInRange(device: CameraDevice, gain: number): boolean {
  return gain >= (device.gainMin || 0) && gain <= (device.gainMax || Number.MAX_VALUE)
}

export function isCameraTemperatureInRange(device: CameraDevice, temperature: number): boolean {
  return temperature >= -50 && temperature <= 50 // Typical CCD temperature range
}

/**
 * Range guards for Focuser
 */
export function isFocuserPositionInRange(device: FocuserDevice, position: number): boolean {
  const minPos = Number(device.minPosition ?? 0)
  const maxPos = Number(device.maxPosition ?? Number.MAX_VALUE)
  return position >= minPos && position <= maxPos
}

/**
 * Range guards for FilterWheel
 */
export function isFilterWheelPositionInRange(device: FilterWheelDevice, position: number): boolean {
  const maxPos = Number(device.filterCount ?? 0)
  return position >= 0 && position <= maxPos
}

/**
 * Range guards for Dome
 */
export function isDomeAltitudeInRange(device: DomeDevice, altitude: number): boolean {
  return altitude >= 0 && altitude <= 90
}

export function isDomeAzimuthInRange(device: DomeDevice, azimuth: number): boolean {
  return azimuth >= 0 && azimuth <= 360
}

/**
 * Combination guards for Telescope
 */
export function canTelescopeSlewToCoordinates(device: TelescopeDevice): boolean {
  return hasSlewCapabilities(device) && hasTrackingCapabilities(device) && !isTelescopeSlewing(device)
}

export function canTelescopeSyncToCoordinates(device: TelescopeDevice): boolean {
  return hasRequiredCapabilities(device, ['canSync']) && hasTrackingCapabilities(device) && !isTelescopeSlewing(device)
}

/**
 * Combination guards for Camera
 */
export function canCameraStartExposure(device: CameraDevice): boolean {
  return hasCameraExposureControl(device) && !isCameraExposing(device) && !isCameraImageReady(device)
}

export function canCameraSetTemperature(device: CameraDevice): boolean {
  return hasCameraTemperatureControl(device) && !isCameraExposing(device)
}

/**
 * Combination guards for Focuser
 */
export function canFocuserMoveToPosition(device: FocuserDevice): boolean {
  return hasAbsolutePositioning(device) && !isFocuserMoving(device)
}

/**
 * Combination guards for FilterWheel
 */
export function canFilterWheelMoveToPosition(device: FilterWheelDevice): boolean {
  return hasRequiredCapabilities(device, ['canSetPosition']) && !isFilterWheelMoving(device)
}

/**
 * Combination guards for Dome
 */
export function canDomeMoveToPosition(device: DomeDevice): boolean {
  return hasAltitudeControl(device) && hasAzimuthControl(device) && !isDomeMoving(device)
}

/**
 * Capability guards for CoverCalibrator
 */
export function hasCoverControl(device: CoverCalibratorDevice): boolean {
  return hasRequiredCapabilities(device, ['canSetCoverState', 'hasCover'])
}

export function hasCalibratorControl(device: CoverCalibratorDevice): boolean {
  return hasRequiredCapabilities(device, ['canSetCalibratorState', 'hasCalibrator'])
}

export function hasBrightnessControl(device: CoverCalibratorDevice): boolean {
  return hasRequiredCapabilities(device, ['canSetBrightness'])
}

export function isCoverMoving(device: CoverCalibratorDevice): boolean {
  return device.coverState === 2 // Moving
}

export function isCalibratorReady(device: CoverCalibratorDevice): boolean {
  return device.calibratorState === 3 // Ready
}

/**
 * Capability guards for Rotator
 */
export function hasRotatorPositionControl(device: RotatorDevice): boolean {
  return hasRequiredCapabilities(device, ['canSync', 'canHome'])
}

export function hasRotatorParkCapabilities(device: RotatorDevice): boolean {
  return hasRequiredCapabilities(device, ['canPark'])
}

export function hasRotatorReverseCapabilities(device: RotatorDevice): boolean {
  return hasRequiredCapabilities(device, ['canReverse'])
}

export function isRotatorMoving(device: RotatorDevice): boolean {
  return device.isMoving === true
}

export function isRotatorParked(device: RotatorDevice): boolean {
  return device.isParked === true
}

export function isRotatorHomed(device: RotatorDevice): boolean {
  return device.isHomed === true
}

/**
 * Capability guards for SafetyMonitor
 */
export function hasSafetySensors(device: SafetyMonitorDevice): boolean {
  return device.sensorStates !== undefined && Object.keys(device.sensorStates).length > 0
}

export function hasSafetyAlerts(device: SafetyMonitorDevice): boolean {
  return device.alertConditions !== undefined && Object.keys(device.alertConditions).length > 0
}

export function isSafetySystemSafe(device: SafetyMonitorDevice): boolean {
  return device.isSafe === true
}

export function hasCriticalAlerts(device: SafetyMonitorDevice): boolean {
  return Object.values(device.alertLevels || {}).some((level) => level === 2)
}

/**
 * Capability guards for Switch
 */
export function hasBooleanSwitches(device: SwitchDevice): boolean {
  return Object.values(device.switchTypes || {}).some((type) => type === 'boolean')
}

export function hasAnalogSwitches(device: SwitchDevice): boolean {
  return Object.values(device.switchTypes || {}).some((type) => type === 'analog')
}

export function hasDigitalSwitches(device: SwitchDevice): boolean {
  return Object.values(device.switchTypes || {}).some((type) => type === 'digital')
}

export function hasSwitchWithRange(device: SwitchDevice, switchName: string): boolean {
  return (
    device.switchRanges?.[switchName] !== undefined &&
    device.switchMinValues?.[switchName] !== undefined &&
    device.switchMaxValues?.[switchName] !== undefined
  )
}

export function isSwitchValueInRange(device: SwitchDevice, switchName: string, value: number): boolean {
  const range = device.switchRanges?.[switchName]
  if (!range || !Array.isArray(range) || range.length !== 2) return false
  const [min, max] = range as [number, number]
  return value >= min && value <= max
}

/**
 * Check if a state transition is valid
 */
export function isValidStateTransition(from: DeviceState, to: DeviceState): boolean {
  const validTransitions: Record<DeviceState, DeviceState[]> = {
    idle: ['connecting', 'error'],
    connecting: ['connected', 'error', 'idle'],
    connected: ['disconnecting', 'error'],
    disconnecting: ['idle', 'error'],
    error: ['idle']
  }

  return validTransitions[from]?.includes(to) ?? false
}

// export const isSwitch = (device: Device | UnifiedDevice): device is UnifiedDevice & { deviceType: 'Switch' } => {
//   return device.deviceType === 'Switch'
// }

// export const isObservingConditions = (device: Device | UnifiedDevice): device is UnifiedDevice & { deviceType: 'ObservingConditions' } => {
//   return device.deviceType === 'ObservingConditions'
// }
