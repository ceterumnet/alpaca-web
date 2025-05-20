// Status: Good - Core Module
// This is the discovery actions module that:
// - Implements device discovery protocol
// - Handles network device detection
// - Provides discovery utilities
// - Supports auto-discovery features
// - Maintains discovery state

/**
 * Device Discovery Actions Module
 *
 * Provides functionality for discovering and auto-configuring devices
 */

import type { StoreOptions, DeviceEvent } from '@/stores/types/device-store.types'

export interface DiscoveryState {
  isDiscovering: boolean
  discoveryTimeout: ReturnType<typeof setTimeout> | null
}

export function createDiscoveryActions() {
  return {
    state: (): DiscoveryState => ({
      isDiscovering: false,
      discoveryTimeout: null
    }),

    actions: {
      startDiscovery(this: DiscoveryState & { _emitEvent: (event: DeviceEvent) => void }, options: StoreOptions = {}): boolean {
        if (this.isDiscovering) {
          console.warn('Discovery already in progress')
          return false
        }

        console.log('Starting device discovery')
        this.isDiscovering = true

        // Reset discovery timeout if it exists
        if (this.discoveryTimeout !== null) {
          clearTimeout(this.discoveryTimeout)
          this.discoveryTimeout = null
        }

        if (!options.silent) {
          this._emitEvent({ type: 'discoveryStarted' })
        }

        return true
      },

      stopDiscovery(this: DiscoveryState & { _emitEvent: (event: DeviceEvent) => void }, options: StoreOptions = {}): boolean {
        if (!this.isDiscovering) {
          console.warn('No discovery in progress')
          return false
        }

        console.log('Stopping device discovery')
        this.isDiscovering = false

        if (this.discoveryTimeout !== null) {
          clearTimeout(this.discoveryTimeout)
          this.discoveryTimeout = null
        }

        if (!options.silent) {
          this._emitEvent({ type: 'discoveryStopped' })
        }

        return true
      }
    }
  }
}
