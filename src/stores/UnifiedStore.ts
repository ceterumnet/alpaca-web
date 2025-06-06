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
import { createDiscoveryActions } from './modules/discoveryActions'
import { createCameraActions } from './modules/cameraActions'
import { createTelescopeActions } from './modules/telescopeActions'
import { createFilterWheelActions } from './modules/filterWheelActions'
import { createDomeActions } from './modules/domeActions'
import { createObservingConditionsActions } from './modules/observingConditionsActions'
import { createSwitchActions } from './modules/switchActions'
import { createRotatorActions } from './modules/rotatorActions'
import { createCoverCalibratorActions } from './modules/coverCalibratorActions'
import { createSafetyMonitorActions } from './modules/safetyMonitorActions'
import { createFocuserActions } from './modules/focuserActions'

// Re-export type for convenience
export type { Device }

// Define store using Pinia
export const useUnifiedStore = defineStore('unifiedStore', {
  state: () => {
    return {
      ...createCoreActions().state(),
      ...createEventSystem().state(),
      ...createDiscoveryActions().state()
    }
  },

  // The selectedDevice concept is not a good idea. We need to weed out the use of it.
  getters: {
    devicesList: (state) => state.devicesArray,
    connectedDevices: (state) => state.devicesArray.filter((device) => device.isConnected),
    selectedDevice: (state) => (state.selectedDeviceId ? state.devices.get(state.selectedDeviceId) || null : null)
  },

  actions: {
    // Import all actions from modules
    ...createCoreActions().actions,
    ...createEventSystem().actions,
    ...createDiscoveryActions().actions,
    ...createCameraActions().actions,
    ...createTelescopeActions().actions,
    ...createFilterWheelActions().actions,
    ...createDomeActions().actions,
    ...createObservingConditionsActions().actions,
    ...createSwitchActions().actions,
    ...createRotatorActions().actions,
    ...createCoverCalibratorActions().actions,
    ...createSafetyMonitorActions().actions,
    ...createFocuserActions().actions
  }
})

// Export the store type
export type UnifiedStoreType = ReturnType<typeof useUnifiedStore>

// Export the store creator function
export default useUnifiedStore
