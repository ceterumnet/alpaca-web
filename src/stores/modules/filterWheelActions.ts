/**
 * FilterWheel Actions Module
 *
 * Provides functionality for interacting with filter wheel devices.
 */

import type { CoreState } from './coreActions' // Assuming CoreState is exported from coreActions
import { FilterWheelClient } from '@/api/alpaca/filterwheel-client'
import { isFilterWheel } from '@/types/device.types' // Type guard

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
  _getFilterWheelClient: (deviceId: string) => FilterWheelClient | null
  fetchFilterWheelDetails: (deviceId: string) => Promise<void>
  setFilterWheelPosition: (deviceId: string, position: number) => Promise<void>
  setFilterWheelName: (deviceId: string, filterIndex: number, name: string) => Promise<void>
  _pollFilterWheelStatus: (deviceId: string) => Promise<void>
  startFilterWheelPolling: (deviceId: string) => void
  stopFilterWheelPolling: (deviceId: string) => void
  handleFilterWheelConnected: (deviceId: string) => void
  handleFilterWheelDisconnected: (deviceId: string) => void
}

// Combined type for 'this' in actions
// This context provides module state, core state/actions, and this module's own actions.
export type FilterWheelActionContext = FilterWheelModuleState & CoreState & FilterWheelActionsSignatures

export function createFilterWheelActions() {
  return {
    state: (): FilterWheelModuleState => ({
      _fw_pollingTimers: new Map(),
      _fw_isPolling: new Map()
    }),

    // Type the entire actions object with the context for `this`
    // Pinia infers the types of individual actions, but `this` needs to be explicit
    // if we are calling `this.otherActionFromSameModule()`
    actions: {
      /**
       * Internal helper to get or create a FilterWheelClient for a device.
       */
      _getFilterWheelClient(this: FilterWheelActionContext, deviceId: string): FilterWheelClient | null {
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
      async fetchFilterWheelDetails(this: FilterWheelActionContext, deviceId: string): Promise<void> {
        const client = this._getFilterWheelClient(deviceId)
        if (!client) return

        try {
          const [position, names, offsets] = await Promise.all([client.getPosition(), client.getFilterNames(), client.getFocusOffsets()])

          const updates: FilterWheelDeviceProperties = {
            fw_currentPosition: position ?? -1,
            fw_filterNames: Array.isArray(names) ? names : [],
            fw_focusOffsets: Array.isArray(offsets) ? offsets : []
          }
          this.updateDevice(deviceId, updates) // Changed from updateDeviceProperties
          this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'filterWheelDetails', value: updates }) // from CoreState
        } catch (error) {
          console.error(`[FilterWheelStore] Error fetching details for ${deviceId}:`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to fetch filter wheel details: ${error}` }) // from CoreState
        }
      },

      /**
       * Sets the position of the filter wheel.
       */
      async setFilterWheelPosition(this: FilterWheelActionContext, deviceId: string, position: number): Promise<void> {
        const client = this._getFilterWheelClient(deviceId)
        if (!client) return

        try {
          await client.setPosition(position)
          const newPos = await client.getPosition()
          this.updateDevice(deviceId, { fw_currentPosition: newPos, fw_isMoving: false }) // Changed from updateDeviceProperties
          this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'fw_currentPosition', value: newPos }) // from CoreState
        } catch (error) {
          console.error(`[FilterWheelStore] Error setting position for ${deviceId} to ${position}:`, error)
          this.updateDevice(deviceId, { fw_isMoving: false }) // Changed from updateDeviceProperties
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to set filter wheel position: ${error}` }) // from CoreState
          await this.fetchFilterWheelDetails(deviceId) // Call to another action in this module
        }
      },

      /**
       * Sets the name of a specific filter slot.
       */
      async setFilterWheelName(this: FilterWheelActionContext, deviceId: string, filterIndex: number, name: string): Promise<void> {
        const client = this._getFilterWheelClient(deviceId)
        if (!client) return

        try {
          await client.setFilterName(filterIndex, name)
          await this.fetchFilterWheelDetails(deviceId) // Call to another action in this module
          this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'fw_filterNames', value: name }) // from CoreState
        } catch (error) {
          console.error(`[FilterWheelStore] Error setting name for filter ${filterIndex} on ${deviceId}:`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to set filter name: ${error}` }) // from CoreState
        }
      },

      /**
       * Internal polling function for filter wheel status (primarily position).
       */
      async _pollFilterWheelStatus(this: FilterWheelActionContext, deviceId: string): Promise<void> {
        if (!this._fw_isPolling.get(deviceId)) return

        const device = this.getDeviceById(deviceId) // from CoreState
        if (!device || !device.isConnected) {
          this.stopFilterWheelPolling(deviceId) // Call to another action in this module
          return
        }

        const client = this._getFilterWheelClient(deviceId)
        if (!client) {
          this.stopFilterWheelPolling(deviceId) // Call to another action in this module
          return
        }

        try {
          const currentPositionInStore = device.properties?.fw_currentPosition as number | undefined
          const pos = await client.getPosition()
          if (pos !== null && pos !== currentPositionInStore) {
            this.updateDevice(deviceId, { fw_currentPosition: pos }) // Changed from updateDeviceProperties
            this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'fw_currentPosition', value: pos }) // from CoreState
          }
        } catch (error) {
          console.warn(`[FilterWheelStore] Error polling status for ${deviceId}:`, error)
        }
      },

      /**
       * Starts polling for filter wheel status changes.
       */
      startFilterWheelPolling(this: FilterWheelActionContext, deviceId: string): void {
        const device = this.getDeviceById(deviceId) // from CoreState
        if (!device || !isFilterWheel(device) || !device.isConnected) return

        if (this._fw_pollingTimers.has(deviceId)) {
          this.stopFilterWheelPolling(deviceId) // Call to another action in this module
        }

        const pollInterval = (device.properties?.propertyPollIntervalMs as number) || 3000

        this._fw_isPolling.set(deviceId, true)
        const timerId = window.setInterval(() => {
          this._pollFilterWheelStatus(deviceId) // Call to another action in this module
        }, pollInterval)
        this._fw_pollingTimers.set(deviceId, timerId)
        console.log(`[FilterWheelStore] Started polling for ${deviceId} every ${pollInterval}ms.`)
      },

      /**
       * Stops polling for filter wheel status changes.
       */
      stopFilterWheelPolling(this: FilterWheelActionContext, deviceId: string): void {
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
      handleFilterWheelConnected(this: FilterWheelActionContext, deviceId: string): void {
        console.log(`[FilterWheelStore] FilterWheel ${deviceId} connected. Fetching details and starting poll.`)
        this.fetchFilterWheelDetails(deviceId) // Call to another action in this module
        this.startFilterWheelPolling(deviceId) // Call to another action in this module
      },

      /**
       * Handles actions to take when a filter wheel device disconnects.
       */
      handleFilterWheelDisconnected(this: FilterWheelActionContext, deviceId: string): void {
        console.log(`[FilterWheelStore] FilterWheel ${deviceId} disconnected. Stopping poll and clearing state.`)
        this.stopFilterWheelPolling(deviceId) // Call to another action in this module
        const clearedProps: FilterWheelDeviceProperties = {
          fw_currentPosition: null,
          fw_filterNames: null,
          fw_focusOffsets: null,
          fw_isMoving: null
        }
        this.updateDevice(deviceId, clearedProps) // Changed from updateDeviceProperties
      }
    } as const // Added 'as const' for better type inference of action names if needed elsewhere, though FilterWheelActionsSignatures defines them.
  }
}
