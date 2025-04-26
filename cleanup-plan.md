# Cleanup Plan for Alpaca Web Project

## Current Tasks

- 🏃‍♂️ Testing components with the adapter approach
- 🏃‍♂️ Verifying connectivity and discovery flows with the new store architecture
- 🏃‍♂️ Ensuring type compatibility across the codebase

## Completed Tasks

- ✅ Created initial cleanup plan
- ✅ Analyzed current architecture and identified areas for improvement
- ✅ Developed new unified store: `useAstroDeviceStore.ts`
- ✅ Created compatibility layer in `deviceStoreAdapter.ts`
- ✅ Updated `DiscoveredDevices.vue` component to use the adapter approach
- ✅ Updated `MainPanels.vue` component to use the adapter approach
- ✅ Updated `AppSidebar.vue` component to use the adapter approach
- ✅ Updated `DiscoveryView.vue` component to use the adapter approach
- ✅ Extended adapter with discovery-related methods

## Implementation Progress

### Store Unification

- ✅ Created new unified store: `useAstroDeviceStore.ts`
- ✅ Implemented core device methods and state
- ✅ Added telescope-specific methods
- ✅ Added camera-specific methods
- 🏃‍♂️ Testing the store across different components

### Component Migration

- ✅ Created compatibility layer in `deviceStoreAdapter.ts`
- ✅ Updated DiscoveredDevices component
- ✅ Updated MainPanels component
- ✅ Updated AppSidebar component
- ✅ Updated DiscoveryView component
- 🏃‍♂️ Working on remaining components that use device stores

### Device Discovery Integration

- ✅ Implemented device discovery methods in the unified store
- ✅ Adapted discovery view to work with the new store
- ✅ Extended adapter to support discovery-related methods
- 🏃‍♂️ Testing discovery and connection flows

## Next Steps

1. Update remaining components to use the adapter approach:
   - [ ] DevicesView
   - [ ] DeviceDetailView
   - [ ] Adapter components
2. Test adapter implementation thoroughly
3. Refine device type system for better type safety
4. Document the migration approach for future reference

## Identified Issues

### Type Safety Issues

- **Issue**: The original stores have minimal typing for device state and methods
- **Solution**: Created strongly typed interfaces in the new store but need to maintain compatibility
- **Solution**: Created adapter in `deviceStoreAdapter.ts` that provides compatibility functions to translate between old and new formats

### Store Fragmentation

- **Issue**: Device data is spread across multiple stores without clear boundaries
- **Solution**: Unified store centralizes all device-related functionality
- **Solution**: Legacy adapter provides backward compatibility

## Compatibility Strategy

### Supporting Legacy Devices

1. **Type Conversion**: Convert between legacy device types and new device interfaces
2. **Method Adaptation**: Provide compatibility methods that work with both formats
3. **Progressive Migration**: Allow components to gradually adopt the new store

### Support Methods

- `legacyDeviceToNew()`: Convert legacy device to new format
- `createLegacyDevice()`: Create legacy device instance from type and properties
- `useLegacyDeviceStore()`: Provide a store that looks like the old one but uses the new store behind the scenes
- `getLegacyDevicesAdapter()`: Get a simpler adapter just for the devices collection

## Phase 2 Planning

Once all components are using the adapter successfully:

1. **Direct Store Usage**: Modify components to use the new store directly instead of through adapters
2. **API Simplification**: Remove unnecessary compatibility methods
3. **Cleanup Old Stores**: Remove old store files when no longer referenced
4. **Refine Type System**: Strengthen type checking across the application

This approach allows for incremental improvements while maintaining a working application throughout the transition.
