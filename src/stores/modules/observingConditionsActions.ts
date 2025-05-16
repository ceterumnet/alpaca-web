/**
 * ObservingConditions Actions Module
 *
 * Provides functionality for interacting with observing conditions devices.
 */

// import type { Device, DeviceEvent } from '../types/device-store.types'
import type { CoreState } from './coreActions'
import { ObservingConditionsClient, type IObservingConditionsData } from '@/api/alpaca/observingconditions-client'
import { isObservingConditions } from '@/types/device.types'

// Properties that this module will manage on the Device object in the store
export interface ObservingConditionsDeviceProperties extends Partial<IObservingConditionsData> {
  // Prefixing to avoid collision, though IObservingConditionsData is quite specific
  oc_averageperiod?: number | null
  oc_cloudcover?: number | null
  // ... add all properties from IObservingConditionsData, prefixed or be careful with names
  // For simplicity, we can assume that the IObservingConditionsData itself will be stored under a single key
  // or that its keys are unique enough not to need prefixes for all.
  // Let's store all data under a single `oc_conditions` property.
  oc_conditions?: IObservingConditionsData | null
  [key: string]: unknown // Index signature for UnifiedDevice compatibility
}

// Internal state for the module
export interface ObservingConditionsModuleState {
  _oc_pollingTimers: Map<string, number>
  _oc_isPolling: Map<string, boolean>
}

// Signatures of actions in this module
interface ObservingConditionsActionsSignatures {
  _getOCClient: (deviceId: string) => ObservingConditionsClient | null
  fetchObservingConditions: (deviceId: string) => Promise<void>
  setObservingConditionsAveragePeriod: (deviceId: string, period: number) => Promise<void>
  startObservingConditionsPolling: (deviceId: string) => void
  stopObservingConditionsPolling: (deviceId: string) => void
  _pollObservingConditions: (deviceId: string) => Promise<void>
  handleObservingConditionsConnected: (deviceId: string) => void
  handleObservingConditionsDisconnected: (deviceId: string) => void
}

// Combined type for 'this' in actions
export type ObservingConditionsActionContext = ObservingConditionsModuleState & CoreState & ObservingConditionsActionsSignatures

export function createObservingConditionsActions() {
  return {
    state: (): ObservingConditionsModuleState => ({
      _oc_pollingTimers: new Map(),
      _oc_isPolling: new Map()
    }),

    actions: {
      _getOCClient(this: ObservingConditionsActionContext, deviceId: string): ObservingConditionsClient | null {
        const device = this.getDeviceById(deviceId)
        if (!device || !isObservingConditions(device)) {
          console.error(`[OCStore] Device ${deviceId} not found or is not an ObservingConditions device.`)
          return null
        }
        let baseUrl = ''
        if (device.apiBaseUrl) baseUrl = device.apiBaseUrl
        else if (device.address && device.port) baseUrl = `http://${device.address}:${device.port}`
        else if (device.ipAddress && device.port) baseUrl = `http://${device.ipAddress}:${device.port}`
        else {
          console.error(`[OCStore] Device ${deviceId} has incomplete address details.`)
          return null
        }
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)
        const deviceNumber = typeof device.deviceNum === 'number' ? device.deviceNum : 0
        return new ObservingConditionsClient(baseUrl, deviceNumber, device)
      },

      async fetchObservingConditions(this: ObservingConditionsActionContext, deviceId: string): Promise<void> {
        const client = this._getOCClient(deviceId)
        if (!client) return
        try {
          const conditions = await client.getAllConditions()
          this.updateDevice(deviceId, { oc_conditions: conditions })
          this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'observingConditions', value: conditions })
        } catch (error) {
          console.error(`[OCStore] Error fetching conditions for ${deviceId}:`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to fetch observing conditions: ${error}` })
        }
      },

      async setObservingConditionsAveragePeriod(this: ObservingConditionsActionContext, deviceId: string, period: number): Promise<void> {
        const client = this._getOCClient(deviceId)
        if (!client) return
        try {
          await client.setAveragePeriod(period)
          // Refresh all conditions after setting one, or just update the specific property if confident
          await this.fetchObservingConditions(deviceId)
          this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'setAveragePeriod', args: [period], result: 'success' })
        } catch (error) {
          console.error(`[OCStore] Error setting average period for ${deviceId}:`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to set average period: ${error}` })
          await this.fetchObservingConditions(deviceId) // Ensure consistency
        }
      },

      async _pollObservingConditions(this: ObservingConditionsActionContext, deviceId: string): Promise<void> {
        if (!this._oc_isPolling.get(deviceId)) return
        const device = this.getDeviceById(deviceId)
        if (!device || !device.isConnected) {
          this.stopObservingConditionsPolling(deviceId)
          return
        }
        await this.fetchObservingConditions(deviceId)
      },

      startObservingConditionsPolling(this: ObservingConditionsActionContext, deviceId: string): void {
        const device = this.getDeviceById(deviceId)
        if (!device || !isObservingConditions(device) || !device.isConnected) return
        if (this._oc_pollingTimers.has(deviceId)) {
          this.stopObservingConditionsPolling(deviceId)
        }
        const pollInterval = (device.properties?.propertyPollIntervalMs as number) || 5000 // OC data might not change that rapidly
        this._oc_isPolling.set(deviceId, true)
        const timerId = window.setInterval(() => this._pollObservingConditions(deviceId), pollInterval)
        this._oc_pollingTimers.set(deviceId, timerId)
        console.log(`[OCStore] Started polling for ${deviceId} every ${pollInterval}ms.`)
      },

      stopObservingConditionsPolling(this: ObservingConditionsActionContext, deviceId: string): void {
        this._oc_isPolling.set(deviceId, false)
        if (this._oc_pollingTimers.has(deviceId)) {
          clearInterval(this._oc_pollingTimers.get(deviceId)!)
          this._oc_pollingTimers.delete(deviceId)
          console.log(`[OCStore] Stopped polling for ${deviceId}.`)
        }
      },

      handleObservingConditionsConnected(this: ObservingConditionsActionContext, deviceId: string): void {
        console.log(`[OCStore] ObservingConditions ${deviceId} connected. Fetching data and starting poll.`)
        this.fetchObservingConditions(deviceId)
        this.startObservingConditionsPolling(deviceId)
      },

      handleObservingConditionsDisconnected(this: ObservingConditionsActionContext, deviceId: string): void {
        console.log(`[OCStore] ObservingConditions ${deviceId} disconnected. Stopping poll and clearing state.`)
        this.stopObservingConditionsPolling(deviceId)
        this.updateDevice(deviceId, { oc_conditions: null })
      }
    } as const
  }
}
