/**
 * Switch Actions Module
 *
 * Provides functionality for interacting with switch devices.
 */

import type { Device, DeviceEvent } from '../types/device-store.types' // Ensure Device is imported if used by UnifiedStoreType context implicitly
// import type { CoreState } from './coreActions' // This might become unused if SwitchActionContext is removed and actions use UnifiedStoreType
import type { UnifiedStoreType } from '../UnifiedStore'
import { SwitchClient, type ISwitchDetail } from '@/api/alpaca/switch-client'
import { isSwitch } from '@/types/device.types'

// Properties that this module will manage on the Device object in the store
export interface SwitchDeviceProperties {
  sw_switches?: ISwitchDetail[] | null // Array of switch details
  sw_maxSwitch?: number | null
  [key: string]: unknown // Index signature for UnifiedDevice compatibility
}

// Internal state for the module
export interface SwitchModuleState {
  _sw_pollingTimers: Map<string, number>
  _sw_isPolling: Map<string, boolean>
}

// Signatures of actions in this module
interface SwitchActionsSignatures {
  _getSwitchClient: (this: UnifiedStoreType, deviceId: string) => SwitchClient | null
  fetchSwitchDetails: (this: UnifiedStoreType, deviceId: string) => Promise<void>
  setDeviceSwitchValue: (this: UnifiedStoreType, deviceId: string, switchId: number, value: number | boolean) => Promise<void>
  setDeviceSwitchName: (this: UnifiedStoreType, deviceId: string, switchId: number, name: string) => Promise<void>
  startSwitchPolling: (this: UnifiedStoreType, deviceId: string) => void
  stopSwitchPolling: (this: UnifiedStoreType, deviceId: string) => void
  _pollSwitchStatus: (this: UnifiedStoreType, deviceId: string) => Promise<void>
  handleSwitchConnected: (this: UnifiedStoreType, deviceId: string) => void
  handleSwitchDisconnected: (this: UnifiedStoreType, deviceId: string) => void
}

// Combined type for 'this' in actions - No longer used for action 'this' context
// export type SwitchActionContext = SwitchModuleState & CoreState & SwitchActionsSignatures;

export function createSwitchActions(): {
  state: () => SwitchModuleState
  actions: SwitchActionsSignatures
} {
  return {
    state: (): SwitchModuleState => ({
      _sw_pollingTimers: new Map(),
      _sw_isPolling: new Map()
    }),

    actions: {
      _getSwitchClient(this: UnifiedStoreType, deviceId: string): SwitchClient | null {
        const device: Device | null = this.getDeviceById(deviceId)
        if (!device || !isSwitch(device)) {
          console.error(`[SwitchStore] Device ${deviceId} not found or is not a Switch device.`)
          return null
        }
        let baseUrl = ''
        if (device.apiBaseUrl) baseUrl = device.apiBaseUrl
        else if (device.address && device.port) baseUrl = `http://${device.address}:${device.port}`
        else if (device.ipAddress && device.port) baseUrl = `http://${device.ipAddress}:${device.port}`
        else {
          console.error(`[SwitchStore] Device ${deviceId} has incomplete address details.`)
          return null
        }
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)
        const deviceNumber = typeof device.deviceNum === 'number' ? device.deviceNum : 0
        return new SwitchClient(baseUrl, deviceNumber, device)
      },

      async fetchSwitchDetails(this: UnifiedStoreType, deviceId: string): Promise<void> {
        const client = this._getSwitchClient(deviceId)
        if (!client) return
        try {
          const maxSwitch = await client.maxSwitch()
          const switches = await client.getAllSwitchDetails()
          this.updateDevice(deviceId, { sw_maxSwitch: maxSwitch, sw_switches: switches })
          this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'switchDetails', value: { maxSwitch, switches } } as DeviceEvent)
        } catch (error) {
          console.error(`[SwitchStore] Error fetching switch details for ${deviceId}:`, error)
          this.updateDevice(deviceId, { sw_maxSwitch: null, sw_switches: null })
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to fetch switch details: ${error}` } as DeviceEvent)
        }
      },

      async setDeviceSwitchValue(this: UnifiedStoreType, deviceId: string, switchId: number, value: number | boolean): Promise<void> {
        const client = this._getSwitchClient(deviceId)
        if (!client) return
        try {
          if (typeof value === 'boolean') {
            await client.setSwitch(switchId, value)
          } else {
            await client.setSwitchValue(switchId, value)
          }
          const currentSwitches = (this.getDeviceById(deviceId)?.properties?.sw_switches as ISwitchDetail[] | undefined) || []
          if (currentSwitches[switchId]) {
            const updatedSwitchDetail = await client.getSwitchDetails(switchId)
            const newSwitches = [...currentSwitches]
            newSwitches[switchId] = updatedSwitchDetail
            this.updateDevice(deviceId, { sw_switches: newSwitches })
            this._emitEvent({
              type: 'devicePropertyChanged',
              deviceId,
              property: `switchValue_${switchId}`,
              value: updatedSwitchDetail.value
            } as DeviceEvent)
          } else {
            await this.fetchSwitchDetails(deviceId) // Fallback to full refresh if switch wasn't in store
          }
        } catch (error) {
          console.error(`[SwitchStore] Error setting value for switch ${switchId} on ${deviceId}:`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to set switch value: ${error}` } as DeviceEvent)
          await this.fetchSwitchDetails(deviceId) // Ensure consistency on error
        }
      },

      async setDeviceSwitchName(this: UnifiedStoreType, deviceId: string, switchId: number, name: string): Promise<void> {
        const client = this._getSwitchClient(deviceId)
        if (!client) return
        try {
          await client.setSwitchName(switchId, name)
          const currentSwitches = (this.getDeviceById(deviceId)?.properties?.sw_switches as ISwitchDetail[] | undefined) || []
          if (currentSwitches[switchId]) {
            const updatedSwitchDetail = await client.getSwitchDetails(switchId)
            const newSwitches = [...currentSwitches]
            newSwitches[switchId] = updatedSwitchDetail
            this.updateDevice(deviceId, { sw_switches: newSwitches })
            this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: `switchName_${switchId}`, value: name } as DeviceEvent)
          } else {
            await this.fetchSwitchDetails(deviceId)
          }
        } catch (error) {
          console.error(`[SwitchStore] Error setting name for switch ${switchId} on ${deviceId}:`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to set switch name: ${error}` } as DeviceEvent)
          await this.fetchSwitchDetails(deviceId)
        }
      },

      async _pollSwitchStatus(this: UnifiedStoreType, deviceId: string): Promise<void> {
        if (!this._sw_isPolling.get(deviceId)) return
        const device: Device | null = this.getDeviceById(deviceId)
        if (!device || !device.isConnected) {
          this.stopSwitchPolling(deviceId)
          return
        }
        const client = this._getSwitchClient(deviceId)
        if (!client) return

        const oldSwitches = device.properties?.sw_switches as ISwitchDetail[] | undefined
        if (!oldSwitches) {
          await this.fetchSwitchDetails(deviceId) // Fetch all if not available
          return
        }

        try {
          const newSwitches = [...oldSwitches]
          let changed = false
          for (let i = 0; i < newSwitches.length; i++) {
            const newValue = await client.getSwitchValue(i)
            if (newSwitches[i].value !== newValue) {
              newSwitches[i] = { ...newSwitches[i], value: newValue }
              changed = true
              this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: `switchValue_${i}`, value: newValue } as DeviceEvent)
            }
          }
          if (changed) {
            this.updateDevice(deviceId, { sw_switches: newSwitches })
          }
        } catch (error) {
          console.warn(`[SwitchStore] Error polling switch values for ${deviceId}:`, error)
          // Potentially fetch all on error to resync, or just log and continue
        }
      },

      startSwitchPolling(this: UnifiedStoreType, deviceId: string): void {
        const device: Device | null = this.getDeviceById(deviceId)
        if (!device || !isSwitch(device) || !device.isConnected) return
        if (this._sw_pollingTimers.has(deviceId)) {
          this.stopSwitchPolling(deviceId)
        }
        const pollInterval = (device.properties?.propertyPollIntervalMs as number) || 3000
        this._sw_isPolling.set(deviceId, true)
        const timerId = window.setInterval(() => this._pollSwitchStatus(deviceId), pollInterval)
        this._sw_pollingTimers.set(deviceId, timerId)
        console.log(`[SwitchStore] Started polling for ${deviceId} every ${pollInterval}ms.`)
      },

      stopSwitchPolling(this: UnifiedStoreType, deviceId: string): void {
        this._sw_isPolling.set(deviceId, false)
        if (this._sw_pollingTimers.has(deviceId)) {
          clearInterval(this._sw_pollingTimers.get(deviceId)!)
          this._sw_pollingTimers.delete(deviceId)
          console.log(`[SwitchStore] Stopped polling for ${deviceId}.`)
        }
      },

      handleSwitchConnected(this: UnifiedStoreType, deviceId: string): void {
        console.log(`[SwitchStore] Switch ${deviceId} connected. Fetching details and starting poll.`)
        this.fetchSwitchDetails(deviceId)
        this.startSwitchPolling(deviceId)
      },

      handleSwitchDisconnected(this: UnifiedStoreType, deviceId: string): void {
        console.log(`[SwitchStore] Switch ${deviceId} disconnected. Stopping poll and clearing state.`)
        this.stopSwitchPolling(deviceId)
        this.updateDevice(deviceId, { sw_maxSwitch: null, sw_switches: null })
      }
    }
  }
}
