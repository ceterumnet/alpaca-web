# Component Registry Data Flow

## Overview

This document outlines the data flow patterns in our Component Registry implementation, showing how device information, layout configuration, and component state interact across the system.

## Key Data Structures

### 1. Device Component Registry

The core data structure in the pattern is the registry itself:

```typescript
// Primary registry data structure
private registry = ref<Record<string, DeviceComponentRef>>({})

// Component type mapping
private componentMap: Record<string, Component> = {
  camera: markRaw(SimplifiedCameraPanel),
  telescope: markRaw(SimplifiedTelescopePanel),
  focuser: markRaw(SimplifiedFocuserPanel)
}

// Component reference structure
interface DeviceComponentRef {
  id: string          // Unique device ID
  type: string        // Device type (camera, telescope, etc.)
  component: Component // The Vue component instance
  isVisible: boolean  // Whether component should be displayed
  currentCell: string | null // Cell ID where component is assigned
}
```

### 2. Layout Store Data

The layout information is stored in the layout store:

```typescript
// Layout definition
interface GridLayoutDefinition {
  id: string
  name: string
  description: string
  layouts: {
    desktop: DeviceLayout
    tablet: DeviceLayout
    mobile: DeviceLayout
  }
  isDefault: boolean
  createdAt: number
  updatedAt: number
}

// Device layout definition
interface DeviceLayout {
  rows: LayoutRow[]
  panelIds: string[]
}

// LayoutRow and LayoutCell definitions
interface LayoutRow {
  id: string
  cells: LayoutCell[]
  height: number
}

interface LayoutCell {
  id: string
  deviceType?: string
  name: string
  priority: string
  width: number
}
```

### 3. Cell-Device Assignments

The PanelLayoutView tracks cell-to-device assignments:

```typescript
// Map of cell ID to device ID
const cellDeviceAssignments = ref<Record<string, string>>({})
```

## Data Flow Sequence

### 1. Device Discovery & Registration

```
UnifiedStore → DevicesList → DeviceComponentRegistry.registerDevice()
```

1. The UnifiedStore maintains a list of discovered devices
2. When a new device is found, it's added to the store
3. The PanelLayoutView watches for device list changes
4. New devices are registered with the DeviceComponentRegistry
5. Component instances are created and stored in the registry

### 2. Layout Loading & Initialization

```
LayoutStore → currentLayout → PanelLayoutView → cellDeviceAssignments
```

1. The LayoutStore provides the current layout configuration
2. PanelLayoutView computes the current device layout based on viewport
3. For each position in the layout, a cell-device assignment is created
4. These assignments consider:
   - Device type requirements from the layout definition
   - Previously selected devices in the deviceMap
   - User-selected device assignments

### 3. Component Assignment

```
cellDeviceAssignments → DeviceComponentRegistry.assignToCell()
```

1. When cellDeviceAssignments changes, components are assigned to cells
2. The registry updates visibility and cell assignment for each component
3. The registry manages exclusive assignments (one component per cell)
4. Component visibility flags are updated to control rendering

### 4. Component Rendering

```
LayoutContainer → Slots → <keep-alive> → Component instances
```

1. LayoutContainer creates grid cells based on layout positions
2. Each cell renders a slot with its panelId
3. The PanelLayoutView provides content for these slots
4. For each visible component, a `<keep-alive>` wrapper ensures state preservation
5. Components are conditionally rendered based on visibility flags

### 5. Layout Change Flow

```
Layout Change → cellDeviceAssignments update → Visibility changes → Component reuse
```

1. User selects a new layout or layout changes due to viewport change
2. The layout store updates its currentLayoutId
3. PanelLayoutView detects the change and updates cellDeviceAssignments
4. DeviceComponentRegistry updates visibility flags based on new assignments
5. Components become visible/hidden based on new layout
6. Component state is preserved due to instance reuse

## Data Flow Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│                 │     │                  │     │                     │
│  UnifiedStore   │────►│  PanelLayoutView │────►│ DeviceComponent     │
│  (Devices)      │     │  (Assignments)   │     │ Registry            │
│                 │     │                  │     │                     │
└────────┬────────┘     └────────┬─────────┘     └──────────┬──────────┘
         │                       │                          │
         │                       │                          │
         ▼                       ▼                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│                 │     │                  │     │                     │
│   LayoutStore   │────►│  LayoutContainer │◄────┤ Component           │
│   (Layouts)     │     │  (Grid Structure)│     │ Instances           │
│                 │     │                  │     │                     │
└─────────────────┘     └──────────────────┘     └─────────────────────┘
```

## Key Data Transformation Points

1. **Device Registration**

   - Input: Device ID and type
   - Transform: Map to component definition, create instance
   - Output: Registry entry with component instance

2. **Cell Assignment**

   - Input: Cell ID and device ID
   - Transform: Update registry visibility flags
   - Output: Updated component references

3. **Layout Rendering**
   - Input: Layout positions and cell assignments
   - Transform: Map cells to components
   - Output: Rendered component tree with proper visibility

## State Management Considerations

1. **Reactive Dependencies**

   - The registry uses Vue's ref for reactivity
   - Component changes are tracked through visibility flags
   - Cell assignments rely on reactive maps

2. **Prop Passing**

   - Components receive device IDs as props
   - Internal component state is maintained independently of props
   - Layout changes only affect visibility, not props or state

3. **Optimization**
   - We use markRaw for component definitions to prevent reactivity issues
   - Component instances are created once and reused
   - Visibility changes are more efficient than mounting/unmounting

## Conclusion

This data flow architecture ensures that:

1. Components maintain internal state across layout changes
2. The system efficiently handles component visibility
3. Layout changes don't trigger unnecessary component recreation
4. The component lifecycle is predictable and maintainable
5. State is preserved while maintaining clean architecture
