/**
 * Dome Actions Module
 *
 * Provides functionality for interacting with dome devices.
 */

import type { UnifiedStoreType } from '../UnifiedStore'
import type { Device, DeviceEvent } from '../types/device-store.types'
import { DomeClient } from '@/api/alpaca/dome-client'
import { isDome } from '@/types/device.types'
import log from '@/plugins/logger'
// Properties that this module will manage on the Device object in the store
export interface DomeDeviceProperties {
  dome_altitude?: number | null
  dome_azimuth?: number | null
  dome_atHome?: boolean | null
  dome_atPark?: boolean | null
  dome_shutterStatus?: number | null // 0=Open, 1=Closed, 2=Opening, 3=Closing, 4=Error
  dome_slewing?: boolean | null
  dome_slaved?: boolean | null
  [key: string]: unknown // Index signature for UnifiedDevice compatibility
}

// Internal state for the Dome module
export interface DomeModuleState {
  _dome_pollingTimers: Map<string, number>
  _dome_isPolling: Map<string, boolean>
}

// Signatures of actions in this module
interface DomeActionsSignatures {
  _getDomeClient: (this: UnifiedStoreType, deviceId: string) => DomeClient | null
  fetchDomeStatus: (this: UnifiedStoreType, deviceId: string) => Promise<void>
  _executeDomeAction: (
    this: UnifiedStoreType,
    deviceId: string,
    action: keyof Pick<DomeClient, 'openShutter' | 'closeShutter' | 'parkDome' | 'findHomeDome' | 'abortSlewDome'>
  ) => Promise<void>
  openDomeShutter: (this: UnifiedStoreType, deviceId: string) => Promise<void>
  closeDomeShutter: (this: UnifiedStoreType, deviceId: string) => Promise<void>
  parkDomeDevice: (this: UnifiedStoreType, deviceId: string) => Promise<void>
  findDomeHome: (this: UnifiedStoreType, deviceId: string) => Promise<void>
  abortDomeSlew: (this: UnifiedStoreType, deviceId: string) => Promise<void>
  setDomeParkPosition: (this: UnifiedStoreType, deviceId: string) => Promise<void>
  slewDomeToAltitude: (this: UnifiedStoreType, deviceId: string, altitude: number) => Promise<void>
  slewDomeToAzimuth: (this: UnifiedStoreType, deviceId: string, azimuth: number) => Promise<void>
  syncDomeToAzimuth: (this: UnifiedStoreType, deviceId: string, azimuth: number) => Promise<void>
  setDomeSlavedState: (this: UnifiedStoreType, deviceId: string, slaved: boolean) => Promise<void>
  startDomePolling: (this: UnifiedStoreType, deviceId: string) => void
  stopDomePolling: (this: UnifiedStoreType, deviceId: string) => void
  _pollDomeStatus: (this: UnifiedStoreType, deviceId: string) => Promise<void>
  handleDomeConnected: (this: UnifiedStoreType, deviceId: string) => void
  handleDomeDisconnected: (this: UnifiedStoreType, deviceId: string) => void
}

export function createDomeActions(): {
  state: () => DomeModuleState
  actions: DomeActionsSignatures
} {
  return {
    state: (): DomeModuleState => ({
      _dome_pollingTimers: new Map(),
      _dome_isPolling: new Map()
    }),

    actions: {
      _getDomeClient(this: UnifiedStoreType, deviceId: string): DomeClient | null {
        const device: Device | null = this.getDeviceById(deviceId)
        if (!device || !isDome(device)) {
          log.error({ deviceIds: [deviceId] }, `[DomeStore] Device ${deviceId} not found or is not a Dome.`)
          return null
        }
        let baseUrl = ''
        if (device.apiBaseUrl) baseUrl = device.apiBaseUrl
        else if (device.address && device.port) baseUrl = `http://${device.address}:${device.port}`
        else if (device.ipAddress && device.port) baseUrl = `http://${device.ipAddress}:${device.port}`
        else {
          log.error({ deviceIds: [deviceId] }, `[DomeStore] Device ${deviceId} has incomplete address details.`)
          return null
        }
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)
        const deviceNumber = typeof device.deviceNum === 'number' ? device.deviceNum : 0
        return new DomeClient(baseUrl, deviceNumber, device)
      },

      async fetchDomeStatus(this: UnifiedStoreType, deviceId: string): Promise<void> {
        const client = this._getDomeClient(deviceId)
        if (!client) return
        try {
          const status = await client.getDomeState() // Fetches all relevant properties
          const updates: DomeDeviceProperties = {
            dome_altitude: (status.altitude as number) ?? null,
            dome_azimuth: (status.azimuth as number) ?? null,
            dome_atHome: (status.athome as boolean) ?? null,
            dome_atPark: (status.atpark as boolean) ?? null,
            dome_shutterStatus: (status.shutterstatus as number) ?? null,
            dome_slewing: (status.slewing as boolean) ?? null,
            dome_slaved: (status.slaved as boolean) ?? null
          }
          this.updateDevice(deviceId, updates)
          this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'domeStatus', value: updates } as DeviceEvent)
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[DomeStore] Error fetching status for ${deviceId}:`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to fetch dome status: ${error}` } as DeviceEvent)
        }
      },

      async _executeDomeAction(
        this: UnifiedStoreType,
        deviceId: string,
        action: keyof Pick<DomeClient, 'openShutter' | 'closeShutter' | 'parkDome' | 'findHomeDome' | 'abortSlewDome'>
      ): Promise<void> {
        const client = this._getDomeClient(deviceId)
        if (!client) return
        try {
          await client[action]()
          await this.fetchDomeStatus(deviceId) // Refresh status after action
          this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: action, args: [], result: 'success' /* simplistic */ } as DeviceEvent)
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[DomeStore] Error executing ${action} on ${deviceId}:`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to ${action} dome: ${error}` } as DeviceEvent)
          await this.fetchDomeStatus(deviceId) // Refresh status even on error
        }
      },

      openDomeShutter(this: UnifiedStoreType, deviceId: string): Promise<void> {
        return this._executeDomeAction(deviceId, 'openShutter')
      },
      closeDomeShutter(this: UnifiedStoreType, deviceId: string): Promise<void> {
        return this._executeDomeAction(deviceId, 'closeShutter')
      },
      parkDomeDevice(this: UnifiedStoreType, deviceId: string): Promise<void> {
        return this._executeDomeAction(deviceId, 'parkDome')
      },
      findDomeHome(this: UnifiedStoreType, deviceId: string): Promise<void> {
        return this._executeDomeAction(deviceId, 'findHomeDome')
      },
      abortDomeSlew(this: UnifiedStoreType, deviceId: string): Promise<void> {
        return this._executeDomeAction(deviceId, 'abortSlewDome')
      },

      async setDomeParkPosition(this: UnifiedStoreType, deviceId: string): Promise<void> {
        const client = this._getDomeClient(deviceId)
        if (!client) return
        try {
          await client.setPark()
          // setPark usually doesn't change readable state immediately, but a fetch might be desired by some.
          // For now, we'll assume no immediate state change that needs re-fetching.
          this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'setPark', args: [], result: 'success' } as DeviceEvent)
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[DomeStore] Error setting park position for ${deviceId}:`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to set park position: ${error}` } as DeviceEvent)
        }
      },

      async slewDomeToAltitude(this: UnifiedStoreType, deviceId: string, altitude: number): Promise<void> {
        const client = this._getDomeClient(deviceId)
        if (!client) return
        try {
          await client.slewToAltitude(altitude)
          await this.fetchDomeStatus(deviceId) // Refresh status after action
          this._emitEvent({
            type: 'deviceMethodCalled',
            deviceId,
            method: 'slewToAltitude',
            args: [altitude],
            result: 'success'
          } as DeviceEvent)
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[DomeStore] Error slewing dome to altitude for ${deviceId}:`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to slew to altitude: ${error}` } as DeviceEvent)
          await this.fetchDomeStatus(deviceId) // Refresh status even on error
        }
      },

      async slewDomeToAzimuth(this: UnifiedStoreType, deviceId: string, azimuth: number): Promise<void> {
        const client = this._getDomeClient(deviceId)
        if (!client) return
        try {
          await client.slewToAzimuth(azimuth)
          await this.fetchDomeStatus(deviceId) // Refresh status after action
          this._emitEvent({
            type: 'deviceMethodCalled',
            deviceId,
            method: 'slewToAzimuth',
            args: [azimuth],
            result: 'success'
          } as DeviceEvent)
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[DomeStore] Error slewing dome to azimuth for ${deviceId}:`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to slew to azimuth: ${error}` } as DeviceEvent)
          await this.fetchDomeStatus(deviceId) // Refresh status even on error
        }
      },

      async syncDomeToAzimuth(this: UnifiedStoreType, deviceId: string, azimuth: number): Promise<void> {
        const client = this._getDomeClient(deviceId)
        if (!client) return
        try {
          await client.syncToAzimuth(azimuth)
          await this.fetchDomeStatus(deviceId) // Refresh status after action
          this._emitEvent({
            type: 'deviceMethodCalled',
            deviceId,
            method: 'syncToAzimuth',
            args: [azimuth],
            result: 'success'
          } as DeviceEvent)
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[DomeStore] Error syncing dome to azimuth for ${deviceId}:`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to sync to azimuth: ${error}` } as DeviceEvent)
          await this.fetchDomeStatus(deviceId) // Refresh status even on error
        }
      },

      async setDomeSlavedState(this: UnifiedStoreType, deviceId: string, slaved: boolean): Promise<void> {
        const client = this._getDomeClient(deviceId)
        if (!client) return
        try {
          await client.setSlaved(slaved)
          // Update the specific property in the store
          this.updateDevice(deviceId, { dome_slaved: slaved }) // Assuming dome_slaved is added to DomeDeviceProperties
          this._emitEvent({
            type: 'deviceMethodCalled',
            deviceId,
            method: 'setSlaved',
            args: [slaved],
            result: 'success'
          } as DeviceEvent)
          // Optionally, full fetchDomeStatus if other related properties might change
          // await this.fetchDomeStatus(deviceId);
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[DomeStore] Error setting dome slaved state for ${deviceId}:`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to set slaved state: ${error}` } as DeviceEvent)
          // Refresh full status on error to ensure consistency
          await this.fetchDomeStatus(deviceId)
        }
      },

      async _pollDomeStatus(this: UnifiedStoreType, deviceId: string): Promise<void> {
        if (!this._dome_isPolling.get(deviceId)) return
        const device = this.getDeviceById(deviceId)
        if (!device || !device.isConnected) {
          this.stopDomePolling(deviceId)
          return
        }
        await this.fetchDomeStatus(deviceId)
      },

      startDomePolling(this: UnifiedStoreType, deviceId: string): void {
        if (!deviceId) return // Guard against invalid deviceId
        const device = this.getDeviceById(deviceId)
        if (!device || !isDome(device) || !device.isConnected) return
        if (this._dome_pollingTimers.has(deviceId)) {
          this.stopDomePolling(deviceId)
        }
        const pollInterval = (device.properties?.propertyPollIntervalMs as number) || this._propertyPollingIntervals.get('domeStatus') || 5000
        this._dome_isPolling.set(deviceId, true)
        const timerId = window.setInterval(() => this._pollDomeStatus(deviceId), pollInterval)
        this._dome_pollingTimers.set(deviceId, timerId)
        this._pollDomeStatus(deviceId) // Immediate call after starting
        log.debug({ deviceIds: [deviceId] }, `[DomeStore] Started polling for ${deviceId} every ${pollInterval}ms.`)
      },

      stopDomePolling(this: UnifiedStoreType, deviceId: string): void {
        if (!deviceId) return // Guard against invalid deviceId
        this._dome_isPolling.set(deviceId, false)
        if (this._dome_pollingTimers.has(deviceId)) {
          clearInterval(this._dome_pollingTimers.get(deviceId)!)
          this._dome_pollingTimers.delete(deviceId)
          log.debug({ deviceIds: [deviceId] }, `[DomeStore] Stopped polling for ${deviceId}.`)
        }
      },

      handleDomeConnected(this: UnifiedStoreType, deviceId: string): void {
        if (!deviceId) return // Guard against invalid deviceId
        log.debug({ deviceIds: [deviceId] }, `[DomeStore] Dome ${deviceId} connected. Fetching status and starting poll.`)
        this.fetchDomeStatus(deviceId)
        this.startDomePolling(deviceId)
      },

      handleDomeDisconnected(this: UnifiedStoreType, deviceId: string): void {
        if (!deviceId) return // Guard against invalid deviceId
        log.debug({ deviceIds: [deviceId] }, `[DomeStore] Dome ${deviceId} disconnected. Stopping poll and clearing state.`)
        this.stopDomePolling(deviceId)
        const clearedProps: DomeDeviceProperties = {
          dome_altitude: null,
          dome_azimuth: null,
          dome_atHome: null,
          dome_atPark: null,
          dome_shutterStatus: null,
          dome_slewing: null,
          dome_slaved: null
        }
        this.updateDevice(deviceId, clearedProps)
      }
    } as const
  }
}
