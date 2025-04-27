# AppSidebar.vue Migration Plan

## Overview

This document outlines the steps for migrating AppSidebar.vue to use the UnifiedStore directly instead of going through the SidebarStore adapter. This is the final component in Batch 1 of our Phase 2 migration plan.

## Current Implementation

The current AppSidebar.vue:

- Uses the SidebarStore for state management
- Displays devices with connection status
- Provides theme toggling functionality
- Includes sidebar visibility toggling

## Migration Steps

### 1. Examine AppSidebarMigrated.vue

We already have AppSidebarMigrated.vue in the codebase, which appears to be a migrated version of AppSidebar.vue. We need to:

- Verify that it uses UnifiedStore directly
- Ensure it has all the functionality of the original component
- Check for any missing features or UI differences

### 2. Update Tests for AppSidebarMigrated.vue

We need to create comprehensive tests for AppSidebarMigrated.vue to ensure it functions correctly:

- Device listing tests
- Sidebar visibility toggle tests
- Theme toggling tests (if applicable)
- Event handling tests

### 3. Integration Testing

Once AppSidebarMigrated.vue is verified, we need to test it with other migrated components:

- Test interaction with BaseDevicePanel.vue
- Test with EnhancedPanelComponentMigrated.vue
- Verify UI consistency across components

### 4. Final Steps

- Update phase2-migration-schedule.md to mark AppSidebar.vue as complete
- Update cleanup-plan.md with latest progress
- Update summary.md with new progress section
- Prepare for Batch 2 migration planning

## Timeline

- Verification of AppSidebarMigrated.vue: 2 hours
- Test development: 3 hours
- Integration testing: 2 hours
- Documentation updates: 1 hour

## Dependencies

- UnifiedStore.ts
- useUIPreferencesStore.ts
- Already migrated components for integration testing

## Expected Results

- AppSidebarMigrated.vue successfully using UnifiedStore
- Comprehensive test suite for validation
- Verified integration with other migrated components
- Updated documentation reflecting progress
- Batch 1 of Phase 2 migration completed (100%)
