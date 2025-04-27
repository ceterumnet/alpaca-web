/**
 * Adapter module to help transition from the old device stores to the new unified store
 * This provides compatibility functions and wrappers to make existing components work
 * with the new store with minimal changes.
 */

import {
  useAstroDeviceStore,
  type Device,
  type BaseDevice,
  type DiscoveredDevice as AstroDiscoveredDevice
} from './useAstroDeviceStore'
import { DeviceFactory as LegacyDeviceFactory, Device as LegacyDevice } from '@/types/Device'
import { Telescope as LegacyTelescope } from '@/types/Telescope'
import { Camera as LegacyCamera } from '@/types/Camera'
import { type DiscoveredDevice, type ServerData, type Server } from './useDeviceStore'

// Re-export needed types
export { type ServerData, type Server }

// Define a new type for the UI-friendly discovered device
export interface UIDiscoveredDevice extends Omit<DiscoveredDevice, 'isAdded'> {
  isAdded: boolean // Make isAdded required and boolean
  capabilities: string[] // Make capabilities required
}

/**
 * Extended Device interface with apiBaseUrl property
 */
interface ExtendedLegacyDevice extends LegacyDevice {
  apiBaseUrl?: string
}

/**
 * Generate a UUID that works in all browsers
 * Fallback for environments where crypto.randomUUID is not available
 */
function generateUUID(): string {
  // Check if native crypto.randomUUID is available
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  // Fallback implementation for browsers without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Convert a legacy Device class instance to the new Device interface
 */
export function legacyDeviceToNew(legacyDevice: LegacyDevice): Device {
  // Get basic device properties
  const apiBaseUrl = (legacyDevice as ExtendedLegacyDevice).apiBaseUrl || ''
  console.log('Converting legacy device to new format with apiBaseUrl:', apiBaseUrl)

  const baseDevice: BaseDevice = {
    id: generateUUID(),
    name: `${legacyDevice.deviceType} ${legacyDevice.idx}`,
    type: legacyDevice.deviceType.toLowerCase(),
    location: 'Unknown', // Legacy device doesn't have this info
    server: 'Unknown', // Legacy device doesn't have this info
    connected: legacyDevice.connected,
    connecting: false,
    hasError: false,
    favorite: false,
    idx: legacyDevice.idx,
    apiBaseUrl: apiBaseUrl
  }

  console.log('Created baseDevice with apiBaseUrl:', baseDevice.apiBaseUrl)

  // Handle specific device types
  if (legacyDevice instanceof LegacyTelescope) {
    return {
      ...baseDevice,
      type: 'telescope',
      trackingEnabled: false,
      currentRa: '00h 00m 00s',
      currentDec: '+00° 00\' 00"',
      targetRa: '00h 00m 00s',
      targetDec: '+00° 00\' 00"'
    }
  } else if (legacyDevice instanceof LegacyCamera) {
    return {
      ...baseDevice,
      type: 'camera',
      exposureTime: 1.0,
      gain: 0,
      coolerEnabled: false,
      currentTemperature: 20.0,
      targetTemperature: 0.0,
      binning: 1
    }
  }

  return baseDevice
}

/**
 * Create a legacy device instance from device type and properties
 */
export function createLegacyDevice(
  deviceType: string,
  deviceNumber: number,
  connected: boolean = false,
  apiBaseUrl?: string
): LegacyDevice {
  let device: LegacyDevice

  // Create appropriate device type
  if (deviceType.toLowerCase() === 'telescope') {
    device = LegacyDeviceFactory.createDevice(LegacyTelescope)
  } else if (deviceType.toLowerCase() === 'camera') {
    device = LegacyDeviceFactory.createDevice(LegacyCamera)
  } else {
    throw new Error(`Unsupported device type: ${deviceType}`)
  }

  // Set common properties
  device.idx = deviceNumber
  device.connected = connected

  // Set API base URL if provided
  if (apiBaseUrl) {
    ;(device as ExtendedLegacyDevice).apiBaseUrl = apiBaseUrl
  }

  return device
}

/**
 * Adapter function to ensure discovered devices meet the expected interface in UI components
 */
function adaptDiscoveredDevices(devices: AstroDiscoveredDevice[]): UIDiscoveredDevice[] {
  return devices.map((device) => ({
    ...device,
    isAdded: device.isAdded === true, // Ensure isAdded is a boolean, not undefined
    capabilities: device.capabilities || [],
    // Ensure these properties exist with default values if needed
    name: device.name || `${device.type || 'Unknown'} ${device.number || 0}`,
    type: device.type || 'unknown',
    number: device.number || 0
  })) as UIDiscoveredDevice[]
}

/**
 * Legacy-compatible version of the device store
 * This wraps the new store but presents it with the legacy interface
 */
export function useLegacyDeviceStore() {
  const astroStore = useAstroDeviceStore()

  // Add helper methods to get legacy-compatible devices
  return {
    // Forward references to the astro store
    ...astroStore,

    // Legacy-compatible methods
    getLegacyDeviceByIndex(type: string, idx: number): LegacyDevice | undefined {
      // Find corresponding device in the new store
      const newDevice = astroStore.devices.find(
        (d) => d.type.toLowerCase() === type.toLowerCase() && d.idx === idx
      )

      if (!newDevice) return undefined

      // Create and return a legacy device
      return createLegacyDevice(
        newDevice.type,
        newDevice.idx || 0,
        newDevice.connected,
        newDevice.apiBaseUrl
      )
    },

    addLegacyDevice(legacyDevice: LegacyDevice): void {
      // Convert to new format and add to store
      const newDevice = legacyDeviceToNew(legacyDevice)
      astroStore.addDevice(newDevice)
    },

    // Ensure we have access to discovery-related properties and methods with correct types
    get servers() {
      return astroStore.servers
    },
    get discoveredDevices(): UIDiscoveredDevice[] {
      return adaptDiscoveredDevices(astroStore.discoveredDevices)
    },
    get isDiscovering() {
      return astroStore.isDiscovering
    },
    get lastDiscoveryTime() {
      return astroStore.lastDiscoveryTime
    },

    startDiscovery: astroStore.startDiscovery,
    addDiscoveredDeviceToManaged: astroStore.addDiscoveredDeviceToManaged,
    addServer: astroStore.addServer
  }
}

/**
 * Get a proxy that presents the legacy devices interface but uses the new store
 */
export function getLegacyDevicesAdapter() {
  const astroStore = useAstroDeviceStore()

  // Return only the properties and methods that match the original useDevicesStore interface
  return {
    devices: astroStore.legacyDevices,
    connectedDevices: astroStore.legacyDevices.filter((device) => device.connected),
    telescopes: astroStore.legacyTelescopes,
    cameras: astroStore.legacyCameras,

    // Discovery-related properties with correct types
    servers: astroStore.servers,
    discoveredDevices: adaptDiscoveredDevices(astroStore.discoveredDevices),
    isDiscovering: astroStore.isDiscovering,
    lastDiscoveryTime: astroStore.lastDiscoveryTime,

    // Discovery-related methods
    startDiscovery: astroStore.startDiscovery,
    addDiscoveredDeviceToManaged: astroStore.addDiscoveredDeviceToManaged,
    addServer: astroStore.addServer
  }
}
