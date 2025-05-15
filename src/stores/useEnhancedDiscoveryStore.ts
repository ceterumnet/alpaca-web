/**
 * Enhanced Discovery Store
 *
 * This store manages device discovery state and provides a clean interface for UI components.
 * It directly interfaces with the UnifiedStore to add discovered devices to the workspace.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { discoveryService } from '@/services/discoveryServiceFactory'
import { useUnifiedStore } from '@/stores/UnifiedStore'
// import { useNotificationStore } from '@/stores/useNotificationStore' // Comment out for now
import type { UnifiedDevice } from '@/types/device.types' // Correct import for UnifiedDevice
import type {
  DeviceServer,
  DeviceServerDevice,
  DiscoveryResult,
  DiscoveryOptions,
  ManualDeviceParams,
  IDeviceDiscoveryService
} from '@/services/interfaces/DeviceDiscoveryInterface'

export const useEnhancedDiscoveryStore = defineStore('enhancedDiscovery', () => {
  // const notificationStore = useNotificationStore() // Comment out for now
  const deviceService: IDeviceDiscoveryService = discoveryService
  const discoveryResultsRef = ref<DiscoveryResult>(deviceService.getDiscoveryResults())

  // Helper functions (not exported directly unless needed by components, but used by exported computed properties)
  function createUnifiedDevice(server: DeviceServer, device: DeviceServerDevice): UnifiedDevice {
    return deviceService.createUnifiedDevice(server, device)
  }

  function isDeviceAddedToStore(device: UnifiedDevice): boolean {
    const unifiedStore = useUnifiedStore()
    return deviceService.isDeviceAdded(device, unifiedStore.devicesList)
  }

  // Actions
  async function discoverDevices(options?: DiscoveryOptions): Promise<DiscoveryResult> {
    const results = await deviceService.discoverDevices(options)
    console.log('[useEnhancedDiscoveryStore] Results from service (raw object):', results)
    console.log('[useEnhancedDiscoveryStore] Results from service (JSON.stringified for inspection):', JSON.parse(JSON.stringify(results)))
    discoveryResultsRef.value = results

    // === Add detailed check for results.servers ===
    if (results && results.servers && Array.isArray(results.servers)) {
      console.log('[useEnhancedDiscoveryStore] results.servers is an array. Length:', results.servers.length)
      if (results.servers.length > 0) {
        console.log('[useEnhancedDiscoveryStore] First server object:', JSON.parse(JSON.stringify(results.servers[0])))
      }
    } else {
      console.error('[useEnhancedDiscoveryStore] results.servers is NOT a valid array or is missing! results.servers:', results.servers)
      // Early exit or special handling if servers array is not as expected
      return results // or throw error, depending on desired behavior
    }
    // === End of detailed check ===

    const unifiedStore = useUnifiedStore()
    results.servers.forEach((server) => {
      console.log('[useEnhancedDiscoveryStore] Processing server:', server.id)
      server.devices.forEach((device) => {
        const unified = createUnifiedDevice(server, device)
        console.log('[useEnhancedDiscoveryStore] Processing unified device:', JSON.parse(JSON.stringify(unified)))
        const alreadyAdded = isDeviceAddedToStore(unified)
        console.log('[useEnhancedDiscoveryStore] Is device already added?', alreadyAdded, 'Device ID:', unified.id)
        if (!alreadyAdded) {
          console.log('[useEnhancedDiscoveryStore] Attempting to add device to UnifiedStore:', unified.id)
          const addedSuccess = unifiedStore.addDeviceWithCheck(unified)
          console.log('[useEnhancedDiscoveryStore] Device add success?', addedSuccess, 'Device ID:', unified.id)
        }
      })
    })
    return results
  }

  async function addManualDevice(params: ManualDeviceParams): Promise<DeviceServer> {
    const server = await deviceService.addManualDevice(params)
    refreshDiscoveryResults()
    const unifiedStore = useUnifiedStore()
    server.devices.forEach((device) => {
      const unified = createUnifiedDevice(server, device)
      if (!isDeviceAddedToStore(unified)) {
        unifiedStore.addDeviceWithCheck(unified)
      }
    })
    return server
  }

  function refreshDiscoveryResults(): void {
    discoveryResultsRef.value = deviceService.getDiscoveryResults()
  }

  function getProxyUrl(server: DeviceServer): string {
    return deviceService.getProxyUrl(server)
  }

  // Return store public interface
  return {
    discoveryResults: computed(() => discoveryResultsRef.value),
    servers: computed(() => discoveryResultsRef.value.servers),
    status: computed(() => deviceService.status),
    lastDiscoveryTime: computed(() => deviceService.lastDiscoveryTime),
    lastError: computed(() => deviceService.lastError),
    isDiscovering: computed(() => deviceService.status === 'discovering'),
    availableDevices: computed(() => {
      return discoveryResultsRef.value.servers.flatMap((server) =>
        server.devices.filter((device) => {
          const unifiedDevice = createUnifiedDevice(server, device)
          return !isDeviceAddedToStore(unifiedDevice)
        })
      )
    }),
    getAvailableDevicesByServer: computed(() => (serverId: string) => {
      const server = discoveryResultsRef.value.servers.find((s) => s.id === serverId)
      if (!server) return []
      return server.devices.filter((device) => {
        const unifiedDevice = createUnifiedDevice(server, device)
        return !isDeviceAddedToStore(unifiedDevice)
      })
    }),
    hasAvailableDevices: computed(() => {
      return discoveryResultsRef.value.servers.some((server) =>
        server.devices.some((device) => {
          const unifiedDevice = createUnifiedDevice(server, device)
          return !isDeviceAddedToStore(unifiedDevice)
        })
      )
    }),
    getServerById: computed(() => (serverId: string) => {
      return discoveryResultsRef.value.servers.find((s) => s.id === serverId) || null
    }),
    discoverDevices,
    addManualDevice,
    refreshDiscoveryResults,
    getProxyUrl,
    createUnifiedDevice,
    isDeviceAdded: isDeviceAddedToStore
  }
})
