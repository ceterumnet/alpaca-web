// Status: Good - Core Store
// This is the device discovery store that:
// - Uses the DeviceDiscoveryService for core functionality
// - Provides improved type safety
// - Maintains consistent state management
// - Handles error states properly

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { deviceDiscoveryService } from '@/services/DeviceDiscoveryService'
import type { DiscoveredDevice } from '@/types/DiscoveredDevice'
import type { UnifiedDevice } from '@/types/device.types'

export const useDiscoveredDevicesStore = defineStore('discoveredDevices', () => {
  // State
  const devices = ref<DiscoveredDevice[]>([])
  const isDiscovering = ref(false)
  const lastDiscoveryTime = ref<Date | null>(null)
  const error = ref<string | null>(null)

  // Getters
  const sortedDevices = computed(() => {
    return [...devices.value].sort((a, b) => {
      // Sort by address and port
      return `${a.address}:${a.port}`.localeCompare(`${b.address}:${b.port}`)
    })
  })

  // Actions
  async function discoverDevices() {
    if (isDiscovering.value) {
      return
    }

    isDiscovering.value = true
    error.value = null

    try {
      const discoveredDevices = await deviceDiscoveryService.discoverDevices()
      devices.value = discoveredDevices
      lastDiscoveryTime.value = new Date()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to discover devices'
      throw err
    } finally {
      isDiscovering.value = false
    }
  }

  async function addManualDevice(address: string, port: number) {
    error.value = null

    try {
      const device = await deviceDiscoveryService.addManualDevice(address, port)
      devices.value.push(device)
      return device
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to add manual device'
      throw err
    }
  }

  async function getConfiguredDevices(device: DiscoveredDevice): Promise<UnifiedDevice[]> {
    error.value = null

    try {
      return await deviceDiscoveryService.getConfiguredDevices(device)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get configured devices'
      throw err
    }
  }

  function getProxyUrl(device: DiscoveredDevice): string {
    return deviceDiscoveryService.getProxyUrl(device)
  }

  function isDeviceAdded(device: UnifiedDevice, existingDevices: UnifiedDevice[]): boolean {
    return deviceDiscoveryService.isDeviceAdded(device, existingDevices)
  }

  return {
    // State
    devices,
    isDiscovering,
    lastDiscoveryTime,
    error,

    // Getters
    sortedDevices,

    // Actions
    discoverDevices,
    addManualDevice,
    getConfiguredDevices,
    getProxyUrl,
    isDeviceAdded
  }
})
