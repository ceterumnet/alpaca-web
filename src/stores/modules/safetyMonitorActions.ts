import type { Device, SafetyMonitorDevice } from '@/types/device.types'
import type { UnifiedStoreType } from '../UnifiedStore' // Assuming UnifiedStoreType is defined here
import { SafetyMonitorClient, type SafetyMonitorAlpacaStatus } from '@/api/alpaca/safetymonitor-client'
import type { DeviceEvent } from '../types/device-store.types' // Assuming DeviceEvent type location
// Pinia Store import is no longer needed directly here with the new pattern

// Type guard for SafetyMonitorDevice
// This might also live in @/types/device.types.ts; ensure it's available.
// If not, define it here:
export function isSafetyMonitorDevice(device: Device | null | undefined): device is SafetyMonitorDevice {
  return !!device && device.type?.toLowerCase() === 'safetymonitor'
}

// Properties managed on the Device object in the UnifiedStore
export interface SafetyMonitorDeviceProperties {
  safety_isSafe?: boolean | null
  [key: string]: unknown // Index signature for compatibility with updateDevice
}

// Internal state for this module (e.g., for polling)
export interface SafetyMonitorModuleState {
  _safety_pollingTimers: Map<string, number> // deviceId -> timerId
  _safety_isPolling: Map<string, boolean> // deviceId -> boolean
}

// Signatures of actions in this module
export interface ISafetyMonitorActions {
  _getSafetyMonitorClient: (this: UnifiedStoreType, deviceId: string) => SafetyMonitorClient | null
  fetchSafetyMonitorDeviceStatus: (this: UnifiedStoreType, deviceId: string) => Promise<void>
  startSafetyMonitorPolling: (this: UnifiedStoreType, deviceId: string) => void
  stopSafetyMonitorPolling: (this: UnifiedStoreType, deviceId: string) => void
  _pollSafetyMonitorDeviceStatus: (this: UnifiedStoreType, deviceId: string) => Promise<void>
  handleSafetyMonitorConnected: (this: UnifiedStoreType, deviceId: string) => void
  handleSafetyMonitorDisconnected: (this: UnifiedStoreType, deviceId: string) => void
}

export function createSafetyMonitorActions(): {
  state: () => SafetyMonitorModuleState
  actions: ISafetyMonitorActions
} {
  return {
    state: (): SafetyMonitorModuleState => ({
      _safety_pollingTimers: new Map(),
      _safety_isPolling: new Map()
    }),

    actions: {
      _getSafetyMonitorClient(this: UnifiedStoreType, deviceId: string): SafetyMonitorClient | null {
        const device = this.getDeviceById(deviceId) as SafetyMonitorDevice | null
        console.log(`[SafetyMonitorStore:_getSafetyMonitorClient] Device ID: ${deviceId}`, device)
        if (!device) {
          console.error(`[SafetyMonitorStore:_getSafetyMonitorClient] Device ${deviceId} not found (device is null).`)
          return null
        }
        if (!isSafetyMonitorDevice(device)) {
          console.error(
            `[SafetyMonitorStore:_getSafetyMonitorClient] Device ${deviceId} is not a SafetyMonitor (checked by isSafetyMonitorDevice). Full device object:`,
            device
          )
          return null
        }
        let baseUrl = ''
        if (device.apiBaseUrl) baseUrl = device.apiBaseUrl
        else if (device.address && device.port) baseUrl = `http://${device.address}:${device.port}`
        else if (device.ipAddress && device.port) baseUrl = `http://${device.ipAddress}:${device.port}`
        else {
          console.error(
            `[SafetyMonitorStore:_getSafetyMonitorClient] Device ${deviceId} has incomplete address details. Address: ${device.address}, Port: ${device.port}, IP Address: ${device.ipAddress}, API Base URL: ${device.apiBaseUrl}`
          )
          return null
        }
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)
        const deviceNumber = typeof device.deviceNumber === 'number' ? device.deviceNumber : 0
        console.log(
          `[SafetyMonitorStore:_getSafetyMonitorClient] Creating client for ${deviceId} with base URL: ${baseUrl}, device number: ${deviceNumber}`
        )
        return new SafetyMonitorClient(baseUrl, deviceNumber, device)
      },

      async fetchSafetyMonitorDeviceStatus(this: UnifiedStoreType, deviceId: string): Promise<void> {
        console.log(`[SafetyMonitorStore:fetchSafetyMonitorDeviceStatus] Attempting to fetch status for ${deviceId}`)
        const client = this._getSafetyMonitorClient(deviceId)
        if (!client) {
          console.warn(`[SafetyMonitorStore:fetchSafetyMonitorDeviceStatus] No client for ${deviceId}, updating safety_isSafe to null.`)
          this.updateDevice(deviceId, { safety_isSafe: null } as SafetyMonitorDeviceProperties)
          return
        }
        try {
          console.log(`[SafetyMonitorStore:fetchSafetyMonitorDeviceStatus] Client obtained, calling client.fetchStatus() for ${deviceId}`)
          const status: SafetyMonitorAlpacaStatus = await client.fetchStatus()
          console.log(`[SafetyMonitorStore:fetchSafetyMonitorDeviceStatus] Status received for ${deviceId}:`, status)
          const updates: SafetyMonitorDeviceProperties = {
            safety_isSafe: status.IsSafe ?? null
          }
          this.updateDevice(deviceId, updates)
          this._emitEvent({
            type: 'devicePropertyChanged',
            deviceId,
            deviceType: 'SafetyMonitor',
            property: 'safety_isSafe',
            value: updates.safety_isSafe
          } as DeviceEvent)
        } catch (error: unknown) {
          this.updateDevice(deviceId, { safety_isSafe: null } as SafetyMonitorDeviceProperties)
          console.error(`[SafetyMonitorStore:fetchSafetyMonitorDeviceStatus] Error fetching status for ${deviceId}:`, error)
          this._emitEvent({
            type: 'deviceApiError',
            deviceId,
            deviceType: 'SafetyMonitor',
            error: { message: `Failed to fetch status for ${deviceId}`, originalError: error }
          } as DeviceEvent)
        }
      },

      async _pollSafetyMonitorDeviceStatus(this: UnifiedStoreType, deviceId: string): Promise<void> {
        if (!this._safety_isPolling.get(deviceId)) {
          console.log(`[SafetyMonitorStore:_pollSafetyMonitorDeviceStatus] Polling stopped for ${deviceId}, exiting poll cycle.`)
          return
        }
        const device = this.getDeviceById(deviceId)
        if (!device || !device.isConnected) {
          console.warn(`[SafetyMonitorStore:_pollSafetyMonitorDeviceStatus] Device ${deviceId} not found or not connected. Stopping polling.`)
          this.stopSafetyMonitorPolling(deviceId)
          return
        }
        console.log(`[SafetyMonitorStore:_pollSafetyMonitorDeviceStatus] Polling active for ${deviceId}, fetching status.`)
        await this.fetchSafetyMonitorDeviceStatus(deviceId)
      },

      startSafetyMonitorPolling(this: UnifiedStoreType, deviceId: string): void {
        console.log(`[SafetyMonitorStore:startSafetyMonitorPolling] Attempting to start polling for ${deviceId}`)
        const device = this.getDeviceById(deviceId) as SafetyMonitorDevice | null
        if (!device || !isSafetyMonitorDevice(device) || !device.isConnected) {
          console.warn(
            `[SafetyMonitorStore:startSafetyMonitorPolling] Cannot start polling for ${deviceId}. Device found: ${!!device}, Is SafetyMonitor: ${isSafetyMonitorDevice(device)}, Connected: ${device?.isConnected}`
          )
          return
        }

        if (this._safety_pollingTimers.has(deviceId)) {
          console.log(`[SafetyMonitorStore:startSafetyMonitorPolling] Polling timer already exists for ${deviceId}. Stopping existing one.`)
          this.stopSafetyMonitorPolling(deviceId)
        }
        const pollInterval = (device.properties?.propertyPollIntervalMs as number) || 5000
        this._safety_isPolling.set(deviceId, true)
        const timerId = window.setInterval(() => this._pollSafetyMonitorDeviceStatus(deviceId), pollInterval)
        this._safety_pollingTimers.set(deviceId, timerId)
        console.log(`[SafetyMonitorStore:startSafetyMonitorPolling] Started polling for ${deviceId} every ${pollInterval}ms. Timer ID: ${timerId}`)
      },

      stopSafetyMonitorPolling(this: UnifiedStoreType, deviceId: string): void {
        this._safety_isPolling.set(deviceId, false)
        if (this._safety_pollingTimers.has(deviceId)) {
          clearInterval(this._safety_pollingTimers.get(deviceId)!)
          this._safety_pollingTimers.delete(deviceId)
          console.log(`[SafetyMonitorStore:stopSafetyMonitorPolling] Stopped polling for ${deviceId}.`)
        } else {
          console.log(`[SafetyMonitorStore:stopSafetyMonitorPolling] No active polling timer to stop for ${deviceId}.`)
        }
      },

      handleSafetyMonitorConnected(this: UnifiedStoreType, deviceId: string): void {
        console.log(
          `[SafetyMonitorStore:handleSafetyMonitorConnected] SafetyMonitor ${deviceId} connected. Fetching initial status and starting poll.`
        )
        this.fetchSafetyMonitorDeviceStatus(deviceId)
        this.startSafetyMonitorPolling(deviceId)
      },

      handleSafetyMonitorDisconnected(this: UnifiedStoreType, deviceId: string): void {
        console.log(`[SafetyMonitorStore:handleSafetyMonitorDisconnected] SafetyMonitor ${deviceId} disconnected. Stopping poll and clearing state.`)
        this.stopSafetyMonitorPolling(deviceId)
        const clearedProps: SafetyMonitorDeviceProperties = {
          safety_isSafe: null
        }
        this.updateDevice(deviceId, clearedProps)
        this._emitEvent({
          type: 'devicePropertyChanged',
          deviceId,
          deviceType: 'SafetyMonitor',
          property: 'safety_isSafe',
          value: clearedProps.safety_isSafe
        } as DeviceEvent)
      }
    } as const
  }
}

// Removed the old initialSafetyMonitorState and isSafetyMonitorDevice exports as they are either local or handled by the state factory.
