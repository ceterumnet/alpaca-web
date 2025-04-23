import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { DiscoveredDevice } from '@/types/DiscoveredDevice'
import axios from 'axios'

export const useDiscoveredDevicesStore = defineStore('discoveredDevices', () => {
  const devices = ref<DiscoveredDevice[]>([])
  const isDiscovering = ref(false)
  const lastDiscoveryTime = ref<Date | null>(null)

  const sortedDevices = computed(() => {
    return [...devices.value].sort((a, b) => {
      // Sort by address and port
      return `${a.address}:${a.port}`.localeCompare(`${b.address}:${b.port}`)
    })
  })

  async function discoverDevices() {
    isDiscovering.value = true

    try {
      // Trigger a discovery scan
      await axios.post('/discovery/scan')

      // Wait a bit for devices to respond (UDP takes time)
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Get discovered devices
      const response = await axios.get('/discovery/devices')
      devices.value = response.data.devices
      lastDiscoveryTime.value = new Date()
    } catch (error) {
      console.error('Error discovering devices:', error)
    } finally {
      isDiscovering.value = false
    }
  }

  // Get the proxy URL for a discovered device
  function getProxyUrl(device: DiscoveredDevice) {
    return `/proxy/${device.address}/${device.port}`
  }

  return {
    devices,
    sortedDevices,
    isDiscovering,
    lastDiscoveryTime,
    discoverDevices,
    getProxyUrl
  }
})
