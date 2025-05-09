# UI and Service Layer Architecture

## Core Architecture Principles

This document outlines the proper architectural patterns for interacting with the device service layer from UI components.

### Separation of Concerns

Our application is built on a clean separation between:

1. **UI Layer** - Components that display information and handle user interaction
2. **Service Layer** - Abstractions that handle business logic and device communication
3. **Data Layer** - Data stores and clients that manage application state and external APIs

### Proper Component-Store Interaction

UI components should **never**:

- Directly access device clients (`unifiedStore.getDeviceClient()`)
- Make direct API calls to external services
- Handle low-level communication details

Instead, components should:

- Use abstracted service methods (`unifiedStore.getDeviceProperty()`, `unifiedStore.callDeviceMethod()`)
- Work with data provided by the service layer
- Focus on rendering and user interaction

## The executeDeviceOperation Pattern

We've introduced an abstraction pattern called `executeDeviceOperation` that serves as the foundation for all device interactions. This pattern:

1. Properly handles client access
2. Provides centralized error handling
3. Supports fallback mechanisms
4. Decouples UI from implementation details

### Example:

```typescript
// ✅ GOOD - Using the service abstraction
async function getExposureProgress(deviceId: string) {
  try {
    const progress = await unifiedStore.getDeviceProperty(deviceId, 'percentcompleted')
    return progress
  } catch (error) {
    handleServiceError(error)
  }
}

// ❌ BAD - Direct client access
async function getExposureProgress(deviceId: string) {
  const client = unifiedStore.getDeviceClient(deviceId)
  if (!client) throw new Error('No client available')

  const progress = await client.getProperty('percentcompleted')
  return progress
}
```

## Error Handling

Error handling should happen at multiple levels:

1. **Service Level** - Handle communication errors, retry logic, fallbacks
2. **Component Level** - Handle UI-relevant errors, display user messages
3. **Global Level** - Handle uncaught errors, provide fallback UI

## TypeScript Context Issues

The current implementation has some TypeScript context issues with the store methods. These should be resolved by:

1. Ensuring proper types for store actions
2. Using composition functions correctly
3. Fixing `this` binding in store methods

## Migrating Existing Code

When migrating existing components:

1. Remove direct client access
2. Use abstracted service methods
3. Properly handle errors
4. Add comments for TypeScript issues until they're fixed

## Future Improvements

1. Complete the refactoring of store methods to use the `executeDeviceOperation` pattern
2. Fix TypeScript typing issues in the store
3. Add proper state management for error conditions
4. Implement better fallback mechanisms for offline operation
