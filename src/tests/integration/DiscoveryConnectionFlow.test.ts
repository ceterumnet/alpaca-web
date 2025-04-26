/**
 * Discovery and Connection Integration Tests
 *
 * This test suite verifies the complete flow of device discovery and connection
 * from UI components through the adapter to the unified store.
 */

import { describe, it, expect, beforeEach, vi, afterEach, type MockInstance } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import UnifiedStore from '../../stores/UnifiedStore'
import StoreAdapter, { createStoreAdapter } from '../../stores/StoreAdapter'
import type { TelescopeDevice, CameraDevice } from '../../types/DeviceTypes'
import { isTelescope, isCamera } from '../../types/DeviceTypes'
import DiscoveryPanel from '../../components/DiscoveryPanel.vue'

// Simulate real components with the adapter pattern
describe('Discovery and Connection Integration Tests', () => {
  let store: UnifiedStore
  let adapter: StoreAdapter
  let discoveryPanel: ReturnType<typeof mount>
  let discoveryStartSpy: MockInstance
  let discoveryStopSpy: MockInstance
  let mockDevices: Array<Record<string, unknown>>

  // Mock discovery results
  const mockDiscoveryResults = [
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

  beforeEach(() => {
    // Initialize store and adapter
    store = new UnifiedStore()
    adapter = createStoreAdapter(store)
    mockDevices = []

    // Setup spies
    discoveryStartSpy = vi.spyOn(store, 'startDiscovery')
    discoveryStopSpy = vi.spyOn(store, 'stopDiscovery')

    // Mock adding devices during discovery
    vi.spyOn(store, 'addDevice').mockImplementation((device) => {
      mockDevices.push(device)
      store.emit('deviceAdded', device)
      return true
    })

    // Mount the discovery panel component with the real component
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

  describe('Device Discovery Flow', () => {
    it('should start and stop discovery through the adapter', async () => {
      // Verify initial state
      expect(store.isDiscovering).toBe(false)

      // Trigger discovery start by clicking the button in the component
      await discoveryPanel.find('.discover-button').trigger('click')

      // Wait for reactive updates
      await flushPromises()

      // Verify startDiscovery was called on the store
      expect(discoveryStartSpy).toHaveBeenCalledTimes(1)
      expect(store.isDiscovering).toBe(true)

      // Now the button should show Stop Discovery
      expect(discoveryPanel.find('.discover-button').text()).toContain('Stop Discovery')

      // Click again to stop discovery
      await discoveryPanel.find('.discover-button').trigger('click')

      // Wait for reactive updates
      await flushPromises()

      // Verify stopDiscovery was called on the store
      expect(discoveryStopSpy).toHaveBeenCalledTimes(1)
      expect(store.isDiscovering).toBe(false)

      // Button should show Start Discovery again
      expect(discoveryPanel.find('.discover-button').text()).toContain('Start Discovery')
    })

    it('should properly handle discovered devices', async () => {
      // Start discovery
      adapter.startDiscovery()

      // Simulate devices being discovered
      mockDiscoveryResults.forEach((device) => {
        store.addDevice(device)
        store.emit('deviceAdded', device)
      })

      // Verify the adapter has the discovered devices
      expect(adapter.discoveredDevices.length).toBe(2)

      // Verify device type conversion is correct
      const telescopeDevice = adapter.discoveredDevices.find((d) => d.deviceType === 'telescope')
      const cameraDevice = adapter.discoveredDevices.find((d) => d.deviceType === 'camera')

      expect(telescopeDevice).toBeDefined()
      expect(cameraDevice).toBeDefined()
      expect(telescopeDevice?.deviceName).toBe('Main Telescope')
      expect(cameraDevice?.deviceName).toBe('CCD Camera')
    })

    it('should filter devices by type', async () => {
      // Add devices to the store
      mockDiscoveryResults.forEach((device) => {
        store.addDevice(device)
        store.emit('deviceAdded', device)
      })

      // Use the adapter to filter by type
      const telescopes = adapter.getDevicesByType('telescope')
      const cameras = adapter.getDevicesByType('camera')

      // Verify correct filtering
      expect(telescopes.length).toBe(1)
      expect(cameras.length).toBe(1)
      expect(telescopes[0].deviceName).toBe('Main Telescope')
      expect(cameras[0].deviceName).toBe('CCD Camera')
    })
  })

  describe('Device Connection Flow', () => {
    it('should connect to a device through the adapter', async () => {
      // Add a test device
      const testDevice = mockDiscoveryResults[0] // Telescope
      store.addDevice(testDevice)
      store.emit('deviceAdded', testDevice)

      // Mock the connect method to resolve after a delay
      vi.spyOn(store, 'connectDevice').mockImplementation(async (deviceId) => {
        const device = store.getDeviceById(deviceId)
        if (device) {
          // Update connecting state
          store.updateDevice(deviceId, { isConnecting: true })

          // Simulate connection delay
          await new Promise((resolve) => setTimeout(resolve, 100))

          // Update to connected
          store.updateDevice(deviceId, {
            isConnected: true,
            isConnecting: false,
            lastConnected: new Date().toISOString()
          })

          store.emit('deviceUpdated', deviceId, {
            isConnected: true,
            isConnecting: false
          })

          return true
        }
        return false
      })

      // Connect through the adapter
      const connectPromise = adapter.connectToDevice('telescope-1')

      // Check connecting state
      const connectingDevice = store.getDeviceById('telescope-1')
      expect(connectingDevice?.isConnecting).toBe(true)

      // Wait for connection to complete
      await connectPromise
      await flushPromises()

      // Verify connected state
      const connectedDevice = store.getDeviceById('telescope-1')
      expect(connectedDevice?.isConnected).toBe(true)
      expect(connectedDevice?.isConnecting).toBe(false)

      // Verify adapter connected devices list is updated
      expect(adapter.connectedDevices.length).toBe(1)
      expect(adapter.connectedDevices[0].id).toBe('telescope-1')
    })

    it('should disconnect from a device through the adapter', async () => {
      // Add a connected test device
      const testDevice = {
        ...mockDiscoveryResults[0],
        isConnected: true
      }
      store.addDevice(testDevice)
      store.emit('deviceAdded', testDevice)

      // Mock the disconnect method to resolve after a delay
      vi.spyOn(store, 'disconnectDevice').mockImplementation(async (deviceId) => {
        const device = store.getDeviceById(deviceId)
        if (device) {
          // Update disconnecting state
          store.updateDevice(deviceId, { isDisconnecting: true })

          // Simulate disconnection delay
          await new Promise((resolve) => setTimeout(resolve, 100))

          // Update to disconnected
          store.updateDevice(deviceId, {
            isConnected: false,
            isDisconnecting: false
          })

          store.emit('deviceUpdated', deviceId, {
            isConnected: false,
            isDisconnecting: false
          })

          return true
        }
        return false
      })

      // Verify device is in connected devices
      expect(adapter.connectedDevices.length).toBe(1)

      // Disconnect through the adapter
      const disconnectPromise = adapter.disconnectDevice('telescope-1')

      // Check disconnecting state
      const disconnectingDevice = store.getDeviceById('telescope-1')
      expect(disconnectingDevice?.isDisconnecting).toBe(true)

      // Wait for disconnection to complete
      await disconnectPromise
      await flushPromises()

      // Verify disconnected state
      const disconnectedDevice = store.getDeviceById('telescope-1')
      expect(disconnectedDevice?.isConnected).toBe(false)
      expect(disconnectedDevice?.isDisconnecting).toBe(false)

      // Verify adapter connected devices list is updated
      expect(adapter.connectedDevices.length).toBe(0)
    })
  })

  describe('Type-Specific Device Handling', () => {
    it('should handle telescope-specific properties', async () => {
      // Define test telescope with specific properties
      const telescope: TelescopeDevice = {
        id: 'telescope-2',
        name: 'Advanced Telescope',
        type: 'telescope',
        ipAddress: '192.168.1.200',
        port: 4569,
        isConnected: false,
        isConnecting: false,
        isDisconnecting: false,
        properties: {},
        // Telescope-specific properties
        trackingEnabled: true,
        currentRa: '12h 30m 45s',
        currentDec: '+45° 30\' 00"',
        targetRa: '12h 00m 00s',
        targetDec: '+40° 00\' 00"',
        slewRate: 2,
        isPierEast: true,
        canSlew: true
      }

      // Add the telescope to the store
      store.addDevice(telescope)

      // Get the device through the adapter
      const legacyTelescope = adapter.getDeviceById('telescope-2')

      // Verify base properties
      expect(legacyTelescope).toBeDefined()
      expect(legacyTelescope?.deviceName).toBe('Advanced Telescope')

      // Verify the original telescope is accessible
      const originalDevice = legacyTelescope?._original as TelescopeDevice
      expect(originalDevice).toBeDefined()
      expect(isTelescope(originalDevice)).toBe(true)
      expect(originalDevice.trackingEnabled).toBe(true)
      expect(originalDevice.currentRa).toBe('12h 30m 45s')
    })

    it('should handle camera-specific properties', async () => {
      // Define test camera with specific properties
      const camera: CameraDevice = {
        id: 'camera-2',
        name: 'Advanced Camera',
        type: 'camera',
        ipAddress: '192.168.1.201',
        port: 4570,
        isConnected: false,
        isConnecting: false,
        isDisconnecting: false,
        properties: {},
        // Camera-specific properties
        exposureTime: 10.5,
        gain: 100,
        coolerEnabled: true,
        currentTemperature: -15.5,
        targetTemperature: -20.0,
        binning: 2,
        sensorWidth: 4000,
        sensorHeight: 3000
      }

      // Add the camera to the store
      store.addDevice(camera)

      // Get the device through the adapter
      const legacyCamera = adapter.getDeviceById('camera-2')

      // Verify base properties
      expect(legacyCamera).toBeDefined()
      expect(legacyCamera?.deviceName).toBe('Advanced Camera')

      // Verify the original camera is accessible
      const originalDevice = legacyCamera?._original as CameraDevice
      expect(originalDevice).toBeDefined()
      expect(isCamera(originalDevice)).toBe(true)
      expect(originalDevice.exposureTime).toBe(10.5)
      expect(originalDevice.coolerEnabled).toBe(true)
      expect(originalDevice.currentTemperature).toBe(-15.5)
    })
  })

  describe('End-to-End Device Flow', () => {
    it('should handle a complete device lifecycle', async () => {
      // 1. Start discovery
      adapter.startDiscovery()
      expect(store.isDiscovering).toBe(true)

      // 2. Discover a device
      store.addDevice(mockDiscoveryResults[0])
      store.emit('deviceAdded', mockDiscoveryResults[0])

      // 3. Verify device is discovered
      expect(adapter.discoveredDevices.length).toBe(1)

      // 4. Connect to device
      // Mock the connect method
      vi.spyOn(store, 'connectDevice').mockImplementation(async (deviceId) => {
        const device = store.getDeviceById(deviceId)
        if (device) {
          store.updateDevice(deviceId, {
            isConnected: true,
            isConnecting: false
          })
          store.emit('deviceUpdated', deviceId, {
            isConnected: true,
            isConnecting: false
          })
          return true
        }
        return false
      })

      await adapter.connectToDevice('telescope-1')

      // 5. Verify device is connected
      expect(adapter.connectedDevices.length).toBe(1)

      // 6. Update device properties
      const propertiesToUpdate = {
        temperature: 25.5,
        humidity: 45,
        location: 'Observatory 1'
      }

      adapter.updateDeviceProperties('telescope-1', propertiesToUpdate)

      // 7. Verify properties were updated
      const updatedDevice = store.getDeviceById('telescope-1')
      expect(updatedDevice?.properties.temperature).toBe(25.5)
      expect(updatedDevice?.properties.humidity).toBe(45)

      // 8. Disconnect device
      vi.spyOn(store, 'disconnectDevice').mockImplementation(async (deviceId) => {
        const device = store.getDeviceById(deviceId)
        if (device) {
          store.updateDevice(deviceId, {
            isConnected: false,
            isDisconnecting: false
          })
          store.emit('deviceUpdated', deviceId, {
            isConnected: false,
            isDisconnecting: false
          })
          return true
        }
        return false
      })

      await adapter.disconnectDevice('telescope-1')

      // 9. Verify device is disconnected
      expect(adapter.connectedDevices.length).toBe(0)
      const deviceAfterDisconnect = store.getDeviceById('telescope-1')
      expect(deviceAfterDisconnect?.isConnected).toBe(false)

      // 10. Stop discovery
      adapter.stopDiscovery()
      expect(store.isDiscovering).toBe(false)
    })
  })
})
