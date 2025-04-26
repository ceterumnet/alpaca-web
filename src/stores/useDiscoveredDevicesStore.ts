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
    console.log('Discovering devices...')
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

  // Add a manually configured device
  async function addManualDevice(address: string, port: number) {
    // Validate input
    if (!address || !port) {
      throw new Error('Address and port are required')
    }

    // Check if device already exists
    const existingDevice = devices.value.find(
      (device) => device.address === address && device.port === port
    )

    if (existingDevice) {
      throw new Error('This device is already in the list')
    }

    try {
      // Try to verify the device by making a request to its management API
      const proxyUrl = `/proxy/${address}/${port}`
      await axios.get(`${proxyUrl}/management/v1/configureddevices`)

      // If successful, add the device
      const newDevice: DiscoveredDevice = {
        address,
        port,
        AlpacaPort: port,
        discoveryTime: new Date().toISOString(),
        ServerName: 'Manual Entry',
        Manufacturer: 'Unknown',
        isManualEntry: true
      }

      devices.value.push(newDevice)
      return newDevice
    } catch (error) {
      console.error('Error adding manual device:', error)
      throw new Error('Could not connect to device at the specified address and port')
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
    addManualDevice,
    getProxyUrl
  }
})
