# Type System Organization

This directory contains the core type definitions for the Alpaca Web project. The type system is organized into two main categories:

## Core Device Types (`device.types.ts`)

This file contains the core device type definitions and interfaces that are used throughout the application. It includes:

- Base device interfaces (`BaseDevice`, `UnifiedDevice`)
- Device-specific interfaces (`TelescopeDevice`, `CameraDevice`, etc.)
- Type guards and validation functions
- Property validation utilities
- Device capability checks

## Store Types (`stores/types/device-store.types.ts`)

This file contains types specific to the store implementation, including:

- Store-specific interfaces
- Event definitions
- Store-related types
- Re-exports of core device types

## Type System Guidelines

1. **Core Device Types**

   - Should be used for device-specific logic and validation
   - Contains all device interfaces and type guards
   - Should not depend on store-specific types

2. **Store Types**

   - Should be used for store-related logic
   - Contains event definitions and store interfaces
   - Imports and re-exports core device types

3. **Import Guidelines**

   - Components should import from `@/types/device.types.ts` for device types
   - Store modules should import from `@/stores/types/device-store.types.ts`
   - Avoid circular dependencies between type files

4. **Type Safety**
   - Use type guards for runtime type checking
   - Validate device properties before use
   - Maintain consistent property types across interfaces

## Migration Notes

When working with the type system:

1. Use the appropriate type file based on your needs:

   - For device-specific logic: `device.types.ts`
   - For store-related logic: `device-store.types.ts`

2. When adding new types:

   - Place core device types in `device.types.ts`
   - Place store-specific types in `device-store.types.ts`

3. When importing types:
   - Use the correct import path based on the type's location
   - Avoid mixing imports from both files unless necessary
