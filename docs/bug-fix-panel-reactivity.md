# Panel Layout Reactivity Bug Fix

## Original Issue

When switching between layouts in the Panel Layout View, device components were being recreated, causing them to lose their internal state. Specifically:

1. User would assign a device to a cell (e.g., Camera)
2. User would change layouts
3. The component would show logs like `[CameraExposureControl] Device ID changed from undefined to 192.168.4.169:8080:camera:0`
4. The component would have to reinitialize, losing any transient state

The logs indicated that the components were completely unmounting and remounting, even though the underlying data assignments in `deviceMap` and `cellDeviceAssignments` were being properly preserved.

## Attempted Solutions

### Attempt 1: Remove Key from LayoutContainer

The first approach was to remove the `:key="currentLayoutId"` binding from the LayoutContainer component:

```vue
<LayoutContainer :layout-id="currentLayoutId" :class="{ 'layout-behind-maximized': maximizedPanelId !== null }"></LayoutContainer>
```

This prevented the entire container from being recreated, but child components were still being recreated.

### Attempt 2: Use Keep-Alive with Component Keys

We added `<keep-alive>` around the device components and gave them stable keys based on device ID rather than position:

```vue
<keep-alive>
  <SimplifiedCameraPanel 
    v-if="..."
    :key="`global-camera-${deviceId}`"
    ...
  />
</keep-alive>
```

This helps Vue identify the same component across renders and preserve its state in the cache.

### Attempt 3: Improve Layout Change Logic

We modified the layout change watcher to preserve existing device assignments where possible:

```javascript
// Instead of replacing all assignments, update only the new positions
Object.entries(initialCellAssignments).forEach(([cellId, deviceId]) => {
  cellDeviceAssignments.value[cellId] = deviceId
})
```

This approach prevents unnecessarily changing device assignments when switching layouts.

## Current Implementation

The final implementation combines these approaches:

1. No key on the `LayoutContainer` to prevent full recreation
2. `<keep-alive>` wrapping device components to preserve component instances
3. Stable and globally unique keys for device components
4. Optimized assignment logic that preserves existing selections

## Remaining Issues

1. Linter warnings about unused variables:

   - `getDeviceForCell` function is defined but not used
   - `existingAssignments` is assigned but not used in the watcher

2. There is code duplication in the component registry pattern we started to implement.

3. The component still needs to be tested with more complex device state and interactions to ensure all state is preserved correctly.

## Next Steps

1. Clean up unused variables and functions
2. Consider refactoring to a more robust component registry pattern
3. Add targeted unit tests for layout switching to prevent regression
4. Profile component initialization to ensure performance is maintained
