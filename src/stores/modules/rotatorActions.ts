import type { UnifiedStoreType } from '../UnifiedStore'
import type { DeviceEvent } from '../types/device-store.types' // Added for _emitEvent
// import type { RotatorDevice } from '@/types/device.types' // Commented out for now, may be needed later

// Define state for each rotator device
export interface RotatorState {
  position: number | null
  mechanicalPosition: number | null
  isMoving: boolean | null
  reverse: boolean | null
  canReverse: boolean | null
  targetPosition: number | null // Corresponds to targetPositionDisplay in the panel
}

// Overall state structure for the rotator module
export interface RotatorModuleState {
  rotatorData: Map<string, RotatorState>
}

// Define signatures for rotator actions
export interface IRotatorActions {
  // Fetches and updates the status of a rotator
  fetchRotatorStatus: (deviceId: string) => Promise<void>
  // Fetches capabilities of a rotator
  fetchRotatorCapabilities: (deviceId: string) => Promise<void>
  // Moves the rotator to an absolute position
  moveAbsolute: (deviceId: string, position: number) => Promise<void>
  // Moves the rotator by a relative amount
  moveRelative: (deviceId: string, offset: number) => Promise<void>
  // Halts any rotator movement
  haltRotator: (deviceId: string) => Promise<void>
  // Syncs the rotator to a specified position
  syncToPosition: (deviceId: string, position: number) => Promise<void>
  // Sets the reverse state of the rotator
  setRotatorReverse: (deviceId: string, reverse: boolean) => Promise<void>
  // Initializes rotator state for a new device or on disconnect
  initializeRotatorState: (deviceId: string) => void
  // Clears rotator state
  clearRotatorState: (deviceId: string) => void
}

export function createRotatorActions(): {
  state: () => RotatorModuleState
  actions: IRotatorActions
} {
  const state = (): RotatorModuleState => ({
    rotatorData: new Map<string, RotatorState>()
  })

  const actions: IRotatorActions = {
    initializeRotatorState(this: UnifiedStoreType, deviceId: string) {
      if (!this.rotatorData.has(deviceId)) {
        this.rotatorData.set(deviceId, {
          position: null,
          mechanicalPosition: null,
          isMoving: null,
          reverse: null,
          canReverse: null, // Must be present
          targetPosition: null
        })
      }
    },

    clearRotatorState(this: UnifiedStoreType, deviceId: string) {
      if (this.rotatorData.has(deviceId)) {
        this.rotatorData.set(deviceId, {
          position: null,
          mechanicalPosition: null,
          isMoving: null,
          reverse: null,
          canReverse: null, // Corrected: Set to null to satisfy RotatorState
          targetPosition: null
        })
      }
    },

    async fetchRotatorCapabilities(this: UnifiedStoreType, deviceId: string) {
      this.initializeRotatorState(deviceId)
      const client = this.getDeviceClient(deviceId)
      if (!client) {
        const errorMsg = `[RotatorActions] No client for device ${deviceId}`
        console.error(errorMsg)
        this._emitEvent({ type: 'deviceApiError', deviceId, action: 'fetchRotatorCapabilities', error: new Error('No client found') } as DeviceEvent)
        return
      }

      try {
        const canReverse = (await client.get('canreverse')) as boolean
        // Update local module state
        this.$patch((state) => {
          const data = state.rotatorData.get(deviceId)
          if (data) data.canReverse = canReverse
        })
        // Also update the main device object if this capability is stored there (optional, depends on design)
        // this.updateDevice(deviceId, { capabilities: { ...this.getDeviceById(deviceId)?.capabilities, canReverse } });
        this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'rotatorCapabilities', value: { canReverse } } as DeviceEvent)
      } catch (error: unknown) {
        const errorMsg = `[RotatorActions] Error fetching capabilities for ${deviceId}: ${error}`
        console.error(errorMsg, error)
        this._emitEvent({ type: 'deviceApiError', deviceId, action: 'fetchRotatorCapabilities', error: error as Error } as DeviceEvent)
      }
    },

    async fetchRotatorStatus(this: UnifiedStoreType, deviceId: string) {
      this.initializeRotatorState(deviceId)
      const client = this.getDeviceClient(deviceId)
      if (!client) {
        const errorMsg = `[RotatorActions] No client for device ${deviceId}`
        console.error(errorMsg)
        this._emitEvent({ type: 'deviceApiError', deviceId, action: 'fetchRotatorStatus', error: new Error('No client found') } as DeviceEvent)
        return
      }

      const device = this.getDeviceById(deviceId)
      if (!device || !device.isConnected) return

      try {
        const position = (await client.get('position')) as number
        const mechanicalposition = (await client.get('mechanicalposition')) as number
        const ismoving = (await client.get('ismoving')) as boolean
        const reverseVal = (await client.get('reverse')) as boolean // Renamed to avoid conflict with reverse keyword
        const targetposition = (await client.get('targetposition')) as number

        const newStatus = {
          position: typeof position === 'number' ? position : null,
          mechanicalPosition: typeof mechanicalposition === 'number' ? mechanicalposition : null,
          isMoving: typeof ismoving === 'boolean' ? ismoving : null,
          reverse: typeof reverseVal === 'boolean' ? reverseVal : null,
          targetPosition: typeof targetposition === 'number' ? targetposition : null
        }

        this.$patch((state) => {
          const data = state.rotatorData.get(deviceId)
          if (data) {
            Object.assign(data, newStatus)
          }
        })
        this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'rotatorStatus', value: newStatus } as DeviceEvent)
      } catch (error: unknown) {
        const errorMsg = `[RotatorActions] Error fetching status for ${deviceId}: ${error}`
        console.error(errorMsg, error)
        this._emitEvent({ type: 'deviceApiError', deviceId, action: 'fetchRotatorStatus', error: error as Error } as DeviceEvent)
      }
    },

    async moveAbsolute(this: UnifiedStoreType, deviceId: string, position: number) {
      const client = this.getDeviceClient(deviceId)
      if (!client) {
        const errorMsg = `[RotatorActions] No client for device ${deviceId}`
        console.error(errorMsg)
        this._emitEvent({
          type: 'deviceApiError',
          deviceId,
          action: 'moveAbsolute',
          error: new Error('No client found'),
          params: { position }
        } as DeviceEvent)
        return
      }
      try {
        await client.put('moveabsolute', { Position: position })
        this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'moveAbsolute', args: [position], result: 'success' } as DeviceEvent)
        await this.fetchRotatorStatus(deviceId) // Refresh status after action
      } catch (error: unknown) {
        const errorMsg = `[RotatorActions] Error moving absolute for ${deviceId}: ${error}`
        console.error(errorMsg, error)
        this._emitEvent({ type: 'deviceApiError', deviceId, action: 'moveAbsolute', error: error as Error, params: { position } } as DeviceEvent)
      }
    },

    async moveRelative(this: UnifiedStoreType, deviceId: string, offset: number) {
      const client = this.getDeviceClient(deviceId)
      if (!client) {
        const errorMsg = `[RotatorActions] No client for device ${deviceId}`
        console.error(errorMsg)
        this._emitEvent({
          type: 'deviceApiError',
          deviceId,
          action: 'moveRelative',
          error: new Error('No client found'),
          params: { offset }
        } as DeviceEvent)
        return
      }
      try {
        await client.put('move', { Position: offset })
        this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'moveRelative', args: [offset], result: 'success' } as DeviceEvent)
        await this.fetchRotatorStatus(deviceId)
      } catch (error: unknown) {
        const errorMsg = `[RotatorActions] Error moving relative for ${deviceId}: ${error}`
        console.error(errorMsg, error)
        this._emitEvent({ type: 'deviceApiError', deviceId, action: 'moveRelative', error: error as Error, params: { offset } } as DeviceEvent)
      }
    },

    async haltRotator(this: UnifiedStoreType, deviceId: string) {
      const client = this.getDeviceClient(deviceId)
      if (!client) {
        const errorMsg = `[RotatorActions] No client for device ${deviceId}`
        console.error(errorMsg)
        this._emitEvent({ type: 'deviceApiError', deviceId, action: 'haltRotator', error: new Error('No client found') } as DeviceEvent)
        return
      }
      try {
        await client.put('halt')
        this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'haltRotator', args: [], result: 'success' } as DeviceEvent)
        await this.fetchRotatorStatus(deviceId)
      } catch (error: unknown) {
        const errorMsg = `[RotatorActions] Error halting rotator ${deviceId}: ${error}`
        console.error(errorMsg, error)
        this._emitEvent({ type: 'deviceApiError', deviceId, action: 'haltRotator', error: error as Error } as DeviceEvent)
      }
    },

    async syncToPosition(this: UnifiedStoreType, deviceId: string, position: number) {
      const client = this.getDeviceClient(deviceId)
      if (!client) {
        const errorMsg = `[RotatorActions] No client for device ${deviceId}`
        console.error(errorMsg)
        this._emitEvent({
          type: 'deviceApiError',
          deviceId,
          action: 'syncToPosition',
          error: new Error('No client found'),
          params: { position }
        } as DeviceEvent)
        return
      }
      try {
        await client.put('sync', { Position: position })
        this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'syncToPosition', args: [position], result: 'success' } as DeviceEvent)
        await this.fetchRotatorStatus(deviceId)
      } catch (error: unknown) {
        const errorMsg = `[RotatorActions] Error syncing rotator ${deviceId}: ${error}`
        console.error(errorMsg, error)
        this._emitEvent({ type: 'deviceApiError', deviceId, action: 'syncToPosition', error: error as Error, params: { position } } as DeviceEvent)
      }
    },

    async setRotatorReverse(this: UnifiedStoreType, deviceId: string, reverse: boolean) {
      const client = this.getDeviceClient(deviceId)
      if (!client) {
        const errorMsg = `[RotatorActions] No client for device ${deviceId}`
        console.error(errorMsg)
        this._emitEvent({
          type: 'deviceApiError',
          deviceId,
          action: 'setRotatorReverse',
          error: new Error('No client found'),
          params: { reverse }
        } as DeviceEvent)
        return
      }
      try {
        await client.put('reverse', { Reverse: reverse })
        // Update local module state optimistic or after fetch
        this.$patch((state) => {
          const data = state.rotatorData.get(deviceId)
          if (data) data.reverse = reverse
        })
        this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'setRotatorReverse', args: [reverse], result: 'success' } as DeviceEvent)
        await this.fetchRotatorStatus(deviceId) // Refresh status to confirm change and get other potentially changed values
      } catch (error: unknown) {
        const errorMsg = `[RotatorActions] Error setting reverse for ${deviceId}: ${error}`
        console.error(errorMsg, error)
        this._emitEvent({ type: 'deviceApiError', deviceId, action: 'setRotatorReverse', error: error as Error, params: { reverse } } as DeviceEvent)
        await this.fetchRotatorStatus(deviceId) // Ensure state consistency after error
      }
    }
  }

  return {
    state,
    actions
  }
}

// Type for the Rotator store module to be merged into UnifiedStoreType
export type RotatorStore = {
  state: RotatorModuleState
  actions: IRotatorActions
}
