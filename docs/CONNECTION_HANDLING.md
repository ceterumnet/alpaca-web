# Connection Handling Best Practices

## Overview
This document outlines the recommended pattern for handling device connections in UI components, particularly for device control panels and settings. The goal is to create more reliable UI components that:

1. Check connection state before making API calls
2. Handle errors consistently 
3. Avoid unnecessary network requests
4. Share common connection checking logic

## The BaseControlMixin

The `BaseControlMixin` in `src/components/panels/features/BaseControlMixin.ts` provides a reusable set of functions for connection checking and error handling.

### Usage

```typescript
// Import in your component
import { useBaseControl } from '@/components/panels/features/BaseControlMixin'

// In your component's setup function
const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  // other props...
})

// Use the mixin with your device ID
const { 
  store,
  isConnected,
  isLoading,
  error,
  safeExecute,
  getDeviceProperty,
  setDeviceProperty
} = useBaseControl(props.deviceId)
```

### Key Features

1. **Connection State Checking**
   - Automatically checks if a device exists and is connected before attempting operations
   - Provides reactive `isConnected` and `deviceExists` computed properties

2. **Safe API Operations**
   - `getDeviceProperty(property)`: Safely gets a property value, including caching
   - `setDeviceProperty(property, value)`: Safely sets a property value
   - `safeExecute(operation)`: General-purpose wrapper for any async operation

3. **Consistent Error Handling**
   - All operations update the shared `error` ref
   - Loading state is properly managed via the `isLoading` ref

## Example Implementation

See `NumericSetting.vue` for a complete implementation example.

## Migration Steps

1. Import and use the `useBaseControl` mixin with your device ID
2. Replace direct API calls with the mixin's methods:
   - Use `getDeviceProperty` for retrieving property values
   - Use `setDeviceProperty` for setting property values
   - Use `safeExecute` for custom operations

3. Update your template to use the standard loading and error states:
   ```html
   <div :class="{ 'is-loading': isLoading, 'has-error': !!error }">
     <!-- Content -->
     <div v-if="error" class="error-message">{{ error }}</div>
   </div>
   ```

## Benefits

- **Improved Reliability**: Components won't make network calls to disconnected devices
- **Consistent UX**: Standard error and loading states across components
- **Reduced Boilerplate**: No need to repeat connection checking code
- **Maintainability**: Connection logic is centralized and easy to update