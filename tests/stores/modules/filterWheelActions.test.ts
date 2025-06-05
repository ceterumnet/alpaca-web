import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { FilterWheelClient } from '@/api/alpaca/filterwheel-client'
import type { FilterWheelDevice } from '@/types/device.types'
import type { UnifiedDevice } from '@/types/device.types'
import log from '@/plugins/logger'

// Mock the FilterWheelClient
const mockFilterWheelClientInstance = {
  getPosition: vi.fn().mockImplementation(() => Promise.resolve<number | null>(null)),
  getFilterNames: vi.fn().mockImplementation(() => Promise.resolve<string[] | undefined>(undefined)),
  getFocusOffsets: vi.fn().mockImplementation(() => Promise.resolve<number[] | null>(null)),
  setPosition: vi.fn().mockImplementation(() => Promise.resolve()),
  setFilterName: vi.fn().mockImplementation(() => Promise.resolve())
} as unknown as FilterWheelClient & {
  getPosition: MockInstance<() => Promise<number | null>>
  getFilterNames: MockInstance<() => Promise<string[] | undefined>>
  getFocusOffsets: MockInstance<() => Promise<number[] | null>>
  setPosition: MockInstance<(position: number) => Promise<void>>
  setFilterName: MockInstance<(index: number, name: string) => Promise<void>>
}

vi.mock('@/api/alpaca/filterwheel-client', () => ({
  FilterWheelClient: vi.fn(() => mockFilterWheelClientInstance)
}))

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
    position: 0,
    focusOffsets: [0, 0, 0],
    filterNames: ['R', 'G', 'B'],
    properties: {}
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useUnifiedStore()
    vi.clearAllMocks()

    // Reset mock client functions
    mockFilterWheelClientInstance.getPosition = vi.fn().mockImplementation(() => Promise.resolve<number | null>(null))
    mockFilterWheelClientInstance.getFilterNames = vi.fn().mockImplementation(() => Promise.resolve<string[] | undefined>(undefined))
    mockFilterWheelClientInstance.getFocusOffsets = vi.fn().mockImplementation(() => Promise.resolve<number[] | null>(null))
    mockFilterWheelClientInstance.setPosition = vi.fn().mockImplementation(() => Promise.resolve())
    mockFilterWheelClientInstance.setFilterName = vi.fn().mockImplementation(() => Promise.resolve())

    // Add the device to the store first
    store.devices.set(deviceId, mockDevice)

    // Set up getDeviceById spy at the top level
    vi.spyOn(store, 'getDeviceById').mockImplementation((id_param) => {
      if (id_param === deviceId) return mockDevice as UnifiedDevice
      if (id_param === 'camera-1') {
        const dev = store.devices.get('camera-1')
        return dev ? (dev as UnifiedDevice) : null
      }
      return null
    })

    // Mock getDeviceClient to create a new FilterWheelClient instance for filterwheel devices
    vi.spyOn(store, 'getDeviceClient').mockImplementation((id) => {
      const device = store.getDeviceById(id)
      if (device?.type === 'filterwheel' && device.apiBaseUrl) {
        // This will trigger the FilterWheelClient constructor call
        return new FilterWheelClient(device.apiBaseUrl, device.deviceNumber, device)
      }
      return null
    })

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
    it('should return a mocked FilterWheelClient instance if device is found and is a filterwheel', () => {
      const client = store.getDeviceClient(deviceId) as FilterWheelClient
      expect(client).toBe(mockFilterWheelClientInstance)
      expect(store.getDeviceById).toHaveBeenCalledWith(deviceId)
      expect(FilterWheelClient).toHaveBeenCalledWith(mockDevice.apiBaseUrl, mockDevice.deviceNumber, mockDevice)
    })

    it('should return null if the device is not found by getDeviceById', () => {
      vi.mocked(store.getDeviceById).mockReturnValueOnce(null)
      const client = store.getDeviceClient('non-existent-device') as FilterWheelClient
      expect(client).toBeNull()
      expect(store.getDeviceById).toHaveBeenCalledWith('non-existent-device')
      expect(FilterWheelClient).not.toHaveBeenCalled()
    })

    it('should return null if the device found is not a filterwheel', () => {
      const nonFilterWheelDevice: UnifiedDevice = {
        id: 'camera-1',
        name: 'Test Camera',
        type: 'camera',
        deviceNumber: 0,
        uniqueId: 'test-camera-0',
        isConnected: true,
        isConnecting: false,
        isDisconnecting: false,
        status: 'idle',
        apiBaseUrl: 'http://localhost:11111',
        properties: {}
      }
      store.devices.set('camera-1', nonFilterWheelDevice)

      const client = store.getDeviceClient('camera-1') as FilterWheelClient
      expect(client).toBeNull()
      expect(store.getDeviceById).toHaveBeenCalledWith('camera-1')
      expect(FilterWheelClient).not.toHaveBeenCalled()
    })

    it('returned FilterWheelClient (mock instance) should use its mocked methods', async () => {
      const mockPosition = 5
      vi.mocked(mockFilterWheelClientInstance.getPosition).mockResolvedValueOnce(mockPosition)

      const fwClient = store.getDeviceClient(deviceId) as FilterWheelClient

      expect(fwClient).toBe(mockFilterWheelClientInstance)
      if (fwClient) {
        const position = await fwClient.getPosition()
        expect(position).toBe(mockPosition)
        expect(vi.mocked(mockFilterWheelClientInstance.getPosition)).toHaveBeenCalledTimes(1)
      }
    })
  })

  describe('fetchFilterWheelDetails', () => {
    beforeEach(() => {
      vi.mocked(mockFilterWheelClientInstance.getPosition).mockReset()
      vi.mocked(mockFilterWheelClientInstance.getFilterNames).mockReset()
      vi.mocked(mockFilterWheelClientInstance.getFocusOffsets).mockReset()
      vi.spyOn(store, 'updateDevice')
      vi.spyOn(store, '_emitEvent')
    })

    it('should fetch details and update device properties if client is obtained', async () => {
      const mockPosition = 1
      const mockNames = ['Red', 'Green', 'Blue', 'Luminance']
      const mockOffsets = [10, 20, 30, 0]

      vi.mocked(mockFilterWheelClientInstance.getPosition).mockResolvedValue(mockPosition)
      vi.mocked(mockFilterWheelClientInstance.getFilterNames).mockResolvedValue(mockNames)
      vi.mocked(mockFilterWheelClientInstance.getFocusOffsets).mockResolvedValue(mockOffsets)

      await store.fetchFilterWheelDetails(deviceId)

      expect(FilterWheelClient).toHaveBeenCalledTimes(1)
      expect(vi.mocked(mockFilterWheelClientInstance.getPosition)).toHaveBeenCalledTimes(1)
      expect(vi.mocked(mockFilterWheelClientInstance.getFilterNames)).toHaveBeenCalledTimes(1)
      expect(vi.mocked(mockFilterWheelClientInstance.getFocusOffsets)).toHaveBeenCalledTimes(1)

      expect(store.updateDevice).toHaveBeenCalledWith(deviceId, {
        position: mockPosition,
        filterNames: mockNames,
        focusOffsets: mockOffsets
      })
      expect(store._emitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'devicePropertyChanged',
          deviceId,
          property: 'filterWheelDetails',
          value: {
            position: mockPosition,
            filterNames: mockNames,
            focusOffsets: mockOffsets
          }
        })
      )
    })

    it('should use default values if client methods return null or undefined', async () => {
      vi.mocked(mockFilterWheelClientInstance.getPosition).mockResolvedValue(null)
      vi.mocked(mockFilterWheelClientInstance.getFilterNames).mockResolvedValue(undefined)
      vi.mocked(mockFilterWheelClientInstance.getFocusOffsets).mockResolvedValue(null)

      await store.fetchFilterWheelDetails(deviceId)

      expect(store.updateDevice).toHaveBeenCalledWith(deviceId, {
        position: -1,
        filterNames: [],
        focusOffsets: []
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
      vi.mocked(store.getDeviceById).mockReturnValueOnce(null)

      await store.fetchFilterWheelDetails(deviceId)

      expect(vi.mocked(mockFilterWheelClientInstance.getPosition)).not.toHaveBeenCalled()
      expect(vi.mocked(mockFilterWheelClientInstance.getFilterNames)).not.toHaveBeenCalled()
      expect(vi.mocked(mockFilterWheelClientInstance.getFocusOffsets)).not.toHaveBeenCalled()
      expect(store.updateDevice).not.toHaveBeenCalled()
      expect(store._emitEvent).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError if any client method throws', async () => {
      const errorMessage = 'Failed to get position'
      vi.mocked(mockFilterWheelClientInstance.getPosition).mockRejectedValueOnce(new Error(errorMessage))
      vi.mocked(mockFilterWheelClientInstance.getFilterNames).mockResolvedValue(['R'])
      vi.mocked(mockFilterWheelClientInstance.getFocusOffsets).mockResolvedValue([0])

      await store.fetchFilterWheelDetails(deviceId)

      expect(store.updateDevice).not.toHaveBeenCalled()
      expect(store._emitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceApiError',
          deviceId,
          error: `Failed to fetch filter wheel details: Error: ${errorMessage}`
        })
      )
    })
  })

  // describe('setFilterWheelName', () => {
  //   let fetchFilterWheelDetailsSpy: MockInstance<(deviceId: string) => Promise<void>>
  //   const localMockDeviceWithFwNames = {
  //     ...mockDevice,
  //     properties: {
  //       ...mockDevice.properties,
  //       filterNames: [...((mockDevice.properties.names as string[]) ?? [])]
  //     }
  //   }

  //   beforeEach(() => {
  //     mockFilterWheelClientInstance.setFilterName.mockReset()
  //     vi.spyOn(store, 'updateDevice')
  //     vi.spyOn(store, '_emitEvent')
  //     fetchFilterWheelDetailsSpy = vi.spyOn(store, 'fetchFilterWheelDetails').mockResolvedValue(undefined)

  //     vi.spyOn(store, 'getDeviceById').mockImplementation((id_param) => {
  //       if (id_param === deviceId) return localMockDeviceWithFwNames as UnifiedDevice
  //       return null
  //     })
  //   })

  //   it('should call client.setFilterName, fetch details, and emit event on success', async () => {
  //     const filterIndex = 1
  //     const newName = 'TestGreen'
  //     const oldName = (localMockDeviceWithFwNames.properties.filterNames as string[])[filterIndex]

  //     mockFilterWheelClientInstance.setFilterName.mockResolvedValue(undefined)

  //     await store.setFilterWheelName(deviceId, filterIndex, newName)

  //     expect(FilterWheelClient).toHaveBeenCalledTimes(1)
  //     expect(mockFilterWheelClientInstance.setFilterName).toHaveBeenCalledWith(filterIndex, newName)
  //     expect(fetchFilterWheelDetailsSpy).toHaveBeenCalledWith(deviceId)
  //     expect(store._emitEvent).toHaveBeenCalledWith(
  //       expect.objectContaining({
  //         type: 'devicePropertyChanged',
  //         deviceId,
  //         property: 'filterNames',
  //         value: { index: filterIndex, oldName, newName },
  //         message: `Filter ${filterIndex} name changed from "${oldName}" to "${newName}"`
  //       })
  //     )
  //   })

  //   it('should emit deviceApiError and rethrow if client.setFilterName throws', async () => {
  //     const filterIndex = 0
  //     const newName = 'TestRedFail'
  //     const errorMessage = 'FilterWheel client not found for device filterwheel-1.'
  //     mockFilterWheelClientInstance.setFilterName.mockRejectedValueOnce(new Error(errorMessage))

  //     await expect(store.setFilterWheelName(deviceId, filterIndex, newName)).rejects.toThrow(errorMessage)

  //     expect(mockFilterWheelClientInstance.setFilterName).toHaveBeenCalledWith(filterIndex, newName)
  //     expect(fetchFilterWheelDetailsSpy).not.toHaveBeenCalled() // Should not fetch details if set name fails
  //     expect(store._emitEvent).toHaveBeenCalledWith(
  //       expect.objectContaining({
  //         type: 'deviceApiError',
  //         deviceId,
  //         error: `Failed to set filter name for index ${filterIndex} to "${newName}": Error: ${errorMessage}`
  //       })
  //     )
  //   })

  //   it('should not call client methods if filter wheel client is not obtained, and reject', async () => {
  //     vi.spyOn(store, 'getDeviceById').mockReturnValueOnce(null) // Force getDeviceClient to return null

  //     await expect(store.setFilterWheelName(deviceId, 0, 'NoEffect')).rejects.toThrow(`FilterWheel client not found for device ${deviceId}.`)

  //     expect(mockFilterWheelClientInstance.setFilterName).not.toHaveBeenCalled()
  //     expect(fetchFilterWheelDetailsSpy).not.toHaveBeenCalled()
  //     // Depending on implementation, an error event might or might not be emitted here by the action itself before rejecting.
  //     // The current check is for the rejection.
  //   })

  //   it('should use "unknown" for oldName if device or filterNames is not available', async () => {
  //     const filterIndex = 0
  //     const newName = 'TestNewName'

  //     // Device for getDeviceClient to successfully obtain a client
  //     const deviceForClientRetrieval = localMockDeviceWithFwNames
  //     // Device for the direct getDeviceById call in setFilterWheelName, to test oldName logic
  //     const deviceForOldNameCheck = {
  //       ...localMockDeviceWithFwNames,
  //       properties: {
  //         ...localMockDeviceWithFwNames.properties,
  //         filterNames: undefined // Simulate filterNames not being present for
  //       }
  //     }

  //     // getDeviceById will be called twice:
  //     // 1. Inside getDeviceClient (should return a valid device to get a client)
  //     // 2. Directly in setFilterWheelName to determine oldName (should return deviceForOldNameCheck)
  //     const getDeviceByIdSpy = vi.spyOn(store, 'getDeviceById')
  //     getDeviceByIdSpy.mockReturnValueOnce(deviceForClientRetrieval as UnifiedDevice).mockReturnValueOnce(deviceForOldNameCheck as UnifiedDevice)

  //     mockFilterWheelClientInstance.setFilterName.mockResolvedValue(undefined)
  //     await store.setFilterWheelName(deviceId, filterIndex, newName)

  //     expect(store._emitEvent).toHaveBeenCalledWith(
  //       expect.objectContaining({
  //         type: 'devicePropertyChanged',
  //         value: { index: filterIndex, oldName: 'unknown', newName },
  //         message: `Filter ${filterIndex} name changed from "unknown" to "${newName}"`
  //       })
  //     )
  //     // Ensure getDeviceById was called twice as expected
  //     expect(getDeviceByIdSpy).toHaveBeenCalledTimes(2)
  //   })
  // })

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
      // Ensure getDeviceClient returns our mock client for _pollFilterWheelStatus
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
        expect(store.isDevicePolling.get(deviceId)).toBe(true)
        expect(store.propertyPollingIntervals.has(deviceId)).toBe(true)
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
        const firstTimerId = store.propertyPollingIntervals.get(deviceId)
        expect(setIntervalSpy).toHaveBeenCalledTimes(1)

        store.startFilterWheelPolling(deviceId) // Call again
        expect(clearIntervalSpy).toHaveBeenCalledWith(firstTimerId)
        expect(setIntervalSpy).toHaveBeenCalledTimes(2) // setInterval called again
        expect(store.propertyPollingIntervals.has(deviceId)).toBe(true)
        expect(store.propertyPollingIntervals.get(deviceId)).not.toBe(firstTimerId)
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
        const timerId = store.propertyPollingIntervals.get(deviceId)
        expect(timerId).toBeDefined()

        store.stopFilterWheelPolling(deviceId)
        expect(clearIntervalSpy).toHaveBeenCalledWith(timerId)
        expect(store.isDevicePolling.get(deviceId)).toBe(false)
        expect(store.propertyPollingIntervals.has(deviceId)).toBe(false)
      })

      it('should do nothing if polling was not active for the device', () => {
        store.stopFilterWheelPolling(deviceId) // Call stop without starting
        expect(clearIntervalSpy).not.toHaveBeenCalled()
        expect(store.isDevicePolling.get(deviceId)).toBe(false) // Or undefined if never set
      })
    })

    describe('_pollFilterWheelStatus', () => {
      // Test _pollFilterWheelStatus more directly, though it's internal
      // Requires store.isDevicePolling to be true for deviceId
      beforeEach(() => {
        // Reset pollStatusSpy as it's now the SUT
        pollStatusSpy.mockRestore() // Restore original, then re-spy without mockImplementation
        pollStatusSpy = vi.spyOn(store, '_pollFilterWheelStatus') as MockInstance<(deviceId: string) => Promise<void>>
        store.isDevicePolling.set(deviceId, true) // Ensure polling is marked as active
        // Ensure getDeviceClient will return the mock client instance
        // This relies on the global MockedFilterWheelClientConstructor setup
      })

      it('should call client.getPosition and updateDevice if position changed', async () => {
        const newPosition = 3
        mockDevice.properties.position = 1 // Set current store position
        mockFilterWheelClientInstance.getPosition.mockResolvedValue(newPosition)

        await store._pollFilterWheelStatus(deviceId)

        expect(mockFilterWheelClientInstance.getPosition).toHaveBeenCalledTimes(1)
        expect(store.updateDevice).toHaveBeenCalledWith(deviceId, { position: newPosition })
        expect(store._emitEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'devicePropertyChanged',
            deviceId,
            property: 'position',
            value: newPosition
          })
        )
      })

      it('should not updateDevice or emit if position has not changed', async () => {
        const currentPosition = 2
        mockDevice.position = currentPosition
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

        // Directly mock getDeviceClient to return null for this test
        const getFilterWheelClientSpy = vi.spyOn(store, 'getDeviceClient').mockReturnValueOnce(null)

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
        const consoleWarnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {}) // Suppress console output

        await store._pollFilterWheelStatus(deviceId)

        expect(mockFilterWheelClientInstance.getPosition).toHaveBeenCalledTimes(1)
        expect(store.updateDevice).not.toHaveBeenCalled()
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          { deviceIds: [deviceId] },
          expect.stringContaining('[FilterWheelStore] Error polling status for filterwheel-1.'),
          expect.any(Error)
        )
        consoleWarnSpy.mockRestore()
      })
    })
  })

  describe('Connection Handlers', () => {
    let fetchFilterWheelDetailsSpy: MockInstance<(deviceId: string) => Promise<void>>
    let startFilterWheelPollingSpy: MockInstance<(deviceId: string) => void>

    beforeEach(() => {
      // Spy on the actions that handleFilterWheelConnected is supposed to call
      fetchFilterWheelDetailsSpy = vi.spyOn(store, 'fetchFilterWheelDetails').mockResolvedValue(undefined) // Mock to prevent actual execution
      startFilterWheelPollingSpy = vi.spyOn(store, 'startFilterWheelPolling').mockImplementation(() => {}) // Mock to prevent actual execution

      // Ensure getDeviceById returns a valid filterwheel device, as the connected handlers might be called
      // after core logic has already confirmed the device and its type.
      vi.spyOn(store, 'getDeviceById').mockReturnValue(mockDevice as UnifiedDevice)
    })

    describe('handleFilterWheelConnected', () => {
      it('should call fetchFilterWheelDetails with the deviceId', () => {
        store.handleFilterWheelConnected(deviceId)
        expect(fetchFilterWheelDetailsSpy).toHaveBeenCalledTimes(1)
        expect(fetchFilterWheelDetailsSpy).toHaveBeenCalledWith(deviceId)
      })

      it('should call startFilterWheelPolling with the deviceId', () => {
        store.handleFilterWheelConnected(deviceId)
        expect(startFilterWheelPollingSpy).toHaveBeenCalledTimes(1)
        expect(startFilterWheelPollingSpy).toHaveBeenCalledWith(deviceId)
      })
    })

    describe('handleFilterWheelDisconnected', () => {
      let stopFilterWheelPollingSpy: MockInstance<(deviceId: string) => void>
      let updateDeviceSpy: MockInstance<(deviceId: string, updates: Partial<UnifiedDevice>, options?: unknown) => boolean>

      beforeEach(() => {
        stopFilterWheelPollingSpy = vi.spyOn(store, 'stopFilterWheelPolling').mockImplementation(() => {})
        updateDeviceSpy = vi.spyOn(store, 'updateDevice').mockImplementation(() => true)
      })

      it('should call stopFilterWheelPolling with the deviceId', () => {
        store.handleFilterWheelDisconnected(deviceId)
        expect(stopFilterWheelPollingSpy).toHaveBeenCalledTimes(1)
        expect(stopFilterWheelPollingSpy).toHaveBeenCalledWith(deviceId)
      })

      it('should call updateDevice with the deviceId and cleared properties', () => {
        store.handleFilterWheelDisconnected(deviceId)

        const expectedClearedProps: Partial<FilterWheelDevice> = {
          position: null,
          filterNames: null,
          focusOffsets: null,
          isMoving: null
        }

        expect(updateDeviceSpy).toHaveBeenCalledTimes(1)
        expect(updateDeviceSpy).toHaveBeenCalledWith(deviceId, expectedClearedProps)
      })
    })
  })
})
