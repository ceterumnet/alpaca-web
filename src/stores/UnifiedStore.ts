/**
 * Unified Store
 *
 * A modern, type-safe store implementation for managing devices.
 * This store will eventually replace the legacy store implementation
 * with a more maintainable and extensible architecture.
 */

import type { UnifiedDevice } from '../types/DeviceTypes'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Use the existing type definitions
export type Device = UnifiedDevice

// Define CameraCapabilities interface for type-checking
interface CameraCapabilities {
  minExposureTime?: number
  maxExposureTime?: number
  minGain?: number
  maxGain?: number
  minOffset?: number
  maxOffset?: number
  canAdjustOffset?: boolean
  canAdjustReadMode?: boolean
  hasImage?: boolean
}

// Define common types
export type Theme = 'light' | 'dark'

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

// Create a Pinia store instead of a class
export const useUnifiedStore = defineStore('unifiedStore', () => {
  // State
  const devices = ref<Map<string, Device>>(new Map())
  const isDiscovering = ref(false)
  const discoveryTimeout = ref<ReturnType<typeof setInterval> | null>(null)
  const eventListeners = ref<DeviceEventListener[]>([])

  // Sidebar and UI state
  const isSidebarVisible = ref(true)
  const selectedDeviceId = ref<string | null>(null)
  const theme = ref<Theme>('light')

  // Computed
  const devicesList = computed(() => Array.from(devices.value.values()))
  const connectedDevices = computed(() => devicesList.value.filter((device) => device.isConnected))

  const selectedDevice = computed(() => {
    if (!selectedDeviceId.value) return null
    return devices.value.get(selectedDeviceId.value) || null
  })

  // Methods
  function addEventListener(listener: DeviceEventListener): void {
    eventListeners.value.push(listener)
  }

  function removeEventListener(listener: DeviceEventListener): void {
    const index = eventListeners.value.indexOf(listener)
    if (index !== -1) {
      eventListeners.value.splice(index, 1)
    }
  }

  function _emitEvent(event: DeviceEvent): void {
    eventListeners.value.forEach((listener) => listener(event))
  }

  function getDeviceById(deviceId: string): Device | null {
    return devices.value.get(deviceId) || null
  }

  function addDevice(device: Device, options: StoreOptions = {}): boolean {
    if (!device || !device.id) return false

    console.log('Adding device to UnifiedStore:', {
      deviceId: device.id,
      deviceType: device.type,
      deviceName: device.name,
      deviceApiBaseUrl: device.apiBaseUrl
    })

    // Don't add if already exists
    if (devices.value.has(device.id)) return false

    // Ensure device has required fields
    console.log('Normalizing device:', device)
    const normalizedDevice = _normalizeDevice(device)

    // Add to store
    devices.value.set(normalizedDevice.id, normalizedDevice)

    console.log('Device added to UnifiedStore:', {
      id: normalizedDevice.id,
      type: normalizedDevice.type,
      apiBaseUrl: normalizedDevice.apiBaseUrl
    })

    // Emit event if not silent
    if (!options.silent) {
      _emitEvent({ type: 'deviceAdded', device: normalizedDevice })
    }

    return true
  }

  function removeDevice(deviceId: string, options: StoreOptions = {}): boolean {
    if (!deviceId || !devices.value.has(deviceId)) return false

    devices.value.delete(deviceId)

    // Clear selection if the removed device was selected
    if (selectedDeviceId.value === deviceId) {
      selectedDeviceId.value = null
    }

    if (!options.silent) {
      _emitEvent({ type: 'deviceRemoved', deviceId })
    }

    return true
  }

  function updateDevice(
    deviceId: string,
    updates: Partial<Device>,
    options: StoreOptions = {}
  ): boolean {
    if (!deviceId || !devices.value.has(deviceId)) return false

    const device = devices.value.get(deviceId)
    if (!device) return false

    const updatedDevice = { ...device, ...updates }

    // Validate updated device
    if (!updatedDevice.id) return false

    devices.value.set(deviceId, updatedDevice)

    if (!options.silent) {
      _emitEvent({ type: 'deviceUpdated', deviceId, updates })
    }

    return true
  }

  function updateDeviceProperties(deviceId: string, properties: Record<string, unknown>): boolean {
    const device = devices.value.get(deviceId)
    if (!device) return false

    return updateDevice(deviceId, {
      properties: {
        ...(device.properties || {}),
        ...properties
      }
    })
  }

  async function connectDevice(deviceId: string): Promise<boolean> {
    if (!deviceId || !devices.value.has(deviceId)) {
      return Promise.resolve(false)
    }

    const device = devices.value.get(deviceId)
    if (!device) return Promise.resolve(false)

    // Already connected or connecting
    if (device.isConnected || device.isConnecting) {
      return Promise.resolve(true)
    }

    // Update device to connecting state
    updateDevice(deviceId, { isConnecting: true })

    // If we have an API base URL, make an actual API call
    if (device.apiBaseUrl) {
      try {
        // Create form data for the API call
        const formData = new URLSearchParams()
        formData.append('Connected', 'True')
        formData.append('ClientID', '1')
        formData.append('ClientTransactionID', '1')

        // Make the API call to connect
        const response = await fetch(getValidApiUrl(device.apiBaseUrl, 'connected'), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formData
        })

        if (response.ok) {
          console.log(`Successfully connected to device ${deviceId}`)
          updateDevice(deviceId, { isConnected: true, isConnecting: false })

          // After connecting, fetch the device properties
          fetchDeviceProperties(deviceId)

          return true
        } else {
          console.error(`Error connecting to device ${deviceId}: ${response.statusText}`)
          updateDevice(deviceId, { isConnected: false, isConnecting: false })
          return false
        }
      } catch (error) {
        console.error(`API call error when connecting to device ${deviceId}:`, error)
        updateDevice(deviceId, { isConnected: false, isConnecting: false })
        return false
      }
    } else {
      // Fallback to simulation for testing
      console.warn(`No API base URL available for device ${deviceId}, simulating connection`)
      return new Promise((resolve) => {
        setTimeout(() => {
          updateDevice(deviceId, { isConnected: true, isConnecting: false })
          resolve(true)
        }, 500)
      })
    }
  }

  async function disconnectDevice(deviceId: string): Promise<boolean> {
    if (!deviceId || !devices.value.has(deviceId)) {
      return Promise.resolve(false)
    }

    const device = devices.value.get(deviceId)
    if (!device) return Promise.resolve(false)

    // Already disconnected or disconnecting
    if (!device.isConnected || device.isDisconnecting) {
      return Promise.resolve(true)
    }

    // Update device to disconnecting state
    updateDevice(deviceId, { isDisconnecting: true })

    // If we have an API base URL, make an actual API call
    if (device.apiBaseUrl) {
      try {
        // Create form data for the API call
        const formData = new URLSearchParams()
        formData.append('Connected', 'False')
        formData.append('ClientID', '1')
        formData.append('ClientTransactionID', '1')

        // Make the API call to disconnect
        const response = await fetch(getValidApiUrl(device.apiBaseUrl, 'connected'), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formData
        })

        if (response.ok) {
          console.log(`Successfully disconnected from device ${deviceId}`)
          updateDevice(deviceId, { isConnected: false, isDisconnecting: false })
          return true
        } else {
          console.error(`Error disconnecting from device ${deviceId}: ${response.statusText}`)
          updateDevice(deviceId, { isDisconnecting: false })
          return false
        }
      } catch (error) {
        console.error(`API call error when disconnecting from device ${deviceId}:`, error)
        updateDevice(deviceId, { isDisconnecting: false })
        return false
      }
    } else {
      // Fallback to simulation for testing
      console.warn(`No API base URL available for device ${deviceId}, simulating disconnection`)
      return new Promise((resolve) => {
        setTimeout(() => {
          updateDevice(deviceId, { isConnected: false, isDisconnecting: false })
          resolve(true)
        }, 500)
      })
    }
  }

  /**
   * Ensure a valid URL for API fetch calls
   * @param baseUrl Base URL from the device
   * @param endpoint API endpoint to call
   * @returns A valid URL for fetch calls
   */
  function getValidApiUrl(baseUrl: string | undefined | null | object, endpoint: string): string {
    // Handle cases where baseUrl is undefined, null, or an empty object
    if (!baseUrl || typeof baseUrl !== 'string') {
      throw new Error(`Invalid API base URL: ${JSON.stringify(baseUrl)}`)
    }

    // Use the baseUrl as is, without prepending localhost
    const apiUrl = baseUrl

    return `${apiUrl}/${endpoint}`.replace(/\/\//g, '/')
  }

  function startDiscovery(options: StoreOptions = {}): boolean {
    if (isDiscovering.value) return false

    isDiscovering.value = true
    if (!options.silent) {
      _emitEvent({ type: 'discoveryStarted' })
    }

    // In a real implementation, we would start the actual discovery process
    // For now, we'll just set a timeout to simulate discovery
    discoveryTimeout.value = setInterval(() => {
      // Simulate finding devices
    }, 5000)

    return true
  }

  function stopDiscovery(options: StoreOptions = {}): boolean {
    if (!isDiscovering.value) return false

    isDiscovering.value = false
    if (discoveryTimeout.value) {
      clearInterval(discoveryTimeout.value)
      discoveryTimeout.value = null
    }

    if (!options.silent) {
      _emitEvent({ type: 'discoveryStopped' })
    }

    return true
  }

  function getDevicesByType(deviceType: string): Device[] {
    return devicesList.value.filter(
      (device) => device.deviceType === deviceType || device.type === deviceType
    )
  }

  function hasDevice(deviceId: string): boolean {
    return devices.value.has(deviceId)
  }

  function clearDevices(options: StoreOptions = {}): boolean {
    const deviceIds = Array.from(devices.value.keys())

    // Clear devices
    devices.value.clear()

    // Emit events if not silent
    if (!options.silent) {
      deviceIds.forEach((deviceId) => {
        _emitEvent({ type: 'deviceRemoved', deviceId })
      })
    }

    return true
  }

  function _normalizeDevice(device: Device): Device {
    const normalized = { ...device }

    console.log('Normalizing device:', device)
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

    // Construct apiBaseUrl if not already set but we have ip/address and port
    if (!normalized.apiBaseUrl) {
      const ipAddress = normalized.ipAddress || normalized.address
      const port = normalized.port || normalized.devicePort

      console.log('API URL construction input parameters:', {
        ipAddress,
        port,
        deviceType: normalized.type,
        deviceNum: normalized.idx
      })

      if (ipAddress && port) {
        // Use the proxy format for Alpaca devices
        const deviceType = normalized.type?.toLowerCase() || 'device'
        const deviceNum = normalized.idx !== undefined ? normalized.idx : 0

        // Use the existing proxy pattern: /proxy/ipAddress/port/api/v1/deviceType/deviceNum
        normalized.apiBaseUrl = `/proxy/${ipAddress}/${port}/api/v1/${deviceType}/${deviceNum}`
        console.log('Constructed apiBaseUrl using proxy:', normalized.apiBaseUrl)
      } else {
        console.warn('Cannot construct apiBaseUrl - missing ipAddress or port:', {
          ipAddress,
          port,
          device: normalized
        })
      }
    }

    console.log('Device normalization complete:', {
      id: normalized.id,
      type: normalized.type,
      name: normalized.name,
      apiBaseUrl: normalized.apiBaseUrl
    })

    return normalized
  }

  // Event emitter compatibility
  const eventHandlers: Record<string, Array<(...args: unknown[]) => void>> = {}

  function on(event: string, listener: (...args: unknown[]) => void): void {
    if (!eventHandlers[event]) {
      eventHandlers[event] = []
    }
    eventHandlers[event].push(listener)
  }

  function off(event: string, listener: (...args: unknown[]) => void): void {
    if (!eventHandlers[event]) return

    const idx = eventHandlers[event].indexOf(listener)
    if (idx !== -1) {
      eventHandlers[event].splice(idx, 1)
    }
  }

  function emit(event: string, ...args: unknown[]): void {
    if (!eventHandlers[event]) return

    for (const handler of eventHandlers[event]) {
      handler(...args)
    }
  }

  // Sidebar actions
  function toggleSidebar() {
    isSidebarVisible.value = !isSidebarVisible.value
  }

  function selectDevice(deviceId: string) {
    selectedDeviceId.value = deviceId
  }

  // Theme actions
  function setTheme(newTheme: Theme) {
    theme.value = newTheme
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  // Device operations
  async function callDeviceMethod(
    deviceId: string,
    method: string,
    args: unknown[] = []
  ): Promise<unknown> {
    console.log(`Calling method ${method} on device ${deviceId} with args:`, args)

    if (!deviceId || !devices.value.has(deviceId)) {
      console.error(`Device ${deviceId} not found for method call`)
      return Promise.resolve(null)
    }

    const device = devices.value.get(deviceId)
    if (!device || !device.apiBaseUrl) {
      console.error(`Device ${deviceId} has no API base URL`)
      return Promise.resolve(null)
    }

    // Only proceed if the device is connected
    if (!device.isConnected) {
      console.error(`Device ${deviceId} is not connected`)
      return Promise.resolve(null)
    }

    try {
      // Map method name to Alpaca API endpoint
      // This is a simplified mapping for common methods
      const methodMapping: Record<string, { endpoint: string; method: 'GET' | 'PUT' }> = {
        // Camera methods
        startExposure: { endpoint: 'startexposure', method: 'PUT' },
        abortExposure: { endpoint: 'abortexposure', method: 'PUT' },
        setCooler: { endpoint: 'cooler', method: 'PUT' },
        setGain: { endpoint: 'gain', method: 'PUT' },
        setOffset: { endpoint: 'offset', method: 'PUT' },
        setReadoutMode: { endpoint: 'readoutmode', method: 'PUT' },

        // Telescope methods
        slew: { endpoint: 'slewtocoordinates', method: 'PUT' },
        park: { endpoint: 'park', method: 'PUT' },
        unpark: { endpoint: 'unpark', method: 'PUT' },
        setTracking: { endpoint: 'tracking', method: 'PUT' },
        moveAxis: { endpoint: 'moveaxis', method: 'PUT' },
        abortSlew: { endpoint: 'abortslew', method: 'PUT' }
        // Add more method mappings as needed
      }

      const apiInfo = methodMapping[method]
      if (!apiInfo) {
        console.error(`No API mapping found for method ${method}`)
        return Promise.resolve(null)
      }

      // Create form data for the API call
      const formData = new URLSearchParams()
      formData.append('ClientID', '1')
      formData.append('ClientTransactionID', '1')

      // Add method-specific parameters
      switch (method) {
        case 'startExposure':
          if (args.length > 0 && typeof args[0] === 'number') {
            formData.append('Duration', args[0].toString())
            formData.append('Light', 'True')
          }
          break
        case 'slew':
          if (args.length > 1) {
            formData.append('RightAscension', String(args[0]))
            formData.append('Declination', String(args[1]))
          }
          break
        case 'setTracking':
          if (args.length > 0) {
            formData.append('Tracking', String(args[0] === true))
          }
          break
        case 'moveAxis':
          if (args.length > 1) {
            // For moveAxis, we need to determine which axis based on the direction
            // In Alpaca: primary axis (RA/Az) = 0, secondary axis (Dec/Alt) = 1
            const direction = String(args[0]).toLowerCase()
            const rate = Number(args[1])

            // Map direction to axis and sign
            let axis = 0 // Default to primary axis (RA/Az)
            let rateWithSign = rate

            if (direction === 'north' || direction === 'south') {
              axis = 1 // Secondary axis (Dec/Alt)
              if (direction === 'south') {
                rateWithSign = -rate // Negative for south
              }
            } else if (direction === 'west') {
              rateWithSign = -rate // Negative for west
            }

            formData.append('Axis', String(axis))
            formData.append('Rate', String(rateWithSign))
          }
          break
        case 'setCooler':
          if (args.length > 0 && typeof args[0] === 'boolean') {
            formData.append('CoolerOn', args[0].toString())
          }
          if (args.length > 1 && typeof args[1] === 'number') {
            // If a temperature is provided, set it
            // This requires a separate API call
            const tempResponse = await fetch(
              getValidApiUrl(device.apiBaseUrl, 'targettemperature'),
              {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                  TargetTemperature: args[1].toString(),
                  ClientID: '1',
                  ClientTransactionID: '1'
                })
              }
            )
            if (!tempResponse.ok) {
              console.error(`Error setting target temperature: ${tempResponse.statusText}`)
            }
          }
          break
        case 'setGain':
          if (args.length > 0 && typeof args[0] === 'number') {
            formData.append('Gain', args[0].toString())
          }
          break
        case 'setOffset':
          if (args.length > 0 && typeof args[0] === 'number') {
            formData.append('Offset', args[0].toString())
          }
          break
        case 'setReadoutMode':
          if (args.length > 0 && typeof args[0] === 'number') {
            formData.append('ReadoutMode', args[0].toString())
          }
          break
        default:
          // Add generic arguments for other methods
          args.forEach((arg, index) => {
            if (arg !== undefined) {
              formData.append(`Arg${index}`, String(arg))
            }
          })
      }

      // Make the API call
      const response = await fetch(getValidApiUrl(device.apiBaseUrl, apiInfo.endpoint), {
        method: apiInfo.method,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`API call successful for method ${method}:`, data)

        // Update device state based on the method
        switch (method) {
          case 'startExposure':
            if (args.length > 0 && typeof args[0] === 'number') {
              updateDeviceProperties(deviceId, {
                isExposing: true,
                exposureProgress: 0,
                exposureTime: args[0]
              })

              // Start monitoring progress
              monitorExposureProgress(deviceId)
            }
            break
          case 'abortExposure':
            updateDeviceProperties(deviceId, {
              isExposing: false,
              exposureProgress: 0
            })
            break
          case 'setCooler':
            if (args.length > 0 && typeof args[0] === 'boolean') {
              updateDeviceProperties(deviceId, {
                coolerEnabled: args[0],
                ...(args.length > 1 && typeof args[1] === 'number'
                  ? { targetTemperature: args[1] }
                  : {})
              })
            }
            break
          // Telescope-specific updates
          case 'slew':
            if (args.length > 1) {
              updateDeviceProperties(deviceId, {
                slewing: true,
                targetRa: args[0],
                targetDec: args[1]
              })
            }
            break
          case 'park':
            updateDeviceProperties(deviceId, {
              parking: true,
              parked: false
            })
            break
          case 'unpark':
            updateDeviceProperties(deviceId, {
              parking: true,
              parked: false // Will be updated to false when operation completes
            })
            break
          case 'setTracking':
            if (args.length > 0 && typeof args[0] === 'boolean') {
              updateDeviceProperties(deviceId, {
                tracking: args[0],
                trackingEnabled: args[0]
              })
            }
            break
        }

        return data.Value
      } else {
        console.error(`API call error for method ${method}: ${response.statusText}`)
        return null
      }
    } catch (error) {
      console.error(`Error calling method ${method} on device ${deviceId}:`, error)
      return null
    }
  }

  // Function to monitor exposure progress
  function monitorExposureProgress(deviceId: string) {
    const device = devices.value.get(deviceId)
    if (!device || !device.apiBaseUrl) return

    const progressInterval = setInterval(async () => {
      try {
        // Check if the device is still in the store
        if (!devices.value.has(deviceId)) {
          clearInterval(progressInterval)
          return
        }

        // Check percent complete
        const percentResponse = await fetch(`${device.apiBaseUrl}/percentcompleted`)
        const percentData = await percentResponse.json()
        const progress = Number(percentData.Value)

        // Update the store with actual progress
        updateDeviceProperties(deviceId, {
          exposureProgress: progress
        })

        // Check camera state
        const stateResponse = await fetch(`${device.apiBaseUrl}/camerastate`)
        const stateData = await stateResponse.json()
        const state = Number(stateData.Value)

        // If idle (0), exposure is complete
        if (state === 0) {
          clearInterval(progressInterval)
          updateDeviceProperties(deviceId, {
            isExposing: false,
            exposureProgress: 100
          })

          // Check if image is ready
          try {
            const imageReadyResponse = await fetch(`${device.apiBaseUrl}/imageready`)
            const imageReadyData = await imageReadyResponse.json()
            if (imageReadyData.Value) {
              updateDeviceProperties(deviceId, { hasImage: true })
              fetchImage(deviceId)
            }
          } catch (error) {
            console.error('Error checking if image is ready:', error)
          }
        }
      } catch (error) {
        console.error('Error monitoring exposure progress:', error)
        // Don't clear interval yet, allow for recovery
      }
    }, 500)
  }

  // Function to fetch an image from the camera
  async function fetchImage(deviceId: string) {
    const device = devices.value.get(deviceId)
    if (!device || !device.apiBaseUrl) return

    try {
      // First check if the image is ready
      const imageReadyResponse = await fetch(`${device.apiBaseUrl}/imageready`)
      const imageReadyData = await imageReadyResponse.json()

      if (!imageReadyData.Value) {
        console.log('No image available to fetch')
        return
      }

      // Get the image data using ImageBytes format instead of ImageArray
      // This matches the original EnhancedCameraPanel implementation
      const imageResponse = await fetch(`${device.apiBaseUrl}/imagearray`, {
        headers: {
          Accept: 'application/imagebytes'
        }
      })

      if (imageResponse.ok) {
        const imageData = await imageResponse.arrayBuffer()
        console.log('Received image data, size:', imageData.byteLength)
        updateDeviceProperties(deviceId, { imageData })
      } else {
        console.error('Error fetching image data:', imageResponse.statusText)
      }
    } catch (error) {
      console.error('Error fetching image:', error)
    }
  }

  // Function to fetch device properties from the Alpaca API
  async function fetchDeviceProperties(deviceId: string): Promise<void> {
    const device = devices.value.get(deviceId)
    if (!device || !device.apiBaseUrl) return

    try {
      // Check device type before fetching properties
      const deviceType = device.type || device.deviceType || ''

      if (deviceType.toLowerCase() === 'camera') {
        // Camera-specific properties fetching
        // Fetch camera capabilities first
        const capabilities: CameraCapabilities = {}

        // Fetch min/max exposure times
        try {
          const minExpResponse = await fetch(`${device.apiBaseUrl}/exposuremin`)
          if (minExpResponse.ok) {
            const data = await minExpResponse.json()
            capabilities.minExposureTime = Number(data.Value)
          }

          const maxExpResponse = await fetch(`${device.apiBaseUrl}/exposuremax`)
          if (maxExpResponse.ok) {
            const data = await maxExpResponse.json()
            capabilities.maxExposureTime = Number(data.Value)
          }
        } catch (error) {
          console.error('Error fetching exposure time limits:', error)
        }

        // Fetch gain capabilities
        try {
          const canGainResponse = await fetch(`${device.apiBaseUrl}/gains`)
          if (canGainResponse.ok) {
            const data = await canGainResponse.json()
            if (data.Value) {
              const minGainResponse = await fetch(`${device.apiBaseUrl}/gainmin`)
              if (minGainResponse.ok) {
                const minData = await minGainResponse.json()
                capabilities.minGain = Number(minData.Value)
              }

              const maxGainResponse = await fetch(`${device.apiBaseUrl}/gainmax`)
              if (maxGainResponse.ok) {
                const maxData = await maxGainResponse.json()
                capabilities.maxGain = Number(maxData.Value)
              }
            }
          }
        } catch (error) {
          console.error('Error fetching gain capabilities:', error)
        }

        // Fetch offset capabilities
        try {
          const canOffsetResponse = await fetch(`${device.apiBaseUrl}/offsets`)
          if (canOffsetResponse.ok) {
            const data = await canOffsetResponse.json()
            capabilities.canAdjustOffset = !!data.Value

            if (data.Value) {
              const minOffsetResponse = await fetch(`${device.apiBaseUrl}/offsetmin`)
              if (minOffsetResponse.ok) {
                const minData = await minOffsetResponse.json()
                capabilities.minOffset = Number(minData.Value)
              }

              const maxOffsetResponse = await fetch(`${device.apiBaseUrl}/offsetmax`)
              if (maxOffsetResponse.ok) {
                const maxData = await maxOffsetResponse.json()
                capabilities.maxOffset = Number(maxData.Value)
              }
            }
          }
        } catch (error) {
          console.error('Error fetching offset capabilities:', error)
        }

        // Fetch readout mode capabilities
        try {
          const readoutModesResponse = await fetch(`${device.apiBaseUrl}/readoutmodes`)
          if (readoutModesResponse.ok) {
            const data = await readoutModesResponse.json()
            capabilities.canAdjustReadMode = Array.isArray(data.Value) && data.Value.length > 0
          }
        } catch (error) {
          console.error('Error fetching readout mode capabilities:', error)
        }

        // Update the device capabilities
        updateDeviceProperties(deviceId, { capabilities })

        // Now fetch the current camera properties
        const properties: Record<string, unknown> = {}

        // Fetch current exposure time
        try {
          const exposureResponse = await fetch(`${device.apiBaseUrl}/exposure`)
          if (exposureResponse.ok) {
            const data = await exposureResponse.json()
            properties.exposureTime = Number(data.Value)
          }
        } catch (error) {
          console.error('Error fetching current exposure time:', error)
        }

        // Fetch current gain
        if (capabilities.minGain !== undefined) {
          try {
            const gainResponse = await fetch(`${device.apiBaseUrl}/gain`)
            if (gainResponse.ok) {
              const data = await gainResponse.json()
              properties.gain = Number(data.Value)
            }
          } catch (error) {
            console.error('Error fetching current gain:', error)
          }
        }

        // Fetch current offset
        if (capabilities.canAdjustOffset) {
          try {
            const offsetResponse = await fetch(`${device.apiBaseUrl}/offset`)
            if (offsetResponse.ok) {
              const data = await offsetResponse.json()
              properties.offset = Number(data.Value)
            }
          } catch (error) {
            console.error('Error fetching current offset:', error)
          }
        }

        // Fetch current readout mode
        if (capabilities.canAdjustReadMode) {
          try {
            const readoutModeResponse = await fetch(`${device.apiBaseUrl}/readoutmode`)
            if (readoutModeResponse.ok) {
              const data = await readoutModeResponse.json()
              properties.readoutMode = Number(data.Value)
            }
          } catch (error) {
            console.error('Error fetching current readout mode:', error)
          }
        }

        // Fetch cooler information
        try {
          const canCoolResponse = await fetch(`${device.apiBaseUrl}/cansetccdtemperature`)
          if (canCoolResponse.ok) {
            const canCoolData = await canCoolResponse.json()

            if (canCoolData.Value) {
              // Fetch cooler status
              const coolerResponse = await fetch(`${device.apiBaseUrl}/cooleron`)
              if (coolerResponse.ok) {
                const coolerData = await coolerResponse.json()
                properties.coolerEnabled = !!coolerData.Value
              }

              // Fetch current temperature
              const tempResponse = await fetch(`${device.apiBaseUrl}/ccdtemperature`)
              if (tempResponse.ok) {
                const tempData = await tempResponse.json()
                properties.currentTemperature = Number(tempData.Value)
              }

              // Fetch target temperature
              const targetTempResponse = await fetch(`${device.apiBaseUrl}/setccdtemperature`)
              if (targetTempResponse.ok) {
                const targetTempData = await targetTempResponse.json()
                properties.targetTemperature = Number(targetTempData.Value)
              }
            }
          }
        } catch (error) {
          console.error('Error fetching cooler information:', error)
        }

        // Fetch binning information
        try {
          const binXResponse = await fetch(`${device.apiBaseUrl}/binx`)
          if (binXResponse.ok) {
            const binXData = await binXResponse.json()
            properties.binningX = Number(binXData.Value)
          }

          const binYResponse = await fetch(`${device.apiBaseUrl}/biny`)
          if (binYResponse.ok) {
            const binYData = await binYResponse.json()
            properties.binningY = Number(binYData.Value)
          }
        } catch (error) {
          console.error('Error fetching binning information:', error)
        }

        // Check if the camera is currently exposing
        try {
          const stateResponse = await fetch(`${device.apiBaseUrl}/camerastate`)
          if (stateResponse.ok) {
            const stateData = await stateResponse.json()
            const state = Number(stateData.Value)

            // State 2 = Exposing
            properties.isExposing = state === 2

            if (state === 2) {
              // If exposing, check progress
              const progressResponse = await fetch(`${device.apiBaseUrl}/percentcompleted`)
              if (progressResponse.ok) {
                const progressData = await progressResponse.json()
                properties.exposureProgress = Number(progressData.Value)

                // Start monitoring progress
                monitorExposureProgress(deviceId)
              }
            }
          }
        } catch (error) {
          console.error('Error checking camera state:', error)
        }

        // Check if there's an image ready
        try {
          const imageReadyResponse = await fetch(`${device.apiBaseUrl}/imageready`)
          if (imageReadyResponse.ok) {
            const imageReadyData = await imageReadyResponse.json()
            properties.hasImage = !!imageReadyData.Value

            if (imageReadyData.Value) {
              // Fetch the image
              fetchImage(deviceId)
            }
          }
        } catch (error) {
          console.error('Error checking if image is ready:', error)
        }

        // Update the device properties
        updateDeviceProperties(deviceId, properties)
      } else if (deviceType.toLowerCase() === 'telescope') {
        // Telescope-specific properties fetching
        const properties: Record<string, unknown> = {}

        // Fetch tracking state
        try {
          const trackingResponse = await fetch(`${device.apiBaseUrl}/tracking`)
          if (trackingResponse.ok) {
            const data = await trackingResponse.json()
            properties.tracking = !!data.Value
            properties.trackingEnabled = !!data.Value
          }
        } catch (error) {
          console.error('Error fetching tracking state:', error)
        }

        // Fetch park state
        try {
          const parkStateResponse = await fetch(`${device.apiBaseUrl}/atpark`)
          if (parkStateResponse.ok) {
            const data = await parkStateResponse.json()
            properties.parked = !!data.Value
            properties.parking = false // Reset the in-progress flag
          }
        } catch (error) {
          console.error('Error fetching park state:', error)
        }

        // Fetch slew state
        try {
          const slewingResponse = await fetch(`${device.apiBaseUrl}/slewing`)
          if (slewingResponse.ok) {
            const data = await slewingResponse.json()
            properties.slewing = !!data.Value
          }
        } catch (error) {
          console.error('Error fetching slew state:', error)
        }

        // Fetch current coordinates
        try {
          const raResponse = await fetch(`${device.apiBaseUrl}/rightascension`)
          const decResponse = await fetch(`${device.apiBaseUrl}/declination`)
          const altResponse = await fetch(`${device.apiBaseUrl}/altitude`)
          const azResponse = await fetch(`${device.apiBaseUrl}/azimuth`)

          const coordinates: Record<string, unknown> = {}

          if (raResponse.ok) {
            const data = await raResponse.json()
            coordinates.rightAscension = Number(data.Value)
            properties.rightAscension = String(data.Value)
          }

          if (decResponse.ok) {
            const data = await decResponse.json()
            coordinates.declination = Number(data.Value)
            properties.declination = String(data.Value)
          }

          if (altResponse.ok) {
            const data = await altResponse.json()
            coordinates.altitude = Number(data.Value)
          }

          if (azResponse.ok) {
            const data = await azResponse.json()
            coordinates.azimuth = Number(data.Value)
          }

          properties.coordinates = coordinates
        } catch (error) {
          console.error('Error fetching telescope coordinates:', error)
        }

        // Fetch can-do capabilities
        try {
          const canParkResponse = await fetch(`${device.apiBaseUrl}/canpark`)
          if (canParkResponse.ok) {
            const data = await canParkResponse.json()
            properties.canPark = !!data.Value
          }

          const canSlewResponse = await fetch(`${device.apiBaseUrl}/canslew`)
          if (canSlewResponse.ok) {
            const data = await canSlewResponse.json()
            properties.canSlew = !!data.Value
          }

          const canSetTrackingResponse = await fetch(`${device.apiBaseUrl}/cansettracking`)
          if (canSetTrackingResponse.ok) {
            const data = await canSetTrackingResponse.json()
            properties.canSetTracking = !!data.Value
          }
        } catch (error) {
          console.error('Error fetching telescope capabilities:', error)
        }

        // Update the device properties
        updateDeviceProperties(deviceId, properties)
      } else {
        console.log(`No specific property fetching implemented for device type: ${deviceType}`)
      }
    } catch (error) {
      console.error(`Error fetching properties for device ${deviceId}:`, error)
    }
  }

  return {
    // State
    devices,
    // Computed
    devicesList,
    connectedDevices,
    isDiscovering,
    isSidebarVisible,
    selectedDeviceId,
    selectedDevice,
    theme,
    // Methods
    addEventListener,
    removeEventListener,
    getDeviceById,
    addDevice,
    removeDevice,
    updateDevice,
    updateDeviceProperties,
    connectDevice,
    disconnectDevice,
    startDiscovery,
    stopDiscovery,
    getDevicesByType,
    hasDevice,
    clearDevices,
    // Device operations
    callDeviceMethod,
    fetchDeviceProperties,
    // Sidebar and UI actions
    toggleSidebar,
    selectDevice,
    setTheme,
    // Event emitter compatibility
    on,
    off,
    emit
  }
})

// Export a singleton instance of the store for direct imports
// This allows the migration to support both composable and instance pattern
const store = {
  // Forwarding methods to the Pinia store
  getDeviceById(deviceId: string): Device | null {
    return useUnifiedStore().getDeviceById(deviceId)
  },
  addDevice(device: Device, options: StoreOptions = {}): boolean {
    return useUnifiedStore().addDevice(device, options)
  },
  removeDevice(deviceId: string, options: StoreOptions = {}): boolean {
    return useUnifiedStore().removeDevice(deviceId, options)
  },
  updateDevice(deviceId: string, updates: Partial<Device>, options: StoreOptions = {}): boolean {
    return useUnifiedStore().updateDevice(deviceId, updates, options)
  },
  updateDeviceProperties(deviceId: string, properties: Record<string, unknown>): boolean {
    return useUnifiedStore().updateDeviceProperties(deviceId, properties)
  },
  connectDevice(deviceId: string): Promise<boolean> {
    return useUnifiedStore().connectDevice(deviceId)
  },
  disconnectDevice(deviceId: string): Promise<boolean> {
    return useUnifiedStore().disconnectDevice(deviceId)
  },
  startDiscovery(options: StoreOptions = {}): boolean {
    return useUnifiedStore().startDiscovery(options)
  },
  stopDiscovery(options: StoreOptions = {}): boolean {
    return useUnifiedStore().stopDiscovery(options)
  },
  getDevicesByType(deviceType: string): Device[] {
    return useUnifiedStore().getDevicesByType(deviceType)
  },
  hasDevice(deviceId: string): boolean {
    return useUnifiedStore().hasDevice(deviceId)
  },
  clearDevices(options: StoreOptions = {}): boolean {
    return useUnifiedStore().clearDevices(options)
  },
  callDeviceMethod(deviceId: string, method: string, args: unknown[] = []): Promise<unknown> {
    return useUnifiedStore().callDeviceMethod(deviceId, method, args)
  },
  fetchDeviceProperties(deviceId: string): Promise<void> {
    return useUnifiedStore().fetchDeviceProperties(deviceId)
  },
  on(event: string, listener: (...args: unknown[]) => void): void {
    return useUnifiedStore().on(event, listener)
  },
  off(event: string, listener: (...args: unknown[]) => void): void {
    return useUnifiedStore().off(event, listener)
  },
  emit(event: string, ...args: unknown[]): void {
    return useUnifiedStore().emit(event, ...args)
  },
  addEventListener(listener: DeviceEventListener): void {
    return useUnifiedStore().addEventListener(listener)
  },
  removeEventListener(listener: DeviceEventListener): void {
    return useUnifiedStore().removeEventListener(listener)
  },

  // Properties
  get devices() {
    return useUnifiedStore().devices
  },
  get devicesList() {
    return useUnifiedStore().devicesList
  },
  get isDiscovering() {
    return useUnifiedStore().isDiscovering
  },
  get isSidebarVisible() {
    return useUnifiedStore().isSidebarVisible
  },
  get selectedDeviceId() {
    return useUnifiedStore().selectedDeviceId
  },
  get theme() {
    return useUnifiedStore().theme
  },
  get connectedDevices() {
    return useUnifiedStore().connectedDevices
  },
  get selectedDevice() {
    return useUnifiedStore().selectedDevice
  }
}

export type UnifiedStoreType = typeof store

// Export the singleton instance as default
export default store
