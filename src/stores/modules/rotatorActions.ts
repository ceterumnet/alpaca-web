import type { UnifiedDevice, RotatorDeviceProperties } from '@/types/device.types'
import type { UnifiedStoreType } from '../UnifiedStore' // Needed for `this` context in actions
import { RotatorClient } from '@/api/alpaca/rotator-client'
import { markRaw } from 'vue'
import type { DeviceEvent } from '@/stores/types/device-store.types' // For _emitEvent typing
import type { AlpacaClient } from '@/api/AlpacaClient' // For deviceClients map typing
// Removed: import type { UnifiedStoreType } from '../UnifiedStore'
// No longer directly using Store from pinia here, UnifiedStore will handle integration.

/**
 * Represents the internal state specific to the rotator module itself,
 * not per-device. Per-device state is stored on `UnifiedDevice.properties`.
 */
export interface RotatorModuleState {
  /** Map of deviceId to active polling timer IDs for rotator status. */
  _rt_pollingTimers: Map<string, ReturnType<typeof setTimeout>>
}

/** Initial state for the rotator module. */
export const initialRotatorModuleState: RotatorModuleState = {
  _rt_pollingTimers: new Map()
}

/** Defines the signatures for actions related to rotator devices. */
export interface RotatorActions {
  /** Initializes the rotator-specific properties for a device. */
  initializeRotatorState: (this: UnifiedStoreType, deviceId: string) => void
  /** Clears rotator-specific properties and stops polling for a device. */
  clearRotatorState: (this: UnifiedStoreType, deviceId: string) => void
  /** Stops the status polling for a rotator device. */
  stopRotatorPolling: (this: UnifiedStoreType, deviceId: string) => void

  /** Gets a RotatorClient instance for the given device ID. */
  _getRotatorClient: (this: UnifiedStoreType, deviceId: string) => RotatorClient | null

  // Alpaca Action Wrappers
  fetchRotatorCapabilities: (this: UnifiedStoreType, deviceId: string) => Promise<void>
  fetchRotatorStatus: (this: UnifiedStoreType, deviceId: string) => Promise<void>
  moveAbsolute: (this: UnifiedStoreType, deviceId: string, position: number) => Promise<void>
  moveRelative: (this: UnifiedStoreType, deviceId: string, offset: number) => Promise<void>
  haltRotator: (this: UnifiedStoreType, deviceId: string) => Promise<void>
  syncToPosition: (this: UnifiedStoreType, deviceId: string, position: number) => Promise<void>
  setRotatorReverse: (this: UnifiedStoreType, deviceId: string, reverse: boolean) => Promise<void>
  /** @internal polls rotator status - designed to be called by setInterval */
  _pollRotatorStatus: (this: UnifiedStoreType, deviceId: string) => void
  /** Starts periodic polling of rotator status. */
  startRotatorPolling: (this: UnifiedStoreType, deviceId: string, intervalMs?: number) => void
  /** Handles actions to take when a rotator device connects. */
  handleRotatorConnected: (this: UnifiedStoreType, deviceId: string) => void
}

/**
 * Creates rotator-specific actions that interact with the UnifiedStore.
 * @param store The Pinia store instance.
 * @returns An object containing rotator actions.
 */
export function createRotatorActions(): {
  state: () => RotatorModuleState
  actions: RotatorActions
} {
  const actions: RotatorActions = {
    _getRotatorClient(this: UnifiedStoreType, deviceId: string): RotatorClient | null {
      const device = this.getDeviceById(deviceId)
      if (!device || device.type !== 'rotator') {
        console.error('[RotatorActions._getRotatorClient] Device not found or not a rotator:', deviceId)
        return null
      }

      // Try to get an existing client from the main store's deviceClients map
      // This assumes coreActions.getDeviceClient can return a typed client or a generic AlpacaClient
      const client = this.getDeviceClient?.(deviceId) as AlpacaClient | undefined | null

      if (client instanceof RotatorClient) {
        return client
      }
      // If not a RotatorClient or not found, try to create a new one
      // This part assumes createDeviceClient from coreActions might also create/return it,
      // or we create it directly here if apiBaseUrl is present.
      // The UnifiedStoreType should ideally expose `this.deviceClients` (Map<string, AlpacaClient>)
      // and a robust `this.createDeviceClient` from coreActions.

      // Check if a client (even if generic) exists in the shared map, and if it is usable or needs replacement
      const existingClientInMap = this.deviceClients?.get(deviceId)
      if (existingClientInMap instanceof RotatorClient) {
        return existingClientInMap
      }

      if (device.apiBaseUrl) {
        try {
          // Ensure device.deviceNumber is correctly typed for the constructor
          const deviceNum = typeof device.deviceNumber === 'number' ? device.deviceNumber : 0
          const newClient = new RotatorClient(device.apiBaseUrl, deviceNum, device)
          // Add to the shared deviceClients map in the store if `this.deviceClients` is accessible and of the correct type
          if (this.deviceClients && typeof this.deviceClients.set === 'function') {
            this.deviceClients.set(deviceId, markRaw(newClient))
          }
          return newClient
        } catch (error) {
          console.error('[RotatorActions._getRotatorClient] Error creating RotatorClient:', error)
          this._emitEvent({
            type: 'deviceApiError',
            deviceId,
            // action: '_getRotatorClient', // Removed: 'action' is not a property of deviceApiError event
            error: `Failed to create RotatorClient: ${error instanceof Error ? error.message : String(error)}`
          })
          return null
        }
      }

      console.error('[RotatorActions._getRotatorClient] Could not get or create RotatorClient for device:', deviceId)
      this._emitEvent({ type: 'deviceApiError', deviceId, error: 'Could not get or create RotatorClient' })
      return null
    },

    initializeRotatorState(this: UnifiedStoreType, deviceId: string): void {
      const device = this.getDeviceById(deviceId)
      if (!device || device.type !== 'rotator') {
        // console.debug(`[RotatorActions] Device ${deviceId} not found or not a rotator. Skipping initialization.`)
        return
      }

      const initialProps: Partial<RotatorDeviceProperties> = {
        canreverse: undefined,
        ismoving: undefined,
        mechanicalposition: undefined,
        position: undefined,
        reverse: undefined,
        stepsize: undefined,
        targetposition: undefined,
        _rt_isPollingStatus: false // Internal flag for UI/polling logic
      }
      this.updateDeviceProperties(deviceId, initialProps)

      // Ensure any pre-existing timer for this deviceId is cleared from the module's state map
      // This uses store._rt_pollingTimers directly, assuming it's part of UnifiedStoreState
      if (this._rt_pollingTimers && this._rt_pollingTimers.has(deviceId)) {
        const timerId = this._rt_pollingTimers.get(deviceId)
        if (timerId) clearInterval(timerId)
        this._rt_pollingTimers.delete(deviceId)
      }
    },

    clearRotatorState(this: UnifiedStoreType, deviceId: string): void {
      const device = this.getDeviceById(deviceId)
      if (!device || device.type !== 'rotator') {
        // console.debug(`[RotatorActions] Device ${deviceId} not found or not a rotator. Skipping clear.`)
        return
      }

      this.stopRotatorPolling(deviceId) // Centralized place to stop polling and clear timers

      const clearedProps: Partial<RotatorDeviceProperties> = {
        canreverse: undefined,
        ismoving: undefined,
        mechanicalposition: undefined,
        position: undefined,
        reverse: undefined,
        stepsize: undefined,
        targetposition: undefined,
        _rt_isPollingStatus: undefined // Explicitly clear the internal polling flag
      }
      this.updateDeviceProperties(deviceId, clearedProps)
    },

    stopRotatorPolling(this: UnifiedStoreType, deviceId: string): void {
      const device = this.getDeviceById(deviceId) // Check if device exists for context

      // Clear timer from the module's state map
      if (this._rt_pollingTimers && this._rt_pollingTimers.has(deviceId)) {
        const timerId = this._rt_pollingTimers.get(deviceId)
        if (timerId) clearInterval(timerId)
        this._rt_pollingTimers.delete(deviceId)
        // console.debug(`[RotatorActions] Stopped status polling timer for ${deviceId}`)
      }

      // Update the polling status property on the device itself if it exists and is a rotator
      if (device && device.type === 'rotator') {
        this.updateDeviceProperties(deviceId, { _rt_isPollingStatus: false })
      }
    },

    async fetchRotatorCapabilities(this: UnifiedStoreType, deviceId: string): Promise<void> {
      const device = this.getDeviceById(deviceId)
      if (!device || device.type !== 'rotator') {
        console.debug('[RotatorActions.fetchRotatorCapabilities] Device not found or not a rotator:', deviceId)
        return
      }

      const client = this._getRotatorClient(deviceId)
      if (!client) {
        this._emitEvent({
          type: 'deviceApiError',
          deviceId,
          // action: 'fetchRotatorCapabilities', // Removed
          error: 'Rotator client not available'
        })
        return
      }

      try {
        // Use client.get('propertyname') for Alpaca GET requests
        const canReverse = (await client.get('canreverse')) as boolean | undefined

        this.updateDeviceProperties(deviceId, {
          canreverse: canReverse
        })
        // No specific event for "capabilities fetched", changes are emitted by updateDeviceProperties
      } catch (error) {
        console.error('[RotatorActions.fetchRotatorCapabilities] Error fetching capabilities:', error)
        this._emitEvent({
          type: 'deviceApiError',
          deviceId,
          // action: 'fetchRotatorCapabilities', // Removed
          error: `Failed to fetch rotator capabilities: ${error instanceof Error ? error.message : String(error)}`
        })
      }
    },

    async fetchRotatorStatus(this: UnifiedStoreType, deviceId: string): Promise<void> {
      const device = this.getDeviceById(deviceId)
      if (!device || device.type !== 'rotator') {
        console.debug('[RotatorActions.fetchRotatorStatus] Device not found or not a rotator:', deviceId)
        return
      }

      const client = this._getRotatorClient(deviceId)
      if (!client) {
        this._emitEvent({
          type: 'deviceApiError',
          deviceId,
          error: 'Rotator client not available for fetchRotatorStatus'
        })
        return
      }

      try {
        // Fetch all relevant status properties
        // Note: Alpaca standard properties are lowercase
        const propsToFetch = ['position', 'ismoving', 'mechanicalposition', 'reverse', 'targetposition']
        const fetchedValues: Record<string, unknown> = {}
        for (const prop of propsToFetch) {
          fetchedValues[prop] = await client.get(prop)
        }

        const position = typeof fetchedValues.position === 'number' ? fetchedValues.position : undefined
        const ismoving = typeof fetchedValues.ismoving === 'boolean' ? (fetchedValues.ismoving as boolean) : undefined
        const mechanicalposition = typeof fetchedValues.mechanicalposition === 'number' ? fetchedValues.mechanicalposition : undefined
        const reverse = typeof fetchedValues.reverse === 'boolean' ? (fetchedValues.reverse as boolean) : undefined
        const targetposition = typeof fetchedValues.targetposition === 'number' ? fetchedValues.targetposition : undefined

        const currentRotatorProps = device.properties as RotatorDeviceProperties

        const newProperties: Partial<RotatorDeviceProperties> = {
          position,
          ismoving,
          mechanicalposition,
          reverse,
          targetposition,
          _rt_isPollingStatus: currentRotatorProps._rt_isPollingStatus ?? false // Preserve polling status
        }

        this.updateDeviceProperties(deviceId, newProperties)
      } catch (error) {
        console.error('[RotatorActions.fetchRotatorStatus] Error fetching status:', error)
        this._emitEvent({
          type: 'deviceApiError',
          deviceId,
          error: `Failed to fetch rotator status: ${error instanceof Error ? error.message : String(error)}`
        })
      }
    },

    async moveAbsolute(this: UnifiedStoreType, deviceId: string, position: number): Promise<void> {
      const device = this.getDeviceById(deviceId)
      if (!device || device.type !== 'rotator') {
        console.debug('[RotatorActions.moveAbsolute] Device not found or not a rotator:', deviceId)
        this._emitEvent({
          type: 'deviceApiError',
          deviceId,
          error: 'Device not found or not a rotator for moveAbsolute'
        })
        return
      }

      const client = this._getRotatorClient(deviceId)
      if (!client) {
        this._emitEvent({
          type: 'deviceApiError',
          deviceId,
          error: 'Rotator client not available for moveAbsolute'
        })
        return
      }

      try {
        await client.put('moveabsolute', { Position: position })
        this.updateDeviceProperties(deviceId, {
          targetposition: position,
          ismoving: true
        })
        this._emitEvent({
          type: 'deviceMethodCalled',
          deviceId,
          method: 'moveabsolute',
          args: [{ Position: position }],
          result: 'success'
        })
      } catch (error) {
        console.error('[RotatorActions.moveAbsolute] Error:', error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        this._emitEvent({
          type: 'deviceApiError',
          deviceId,
          error: `Failed to moveAbsolute to ${position}: ${errorMessage}`
        })
        this.updateDeviceProperties(deviceId, { ismoving: false })
      }
    },

    async moveRelative(this: UnifiedStoreType, deviceId: string, offset: number): Promise<void> {
      const device = this.getDeviceById(deviceId)
      if (!device || device.type !== 'rotator') {
        console.debug('[RotatorActions.moveRelative] Device not found or not a rotator:', deviceId)
        this._emitEvent({
          type: 'deviceApiError',
          deviceId,
          error: 'Device not found or not a rotator for moveRelative'
        })
        return
      }

      const client = this._getRotatorClient(deviceId)
      if (!client) {
        this._emitEvent({
          type: 'deviceApiError',
          deviceId,
          error: 'Rotator client not available for moveRelative'
        })
        return
      }

      try {
        // Alpaca command for moverelative is PUT /api/v1/rotator/{device_number}/moverelative
        // Parameters: Offset (float, degrees)
        await client.put('moverelative', { Offset: offset })
        // After successfully initiating a move, update relevant properties
        // ismoving should ideally become true. targetposition is less certain without knowing current position.
        // For now, just set ismoving. A subsequent fetchRotatorStatus or polling will update accurately.
        this.updateDeviceProperties(deviceId, {
          ismoving: true // Optimistically set ismoving
        })
        this._emitEvent({
          type: 'deviceMethodCalled',
          deviceId,
          method: 'moverelative',
          args: [{ Offset: offset }],
          result: 'success'
        })
      } catch (error) {
        console.error('[RotatorActions.moveRelative] Error:', error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        this._emitEvent({
          type: 'deviceApiError',
          deviceId,
          error: `Failed to moveRelative by ${offset}: ${errorMessage}`
        })
        this.updateDeviceProperties(deviceId, { ismoving: false }) // Revert optimistic ismoving
      }
    },

    async haltRotator(this: UnifiedStoreType, deviceId: string): Promise<void> {
      const device = this.getDeviceById(deviceId)
      if (!device || device.type !== 'rotator') {
        console.debug('[RotatorActions.haltRotator] Device not found or not a rotator:', deviceId)
        this._emitEvent({
          type: 'deviceApiError',
          deviceId,
          error: 'Device not found or not a rotator for haltRotator'
        })
        return
      }

      const client = this._getRotatorClient(deviceId)
      if (!client) {
        this._emitEvent({
          type: 'deviceApiError',
          deviceId,
          error: 'Rotator client not available for haltRotator'
        })
        return
      }

      try {
        // Alpaca command for halt is PUT /api/v1/rotator/{device_number}/halt
        // No parameters for halt
        await client.put('halt', {}) // Empty object for no parameters
        // After successfully halting, ismoving should become false.
        this.updateDeviceProperties(deviceId, {
          ismoving: false,
          targetposition: undefined // A halted rotator might not have a defined target
        })
        this._emitEvent({
          type: 'deviceMethodCalled',
          deviceId,
          method: 'halt',
          args: [],
          result: 'success'
        })
      } catch (error) {
        console.error('[RotatorActions.haltRotator] Error:', error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        this._emitEvent({
          type: 'deviceApiError',
          deviceId,
          error: `Failed to halt rotator: ${errorMessage}`
        })
        // No specific property change on halt failure, ismoving might still be true or false depending on prior state.
      }
    },

    async syncToPosition(this: UnifiedStoreType, deviceId: string, position: number): Promise<void> {
      const device = this.getDeviceById(deviceId)
      if (!device || device.type !== 'rotator') {
        console.debug('[RotatorActions.syncToPosition] Device not found or not a rotator:', deviceId)
        this._emitEvent({
          type: 'deviceApiError',
          deviceId,
          error: 'Device not found or not a rotator for syncToPosition'
        })
        return
      }

      const client = this._getRotatorClient(deviceId)
      if (!client) {
        this._emitEvent({
          type: 'deviceApiError',
          deviceId,
          error: 'Rotator client not available for syncToPosition'
        })
        return
      }

      try {
        // Alpaca command for sync is PUT /api/v1/rotator/{device_number}/sync
        // Parameters: Position (float, degrees)
        await client.put('sync', { Position: position })
        // After successfully syncing, update relevant properties
        this.updateDeviceProperties(deviceId, {
          position: position, // The current position is now the synced position
          targetposition: position, // Target is also the current position
          ismoving: false // Syncing implies the rotator is now at this position and not moving
        })
        this._emitEvent({
          type: 'deviceMethodCalled',
          deviceId,
          method: 'sync',
          args: [{ Position: position }],
          result: 'success'
        })
      } catch (error) {
        console.error('[RotatorActions.syncToPosition] Error:', error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        this._emitEvent({
          type: 'deviceApiError',
          deviceId,
          error: `Failed to syncToPosition ${position}: ${errorMessage}`
        })
        // No specific property changes on sync failure, as the state is uncertain.
      }
    },

    async setRotatorReverse(this: UnifiedStoreType, deviceId: string, reverse: boolean): Promise<void> {
      const device = this.getDeviceById(deviceId)
      if (!device || device.type !== 'rotator') {
        console.debug('[RotatorActions.setRotatorReverse] Device not found or not a rotator:', deviceId)
        this._emitEvent({
          type: 'deviceApiError',
          deviceId,
          error: 'Device not found or not a rotator for setRotatorReverse'
        })
        return
      }

      const client = this._getRotatorClient(deviceId)
      if (!client) {
        this._emitEvent({
          type: 'deviceApiError',
          deviceId,
          error: 'Rotator client not available for setRotatorReverse'
        })
        return
      }

      try {
        // Alpaca command for setreverse is PUT /api/v1/rotator/{device_number}/reverse
        // Parameters: Reverse (boolean)
        await client.put('setreverse', { Reverse: reverse })
        // After successfully setting reverse, update the property
        this.updateDeviceProperties(deviceId, {
          reverse: reverse
        })
        this._emitEvent({
          type: 'deviceMethodCalled',
          deviceId,
          method: 'setreverse',
          args: [{ Reverse: reverse }],
          result: 'success'
        })
      } catch (error) {
        console.error('[RotatorActions.setRotatorReverse] Error:', error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        this._emitEvent({
          type: 'deviceApiError',
          deviceId,
          error: `Failed to setRotatorReverse to ${reverse}: ${errorMessage}`
        })
        // No specific property changes on failure, as the state of 'reverse' is now uncertain from the store's perspective.
      }
    },

    _pollRotatorStatus(this: UnifiedStoreType, deviceId: string): void {
      // This is an internal helper, directly calls fetchRotatorStatus
      // It's separated to make the intent clear in setInterval
      // Error handling and client checks are within fetchRotatorStatus
      this.fetchRotatorStatus(deviceId).catch((error) => {
        // Prevent unhandled promise rejection if fetchRotatorStatus itself throws
        // though it's designed to catch its own errors and emit events.
        console.error(`[RotatorActions._pollRotatorStatus] Error during polling for ${deviceId}:`, error)
        // Optionally, emit another event here if needed, but fetchRotatorStatus should cover it.
      })
    },

    startRotatorPolling(this: UnifiedStoreType, deviceId: string, intervalMs?: number): void {
      const device = this.getDeviceById(deviceId)
      if (!device || device.type !== 'rotator') {
        console.debug('[RotatorActions.startRotatorPolling] Device not found or not a rotator:', deviceId)
        return
      }

      // Stop any existing polling for this device first
      this.stopRotatorPolling(deviceId)

      const pollingInterval = intervalMs ?? this._propertyPollingIntervals?.get('rotatorStatus') ?? 1000 // Default to 1s

      // Initial fetch
      this._pollRotatorStatus(deviceId)

      const timerId = setInterval(() => {
        // Check if device still exists and is connected before polling
        const currentDevice = this.getDeviceById(deviceId)
        if (!currentDevice || !currentDevice.isConnected) {
          // console.debug(`[RotatorActions.startRotatorPolling] Device ${deviceId} disconnected or removed. Stopping poll.`);
          this.stopRotatorPolling(deviceId)
          return
        }
        this._pollRotatorStatus(deviceId)
      }, pollingInterval)

      if (!this._rt_pollingTimers) {
        // This case should ideally not happen if initialRotatorModuleState is set up correctly in UnifiedStore
        console.error('[RotatorActions.startRotatorPolling] _rt_pollingTimers map not initialized!')
        this._rt_pollingTimers = new Map()
      }
      this._rt_pollingTimers.set(deviceId, timerId)
      this.updateDeviceProperties(deviceId, { _rt_isPollingStatus: true })
      console.debug(`[RotatorActions] Started status polling for rotator ${deviceId} every ${pollingInterval}ms`)
    },

    handleRotatorConnected(this: UnifiedStoreType, deviceId: string): void {
      const device = this.getDeviceById(deviceId)
      if (!device || device.type !== 'rotator') {
        // console.debug('[RotatorActions.handleRotatorConnected] Device not found or not a rotator:', deviceId);
        return
      }
      // console.debug('[RotatorActions.handleRotatorConnected] Initializing and starting polling for:', deviceId);
      this.initializeRotatorState(deviceId) // Ensure properties are set to defaults
      this.fetchRotatorCapabilities(deviceId)
        .then(() => {
          this.startRotatorPolling(deviceId)
        })
        .catch((error) => {
          console.error(`[RotatorActions.handleRotatorConnected] Error during initial capability fetch for ${deviceId}:`, error)
          // Still attempt to start polling, status fetch might still work or recover
          this.startRotatorPolling(deviceId)
        })
    }
  }

  return {
    state: () => initialRotatorModuleState, // The module defines its piece of the state
    actions
  }
}
