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
| EnhancedPanelComponent.vue         | No direct adapter usage                                                                                   | None                                                          | Low (legacy store)    |
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

| `slewToCoordinates`
