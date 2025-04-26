/**
 * Unified Store
 *
 * A modern, type-safe store implementation for managing devices.
 * This store will eventually replace the legacy store implementation
 * with a more maintainable and extensible architecture.
 */

import type { UnifiedDevice } from '../types/DeviceTypes'

// Use the existing type definitions
export type Device = UnifiedDevice

export interface StoreOptions {
  silent?: boolean
}

// Define event types
export type DeviceEvent =
  | { type: 'deviceAdded'; device: Device }
  | { type: 'deviceRemoved'; deviceId: string }
  | { type: 'deviceUpdated'; deviceId: string; updates: Partial<Device> }
  | { type: 'discoveryStarted' }
  | { type: 'discoveryStopped' }

export type DeviceEventListener = (event: DeviceEvent) => void

class UnifiedStore {
  private _devices: Map<string, Device>
  private _isDiscovering: boolean
  private _discoveryTimeout: ReturnType<typeof setInterval> | null
  private _eventListeners: DeviceEventListener[] = []

  constructor() {
    // Main data storage
    this._devices = new Map()
    this._isDiscovering = false
    this._discoveryTimeout = null
  }

  /**
   * Get all devices as an array
   * @returns {Array} Array of all devices
   */
  get devices(): Device[] {
    return Array.from(this._devices.values())
  }

  /**
   * Check if discovery is currently active
   * @returns {boolean} Discovery status
   */
  get isDiscovering(): boolean {
    return this._isDiscovering
  }

  /**
   * Add an event listener
   * @param listener - Event listener function
   */
  addEventListener(listener: DeviceEventListener): void {
    this._eventListeners.push(listener)
  }

  /**
   * Remove an event listener
   * @param listener - Event listener function to remove
   */
  removeEventListener(listener: DeviceEventListener): void {
    const index = this._eventListeners.indexOf(listener)
    if (index !== -1) {
      this._eventListeners.splice(index, 1)
    }
  }

  /**
   * Emit an event to all listeners
   * @param event - Event to emit
   */
  private _emitEvent(event: DeviceEvent): void {
    this._eventListeners.forEach((listener) => listener(event))
  }

  /**
   * Get a device by its ID
   * @param {string} deviceId - ID of the device to retrieve
   * @returns {Device|null} Device object or null if not found
   */
  getDeviceById(deviceId: string): Device | null {
    return this._devices.get(deviceId) || null
  }

  /**
   * Add a device to the store
   * @param {Device} device - Device to add
   * @param {StoreOptions} options - Additional options
   * @returns {boolean} Success status
   */
  addDevice(device: Device, options: StoreOptions = {}): boolean {
    if (!device || !device.id) return false

    // Don't add if already exists
    if (this._devices.has(device.id)) return false

    // Ensure device has required fields
    const normalizedDevice = this._normalizeDevice(device)

    // Add to store
    this._devices.set(normalizedDevice.id, normalizedDevice)

    // Emit event if not silent
    if (!options.silent) {
      this._emitEvent({ type: 'deviceAdded', device: normalizedDevice })
    }

    return true
  }

  /**
   * Remove a device from the store
   * @param {string} deviceId - Device ID to remove
   * @param {StoreOptions} options - Additional options
   * @returns {boolean} Success status
   */
  removeDevice(deviceId: string, options: StoreOptions = {}): boolean {
    if (!deviceId || !this._devices.has(deviceId)) return false

    this._devices.delete(deviceId)

    if (!options.silent) {
      this._emitEvent({ type: 'deviceRemoved', deviceId })
    }

    return true
  }

  /**
   * Update a device in the store
   * @param {string} deviceId - Device ID to update
   * @param {Partial<Device>} updates - Updates to apply
   * @param {StoreOptions} options - Additional options
   * @returns {boolean} Success status
   */
  updateDevice(deviceId: string, updates: Partial<Device>, options: StoreOptions = {}): boolean {
    if (!deviceId || !this._devices.has(deviceId)) return false

    const device = this._devices.get(deviceId)
    if (!device) return false

    const updatedDevice = { ...device, ...updates }

    // Validate updated device
    if (!updatedDevice.id) return false

    this._devices.set(deviceId, updatedDevice)

    if (!options.silent) {
      this._emitEvent({ type: 'deviceUpdated', deviceId, updates })
    }

    return true
  }

  /**
   * Update specific device properties
   * @param {string} deviceId - ID of the device to update
   * @param {Record<string, unknown>} properties - Object containing properties to update
   * @returns {boolean} Success status
   */
  updateDeviceProperties(deviceId: string, properties: Record<string, unknown>): boolean {
    const device = this._devices.get(deviceId)
    if (!device) return false

    return this.updateDevice(deviceId, {
      properties: {
        ...(device.properties || {}),
        ...properties
      }
    })
  }

  /**
   * Connect to a device
   * @param {string} deviceId - Device ID to connect
   * @returns {Promise<boolean>} Promise resolving to success status
   */
  async connectDevice(deviceId: string): Promise<boolean> {
    if (!deviceId || !this._devices.has(deviceId)) {
      return Promise.resolve(false)
    }

    const device = this._devices.get(deviceId)
    if (!device) return Promise.resolve(false)

    // Already connected or connecting
    if (device.isConnected || device.isConnecting) {
      return Promise.resolve(true)
    }

    // Update status to connecting
    this.updateDevice(deviceId, { isConnecting: true })

    try {
      // Simulate connection process (actual implementation would call hardware APIs)
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Update to connected state
      this.updateDevice(deviceId, {
        isConnected: true,
        isConnecting: false,
        lastConnected: new Date().toISOString()
      })

      return true
    } catch (error) {
      // Reset connection state
      this.updateDevice(deviceId, {
        isConnected: false,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      })

      return false
    }
  }

  /**
   * Disconnect from a device
   * @param {string} deviceId - Device ID to disconnect
   * @returns {Promise<boolean>} Promise resolving to success status
   */
  async disconnectDevice(deviceId: string): Promise<boolean> {
    if (!deviceId || !this._devices.has(deviceId)) {
      return Promise.resolve(false)
    }

    const device = this._devices.get(deviceId)
    if (!device) return Promise.resolve(false)

    // Already disconnected or disconnecting
    if (!device.isConnected || device.isDisconnecting) {
      return Promise.resolve(true)
    }

    // Update status to disconnecting
    this.updateDevice(deviceId, { isDisconnecting: true })

    try {
      // Simulate disconnection process
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Update to disconnected state
      this.updateDevice(deviceId, {
        isConnected: false,
        isDisconnecting: false
      })

      return true
    } catch (error) {
      // Reset disconnection state but leave connected
      this.updateDevice(deviceId, {
        isDisconnecting: false,
        error: error instanceof Error ? error.message : 'Disconnection failed'
      })

      return false
    }
  }

  /**
   * Start device discovery
   * @param {StoreOptions} options - Additional options
   * @returns {boolean} Success status
   */
  startDiscovery(options: StoreOptions = {}): boolean {
    if (this._isDiscovering) return true

    this._isDiscovering = true

    if (!options.silent) {
      this._emitEvent({ type: 'discoveryStarted' })
    }

    // Simulate periodic device discovery
    this._discoveryTimeout = setInterval(() => {
      // In a real implementation, this would scan for new devices
      console.log('Device discovery scan...')
    }, 30000)

    return true
  }

  /**
   * Stop device discovery
   * @param {StoreOptions} options - Additional options
   * @returns {boolean} Success status
   */
  stopDiscovery(options: StoreOptions = {}): boolean {
    if (!this._isDiscovering) return true

    this._isDiscovering = false

    if (this._discoveryTimeout) {
      clearInterval(this._discoveryTimeout)
      this._discoveryTimeout = null
    }

    if (!options.silent) {
      this._emitEvent({ type: 'discoveryStopped' })
    }

    return true
  }

  /**
   * Get all devices of a specific type
   * @param {string} deviceType - Type of devices to retrieve
   * @returns {Array<Device>} Array of devices matching the specified type
   */
  getDevicesByType(deviceType: string): Device[] {
    return this.devices.filter(
      (device) => device.deviceType === deviceType || device.type === deviceType
    )
  }

  /**
   * Get all connected devices
   * @returns {Array<Device>} Array of connected devices
   */
  getConnectedDevices(): Device[] {
    return this.devices.filter((device) => device.isConnected)
  }

  /**
   * Check if a device with the given ID exists
   * @param {string} deviceId - ID to check
   * @returns {boolean} True if the device exists
   */
  hasDevice(deviceId: string): boolean {
    return this._devices.has(deviceId)
  }

  /**
   * Clear all devices from the store
   * @param {StoreOptions} options - Additional options
   * @returns {boolean} Success status
   */
  clearDevices(options: StoreOptions = {}): boolean {
    const deviceIds = Array.from(this._devices.keys())

    // Clear devices
    this._devices.clear()

    // Emit events if not silent
    if (!options.silent) {
      deviceIds.forEach((deviceId) => {
        this._emitEvent({ type: 'deviceRemoved', deviceId })
      })
    }

    return true
  }

  /**
   * Normalize a device object to ensure it has all required fields
   * @param {Device} device - Device to normalize
   * @returns {Device} Normalized device
   * @private
   */
  private _normalizeDevice(device: Device): Device {
    const normalized = { ...device }

    // Ensure required fields
    normalized.id =
      normalized.id || `dev-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    normalized.type = normalized.type || 'unknown'
    normalized.name =
      normalized.name || normalized.displayName || `Device ${normalized.id.substring(0, 6)}`
    normalized.properties = normalized.properties || {}

    // Ensure connection state properties
    normalized.isConnected = !!normalized.isConnected
    normalized.isConnecting = !!normalized.isConnecting
    normalized.isDisconnecting = !!normalized.isDisconnecting

    // Ensure metadata
    normalized.discoveredAt = normalized.discoveredAt || new Date().toISOString()

    return normalized
  }

  /**
   * For compatibility with EventEmitter-style code
   * @param event - Event name
   * @param listener - Event listener
   */
  on(event: string, listener: (...args: any[]) => void): void {
    this.addEventListener((deviceEvent) => {
      if (deviceEvent.type === event) {
        // Map the event to the expected args format
        switch (event) {
          case 'deviceAdded':
            listener((deviceEvent as any).device)
            break
          case 'deviceRemoved':
            listener((deviceEvent as any).deviceId)
            break
          case 'deviceUpdated':
            listener((deviceEvent as any).deviceId, (deviceEvent as any).updates)
            break
          default:
            listener()
            break
        }
      }
    })
  }

  /**
   * Remove a listener (compatibility method)
   * @param event - Event name
   * @param listener - Listener to remove
   */
  off(event: string, listener: (...args: any[]) => void): void {
    // This is a simplified version that doesn't exactly remove the specific listener
    // In a real implementation, you'd need to track the wrappers
  }

  /**
   * Emit an event (compatibility method)
   * @param event - Event name
   * @param args - Event arguments
   */
  emit(event: string, ...args: any[]): void {
    switch (event) {
      case 'deviceAdded':
        this._emitEvent({ type: 'deviceAdded', device: args[0] })
        break
      case 'deviceRemoved':
        this._emitEvent({ type: 'deviceRemoved', deviceId: args[0] })
        break
      case 'deviceUpdated':
        this._emitEvent({ type: 'deviceUpdated', deviceId: args[0], updates: args[1] })
        break
      case 'discoveryStarted':
        this._emitEvent({ type: 'discoveryStarted' })
        break
      case 'discoveryStopped':
        this._emitEvent({ type: 'discoveryStopped' })
        break
    }
  }
}

export default UnifiedStore
