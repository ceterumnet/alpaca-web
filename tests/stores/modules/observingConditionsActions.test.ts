import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { ObservingConditionsClient } from '@/api/alpaca/observingconditions-client'
import type { MockInstance } from 'vitest'
import type { IObservingConditionsData } from '@/api/alpaca/observingconditions-client'
import type { ObservingConditionsDevice, UnifiedDevice } from '@/types/device.types'
import type { DeviceEvent } from '@/stores/types/device-store.types'
import log from '@/plugins/logger'

// Mock the ObservingConditionsClient
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
  let _mockUpdateDevice: MockInstance<(deviceId: string, updates: Partial<ObservingConditionsDevice>) => void>
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
    apiBaseUrl: 'http://localhost:11111/api/v1/observingconditions/0',
    properties: {
      propertyPollIntervalMs: 5000
    },
    capabilities: {}
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useUnifiedStore()

    vi.clearAllMocks()

    // Reset mock client functions
    mockOCClientInstance.getAllConditions = vi.fn()
    mockOCClientInstance.setAveragePeriod = vi.fn()
    mockOCClientInstance.refresh = vi.fn()
    mockOCClientInstance.getProperty = vi.fn()
    mockOCClientInstance.put = vi.fn()

    // Add the device to the store first
    store.addDevice(mockDevice)

    // Set up spies after device is added
    _mockGetDeviceById = vi.spyOn(store, 'getDeviceById')
    _mockUpdateDevice = vi.spyOn(store, 'updateDevice')
    _mockEmitEvent = vi.spyOn(store, '_emitEvent')

    // Mock logging
    vi.spyOn(log, 'error').mockImplementation(() => {})
    vi.spyOn(log, 'debug').mockImplementation(() => {})
    vi.spyOn(log, 'info').mockImplementation(() => {})
    vi.spyOn(log, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getDeviceClient', () => {
    it('should return null if device is not found', () => {
      const client = store.getDeviceClient('non-existent-device')
      expect(client).toBeNull()
      expect(log.error).toHaveBeenCalledWith(
        { deviceIds: ['non-existent-device'] },
        '[CoreActions] getDeviceClient called for device ID: non-existent-device but device not found'
      )
    })

    it('should create and return an ObservingConditionsClient with ipAddress and port', () => {
      const deviceWithIP = {
        ...mockDevice,
        id: 'oc-device-2',
        apiBaseUrl: undefined,
        ipAddress: '192.168.1.101',
        port: 12345
      }
      store.addDevice(deviceWithIP)

      const client = store.getDeviceClient('oc-device-2')
      expect(client).toBe(mockOCClientInstance)
      expect(ObservingConditionsClient).toHaveBeenCalledWith(
        'http://192.168.1.101:12345/api/v1/observingconditions/0',
        0,
        expect.objectContaining({ ipAddress: '192.168.1.101' })
      )
    })

    it('should handle baseUrl ending with a slash', () => {
      const deviceWithSlash = {
        ...mockDevice,
        id: 'oc-device-3',
        apiBaseUrl: 'http://localhost:11111/api/v1/observingconditions/0/'
      }
      store.addDevice(deviceWithSlash)

      const client = store.getDeviceClient('oc-device-3')
      expect(client).toBe(mockOCClientInstance)
      expect(ObservingConditionsClient).toHaveBeenCalledWith(
        'http://localhost:11111/api/v1/observingconditions/0/',
        0,
        expect.objectContaining({ apiBaseUrl: 'http://localhost:11111/api/v1/observingconditions/0/' })
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
      expect(_mockUpdateDevice).toHaveBeenCalledWith(testDeviceId, { conditions: mockConditionsData })
      expect(_mockEmitEvent).toHaveBeenCalledWith({
        type: 'devicePropertyChanged',
        deviceId: testDeviceId,
        property: 'observingConditions',
        value: mockConditionsData
      })
    })

    it('should do nothing if client cannot be obtained', async () => {
      store.removeDevice(testDeviceId)
      await store.fetchObservingConditions(testDeviceId)
      expect(mockOCClientInstance.getAllConditions).not.toHaveBeenCalled()
      expect(_mockUpdateDevice).not.toHaveBeenCalled()
      expect(_mockEmitEvent).toHaveBeenCalled()
    })

    it('should emit deviceApiError if fetching conditions fails', async () => {
      const testError = new Error('Fetch failed')
      vi.mocked(mockOCClientInstance.getAllConditions).mockRejectedValue(testError)

      await store.fetchObservingConditions(testDeviceId)

      expect(mockOCClientInstance.getAllConditions).toHaveBeenCalledTimes(1)
      expect(_mockUpdateDevice).not.toHaveBeenCalledWith(testDeviceId, { conditions: expect.anything() })
      expect(_mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId: testDeviceId,
        error: `Failed to fetch observing conditions: ${testError}`
      })
      expect(log.error).toHaveBeenCalledWith({ deviceIds: [testDeviceId] }, `[OCStore] Error fetching conditions for ${testDeviceId}.`, testError)
    })
  })

  // Test suite for setObservingConditionsAveragePeriod
  describe('setObservingConditionsAveragePeriod', () => {
    const newPeriod = 300

    it('should set average period and refresh conditions', async () => {
      vi.mocked(mockOCClientInstance.setAveragePeriod).mockResolvedValue(undefined)
      const mockConditionsData: IObservingConditionsData = { temperature: 25 }
      vi.mocked(mockOCClientInstance.getAllConditions).mockResolvedValue(mockConditionsData)

      await store.setObservingConditionsAveragePeriod(testDeviceId, newPeriod)

      expect(mockOCClientInstance.setAveragePeriod).toHaveBeenCalledTimes(1)
      expect(mockOCClientInstance.setAveragePeriod).toHaveBeenCalledWith(newPeriod)
      expect(mockOCClientInstance.getAllConditions).toHaveBeenCalledTimes(1)
      expect(_mockUpdateDevice).toHaveBeenCalledWith(testDeviceId, { conditions: mockConditionsData })
      expect(_mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceMethodCalled',
        deviceId: testDeviceId,
        method: 'setAveragePeriod',
        args: [newPeriod],
        result: 'success'
      })
    })

    it('should do nothing if client cannot be obtained', async () => {
      store.removeDevice(testDeviceId)
      await store.setObservingConditionsAveragePeriod(testDeviceId, newPeriod)
      expect(mockOCClientInstance.setAveragePeriod).not.toHaveBeenCalled()
      expect(mockOCClientInstance.getAllConditions).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError and re-fetch if setting period fails', async () => {
      const testError = new Error('Set period failed')
      vi.mocked(mockOCClientInstance.setAveragePeriod).mockRejectedValue(testError)
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
      expect(log.error).toHaveBeenCalledWith({ deviceIds: [testDeviceId] }, `[OCStore] Error setting average period for ${testDeviceId}.`, testError)
      expect(mockOCClientInstance.getAllConditions).toHaveBeenCalledTimes(1)
      expect(_mockUpdateDevice).toHaveBeenCalledWith(testDeviceId, { conditions: mockFallbackConditions })
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
      expect(_mockUpdateDevice).toHaveBeenCalledWith(testDeviceId, { conditions: mockRefreshedConditions })
      expect(_mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceMethodCalled',
        deviceId: testDeviceId,
        method: 'refreshObservingConditions',
        args: [],
        result: 'success'
      })
    })

    it('should emit deviceApiError if refresh fails', async () => {
      const testError = new Error('Refresh failed')
      vi.mocked(mockOCClientInstance.refresh).mockRejectedValue(testError)

      await store.refreshObservingConditionsReadings(testDeviceId)

      expect(mockOCClientInstance.refresh).toHaveBeenCalledTimes(1)
      expect(_mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId: testDeviceId,
        error: `Failed to refresh observing conditions: ${testError}`
      })
      expect(log.error).toHaveBeenCalledWith(
        { deviceIds: [testDeviceId] },
        `[OCStore] Error refreshing observing conditions for ${testDeviceId}.`,
        testError
      )
    })
  })

  // Test suite for Polling Logic
  describe('Polling Logic', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    describe('_pollObservingConditions', () => {
      it('should fetch conditions if polling is active and device is connected', async () => {
        store.isDevicePolling.set(testDeviceId, true)
        vi.mocked(mockOCClientInstance.getAllConditions).mockResolvedValue({ temperature: 10 })

        await store._pollObservingConditions(testDeviceId)

        expect(mockOCClientInstance.getAllConditions).toHaveBeenCalledTimes(1)
        expect(_mockUpdateDevice).toHaveBeenCalledWith(testDeviceId, { conditions: { temperature: 10 } })
      })

      it('should not fetch conditions if polling is not active', async () => {
        store.isDevicePolling.set(testDeviceId, false)
        await store._pollObservingConditions(testDeviceId)
        expect(mockOCClientInstance.getAllConditions).not.toHaveBeenCalled()
      })

      it('should stop polling if device is not found during poll', async () => {
        store.isDevicePolling.set(testDeviceId, true)
        store.removeDevice(testDeviceId)
        const stopPollingSpy = vi.spyOn(store, 'stopObservingConditionsPolling')

        await store._pollObservingConditions(testDeviceId)

        expect(mockOCClientInstance.getAllConditions).not.toHaveBeenCalled()
        expect(stopPollingSpy).toHaveBeenCalledWith(testDeviceId)
      })
    })

    describe('startObservingConditionsPolling', () => {
      it('should start polling if device is connected', () => {
        store.startObservingConditionsPolling(testDeviceId)
        expect(store.isDevicePolling.get(testDeviceId)).toBe(true)
        expect(store.propertyPollingIntervals.has(testDeviceId)).toBe(true)
      })

      it('should not start polling if device is not connected', () => {
        store.updateDevice(testDeviceId, { isConnected: false })
        store.startObservingConditionsPolling(testDeviceId)

        // Verify no polling interval was created
        expect(store.propertyPollingIntervals.has(testDeviceId)).toBe(false)

        // Verify no conditions were fetched (since polling didn't start)
        expect(mockOCClientInstance.getAllConditions).not.toHaveBeenCalled()
      })
    })

    describe('stopObservingConditionsPolling', () => {
      it('should stop polling and clear interval', () => {
        store.startObservingConditionsPolling(testDeviceId)
        store.stopObservingConditionsPolling(testDeviceId)
        expect(store.isDevicePolling.get(testDeviceId)).toBe(false)
        expect(store.propertyPollingIntervals.has(testDeviceId)).toBe(false)
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
        expect(log.debug).toHaveBeenCalledWith(
          { deviceId: testDeviceId },
          `[OCStore] ObservingConditions ${testDeviceId} connected. Fetching data and starting poll.`
        )
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
      it('should stop polling and clear conditions from device state', () => {
        store.handleObservingConditionsDisconnected(testDeviceId)

        expect(stopPollingSpy).toHaveBeenCalledWith(testDeviceId)
        expect(_mockUpdateDevice).toHaveBeenCalledWith(testDeviceId, { conditions: null })
        expect(log.debug).toHaveBeenCalledWith(
          { deviceId: testDeviceId },
          `[OCStore] ObservingConditions ${testDeviceId} disconnected. Stopping poll and clearing state.`
        )
      })

      // I don't think it shoulf fail gracefully...it should error
      // it('should proceed even if device is not found (updateDevice will fail gracefully)', () => {
      //   _mockGetDeviceById.mockReturnValue(null)
      //   store.handleObservingConditionsDisconnected(testDeviceId)
      //   expect(stopPollingSpy).toHaveBeenCalledWith(testDeviceId) // stopPolling is robust
      //   expect(_mockUpdateDevice).toHaveBeenCalledWith(testDeviceId, { conditions: null }) // updateDevice will handle non-existent device
      // })
    })
  })
})
