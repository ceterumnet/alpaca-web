/**
 * Enhanced Discovery Store
 *
 * This store manages device discovery state and provides a clean interface for UI components.
 * It uses the AutoDiscoveryService for all discovery operations, which automatically adds
 * discovered devices to the workspace.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { autoDiscoveryService } from '@/services/AutoDiscoveryService'
import { useUnifiedStore } from '@/stores/UnifiedStore'
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
      // Create a temp UnifiedDevice to check if it's already added
      const unifiedDevice = autoDiscoveryService.createUnifiedDevice(server, device)
      return !autoDiscoveryService.isDeviceAdded(unifiedDevice, unifiedStore.devicesList)
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
        const unifiedDevice = autoDiscoveryService.createUnifiedDevice(server, device)
        return !autoDiscoveryService.isDeviceAdded(unifiedDevice, unifiedStore.devicesList)
      })

      result.set(server.id, hasAvailable)
    })

    return result
  })

  // Actions

  /**
   * Trigger a device discovery
   * @param options Optional discovery options
   * @returns Promise with discovery results
   */
  async function discoverDevices(options?: DiscoveryOptions): Promise<DiscoveryResult> {
    const results = await autoDiscoveryService.discoverDevices(options)
    discoveryResults.value = results
    return results
  }

  /**
   * Add a device manually by address and port
   * @param params Device parameters
   * @returns Promise with added server
   */
  async function addManualDevice(params: ManualDeviceParams): Promise<DeviceServer> {
    const server = await autoDiscoveryService.addManualDevice(params)

    // Update the results
    const existingIndex = discoveryResults.value.servers.findIndex((s: DeviceServer) => s.address === server.address && s.port === server.port)

    if (existingIndex >= 0) {
      discoveryResults.value.servers[existingIndex] = server
    } else {
      discoveryResults.value.servers.push(server)
    }

    return server
  }

  /**
   * Refresh the discovery results from the service
   * Use this after operations that might affect device state
   */
  function refreshDiscoveryResults(): void {
    discoveryResults.value = autoDiscoveryService.getDiscoveryResults()
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

    return autoDiscoveryService.getProxyUrl(server)
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

    const unifiedDevice = autoDiscoveryService.createUnifiedDevice(server, device)
    const unifiedStoreInstance = useUnifiedStore()
    return autoDiscoveryService.isDeviceAdded(unifiedDevice, unifiedStoreInstance.devicesList)
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
    isDeviceAdded
  }
})
