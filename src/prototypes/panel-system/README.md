# Alpaca Web Panel System Prototype

This prototype demonstrates a new approach to panel layout and management in Alpaca Web, replacing the current grid-layout system with a more flexible and intuitive interface.

## Features Implemented

### Core Layout System

- Template-based layouts for different workflows (imaging, telescope control, monitoring)
- Interactive workspace with smart panel positioning
- Context-aware panels that adapt to the current task
- Placeholder areas that suggest optimal device placement
- Panel highlighting and status indicators

### Custom Layout Builder

- Visual grid editor for creating custom layouts
- Ability to add, remove, and configure cells
- Device type assignment with visual indicators
- Priority-based responsive design (primary, secondary, tertiary panels)
- Live preview of layouts on desktop, tablet, and mobile screens
- Export layouts as JSON files
- Visual CSS code preview

### Responsive Design

- Layouts adapt intelligently to screen size
- Priority-based stacking on smaller screens
- Smart allocation of screen real estate
  - Primary panels get most space
  - Secondary panels are still visible but smaller
  - Tertiary panels collapse on small screens

### Device-Specific Layout Systems

While layouts share which device panels are included, it's important to note that the actual positioning and arrangement of panels should be configurable separately for each device type:

- Desktop layouts: Optimized for large screens with multi-column arrangements
- Tablet layouts: Adapted for medium screens with simplified positioning
- Mobile layouts: Completely reorganized for vertical scrolling on small screens

This separation ensures that layouts aren't just scaled-down versions of each other but are purposefully designed for each form factor. Panel inclusion remains consistent across devices (e.g., if a Camera panel is in the desktop layout, it should also be in the tablet and mobile layouts), but their arrangement, size, and priority-based visibility can differ significantly.

The Custom Layout Builder should be enhanced to allow separate configuration of panel positioning for each device type while maintaining the included panels across all form factors.

## Architecture

The prototype is built with these key components:

1. `PanelSystemPrototype.vue` - Main container for the prototype
2. Components:
   - `DevicePalette.vue` - Sidebar with available devices
   - `WorkspacePanel.vue` - Individual device panels
   - `LayoutControls.vue` - Layout template selector
   - `CustomLayoutBuilder.vue` - Advanced layout editor

The prototype is isolated from the main application to allow for experimentation without affecting the core system.

## Using the Prototype

### Standard Layouts

1. Visit `/panel-system-prototype` in your browser
2. Choose a layout template (Imaging, Telescope Control, Monitoring)
3. Click "Edit Layout" to enter edit mode
4. Drag devices from the palette to the corresponding placeholders
5. Exit edit mode to interact with panels

### Custom Layout Builder

1. From the main prototype view, select "Custom Layout" template
2. Use the grid dimensions controls to set your desired grid size
3. Add and remove cells using the Cell Management section
4. Click on cells to edit their properties:
   - Name
   - Device type
   - Priority (primary, secondary, tertiary)
   - Size (row span, column span)
5. Preview your layout in different viewport sizes (desktop, tablet, mobile)
6. Export your layout as JSON using the Export button
7. Return to templates using the "Return to Templates" button

## Implementation Notes

### Component Communication

- Components use props for downward data flow and events for upward communication
- Reactive state is used for real-time updates

### CSS Grid

- The prototype uses CSS Grid for layout management instead of grid-layout-plus
- This provides better performance and more flexibility for responsive designs
- Grid areas are dynamically assigned based on the layout template

### Responsive Strategy

- We use a priority-based approach rather than just shrinking everything:
  - Primary panels (always visible, get most space)
  - Secondary panels (visible on most screens)
  - Tertiary panels (may collapse on small screens)
- Media queries handle major layout shifts

## Next Steps

### Potential Enhancements

- Layout import functionality for saved layouts
- Drag and drop for cell positioning in the custom builder
- More sophisticated preview mode showing actual device panels
- Panel memory (remembering last used controls/settings)
- Persistent layout saving to user profile
- Advanced layout sharing options

### Integration Plan

Once approved, integration into the main application would involve:

1. Moving the components to the main source tree
2. Connecting to the actual device stores
3. Creating layout persistence
4. Replacing the current grid system
5. Adding migration path for existing layouts

## Testing Notes

The prototype can be tested with:

```bash
npm run dev
```

Then navigate to `/panel-system-prototype` in your browser.

When testing is complete, this isolated prototype directory can be safely removed.
