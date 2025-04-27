# Phase 2 Migration Schedule

## Overview

This document outlines the detailed schedule for Phase 2 of the Alpaca Web migration, focusing on migrating components to directly use the UnifiedStore instead of going through adapters. The schedule is organized by batches, with detailed steps for each component.

## Timeline

| Phase                  | Duration | Start Date    | End Date      | Components                                                                                             |
| ---------------------- | -------- | ------------- | ------------- | ------------------------------------------------------------------------------------------------------ |
| Preparation            | 2 weeks  | May 1, 2023   | May 15, 2023  | N/A - Analysis and planning                                                                            |
| Batch 1                | 2 weeks  | May 15, 2023  | May 29, 2023  | DiscoveryPanel.vue, BaseDeviceAdapter.vue, AppSidebar.vue, EnhancedPanelComponent.vue                  |
| Batch 2                | 2 weeks  | May 29, 2023  | June 12, 2023 | TelescopePanelAdapter.vue, CameraPanelAdapter.vue, EnhancedTelescopePanel.vue, EnhancedCameraPanel.vue |
| Batch 3                | 1 week   | June 12, 2023 | June 19, 2023 | DiscoveredDevices.vue, MainPanels.vue                                                                  |
| Batch 4                | 2 weeks  | June 19, 2023 | July 3, 2023  | DiscoveryView.vue, DevicesView.vue, DeviceDetailView.vue                                               |
| Batch 5                | 1 week   | July 3, 2023  | July 10, 2023 | ManualDeviceConfig.vue, remaining legacy components                                                    |
| Testing & Verification | 2 weeks  | July 10, 2023 | July 24, 2023 | All components                                                                                         |

## Batch 1 Detailed Plan

### DiscoveryPanel.vue (COMPLETED)

Status: ✅ Migration complete, tests updated

Effort: 4 hours

Key Changes:

- Replaced adapter imports with UnifiedStore imports
- Updated component props to use UnifiedStore types
- Changed event handling to use UnifiedStore events
- Updated tests to use UnifiedStore directly

### BaseDeviceAdapter.vue

Effort: 6 hours

Migration Steps:

1. Create new component `BaseDevicePanel.vue` that uses UnifiedStore directly
2. Update imports to use UnifiedStore directly:

   ```ts
   // Before
   import { useLegacyDeviceStore } from '../../stores/deviceStoreAdapter'

   // After
   import UnifiedStore from '../../stores/UnifiedStore'
   ```

3. Update device retrieval:

   ```ts
   // Before
   const deviceStore = useLegacyDeviceStore()
   const device = computed(() => deviceStore.getDeviceById(props.deviceId))

   // After
   const store = new UnifiedStore()
   const device = computed(() => store.getDeviceById(props.deviceId))
   ```

4. Update connection handling:

   ```ts
   // Before
   const handleConnect = () => {
     if (device.value) {
       deviceStore.toggleDeviceConnection(device.value.id)
     }
   }

   // After
   const handleConnect = () => {
     if (device.value) {
       if (device.value.isConnected) {
         store.disconnectDevice(device.value.id)
       } else {
         store.connectDevice(device.value.id)
       }
     }
   }
   ```

5. Update computed properties:

   ```ts
   // Before
   const connected = computed(() => device.value?.connected || false)
   const deviceType = computed(() => device.value?.type || '')

   // After
   const connected = computed(() => device.value?.isConnected || false)
   const deviceType = computed(() => device.value?.type || '')
   ```

6. Create tests for BaseDevicePanel.vue
7. Test all functionality with UnifiedStore

### AppSidebar.vue

Effort: 5 hours

Migration Steps:

1. Update imports to use UnifiedStore:

   ```ts
   // Before
   import { getLegacyDevicesAdapter } from '@/stores/deviceStoreAdapter'

   // After
   import UnifiedStore from '@/stores/UnifiedStore'
   import type { Device } from '@/types/DeviceTypes'
   ```

2. Update store initialization:

   ```ts
   // Before
   const devicesStore = getLegacyDevicesAdapter()

   // After
   const store = new UnifiedStore()
   ```

3. Update computed properties:

   ```ts
   // Before
   const categorizedDevices = computed(() => {
     const devicesByType: Record<string, Device[]> = {}
     devicesStore.devices.forEach((device: Device) => {
       const type = device.deviceType || 'other'
       // ...
     })
     return devicesByType
   })

   // After
   const categorizedDevices = computed(() => {
     const devicesByType: Record<string, Device[]> = {}
     store.devices.forEach((device: Device) => {
       const type = device.type || 'other'
       // ...
     })
     return devicesByType
   })
   ```

4. Update methods:

   ```ts
   // Before
   function isDeviceConnected(device: Device): boolean {
     return device.connected || false
   }

   // After
   function isDeviceConnected(device: Device): boolean {
     return device.isConnected || false
   }
   ```

5. Update template references:

   ```html
   <!-- Before -->
   <div v-for="device in devices" :key="`${device.deviceType}-${device.idx}`">
     <!-- After -->
     <div v-for="device in devices" :key="`${device.type}-${device.id}`"></div>
   </div>
   ```

6. Create tests for updated AppSidebar.vue
7. Test all functionality with UnifiedStore

### EnhancedPanelComponent.vue

Effort: 2 hours

Migration Steps:

1. This component doesn't use the adapter directly, but may need updates to property types:
   ```ts
   // Update props if needed
   const props = defineProps({
     // ... existing props
     deviceType: { type: String, required: true },
     deviceId: { type: [String, Number], required: true }
     // ... ensure property types match Device from DeviceTypes.ts
   })
   ```
2. Update any template references to device properties if needed
3. Create tests to ensure compatibility with migrated components
4. Ensure proper functionality when connected to components using UnifiedStore

## Migration Tracking

| Component                  | Assignee | Start Date   | Target Completion | Status      | Blockers |
| -------------------------- | -------- | ------------ | ----------------- | ----------- | -------- |
| DiscoveryPanel.vue         | David    | May 1, 2023  | May 3, 2023       | ✅ Complete | None     |
| BaseDeviceAdapter.vue      | Marcus   | May 15, 2023 | May 18, 2023      | ✅ Complete | None     |
| AppSidebar.vue             | Elena    | May 18, 2023 | May 22, 2023      | ⏳ Pending  | None     |
| EnhancedPanelComponent.vue | David    | May 22, 2023 | May 24, 2023      | ⏳ Pending  | None     |

## Testing Strategy

For each migrated component:

1. **Unit Tests**:

   - Direct store method calls
   - Proper event handling
   - Type compatibility
   - Props validation

2. **Integration Tests**:
   - Component interaction with UnifiedStore
   - Component interaction with other migrated components
   - Event propagation
3. **Visual Tests**:
   - UI appearance consistency
   - Proper render of device state

## Risk Management

| Risk                                  | Mitigation                                            |
| ------------------------------------- | ----------------------------------------------------- |
| Breaking changes in template bindings | Create comprehensive tests for UI rendering           |
| Type conversion errors                | Start with simpler components to establish patterns   |
| Event handling differences            | Standardize event handling approach across components |
| Performance regression                | Measure performance before and after migration        |
| Interface mismatches                  | Create clear property mapping documentation           |

## Next Steps

1. Begin migration of BaseDeviceAdapter.vue (first priority)
2. Prepare test suite for AppSidebar.vue
3. Review EnhancedPanelComponent.vue for any potential property type issues
4. Plan for Batch 2 component migration with more specific details
