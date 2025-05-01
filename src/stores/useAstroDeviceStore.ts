// Status: Good - Core Store
// This is the astronomy device store that:
// - Manages ASCOM device state
// - Handles device-specific operations
// - Provides astronomy device features
// - Supports device coordination
// - Maintains device synchronization

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Device as DeviceClass, DeviceFactory } from '@/types/Device'
import { Telescope } from '@/types/Telescope'
import { Camera } from '@/types/Camera'

/**
 * Base interface for all device types with common properties
 */
export interface BaseDevice {
  id: string
  name: string
  type: string
  location: string
  server: string
  connected: boolean
  connecting: boolean
  hasError: boolean
  favorite: boolean
  apiBaseUrl?: string
  idx?: number
  settings?: Record<string, unknown>
}

/**
 * Specialized interface for telescope devices
 */
export interface TelescopeDevice extends BaseDevice {
  type: 'telescope'
  trackingEnabled: boolean
  currentRa: string
  currentDec: string
  targetRa: string
  targetDec: string
  altitude?: number
  azimuth?: number
}

/**
 * Specialized interface for camera devices
 */
export interface CameraDevice extends BaseDevice {
  type: 'camera'
  exposureTime: number
  gain: number
  coolerEnabled: boolean
  currentTemperature: number
  targetTemperature: number
  binning: number
}

/**
 * Union type for all device types
 */
export type Device = BaseDevice | TelescopeDevice | CameraDevice

/**
 * Server interface for Alpaca servers
 */
export interface Server {
  id: string
  address: string
  port: number
  name: string
  manufacturer: string
  location: string
  version: string
  isOnline: boolean
  isManualEntry: boolean
  lastSeen: Date
}

/**
 * Interface for discovered devices from the Alpaca network
 */
export interface DiscoveredDevice {
  id: string
  address: string
  port: number
  discoveryTime: string
  AlpacaPort: number
  ServerName?: string
  Manufacturer?: string
  ManufacturerVersion?: string
  Location?: string
  isManualEntry?: boolean
  isAdded?: boolean

  // Device-specific properties
  name: string
  type: string
  number: number
  server: Server
  capabilities?: string[]

  // Additional UI properties
  serverAddress?: string
  serverPort?: number
  serverName?: string
  manufacturer?: string
  deviceType?: string
  deviceNumber?: number
  deviceName?: string
  apiBaseUrl?: string
}

/**
 * Interface for manual server data
 */
export interface ServerData {
  address: string
  port: number
  name: string
  isSecure: boolean
}

/**
 * Type guard for checking if a device is a telescope
 */
export function isTelescope(device: Device): device is TelescopeDevice {
  return device.type === 'telescope'
}

/**
 * Type guard for checking if a device is a camera
 */
export function isCamera(device: Device): device is CameraDevice {
  return device.type === 'camera'
}

/**
 * Convert a discovered device to an internal device object
 */
function convertToDevice(discoveredDevice: DiscoveredDevice): Device {
  const baseDevice: BaseDevice = {
    id: crypto.randomUUID(),
    name: discoveredDevice.name || `${discoveredDevice.type} ${discoveredDevice.number}`,
    type: discoveredDevice.type.toLowerCase(),
    location: discoveredDevice.server?.location || 'Unknown',
    server: discoveredDevice.server?.name || 'Unknown Server',
    connected: false,
    connecting: false,
    hasError: false,
    favorite: false,
    apiBaseUrl: discoveredDevice.apiBaseUrl,
    idx: discoveredDevice.number
  }

  // Add type-specific properties
  if (baseDevice.type === 'telescope') {
    return {
      ...baseDevice,
      type: 'telescope',
      trackingEnabled: false,
      currentRa: '00h 00m 00s',
      currentDec: '+00° 00\' 00"',
      targetRa: '00h 00m 00s',
      targetDec: '+00° 00\' 00"'
    } as TelescopeDevice
  } else if (baseDevice.type === 'camera') {
    return {
      ...baseDevice,
      type: 'camera',
      exposureTime: 1.0,
      gain: 0,
      coolerEnabled: false,
      currentTemperature: 20.0,
      targetTemperature: 0.0,
      binning: 1
    } as CameraDevice
  }

  return baseDevice
}

/**
 * Convert a Device object to a DeviceClass (for compatibility)
 */
function convertToDeviceClass(device: Device): DeviceClass {
  if (device.type === 'telescope') {
    const telescope = DeviceFactory.createDevice(Telescope)
    telescope.idx = device.idx || 0
    telescope.connected = device.connected
    if (device.apiBaseUrl) {
      ;(telescope as unknown as { apiBaseUrl: string }).apiBaseUrl = device.apiBaseUrl
    }
    return telescope
  } else if (device.type === 'camera') {
    const camera = DeviceFactory.createDevice(Camera)
    camera.idx = device.idx || 0
    camera.connected = device.connected
    if (device.apiBaseUrl) {
      ;(camera as unknown as { apiBaseUrl: string }).apiBaseUrl = device.apiBaseUrl
    }
    return camera
  }

  throw new Error(`Unsupported device type: ${device.type}`)
}

/**
 * Unified device store that combines functionality from useDevicesStore and useDeviceStore
 */
export const useAstroDeviceStore = defineStore('astroDevice', () => {
  // State
  const devices = ref<Device[]>([])
  const servers = ref<Server[]>([])
  const discoveredDevices = ref<DiscoveredDevice[]>([])
  const isDiscovering = ref(false)
  const lastDiscoveryTime = ref<Date | null>(null)

  // Getters
  const connectedDevices = computed(() => devices.value.filter((device) => device.connected))

  const telescopes = computed(
    () => devices.value.filter((device) => device.type === 'telescope') as TelescopeDevice[]
  )

  const cameras = computed(
    () => devices.value.filter((device) => device.type === 'camera') as CameraDevice[]
  )

  const devicesByType = computed(() => {
    const types: Record<string, Device[]> = {}
    devices.value.forEach((device) => {
      if (!types[device.type]) {
        types[device.type] = []
      }
      types[device.type].push(device)
    })
    return types
  })

  // Legacy compatibility getters
  const legacyDevices = computed(() => {
    try {
      return devices.value.map((device) => convertToDeviceClass(device))
    } catch (err) {
      console.error('Error converting to legacy device:', err)
      return []
    }
  })

  const legacyTelescopes = computed(() =>
    legacyDevices.value.filter((device) => device instanceof Telescope)
  )

  const legacyCameras = computed(() =>
    legacyDevices.value.filter((device) => device instanceof Camera)
  )

  // Generic device methods
  const getDeviceById = (id: string): Device | undefined => {
    return devices.value.find((device) => device.id === id)
  }

  const addDevice = (device: Device) => {
    devices.value.push(device)
  }

  const removeDevice = (id: string) => {
    const index = devices.value.findIndex((d) => d.id === id)
    if (index !== -1) {
      devices.value.splice(index, 1)
    }
  }

  const toggleDeviceConnection = (id: string) => {
    const device = getDeviceById(id)
    if (device) {
      device.connecting = true
      setTimeout(() => {
        device.connected = !device.connected
        device.connecting = false
        // Clear error state when successfully connected
        if (device.connected) {
          device.hasError = false
        }
      }, 1000)
    }
  }

  const toggleFavorite = (id: string) => {
    const device = getDeviceById(id)
    if (device) {
      device.favorite = !device.favorite
    }
  }

  // Server and discovery methods
  const addServer = (server: Server) => {
    servers.value.push(server)
  }

  const startDiscovery = () => {
    isDiscovering.value = true

    // Simulate discovery process
    // In a real implementation, this would use network discovery
    setTimeout(() => {
      isDiscovering.value = false
      lastDiscoveryTime.value = new Date()
    }, 3000)
  }

  const addDiscoveredDeviceToManaged = (discoveredId: string): Device | null => {
    const discoveredDevice = discoveredDevices.value.find((d) => d.id === discoveredId)
    if (discoveredDevice && !discoveredDevice.isAdded) {
      const newDevice = convertToDevice(discoveredDevice)
      devices.value.push(newDevice)
      discoveredDevice.isAdded = true
      return newDevice
    }
    return null
  }

  // Telescope-specific methods
  const setTelescopeTracking = (deviceId: string, enabled: boolean) => {
    const device = getDeviceById(deviceId)
    if (device && isTelescope(device)) {
      device.trackingEnabled = enabled
    }
  }

  const slewToCoordinates = (deviceId: string, ra: string, dec: string) => {
    const device = getDeviceById(deviceId)
    if (device && isTelescope(device)) {
      // Simulate slewing process
      device.targetRa = ra
      device.targetDec = dec

      // Simulate gradual coordinate update
      setTimeout(() => {
        if (device.connected) {
          device.currentRa = ra
          device.currentDec = dec
        }
      }, 3000)
    }
  }

  const parkTelescope = (deviceId: string) => {
    const device = getDeviceById(deviceId)
    if (device && isTelescope(device)) {
      if (!device.settings) device.settings = {}
      device.settings.isParked = true
      device.trackingEnabled = false
    }
  }

  const unparkTelescope = (deviceId: string) => {
    const device = getDeviceById(deviceId)
    if (device && isTelescope(device)) {
      if (!device.settings) device.settings = {}
      device.settings.isParked = false
    }
  }

  // Camera-specific methods
  const startExposure = (deviceId: string, duration: number): Promise<void> => {
    const device = getDeviceById(deviceId)
    if (device && isCamera(device)) {
      device.exposureTime = duration

      // Simulates an exposure process
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve()
        }, duration * 1000)
      })
    }
    return Promise.resolve()
  }

  const setCooler = (deviceId: string, enabled: boolean, targetTemp?: number) => {
    const device = getDeviceById(deviceId)
    if (device && isCamera(device)) {
      device.coolerEnabled = enabled
      if (targetTemp !== undefined) {
        device.targetTemperature = targetTemp
      }

      // Simulate temperature changes when cooling
      if (enabled) {
        const updateTemp = () => {
          if (isCamera(device) && device.coolerEnabled && device.connected) {
            // Gradually move current temp closer to target
            if (Math.abs(device.currentTemperature - device.targetTemperature) > 0.1) {
              device.currentTemperature =
                device.currentTemperature -
                (device.currentTemperature - device.targetTemperature) * 0.1
            } else {
              device.currentTemperature = device.targetTemperature
            }
            setTimeout(updateTemp, 1000)
          }
        }
        updateTemp()
      }
    }
  }

  const setBinning = (deviceId: string, binning: number) => {
    const device = getDeviceById(deviceId)
    if (device && isCamera(device)) {
      device.binning = binning
    }
  }

  return {
    // State
    devices,
    servers,
    discoveredDevices,
    isDiscovering,
    lastDiscoveryTime,

    // Getters
    connectedDevices,
    telescopes,
    cameras,
    devicesByType,

    // Legacy compatibility
    legacyDevices,
    legacyTelescopes,
    legacyCameras,

    // Device methods
    getDeviceById,
    addDevice,
    removeDevice,
    toggleDeviceConnection,
    toggleFavorite,

    // Server and discovery methods
    addServer,
    startDiscovery,
    addDiscoveredDeviceToManaged,

    // Telescope methods
    setTelescopeTracking,
    slewToCoordinates,
    parkTelescope,
    unparkTelescope,

    // Camera methods
    startExposure,
    setCooler,
    setBinning,

    // Type guards (exposed for component use)
    isTelescope,
    isCamera
  }
})
