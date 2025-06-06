import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import type { DeviceEvent, UnifiedDevice } from '@/stores/types/device-store.types'

// type EventListener = (event: DeviceEvent) => void; // Removed as it's not directly used now

describe('eventSystem', () => {
  let store: ReturnType<typeof useUnifiedStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useUnifiedStore()
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have the correct initial EventSystemState properties', () => {
      expect(store.isBatching).toBe(false)
      expect(store.eventQueue).toBeInstanceOf(Array)
      expect(store.eventQueue.length).toBe(0)
      expect(store.eventHandlers).toBeTypeOf('object')
      expect(store.eventHandlers).not.toBeNull()
      expect(Object.keys(store.eventHandlers).length).toBe(0)
    })
  })

  describe('addEventListener / removeEventListener', () => {
    let mockListener1: import('vitest').Mock<(event: DeviceEvent) => void>
    let mockListener2: import('vitest').Mock<(event: DeviceEvent) => void>

    const mockDevicePayload = { id: 'test-dev-id' } as UnifiedDevice
    const sampleDeviceAddedEvent: DeviceEvent = { type: 'deviceAdded', device: mockDevicePayload }
    // const sampleDeviceRemovedEvent: DeviceEvent = { type: 'deviceRemoved', deviceId: 'test-dev-id' }; // Removed as unused for now

    beforeEach(() => {
      mockListener1 = vi.fn<(event: DeviceEvent) => void>()
      mockListener2 = vi.fn<(event: DeviceEvent) => void>()
    })

    it('should add a listener and call it when an event is emitted', () => {
      store.addEventListener(mockListener1)
      store._emitEvent(sampleDeviceAddedEvent)

      expect(mockListener1).toHaveBeenCalledTimes(1)
      expect(mockListener1).toHaveBeenCalledWith(sampleDeviceAddedEvent)
    })

    it('should call all registered listeners when any event is emitted', () => {
      store.addEventListener(mockListener1)
      store.addEventListener(mockListener2)
      store._emitEvent(sampleDeviceAddedEvent)

      expect(mockListener1).toHaveBeenCalledTimes(1)
      expect(mockListener1).toHaveBeenCalledWith(sampleDeviceAddedEvent)
      expect(mockListener2).toHaveBeenCalledTimes(1)
      expect(mockListener2).toHaveBeenCalledWith(sampleDeviceAddedEvent)
    })

    it('should not call a listener after it has been removed', () => {
      store.addEventListener(mockListener1)
      store.removeEventListener(mockListener1)
      store._emitEvent(sampleDeviceAddedEvent)
      expect(mockListener1).not.toHaveBeenCalled()
    })

    it('should correctly remove one listener when multiple are present', () => {
      store.addEventListener(mockListener1)
      store.addEventListener(mockListener2)
      store.removeEventListener(mockListener1)

      store._emitEvent(sampleDeviceAddedEvent)

      expect(mockListener1).not.toHaveBeenCalled()
      expect(mockListener2).toHaveBeenCalledTimes(1)
      expect(mockListener2).toHaveBeenCalledWith(sampleDeviceAddedEvent)
    })

    it('should not throw an error when trying to remove a non-existent listener', () => {
      const nonExistentListener = vi.fn<(event: DeviceEvent) => void>()
      expect(() => store.removeEventListener(nonExistentListener)).not.toThrow()
    })
  })

  describe('_emitEvent', () => {
    let mockListener: import('vitest').Mock<(event: DeviceEvent) => void>
    const mockDevicePayload = { id: 'test-dev-emit' } as UnifiedDevice
    const sampleEvent: DeviceEvent = { type: 'deviceAdded', device: mockDevicePayload }

    beforeEach(() => {
      mockListener = vi.fn<(event: DeviceEvent) => void>()
      store.addEventListener(mockListener) // Add listener for all tests in this block
    })

    it('should emit event directly to listeners when not batching', () => {
      store.isBatching = false // Ensure not batching
      store._emitEvent(sampleEvent)

      expect(mockListener).toHaveBeenCalledTimes(1)
      expect(mockListener).toHaveBeenCalledWith(sampleEvent)
      expect(store.eventQueue.length).toBe(0) // Queue should remain empty
    })

    it('should queue event and not call listeners when batching is active', () => {
      store.isBatching = true // Activate batching
      store._emitEvent(sampleEvent)

      expect(mockListener).not.toHaveBeenCalled() // Listener should not be called yet
      expect(store.eventQueue.length).toBe(1)
      expect(store.eventQueue[0]).toEqual(sampleEvent) // Event should be in the queue

      // Cleanup: reset batching state if it affects other tests, though beforeEach should handle store reset.
      store.isBatching = false
    })

    it('should queue multiple events when batching is active', () => {
      const sampleEvent2: DeviceEvent = { type: 'deviceRemoved', deviceId: 'test-dev-emit' }
      store.isBatching = true
      store._emitEvent(sampleEvent)
      store._emitEvent(sampleEvent2)

      expect(mockListener).not.toHaveBeenCalled()
      expect(store.eventQueue.length).toBe(2)
      expect(store.eventQueue[0]).toEqual(sampleEvent)
      expect(store.eventQueue[1]).toEqual(sampleEvent2)

      store.isBatching = false
    })
  })

  describe('batch functionality', () => {
    let mockListener: import('vitest').Mock<(event: DeviceEvent) => void>
    const mockDevicePayload = { id: 'test-dev-batch' } as UnifiedDevice
    const sampleEvent1: DeviceEvent = { type: 'deviceAdded', device: mockDevicePayload }
    const sampleEvent2: DeviceEvent = { type: 'deviceRemoved', deviceId: 'test-dev-batch' }
    // const sampleEvent3: DeviceEvent = { type: 'deviceConnected', deviceId: 'test-dev-batch' }; // Removed as unused

    beforeEach(() => {
      mockListener = vi.fn<(event: DeviceEvent) => void>()
      store.addEventListener(mockListener)
      // Ensure clean state for isBatching and eventQueue before each batch test
      store.isBatching = false
      store.eventQueue = []
    })

    it('batch.start() should activate batching mode and clear queue', () => {
      store.eventQueue.push(sampleEvent1) // Pre-fill queue to check clearing
      const batch = store.batch()
      batch.start()

      expect(store.isBatching).toBe(true)
      expect(store.eventQueue.length).toBe(0) // Should be cleared
    })

    it('batch.queue() should add event to queue if batching is active', () => {
      const batch = store.batch()
      batch.start()
      batch.queue(sampleEvent1)

      expect(store.eventQueue.length).toBe(1)
      expect(store.eventQueue[0]).toEqual(sampleEvent1)
      expect(mockListener).not.toHaveBeenCalled() // Not emitted yet
    })

    it('batch.queue() should emit event immediately if batching is not active', () => {
      // isBatching is false by default from beforeEach
      const batch = store.batch()
      batch.queue(sampleEvent1) // Should call _emitEvent internally

      expect(store.eventQueue.length).toBe(0)
      expect(mockListener).toHaveBeenCalledTimes(1)
      expect(mockListener).toHaveBeenCalledWith(sampleEvent1)
    })

    it('batch.end() should deactivate batching, emit queued events in order, and clear queue', () => {
      const batch = store.batch()
      batch.start()
      batch.queue(sampleEvent1)
      batch.queue(sampleEvent2)

      expect(store.isBatching).toBe(true)
      expect(store.eventQueue.length).toBe(2)

      batch.end()

      expect(store.isBatching).toBe(false)
      expect(store.eventQueue.length).toBe(0) // Queue should be cleared after emission

      expect(mockListener).toHaveBeenCalledTimes(2) // Both events emitted
      // Check order of calls
      expect(mockListener.mock.calls[0][0]).toEqual(sampleEvent1)
      expect(mockListener.mock.calls[1][0]).toEqual(sampleEvent2)
    })

    it('batch.end() should handle an empty queue without error and not call listeners', () => {
      const batch = store.batch()
      batch.start() // Batching active, queue is empty
      batch.end()

      expect(store.isBatching).toBe(false)
      expect(store.eventQueue.length).toBe(0)
      expect(mockListener).not.toHaveBeenCalled()
    })

    it('batch.end() should emit to multiple listeners correctly', () => {
      const mockListenerTwo = vi.fn<(event: DeviceEvent) => void>()
      store.addEventListener(mockListenerTwo)

      const batch = store.batch()
      batch.start()
      batch.queue(sampleEvent1)
      batch.end()

      expect(mockListener).toHaveBeenCalledTimes(1)
      expect(mockListener).toHaveBeenCalledWith(sampleEvent1)
      expect(mockListenerTwo).toHaveBeenCalledTimes(1)
      expect(mockListenerTwo).toHaveBeenCalledWith(sampleEvent1)
    })
  })

  describe('legacy emitter (on, off, emit)', () => {
    const legacyEventName1 = 'legacyTestEvent1'
    const legacyEventName2 = 'legacyTestEvent2'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockLegacyListener1: import('vitest').Mock<(...args: any[]) => void>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockLegacyListener2: import('vitest').Mock<(...args: any[]) => void>

    beforeEach(() => {
      mockLegacyListener1 = vi.fn()
      mockLegacyListener2 = vi.fn()
      // Ensure eventHandlers is clean for these tests if it's modified directly
      store.eventHandlers = {}
    })

    it('on() should add a listener and emit() should call it with arguments', () => {
      store.on(legacyEventName1, mockLegacyListener1)
      store.emit(legacyEventName1, 'arg1', 123)

      expect(mockLegacyListener1).toHaveBeenCalledTimes(1)
      expect(mockLegacyListener1).toHaveBeenCalledWith('arg1', 123)
    })

    it('off() should remove a listener, and it should not be called by emit()', () => {
      store.on(legacyEventName1, mockLegacyListener1)
      store.off(legacyEventName1, mockLegacyListener1)
      store.emit(legacyEventName1, 'arg1')

      expect(mockLegacyListener1).not.toHaveBeenCalled()
    })

    it('emit() should only call listeners for the specific event name', () => {
      store.on(legacyEventName1, mockLegacyListener1)
      store.on(legacyEventName2, mockLegacyListener2)

      store.emit(legacyEventName1, 'event1Arg')

      expect(mockLegacyListener1).toHaveBeenCalledTimes(1)
      expect(mockLegacyListener1).toHaveBeenCalledWith('event1Arg')
      expect(mockLegacyListener2).not.toHaveBeenCalled()

      mockLegacyListener1.mockClear()
      store.emit(legacyEventName2, 'event2Arg')

      expect(mockLegacyListener1).not.toHaveBeenCalled()
      expect(mockLegacyListener2).toHaveBeenCalledTimes(1)
      expect(mockLegacyListener2).toHaveBeenCalledWith('event2Arg')
    })

    it('emit() should call multiple listeners for the same event name', () => {
      store.on(legacyEventName1, mockLegacyListener1)
      store.on(legacyEventName1, mockLegacyListener2) // Both listen to the same event

      store.emit(legacyEventName1, 'multiArg')

      expect(mockLegacyListener1).toHaveBeenCalledTimes(1)
      expect(mockLegacyListener1).toHaveBeenCalledWith('multiArg')
      expect(mockLegacyListener2).toHaveBeenCalledTimes(1)
      expect(mockLegacyListener2).toHaveBeenCalledWith('multiArg')
    })

    it('off() should not affect other listeners for the same event', () => {
      store.on(legacyEventName1, mockLegacyListener1)
      store.on(legacyEventName1, mockLegacyListener2)
      store.off(legacyEventName1, mockLegacyListener1) // Remove only listener1

      store.emit(legacyEventName1, 'afterOffArg')

      expect(mockLegacyListener1).not.toHaveBeenCalled()
      expect(mockLegacyListener2).toHaveBeenCalledTimes(1)
      expect(mockLegacyListener2).toHaveBeenCalledWith('afterOffArg')
    })

    it('off() should not throw error for non-existent listener or event name', () => {
      const nonExistentListener = vi.fn()
      expect(() => store.off(legacyEventName1, nonExistentListener)).not.toThrow()
      expect(() => store.off('nonExistentEventName', mockLegacyListener1)).not.toThrow()
    })

    it('emit() should not throw error for an event with no listeners', () => {
      expect(() => store.emit('eventWithNoListeners', 'arg')).not.toThrow()
    })

    describe('special debug logging for emit("callDeviceMethod", ...)', () => {
      let consoleErrorSpy: import('vitest').MockInstance<Console['error']>

      beforeEach(() => {
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      })

      afterEach(() => {
        consoleErrorSpy.mockRestore()
      })

      it('should NOT log to console.error for emit("callDeviceMethod") with other methods', () => {
        store.emit('callDeviceMethod', 'test-cam', 'otherMethod', 123)
        expect(consoleErrorSpy).not.toHaveBeenCalled()
      })

      it('should NOT log to console.error for other emit events', () => {
        store.emit('someOtherEvent', 'data')
        expect(consoleErrorSpy).not.toHaveBeenCalled()
      })
    })
  })
})
