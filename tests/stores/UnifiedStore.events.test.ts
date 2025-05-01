import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import type { Device, DeviceEvent } from '@/stores/UnifiedStore'

describe('UnifiedStore Event System', () => {
  // Setup fresh pinia instance before each test
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // Clean up mocks
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Typed event system', () => {
    it('should register and call event listeners', () => {
      const store = useUnifiedStore()
      const mockListener = vi.fn()

      // Register the listener
      store.addEventListener(mockListener)

      // Create a mock device
      const mockDevice: Device = {
        id: 'test-device-1',
        type: 'camera',
        name: 'Test Camera',
        properties: {},
        isConnected: false,
        isConnecting: false,
        isDisconnecting: false
      }

      // Add the device which should trigger an event
      store.addDevice(mockDevice)

      // Verify the listener was called with the appropriate event
      expect(mockListener).toHaveBeenCalledTimes(1)
      expect(mockListener).toHaveBeenCalledWith({
        type: 'deviceAdded',
        device: expect.objectContaining({ id: 'test-device-1' })
      })
    })

    it('should remove event listeners correctly', () => {
      const store = useUnifiedStore()
      const mockListener = vi.fn()

      // Register the listener
      store.addEventListener(mockListener)

      // Add a test device to verify registration works
      const device1: Device = {
        id: 'test-device-1',
        type: 'camera',
        name: 'Test Camera',
        properties: {},
        isConnected: false,
        isConnecting: false,
        isDisconnecting: false
      }
      store.addDevice(device1)
      expect(mockListener).toHaveBeenCalledTimes(1)

      // Reset mock
      mockListener.mockClear()

      // Remove the listener
      store.removeEventListener(mockListener)

      // Add another device, should not trigger the listener
      const device2: Device = {
        id: 'test-device-2',
        type: 'camera',
        name: 'Test Camera 2',
        properties: {},
        isConnected: false,
        isConnecting: false,
        isDisconnecting: false
      }
      store.addDevice(device2)
      expect(mockListener).not.toHaveBeenCalled()
    })

    it('should emit devicePropertyChanged events when properties are updated', () => {
      const store = useUnifiedStore()
      const mockListener = vi.fn()

      // Register the listener
      store.addEventListener(mockListener)

      // Add a test device
      const deviceId = 'test-device-1'
      const testDevice: Device = {
        id: deviceId,
        type: 'camera',
        name: 'Test Camera',
        properties: {},
        isConnected: false,
        isConnecting: false,
        isDisconnecting: false
      }
      store.addDevice(testDevice)

      // Reset mock after device added event
      mockListener.mockClear()

      // Update device properties
      store.updateDeviceProperties(deviceId, {
        isExposing: true,
        exposureProgress: 25
      })

      // Verify devicePropertyChanged events were emitted
      expect(mockListener).toHaveBeenCalledTimes(3) // one for deviceUpdated, and one for each property change

      // Verify we got a deviceUpdated event first
      const firstCall = mockListener.mock.calls[0][0] as DeviceEvent
      expect(firstCall.type).toBe('deviceUpdated')

      // Check that the next two calls are devicePropertyChanged events
      mockListener.mock.calls.slice(1).forEach((call) => {
        const event = call[0] as DeviceEvent
        expect(event.type).toBe('devicePropertyChanged')
        if (event.type === 'devicePropertyChanged') {
          expect(event.deviceId).toBe(deviceId)
        }
      })

      // Check that we got events for both properties
      const props = mockListener.mock.calls
        .map((call) => {
          const event = call[0] as DeviceEvent
          return event.type === 'devicePropertyChanged' ? event.property : null
        })
        .filter(Boolean)

      expect(props).toContain('isExposing')
      expect(props).toContain('exposureProgress')
    })
  })

  describe('String-based event system', () => {
    it('should register and call string event handlers', () => {
      const store = useUnifiedStore()
      const mockHandler = vi.fn()

      // Register the handler
      store.on('testEvent', mockHandler)

      // Emit the event
      store.emit('testEvent', 'arg1', 'arg2')

      // Verify the handler was called with the arguments
      expect(mockHandler).toHaveBeenCalledTimes(1)
      expect(mockHandler).toHaveBeenCalledWith('arg1', 'arg2')
    })

    it('should remove string event handlers correctly', () => {
      const store = useUnifiedStore()
      const mockHandler = vi.fn()

      // Register the handler
      store.on('testEvent', mockHandler)

      // Emit once to verify registration
      store.emit('testEvent', 'test')
      expect(mockHandler).toHaveBeenCalledTimes(1)

      // Reset mock
      mockHandler.mockClear()

      // Remove the handler
      store.off('testEvent', mockHandler)

      // Emit again, should not trigger the handler
      store.emit('testEvent', 'test2')
      expect(mockHandler).not.toHaveBeenCalled()
    })

    it('should emit devicePropertyChanged string events when properties are updated', () => {
      const store = useUnifiedStore()
      const mockHandler = vi.fn()

      // Register the handler
      store.on('devicePropertyChanged', mockHandler)

      // Add a test device
      const deviceId = 'test-device-1'
      const testDevice: Device = {
        id: deviceId,
        type: 'camera',
        name: 'Test Camera',
        properties: {},
        isConnected: false,
        isConnecting: false,
        isDisconnecting: false
      }
      store.addDevice(testDevice)

      // Update device properties
      store.updateDeviceProperties(deviceId, {
        isExposing: true
      })

      // Verify the handler was called with the right arguments
      expect(mockHandler).toHaveBeenCalledTimes(1)
      expect(mockHandler).toHaveBeenCalledWith(deviceId, 'isExposing', true)
    })
  })
})
