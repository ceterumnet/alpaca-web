# Layout System Refactor & Simplification – Summary

## Goals

- Provide a user-friendly way to select from a set of static, pre-defined layouts (“Simple” mode).
- Retain the existing advanced/custom layout builder (“Advanced” mode).
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
- Device assignment is handled by the panels themselves, not the layout chooser.

### 5. **Type Safety & Linting**

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

---

## Known Issues

- **Layout List Inconsistency**: After selecting a simple layout and switching back to advanced mode, the simple layout appears in the list of layouts in advanced mode.
- **Panel Content**: Panels currently do not display device content properly.
  - Need to do a deep analysis on
- **Layout Rendering Issues**: Several layout rendering problems persist.
  - Notes: I think that we need to look at aw-layout-container_grid and the grid-template-rows css.
  - **1x2 Layout**: The cells are only rendering to half of the available screen real estate - I think this is related to the grid-template-rows CSS value
  - **3x2 Layout**: The bottom 2 cells are very short
- **Layout Store Issues**: Everytime a layout is selected, it creates an entry in the drop down for the simple layout selection

## Implemented Fixes

- **Layout Reactivity**: Fixed the reactivity issue when switching between layouts in simple mode. Layouts now update immediately without requiring a page refresh.
- **Layout Container**: Enhanced the LayoutContainer component to better handle layout changes by adding keys for proper re-rendering.
- **Component Synchronization**: Improved coordination between the NavigationBar, PanelLayoutView, and LayoutContainer components to ensure consistent layout updates.
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

---

## Files Involved in the Layout System Refactor

- `src/components/layout/StaticLayoutChooser.vue` — Static layout chooser and thumbnail logic
- `src/components/layout/NavigationBar.vue` — Main navigation bar, layout control logic, modal overlay for simple mode
- `src/components/ui/SettingsPanel.vue` — Settings panel, toggle for layout selection mode
- `src/stores/useUIPreferencesStore.ts` — UI preferences store, layout selection mode persistence
- `src/views/PanelLayoutView.vue` — Main panel layout view, integration with layout system
- `src/types/layouts/LayoutDefinition.ts` — Core type definitions for layouts, rows, and cells
- `LAYOUT_SYSTEM_REFACTOR_SUMMARY.md` — This summary and documentation

---

**This summary reflects the current state of the layout system refactor and simplification as of this update.**
