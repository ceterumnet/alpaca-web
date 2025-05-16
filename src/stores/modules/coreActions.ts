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

import { markRaw } from 'vue'
import type { Device, StoreOptions /*, DeviceEvent */ } from '../types/device-store.types' // DeviceEvent likely unused here directly
import type { AlpacaClient } from '@/api/alpaca/base-client'
import { createAlpacaClient } from '@/api/AlpacaClient'
import { isValidStateTransition } from '@/types/device.types'
import type { UnifiedStoreType } from '../UnifiedStore'

export interface CoreState {
  devices: Map<string, Device>
  devicesArray: Device[]
  selectedDeviceId: string | null
  deviceClients: Map<string, AlpacaClient>
  allowSimulations: boolean
  theme: 'light' | 'dark'
  isSidebarVisible: boolean
  deviceStateCache: Map<string, { timestamp: number; data: Record<string, unknown> }>
  _propertyPollingIntervals: Map<string, number>
  _deviceStateAvailableProps: Map<string, Set<string>>
  _deviceStateUnsupported: Set<string>
  lastDeviceStateFetch: Map<string, { timestamp: number; data: Record<string, unknown> }>
}

// All actions will now use UnifiedStoreType for `this` to avoid context mismatch errors,
// relying on `markRaw` and assertions for AlpacaClient instances.
interface ICoreActions {
  getDeviceById(this: UnifiedStoreType, deviceId: string): Device | null
  getDeviceClient(this: UnifiedStoreType, deviceId: string): AlpacaClient | null
  hasValidApiUrl(this: UnifiedStoreType, deviceId: string): boolean
  _normalizeDevice(this: UnifiedStoreType, device: Device): Device
  createDeviceClient(this: UnifiedStoreType, device: Device): AlpacaClient | null
  deviceExists(this: UnifiedStoreType, device: Device): boolean
  connectDevice(this: UnifiedStoreType, deviceId: string): Promise<boolean>
  disconnectDevice(this: UnifiedStoreType, deviceId: string): Promise<boolean>
  addDevice(this: UnifiedStoreType, device: Partial<Device>, options?: StoreOptions): boolean
  removeDevice(this: UnifiedStoreType, deviceId: string, options?: StoreOptions): boolean
  updateDevice(this: UnifiedStoreType, deviceId: string, updates: Partial<Device>, options?: StoreOptions): boolean
  updateDeviceProperties(this: UnifiedStoreType, deviceId: string, properties: Record<string, unknown>): boolean
  toggleSidebar(this: UnifiedStoreType): void
  selectDevice(this: UnifiedStoreType, deviceId: string): void
  setTheme(this: UnifiedStoreType, newTheme: 'light' | 'dark'): void
  getDevicesByType(this: UnifiedStoreType, deviceType: string): Device[]
  hasDevice(this: UnifiedStoreType, deviceId: string): boolean
  clearDevices(this: UnifiedStoreType, options?: StoreOptions): boolean
  createSimulatedDevice(this: UnifiedStoreType, deviceType: string, name: string, properties?: Record<string, unknown>): string
  updateDeviceCapabilities(this: UnifiedStoreType, deviceId: string): boolean
  deviceSupports(this: UnifiedStoreType, deviceId: string, capability: string): boolean
  deviceHas(this: UnifiedStoreType, deviceId: string, attribute: string): boolean
  fetchDeviceState(
    this: UnifiedStoreType,
    deviceId: string,
    options?: { cacheTtlMs?: number; forceRefresh?: boolean }
  ): Promise<Record<string, unknown> | null>
  executeDeviceOperation<T>(
    this: UnifiedStoreType,
    deviceId: string,
    operation: (client: AlpacaClient) => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T>
  getDeviceProperty(this: UnifiedStoreType, deviceId: string, property: string): Promise<unknown>
  setDeviceProperty(this: UnifiedStoreType, deviceId: string, property: string, value: unknown): Promise<unknown>
  callDeviceMethodWithFallback(this: UnifiedStoreType, deviceId: string, method: string, args?: unknown[]): Promise<unknown>
  callDeviceMethod(this: UnifiedStoreType, deviceId: string, method: string, args?: unknown[]): Promise<unknown>
  addDeviceWithCheck(this: UnifiedStoreType, device: Device): boolean
  getDevicePropertyOptimized(this: UnifiedStoreType, deviceId: string, property: string): Promise<unknown>
}

export function createCoreActions(): { state: () => CoreState; actions: ICoreActions } {
  const actionsDefinition: ICoreActions = {
    getDeviceById(this: UnifiedStoreType, deviceId: string): Device | null {
      return this.devices.get(deviceId) || null
    },

    getDeviceClient(this: UnifiedStoreType, deviceId: string): AlpacaClient | null {
      const client = this.deviceClients.get(deviceId)
      return client ? (client as AlpacaClient) : null
    },

    hasValidApiUrl(this: UnifiedStoreType, deviceId: string): boolean {
      const device = this.devices.get(deviceId)
      return !!device?.apiBaseUrl && typeof device.apiBaseUrl === 'string'
    },

    _normalizeDevice(this: UnifiedStoreType, device: Device): Device {
      const normalized = {
        id: device.id,
        name: device.name,
        type: device.type?.toLowerCase() || '',
        isConnected: device.isConnected || false,
        isConnecting: device.isConnecting || false,
        isDisconnecting: device.isDisconnecting || false,
        properties: device.properties || {},
        status: device.status || 'idle',
        apiBaseUrl: device.apiBaseUrl || (device.properties?.apiBaseUrl as string | undefined),
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
      return normalized
    },

    createDeviceClient(this: UnifiedStoreType, device: Device): AlpacaClient | null {
      if (!device.apiBaseUrl || typeof device.apiBaseUrl !== 'string') {
        if (device.id && device.id.includes(':')) {
          try {
            const parts = device.id.split(':')
            if (parts.length >= 4) {
              const ip = parts[0]
              const port = parts[1]
              const type = parts[2].toLowerCase()
              const deviceNum = parseInt(parts[3], 10)
              if (!isNaN(deviceNum)) {
                const apiBaseUrl = `http://${ip}:${port}/api/v1/${type}/${deviceNum}`
                try {
                  return createAlpacaClient(apiBaseUrl, type, deviceNum, device)
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
        const deviceNum = typeof device.deviceNum === 'number' ? device.deviceNum : 0
        return createAlpacaClient(device.apiBaseUrl, device.type, deviceNum, device)
      } catch (error) {
        console.error(`Failed to create client for device ${device.id}:`, error)
        return null
      }
    },

    deviceExists(this: UnifiedStoreType, device: Device): boolean {
      console.log('[UnifiedStore/coreActions] deviceExists called for device ID:', device.id)
      const exists = this.devices.has(device.id)
      console.log('[UnifiedStore/coreActions] Device exists in map?', exists)
      return exists
    },

    async connectDevice(this: UnifiedStoreType, deviceId: string): Promise<boolean> {
      const device = this.getDeviceById(deviceId)
      if (!device) {
        throw new Error(`Cannot connect: Device not found ${deviceId}`)
      }
      if (device.isConnected) {
        console.log(`Device ${deviceId} is already connected`)
        return true
      }
      if (!isValidStateTransition(device.status, 'connecting')) {
        throw new Error(`Invalid state transition from ${device.status} to connecting`)
      }
      console.log(`Connecting to device ${deviceId}`)
      this.updateDevice(deviceId, {
        isConnecting: true,
        status: 'connecting',
        stateHistory: [...(device.stateHistory || []), { from: device.status, to: 'connecting', timestamp: Date.now() }]
      })
      try {
        console.log('[connectDevice] Device object at connect time:', device)
        console.log('[connectDevice] device.apiBaseUrl:', device.apiBaseUrl)
        let client = this.getDeviceClient(deviceId)
        if (!client && device.apiBaseUrl) {
          const plainClient = this.createDeviceClient(device)
          if (plainClient) {
            client = plainClient
            this.deviceClients.set(deviceId, markRaw(plainClient))
          }
        }
        if (!client) {
          throw new Error(`No API client available for device ${deviceId}`)
        }
        await client.setProperty('connected', true)
        this.updateDevice(deviceId, {
          isConnected: true,
          isConnecting: false,
          status: 'connected',
          stateHistory: [...(device.stateHistory || []), { from: 'connecting', to: 'connected', timestamp: Date.now() }]
        })
        this._emitEvent({ type: 'deviceConnected', deviceId })
        if (device.type === 'camera' && this.fetchCameraProperties) {
          try {
            console.log(`Device ${deviceId} is a camera, fetching properties`)
            await this.fetchCameraProperties(deviceId)
            this.updateDeviceCapabilities(deviceId)
          } catch (propError) {
            console.error(`Error fetching camera properties: ${propError}`)
          }
        } else if (device.type === 'telescope' && this.fetchTelescopeProperties) {
          try {
            console.log(`Device ${deviceId} is a telescope, fetching properties`)
            await this.fetchTelescopeProperties(deviceId)
            this.updateDeviceCapabilities(deviceId)
          } catch (propError) {
            console.error(`Error fetching telescope properties: ${propError}`)
          }
        }
        return true
      } catch (error) {
        console.error(`Error connecting to device ${deviceId}:`, error)
        this.updateDevice(deviceId, {
          isConnecting: false,
          status: 'error',
          stateHistory: [...(device.stateHistory || []), { from: 'connecting', to: 'error', timestamp: Date.now() }]
        })
        this._emitEvent({
          type: 'deviceConnectionError',
          deviceId,
          error: String(error)
        })
        throw error
      }
    },

    async disconnectDevice(this: UnifiedStoreType, deviceId: string): Promise<boolean> {
      const device = this.getDeviceById(deviceId)
      if (!device) {
        throw new Error(`Device not found: ${deviceId}`)
      }
      if (!isValidStateTransition(device.status, 'disconnecting')) {
        throw new Error(`Invalid state transition from ${device.status} to disconnecting`)
      }
      this.updateDevice(deviceId, {
        isDisconnecting: true,
        status: 'disconnecting',
        stateHistory: [...(device.stateHistory || []), { from: device.status, to: 'disconnecting', timestamp: Date.now() }]
      })
      try {
        let client = this.getDeviceClient(deviceId)
        if (!client && device.apiBaseUrl) {
          const plainClient = this.createDeviceClient(device)
          if (plainClient) {
            client = plainClient
            this.deviceClients.set(deviceId, markRaw(plainClient))
          }
        }
        if (!client) {
          throw new Error(`No API client available for device ${deviceId}`)
        }
        if (device.type === 'camera' && this.stopCameraPropertyPolling) {
          try {
            console.log(`Stopping property polling for camera ${deviceId}`)
            this.stopCameraPropertyPolling(deviceId)
          } catch (error) {
            console.error(`Error stopping camera property polling: ${error}`)
          }
        }
        if (device.type === 'telescope') {
          if (this.stopTelescopePropertyPolling) {
            try {
              console.log(`Stopping property polling for telescope ${deviceId}`)
              this.stopTelescopePropertyPolling(deviceId)
            } catch (error) {
              console.error(`Error stopping telescope property polling: ${error}`)
            }
          }
          if (this._deviceStateAvailableProps) {
            this._deviceStateAvailableProps.delete(deviceId)
          }
          if (this._deviceStateUnsupported) {
            this._deviceStateUnsupported.delete(deviceId)
          }
        }
        await client.setProperty('connected', false)
        this.updateDevice(deviceId, {
          isConnected: false,
          isDisconnecting: false,
          status: 'idle',
          stateHistory: [...(device.stateHistory || []), { from: 'disconnecting', to: 'idle', timestamp: Date.now() }]
        })
        this._emitEvent({ type: 'deviceDisconnected', deviceId })
        return true
      } catch (error) {
        console.error(`Error disconnecting from device ${deviceId}:`, error)
        this.updateDevice(deviceId, {
          isDisconnecting: false,
          status: 'error',
          stateHistory: [...(device.stateHistory || []), { from: 'disconnecting', to: 'error', timestamp: Date.now() }]
        })
        this._emitEvent({
          type: 'deviceConnectionError',
          deviceId,
          error: String(error)
        })
        throw error
      }
    },

    addDevice(this: UnifiedStoreType, device: Partial<Device>, options: StoreOptions = {}): boolean {
      console.log('[UnifiedStore/coreActions] addDevice called for device:', JSON.parse(JSON.stringify(device)))
      if (!device.id || !device.type) {
        console.error('Device ID and Type are required to add a device')
        return false
      }
      const normalizedDevice = this._normalizeDevice(device as Device)
      console.log('[UnifiedStore/coreActions] Normalized device:', JSON.parse(JSON.stringify(normalizedDevice)))
      this.devices.set(normalizedDevice.id, normalizedDevice)
      this.devicesArray = Array.from(this.devices.values())
      console.log('[UnifiedStore/coreActions] devicesArray updated in addDevice. New length:', this.devicesArray.length)
      if (normalizedDevice.apiBaseUrl) {
        const plainClient = this.createDeviceClient(normalizedDevice)
        if (plainClient) {
          this.deviceClients.set(normalizedDevice.id, markRaw(plainClient))
          console.log('[UnifiedStore/coreActions] API client created for device:', normalizedDevice.id)
        }
      }
      if (!options.silent) {
        this._emitEvent({ type: 'deviceAdded', device: normalizedDevice })
      }
      console.log('[UnifiedStore/coreActions] Device added successfully to map and array:', normalizedDevice.id)
      return true
    },

    removeDevice(this: UnifiedStoreType, deviceId: string, options: StoreOptions = {}): boolean {
      if (!deviceId || !this.devices.has(deviceId)) return false
      const device = this.devices.get(deviceId)
      if (this.deviceClients.has(deviceId)) {
        console.log(`Removing API client for device ${deviceId}`)
        this.deviceClients.delete(deviceId)
      }
      if (device && device.type === 'camera' && this.stopCameraPropertyPolling) {
        try {
          console.log(`Stopping property polling for camera ${deviceId}`)
          this.stopCameraPropertyPolling(deviceId)
        } catch (error) {
          console.error(`Error stopping camera property polling: ${error}`)
        }
      }
      if (device && device.type === 'telescope') {
        if (this.stopTelescopePropertyPolling) {
          try {
            console.log(`Stopping property polling for telescope ${deviceId}`)
            this.stopTelescopePropertyPolling(deviceId)
          } catch (error) {
            console.error(`Error stopping telescope property polling: ${error}`)
          }
        }
        if (this._deviceStateAvailableProps) {
          console.log(`Clearing devicestate tracking for telescope ${deviceId}`)
          this._deviceStateAvailableProps.delete(deviceId)
        }
        if (this._deviceStateUnsupported) {
          this._deviceStateUnsupported.delete(deviceId)
        }
      }
      this.devices.delete(deviceId)
      const index = this.devicesArray.findIndex((d: Device) => d.id === deviceId)
      if (index !== -1) {
        this.devicesArray.splice(index, 1)
      }
      if (this.selectedDeviceId === deviceId) {
        this.selectedDeviceId = null
      }
      if (!options.silent) {
        this._emitEvent({ type: 'deviceRemoved', deviceId })
      }
      return true
    },

    updateDevice(this: UnifiedStoreType, deviceId: string, updates: Partial<Device>, options: StoreOptions = {}): boolean {
      if (!deviceId || !this.devices.has(deviceId)) return false
      const device = this.devices.get(deviceId)
      if (!device) return false
      const updatedDevice = { ...device, ...updates }
      if (!updatedDevice.id) return false
      this.devices.set(deviceId, updatedDevice)
      const index = this.devicesArray.findIndex((d: Device) => d.id === deviceId)
      if (index !== -1) {
        this.devicesArray[index] = updatedDevice
      }
      if (updates.apiBaseUrl !== undefined && updates.apiBaseUrl !== device.apiBaseUrl) {
        if (this.deviceClients.has(deviceId)) {
          this.deviceClients.delete(deviceId)
        }
        if (updates.apiBaseUrl && typeof updates.apiBaseUrl === 'string') {
          const plainClient = this.createDeviceClient(updatedDevice)
          if (plainClient) {
            this.deviceClients.set(deviceId, markRaw(plainClient))
            console.log(`Updated API client for device ${deviceId}`)
          }
        }
      }
      if (!options.silent) {
        this._emitEvent({ type: 'deviceUpdated', deviceId, updates })
      }
      return true
    },

    updateDeviceProperties(this: UnifiedStoreType, deviceId: string, properties: Record<string, unknown>): boolean {
      const device = this.devices.get(deviceId)
      if (!device) return false
      if (!device.properties) {
        device.properties = {}
      }
      for (const key in properties) {
        if (Object.prototype.hasOwnProperty.call(properties, key)) {
          if (device.properties[key] !== properties[key]) {
            device.properties[key] = properties[key]
            this._emitEvent({
              type: 'devicePropertyChanged',
              deviceId,
              property: key,
              value: properties[key]
            })
          }
        }
      }
      const hasCapabilityChanges = Object.keys(properties).some((key) => key.toLowerCase().startsWith('can') || key.toLowerCase().startsWith('has'))
      if (hasCapabilityChanges && this.updateDeviceCapabilities) {
        this.updateDeviceCapabilities(deviceId)
      }
      const currentProps = device.properties
      if (currentProps.binx !== undefined) currentProps.binningX = currentProps.binx
      if (currentProps.biny !== undefined) currentProps.binningY = currentProps.biny
      if (currentProps.cooleron !== undefined) currentProps.coolerEnabled = currentProps.cooleron
      if (currentProps.ccdtemperature !== undefined) currentProps.currentTemperature = currentProps.ccdtemperature
      if (currentProps.exposureTime === undefined) {
        currentProps.exposureTime = 1.0
      }
      return true
    },

    toggleSidebar(this: UnifiedStoreType): void {
      this.isSidebarVisible = !this.isSidebarVisible
    },

    selectDevice(this: UnifiedStoreType, deviceId: string): void {
      this.selectedDeviceId = deviceId
    },

    setTheme(this: UnifiedStoreType, newTheme: 'light' | 'dark'): void {
      this.theme = newTheme
    },

    getDevicesByType(this: UnifiedStoreType, deviceType: string): Device[] {
      return this.devicesArray.filter((device: Device) => device.deviceType === deviceType || device.type === deviceType)
    },

    hasDevice(this: UnifiedStoreType, deviceId: string): boolean {
      return this.devices.has(deviceId)
    },

    clearDevices(this: UnifiedStoreType, options: StoreOptions = {}): boolean {
      const deviceIds = Array.from(this.devices.keys())
      if (this.stopCameraPropertyPolling) {
        const cameraDevices = this.devicesArray.filter((device: Device) => device.type === 'camera')
        for (const camera of cameraDevices) {
          try {
            console.log(`Stopping property polling for camera ${camera.id}`)
            this.stopCameraPropertyPolling(camera.id)
          } catch (error) {
            console.error(`Error stopping camera property polling: ${error}`)
          }
        }
      }
      if (this.stopTelescopePropertyPolling) {
        const telescopeDevices = this.devicesArray.filter((device: Device) => device.type === 'telescope')
        for (const telescope of telescopeDevices) {
          try {
            console.log(`Stopping property polling for telescope ${telescope.id}`)
            this.stopTelescopePropertyPolling(telescope.id)
          } catch (error) {
            console.error(`Error stopping telescope property polling: ${error}`)
          }
        }
      }
      this.devices.clear()
      this.devicesArray = []
      this.deviceClients.clear()

      if (!options.silent) {
        deviceIds.forEach((id) => {
          this._emitEvent({ type: 'deviceRemoved', deviceId: id })
        })
      }
      return true
    },

    createSimulatedDevice(this: UnifiedStoreType, deviceType: string, name: string, properties: Record<string, unknown> = {}): string {
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
      this.addDevice(device)
      console.log(`Created simulated ${deviceType} device: ${name}`)
      return device.id
    },

    updateDeviceCapabilities(this: UnifiedStoreType, deviceId: string): boolean {
      const device = this.getDeviceById(deviceId)
      if (!device || !device.properties) return false
      const capabilities: Record<string, boolean> = device.capabilities || {}
      const deviceAttributes: Record<string, unknown> = device.deviceAttributes || {}
      const properties = device.properties
      Object.entries(properties).forEach(([key, value]) => {
        if (key.toLowerCase().startsWith('can') && typeof value === 'boolean') {
          const capabilityName = key.toLowerCase()
          capabilities[capabilityName] = !!value
        }
        if (key.toLowerCase().startsWith('has') && typeof value !== 'undefined') {
          const attributeName = key.toLowerCase()
          deviceAttributes[attributeName] = value
        }
      })
      switch (device.type.toLowerCase()) {
        case 'camera':
          if (typeof properties.cansetccdtemperature === 'boolean') {
            capabilities.cancool = !!properties.cansetccdtemperature
          }
          if (typeof properties.camerastate !== 'undefined') deviceAttributes.camerastate = properties.camerastate
          if (typeof properties.ccdtemperature !== 'undefined') deviceAttributes.temperature = properties.ccdtemperature
          if (typeof properties.cooleron !== 'undefined') deviceAttributes.cooleron = properties.cooleron
          if (typeof properties.coolerpower !== 'undefined') deviceAttributes.coolerpower = properties.coolerpower
          if (typeof properties.hasshutter !== 'undefined') deviceAttributes.hasshutter = properties.hasshutter
          break
        case 'telescope':
          if (typeof properties.canpulse !== 'undefined') {
            capabilities.canpulseguide = !!properties.canpulse
          }
          if (typeof properties.altitude !== 'undefined') deviceAttributes.altitude = properties.altitude
          if (typeof properties.azimuth !== 'undefined') deviceAttributes.azimuth = properties.azimuth
          if (typeof properties.rightascension !== 'undefined') deviceAttributes.rightascension = properties.rightascension
          if (typeof properties.declination !== 'undefined') deviceAttributes.declination = properties.declination
          if (typeof properties.tracking !== 'undefined') deviceAttributes.tracking = properties.tracking
          break
      }
      return this.updateDevice(deviceId, {
        capabilities,
        deviceAttributes
      })
    },

    deviceSupports(this: UnifiedStoreType, deviceId: string, capability: string): boolean {
      const device = this.getDeviceById(deviceId)
      if (!device || !device.capabilities) return false
      let capabilityName = capability.toLowerCase()
      if (!capabilityName.startsWith('can')) {
        capabilityName = 'can' + capabilityName
      }
      return !!device.capabilities[capabilityName]
    },

    deviceHas(this: UnifiedStoreType, deviceId: string, attribute: string): boolean {
      const device = this.getDeviceById(deviceId)
      if (!device || !device.deviceAttributes) return false
      let attributeName = attribute.toLowerCase()
      if (!attributeName.startsWith('has')) {
        attributeName = 'has' + attributeName
      }
      return device.deviceAttributes[attributeName] === true
    },

    async fetchDeviceState(
      this: UnifiedStoreType,
      deviceId: string,
      options?: { cacheTtlMs?: number; forceRefresh?: boolean }
    ): Promise<Record<string, unknown> | null> {
      const client = this.deviceClients.get(deviceId) as AlpacaClient | undefined
      if (!client) return null

      const cachedResult = this.lastDeviceStateFetch.get(deviceId)
      const cacheTtlMs = options?.cacheTtlMs ?? 0
      const forceRefresh = options?.forceRefresh ?? true
      if (cachedResult && cacheTtlMs > 0 && !forceRefresh && Date.now() - cachedResult.timestamp < cacheTtlMs) {
        return cachedResult.data
      }
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

    async executeDeviceOperation<T>(
      this: UnifiedStoreType,
      deviceId: string,
      operation: (client: AlpacaClient) => Promise<T>,
      fallback?: () => Promise<T>
    ): Promise<T> {
      const device = this.getDeviceById(deviceId)
      if (!device) {
        throw new Error(`Device not found: ${deviceId}`)
      }
      let client = this.getDeviceClient(deviceId)
      if (!client && device) {
        if (!device.apiBaseUrl) {
          let apiBaseUrl: string | undefined = undefined
          let deviceNum = device.deviceNum !== undefined ? device.deviceNum : 0
          if (device.ipAddress && device.port) {
            apiBaseUrl = `http://${device.ipAddress}:${device.port}/api/v1/${device.type.toLowerCase()}/${deviceNum}`
          } else if (device.properties && device.properties.apiBaseUrl) {
            apiBaseUrl = device.properties.apiBaseUrl as string
            if (device.properties.deviceNumber !== undefined) {
              deviceNum = device.properties.deviceNumber as number
            }
          } else if (device.address && device.devicePort) {
            apiBaseUrl = `http://${device.address}:${device.devicePort}/api/v1/${device.type.toLowerCase()}/${deviceNum}`
          } else if (device.id && device.id.includes(':')) {
            try {
              const parts = device.id.split(':')
              if (parts.length >= 4) {
                const ip = parts[0]
                const port = parts[1]
                const type = parts[2].toLowerCase()
                deviceNum = parseInt(parts[3], 10)
                if (!isNaN(deviceNum)) {
                  apiBaseUrl = `http://${ip}:${port}/api/v1/${type}/${deviceNum}`
                }
              }
            } catch (err) {
              console.error(`Failed to parse device ID ${device.id}:`, err)
            }
          }
          if (apiBaseUrl) {
            this.updateDevice(deviceId, {
              apiBaseUrl,
              deviceNum
            })
          } else {
            console.error(`Cannot create client: insufficient connection information for device ${deviceId}`)
          }
        }
        const updatedDevice = this.getDeviceById(deviceId)
        if (updatedDevice && updatedDevice.apiBaseUrl) {
          const plainClient = this.createDeviceClient(updatedDevice)
          if (plainClient) {
            client = plainClient
            this.deviceClients.set(deviceId, markRaw(plainClient))
          }
        }
      }
      if (!client) {
        if (fallback) {
          return await fallback()
        }
        throw new Error(`No API client available for device ${deviceId}`)
      }
      try {
        return await operation(client)
      } catch (error) {
        console.error(`Error executing operation on device ${deviceId}:`, error)
        throw error
      }
    },

    async getDeviceProperty(this: UnifiedStoreType, deviceId: string, property: string): Promise<unknown> {
      return this.executeDeviceOperation(deviceId, async (client: AlpacaClient) => {
        return await client.getProperty(property)
      })
    },

    async setDeviceProperty(this: UnifiedStoreType, deviceId: string, property: string, value: unknown): Promise<unknown> {
      const result = await this.executeDeviceOperation(deviceId, async (client: AlpacaClient) => {
        return await client.setProperty(property, value)
      })
      this._emitEvent({
        type: 'devicePropertyChanged',
        deviceId,
        property,
        value
      })
      return result
    },

    async callDeviceMethodWithFallback(this: UnifiedStoreType, deviceId: string, method: string, args: unknown[] = []): Promise<unknown> {
      return this.executeDeviceOperation(
        deviceId,
        async (client: AlpacaClient) => {
          return await client.callMethod(method, args)
        },
        async () => {
          if (this.shouldFallbackToSimulation(deviceId, method)) {
            return await this.simulateDeviceMethod(deviceId, method, args)
          }
          throw new Error(`No API client available for device ${deviceId} and no simulation available`)
        }
      )
    },

    async callDeviceMethod(this: UnifiedStoreType, deviceId: string, method: string, args: unknown[] = []): Promise<unknown> {
      if (method === 'camerastate' || method === 'imageready') {
        console.log(`%c📞 Method Call: ${method} for device ${deviceId}`, 'color: orange; font-weight: bold')
        console.log('Call stack:', new Error().stack)
      }
      const device = this.getDeviceById(deviceId)
      if (!device) {
        throw new Error(`Device not found: ${deviceId}`)
      }
      const client = this.getDeviceClient(deviceId)
      if (client) {
        try {
          console.log(`Calling method ${method} on device ${deviceId} via API client`)
          let result: unknown
          if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
            const params = args[0] as Record<string, unknown>
            result = await client.put(method, params)
          } else {
            result = await client.callMethod(method, args)
          }
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
          throw error
        }
      } else {
        console.warn(`No API client for ${deviceId} in callDeviceMethod, attempting to create.`)
        return this.executeDeviceOperation(deviceId, async (newClient) => {
          if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
            const params = args[0] as Record<string, unknown>
            return newClient.put(method, params)
          } else {
            return newClient.callMethod(method, args)
          }
        })
          .then((opResult) => {
            this._emitEvent({
              type: 'deviceMethodCalled',
              deviceId,
              method,
              args,
              result: opResult
            })
            return opResult
          })
          .catch((err) => {
            console.error(`Failed to create client or call method ${method} on device ${deviceId}:`, err)
            throw err
          })
      }
    },

    addDeviceWithCheck(this: UnifiedStoreType, device: Device): boolean {
      console.log('[UnifiedStore/coreActions] addDeviceWithCheck called for device:', JSON.parse(JSON.stringify(device)))
      if (this.deviceExists(device)) {
        console.log('[UnifiedStore/coreActions] Device already exists:', device.id)
        return false
      }
      console.log('[UnifiedStore/coreActions] Device does not exist, attempting to add:', device.id)
      const added = this.addDevice(device, { silent: true })
      console.log('[UnifiedStore/coreActions] Result of this.addDevice:', added, 'for device:', device.id)
      console.log('[UnifiedStore/coreActions] State of devicesArray after add attempt:', JSON.parse(JSON.stringify(this.devicesArray)))
      return added
    },

    async getDevicePropertyOptimized(this: UnifiedStoreType, deviceId: string, property: string): Promise<unknown> {
      const device = this.getDeviceById(deviceId)
      if (!device) {
        throw new Error(`Device not found: ${deviceId}`)
      }
      const normalizedProperty = property.toLowerCase()
      try {
        const deviceState = await this.fetchDeviceState(deviceId, {
          cacheTtlMs: 500,
          forceRefresh: false
        })
        if (deviceState && deviceState[normalizedProperty] !== undefined) {
          return deviceState[normalizedProperty]
        }
        return await this.getDeviceProperty(deviceId, property)
      } catch (error) {
        console.debug(`Devicestate failed for ${deviceId}, falling back to individual property fetch:`, error)
        return await this.getDeviceProperty(deviceId, property)
      }
    }
  }

  return {
    state: (): CoreState => ({
      devices: new Map<string, Device>(),
      devicesArray: [],
      selectedDeviceId: null,
      deviceClients: new Map<string, AlpacaClient>(),
      allowSimulations: false,
      theme: 'light',
      isSidebarVisible: true,
      deviceStateCache: new Map<string, { timestamp: number; data: Record<string, unknown> }>(),
      _propertyPollingIntervals: new Map<string, number>(),
      _deviceStateAvailableProps: new Map<string, Set<string>>(),
      _deviceStateUnsupported: new Set<string>(),
      lastDeviceStateFetch: new Map<string, { timestamp: number; data: Record<string, unknown> }>()
    }),
    actions: actionsDefinition
  }
}
