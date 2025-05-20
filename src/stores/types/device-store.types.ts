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
