import type { Device, SafetyMonitorDevice } from '@/types/device.types'
import type { UnifiedStoreType } from '../UnifiedStore' // Assuming UnifiedStoreType is defined here
import { SafetyMonitorClient, type SafetyMonitorAlpacaStatus } from '@/api/alpaca/safetymonitor-client'
import type { DeviceEvent } from '../types/device-store.types' // Assuming DeviceEvent type location
// Pinia Store import is no longer needed directly here with the new pattern

// Type guard for SafetyMonitorDevice
// This might also live in @/types/device.types.ts; ensure it's available.
// If not, define it here:
export function isSafetyMonitorDevice(device: Device | null | undefined): device is SafetyMonitorDevice {
  return !!device && device.deviceType === 'SafetyMonitor'
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
        if (!device || !isSafetyMonitorDevice(device)) {
          // console.error(`[SafetyMonitorStore] Device ${deviceId} not found or is not a SafetyMonitor.`);
          return null
        }
        let baseUrl = ''
        if (device.apiBaseUrl) baseUrl = device.apiBaseUrl
        else if (device.address && device.port) baseUrl = `http://${device.address}:${device.port}`
        else if (device.ipAddress && device.port) baseUrl = `http://${device.ipAddress}:${device.port}`
        else {
          // console.error(`[SafetyMonitorStore] Device ${deviceId} has incomplete address details.`);
          return null
        }
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)
        const deviceNumber = typeof device.deviceNumber === 'number' ? device.deviceNumber : 0
        return new SafetyMonitorClient(baseUrl, deviceNumber, device)
      },

      async fetchSafetyMonitorDeviceStatus(this: UnifiedStoreType, deviceId: string): Promise<void> {
        const client = this._getSafetyMonitorClient(deviceId)
        if (!client) {
          this.updateDevice(deviceId, { safety_isSafe: null } as SafetyMonitorDeviceProperties)
          return
        }
        try {
          const status: SafetyMonitorAlpacaStatus = await client.fetchStatus()
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
          // this.handleAlpacaError(error as Error, this.getDeviceById(deviceId) as Device, `fetching safety status for ${deviceId}`)
          this._emitEvent({
            type: 'deviceApiError',
            deviceId,
            deviceType: 'SafetyMonitor',
            error: { message: `Failed to fetch status for ${deviceId}`, originalError: error }
          } as DeviceEvent)
        }
      },

      async _pollSafetyMonitorDeviceStatus(this: UnifiedStoreType, deviceId: string): Promise<void> {
        if (!this._safety_isPolling.get(deviceId)) return
        const device = this.getDeviceById(deviceId)
        if (!device || !device.connected) {
          this.stopSafetyMonitorPolling(deviceId)
          return
        }
        await this.fetchSafetyMonitorDeviceStatus(deviceId)
      },

      startSafetyMonitorPolling(this: UnifiedStoreType, deviceId: string): void {
        const device = this.getDeviceById(deviceId) as SafetyMonitorDevice | null
        if (!device || !isSafetyMonitorDevice(device) || !device.connected) return

        if (this._safety_pollingTimers.has(deviceId)) {
          this.stopSafetyMonitorPolling(deviceId)
        }
        const pollInterval = (device.properties?.propertyPollIntervalMs as number) || 5000
        this._safety_isPolling.set(deviceId, true)
        const timerId = window.setInterval(() => this._pollSafetyMonitorDeviceStatus(deviceId), pollInterval)
        this._safety_pollingTimers.set(deviceId, timerId)
        // console.log(`[SafetyMonitorStore] Started polling for ${deviceId} every ${pollInterval}ms.`);
      },

      stopSafetyMonitorPolling(this: UnifiedStoreType, deviceId: string): void {
        this._safety_isPolling.set(deviceId, false)
        if (this._safety_pollingTimers.has(deviceId)) {
          clearInterval(this._safety_pollingTimers.get(deviceId)!)
          this._safety_pollingTimers.delete(deviceId)
          // console.log(`[SafetyMonitorStore] Stopped polling for ${deviceId}.`);
        }
      },

      handleSafetyMonitorConnected(this: UnifiedStoreType, deviceId: string): void {
        // console.log(`[SafetyMonitorStore] SafetyMonitor ${deviceId} connected. Fetching initial status and starting poll.`);
        this.fetchSafetyMonitorDeviceStatus(deviceId)
        this.startSafetyMonitorPolling(deviceId)
      },

      handleSafetyMonitorDisconnected(this: UnifiedStoreType, deviceId: string): void {
        // console.log(`[SafetyMonitorStore] SafetyMonitor ${deviceId} disconnected. Stopping poll and clearing state.`);
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
