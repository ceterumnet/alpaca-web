# DiscoveredDevices.vue Migration Plan

## Overview

This document outlines the steps for migrating DiscoveredDevices.vue to use the UnifiedStore directly instead of going through adapters. This component is part of Batch 3 of our Phase 2 migration plan and represents the first of the more complex composition components.

## Current Implementation Analysis

DiscoveredDevices.vue is responsible for:

1. Displaying a list of discovered devices
2. Allowing users to add devices to the managed devices list
3. Providing filtering and search functionality for discovered devices
4. Handling manual device configuration

Current adapter usage:

- Uses `getLegacyDevicesAdapter()` to get a reference to the adapter
- Accesses `devices` property through the adapter
- Calls `addLegacyDevice` method to add devices

Dependencies:

- ManualDeviceConfig.vue (uses legacy store directly)

## Migration Steps

### 1. Create DiscoveredDevicesMigrated.vue

Based on the existing file structure, it appears DiscoveredDevicesMigrated.vue already exists:

```
src/components/DiscoveredDevicesMigrated.vue (15KB, 527 lines)
```

We need to:

- Verify it uses UnifiedStore directly
- Ensure it has all the functionality of the original component
- Check for any missing features or UI differences
- Complete any implementation gaps

### 2. Implementation Details

1. **Replace Adapter Imports**

   ```ts
   // Before
   import { getLegacyDevicesAdapter } from '../../stores/deviceStoreAdapter'

   // After
   import UnifiedStore from '../../stores/UnifiedStore'
   import type { Device } from '../../types/DeviceTypes'
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
   const discoveredDevices = computed(() => devicesStore.devices.filter(...))

   // After
   const discoveredDevices = computed(() => store.devices.filter(...))
   ```

4. **Update Device Addition**

   ```ts
   // Before
   function addDevice(device) {
     devicesStore.addLegacyDevice(device)
   }

   // After
   function addDevice(device: Device) {
     store.addDevice(device)
   }
   ```

5. **Update Property References**

   - Change `deviceName` to `name`
   - Change `deviceType` to `type`
   - Change `connected` to `isConnected`

6. **Handle Manual Device Configuration**
   Either:
   - Migrate ManualDeviceConfig.vue to use UnifiedStore directly, or
   - Create an adapter wrapper for ManualDeviceConfig.vue

### 3. Testing Approach

Create a comprehensive test suite for DiscoveredDevicesMigrated.vue:

1. **Test Device Listing**

   - Test that devices are properly retrieved from the store
   - Test filtering and search functionality
   - Test empty state handling

2. **Test Device Addition**

   - Test adding a device to the managed devices list
   - Test that the device appears in the store
   - Test that proper events are emitted

3. **Test Manual Configuration**

   - Test that the manual configuration dialog appears
   - Test that manual configuration works properly
   - Test validation and error handling

4. **Integration Testing**
   - Test interaction with other migrated components
   - Test that the component works with the entire device discovery flow

## Timeline and Dependencies

**Estimated Effort**: 1-2 days

**Dependencies**:

- UnifiedStore.ts
- Device type definitions
- Previously migrated components

**Required Changes in Other Components**:

- ManualDeviceConfig.vue may need updates if tightly coupled

## Migration Checklist

- [ ] Review DiscoveredDevicesMigrated.vue implementation
- [ ] Complete any missing implementation details
- [ ] Update property references to match UnifiedStore
- [ ] Ensure type safety throughout the component
- [ ] Create comprehensive test suite
- [ ] Test integration with other migrated components
- [ ] Update migration dashboard with progress
- [ ] Document any implementation decisions or challenges

## Risk Assessment

| Risk                                              | Impact | Likelihood | Mitigation                                                       |
| ------------------------------------------------- | ------ | ---------- | ---------------------------------------------------------------- |
| ManualDeviceConfig.vue coupling                   | High   | Medium     | Create adapter wrapper or migrate ManualDeviceConfig.vue as well |
| Complex filtering logic might break               | Medium | Medium     | Write focused tests for each filter type                         |
| Type conversion issues with discovered devices    | Medium | High       | Use proper type guards and validation                            |
| Integration with non-migrated components          | Medium | Medium     | Create clear interfaces between components                       |
| UI rendering differences with updated data format | Low    | Low        | Verify UI rendering in tests and with manual testing             |

## Conclusion

Migrating DiscoveredDevices.vue is a significant step in the Phase 2 migration plan as it represents one of the more complex components with multiple dependencies. By following this structured approach and thorough testing, we can ensure a successful migration while maintaining all existing functionality.
