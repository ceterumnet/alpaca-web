# MainPanels.vue Migration Plan

## Overview

This document outlines the steps for migrating MainPanels.vue to use the UnifiedStore directly instead of going through adapters. This component is a critical part of Batch 3 in our Phase 2 migration plan, as it manages the display and organization of device panels in the application.

## Current Implementation Analysis

MainPanels.vue is responsible for:

1. Displaying panels for different types of devices
2. Managing the layout and visibility of panels
3. Handling device connection status
4. Coordinating panel interactions

Current adapter usage:

- Uses `getLegacyDevicesAdapter()` to get a reference to the adapter
- Accesses device information through the adapter
- Listens to device events through the adapter

Dependencies:

- TelescopePanelAdapter.vue (already migrated to TelescopePanelMigrated.vue)
- CameraPanelAdapter.vue (already migrated to CameraPanelMigrated.vue)
- Other panel adapters for different device types

## Migration Steps

### 1. Create MainPanelsMigrated.vue

Create a new component with the following changes:

1. **Replace Adapter Imports**

   ```ts
   // Before
   import { getLegacyDevicesAdapter } from '@/stores/deviceStoreAdapter'

   // After
   import UnifiedStore from '@/stores/UnifiedStore'
   import type { Device } from '@/types/DeviceTypes'
   ```

2. **Replace Store Initialization**

   ```ts
   // Before
   const devicesStore = getLegacyDevicesAdapter()

   // After
   const store = new UnifiedStore()
   ```

3. **Update Device Retrieval**

   ```ts
   // Before
   const devices = computed(() => devicesStore.devices)

   // After
   const devices = computed(() => store.devices)
   ```

4. **Update Event Handling**

   ```ts
   // Before
   onMounted(() => {
     devicesStore.$on('device-added', handleDeviceAdded)
     devicesStore.$on('device-removed', handleDeviceRemoved)
     devicesStore.$on('device-connection-changed', handleConnectionChanged)
   })

   onUnmounted(() => {
     devicesStore.$off('device-added', handleDeviceAdded)
     devicesStore.$off('device-removed', handleDeviceRemoved)
     devicesStore.$off('device-connection-changed', handleConnectionChanged)
   })

   // After
   onMounted(() => {
     store.on('deviceAdded', handleDeviceAdded)
     store.on('deviceRemoved', handleDeviceRemoved)
     store.on('deviceConnectionChanged', handleConnectionChanged)
   })

   onUnmounted(() => {
     store.off('deviceAdded', handleDeviceAdded)
     store.off('deviceRemoved', handleDeviceRemoved)
     store.off('deviceConnectionChanged', handleConnectionChanged)
   })
   ```

5. **Update Component References**

   ```vue
   <!-- Before -->
   <TelescopePanelAdapter v-if="device.type === 'telescope'" :telescopeId="device.id" />
   <CameraPanelAdapter v-else-if="device.type === 'camera'" :cameraId="device.id" />

   <!-- After -->
   <TelescopePanelMigrated v-if="device.type === 'telescope'" :telescopeId="device.id" />
   <CameraPanelMigrated v-else-if="device.type === 'camera'" :cameraId="device.id" />
   ```

6. **Update Property References**

   - Change property references to match the UnifiedStore format
   - Update type definitions to use the UnifiedStore types

### 2. Testing Strategy

1. **Component Tests**

   - Test panel layout and organization
   - Test device visibility based on connection status
   - Test panel interactions

2. **Integration Tests**

   - Test interaction with migrated device panels
   - Test event propagation between components
   - Test proper display of device information

3. **Type Safety Tests**
   - Ensure proper typing throughout component
   - Verify type guards for device type checking

## Risk Assessment

| Risk                                      | Impact | Likelihood | Mitigation                                               |
| ----------------------------------------- | ------ | ---------- | -------------------------------------------------------- |
| Complex layout management                 | Medium | Medium     | Break down changes into smaller, focused updates         |
| Event propagation issues                  | High   | Medium     | Create comprehensive event handling tests                |
| Interaction with other panel components   | High   | Medium     | Test integration with all migrated panel components      |
| Dynamic component loading issues          | Medium | Low        | Test with various device configurations                  |
| Conditional rendering of different panels | Medium | Medium     | Create tests for each device type panel                  |
| Connection status synchronization         | High   | Medium     | Ensure event handling properly updates connection status |

## Implementation Approach

### Phase 1: Component Structure

1. Create basic structure of MainPanelsMigrated.vue
2. Update imports to use UnifiedStore
3. Update component dependencies to use migrated versions

### Phase 2: Store Integration

1. Replace adapter store with UnifiedStore
2. Update computed properties and reactivity
3. Implement new event handling

### Phase 3: Panel Integration

1. Update panel references to use migrated components
2. Test interaction with each panel type
3. Verify layout and organization

### Phase 4: Testing

1. Create component tests
2. Create integration tests
3. Test with various device configurations

## Timeline

- **Component Structure**: 2 hours
- **Store Integration**: 3 hours
- **Panel Integration**: 4 hours
- **Testing Implementation**: 5 hours

**Total Estimated Time**: 14 hours (2 days)

## Conclusion

MainPanels.vue is a critical component that manages the display and interaction of device panels. Successfully migrating this component will enable the application to use UnifiedStore directly for panel management and significantly reduce dependency on adapter patterns.

The migration approach focuses on:

1. Replacing adapter dependencies with direct UnifiedStore usage
2. Updating event handling to use new event system
3. Integrating with already migrated panel components
4. Comprehensive testing to ensure proper functionality
