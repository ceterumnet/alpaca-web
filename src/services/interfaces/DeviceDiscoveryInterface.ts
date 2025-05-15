/**
 * DeviceDiscoveryInterface.ts
 *
 * This file defines the clean interfaces for UI components to interact with the
 * device discovery system. It provides a clear contract between the discovery
 * service and its consumers, promoting better separation of concerns.
 */

import type { UnifiedDevice } from '@/types/device.types'
import type { DiscoveredDevice } from '@/types/DiscoveredDevice'

/**
 * Discovery status represents the current state of the discovery process
 */
export type DiscoveryStatus = 'idle' | 'discovering' | 'success' | 'error'

/**
 * Represents a device server with its discovered devices
 */
export interface DeviceServer {
  id: string
  address: string
  port: number
  serverName: string
  manufacturer?: string
  version?: string
  location?: string
  lastDiscovered: Date
  isManual: boolean
  devices: DeviceServerDevice[]
}

/**
 * Represents a device hosted on a server
 */
export interface DeviceServerDevice {
  id: string
  name: string
  type: string
  deviceNumber: number
  uniqueId?: string
  isAdded: boolean
}

/**
 * Discovery result object returned to UI consumers
 */
export interface DiscoveryResult {
  servers: DeviceServer[]
  status: DiscoveryStatus
  lastDiscoveryTime: Date | null
  error: string | null
}

/**
 * Options for the discovery process
 */
export interface DiscoveryOptions {
  timeout?: number
  retries?: number
  includeManual?: boolean
}

/**
 * Represents a device configured on an Alpaca server, typically obtained from the
 * /management/v1/configureddevices endpoint.
 */
export interface ConfiguredAlpacaDevice {
  DeviceType: string
  DeviceNumber: number
  UniqueID?: string
  DeviceName?: string // Standard Alpaca field name is DeviceName
}

/**
 * Manual device addition parameters
 */
export interface ManualDeviceParams {
  address: string
  port: number
  name?: string
}

/**
 * Clean interface for UI components to interact with discovery service
 */
export interface IDeviceDiscoveryService {
  /**
   * Current discovery status
   */
  readonly status: DiscoveryStatus

  /**
   * Last time discovery was performed
   */
  readonly lastDiscoveryTime: Date | null

  /**
   * Last error that occurred during discovery
   */
  readonly lastError: string | null

  /**
   * Trigger device discovery process
   * @param options Discovery options
   * @returns Promise with discovery results
   */
  discoverDevices(options?: DiscoveryOptions): Promise<DiscoveryResult>

  /**
   * Add a device manually by IP address and port
   * @param params Device parameters
   * @returns Promise with the added server
   */
  addManualDevice(params: ManualDeviceParams): Promise<DeviceServer>

  /**
   * Get the current discovery results
   * @returns Current discovery results
   */
  getDiscoveryResults(): DiscoveryResult

  /**
   * Convert a discovered device to a unified device
   * @param server Device server
   * @param device Server device
   * @returns Unified device ready for connection
   */
  createUnifiedDevice(server: DeviceServer, device: DeviceServerDevice): UnifiedDevice

  /**
   * Check if a device is already added to the store
   * @param device Device to check
   * @param existingDevices List of existing devices
   * @returns True if device is already added
   */
  isDeviceAdded(device: UnifiedDevice, existingDevices: UnifiedDevice[]): boolean

  /**
   * Get the proxy URL for a device server
   * @param server Device server
   * @returns Proxy URL string
   */
  getProxyUrl(server: DeviceServer): string

  /**
   * Convert legacy discovered device to new device server format
   * @param device Legacy discovered device
   * @returns New format device server
   */
  convertLegacyDevice(device: DiscoveredDevice): DeviceServer
}
