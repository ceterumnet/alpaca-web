/**
 * FilterWheel Actions Module
 *
 * Provides functionality for interacting with filter wheel devices.
 */

import { FilterWheelClient } from '@/api/alpaca/filterwheel-client'
import { isFilterWheel } from '@/types/device.types' // Type guard
import type { UnifiedStoreType } from '../UnifiedStore'
import type { DeviceEvent } from '../types/device-store.types'

// Properties that this module will manage on the Device object in the store
export interface FilterWheelDeviceProperties {
  fw_currentPosition?: number | null
  fw_filterNames?: string[] | null
  fw_focusOffsets?: number[] | null
  fw_isMoving?: boolean | null // If the filter wheel supports reporting this
  [key: string]: unknown // Added index signature for compatibility with UnifiedDevice
}

// Internal state for the FilterWheel module itself (e.g., polling timers)
export interface FilterWheelModuleState {
  _fw_pollingTimers: Map<string, number> // deviceId -> intervalId
  _fw_isPolling: Map<string, boolean> // To prevent multiple poll loops for the same device
}

// Interface describing the signatures of actions in this module
interface FilterWheelActionsSignatures {
  _getFilterWheelClient: (this: UnifiedStoreType, deviceId: string) => FilterWheelClient | null
  fetchFilterWheelDetails: (this: UnifiedStoreType, deviceId: string) => Promise<void>
  setFilterWheelPosition: (this: UnifiedStoreType, deviceId: string, position: number) => Promise<void>
  setFilterWheelName: (this: UnifiedStoreType, deviceId: string, filterIndex: number, newName: string) => Promise<void>
  _pollFilterWheelStatus: (this: UnifiedStoreType, deviceId: string) => Promise<void>
  startFilterWheelPolling: (this: UnifiedStoreType, deviceId: string) => void
  stopFilterWheelPolling: (this: UnifiedStoreType, deviceId: string) => void
  handleFilterWheelConnected: (this: UnifiedStoreType, deviceId: string) => void
  handleFilterWheelDisconnected: (this: UnifiedStoreType, deviceId: string) => void
}

export function createFilterWheelActions(): {
  state: () => FilterWheelModuleState
  actions: FilterWheelActionsSignatures
} {
  return {
    state: (): FilterWheelModuleState => ({
      _fw_pollingTimers: new Map(),
      _fw_isPolling: new Map()
    }),

    actions: {
      /**
       * Internal helper to get or create a FilterWheelClient for a device.
       */
      _getFilterWheelClient(this: UnifiedStoreType, deviceId: string): FilterWheelClient | null {
        const device = this.getDeviceById(deviceId)
        if (!device || !isFilterWheel(device)) {
          console.error(`[FilterWheelStore] Device ${deviceId} not found or is not a FilterWheel.`)
          return null
        }

        let baseUrl = ''
        if (device.apiBaseUrl) {
          baseUrl = device.apiBaseUrl
        } else if (device.address && device.port) {
          baseUrl = `http://${device.address}:${device.port}`
        } else if (device.ipAddress && device.port) {
          baseUrl = `http://${device.ipAddress}:${device.port}`
        } else {
          console.error(`[FilterWheelStore] Device ${deviceId} has incomplete address details.`)
          return null
        }
        if (baseUrl.endsWith('/')) {
          baseUrl = baseUrl.slice(0, -1)
        }
        const deviceNumber = typeof device.deviceNum === 'number' ? device.deviceNum : 0
        return new FilterWheelClient(baseUrl, deviceNumber, device)
      },

      /**
       * Fetches all relevant details for a filter wheel and updates the store.
       */
      async fetchFilterWheelDetails(this: UnifiedStoreType, deviceId: string): Promise<void> {
        const client = this._getFilterWheelClient(deviceId)
        if (!client) return

        try {
          const [position, names, offsets] = await Promise.all([client.getPosition(), client.getFilterNames(), client.getFocusOffsets()])

          const updates: FilterWheelDeviceProperties = {
            fw_currentPosition: position ?? -1,
            fw_filterNames: Array.isArray(names) ? names : [],
            fw_focusOffsets: Array.isArray(offsets) ? offsets : []
          }
          this.updateDevice(deviceId, updates)
          this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'filterWheelDetails', value: updates } as DeviceEvent)
        } catch (error) {
          console.error(`[FilterWheelStore] Error fetching details for ${deviceId}:`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to fetch filter wheel details: ${error}` } as DeviceEvent)
        }
      },

      /**
       * Sets the position of the filter wheel.
       */
      async setFilterWheelPosition(this: UnifiedStoreType, deviceId: string, position: number): Promise<void> {
        const client = this._getFilterWheelClient(deviceId)
        if (!client) return

        try {
          await client.setPosition(position)
          const newPos = await client.getPosition()
          this.updateDevice(deviceId, { fw_currentPosition: newPos, fw_isMoving: false })
          this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'fw_currentPosition', value: newPos } as DeviceEvent)
        } catch (error) {
          console.error(`[FilterWheelStore] Error setting position for ${deviceId} to ${position}:`, error)
          this.updateDevice(deviceId, { fw_isMoving: false })
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to set filter wheel position: ${error}` } as DeviceEvent)
          await this.fetchFilterWheelDetails(deviceId)
        }
      },

      /**
       * Sets the name of a specific filter in the filter wheel.
       */
      async setFilterWheelName(this: UnifiedStoreType, deviceId: string, filterIndex: number, newName: string): Promise<void> {
        const client = this._getFilterWheelClient(deviceId)
        if (!client) {
          console.error(`[FilterWheelStore] Could not get client for device ${deviceId} to set filter name.`)
          return Promise.reject(new Error(`FilterWheel client not found for device ${deviceId}.`))
        }

        const device = this.getDeviceById(deviceId)
        let oldName = 'unknown'
        if (device && Array.isArray(device.fw_filterNames)) {
          oldName = device.fw_filterNames[filterIndex] ?? 'unknown'
        }

        try {
          await client.setFilterName(filterIndex, newName)
          await this.fetchFilterWheelDetails(deviceId)

          this._emitEvent({
            type: 'devicePropertyChanged',
            deviceId,
            property: 'fw_filterNames',
            value: { index: filterIndex, oldName, newName },
            message: `Filter ${filterIndex} name changed from "${oldName}" to "${newName}"`
          } as DeviceEvent)
          console.log(`[FilterWheelStore] Successfully set name for filter ${filterIndex} on ${deviceId} to "${newName}".`)
        } catch (error) {
          console.error(`[FilterWheelStore] Error setting name for filter ${filterIndex} on ${deviceId} to "${newName}":`, error)
          this._emitEvent({
            type: 'deviceApiError',
            deviceId,
            error: `Failed to set filter name for index ${filterIndex} to "${newName}": ${error}`,
            message: `Error setting filter ${filterIndex} name. Original name: "${oldName}". Attempted: "${newName}".`
          } as DeviceEvent)
          return Promise.reject(error)
        }
      },

      /**
       * Internal polling function for filter wheel status (primarily position).
       */
      async _pollFilterWheelStatus(this: UnifiedStoreType, deviceId: string): Promise<void> {
        if (!this._fw_isPolling.get(deviceId)) return

        const device = this.getDeviceById(deviceId)
        if (!device || !device.isConnected) {
          this.stopFilterWheelPolling(deviceId)
          return
        }

        const client = this._getFilterWheelClient(deviceId)
        if (!client) {
          this.stopFilterWheelPolling(deviceId)
          return
        }

        try {
          const currentPositionInStore = device.properties?.fw_currentPosition as number | undefined
          const pos = await client.getPosition()
          if (pos !== null && pos !== currentPositionInStore) {
            this.updateDevice(deviceId, { fw_currentPosition: pos })
            this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'fw_currentPosition', value: pos } as DeviceEvent)
          }
        } catch (error) {
          console.warn(`[FilterWheelStore] Error polling status for ${deviceId}:`, error)
        }
      },

      /**
       * Starts polling for filter wheel status changes.
       */
      startFilterWheelPolling(this: UnifiedStoreType, deviceId: string): void {
        const device = this.getDeviceById(deviceId)
        if (!device || !isFilterWheel(device) || !device.isConnected) return

        if (this._fw_pollingTimers.has(deviceId)) {
          this.stopFilterWheelPolling(deviceId)
        }

        const pollInterval = (device.properties?.propertyPollIntervalMs as number) || 3000

        this._fw_isPolling.set(deviceId, true)
        const timerId = window.setInterval(() => {
          this._pollFilterWheelStatus(deviceId)
        }, pollInterval)
        this._fw_pollingTimers.set(deviceId, timerId)
        console.log(`[FilterWheelStore] Started polling for ${deviceId} every ${pollInterval}ms.`)
      },

      /**
       * Stops polling for filter wheel status changes.
       */
      stopFilterWheelPolling(this: UnifiedStoreType, deviceId: string): void {
        this._fw_isPolling.set(deviceId, false)
        if (this._fw_pollingTimers.has(deviceId)) {
          clearInterval(this._fw_pollingTimers.get(deviceId)!)
          this._fw_pollingTimers.delete(deviceId)
          console.log(`[FilterWheelStore] Stopped polling for ${deviceId}.`)
        }
      },

      /**
       * Handles actions to take when a filter wheel device connects.
       */
      handleFilterWheelConnected(this: UnifiedStoreType, deviceId: string): void {
        console.log(`[FilterWheelStore] FilterWheel ${deviceId} connected. Fetching details and starting poll.`)
        this.fetchFilterWheelDetails(deviceId)
        this.startFilterWheelPolling(deviceId)
      },

      /**
       * Handles actions to take when a filter wheel device disconnects.
       */
      handleFilterWheelDisconnected(this: UnifiedStoreType, deviceId: string): void {
        console.log(`[FilterWheelStore] FilterWheel ${deviceId} disconnected. Stopping poll and clearing state.`)
        this.stopFilterWheelPolling(deviceId)
        const clearedProps: FilterWheelDeviceProperties = {
          fw_currentPosition: null,
          fw_filterNames: null,
          fw_focusOffsets: null,
          fw_isMoving: null
        }
        this.updateDevice(deviceId, clearedProps)
      }
    } as const
  }
}
