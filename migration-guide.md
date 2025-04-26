# Alpaca Web Migration Guide

## Introduction

This document provides guidance for migrating components from using the legacy device store approach to the new unified store architecture. The migration is designed to be incremental, allowing components to be updated one at a time without breaking existing functionality.

## Migration Phases

### Phase 1: Adapter Approach (Current)

In this phase, components continue to interact with what looks like the legacy store API, but behind the scenes, the adapter translates these calls to the new unified store.

### Phase 2: Direct Store Usage (Future)

In this phase, components will be updated to use the new unified store directly, eliminating the need for adapters.

## Component Migration Guide

### Step 1: Update Imports

Replace imports from the legacy store with the adapter:

```js
// Before
import { useDeviceStore } from '@/stores/useDeviceStore'

// After
import { StoreAdapter } from '@/stores/StoreAdapter'
```

### Step 2: Initialize Store

Replace store initialization:

```js
// Before
const deviceStore = useDeviceStore()

// After
const storeAdapter = new StoreAdapter()
```

### Step 3: Update References

Replace direct property and method references with adapter-compatible versions:

```js
// Before
const devices = deviceStore.discoveredDevices
deviceStore.startDiscovery()

// After
const devices = storeAdapter.discoveredDevices
storeAdapter.startDiscovery()
```

### Step 4: Update Type Definitions

Update type definitions for component props and data:

```ts
// Before
interface Device {
  id: string
  name: string
  // Limited properties
}

// After
import type { LegacyDevice } from '@/stores/StoreAdapter'
```

## Type Conversion

The adapter handles type conversion between legacy and new formats through these key functions:

### `newToLegacyDevice`

Converts devices from the new unified store format to the legacy format expected by components:

```ts
function newToLegacyDevice(device: Device): LegacyDevice {
  // Conversion logic
}
```

### `legacyToNewDevice`

Converts from legacy format to the new unified store format:

```ts
function legacyToNewDevice(legacyDevice: LegacyDevice): Device {
  // Conversion logic
}
```

## Common Challenges and Solutions

### Challenge 1: Different Property Names

The legacy store and unified store may use different property names for the same data.

**Solution**: Use the property mappings in the adapter:

```ts
const propertyMappings: Record<string, string> = {
  deviceName: 'name',
  deviceType: 'type',
  devicePort: 'port',
  address: 'ipAddress'
}
```

### Challenge 2: Event Handling Differences

The event systems may differ between the old and new stores.

**Solution**: Use the adapter's event registration methods:

```js
// Before
deviceStore.$on('deviceUpdated', handleDeviceUpdated)

// After
storeAdapter.on('deviceUpdated', handleDeviceUpdated)
```

### Challenge 3: Nested Properties

Handling of nested properties may differ between store implementations.

**Solution**: The adapter properly merges nested properties when updating:

```ts
properties: {
  ...(existingDevice.properties || {}),
  ...((transformedUpdate.properties as Record<string, unknown>) || {})
}
```

## Phase 2 Migration

When ready to migrate to direct store usage:

1. Replace adapter imports with direct UnifiedStore imports
2. Update type definitions to use the new Device types
3. Update method calls to use the new store API
4. Remove adapter-specific code

## Testing Your Migration

After migrating a component, verify:

1. **Functionality**: All component features work as expected
2. **Types**: No TypeScript errors related to device types
3. **Events**: Event handling works correctly
4. **Performance**: No degradation in performance

## Migration Checklist

- [ ] Update imports
- [ ] Initialize with adapter instead of legacy store
- [ ] Update property and method references
- [ ] Test basic functionality
- [ ] Test event handling
- [ ] Verify type safety
- [ ] Update documentation
