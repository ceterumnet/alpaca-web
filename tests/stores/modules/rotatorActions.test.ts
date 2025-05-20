import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUnifiedStore, type UnifiedStoreType } from '@/stores/UnifiedStore'
import type { MockInstance } from 'vitest'
import type { UnifiedDevice } from '@/types/device.types'
import type { AlpacaClient } from '@/api/AlpacaClient'
import { createAlpacaClient } from '@/api/AlpacaClient'
import type { RotatorClient } from '@/api/alpaca/rotator-client'

const mockRotatorClientInstance = {
  isRotatorClient: true,
  getCanReverse: vi.fn(),
  getPosition: vi.fn(),
  getIsMoving: vi.fn(),
  getMechanicalPosition: vi.fn(),
  getReverse: vi.fn(),
  getTargetPosition: vi.fn(),
  move: vi.fn(),
  moveAbsolute: vi.fn(),
  moveMechanical: vi.fn(),
  sync: vi.fn(),
  halt: vi.fn(),
  setReverse: vi.fn(),
  connected: vi.fn(),
  put: vi.fn(),
  get: vi.fn(),
  getProperties: vi.fn(),
  setConnected: vi.fn()
} as unknown as RotatorClient

vi.mock('@/api/alpaca/rotator-client', () => ({
  RotatorClient: vi.fn(() => mockRotatorClientInstance)
}))

const mockGenericAlpacaClientInstance = {
  get: vi.fn(),
  put: vi.fn()
} as unknown as AlpacaClient

vi.mock('@/api/AlpacaClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/AlpacaClient')>()
  return {
    ...actual,
    createAlpacaClient: vi.fn(() => mockGenericAlpacaClientInstance)
  }
})

// const mockedCreateAlpacaClient = createAlpacaClient as MockInstance<(...args: any[]) => AlpacaClient>
// Use vi.mocked for better type inference on mocked functions
const mockedCreateAlpacaClient = vi.mocked(createAlpacaClient)

const mockEmitEvent = vi.fn()

describe('stores/modules/rotatorActions.ts', () => {
  let store: UnifiedStoreType
  let mockUpdateDeviceProperties: MockInstance<UnifiedStoreType['updateDeviceProperties']>
  let mockGetDeviceById: MockInstance<UnifiedStoreType['getDeviceById']>

  const testRotatorId = 'rotator-1'
  const mockRotatorDevice: UnifiedDevice = {
    id: testRotatorId,
    name: 'Test Rotator',
    type: 'rotator',
    deviceNumber: 0,
    apiBaseUrl: 'http://localhost:11111',
    isConnected: true,
    isConnecting: false,
    isDisconnecting: false,
    uniqueId: 'rotator-unique-id-1',
    properties: {},
    capabilities: {},
    settings: {},
    status: 'connected',
    lastUpdate: Date.now()
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useUnifiedStore()

    vi.clearAllMocks()
    mockEmitEvent.mockClear()

    mockUpdateDeviceProperties = vi.spyOn(store, 'updateDeviceProperties')
    mockGetDeviceById = vi.spyOn(store, 'getDeviceById')

    Object.defineProperty(store, '_emitEvent', {
      value: mockEmitEvent,
      writable: true,
      configurable: true
    })

    mockGetDeviceById.mockImplementation((deviceId) => {
      if (deviceId === testRotatorId) {
        const deviceFromStore = store.devices.get(testRotatorId)
        return deviceFromStore ? JSON.parse(JSON.stringify(deviceFromStore)) : null
      }
      return null
    })

    mockedCreateAlpacaClient.mockReturnValue(mockGenericAlpacaClientInstance)

    store.$reset()
    const cleanMockRotatorDevice = { ...mockRotatorDevice, properties: {} }
    store.devices.set(testRotatorId, cleanMockRotatorDevice)
    store.devicesArray = [cleanMockRotatorDevice]

    store._rt_pollingTimers = store._rt_pollingTimers || new Map()
    store._rt_pollingTimers.forEach(clearTimeout)
    store._rt_pollingTimers.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initializeRotatorState', () => {
    it('should initialize rotator state for a given deviceId', () => {
      store.initializeRotatorState(testRotatorId)
      const device = store.devices.get(testRotatorId)
      expect(device?.properties).toEqual(
        expect.objectContaining({
          canReverse: undefined,
          ismoving: undefined,
          mechanicalposition: undefined,
          position: undefined,
          reverse: undefined,
          stepsize: undefined,
          targetposition: undefined,
          _rt_isPollingStatus: false
        })
      )
      expect(store._rt_pollingTimers.has(testRotatorId)).toBe(false)
    })

    it('should not throw if deviceId is invalid', () => {
      mockGetDeviceById.mockReturnValue(null)
      expect(() => store.initializeRotatorState('invalid-id')).not.toThrow()
    })

    it('should not modify properties if device is not a rotator', () => {
      const nonRotatorDevice: UnifiedDevice = {
        ...mockRotatorDevice,
        id: 'not-a-rotator',
        type: 'camera',
        properties: { existingProp: 123 }
      }
      mockGetDeviceById.mockImplementation((id) => (id === nonRotatorDevice.id ? nonRotatorDevice : null))
      store.devices.set(nonRotatorDevice.id, nonRotatorDevice)
      store.initializeRotatorState(nonRotatorDevice.id)
      const fetchedDevice = store.getDeviceById(nonRotatorDevice.id)
      expect(fetchedDevice?.properties).toEqual({ existingProp: 123 })
    })
  })

  describe('clearRotatorState', () => {
    it('should clear rotator-specific properties and stop polling', () => {
      store.initializeRotatorState(testRotatorId)
      const initialDeviceState = store.getDeviceById(testRotatorId)
      if (initialDeviceState) {
        store.updateDeviceProperties(testRotatorId, {
          position: 90,
          ismoving: true,
          _rt_isPollingStatus: true
        })
      }
      const timerId = setTimeout(() => {}, 1000) as ReturnType<typeof setTimeout>
      store._rt_pollingTimers.set(testRotatorId, timerId)
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      store.clearRotatorState(testRotatorId)

      const device = store.getDeviceById(testRotatorId)
      expect(device?.properties.position).toBeUndefined()
      expect(device?.properties.ismoving).toBeUndefined()
      expect(device?.properties._rt_isPollingStatus).toBeUndefined()

      expect(clearIntervalSpy).toHaveBeenCalledWith(timerId)
      expect(store._rt_pollingTimers.has(testRotatorId)).toBe(false)
      clearIntervalSpy.mockRestore()
    })

    it('should not throw if deviceId is invalid', () => {
      mockGetDeviceById.mockReturnValue(null)
      expect(() => store.clearRotatorState('invalid-id')).not.toThrow()
    })

    it('should call stopRotatorPolling', () => {
      const stopPollingSpy = vi.spyOn(store, 'stopRotatorPolling')
      store.clearRotatorState(testRotatorId)
      expect(stopPollingSpy).toHaveBeenCalledWith(testRotatorId)
    })
  })

  describe('fetchRotatorCapabilities', () => {
    it('should fetch and update canreverse capability', async () => {
      const getClientSpy = vi.spyOn(store, '_getRotatorClient').mockReturnValue(mockRotatorClientInstance)
      const mockCanReverseValues = [true, false]
      let callCount = 0

      vi.mocked(mockRotatorClientInstance.get).mockImplementation(async (property: string) => {
        if (property === 'canreverse') {
          return mockCanReverseValues[callCount++]
        }
        return undefined
      })

      await store.fetchRotatorCapabilities(testRotatorId)
      expect(getClientSpy).toHaveBeenCalledWith(testRotatorId)
      expect(mockRotatorClientInstance.get).toHaveBeenCalledWith('canreverse')
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(testRotatorId, { canreverse: true })

      await store.fetchRotatorCapabilities(testRotatorId)
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(testRotatorId, { canreverse: false })
    })

    it('should not fetch capabilities if device is not found or not a rotator', async () => {
      mockGetDeviceById.mockReturnValue(null) // Device not found
      const getClientSpy = vi.spyOn(store, '_getRotatorClient')

      await store.fetchRotatorCapabilities('unknown-device')
      expect(getClientSpy).not.toHaveBeenCalled()
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled()

      mockGetDeviceById.mockReturnValue({ ...mockRotatorDevice, type: 'camera' } as UnifiedDevice) // Not a rotator
      await store.fetchRotatorCapabilities(testRotatorId)
      expect(getClientSpy).not.toHaveBeenCalled()
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError if client is not available', async () => {
      vi.spyOn(store, '_getRotatorClient').mockReturnValue(null)

      await store.fetchRotatorCapabilities(testRotatorId)

      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceApiError',
          deviceId: testRotatorId,
          error: 'Rotator client not available'
        })
      )
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError if fetching capabilities fails', async () => {
      vi.spyOn(store, '_getRotatorClient').mockReturnValue(mockRotatorClientInstance)
      const apiError = new Error('API Failed')
      vi.mocked(mockRotatorClientInstance.get).mockRejectedValue(apiError)

      await store.fetchRotatorCapabilities(testRotatorId)

      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceApiError',
          deviceId: testRotatorId,
          error: `Failed to fetch rotator capabilities: ${apiError.message}`
        })
      )
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled()
    })
  })

  describe('fetchRotatorStatus', () => {
    const mockStatusData = {
      position: 90.5,
      ismoving: false,
      mechanicalposition: 92.1,
      reverse: true,
      targetposition: 90.5
    }

    it('should fetch and update rotator status properties', async () => {
      vi.spyOn(store, '_getRotatorClient').mockReturnValue(mockRotatorClientInstance)
      vi.mocked(mockRotatorClientInstance.get).mockImplementation(async (property: string) => {
        return mockStatusData[property as keyof typeof mockStatusData]
      })

      // Preserve existing _rt_isPollingStatus if present
      store.updateDeviceProperties(testRotatorId, { _rt_isPollingStatus: true })

      await store.fetchRotatorStatus(testRotatorId)

      expect(mockRotatorClientInstance.get).toHaveBeenCalledWith('position')
      expect(mockRotatorClientInstance.get).toHaveBeenCalledWith('ismoving')
      expect(mockRotatorClientInstance.get).toHaveBeenCalledWith('mechanicalposition')
      expect(mockRotatorClientInstance.get).toHaveBeenCalledWith('reverse')
      expect(mockRotatorClientInstance.get).toHaveBeenCalledWith('targetposition')

      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(
        testRotatorId,
        expect.objectContaining({
          ...mockStatusData,
          _rt_isPollingStatus: true // Should be preserved
        })
      )
    })

    it('should handle unexpected data types by setting property to undefined', async () => {
      vi.spyOn(store, '_getRotatorClient').mockReturnValue(mockRotatorClientInstance)
      vi.mocked(mockRotatorClientInstance.get).mockImplementation(async (property: string) => {
        if (property === 'position') return 'not-a-number' // Incorrect type
        if (property === 'ismoving') return {} // Incorrect type
        return mockStatusData[property as keyof typeof mockStatusData]
      })

      await store.fetchRotatorStatus(testRotatorId)

      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(
        testRotatorId,
        expect.objectContaining({
          position: undefined, // Should be undefined due to wrong type
          ismoving: undefined, // Should be undefined due to wrong type
          mechanicalposition: mockStatusData.mechanicalposition,
          reverse: mockStatusData.reverse,
          targetposition: mockStatusData.targetposition,
          _rt_isPollingStatus: false // default if not pre-existing
        })
      )
    })

    it('should not fetch status if device is not found or not a rotator', async () => {
      mockGetDeviceById.mockReturnValue(null) // Device not found
      const getClientSpy = vi.spyOn(store, '_getRotatorClient')

      await store.fetchRotatorStatus('unknown-device')
      expect(getClientSpy).not.toHaveBeenCalled()
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled()

      mockGetDeviceById.mockReturnValue({ ...mockRotatorDevice, type: 'camera' } as UnifiedDevice) // Not a rotator
      await store.fetchRotatorStatus(testRotatorId)
      // getClientSpy might have been called from previous assertion, reset if necessary or check calls specific to this part
      // For simplicity, let's assume it shouldn't proceed to get client *for this call*
      // A more robust way is to check getClientSpy.mock.calls.length before and after if needed.
      // Or, ensure the mock implementation of _getRotatorClient itself doesn't get called based on device type.
      // The current implementation of fetchRotatorStatus checks device type before calling _getRotatorClient.
      expect(mockRotatorClientInstance.get).not.toHaveBeenCalledWith('position') // Check that no API call was made
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError if client is not available', async () => {
      vi.spyOn(store, '_getRotatorClient').mockReturnValue(null)

      await store.fetchRotatorStatus(testRotatorId)

      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceApiError',
          deviceId: testRotatorId,
          error: 'Rotator client not available for fetchRotatorStatus'
        })
      )
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError if fetching status fails for any property', async () => {
      vi.spyOn(store, '_getRotatorClient').mockReturnValue(mockRotatorClientInstance)
      const apiError = new Error('API Read Failed')
      // Fail on the first property access
      vi.mocked(mockRotatorClientInstance.get).mockImplementation(async (property: string) => {
        if (property === 'position') {
          throw apiError
        }
        return mockStatusData[property as keyof typeof mockStatusData]
      })

      await store.fetchRotatorStatus(testRotatorId)

      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceApiError',
          deviceId: testRotatorId,
          error: `Failed to fetch rotator status: ${apiError.message}`
        })
      )
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled() // Should not update if any part fails
    })
  })

  describe('moveAbsolute', () => {
    const targetPosition = 180.0

    it('should call client.put with correct parameters and update properties on success', async () => {
      vi.spyOn(store, '_getRotatorClient').mockReturnValue(mockRotatorClientInstance)
      vi.mocked(mockRotatorClientInstance.put).mockResolvedValue(undefined) // Simulate successful PUT

      await store.moveAbsolute(testRotatorId, targetPosition)

      expect(mockRotatorClientInstance.put).toHaveBeenCalledWith('moveabsolute', { Position: targetPosition })
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(testRotatorId, { targetposition: targetPosition, ismoving: true })
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceMethodCalled',
        deviceId: testRotatorId,
        method: 'moveabsolute',
        args: [{ Position: targetPosition }],
        result: 'success'
      })
    })

    it('should emit deviceApiError and not call client if device not found or not rotator', async () => {
      mockGetDeviceById.mockReturnValue(null) // Device not found
      await store.moveAbsolute('unknown-device', targetPosition)
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId: 'unknown-device',
        error: 'Device not found or not a rotator for moveAbsolute'
      })
      expect(mockRotatorClientInstance.put).not.toHaveBeenCalled()
      mockEmitEvent.mockClear() // Clear for next assertion

      mockGetDeviceById.mockReturnValue({ ...mockRotatorDevice, type: 'camera' } as UnifiedDevice) // Not a rotator
      await store.moveAbsolute(testRotatorId, targetPosition)
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId: testRotatorId,
        error: 'Device not found or not a rotator for moveAbsolute'
      })
      expect(mockRotatorClientInstance.put).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError if client is not available', async () => {
      vi.spyOn(store, '_getRotatorClient').mockReturnValue(null)
      await store.moveAbsolute(testRotatorId, targetPosition)
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId: testRotatorId,
        error: 'Rotator client not available for moveAbsolute'
      })
      expect(mockRotatorClientInstance.put).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError and revert ismoving on client.put failure', async () => {
      vi.spyOn(store, '_getRotatorClient').mockReturnValue(mockRotatorClientInstance)
      const apiError = new Error('Move Failed')
      vi.mocked(mockRotatorClientInstance.put).mockRejectedValue(apiError)

      await store.moveAbsolute(testRotatorId, targetPosition)

      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId: testRotatorId,
        error: `Failed to moveAbsolute to ${targetPosition}: ${apiError.message}`
      })
      // Check that ismoving was set to false on error
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(testRotatorId, { ismoving: false })
      // Ensure the optimistic update was NOT called
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalledWith(testRotatorId, { targetposition: targetPosition, ismoving: true })
    })
  })

  describe('moveRelative', () => {
    const moveOffset = -10.5

    it('should call client.put with correct parameters and update properties on success', async () => {
      vi.spyOn(store, '_getRotatorClient').mockReturnValue(mockRotatorClientInstance)
      vi.mocked(mockRotatorClientInstance.put).mockResolvedValue(undefined) // Simulate successful PUT

      await store.moveRelative(testRotatorId, moveOffset)

      expect(mockRotatorClientInstance.put).toHaveBeenCalledWith('moverelative', { Offset: moveOffset })
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(testRotatorId, { ismoving: true })
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceMethodCalled',
        deviceId: testRotatorId,
        method: 'moverelative',
        args: [{ Offset: moveOffset }],
        result: 'success'
      })
    })

    it('should emit deviceApiError and not call client if device not found or not rotator', async () => {
      mockGetDeviceById.mockReturnValue(null) // Device not found
      await store.moveRelative('unknown-device', moveOffset)
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId: 'unknown-device',
        error: 'Device not found or not a rotator for moveRelative'
      })
      expect(mockRotatorClientInstance.put).not.toHaveBeenCalled()
      mockEmitEvent.mockClear()

      mockGetDeviceById.mockReturnValue({ ...mockRotatorDevice, type: 'camera' } as UnifiedDevice) // Not a rotator
      await store.moveRelative(testRotatorId, moveOffset)
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId: testRotatorId,
        error: 'Device not found or not a rotator for moveRelative'
      })
      expect(mockRotatorClientInstance.put).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError if client is not available', async () => {
      vi.spyOn(store, '_getRotatorClient').mockReturnValue(null)
      await store.moveRelative(testRotatorId, moveOffset)
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId: testRotatorId,
        error: 'Rotator client not available for moveRelative'
      })
      expect(mockRotatorClientInstance.put).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError and revert ismoving on client.put failure', async () => {
      vi.spyOn(store, '_getRotatorClient').mockReturnValue(mockRotatorClientInstance)
      const apiError = new Error('Relative Move Failed')
      vi.mocked(mockRotatorClientInstance.put).mockRejectedValue(apiError)

      await store.moveRelative(testRotatorId, moveOffset)

      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId: testRotatorId,
        error: `Failed to moveRelative by ${moveOffset}: ${apiError.message}`
      })
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(testRotatorId, { ismoving: false })
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalledWith(testRotatorId, { ismoving: true, targetposition: expect.any(Number) }) // Ensure no targetposition is set
    })
  })

  describe('haltRotator', () => {
    it('should call client.put with "halt" and update properties on success', async () => {
      vi.spyOn(store, '_getRotatorClient').mockReturnValue(mockRotatorClientInstance)
      vi.mocked(mockRotatorClientInstance.put).mockResolvedValue(undefined) // Simulate successful PUT

      // Set ismoving to true initially to check if halt changes it
      store.updateDeviceProperties(testRotatorId, { ismoving: true, targetposition: 100 })
      mockUpdateDeviceProperties.mockClear() // Clear previous calls from setup

      await store.haltRotator(testRotatorId)

      expect(mockRotatorClientInstance.put).toHaveBeenCalledWith('halt', {})
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(testRotatorId, { ismoving: false, targetposition: undefined })
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceMethodCalled',
        deviceId: testRotatorId,
        method: 'halt',
        args: [],
        result: 'success'
      })
    })

    it('should emit deviceApiError and not call client if device not found or not rotator', async () => {
      mockGetDeviceById.mockReturnValue(null)
      await store.haltRotator('unknown-device')
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId: 'unknown-device',
        error: 'Device not found or not a rotator for haltRotator'
      })
      expect(mockRotatorClientInstance.put).not.toHaveBeenCalled()
      mockEmitEvent.mockClear()

      mockGetDeviceById.mockReturnValue({ ...mockRotatorDevice, type: 'camera' } as UnifiedDevice)
      await store.haltRotator(testRotatorId)
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId: testRotatorId,
        error: 'Device not found or not a rotator for haltRotator'
      })
      expect(mockRotatorClientInstance.put).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError if client is not available', async () => {
      vi.spyOn(store, '_getRotatorClient').mockReturnValue(null)
      await store.haltRotator(testRotatorId)
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId: testRotatorId,
        error: 'Rotator client not available for haltRotator'
      })
      expect(mockRotatorClientInstance.put).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError on client.put failure (no property change expected on error)', async () => {
      vi.spyOn(store, '_getRotatorClient').mockReturnValue(mockRotatorClientInstance)
      const apiError = new Error('Halt Failed')
      vi.mocked(mockRotatorClientInstance.put).mockRejectedValue(apiError)
      mockUpdateDeviceProperties.mockClear() // Clear any setup calls

      await store.haltRotator(testRotatorId)

      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId: testRotatorId,
        error: `Failed to halt rotator: ${apiError.message}`
      })
      // Ensure properties are not changed on halt failure, as the state is uncertain
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled()
    })
  })

  describe('syncToPosition', () => {
    const syncPosition = 270.75

    it('should call client.put with "sync" and update properties on success', async () => {
      vi.spyOn(store, '_getRotatorClient').mockReturnValue(mockRotatorClientInstance)
      vi.mocked(mockRotatorClientInstance.put).mockResolvedValue(undefined)

      await store.syncToPosition(testRotatorId, syncPosition)

      expect(mockRotatorClientInstance.put).toHaveBeenCalledWith('sync', { Position: syncPosition })
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(testRotatorId, {
        position: syncPosition,
        targetposition: syncPosition,
        ismoving: false
      })
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceMethodCalled',
        deviceId: testRotatorId,
        method: 'sync',
        args: [{ Position: syncPosition }],
        result: 'success'
      })
    })

    it('should emit deviceApiError and not call client if device not found or not rotator', async () => {
      mockGetDeviceById.mockReturnValue(null)
      await store.syncToPosition('unknown-device', syncPosition)
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId: 'unknown-device',
        error: 'Device not found or not a rotator for syncToPosition'
      })
      expect(mockRotatorClientInstance.put).not.toHaveBeenCalled()
      mockEmitEvent.mockClear()

      mockGetDeviceById.mockReturnValue({ ...mockRotatorDevice, type: 'camera' } as UnifiedDevice)
      await store.syncToPosition(testRotatorId, syncPosition)
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId: testRotatorId,
        error: 'Device not found or not a rotator for syncToPosition'
      })
      expect(mockRotatorClientInstance.put).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError if client is not available', async () => {
      vi.spyOn(store, '_getRotatorClient').mockReturnValue(null)
      await store.syncToPosition(testRotatorId, syncPosition)
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId: testRotatorId,
        error: 'Rotator client not available for syncToPosition'
      })
      expect(mockRotatorClientInstance.put).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError on client.put failure (no property change expected on error)', async () => {
      vi.spyOn(store, '_getRotatorClient').mockReturnValue(mockRotatorClientInstance)
      const apiError = new Error('Sync Failed')
      vi.mocked(mockRotatorClientInstance.put).mockRejectedValue(apiError)
      mockUpdateDeviceProperties.mockClear()

      await store.syncToPosition(testRotatorId, syncPosition)

      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId: testRotatorId,
        error: `Failed to syncToPosition ${syncPosition}: ${apiError.message}`
      })
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled()
    })
  })

  describe('setRotatorReverse', () => {
    const newReverseState = true

    it('should call client.put with "setreverse" and update property on success', async () => {
      vi.spyOn(store, '_getRotatorClient').mockReturnValue(mockRotatorClientInstance)
      vi.mocked(mockRotatorClientInstance.put).mockResolvedValue(undefined)

      await store.setRotatorReverse(testRotatorId, newReverseState)

      expect(mockRotatorClientInstance.put).toHaveBeenCalledWith('setreverse', { Reverse: newReverseState })
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(testRotatorId, { reverse: newReverseState })
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceMethodCalled',
        deviceId: testRotatorId,
        method: 'setreverse',
        args: [{ Reverse: newReverseState }],
        result: 'success'
      })
    })

    it('should emit deviceApiError and not call client if device not found or not rotator', async () => {
      mockGetDeviceById.mockReturnValue(null)
      await store.setRotatorReverse('unknown-device', newReverseState)
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId: 'unknown-device',
        error: 'Device not found or not a rotator for setRotatorReverse'
      })
      expect(mockRotatorClientInstance.put).not.toHaveBeenCalled()
      mockEmitEvent.mockClear()

      mockGetDeviceById.mockReturnValue({ ...mockRotatorDevice, type: 'camera' } as UnifiedDevice)
      await store.setRotatorReverse(testRotatorId, newReverseState)
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId: testRotatorId,
        error: 'Device not found or not a rotator for setRotatorReverse'
      })
      expect(mockRotatorClientInstance.put).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError if client is not available', async () => {
      vi.spyOn(store, '_getRotatorClient').mockReturnValue(null)
      await store.setRotatorReverse(testRotatorId, newReverseState)
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId: testRotatorId,
        error: 'Rotator client not available for setRotatorReverse'
      })
      expect(mockRotatorClientInstance.put).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError on client.put failure (no property change expected on error)', async () => {
      vi.spyOn(store, '_getRotatorClient').mockReturnValue(mockRotatorClientInstance)
      const apiError = new Error('SetReverse Failed')
      vi.mocked(mockRotatorClientInstance.put).mockRejectedValue(apiError)
      mockUpdateDeviceProperties.mockClear()

      await store.setRotatorReverse(testRotatorId, newReverseState)

      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId: testRotatorId,
        error: `Failed to setRotatorReverse to ${newReverseState}: ${apiError.message}`
      })
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled()
    })
  })

  describe('Polling Actions', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      const device = store.devices.get(testRotatorId)
      if (device) {
        device.isConnected = true
        store.updateDeviceProperties(testRotatorId, { _rt_isPollingStatus: false })
      }
    })

    afterEach(() => {
      vi.runOnlyPendingTimers()
      vi.useRealTimers()
    })

    describe('startRotatorPolling', () => {
      beforeEach(() => {
        // Mock _pollRotatorStatus for these specific tests to focus on scheduling
        vi.spyOn(store, '_pollRotatorStatus').mockImplementation(() => {})
      })

      it('should call stopRotatorPolling, make an initial poll, set polling flag, and start interval', () => {
        const stopPollingSpy = vi.spyOn(store, 'stopRotatorPolling')
        const initialPollSpy = vi.spyOn(store, '_pollRotatorStatus')
        const setIntervalSpy = vi.spyOn(global, 'setInterval')

        store.startRotatorPolling(testRotatorId, 500)

        expect(stopPollingSpy).toHaveBeenCalledWith(testRotatorId)
        expect(initialPollSpy).toHaveBeenCalledWith(testRotatorId)
        expect(store.devices.get(testRotatorId)?.properties._rt_isPollingStatus).toBe(true)
        expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 500)
        expect(store._rt_pollingTimers.has(testRotatorId)).toBe(true)

        initialPollSpy.mockClear()
        vi.advanceTimersByTime(500)
        expect(initialPollSpy).toHaveBeenCalledTimes(1)
        vi.advanceTimersByTime(500)
        expect(initialPollSpy).toHaveBeenCalledTimes(2)
      })

      it('should use default interval if none provided and not in store settings', () => {
        store._propertyPollingIntervals = new Map()
        const setIntervalSpy = vi.spyOn(global, 'setInterval')
        store.startRotatorPolling(testRotatorId)
        expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000)
      })

      it('should use interval from store._propertyPollingIntervals if available', () => {
        store._propertyPollingIntervals = new Map([['rotatorStatus', 750]])
        const setIntervalSpy = vi.spyOn(global, 'setInterval')
        store.startRotatorPolling(testRotatorId)
        expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 750)
      })

      it('polling should stop if device becomes disconnected', () => {
        const pollSpy = vi.spyOn(store, '_pollRotatorStatus')
        store.startRotatorPolling(testRotatorId, 500)
        pollSpy.mockClear()

        vi.advanceTimersByTime(500)
        expect(pollSpy).toHaveBeenCalledTimes(1)

        const device = store.devices.get(testRotatorId)
        if (device) device.isConnected = false

        vi.advanceTimersByTime(500)
        expect(pollSpy).toHaveBeenCalledTimes(1)
        expect(store._rt_pollingTimers.has(testRotatorId)).toBe(false)
        expect(store.devices.get(testRotatorId)?.properties._rt_isPollingStatus).toBe(false)
      })

      it('calling startRotatorPolling again should clear existing timer and start a new one', () => {
        const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
        const setIntervalSpy = vi.spyOn(global, 'setInterval')

        store.startRotatorPolling(testRotatorId, 500)
        const firstTimerId = store._rt_pollingTimers.get(testRotatorId)
        expect(setIntervalSpy).toHaveBeenCalledTimes(1)

        store.startRotatorPolling(testRotatorId, 600)
        const secondTimerId = store._rt_pollingTimers.get(testRotatorId)

        expect(clearIntervalSpy).toHaveBeenCalledWith(firstTimerId)
        expect(setIntervalSpy).toHaveBeenCalledTimes(2)
        expect(setIntervalSpy).toHaveBeenLastCalledWith(expect.any(Function), 600)
        expect(secondTimerId).not.toBe(firstTimerId)
      })
    })

    describe('_pollRotatorStatus', () => {
      it('should call fetchRotatorStatus', () => {
        const fetchSpy = vi.spyOn(store, 'fetchRotatorStatus').mockResolvedValue(undefined)

        store._pollRotatorStatus(testRotatorId)

        expect(fetchSpy).toHaveBeenCalledWith(testRotatorId)
      })

      it('should catch errors from fetchRotatorStatus to prevent unhandled promise rejections', async () => {
        vi.spyOn(store, 'fetchRotatorStatus').mockRejectedValue(new Error('Fetch failed'))
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        store._pollRotatorStatus(testRotatorId)

        expect(store.fetchRotatorStatus).toHaveBeenCalledWith(testRotatorId)

        await Promise.resolve()

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('[RotatorActions._pollRotatorStatus] Error during polling'),
          expect.any(Error)
        )
        consoleErrorSpy.mockRestore()
      })
    })
  })

  describe('handleRotatorConnected', () => {
    let initializeRotatorStateSpy: MockInstance<UnifiedStoreType['initializeRotatorState']>
    let fetchRotatorCapabilitiesSpy: MockInstance<UnifiedStoreType['fetchRotatorCapabilities']>
    let startRotatorPollingSpy: MockInstance<UnifiedStoreType['startRotatorPolling']>

    beforeEach(() => {
      initializeRotatorStateSpy = vi.spyOn(store, 'initializeRotatorState')
      fetchRotatorCapabilitiesSpy = vi.spyOn(store, 'fetchRotatorCapabilities')
      startRotatorPollingSpy = vi.spyOn(store, 'startRotatorPolling')

      // Mock implementations
      fetchRotatorCapabilitiesSpy.mockResolvedValue(undefined) // Default success
      // initializeRotatorStateSpy and startRotatorPollingSpy are void and don't need mockResolvedValue
    })

    it('should initialize, fetch capabilities, and start polling for a rotator device', async () => {
      mockGetDeviceById.mockReturnValue(mockRotatorDevice)

      store.handleRotatorConnected(testRotatorId)

      // Need to wait for promises in handleRotatorConnected to resolve
      await vi.waitFor(() => expect(fetchRotatorCapabilitiesSpy).toHaveBeenCalled())
      await vi.waitFor(() => expect(startRotatorPollingSpy).toHaveBeenCalled())

      expect(initializeRotatorStateSpy).toHaveBeenCalledWith(testRotatorId)
      expect(fetchRotatorCapabilitiesSpy).toHaveBeenCalledWith(testRotatorId)
      expect(startRotatorPollingSpy).toHaveBeenCalledWith(testRotatorId)
      expect(initializeRotatorStateSpy).toHaveBeenCalledBefore(fetchRotatorCapabilitiesSpy)
      expect(fetchRotatorCapabilitiesSpy).toHaveBeenCalledBefore(startRotatorPollingSpy)
    })

    it('should still start polling if fetching capabilities fails, and log an error', async () => {
      mockGetDeviceById.mockReturnValue(mockRotatorDevice)
      const capabilityError = new Error('Capability fetch failed')
      fetchRotatorCapabilitiesSpy.mockRejectedValue(capabilityError)
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      store.handleRotatorConnected(testRotatorId)

      await vi.waitFor(() => expect(fetchRotatorCapabilitiesSpy).toHaveBeenCalled())
      await vi.waitFor(() => expect(startRotatorPollingSpy).toHaveBeenCalled())

      expect(initializeRotatorStateSpy).toHaveBeenCalledWith(testRotatorId)
      expect(fetchRotatorCapabilitiesSpy).toHaveBeenCalledWith(testRotatorId)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `[RotatorActions.handleRotatorConnected] Error during initial capability fetch for ${testRotatorId}:`,
        capabilityError
      )
      expect(startRotatorPollingSpy).toHaveBeenCalledWith(testRotatorId)
      expect(initializeRotatorStateSpy).toHaveBeenCalledBefore(fetchRotatorCapabilitiesSpy)
      // Ensure polling starts even after failure
      expect(fetchRotatorCapabilitiesSpy).toHaveBeenCalledBefore(startRotatorPollingSpy)

      consoleErrorSpy.mockRestore()
    })

    it('should not do anything if the device is not a rotator', () => {
      const nonRotatorDevice: UnifiedDevice = { ...mockRotatorDevice, type: 'camera' }
      mockGetDeviceById.mockReturnValue(nonRotatorDevice)

      store.handleRotatorConnected(testRotatorId)

      expect(initializeRotatorStateSpy).not.toHaveBeenCalled()
      expect(fetchRotatorCapabilitiesSpy).not.toHaveBeenCalled()
      expect(startRotatorPollingSpy).not.toHaveBeenCalled()
    })

    it('should not do anything if the device is not found', () => {
      mockGetDeviceById.mockReturnValue(null)

      store.handleRotatorConnected('unknown-device')

      expect(initializeRotatorStateSpy).not.toHaveBeenCalled()
      expect(fetchRotatorCapabilitiesSpy).not.toHaveBeenCalled()
      expect(startRotatorPollingSpy).not.toHaveBeenCalled()
    })
  })
})
