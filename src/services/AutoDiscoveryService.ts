/**
 * AutoDiscoveryService.ts
 *
 * This service extends the EnhancedDeviceDiscoveryService to automatically add
 * discovered devices to the device store without requiring explicit user action.
 * It implements the same interface but changes the behavior to auto-add devices.
 */

import { enhancedDeviceDiscoveryService } from './EnhancedDeviceDiscoveryService'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { useNotificationStore } from '@/stores/useNotificationStore'
import { createStoreAdapter } from '@/stores/StoreAdapter'
import type { DiscoveryResult, DiscoveryOptions, ManualDeviceParams, DeviceServer, DeviceServerDevice } from './interfaces/DeviceDiscoveryInterface'
import type { UnifiedDevice } from '@/types/device.types'
import type { DiscoveredDevice } from '@/types/DiscoveredDevice'

/**
 * Auto-Discovery Service that adds devices automatically to the workspace
 * This service delegates most functionality to the base EnhancedDeviceDiscoveryService
 * but adds auto-adding behavior
 */
class AutoDiscoveryService {
  /**
   * Trigger device discovery and automatically add new devices to the workspace
   * @param options Discovery options
   * @returns Promise with discovery results
   */
  async discoverDevices(options?: DiscoveryOptions): Promise<DiscoveryResult> {
    // Call the original discovery method
    const results = await enhancedDeviceDiscoveryService.discoverDevices(options)

    // Get stores
    const notificationStore = useNotificationStore()

    // Keep track of newly added devices
    const addedDevices: string[] = []

    // Process all servers and their devices
    for (const server of results.servers) {
      for (const device of server.devices) {
        // Skip devices that are already marked as added
        if (device.isAdded) continue

        // Create unified device for adding to the store
        const unifiedDevice = enhancedDeviceDiscoveryService.createUnifiedDevice(server, device)

        // Get a fresh store instance for each operation to avoid 'this' context issues
        const addedResult = this.addDeviceToStore(unifiedDevice)

        if (addedResult) {
          device.isAdded = true
          addedDevices.push(device.name)
        }
      }
    }

    // Notify if devices were added
    if (addedDevices.length > 0) {
      const deviceText = addedDevices.length === 1 ? '1 device' : `${addedDevices.length} devices`

      notificationStore.showSuccess(`${deviceText} automatically added to workspace`, {
        autoDismiss: true,
        position: 'top-right',
        duration: 5000
      })
    }

    return results
  }

  /**
   * Add a device manually and automatically add it to the workspace
   * @param params Device parameters
   * @returns The added device server
   */
  async addManualDevice(params: ManualDeviceParams): Promise<DeviceServer> {
    // Call original method to add the manual device
    const server = await enhancedDeviceDiscoveryService.addManualDevice(params)

    // Auto-add all devices from this server
    for (const device of server.devices) {
      if (device.isAdded) continue

      const unifiedDevice = enhancedDeviceDiscoveryService.createUnifiedDevice(server, device)

      // Add device to store
      const addedResult = this.addDeviceToStore(unifiedDevice)

      if (addedResult) {
        device.isAdded = true
      }
    }

    return server
  }

  /**
   * Helper method to add a device to the store safely
   * Avoids 'this' context issues by creating a fresh store instance
   * @param device The device to add
   * @returns True if added successfully
   */
  private addDeviceToStore(device: UnifiedDevice): boolean {
    // Check if device is already added before attempting to add it
    const store = useUnifiedStore()
    const isAlreadyAdded = enhancedDeviceDiscoveryService.isDeviceAdded(device, store.devicesList)

    if (!isAlreadyAdded) {
      try {
        // Make sure device is in a valid state before adding
        // The store expects new devices to be in 'idle' state
        if (!device.status || device.status === 'error') {
          device.status = 'idle'
        }

        // Create a store adapter to avoid 'this' context issues
        const storeAdapter = createStoreAdapter(store)

        // Convert to legacy device format and add through the adapter
        const legacyDevice = {
          id: device.id,
          deviceName: device.name,
          deviceType: device.type,
          address: device.ipAddress,
          devicePort: device.port,
          properties: device.properties
        }

        return storeAdapter.addDevice(legacyDevice)
      } catch (error) {
        console.error('Error adding device to store:', error)
        return false
      }
    }

    return false
  }

  // Delegate all other methods to the original service
  get status() {
    return enhancedDeviceDiscoveryService.status
  }

  get lastDiscoveryTime() {
    return enhancedDeviceDiscoveryService.lastDiscoveryTime
  }

  get lastError() {
    return enhancedDeviceDiscoveryService.lastError
  }

  getDiscoveryResults() {
    return enhancedDeviceDiscoveryService.getDiscoveryResults()
  }

  createUnifiedDevice(server: DeviceServer, device: DeviceServerDevice): UnifiedDevice {
    return enhancedDeviceDiscoveryService.createUnifiedDevice(server, device)
  }

  isDeviceAdded(device: UnifiedDevice, existingDevices: UnifiedDevice[]): boolean {
    return enhancedDeviceDiscoveryService.isDeviceAdded(device, existingDevices)
  }

  getProxyUrl(server: DeviceServer): string {
    return enhancedDeviceDiscoveryService.getProxyUrl(server)
  }

  convertLegacyDevice(device: DiscoveredDevice): DeviceServer {
    return enhancedDeviceDiscoveryService.convertLegacyDevice(device)
  }
}

// Export singleton instance
export const autoDiscoveryService = new AutoDiscoveryService()
