# Batch 2 Migration Plan

## Overview

This document outlines the detailed migration plan for Batch 2 components, which are intermediate UI components specialized for device types. These components build upon the base components migrated in Batch 1 and provide device-specific functionality.

## Components in Batch 2

1. TelescopePanelAdapter.vue → TelescopePanelMigrated.vue
2. CameraPanelAdapter.vue → CameraPanelMigrated.vue
3. EnhancedTelescopePanel.vue → EnhancedTelescopePanelMigrated.vue
4. EnhancedCameraPanel.vue → EnhancedCameraPanelMigrated.vue

## Migration Approach

For each component, we will follow the same general approach:

1. Create a new component with a "Migrated" suffix
2. Replace adapter store imports with direct UnifiedStore imports
3. Update device property references to match the new data model
4. Update event handling to use the UnifiedStore event system
5. Create comprehensive tests for the migrated component
6. Verify functionality through integration tests

## Detailed Migration Steps

### 1. TelescopePanelAdapter.vue → TelescopePanelMigrated.vue

**Effort Estimate:** 8 hours

**Dependencies:**

- BaseDevicePanel.vue (Batch 1)
- UnifiedStore

**Key Changes:**

1. **Update imports**

   ```ts
   // Before
   import { useLegacyDeviceStore } from '@/stores/deviceStoreAdapter'

   // After
   import UnifiedStore from '@/stores/UnifiedStore'
   import type { Device, TelescopeDevice } from '@/types/DeviceTypes'
   ```

2. **Update device retrieval**

   ```ts
   // Before
   const deviceStore = useLegacyDeviceStore()
   const telescope = computed(() => {
     const device = deviceStore.getDeviceById(props.telescopeId)
     return device?.type === 'telescope' ? device : null
   })

   // After
   const store = new UnifiedStore()
   const telescope = computed(() => {
     const device = store.getDeviceById(props.telescopeId)
     return device?.type === 'telescope' ? (device as TelescopeDevice) : null
   })
   ```

3. **Update telescope property references**

   ```ts
   // Before
   const isTracking = computed(() => telescope.value?.tracking || false)

   // After
   const isTracking = computed(() => {
     return telescope.value?.properties?.tracking || false
   })
   ```

4. **Update control methods**

   ```ts
   // Before
   function trackingToggle() {
     if (telescope.value) {
       deviceStore.setDeviceProperty(telescope.value.id, 'tracking', !isTracking.value)
     }
   }

   // After
   function trackingToggle() {
     if (telescope.value) {
       store.updateDeviceProperty(telescope.value.id, 'tracking', !isTracking.value)
     }
   }
   ```

5. **Update event handling**

   ```ts
   // Before
   onMounted(() => {
     deviceStore.$on('device-property-changed', handlePropertyChange)
   })

   onUnmounted(() => {
     deviceStore.$off('device-property-changed', handlePropertyChange)
   })

   // After
   onMounted(() => {
     store.on('devicePropertyChanged', handlePropertyChange)
   })

   onUnmounted(() => {
     store.off('devicePropertyChanged', handlePropertyChange)
   })
   ```

6. **Update telescope type checking**

   ```ts
   // Before (if applicable)
   function isTelescopeDevice(device: any): device is TelescopeDevice {
     return device.type === 'telescope'
   }

   // After
   function isTelescopeDevice(device: Device): device is TelescopeDevice {
     return device.type === 'telescope'
   }
   ```

7. **Create tests for TelescopePanelMigrated.vue**
   - Test telescope retrieval
   - Test property updates
   - Test control methods
   - Test event handling

### 2. CameraPanelAdapter.vue → CameraPanelMigrated.vue

**Effort Estimate:** 8 hours

**Dependencies:**

- BaseDevicePanel.vue (Batch 1)
- UnifiedStore

**Key Changes:**

1. **Update imports**

   ```ts
   // Before
   import { useLegacyDeviceStore } from '@/stores/deviceStoreAdapter'

   // After
   import UnifiedStore from '@/stores/UnifiedStore'
   import type { Device, CameraDevice } from '@/types/DeviceTypes'
   ```

2. **Update device retrieval**

   ```ts
   // Before
   const deviceStore = useLegacyDeviceStore()
   const camera = computed(() => {
     const device = deviceStore.getDeviceById(props.cameraId)
     return device?.type === 'camera' ? device : null
   })

   // After
   const store = new UnifiedStore()
   const camera = computed(() => {
     const device = store.getDeviceById(props.cameraId)
     return device?.type === 'camera' ? (device as CameraDevice) : null
   })
   ```

3. **Update camera property references**

   ```ts
   // Before
   const isExposing = computed(() => camera.value?.exposing || false)

   // After
   const isExposing = computed(() => {
     return camera.value?.properties?.exposing || false
   })
   ```

4. **Update control methods**

   ```ts
   // Before
   function startExposure(duration: number) {
     if (camera.value) {
       deviceStore.callDeviceMethod(camera.value.id, 'startExposure', [duration])
     }
   }

   // After
   function startExposure(duration: number) {
     if (camera.value) {
       store.callDeviceMethod(camera.value.id, 'startExposure', [duration])
     }
   }
   ```

5. **Update event handling**

   ```ts
   // Before
   onMounted(() => {
     deviceStore.$on('device-method-called', handleMethodCall)
   })

   onUnmounted(() => {
     deviceStore.$off('device-method-called', handleMethodCall)
   })

   // After
   onMounted(() => {
     store.on('deviceMethodCalled', handleMethodCall)
   })

   onUnmounted(() => {
     store.off('deviceMethodCalled', handleMethodCall)
   })
   ```

6. **Update camera type checking**

   ```ts
   // Before (if applicable)
   function isCameraDevice(device: any): device is CameraDevice {
     return device.type === 'camera'
   }

   // After
   function isCameraDevice(device: Device): device is CameraDevice {
     return device.type === 'camera'
   }
   ```

7. **Create tests for CameraPanelMigrated.vue**
   - Test camera retrieval
   - Test property updates
   - Test control methods
   - Test event handling

### 3. EnhancedTelescopePanel.vue → EnhancedTelescopePanelMigrated.vue

**Effort Estimate:** 6 hours

**Dependencies:**

- EnhancedPanelComponentMigrated.vue (Batch 1)
- TelescopePanelMigrated.vue (Batch 2)
- UnifiedStore

**Key Changes:**

1. **Update component composition**

   ```vue
   <!-- Before -->
   <EnhancedPanelComponent
     :panel-name="panelName"
     :connected="isConnected"
     :device-type="'telescope'"
     :device-id="telescopeId"
   >
     <!-- panel content -->
   </EnhancedPanelComponent>

   <!-- After -->
   <EnhancedPanelComponentMigrated
     :panel-name="panelName"
     :connected="isConnected"
     :device-type="'telescope'"
     :device-id="telescopeId"
   >
     <!-- panel content -->
   </EnhancedPanelComponentMigrated>
   ```

2. **Update store imports and usage**

   ```ts
   // Before
   import { useLegacyDeviceStore } from '@/stores/deviceStoreAdapter'

   // After
   import UnifiedStore from '@/stores/UnifiedStore'
   import type { TelescopeDevice } from '@/types/DeviceTypes'
   ```

3. **Update telescope functionality**

   - Update all property references to match the UnifiedStore data model
   - Update all method calls to use the UnifiedStore API
   - Update event handling

4. **Create tests for EnhancedTelescopePanelMigrated.vue**
   - Test panel rendering
   - Test telescope control functionality
   - Test mode switching
   - Test event handling

### 4. EnhancedCameraPanel.vue → EnhancedCameraPanelMigrated.vue

**Effort Estimate:** 6 hours

**Dependencies:**

- EnhancedPanelComponentMigrated.vue (Batch 1)
- CameraPanelMigrated.vue (Batch 2)
- UnifiedStore

**Key Changes:**

1. **Update component composition**

   ```vue
   <!-- Before -->
   <EnhancedPanelComponent
     :panel-name="panelName"
     :connected="isConnected"
     :device-type="'camera'"
     :device-id="cameraId"
   >
     <!-- panel content -->
   </EnhancedPanelComponent>

   <!-- After -->
   <EnhancedPanelComponentMigrated
     :panel-name="panelName"
     :connected="isConnected"
     :device-type="'camera'"
     :device-id="cameraId"
   >
     <!-- panel content -->
   </EnhancedPanelComponentMigrated>
   ```

2. **Update store imports and usage**

   ```ts
   // Before
   import { useLegacyDeviceStore } from '@/stores/deviceStoreAdapter'

   // After
   import UnifiedStore from '@/stores/UnifiedStore'
   import type { CameraDevice } from '@/types/DeviceTypes'
   ```

3. **Update camera functionality**

   - Update all property references to match the UnifiedStore data model
   - Update all method calls to use the UnifiedStore API
   - Update event handling

4. **Create tests for EnhancedCameraPanelMigrated.vue**
   - Test panel rendering
   - Test camera control functionality
   - Test mode switching
   - Test event handling

## Integration Testing

After migrating all Batch 2 components, we will create integration tests to verify that these components work correctly with:

1. Each other
2. Previously migrated Batch 1 components
3. The UnifiedStore

### Integration Test Areas

1. **Device Type-Specific Panel Functionality**

   - Test that TelescopePanelMigrated and CameraPanelMigrated correctly handle device-specific properties
   - Test that enhanced panels correctly implement their specialized behavior

2. **Panel Composition**

   - Test that EnhancedPanelComponentMigrated correctly wraps device-specific panels
   - Test that UI mode changes propagate correctly through component hierarchy

3. **Store Interaction**
   - Test that all components correctly interact with UnifiedStore
   - Test that events propagate correctly to all relevant components

## Migration Schedule

| Component                      | Assignee | Estimated Time | Dependencies               |
| ------------------------------ | -------- | -------------- | -------------------------- |
| TelescopePanelMigrated.vue     | TBD      | 8 hours        | Batch 1                    |
| CameraPanelMigrated.vue        | TBD      | 8 hours        | Batch 1                    |
| EnhancedTelescopePanelMigrated | TBD      | 6 hours        | TelescopePanelMigrated.vue |
| EnhancedCameraPanelMigrated    | TBD      | 6 hours        | CameraPanelMigrated.vue    |
| Integration Tests              | TBD      | 4 hours        | All Batch 2 components     |

## Risk Management

| Risk                                    | Likelihood | Impact | Mitigation                                       |
| --------------------------------------- | ---------- | ------ | ------------------------------------------------ |
| Device-specific property mapping errors | Medium     | High   | Create comprehensive tests for device properties |
| Component composition issues            | Low        | Medium | Test nested components thoroughly                |
| Event propagation issues                | Medium     | High   | Create event-specific tests                      |
| Performance regression                  | Low        | Medium | Benchmark before and after migration             |
