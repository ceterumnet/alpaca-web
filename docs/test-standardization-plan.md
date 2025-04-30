# Test Standardization Plan

## Current Issues

1. **Duplicate tests** in different locations:

   - AppSidebarMigrated is tested in both:
     - `./tests/components/AppSidebarMigrated.test.ts`
     - `./src/tests/unit/AppSidebarMigrated.test.ts`
   - BaseDevicePanel is tested in both:
     - `./tests/components/BaseDevicePanel.test.ts`
     - `./src/tests/unit/BaseDevicePanel.test.ts`
   - DiscoveredDevicesMigrated is tested in both:
     - `./tests/components/devices/DiscoveredDevicesMigrated.test.ts`
     - `./src/tests/unit/DiscoveredDevicesMigrated.test.ts`

2. **Inconsistent naming conventions**:

   - Some files use `.test.ts` and others use `.spec.ts`

3. **Inconsistent directory structure**:
   - Some component tests are in `./tests/components/`
   - Others are in subdirectories like `./tests/components/devices/`, `./tests/components/forms/`, `./tests/components/layout/`
   - Some are in `./src/tests/unit/`
   - Views are tested in `./src/views/__tests__/`

## Standardization Rules

1. **File Naming Convention**:

   - All test files will use the `.test.ts` extension for consistency
   - Test filenames will match component names exactly: `ComponentName.test.ts`

2. **Directory Structure**:

   - All component tests will reside in the `./tests/components/` directory with appropriate subdirectories:
     - `./tests/components/devices/` - Device-specific components
     - `./tests/components/forms/` - Form components
     - `./tests/components/layout/` - Layout components (sidebars, navigation, etc.)
     - `./tests/components/ui/` - UI components
   - All view tests will reside in `./tests/views/`
   - All store tests will reside in `./tests/stores/`
   - All integration tests will reside in `./tests/integration/`

3. **Import Paths**:
   - Use relative paths for imports
   - Use consistent path format (`../../../src/components/...`)
   - Update any references to moved test files

## Implementation Steps

1. **Analysis and Comparison**:

   - For each duplicate test file, compare the contents and identify the most comprehensive version
   - Check test coverage to ensure we don't lose test coverage during consolidation

2. **Consolidation**:

   - Remove duplicate test files after copying any unique tests to the consolidated version
   - Use git to track changes and ensure we don't lose any testing functionality

3. **Standardization**:

   - Rename `.spec.ts` files to `.test.ts` for consistency
   - Move tests to their appropriate directories following the directory structure standard

4. **Path Fixing**:

   - Update import paths in all moved files to point to the correct locations
   - Fix import paths in view tests to point to the correct component files in src/views
   - Fix path references in integration and component tests

5. **Verification**:
   - Run all tests to ensure they pass after consolidation
   - Check for broken imports or references
   - Verify test coverage is maintained or improved

## Files to Process

### Duplicate Files to Consolidate

1. AppSidebarMigrated:

   - Keep: `./tests/components/AppSidebarMigrated.test.ts`
   - Remove: `./src/tests/unit/AppSidebarMigrated.test.ts`

2. BaseDevicePanel:

   - Keep: `./tests/components/BaseDevicePanel.test.ts`
   - Remove: `./src/tests/unit/BaseDevicePanel.test.ts`

3. DiscoveredDevicesMigrated:
   - Keep: `./tests/components/devices/DiscoveredDevicesMigrated.test.ts`
   - Remove: `./src/tests/unit/DiscoveredDevicesMigrated.test.ts`

### Files to Rename (from .spec.ts to .test.ts)

1. `./tests/components/EnhancedCameraPanelMigrated.spec.ts` → `./tests/components/EnhancedCameraPanelMigrated.test.ts`
2. `./tests/stores/SidebarStore.spec.ts` → `./tests/stores/SidebarStore.test.ts`
3. `./tests/stores/UnifiedStore.spec.ts` → `./tests/stores/UnifiedStore.test.ts`
4. `./src/views/__tests__/DeviceDetailViewMigrated.spec.ts` → `./tests/views/DeviceDetailViewMigrated.test.ts`
5. `./src/views/__tests__/DevicePageMigrated.spec.ts` → `./tests/views/DevicePageMigrated.test.ts`
6. `./src/views/__tests__/ImageAnalysisMigrated.spec.ts` → `./tests/views/ImageAnalysisMigrated.test.ts`

### Files to Move

1. Move `./src/tests/integration/CompleteWorkflow.test.ts` → `./tests/integration/CompleteWorkflow.test.ts`
2. Move `./src/tests/integration/DeviceControlFlow.test.ts` → `./tests/integration/DeviceControlFlow.test.ts`
3. Move `./src/tests/unit/ComponentRendering.test.ts` → `./tests/components/ComponentRendering.test.ts`
4. Move `./src/tests/unit/StoreAdapter.test.ts` → `./tests/stores/StoreAdapter.test.ts`

### Path Fixes Required

1. View test files:

   - Fix imports in `./tests/views/DeviceDetailViewMigrated.test.ts` to point to `../../src/views/DeviceDetailViewMigrated.vue`
   - Fix imports in `./tests/views/DevicePageMigrated.test.ts` to point to `../../src/views/DevicePageMigrated.vue`
   - Fix imports in `./tests/views/ImageAnalysisMigrated.test.ts` to point to `../../src/views/ImageAnalysisMigrated.vue`

2. Store adapter test:

   - Fix imports in `./tests/stores/StoreAdapter.test.ts` to point to `../../src/stores/UnifiedStore`

3. Integration tests:

   - Fix imports in `./tests/integration/CompleteWorkflow.test.ts` to use correct path for store imports
   - Fix imports in `./tests/integration/DeviceControlFlow.test.ts` to use correct path for store imports

4. Component rendering test:
   - Fix imports in `./tests/components/ComponentRendering.test.ts` to use correct paths

## Expected Outcome

After completing this standardization:

1. No duplicate test files will exist
2. All test files will follow the `.test.ts` naming convention
3. Files will be organized in a logical directory structure
4. Test imports will be consistent and working properly
5. All tests will pass, maintaining the same level of test coverage

## Status

- ✅ Moved all test files to their standardized locations
- ✅ Renamed all `.spec.ts` files to `.test.ts`
- ✅ Removed duplicate test files
- ✅ Fixed AppSidebarMigrated.test.ts to pass all tests
- ✅ Fixed import paths in the view test files:
  - DeviceDetailViewMigrated.test.ts
  - DevicePageMigrated.test.ts
  - ImageAnalysisMigrated.test.ts
- ✅ Fixed import paths in the store test:
  - StoreAdapter.test.ts
- ✅ Fixed import paths in the integration tests:
  - CompleteWorkflow.test.ts
  - DeviceControlFlow.test.ts
- ✅ Fixed import paths in ComponentRendering.test.ts

## Next Steps

1. Run the full test suite to verify all test files pass with the updated imports
2. Update the component-summary.md document to mark item #5 as complete
3. Consider creating a script to automate similar path fixes for future directory reorganizations
