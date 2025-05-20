import { describe, it, expect, beforeEach, vi, type MockInstance } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUnifiedStore } from '@/stores/UnifiedStore'
// DiscoveryState describes the shape of state properties, not a nested object
// import type { DiscoveryState } from '@/stores/modules/discoveryActions' // Not needed if we check props individually
import type { DeviceEvent } from '@/stores/types/device-store.types' // Corrected import path

// Mock the event system's _emitEvent as it's used internally
const mockEmitEvent = vi.fn()

describe('discoveryActions', () => {
  let store: ReturnType<typeof useUnifiedStore>
  let emitEventSpy: MockInstance<(event: DeviceEvent) => void>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useUnifiedStore()

    // Spy on the internal _emitEvent (which comes from eventSystemActions)
    // We need to cast store to `any` to access the private _emitEvent for spying
    emitEventSpy = vi.spyOn(store as unknown as { _emitEvent: (event: DeviceEvent) => void }, '_emitEvent').mockImplementation(mockEmitEvent)

    // Reset discovery state properties directly on the store
    store.$patch((state) => {
      // These properties are directly on the state object due to module spreading.
      // TypeScript should infer them correctly from the store type.
      state.isDiscovering = false
      state.discoveryTimeout = null
    })
    mockEmitEvent.mockClear()
  })

  describe('Initial State', () => {
    it('should have the correct initial discovery state properties', () => {
      // Check individual properties directly on the store
      expect(store.isDiscovering).toBe(false)
      expect(store.discoveryTimeout).toBeNull()
    })
  })

  describe('startDiscovery action', () => {
    it('should set isDiscovering to true and emit discoveryStarted event', () => {
      store.startDiscovery()
      expect(store.isDiscovering).toBe(true)
      expect(emitEventSpy).toHaveBeenCalledTimes(1)
      expect(emitEventSpy).toHaveBeenCalledWith({
        type: 'discoveryStarted'
      })
    })

    it('should clear an existing discoveryTimeout and set it to null', () => {
      store.isDiscovering = false
      // The type of discoveryTimeout in the store is `ReturnType<typeof setTimeout> | null`.
      // In Vitest (browser-like env), setTimeout returns number. In Node, it's NodeJS.Timeout.
      // Casting to unknown then the specific type the linter expects here if it's NodeJS.Timeout.
      // Or, if it expects a number and the linter is confused, this might need to be number.
      // For now, let's assume the linter in this context has resolved ReturnType<typeof setTimeout> to NodeJS.Timeout.
      store.discoveryTimeout = 12345 as unknown as NodeJS.Timeout
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      store.startDiscovery()

      expect(clearTimeoutSpy).toHaveBeenCalledWith(12345)
      expect(store.discoveryTimeout).toBeNull() // Action should set it to null
      clearTimeoutSpy.mockRestore()
    })

    it('should not start discovery if already discovering', () => {
      store.isDiscovering = true
      store.startDiscovery()

      expect(emitEventSpy).not.toHaveBeenCalled()
      expect(store.isDiscovering).toBe(true)
    })

    // We'll add a test for the setTimeout functionality later if needed,
    // as it involves managing fake timers. For now, focusing on state and events.
  })

  describe('stopDiscovery action', () => {
    it('should set isDiscovering to false and emit discoveryStopped event', () => {
      store.isDiscovering = true // Ensure discovery is in progress
      // Simulate a timeout being active
      store.discoveryTimeout = 12345 as unknown as NodeJS.Timeout

      store.stopDiscovery()

      expect(store.isDiscovering).toBe(false)
      expect(emitEventSpy).toHaveBeenCalledTimes(1)
      expect(emitEventSpy).toHaveBeenCalledWith({
        type: 'discoveryStopped'
      })
    })

    it('should clear an existing discoveryTimeout and set it to null', () => {
      store.isDiscovering = true // Ensure discovery is in progress
      store.discoveryTimeout = 12345 as unknown as NodeJS.Timeout
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      store.stopDiscovery()

      expect(clearTimeoutSpy).toHaveBeenCalledWith(12345 as unknown as NodeJS.Timeout)
      expect(store.discoveryTimeout).toBeNull()
      clearTimeoutSpy.mockRestore()
    })

    it('should not stop discovery if not discovering', () => {
      store.isDiscovering = false // Ensure not discovering
      store.stopDiscovery()

      expect(emitEventSpy).not.toHaveBeenCalled()
      expect(store.isDiscovering).toBe(false)
    })
  })
})
