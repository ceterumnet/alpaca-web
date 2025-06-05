import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import type { MockInstance } from 'vitest'
import { SafetyMonitorClient, type SafetyMonitorAlpacaStatus } from '@/api/alpaca/safetymonitor-client'
import type { SafetyMonitorDevice, UnifiedDevice, Device } from '@/types/device.types'
import type { DeviceEvent } from '@/stores/types/device-store.types'

// Define the explicit shape of our mock client instance for type safety within the test file
interface MockSafetyMonitorClient {
  connected: MockInstance<() => Promise<boolean>>
  fetchStatus: MockInstance<() => Promise<SafetyMonitorAlpacaStatus>>
}

const mockSafetyMonitorClientInstance: MockSafetyMonitorClient = {
  connected: vi.fn<() => Promise<boolean>>(),
  fetchStatus: vi.fn<() => Promise<SafetyMonitorAlpacaStatus>>()
}

// Mock the SafetyMonitorClient constructor
vi.mock('@/api/alpaca/safetymonitor-client', () => ({
  SafetyMonitorClient: vi.fn().mockImplementation(() => mockSafetyMonitorClientInstance)
}))

vi.mock('@/api/AlpacaClient', () => {
  const actual = vi.importActual('@/api/AlpacaClient')
  return {
    ...actual,
    createAlpacaClient: vi.fn((baseUrl: string, deviceType: string, deviceNumber: number, device: Device) => {
      if (deviceType.toLowerCase() === 'safetymonitor') {
        return mockSafetyMonitorClientInstance
      }
      return { type: deviceType, baseUrl, deviceNumber, device }
    })
  }
})

// Updated createMockDevice helper with refined typing for properties and capabilities
const createMockDevice = (id: string, type: string, overrides: Partial<UnifiedDevice> = {}): UnifiedDevice => {
  // Assuming UnifiedDevice defines properties and capabilities, possibly as Record<string, unknown> or specific types.
  // For a generic helper, using Record<string, unknown> if they are not strictly typed empty objects.
  const defaults: Omit<UnifiedDevice, 'properties' | 'capabilities'> & {
    properties: Record<string, unknown> // Or a more specific type from UnifiedDevice if available
    capabilities: Record<string, unknown> // Or a more specific type from UnifiedDevice if available
  } = {
    id,
    name: `Mock ${type} ${id}`,
    type,
    uniqueId: `uid-${id}`,
    deviceNumber: 0,
    isConnected: false,
    isConnecting: false,
    isDisconnecting: false,
    status: 'idle',
    apiBaseUrl: 'http://localhost:11111/api/v1/safetymonitor/0',
    properties: {}, // This should conform to Record<string, unknown>
    capabilities: {} // This should conform to Record<string, unknown>
  }
  return { ...defaults, ...overrides } as UnifiedDevice
}

describe('safetyMonitorActions', () => {
  let store: ReturnType<typeof useUnifiedStore>
  let mockGetDeviceById: MockInstance<(id: string) => UnifiedDevice | undefined>
  let mockUpdateDevice: MockInstance<(deviceId: string, updates: Partial<SafetyMonitorDevice>) => void>
  let mockEmitEvent: MockInstance<(event: DeviceEvent) => void>
  let mockFetchSafetyMonitorDeviceStatus: MockInstance<(deviceId: string) => Promise<void>>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useUnifiedStore()
    vi.clearAllMocks() // Clear all mocks before each test
    vi.useFakeTimers() // Use fake timers for polling tests

    // Mock getDeviceById from coreActions
    mockGetDeviceById = vi.spyOn(store, 'getDeviceById') as MockInstance<(id: string) => UnifiedDevice | undefined>

    // Spy on updateDevice and _emitEvent
    mockUpdateDevice = vi.spyOn(store, 'updateDevice') as MockInstance<(deviceId: string, updates: Partial<SafetyMonitorDevice>) => void>
    mockEmitEvent = vi.spyOn(store, '_emitEvent') as MockInstance<(event: DeviceEvent) => void>
    mockFetchSafetyMonitorDeviceStatus = vi.spyOn(store, 'fetchSafetyMonitorDeviceStatus') as MockInstance<(deviceId: string) => Promise<void>>

    // Use vi.mocked() when interacting with methods of the mock instance
    vi.mocked(mockSafetyMonitorClientInstance.connected).mockReset()
    vi.mocked(mockSafetyMonitorClientInstance.fetchStatus).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers() // Restore real timers after each test
  })

  // Test suite for getDeviceClient
  describe('getDeviceClient', () => {
    it('should return null if deviceId is not provided', () => {
      const client = store.getDeviceClient('')
      expect(client).toBeNull()
    })

    it('should return null if device is not found', () => {
      mockGetDeviceById.mockReturnValue(undefined)
      const client = store.getDeviceClient('nonexistent-device')
      expect(client).toBeNull()
      expect(mockGetDeviceById).toHaveBeenCalledWith('nonexistent-device')
    })

    it('should return null if device is not a safety monitor', () => {
      const mockDevice = createMockDevice('test-device', 'camera')
      mockGetDeviceById.mockReturnValue(mockDevice)
      const client = store.getDeviceClient('test-device')
      expect(client).toBeNull()
    })

    it('should return null if device has no apiBaseUrl', () => {
      const mockDevice = createMockDevice('test-sm', 'safetymonitor', { apiBaseUrl: undefined })
      mockGetDeviceById.mockReturnValue(mockDevice)
      const client = store.getDeviceClient('test-sm')
      expect(client).toBeNull()
    })
  })

  // Test suite for fetchSafetyMonitorDeviceStatus
  describe('fetchSafetyMonitorDeviceStatus', () => {
    const deviceId = 'test-sm-status'
    const mockSMDevice = createMockDevice(deviceId, 'safetymonitor', { isConnected: true })

    let getSMCClientSpy: MockInstance<(deviceId: string) => SafetyMonitorClient | null>

    beforeEach(() => {
      getSMCClientSpy = vi.spyOn(store, 'getDeviceClient') as MockInstance<(deviceId: string) => SafetyMonitorClient | null>
      mockGetDeviceById.mockReturnValue(mockSMDevice)
      vi.mocked(mockSafetyMonitorClientInstance.fetchStatus).mockReset()
    })

    it('should call updateDevice with isSafe: null if deviceId is not provided', async () => {
      getSMCClientSpy.mockReturnValue(null)

      await store.fetchSafetyMonitorDeviceStatus('')

      expect(getSMCClientSpy).toHaveBeenCalledWith('')
      expect(vi.mocked(mockSafetyMonitorClientInstance.fetchStatus)).not.toHaveBeenCalled()
      expect(mockUpdateDevice).toHaveBeenCalledWith('', { isSafe: null })
    })

    it('should call updateDevice with isSafe: null if client cannot be obtained', async () => {
      getSMCClientSpy.mockReturnValue(null)
      await store.fetchSafetyMonitorDeviceStatus(deviceId)
      expect(vi.mocked(mockSafetyMonitorClientInstance.fetchStatus)).not.toHaveBeenCalled()
      expect(mockUpdateDevice).toHaveBeenCalledWith(deviceId, { isSafe: null })
    })

    it('should call fetchStatus and updateDevice on success', async () => {
      getSMCClientSpy.mockReturnValue(mockSafetyMonitorClientInstance as unknown as SafetyMonitorClient)
      const mockStatus: SafetyMonitorAlpacaStatus = { IsSafe: true }
      vi.mocked(mockSafetyMonitorClientInstance.fetchStatus).mockResolvedValue(mockStatus)

      await store.fetchSafetyMonitorDeviceStatus(deviceId)

      expect(getSMCClientSpy).toHaveBeenCalledWith(deviceId)
      expect(vi.mocked(mockSafetyMonitorClientInstance.fetchStatus)).toHaveBeenCalledTimes(1)
      expect(mockUpdateDevice).toHaveBeenCalledWith(deviceId, { isSafe: true })
      const expectedSuccessEvent: Partial<DeviceEvent> = {
        type: 'devicePropertyChanged',
        deviceId,
        property: 'isSafe',
        value: true
      }
      expect(mockEmitEvent).toHaveBeenCalledWith(expect.objectContaining(expectedSuccessEvent))
    })

    it('should call updateDevice and emit deviceApiError on fetchStatus failure', async () => {
      getSMCClientSpy.mockReturnValue(mockSafetyMonitorClientInstance as unknown as SafetyMonitorClient)
      const apiError = new Error('API Error')
      vi.mocked(mockSafetyMonitorClientInstance.fetchStatus).mockRejectedValue(apiError)

      await store.fetchSafetyMonitorDeviceStatus(deviceId)

      expect(vi.mocked(mockSafetyMonitorClientInstance.fetchStatus)).toHaveBeenCalledTimes(1)
      expect(mockUpdateDevice).toHaveBeenCalledWith(deviceId, { isSafe: null })
      const expectedErrorEvent: Partial<DeviceEvent> = {
        type: 'deviceApiError',
        deviceId,
        error: { message: `Failed to fetch status for ${deviceId}`, originalError: apiError }
      }
      expect(mockEmitEvent).toHaveBeenCalledWith(expect.objectContaining(expectedErrorEvent))
    })
  })

  describe('Polling Actions', () => {
    const deviceId = 'sm-poll-test'
    let mockSetInterval: MockInstance<(handler: TimerHandler, timeout?: number) => number>
    let mockClearInterval: MockInstance<(intervalId: number | undefined) => void>
    let stopPollingSpy: MockInstance<(deviceId: string) => void>

    beforeEach(() => {
      mockSetInterval = vi.spyOn(window, 'setInterval') as MockInstance<(handler: TimerHandler, timeout?: number) => number>
      mockClearInterval = vi.spyOn(window, 'clearInterval') as MockInstance<(intervalId: number | undefined) => void>
      stopPollingSpy = vi.spyOn(store, 'stopSafetyMonitorPolling') as MockInstance<(deviceId: string) => void>
      store.isDevicePolling.clear()
      store.propertyPollingIntervals.clear()
    })

    describe('startSafetyMonitorPolling', () => {
      it('should not start polling if device is not found', () => {
        mockGetDeviceById.mockReturnValue(undefined)
        store.startSafetyMonitorPolling(deviceId)
        expect(mockSetInterval).not.toHaveBeenCalled()
        expect(store.isDevicePolling.get(deviceId)).toBeUndefined()
      })

      it('should not start polling if device is not a SafetyMonitor', () => {
        const nonSMDevice = createMockDevice(deviceId, 'camera', { isConnected: true })
        mockGetDeviceById.mockReturnValue(nonSMDevice)
        store.startSafetyMonitorPolling(deviceId)
        expect(mockSetInterval).not.toHaveBeenCalled()
      })

      it('should not start polling if device is not connected', () => {
        const smDeviceNotConnected = createMockDevice(deviceId, 'safetymonitor', { isConnected: false })
        mockGetDeviceById.mockReturnValue(smDeviceNotConnected)
        store.startSafetyMonitorPolling(deviceId)
        expect(mockSetInterval).not.toHaveBeenCalled()
      })

      it('should start polling with default interval if not specified in properties', () => {
        const smDevice = createMockDevice(deviceId, 'safetymonitor', { isConnected: true, properties: {} })
        mockGetDeviceById.mockReturnValue(smDevice)
        mockFetchSafetyMonitorDeviceStatus.mockResolvedValue()

        store.startSafetyMonitorPolling(deviceId)

        expect(store.isDevicePolling.get(deviceId)).toBe(true)
        expect(mockSetInterval).toHaveBeenCalledTimes(1)
        expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 5000)
        expect(store.propertyPollingIntervals.has(deviceId)).toBe(true)
      })

      it('should start polling with interval from device properties', () => {
        const pollIntervalMs = 10000
        const smDevice = createMockDevice(deviceId, 'safetymonitor', {
          isConnected: true,
          properties: { propertyPollIntervalMs: pollIntervalMs }
        })
        mockGetDeviceById.mockReturnValue(smDevice)
        mockFetchSafetyMonitorDeviceStatus.mockResolvedValue()

        store.startSafetyMonitorPolling(deviceId)

        expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), pollIntervalMs)
      })

      it('should stop existing polling if already polling for the same device', () => {
        const smDevice = createMockDevice(deviceId, 'safetymonitor', { isConnected: true })
        mockGetDeviceById.mockReturnValue(smDevice)
        store.propertyPollingIntervals.set(deviceId, 12345)
        store.isDevicePolling.set(deviceId, true)
        mockFetchSafetyMonitorDeviceStatus.mockResolvedValue()

        store.startSafetyMonitorPolling(deviceId)

        expect(stopPollingSpy).toHaveBeenCalledWith(deviceId)
        expect(mockSetInterval).toHaveBeenCalledTimes(1)
      })

      it('should call _pollSafetyMonitorDeviceStatus after interval', async () => {
        const smDevice = createMockDevice(deviceId, 'safetymonitor', { isConnected: true })
        mockGetDeviceById.mockReturnValue(smDevice)
        mockFetchSafetyMonitorDeviceStatus.mockResolvedValue()

        store.startSafetyMonitorPolling(deviceId)
        expect(mockFetchSafetyMonitorDeviceStatus).not.toHaveBeenCalled()

        await vi.advanceTimersByTimeAsync(5000)

        expect(mockFetchSafetyMonitorDeviceStatus).toHaveBeenCalledWith(deviceId)
      })
    })

    describe('stopSafetyMonitorPolling', () => {
      it('should set isDevicePolling to false', () => {
        store.isDevicePolling.set(deviceId, true)
        store.stopSafetyMonitorPolling(deviceId)
        expect(store.isDevicePolling.get(deviceId)).toBe(false)
      })

      it('should clear interval and remove timer if one exists', () => {
        const fakeTimerId = 12345
        store.propertyPollingIntervals.set(deviceId, fakeTimerId)
        store.isDevicePolling.set(deviceId, true)

        store.stopSafetyMonitorPolling(deviceId)

        expect(mockClearInterval).toHaveBeenCalledWith(fakeTimerId)
        expect(store.propertyPollingIntervals.has(deviceId)).toBe(false)
      })

      it('should not call clearInterval if no timer exists for the deviceId', () => {
        store.stopSafetyMonitorPolling(deviceId)
        expect(mockClearInterval).not.toHaveBeenCalled()
      })

      it('should handle being called multiple times without error', () => {
        const fakeTimerId = 67890
        store.propertyPollingIntervals.set(deviceId, fakeTimerId)
        store.isDevicePolling.set(deviceId, true)

        store.stopSafetyMonitorPolling(deviceId)
        expect(mockClearInterval).toHaveBeenCalledTimes(1)
        expect(store.isDevicePolling.get(deviceId)).toBe(false)
        expect(store.propertyPollingIntervals.has(deviceId)).toBe(false)

        store.stopSafetyMonitorPolling(deviceId)
        expect(mockClearInterval).toHaveBeenCalledTimes(1)
      })
    })

    // TODO: Tests for _pollSafetyMonitorDeviceStatus (direct and edge cases)
  })

  describe('Connection Handlers', () => {
    const deviceId = 'sm-connection-test'
    let mockSMDevice: UnifiedDevice
    // Declare spies needed within this describe block
    let startPollingSpy: MockInstance<(deviceId: string) => void>
    let stopPollingSpyLocal: MockInstance<(deviceId: string) => void> // Renamed to avoid conflict if global one existed

    beforeEach(() => {
      mockSMDevice = createMockDevice(deviceId, 'safetymonitor', { isConnected: true })
      mockGetDeviceById.mockReturnValue(mockSMDevice)
      mockFetchSafetyMonitorDeviceStatus.mockResolvedValue() // Assume success for these tests

      // Clear global spies used here
      mockFetchSafetyMonitorDeviceStatus.mockClear()
      mockUpdateDevice.mockClear()
      mockEmitEvent.mockClear()

      // Initialize and clear local spies for this context
      startPollingSpy = vi.spyOn(store, 'startSafetyMonitorPolling') as MockInstance<(deviceId: string) => void>
      startPollingSpy.mockClear() // Clear immediately after creation

      stopPollingSpyLocal = vi.spyOn(store, 'stopSafetyMonitorPolling') as MockInstance<(deviceId: string) => void>
      stopPollingSpyLocal.mockClear() // Clear immediately after creation
    })

    describe('handleSafetyMonitorConnected', () => {
      it('should call fetchSafetyMonitorDeviceStatus and startSafetyMonitorPolling', () => {
        store.handleSafetyMonitorConnected(deviceId)

        expect(mockFetchSafetyMonitorDeviceStatus).toHaveBeenCalledWith(deviceId)
        expect(startPollingSpy).toHaveBeenCalledWith(deviceId)
      })

      it('should not proceed if device is not found (though SUT does not check this explicitly, relying on called actions)', () => {
        mockGetDeviceById.mockReturnValue(undefined)
        store.handleSafetyMonitorConnected('nonexistent-device')

        expect(mockFetchSafetyMonitorDeviceStatus).toHaveBeenCalledWith('nonexistent-device')
        expect(startPollingSpy).toHaveBeenCalledWith('nonexistent-device')
      })
    })

    describe('handleSafetyMonitorDisconnected', () => {
      it('should call stopSafetyMonitorPolling, updateDevice, and emit event', () => {
        store.handleSafetyMonitorDisconnected(deviceId)

        expect(stopPollingSpyLocal).toHaveBeenCalledWith(deviceId)
        expect(mockUpdateDevice).toHaveBeenCalledWith(deviceId, { isSafe: null })

        const expectedEvent: Partial<DeviceEvent> = {
          type: 'devicePropertyChanged',
          deviceId,
          // deviceType: 'SafetyMonitor', // SUT includes this, ensure test matches SUT if this is critical
          property: 'isSafe',
          value: null
        }
        // The SUT includes deviceType in the event it emits.
        // Let's adjust the expected event to match.
        const expectedEventWithDeviceType: Partial<DeviceEvent> & { deviceType?: string } = {
          ...expectedEvent,
          deviceType: 'SafetyMonitor'
        }

        expect(mockEmitEvent).toHaveBeenCalledWith(expect.objectContaining(expectedEventWithDeviceType))
      })

      it('should still call stopPolling even if device is not found (relying on stopPolling to handle gracefully)', () => {
        mockGetDeviceById.mockReturnValue(undefined)
        store.handleSafetyMonitorDisconnected('nonexistent-device')

        expect(stopPollingSpyLocal).toHaveBeenCalledWith('nonexistent-device')
        expect(mockUpdateDevice).toHaveBeenCalledWith('nonexistent-device', { isSafe: null })
        expect(mockEmitEvent).toHaveBeenCalled()
      })
    })
  })
})
