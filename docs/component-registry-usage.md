# Component Registry Pattern Usage Guide

This guide explains how to use the Component Registry Pattern in the Alpaca Web application to maintain component state across layout changes and optimize performance.

## Overview

The Component Registry Pattern solves the problem of preserving component state when rearranging, hiding, or changing layouts in the UI. It ensures that device components are:

1. Created only once
2. Maintain their internal state consistently
3. Can be reused across different layouts
4. Perform efficiently without unnecessary remounting

## Basic Usage

### Registering a Device

When a device is discovered or connected, register it with the registry:

```typescript
import deviceComponentRegistry from '@/services/DeviceComponentRegistry'

// When a device is connected
function onDeviceConnected(deviceId: string, deviceType: string) {
  // Register with the component registry to create a component instance
  deviceComponentRegistry.registerDevice(deviceId, deviceType)
}
```

### Assigning Devices to Cells

When you want to display a device in a specific layout cell:

```typescript
// When user assigns a device to a cell
function assignDeviceToCell(cellId: string, deviceId: string, deviceType: string) {
  // First register if needed (this is idempotent)
  deviceComponentRegistry.registerDevice(deviceId, deviceType)

  // Then assign to the cell
  deviceComponentRegistry.assignToCell(deviceId, deviceType, cellId)
}
```

### Rendering Components

In your Vue template, use the registry to get the component:

```html
<template>
  <div class="cell-container">
    <keep-alive>
      <component
        v-if="hasDeviceAssigned(cellId)"
        :is="getComponentForCell(cellId)"
        :device-id="getDeviceId(cellId)"
        :key="`device-${getDeviceId(cellId)}`"
      />
    </keep-alive>
  </div>
</template>

<script setup>
  import deviceComponentRegistry from '@/services/DeviceComponentRegistry'

  // Get the component for a cell
  const getComponentForCell = (cellId) => {
    const deviceRef = deviceComponentRegistry.getDeviceForCell(cellId)
    if (deviceRef) {
      return deviceRef.component
    }
    return null
  }

  // Check if a cell has a device assigned
  const hasDeviceAssigned = (cellId) => {
    return !!deviceComponentRegistry.getDeviceForCell(cellId)
  }

  // Get the device ID for a cell
  const getDeviceId = (cellId) => {
    const deviceRef = deviceComponentRegistry.getDeviceForCell(cellId)
    return deviceRef ? deviceRef.id : null
  }
</script>
```

## Adding New Device Types

To add support for a new device type:

1. Create the device component (e.g., `SimplifiedFilterWheelPanel.vue`)
2. Update the ComponentRegistry to support the new type:

```typescript
// In src/services/DeviceComponentRegistry.ts
import SimplifiedFilterWheelPanel from '@/components/devices/SimplifiedFilterWheelPanel.vue'

// Update component map
private componentMap: Record<string, Component> = {
  camera: markRaw(SimplifiedCameraPanel),
  telescope: markRaw(SimplifiedTelescopePanel),
  focuser: markRaw(SimplifiedFocuserPanel),
  filterwheel: markRaw(SimplifiedFilterWheelPanel) // Add new component
}
```

## Best Practices

### Keeping Components Stateful

Components should manage their own state and use props primarily for identification:

```typescript
// In a device component
const props = defineProps<{
  deviceId: string
}>()

// Use deviceId to fetch device info but maintain local state
const exposureTime = ref(1000) // Local state preserved by registry
```

### Performance Considerations

1. **Minimize Component Size**: Keep device components as lightweight as possible
2. **Lazy Loading**: Consider lazy-loading heavy components
3. **State Management**: Use local component state for UI state, store for persistent data

### Debugging

The registry includes built-in performance monitoring:

```typescript
// Log metrics about component usage
deviceComponentRegistry.logPerformanceMetrics()

// Get metrics programmatically
const metrics = deviceComponentRegistry.getPerformanceMetrics()
console.log(`Created ${metrics.componentCreations} components`)
```

## Troubleshooting

### Component State Lost Between Layouts

If state is lost when switching layouts, check:

1. Is the component properly registered with the registry?
2. Is the cell assignment being updated correctly?
3. Are you using proper keys to identify components?
4. Is the component wrapped in `<keep-alive>`?

### Device Not Displaying

If a device doesn't appear:

1. Check the cell assignment in the registry
2. Verify the component exists for that device type
3. Make sure the component is being rendered correctly

## Migration Guide

If you're migrating existing code to use the registry:

1. Replace direct component imports with registry lookups
2. Update component creation to use registry.registerDevice()
3. Replace v-if toggles with visibility handled by the registry
4. Ensure proper keep-alive usage

## Conclusion

The Component Registry Pattern significantly improves performance and user experience by maintaining component state across layout changes. By creating components only once and intelligently managing their visibility, we reduce unnecessary mounting/unmounting and preserve valuable state information.

For more detailed information, see the [Component Registry Architecture](./architecture/component-registry-pattern.md) documentation.
