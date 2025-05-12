# Layout System Refactor & Simplification – Summary

## Goals

- Provide a user-friendly way to select from a set of static, pre-defined layouts ("Simple" mode).
- Retain the existing advanced/custom layout builder ("Advanced" mode).
- Allow users to toggle between these modes in the application settings.
- Ensure the layout selection UI is clean, modern, and integrated into the main navigation bar.
- Decouple device assignment from the layout selection process (panels handle device selection).

---

## Key Changes

### 1. **Static Layout Chooser**

- Created a set of static layout templates (2x2, 1x2, 3x2, hybrid 50/50, hybrid 60/40).
- Each layout is defined as a grid (rows, columns, cell structure).
- Device assignment is not part of the layout selection; panels handle device selection.

### 2. **Settings Toggle**

- Added a toggle in the Settings panel (under the "Layout" tab) to switch between:
  - **Simple**: Choose from static layouts.
  - **Advanced**: Use the custom layout builder.
- The toggle is persisted in the UI preferences store and localStorage.

### 3. **Navigation Bar Integration**

- The layout control in the navigation bar now adapts based on the selected mode:
  - **Simple Mode**:
    - Shows a "Choose Layout" button.
    - Clicking the button opens a centered modal overlay with all static layout thumbnails.
    - Clicking a thumbnail immediately applies the layout and closes the modal.
  - **Advanced Mode**:
    - Shows the existing dropdown for custom layouts, with actions for editing, deleting, and setting default layouts.

### 4. **PanelLayoutView & Device Assignment**

- No extra layout controls or modals in the main panel view.
- Device assignment is handled through universal device selectors in each panel.
- Each cell in the layout can display any type of device panel based on user selection.

### 5. **Universal Panel System**

- Added a flexible panel system that dynamically renders the appropriate component based on device type.
- Each cell now features a device selector dropdown with all available devices.
- Panels automatically adapt to show the correct device interface based on the selected device.
- Device selections are persisted when switching between layouts.

### 6. **Type Safety & Linting**

- All new code is type-safe and linter-clean.
- Interfaces for layouts and cells are used throughout.

---

## User Experience

- **Switching Modes**:  
  Users can toggle between Simple and Advanced layout selection in Settings.
- **Simple Mode**:
  - Click "Choose Layout" in the Nav bar.
  - See a modal with layout thumbnails.
  - Click a layout to apply it instantly.
- **Advanced Mode**:
  - Use the dropdown and actions in the Nav bar to manage custom layouts.
- **Device Selection**:
  - Each panel has its own device selector dropdown.
  - Select any device from the dropdown to display its control interface.
  - Device types are automatically detected and the appropriate panel component is rendered.

---

## Known Issues

- **Layout List Inconsistency**: After selecting a simple layout and switching back to advanced mode, the simple layout appears in the list of layouts in advanced mode.
- **Layout Rendering Issues**: Several layout rendering problems persist.
  - Notes: We need to look at aw-layout-container_grid and the grid-template-rows css.
  - **1x2 Layout**: The cells are only rendering to half of the available screen real estate - likely related to the grid-template-rows CSS value
  - **3x2 Layout**: The bottom 2 cells are very short
- **Layout Store Issues**: Every time a layout is selected, it creates an entry in the drop down for the simple layout selection

## Implemented Fixes

- **Layout Reactivity**: Fixed the reactivity issue when switching between layouts in simple mode. Layouts now update immediately without requiring a page refresh.
- **Layout Container**: Enhanced the LayoutContainer component to better handle layout changes by adding keys for proper re-rendering.
- **Component Synchronization**: Improved coordination between the NavigationBar, PanelLayoutView, and LayoutContainer components to ensure consistent layout updates.
- **Panel Content Display**: Implemented a universal device selection system that allows any cell to display any type of device panel:
  - Added device type propagation from cells to panel positions
  - Created cell-to-device assignments to track which devices are shown in which cells
  - Implemented automatic device initialization based on layout device types
  - Added dynamic panel rendering based on device type
  - Improved empty state handling for unassigned cells
- **Hybrid Layout Improvements**:
  - Modified convertStaticToRows function to properly handle cells with rowSpan
  - Enhanced gridToPositionLayout to track occupied positions
  - Added special handling for bottom-right cell in hybrid layouts
  - Added explicit styles and debugging information to improve rendering
  - Despite these improvements, some rendering issues persist (see Known Issues)

---

## Next Steps / Future Improvements

- Address current layout rendering issues across all layout types
- Add thumbnail previews to the advanced dropdown (optional).
- Allow editing or extending the set of static layouts.
- Further decouple device type from layout structure for even more flexibility.
- Add keyboard navigation or accessibility improvements to the modal.
- Implement device state persistence between sessions.
- Add support for more device types and custom panels.

---

## Files Involved in the Layout System Refactor

- `src/components/layout/StaticLayoutChooser.vue` — Static layout chooser and thumbnail logic
- `src/components/layout/NavigationBar.vue` — Main navigation bar, layout control logic, modal overlay for simple mode
- `src/components/layout/LayoutContainer.vue` — Layout grid container with panel positioning
- `src/components/ui/SettingsPanel.vue` — Settings panel, toggle for layout selection mode
- `src/stores/useUIPreferencesStore.ts` — UI preferences store, layout selection mode persistence
- `src/views/PanelLayoutView.vue` — Main panel layout view, integration with layout system, universal panel system
- `src/types/layouts/LayoutDefinition.ts` — Core type definitions for layouts, rows, and cells
- `LAYOUT_SYSTEM_REFACTOR_SUMMARY.md` — This summary and documentation

---

**This summary reflects the current state of the layout system refactor and simplification as of this update.**
