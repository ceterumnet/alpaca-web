# Maximize Panel Fix Implementation

## Background

After implementing the Component Registry Pattern to fix the panel layout reactivity issue, we discovered that the maximize panel functionality is broken. This document outlines the steps to fix this issue while maintaining compatibility with the component registry.

## Current Implementation Analysis

The current maximize panel implementation uses Vue's teleport feature to move components to a different container when maximized. This approach interferes with the component registry pattern which manages component instances and their visibility in a centralized way.

Key issues:

1. Teleport physically moves DOM elements, breaking registry's tracking
2. Two separate systems are managing component visibility and location
3. Component state preservation mechanisms conflict

## Implementation Plan

### 1. Update DeviceComponentRegistry

First, modify the DeviceComponentRegistry service to handle maximized state:

```typescript
// Add to DeviceComponentRef interface
interface DeviceComponentRef {
  // ... existing properties
  isMaximized: boolean;
}

// Add to DeviceComponentRegistry class
maximizeComponent(deviceId: string, deviceType: string, maximized: boolean): void {
  const normalizedType = deviceType.toLowerCase();
  const key = `${normalizedType}-${deviceId}`;

  // First ensure all components are not maximized
  if (maximized) {
    Object.values(this.registry.value).forEach(ref => {
      ref.isMaximized = false;
    });
  }

  // Then set this component's maximized state
  if (this.registry.value[key]) {
    this.registry.value[key].isMaximized = maximized;
    console.log(`[DeviceComponentRegistry] ${maximized ? 'Maximized' : 'Minimized'} component: ${normalizedType}-${deviceId}`);
  }
}

// Add getter for maximized component
getMaximizedComponent(): DeviceComponentRef | null {
  return Object.values(this.registry.value).find(ref => ref.isMaximized) || null;
}
```

### 2. Update PanelLayoutView.vue

Replace the teleport-based approach with a pure CSS approach:

```typescript
// Update toggleMaximizePanel function
const toggleMaximizePanel = (panelId: string) => {
  // Get device info for this panel
  const deviceId = cellDeviceAssignments.value[panelId]
  if (!deviceId) return

  const device = unifiedStore.getDeviceById(deviceId)
  if (!device || !device.type) return

  if (maximizedPanelId.value === panelId) {
    // Minimize panel
    maximizedPanelId.value = null
    deviceComponentRegistry.maximizeComponent(deviceId, device.type, false)
  } else {
    // Maximize panel
    maximizedPanelId.value = panelId
    deviceComponentRegistry.maximizeComponent(deviceId, device.type, true)
  }

  // Force a layout recalculation after toggling
  nextTick(() => {
    window.dispatchEvent(new Event('resize'))
  })
}
```

### 3. Modify Template Rendering

Update the template to use CSS for maximized view instead of teleport:

```html
<!-- Remove teleport -->
<!-- Keep all components in their original DOM positions but use CSS to control visibility -->
<div
  v-if="position"
  :id="`panel-${position.panelId}`"
  class="universal-panel-container"
  :class="{
    'panel-maximized': position.panelId === maximizedPanelId,
    'panel-behind-maximized': maximizedPanelId !== null && position.panelId !== maximizedPanelId
  }"
>
  <div class="panel-header">
    <h3>Cell {{position.panelId}}</h3>

    <div class="header-controls">
      <button class="maximize-panel-btn" @click="toggleMaximizePanel(position.panelId)">
        <span class="maximize-icon">{{ position.panelId === maximizedPanelId ? '□' : '⬚' }}</span>
      </button>

      <!-- Device selector dropdown -->
      <!-- ... existing code ... -->
    </div>
  </div>

  <div class="panel-content">
    <keep-alive>
      <template v-if="cellDeviceAssignments[position.panelId] && getComponentForCell(position.panelId)">
        <component
          :is="getComponentForCell(position.panelId)"
          :key="cellDeviceAssignments[position.panelId]"
          :device-id="cellDeviceAssignments[position.panelId]"
          :title="getDeviceTitle(position.panelId)"
          @device-change="(newDeviceId: string) => handleDeviceChange(getDeviceType(position.panelId), newDeviceId, position.panelId)"
        />
      </template>
      <div v-else class="empty-panel-state">
        <!-- ... existing code ... -->
      </div>
    </keep-alive>
  </div>
</div>
```

### 4. Update CSS Styles

Add CSS to handle the maximized view without teleport:

```css
/* Maximized panel style */
.panel-maximized {
  position: fixed !important;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background-color: var(--aw-panel-bg-color, #2a2a2a);
  width: 100% !important;
  height: 100% !important;
  grid-column: auto !important;
  grid-row: auto !important;
  transform: none !important;
  border-radius: 0 !important;
}

/* Style for panels behind a maximized panel */
.panel-behind-maximized {
  /* Keep in DOM but make nearly invisible */
  opacity: 0.01;
  pointer-events: none;
}

/* Adjust panel header in maximized view */
.panel-maximized .panel-header {
  padding: 12px;
  border-bottom: 1px solid var(--aw-panel-border-color, #444);
}

/* Adjust panel content in maximized view */
.panel-maximized .panel-content {
  height: calc(100% - 54px);
  overflow: auto;
}
```

### 5. Remove Overlay Container

Remove the now-unused maximized panel overlay container:

```html
<!-- Remove this section -->
<div v-show="maximizedPanelId !== null" class="maximized-panel-overlay">
  <div class="panel-header maximized-header">
    <h3>{{ maximizedPanelId }}</h3>
    <div class="header-controls">
      <button class="minimize-panel-btn" @click="toggleMaximizePanel(maximizedPanelId as string)">
        <span class="minimize-icon">□</span>
      </button>
    </div>
  </div>
  <!-- Container for the teleported content -->
  <div id="maximized-panel-container" class="maximized-panel-content"></div>
</div>
```

## Implementation Benefits

1. **State Preservation**: Components maintain state when maximized/minimized
2. **Registry Compatibility**: Works with the component registry pattern
3. **Simplified Logic**: Single system for managing component visibility
4. **Better Performance**: No DOM movement when maximizing panels

## Testing Plan

1. Verify that device components maintain state when maximized
2. Test switching between layouts with a maximized panel
3. Ensure only one panel can be maximized at a time
4. Verify that device controls work properly in maximized view

## Next Steps

After implementing these changes:

1. Test thoroughly to ensure maximize/minimize functionality works
2. Verify that component state is preserved through maximize/minimize cycles
3. Update documentation to reflect the new implementation approach

This approach will provide a more consistent user experience while maintaining the benefits of the component registry pattern.
