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

// Signatures of actions in this module
interface IDomeActionsSignatures {
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
  // state: () => DomeModuleState
  actions: IDomeActionsSignatures
} {
  return {
    actions: {
      async fetchDomeStatus(this: UnifiedStoreType, deviceId: string): Promise<void> {
        const client = this.getDeviceClient(deviceId) as DomeClient
        if (!client) return
        try {
          const domeState = await client.getDomeState() // Fetches all relevant properties

          this.updateDeviceProperties(deviceId, domeState)
          this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'domeStatus', value: domeState } as DeviceEvent)
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
        const client = this.getDeviceClient(deviceId) as DomeClient
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
        const client = this.getDeviceClient(deviceId) as DomeClient
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
        const client = this.getDeviceClient(deviceId) as DomeClient
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
        const client = this.getDeviceClient(deviceId) as DomeClient
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
        const client = this.getDeviceClient(deviceId) as DomeClient
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
        const client = this.getDeviceClient(deviceId) as DomeClient
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
        if (!this.isDevicePolling.get(deviceId)) return
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
        if (this.isDevicePolling.has(deviceId)) {
          this.stopDomePolling(deviceId)
        }
        const pollInterval = (device.properties?.propertyPollIntervalMs as number) || this.propertyPollingIntervals.get('domeStatus') || 5000
        this.isDevicePolling.set(deviceId, true)
        const timerId = window.setInterval(() => this._pollDomeStatus(deviceId), pollInterval)
        this.propertyPollingIntervals.set(deviceId, timerId)
        this._pollDomeStatus(deviceId) // Immediate call after starting
        log.debug({ deviceIds: [deviceId] }, `[DomeStore] Started polling for ${deviceId} every ${pollInterval}ms.`)
      },

      stopDomePolling(this: UnifiedStoreType, deviceId: string): void {
        if (!deviceId) return // Guard against invalid deviceId
        this.isDevicePolling.set(deviceId, false)
        if (this.propertyPollingIntervals.has(deviceId)) {
          clearInterval(this.propertyPollingIntervals.get(deviceId)!)
          this.propertyPollingIntervals.delete(deviceId)
          log.debug({ deviceIds: [deviceId] }, `[DomeStore] Stopped polling for ${deviceId}.`)
        }
      },

      handleDomeConnected(this: UnifiedStoreType, deviceId: string): void {
        console.log('handleDomeConnected', deviceId)
        if (!deviceId) return // Guard against invalid deviceId
        log.debug({ deviceIds: [deviceId] }, `[DomeStore] Dome ${deviceId} connected. Fetching status and starting poll.`)
        this.fetchDomeStatus(deviceId)
        this.startDomePolling(deviceId)
      },

      handleDomeDisconnected(this: UnifiedStoreType, deviceId: string): void {
        if (!deviceId) return // Guard against invalid deviceId
        log.debug({ deviceIds: [deviceId] }, `[DomeStore] Dome ${deviceId} disconnected. Stopping poll and clearing state.`)
        this.stopDomePolling(deviceId)
        this.updateDeviceProperties(deviceId, {})
      }
    } as const
  }
}
