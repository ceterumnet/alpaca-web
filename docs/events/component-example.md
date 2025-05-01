# Event System Component Example

This document provides practical examples of how to use the UnifiedStore event system in components.

## Device Connection Status Component

Below is an example of a component that displays connection status for devices and demonstrates proper event handling:

```vue
<template>
  <div class="device-status">
    <h3>Device Status</h3>
    <ul class="device-list">
      <li v-for="device in devices" :key="device.id" class="device-item">
        <span class="device-name">{{ device.name }}</span>
        <span class="device-type">({{ device.type }})</span>
        <span class="status-indicator" :class="getStatusClass(device)">
          {{ getStatusText(device) }}
        </span>
        <button
          v-if="!device.isConnected && !device.isConnecting"
          @click="handleConnect(device.id)"
          :disabled="device.isConnecting"
        >
          Connect
        </button>
        <button
          v-else-if="device.isConnected && !device.isDisconnecting"
          @click="handleDisconnect(device.id)"
          :disabled="device.isDisconnecting"
        >
          Disconnect
        </button>
        <div v-if="connectionErrors[device.id]" class="error-message">
          {{ connectionErrors[device.id] }}
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import type { Device, DeviceEvent } from '@/stores/UnifiedStore'

// Store access
const store = useUnifiedStore()

// Local state
const connectionErrors = ref<Record<string, string>>({})

// Computed properties
const devices = computed(() => store.devicesList)

// Status helpers
function getStatusClass(device: Device): string {
  if (device.isConnecting) return 'connecting'
  if (device.isDisconnecting) return 'disconnecting'
  return device.isConnected ? 'connected' : 'disconnected'
}

function getStatusText(device: Device): string {
  if (device.isConnecting) return 'Connecting...'
  if (device.isDisconnecting) return 'Disconnecting...'
  return device.isConnected ? 'Connected' : 'Disconnected'
}

// Event handling
function handleDeviceEvent(event: DeviceEvent): void {
  switch (event.type) {
    case 'deviceConnected':
      // Clear any previous connection errors
      if (connectionErrors.value[event.deviceId]) {
        delete connectionErrors.value[event.deviceId]
      }
      break

    case 'deviceConnectionError':
      // Store the error message
      connectionErrors.value[event.deviceId] = event.error
      break

    case 'deviceRemoved':
      // Clean up any stored errors if device is removed
      if (connectionErrors.value[event.deviceId]) {
        delete connectionErrors.value[event.deviceId]
      }
      break
  }
}

// Connection actions
async function handleConnect(deviceId: string): Promise<void> {
  try {
    // Clear any previous errors
    if (connectionErrors.value[deviceId]) {
      delete connectionErrors.value[deviceId]
    }

    await store.connectDevice(deviceId)
    // No need to update UI here - events will handle it
  } catch (error) {
    console.error('Connect action error:', error)
    // The event system will capture and display the error
  }
}

async function handleDisconnect(deviceId: string): Promise<void> {
  try {
    await store.disconnectDevice(deviceId)
    // No need to update UI here - events will handle it
  } catch (error) {
    console.error('Disconnect action error:', error)
    // The event system will capture and display the error
  }
}

// Lifecycle hooks
onMounted(() => {
  // Register event listener when component is mounted
  store.addEventListener(handleDeviceEvent)
})

onUnmounted(() => {
  // Clean up listener when component is unmounted
  store.removeEventListener(handleDeviceEvent)
})
</script>

<style scoped>
.device-status {
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.device-list {
  list-style: none;
  padding: 0;
}

.device-item {
  display: flex;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.device-name {
  font-weight: bold;
  margin-right: 0.5rem;
}

.device-type {
  color: #666;
  margin-right: 1rem;
}

.status-indicator {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  margin-right: 1rem;
  font-size: 0.8rem;
}

.connected {
  background-color: #dff0d8;
  color: #3c763d;
}

.disconnected {
  background-color: #f2dede;
  color: #a94442;
}

.connecting,
.disconnecting {
  background-color: #fcf8e3;
  color: #8a6d3b;
}

.error-message {
  color: #a94442;
  font-size: 0.8rem;
  margin-top: 0.5rem;
  margin-left: 1rem;
}
</style>
```

## Key Best Practices Demonstrated

1. **Clear Separation of Concerns**

   - UI rendering based on device state
   - Event handling for updates
   - Action methods for user interactions

2. **Proper Lifecycle Management**

   - Event listeners added in `onMounted`
   - Event listeners removed in `onUnmounted`

3. **Type Safety**

   - Using the typed `DeviceEvent` interface
   - Switch statement with type narrowing

4. **Reactive UI Updates**

   - Using computed properties for device list
   - Local reactive state for errors
   - Event-driven updates

5. **Error Handling**
   - Capturing connection errors via events
   - Cleaning up errors when devices connect successfully or are removed

## Example: Listening for Method Call Events

Here's a simplified example of a component that listens for device method calls:

```typescript
import { useUnifiedStore } from '@/stores/UnifiedStore'
import type { DeviceEvent } from '@/stores/UnifiedStore'

// In a component setup function
const store = useUnifiedStore()

// Create a method to handle device events
function handleDeviceEvents(event: DeviceEvent) {
  if (event.type === 'deviceMethodCalled') {
    const { deviceId, method, args, result } = event

    // Log the method call
    console.log(`Method ${method} called on device ${deviceId}`)

    // Do something based on the method
    if (method === 'startExposure') {
      const exposure = args[0] as number
      console.log(`Starting exposure for ${exposure} seconds`)

      // Update UI or trigger other actions
    }

    // Check the result
    if (result === null) {
      console.warn('Method call did not return a value')
    }
  }
}

// Register and clean up the listener
onMounted(() => {
  store.addEventListener(handleDeviceEvents)
})

onUnmounted(() => {
  store.removeEventListener(handleDeviceEvents)
})
```

## Using String-Based Events (Legacy Pattern)

While the typed event system is preferred, here's how to use the string-based events for legacy compatibility:

```typescript
import { useUnifiedStore } from '@/stores/UnifiedStore'

// In a component setup function
const store = useUnifiedStore()

// Handler for device property changes
function handlePropertyChange(deviceId: string, property: string, value: unknown) {
  console.log(`Property ${property} changed to ${value} for device ${deviceId}`)

  // Update component state based on the property
  if (property === 'isExposing' && deviceId === currentDeviceId.value) {
    isExposing.value = value as boolean
  }
}

// Register and clean up the listener
onMounted(() => {
  store.on('devicePropertyChanged', handlePropertyChange)
})

onUnmounted(() => {
  store.off('devicePropertyChanged', handlePropertyChange)
})
```
