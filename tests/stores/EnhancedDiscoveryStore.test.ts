/**
 * Tests for the EnhancedDiscoveryStore
 *
 * These tests validate that the EnhancedDiscoveryStore correctly:
 * - Calls the EnhancedDeviceDiscoveryService for device discovery
 * - Automatically adds discovered devices to the UnifiedStore
 * - Notifies users of newly added devices
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEnhancedDiscoveryStore } from '@/stores/useEnhancedDiscoveryStore'
import { enhancedDeviceDiscoveryService } from '@/services/EnhancedDeviceDiscoveryService'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { useNotificationStore } from '@/stores/useNotificationStore'
import type { DeviceServer, DeviceServerDevice, DiscoveryResult } from '@/services/interfaces/DeviceDiscoveryInterface'
import type { UnifiedDevice } from '@/types/device.types'

// Mock the EnhancedDeviceDiscoveryService
vi.mock('@/services/EnhancedDeviceDiscoveryService', () => {
  return {
    enhancedDeviceDiscoveryService: {
      discoverDevices: vi.fn(),
      createUnifiedDevice: vi.fn(),
      getDiscoveryResults: vi.fn(),
      getProxyUrl: vi.fn(),
      addManualDevice: vi.fn(),
      convertLegacyDevice: vi.fn()
    }
  }
})

// Sample data for tests
const mockServer: DeviceServer = {
  id: 'server-1',
  address: '192.168.1.100',
  port: 32323,
  serverName: 'Test Server',
  manufacturer: 'Test Manufacturer',
  version: '1.0',
  lastDiscovered: new Date(),
  isManual: false,
  devices: [
    {
      id: 'device-1',
      name: 'Test Telescope',
      type: 'telescope',
      deviceNumber: 0,
      isAdded: false
    },
    {
      id: 'device-2',
      name: 'Test Camera',
      type: 'camera',
      deviceNumber: 0,
      isAdded: false
    }
  ]
}

const mockDiscoveryResult: DiscoveryResult = {
  servers: [mockServer],
  status: 'success',
  lastDiscoveryTime: new Date(),
  error: null
}

const mockUnifiedDevice: UnifiedDevice = {
  id: 'test-device',
  name: 'Test Device',
  type: 'telescope',
  ipAddress: '192.168.1.100',
  port: 32323,
  isConnected: false,
  isConnecting: false,
  isDisconnecting: false,
  status: 'idle',
  properties: {
    apiBaseUrl: '/proxy/192.168.1.100/32323/api/v1/telescope/0'
  }
}

describe('EnhancedDiscoveryStore', () => {
  let discoveryStore: ReturnType<typeof useEnhancedDiscoveryStore>

  beforeEach(() => {
    // Create a fresh Pinia instance for each test
    setActivePinia(createPinia())

    // Get the store
    discoveryStore = useEnhancedDiscoveryStore()

    // Reset all mocks
    vi.resetAllMocks()

    // Set up the mock implementation for discoverDevices
    vi.mocked(enhancedDeviceDiscoveryService.discoverDevices).mockResolvedValue(mockDiscoveryResult)

    // Set up createUnifiedDevice to return our mock device
    vi.mocked(enhancedDeviceDiscoveryService.createUnifiedDevice).mockReturnValue(mockUnifiedDevice)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should discover devices and automatically add them to the store', async () => {
    // Get the unified store
    const unifiedStore = useUnifiedStore()

    // Mock the deviceExists and addDeviceWithCheck methods
    vi.spyOn(unifiedStore, 'deviceExists').mockReturnValue(false)
    const addDeviceSpy = vi.spyOn(unifiedStore, 'addDeviceWithCheck').mockReturnValue(true)

    // Call discoverDevices
    await discoveryStore.discoverDevices()

    // Verify the underlying discovery service was called
    expect(enhancedDeviceDiscoveryService.discoverDevices).toHaveBeenCalled()

    // Verify createUnifiedDevice was called for each device
    expect(enhancedDeviceDiscoveryService.createUnifiedDevice).toHaveBeenCalledTimes(2)

    // Verify devices were added to the store
    expect(addDeviceSpy).toHaveBeenCalledTimes(2)
    expect(addDeviceSpy).toHaveBeenCalledWith(mockUnifiedDevice)
  })

  it('should not add devices that are already in the store', async () => {
    // Get the unified store
    const unifiedStore = useUnifiedStore()

    // Mock the deviceExists method to indicate device already exists
    vi.spyOn(unifiedStore, 'deviceExists').mockReturnValue(true)

    // Spy on addDeviceWithCheck method
    const addDeviceSpy = vi.spyOn(unifiedStore, 'addDeviceWithCheck').mockReturnValue(false)

    // Call discoverDevices
    await discoveryStore.discoverDevices()

    // Verify the checks were made via processDiscoveredDevices
    expect(unifiedStore.deviceExists).toHaveBeenCalled()

    // Verify no devices were added since they already exist (addDeviceWithCheck returns false)
    expect(addDeviceSpy).toHaveBeenCalledTimes(2)
  })

  it('should show a notification when devices are automatically added', async () => {
    // Get the stores
    const unifiedStore = useUnifiedStore()
    const notificationStore = useNotificationStore()

    // Mock the deviceExists and addDeviceWithCheck methods to add devices
    vi.spyOn(unifiedStore, 'deviceExists').mockReturnValue(false)
    vi.spyOn(unifiedStore, 'addDeviceWithCheck').mockReturnValue(true)

    // Spy on showSuccess method
    const showSuccessSpy = vi.spyOn(notificationStore, 'showSuccess')

    // Call discoverDevices
    await discoveryStore.discoverDevices()

    // Verify notification was shown
    expect(showSuccessSpy).toHaveBeenCalledTimes(1)
    expect(showSuccessSpy.mock.calls[0][0]).toContain('automatically added')
  })

  it('should add manual devices automatically to the store', async () => {
    // Get the unified store
    const unifiedStore = useUnifiedStore()

    // Set up the mock for addManualDevice
    vi.mocked(enhancedDeviceDiscoveryService.addManualDevice).mockResolvedValue(mockServer)

    // Mock the deviceExists and addDeviceWithCheck methods
    vi.spyOn(unifiedStore, 'deviceExists').mockReturnValue(false)
    const addDeviceSpy = vi.spyOn(unifiedStore, 'addDeviceWithCheck').mockReturnValue(true)

    // Call addManualDevice
    await discoveryStore.addManualDevice({
      address: '192.168.1.100',
      port: 32323
    })

    // Verify the underlying discovery service was called
    expect(enhancedDeviceDiscoveryService.addManualDevice).toHaveBeenCalled()

    // Verify devices were added to the store
    expect(addDeviceSpy).toHaveBeenCalledTimes(2)
  })

  it('should check if a device is added using the UnifiedStore', () => {
    // Get the unified store
    const unifiedStore = useUnifiedStore()

    // Mock the deviceExists method
    const deviceExistsSpy = vi.spyOn(unifiedStore, 'deviceExists').mockImplementation((device) => device.id === 'test-device')

    // Test with existing server and device
    discoveryStore.discoveryResults = mockDiscoveryResult

    // Call isDeviceAdded
    const result = discoveryStore.isDeviceAdded('server-1', 'device-1')

    // Verify the check was made through UnifiedStore.deviceExists
    expect(deviceExistsSpy).toHaveBeenCalled()
    expect(result).toBe(true)
  })
})
