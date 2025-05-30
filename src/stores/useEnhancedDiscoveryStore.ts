/**
 * Enhanced Discovery Store
 *
 * This store manages device discovery state and provides a clean interface for UI components.
 * It directly interfaces with the UnifiedStore to add discovered devices to the workspace.
 */

import log from '@/plugins/logger'

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
// Import DirectDiscoveryService to check instance type and call setManualHostPort
import { DirectDiscoveryService } from '@/services/DirectDiscoveryService'

export const useEnhancedDiscoveryStore = defineStore('enhancedDiscovery', () => {
  // const notificationStore = useNotificationStore() // Comment out for now
  const deviceService: IDeviceDiscoveryService = discoveryService
  const discoveryResultsRef = ref<DiscoveryResult>(deviceService.getDiscoveryResults())
  const lastDiscoveryTimeRef = ref<Date | null>(deviceService.lastDiscoveryTime)

  // State for manual discovery prompt
  const showManualDiscoveryPrompt = ref(false)
  const manualHostInput = ref('localhost') // Default or last used
  const manualPortInput = ref<number | null>(11111) // Default or last used
  let initialDirectDiscoveryAttemptFailed = false // Track if initial attempt failed

  // Action to explicitly set the visibility of the manual discovery prompt
  function setShowManualDiscoveryPrompt(value: boolean) {
    showManualDiscoveryPrompt.value = value
    if (!value) {
      // Optional: Reset related state when hiding the prompt, if desired
      // For example, if a user cancels, we might want to reset the 'initialDirectDiscoveryAttemptFailed' flag
      // so that the next discovery error *without* a manual submission shows the prompt again.
      // However, if they submit and it fails, 'initialDirectDiscoveryAttemptFailed' should remain true.
      // Current logic in submitManualDiscovery and discoverDevices handles this.
    }
  }

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
    try {
      const results = await deviceService.discoverDevices(options)
      log.debug('[useEnhancedDiscoveryStore] Results from service (raw object):', results)
      log.debug('[useEnhancedDiscoveryStore] Results from service (JSON.stringified for inspection):', JSON.parse(JSON.stringify(results)))
      discoveryResultsRef.value = results
      lastDiscoveryTimeRef.value = deviceService.lastDiscoveryTime
      initialDirectDiscoveryAttemptFailed = false // Reset on successful discovery

      // === Add detailed check for results.servers ===
      if (results && results.servers && Array.isArray(results.servers)) {
        log.debug('[useEnhancedDiscoveryStore] results.servers is an array. Length:', results.servers.length)
        if (results.servers.length > 0) {
          log.debug('[useEnhancedDiscoveryStore] First server object:', JSON.parse(JSON.stringify(results.servers[0])))
        }
      } else {
        log.error('[useEnhancedDiscoveryStore] results.servers is NOT a valid array or is missing! results.servers:', results.servers)
        // Early exit or special handling if servers array is not as expected
        return results // or throw error, depending on desired behavior
      }
      // === End of detailed check ===

      const unifiedStore = useUnifiedStore()
      results.servers.forEach((server) => {
        log.debug('[useEnhancedDiscoveryStore] Processing server:', server.id)
        server.devices.forEach((device) => {
          const unified = createUnifiedDevice(server, device)
          log.debug('[useEnhancedDiscoveryStore] Processing unified device:', JSON.parse(JSON.stringify(unified)))
          const alreadyAdded = isDeviceAddedToStore(unified)
          log.debug('[useEnhancedDiscoveryStore] Is device already added?', alreadyAdded, 'Device ID:', unified.id)
          if (!alreadyAdded) {
            log.debug('[useEnhancedDiscoveryStore] Attempting to add device to UnifiedStore:', unified.id)
            const addedSuccess = unifiedStore.addDeviceWithCheck(unified)
            log.debug('[useEnhancedDiscoveryStore] Device add success?', addedSuccess, 'Device ID:', unified.id)
          }
        })
      })
      return results
    } catch (error) {
      log.error('[EnhancedDiscoveryStore] Error during device discovery:', error)
      // Check if in direct mode and if it's the first failure
      // VITE_APP_DISCOVERY_MODE should be 'direct' or 'proxied'
      const isDirectMode = import.meta.env.VITE_APP_DISCOVERY_MODE === 'direct'

      if (isDirectMode && deviceService instanceof DirectDiscoveryService && !initialDirectDiscoveryAttemptFailed) {
        log.debug('[EnhancedDiscoveryStore] Initial direct discovery failed. Prompting for manual input.')
        initialDirectDiscoveryAttemptFailed = true // Mark that the initial attempt has failed
        showManualDiscoveryPrompt.value = true
        // Do not process devices or add to store here, wait for manual input or next attempt
        discoveryResultsRef.value = {
          // Clear results or set to error state
          servers: [],
          status: 'error',
          lastDiscoveryTime: new Date(),
          error: error instanceof Error ? error.message : String(error)
        }
        lastDiscoveryTimeRef.value = new Date()
      } else if (isDirectMode && deviceService instanceof DirectDiscoveryService && initialDirectDiscoveryAttemptFailed) {
        log.warn('[EnhancedDiscoveryStore] Manual direct discovery attempt also failed.')
        // Potentially show a persistent error notification to the user
        discoveryResultsRef.value = {
          servers: [],
          status: 'error',
          lastDiscoveryTime: new Date(),
          error: 'Manual discovery attempt failed. ' + (error instanceof Error ? error.message : String(error))
        }
        lastDiscoveryTimeRef.value = new Date()
      }
      // Propagate the error so UI components can react if needed, or handle globally
      throw error
    }
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
    lastDiscoveryTimeRef.value = deviceService.lastDiscoveryTime
  }

  function getProxyUrl(server: DeviceServer): string {
    return deviceService.getProxyUrl(server)
  }

  // Action to handle manual host/port submission
  async function submitManualDiscovery(host: string, port: number) {
    if (!(deviceService instanceof DirectDiscoveryService)) {
      log.error('[EnhancedDiscoveryStore] submitManualDiscovery called when not in DirectDiscoveryService mode.')
      return
    }
    try {
      deviceService.setManualHostPort(host, port)
      manualHostInput.value = host // Store for potential pre-fill next time
      manualPortInput.value = port
      showManualDiscoveryPrompt.value = false
      initialDirectDiscoveryAttemptFailed = true // Ensure next discoverDevices call knows a manual attempt is being made
      // Retry discovery
      await discoverDevices()
    } catch (error) {
      log.error('[EnhancedDiscoveryStore] Error setting manual host/port or re-discovering:', error)
      // Optionally, update UI to show error during manual setup
      discoveryResultsRef.value = {
        servers: [],
        status: 'error',
        lastDiscoveryTime: new Date(),
        error: 'Failed to apply manual settings. ' + (error instanceof Error ? error.message : String(error))
      }
      // Keep prompt open or handle error state appropriately
    }
  }

  // Return store public interface
  return {
    discoveryResults: computed(() => discoveryResultsRef.value),
    servers: computed(() => discoveryResultsRef.value.servers),
    status: computed(() => deviceService.status),
    lastDiscoveryTime: computed(() => lastDiscoveryTimeRef.value),
    lastError: computed(() => deviceService.lastError),
    isDiscovering: computed(() => deviceService.status === 'discovering'),
    showManualDiscoveryPrompt: computed(() => showManualDiscoveryPrompt.value),
    manualHostInput: computed(() => manualHostInput.value),
    manualPortInput: computed(() => manualPortInput.value),
    initialAttemptFailed: computed(() => initialDirectDiscoveryAttemptFailed),
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
    isDeviceAdded: isDeviceAddedToStore,
    submitManualDiscovery, // Expose the new action
    setShowManualDiscoveryPrompt // Expose the new action for controlling visibility
  }
})
