# Device Type System

## Overview

This document describes the device type system used in the Alpaca Web application. The type system was designed to provide strong type safety while maintaining compatibility with existing components during the migration from JavaScript to TypeScript.

## Type Hierarchy

The device type system is organized in a hierarchical structure:

1. **BaseDevice**: The most basic device interface with common properties all devices must have
2. **UnifiedDevice**: Extends BaseDevice with properties used in the UnifiedStore
3. **Specific Device Types**: Extend UnifiedDevice with type-specific properties (e.g., TelescopeDevice, CameraDevice)
4. **LegacyDevice**: A separate interface for backward compatibility with the old store format

## Core Interfaces

### BaseDevice

The base interface for all device types containing the minimal required properties:

```typescript
export interface BaseDevice {
  id: string
  name: string
  type: string
  isConnected: boolean
  properties: Record<string, unknown>
}
```

### UnifiedDevice

The main device interface used in the UnifiedStore:

```typescript
export interface UnifiedDevice extends BaseDevice {
  displayName?: string
  isConnecting: boolean
  isDisconnecting: boolean
  discoveredAt?: string
  lastConnected?: string
  deviceType?: string // For compatibility with older code
  ipAddress?: string
  address?: string
  port?: number
  status?: string
  telemetry?: Record<string, unknown>
  lastSeen?: string | number
  firmwareVersion?: string
  [key: string]: unknown // Allow for additional properties
}
```

### Specific Device Types

Device-specific interfaces for stronger typing:

```typescript
export interface TelescopeDevice extends UnifiedDevice {
  type: 'telescope'
  trackingEnabled?: boolean
  currentRa?: string
  currentDec?: string
  // Other telescope-specific properties...
}

export interface CameraDevice extends UnifiedDevice {
  type: 'camera'
  exposureTime?: number
  gain?: number
  // Other camera-specific properties...
}

// Other device types follow the same pattern
```

### LegacyDevice

For backward compatibility with existing components:

```typescript
export interface LegacyDevice {
  id: string
  deviceName: string
  deviceType: string
  // Other legacy properties...
  [key: string]: unknown // Allow for additional properties
}
```

## Type Guards

Type guards allow for safe type checking and casting:

```typescript
export function isTelescope(device: UnifiedDevice): device is TelescopeDevice {
  return device.type === 'telescope'
}

export function isCamera(device: UnifiedDevice): device is CameraDevice {
  return device.type === 'camera'
}

// Other type guards follow the same pattern
```

## Usage Examples

### Working with Specific Device Types

```typescript
import { UnifiedDevice, isTelescope, isCamera } from '../types/DeviceTypes'

function handleDevice(device: UnifiedDevice) {
  if (isTelescope(device)) {
    // TypeScript knows this is a TelescopeDevice
    console.log(`Telescope RA: ${device.currentRa}`)
  } else if (isCamera(device)) {
    // TypeScript knows this is a CameraDevice
    console.log(`Camera exposure: ${device.exposureTime}`)
  }
}
```

### Converting Between Legacy and Unified Formats

```typescript
import type { UnifiedDevice, LegacyDevice } from '../types/DeviceTypes'

function legacyToUnified(legacy: LegacyDevice): UnifiedDevice {
  return {
    id: legacy.id,
    name: legacy.deviceName,
    type: legacy.deviceType,
    isConnected: !!legacy.isConnected,
    isConnecting: false,
    isDisconnecting: false,
    properties: legacy.properties || {}
    // Map other properties...
  }
}
```

## Best Practices

1. **Use Type Guards**: Always use type guards to check device types before accessing type-specific properties
2. **Explicit Typing**: Explicitly type variables and function parameters to leverage TypeScript's type checking
3. **Interface Extensions**: Extend the base interfaces for new device types rather than creating entirely new ones
4. **Consistency**: Use the same property names and types across the application

## Migration Path

During the migration to TypeScript, we maintain both the legacy interfaces and the new unified type system. Components can gradually adopt the new types as they are migrated.

The long-term goal is to have a fully typed system where all components use the unified device types directly, eliminating the need for type conversion and adapters.

## File Locations

- **Device Types**: `src/types/DeviceTypes.ts`
- **Unified Store**: `src/stores/UnifiedStore.ts`
- **Store Adapter**: `src/stores/StoreAdapter.ts`
