import axios from 'axios'
import { debugLog } from '@/utils/debugUtils'
import type { DiscoveredDevice } from '@/types/DiscoveredDevice'
import type { UnifiedDevice } from '@/types/device.types'

interface ConfiguredDevice {
  DeviceType: string
  DeviceNumber: number
  UniqueID?: string
  Name?: string
}

export class DeviceDiscoveryService {
  private isDiscovering: boolean = false
  private lastDiscoveryTime: Date | null = null

  async discoverDevices(): Promise<DiscoveredDevice[]> {
    if (this.isDiscovering) {
      throw new Error('Discovery already in progress')
    }

    this.isDiscovering = true
    debugLog('Starting device discovery...')

    try {
      // Trigger a discovery scan
      await axios.post('/discovery/scan')

      // Wait for devices to respond (UDP takes time)
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Get discovered devices
      const response = await axios.get('/discovery/devices')
      const devices = response.data.devices
      this.lastDiscoveryTime = new Date()

      return devices
    } catch (error) {
      console.error('Error discovering devices:', error)
      throw error
    } finally {
      this.isDiscovering = false
    }
  }

  async addManualDevice(address: string, port: number): Promise<DiscoveredDevice> {
    // Validate input
    if (!address || !port) {
      throw new Error('Address and port are required')
    }

    try {
      // Verify the device by making a request to its management API
      const proxyUrl = `/proxy/${address}/${port}`
      await axios.get(`${proxyUrl}/management/v1/configureddevices`)

      // Create new device entry
      const newDevice: DiscoveredDevice = {
        address,
        port,
        AlpacaPort: port,
        discoveryTime: new Date().toISOString(),
        ServerName: 'Manual Entry',
        Manufacturer: 'Unknown',
        isManualEntry: true
      }

      return newDevice
    } catch (error) {
      console.error('Error adding manual device:', error)
      throw new Error('Could not connect to device at the specified address and port')
    }
  }

  async getConfiguredDevices(device: DiscoveredDevice): Promise<UnifiedDevice[]> {
    const proxyUrl = this.getProxyUrl(device)
    try {
      const response = await axios.get(`${proxyUrl}/management/v1/configureddevices`)
      const configuredDevices = response.data.Value as ConfiguredDevice[]

      const devices = configuredDevices
        .map((configDevice) => {
          const deviceType = configDevice.DeviceType.toLowerCase()
          const deviceNumber = configDevice.DeviceNumber

          // Only process supported device types
          if (deviceType !== 'telescope' && deviceType !== 'camera') {
            return null
          }

          // Create unique device ID
          const deviceId = `${device.address}:${device.port}:${deviceType}:${deviceNumber}`

          // Create device object
          const unifiedDevice: UnifiedDevice = {
            id: deviceId,
            name: `${configDevice.DeviceType} ${deviceNumber}`,
            type: deviceType,
            ipAddress: device.address,
            port: device.port,
            isConnected: false,
            isConnecting: false,
            isDisconnecting: false,
            status: 'idle',
            properties: {
              discoveryTime: new Date().toISOString(),
              alpacaPort: device.port,
              serverName: device.ServerName || 'Manual Entry',
              manufacturer: device.Manufacturer || 'Unknown',
              location: device.Location,
              isManualEntry: device.isManualEntry,
              deviceNumber: deviceNumber,
              apiBaseUrl: `${proxyUrl}/api/v1/${deviceType}/${deviceNumber}`
            }
          }

          return unifiedDevice
        })
        .filter((device): device is UnifiedDevice => device !== null)

      return devices
    } catch (error) {
      console.error('Error fetching configured devices:', error)
      throw new Error('Failed to fetch configured devices from server')
    }
  }

  getProxyUrl(device: DiscoveredDevice): string {
    return `/proxy/${device.address}/${device.port}`
  }

  isDeviceAdded(device: UnifiedDevice, existingDevices: UnifiedDevice[]): boolean {
    return existingDevices.some((existingDevice) => {
      // Check if API URLs match (most reliable)
      const deviceApiUrl = existingDevice.properties?.apiBaseUrl as string | undefined
      const newDeviceApiUrl = device.properties?.apiBaseUrl as string | undefined

      if (deviceApiUrl === newDeviceApiUrl && deviceApiUrl) {
        return true
      }

      // If URLs don't match, check more detailed criteria
      const deviceTypeMatch = existingDevice.type === device.type
      const deviceNumMatch =
        existingDevice.properties?.deviceNumber === device.properties?.deviceNumber
      const serverAddressMatch = existingDevice.ipAddress === device.ipAddress
      const serverPortMatch = existingDevice.port === device.port

      // Device is considered the same only if ALL criteria match
      return deviceTypeMatch && deviceNumMatch && serverAddressMatch && serverPortMatch
    })
  }
}

// Export singleton instance
export const deviceDiscoveryService = new DeviceDiscoveryService()
