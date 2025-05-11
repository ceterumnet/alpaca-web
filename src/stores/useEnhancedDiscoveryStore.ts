/**
 * Enhanced Discovery Store
 *
 * This store manages device discovery state and provides a clean interface for UI components.
 * It directly interfaces with the UnifiedStore to add discovered devices to the workspace.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { enhancedDeviceDiscoveryService } from '@/services/EnhancedDeviceDiscoveryService'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { useNotificationStore } from '@/stores/useNotificationStore'
import type {
  DeviceServer,
  DeviceServerDevice,
  DiscoveryResult,
  DiscoveryOptions,
  ManualDeviceParams
} from '@/services/interfaces/DeviceDiscoveryInterface'

export const useEnhancedDiscoveryStore = defineStore('enhancedDiscovery', () => {
  // State
  const discoveryResults = ref<DiscoveryResult>({
    servers: [],
    status: 'idle',
    lastDiscoveryTime: null,
    error: null
  })

  // Get the UnifiedStore for checking existing devices
  const unifiedStore = useUnifiedStore()
  const notificationStore = useNotificationStore()

  // Getters
  const servers = computed(() => discoveryResults.value.servers)

  const status = computed(() => discoveryResults.value.status)

  const lastDiscoveryTime = computed(() => discoveryResults.value.lastDiscoveryTime)

  const error = computed(() => discoveryResults.value.error)

  const isDiscovering = computed(() => discoveryResults.value.status === 'discovering')

  // Get flat list of all devices across all servers
  const allDevices = computed(() => {
    const devices: Array<{ server: DeviceServer; device: DeviceServerDevice }> = []

    discoveryResults.value.servers.forEach((server) => {
      server.devices.forEach((device) => {
        devices.push({ server, device })
      })
    })

    return devices
  })

  // Get devices that haven't been added yet
  const availableDevices = computed(() => {
    return allDevices.value.filter(({ server, device }) => {
      // Create a unified device to check if it's already added
      const unifiedDevice = createUnifiedDevice(server, device)
      return !unifiedStore.deviceExists(unifiedDevice)
    })
  })

  // Sort servers by address for consistent display
  const sortedServers = computed(() => {
    return [...discoveryResults.value.servers].sort((a, b) => {
      return `${a.address}:${a.port}`.localeCompare(`${b.address}:${b.port}`)
    })
  })

  // Check if a server has any available devices (not already added)
  const serverHasAvailableDevices = computed(() => {
    const result = new Map<string, boolean>()

    discoveryResults.value.servers.forEach((server) => {
      const hasAvailable = server.devices.some((device) => {
        const unifiedDevice = createUnifiedDevice(server, device)
        return !unifiedStore.deviceExists(unifiedDevice)
      })

      result.set(server.id, hasAvailable)
    })

    return result
  })

  /**
   * Create a unified device from a server and device
   * @param server The device server
   * @param device The device on the server
   * @returns A unified device object
   */
  function createUnifiedDevice(server: DeviceServer, device: DeviceServerDevice) {
    return enhancedDeviceDiscoveryService.createUnifiedDevice(server, device)
  }

  /**
   * Add a device to the unified store
   * @param server The device server
   * @param device The device on the server
   * @returns True if the device was added, false if it already existed
   */
  function addDeviceToStore(server: DeviceServer, device: DeviceServerDevice): boolean {
    const unifiedDevice = createUnifiedDevice(server, device)
    return unifiedStore.addDeviceWithCheck(unifiedDevice)
  }

  /**
   * Process newly discovered devices and automatically add them to the store
   * @param results Discovery results to process
   * @returns Array of added device names
   */
  function processDiscoveredDevices(results: DiscoveryResult): string[] {
    const addedDevices: string[] = []

    // Process all servers and their devices
    for (const server of results.servers) {
      for (const device of server.devices) {
        // Skip devices that are already marked as added
        if (device.isAdded) continue

        // Add to store and update status if added
        const added = addDeviceToStore(server, device)
        if (added) {
          device.isAdded = true
          addedDevices.push(device.name)
        }
      }
    }

    return addedDevices
  }

  /**
   * Trigger a device discovery
   * @param options Optional discovery options
   * @returns Promise with discovery results
   */
  async function discoverDevices(options?: DiscoveryOptions): Promise<DiscoveryResult> {
    // Call the original discovery method
    const results = await enhancedDeviceDiscoveryService.discoverDevices(options)
    discoveryResults.value = results

    // Process the discovered devices
    const addedDevices = processDiscoveredDevices(results)

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
   * Add a device manually by address and port
   * @param params Device parameters
   * @returns Promise with added server
   */
  async function addManualDevice(params: ManualDeviceParams): Promise<DeviceServer> {
    const server = await enhancedDeviceDiscoveryService.addManualDevice(params)

    // Update the results
    const existingIndex = discoveryResults.value.servers.findIndex((s: DeviceServer) => s.address === server.address && s.port === server.port)

    if (existingIndex >= 0) {
      discoveryResults.value.servers[existingIndex] = server
    } else {
      discoveryResults.value.servers.push(server)
    }

    // Auto-add all devices from this server
    for (const device of server.devices) {
      if (device.isAdded) continue

      const added = addDeviceToStore(server, device)
      if (added) {
        device.isAdded = true
      }
    }

    return server
  }

  /**
   * Refresh the discovery results from the service
   * Use this after operations that might affect device state
   */
  function refreshDiscoveryResults(): void {
    discoveryResults.value = enhancedDeviceDiscoveryService.getDiscoveryResults()
  }

  /**
   * Get the proxy URL for a server
   * @param serverId Server ID
   * @returns Proxy URL for the server
   */
  function getProxyUrl(serverId: string): string {
    const server = discoveryResults.value.servers.find((s: DeviceServer) => s.id === serverId)
    if (!server) {
      throw new Error(`Server with ID ${serverId} not found`)
    }

    return enhancedDeviceDiscoveryService.getProxyUrl(server)
  }

  /**
   * Check if a specific device is already added to the store
   * @param serverId Server ID
   * @param deviceId Device ID
   * @returns True if device is already added
   */
  function isDeviceAdded(serverId: string, deviceId: string): boolean {
    const server = discoveryResults.value.servers.find((s: DeviceServer) => s.id === serverId)
    if (!server) {
      return false
    }

    const device = server.devices.find((d: DeviceServerDevice) => d.id === deviceId)
    if (!device) {
      return false
    }

    const unifiedDevice = createUnifiedDevice(server, device)
    return unifiedStore.deviceExists(unifiedDevice)
  }

  // Return store public interface
  return {
    // State
    discoveryResults,

    // Getters
    servers,
    status,
    isDiscovering,
    lastDiscoveryTime,
    error,
    allDevices,
    availableDevices,
    sortedServers,
    serverHasAvailableDevices,

    // Actions
    discoverDevices,
    addManualDevice,
    refreshDiscoveryResults,
    getProxyUrl,
    isDeviceAdded,
    createUnifiedDevice,
    addDeviceToStore
  }
})
