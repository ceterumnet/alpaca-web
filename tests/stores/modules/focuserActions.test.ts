import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import type { UnifiedStoreType } from '@/stores/UnifiedStore'
import type { Device, FocuserDeviceProperties } from '@/stores/types/device-store.types'
import type { DeviceEvent } from '@/stores/types/device-store.types'
import { FocuserClient } from '@/api/alpaca/focuser-client' // Actual client for type reference
import type { StoreOptions } from '@/stores/types/device-store.types'

// Mock the FocuserClient
const mockFocuserClientInstance = {
  // Device properties (camelCased method names from client)
  getAbsolute: vi.fn(),
  isTempCompAvailable: vi.fn(),
  isMoving: vi.fn(),
  getMaxIncrement: vi.fn(),
  getMaxStep: vi.fn(),
  getPosition: vi.fn(),
  getStepSize: vi.fn(),
  getTempComp: vi.fn(),
  getTemperature: vi.fn(),

  // Action methods
  halt: vi.fn(),
  move: vi.fn(),
  setTempComp: vi.fn(),

  // Common client methods from BaseClient (if needed for other tests)
  isConnected: vi.fn(),
  getActionTimeout: vi.fn(),
  setActionTimeout: vi.fn(),
  getHttpRequestTimeout: vi.fn(),
  setHttpRequestTimeout: vi.fn(),
  setRetryAttempts: vi.fn(),
  setRetryDelay: vi.fn(),
  getAxiosInstance: vi.fn(),
  getProperty: vi.fn(),
  setProperty: vi.fn(),
  callMethod: vi.fn(),
  fetchDeviceState: vi.fn()
}

vi.mock('@/api/alpaca/focuser-client', () => ({
  FocuserClient: vi.fn(() => mockFocuserClientInstance)
}))

const mockEmitEvent = vi.fn()

describe('focuserActions', () => {
  let store: UnifiedStoreType
  let mockGetDeviceById: MockInstance<(deviceId: string) => Device | null>
  let mockUpdateDeviceProperties: MockInstance<(deviceId: string, updates: Partial<Device>, options?: StoreOptions) => boolean>
  let mockUpdateDevice: MockInstance<(deviceId: string, updates: Partial<Device>, options?: StoreOptions) => boolean>
  let mockCallDeviceMethod: MockInstance<(deviceId: string, method: string, args?: unknown[] | undefined) => Promise<unknown>>
  let emitEventSpy: MockInstance<(event: DeviceEvent) => void>

  const FOCUSER_DEVICE_ID = 'focuser-1'
  const mockFocuserDevice: Device = {
    id: FOCUSER_DEVICE_ID,
    name: 'Test Focuser',
    type: 'focuser',
    isConnected: false,
    isConnecting: false,
    isDisconnecting: false,
    status: 'idle',
    properties: {},
    apiBaseUrl: 'http://localhost:11111/api/v1/focuser/0',
    deviceNum: 0
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useUnifiedStore()

    // Reset mocks
    vi.clearAllMocks()
    mockEmitEvent.mockClear()

    // Spy on internal _emitEvent
    emitEventSpy = vi.spyOn(store as unknown as { _emitEvent: (event: DeviceEvent) => void }, '_emitEvent').mockImplementation(mockEmitEvent)

    // Spy on relevant core actions
    mockGetDeviceById = vi.spyOn(store, 'getDeviceById')
    mockUpdateDeviceProperties = vi.spyOn(store, 'updateDeviceProperties')
    mockUpdateDevice = vi.spyOn(store, 'updateDevice') // Used by connection handlers
    mockCallDeviceMethod = vi.spyOn(store, 'callDeviceMethod')

    // Setup default mock implementations
    mockGetDeviceById.mockImplementation((deviceId) => {
      if (deviceId === FOCUSER_DEVICE_ID) {
        return JSON.parse(JSON.stringify(mockFocuserDevice)) // Return a copy
      }
      return null
    })
    mockUpdateDeviceProperties.mockReturnValue(true)
    mockUpdateDevice.mockReturnValue(true)
    mockCallDeviceMethod.mockResolvedValue({ data: 'mocked method call' })

    // Ensure focuser device is in the store for tests that need it
    // but clear its specific properties
    store.$reset() // Reset the entire store for a clean slate
    store.devices.set(FOCUSER_DEVICE_ID, { ...mockFocuserDevice, properties: {} })
    store.devicesArray = [{ ...mockFocuserDevice, properties: {} }]

    // Reset focuser specific state in store if any (e.g. polling timers)
    // This would be similar to what cleanupDeviceState in cameraActions does
    store._focuser_isPolling = store._focuser_isPolling || new Map()
    store._focuser_pollingTimers = store._focuser_pollingTimers || new Map()
    store._focuser_isPolling.clear()
    store._focuser_pollingTimers.forEach(clearTimeout)
    store._focuser_pollingTimers.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Test suites will be added here, starting with _getFocuserClient
  describe('_getFocuserClient', () => {
    it('should return a FocuserClient instance if device is found and is a focuser', () => {
      // Retrieve the device as it would be passed to the client constructor
      const deviceForClient = store.getDeviceById(FOCUSER_DEVICE_ID)
      const client = store._getFocuserClient(FOCUSER_DEVICE_ID)
      expect(client).toBeDefined()
      expect(client).toBe(mockFocuserClientInstance)
      expect(FocuserClient).toHaveBeenCalledWith(
        mockFocuserDevice.apiBaseUrl,
        mockFocuserDevice.deviceNum,
        deviceForClient // Pass the actual device object used by the SUT
      )
    })

    it('should return null if device is not found', () => {
      mockGetDeviceById.mockReturnValue(null)
      const client = store._getFocuserClient('non-existent-device')
      expect(client).toBeNull()
      expect(FocuserClient).not.toHaveBeenCalled()
    })

    it('should return null if device is found but is not a focuser', () => {
      mockGetDeviceById.mockReturnValue({ ...mockFocuserDevice, type: 'camera' } as Device)
      const client = store._getFocuserClient(FOCUSER_DEVICE_ID)
      expect(client).toBeNull()
      expect(FocuserClient).not.toHaveBeenCalled()
    })

    it('should return null if device is found but has no apiBaseUrl', () => {
      mockGetDeviceById.mockReturnValue({ ...mockFocuserDevice, apiBaseUrl: undefined } as Device)
      const client = store._getFocuserClient(FOCUSER_DEVICE_ID)
      expect(client).toBeNull()
      expect(FocuserClient).not.toHaveBeenCalled()
    })
    it('should return null if FocuserClient constructor throws', () => {
      vi.mocked(FocuserClient).mockImplementationOnce(() => {
        throw new Error('Failed to create client')
      })
      const client = store._getFocuserClient(FOCUSER_DEVICE_ID)
      expect(client).toBeNull()
    })
  })

  describe('fetchFocuserDetails', () => {
    beforeEach(() => {
      // Reset client mock methods for each test in this suite
      vi.mocked(mockFocuserClientInstance.getMaxStep).mockResolvedValue(10000)
      vi.mocked(mockFocuserClientInstance.getMaxIncrement).mockResolvedValue(5000)
      vi.mocked(mockFocuserClientInstance.getStepSize).mockResolvedValue(100)
      // For fetchFocuserDetails, it also calls fetchFocuserStatus, so mock its dependencies too
      vi.mocked(mockFocuserClientInstance.getPosition).mockResolvedValue(1234)
      vi.mocked(mockFocuserClientInstance.isMoving).mockResolvedValue(false)
      vi.mocked(mockFocuserClientInstance.getTemperature).mockResolvedValue(25.5)
      vi.mocked(mockFocuserClientInstance.getTempComp).mockResolvedValue(true)
    })

    it('should fetch focuser details, update properties, and emit event on success', async () => {
      await store.fetchFocuserDetails(FOCUSER_DEVICE_ID)

      expect(mockFocuserClientInstance.getMaxStep).toHaveBeenCalledTimes(1)
      expect(mockFocuserClientInstance.getMaxIncrement).toHaveBeenCalledTimes(1)
      expect(mockFocuserClientInstance.getStepSize).toHaveBeenCalledTimes(1)

      const expectedDetailsUpdates: FocuserDeviceProperties = {
        focuser_maxStep: 10000,
        focuser_maxIncrement: 5000,
        focuser_stepSize: 100
      }
      // It calls updateDeviceProperties twice: once for details, once for status from the nested call
      expect(mockUpdateDeviceProperties).toHaveBeenCalledTimes(2)
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(FOCUSER_DEVICE_ID, expect.objectContaining(expectedDetailsUpdates))

      // Check the event for capabilities (details)
      expect(emitEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'devicePropertyChanged',
          deviceId: FOCUSER_DEVICE_ID,
          property: 'focuserCapabilities',
          value: expectedDetailsUpdates
        })
      )

      // Also verify that fetchFocuserStatus parts were called (due to internal call)
      expect(mockFocuserClientInstance.getPosition).toHaveBeenCalledTimes(1)
      expect(mockFocuserClientInstance.isMoving).toHaveBeenCalledTimes(1)
      const expectedStatusUpdates: FocuserDeviceProperties = {
        focuser_position: 1234,
        focuser_isMoving: false,
        focuser_temperature: 25.5,
        focuser_tempComp: true
      }
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(FOCUSER_DEVICE_ID, expect.objectContaining(expectedStatusUpdates))
      // Check the event for status
      expect(emitEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'devicePropertyChanged',
          deviceId: FOCUSER_DEVICE_ID,
          property: 'focuserStatus',
          value: expect.objectContaining(expectedStatusUpdates)
        })
      )
    })

    it('should not call client methods or update properties if client is not obtained', async () => {
      mockGetDeviceById.mockReturnValue(null) // Ensure _getFocuserClient returns null
      await store.fetchFocuserDetails(FOCUSER_DEVICE_ID)

      expect(mockFocuserClientInstance.getMaxStep).not.toHaveBeenCalled()
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled()
      expect(emitEventSpy).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError if fetching details fails', async () => {
      const error = new Error('Failed to get max step')
      vi.mocked(mockFocuserClientInstance.getMaxStep).mockRejectedValue(error)

      await store.fetchFocuserDetails(FOCUSER_DEVICE_ID)

      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled()
      expect(emitEventSpy).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId: FOCUSER_DEVICE_ID,
        action: 'fetchFocuserDetails',
        error: `Failed to fetch focuser details: ${error}`
      })
      // fetchFocuserStatus should NOT be called if the initial capability fetch fails and an error is caught.
      expect(mockFocuserClientInstance.getPosition).not.toHaveBeenCalled()
    })
  })

  describe('fetchFocuserStatus', () => {
    beforeEach(() => {
      // Reset client mock methods for each test in this suite
      vi.mocked(mockFocuserClientInstance.getPosition).mockResolvedValue(5555)
      vi.mocked(mockFocuserClientInstance.isMoving).mockResolvedValue(true)
      vi.mocked(mockFocuserClientInstance.getTemperature).mockResolvedValue(10.1)
      vi.mocked(mockFocuserClientInstance.getTempComp).mockResolvedValue(false)
    })

    it('should fetch focuser status, update properties, and emit event on success', async () => {
      await store.fetchFocuserStatus(FOCUSER_DEVICE_ID)

      expect(mockFocuserClientInstance.getPosition).toHaveBeenCalledTimes(1)
      expect(mockFocuserClientInstance.isMoving).toHaveBeenCalledTimes(1)
      expect(mockFocuserClientInstance.getTemperature).toHaveBeenCalledTimes(1)
      expect(mockFocuserClientInstance.getTempComp).toHaveBeenCalledTimes(1)

      const expectedStatusUpdates: FocuserDeviceProperties = {
        focuser_position: 5555,
        focuser_isMoving: true,
        focuser_temperature: 10.1,
        focuser_tempComp: false
      }
      expect(mockUpdateDeviceProperties).toHaveBeenCalledTimes(1)
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(FOCUSER_DEVICE_ID, expect.objectContaining(expectedStatusUpdates))

      expect(emitEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'devicePropertyChanged',
          deviceId: FOCUSER_DEVICE_ID,
          property: 'focuserStatus',
          value: expectedStatusUpdates
        })
      )
    })

    it('should not call client methods or update properties if client is not obtained', async () => {
      mockGetDeviceById.mockReturnValue(null) // Ensure _getFocuserClient returns null
      await store.fetchFocuserStatus(FOCUSER_DEVICE_ID)

      expect(mockFocuserClientInstance.getPosition).not.toHaveBeenCalled()
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled()
      expect(emitEventSpy).not.toHaveBeenCalled()
    })

    it('should not emit deviceApiError if fetching status fails (only logs error)', async () => {
      // Based on SUT: console.error, but no _emitEvent for deviceApiError in fetchFocuserStatus's catch block
      const error = new Error('Failed to get position')
      vi.mocked(mockFocuserClientInstance.getPosition).mockRejectedValue(error)
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}) // Suppress console output for test

      await store.fetchFocuserStatus(FOCUSER_DEVICE_ID)

      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled()
      expect(emitEventSpy).not.toHaveBeenCalled() // No deviceApiError event expected for status polling failures
      expect(consoleErrorSpy).toHaveBeenCalledWith(`[FocuserStore] Error fetching status for ${FOCUSER_DEVICE_ID}:`, error)

      consoleErrorSpy.mockRestore()
    })
  })

  describe('moveFocuser', () => {
    const TARGET_POSITION = 7500

    beforeEach(() => {
      // Ensure fetchFocuserStatus mocks are set up as it's called after move
      vi.mocked(mockFocuserClientInstance.getPosition).mockResolvedValue(TARGET_POSITION) // Assume move is instant for status check
      vi.mocked(mockFocuserClientInstance.isMoving).mockResolvedValue(false) // Assume move completes
      vi.mocked(mockFocuserClientInstance.getTemperature).mockResolvedValue(10.0) // Default status values
      vi.mocked(mockFocuserClientInstance.getTempComp).mockResolvedValue(false)
    })

    it('should call client.move with target position and refresh status on success', async () => {
      vi.mocked(mockFocuserClientInstance.move).mockResolvedValue(undefined) // Mock successful move

      await store.moveFocuser(FOCUSER_DEVICE_ID, TARGET_POSITION)

      expect(mockFocuserClientInstance.move).toHaveBeenCalledTimes(1)
      expect(mockFocuserClientInstance.move).toHaveBeenCalledWith(TARGET_POSITION)

      expect(emitEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceMethodCalled',
          deviceId: FOCUSER_DEVICE_ID,
          method: 'moveFocuser',
          args: [TARGET_POSITION],
          result: 'success'
        })
      )

      // Verify fetchFocuserStatus was called (by checking one of its client calls)
      expect(mockFocuserClientInstance.getPosition).toHaveBeenCalledTimes(1)
    })

    it('should not call client.move if client is not obtained', async () => {
      mockGetDeviceById.mockReturnValue(null)
      await store.moveFocuser(FOCUSER_DEVICE_ID, TARGET_POSITION)
      expect(mockFocuserClientInstance.move).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError and refresh status if client.move fails', async () => {
      const error = new Error('Move failed')
      vi.mocked(mockFocuserClientInstance.move).mockRejectedValue(error)
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}) // Suppress console output

      await store.moveFocuser(FOCUSER_DEVICE_ID, TARGET_POSITION)

      expect(mockFocuserClientInstance.move).toHaveBeenCalledTimes(1)
      expect(mockFocuserClientInstance.move).toHaveBeenCalledWith(TARGET_POSITION)

      expect(emitEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceApiError',
          deviceId: FOCUSER_DEVICE_ID,
          action: 'moveFocuser',
          error: `Failed to move focuser: ${error}`,
          params: { targetPosition: TARGET_POSITION }
        })
      )

      // Verify fetchFocuserStatus was still called even on error
      expect(mockFocuserClientInstance.getPosition).toHaveBeenCalledTimes(1)
      consoleErrorSpy.mockRestore()
    })
  })

  describe('haltFocuser', () => {
    beforeEach(() => {
      // Ensure fetchFocuserStatus mocks are set up as it's called after halt
      vi.mocked(mockFocuserClientInstance.getPosition).mockResolvedValue(1234) // Some position
      vi.mocked(mockFocuserClientInstance.isMoving).mockResolvedValue(false) // Assume halt completes and it's not moving
      vi.mocked(mockFocuserClientInstance.getTemperature).mockResolvedValue(10.0)
      vi.mocked(mockFocuserClientInstance.getTempComp).mockResolvedValue(false)
    })

    it('should call client.halt and refresh status on success', async () => {
      vi.mocked(mockFocuserClientInstance.halt).mockResolvedValue(undefined) // Mock successful halt

      await store.haltFocuser(FOCUSER_DEVICE_ID)

      expect(mockFocuserClientInstance.halt).toHaveBeenCalledTimes(1)

      expect(emitEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceMethodCalled',
          deviceId: FOCUSER_DEVICE_ID,
          method: 'haltFocuser',
          args: [],
          result: 'success'
        })
      )

      // Verify fetchFocuserStatus was called
      expect(mockFocuserClientInstance.getPosition).toHaveBeenCalledTimes(1)
    })

    it('should not call client.halt if client is not obtained', async () => {
      mockGetDeviceById.mockReturnValue(null)
      await store.haltFocuser(FOCUSER_DEVICE_ID)
      expect(mockFocuserClientInstance.halt).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError and refresh status if client.halt fails', async () => {
      const error = new Error('Halt failed')
      vi.mocked(mockFocuserClientInstance.halt).mockRejectedValue(error)
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}) // Suppress console output

      await store.haltFocuser(FOCUSER_DEVICE_ID)

      expect(mockFocuserClientInstance.halt).toHaveBeenCalledTimes(1)

      expect(emitEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceApiError',
          deviceId: FOCUSER_DEVICE_ID,
          action: 'haltFocuser',
          error: `Failed to halt focuser: ${error}`
        })
      )

      // Verify fetchFocuserStatus was still called even on error
      expect(mockFocuserClientInstance.getPosition).toHaveBeenCalledTimes(1)
      consoleErrorSpy.mockRestore()
    })
  })

  describe('setFocuserTempComp', () => {
    const ENABLE_TEMP_COMP = true

    beforeEach(() => {
      // Ensure fetchFocuserStatus mocks are set up as it's called after setTempComp
      vi.mocked(mockFocuserClientInstance.getPosition).mockResolvedValue(1234)
      vi.mocked(mockFocuserClientInstance.isMoving).mockResolvedValue(false)
      vi.mocked(mockFocuserClientInstance.getTemperature).mockResolvedValue(10.0)
      vi.mocked(mockFocuserClientInstance.getTempComp).mockResolvedValue(ENABLE_TEMP_COMP) // Reflects the change
    })

    it('should call client.setTempComp with the enable flag and refresh status on success', async () => {
      vi.mocked(mockFocuserClientInstance.setTempComp).mockResolvedValue(undefined) // Mock successful setTempComp

      await store.setFocuserTempComp(FOCUSER_DEVICE_ID, ENABLE_TEMP_COMP)

      expect(mockFocuserClientInstance.setTempComp).toHaveBeenCalledTimes(1)
      expect(mockFocuserClientInstance.setTempComp).toHaveBeenCalledWith(ENABLE_TEMP_COMP)

      expect(emitEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceMethodCalled',
          deviceId: FOCUSER_DEVICE_ID,
          method: 'setFocuserTempComp',
          args: [ENABLE_TEMP_COMP],
          result: 'success'
        })
      )

      // Verify fetchFocuserStatus was called
      expect(mockFocuserClientInstance.getPosition).toHaveBeenCalledTimes(1) // Verifying one of the status calls
    })

    it('should not call client.setTempComp if client is not obtained', async () => {
      mockGetDeviceById.mockReturnValue(null)
      await store.setFocuserTempComp(FOCUSER_DEVICE_ID, ENABLE_TEMP_COMP)
      expect(mockFocuserClientInstance.setTempComp).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError and refresh status if client.setTempComp fails', async () => {
      const error = new Error('Set TempComp failed')
      vi.mocked(mockFocuserClientInstance.setTempComp).mockRejectedValue(error)
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}) // Suppress console output

      await store.setFocuserTempComp(FOCUSER_DEVICE_ID, ENABLE_TEMP_COMP)

      expect(mockFocuserClientInstance.setTempComp).toHaveBeenCalledTimes(1)
      expect(mockFocuserClientInstance.setTempComp).toHaveBeenCalledWith(ENABLE_TEMP_COMP)

      expect(emitEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceApiError',
          deviceId: FOCUSER_DEVICE_ID,
          action: 'setFocuserTempComp',
          error: `Failed to set TempComp: ${error}`,
          params: { enable: ENABLE_TEMP_COMP }
        })
      )

      // Verify fetchFocuserStatus was still called even on error
      expect(mockFocuserClientInstance.getPosition).toHaveBeenCalledTimes(1)
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Polling Actions', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      // Ensure device is connected for polling tests
      mockFocuserDevice.isConnected = true
      store.devices.set(FOCUSER_DEVICE_ID, { ...mockFocuserDevice, isConnected: true })
      store.devicesArray = [{ ...mockFocuserDevice, isConnected: true }]

      // Mock _pollFocuserStatus as its detailed functionality is tested via fetchFocuserStatus tests
      // Here we just want to ensure it's called by the polling mechanism.
      vi.spyOn(store, '_pollFocuserStatus').mockResolvedValue(undefined)
    })

    afterEach(() => {
      vi.runOnlyPendingTimers()
      vi.useRealTimers()
    })

    it('startFocuserPolling should start polling if device is connected and not already polling', () => {
      store.startFocuserPolling(FOCUSER_DEVICE_ID)
      expect(store._focuser_isPolling.get(FOCUSER_DEVICE_ID)).toBe(true)
      expect(store._focuser_pollingTimers.has(FOCUSER_DEVICE_ID)).toBe(true)
      expect(store._pollFocuserStatus).not.toHaveBeenCalled() // Should not call immediately, but after interval

      vi.advanceTimersByTime(1000) // Default poll interval in SUT is 1000ms
      expect(store._pollFocuserStatus).toHaveBeenCalledTimes(1)
      expect(store._pollFocuserStatus).toHaveBeenCalledWith(FOCUSER_DEVICE_ID)

      vi.advanceTimersByTime(1000)
      expect(store._pollFocuserStatus).toHaveBeenCalledTimes(2)
    })

    it('startFocuserPolling should not start if device is not connected', () => {
      mockFocuserDevice.isConnected = false
      store.devices.set(FOCUSER_DEVICE_ID, { ...mockFocuserDevice, isConnected: false })
      store.startFocuserPolling(FOCUSER_DEVICE_ID)
      expect(store._focuser_isPolling.get(FOCUSER_DEVICE_ID)).toBeFalsy()
    })

    it('startFocuserPolling should not start if device is not a focuser', () => {
      mockGetDeviceById.mockReturnValueOnce({ ...mockFocuserDevice, type: 'camera' } as Device)
      store.startFocuserPolling(FOCUSER_DEVICE_ID)
      expect(store._focuser_isPolling.get(FOCUSER_DEVICE_ID)).toBeFalsy()
    })

    it('startFocuserPolling should clear existing timer and restart if called again for same device', () => {
      store.startFocuserPolling(FOCUSER_DEVICE_ID)
      const firstTimerId = store._focuser_pollingTimers.get(FOCUSER_DEVICE_ID)
      expect(firstTimerId).toBeDefined()

      store.startFocuserPolling(FOCUSER_DEVICE_ID) // Call again
      expect(store._focuser_pollingTimers.get(FOCUSER_DEVICE_ID)).toBeDefined()
      expect(store._focuser_pollingTimers.get(FOCUSER_DEVICE_ID)).not.toBe(firstTimerId)
      expect(store._pollFocuserStatus).not.toHaveBeenCalled() // Interval restarts

      vi.advanceTimersByTime(1000)
      expect(store._pollFocuserStatus).toHaveBeenCalledTimes(1)
    })

    it('stopFocuserPolling should stop polling and clear timer if polling was active', () => {
      store.startFocuserPolling(FOCUSER_DEVICE_ID)
      expect(store._focuser_isPolling.get(FOCUSER_DEVICE_ID)).toBe(true)

      store.stopFocuserPolling(FOCUSER_DEVICE_ID)
      expect(store._focuser_isPolling.get(FOCUSER_DEVICE_ID)).toBe(false)
      expect(store._focuser_pollingTimers.has(FOCUSER_DEVICE_ID)).toBe(false)

      vi.advanceTimersByTime(2000) // Advance time, _pollFocuserStatus should not be called
      expect(store._pollFocuserStatus).not.toHaveBeenCalled()
    })

    it('stopFocuserPolling should do nothing if polling was not active', () => {
      store.stopFocuserPolling(FOCUSER_DEVICE_ID)
      expect(store._focuser_isPolling.get(FOCUSER_DEVICE_ID)).toBeFalsy() // or undefined if never set
      expect(store._focuser_pollingTimers.has(FOCUSER_DEVICE_ID)).toBe(false)
      // Ensure no error is thrown and no unexpected calls
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
      store.stopFocuserPolling(FOCUSER_DEVICE_ID)
      expect(clearIntervalSpy).not.toHaveBeenCalledWith(expect.anything()) // As timer map should be empty for this device
      clearIntervalSpy.mockRestore()
    })

    it('_pollFocuserStatus should stop polling if device becomes disconnected', async () => {
      // This test now relies on the mock of _pollFocuserStatus and tests the wrapper logic in startFocuserPolling
      // The actual logic of _pollFocuserStatus stopping polling on disconnect is implicitly tested if fetchFocuserStatus fails or device.isConnected turns false
      // For direct test of _pollFocuserStatus itself (if it were not mocked):
      // 1. Start polling
      // 2. Advance timer to trigger _pollFocuserStatus
      // 3. Inside the mock of fetchFocuserStatus (called by _pollFocuserStatus), change device.isConnected to false
      // 4. Verify polling is stopped by checking _focuser_isPolling and _focuser_pollingTimers
      // Since _pollFocuserStatus is mocked here for simplicity, we can't directly test its internal stop logic.
      // We primarily test that startFocuserPolling sets up the interval correctly.
      // The internal check for device.isConnected in the SUT's _pollFocuserStatus is assumed to work.

      // Simpler test: Ensure stopFocuserPolling is called if device is no longer connected when _pollFocuserStatus is invoked.
      // This requires _pollFocuserStatus to NOT be mocked for this specific test, or to have a mock that simulates this.
      vi.restoreAllMocks() // Restore to use actual _pollFocuserStatus
      vi.spyOn(store, 'fetchFocuserStatus').mockImplementation(async () => {
        // Simulate device disconnecting during the poll
        store.devices.get(FOCUSER_DEVICE_ID)!.isConnected = false
      })
      const stopPollingSpy = vi.spyOn(store, 'stopFocuserPolling')

      store.startFocuserPolling(FOCUSER_DEVICE_ID)
      vi.advanceTimersByTime(1000) // Trigger the poll
      await vi.runOnlyPendingTimersAsync() // Ensure async operations in poll complete

      expect(store.fetchFocuserStatus).toHaveBeenCalledTimes(1)
      expect(stopPollingSpy).toHaveBeenCalledWith(FOCUSER_DEVICE_ID)
    })
  })

  describe('Connection Handlers', () => {
    let fetchDetailsSpy: MockInstance<(deviceId: string) => Promise<void>>
    let startPollingSpy: MockInstance<(deviceId: string) => void>
    let stopPollingSpy: MockInstance<(deviceId: string) => void>
    let updateDevicePropsSpy: MockInstance<(deviceId: string, updates: Partial<Device>, options?: StoreOptions) => boolean>

    beforeEach(() => {
      // Ensure device is set up in a default state (e.g., not connected)
      mockFocuserDevice.isConnected = false
      store.devices.set(FOCUSER_DEVICE_ID, { ...mockFocuserDevice })
      store.devicesArray = [{ ...mockFocuserDevice }]

      // Spy on the actions that should be called by the handlers
      fetchDetailsSpy = vi.spyOn(store, 'fetchFocuserDetails').mockResolvedValue(undefined)
      startPollingSpy = vi.spyOn(store, 'startFocuserPolling').mockImplementation(() => {})
      stopPollingSpy = vi.spyOn(store, 'stopFocuserPolling').mockImplementation(() => {})
      updateDevicePropsSpy = vi.spyOn(store, 'updateDeviceProperties').mockReturnValue(true) // Already spied, but ensure it's fresh for this suite
    })

    describe('handleFocuserConnected', () => {
      it('should call fetchFocuserDetails and startFocuserPolling', () => {
        store.handleFocuserConnected(FOCUSER_DEVICE_ID)
        expect(fetchDetailsSpy).toHaveBeenCalledWith(FOCUSER_DEVICE_ID)
        expect(startPollingSpy).toHaveBeenCalledWith(FOCUSER_DEVICE_ID)
      })
    })

    describe('handleFocuserDisconnected', () => {
      it('should call stopFocuserPolling and updateDeviceProperties with cleared props', () => {
        store.handleFocuserDisconnected(FOCUSER_DEVICE_ID)
        expect(stopPollingSpy).toHaveBeenCalledWith(FOCUSER_DEVICE_ID)

        const clearedProps: FocuserDeviceProperties = {
          focuser_position: null,
          focuser_isMoving: null,
          focuser_temperature: null,
          focuser_stepSize: null,
          focuser_maxStep: null,
          focuser_maxIncrement: null,
          focuser_tempComp: null
        }
        expect(updateDevicePropsSpy).toHaveBeenCalledWith(FOCUSER_DEVICE_ID, clearedProps)
      })
    })
  })
})
