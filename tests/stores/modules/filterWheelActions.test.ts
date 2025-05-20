import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { createAlpacaClient } from '@/api/AlpacaClient' // Actual import
import type { AlpacaClient } from '@/api/AlpacaClient'
import { FilterWheelClient } from '@/api/alpaca/filterwheel-client' // Import for vi.mock name and instanceof
import type { FilterWheelDevice } from '@/types/device.types'
import type { UnifiedDevice } from '@/types/device.types'

// Mock the AlpacaClient module
const mockAlpacaClientInstance = {
  getproperty: vi.fn(),
  putaction: vi.fn()
  // Add other methods as needed for filterwheel
}

vi.mock('@/api/AlpacaClient', () => ({
  createAlpacaClient: vi.fn((..._args: unknown[]) => mockAlpacaClientInstance as unknown as AlpacaClient)
}))

// Typed mock for the factory
const mockedCreateAlpacaClient = createAlpacaClient as unknown as MockInstance<
  (baseUrl: string, deviceType: string, deviceNumber: number | undefined, device: UnifiedDevice) => AlpacaClient
>

// Mock the specific FilterWheelClient that _getFilterWheelClient instantiates
const mockFilterWheelClientInstance = {
  getPosition: vi.fn(),
  getFilterNames: vi.fn(),
  getFocusOffsets: vi.fn(),
  setPosition: vi.fn(),
  setFilterName: vi.fn()
}
vi.mock('@/api/alpaca/filterwheel-client', async (importOriginal) => {
  const actual = (await importOriginal()) as unknown as FilterWheelClient // This any is acceptable here
  return {
    ...actual,
    FilterWheelClient: vi.fn(() => mockFilterWheelClientInstance)
  }
})

// Typed mock for the FilterWheelClient constructor
const MockedFilterWheelClientConstructor = FilterWheelClient as unknown as MockInstance<
  (baseUrl: string, deviceNumber: number, device: UnifiedDevice) => FilterWheelClient
>

describe('filterWheelActions', () => {
  let store: ReturnType<typeof useUnifiedStore>
  const deviceId = 'filterwheel-1'
  const mockDevice: FilterWheelDevice = {
    id: deviceId,
    name: 'Test FilterWheel',
    type: 'filterwheel',
    deviceNumber: 0,
    uniqueId: 'test-filterwheel-0',
    isConnected: true,
    isConnecting: false,
    isDisconnecting: false,
    status: 'idle',
    apiBaseUrl: 'http://localhost:11111',
    properties: {
      position: 0,
      focusOffsets: [0, 0, 0],
      fw_filterNames: ['R', 'G', 'B'],
      names: ['R', 'G', 'B']
    }
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useUnifiedStore()
    vi.clearAllMocks()

    // Setup default mock implementation for client factory
    mockedCreateAlpacaClient.mockImplementation((_baseUrl, _deviceType, _deviceNumber, _device) => {
      return {
        ...mockAlpacaClientInstance,
        getproperty: vi.fn().mockResolvedValue({ Value: null, ErrorNumber: 0, ErrorMessage: '' }),
        putaction: vi.fn().mockResolvedValue({ ErrorNumber: 0, ErrorMessage: '' })
      } as unknown as AlpacaClient
    })

    // Reset mocks on the instance if necessary (vi.clearAllMocks should handle vi.fn() resets)
    mockFilterWheelClientInstance.getPosition.mockClear()
    mockFilterWheelClientInstance.getFilterNames.mockClear()
    mockFilterWheelClientInstance.getFocusOffsets.mockClear()
    mockFilterWheelClientInstance.setPosition.mockClear()
    mockFilterWheelClientInstance.setFilterName.mockClear()

    store.devices.set(deviceId, mockDevice)
    store.selectedDeviceId = deviceId
  })

  describe('_getFilterWheelClient', () => {
    let getDeviceByIdSpy: MockInstance<(id: string) => UnifiedDevice | null>

    beforeEach(() => {
      getDeviceByIdSpy = vi.spyOn(store, 'getDeviceById').mockImplementation((id_param) => {
        if (id_param === deviceId) return mockDevice as UnifiedDevice // Cast is okay here as mockDevice has all needed fields
        if (id_param === 'camera-1') {
          const dev = store.devices.get('camera-1')
          return dev ? (dev as UnifiedDevice) : null // Return null for not found by spy
        }
        return null // Return null for not found by spy
      })
    })

    it('should return a mocked FilterWheelClient instance if device is found and is a filterwheel', () => {
      const client = store._getFilterWheelClient(deviceId)
      expect(client).toBe(mockFilterWheelClientInstance)
      expect(getDeviceByIdSpy).toHaveBeenCalledWith(deviceId)
      // Check our mocked FilterWheelClient constructor was called
      expect(MockedFilterWheelClientConstructor).toHaveBeenCalledTimes(1)
      expect(MockedFilterWheelClientConstructor).toHaveBeenCalledWith(mockDevice.apiBaseUrl, mockDevice.deviceNumber, mockDevice)
    })

    it('should return null if the device is not found by getDeviceById', () => {
      getDeviceByIdSpy.mockReturnValueOnce(null) // Simulate device not found
      const client = store._getFilterWheelClient('non-existent-device')
      expect(client).toBeNull()
      expect(getDeviceByIdSpy).toHaveBeenCalledWith('non-existent-device')
      expect(mockedCreateAlpacaClient).not.toHaveBeenCalled()
      expect(MockedFilterWheelClientConstructor).not.toHaveBeenCalled()
    })

    it('should return null if the device found is not a filterwheel', () => {
      const nonFilterWheelDevice: UnifiedDevice = {
        // Added missing props
        id: 'camera-1',
        name: 'Test Camera',
        type: 'camera',
        deviceNumber: 0,
        uniqueId: 'test-camera-0',
        isConnected: true,
        isConnecting: false, // Added
        isDisconnecting: false, // Added
        status: 'idle', // Added
        apiBaseUrl: 'http://localhost:11111',
        properties: {}
      }
      store.devices.set('camera-1', nonFilterWheelDevice)

      const client = store._getFilterWheelClient('camera-1')
      expect(client).toBeNull()
      expect(getDeviceByIdSpy).toHaveBeenCalledWith('camera-1')
      expect(mockedCreateAlpacaClient).not.toHaveBeenCalled()
      expect(MockedFilterWheelClientConstructor).not.toHaveBeenCalled()
    })

    it('returned FilterWheelClient (mock instance) should use its mocked methods', async () => {
      // Setup the mock for getPosition on our instance
      mockFilterWheelClientInstance.getPosition.mockResolvedValueOnce(5)

      const fwClient = store._getFilterWheelClient(deviceId)

      expect(fwClient).toBe(mockFilterWheelClientInstance) // Ensure we got our mock
      if (fwClient) {
        // Should be true if previous line passes
        const position = await fwClient.getPosition()
        expect(position).toBe(5)
        expect(mockFilterWheelClientInstance.getPosition).toHaveBeenCalledTimes(1)
      }
    })
  })

  describe('fetchFilterWheelDetails', () => {
    beforeEach(() => {
      // Ensure mocks used by _getFilterWheelClient are reset and configured if needed
      // getDeviceByIdSpy is set up in the parent describe block's beforeEach, which is fine.
      // MockedFilterWheelClientConstructor is also handled globally.

      // Reset specific methods on the shared mock instance for FilterWheelClient
      mockFilterWheelClientInstance.getPosition.mockReset()
      mockFilterWheelClientInstance.getFilterNames.mockReset()
      mockFilterWheelClientInstance.getFocusOffsets.mockReset()
      vi.spyOn(store, 'updateDevice')
      vi.spyOn(store, '_emitEvent')
    })

    it('should fetch details and update device properties if client is obtained', async () => {
      const mockPosition = 1
      const mockNames = ['Red', 'Green', 'Blue', 'Luminance']
      const mockOffsets = [10, 20, 30, 0]

      mockFilterWheelClientInstance.getPosition.mockResolvedValue(mockPosition)
      mockFilterWheelClientInstance.getFilterNames.mockResolvedValue(mockNames)
      mockFilterWheelClientInstance.getFocusOffsets.mockResolvedValue(mockOffsets)

      await store.fetchFilterWheelDetails(deviceId)

      expect(MockedFilterWheelClientConstructor).toHaveBeenCalledTimes(1) // from _getFilterWheelClient
      expect(mockFilterWheelClientInstance.getPosition).toHaveBeenCalledTimes(1)
      expect(mockFilterWheelClientInstance.getFilterNames).toHaveBeenCalledTimes(1)
      expect(mockFilterWheelClientInstance.getFocusOffsets).toHaveBeenCalledTimes(1)

      expect(store.updateDevice).toHaveBeenCalledWith(deviceId, {
        fw_currentPosition: mockPosition,
        fw_filterNames: mockNames,
        fw_focusOffsets: mockOffsets
      })
      expect(store._emitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'devicePropertyChanged',
          deviceId,
          property: 'filterWheelDetails',
          value: {
            fw_currentPosition: mockPosition,
            fw_filterNames: mockNames,
            fw_focusOffsets: mockOffsets
          }
        })
      )
    })

    it('should use default values if client methods return null or undefined', async () => {
      mockFilterWheelClientInstance.getPosition.mockResolvedValue(null) // Simulate null position
      mockFilterWheelClientInstance.getFilterNames.mockResolvedValue(undefined) // Simulate undefined names
      mockFilterWheelClientInstance.getFocusOffsets.mockResolvedValue(null) // Simulate null offsets

      await store.fetchFilterWheelDetails(deviceId)

      expect(store.updateDevice).toHaveBeenCalledWith(deviceId, {
        fw_currentPosition: -1, // Default for null/undefined position
        fw_filterNames: [], // Default for null/undefined names
        fw_focusOffsets: [] // Default for null/undefined offsets
      })
      expect(store._emitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'devicePropertyChanged',
          deviceId,
          property: 'filterWheelDetails'
        })
      )
    })

    it('should not call client methods or updateDevice if client is not obtained', async () => {
      // Simulate _getFilterWheelClient returning null
      // Easiest way: make getDeviceById return null for this specific test call path
      vi.spyOn(store, 'getDeviceById').mockReturnValueOnce(null) // Force client creation to fail

      await store.fetchFilterWheelDetails(deviceId)

      expect(mockFilterWheelClientInstance.getPosition).not.toHaveBeenCalled()
      expect(mockFilterWheelClientInstance.getFilterNames).not.toHaveBeenCalled()
      expect(mockFilterWheelClientInstance.getFocusOffsets).not.toHaveBeenCalled()
      expect(store.updateDevice).not.toHaveBeenCalled()
      expect(store._emitEvent).not.toHaveBeenCalled() // Or maybe it emits an error? Check implementation
    })

    it('should emit deviceApiError if any client method throws', async () => {
      const errorMessage = 'Failed to get position'
      mockFilterWheelClientInstance.getPosition.mockRejectedValueOnce(new Error(errorMessage))
      mockFilterWheelClientInstance.getFilterNames.mockResolvedValue(['R']) // other calls might succeed or not be made
      mockFilterWheelClientInstance.getFocusOffsets.mockResolvedValue([0])

      await store.fetchFilterWheelDetails(deviceId)

      expect(store.updateDevice).not.toHaveBeenCalled() // Should not update if there was an error fetching
      expect(store._emitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceApiError',
          deviceId,
          error: `Failed to fetch filter wheel details: Error: ${errorMessage}`
        })
      )
    })
  })

  describe('setFilterWheelName', () => {
    let fetchFilterWheelDetailsSpy: MockInstance<(deviceId: string) => Promise<void>>
    const localMockDeviceWithFwNames = {
      ...mockDevice,
      properties: {
        ...mockDevice.properties,
        fw_filterNames: [...((mockDevice.properties.names as string[]) ?? [])]
      }
    }

    beforeEach(() => {
      mockFilterWheelClientInstance.setFilterName.mockReset()
      vi.spyOn(store, 'updateDevice')
      vi.spyOn(store, '_emitEvent')
      fetchFilterWheelDetailsSpy = vi.spyOn(store, 'fetchFilterWheelDetails').mockResolvedValue(undefined)

      vi.spyOn(store, 'getDeviceById').mockImplementation((id_param) => {
        if (id_param === deviceId) return localMockDeviceWithFwNames as UnifiedDevice
        return null
      })
    })

    it('should call client.setFilterName, fetch details, and emit event on success', async () => {
      const filterIndex = 1
      const newName = 'TestGreen'
      const oldName = (localMockDeviceWithFwNames.properties.fw_filterNames as string[])[filterIndex]

      mockFilterWheelClientInstance.setFilterName.mockResolvedValue(undefined)

      await store.setFilterWheelName(deviceId, filterIndex, newName)

      expect(MockedFilterWheelClientConstructor).toHaveBeenCalledTimes(1)
      expect(mockFilterWheelClientInstance.setFilterName).toHaveBeenCalledWith(filterIndex, newName)
      expect(fetchFilterWheelDetailsSpy).toHaveBeenCalledWith(deviceId)
      expect(store._emitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'devicePropertyChanged',
          deviceId,
          property: 'fw_filterNames',
          value: { index: filterIndex, oldName, newName },
          message: `Filter ${filterIndex} name changed from "${oldName}" to "${newName}"`
        })
      )
    })

    it('should emit deviceApiError and rethrow if client.setFilterName throws', async () => {
      const filterIndex = 0
      const newName = 'TestRedFail'
      const errorMessage = 'Set name failed'
      mockFilterWheelClientInstance.setFilterName.mockRejectedValueOnce(new Error(errorMessage))

      await expect(store.setFilterWheelName(deviceId, filterIndex, newName)).rejects.toThrow(errorMessage)

      expect(mockFilterWheelClientInstance.setFilterName).toHaveBeenCalledWith(filterIndex, newName)
      expect(fetchFilterWheelDetailsSpy).not.toHaveBeenCalled() // Should not fetch details if set name fails
      expect(store._emitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceApiError',
          deviceId,
          error: `Failed to set filter name for index ${filterIndex} to "${newName}": Error: ${errorMessage}`
        })
      )
    })

    it('should not call client methods if filter wheel client is not obtained, and reject', async () => {
      vi.spyOn(store, 'getDeviceById').mockReturnValueOnce(null) // Force _getFilterWheelClient to return null

      await expect(store.setFilterWheelName(deviceId, 0, 'NoEffect')).rejects.toThrow(`FilterWheel client not found for device ${deviceId}.`)

      expect(mockFilterWheelClientInstance.setFilterName).not.toHaveBeenCalled()
      expect(fetchFilterWheelDetailsSpy).not.toHaveBeenCalled()
      // Depending on implementation, an error event might or might not be emitted here by the action itself before rejecting.
      // The current check is for the rejection.
    })

    it('should use "unknown" for oldName if device or fw_filterNames is not available', async () => {
      const filterIndex = 0
      const newName = 'TestNewName'

      // Device for _getFilterWheelClient to successfully obtain a client
      const deviceForClientRetrieval = localMockDeviceWithFwNames
      // Device for the direct getDeviceById call in setFilterWheelName, to test oldName logic
      const deviceForOldNameCheck = {
        ...localMockDeviceWithFwNames,
        properties: {
          ...localMockDeviceWithFwNames.properties,
          fw_filterNames: undefined // Simulate fw_filterNames not being present for the oldName check
        }
      }

      // getDeviceById will be called twice:
      // 1. Inside _getFilterWheelClient (should return a valid device to get a client)
      // 2. Directly in setFilterWheelName to determine oldName (should return deviceForOldNameCheck)
      const getDeviceByIdSpy = vi.spyOn(store, 'getDeviceById')
      getDeviceByIdSpy.mockReturnValueOnce(deviceForClientRetrieval as UnifiedDevice).mockReturnValueOnce(deviceForOldNameCheck as UnifiedDevice)

      mockFilterWheelClientInstance.setFilterName.mockResolvedValue(undefined)
      await store.setFilterWheelName(deviceId, filterIndex, newName)

      expect(store._emitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'devicePropertyChanged',
          value: { index: filterIndex, oldName: 'unknown', newName },
          message: `Filter ${filterIndex} name changed from "unknown" to "${newName}"`
        })
      )
      // Ensure getDeviceById was called twice as expected
      expect(getDeviceByIdSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('Polling Actions', () => {
    let setIntervalSpy: MockInstance<(handler: (...args: unknown[]) => void, timeout?: number, ...args: unknown[]) => number>
    let clearIntervalSpy: MockInstance<(handle?: number) => void>
    let pollStatusSpy: MockInstance<(deviceId: string) => Promise<void>> // Spy for _pollFilterWheelStatus

    beforeEach(() => {
      vi.useFakeTimers() // Use Vitest's fake timers
      setIntervalSpy = vi.spyOn(window, 'setInterval')
      clearIntervalSpy = vi.spyOn(window, 'clearInterval')

      // Spy on the internal _pollFilterWheelStatus method
      // Note: this assumes _pollFilterWheelStatus is an action on the store.
      // If it's a private function not on the store, this approach needs adjustment.
      pollStatusSpy = vi.spyOn(store, '_pollFilterWheelStatus').mockResolvedValue(undefined)

      // Reset client mocks that might be used by _pollFilterWheelStatus
      mockFilterWheelClientInstance.getPosition.mockReset()
      vi.spyOn(store, 'updateDevice')
      vi.spyOn(store, '_emitEvent')

      // Ensure device exists and is a filterwheel for polling tests
      vi.spyOn(store, 'getDeviceById').mockImplementation((id_param) => {
        if (id_param === deviceId) {
          return {
            ...mockDevice, // Base mockDevice
            isConnected: true, // Ensure device is connected for polling to start
            properties: {
              ...mockDevice.properties,
              propertyPollIntervalMs: 1000 // Set a poll interval for predictability
            }
          } as UnifiedDevice
        }
        return null
      })
      // Ensure _getFilterWheelClient returns our mock client for _pollFilterWheelStatus
      // This relies on MockedFilterWheelClientConstructor being set up
    })

    afterEach(() => {
      vi.restoreAllMocks()
      vi.useRealTimers()
    })

    describe('startFilterWheelPolling', () => {
      it('should start polling if device is connected filterwheel and not already polling', () => {
        store.startFilterWheelPolling(deviceId)
        expect(setIntervalSpy).toHaveBeenCalledTimes(1)
        expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000) // Check interval
        expect(store._fw_isPolling.get(deviceId)).toBe(true)
        expect(store._fw_pollingTimers.has(deviceId)).toBe(true)
      })

      it('should call _pollFilterWheelStatus at intervals', () => {
        store.startFilterWheelPolling(deviceId)
        expect(pollStatusSpy).not.toHaveBeenCalled() // Not called immediately

        vi.advanceTimersByTime(1000) // Advance by one interval
        expect(pollStatusSpy).toHaveBeenCalledTimes(1)
        expect(pollStatusSpy).toHaveBeenCalledWith(deviceId)

        vi.advanceTimersByTime(1000) // Advance by another interval
        expect(pollStatusSpy).toHaveBeenCalledTimes(2)
      })

      it('should clear existing timer and restart if called again for same device', () => {
        store.startFilterWheelPolling(deviceId)
        const firstTimerId = store._fw_pollingTimers.get(deviceId)
        expect(setIntervalSpy).toHaveBeenCalledTimes(1)

        store.startFilterWheelPolling(deviceId) // Call again
        expect(clearIntervalSpy).toHaveBeenCalledWith(firstTimerId)
        expect(setIntervalSpy).toHaveBeenCalledTimes(2) // setInterval called again
        expect(store._fw_pollingTimers.has(deviceId)).toBe(true)
        expect(store._fw_pollingTimers.get(deviceId)).not.toBe(firstTimerId)
      })

      it('should not start polling if device is not connected', () => {
        vi.spyOn(store, 'getDeviceById').mockReturnValueOnce({ ...mockDevice, isConnected: false } as UnifiedDevice)
        store.startFilterWheelPolling(deviceId)
        expect(setIntervalSpy).not.toHaveBeenCalled()
      })

      it('should not start polling if device is not a filterwheel', () => {
        vi.spyOn(store, 'getDeviceById').mockReturnValueOnce({ ...mockDevice, type: 'camera' } as UnifiedDevice)
        store.startFilterWheelPolling(deviceId)
        expect(setIntervalSpy).not.toHaveBeenCalled()
      })
    })

    describe('stopFilterWheelPolling', () => {
      it('should stop polling and clear timer if polling was active', () => {
        store.startFilterWheelPolling(deviceId) // Start it first
        const timerId = store._fw_pollingTimers.get(deviceId)
        expect(timerId).toBeDefined()

        store.stopFilterWheelPolling(deviceId)
        expect(clearIntervalSpy).toHaveBeenCalledWith(timerId)
        expect(store._fw_isPolling.get(deviceId)).toBe(false)
        expect(store._fw_pollingTimers.has(deviceId)).toBe(false)
      })

      it('should do nothing if polling was not active for the device', () => {
        store.stopFilterWheelPolling(deviceId) // Call stop without starting
        expect(clearIntervalSpy).not.toHaveBeenCalled()
        expect(store._fw_isPolling.get(deviceId)).toBe(false) // Or undefined if never set
      })
    })

    describe('_pollFilterWheelStatus', () => {
      // Test _pollFilterWheelStatus more directly, though it's internal
      // Requires store._fw_isPolling to be true for deviceId
      beforeEach(() => {
        // Reset pollStatusSpy as it's now the SUT
        pollStatusSpy.mockRestore() // Restore original, then re-spy without mockImplementation
        pollStatusSpy = vi.spyOn(store, '_pollFilterWheelStatus') as MockInstance<(deviceId: string) => Promise<void>>
        store._fw_isPolling.set(deviceId, true) // Ensure polling is marked as active
        // Ensure _getFilterWheelClient will return the mock client instance
        // This relies on the global MockedFilterWheelClientConstructor setup
      })

      it('should call client.getPosition and updateDevice if position changed', async () => {
        const newPosition = 3
        mockDevice.properties.fw_currentPosition = 1 // Set current store position
        mockFilterWheelClientInstance.getPosition.mockResolvedValue(newPosition)

        await store._pollFilterWheelStatus(deviceId)

        expect(mockFilterWheelClientInstance.getPosition).toHaveBeenCalledTimes(1)
        expect(store.updateDevice).toHaveBeenCalledWith(deviceId, { fw_currentPosition: newPosition })
        expect(store._emitEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'devicePropertyChanged',
            deviceId,
            property: 'fw_currentPosition',
            value: newPosition
          })
        )
      })

      it('should not updateDevice or emit if position has not changed', async () => {
        const currentPosition = 2
        mockDevice.properties.fw_currentPosition = currentPosition
        mockFilterWheelClientInstance.getPosition.mockResolvedValue(currentPosition)

        await store._pollFilterWheelStatus(deviceId)

        expect(mockFilterWheelClientInstance.getPosition).toHaveBeenCalledTimes(1)
        expect(store.updateDevice).not.toHaveBeenCalled()
        expect(store._emitEvent).not.toHaveBeenCalled()
      })

      it('should not updateDevice if client.getPosition returns null', async () => {
        mockFilterWheelClientInstance.getPosition.mockResolvedValue(null)
        await store._pollFilterWheelStatus(deviceId)
        expect(store.updateDevice).not.toHaveBeenCalled()
      })

      it('should stop polling if device becomes disconnected during poll', async () => {
        const stopPollingSpy = vi.spyOn(store, 'stopFilterWheelPolling')
        vi.spyOn(store, 'getDeviceById').mockReturnValueOnce({ ...mockDevice, isConnected: false } as UnifiedDevice)

        await store._pollFilterWheelStatus(deviceId)
        expect(mockFilterWheelClientInstance.getPosition).not.toHaveBeenCalled() // Should not even try to get client/position
        expect(stopPollingSpy).toHaveBeenCalledWith(deviceId)
      })

      it('should stop polling if client cannot be obtained during poll', async () => {
        const stopPollingSpy = vi.spyOn(store, 'stopFilterWheelPolling')

        // Directly mock _getFilterWheelClient to return null for this test
        const getFilterWheelClientSpy = vi.spyOn(store, '_getFilterWheelClient').mockReturnValueOnce(null)

        // We still need getDeviceById to return a connected device for the first check in _pollFilterWheelStatus
        // for the initial device && device.isConnected check.
        // The default getDeviceById mock in the 'Polling Actions' beforeEach would also work if it's still active
        // and not overridden by other tests, but being explicit here is safer.
        vi.spyOn(store, 'getDeviceById').mockReturnValueOnce({ ...mockDevice, isConnected: true } as UnifiedDevice)

        await store._pollFilterWheelStatus(deviceId)

        expect(getFilterWheelClientSpy).toHaveBeenCalledWith(deviceId)
        expect(mockFilterWheelClientInstance.getPosition).not.toHaveBeenCalled()
        expect(stopPollingSpy).toHaveBeenCalledWith(deviceId)
      })

      it('should log warning and not throw if client.getPosition rejects', async () => {
        mockFilterWheelClientInstance.getPosition.mockRejectedValueOnce(new Error('Poll failed'))
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}) // Suppress console output

        await store._pollFilterWheelStatus(deviceId)

        expect(mockFilterWheelClientInstance.getPosition).toHaveBeenCalledTimes(1)
        expect(store.updateDevice).not.toHaveBeenCalled()
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('[FilterWheelStore] Error polling status for filterwheel-1:'),
          expect.any(Error)
        )
        consoleWarnSpy.mockRestore()
      })
    })
  })
})
