import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { EnhancedDeviceDiscoveryService } from '@/services/EnhancedDeviceDiscoveryService'
import type { DiscoveredDevice } from '@/types/DiscoveredDevice'
import type {
  DeviceServer,
  DeviceServerDevice
} from '@/services/interfaces/DeviceDiscoveryInterface'

// Mock axios
vi.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('EnhancedDeviceDiscoveryService', () => {
  let service: EnhancedDeviceDiscoveryService

  beforeEach(() => {
    service = new EnhancedDeviceDiscoveryService()
    vi.clearAllMocks()
  })

  describe('discoverDevices', () => {
    it('should discover devices successfully', async () => {
      // Mock discovery API responses
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const mockDiscoveredDevices: DiscoveredDevice[] = [
        {
          address: '192.168.1.100',
          port: 11111,
          AlpacaPort: 11111,
          discoveryTime: new Date().toISOString(),
          ServerName: 'Test Server 1',
          Manufacturer: 'ASCOM Test',
          ManufacturerVersion: '1.0'
        }
      ]

      mockedAxios.get.mockImplementation((url) => {
        if (url === '/discovery/devices') {
          return Promise.resolve({ data: { devices: mockDiscoveredDevices } })
        }

        if (url.includes('/management/v1/description')) {
          return Promise.resolve({
            data: {
              Value: {
                ServerName: 'Test Server 1',
                Manufacturer: 'ASCOM Test',
                ManufacturerVersion: '1.0',
                Location: 'Test Location'
              }
            }
          })
        }

        if (url.includes('/management/v1/configureddevices')) {
          return Promise.resolve({
            data: {
              Value: [
                {
                  DeviceType: 'Telescope',
                  DeviceNumber: 0,
                  UniqueID: 'unique-telescope-id',
                  Name: 'Test Telescope'
                },
                {
                  DeviceType: 'Camera',
                  DeviceNumber: 0,
                  UniqueID: 'unique-camera-id',
                  Name: 'Test Camera'
                }
              ]
            }
          })
        }

        return Promise.reject(new Error('Unexpected URL: ' + url))
      })

      // Call the method
      const result = await service.discoverDevices()

      // Verify the API calls
      expect(mockedAxios.post).toHaveBeenCalledWith('/discovery/scan')
      expect(mockedAxios.get).toHaveBeenCalledWith('/discovery/devices')

      // Verify the returned data
      expect(result.status).toBe('success')
      expect(result.error).toBeNull()
      expect(result.servers.length).toBe(1)

      // Check the first server
      const server = result.servers[0]
      expect(server.address).toBe('192.168.1.100')
      expect(server.port).toBe(11111)
      expect(server.serverName).toBe('Test Server 1')
      expect(server.manufacturer).toBe('ASCOM Test')
      expect(server.version).toBe('1.0')

      // Check the devices
      expect(server.devices.length).toBe(2)
      expect(server.devices[0].type).toBe('telescope')
      expect(server.devices[0].name).toBe('Test Telescope')
      expect(server.devices[1].type).toBe('camera')
      expect(server.devices[1].name).toBe('Test Camera')
    })

    it('should handle discovery errors', async () => {
      // Mock discovery API error
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'))

      // Call the method and expect it to throw
      await expect(service.discoverDevices()).rejects.toThrow('Network error')

      // Check the service state
      expect(service.status).toBe('error')
      expect(service.lastError).toBe('Network error')
    })
  })

  describe('addManualDevice', () => {
    it('should add a manual device successfully', async () => {
      // Mock API response for configured devices
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/management/v1/configureddevices')) {
          return Promise.resolve({
            data: {
              Value: [
                {
                  DeviceType: 'Telescope',
                  DeviceNumber: 0,
                  Name: 'Manual Telescope'
                }
              ]
            }
          })
        }

        return Promise.reject(new Error('Unexpected URL: ' + url))
      })

      // Call the method
      const result = await service.addManualDevice({
        address: '192.168.1.200',
        port: 22222,
        name: 'My Manual Server'
      })

      // Verify the API call
      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/proxy/192.168.1.200/22222/management/v1/configureddevices'
      )

      // Verify the returned data
      expect(result.address).toBe('192.168.1.200')
      expect(result.port).toBe(22222)
      expect(result.serverName).toBe('My Manual Server')
      expect(result.isManual).toBe(true)

      // Check the device
      expect(result.devices.length).toBe(1)
      expect(result.devices[0].type).toBe('telescope')
      expect(result.devices[0].name).toBe('Manual Telescope')
    })

    it('should throw an error for invalid manual device', async () => {
      // Test missing address
      await expect(service.addManualDevice({ address: '', port: 11111 })).rejects.toThrow(
        'Address and port are required'
      )

      // Test failed connection
      mockedAxios.get.mockRejectedValueOnce(new Error('Connection failed'))

      await expect(
        service.addManualDevice({ address: '192.168.1.1', port: 11111 })
      ).rejects.toThrow('Could not connect to device at the specified address and port')
    })
  })

  describe('createUnifiedDevice', () => {
    it('should create a unified device from server and device', () => {
      // Create test data
      const server: DeviceServer = {
        id: 'server-123',
        address: '192.168.1.100',
        port: 11111,
        serverName: 'Test Server',
        manufacturer: 'ASCOM',
        version: '1.0',
        location: 'Office',
        lastDiscovered: new Date(),
        isManual: false,
        devices: []
      }

      const device: DeviceServerDevice = {
        id: 'device-123',
        name: 'Test Telescope',
        type: 'telescope',
        deviceNumber: 0,
        isAdded: false
      }

      // Call the method
      const unifiedDevice = service.createUnifiedDevice(server, device)

      // Verify the result
      expect(unifiedDevice.id).toBe('192.168.1.100:11111:telescope:0')
      expect(unifiedDevice.name).toBe('Test Telescope')
      expect(unifiedDevice.type).toBe('telescope')
      expect(unifiedDevice.ipAddress).toBe('192.168.1.100')
      expect(unifiedDevice.port).toBe(11111)
      expect(unifiedDevice.isConnected).toBe(false)
      expect(unifiedDevice.status).toBe('idle')

      // Check properties
      expect(unifiedDevice.properties.serverName).toBe('Test Server')
      expect(unifiedDevice.properties.manufacturer).toBe('ASCOM')
      expect(unifiedDevice.properties.deviceNumber).toBe(0)
      expect(unifiedDevice.properties.apiBaseUrl).toBe(
        '/proxy/192.168.1.100/11111/api/v1/telescope/0'
      )
    })
  })

  describe('isDeviceAdded', () => {
    it('should identify a device that is already added with matching API URL', () => {
      // Create test devices
      const deviceToCheck = {
        id: 'device-1',
        type: 'telescope',
        name: 'Telescope 1',
        ipAddress: '192.168.1.100',
        port: 11111,
        isConnected: false,
        isConnecting: false,
        isDisconnecting: false,
        status: 'idle',
        properties: {
          apiBaseUrl: '/proxy/192.168.1.100/11111/api/v1/telescope/0',
          deviceNumber: 0
        }
      }

      const existingDevices = [
        {
          id: 'existing-1',
          type: 'telescope',
          name: 'Existing Telescope',
          ipAddress: '192.168.1.100',
          port: 11111,
          isConnected: true,
          isConnecting: false,
          isDisconnecting: false,
          status: 'connected',
          properties: {
            apiBaseUrl: '/proxy/192.168.1.100/11111/api/v1/telescope/0',
            deviceNumber: 0
          }
        }
      ]

      // Should match by API URL
      expect(service.isDeviceAdded(deviceToCheck, existingDevices)).toBe(true)
    })

    it('should identify a device that is already added with matching type, number, address, and port', () => {
      // Create test devices with different API URLs but matching details
      const deviceToCheck = {
        id: 'device-1',
        type: 'telescope',
        name: 'Telescope 1',
        ipAddress: '192.168.1.100',
        port: 11111,
        isConnected: false,
        isConnecting: false,
        isDisconnecting: false,
        status: 'idle',
        properties: {
          apiBaseUrl: '/proxy/192.168.1.100/11111/api/v1/telescope/0',
          deviceNumber: 0
        }
      }

      const existingDevices = [
        {
          id: 'existing-1',
          type: 'telescope',
          name: 'Existing Telescope',
          ipAddress: '192.168.1.100',
          port: 11111,
          isConnected: true,
          isConnecting: false,
          isDisconnecting: false,
          status: 'connected',
          properties: {
            apiBaseUrl: '/different/url',
            deviceNumber: 0
          }
        }
      ]

      // Should match by type, number, address, and port
      expect(service.isDeviceAdded(deviceToCheck, existingDevices)).toBe(true)
    })

    it('should identify a device that is not already added', () => {
      // Create test devices with non-matching details
      const deviceToCheck = {
        id: 'device-1',
        type: 'telescope',
        name: 'Telescope 1',
        ipAddress: '192.168.1.100',
        port: 11111,
        isConnected: false,
        isConnecting: false,
        isDisconnecting: false,
        status: 'idle',
        properties: {
          apiBaseUrl: '/proxy/192.168.1.100/11111/api/v1/telescope/0',
          deviceNumber: 0
        }
      }

      const existingDevices = [
        {
          id: 'existing-1',
          type: 'camera', // Different type
          name: 'Existing Camera',
          ipAddress: '192.168.1.100',
          port: 11111,
          isConnected: true,
          isConnecting: false,
          isDisconnecting: false,
          status: 'connected',
          properties: {
            apiBaseUrl: '/proxy/192.168.1.100/11111/api/v1/camera/0',
            deviceNumber: 0
          }
        },
        {
          id: 'existing-2',
          type: 'telescope',
          name: 'Existing Telescope',
          ipAddress: '192.168.1.200', // Different address
          port: 11111,
          isConnected: true,
          isConnecting: false,
          isDisconnecting: false,
          status: 'connected',
          properties: {
            apiBaseUrl: '/proxy/192.168.1.200/11111/api/v1/telescope/0',
            deviceNumber: 0
          }
        }
      ]

      // Should not match
      expect(service.isDeviceAdded(deviceToCheck, existingDevices)).toBe(false)
    })
  })
})
