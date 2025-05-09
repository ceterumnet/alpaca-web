// Status: Good - Core Module
// This is the core actions module that:
// - Implements fundamental device operations
// - Handles common device functionality
// - Provides shared action utilities
// - Supports device abstraction
// - Maintains core operation state

/**
 * Core Actions Module
 *
 * Provides core functionality for managing devices
 */

import type { Device, StoreOptions, DeviceEvent } from '../types/device-store.types'
import type { AlpacaClient } from '@/api/alpaca/base-client'
import { createAlpacaClient } from '@/api/AlpacaClient'
import { isValidStateTransition } from '@/types/device.types'

export interface CoreState {
  devices: Map<string, Device>
  devicesArray: Device[]
  selectedDeviceId: string | null
  deviceClients: Map<string, AlpacaClient>
  allowSimulations: boolean
  theme: 'light' | 'dark'
  isSidebarVisible: boolean
  getDeviceById: (deviceId: string) => Device | null
  getDeviceClient: (deviceId: string) => AlpacaClient | null
  executeDeviceOperation: <T>(deviceId: string, operation: (client: AlpacaClient) => Promise<T>, fallback?: () => Promise<T>) => Promise<T>
  deviceStateCache: Map<string, { timestamp: number; data: Record<string, unknown> }>
  _propertyPollingIntervals: Map<string, number>
  _deviceStateAvailableProps: Map<string, Set<string>>
  _deviceStateUnsupported: Set<string>
  lastDeviceStateFetch: Map<string, { timestamp: number; data: Record<string, unknown> }>
}

export function createCoreActions() {
  return {
    state: (): CoreState => ({
      devices: new Map<string, Device>(),
      devicesArray: [],
      selectedDeviceId: null,
      deviceClients: new Map<string, AlpacaClient>(),
      allowSimulations: false,
      theme: 'light',
      isSidebarVisible: true,
      getDeviceById: () => null, // This will be overridden by the action
      getDeviceClient: () => null, // This will be overridden by the action
      executeDeviceOperation: async () => {
        throw new Error('Not implemented')
      }, // This will be overridden by the action
      deviceStateCache: new Map<string, { timestamp: number; data: Record<string, unknown> }>(),
      _propertyPollingIntervals: new Map<string, number>(),
      _deviceStateAvailableProps: new Map<string, Set<string>>(),
      _deviceStateUnsupported: new Set<string>(),
      lastDeviceStateFetch: new Map<string, { timestamp: number; data: Record<string, unknown> }>()
    }),

    actions: {
      getDeviceById(this: CoreState, deviceId: string): Device | null {
        return this.devices.get(deviceId) || null
      },

      getDeviceClient(this: CoreState, deviceId: string): AlpacaClient | null {
        const client = this.deviceClients.get(deviceId)
        return client ? (client as AlpacaClient) : null
      },

      hasValidApiUrl(this: CoreState, deviceId: string): boolean {
        const device = this.getDeviceById(deviceId)
        return !!device?.apiBaseUrl && typeof device.apiBaseUrl === 'string'
      },

      createDeviceClient(this: CoreState, device: Device): AlpacaClient | null {
        if (!device.apiBaseUrl || typeof device.apiBaseUrl !== 'string') {
          console.warn(`No apiBaseUrl found for device ${device.id}, attempting to construct one from device ID`)

          // Special handling for device IDs in the format "192.168.4.169:8080:camera:0"
          if (device.id && device.id.includes(':')) {
            try {
              const parts = device.id.split(':')
              if (parts.length >= 4) {
                const ip = parts[0]
                const port = parts[1]
                const type = parts[2].toLowerCase()
                const deviceNum = parseInt(parts[3], 10)

                if (!isNaN(deviceNum)) {
                  // Construct API URL directly from device ID parts
                  const apiBaseUrl = `http://${ip}:${port}/api/v1/${type}/${deviceNum}`
                  console.log(`Parsed device ID ${device.id} into API URL: ${apiBaseUrl}`)

                  // Try to create a client with these values
                  try {
                    console.log(`Creating AlpacaClient from parsed device ID with:`, {
                      apiBaseUrl,
                      deviceType: type,
                      deviceNum
                    })

                    const client = createAlpacaClient(apiBaseUrl, type, deviceNum)

                    // Log success
                    console.log(`Successfully created AlpacaClient for ${type} device ${device.id} from ID parsing`)

                    return client
                  } catch (parseError) {
                    console.error(`Failed to create client from parsed device ID:`, parseError)
                  }
                }
              }
            } catch (error) {
              console.error(`Failed to parse device ID ${device.id}:`, error)
            }
          }

          console.error(`Cannot create API client: missing or invalid apiBaseUrl for device ${device.id}`)
          return null
        }

        try {
          console.log(`Creating AlpacaClient for device ${device.id} with:`, {
            apiBaseUrl: device.apiBaseUrl,
            deviceType: device.type,
            deviceNum: device.deviceNum
          })

          // Ensure we have a valid deviceNum
          const deviceNum = typeof device.deviceNum === 'number' ? device.deviceNum : 0

          // Create the client
          const client = createAlpacaClient(device.apiBaseUrl, device.type, deviceNum)

          // Log success
          console.log(`Successfully created AlpacaClient for ${device.type} device ${device.id}`)

          return client
        } catch (error) {
          console.error(`Failed to create client for device ${device.id}:`, error)
          return null
        }
      },

      // Method to call to connect a device
      async connectDevice(
        this: CoreState & {
          _emitEvent: (event: DeviceEvent) => void
          updateDevice: (deviceId: string, updates: Partial<Device>) => boolean
          callDeviceMethod: (deviceId: string, method: string, args: unknown[]) => Promise<unknown>
          getDeviceClient: (deviceId: string) => AlpacaClient | null
          fetchCameraProperties?: (deviceId: string) => Promise<boolean>
          fetchTelescopeProperties?: (deviceId: string) => Promise<boolean>
          updateDeviceCapabilities: (deviceId: string) => boolean
        },
        deviceId: string
      ): Promise<boolean> {
        const device = this.getDeviceById(deviceId)
        if (!device) {
          throw new Error(`Cannot connect: Device not found ${deviceId}`)
        }

        if (device.isConnected) {
          console.log(`Device ${deviceId} is already connected`)
          return true
        }

        // Validate state transition
        if (!isValidStateTransition(device.status, 'connecting')) {
          throw new Error(`Invalid state transition from ${device.status} to connecting`)
        }

        console.log(`Connecting to device ${deviceId}`)

        // Update device state to show connecting
        this.updateDevice(deviceId, {
          isConnecting: true,
          status: 'connecting',
          stateHistory: [...(device.stateHistory || []), { from: device.status, to: 'connecting', timestamp: Date.now() }]
        })

        try {
          // Get the client for this device
          const client = this.getDeviceClient(deviceId)
          if (!client) {
            throw new Error(`No API client available for device ${deviceId}`)
          }

          // Use the 'connected' property instead of 'connect' method (new in latest Alpaca)
          await client.setProperty('connected', true)

          // Update device state to connected
          this.updateDevice(deviceId, {
            isConnected: true,
            isConnecting: false,
            status: 'connected',
            stateHistory: [...(device.stateHistory || []), { from: 'connecting', to: 'connected', timestamp: Date.now() }]
          })

          // Emit connect event
          this._emitEvent({ type: 'deviceConnected', deviceId })

          // If this is a camera, fetch its properties
          if (device.type === 'camera' && this.fetchCameraProperties) {
            try {
              console.log(`Device ${deviceId} is a camera, fetching properties`)
              await this.fetchCameraProperties(deviceId)

              // Process and normalize capabilities after properties are fetched
              this.updateDeviceCapabilities(deviceId)
            } catch (propError) {
              console.error(`Error fetching camera properties: ${propError}`)
              // Don't fail the connection if property fetching fails
            }
          }
          // If this is a telescope, fetch its properties
          else if (device.type === 'telescope' && this.fetchTelescopeProperties) {
            try {
              console.log(`Device ${deviceId} is a telescope, fetching properties`)
              await this.fetchTelescopeProperties(deviceId)

              // Process and normalize capabilities after properties are fetched
              this.updateDeviceCapabilities(deviceId)
            } catch (propError) {
              console.error(`Error fetching telescope properties: ${propError}`)
              // Don't fail the connection if property fetching fails
            }
          }

          return true
        } catch (error) {
          console.error(`Error connecting to device ${deviceId}:`, error)

          // Update device state to error
          this.updateDevice(deviceId, {
            isConnecting: false,
            status: 'error',
            stateHistory: [...(device.stateHistory || []), { from: 'connecting', to: 'error', timestamp: Date.now() }]
          })

          // Emit error event
          this._emitEvent({
            type: 'deviceConnectionError',
            deviceId,
            error: String(error)
          })

          throw error
        }
      },

      async disconnectDevice(
        this: CoreState & {
          _emitEvent: (event: DeviceEvent) => void
          updateDevice: (deviceId: string, updates: Partial<Device>) => boolean
          callDeviceMethod: (deviceId: string, method: string, args: unknown[]) => Promise<unknown>
          getDeviceClient: (deviceId: string) => AlpacaClient | null
          stopCameraPropertyPolling?: (deviceId: string) => void
          stopTelescopePropertyPolling?: (deviceId: string) => void
          _deviceStateAvailableProps?: Map<string, Set<string>>
          _deviceStateUnsupported?: Set<string>
        },
        deviceId: string
      ): Promise<boolean> {
        const device = this.getDeviceById(deviceId)
        if (!device) {
          throw new Error(`Device not found: ${deviceId}`)
        }

        // Validate state transition
        if (!isValidStateTransition(device.status, 'disconnecting')) {
          throw new Error(`Invalid state transition from ${device.status} to disconnecting`)
        }

        // Update device state to disconnecting
        this.updateDevice(deviceId, {
          isDisconnecting: true,
          status: 'disconnecting',
          stateHistory: [...(device.stateHistory || []), { from: device.status, to: 'disconnecting', timestamp: Date.now() }]
        })

        try {
          // Get the client for this device
          const client = this.getDeviceClient(deviceId)
          if (!client) {
            throw new Error(`No API client available for device ${deviceId}`)
          }

          // If this is a camera, stop property polling
          if (device.type === 'camera' && this.stopCameraPropertyPolling) {
            try {
              console.log(`Stopping property polling for camera ${deviceId}`)
              this.stopCameraPropertyPolling(deviceId)
            } catch (error) {
              console.error(`Error stopping camera property polling: ${error}`)
              // Don't fail the disconnection if polling cleanup fails
            }
          }

          // If this is a telescope, stop property polling and clear devicestate tracking
          if (device.type === 'telescope') {
            // Stop polling
            if (this.stopTelescopePropertyPolling) {
              try {
                console.log(`Stopping property polling for telescope ${deviceId}`)
                this.stopTelescopePropertyPolling(deviceId)
              } catch (error) {
                console.error(`Error stopping telescope property polling: ${error}`)
                // Don't fail the disconnection if polling cleanup fails
              }
            }

            // Clear devicestate tracking information
            if (this._deviceStateAvailableProps) {
              this._deviceStateAvailableProps.delete(deviceId)
            }

            if (this._deviceStateUnsupported) {
              this._deviceStateUnsupported.delete(deviceId)
            }
          }

          // Use the 'connected' property instead of 'disconnect' method (new in latest Alpaca)
          await client.setProperty('connected', false)

          // Update device state to idle
          this.updateDevice(deviceId, {
            isConnected: false,
            isDisconnecting: false,
            status: 'idle',
            stateHistory: [...(device.stateHistory || []), { from: 'disconnecting', to: 'idle', timestamp: Date.now() }]
          })

          // Emit disconnect event
          this._emitEvent({ type: 'deviceDisconnected', deviceId })

          return true
        } catch (error) {
          console.error(`Error disconnecting from device ${deviceId}:`, error)

          // Update device state to error
          this.updateDevice(deviceId, {
            isDisconnecting: false,
            status: 'error',
            stateHistory: [...(device.stateHistory || []), { from: 'disconnecting', to: 'error', timestamp: Date.now() }]
          })

          // Emit error event
          this._emitEvent({
            type: 'deviceConnectionError',
            deviceId,
            error: String(error)
          })

          throw error
        }
      },

      addDevice(
        this: CoreState & {
          _emitEvent: (event: DeviceEvent) => void
          _normalizeDevice: (device: Device) => Device
          createDeviceClient: (device: Device) => AlpacaClient | null
        },
        device: Partial<Device>,
        options: StoreOptions = {}
      ): boolean {
        const defaultDevice: Device = {
          id: device.id || '',
          name: device.name || '',
          type: device.type || '',
          isConnected: false,
          isConnecting: false,
          isDisconnecting: false,
          properties: device.properties || { isSimulation: true },
          status: 'idle',
          displayName: device.displayName,
          discoveredAt: device.discoveredAt,
          lastConnected: device.lastConnected,
          deviceType: device.deviceType,
          ipAddress: device.ipAddress,
          address: device.address,
          port: device.port,
          devicePort: device.devicePort,
          telemetry: device.telemetry,
          lastSeen: device.lastSeen,
          firmwareVersion: device.firmwareVersion,
          apiBaseUrl: device.apiBaseUrl,
          deviceNum: device.deviceNum,
          idx: device.idx,
          capabilities: device.capabilities,
          deviceAttributes: device.deviceAttributes,
          stateHistory: device.stateHistory
        }

        if (!device || !device.id) return false

        console.log('Adding device to UnifiedStore:', {
          deviceId: device.id,
          deviceType: device.type,
          deviceName: device.name,
          deviceApiBaseUrl: device.apiBaseUrl
        })

        // Ensure device has required fields
        console.log('Normalizing device:', device)
        const normalizedDevice = this._normalizeDevice(defaultDevice)

        // Add to both Map and Array
        this.devices.set(normalizedDevice.id, normalizedDevice)
        this.devicesArray.push(normalizedDevice)

        console.log('DEBUG - After adding to store:')
        console.log('- Map size:', this.devices.size)
        console.log('- Array length:', this.devicesArray.length)

        // Create and store client if device has apiBaseUrl
        if (normalizedDevice.apiBaseUrl && typeof normalizedDevice.apiBaseUrl === 'string') {
          const client = this.createDeviceClient(normalizedDevice)
          if (client) {
            this.deviceClients.set(normalizedDevice.id, client)
            console.log(`Created API client for device ${normalizedDevice.id}`)
          }
        }

        console.log('Device added to UnifiedStore:', {
          id: normalizedDevice.id,
          type: normalizedDevice.type,
          apiBaseUrl: normalizedDevice.apiBaseUrl
        })
        console.log('Current store size:', this.devices.size)
        console.log('Current devices:', Array.from(this.devices.keys()))

        // Emit event if not silent
        if (!options.silent) {
          this._emitEvent({ type: 'deviceAdded', device: normalizedDevice })
        }

        return true
      },

      removeDevice(
        this: CoreState & {
          _emitEvent: (event: DeviceEvent) => void
          stopCameraPropertyPolling?: (deviceId: string) => void
          stopTelescopePropertyPolling?: (deviceId: string) => void
          _deviceStateAvailableProps?: Map<string, Set<string>>
          _deviceStateUnsupported?: Set<string>
        },
        deviceId: string,
        options: StoreOptions = {}
      ): boolean {
        if (!deviceId || !this.devices.has(deviceId)) return false

        const device = this.devices.get(deviceId)

        // Clean up the client if it exists
        if (this.deviceClients.has(deviceId)) {
          console.log(`Removing API client for device ${deviceId}`)
          this.deviceClients.delete(deviceId)
        }

        // Stop property polling if this is a camera
        if (device && device.type === 'camera' && this.stopCameraPropertyPolling) {
          try {
            console.log(`Stopping property polling for camera ${deviceId}`)
            this.stopCameraPropertyPolling(deviceId)
          } catch (error) {
            console.error(`Error stopping camera property polling: ${error}`)
          }
        }

        // Stop property polling if this is a telescope
        if (device && device.type === 'telescope') {
          // Stop polling
          if (this.stopTelescopePropertyPolling) {
            try {
              console.log(`Stopping property polling for telescope ${deviceId}`)
              this.stopTelescopePropertyPolling(deviceId)
            } catch (error) {
              console.error(`Error stopping telescope property polling: ${error}`)
            }
          }

          // Clear devicestate tracking information
          if (this._deviceStateAvailableProps) {
            console.log(`Clearing devicestate tracking for telescope ${deviceId}`)
            this._deviceStateAvailableProps.delete(deviceId)
          }

          if (this._deviceStateUnsupported) {
            this._deviceStateUnsupported.delete(deviceId)
          }
        }

        // Remove from Map
        this.devices.delete(deviceId)

        // Remove from Array
        const index = this.devicesArray.findIndex((device) => device.id === deviceId)
        if (index !== -1) {
          this.devicesArray.splice(index, 1)
        }

        // Clear selection if the removed device was selected
        if (this.selectedDeviceId === deviceId) {
          this.selectedDeviceId = null
        }

        // Emit device removed event if not silent
        if (!options.silent) {
          this._emitEvent({ type: 'deviceRemoved', deviceId })
        }

        return true
      },

      updateDevice(
        this: CoreState & {
          _emitEvent: (event: DeviceEvent) => void
          createDeviceClient: (device: Device) => AlpacaClient | null
        },
        deviceId: string,
        updates: Partial<Device>,
        options: StoreOptions = {}
      ): boolean {
        if (!deviceId || !this.devices.has(deviceId)) return false

        const device = this.devices.get(deviceId)
        if (!device) return false

        const updatedDevice = { ...device, ...updates }

        // Validate updated device
        if (!updatedDevice.id) return false

        // Update in Map
        this.devices.set(deviceId, updatedDevice)

        // Update in Array
        const index = this.devicesArray.findIndex((device) => device.id === deviceId)
        if (index !== -1) {
          this.devicesArray[index] = updatedDevice
        }

        // Update the client if apiBaseUrl has changed
        if (updates.apiBaseUrl !== undefined && updates.apiBaseUrl !== device.apiBaseUrl) {
          // Remove old client
          if (this.deviceClients.has(deviceId)) {
            this.deviceClients.delete(deviceId)
          }

          // Create new client if the URL is valid
          if (updates.apiBaseUrl && typeof updates.apiBaseUrl === 'string') {
            const client = this.createDeviceClient(updatedDevice)
            if (client) {
              this.deviceClients.set(deviceId, client)
              console.log(`Updated API client for device ${deviceId}`)
            }
          }
        }

        if (!options.silent) {
          this._emitEvent({ type: 'deviceUpdated', deviceId, updates })
        }

        return true
      },

      updateDeviceProperties(
        this: CoreState & {
          updateDevice: (deviceId: string, updates: Partial<Device>) => boolean
          _emitEvent: (event: DeviceEvent) => void
          updateDeviceCapabilities?: (deviceId: string) => boolean
        },
        deviceId: string,
        properties: Record<string, unknown>
      ): boolean {
        const device = this.devices.get(deviceId)
        if (!device) return false

        // Add special tracing for gain and offset
        if ('gain' in properties || 'offset' in properties) {
          console.log(`%c[TRACE] Updating critical properties for ${deviceId}:`, 'background: #ff9; color: #363; font-weight: bold')
          console.log(`%c[TRACE] gain:`, 'color: #363', properties.gain)
          console.log(`%c[TRACE] offset:`, 'color: #363', properties.offset)
          console.trace(`Property update stack trace (gain/offset)`)
        }

        // Log the incoming property update for debugging
        // console.log(`Updating device properties for ${deviceId}:`, properties)

        // Create a merged properties object to update the device
        const updatedProperties = {
          ...(device.properties || {}),
          ...properties
        }

        // Update the device
        const result = this.updateDevice(deviceId, {
          properties: updatedProperties
        })

        // Emit events for each changed property
        if (result) {
          // Loop over new properties and emit change events
          Object.entries(properties).forEach(([key, value]) => {
            // Special logging for gain/offset
            if (key === 'gain' || key === 'offset') {
              console.log(`%c[TRACE] Emitting event for ${deviceId}.${key} = ${value}`, 'background: #ff9; color: #363; font-weight: bold')
            }

            // console.log(`Emitting devicePropertyChanged event for ${deviceId}.${key} = ${value}`)
            this._emitEvent({
              type: 'devicePropertyChanged',
              deviceId,
              property: key,
              value
            })
          })

          // Check if any capability-related properties were updated
          const hasCapabilityChanges = Object.keys(properties).some(
            (key) => key.toLowerCase().startsWith('can') || key.toLowerCase().startsWith('has')
          )

          // If we have capability changes and the updateDeviceCapabilities function exists, update them
          if (hasCapabilityChanges && this.updateDeviceCapabilities) {
            this.updateDeviceCapabilities(deviceId)
          }
        } else {
          console.warn(`Failed to update properties for device ${deviceId}`)
        }

        // Map some properties to more user-friendly names
        if (updatedProperties.binx !== undefined) updatedProperties.binningX = updatedProperties.binx
        if (updatedProperties.biny !== undefined) updatedProperties.binningY = updatedProperties.biny
        if (updatedProperties.cooleron !== undefined) updatedProperties.coolerEnabled = updatedProperties.cooleron
        if (updatedProperties.ccdtemperature !== undefined) updatedProperties.currentTemperature = updatedProperties.ccdtemperature

        // Initialize default exposure time as it's not a standard ALPACA property
        updatedProperties.exposureTime = updatedProperties.exposureTime || 1.0 // Default to 1 second exposure

        return result
      },

      _normalizeDevice(device: Device): Device {
        // Debug before normalization
        console.log('_normalizeDevice - BEFORE:', {
          id: device.id,
          type: device.type,
          typeUpperCase: device.type?.toUpperCase(),
          typeLowerCase: device.type?.toLowerCase()
        })

        const normalized = {
          id: device.id,
          name: device.name,
          // Always normalize type to lowercase for consistency
          type: device.type?.toLowerCase() || '',
          isConnected: device.isConnected || false,
          isConnecting: device.isConnecting || false,
          isDisconnecting: device.isDisconnecting || false,
          properties: device.properties || {},
          status: device.status || 'idle',
          apiBaseUrl: device.apiBaseUrl,
          ipAddress: device.ipAddress,
          port: device.port,
          displayName: device.displayName,
          discoveredAt: device.discoveredAt,
          lastConnected: device.lastConnected,
          deviceType: device.deviceType,
          deviceNum: device.deviceNum,
          idx: device.idx,
          capabilities: device.capabilities,
          deviceAttributes: device.deviceAttributes,
          stateHistory: device.stateHistory
        }

        // Debug after normalization
        console.log('_normalizeDevice - AFTER:', {
          id: normalized.id,
          type: normalized.type
        })

        return normalized
      },

      // UI state management methods
      toggleSidebar(this: CoreState): void {
        console.log('Toggling sidebar from', this.isSidebarVisible, 'to', !this.isSidebarVisible)
        this.isSidebarVisible = !this.isSidebarVisible
      },

      selectDevice(this: CoreState, deviceId: string): void {
        console.log('Selecting device:', deviceId)
        this.selectedDeviceId = deviceId
      },

      setTheme(this: CoreState, newTheme: 'light' | 'dark'): void {
        console.log('Setting theme from', this.theme, 'to', newTheme)
        this.theme = newTheme
      },

      getDevicesByType(this: CoreState, deviceType: string): Device[] {
        return this.devicesArray.filter((device) => device.deviceType === deviceType || device.type === deviceType)
      },

      hasDevice(this: CoreState, deviceId: string): boolean {
        return this.devices.has(deviceId)
      },

      clearDevices(
        this: CoreState & {
          _emitEvent: (event: DeviceEvent) => void
          stopCameraPropertyPolling?: (deviceId: string) => void
          stopTelescopePropertyPolling?: (deviceId: string) => void
        },
        options: StoreOptions = {}
      ): boolean {
        const deviceIds = Array.from(this.devices.keys())

        // Stop polling for all camera devices
        if (this.stopCameraPropertyPolling) {
          const cameraDevices = this.devicesArray.filter((device) => device.type === 'camera')
          for (const camera of cameraDevices) {
            try {
              console.log(`Stopping property polling for camera ${camera.id}`)
              this.stopCameraPropertyPolling(camera.id)
            } catch (error) {
              console.error(`Error stopping camera property polling: ${error}`)
            }
          }
        }

        // Stop polling for all telescope devices
        if (this.stopTelescopePropertyPolling) {
          const telescopeDevices = this.devicesArray.filter((device) => device.type === 'telescope')
          for (const telescope of telescopeDevices) {
            try {
              console.log(`Stopping property polling for telescope ${telescope.id}`)
              this.stopTelescopePropertyPolling(telescope.id)
            } catch (error) {
              console.error(`Error stopping telescope property polling: ${error}`)
            }
          }
        }

        // Clear devices
        this.devices.clear()
        this.devicesArray = []

        // Emit events if not silent
        if (!options.silent) {
          deviceIds.forEach((deviceId) => {
            this._emitEvent({ type: 'deviceRemoved', deviceId })
          })
        }

        return true
      },

      // Method to create a simulated device for testing
      createSimulatedDevice(
        this: CoreState & {
          addDevice: (device: Device, options?: StoreOptions) => boolean
        },
        deviceType: string,
        name: string,
        properties: Record<string, unknown> = {}
      ): string {
        // Create a device with simulation flag
        const device: Device = {
          id: `sim-${deviceType}-${Date.now()}`,
          type: deviceType,
          name: name,
          isConnected: false,
          isConnecting: false,
          isDisconnecting: false,
          status: 'idle',
          properties: {
            isSimulation: true,
            ...properties
          }
        }

        // Add to store
        this.addDevice(device)

        console.log(`Created simulated ${deviceType} device: ${name}`)
        return device.id
      },

      /**
       * Process device properties to extract and normalize capabilities
       * This helps standardize how we detect and handle device capabilities
       * across different device types
       */
      updateDeviceCapabilities(
        this: CoreState & {
          updateDevice: (deviceId: string, updates: Partial<Device>) => boolean
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
        },
        deviceId: string
      ): boolean {
        const device = this.getDeviceById(deviceId)
        if (!device || !device.properties) return false

        // Initialize capabilities object if it doesn't exist
        const capabilities: Record<string, boolean> = device.capabilities || {}
        const deviceAttributes: Record<string, unknown> = device.deviceAttributes || {}
        const properties = device.properties

        // Extract all properties with 'can' prefix
        Object.entries(properties).forEach(([key, value]) => {
          // Convert capabilities (prefixed with 'can')
          if (key.toLowerCase().startsWith('can') && typeof value === 'boolean') {
            const capabilityName = key.toLowerCase()
            capabilities[capabilityName] = !!value
          }

          // Handle special case for 'has' prefix (like hasShutter)
          if (key.toLowerCase().startsWith('has') && typeof value !== 'undefined') {
            const attributeName = key.toLowerCase()
            deviceAttributes[attributeName] = value
          }
        })

        // Device type specific handling
        switch (device.type.toLowerCase()) {
          case 'camera':
            // Extract camera-specific capabilities
            if (typeof properties.cansetccdtemperature === 'boolean') {
              capabilities.cancool = !!properties.cansetccdtemperature
            }

            // Camera-specific attributes
            if (typeof properties.camerastate !== 'undefined') deviceAttributes.camerastate = properties.camerastate
            if (typeof properties.ccdtemperature !== 'undefined') deviceAttributes.temperature = properties.ccdtemperature
            if (typeof properties.cooleron !== 'undefined') deviceAttributes.cooleron = properties.cooleron
            if (typeof properties.coolerpower !== 'undefined') deviceAttributes.coolerpower = properties.coolerpower
            if (typeof properties.hasshutter !== 'undefined') deviceAttributes.hasshutter = properties.hasshutter
            break

          case 'telescope':
            // Extract telescope-specific capabilities
            if (typeof properties.canpulse !== 'undefined') {
              capabilities.canpulseguide = !!properties.canpulse
            }

            // Telescope-specific attributes
            if (typeof properties.altitude !== 'undefined') deviceAttributes.altitude = properties.altitude
            if (typeof properties.azimuth !== 'undefined') deviceAttributes.azimuth = properties.azimuth
            if (typeof properties.rightascension !== 'undefined') deviceAttributes.rightascension = properties.rightascension
            if (typeof properties.declination !== 'undefined') deviceAttributes.declination = properties.declination
            if (typeof properties.tracking !== 'undefined') deviceAttributes.tracking = properties.tracking
            break
        }

        // Update the device with normalized capabilities and attributes
        return this.updateDevice(deviceId, {
          capabilities,
          deviceAttributes
        })
      },

      /**
       * Check if a device supports a specific capability
       * @param deviceId - The ID of the device to check
       * @param capability - The capability name to check (with or without 'can' prefix)
       * @returns true if the device supports the capability, false otherwise
       */
      deviceSupports(this: CoreState, deviceId: string, capability: string): boolean {
        const device = this.getDeviceById(deviceId)
        if (!device || !device.capabilities) return false

        // If capability already starts with 'can', use it directly
        let capabilityName = capability.toLowerCase()
        if (!capabilityName.startsWith('can')) {
          capabilityName = 'can' + capabilityName
        }

        return !!device.capabilities[capabilityName]
      },

      /**
       * Check if a device has a specific attribute
       * @param deviceId - The ID of the device to check
       * @param attribute - The attribute name to check (with or without 'has' prefix)
       * @returns true if the device has the attribute, false otherwise
       */
      deviceHas(this: CoreState, deviceId: string, attribute: string): boolean {
        const device = this.getDeviceById(deviceId)
        if (!device || !device.deviceAttributes) return false

        // If attribute already starts with 'has', use it directly
        let attributeName = attribute.toLowerCase()
        if (!attributeName.startsWith('has')) {
          attributeName = 'has' + attributeName
        }

        // Attributes are stored with the 'has' prefix
        return device.deviceAttributes[attributeName] === true
      },

      /**
       * Try to fetch device state in a single call
       * This is a common implementation for all device types that can be more
       * efficient than polling each property individually
       */
      async fetchDeviceState(this: CoreState, deviceId: string): Promise<Record<string, unknown> | null> {
        const client = this.deviceClients.get(deviceId)
        if (!client) return null

        try {
          const state = await client.getDeviceState()
          const timestamp = Date.now()
          this.lastDeviceStateFetch.set(deviceId, { timestamp, data: state || {} })
          return state
        } catch (error) {
          console.error(`Error fetching state for device ${deviceId}:`, error)
          return null
        }
      },

      /**
       * Execute a device operation with proper error handling and client management
       * This method serves as an abstraction layer between UI components and device clients
       * @param deviceId The ID of the device to operate on
       * @param operation Function that performs the actual operation using a client
       * @param fallback Optional fallback function to handle missing clients
       * @returns Result of the operation
       */
      async executeDeviceOperation<T>(
        this: CoreState & {
          createDeviceClient: (device: Device) => AlpacaClient | null
          updateDevice: (deviceId: string, updates: Partial<Device>) => boolean
        },
        deviceId: string,
        operation: (client: AlpacaClient) => Promise<T>,
        fallback?: () => Promise<T>
      ): Promise<T> {
        const device = this.getDeviceById(deviceId)
        if (!device) {
          throw new Error(`Device not found: ${deviceId}`)
        }

        // Get the client for this device
        let client = this.getDeviceClient(deviceId)

        // If no client exists, try to create one - with enhanced logging and error handling
        if (!client && device) {
          console.warn(`No API client found for device ${deviceId}, attempting to create one`)

          console.log('Device data:', {
            id: device.id,
            type: device.type,
            apiBaseUrl: device.apiBaseUrl,
            properties: device.properties || {},
            ipAddress: device.ipAddress,
            port: device.port
          })

          // Check if the device has an API base URL, or try to construct one from available properties
          if (!device.apiBaseUrl) {
            console.log(`Device ${deviceId} has no API base URL, attempting to construct one from properties`)

            // Try multiple approaches to construct the API URL
            let apiBaseUrl: string | undefined = undefined
            let deviceNum = device.deviceNum !== undefined ? device.deviceNum : 0

            // Approach 1: Use ipAddress and port if available
            if (device.ipAddress && device.port) {
              apiBaseUrl = `http://${device.ipAddress}:${device.port}/api/v1/${device.type.toLowerCase()}/${deviceNum}`
              console.log(`Constructed API URL from IP/port: ${apiBaseUrl}`)
            }
            // Approach 2: Check for apiBaseUrl in properties
            else if (device.properties && device.properties.apiBaseUrl) {
              apiBaseUrl = device.properties.apiBaseUrl as string
              if (device.properties.deviceNumber !== undefined) {
                deviceNum = device.properties.deviceNumber as number
              }
              console.log(`Found apiBaseUrl in properties: ${apiBaseUrl}, deviceNum: ${deviceNum}`)
            }
            // Approach 3: Look for address and devicePort
            else if (device.address && device.devicePort) {
              apiBaseUrl = `http://${device.address}:${device.devicePort}/api/v1/${device.type.toLowerCase()}/${deviceNum}`
              console.log(`Constructed API URL from address/devicePort: ${apiBaseUrl}`)
            }
            // Approach 4: Last resort - try to parse from device ID if it follows a pattern
            else if (device.id && device.id.includes(':')) {
              try {
                // Try to parse from device ID format like "192.168.4.169:8080:camera:0"
                const parts = device.id.split(':')
                if (parts.length >= 4) {
                  const ip = parts[0]
                  const port = parts[1]
                  const type = parts[2].toLowerCase()
                  deviceNum = parseInt(parts[3], 10)
                  if (!isNaN(deviceNum)) {
                    apiBaseUrl = `http://${ip}:${port}/api/v1/${type}/${deviceNum}`
                    console.log(`Constructed API URL from device ID parts: ${apiBaseUrl}`)
                  }
                }
              } catch (err) {
                console.error(`Failed to parse device ID ${device.id}:`, err)
              }
            }

            // If we found an API URL, update the device
            if (apiBaseUrl) {
              console.log(`Updating device ${deviceId} with API URL: ${apiBaseUrl} and deviceNum: ${deviceNum}`)
              this.updateDevice(deviceId, {
                apiBaseUrl,
                deviceNum
              })
            } else {
              console.error(`Cannot create client: insufficient connection information for device ${deviceId}`)
            }
          }

          // Try to get updated device after possible updates
          const updatedDevice = this.getDeviceById(deviceId)
          if (updatedDevice && updatedDevice.apiBaseUrl) {
            // Try to create a client with the updated information
            client = this.createDeviceClient(updatedDevice)
            if (client) {
              // Store the client in the map
              this.deviceClients.set(deviceId, client)
              console.log(`Successfully created client for device ${deviceId}`)
            } else {
              console.error(`Failed to create client for device ${deviceId} even with apiBaseUrl: ${updatedDevice.apiBaseUrl}`)
            }
          }
        }

        if (!client) {
          console.warn(`No API client available for device ${deviceId}`)

          // If a fallback is provided, use it
          if (fallback) {
            console.log(`Using fallback for operation on device ${deviceId}`)
            return await fallback()
          }

          throw new Error(`No API client available for device ${deviceId}`)
        }

        try {
          // Execute the operation using the client
          return await operation(client)
        } catch (error) {
          console.error(`Error executing operation on device ${deviceId}:`, error)
          throw error
        }
      },

      /**
       * Enhanced getDeviceProperty that uses the executeDeviceOperation abstraction
       */
      async getDeviceProperty(this: CoreState, deviceId: string, property: string): Promise<unknown> {
        return this.executeDeviceOperation(deviceId, async (client: AlpacaClient) => {
          console.log(`Getting property ${property} from device ${deviceId}`)
          return await client.getProperty(property)
        })
      },

      /**
       * Enhanced setDeviceProperty that uses the executeDeviceOperation abstraction
       */
      async setDeviceProperty(
        this: CoreState & {
          _emitEvent: (event: { type: string; deviceId: string; property: string; value: unknown }) => void
        },
        deviceId: string,
        property: string,
        value: unknown
      ): Promise<unknown> {
        const result = await this.executeDeviceOperation(deviceId, async (client: AlpacaClient) => {
          console.log(`Setting property ${property} on device ${deviceId} to`, value)
          return await client.setProperty(property, value)
        })

        // Emit event about property change
        this._emitEvent({
          type: 'devicePropertyChanged',
          deviceId,
          property,
          value
        })

        return result
      },

      /**
       * Enhanced callDeviceMethod that uses the executeDeviceOperation abstraction
       */
      async callDeviceMethod(
        this: CoreState & {
          _emitEvent: (event: { type: string; deviceId: string; method: string; args: unknown[]; result: unknown }) => void
          shouldFallbackToSimulation: (deviceId: string, method: string) => boolean
          simulateDeviceMethod: (deviceId: string, method: string, args: unknown[]) => unknown
        },
        deviceId: string,
        method: string,
        args: unknown[] = []
      ): Promise<unknown> {
        // Debug logging for camera state and imageready method calls
        if (method === 'camerastate' || method === 'imageready') {
          console.log(`%c📞 Method Call: ${method} for device ${deviceId}`, 'color: orange; font-weight: bold')
          console.log('Call stack:', new Error().stack)
        }

        // Try to execute the operation with the client
        return this.executeDeviceOperation(
          deviceId,
          async (client: AlpacaClient) => {
            return await client.callMethod(method, args)
          },
          // Fallback to simulation if appropriate
          async () => {
            if (this.shouldFallbackToSimulation(deviceId, method)) {
              console.log(`Falling back to simulation for ${method} on device ${deviceId}`)
              return await this.simulateDeviceMethod(deviceId, method, args)
            }
            throw new Error(`No API client available for device ${deviceId} and no simulation available`)
          }
        )
      }
    }
  }
}
