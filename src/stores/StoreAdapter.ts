/**
 * Store Adapter
 *
 * Provides a compatibility layer between the legacy store/API and
 * the new UnifiedStore implementation. This adapter allows gradual
 * migration of components to the new store while maintaining
 * compatibility with existing code.
 */

import UnifiedStore from './UnifiedStore'
import type { Device, DeviceEvent } from './UnifiedStore'
import type { LegacyDevice as TypedLegacyDevice } from '../types/DeviceTypes'

// Re-export the LegacyDevice interface from our types
export type LegacyDevice = TypedLegacyDevice

// Legacy server interface
export interface LegacyServer {
  id: string
  name: string
  address: string
  port: number
  isOnline: boolean
  isManualEntry?: boolean
  version?: string
  manufacturer?: string
  location?: string
  lastSeen?: Date | string
}

/**
 * Converts a device from the new store format to the legacy format
 */
function newToLegacyDevice(device: Device): LegacyDevice {
  if (!device)
    return {
      id: '',
      deviceName: '',
      deviceType: ''
    }

  // Create the base legacy device
  const legacyDevice: LegacyDevice = {
    id: device.id,
    deviceName: device.name || device.displayName || '',
    deviceType: device.type || device.deviceType || 'unknown',
    address: (device.ipAddress as string) || (device.address as string) || undefined,
    devicePort: (device.port as number) || (device.devicePort as number) || undefined,
    isConnected: device.isConnected || false,
    status: (device.status as string) || 'idle',
    telemetry: (device.telemetry as Record<string, unknown>) || {},
    lastSeen: device.lastSeen ? String(device.lastSeen) : Date.now().toString(),
    firmwareVersion: (device.firmwareVersion as string) || '',
    _original: device // Reference to original for internal use
  }

  // Only set the properties if they exist
  if (device.properties) {
    legacyDevice.properties = device.properties
  } else {
    legacyDevice.properties = null
  }

  return legacyDevice
}

/**
 * Converts a device from the legacy format to the new store format
 */
function legacyToNewDevice(legacyDevice: LegacyDevice): Device {
  if (!legacyDevice)
    return {
      id: '',
      name: '',
      type: '',
      isConnected: false,
      isConnecting: false,
      isDisconnecting: false,
      properties: {}
    }

  // Determine connection status from legacy status field
  const isConnected =
    legacyDevice.isConnected || legacyDevice.status === 'connected' || !!legacyDevice.connectionTime

  // Create a base new format device
  return {
    id: legacyDevice.id,
    name: legacyDevice.deviceName || (legacyDevice.name as string) || '',
    type: legacyDevice.deviceType || (legacyDevice.type as string) || 'unknown',
    ipAddress: legacyDevice.address || (legacyDevice.ipAddress as string) || undefined,
    port: legacyDevice.devicePort || (legacyDevice.port as number) || undefined,
    isConnected: isConnected,
    isConnecting: legacyDevice.status === 'connecting',
    isDisconnecting: legacyDevice.status === 'disconnecting',
    status: (legacyDevice.status as string) || 'idle',
    properties: legacyDevice.properties || {},
    telemetry: legacyDevice.telemetry || {},
    // Transform any additional fields
    lastSeen: legacyDevice.lastSeen ? legacyDevice.lastSeen.toString() : new Date().toISOString(),
    firmwareVersion: legacyDevice.firmwareVersion || ''
  }
}

/**
 * Transforms a property update object from legacy to new format
 */
function transformPropertyUpdate(propertyUpdate: Record<string, unknown>): Record<string, unknown> {
  // Handle property name mappings
  const propertyMappings: Record<string, string> = {
    deviceName: 'name',
    deviceType: 'type',
    devicePort: 'port',
    address: 'ipAddress'
    // Add other mappings as needed
  }

  const newUpdate: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(propertyUpdate)) {
    const newKey = propertyMappings[key] || key
    newUpdate[newKey] = value
  }

  return newUpdate
}

/**
 * Creates an array of legacy-formatted devices from an array of new format devices
 */
function createLegacyDeviceArray(devices: Device[]): LegacyDevice[] {
  if (!Array.isArray(devices)) return []
  return devices.map((device) => newToLegacyDevice(device))
}

/**
 * Creates an array of new-formatted devices from an array of legacy format devices
 */
function createNewDeviceArray(legacyDevices: LegacyDevice[]): Device[] {
  if (!Array.isArray(legacyDevices)) return []
  return legacyDevices.map((device) => legacyToNewDevice(device))
}

/**
 * Merges a legacy device update into an existing device object
 */
function mergeDeviceUpdate(existingDevice: Device, legacyUpdate: Record<string, unknown>): Device {
  if (!existingDevice || !legacyUpdate) return existingDevice

  const transformedUpdate = transformPropertyUpdate(legacyUpdate)

  return {
    ...existingDevice,
    ...transformedUpdate,
    // For nested objects, merge rather than replace
    properties: {
      ...(existingDevice.properties || {}),
      ...((transformedUpdate.properties as Record<string, unknown>) || {})
    },
    telemetry: {
      ...((existingDevice.telemetry as Record<string, unknown>) || {}),
      ...((transformedUpdate.telemetry as Record<string, unknown>) || {})
    }
  }
}

/**
 * Adapter class for providing compatibility between legacy components and the new unified store
 */
export class StoreAdapter {
  private store: UnifiedStore
  private _discoveredDevices: LegacyDevice[] = []
  private _connectedDevices: LegacyDevice[] = []
  private _listeners: Record<string, ((...args: unknown[]) => void)[]> = {
    discovery: [],
    connection: [],
    deviceUpdated: []
  }

  /**
   * Create a new StoreAdapter
   * @param existingStore Optional existing UnifiedStore instance to use
   */
  constructor(existingStore?: UnifiedStore) {
    this.store = existingStore || new UnifiedStore()

    // Initialize device arrays from existing store data
    if (existingStore) {
      this._initializeFromStore()
    }

    this._setupStoreListeners()
  }

  /**
   * Initialize the adapter's internal arrays from the store data
   */
  private _initializeFromStore(): void {
    // Populate discovered and connected device arrays from the store
    this.store.devices.forEach((device) => {
      const legacyDevice = newToLegacyDevice(device)
      this._addToDiscoveredDevices(legacyDevice)

      if (device.isConnected) {
        this._connectedDevices.push(legacyDevice)
      }
    })
  }

  /**
   * Set up listeners for new store events and map them to legacy event handlers
   */
  private _setupStoreListeners(): void {
    // Listen for device events
    this.store.addEventListener((event: DeviceEvent) => {
      let legacyDevice: LegacyDevice
      let device: Device | null

      switch (event.type) {
        case 'deviceAdded':
          legacyDevice = newToLegacyDevice(event.device)
          this._addToDiscoveredDevices(legacyDevice)
          this._notifyListeners('discovery', legacyDevice)
          break

        case 'deviceRemoved':
          this._notifyListeners('deviceRemoved', event.deviceId)

          // Remove from internal arrays
          this._discoveredDevices = this._discoveredDevices.filter((d) => d.id !== event.deviceId)
          this._connectedDevices = this._connectedDevices.filter((d) => d.id !== event.deviceId)
          break

        case 'deviceUpdated':
          device = this.store.getDeviceById(event.deviceId)
          if (device) {
            this._updateDevice(device)
            const updatedLegacyDevice = newToLegacyDevice(device)
            this._updateDeviceConnectionStatus(device)
            this._notifyListeners('deviceUpdated', updatedLegacyDevice)
          }
          break

        case 'discoveryStarted':
          this._notifyListeners('discoveryStarted')
          break

        case 'discoveryStopped':
          this._notifyListeners('discoveryStopped')
          break
      }
    })
  }

  /**
   * Add a device to the discovered devices list if it doesn't exist
   */
  private _addToDiscoveredDevices(device: LegacyDevice): void {
    const existingIndex = this._discoveredDevices.findIndex((d) => d.id === device.id)

    if (existingIndex >= 0) {
      // Update existing device
      this._discoveredDevices[existingIndex] = device
    } else {
      // Add new device
      this._discoveredDevices.push(device)
    }
  }

  /**
   * Update device connection status in internal arrays
   */
  private _updateDeviceConnectionStatus(device: Device): void {
    // Find the device in the discovered devices list
    const legacyDevice = newToLegacyDevice(device)

    // Update in discovered devices list
    const discoveredIndex = this._discoveredDevices.findIndex((d) => d.id === device.id)
    if (discoveredIndex >= 0) {
      this._discoveredDevices[discoveredIndex] = legacyDevice
    }

    // Update connected devices list
    const connectedIndex = this._connectedDevices.findIndex((d) => d.id === device.id)

    if (device.isConnected) {
      // Add to connected devices if not already there
      if (connectedIndex < 0) {
        this._connectedDevices.push(legacyDevice)
      } else {
        this._connectedDevices[connectedIndex] = legacyDevice
      }
    } else {
      // Remove from connected devices
      if (connectedIndex >= 0) {
        this._connectedDevices.splice(connectedIndex, 1)
      }
    }
  }

  /**
   * Update a device in the internal arrays
   */
  private _updateDevice(device: Device): void {
    const legacyDevice = newToLegacyDevice(device)

    // Update in discovered devices list
    const discoveredIndex = this._discoveredDevices.findIndex((d) => d.id === device.id)
    if (discoveredIndex >= 0) {
      this._discoveredDevices[discoveredIndex] = legacyDevice
    } else {
      // If not found, add it
      this._discoveredDevices.push(legacyDevice)
    }

    // Update in connected devices list if connected
    if (device.isConnected) {
      const connectedIndex = this._connectedDevices.findIndex((d) => d.id === device.id)
      if (connectedIndex >= 0) {
        this._connectedDevices[connectedIndex] = legacyDevice
      } else {
        this._connectedDevices.push(legacyDevice)
      }
    } else {
      // If not connected, ensure it's removed from connected devices
      this._connectedDevices = this._connectedDevices.filter((d) => d.id !== device.id)
    }
  }

  /**
   * Notify listeners of an event
   */
  private _notifyListeners(eventType: string, data?: unknown): void {
    if (this._listeners[eventType]) {
      this._listeners[eventType].forEach((listener) => {
        try {
          listener(data)
        } catch (error) {
          console.error(`Error in ${eventType} listener:`, error)
        }
      })
    }
  }

  // LEGACY API METHODS

  /**
   * Get the list of discovered devices (legacy API)
   */
  get discoveredDevices(): LegacyDevice[] {
    return [...this._discoveredDevices]
  }

  /**
   * Get the list of connected devices (legacy API)
   */
  get connectedDevices(): LegacyDevice[] {
    return [...this._connectedDevices]
  }

  /**
   * Get discovery status (legacy API)
   */
  get isDiscovering(): boolean {
    return this.store.isDiscovering
  }

  /**
   * Start device discovery (legacy API)
   */
  startDiscovery(): boolean {
    return this.store.startDiscovery()
  }

  /**
   * Stop device discovery (legacy API)
   */
  stopDiscovery(): boolean {
    return this.store.stopDiscovery()
  }

  /**
   * Connect to a device (legacy API)
   */
  async connectToDevice(deviceIdOrObject: string | LegacyDevice): Promise<boolean> {
    const deviceId = typeof deviceIdOrObject === 'string' ? deviceIdOrObject : deviceIdOrObject.id
    return this.store.connectDevice(deviceId)
  }

  /**
   * Disconnect from a device (legacy API)
   */
  async disconnectDevice(deviceIdOrObject: string | LegacyDevice): Promise<boolean> {
    const deviceId = typeof deviceIdOrObject === 'string' ? deviceIdOrObject : deviceIdOrObject.id
    return this.store.disconnectDevice(deviceId)
  }

  /**
   * Update device properties (legacy API)
   */
  updateDeviceProperties(deviceId: string, properties: Record<string, unknown>): boolean {
    return this.store.updateDeviceProperties(deviceId, properties)
  }

  /**
   * Get a device by ID (legacy API)
   */
  getDeviceById(deviceId: string): LegacyDevice | null {
    const device = this.store.getDeviceById(deviceId)
    return device ? newToLegacyDevice(device) : null
  }

  /**
   * Add a device to the store (legacy API)
   */
  addDevice(legacyDevice: LegacyDevice): boolean {
    const newDevice = legacyToNewDevice(legacyDevice)
    const result = this.store.addDevice(newDevice)

    // Update our internal arrays regardless of whether it's a silent operation in the store
    if (result) {
      const device = this.store.getDeviceById(newDevice.id)
      if (device) {
        this._addToDiscoveredDevices(newToLegacyDevice(device))
      }
    }

    return result
  }

  /**
   * Remove a device from the store (legacy API)
   */
  removeDevice(deviceId: string): boolean {
    return this.store.removeDevice(deviceId)
  }

  /**
   * Filter devices by type (legacy API)
   */
  getDevicesByType(deviceType: string): LegacyDevice[] {
    return this._discoveredDevices.filter((device) => device.deviceType === deviceType)
  }

  /**
   * Register an event listener (legacy API)
   */
  on(eventType: string, callback: (data?: unknown) => void): void {
    if (!this._listeners[eventType]) {
      this._listeners[eventType] = []
    }

    this._listeners[eventType].push(callback)
  }

  /**
   * Remove an event listener (legacy API)
   */
  off(eventType: string, callback: (data?: unknown) => void): void {
    if (this._listeners[eventType]) {
      this._listeners[eventType] = this._listeners[eventType].filter(
        (listener) => listener !== callback
      )
    }
  }

  /**
   * Check if device exists (legacy API)
   */
  hasDevice(deviceId: string): boolean {
    return this.store.hasDevice(deviceId)
  }
}

// Helper functions for conversion
export {
  newToLegacyDevice,
  legacyToNewDevice,
  transformPropertyUpdate,
  createLegacyDeviceArray,
  createNewDeviceArray,
  mergeDeviceUpdate
}

/**
 * Helper function to create a new StoreAdapter instance
 * @param existingStore Optional existing UnifiedStore instance
 * @returns A new StoreAdapter instance
 */
export function createStoreAdapter(existingStore?: UnifiedStore): StoreAdapter {
  return new StoreAdapter(existingStore)
}

// Default export for the adapter
export default StoreAdapter
