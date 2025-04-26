import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Define interfaces
export interface Device {
  id: string
  name: string
  type: string
  location: string
  server: string
  connected: boolean
  connecting: boolean
  hasError: boolean
  favorite: boolean
  // For telescope
  trackingEnabled?: boolean
  currentRa?: string
  currentDec?: string
  targetRa?: string
  targetDec?: string
  // For camera
  exposureTime?: number
  gain?: number
  coolerEnabled?: boolean
  currentTemperature?: number
  targetTemperature?: number
  binning?: number
  // Common device settings
  settings?: Record<string, unknown>
}

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

export interface DiscoveredDevice {
  id: string
  name: string
  type: string
  number: number
  server: Server
  isAdded: boolean
  capabilities: string[]
}

export interface ServerData {
  address: string
  port: number
  name: string
  isSecure: boolean
}

export const useDeviceStore = defineStore('device', () => {
  // State - removed fake devices
  const devices = ref<Device[]>([])
  const servers = ref<Server[]>([])
  const discoveredDevices = ref<DiscoveredDevice[]>([])

  const isDiscovering = ref(false)
  const lastDiscoveryTime = ref(new Date())

  // Getters
  const getDeviceById = (id: string) => {
    return devices.value.find((device) => device.id === id)
  }

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

  // Actions
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

  const addServer = (server: Server) => {
    servers.value.push(server)
  }

  const startDiscovery = () => {
    isDiscovering.value = true
    // Simulate discovery process
    setTimeout(() => {
      isDiscovering.value = false
      lastDiscoveryTime.value = new Date()
    }, 3000)
  }

  const addDiscoveredDeviceToManaged = (discoveredId: string) => {
    const discoveredDevice = discoveredDevices.value.find((d) => d.id === discoveredId)
    if (discoveredDevice && !discoveredDevice.isAdded) {
      const newDevice: Device = {
        id: crypto.randomUUID(),
        name: discoveredDevice.name,
        type: discoveredDevice.type,
        location: discoveredDevice.server.location,
        server: discoveredDevice.server.name,
        connected: false,
        connecting: false,
        hasError: false,
        favorite: false
      }

      if (newDevice.type === 'telescope') {
        newDevice.trackingEnabled = false
        newDevice.currentRa = '00h 00m 00s'
        newDevice.currentDec = '+00° 00\' 00"'
        newDevice.targetRa = '00h 00m 00s'
        newDevice.targetDec = '+00° 00\' 00"'
      } else if (newDevice.type === 'camera') {
        newDevice.exposureTime = 1.0
        newDevice.gain = 0
        newDevice.coolerEnabled = false
        newDevice.currentTemperature = 20.0
        newDevice.targetTemperature = 0.0
        newDevice.binning = 1
      }

      devices.value.push(newDevice)
      discoveredDevice.isAdded = true
    }
  }

  const setTelescopeTracking = (deviceId: string, enabled: boolean) => {
    const device = getDeviceById(deviceId)
    if (device && device.type === 'telescope') {
      device.trackingEnabled = enabled
    }
  }

  const slewToCoordinates = (deviceId: string, ra: string, dec: string) => {
    const device = getDeviceById(deviceId)
    if (device && device.type === 'telescope') {
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
    if (device && device.type === 'telescope' && device.settings) {
      device.settings.isParked = true
      device.trackingEnabled = false
    }
  }

  const unparkTelescope = (deviceId: string) => {
    const device = getDeviceById(deviceId)
    if (device && device.type === 'telescope' && device.settings) {
      device.settings.isParked = false
    }
  }

  const startExposure = (deviceId: string, duration: number) => {
    const device = getDeviceById(deviceId)
    if (device && device.type === 'camera') {
      device.exposureTime = duration

      // Simulates an exposure process
      // In a real app, you would track the exposure progress
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
    if (device && device.type === 'camera') {
      device.coolerEnabled = enabled
      if (targetTemp !== undefined) {
        device.targetTemperature = targetTemp
      }

      // Simulate temperature changes when cooling
      if (enabled) {
        const updateTemp = () => {
          if (
            device.currentTemperature &&
            device.targetTemperature &&
            device.coolerEnabled &&
            device.connected
          ) {
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
    if (device && device.type === 'camera') {
      device.binning = binning
    }
  }

  return {
    devices,
    servers,
    discoveredDevices,
    isDiscovering,
    lastDiscoveryTime,
    getDeviceById,
    devicesByType,
    addDevice,
    removeDevice,
    toggleDeviceConnection,
    toggleFavorite,
    addServer,
    startDiscovery,
    addDiscoveredDeviceToManaged,
    setTelescopeTracking,
    slewToCoordinates,
    parkTelescope,
    unparkTelescope,
    startExposure,
    setCooler,
    setBinning
  }
})
