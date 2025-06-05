import { isSafetyMonitor, type SafetyMonitorDevice } from '@/types/device.types'
import type { UnifiedStoreType } from '../UnifiedStore' // Assuming UnifiedStoreType is defined here
import { SafetyMonitorClient, type SafetyMonitorAlpacaStatus } from '@/api/alpaca/safetymonitor-client'
import type { DeviceEvent, UnifiedDevice } from '../types/device-store.types' // Assuming DeviceEvent type location
import log from '@/plugins/logger'

// Pinia Store import is no longer needed directly here with the new pattern

// Type guard for SafetyMonitorDevice
// This might also live in @/types/device.types.ts; ensure it's available.
// If not, define it here:
// export function isSafetyMonitorDevice(device: Device | null | undefined): device is SafetyMonitorDevice {
//   return !!device && device.type?.toLowerCase() === 'safetymonitor'
// }

// // Properties managed on the Device object in the UnifiedStore
// export interface SafetyMonitorDeviceProperties {
//   isSafe?: boolean | null
//   // [key: string]: unknown // Index signature for compatibility with updateDevice
// }

// Internal state for this module (e.g., for polling)
// export interface SafetyMonitorModuleState {
//   _safety_pollingTimers: Map<string, number> // deviceId -> timerId
//   _safety_isPolling: Map<string, boolean> // deviceId -> boolean
// }

// Signatures of actions in this module
export interface ISafetyMonitorActions {
  // _getSafetyMonitorClient: (this: UnifiedStoreType, deviceId: string) => SafetyMonitorClient | null
  fetchSafetyMonitorDeviceStatus: (this: UnifiedStoreType, deviceId: string) => Promise<void>
  startSafetyMonitorPolling: (this: UnifiedStoreType, deviceId: string) => void
  stopSafetyMonitorPolling: (this: UnifiedStoreType, deviceId: string) => void
  _pollSafetyMonitorDeviceStatus: (this: UnifiedStoreType, deviceId: string) => Promise<void>
  handleSafetyMonitorConnected: (this: UnifiedStoreType, deviceId: string) => void
  handleSafetyMonitorDisconnected: (this: UnifiedStoreType, deviceId: string) => void
}

export function createSafetyMonitorActions(): {
  // state: () => SafetyMonitorModuleState
  actions: ISafetyMonitorActions
} {
  return {
    // state: (): SafetyMonitorModuleState => ({
    //   _safety_pollingTimers: new Map(),
    //   _safety_isPolling: new Map()
    // }),

    actions: {
      async fetchSafetyMonitorDeviceStatus(this: UnifiedStoreType, deviceId: string): Promise<void> {
        log.debug({ deviceIds: [deviceId] }, `[SafetyMonitorActions:fetchSafetyMonitorDeviceStatus] Attempting to fetch status for ${deviceId}`)
        const client = this.getDeviceClient(deviceId) as SafetyMonitorClient | null
        if (!client) {
          log.warn(
            { deviceIds: [deviceId] },
            `[SafetyMonitorActions:fetchSafetyMonitorDeviceStatus] No client for ${deviceId}, updating isSafe to null.`
          )
          this.updateDevice(deviceId, { isSafe: null } as Partial<SafetyMonitorDevice>)
          return
        }

        try {
          log.debug(
            { deviceIds: [deviceId] },
            `[SafetyMonitorActions:fetchSafetyMonitorDeviceStatus] Client obtained, calling client.fetchStatus() for ${deviceId}`
          )
          const status: SafetyMonitorAlpacaStatus = await client.fetchStatus()
          log.debug({ deviceIds: [deviceId] }, `[SafetyMonitorActions:fetchSafetyMonitorDeviceStatus] Status received for ${deviceId}:`, status)
          const updates: Partial<SafetyMonitorDevice> = {
            isSafe: status.IsSafe ?? null
          }
          this.updateDevice(deviceId, updates)
          this._emitEvent({
            type: 'devicePropertyChanged',
            deviceId,
            deviceType: 'SafetyMonitor',
            property: 'isSafe',
            value: updates.isSafe
          } as DeviceEvent)
        } catch (error: unknown) {
          this.updateDevice(deviceId, { isSafe: null } as Partial<SafetyMonitorDevice>)
          log.error({ deviceIds: [deviceId] }, `[SafetyMonitorActions:fetchSafetyMonitorDeviceStatus] Error fetching status for ${deviceId}:`, error)
          this._emitEvent({
            type: 'deviceApiError',
            deviceId,
            deviceType: 'SafetyMonitor',
            error: { message: `Failed to fetch status for ${deviceId}`, originalError: error }
          } as DeviceEvent)
        }
      },

      async _pollSafetyMonitorDeviceStatus(this: UnifiedStoreType, deviceId: string): Promise<void> {
        if (!this.isDevicePolling.get(deviceId)) {
          log.debug(
            { deviceIds: [deviceId] },
            `[SafetyMonitorActions:_pollSafetyMonitorDeviceStatus] Polling stopped for ${deviceId}, exiting poll cycle.`
          )
          return
        }
        const device = this.getDeviceById(deviceId)
        if (!device || !device.isConnected) {
          log.warn(
            { deviceIds: [deviceId] },
            `[SafetyMonitorActions:_pollSafetyMonitorDeviceStatus] Device ${deviceId} not found or not connected. Stopping polling.`
          )
          this.stopSafetyMonitorPolling(deviceId)
          return
        }
        log.debug({ deviceIds: [deviceId] }, `[SafetyMonitorActions:_pollSafetyMonitorDeviceStatus] Polling active for ${deviceId}, fetching status.`)
        await this.fetchSafetyMonitorDeviceStatus(deviceId)
      },

      startSafetyMonitorPolling(this: UnifiedStoreType, deviceId: string): void {
        log.debug({ deviceIds: [deviceId] }, `[SafetyMonitorActions:startSafetyMonitorPolling] Attempting to start polling for ${deviceId}`)
        const device = this.getDeviceById(deviceId) as SafetyMonitorDevice | null
        if (!device || !isSafetyMonitor(device) || !device.isConnected) {
          log.warn(
            { deviceIds: [deviceId] },
            `[SafetyMonitorActions:startSafetyMonitorPolling] Cannot start polling for ${deviceId}. Device found: ${!!device}, Is SafetyMonitor: ${isSafetyMonitor(device as UnifiedDevice)}, Connected: ${device?.isConnected}`
          )
          return
        }

        if (this.propertyPollingIntervals.has(deviceId)) {
          log.debug(
            { deviceIds: [deviceId] },
            `[SafetyMonitorActions:startSafetyMonitorPolling] Polling timer already exists for ${deviceId}. Stopping existing one.`
          )
          this.stopSafetyMonitorPolling(deviceId)
        }
        const pollInterval = (device.properties?.propertyPollIntervalMs as number) || 5000
        this.isDevicePolling.set(deviceId, true)
        const timerId = window.setInterval(() => this._pollSafetyMonitorDeviceStatus(deviceId), pollInterval)
        this.propertyPollingIntervals.set(deviceId, timerId)
        log.debug(
          { deviceIds: [deviceId] },
          `[SafetyMonitorActions:startSafetyMonitorPolling] Started polling for ${deviceId} every ${pollInterval}ms. Timer ID: ${timerId}`
        )
      },

      stopSafetyMonitorPolling(this: UnifiedStoreType, deviceId: string): void {
        this.isDevicePolling.set(deviceId, false)
        if (this.propertyPollingIntervals.has(deviceId)) {
          clearInterval(this.propertyPollingIntervals.get(deviceId)!)
          this.propertyPollingIntervals.delete(deviceId)
          log.debug({ deviceIds: [deviceId] }, `[SafetyMonitorActions:stopSafetyMonitorPolling] Stopped polling for ${deviceId}.`)
        } else {
          log.debug({ deviceIds: [deviceId] }, `[SafetyMonitorActions:stopSafetyMonitorPolling] No active polling timer to stop for ${deviceId}.`)
        }
      },

      handleSafetyMonitorConnected(this: UnifiedStoreType, deviceId: string): void {
        log.debug(
          { deviceIds: [deviceId] },
          `[SafetyMonitorActions:handleSafetyMonitorConnected] SafetyMonitor ${deviceId} connected. Fetching initial status and starting poll.`
        )
        this.fetchSafetyMonitorDeviceStatus(deviceId)
        this.startSafetyMonitorPolling(deviceId)
      },

      handleSafetyMonitorDisconnected(this: UnifiedStoreType, deviceId: string): void {
        log.debug(
          { deviceIds: [deviceId] },
          `[SafetyMonitorActions:handleSafetyMonitorDisconnected] SafetyMonitor ${deviceId} disconnected. Stopping poll and clearing state.`
        )
        this.stopSafetyMonitorPolling(deviceId)
        const clearedProps: Partial<SafetyMonitorDevice> = {
          isSafe: null
        }
        this.updateDevice(deviceId, clearedProps as SafetyMonitorDevice)
        this._emitEvent({
          type: 'devicePropertyChanged',
          deviceId,
          deviceType: 'SafetyMonitor',
          property: 'isSafe',
          value: clearedProps.isSafe
        } as DeviceEvent)
      }
    } as const
  }
}

// Removed the old initialSafetyMonitorState and isSafetyMonitorDevice exports as they are either local or handled by the state factory.
