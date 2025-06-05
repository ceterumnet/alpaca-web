/**
 * FilterWheel Actions Module
 *
 * Provides functionality for interacting with filter wheel devices.
 */

import log from '@/plugins/logger'
import { FilterWheelClient } from '@/api/alpaca/filterwheel-client'
import type { FilterWheelDevice } from '@/types/device.types' // Type guard
import { isFilterWheel } from '@/types/device.types' // Type guard
import type { UnifiedStoreType } from '../UnifiedStore'
import type { DeviceEvent } from '../types/device-store.types'

// Interface describing the signatures of actions in this module
interface FilterWheelActionsSignatures {
  fetchFilterWheelDetails: (this: UnifiedStoreType, deviceId: string) => Promise<void>
  setFilterWheelPosition: (this: UnifiedStoreType, deviceId: string, position: number) => Promise<void>
  // setFilterWheelName: (this: UnifiedStoreType, deviceId: string, filterIndex: number, newName: string) => Promise<void>
  _pollFilterWheelStatus: (this: UnifiedStoreType, deviceId: string) => Promise<void>
  startFilterWheelPolling: (this: UnifiedStoreType, deviceId: string) => void
  stopFilterWheelPolling: (this: UnifiedStoreType, deviceId: string) => void
  handleFilterWheelConnected: (this: UnifiedStoreType, deviceId: string) => void
  handleFilterWheelDisconnected: (this: UnifiedStoreType, deviceId: string) => void
}

export function createFilterWheelActions(): {
  actions: FilterWheelActionsSignatures
} {
  return {
    actions: {
      /**
       * Fetches all relevant details for a filter wheel and updates the store.
       */
      async fetchFilterWheelDetails(this: UnifiedStoreType, deviceId: string): Promise<void> {
        const client = this.getDeviceClient(deviceId) as FilterWheelClient
        if (!client) return

        try {
          const [position, names, offsets] = await Promise.all([client.getPosition(), client.getFilterNames(), client.getFocusOffsets()])

          const updates: Partial<FilterWheelDevice> = {
            position: position ?? -1,
            filterNames: Array.isArray(names) ? names : [],
            focusOffsets: Array.isArray(offsets) ? offsets : []
          }
          this.updateDevice(deviceId, updates)
          this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'filterWheelDetails', value: updates } as DeviceEvent)
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[FilterWheelStore] Error fetching details for ${deviceId}.`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to fetch filter wheel details: ${error}` } as DeviceEvent)
        }
      },

      /**
       * Sets the position of the filter wheel.
       */
      async setFilterWheelPosition(this: UnifiedStoreType, deviceId: string, position: number): Promise<void> {
        const client = this.getDeviceClient(deviceId) as FilterWheelClient
        if (!client) return

        try {
          await client.setPosition(position)
          const newPos = await client.getPosition()
          this.updateDeviceProperties(deviceId, { position: newPos, isMoving: false } as Partial<FilterWheelDevice>)
          this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'position', value: newPos } as DeviceEvent)
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[FilterWheelStore] Error setting position for ${deviceId} to ${position}.`, error)
          this.updateDeviceProperties(deviceId, { isMoving: false } as Partial<FilterWheelDevice>)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to set filter wheel position: ${error}` } as DeviceEvent)
          await this.fetchFilterWheelDetails(deviceId)
        }
      },

      // This is not standard in alpaca.
      // /**
      //  * Sets the name of a specific filter in the filter wheel.
      //  */
      // async setFilterWheelName(this: UnifiedStoreType, deviceId: string, filterIndex: number, newName: string): Promise<void> {
      //   const client = this.getDeviceClient(deviceId) as FilterWheelClient
      //   if (!client) {
      //     log.error({ deviceIds: [deviceId] }, `[FilterWheelStore] Could not get client for device ${deviceId} to set filter name.`)
      //     return Promise.reject(new Error(`FilterWheel client not found for device ${deviceId}.`))
      //   }

      //   const device = this.getDeviceById(deviceId) as FilterWheelDevice
      //   let oldName = 'unknown'
      //   if (device && device.filterNames && Array.isArray(device.filterNames)) {
      //     oldName = device.filterNames[filterIndex] ?? 'unknown'
      //   }

      //   try {
      //     await client.setFilterName(filterIndex, newName)
      //     await this.fetchFilterWheelDetails(deviceId)

      //     this._emitEvent({
      //       type: 'devicePropertyChanged',
      //       deviceId,
      //       property: 'filterNames',
      //       value: { index: filterIndex, oldName, newName },
      //       message: `Filter ${filterIndex} name changed from "${oldName}" to "${newName}"`
      //     } as DeviceEvent)
      //     log.debug({ deviceIds: [deviceId] }, `[FilterWheelStore] Successfully set name for filter ${filterIndex} on ${deviceId} to "${newName}".`)
      //   } catch (error) {
      //     log.error(
      //       { deviceIds: [deviceId] },
      //       `[FilterWheelStore] Error setting name for filter ${filterIndex} on ${deviceId} to "${newName}".`,
      //       error
      //     )
      //     this._emitEvent({
      //       type: 'deviceApiError',
      //       deviceId,
      //       error: `Failed to set filter name for index ${filterIndex} to "${newName}": ${error}`,
      //       message: `Error setting filter ${filterIndex} name. Original name: "${oldName}". Attempted: "${newName}".`
      //     } as DeviceEvent)
      //     return Promise.reject(error)
      //   }
      // },

      /**
       * Internal polling function for filter wheel status (primarily position).
       */
      async _pollFilterWheelStatus(this: UnifiedStoreType, deviceId: string): Promise<void> {
        if (!this.isDevicePolling.get(deviceId)) return

        const device = this.getDeviceById(deviceId) as FilterWheelDevice
        if (!device || !device.isConnected) {
          this.stopFilterWheelPolling(deviceId)
          return
        }

        const client = this.getDeviceClient(deviceId) as FilterWheelClient
        if (!client) {
          this.stopFilterWheelPolling(deviceId)
          return
        }

        try {
          const currentPositionInStore = device.position as number | undefined
          const pos = await client.getPosition()
          if (pos !== null && pos !== currentPositionInStore) {
            this.updateDevice(deviceId, { position: pos } as FilterWheelDevice)
            this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'position', value: pos } as DeviceEvent)
          }
        } catch (error) {
          log.warn({ deviceIds: [deviceId] }, `[FilterWheelStore] Error polling status for ${deviceId}.`, error)
        }
      },

      /**
       * Starts polling for filter wheel status changes.
       */
      startFilterWheelPolling(this: UnifiedStoreType, deviceId: string): void {
        const device = this.getDeviceById(deviceId)
        if (!device || !isFilterWheel(device) || !device.isConnected) return

        if (this.propertyPollingIntervals.has(deviceId)) {
          this.stopFilterWheelPolling(deviceId)
        }

        const pollInterval = (device.properties?.propertyPollIntervalMs as number) || 3000

        this.isDevicePolling.set(deviceId, true)
        const timerId = window.setInterval(() => {
          this._pollFilterWheelStatus(deviceId)
        }, pollInterval)
        this.propertyPollingIntervals.set(deviceId, timerId)
        log.debug({ deviceIds: [deviceId] }, `[FilterWheelStore] Started polling for ${deviceId} every ${pollInterval}ms.`)
      },

      /**
       * Stops polling for filter wheel status changes.
       */
      stopFilterWheelPolling(this: UnifiedStoreType, deviceId: string): void {
        this.isDevicePolling.set(deviceId, false)
        if (this.propertyPollingIntervals.has(deviceId)) {
          clearInterval(this.propertyPollingIntervals.get(deviceId)!)
          this.propertyPollingIntervals.delete(deviceId)
          log.debug({ deviceIds: [deviceId] }, `[FilterWheelStore] Stopped polling for ${deviceId}.`)
        }
      },

      /**
       * Handles actions to take when a filter wheel device connects.
       */
      handleFilterWheelConnected(this: UnifiedStoreType, deviceId: string): void {
        log.debug({ deviceIds: [deviceId] }, `[FilterWheelStore] FilterWheel ${deviceId} connected. Fetching details and starting poll.`)
        this.fetchFilterWheelDetails(deviceId)
        this.startFilterWheelPolling(deviceId)
      },

      /**
       * Handles actions to take when a filter wheel device disconnects.
       */
      handleFilterWheelDisconnected(this: UnifiedStoreType, deviceId: string): void {
        log.debug({ deviceIds: [deviceId] }, `[FilterWheelStore] FilterWheel ${deviceId} disconnected. Stopping poll and clearing state.`)
        this.stopFilterWheelPolling(deviceId)
        const clearedProps: Partial<FilterWheelDevice> = {
          position: null,
          filterNames: null,
          focusOffsets: null,
          isMoving: null
        }
        this.updateDevice(deviceId, clearedProps)
      }
    } as const
  }
}
