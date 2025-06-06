import type { UnifiedStoreType } from '../UnifiedStore'
import type { DeviceEvent } from '../types/device-store.types'
import type { CoverCalibratorDevice } from '@/types/device.types' // For reference

export interface ICoverCalibratorActions {
  fetchCoverCalibratorStatus: (deviceId: string) => Promise<void>
  openCover: (deviceId: string) => Promise<void>
  closeCover: (deviceId: string) => Promise<void>
  haltCover: (deviceId: string) => Promise<void>
  calibratorOn: (deviceId: string, brightness: number) => Promise<void>
  calibratorOff: (deviceId: string) => Promise<void>
}

export function createCoverCalibratorActions(): {
  actions: ICoverCalibratorActions
} {
  const actions: ICoverCalibratorActions = {
    async fetchCoverCalibratorStatus(this: UnifiedStoreType, deviceId: string) {
      const client = this.getDeviceClient(deviceId) as import('@/api/alpaca/covercalibrator-client').CoverCalibratorClient | null
      if (!client) {
        const errorMsg = `[CoverCalibratorActions] No client for device ${deviceId}`
        console.error(errorMsg)
        this._emitEvent({
          type: 'deviceApiError',
          deviceId,
          action: 'fetchCoverCalibratorStatus',
          error: new Error('No client found')
        } as DeviceEvent)
        return
      }

      const device = this.getDeviceById(deviceId) as CoverCalibratorDevice | null
      if (!device || !device.isConnected) return

      try {
        // Fetch all properties using the client's helper method
        const status = await client.getCoverCalibratorState()

        const newStatus: Partial<CoverCalibratorDevice> = {
          coverState: status.coverstate as number | undefined,
          calibratorState: status.calibratorstate as number | undefined,
          maxBrightness: status.maxbrightness as number | undefined,
          brightness: status.brightness as number | undefined,
          calibratorChanging: status.calibratorchanging as boolean | undefined,
          coverMoving: status.covermoving as boolean | undefined
        }

        this.updateDevice(deviceId, newStatus)
        this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'coverCalibratorStatus', value: newStatus } as DeviceEvent)
      } catch (error: unknown) {
        const errorMsg = `[CoverCalibratorActions] Error fetching status for ${deviceId}: ${error}`
        console.error(errorMsg, error)
        this._emitEvent({ type: 'deviceApiError', deviceId, action: 'fetchCoverCalibratorStatus', error: error as Error } as DeviceEvent)
      }
    },

    async openCover(this: UnifiedStoreType, deviceId: string) {
      const client = this.getDeviceClient(deviceId)
      if (!client) {
        this._emitEvent({ type: 'deviceApiError', deviceId, action: 'openCover', error: new Error('No client found') } as DeviceEvent)
        return
      }
      try {
        await client.put('opencover', {})
        this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'openCover', args: [], result: 'success' } as DeviceEvent)
        await this.fetchCoverCalibratorStatus(deviceId) // Refresh status
      } catch (error: unknown) {
        this._emitEvent({ type: 'deviceApiError', deviceId, action: 'openCover', error: error as Error } as DeviceEvent)
      }
    },

    async closeCover(this: UnifiedStoreType, deviceId: string) {
      const client = this.getDeviceClient(deviceId)
      if (!client) {
        this._emitEvent({ type: 'deviceApiError', deviceId, action: 'closeCover', error: new Error('No client found') } as DeviceEvent)
        return
      }
      try {
        await client.put('closecover', {})
        this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'closeCover', args: [], result: 'success' } as DeviceEvent)
        await this.fetchCoverCalibratorStatus(deviceId)
      } catch (error: unknown) {
        this._emitEvent({ type: 'deviceApiError', deviceId, action: 'closeCover', error: error as Error } as DeviceEvent)
      }
    },

    async haltCover(this: UnifiedStoreType, deviceId: string) {
      const client = this.getDeviceClient(deviceId)
      if (!client) {
        this._emitEvent({ type: 'deviceApiError', deviceId, action: 'haltCover', error: new Error('No client found') } as DeviceEvent)
        return
      }
      try {
        await client.put('haltcover', {})
        this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'haltCover', args: [], result: 'success' } as DeviceEvent)
        await this.fetchCoverCalibratorStatus(deviceId)
      } catch (error: unknown) {
        this._emitEvent({ type: 'deviceApiError', deviceId, action: 'haltCover', error: error as Error } as DeviceEvent)
      }
    },

    async calibratorOn(this: UnifiedStoreType, deviceId: string, brightness: number) {
      const client = this.getDeviceClient(deviceId)
      if (!client) {
        this._emitEvent({
          type: 'deviceApiError',
          deviceId,
          action: 'calibratorOn',
          error: new Error('No client found'),
          params: { brightness }
        } as DeviceEvent)
        return
      }
      try {
        // Alpaca method `calibratoron` takes `Brightness` (capital B) parameter
        await client.put('calibratoron', { Brightness: brightness })
        this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'calibratorOn', args: [brightness], result: 'success' } as DeviceEvent)
        await this.fetchCoverCalibratorStatus(deviceId)
      } catch (error: unknown) {
        this._emitEvent({ type: 'deviceApiError', deviceId, action: 'calibratorOn', error: error as Error, params: { brightness } } as DeviceEvent)
      }
    },

    async calibratorOff(this: UnifiedStoreType, deviceId: string) {
      const client = this.getDeviceClient(deviceId)
      if (!client) {
        this._emitEvent({ type: 'deviceApiError', deviceId, action: 'calibratorOff', error: new Error('No client found') } as DeviceEvent)
        return
      }
      try {
        await client.put('calibratoroff', {})
        this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'calibratorOff', args: [], result: 'success' } as DeviceEvent)
        await this.fetchCoverCalibratorStatus(deviceId)
      } catch (error: unknown) {
        this._emitEvent({ type: 'deviceApiError', deviceId, action: 'calibratorOff', error: error as Error } as DeviceEvent)
      }
    }
  }

  return {
    actions
  }
}

// Type for the CoverCalibrator store module to be merged into UnifiedStoreType
export type CoverCalibratorStore = {
  actions: ICoverCalibratorActions
}
