/**
 * Switch Actions Module
 *
 * Provides functionality for interacting with switch devices.
 */

import log from '@/plugins/logger'
import type { Device, DeviceEvent } from '../types/device-store.types' // Ensure Device is imported if used by UnifiedStoreType context implicitly
import type { UnifiedStoreType } from '../UnifiedStore'
import { SwitchClient } from '@/api/alpaca/switch-client'
import { isSwitch, type SwitchDevice, type UnifiedDevice } from '@/types/device.types'
import type { ISwitchDetail } from '@/types/device.types'

// Signatures of actions in this module
interface ISwitchActionsSignatures {
  fetchSwitchDetails: (this: UnifiedStoreType, deviceId: string) => Promise<void>
  setDeviceSwitchValue: (this: UnifiedStoreType, deviceId: string, switchId: number, value: number | boolean) => Promise<void>
  setDeviceSwitchName: (this: UnifiedStoreType, deviceId: string, switchId: number, name: string) => Promise<void>
  setAsyncSwitchStateStoreAction: (this: UnifiedStoreType, deviceId: string, switchId: number, state: boolean) => Promise<void>
  setAsyncSwitchValueStoreAction: (this: UnifiedStoreType, deviceId: string, switchId: number, value: number) => Promise<void>
  getSwitchStateChangeCompleteStoreAction: (
    this: UnifiedStoreType,
    deviceId: string,
    switchId: number,
    transactionId: number
  ) => Promise<boolean | null>
  startSwitchPolling: (this: UnifiedStoreType, deviceId: string) => void
  stopSwitchPolling: (this: UnifiedStoreType, deviceId: string) => void
  _pollSwitchStatus: (this: UnifiedStoreType, deviceId: string) => Promise<void>
  handleSwitchConnected: (this: UnifiedStoreType, deviceId: string) => void
  handleSwitchDisconnected: (this: UnifiedStoreType, deviceId: string) => void
}

// Combined type for 'this' in actions - No longer used for action 'this' context
// export type SwitchActionContext = SwitchModuleState & CoreState & SwitchActionsSignatures;

export function createSwitchActions(): {
  actions: ISwitchActionsSignatures
} {
  return {
    actions: {
      async fetchSwitchDetails(this: UnifiedStoreType, deviceId: string): Promise<void> {
        const client = this.getDeviceClient(deviceId) as SwitchClient | null
        if (!client) return

        let maxSwitch: number | null = null
        let deviceStateResult: Record<string, unknown> | null = null
        let fetchedViaDeviceState = false

        // Initialize device state tracking if not present
        if (!this.deviceStateAvailableProps.has(deviceId)) {
          this.deviceStateAvailableProps.set(deviceId, new Set<string>())
        }
        const deviceStateProps = this.deviceStateAvailableProps.get(deviceId)!

        if (!this.deviceStateUnsupported.has(deviceId)) {
          try {
            log.debug({ deviceIds: [deviceId] }, `[SwitchStore] Attempting fetchDeviceState for ${deviceId}`)
            deviceStateResult = await this.fetchDeviceState(deviceId, { forceRefresh: true })

            if (deviceStateResult) {
              log.debug({ deviceIds: [deviceId] }, `[SwitchStore] fetchDeviceState successful for ${deviceId}`, deviceStateResult)
              Object.keys(deviceStateResult).forEach((key) => deviceStateProps.add(key.toLowerCase()))
              this.updateDevice(deviceId, { deviceStateAvailableProps: new Set(deviceStateProps) } as Partial<UnifiedDevice>)

              if (deviceStateProps.has('maxswitch')) {
                maxSwitch = Number(deviceStateResult.maxswitch)
                if (isNaN(maxSwitch)) {
                  log.warn({ deviceIds: [deviceId] }, `[SwitchStore] maxswitch from deviceState for ${deviceId} is NaN. Will fetch individually.`)
                  maxSwitch = null
                } else {
                  fetchedViaDeviceState = true
                }
              }
            } else {
              log.warn({ deviceIds: [deviceId] }, `[SwitchStore] fetchDeviceState returned null for ${deviceId}. Will attempt individual fetch.`)
              // Consider adding to deviceStateUnsupported after N failures - for now, proceed to individual.
            }
          } catch (error) {
            log.error(
              { deviceIds: [deviceId] },
              `[SwitchStore] Error calling fetchDeviceState for ${deviceId}. Will attempt individual fetch.`,
              error
            )
            // Consider adding to deviceStateUnsupported - for now, proceed to individual.
          }
        }

        try {
          if (maxSwitch === null) {
            log.debug({ deviceIds: [deviceId] }, `[SwitchStore] Fetching maxswitch individually for ${deviceId}`)
            maxSwitch = await client.maxSwitch()
          }

          if (typeof maxSwitch !== 'number') {
            log.error({ deviceIds: [deviceId] }, `[SwitchStore] Could not determine maxSwitch for ${deviceId}.`)
            this.updateDevice(deviceId, { maxSwitch: null, switches: null, usingDeviceState: fetchedViaDeviceState } as Partial<UnifiedDevice>)
            this._emitEvent({ type: 'deviceApiError', deviceId, error: 'Failed to determine maxSwitch' } as DeviceEvent)
            return
          }

          this.updateDevice(deviceId, { usingDeviceState: fetchedViaDeviceState } as Partial<UnifiedDevice>)

          // Even with deviceState, we typically need to fetch individual switch details
          log.debug({ deviceIds: [deviceId] }, `[SwitchStore] Fetching all switch details individually for ${deviceId} (maxSwitch: ${maxSwitch})`)
          const switches = await client.getAllSwitchDetails() // This method iterates from 0 to maxSwitch-1

          this.updateDevice(deviceId, { maxSwitch: maxSwitch, switches: switches } as Partial<UnifiedDevice>)
          this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'switchDetails', value: { maxSwitch, switches } } as DeviceEvent)
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[SwitchStore] Error fetching switch details for ${deviceId}.`, error)
          this.updateDevice(deviceId, { maxSwitch: null, switches: null, usingDeviceState: false } as Partial<UnifiedDevice>)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to fetch switch details: ${error}` } as DeviceEvent)
        }
      },

      async setDeviceSwitchValue(this: UnifiedStoreType, deviceId: string, switchId: number, value: number | boolean): Promise<void> {
        const client = this.getDeviceClient(deviceId) as SwitchClient | null
        if (!client) return
        try {
          if (typeof value === 'boolean') {
            await client.setSwitch(switchId, value)
          } else {
            await client.setSwitchValue(switchId, value)
          }
          const currentSwitches = ((this.getDeviceById(deviceId) as SwitchDevice)?.switches as ISwitchDetail[] | undefined) || []
          if (currentSwitches[switchId]) {
            const updatedSwitchDetail = await client.getSwitchDetails(switchId)
            const newSwitches = [...currentSwitches]
            newSwitches[switchId] = updatedSwitchDetail
            this.updateDevice(deviceId, { switches: newSwitches } as SwitchDevice)
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
          log.error({ deviceIds: [deviceId] }, `[SwitchStore] Error setting value for switch ${switchId} on ${deviceId}.`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to set switch value: ${error}` } as DeviceEvent)
          await this.fetchSwitchDetails(deviceId) // Ensure consistency on error
        }
      },

      async setDeviceSwitchName(this: UnifiedStoreType, deviceId: string, switchId: number, name: string): Promise<void> {
        const client = this.getDeviceClient(deviceId) as SwitchClient | null
        if (!client) return
        try {
          await client.setSwitchName(switchId, name)
          const currentSwitches = ((this.getDeviceById(deviceId) as SwitchDevice)?.switches as ISwitchDetail[] | undefined) || []
          if (currentSwitches[switchId]) {
            const updatedSwitchDetail = await client.getSwitchDetails(switchId)
            const newSwitches = [...currentSwitches]
            newSwitches[switchId] = updatedSwitchDetail
            this.updateDevice(deviceId, { switches: newSwitches } as SwitchDevice)
            this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: `switchName_${switchId}`, value: name } as DeviceEvent)
          } else {
            await this.fetchSwitchDetails(deviceId)
          }
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[SwitchStore] Error setting name for switch ${switchId} on ${deviceId}.`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to set switch name: ${error}` } as DeviceEvent)
          await this.fetchSwitchDetails(deviceId)
        }
      },

      async setAsyncSwitchStateStoreAction(this: UnifiedStoreType, deviceId: string, switchId: number, state: boolean): Promise<void> {
        const client = this.getDeviceClient(deviceId) as SwitchClient | null
        if (!client) return
        try {
          await client.setAsyncSwitch(switchId, state)
          // Typically, an async set won't update state immediately.
          // The UI would use isStateChangeComplete with a transaction ID (if returned by client) to poll.
          // For now, we don't have transaction ID handling here.
          this._emitEvent({
            type: 'deviceMethodCalled',
            deviceId,
            method: 'setAsyncSwitchState',
            args: [switchId, state],
            result: 'success'
          } as DeviceEvent)
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[SwitchStore] Error setting async state for switch ${switchId} on ${deviceId}.`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to set async switch state: ${error}` } as DeviceEvent)
        }
      },

      async setAsyncSwitchValueStoreAction(this: UnifiedStoreType, deviceId: string, switchId: number, value: number): Promise<void> {
        const client = this.getDeviceClient(deviceId) as SwitchClient | null
        if (!client) return
        try {
          await client.setAsyncSwitchValue(switchId, value)
          // Similar to setAsyncSwitchState, immediate state update is not typical.
          this._emitEvent({
            type: 'deviceMethodCalled',
            deviceId,
            method: 'setAsyncSwitchValue',
            args: [switchId, value],
            result: 'success'
          } as DeviceEvent)
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[SwitchStore] Error setting async value for switch ${switchId} on ${deviceId}.`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to set async switch value: ${error}` } as DeviceEvent)
        }
      },

      async getSwitchStateChangeCompleteStoreAction(
        this: UnifiedStoreType,
        deviceId: string,
        switchId: number,
        transactionId: number
      ): Promise<boolean | null> {
        const client = this.getDeviceClient(deviceId) as SwitchClient | null
        if (!client) return null
        try {
          const isComplete = await client.isStateChangeComplete(switchId, transactionId)
          this._emitEvent({
            type: 'deviceMethodCalled',
            deviceId,
            method: 'isStateChangeComplete',
            args: [switchId, transactionId],
            result: isComplete
          } as DeviceEvent)
          return isComplete
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[SwitchStore] Error checking state change completion for switch ${switchId} on ${deviceId}.`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to check state change completion: ${error}` } as DeviceEvent)
          return null
        }
      },

      async _pollSwitchStatus(this: UnifiedStoreType, deviceId: string): Promise<void> {
        if (!this.isDevicePolling.has(deviceId)) return
        const device: SwitchDevice | null = this.getDeviceById(deviceId) as SwitchDevice | null
        if (!device || !device.isConnected) {
          this.stopSwitchPolling(deviceId)
          return
        }
        const client = this.getDeviceClient(deviceId) as SwitchClient | null
        if (!client) return

        const currentMaxSwitch = device.maxSwitch
        const oldSwitches = device.switches as ISwitchDetail[] | undefined

        if (typeof currentMaxSwitch !== 'number' || !oldSwitches || oldSwitches.length === 0) {
          log.warn(
            { deviceIds: [deviceId] },
            `[SwitchStore] No switch details/maxSwitch available for ${deviceId} during poll, attempting to fetch all details.`
          )
          await this.fetchSwitchDetails(deviceId)
          return
        }

        let deviceStateResult: Record<string, unknown> | null = null
        const deviceStateProps = this.deviceStateAvailableProps.get(deviceId) || new Set<string>()
        let usingDeviceStateInPoll = false

        if (!this.deviceStateUnsupported.has(deviceId)) {
          try {
            const pollIntervalSetting =
              (device.properties?.propertyPollIntervalMs as number) ||
              this.propertyPollingIntervals.get('switchStatus') ||
              this.propertyPollingIntervals.get('switch') ||
              2000 // Default polling interval for switch
            const cacheTtl = pollIntervalSetting / 2

            // log.debug({ deviceIds: [deviceId] }, `[SwitchStore] Polling: Attempting fetchDeviceState for ${deviceId}`)
            deviceStateResult = await this.fetchDeviceState(deviceId, { forceRefresh: true, cacheTtlMs: cacheTtl })
            if (deviceStateResult) {
              // log.debug({ deviceIds: [deviceId] }, `[SwitchStore] Polling: fetchDeviceState successful for ${deviceId}`)
              const oldSize = deviceStateProps.size
              Object.keys(deviceStateResult).forEach((key) => deviceStateProps.add(key.toLowerCase()))
              if (deviceStateProps.size > oldSize) {
                this.deviceStateAvailableProps.set(deviceId, new Set(deviceStateProps))
                this.updateDevice(deviceId, { deviceStateAvailableProps: new Set(deviceStateProps) } as Partial<SwitchDevice>)
              }
              usingDeviceStateInPoll = true
            } else {
              // log.warn({ deviceIds: [deviceId] }, `[SwitchStore] Polling: fetchDeviceState returned null for ${deviceId}.`)
              // Consider adding to deviceStateUnsupported. For now, will proceed to individual polling.
            }
          } catch (error) {
            log.warn(
              { deviceIds: [deviceId] },
              `[SwitchStore] Polling: Error calling fetchDeviceState for ${deviceId}. Marking as unsupported for this poll.`,
              error
            )
            // For now, treat as unsupported for this poll cycle. Persistent marking needs more logic (e.g. N retries)
            // this.deviceStateUnsupported.add(deviceId);
            // this.updateDevice(deviceId, { error: `DeviceState failed for ${deviceId}` });
          }
        }

        // WTF is this?
        this.updateDevice(deviceId, {
          usingDeviceState: usingDeviceStateInPoll && !this.deviceStateUnsupported.has(deviceId)
        } as Partial<UnifiedDevice>)

        const newSwitches = [...oldSwitches.map((sw) => ({ ...sw }))]
        let changedOverall = false

        for (let i = 0; i < newSwitches.length; i++) {
          let fetchedValue: number | boolean | undefined = undefined
          const individualFetchRequired = true

          if (usingDeviceStateInPoll && deviceStateResult) {
            // Alpaca spec for devicestate does not typically include individual switch values.
            // It *might* return something like "switchvalue0", "switchvalue1" but this is non-standard.
            // We'll assume for now it does NOT, and individual polling for values is always needed.
            // If a device *did* provide this, logic could be added here to parse deviceStateResult.
            // e.g. if (deviceStateProps.has(`switchvalue${i}`)) { fetchedValue = deviceStateResult[`switchvalue${i}`]; individualFetchRequired = false; }
          }

          if (individualFetchRequired) {
            try {
              const val = await client.getSwitchValue(i)
              // getSwitchValue is defined to return number. Boolean switches are handled by setSwitch(id, bool)
              // and their values are typically 0 or 1.
              fetchedValue = val
            } catch (error) {
              log.warn({ deviceIds: [deviceId] }, `[SwitchStore] Error polling value for switch ${i} on ${deviceId}.`, error)
              continue // Skip this switch if value fetch fails
            }
          }

          if (fetchedValue !== undefined && newSwitches[i].value !== fetchedValue) {
            newSwitches[i].value = fetchedValue
            changedOverall = true
            this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: `switchValue_${i}`, value: fetchedValue } as DeviceEvent)
          }
        }

        if (changedOverall) {
          this.updateDevice(deviceId, { switches: newSwitches } as SwitchDevice)
        }
      },

      startSwitchPolling(this: UnifiedStoreType, deviceId: string): void {
        const device: Device | null = this.getDeviceById(deviceId)
        if (!device || !isSwitch(device) || !device.isConnected) return
        if (this.isDevicePolling.has(deviceId)) {
          this.stopSwitchPolling(deviceId)
        }
        const pollInterval = (device.properties?.propertyPollIntervalMs as number) || 3000
        this.isDevicePolling.set(deviceId, true)
        const timerId = window.setInterval(() => this._pollSwitchStatus(deviceId), pollInterval)
        this.propertyPollingIntervals.set(deviceId, timerId)
        log.debug({ deviceIds: [deviceId], pollInterval }, `[SwitchStore] Started polling for ${deviceId} every ${pollInterval}ms.`)
      },

      stopSwitchPolling(this: UnifiedStoreType, deviceId: string): void {
        this.isDevicePolling.set(deviceId, false)
        if (this.propertyPollingIntervals.has(deviceId)) {
          clearInterval(this.propertyPollingIntervals.get(deviceId)!)
          this.propertyPollingIntervals.delete(deviceId)
          log.debug({ deviceIds: [deviceId] }, `[SwitchStore] Stopped polling for ${deviceId}.`)
        }
      },

      handleSwitchConnected(this: UnifiedStoreType, deviceId: string): void {
        log.debug({ deviceIds: [deviceId] }, `[SwitchStore] Switch ${deviceId} connected. Fetching details and starting poll.`)
        this.fetchSwitchDetails(deviceId)
        this.startSwitchPolling(deviceId)
      },

      handleSwitchDisconnected(this: UnifiedStoreType, deviceId: string): void {
        log.debug({ deviceIds: [deviceId] }, `[SwitchStore] Switch ${deviceId} disconnected. Stopping poll and clearing state.`)
        this.stopSwitchPolling(deviceId)
        this.updateDevice(deviceId, { maxSwitch: null, switches: null } as SwitchDevice)
      }
    }
  }
}

export type { ISwitchDetail } from '@/types/device.types'
