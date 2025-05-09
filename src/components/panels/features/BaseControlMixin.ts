/**
 * Base Control Mixin
 * 
 * Provides common functionality for control components:
 * - Connection state checking
 * - Proper error handling
 * - Consistent state management
 */

import { computed, ref, watch } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'

export function useBaseControl(deviceIdProp: string) {
  const store = useUnifiedStore()
  const isLoading = ref(false)
  const error = ref('')

  // Handle empty deviceIdProp case
  const initialId = deviceIdProp || '';

  // Create a proper ref for the device ID that can be updated
  const deviceId = ref(initialId)

  // Set this to indicate we've been properly initialized
  const isInitialized = ref(false)

  // Watch for changes to the deviceId prop
  watch(
    () => deviceIdProp,
    (newDeviceId, oldDeviceId) => {
      // Update deviceId ref when prop changes
      deviceId.value = newDeviceId

      // Mark as initialized after first device ID is processed
      if (!isInitialized.value) {
        isInitialized.value = true
      }

      // Trigger connection check silently
      if (newDeviceId) {
        const dev = store.getDeviceById(newDeviceId)

        if (!dev) {
          // Only log warning when device not found (important for debugging)
          console.warn(`BaseControlMixin: Device ${newDeviceId} not found in store`)
        }
      }
    },
    { immediate: true } // Ensure it runs immediately on component creation
  )

  // Get the device from the store (reactive to deviceId changes)
  const device = computed(() => {
    // Ensure we're using the most current device ID
    const currentId = deviceId.value
    if (!currentId) {
      return null
    }

    // Get the device from the store
    const dev = store.getDeviceById(currentId)

    // Only log warnings when device not found (important for debugging)
    if (!dev) {
      console.warn(`BaseControlMixin: Device not found for ID ${currentId}`)
    }

    return dev
  })

  // Determine if the device is connected - directly check store to avoid reactivity issues
  const isConnected = computed(() => {
    if (!deviceId.value) return false;

    // Direct store lookup for maximum reliability
    const dev = store.getDeviceById(deviceId.value);
    return !!dev?.isConnected;
  })

  // Check if the device exists - directly check store
  const deviceExists = computed(() => {
    if (!deviceId.value) return false;
    return !!store.getDeviceById(deviceId.value);
  })

  /**
   * Execute an operation safely with connection checks
   * @param operation The async operation to perform
   * @param errorPrefix Optional prefix for error messages
   */
  async function safeExecute<T>(
    operation: () => Promise<T>,
    errorPrefix = 'Operation failed'
  ): Promise<T | null> {
    isLoading.value = true
    error.value = ''

    try {
      // Check for empty device ID
      if (!deviceId.value) {
        console.warn('safeExecute: No device ID provided')
        error.value = 'No device ID'
        return null
      }

      // Get current device with a direct store query to avoid reactivity issues
      const currentDevice = store.getDeviceById(deviceId.value)

      // Check if device exists
      if (!currentDevice) {
        console.warn(`safeExecute: Device not found for ID ${deviceId.value}`)
        error.value = 'Device not found'

        // Debug all available devices to help troubleshooting
        const allDevices = store.devicesList
        console.log(`Available devices in store (${allDevices.length}):`,
          allDevices.map(d => `${d.id} (connected: ${d.isConnected})`)
        )

        return null
      }

      // Check if device is connected
      if (!currentDevice.isConnected) {
        console.warn(`safeExecute: Device ${deviceId.value} exists but is not connected`)
        error.value = 'Device not connected'
        return null
      }

      // Execute the operation
      return await operation()
    } catch (err) {
      if (err instanceof Error) {
        error.value = `${errorPrefix}: ${err.message}`
      } else {
        error.value = `${errorPrefix}: Unknown error`
      }
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get a device property safely
   * @param property The property name to get
   * @returns The property value or null if an error occurs
   */
  async function getDeviceProperty(property: string): Promise<unknown | null> {
    // Get the current device ID - using the latest value
    const currentId = deviceId.value;

    // Early check for device ID to avoid undefined error in safeExecute
    if (!currentId) {
      error.value = 'Device ID missing'
      return null
    }

    // Get current device data
    const currentDevice = store.getDeviceById(currentId)

    // Skip the safeExecute wrapper for direct access to avoid any issues
    try {
      isLoading.value = true;
      error.value = '';

      // Check if device exists - direct store check
      if (!currentDevice) {
        error.value = 'Device not found';
        return null;
      }

      // Check if device is connected - direct store check
      if (!currentDevice.isConnected) {
        error.value = 'Device not connected';
        return null;
      }

      // Try cached value first
      if (currentDevice.properties && property in currentDevice.properties) {
        return currentDevice.properties[property];
      }

      // Otherwise direct API call
      return await store.getDeviceProperty(currentId, property);
    } catch (err) {
      if (err instanceof Error) {
        error.value = `Failed to get ${property}: ${err.message}`;
      } else {
        error.value = `Failed to get ${property}: Unknown error`;
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Set a device property safely
   * @param property The property name to set
   * @param value The value to set
   * @returns True if successful, false otherwise
   */
  async function setDeviceProperty(property: string, value: unknown): Promise<boolean> {
    const result = await safeExecute(
      async () => {
        await store.setDeviceProperty(deviceId.value, property, value)
        return true
      },
      `Failed to set ${property}`
    )
    
    return !!result
  }

  // Helper function to debug store state
  function logStoreState() {
    const devices = store.devicesList
    console.log(`Store devices (${devices.length}):`,
      devices.map(d => ({
        id: d.id,
        type: d.type,
        connected: d.isConnected,
        props: Object.keys(d.properties || {}).length
      }))
    )

    if (deviceId.value) {
      const dev = store.getDeviceById(deviceId.value)
      console.log(`Current device ${deviceId.value}:`, dev ?
        `Found: ${dev.type}, connected: ${dev.isConnected}` :
        'NOT FOUND'
      )
    }
  }

  return {
    store,
    device,
    deviceId,
    isConnected,
    deviceExists,
    isLoading,
    error,
    safeExecute,
    getDeviceProperty,
    setDeviceProperty,
    logStoreState
  }
}