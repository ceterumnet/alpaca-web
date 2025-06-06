import log from '@/plugins/logger'
import type { UnifiedStoreType } from '../UnifiedStore'
import type { Device, DeviceEvent, FocuserDeviceProperties } from '../types/device-store.types'
import { FocuserClient } from '@/api/alpaca/focuser-client' // Assuming this will be created
import { isFocuser } from '@/types/device.types' // Assuming this type guard exists or will be created

interface IFocuserActions {
  fetchFocuserDetails: (this: UnifiedStoreType, deviceId: string) => Promise<void>
  fetchFocuserStatus: (this: UnifiedStoreType, deviceId: string) => Promise<void> // Similar to fetchFocuserDetails but perhaps more frequent
  moveFocuser: (this: UnifiedStoreType, deviceId: string, position: number) => Promise<void>
  haltFocuser: (this: UnifiedStoreType, deviceId: string) => Promise<void>
  setFocuserTempComp: (this: UnifiedStoreType, deviceId: string, enable: boolean) => Promise<void>

  // Polling actions
  startFocuserPolling: (this: UnifiedStoreType, deviceId: string) => void
  stopFocuserPolling: (this: UnifiedStoreType, deviceId: string) => void
  _pollFocuserStatus: (this: UnifiedStoreType, deviceId: string) => Promise<void>

  // Connection handlers
  handleFocuserConnected: (this: UnifiedStoreType, deviceId: string) => void
  handleFocuserDisconnected: (this: UnifiedStoreType, deviceId: string) => void

  // Optional: if stepSize is not read-only and needs to be set via store
  // setFocuserStepSize: (this: UnifiedStoreType, deviceId: string, stepSize: number) => Promise<void>
}

export function createFocuserActions(): {
  actions: IFocuserActions
} {
  return {
    actions: {
      async fetchFocuserDetails(this: UnifiedStoreType, deviceId: string): Promise<void> {
        const client = this.getDeviceClient(deviceId) as FocuserClient
        if (!client) return

        try {
          // Fetch properties that don't change often or are capabilities
          const maxStep = await client.getMaxStep()
          const maxIncrement = await client.getMaxIncrement()
          const stepSize = await client.getStepSize() // StepSize is often read-only for focusers

          const updates: FocuserDeviceProperties = {
            focuser_maxStep: maxStep ?? null,
            focuser_maxIncrement: maxIncrement ?? null,
            focuser_stepSize: stepSize ?? null
            // tempCompAvailable might be another capability to fetch here
          }
          this.updateDeviceProperties(deviceId, updates) // Use updateDeviceProperties for partial updates
          this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'focuserCapabilities', value: updates } as DeviceEvent)

          // Fetch dynamic status as well
          await this.fetchFocuserStatus(deviceId)
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[FocuserStore] Error fetching details for ${deviceId}.`, error)
          this._emitEvent({
            type: 'deviceApiError',
            deviceId,
            action: 'fetchFocuserDetails',
            error: `Failed to fetch focuser details: ${error}`
          } as DeviceEvent)
        }
      },

      async fetchFocuserStatus(this: UnifiedStoreType, deviceId: string): Promise<void> {
        const client = this.getDeviceClient(deviceId) as FocuserClient
        if (!client) return

        try {
          const position = await client.getPosition()
          const isMoving = await client.isMoving()
          const temperature = await client.getTemperature() // Might be null
          const tempComp = await client.getTempComp() // Might be null if not supported

          const updates: FocuserDeviceProperties = {
            focuser_position: position ?? null,
            focuser_isMoving: isMoving ?? null,
            focuser_temperature: temperature ?? null,
            focuser_tempComp: tempComp ?? null
          }
          this.updateDeviceProperties(deviceId, updates)
          this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'focuserStatus', value: updates } as DeviceEvent)
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[FocuserStore] Error fetching status for ${deviceId}.`, error)
          // Do not emit API error for routine polling failures unless critical
        }
      },

      async moveFocuser(this: UnifiedStoreType, deviceId: string, targetPosition: number): Promise<void> {
        const client = this.getDeviceClient(deviceId) as FocuserClient
        if (!client) return
        try {
          await client.move(targetPosition)
          // Optimistically update or wait for poll, for now, rely on poll
          this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'moveFocuser', args: [targetPosition], result: 'success' } as DeviceEvent)
          await this.fetchFocuserStatus(deviceId) // Refresh status
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[FocuserStore] Error moving focuser ${deviceId} to ${targetPosition}.`, error)
          this._emitEvent({
            type: 'deviceApiError',
            deviceId,
            action: 'moveFocuser',
            error: `Failed to move focuser: ${error}`,
            params: { targetPosition }
          } as DeviceEvent)
          await this.fetchFocuserStatus(deviceId) // Refresh status even on error
        }
      },

      async haltFocuser(this: UnifiedStoreType, deviceId: string): Promise<void> {
        const client = this.getDeviceClient(deviceId) as FocuserClient
        if (!client) return
        try {
          await client.halt()
          this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'haltFocuser', args: [], result: 'success' } as DeviceEvent)
          await this.fetchFocuserStatus(deviceId)
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[FocuserStore] Error halting focuser ${deviceId}.`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, action: 'haltFocuser', error: `Failed to halt focuser: ${error}` } as DeviceEvent)
          await this.fetchFocuserStatus(deviceId)
        }
      },

      async setFocuserTempComp(this: UnifiedStoreType, deviceId: string, enable: boolean): Promise<void> {
        const client = this.getDeviceClient(deviceId) as FocuserClient
        if (!client) return
        try {
          await client.setTempComp(enable)
          this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'setFocuserTempComp', args: [enable], result: 'success' } as DeviceEvent)
          await this.fetchFocuserStatus(deviceId)
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[FocuserStore] Error setting TempComp for ${deviceId}.`, error)
          this._emitEvent({
            type: 'deviceApiError',
            deviceId,
            action: 'setFocuserTempComp',
            error: `Failed to set TempComp: ${error}`,
            params: { enable }
          } as DeviceEvent)
          await this.fetchFocuserStatus(deviceId)
        }
      },

      async _pollFocuserStatus(this: UnifiedStoreType, deviceId: string): Promise<void> {
        if (!this.isDevicePolling.get(deviceId)) return

        const device: Device | null = this.getDeviceById(deviceId)
        if (!device || !device.isConnected) {
          this.stopFocuserPolling(deviceId)
          return
        }
        await this.fetchFocuserStatus(deviceId)
      },

      startFocuserPolling(this: UnifiedStoreType, deviceId: string): void {
        const device: Device | null = this.getDeviceById(deviceId)
        if (!device || !isFocuser(device) || !device.isConnected) return

        if (this.isDevicePolling.has(deviceId)) {
          this.stopFocuserPolling(deviceId)
        }
        const pollInterval = (device.properties?.propertyPollIntervalMs as number) || 1000 // Focuser position can change frequently

        this.isDevicePolling.set(deviceId, true)
        const timerId = window.setInterval(() => this._pollFocuserStatus(deviceId), pollInterval)
        this.propertyPollingIntervals.set(deviceId, timerId)
        log.debug({ deviceId, pollInterval }, `[FocuserStore] Started polling for ${deviceId} every ${pollInterval}ms.`)
      },

      stopFocuserPolling(this: UnifiedStoreType, deviceId: string): void {
        this.isDevicePolling.set(deviceId, false)
        if (this.isDevicePolling.has(deviceId)) {
          clearInterval(this.propertyPollingIntervals.get(deviceId)!)
          this.propertyPollingIntervals.delete(deviceId)
          log.debug({ deviceId }, `[FocuserStore] Stopped polling for ${deviceId}.`)
        }
      },

      handleFocuserConnected: async function (this: UnifiedStoreType, deviceId: string): Promise<void> {
        log.debug({ deviceId }, `[FocuserStore] Focuser ${deviceId} connected. Fetching details and starting poll.`)
        await this.fetchFocuserDetails(deviceId) // Fetches capabilities and initial status
        this.startFocuserPolling(deviceId)
      },

      handleFocuserDisconnected(this: UnifiedStoreType, deviceId: string): void {
        log.debug({ deviceId }, `[FocuserStore] Focuser ${deviceId} disconnected. Stopping poll and clearing state.`)
        this.stopFocuserPolling(deviceId)
        // Clear device-specific data from module state
        // if (this.focuserTargetPositions) this.focuserTargetPositions.delete(deviceId);

        // Reset properties on the main device object
        const clearedProps: FocuserDeviceProperties = {
          focuser_position: null,
          focuser_isMoving: null,
          focuser_temperature: null,
          focuser_stepSize: null,
          focuser_maxStep: null,
          focuser_maxIncrement: null,
          focuser_tempComp: null
        }
        this.updateDeviceProperties(deviceId, clearedProps)
      }
    }
  }
}

// Type for the Focuser store module to be merged into UnifiedStoreType
export type FocuserStore = {
  actions: IFocuserActions
}
