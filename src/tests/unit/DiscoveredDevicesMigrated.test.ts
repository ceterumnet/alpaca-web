/**
 * Unit tests for the migrated DiscoveredDevices component
 * Tests the direct UnifiedStore usage without adapter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DiscoveredDevicesMigrated from '@/components/DiscoveredDevicesMigrated.vue'

// Define device type
interface TestDevice {
  id: string
  name: string
  type: string
  ipAddress: string
  port: number
  isConnected: boolean
  isConnecting: boolean
  isDisconnecting: boolean
  properties: {
    apiBaseUrl: string
    serverName?: string
    manufacturer?: string
    [key: string]: unknown
  }
}

// Create mocked store functions
const mockDiscoverDevices = vi.fn()
const mockGetProxyUrl = vi.fn((server) => `http://${server.address}:${server.port}`)

// Mock the discovery store
vi.mock('@/stores/useDiscoveredDevicesStore', () => ({
  useDiscoveredDevicesStore: vi.fn(() => ({
    isDiscovering: false,
    lastDiscoveryTime: new Date(),
    sortedDevices: [
      {
        address: '192.168.1.100',
        port: 11111,
        AlpacaPort: 8000,
        ServerName: 'Test Server',
        Manufacturer: 'Test Manufacturer',
        ManufacturerVersion: '1.0',
        Location: 'Test Location',
        isManualEntry: false
      }
    ],
    discoverDevices: mockDiscoverDevices,
    getProxyUrl: mockGetProxyUrl
  }))
}))

// Mock UnifiedStore
const mockAddDevice = vi.fn().mockReturnValue(true)
const mockConnectDevice = vi.fn().mockResolvedValue(true)
const mockDevices: TestDevice[] = []

vi.mock('@/stores/UnifiedStore', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      devices: mockDevices,
      addDevice: mockAddDevice,
      connectDevice: mockConnectDevice
    }))
  }
})

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn().mockImplementation((url) => {
      if (url.includes('/management/v1/description')) {
        return Promise.resolve({
          data: {
            Value: {
              ServerName: 'Test Server',
              Manufacturer: 'Test Manufacturer',
              ManufacturerVersion: '1.0',
              Location: 'Test Location'
            }
          }
        })
      } else if (url.includes('/management/v1/configureddevices')) {
        return Promise.resolve({
          data: {
            Value: [
              {
                DeviceType: 'Telescope',
                DeviceNumber: 0
              },
              {
                DeviceType: 'Camera',
                DeviceNumber: 0
              }
            ]
          }
        })
      }
      return Promise.reject(new Error('Not found'))
    })
  }
}))

// Mock the ManualDeviceConfig component
vi.mock('@/components/ManualDeviceConfig.vue', () => ({
  default: {
    name: 'ManualDeviceConfig',
    template: '<div data-testid="manual-device-config"></div>'
  }
}))

describe('DiscoveredDevicesMigrated.vue', () => {
  beforeEach(() => {
    // Clear mock call history before each test
    vi.clearAllMocks()
  })

  it('renders the component structure correctly', () => {
    const wrapper = mount(DiscoveredDevicesMigrated, {
      shallow: true
    })

    // Test the basic structure
    expect(wrapper.find('.discovered-devices').exists()).toBe(true)
    expect(wrapper.find('h2').text()).toBe('Discovered Devices')
    expect(wrapper.find('.discover-btn').exists()).toBe(true)
  })

  it('calls discovery when mounted', () => {
    mount(DiscoveredDevicesMigrated, {
      shallow: true
    })

    // Check if discoverDevices was called
    expect(mockDiscoverDevices).toHaveBeenCalled()
  })

  it('updates the UI when scan button is clicked', async () => {
    const wrapper = mount(DiscoveredDevicesMigrated, {
      shallow: true
    })

    // Click the discover button
    await wrapper.find('.discover-btn').trigger('click')

    // Verify the discovery method was called
    expect(mockDiscoverDevices).toHaveBeenCalledTimes(2) // Once on mount, once on click
  })
})
