/**
 * Adapter Flow Tests - Verifies data flows between new store and legacy components
 *
 * This script tests that the adapter properly translates operations between
 * the new unified store and the legacy component expectations.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useUnifiedStore } from '../../stores/UnifiedStore'
import StoreAdapter from '../../stores/StoreAdapter'
import type { LegacyDevice } from '../../stores/StoreAdapter'
import { createPinia, setActivePinia } from 'pinia'

describe('Store Adapter Tests', () => {
  let store: ReturnType<typeof useUnifiedStore>
  let adapter: StoreAdapter

  // Colors for console output (for pretty logging)
  const GREEN = '\x1b[32m'
  const RESET = '\x1b[0m'

  beforeEach(() => {
    // Set up a fresh Pinia instance for each test
    setActivePinia(createPinia())
    store = useUnifiedStore()
    adapter = new StoreAdapter(store)
  })

  describe('Device Discovery Flow', () => {
    it('should expose devices from the new store to legacy components', () => {
      // Add a device through the new store API
      const deviceToAdd = {
        id: 'test-device-1',
        name: 'Test Device 1',
        type: 'alpaca',
        ipAddress: '192.168.1.100',
        port: 4567,
        isConnected: false,
        isConnecting: false,
        isDisconnecting: false,
        properties: {}
      }

      // Add to the store
      store.addDevice(deviceToAdd)

      // Trigger the event to ensure it's in the adapter
      store.emit('deviceAdded', deviceToAdd)

      // Verify the adapter exposes it correctly to legacy components
      expect(adapter.discoveredDevices.length).toBe(1)
      expect(adapter.discoveredDevices[0].id).toBe('test-device-1')
      expect(adapter.discoveredDevices[0].deviceName).toBe('Test Device 1')
      console.log(`${GREEN}✓ New store devices are correctly adapted to legacy format${RESET}`)
    })

    it('should add legacy format devices to the new store', () => {
      // Test legacy format device addition
      const legacyDevice: LegacyDevice = {
        id: 'legacy-device-1',
        deviceName: 'Legacy Device',
        deviceType: 'alpaca',
        address: '192.168.1.101',
        devicePort: 4568,
        isConnected: false
      }

      adapter.addDevice(legacyDevice)

      // Verify the new store received it
      const device = store.getDeviceById('legacy-device-1')
      expect(device).not.toBeNull()
      expect(device?.name).toBe('Legacy Device')
      console.log(
        `${GREEN}✓ Legacy format devices are correctly transformed to new store format${RESET}`
      )
    })
  })

  describe('Device Connection Flow', () => {
    it('should update connection status in both stores', async () => {
      // Add test device
      const testDevice = {
        id: 'test-device-1',
        name: 'Test Device 1',
        type: 'alpaca',
        ipAddress: '192.168.1.100',
        port: 4567,
        isConnected: false,
        isConnecting: false,
        isDisconnecting: false,
        properties: {}
      }
      store.addDevice(testDevice)
      store.emit('deviceAdded', testDevice)

      // Mock connectDevice to bypass actual API call
      const originalConnectDevice = store.connectDevice
      store.connectDevice = async (deviceId: string) => {
        // First set connecting state
        store.updateDevice(deviceId, { isConnecting: true })

        // Simulate successful connection after a short delay
        await new Promise((resolve) => setTimeout(resolve, 10))

        // Update the connection state
        store.updateDevice(deviceId, {
          isConnected: true,
          isConnecting: false
        })

        // Emit the event to trigger adapter updates
        store.emit('deviceUpdated', deviceId, {
          isConnected: true,
          isConnecting: false
        })

        return true
      }

      // Connect using adapter (legacy) API
      const connectPromise = adapter.connectToDevice('test-device-1')

      // Verify connecting state
      const device = store.getDeviceById('test-device-1')
      expect(device?.isConnecting).toBe(true)
      console.log(
        `${GREEN}✓ Connection request via adapter updates connection status in new store${RESET}`
      )

      // Wait for connection to complete
      await connectPromise

      // Verify adapter reports connected state properly
      const legacyDevice = adapter.getDeviceById('test-device-1')
      expect(legacyDevice?.isConnected).toBe(true)
      console.log(`${GREEN}✓ Connection state in new store is reflected in adapter${RESET}`)

      // Restore original method
      store.connectDevice = originalConnectDevice
    })
  })

  describe('Device Data Retrieval', () => {
    it('should correctly handle device properties between stores', () => {
      // Add test device with properties
      const testDevice = {
        id: 'test-device-1',
        name: 'Test Device 1',
        type: 'alpaca',
        isConnected: false,
        isConnecting: false,
        isDisconnecting: false,
        properties: {
          temperature: 25.5,
          humidity: 45,
          firmwareVersion: '1.2.3'
        }
      }
      store.addDevice(testDevice)
      store.emit('deviceAdded', testDevice)

      // Verify adapter exposes properties
      const legacyDevice = adapter.getDeviceById('test-device-1')
      expect(legacyDevice?.properties?.temperature).toBe(25.5)
      console.log(`${GREEN}✓ Device properties from new store are accessible via adapter${RESET}`)

      // Update property through adapter
      adapter.updateDeviceProperties('test-device-1', { temperature: 26.7 })

      // Verify new store is updated
      const updatedDevice = store.getDeviceById('test-device-1')
      expect(updatedDevice?.properties.temperature).toBe(26.7)
      console.log(`${GREEN}✓ Property updates via adapter are reflected in new store${RESET}`)
    })
  })

  describe('Device Filtering', () => {
    it('should filter devices by type correctly', () => {
      // Add multiple devices of different types
      const alpacaDevice1 = {
        id: 'alpaca-1',
        name: 'Alpaca 1',
        type: 'alpaca',
        isConnected: false,
        isConnecting: false,
        isDisconnecting: false,
        properties: {}
      }
      const alpacaDevice2 = {
        id: 'alpaca-2',
        name: 'Alpaca 2',
        type: 'alpaca',
        isConnected: false,
        isConnecting: false,
        isDisconnecting: false,
        properties: {}
      }
      const weatherDevice = {
        id: 'weather-1',
        name: 'Weather Station',
        type: 'weather',
        isConnected: false,
        isConnecting: false,
        isDisconnecting: false,
        properties: {}
      }

      // Add to stores
      store.addDevice(alpacaDevice1)
      store.emit('deviceAdded', alpacaDevice1)
      store.addDevice(alpacaDevice2)
      store.emit('deviceAdded', alpacaDevice2)
      store.addDevice(weatherDevice)
      store.emit('deviceAdded', weatherDevice)

      // Test filtering by type
      const alpacaDevices = adapter.getDevicesByType('alpaca')
      expect(alpacaDevices.length).toBe(2)
      expect(alpacaDevices.every((d) => d.deviceType === 'alpaca')).toBe(true)
      console.log(`${GREEN}✓ Adapter correctly filters devices by type${RESET}`)
    })
  })
})
