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

import log from '@/plugins/logger'
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
          log.warn('Discovery already in progress')
          return false
        }

        log.debug('Starting device discovery')
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
          log.warn('No discovery in progress')
          return false
        }

        log.debug('Stopping device discovery')
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
