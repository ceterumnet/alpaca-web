# Alpaca Web Cleanup and Integration Plan

## Overview

This document outlines a plan to clean up and integrate the existing codebase with the enhanced UI components that were developed during the UI improvement phase. The goal is to establish a consistent architecture and eliminate redundancies while preserving the improved interface.

## Current State Analysis

### Identified Issues

1. **Duplicate Functionality**: We have multiple implementations of discovery and device management across different stores.
2. **Integration Gaps**: The enhanced UI components from `ui-examples` directory are not fully integrated with the core application.
3. **Event Handling Inconsistencies**: Some event emitters like the 'discover' event in EnhancedDiscoveryPanel may not be properly connected.
4. **Store Architecture**: We have both `useDevicesStore.ts` and `useDeviceStore.ts` with overlapping functionality.
5. **Component Hierarchy**: The relationship between components is not always clear, particularly with the panels system.

### Asset Organization

- **Core Components**: Located in `src/components/`
- **Enhanced UI Components**: Located in `src/components/ui-examples/`
- **Stores**: Multiple stores in `src/stores/` with overlapping responsibilities

## Action Plan

### 1. Store Consolidation (Priority: High)

- [ ] Merge `useDevicesStore.ts` and `useDeviceStore.ts` into a single store
  - Base the unified store on `useDeviceStore.ts` which has more functionality
  - Ensure all components reference this consolidated store
- [ ] Create a comprehensive device interface that is:
  - Device type-specific functionality into separate composables or store modules
  - Complete: Contains all necessary properties for all device types
  - Consistent: Uses standardized property naming and typing
  - Well-documented: Includes JSDoc comments explaining each property and method
  - Extensible: Allows for different device types without code duplication
- [ ] Implement specialized device type modules within the store:
  - Create a base device module with shared functionality
  - Add specialized modules for telescopes, cameras, and other device types
  - Use composition patterns to avoid inheritance issues
- [ ] Implement a clean state management approach:
  - Clearly separate state, getters, actions, and mutations
  - Use TypeScript to ensure type safety throughout
  - Add proper reactive state management for real-time updates

### 2. Device Discovery Integration (Priority: High)

- [ ] Ensure the `DiscoveredDevices.vue` component properly works with `EnhancedDiscoveryPanel.vue`
- [ ] Fix the discover event flow:
  - Verify `DiscoveryView.vue` properly handles the `@discover` event from `EnhancedDiscoveryPanel`
  - Ensure `handleDiscover()` correctly triggers the discovery process
- [ ] Create a consistent device discovery service/API to be used by both components

### 3. UI Component Migration (Priority: Medium)

- [ ] Move valuable components from `ui-examples` to the main component directories:
  - [ ] Migrate `EnhancedSidebar.vue` to `src/components/AppSidebar.vue`
  - [ ] Migrate `EnhancedDiscoveryPanel.vue` to `src/components/DiscoveryPanel.vue`
- [ ] Delete redundant components
- [ ] Update all imports and references to use the new component paths

### 4. Panel System Improvements (Priority: Medium)

- [ ] Refine `MainPanels.vue` to better integrate with enhanced panel components
- [ ] Standardize the props and emits between all panel components
- [ ] Ensure device type detection and component selection is consistent

### 5. API Interface Standardization (Priority: High)

- [ ] Create a consistent API service for Alpaca device communication
- [ ] Abstract device-specific API calls into device-type services
- [ ] Implement proper error handling and loading states for all API calls

### 6. TypeScript Type Definitions (Priority: Medium)

- [ ] Consolidate shared interfaces in a central location
- [ ] Ensure consistent naming and structure across all type definitions
- [ ] Add comprehensive type declarations for emits and props

### 7. Style and UI Consistency (Priority: Low)

- [ ] Create a UI component style guide
- [ ] Standardize CSS variable usage
- [ ] Implement consistent layout patterns and responsive behaviors

## Implementation Sequence

1. **Phase 1: Store Consolidation**

   - Complete store merging
   - Update all component imports
   - Test basic functionality

2. **Phase 2: Device Discovery Integration**

   - Fix discovery event handling
   - Ensure proper communication between discovery components
   - Test discovery and device addition process

3. **Phase 3: Component Migration**

   - Migrate enhanced UI components to main directories
   - Update references and imports
   - Deprecate redundant components

4. **Phase 4: Final Integration and Testing**
   - Complete API standardization
   - Implement comprehensive error handling
   - Test all main user flows

## Testing Plan

For each phase, ensure the following is tested:

1. **Device Discovery**:

   - Discovery process initiates correctly
   - Discovered devices display properly
   - Adding discovered devices works

2. **Device Connection**:

   - Connect/disconnect functions work
   - Connection state persists correctly
   - Error states are handled properly

3. **Device Control**:
   - Device-specific controls function correctly
   - State is maintained between operations
   - UI updates reflect device state changes

## Conclusion

This plan addresses the key issues identified in the current codebase while preserving the improvements made during the UI enhancement phase. By following this structured approach, we can create a more maintainable, consistent, and user-friendly application.

The highest priority is to address the store consolidation and device discovery integration, as these are foundational to the application's functionality. Once these are resolved, we can proceed with the more structural and aesthetic improvements.
