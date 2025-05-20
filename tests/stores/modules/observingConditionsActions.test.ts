import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { ObservingConditionsClient } from '@/api/alpaca/observingconditions-client'
import type { MockInstance } from 'vitest'
import type { IObservingConditionsData } from '@/api/alpaca/observingconditions-client'
import type { ObservingConditionsDeviceProperties } from '@/stores/modules/observingConditionsActions'
import type { UnifiedDevice } from '@/types/device.types'
import type { DeviceEvent } from '@/stores/types/device-store.types'

// Mock the ObservingConditionsClient
// Define a shared mock instance
const mockOCClientInstance = {
  getAllConditions: vi.fn(),
  setAveragePeriod: vi.fn(),
  refresh: vi.fn(),
  getProperty: vi.fn(),
  put: vi.fn()
} as unknown as ObservingConditionsClient

vi.mock('@/api/alpaca/observingconditions-client', () => ({
  ObservingConditionsClient: vi.fn(() => mockOCClientInstance)
}))

describe('observingConditionsActions.ts', () => {
  let store: ReturnType<typeof useUnifiedStore>
  let _mockGetDeviceById: MockInstance<(deviceId: string) => UnifiedDevice | null>
  let _mockUpdateDevice: MockInstance<(deviceId: string, updates: Partial<ObservingConditionsDeviceProperties | UnifiedDevice>) => void>
  let _mockEmitEvent: MockInstance<(event: DeviceEvent) => void>

  const testDeviceId = 'oc-device-1'
  const mockDevice: UnifiedDevice = {
    id: testDeviceId,
    name: 'Test Observing Conditions',
    type: 'observingconditions',
    deviceNum: 0,
    isConnected: true,
    isConnecting: false,
    isDisconnecting: false,
    status: 'connected',
    address: 'localhost',
    port: 11111,
    apiBaseUrl: 'http://localhost:11111',
    properties: {},
    capabilities: {},
    client: null,
    lastSuccessfulCommunication: Date.now(),
    lastFailedCommunication: null
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useUnifiedStore()

    vi.clearAllMocks()

    mockOCClientInstance.getAllConditions = vi.fn()
    mockOCClientInstance.setAveragePeriod = vi.fn()
    mockOCClientInstance.refresh = vi.fn()
    mockOCClientInstance.getProperty = vi.fn()
    mockOCClientInstance.put = vi.fn()

    _mockGetDeviceById = vi.spyOn(store, 'getDeviceById').mockImplementation((deviceId: string): UnifiedDevice | null => {
      if (deviceId === testDeviceId) {
        return mockDevice
      }
      return null
    })

    _mockUpdateDevice = vi.spyOn(store, 'updateDevice')
    _mockEmitEvent = vi.spyOn(store, '_emitEvent')

    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // Test suite for _getOCClient
  describe('_getOCClient', () => {
    it('should return null if device is not found', () => {
      _mockGetDeviceById.mockReturnValue(null)
      const client = store._getOCClient('non-existent-device')
      expect(client).toBeNull()
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('[OCStore] Device non-existent-device not found'))
    })

    it('should return null if device is not an ObservingConditions device', () => {
      _mockGetDeviceById.mockReturnValueOnce({ ...mockDevice, type: 'camera' } as UnifiedDevice)
      const client = store._getOCClient(testDeviceId)
      expect(client).toBeNull()
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(`[OCStore] Device ${testDeviceId} not found or is not an ObservingConditions device.`)
      )
    })

    it('should return null if device has incomplete address details', () => {
      _mockGetDeviceById.mockReturnValueOnce({ ...mockDevice, apiBaseUrl: undefined, address: undefined, ipAddress: undefined } as UnifiedDevice)
      const client = store._getOCClient(testDeviceId)
      expect(client).toBeNull()
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining(`[OCStore] Device ${testDeviceId} has incomplete address details.`))
    })

    it('should create and return an ObservingConditionsClient with apiBaseUrl', () => {
      _mockGetDeviceById.mockReturnValue(mockDevice)
      const client = store._getOCClient(testDeviceId)
      expect(client).toBe(mockOCClientInstance)
      expect(ObservingConditionsClient).toHaveBeenCalledWith('http://localhost:11111', 0, mockDevice)
    })

    it('should create and return an ObservingConditionsClient with address and port', () => {
      _mockGetDeviceById.mockReturnValueOnce({ ...mockDevice, apiBaseUrl: undefined, address: '192.168.1.100', port: 12345 } as UnifiedDevice)
      const client = store._getOCClient(testDeviceId)
      expect(client).toBe(mockOCClientInstance)
      expect(ObservingConditionsClient).toHaveBeenCalledWith('http://192.168.1.100:12345', 0, expect.objectContaining({ address: '192.168.1.100' }))
    })

    it('should create and return an ObservingConditionsClient with ipAddress and port', () => {
      _mockGetDeviceById.mockReturnValueOnce({
        ...mockDevice,
        apiBaseUrl: undefined,
        address: undefined, // Ensure this is undefined for the ipAddress case
        ipAddress: '192.168.1.101',
        port: 12345
      } as UnifiedDevice)
      const client = store._getOCClient(testDeviceId)
      expect(client).toBe(mockOCClientInstance)
      expect(ObservingConditionsClient).toHaveBeenCalledWith('http://192.168.1.101:12345', 0, expect.objectContaining({ ipAddress: '192.168.1.101' }))
    })

    it('should handle baseUrl ending with a slash', () => {
      _mockGetDeviceById.mockReturnValueOnce({ ...mockDevice, apiBaseUrl: 'http://localhost:11111/' } as UnifiedDevice)
      const client = store._getOCClient(testDeviceId)
      expect(client).toBe(mockOCClientInstance)
      expect(ObservingConditionsClient).toHaveBeenCalledWith(
        'http://localhost:11111',
        0,
        expect.objectContaining({ apiBaseUrl: 'http://localhost:11111/' })
      )
    })
  })

  // Test suite for fetchObservingConditions
  describe('fetchObservingConditions', () => {
    const mockConditionsData: IObservingConditionsData = {
      averageperiod: 60,
      cloudcover: 10,
      dewpoint: 5,
      humidity: 50,
      pressure: 1012,
      rainrate: 0,
      skybrightness: 18.5,
      skyquality: 20.0,
      skytemperature: -5,
      starfwhm: 2.3,
      temperature: 15,
      winddirection: 180,
      windgust: 25,
      windspeed: 20
    }

    it('should fetch all conditions and update the device state', async () => {
      vi.mocked(mockOCClientInstance.getAllConditions).mockResolvedValue(mockConditionsData)

      await store.fetchObservingConditions(testDeviceId)

      expect(mockOCClientInstance.getAllConditions).toHaveBeenCalledTimes(1)
      expect(_mockUpdateDevice).toHaveBeenCalledWith(testDeviceId, { oc_conditions: mockConditionsData })
      expect(_mockEmitEvent).toHaveBeenCalledWith({
        type: 'devicePropertyChanged',
        deviceId: testDeviceId,
        property: 'observingConditions',
        value: mockConditionsData
      })
    })

    it('should do nothing if client cannot be obtained', async () => {
      _mockGetDeviceById.mockReturnValue(null)
      await store.fetchObservingConditions(testDeviceId)
      expect(mockOCClientInstance.getAllConditions).not.toHaveBeenCalled()
      expect(_mockUpdateDevice).not.toHaveBeenCalled()
      expect(_mockEmitEvent).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError if fetching conditions fails', async () => {
      const testError = new Error('Fetch failed')
      vi.mocked(mockOCClientInstance.getAllConditions).mockRejectedValue(testError)

      await store.fetchObservingConditions(testDeviceId)

      expect(mockOCClientInstance.getAllConditions).toHaveBeenCalledTimes(1)
      expect(_mockUpdateDevice).not.toHaveBeenCalledWith(testDeviceId, { oc_conditions: expect.anything() })
      expect(_mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId: testDeviceId,
        error: `Failed to fetch observing conditions: ${testError}`
      })
      expect(console.error).toHaveBeenCalledWith(`[OCStore] Error fetching conditions for ${testDeviceId}:`, testError)
    })
  })

  // Test suite for setObservingConditionsAveragePeriod
  describe('setObservingConditionsAveragePeriod', () => {
    const newPeriod = 300

    it('should set average period and refresh conditions', async () => {
      // Mock the setAveragePeriod to resolve successfully
      vi.mocked(mockOCClientInstance.setAveragePeriod).mockResolvedValue(undefined)
      // Mock getAllConditions to resolve successfully for the subsequent fetch
      const mockConditionsData: IObservingConditionsData = { temperature: 25 } // Example data
      vi.mocked(mockOCClientInstance.getAllConditions).mockResolvedValue(mockConditionsData)

      await store.setObservingConditionsAveragePeriod(testDeviceId, newPeriod)

      expect(mockOCClientInstance.setAveragePeriod).toHaveBeenCalledTimes(1)
      expect(mockOCClientInstance.setAveragePeriod).toHaveBeenCalledWith(newPeriod)
      // Verify that fetchObservingConditions was called (which in turn calls getAllConditions)
      expect(mockOCClientInstance.getAllConditions).toHaveBeenCalledTimes(1)
      expect(_mockUpdateDevice).toHaveBeenCalledWith(testDeviceId, { oc_conditions: mockConditionsData })
      expect(_mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceMethodCalled',
        deviceId: testDeviceId,
        method: 'setAveragePeriod',
        args: [newPeriod],
        result: 'success'
      })
    })

    it('should do nothing if client cannot be obtained', async () => {
      _mockGetDeviceById.mockReturnValue(null) // Simulate client not found
      await store.setObservingConditionsAveragePeriod(testDeviceId, newPeriod)
      expect(mockOCClientInstance.setAveragePeriod).not.toHaveBeenCalled()
      expect(mockOCClientInstance.getAllConditions).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError and re-fetch if setting period fails', async () => {
      const testError = new Error('Set period failed')
      vi.mocked(mockOCClientInstance.setAveragePeriod).mockRejectedValue(testError)
      // Mock getAllConditions for the re-fetch attempt
      const mockFallbackConditions: IObservingConditionsData = { temperature: 20 }
      vi.mocked(mockOCClientInstance.getAllConditions).mockResolvedValue(mockFallbackConditions)

      await store.setObservingConditionsAveragePeriod(testDeviceId, newPeriod)

      expect(mockOCClientInstance.setAveragePeriod).toHaveBeenCalledTimes(1)
      expect(mockOCClientInstance.setAveragePeriod).toHaveBeenCalledWith(newPeriod)
      expect(_mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId: testDeviceId,
        error: `Failed to set average period: ${testError}`
      })
      expect(console.error).toHaveBeenCalledWith(`[OCStore] Error setting average period for ${testDeviceId}:`, testError)
      // Verify that fetchObservingConditions was still called to ensure consistency
      expect(mockOCClientInstance.getAllConditions).toHaveBeenCalledTimes(1)
      expect(_mockUpdateDevice).toHaveBeenCalledWith(testDeviceId, { oc_conditions: mockFallbackConditions })
    })
  })

  // Test suite for refreshObservingConditionsReadings
  describe('refreshObservingConditionsReadings', () => {
    it('should call refresh on the client and then fetch conditions', async () => {
      vi.mocked(mockOCClientInstance.refresh).mockResolvedValue(undefined)
      const mockRefreshedConditions: IObservingConditionsData = { humidity: 60 }
      vi.mocked(mockOCClientInstance.getAllConditions).mockResolvedValue(mockRefreshedConditions)

      await store.refreshObservingConditionsReadings(testDeviceId)

      expect(mockOCClientInstance.refresh).toHaveBeenCalledTimes(1)
      expect(mockOCClientInstance.getAllConditions).toHaveBeenCalledTimes(1)
      expect(_mockUpdateDevice).toHaveBeenCalledWith(testDeviceId, { oc_conditions: mockRefreshedConditions })
      expect(_mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceMethodCalled',
        deviceId: testDeviceId,
        method: 'refreshObservingConditions',
        args: [],
        result: 'success'
      })
    })

    it('should do nothing if client cannot be obtained', async () => {
      _mockGetDeviceById.mockReturnValue(null)
      await store.refreshObservingConditionsReadings(testDeviceId)
      expect(mockOCClientInstance.refresh).not.toHaveBeenCalled()
      expect(mockOCClientInstance.getAllConditions).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError if refresh fails (and not necessarily re-fetch)', async () => {
      const testError = new Error('Refresh failed')
      vi.mocked(mockOCClientInstance.refresh).mockRejectedValue(testError)
      // Reset getAllConditions mock to ensure it's not called due to the error path in refresh action
      vi.mocked(mockOCClientInstance.getAllConditions).mockClear()

      await store.refreshObservingConditionsReadings(testDeviceId)

      expect(mockOCClientInstance.refresh).toHaveBeenCalledTimes(1)
      expect(_mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId: testDeviceId,
        error: `Failed to refresh observing conditions: ${testError}`
      })
      expect(console.error).toHaveBeenCalledWith(`[OCStore] Error refreshing observing conditions for ${testDeviceId}:`, testError)
      // Depending on implementation, fetchObservingConditions might not be called after a refresh error.
      // The current implementation comments out the re-fetch on error.
      expect(mockOCClientInstance.getAllConditions).not.toHaveBeenCalled()
    })
  })

  // Test suite for Polling Logic
  describe('Polling Logic', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      // Ensure the device is in a state where polling can start
      _mockGetDeviceById.mockImplementation((deviceId: string): UnifiedDevice | null => {
        if (deviceId === testDeviceId) {
          return { ...mockDevice, isConnected: true } // Ensure device is connected
        }
        return null
      })
      // Reset polling state in the store if necessary, though Pinia state is fresh each test
      store._oc_isPolling.clear()
      store._oc_pollingTimers.clear()
    })

    afterEach(() => {
      vi.restoreAllMocks() // Restore original timers and other mocks
      vi.useRealTimers()
    })

    describe('_pollObservingConditions', () => {
      it('should fetch conditions if polling is active and device is connected', async () => {
        store._oc_isPolling.set(testDeviceId, true)
        vi.mocked(mockOCClientInstance.getAllConditions).mockResolvedValue({ temperature: 10 })

        await store._pollObservingConditions(testDeviceId)

        expect(mockOCClientInstance.getAllConditions).toHaveBeenCalledTimes(1)
        expect(_mockUpdateDevice).toHaveBeenCalledWith(testDeviceId, { oc_conditions: { temperature: 10 } })
      })

      it('should not fetch conditions if polling is not active', async () => {
        store._oc_isPolling.set(testDeviceId, false)
        await store._pollObservingConditions(testDeviceId)
        expect(mockOCClientInstance.getAllConditions).not.toHaveBeenCalled()
      })

      it('should stop polling if device is not found during poll', async () => {
        store._oc_isPolling.set(testDeviceId, true)
        _mockGetDeviceById.mockReturnValue(null) // Device disappears
        const stopPollingSpy = vi.spyOn(store, 'stopObservingConditionsPolling')

        await store._pollObservingConditions(testDeviceId)

        expect(mockOCClientInstance.getAllConditions).not.toHaveBeenCalled()
        expect(stopPollingSpy).toHaveBeenCalledWith(testDeviceId)
      })

      it('should stop polling if device is not connected during poll', async () => {
        store._oc_isPolling.set(testDeviceId, true)
        _mockGetDeviceById.mockReturnValue({ ...mockDevice, isConnected: false })
        const stopPollingSpy = vi.spyOn(store, 'stopObservingConditionsPolling')

        await store._pollObservingConditions(testDeviceId)

        expect(mockOCClientInstance.getAllConditions).not.toHaveBeenCalled()
        expect(stopPollingSpy).toHaveBeenCalledWith(testDeviceId)
      })
    })

    describe('startObservingConditionsPolling', () => {
      it('should start polling if device is valid and connected', () => {
        const pollSpy = vi.spyOn(store, '_pollObservingConditions')
        // Mock getAllConditions for the immediate call within _pollObservingConditions if start implies an immediate fetch
        // For now, assuming startObservingConditionsPolling sets up the interval,
        // and _pollObservingConditions is called by that interval.
        // The action itself doesn't directly call fetch, but the interval will.

        store.startObservingConditionsPolling(testDeviceId)

        expect(store._oc_isPolling.get(testDeviceId)).toBe(true)
        expect(store._oc_pollingTimers.has(testDeviceId)).toBe(true)

        // Fast-forward time to trigger the poll
        vi.advanceTimersByTime(5000) // Default interval
        expect(pollSpy).toHaveBeenCalledWith(testDeviceId)
        // If startObservingConditionsPolling *also* makes an initial call, this needs adjustment
        // The current SUT doesn't make an immediate call in start, but relies on handleConnected or manual fetch.
      })

      it('should stop existing polling if called again for the same device', () => {
        const stopSpy = vi.spyOn(store, 'stopObservingConditionsPolling')
        // First call to start
        store.startObservingConditionsPolling(testDeviceId)
        const firstTimerId = store._oc_pollingTimers.get(testDeviceId)

        // Second call to start
        store.startObservingConditionsPolling(testDeviceId)

        expect(stopSpy).toHaveBeenCalledWith(testDeviceId)
        expect(store._oc_pollingTimers.get(testDeviceId)).not.toBe(firstTimerId)
        expect(store._oc_isPolling.get(testDeviceId)).toBe(true) // Should still be true
      })

      it('should not start polling if device is not found', () => {
        _mockGetDeviceById.mockReturnValue(null)
        store.startObservingConditionsPolling(testDeviceId)
        expect(store._oc_isPolling.get(testDeviceId)).toBeUndefined()
        expect(store._oc_pollingTimers.has(testDeviceId)).toBe(false)
      })

      it('should not start polling if device is not an OC device', () => {
        _mockGetDeviceById.mockReturnValue({ ...mockDevice, type: 'camera' })
        store.startObservingConditionsPolling(testDeviceId)
        expect(store._oc_isPolling.get(testDeviceId)).toBeUndefined()
        expect(store._oc_pollingTimers.has(testDeviceId)).toBe(false)
      })

      it('should not start polling if device is not connected', () => {
        _mockGetDeviceById.mockReturnValue({ ...mockDevice, isConnected: false })
        store.startObservingConditionsPolling(testDeviceId)
        expect(store._oc_isPolling.get(testDeviceId)).toBeUndefined()
        expect(store._oc_pollingTimers.has(testDeviceId)).toBe(false)
      })

      it('should use propertyPollIntervalMs from device properties if available', () => {
        const customInterval = 10000
        _mockGetDeviceById.mockReturnValue({ ...mockDevice, properties: { propertyPollIntervalMs: customInterval } })
        const pollSpy = vi.spyOn(store, '_pollObservingConditions')

        store.startObservingConditionsPolling(testDeviceId)

        vi.advanceTimersByTime(customInterval)
        expect(pollSpy).toHaveBeenCalledWith(testDeviceId)
        vi.advanceTimersByTime(customInterval)
        expect(pollSpy).toHaveBeenCalledTimes(2) // Check it continues with custom interval
      })
    })

    describe('stopObservingConditionsPolling', () => {
      it('should stop polling and clear timer', () => {
        // Start polling first to have something to stop
        store.startObservingConditionsPolling(testDeviceId)
        expect(store._oc_isPolling.get(testDeviceId)).toBe(true)
        const timerId = store._oc_pollingTimers.get(testDeviceId)
        expect(timerId).toBeDefined()

        const clearIntervalSpy = vi.spyOn(window, 'clearInterval')

        store.stopObservingConditionsPolling(testDeviceId)

        expect(store._oc_isPolling.get(testDeviceId)).toBe(false)
        expect(store._oc_pollingTimers.has(testDeviceId)).toBe(false)
        expect(clearIntervalSpy).toHaveBeenCalledWith(timerId)
      })

      it('should do nothing if polling was not active', () => {
        const clearIntervalSpy = vi.spyOn(window, 'clearInterval')
        store.stopObservingConditionsPolling(testDeviceId)
        expect(store._oc_isPolling.get(testDeviceId)).toBe(false) // or undefined if never set
        expect(store._oc_pollingTimers.has(testDeviceId)).toBe(false)
        expect(clearIntervalSpy).not.toHaveBeenCalled()
      })
    })
  })

  // Test suite for Connection Handlers
  describe('Connection Handlers', () => {
    let fetchConditionsSpy: MockInstance<() => Promise<void>>
    let startPollingSpy: MockInstance<() => void>
    let stopPollingSpy: MockInstance<() => void>

    beforeEach(() => {
      // Spy on actions called by the handlers
      fetchConditionsSpy = vi.spyOn(store, 'fetchObservingConditions').mockResolvedValue() // Mock implementation as it's tested elsewhere
      startPollingSpy = vi.spyOn(store, 'startObservingConditionsPolling')
      stopPollingSpy = vi.spyOn(store, 'stopObservingConditionsPolling')

      // Ensure device is available for handlers
      _mockGetDeviceById.mockReturnValue(mockDevice)
    })

    describe('handleObservingConditionsConnected', () => {
      it('should fetch conditions and start polling when an OC device connects', () => {
        // Ensure the device type is correct for the handler to proceed
        _mockGetDeviceById.mockReturnValue({ ...mockDevice, type: 'observingconditions', isConnected: true })

        store.handleObservingConditionsConnected(testDeviceId)

        expect(fetchConditionsSpy).toHaveBeenCalledWith(testDeviceId)
        expect(startPollingSpy).toHaveBeenCalledWith(testDeviceId)
        expect(console.log).toHaveBeenCalledWith(`[OCStore] ObservingConditions ${testDeviceId} connected. Fetching data and starting poll.`)
      })

      it('should not proceed if device is not found (though core connect logic might prevent this)', () => {
        _mockGetDeviceById.mockReturnValue(null)
        store.handleObservingConditionsConnected(testDeviceId)
        // The SUT handleObservingConditionsConnected doesn't check device existence itself,
        // it relies on fetchObservingConditions and startObservingConditionsPolling to do so.
        // We check that these are called, and their internal guards will prevent errors.
        expect(fetchConditionsSpy).toHaveBeenCalledWith(testDeviceId) // It will be called, but will do nothing internally
        expect(startPollingSpy).toHaveBeenCalledWith(testDeviceId) // Same here
      })
    })

    describe('handleObservingConditionsDisconnected', () => {
      it('should stop polling and clear oc_conditions from device state', () => {
        store.handleObservingConditionsDisconnected(testDeviceId)

        expect(stopPollingSpy).toHaveBeenCalledWith(testDeviceId)
        expect(_mockUpdateDevice).toHaveBeenCalledWith(testDeviceId, { oc_conditions: null })
        expect(console.log).toHaveBeenCalledWith(`[OCStore] ObservingConditions ${testDeviceId} disconnected. Stopping poll and clearing state.`)
      })

      it('should proceed even if device is not found (updateDevice will fail gracefully)', () => {
        _mockGetDeviceById.mockReturnValue(null)
        store.handleObservingConditionsDisconnected(testDeviceId)
        expect(stopPollingSpy).toHaveBeenCalledWith(testDeviceId) // stopPolling is robust
        expect(_mockUpdateDevice).toHaveBeenCalledWith(testDeviceId, { oc_conditions: null }) // updateDevice will handle non-existent device
      })
    })
  })
})
