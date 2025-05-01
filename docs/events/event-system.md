# UnifiedStore Event System

## Overview

The UnifiedStore provides a comprehensive event system for components to react to changes in the application state, particularly around device management. This document outlines the available events, how to subscribe to them, and best practices for using the event system.

## Event Types

The event system supports two types of event handling:

1. **Typed Device Events** - Strongly typed events with a consistent structure
2. **General String Events** - String-based events for broader application communication

### Typed Device Events

Typed device events provide TypeScript type safety and are recommended for device-related operations.

```typescript
// Event types
export type DeviceEvent =
  | { type: 'deviceAdded'; device: Device }
  | { type: 'deviceRemoved'; deviceId: string }
  | { type: 'deviceUpdated'; deviceId: string; updates: Partial<Device> }
  | { type: 'devicePropertyChanged'; deviceId: string; property: string; value: unknown }
  | {
      type: 'deviceMethodCalled'
      deviceId: string
      method: string
      args: unknown[]
      result: unknown
    }
  | { type: 'deviceConnected'; deviceId: string }
  | { type: 'deviceDisconnected'; deviceId: string }
  | { type: 'deviceConnectionError'; deviceId: string; error: string }
  | { type: 'discoveryStarted' }
  | { type: 'discoveryStopped' }
  | { type: 'discoveryDeviceFound'; device: Device }
```

#### Subscribing to Typed Events

```typescript
import { useUnifiedStore } from '@/stores/UnifiedStore'

// In setup() or similar
const store = useUnifiedStore()

// Add event listener
const handleDeviceEvent = (event: DeviceEvent) => {
  if (event.type === 'deviceAdded') {
    console.log('Device added:', event.device)
  } else if (event.type === 'deviceUpdated') {
    console.log('Device updated:', event.deviceId, event.updates)
  }
}

// Add the listener
store.addEventListener(handleDeviceEvent)

// When component is unmounted, remove listener
onUnmounted(() => {
  store.removeEventListener(handleDeviceEvent)
})
```

### General String Events

For more general application events or legacy compatibility, the store provides a string-based event system.

#### Supported String Events

| Event Name              | Parameters                                         | Description                                           |
| ----------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| `callDeviceMethod`      | deviceId: string, method: string, args: unknown[]  | Called when a component requests a device method call |
| `devicePropertyChanged` | deviceId: string, property: string, value: unknown | Called when a device property changes                 |
| `discoveryComplete`     | devices: Device[]                                  | Called when device discovery completes                |
| `error`                 | message: string, error: Error                      | Called when an error occurs                           |
| `notificationAdded`     | notification: Notification                         | Called when a notification is added                   |

#### Subscribing to String Events

```typescript
import { useUnifiedStore } from '@/stores/UnifiedStore'

// In setup() or similar
const store = useUnifiedStore()

// Handler function
const handleDeviceAdded = (deviceId: string, device: Device) => {
  console.log('Device added with ID:', deviceId, device)
}

// Register listener
store.on('deviceAdded', handleDeviceAdded)

// When component is unmounted, remove listener
onUnmounted(() => {
  store.off('deviceAdded', handleDeviceAdded)
})
```

## Event Emission

The store internally emits events for various actions. Components generally should not need to emit events directly, but rather call appropriate store methods that will emit events as needed.

However, for legacy compatibility or custom events, components can emit events using:

```typescript
store.emit('customEvent', arg1, arg2)
```

## Best Practices

1. **Prefer Typed Events**: When possible, use the typed `addEventListener` approach for device events
2. **Clean Up Listeners**: Always remove listeners in `onUnmounted` or equivalent cleanup
3. **Event Handlers**: Keep event handlers small and focused
4. **Avoid Infinite Loops**: Be careful not to create infinite loops by having events trigger actions that emit the same events
5. **Performance**: For high-frequency events, consider debouncing or throttling handlers

## Event Flow

Events in the UnifiedStore follow this general flow:

1. **Action**: A store method is called (e.g., `addDevice`)
2. **Internal Processing**: The store processes the action
3. **State Update**: The store updates its internal state
4. **Event Emission**: The store emits relevant events
5. **Handler Execution**: Registered event handlers are called

This ensures that events are only emitted after the store state has been updated, maintaining data consistency.

## Implementation Status

The event system is currently partially implemented, with basic functionality in place. Future enhancements will include:

- Event batching for performance optimization
- More comprehensive event types
- Better error handling in event callbacks
- Event history for debugging purposes

## Example: Device Connection Workflow

A typical workflow for device connection illustrating event handling:

```typescript
// Component code
const connectToDevice = async (deviceId: string) => {
  try {
    await store.connectDevice(deviceId)
    // The store will emit 'deviceConnected' event if successful
  } catch (error) {
    console.error('Failed to connect:', error)
    // The store will emit 'deviceConnectionError' event
  }
}

// Set up event listeners
store.addEventListener((event) => {
  if (event.type === 'deviceConnected') {
    notifyUser(`Connected to ${store.getDeviceById(event.deviceId)?.name}`)
  } else if (event.type === 'deviceConnectionError') {
    notifyUser(`Connection error: ${event.error}`, 'error')
  }
})
```
