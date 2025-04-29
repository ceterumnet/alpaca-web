/**
 * Device Control Integration Tests
 *
 * This test suite verifies the device control functionality after connection,
 * testing the full flow from connection through the adapter to device operations.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { useUnifiedStore } from '../../stores/UnifiedStore'
import { createStoreAdapter } from '../../stores/StoreAdapter'
import type { TelescopeDevice } from '../../types/DeviceTypes'
import { createPinia, setActivePinia } from 'pinia'

// Extend types for testing
type UnifiedStoreWithTelescopeControl = ReturnType<typeof useUnifiedStore> & {
  controlTelescopeSlew: (deviceId: string, direction: string) => boolean
  controlTelescopeStop: (deviceId: string) => boolean
}

type StoreAdapterWithTelescopeControl = ReturnType<typeof createStoreAdapter> & {
  controlTelescopeSlew: (deviceId: string, direction: string) => boolean
  controlTelescopeStop: (deviceId: string) => boolean
}

// Mock TelescopeControl component for testing
const TelescopeControl = defineComponent({
  props: {
    device: {
      type: Object,
      required: true
    },
    store: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      status: 'Idle'
    }
  },
  methods: {
    slewNorth() {
      this.status = 'Slewing North'
      this.store.controlTelescopeSlew(this.device.id, 'north')
    },
    slewSouth() {
      this.status = 'Slewing South'
      this.store.controlTelescopeSlew(this.device.id, 'south')
    },
    slewEast() {
      this.status = 'Slewing East'
      this.store.controlTelescopeSlew(this.device.id, 'east')
    },
    slewWest() {
      this.status = 'Slewing West'
      this.store.controlTelescopeSlew(this.device.id, 'west')
    },
    stopSlew() {
      this.status = 'Idle'
      this.store.controlTelescopeStop(this.device.id)
    }
  },
  template: `
    <div class="telescope-control">
      <h3>{{ device.deviceName }}</h3>
      <div class="slew-controls">
        <button class="slew-north" @click="slewNorth">Slew North</button>
        <button class="slew-south" @click="slewSouth">Slew South</button>
        <button class="slew-east" @click="slewEast">Slew East</button>
        <button class="slew-west" @click="slewWest">Slew West</button>
        <button class="stop-slew" @click="stopSlew">Stop</button>
      </div>
      <div class="status">
        Status: {{ status }}
      </div>
    </div>
  `
})

describe('Device Control Integration Tests', () => {
  let store: UnifiedStoreWithTelescopeControl
  let adapter: StoreAdapterWithTelescopeControl
  let telescopeControl: ReturnType<typeof mount>
  let slewSpy: ReturnType<typeof vi.fn>
  let stopSlewSpy: ReturnType<typeof vi.fn>

  const testTelescope = {
    id: 'telescope-1',
    name: 'Main Telescope',
    type: 'telescope',
    ipAddress: '192.168.1.100',
    port: 4567,
    isConnected: true,
    isConnecting: false,
    isDisconnecting: false,
    properties: {
      aperture: 200,
      focalLength: 1000,
      maxSlew: 5
    },
    telemetry: {
      ra: '12:00:00',
      dec: '+30:00:00',
      alt: 45.5,
      az: 180.3,
      slewing: false,
      tracking: true
    }
  }

  beforeEach(() => {
    // Set up a fresh Pinia instance for each test
    setActivePinia(createPinia())

    // Set up fresh store and adapter for each test
    store = useUnifiedStore() as UnifiedStoreWithTelescopeControl
    adapter = createStoreAdapter(store) as StoreAdapterWithTelescopeControl

    // Add a connected telescope
    store.addDevice(testTelescope)
    store.emit('deviceAdded', testTelescope)

    // Create mock functions
    slewSpy = vi.fn((deviceId, direction) => {
      const device = store.getDeviceById(deviceId) as TelescopeDevice
      if (device && device.isConnected) {
        // Update telemetry to reflect slewing
        store.updateDevice(deviceId, {
          telemetry: {
            ...(device.telemetry || {}),
            slewing: true,
            slewDirection: direction
          }
        })
        store.emit('deviceUpdated', deviceId, {
          telemetry: {
            slewing: true,
            slewDirection: direction
          }
        })
        return true
      }
      return false
    })

    stopSlewSpy = vi.fn((deviceId) => {
      const device = store.getDeviceById(deviceId) as TelescopeDevice
      if (device && device.isConnected) {
        // Update telemetry to reflect stopped
        store.updateDevice(deviceId, {
          telemetry: {
            ...(device.telemetry || {}),
            slewing: false,
            slewDirection: null
          }
        })
        store.emit('deviceUpdated', deviceId, {
          telemetry: {
            slewing: false,
            slewDirection: null
          }
        })
        return true
      }
      return false
    })

    // Add the mock methods to both the store and adapter
    store.controlTelescopeSlew = slewSpy
    store.controlTelescopeStop = stopSlewSpy
    adapter.controlTelescopeSlew = slewSpy
    adapter.controlTelescopeStop = stopSlewSpy

    // Mount the telescope control component
    const device = adapter.getDeviceById('telescope-1')
    if (device) {
      telescopeControl = mount(TelescopeControl, {
        props: {
          device: device,
          store: adapter
        },
        global: {
          mocks: {
            $store: adapter
          }
        }
      })
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
    if (telescopeControl) telescopeControl.unmount()
  })

  describe('Telescope Control Operations', () => {
    it('should control telescope slewing through the adapter', async () => {
      // Verify initial state
      const initialDevice = store.getDeviceById('telescope-1') as TelescopeDevice
      expect(initialDevice.telemetry?.slewing).toBeFalsy()

      // Trigger slew north operation
      await telescopeControl.find('.slew-north').trigger('click')
      await flushPromises()

      // Verify slew command was called
      expect(slewSpy).toHaveBeenCalledWith('telescope-1', 'north')

      // Verify device state was updated
      const updatedDevice = store.getDeviceById('telescope-1') as TelescopeDevice
      expect(updatedDevice.telemetry?.slewing).toBe(true)
      expect(updatedDevice.telemetry?.slewDirection).toBe('north')

      // Verify component status was updated
      expect(telescopeControl.find('.status').text()).toContain('Slewing North')

      // Now stop slewing
      await telescopeControl.find('.stop-slew').trigger('click')
      await flushPromises()

      // Verify stop command was called
      expect(stopSlewSpy).toHaveBeenCalledWith('telescope-1')

      // Verify device state was updated
      const stoppedDevice = store.getDeviceById('telescope-1') as TelescopeDevice
      expect(stoppedDevice.telemetry?.slewing).toBe(false)

      // Verify component status was updated
      expect(telescopeControl.find('.status').text()).toContain('Idle')
    })

    it('should control telescope slewing in different directions', async () => {
      // Test slew east
      await telescopeControl.find('.slew-east').trigger('click')
      await flushPromises()

      // Verify correct direction
      expect(slewSpy).toHaveBeenCalledWith('telescope-1', 'east')
      const eastDevice = store.getDeviceById('telescope-1') as TelescopeDevice
      expect(eastDevice.telemetry?.slewDirection).toBe('east')
      expect(telescopeControl.find('.status').text()).toContain('Slewing East')

      // Test slew west
      await telescopeControl.find('.slew-west').trigger('click')
      await flushPromises()

      // Verify correct direction
      expect(slewSpy).toHaveBeenCalledWith('telescope-1', 'west')
      const westDevice = store.getDeviceById('telescope-1') as TelescopeDevice
      expect(westDevice.telemetry?.slewDirection).toBe('west')
      expect(telescopeControl.find('.status').text()).toContain('Slewing West')

      // Test slew south
      await telescopeControl.find('.slew-south').trigger('click')
      await flushPromises()

      // Verify correct direction
      expect(slewSpy).toHaveBeenCalledWith('telescope-1', 'south')
      const southDevice = store.getDeviceById('telescope-1') as TelescopeDevice
      expect(southDevice.telemetry?.slewDirection).toBe('south')
      expect(telescopeControl.find('.status').text()).toContain('Slewing South')
    })
  })

  describe('Error Handling in Device Control', () => {
    it('should handle disconnected device control gracefully', async () => {
      // Disconnect the device
      store.updateDevice('telescope-1', {
        isConnected: false
      })
      store.emit('deviceUpdated', 'telescope-1', {
        isConnected: false
      })

      // Mock failure for disconnected device
      slewSpy.mockImplementation((deviceId) => {
        const device = store.getDeviceById(deviceId)
        return device?.isConnected === true
      })

      // Try to slew with disconnected device
      await telescopeControl.find('.slew-north').trigger('click')
      await flushPromises()

      // Verify slew command was called but failed
      expect(slewSpy).toHaveBeenCalledWith('telescope-1', 'north')

      // Device state should not be updated for slewing
      const device = store.getDeviceById('telescope-1') as TelescopeDevice
      expect(device.telemetry?.slewing).toBeFalsy()
    })
  })
})
