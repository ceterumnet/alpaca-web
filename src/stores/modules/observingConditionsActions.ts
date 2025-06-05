/**
 * ObservingConditions Actions Module
 *
 * Provides functionality for interacting with observing conditions devices.
 */

import log from '@/plugins/logger'
import { ObservingConditionsClient } from '@/api/alpaca/observingconditions-client'
import { isObservingConditions, type ObservingConditionsDevice } from '@/types/device.types'
import type { UnifiedStoreType } from '../UnifiedStore'

// Signatures of actions in this module
// Updated to use UnifiedStoreType for 'this'
interface IObservingConditionsActions {
  // _getOCClient: (this: UnifiedStoreType, deviceId: string) => ObservingConditionsClient | null
  fetchObservingConditions: (this: UnifiedStoreType, deviceId: string) => Promise<void>
  setObservingConditionsAveragePeriod: (this: UnifiedStoreType, deviceId: string, period: number) => Promise<void>
  refreshObservingConditionsReadings: (this: UnifiedStoreType, deviceId: string) => Promise<void>
  startObservingConditionsPolling: (this: UnifiedStoreType, deviceId: string) => void
  stopObservingConditionsPolling: (this: UnifiedStoreType, deviceId: string) => void
  _pollObservingConditions: (this: UnifiedStoreType, deviceId: string) => Promise<void>
  handleObservingConditionsConnected: (this: UnifiedStoreType, deviceId: string) => void
  handleObservingConditionsDisconnected: (this: UnifiedStoreType, deviceId: string) => void
}

// Combined type for 'this' in actions
// export type ObservingConditionsActionContext = ObservingConditionsModuleState & CoreState & ObservingConditionsActionsSignatures // No longer needed

export function createObservingConditionsActions(): {
  actions: IObservingConditionsActions
} {
  return {
    actions: {
      async fetchObservingConditions(this: UnifiedStoreType, deviceId: string): Promise<void> {
        const client = this.getDeviceClient(deviceId) as ObservingConditionsClient | null
        if (!client) return
        try {
          const conditions = await client.getAllConditions()
          this.updateDevice(deviceId, { conditions: conditions } as Partial<ObservingConditionsDevice>)
          this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'observingConditions', value: conditions })
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[OCStore] Error fetching conditions for ${deviceId}.`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to fetch observing conditions: ${error}` })
        }
      },

      async setObservingConditionsAveragePeriod(this: UnifiedStoreType, deviceId: string, period: number): Promise<void> {
        const client = this.getDeviceClient(deviceId) as ObservingConditionsClient | null
        if (!client) return
        try {
          await client.setAveragePeriod(period)
          // Refresh all conditions after setting one, or just update the specific property if confident
          await this.fetchObservingConditions(deviceId)
          this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'setAveragePeriod', args: [period], result: 'success' })
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[OCStore] Error setting average period for ${deviceId}.`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to set average period: ${error}` })
          await this.fetchObservingConditions(deviceId) // Ensure consistency
        }
      },

      async refreshObservingConditionsReadings(this: UnifiedStoreType, deviceId: string): Promise<void> {
        const client = this.getDeviceClient(deviceId) as ObservingConditionsClient | null
        if (!client) return
        try {
          await client.refresh()
          // After refreshing, fetch the updated conditions
          await this.fetchObservingConditions(deviceId)
          this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'refreshObservingConditions', args: [], result: 'success' })
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[OCStore] Error refreshing observing conditions for ${deviceId}.`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to refresh observing conditions: ${error}` })
          // Optionally re-fetch even on error to ensure UI consistency if needed,
          // though a refresh failure likely means data hasn't changed or is unavailable.
          // await this.fetchObservingConditions(deviceId)
        }
      },

      async _pollObservingConditions(this: UnifiedStoreType, deviceId: string): Promise<void> {
        if (!this.isDevicePolling.get(deviceId)) return
        const device = this.getDeviceById(deviceId)
        if (!device || !device.isConnected) {
          this.stopObservingConditionsPolling(deviceId)
          return
        }
        await this.fetchObservingConditions(deviceId)
      },

      startObservingConditionsPolling(this: UnifiedStoreType, deviceId: string): void {
        const device = this.getDeviceById(deviceId)
        if (!device || !isObservingConditions(device) || !device.isConnected) return
        if (this.propertyPollingIntervals.has(deviceId)) {
          this.stopObservingConditionsPolling(deviceId)
        }
        const pollInterval = (device.properties?.propertyPollIntervalMs as number) || 5000 // OC data might not change that rapidly
        this.isDevicePolling.set(deviceId, true)
        const timerId = window.setInterval(() => this._pollObservingConditions(deviceId), pollInterval)
        this.propertyPollingIntervals.set(deviceId, timerId)
        log.debug({ deviceId, pollInterval }, `[OCStore] Started polling for ${deviceId} every ${pollInterval}ms.`)
      },

      stopObservingConditionsPolling(this: UnifiedStoreType, deviceId: string): void {
        this.isDevicePolling.set(deviceId, false)
        if (this.propertyPollingIntervals.has(deviceId)) {
          clearInterval(this.propertyPollingIntervals.get(deviceId)!)
          this.propertyPollingIntervals.delete(deviceId)
          log.debug({ deviceId }, `[OCStore] Stopped polling for ${deviceId}.`)
        }
      },

      handleObservingConditionsConnected(this: UnifiedStoreType, deviceId: string): void {
        log.debug({ deviceId }, `[OCStore] ObservingConditions ${deviceId} connected. Fetching data and starting poll.`)
        this.fetchObservingConditions(deviceId)
        this.startObservingConditionsPolling(deviceId)
      },

      handleObservingConditionsDisconnected(this: UnifiedStoreType, deviceId: string): void {
        log.debug({ deviceId }, `[OCStore] ObservingConditions ${deviceId} disconnected. Stopping poll and clearing state.`)
        this.stopObservingConditionsPolling(deviceId)
        this.updateDevice(deviceId, { conditions: null } as Partial<ObservingConditionsDevice>)
      }
    } as const
  }
}
