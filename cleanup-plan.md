# Cleanup Plan for Alpaca Web Project

## Current Tasks

- 🏃‍♂️ Testing components with the adapter approach
- 🏃‍♂️ Verifying connectivity and discovery flows with the new store architecture
- ✅ Creating comprehensive test cases for the adapter approach
- 🏃‍♂️ Converting JavaScript implementations to TypeScript

## Completed Tasks

- ✅ Created initial cleanup plan
- ✅ Analyzed current architecture and identified areas for improvement
- ✅ Developed new unified store: `useAstroDeviceStore.ts`
- ✅ Created compatibility layer in `deviceStoreAdapter.ts`
- ✅ Updated `DiscoveredDevices.vue` component to use the adapter approach
- ✅ Updated `MainPanels.vue` component to use the adapter approach
- ✅ Updated `AppSidebar.vue` component to use the adapter approach
- ✅ Updated `DiscoveryView.vue` component to use the adapter approach
- ✅ Updated `DevicesView.vue` component to use the adapter approach
- ✅ Updated `DeviceDetailView.vue` component to use the adapter approach
- ✅ Updated adapter components to use the legacy device store adapter:
  - ✅ `BaseDeviceAdapter.vue`
  - ✅ `TelescopePanelAdapter.vue`
  - ✅ `CameraPanelAdapter.vue`
- ✅ Extended adapter with discovery-related methods
- ✅ Addressed type compatibility issues in EnhancedDiscoveryPanel component
- ✅ Created a comprehensive testing plan for the adapter implementation
- ✅ Moved JavaScript store implementation from /store to /src/stores
- ✅ Converted JavaScript store and adapter to TypeScript
- ✅ Created TypeScript test files and proper test structure

## Implementation Progress

### Store Unification

- ✅ Created new unified store: `useAstroDeviceStore.ts`
- ✅ Implemented core device methods and state
- ✅ Added telescope-specific methods
- ✅ Added camera-specific methods
- ✅ Implemented type-safe device interfaces
- ✅ Created TypeScript version of the unified store: `UnifiedStore.ts`
- 🏃‍♂️ Testing the store across different components

### Component Migration

- ✅ Created compatibility layer in `deviceStoreAdapter.ts`
- ✅ Updated DiscoveredDevices component
- ✅ Updated MainPanels component
- ✅ Updated AppSidebar component
- ✅ Updated DiscoveryView component
- ✅ Updated DevicesView component
- ✅ Updated DeviceDetailView component
- ✅ Updated adapter components
- ✅ Testing all components with the adapter
- ✅ Created TypeScript version of the adapter: `StoreAdapter.ts`

### Device Discovery Integration

- ✅ Implemented device discovery methods in the unified store
- ✅ Adapted discovery view to work with the new store
- ✅ Extended adapter to support discovery-related methods
- ✅ Fixed type compatibility issues between UI and store
- 🏃‍♂️ Testing discovery and connection flows

### Testing Implementation

- ✅ Created comprehensive test plan document
- ✅ Created TypeScript test files with proper types
- ✅ Organized tests in a proper directory structure
- ✅ Created unit tests for the adapter functionality
- ✅ Created component compatibility tests
- ✅ Executing test cases for discovery flow
- ✅ Testing device management flows
- ✅ Verifying type compatibility throughout the application

## Next Steps

1. ✅ Update remaining components to use the adapter approach:
   - ✅ DevicesView
   - ✅ DeviceDetailView
   - ✅ Adapter components
2. ✅ Address type compatibility issues in EnhancedDiscoveryPanel component
3. ✅ Create comprehensive test cases for the adapter approach
4. ✅ Test adapter implementation thoroughly based on the test plan
5. ✅ Convert store and adapter implementations to TypeScript
6. 🏃‍♂️ Refine device type system for better type safety
7. 🏃‍♂️ Document the migration approach for future reference
8. 🏃‍♂️ Create integration tests for full app flows

## Identified Issues

### Type Safety Issues

- **Issue**: The original stores have minimal typing for device state and methods
- **Solution**: Created strongly typed interfaces in the new store but need to maintain compatibility
- **Solution**: Created adapter in `deviceStoreAdapter.ts` that provides compatibility functions to translate between old and new formats
- **Solution**: Added type conversions in the adapter to ensure UI components receive properly typed data
- **Solution**: Converted JavaScript implementations to TypeScript with proper type definitions

### Store Fragmentation

- **Issue**: Device data is spread across multiple stores without clear boundaries
- **Solution**: Unified store centralizes all device-related functionality
- **Solution**: Legacy adapter provides backward compatibility
- **Solution**: Moved all store implementations to /src/stores directory for consistency

## Compatibility Strategy

### Supporting Legacy Devices

1. **Type Conversion**: Convert between legacy device types and new device interfaces
2. **Method Adaptation**: Provide compatibility methods that work with both formats
3. **Progressive Migration**: Allow components to gradually adopt the new store
4. **Type Adaptation**: Ensure component expectations are met by adapting types at the interface level
5. **TypeScript Integration**: Ensure all types are properly defined and used throughout the codebase

### Support Methods

- `legacyDeviceToNew()`: Convert legacy device to new format
- `createLegacyDevice()`: Create legacy device instance from type and properties
- `useLegacyDeviceStore()`: Provide a store that looks like the old one but uses the new store behind the scenes
- `getLegacyDevicesAdapter()`: Get a simpler adapter just for the devices collection
- `adaptDiscoveredDevices()`: Ensures discovered devices match the UI component expectations

## Phase 2 Planning

Once all components are using the adapter successfully:

1. **Direct Store Usage**: Modify components to use the new store directly instead of through adapters
2. **API Simplification**: Remove unnecessary compatibility methods
3. **Cleanup Old Stores**: Remove old store files when no longer referenced
4. **Refine Type System**: Strengthen type checking across the application
5. **Full TypeScript Migration**: Complete migration to TypeScript for all components
6. **Test Coverage**: Expand test coverage to include all critical paths

This approach allows for incremental improvements while maintaining a working application throughout the transition.
