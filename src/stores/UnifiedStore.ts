// Status: Good - Core Component
// This is the core store implementation that:
// - Combines modular functionality for different device types
// - Provides a clean, maintainable architecture
// - Integrates with the event system
// - Manages device state and actions
// - Supports both real and simulated devices

/**
 * Unified Store
 *
 * A modern, type-safe store implementation for managing devices.
 * This store combines modular functionality for different device types
 * with a clean, maintainable architecture.
 */

import { defineStore } from 'pinia'
import type { Device } from './types/device-store.types'
import type { UnifiedDevice } from '@/types/device.types'

// Import module creators
import { createCoreActions } from './modules/coreActions'
import { createEventSystem } from './modules/eventSystem'
import { createSimulationActions } from './modules/simulationActions'
import { createDiscoveryActions } from './modules/discoveryActions'
import { createCameraActions } from './modules/cameraActions'
import { createTelescopeActions } from './modules/telescopeActions'

// Re-export type for convenience
export type { Device }

// Define store using Pinia
export const useUnifiedStore = defineStore('unifiedStore', {
  state: () => {
    // Combine state from all modules
    return {
      ...createCoreActions().state(),
      ...createEventSystem().state(),
      ...createSimulationActions().state(),
      ...createDiscoveryActions().state(),
      ...createCameraActions().state(),
      ...createTelescopeActions().state()
    }
  },

  getters: {
    devicesList: (state) => state.devicesArray,
    connectedDevices: (state) => state.devicesArray.filter((device) => device.isConnected),
    selectedDevice: (state) => (state.selectedDeviceId ? state.devices.get(state.selectedDeviceId) || null : null)
  },

  actions: {
    // Import all actions from modules
    ...createCoreActions().actions,
    ...createEventSystem().actions,
    ...createSimulationActions().actions,
    ...createDiscoveryActions().actions,
    ...createCameraActions().actions,
    ...createTelescopeActions().actions,

    /**
     * Check if a device already exists in the store
     * @param device The device to check
     * @returns True if device already exists
     */
    deviceExists(device: UnifiedDevice): boolean {
      return this.devicesArray.some(
        (existingDevice) =>
          existingDevice.id === device.id ||
          (existingDevice.ipAddress === device.ipAddress && existingDevice.port === device.port && existingDevice.type === device.type)
      )
    },

    /**
     * Add a device to the store with duplicate checking
     * @param device The device to add
     * @returns True if device was added, false if it already existed
     */
    addDeviceWithCheck(device: UnifiedDevice): boolean {
      // Check if device already exists
      if (this.deviceExists(device)) {
        console.log(`Device already exists: ${device.name} (${device.id})`)
        return false
      }

      // Make sure device is in a valid state before adding
      if (!device.status || device.status === 'error') {
        device.status = 'idle'
      }

      // Add the device
      this.addDevice(device)
      return true
    },

    /**
     * Get a property value from a device
     * @param deviceId The ID of the device
     * @param property The property name to retrieve
     * @returns The property value
     */
    async getDeviceProperty(deviceId: string, property: string): Promise<unknown> {
      const device = this.getDeviceById(deviceId)
      if (!device) {
        throw new Error(`Device not found: ${deviceId}`)
      }

      // Get the client for this device
      const client = this.getDeviceClient(deviceId)

      if (!client) {
        throw new Error(`No API client available for device ${deviceId}`)
      }

      try {
        // Call the getProperty method on the client
        console.log(`Getting property ${property} from device ${deviceId}`)

        // Get the property value
        const result = await client.getProperty(property)
        return result
      } catch (error) {
        console.error(`Error getting property ${property} from device ${deviceId}:`, error)
        throw error
      }
    },

    /**
     * Get a property value from a device with devicestate optimization
     * This method tries to use devicestate first for efficiency, and falls back
     * to individual property fetching if the property isn't available in devicestate.
     *
     * @param deviceId The ID of the device
     * @param property The property name to retrieve
     * @returns The property value
     */
    async getDevicePropertyOptimized(deviceId: string, property: string): Promise<unknown> {
      const device = this.getDeviceById(deviceId)
      if (!device) {
        throw new Error(`Device not found: ${deviceId}`)
      }

      // Normalize property name to lowercase for consistency
      const normalizedProperty = property.toLowerCase()

      // Try devicestate first for efficiency
      try {
        // Use cached devicestate with 500ms TTL by default
        const deviceState = await this.fetchDeviceState(deviceId, {
          cacheTtlMs: 500, // 500ms default TTL
          forceRefresh: false // Use cache if available
        })

        if (deviceState && deviceState[normalizedProperty] !== undefined) {
          // Property found in devicestate - return it
          return deviceState[normalizedProperty]
        }

        // Property not in devicestate or devicestate failed - fall back to individual property
        return await this.getDeviceProperty(deviceId, property)
      } catch (error) {
        // If devicestate fails for any reason, fall back to individual property
        console.debug(`Devicestate failed for ${deviceId}, falling back to individual property fetch:`, error)
        return await this.getDeviceProperty(deviceId, property)
      }
    },

    /**
     * Set a property value on a device
     * @param deviceId The ID of the device
     * @param property The property name to set
     * @param value The value to set
     * @returns The result from the device
     */
    async setDeviceProperty(deviceId: string, property: string, value: unknown): Promise<unknown> {
      const device = this.getDeviceById(deviceId)
      if (!device) {
        throw new Error(`Device not found: ${deviceId}`)
      }

      // Get the client for this device
      const client = this.getDeviceClient(deviceId)

      if (!client) {
        throw new Error(`No API client available for device ${deviceId}`)
      }

      try {
        // Call the setProperty method on the client
        console.log(`Setting property ${property} on device ${deviceId} to`, value)

        // Set the property value
        const result = await client.setProperty(property, value)

        // Emit event about property change
        this._emitEvent({
          type: 'devicePropertyChanged',
          deviceId,
          property,
          value
        })

        return result
      } catch (error) {
        console.error(`Error setting property ${property} on device ${deviceId}:`, error)
        throw error
      }
    },

    // Master method for calling device methods via a client or simulation
    async callDeviceMethod(deviceId: string, method: string, args: unknown[] = []): Promise<unknown> {
      // Debug logging for camera state and imageready method calls
      if (method === 'camerastate' || method === 'imageready') {
        console.log(`%c📞 Method Call: ${method} for device ${deviceId}`, 'color: orange; font-weight: bold')
        console.log('Call stack:', new Error().stack)
      }

      const device = this.getDeviceById(deviceId)
      if (!device) {
        throw new Error(`Device not found: ${deviceId}`)
      }

      // Get the client for this device
      const client = this.getDeviceClient(deviceId)

      // If we have a client, try to use it
      if (client) {
        try {
          // Call the method on the client
          console.log(`Calling method ${method} on device ${deviceId} via API client`)

          // Check if the first argument is an object - if so, it's likely named parameters
          // for PUT operations according to ASCOM Alpaca spec
          let result: unknown

          if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
            // This is a named parameter object
            console.log(`Using named parameters for ${method}:`, args[0])
            // Use the object directly as parameters - this matches the Alpaca client's expected interface
            const params = args[0] as Record<string, unknown>
            result = await client.put(method, params)
          } else {
            // Standard parameter array
            result = await client.callMethod(method, args)
          }

          // Emit event about successful method call
          this._emitEvent({
            type: 'deviceMethodCalled',
            deviceId,
            method,
            args,
            result
          })

          return result
        } catch (error) {
          console.error(`Error calling method ${method} on device ${deviceId}:`, error)

          // No longer falling back to simulation - let the real error propagate
          throw error
        }
      } else {
        console.error(`No API client available for device ${deviceId}`)
        throw new Error(`No API client available for device ${deviceId}`)
      }
    }
  }
})

// Export the store type
export type UnifiedStoreType = ReturnType<typeof useUnifiedStore>

// Export the store creator function
export default useUnifiedStore
