/**
 * Dome Actions Module
 *
 * Provides functionality for interacting with dome devices.
 */

// import type { Device, DeviceEvent } from '../types/device-store.types'
import type { CoreState } from './coreActions'
import { DomeClient } from '@/api/alpaca/dome-client'
import { isDome } from '@/types/device.types'

// Properties that this module will manage on the Device object in the store
export interface DomeDeviceProperties {
  dome_altitude?: number | null
  dome_azimuth?: number | null
  dome_atHome?: boolean | null
  dome_atPark?: boolean | null
  dome_shutterStatus?: number | null // 0=Open, 1=Closed, 2=Opening, 3=Closing, 4=Error
  dome_slewing?: boolean | null
  [key: string]: unknown // Index signature for UnifiedDevice compatibility
}

// Internal state for the Dome module
export interface DomeModuleState {
  _dome_pollingTimers: Map<string, number>
  _dome_isPolling: Map<string, boolean>
}

// Signatures of actions in this module
interface DomeActionsSignatures {
  _getDomeClient: (deviceId: string) => DomeClient | null
  fetchDomeStatus: (deviceId: string) => Promise<void>
  _executeDomeAction: (
    deviceId: string,
    action: keyof Pick<DomeClient, 'openShutter' | 'closeShutter' | 'parkDome' | 'findHomeDome' | 'abortSlewDome'>
  ) => Promise<void>
  openDomeShutter: (deviceId: string) => Promise<void>
  closeDomeShutter: (deviceId: string) => Promise<void>
  parkDomeDevice: (deviceId: string) => Promise<void>
  findDomeHome: (deviceId: string) => Promise<void>
  abortDomeSlew: (deviceId: string) => Promise<void>
  startDomePolling: (deviceId: string) => void
  stopDomePolling: (deviceId: string) => void
  _pollDomeStatus: (deviceId: string) => Promise<void>
  handleDomeConnected: (deviceId: string) => void
  handleDomeDisconnected: (deviceId: string) => void
}

// Combined type for 'this' in actions
export type DomeActionContext = DomeModuleState & CoreState & DomeActionsSignatures

export function createDomeActions() {
  return {
    state: (): DomeModuleState => ({
      _dome_pollingTimers: new Map(),
      _dome_isPolling: new Map()
    }),

    actions: {
      _getDomeClient(this: DomeActionContext, deviceId: string): DomeClient | null {
        const device = this.getDeviceById(deviceId)
        if (!device || !isDome(device)) {
          console.error(`[DomeStore] Device ${deviceId} not found or is not a Dome.`)
          return null
        }
        let baseUrl = ''
        if (device.apiBaseUrl) baseUrl = device.apiBaseUrl
        else if (device.address && device.port) baseUrl = `http://${device.address}:${device.port}`
        else if (device.ipAddress && device.port) baseUrl = `http://${device.ipAddress}:${device.port}`
        else {
          console.error(`[DomeStore] Device ${deviceId} has incomplete address details.`)
          return null
        }
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)
        const deviceNumber = typeof device.deviceNum === 'number' ? device.deviceNum : 0
        return new DomeClient(baseUrl, deviceNumber, device)
      },

      async fetchDomeStatus(this: DomeActionContext, deviceId: string): Promise<void> {
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
            dome_slewing: (status.slewing as boolean) ?? null
          }
          this.updateDevice(deviceId, updates)
          this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'domeStatus', value: updates })
        } catch (error) {
          console.error(`[DomeStore] Error fetching status for ${deviceId}:`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to fetch dome status: ${error}` })
        }
      },

      async _executeDomeAction(
        this: DomeActionContext,
        deviceId: string,
        action: keyof Pick<DomeClient, 'openShutter' | 'closeShutter' | 'parkDome' | 'findHomeDome' | 'abortSlewDome'>
      ): Promise<void> {
        const client = this._getDomeClient(deviceId)
        if (!client) return
        try {
          await client[action]()
          await this.fetchDomeStatus(deviceId) // Refresh status after action
          this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: action, args: [], result: 'success' /* simplistic */ })
        } catch (error) {
          console.error(`[DomeStore] Error executing ${action} on ${deviceId}:`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to ${action} dome: ${error}` })
          await this.fetchDomeStatus(deviceId) // Refresh status even on error
        }
      },

      openDomeShutter(this: DomeActionContext, deviceId: string): Promise<void> {
        return this._executeDomeAction(deviceId, 'openShutter')
      },
      closeDomeShutter(this: DomeActionContext, deviceId: string): Promise<void> {
        return this._executeDomeAction(deviceId, 'closeShutter')
      },
      parkDomeDevice(this: DomeActionContext, deviceId: string): Promise<void> {
        return this._executeDomeAction(deviceId, 'parkDome')
      },
      findDomeHome(this: DomeActionContext, deviceId: string): Promise<void> {
        return this._executeDomeAction(deviceId, 'findHomeDome')
      },
      abortDomeSlew(this: DomeActionContext, deviceId: string): Promise<void> {
        return this._executeDomeAction(deviceId, 'abortSlewDome')
      },

      async _pollDomeStatus(this: DomeActionContext, deviceId: string): Promise<void> {
        if (!this._dome_isPolling.get(deviceId)) return
        const device = this.getDeviceById(deviceId)
        if (!device || !device.isConnected) {
          this.stopDomePolling(deviceId)
          return
        }
        // Re-fetch all details as relevant properties might change
        await this.fetchDomeStatus(deviceId)
      },

      startDomePolling(this: DomeActionContext, deviceId: string): void {
        const device = this.getDeviceById(deviceId)
        if (!device || !isDome(device) || !device.isConnected) return
        if (this._dome_pollingTimers.has(deviceId)) {
          this.stopDomePolling(deviceId)
        }
        const pollInterval = (device.properties?.propertyPollIntervalMs as number) || 2000
        this._dome_isPolling.set(deviceId, true)
        const timerId = window.setInterval(() => this._pollDomeStatus(deviceId), pollInterval)
        this._dome_pollingTimers.set(deviceId, timerId)
        console.log(`[DomeStore] Started polling for ${deviceId} every ${pollInterval}ms.`)
      },

      stopDomePolling(this: DomeActionContext, deviceId: string): void {
        this._dome_isPolling.set(deviceId, false)
        if (this._dome_pollingTimers.has(deviceId)) {
          clearInterval(this._dome_pollingTimers.get(deviceId)!)
          this._dome_pollingTimers.delete(deviceId)
          console.log(`[DomeStore] Stopped polling for ${deviceId}.`)
        }
      },

      handleDomeConnected(this: DomeActionContext, deviceId: string): void {
        console.log(`[DomeStore] Dome ${deviceId} connected. Fetching status and starting poll.`)
        this.fetchDomeStatus(deviceId)
        this.startDomePolling(deviceId)
      },

      handleDomeDisconnected(this: DomeActionContext, deviceId: string): void {
        console.log(`[DomeStore] Dome ${deviceId} disconnected. Stopping poll and clearing state.`)
        this.stopDomePolling(deviceId)
        const clearedProps: DomeDeviceProperties = {
          dome_altitude: null,
          dome_azimuth: null,
          dome_atHome: null,
          dome_atPark: null,
          dome_shutterStatus: null,
          dome_slewing: null
        }
        this.updateDevice(deviceId, clearedProps)
      }
    } as const
  }
}
