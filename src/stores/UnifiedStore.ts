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

    // In a real implementation, we would make API calls here
    // For now we'll just simulate a successful connection
    return new Promise((resolve) => {
      setTimeout(() => {
        updateDevice(deviceId, { isConnected: true, isConnecting: false })
        resolve(true)
      }, 500)
    })
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

    // In a real implementation, we would make API calls here
    // For now we'll just simulate a successful disconnection
    return new Promise((resolve) => {
      setTimeout(() => {
        updateDevice(deviceId, { isConnected: false, isDisconnecting: false })
        resolve(true)
      }, 500)
    })
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
