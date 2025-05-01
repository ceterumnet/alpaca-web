// Status: Good - Core Module
// This is the event system module that:
// - Implements event handling system
// - Handles event propagation
// - Provides event utilities
// - Supports event subscription
// - Maintains event state

/**
 * Event System Module
 *
 * Handles event emission and management for the unified store
 */

import type { DeviceEvent, DeviceEventListener, BatchedEvents } from '../types/device-store.types'

export interface EventSystemState {
  eventListeners: DeviceEventListener[]
  isBatching: boolean
  eventQueue: DeviceEvent[]
  eventHandlers: Record<string, Array<(...args: unknown[]) => void>>
}

export function createEventSystem() {
  return {
    state: (): EventSystemState => ({
      eventListeners: [],
      isBatching: false,
      eventQueue: [],
      eventHandlers: {}
    }),

    actions: {
      addEventListener(
        this: EventSystemState & { _emitEvent: (event: DeviceEvent) => void },
        listener: DeviceEventListener
      ): void {
        this.eventListeners.push(listener)
      },

      removeEventListener(this: EventSystemState, listener: DeviceEventListener): void {
        const index = this.eventListeners.indexOf(listener)
        if (index !== -1) {
          this.eventListeners.splice(index, 1)
        }
      },

      _emitEvent(this: EventSystemState, event: DeviceEvent): void {
        if (this.isBatching) {
          // Queue the event if in batching mode
          this.eventQueue.push(event)
        } else {
          // Otherwise emit immediately
          this.eventListeners.forEach((listener) => listener(event))
        }
      },

      batch(this: EventSystemState & { _emitEvent: (event: DeviceEvent) => void }): BatchedEvents {
        return {
          start: () => {
            this.isBatching = true
            this.eventQueue = []
          },
          end: () => {
            const events = [...this.eventQueue] // Create a copy to avoid modification during iteration
            this.isBatching = false
            this.eventQueue = []

            // Process all queued events at once
            if (events.length > 0) {
              this.eventListeners.forEach((listener) => {
                events.forEach((event) => listener(event))
              })
            }
          },
          queue: (event: DeviceEvent) => {
            if (this.isBatching) {
              this.eventQueue.push(event)
            } else {
              // If not in batching mode, emit immediately
              this._emitEvent(event)
            }
          }
        }
      },

      // Legacy event emitter compatibility methods
      on(this: EventSystemState, event: string, listener: (...args: unknown[]) => void): void {
        if (!this.eventHandlers[event]) {
          this.eventHandlers[event] = []
        }
        this.eventHandlers[event].push(listener)
      },

      off(this: EventSystemState, event: string, listener: (...args: unknown[]) => void): void {
        if (!this.eventHandlers[event]) return

        const idx = this.eventHandlers[event].indexOf(listener)
        if (idx !== -1) {
          this.eventHandlers[event].splice(idx, 1)
        }
      },

      emit(this: EventSystemState, event: string, ...args: unknown[]): void {
        if (!this.eventHandlers[event]) return

        // Add debug logging for the 'callDeviceMethod' event with 'exposuretime'
        if (event === 'callDeviceMethod' && args.length >= 2 && args[1] === 'exposuretime') {
          console.error('⚠️ DETECTED exposuretime call via emit!')
          console.error('Call details:', {
            event,
            deviceId: args[0],
            method: args[1],
            args: args.slice(2)
          })
          console.error('Stack trace:')
          try {
            throw new Error('Trace for emit exposuretime call')
          } catch (e) {
            console.error(e)
          }
        }

        for (const handler of this.eventHandlers[event]) {
          handler(...args)
        }
      }
    }
  }
}
