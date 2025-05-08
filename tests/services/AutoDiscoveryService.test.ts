/**
 * Tests for the AutoDiscoveryService
 *
 * These tests validate that the AutoDiscoveryService correctly:
 * - Calls the EnhancedDeviceDiscoveryService for device discovery
 * - Automatically adds discovered devices to the UnifiedStore
 * - Notifies users of newly added devices
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { autoDiscoveryService } from '@/services/AutoDiscoveryService'
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
      isDeviceAdded: vi.fn(),
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

describe('AutoDiscoveryService', () => {
  beforeEach(() => {
    // Create a fresh Pinia instance for each test
    setActivePinia(createPinia())

    // Reset all mocks
    vi.resetAllMocks()

    // Set up the mock implementation for discoverDevices
    vi.mocked(enhancedDeviceDiscoveryService.discoverDevices).mockResolvedValue(mockDiscoveryResult)

    // Set up createUnifiedDevice to return our mock device
    vi.mocked(enhancedDeviceDiscoveryService.createUnifiedDevice).mockReturnValue(mockUnifiedDevice)

    // Set up isDeviceAdded to return false (device not yet added)
    vi.mocked(enhancedDeviceDiscoveryService.isDeviceAdded).mockReturnValue(false)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should discover devices and automatically add them to the store', async () => {
    // Get the stores
    const unifiedStore = useUnifiedStore()

    // Spy on addDevice method
    const addDeviceSpy = vi.spyOn(unifiedStore, 'addDevice')

    // Call discoverDevices
    await autoDiscoveryService.discoverDevices()

    // Verify the underlying discovery service was called
    expect(enhancedDeviceDiscoveryService.discoverDevices).toHaveBeenCalled()

    // Verify createUnifiedDevice was called for each device
    expect(enhancedDeviceDiscoveryService.createUnifiedDevice).toHaveBeenCalledTimes(2)

    // Verify isDeviceAdded was called to check if devices already exist
    expect(enhancedDeviceDiscoveryService.isDeviceAdded).toHaveBeenCalledTimes(2)

    // Verify devices were added to the store
    expect(addDeviceSpy).toHaveBeenCalledTimes(2)
    expect(addDeviceSpy).toHaveBeenCalledWith(mockUnifiedDevice)
  })

  it('should not add devices that are already in the store', async () => {
    // Get the stores
    const unifiedStore = useUnifiedStore()

    // Change the mock to indicate device is already added
    vi.mocked(enhancedDeviceDiscoveryService.isDeviceAdded).mockReturnValue(true)

    // Spy on addDevice method
    const addDeviceSpy = vi.spyOn(unifiedStore, 'addDevice')

    // Call discoverDevices
    await autoDiscoveryService.discoverDevices()

    // Verify the checks were made
    expect(enhancedDeviceDiscoveryService.isDeviceAdded).toHaveBeenCalledTimes(2)

    // Verify no devices were added since they already exist
    expect(addDeviceSpy).not.toHaveBeenCalled()
  })

  it('should show a notification when devices are automatically added', async () => {
    // Get the stores
    const notificationStore = useNotificationStore()

    // Spy on showSuccess method
    const showSuccessSpy = vi.spyOn(notificationStore, 'showSuccess')

    // Call discoverDevices
    await autoDiscoveryService.discoverDevices()

    // Verify notification was shown
    expect(showSuccessSpy).toHaveBeenCalledTimes(1)
    expect(showSuccessSpy.mock.calls[0][0]).toContain('automatically added')
  })

  it('should add manual devices automatically to the store', async () => {
    // Get the stores
    const unifiedStore = useUnifiedStore()

    // Set up the mock for addManualDevice
    vi.mocked(enhancedDeviceDiscoveryService.addManualDevice).mockResolvedValue(mockServer)

    // Spy on addDevice method
    const addDeviceSpy = vi.spyOn(unifiedStore, 'addDevice')

    // Call addManualDevice
    await autoDiscoveryService.addManualDevice({
      address: '192.168.1.100',
      port: 32323
    })

    // Verify the underlying discovery service was called
    expect(enhancedDeviceDiscoveryService.addManualDevice).toHaveBeenCalled()

    // Verify devices were added to the store
    expect(addDeviceSpy).toHaveBeenCalledTimes(2)
  })
})
