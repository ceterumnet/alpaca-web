# Event Batching

Event batching provides a way to improve performance when many events are emitted in quick succession. This document explains how to use the event batching functionality in the UnifiedStore.

## When to Use Event Batching

Use event batching when you need to:

1. Update multiple device properties at once
2. Perform a sequence of operations that would trigger many events
3. Prevent UI flickering from rapid event handling
4. Optimize performance when dealing with high-frequency events

## Basic Usage

```typescript
import { useUnifiedStore } from '@/stores/UnifiedStore'

// Get a reference to the store
const store = useUnifiedStore()

// Get a batch object
const batch = store.batch()

// Start batching
batch.start()

// Perform multiple operations
store.updateDeviceProperties('device-1', { prop1: 'value1' })
store.updateDeviceProperties('device-1', { prop2: 'value2' })
store.updateDeviceProperties('device-1', { prop3: 'value3' })

// End batching - all events will be processed at once
batch.end()
```

## Example: Updating Multiple Devices

```typescript
function updateAllDevices(settings: Record<string, unknown>) {
  const store = useUnifiedStore()
  const devices = store.devicesList
  const batcher = store.batch()

  // Start batching
  batcher.start()

  // Update all devices
  devices.forEach((device) => {
    store.updateDeviceProperties(device.id, settings)
  })

  // Process all events at once
  batcher.end()
}
```

## Manually Queueing Events

You can also manually queue events using the `queue` method:

```typescript
function processImageSequence(deviceId: string, images: ArrayBuffer[]) {
  const store = useUnifiedStore()
  const batcher = store.batch()

  // Start batching
  batcher.start()

  // Process each image
  images.forEach((imageData, index) => {
    // Instead of emitting events directly, queue them
    batcher.queue({
      type: 'devicePropertyChanged',
      deviceId,
      property: 'currentImageIndex',
      value: index
    })

    // Process the image data...
  })

  // Emit all queued events at once
  batcher.end()
}
```

## Implementation Details

Event batching works by:

1. Temporarily storing events in a queue instead of emitting them immediately
2. Processing all queued events at once when batching ends
3. Maintaining the same order of events as they were queued

This approach reduces the number of UI updates and improves performance when many changes happen in quick succession.

## Best Practices

1. Always call `end()` after batching, ideally in a `try/finally` block to ensure batching ends even if errors occur:

```typescript
const batcher = store.batch()
try {
  batcher.start()
  // Perform operations...
} finally {
  batcher.end()
}
```

2. Keep batching periods short - avoid long-running operations between `start()` and `end()` calls

3. Consider wrapping common batching operations in helper functions:

```typescript
function batchOperation(callback: () => void) {
  const store = useUnifiedStore()
  const batcher = store.batch()

  try {
    batcher.start()
    callback()
  } finally {
    batcher.end()
  }
}

// Usage
batchOperation(() => {
  // Multiple store operations here
  store.updateDeviceProperties(deviceId, {...})
  store.updateDeviceProperties(deviceId, {...})
})
```
