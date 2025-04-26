# Phase 2 Component Analysis and Prioritization

## Overview

This document tracks the analysis of components for direct UnifiedStore migration in Phase 2. It identifies component dependencies, adapter method usage, and prioritizes components for migration.

## Component Inventory and Adapter Usage

| Component                          | Adapter Methods Used                                                                                      | Dependencies                                                  | Migration Priority    |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------- |
| DiscoveryPanel.vue                 | `discoveredDevices`, `isDiscovering`, `startDiscovery`, `stopDiscovery`, `connectToDevice`                | None                                                          | High (leaf component) |
| DiscoveredDevices.vue              | `getLegacyDevicesAdapter()`, `useLegacyDeviceStore()`, `devices`, `addLegacyDevice`                       | ManualDeviceConfig.vue                                        | Medium                |
| TelescopePanelAdapter.vue          | `useLegacyDeviceStore()`, `slewToCoordinates`, `setTelescopeTracking`, `parkTelescope`, `unparkTelescope` | BaseDeviceAdapter.vue, EnhancedTelescopePanel.vue             | Medium                |
| CameraPanelAdapter.vue             | Similar to TelescopePanelAdapter                                                                          | BaseDeviceAdapter.vue, EnhancedCameraPanel.vue                | Medium                |
| BaseDeviceAdapter.vue              | `useLegacyDeviceStore()`, `getDeviceById`, `toggleDeviceConnection`                                       | None                                                          | High (leaf component) |
| MainPanels.vue                     | `getLegacyDevicesAdapter()`, `devices`                                                                    | EnhancedPanelComponent, DiscoveredDevices, adapter components | Medium                |
| AppSidebar.vue                     | `getLegacyDevicesAdapter()`, `devices`                                                                    | None                                                          | High (leaf component) |
| EnhancedPanelComponent.vue         | No direct adapter usage                                                                                   | None                                                          | High (UI component)   |
| ManualDeviceConfig.vue             | Uses `useDiscoveredDevicesStore()` directly, no adapter                                                   | None                                                          | Low (legacy store)    |
| DiscoveryView.vue                  | `useLegacyDeviceStore()`, discovery methods                                                               | DiscoveryPanel.vue                                            | Medium                |
| DevicesView.vue                    | `useLegacyDeviceStore()`, device listing methods                                                          | DiscoveredDevices.vue                                         | Medium                |
| DeviceDetailView.vue               | `useLegacyDeviceStore()`, `getDeviceById`, `toggleDeviceConnection`                                       | EnhancedTelescopePanel, EnhancedCameraPanel                   | Low (complex)         |
| EnhancedTelescopePanel.vue         | Likely receives device from adapter components                                                            | None                                                          | Medium                |
| EnhancedCameraPanel.vue            | Likely receives device from adapter components                                                            | None                                                          | Medium                |
| _Additional components to analyze_ |                                                                                                           |                                                               |                       |

## Dependency Map

### Component Hierarchy

```
Views
├── DiscoveryView.vue
│   └── DiscoveryPanel.vue (uses adapter directly)
├── DevicesView.vue
│   └── DiscoveredDevices.vue (uses adapter via helper functions)
│       └── ManualDeviceConfig.vue (uses legacy store directly)
└── DeviceDetailView.vue
    ├── TelescopePanelAdapter.vue
    │   ├── BaseDeviceAdapter.vue
    │   └── EnhancedTelescopePanel.vue
    └── CameraPanelAdapter.vue
        ├── BaseDeviceAdapter.vue
        └── EnhancedCameraPanel.vue

Additional Components
├── MainPanels.vue (uses adapter and manages panel layout)
│   ├── DiscoveredDevices.vue
│   ├── EnhancedPanelComponent.vue
│   ├── EnhancedTelescopePanel.vue
│   └── EnhancedCameraPanel.vue
└── AppSidebar.vue (uses adapter for device listing)
```

### Store Dependency Chain

```
Component → StoreAdapter → UnifiedStore

Alternative Legacy Path:
Some Components → Legacy Stores → No Type Safety
```

## Migration Order

### Batch 1: Leaf Components (Lowest Dependencies)

- DiscoveryPanel.vue - Simple component with direct adapter usage
- BaseDeviceAdapter.vue - Common adapter component used by other adapter components
- AppSidebar.vue - Sidebar with minimal dependencies that uses the adapter
- EnhancedPanelComponent.vue - UI component with no direct adapter usage

### Batch 2: Intermediate UI Components

- TelescopePanelAdapter.vue - Depends on BaseDeviceAdapter
- CameraPanelAdapter.vue - Depends on BaseDeviceAdapter
- EnhancedTelescopePanel.vue - Panel component used by adapter
- EnhancedCameraPanel.vue - Panel component used by adapter

### Batch 3: Composition Components

- DiscoveredDevices.vue - Uses adapter helper functions
- MainPanels.vue - Depends on multiple components and uses adapter

### Batch 4: View Components

- DiscoveryView.vue - View component that integrates discovery panels
- DevicesView.vue - View component that integrates device panels
- DeviceDetailView.vue - Complex view with multiple dependencies

### Batch 5: Legacy Components

- ManualDeviceConfig.vue - Uses legacy store directly
- Any remaining components with legacy store usage

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
| `toggleDeviceConnection`    | `isConnected ? disconnectDevice : connectDevice`    | Combined method vs. separate methods                                   |

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

## Common Component Migration Patterns

### 1. Store Initialization

```typescript
// Before - Adapter pattern
import { useLegacyDeviceStore } from '@/stores/deviceStoreAdapter'
const deviceStore = useLegacyDeviceStore()

// After - Direct UnifiedStore usage
import UnifiedStore from '@/stores/UnifiedStore'
const store = new UnifiedStore()
```

### 2. Device Listing

```typescript
// Before - Adapter pattern
const devices = computed(() => deviceStore.devices)

// After - Direct UnifiedStore usage
const devices = computed(() => store.devices)
```

### 3. Device Identification

```typescript
// Before - Adapter pattern
const device = computed(() => deviceStore.getDeviceById(deviceId))

// After - Direct UnifiedStore usage
const device = computed(() => store.getDeviceById(deviceId))
```

### 4. Device Connection

```typescript
// Before - Adapter pattern
deviceStore.toggleDeviceConnection(deviceId)

// After - Direct UnifiedStore usage
if (store.getDeviceById(deviceId)?.isConnected) {
  store.disconnectDevice(deviceId)
} else {
  store.connectDevice(deviceId)
}
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
| DiscoveryPanel.vue         | ✅                | ✅                 | ✅            |          |
| DiscoveredDevices.vue      | ✅                |                    |               |          |
| TelescopePanelAdapter.vue  | ✅                |                    |               |          |
| CameraPanelAdapter.vue     | ✅                |                    |               |          |
| BaseDeviceAdapter.vue      | ✅                |                    |               |          |
| MainPanels.vue             | ✅                |                    |               |          |
| AppSidebar.vue             | ✅                |                    |               |          |
| EnhancedPanelComponent.vue | ✅                |                    |               |          |
| ManualDeviceConfig.vue     | ✅                |                    |               |          |
| DiscoveryView.vue          | ✅                |                    |               |          |
| DevicesView.vue            | ✅                |                    |               |          |
| DeviceDetailView.vue       | ✅                |                    |               |          |
| EnhancedTelescopePanel.vue | ✅                |                    |               |          |
| EnhancedCameraPanel.vue    | ✅                |                    |               |          |

## Next Steps

1. Create detailed migration schedule for Batch 1 components
2. Estimate effort for each component migration
3. Set up tracking system to monitor migration progress
4. Update test infrastructure to support new component testing approach
5. Create sample test cases for all component types
