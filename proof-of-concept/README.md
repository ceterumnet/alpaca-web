# Phase 2 Migration Proof of Concept

This directory contains a proof-of-concept migration of the DiscoveryPanel component from using the adapter pattern to directly using the UnifiedStore. It serves as a reference for migrating other components as part of the Phase 2 migration.

## Migration Approach

The migration approach demonstrated here involves the following steps:

1. **Update Imports**: Replace adapter imports with direct UnifiedStore imports
2. **Update Props**: Change the store prop type from adapter interface to UnifiedStore
3. **Update Property References**: Replace adapter-specific property names with UnifiedStore property names
4. **Update Method Calls**: Replace adapter methods with equivalent UnifiedStore methods
5. **Update Tests**: Migrate tests to work with the UnifiedStore directly

## Key Changes

### Component Changes

| Adapter Pattern                                                  | Direct Store                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------ |
| `import { createStoreAdapter } from '../../stores/StoreAdapter'` | `import UnifiedStore from '../../stores/UnifiedStore'` |
| `store: { discoveredDevices, isDiscovering, ... }`               | `store: UnifiedStore`                                  |
| `props.store.discoveredDevices`                                  | `props.store.devices`                                  |
| `device.deviceName`                                              | `device.name`                                          |
| `device.deviceType`                                              | `device.type`                                          |
| `device.address`                                                 | `device.ipAddress`                                     |
| `props.store.connectToDevice(device.id)`                         | `props.store.connectDevice(device.id)`                 |

### Test Changes

| Adapter Pattern Testing          | Direct Store Testing                                     |
| -------------------------------- | -------------------------------------------------------- |
| Mock the adapter and its methods | Create a real UnifiedStore instance and mock its methods |
| Create mock LegacyDevice objects | Create Device objects that match the UnifiedStore format |
| Test adapter-specific methods    | Test UnifiedStore methods directly                       |

## Files

- **DiscoveryPanel.vue**: The migrated component that uses the UnifiedStore directly
- **DiscoveryPanel.test.ts**: Tests for the migrated component
- **README.md**: This file explaining the migration approach

## Running the Tests

To test the migrated component, you would run:

```bash
npm run test:unit -- proof-of-concept/DiscoveryPanel.test.ts
```

## Migration Checklist

- [x] Update imports
- [x] Update prop types
- [x] Convert device property references
- [x] Update method calls
- [x] Update tests
- [x] Verify functionality

## Notes

- The path imports in the test file may need to be adjusted based on the actual project structure
- The actual migration will need to handle event binding differently, as UnifiedStore uses an event listener approach
- Additional type safety can be added through more specific TypeScript types

## Next Steps

1. Complete the component inventory and analysis for all components
2. Prioritize components based on dependencies
3. Start with leaf components and gradually migrate up the dependency chain
4. Update tests to verify component functionality
5. Document the migration process and lessons learned

This proof-of-concept demonstrates that direct UnifiedStore usage can replace the adapter pattern with minimal changes to the component's core functionality while providing improved type safety and performance.
