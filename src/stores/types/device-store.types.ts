/**
 * Device Store Types
 *
 * Contains type definitions specific to the unified device store
 */

import type { Device as CoreDevice, UnifiedDevice as CoreUnifiedDevice } from '@/types/device.types'

// Define common types
export type Theme = 'light' | 'dark'

export interface StoreOptions {
  silent?: boolean
}

/**
 * Standardized device capabilities interface for tracking what features
 * a specific device supports.
 */
export interface DeviceCapabilities {
  [key: string]: boolean
}

/**
 * Defines the possible device events that can be emitted by the UnifiedStore.
 * These events are strongly typed to provide better type safety and developer experience.
 */
export type DeviceEvent =
  | { type: 'deviceAdded'; device: UnifiedDevice }
  | { type: 'deviceRemoved'; deviceId: string }
  | { type: 'deviceUpdated'; deviceId: string; updates: Partial<UnifiedDevice> }
  | { type: 'devicePropertyChanged'; deviceId: string; property: string; value: unknown }
  | {
      type: 'deviceMethodCalled'
      deviceId: string
      method: string
      args: unknown[]
      result: unknown
    }
  | { type: 'deviceConnected'; deviceId: string }
  | { type: 'deviceDisconnected'; deviceId: string }
  | { type: 'deviceConnectionError'; deviceId: string; error: string }
  | { type: 'deviceApiError'; deviceId: string; error: unknown }
  | { type: 'discoveryStarted' }
  | { type: 'discoveryStopped' }
  | { type: 'discoveryDeviceFound'; device: UnifiedDevice }
  | { type: 'discoveryCompleted'; devices: UnifiedDevice[] }
  | { type: 'discoveryError'; error: string }
  | { type: 'cameraExposureStarted'; deviceId: string; duration: number; isLight: boolean }
  | {
      type: 'cameraExposureComplete'
      deviceId: string
      imageData?: ArrayBuffer | number[][] | number[][][] // Can be binary or JSON
      width?: number
      height?: number
      imageElementType?: number // 0 for Int16, 1 for Int32, 2 for Double
      metadata?: Record<string, unknown> // For any other metadata
      error?: string // Optional error message if the process failed
    }
  | { type: 'cameraExposureAborted'; deviceId: string }
  | { type: 'cameraExposureFailed'; deviceId: string; error: string }
  | { type: 'cameraImageReady'; deviceId: string; imageData?: ArrayBuffer }
  | { type: 'cameraImageReceived'; deviceId: string; imageUrl: string }
  | { type: 'cameraImageError'; deviceId: string; error: string }
  | { type: 'cameraExposureChanged'; deviceId: string; percentComplete: number }
  | { type: 'cameraCoolerChanged'; deviceId: string; enabled: boolean; temperature?: number }
  | { type: 'cameraBinningChanged'; deviceId: string; binX: number; binY: number }
  | { type: 'cameraGainChanged'; deviceId: string; gain: number }
  | { type: 'cameraOffsetChanged'; deviceId: string; offset: number }
  | { type: 'cameraReadoutModeChanged'; deviceId: string; readoutMode: number }
  | { type: 'telescopeParkStarted'; deviceId: string }
  | { type: 'telescopeParked'; deviceId: string }
  | { type: 'telescopeUnparkStarted'; deviceId: string }
  | { type: 'telescopeUnparked'; deviceId: string }
  | {
      type: 'telescopeSlewStarted'
      deviceId: string
      targetRA?: number
      targetDec?: number
      targetAlt?: number
      targetAz?: number
    }
  | { type: 'telescopeSlewAborted'; deviceId: string }
  | { type: 'telescopeSlewCompleted'; deviceId: string }
  | { type: 'telescopeTrackingChanged'; deviceId: string; enabled: boolean; rate?: number }
  | { type: 'telescopeParkError'; deviceId: string; error: string }
  | { type: 'telescopeUnparkError'; deviceId: string; error: string }
  | {
      type: 'telescopeSlewComplete'
      deviceId: string
      coordinates: {
        rightAscension?: number
        declination?: number
        altitude?: number
        azimuth?: number
      }
    }
  | {
      type: 'telescopeSlewError'
      deviceId: string
      error: string
      coordinates: {
        rightAscension?: number
        declination?: number
        altitude?: number
        azimuth?: number
      }
    }

/**
 * Callback type for device event listeners
 */
export type DeviceEventListener = (event: DeviceEvent) => void

/**
 * Interface for batch event operations
 */
export interface BatchedEvents {
  start: () => void
  end: () => void
  queue: (event: DeviceEvent) => void
}

// Re-export core types for convenience
export type Device = CoreDevice
export type UnifiedDevice = CoreUnifiedDevice

// ADD FocuserDeviceProperties HERE
/**
 * Properties specific to Focuser devices managed by focuserActions.ts.
 * These are typically stored within the UnifiedDevice.properties object.
 */
export interface FocuserDeviceProperties {
  focuser_position?: number | null
  focuser_isMoving?: boolean | null
  focuser_temperature?: number | null
  focuser_stepSize?: number | null
  focuser_maxStep?: number | null
  focuser_maxIncrement?: number | null
  focuser_tempComp?: boolean | null
  [key: string]: unknown // Index signature for compatibility
}

// Define SwitchDeviceProperties here
/**
 * Properties specific to Switch devices managed by switchActions.ts.
 * These are typically stored within the UnifiedDevice.properties object.
 */
export interface SwitchDeviceProperties {
  // General properties for the switch device itself
  max_switch?: number // Number of individual switch elements

  // Properties for individual switch elements (often managed in arrays or maps by ID)
  // These might be represented as an array of objects or a map if there are multiple switches.
  // For a single switch or if properties are fetched per-switch-element:
  switch_value?: boolean | number | null // Current value/state (true/false for on/off, or a number)
  switch_name?: string | null // Name of the switch element
  switch_description?: string | null // Description of the switch element
  switch_min_value?: number | null // Minimum value for a numeric switch
  switch_max_value?: number | null // Maximum value for a numeric switch
  switch_step?: number | null // Step value for a numeric switch
  can_write?: boolean | null // Whether the switch value can be changed

  // It might be better to store individual switch states in a structured way if max_switch > 1
  // For example, an array: individual_switches?: Array<{ id: number, name: string, value: any, ... }>
  // Or a map: individual_switches_map?: Map<number, { name: string, value: any, ... }>
  // For now, keeping it simple, assuming properties might be dynamically added for switch_0_value, switch_1_name etc.

  [key: string]: unknown // Index signature for compatibility with dynamic properties
}

export interface BaseDeviceEvent {
  deviceId: string
}

export interface CameraExposureStartedEvent extends BaseDeviceEvent {
  type: 'cameraExposureStarted'
  duration: number
  isLight: boolean
}

export interface CameraExposureProgressEvent extends BaseDeviceEvent {
  type: 'cameraExposureProgress'
  progress: number // 0-100
  remaining: number // seconds
  timestamp: number // time of this update
}

// This is the specific interface I want to modify
export interface CameraExposureCompleteEvent extends BaseDeviceEvent {
  type: 'cameraExposureComplete'
  imageData?: ArrayBuffer
  imageUrl?: string
  error?: string // ADDED THIS LINE
}
