# Phase 2 Component Analysis and Prioritization

## Overview

This document tracks the analysis of components for direct UnifiedStore migration in Phase 2. It identifies component dependencies, adapter method usage, and prioritizes components for migration.

## Component Inventory and Adapter Usage

| Component                              | Adapter Methods Used                                                                                      | Dependencies                                      | Migration Priority    |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------- |
| DiscoveryPanel.vue                     | `discoveredDevices`, `isDiscovering`, `startDiscovery`, `stopDiscovery`, `connectToDevice`                | None                                              | High (leaf component) |
| DiscoveredDevices.vue                  | `getLegacyDevicesAdapter()`, `useLegacyDeviceStore()`, `devices`, `addLegacyDevice`                       | ManualDeviceConfig.vue                            | Medium                |
| TelescopePanelAdapter.vue              | `useLegacyDeviceStore()`, `slewToCoordinates`, `setTelescopeTracking`, `parkTelescope`, `unparkTelescope` | BaseDeviceAdapter.vue, EnhancedTelescopePanel.vue | Medium                |
| CameraPanelAdapter.vue                 | Similar to TelescopePanelAdapter                                                                          | BaseDeviceAdapter.vue, EnhancedCameraPanel.vue    | Medium                |
| BaseDeviceAdapter.vue                  | Likely uses core adapter methods                                                                          | None                                              | High                  |
| _Additional components to be analyzed_ |                                                                                                           |                                                   |                       |

## Dependency Map

### Component Hierarchy

```
Views
├── DiscoveryView.vue
│   └── DiscoveryPanel.vue (uses adapter directly)
├── DevicesView.vue
│   └── DiscoveredDevices.vue (uses adapter via helper functions)
└── DeviceDetailView.vue
    ├── TelescopePanelAdapter.vue
    │   ├── BaseDeviceAdapter.vue
    │   └── EnhancedTelescopePanel.vue
    └── CameraPanelAdapter.vue
        ├── BaseDeviceAdapter.vue
        └── EnhancedCameraPanel.vue
```

### Store Dependency Chain

```
Component → StoreAdapter → UnifiedStore
```

## Migration Order

### Batch 1: Leaf Components (Lowest Dependencies)

- DiscoveryPanel.vue - Simple component with direct adapter usage
- BaseDeviceAdapter.vue - Common adapter component used by other adapter components

### Batch 2: Intermediate Components

- TelescopePanelAdapter.vue - Depends on BaseDeviceAdapter
- CameraPanelAdapter.vue - Depends on BaseDeviceAdapter
- DiscoveredDevices.vue - Uses adapter helper functions

### Batch 3: Core Components (Highest Dependencies)

_Components that many other components depend on - to be determined upon further analysis_

## API Mapping

### Adapter Method to Direct Store Method Mapping

| Adapter Method              | UnifiedStore Method                                 | Notes on Type Conversion                                               |
| --------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------- |
| `discoveredDevices`         | `devices`                                           | Legacy format uses `deviceName` and `deviceType` vs. `name` and `type` |
| `connectedDevices`          | `devices.filter(d => d.isConnected)`                | Filter devices array for connected state                               |
| `getDeviceById`             | `getDeviceById`                                     | Adapter returns LegacyDevice format                                    |
| `on('discovery', ...)`      | `addEventListener((e) => e.type === 'deviceAdded')` | Event system differences                                               |
| `addDevice`                 | `addDevice`                                         | Type conversion from LegacyDevice to Device                            |
| `updateDevice`              | `updateDevice`                                      | Property name mapping required                                         |
| `connectToDevice`           | `connectDevice`                                     | Similar signature but different types                                  |
| `disconnectDevice`          | `disconnectDevice`                                  | Similar signature but different types                                  |
| `useLegacyDeviceStore()`    | `new UnifiedStore()`                                | Factory function vs. direct instantiation                              |
| `getLegacyDevicesAdapter()` | `new UnifiedStore()`                                | Factory function vs. direct instantiation                              |
| `slewToCoordinates`         | `executeDeviceCommand`                              | Device-specific command execution                                      |
| `setTelescopeTracking`      | `executeDeviceCommand`                              | Device-specific command execution                                      |
| `parkTelescope`             | `executeDeviceCommand`                              | Device-specific command execution                                      |
| `unparkTelescope`           | `executeDeviceCommand`                              | Device-specific command execution                                      |

## Event Handling Changes

```typescript
// Adapter event handling
adapter.on('discovery', (device) => {
  // Handle discovered device
})

// Direct store event handling
store.addEventListener((event) => {
  if (event.type === 'deviceAdded') {
    const device = event.device
    // Handle discovered device
  }
})
```

## Sample Migration

### Before (Using Adapter)

```vue
<script setup>
import { onMounted, ref } from 'vue'
import { createStoreAdapter } from '@/stores/StoreAdapter'

const adapter = createStoreAdapter()
const devices = ref([])

onMounted(() => {
  // Get initial devices
  devices.value = adapter.discoveredDevices

  // Listen for new devices
  adapter.on('discovery', (device) => {
    devices.value = adapter.discoveredDevices
  })

  // Start discovery
  adapter.startDiscovery()
})
</script>
```

### After (Using Direct Store)

```vue
<script setup>
import { onMounted, ref } from 'vue'
import UnifiedStore from '@/stores/UnifiedStore'

const store = new UnifiedStore()
const devices = ref([])

onMounted(() => {
  // Get initial devices
  devices.value = store.devices

  // Listen for new devices
  store.addEventListener((event) => {
    if (event.type === 'deviceAdded' || event.type === 'deviceRemoved') {
      devices.value = store.devices
    }
  })

  // Start discovery
  store.startDiscovery()
})
</script>
```

## Migration Progress Tracking

| Component                  | Analysis Complete | Migration Complete | Tests Updated | Verified |
| -------------------------- | ----------------- | ------------------ | ------------- | -------- |
| DiscoveryPanel.vue         | ✅                |                    |               |          |
| DiscoveredDevices.vue      | ✅                |                    |               |          |
| TelescopePanelAdapter.vue  | ✅                |                    |               |          |
| CameraPanelAdapter.vue     |                   |                    |               |          |
| BaseDeviceAdapter.vue      |                   |                    |               |          |
| EnhancedTelescopePanel.vue |                   |                    |               |          |
| EnhancedCameraPanel.vue    |                   |                    |               |          |
| MainPanels.vue             |                   |                    |               |          |
| AppSidebar.vue             |                   |                    |               |          |
| DiscoveryView.vue          |                   |                    |               |          |
| DevicesView.vue            |                   |                    |               |          |
| DeviceDetailView.vue       |                   |                    |               |          |

## Next Steps

1. Complete component inventory by analyzing remaining components
2. Expand analysis of adapter method usage patterns
3. Complete a detailed dependency map
4. Select DiscoveryPanel.vue as our first proof-of-concept migration
5. Create test plan for validating the migration
