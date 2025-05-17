import type { UnifiedStoreType } from '../UnifiedStore'
import type { DeviceEvent } from '../types/device-store.types'
// import type { CoverCalibratorDevice } from '@/types/device.types' // For reference

// Define state for each CoverCalibrator device
export interface CoverCalibratorState {
  coverState: number | null // 0=Unknown, 1=NotPresent, 2=Closed, 3=Moving, 4=Open, 5=Error
  calibratorState: number | null // 0=Unknown, 1=Off, 2=NotReady, 3=Ready, 4=Error
  currentBrightness: number | null
  maxBrightness: number | null
}

// Overall state structure for the CoverCalibrator module
export interface CoverCalibratorModuleState {
  coverCalibratorData: Map<string, CoverCalibratorState>
}

// Define signatures for CoverCalibrator actions
export interface ICoverCalibratorActions {
  fetchCoverCalibratorStatus: (deviceId: string) => Promise<void>
  openCover: (deviceId: string) => Promise<void>
  closeCover: (deviceId: string) => Promise<void>
  haltCover: (deviceId: string) => Promise<void>
  calibratorOn: (deviceId: string, brightness: number) => Promise<void>
  calibratorOff: (deviceId: string) => Promise<void>
  initializeCoverCalibratorState: (deviceId: string) => void
  clearCoverCalibratorState: (deviceId: string) => void
}

export function createCoverCalibratorActions(): {
  state: () => CoverCalibratorModuleState
  actions: ICoverCalibratorActions
} {
  const state = (): CoverCalibratorModuleState => ({
    coverCalibratorData: new Map<string, CoverCalibratorState>()
  })

  const actions: ICoverCalibratorActions = {
    initializeCoverCalibratorState(this: UnifiedStoreType, deviceId: string) {
      if (!this.coverCalibratorData.has(deviceId)) {
        this.coverCalibratorData.set(deviceId, {
          coverState: null,
          calibratorState: null,
          currentBrightness: null,
          maxBrightness: null
        })
      }
    },

    clearCoverCalibratorState(this: UnifiedStoreType, deviceId: string) {
      if (this.coverCalibratorData.has(deviceId)) {
        this.coverCalibratorData.set(deviceId, {
          coverState: null,
          calibratorState: null,
          currentBrightness: null,
          maxBrightness: null // Capabilities like maxBrightness might be better to persist or re-fetch on connect
        })
      }
    },

    async fetchCoverCalibratorStatus(this: UnifiedStoreType, deviceId: string) {
      this.initializeCoverCalibratorState(deviceId)
      const client = this.getDeviceClient(deviceId)
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

      const device = this.getDeviceById(deviceId)
      if (!device || !device.isConnected) return

      try {
        // Fetch multiple properties. Alpaca standard names are lowercase.
        const coverstate = (await client.get('coverstate')) as number
        const calibratorstate = (await client.get('calibratorstate')) as number
        const maxbrightness = (await client.get('maxbrightness')) as number
        let brightness: number | null = null
        if (maxbrightness > 0) {
          // Only fetch brightness if calibrator can be lit
          brightness = (await client.get('brightness')) as number
        }

        const newStatus: CoverCalibratorState = {
          coverState: typeof coverstate === 'number' ? coverstate : null,
          calibratorState: typeof calibratorstate === 'number' ? calibratorstate : null,
          maxBrightness: typeof maxbrightness === 'number' ? maxbrightness : null,
          currentBrightness: typeof brightness === 'number' ? brightness : null
        }

        this.$patch((state) => {
          const data = state.coverCalibratorData.get(deviceId)
          if (data) {
            Object.assign(data, newStatus)
          }
        })
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
    state,
    actions
  }
}

// Type for the CoverCalibrator store module to be merged into UnifiedStoreType
export type CoverCalibratorStore = {
  state: CoverCalibratorModuleState
  actions: ICoverCalibratorActions
}
