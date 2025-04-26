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
  // State
  const devices = ref<Device[]>([
    {
      id: '1',
      name: 'Main Telescope',
      type: 'telescope',
      location: 'Observatory',
      server: 'Main Server',
      connected: true,
      connecting: false,
      hasError: false,
      favorite: true
    },
    {
      id: '2',
      name: 'CCD Camera',
      type: 'camera',
      location: 'Observatory',
      server: 'Main Server',
      connected: false,
      connecting: false,
      hasError: false,
      favorite: false
    },
    {
      id: '3',
      name: 'Secondary Telescope',
      type: 'telescope',
      location: 'Home Setup',
      server: 'Home Server',
      connected: false,
      connecting: false,
      hasError: true,
      favorite: false
    }
  ])

  const servers = ref<Server[]>([
    {
      id: '1',
      address: '192.168.1.100',
      port: 11111,
      name: 'Main Observatory Server',
      manufacturer: 'Alpaca Systems',
      location: 'Observatory',
      version: '1.0.0',
      isOnline: true,
      isManualEntry: false,
      lastSeen: new Date()
    },
    {
      id: '2',
      address: '192.168.1.101',
      port: 11111,
      name: 'Home Setup Server',
      manufacturer: 'ASCOM Remote',
      location: 'Home Setup',
      version: '2.1.0',
      isOnline: true,
      isManualEntry: false,
      lastSeen: new Date()
    }
  ])

  const discoveredDevices = ref<DiscoveredDevice[]>([
    {
      id: '1',
      name: 'CCD Camera',
      type: 'camera',
      number: 0,
      server: servers.value[0],
      isAdded: true,
      capabilities: ['Cooling', 'ReadMode', 'Gain Control']
    },
    {
      id: '2',
      name: 'German Equatorial Mount',
      type: 'telescope',
      number: 0,
      server: servers.value[0],
      isAdded: true,
      capabilities: ['Tracking', 'Goto', 'PulseGuide']
    },
    {
      id: '3',
      name: 'CMOS Camera',
      type: 'camera',
      number: 1,
      server: servers.value[1],
      isAdded: false,
      capabilities: ['Cooling', 'ROI', 'BinningMode']
    },
    {
      id: '4',
      name: 'Alt-Az Mount',
      type: 'telescope',
      number: 0,
      server: servers.value[1],
      isAdded: false,
      capabilities: ['Tracking', 'Goto']
    }
  ])

  const isDiscovering = ref(false)
  const lastDiscoveryTime = ref(new Date())

  // Extend the initial state with device-specific properties
  devices.value = devices.value.map((device) => {
    if (device.type === 'telescope') {
      return {
        ...device,
        trackingEnabled: false,
        currentRa: '00h 00m 00s',
        currentDec: '+00° 00\' 00"',
        targetRa: '00h 00m 00s',
        targetDec: '+00° 00\' 00"',
        settings: {
          slewRate: 'Max',
          trackingRate: 'Sidereal',
          alignmentMode: 'Alt-Az',
          canPark: true,
          isParked: false
        }
      }
    } else if (device.type === 'camera') {
      return {
        ...device,
        exposureTime: 1.0,
        gain: 0,
        coolerEnabled: false,
        currentTemperature: 20.0,
        targetTemperature: 0.0,
        binning: 1,
        settings: {
          readoutMode: 'Normal',
          canFastReadout: true,
          maxBinning: 4,
          hasShutter: true,
          canAbortExposure: true
        }
      }
    }
    return device
  })

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
      // In a real app, this would be where we'd add newly discovered devices
    }, 2000)
  }

  const addDiscoveredDeviceToManaged = (discoveredId: string) => {
    const discovered = discoveredDevices.value.find((d) => d.id === discoveredId)
    if (!discovered) return

    // Mark as added
    discovered.isAdded = true

    // Create a new managed device from the discovered one
    const newDevice: Device = {
      id: `managed-${Date.now()}`,
      name: discovered.name,
      type: discovered.type,
      location: discovered.server.location,
      server: discovered.server.name,
      connected: false,
      connecting: false,
      hasError: false,
      favorite: false
    }

    // Add to managed devices
    devices.value.push(newDevice)

    return newDevice
  }

  // Telescope specific methods
  const setTelescopeTracking = (deviceId: string, enabled: boolean) => {
    const device = getDeviceById(deviceId)
    if (device && device.type === 'telescope') {
      device.trackingEnabled = enabled
    }
  }

  const slewToCoordinates = (deviceId: string, ra: string, dec: string) => {
    const device = getDeviceById(deviceId)
    if (device && device.type === 'telescope') {
      device.targetRa = ra
      device.targetDec = dec

      // Simulate slewing
      const slewingDuration = 3000 // 3 seconds

      // After slewing completes, update current coordinates
      setTimeout(() => {
        if (device) {
          device.currentRa = ra
          device.currentDec = dec
        }
      }, slewingDuration)
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

  // Camera specific methods
  const startExposure = (deviceId: string, duration: number) => {
    const device = getDeviceById(deviceId)
    if (device && device.type === 'camera') {
      device.exposureTime = duration

      // Simulate exposure
      console.log(`Starting exposure for ${duration} seconds`)

      // After exposure completes, we would normally handle the image
      setTimeout(() => {
        console.log('Exposure complete')
        // In a real implementation, would save/process the image
      }, duration * 1000)
    }
  }

  const setCooler = (deviceId: string, enabled: boolean, targetTemp?: number) => {
    const device = getDeviceById(deviceId)
    if (device && device.type === 'camera') {
      device.coolerEnabled = enabled

      if (targetTemp !== undefined) {
        device.targetTemperature = targetTemp
      }

      // Simulate temperature change
      if (
        enabled &&
        device.targetTemperature !== undefined &&
        device.currentTemperature !== undefined
      ) {
        const updateTemp = () => {
          if (
            device &&
            device.coolerEnabled &&
            device.targetTemperature !== undefined &&
            device.currentTemperature !== undefined
          ) {
            // Move current temperature toward target
            const diff = device.targetTemperature - device.currentTemperature
            if (Math.abs(diff) < 0.1) {
              device.currentTemperature = device.targetTemperature
            } else {
              // Cool down or warm up at 1 degree per second
              device.currentTemperature += diff > 0 ? 0.1 : -0.1
              setTimeout(updateTemp, 100)
            }
          }
        }
        updateTemp()
      }
    }
  }

  const setBinning = (deviceId: string, binning: number) => {
    const device = getDeviceById(deviceId)
    if (device && device.type === 'camera' && device.settings) {
      const maxBinning = (device.settings.maxBinning as number) || 4
      device.binning = Math.min(Math.max(1, binning), maxBinning)
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
    getDeviceById,
    devicesByType,

    // Actions
    addDevice,
    removeDevice,
    toggleDeviceConnection,
    toggleFavorite,
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
    setBinning
  }
})
