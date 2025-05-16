// Status: Good - Core Component
// This is the core store implementation that:
// - Combines modular functionality for different device types
// - Provides a clean, maintainable architecture
// - Integrates with the event system
// - Manages device state and actions
// - Supports both real and simulated devices

/**
 * Unified Store
 *
 * A modern, type-safe store implementation for managing devices.
 * This store combines modular functionality for different device types
 * with a clean, maintainable architecture.
 */

import { defineStore } from 'pinia'
import type { Device } from './types/device-store.types'

// Import module creators
import { createCoreActions } from './modules/coreActions'
import { createEventSystem } from './modules/eventSystem'
import { createSimulationActions } from './modules/simulationActions'
import { createDiscoveryActions } from './modules/discoveryActions'
import { createCameraActions } from './modules/cameraActions'
import { createTelescopeActions } from './modules/telescopeActions'
import { createFilterWheelActions } from './modules/filterWheelActions'
import { createDomeActions } from './modules/domeActions'
import { createObservingConditionsActions } from './modules/observingConditionsActions'
import { createSwitchActions } from './modules/switchActions'

// Re-export type for convenience
export type { Device }

// Define store using Pinia
export const useUnifiedStore = defineStore('unifiedStore', {
  state: () => {
    // Combine state from all modules
    return {
      ...createCoreActions().state(),
      ...createEventSystem().state(),
      ...createSimulationActions().state(),
      ...createDiscoveryActions().state(),
      ...createCameraActions().state(),
      ...createTelescopeActions().state(),
      ...createFilterWheelActions().state(),
      ...createDomeActions().state(),
      ...createObservingConditionsActions().state(),
      ...createSwitchActions().state()
    }
  },

  getters: {
    devicesList: (state) => state.devicesArray,
    connectedDevices: (state) => state.devicesArray.filter((device) => device.isConnected),
    selectedDevice: (state) => (state.selectedDeviceId ? state.devices.get(state.selectedDeviceId) || null : null)
  },

  actions: {
    // Import all actions from modules
    ...createCoreActions().actions,
    ...createEventSystem().actions,
    ...createSimulationActions().actions,
    ...createDiscoveryActions().actions,
    ...createCameraActions().actions,
    ...createTelescopeActions().actions,
    ...createFilterWheelActions().actions,
    ...createDomeActions().actions,
    ...createObservingConditionsActions().actions,
    ...createSwitchActions().actions
  }
})

// Export the store type
export type UnifiedStoreType = ReturnType<typeof useUnifiedStore>

// Export the store creator function
export default useUnifiedStore
