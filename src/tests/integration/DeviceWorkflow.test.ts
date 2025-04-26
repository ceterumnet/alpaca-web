/**
 * Device Workflow Integration Tests
 *
 * This test suite verifies the complete workflow of using the adapter approach
 * from device discovery through connection to device control.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import UnifiedStore from '../../stores/UnifiedStore'
import { createStoreAdapter } from '../../stores/StoreAdapter'
import DiscoveryPanel from '../../components/DiscoveryPanel.vue'

// Sample test devices
const testDevices = [
  {
    id: 'telescope-1',
    name: 'Main Telescope',
    type: 'telescope',
    ipAddress: '192.168.1.100',
    port: 4567,
    isConnected: false,
    isConnecting: false,
    isDisconnecting: false,
    properties: {
      aperture: 200,
      focalLength: 1000,
      maxSlew: 5
    }
  },
  {
    id: 'camera-1',
    name: 'CCD Camera',
    type: 'camera',
    ipAddress: '192.168.1.101',
    port: 4568,
    isConnected: false,
    isConnecting: false,
    isDisconnecting: false,
    properties: {
      sensorWidth: 3000,
      sensorHeight: 2000,
      pixelSize: 3.8
    }
  }
]

describe('Device Workflow Integration', () => {
  let store: UnifiedStore
  let adapter: ReturnType<typeof createStoreAdapter>
  let discoveryPanel: ReturnType<typeof mount>
  let startDiscoverySpy: ReturnType<typeof vi.spyOn>
  let stopDiscoverySpy: ReturnType<typeof vi.spyOn>
  let connectDeviceSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Set up fresh store and adapter for each test
    store = new UnifiedStore()
    adapter = createStoreAdapter(store)

    // Set up spies
    startDiscoverySpy = vi.spyOn(store, 'startDiscovery') as unknown as ReturnType<typeof vi.spyOn>
    stopDiscoverySpy = vi.spyOn(store, 'stopDiscovery') as unknown as ReturnType<typeof vi.spyOn>
    connectDeviceSpy = vi.spyOn(store, 'connectDevice') as unknown as ReturnType<typeof vi.spyOn>

    // Mock device discovery
    vi.spyOn(store, 'addDevice').mockImplementation((device) => {
      // Add the device
      store.emit('deviceAdded', device)
      return true
    })

    // Mount the discovery panel
    discoveryPanel = mount(DiscoveryPanel, {
      props: {
        store: adapter
      }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    discoveryPanel.unmount()
  })

  describe('End-to-End Device Workflow', () => {
    it('should handle the complete discovery and connection workflow', async () => {
      // 1. Verify initial state
      expect(store.isDiscovering).toBe(false)
      expect(adapter.discoveredDevices.length).toBe(0)

      // 2. Start device discovery
      await discoveryPanel.find('.discover-button').trigger('click')
      await flushPromises()

      // Verify discovery started
      expect(startDiscoverySpy).toHaveBeenCalledTimes(1)
      expect(store.isDiscovering).toBe(true)

      // 3. Simulate devices being discovered by adding directly to adapter
      testDevices.forEach((device) => {
        adapter.addDevice({
          id: device.id,
          deviceName: device.name,
          deviceType: device.type,
          address: device.ipAddress as string,
          devicePort: device.port as number,
          isConnected: device.isConnected,
          status: 'idle',
          properties: device.properties
        })
      })
      await flushPromises()

      // Force component update
      await discoveryPanel.setProps({ store: adapter })

      // Verify devices are discovered
      expect(adapter.discoveredDevices.length).toBe(2)

      // 4. Connect to a device - use adapter directly since component may not update
      const deviceToConnect = adapter.discoveredDevices[0]
      await adapter.connectToDevice(deviceToConnect)
      await flushPromises()

      // Verify connect was called on the store
      expect(connectDeviceSpy).toHaveBeenCalled()

      // 5. Simulate successful connection
      await store.updateDevice('telescope-1', {
        isConnected: true,
        isConnecting: false
      })
      store.emit('deviceUpdated', 'telescope-1', {
        isConnected: true,
        isConnecting: false
      })
      await flushPromises()

      // Verify device is now connected in adapter
      expect(adapter.connectedDevices.length).toBe(1)
      expect(adapter.connectedDevices[0].id).toBe('telescope-1')

      // 6. Stop discovery
      await discoveryPanel.find('.discover-button').trigger('click')
      await flushPromises()

      // Verify discovery stopped
      expect(stopDiscoverySpy).toHaveBeenCalledTimes(1)
      expect(store.isDiscovering).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle connection failures properly', async () => {
      // Add a test device directly to the adapter
      adapter.addDevice({
        id: testDevices[0].id,
        deviceName: testDevices[0].name,
        deviceType: testDevices[0].type,
        address: testDevices[0].ipAddress as string,
        devicePort: testDevices[0].port as number,
        isConnected: false,
        status: 'idle',
        properties: testDevices[0].properties
      })
      await flushPromises()

      // Mock a connection failure
      connectDeviceSpy.mockImplementation(async () => {
        await store.updateDevice('telescope-1', {
          isConnecting: true
        })

        // Simulate failure after a delay
        await new Promise((resolve) => setTimeout(resolve, 100))

        await store.updateDevice('telescope-1', {
          isConnecting: false,
          isConnected: false,
          error: 'Connection failed'
        })

        store.emit('deviceUpdated', 'telescope-1', {
          isConnecting: false,
          isConnected: false,
          error: 'Connection failed'
        })

        return false
      })

      // Connect directly using the adapter
      const connectionResult = await adapter.connectToDevice('telescope-1')
      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Verify connection failed
      expect(connectionResult).toBe(false)
      expect(adapter.connectedDevices.length).toBe(0)

      // Get the updated device
      const failedDevice = adapter.getDeviceById('telescope-1')
      expect(failedDevice).not.toBeNull()
      expect(failedDevice?.isConnected).toBe(false)
    })
  })
})
