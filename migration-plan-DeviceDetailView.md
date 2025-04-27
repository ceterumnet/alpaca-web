# DeviceDetailView.vue Migration Plan

## Overview

This document outlines the steps for migrating DeviceDetailView.vue to use the UnifiedStore directly instead of going through adapters. This component is part of Batch 4 in our Phase 2 migration plan and is responsible for displaying detailed information and controls for a specific device.

## Current Implementation Analysis

DeviceDetailView.vue is responsible for:

1. Displaying detailed information about a selected device
2. Providing UI for connecting/disconnecting the device
3. Showing the appropriate panel component based on device type when connected
4. Handling basic device operations

Current adapter usage:

- Uses `useLegacyDeviceStore()` to get a reference to the adapter
- Accesses device information through the adapter
- Toggles device connection state through the adapter

Dependencies:

- TelescopePanelMigrated.vue (already migrated)
- CameraPanelMigrated.vue (already migrated)
- EnhancedPanelComponentMigrated.vue (already migrated)

## Migration Steps

### 1. Create DeviceDetailViewMigrated.vue

Create a new component with the following changes:

1. **Replace Adapter Imports**

   ```ts
   // Before
   import { useLegacyDeviceStore } from '../stores/deviceStoreAdapter'

   // After
   import { useUnifiedStore } from '../stores/UnifiedStore'
   ```

2. **Replace Store Initialization**

   ```ts
   // Before
   const deviceStore = useLegacyDeviceStore()

   // After
   const store = useUnifiedStore()
   ```

3. **Update Device Retrieval**

   ```ts
   // Before
   const device = computed(() => deviceStore.getDeviceById(deviceId.value))

   // After
   const device = computed(() => store.getDeviceById(deviceId.value))
   ```

4. **Update Connection Toggle**

   ```ts
   // Before
   const toggleConnection = () => {
     if (device.value) {
       deviceStore.toggleDeviceConnection(device.value.id)
     }
   }

   // After
   const toggleConnection = async () => {
     if (!device.value) return

     if (device.value.isConnected) {
       await store.disconnectDevice(device.value.id)
     } else {
       await store.connectDevice(device.value.id)
     }
   }
   ```

5. **Update Device Property References**

   ```ts
   // Before (in template)
   <span class="info-value" :class="device.connected ? 'connected' : 'disconnected'">
     {{ device.connected ? 'Connected' : 'Disconnected' }}
   </span>

   // After (in template)
   <span class="info-value" :class="device.isConnected ? 'connected' : 'disconnected'">
     {{ device.isConnected ? 'Connected' : 'Disconnected' }}
   </span>
   ```

6. **Update Panel Configuration**

   ```ts
   // Before
   const panelConfig = ref({
     panelName: computed(() => device.value?.name || 'Device'),
     deviceId: computed(() => device.value?.id || ''),
     deviceType: computed(() => device.value?.type || ''),
     connected: computed(() => device.value?.connected || false),
     supportedModes: [UIMode.OVERVIEW, UIMode.DETAILED]
   })

   // After
   const panelConfig = ref({
     panelName: computed(() => device.value?.name || 'Device'),
     deviceId: computed(() => device.value?.id || ''),
     deviceType: computed(() => device.value?.type || ''),
     connected: computed(() => device.value?.isConnected || false),
     supportedModes: [UIMode.OVERVIEW, UIMode.DETAILED]
   })
   ```

### 2. Testing Strategy

1. **Component Tests**

   - Test device details display
   - Test connection toggling
   - Test panel component selection based on device type

2. **Integration Tests**

   - Test interaction with device panel components
   - Test proper routing with device ID parameter
   - Test error handling when device not found

3. **Type Safety Tests**
   - Ensure proper typing throughout component
   - Verify type guards for device type checking

## Risk Assessment

| Risk                                  | Impact | Likelihood | Mitigation                                              |
| ------------------------------------- | ------ | ---------- | ------------------------------------------------------- |
| Component selection logic issues      | Medium | Low        | Re-use existing working logic                           |
| Async connection state changes        | Medium | Medium     | Implement proper loading states and error handling      |
| Router parameter handling             | Low    | Low        | Ensure proper validation of route parameters            |
| Type mismatches with panel components | Medium | Low        | Verify API compatibility with migrated panel components |

## Implementation Approach

### Phase 1: Component Structure

1. Create basic structure of DeviceDetailViewMigrated.vue
2. Update imports to use UnifiedStore
3. Update component dependencies

### Phase 2: Store Integration

1. Replace adapter store with UnifiedStore
2. Update computed properties and reactivity
3. Update connection state handling

### Phase 3: Panel Integration

1. Verify panel component selection logic
2. Test interaction with each panel type
3. Implement proper error handling for missing devices

### Phase 4: Testing

1. Create component tests
2. Create integration tests
3. Test with various device types

## Timeline

- **Component Structure**: 1 hour
- **Store Integration**: 1-2 hours
- **Panel Integration**: 1 hour
- **Testing Implementation**: 2 hours

**Total Estimated Time**: 5-6 hours (less than 1 day)

## Conclusion

DeviceDetailView.vue is an important view component that displays detailed device information and controls. Successfully migrating this component will enable users to interact with devices using the UnifiedStore directly, improving type safety and performance.

The migration approach focuses on:

1. Replacing adapter dependencies with direct UnifiedStore usage
2. Updating property references to match the UnifiedStore format
3. Improving error handling and type safety
4. Re-using existing panel component integration

This migration is relatively straightforward since it mostly involves updating store references and the component already uses migrated panel components.
