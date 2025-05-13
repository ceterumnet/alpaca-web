# Component Registry Pattern

## Overview

The Component Registry Pattern is a design solution we've implemented to address persistent component state management in our dynamic panel layout system. This pattern ensures that Vue components, particularly those representing devices, maintain their internal state even as they are moved between different layouts or temporarily hidden.

## Problem Statement

In Vue applications with dynamic layouts, components are typically mounted and unmounted as the DOM structure changes. This can lead to:

1. **State Loss**: When a component is unmounted, its internal state is lost
2. **Unnecessary Re-initialization**: Components have to re-initialize when remounted
3. **API Churn**: Each component remount can trigger a cascade of API calls
4. **Poor User Experience**: Users lose custom settings or in-progress work

In our application, this manifested when users would:

- Assign a device to a panel
- Switch layouts
- Return to find the component had completely reset

## Core Components

The component registry pattern consists of these key elements:

### 1. DeviceComponentRegistry Service

A singleton service that:

- Creates and maintains a registry of component instances
- Maps device IDs to component types
- Tracks component visibility and cell assignments
- Provides methods to get or create components as needed

```typescript
class DeviceComponentRegistry {
  private registry = ref<Record<string, DeviceComponentRef>>({})

  registerDevice(deviceId: string, deviceType: string): DeviceComponentRef
  getComponent(deviceId: string, deviceType: string): Component | null
  assignToCell(deviceId: string, deviceType: string, cellId: string): void
  // Additional methods...
}
```

### 2. Layout Container

The layout container:

- Renders the grid system for panels
- Doesn't recreate the entire layout structure when layouts change
- Provides stable panel containers that maintain their identity

### 3. Integration Layer

The PanelLayoutView handles:

- Mapping stored layout configurations to cell assignments
- Coordination between layout store and component registry
- Layout change events and maintaining component state

## Pattern Implementation

The pattern operates through these key mechanisms:

### 1. Single Component Instance

Each device component is instantiated exactly once in the application lifecycle:

```typescript
// From DeviceComponentRegistry.ts
registerDevice(deviceId: string, deviceType: string): DeviceComponentRef {
  const normalizedType = deviceType.toLowerCase()
  const key = `${normalizedType}-${deviceId}`

  // Return existing component if it exists
  if (this.registry.value[key]) {
    return this.registry.value[key]
  }

  // Create new component reference only if it doesn't exist
  const componentRef: DeviceComponentRef = {
    id: deviceId,
    type: normalizedType,
    component: markRaw(component),
    isVisible: false,
    currentCell: null
  }

  // Add to registry
  this.registry.value[key] = componentRef

  return componentRef
}
```

### 2. Cell Assignment Tracking

The registry tracks which cell each component is assigned to:

```typescript
assignToCell(deviceId: string, deviceType: string, cellId: string): void {
  // Get or create component reference
  let componentRef = this.registry.value[key] || this.registerDevice(deviceId, normalizedType)

  // Clear previous assignments for this cell
  Object.values(this.registry.value).forEach((ref) => {
    if (ref.currentCell === cellId) {
      ref.currentCell = null
      ref.isVisible = false
    }
  })

  // Update assignment
  componentRef.currentCell = cellId
  componentRef.isVisible = true
}
```

### 3. Stable Component References

Using Vue's `<keep-alive>` to maintain component state when components are toggled:

```html
<keep-alive>
  <component
    v-if="isVisible(deviceId, deviceType)"
    :is="getComponentForDevice(deviceId, deviceType)"
    :key="`global-${deviceType}-${deviceId}`"
    :device-id="deviceId"
  />
</keep-alive>
```

## Benefits

This architecture provides several key benefits:

1. **State Preservation**: Component state persists across layout changes
2. **Reduced API Calls**: Components don't need to reinitialize
3. **Improved Performance**: Less reactivity churn and DOM manipulation
4. **Better User Experience**: Settings and configurations remain intact
5. **Developer Experience**: Clearer, more predictable component lifecycle

## Considerations

When implementing this pattern, we had to address:

1. **Memory Management**: We need to be careful about component cleanup
2. **Vue Integration**: Working with Vue's reactivity system and component lifecycle
3. **Debugging**: Need careful tracking of component state and assignments
4. **TypeScript Support**: Ensuring strong typing throughout the pattern

## Future Enhancements

Potential improvements to consider:

1. Component cleanup for devices that are removed from the system
2. Persisting component state to localStorage for browser refresh
3. Optimizing reactivity chains to minimize render cycles
4. Adding telemetry to track component lifecycle events

## Conclusion

The Component Registry Pattern provides an effective solution for managing component state in dynamic layouts. By centralizing component instance management and decoupling it from the DOM structure, we can provide a more robust user experience while maintaining clean code architecture.
