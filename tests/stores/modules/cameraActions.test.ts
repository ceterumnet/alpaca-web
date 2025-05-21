import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance, type MockedFunction } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import type { AlpacaClient } from '@/api/AlpacaClient' // Main client type
import type { UnifiedDevice, DeviceEvent } from '@/stores/types/device-store.types'
import type { DeviceState } from '@/types/device.types' // Ensured correct path
import { createAlpacaClient } from '@/api/AlpacaClient'
import log from '@/plugins/logger'

// Local type definition for AlpacaResponse if not easily importable
export interface AlpacaResponse<T> {
  Value: T
  ClientTransactionID: number
  ServerTransactionID: number
  ErrorNumber: number
  ErrorMessage: string
}

// Local constants for CameraStates if not easily importable
const CameraStates = {
  Idle: 0,
  Waiting: 1,
  Exposing: 2,
  Reading: 3,
  Download: 4,
  Error: 5
} as const

// Mock AlpacaClient module
const mockAlpacaClientInstance = {
  getProperty: vi.fn(),
  setProperty: vi.fn(),
  callMethod: vi.fn(),
  put: vi.fn(),
  get: vi.fn(),
  connected: vi.fn().mockResolvedValue(false),
  setConnected: vi.fn().mockResolvedValue(undefined),
  getDeviceState: vi.fn().mockResolvedValue({}),
  getCameraInfo: vi.fn().mockResolvedValue({}),
  getDeviceUrl: vi.fn(), // Simpler definition
  getImageData: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
  buildUrl: vi.fn(), // Simpler definition
  logRequest: vi.fn(),
  logResponse: vi.fn(),
  _getBaseUrl: vi.fn().mockReturnValue('http://mock.alpaca.api'),
  _getDeviceNum: vi.fn().mockReturnValue(0),
  _getDeviceType: vi.fn().mockReturnValue('mockdevice'),
  getRawDevice: vi.fn().mockReturnValue(null),
  sleep: vi.fn().mockResolvedValue(undefined),
  handleResponse: vi.fn().mockImplementation((response) => response.Value), // Basic mock
  executeRequest: vi.fn().mockResolvedValue(null), // Generic mock
  getProperties: vi.fn().mockResolvedValue({}) // Mock for getProperties
}

vi.mock('@/api/AlpacaClient', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createAlpacaClient: vi.fn((..._args: any[]) => mockAlpacaClientInstance as unknown as AlpacaClient)
}))

describe('cameraActions', () => {
  let store: ReturnType<typeof useUnifiedStore>

  // Declare and type the mock using the original function's signature
  const mockedCreateAlpacaClient = createAlpacaClient as unknown as MockInstance<
    (baseUrl: string, deviceType: string, deviceNumber: number | undefined, device: UnifiedDevice) => AlpacaClient
  >

  let mockUpdateDeviceProperties: MockInstance<
    (deviceId: string, updates: Partial<UnifiedDevice['properties']>, options?: { silent?: boolean }) => boolean
  >

  let mockEmitEvent: MockInstance<(event: DeviceEvent) => void>
  let mockGetDeviceById: MockInstance<(id: string) => UnifiedDevice | null>
  let mockGetDeviceClient: MockInstance<(id: string) => AlpacaClient | null>
  let mockConsoleError: MockInstance<
    (
      args: any, // eslint-disable-line @typescript-eslint/no-explicit-any
      message?: any, // eslint-disable-line @typescript-eslint/no-explicit-any
      ...optionalParams: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
    ) => void
  >
  let mockTrackExposureProgress: MockInstance<(deviceId: string, expectedDuration: number) => void>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useUnifiedStore()

    vi.clearAllMocks()

    // Reset implementation for the mocked createAlpacaClient factory
    mockedCreateAlpacaClient.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (..._args: any[]) =>
        ({
          ...mockAlpacaClientInstance, // This will spread the getCameraInfo from the global mock
          // Provide fresh vi.fn() only for methods whose state truly needs to be isolated per client creation
          // If getCameraInfo should be the globally configured one, don't override it here.
          getProperty: vi.fn().mockResolvedValue(null),
          setProperty: vi.fn().mockResolvedValue(undefined),
          callMethod: vi.fn().mockResolvedValue({})
          // REMOVED: getCameraInfo: vi.fn().mockResolvedValue({})
        }) as unknown as AlpacaClient
    )

    mockUpdateDeviceProperties = vi.spyOn(store, 'updateDeviceProperties')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockEmitEvent = vi.spyOn(store as any, '_emitEvent')
    mockGetDeviceById = vi.spyOn(store, 'getDeviceById')
    mockGetDeviceClient = vi.spyOn(store, 'getDeviceClient')
    mockConsoleError = vi.spyOn(log, 'error').mockImplementation(() => {})
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockTrackExposureProgress = vi.spyOn(store as any, 'trackExposureProgress').mockImplementation(async () => {})

    mockGetDeviceById.mockImplementation(
      (id: string) =>
        ({
          id,
          name: `Mock Camera ${id}`,
          type: 'camera',
          uniqueId: `mock-camera-${id}`,
          deviceNum: 0,
          isConnected: false,
          isConnecting: false,
          isDisconnecting: false,
          status: 'idle' as DeviceState,
          apiBaseUrl: `http://mock.alpaca.api/${id}`,
          properties: { connected: false, isConnecting: false, cam_gainMode: 'unknown', cam_offsetMode: 'unknown' }
        }) as UnifiedDevice
    )

    mockGetDeviceClient.mockImplementation((_deviceId: string) => {
      // Return a well-defined mock client instance, similar to what the factory mock would produce
      return {
        ...mockAlpacaClientInstance, // Spread the base mock methods, including the original mockAlpacaClientInstance.getCameraInfo
        // Provide fresh vi.fn() for methods if their state/call count needs to be isolated per call to getDeviceClient
        getProperty: vi.fn().mockResolvedValue(null),
        setProperty: vi.fn().mockResolvedValue(undefined),
        callMethod: vi.fn().mockResolvedValue({})
        // REMOVED: getCameraInfo: vi.fn().mockResolvedValue({})
        // Add any other methods from mockAlpacaClientInstance that need to be fresh
      } as unknown as AlpacaClient
    })
  })

  afterEach(() => {
    mockConsoleError.mockRestore()
  })

  describe('Initial State', () => {
    it('should have the correct initial CameraState properties mixed into the store', () => {
      expect(store._propertyPollingIntervals).toBeInstanceOf(Map)
      expect(store._propertyPollingIntervals.size).toBe(0)

      expect(store._deviceStateAvailableProps).toBeInstanceOf(Map)
      expect(store._deviceStateAvailableProps.size).toBe(0)

      expect(store._deviceStateUnsupported).toBeInstanceOf(Set)
      expect(store._deviceStateUnsupported.size).toBe(0)
    })
  })

  describe('fetchCameraProperties', () => {
    const deviceId = 'test-cam-fetchProps'
    const mockCameraDevice: UnifiedDevice = {
      id: deviceId,
      name: 'Test Camera Fetch',
      type: 'camera',
      uniqueId: `mock-camera-${deviceId}`,
      deviceNum: 0,
      isConnected: true, // Assume connected for fetching properties
      isConnecting: false,
      isDisconnecting: false,
      status: 'connected' as DeviceState,
      apiBaseUrl: `http://mock.alpaca.api/${deviceId}`,
      properties: { connected: true, isConnecting: false },
      capabilities: {}
    }

    let mockStartCameraPropertyPolling: MockInstance<(deviceId: string) => void>

    beforeEach(() => {
      store.devices.set(deviceId, { ...mockCameraDevice })
      store.devicesArray = Array.from(store.devices.values())

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockStartCameraPropertyPolling = vi.spyOn(store as any, 'startCameraPropertyPolling').mockImplementation(() => {})

      mockUpdateDeviceProperties.mockClear()
      mockEmitEvent.mockClear()

      mockGetDeviceById.mockImplementation((id: string) => {
        if (id === deviceId) return store.devices.get(id) || null
        return null
      })

      // Configure the getCameraInfo method on the global mockAlpacaClientInstance
      // This is the instance that should be returned by getDeviceClient via the mocked factory.
      // It should resolve with an OBJECT with lowercase alpaca property names as keys.
      mockAlpacaClientInstance.getCameraInfo.mockClear().mockResolvedValue({
        sensorname: 'TestSensorXYZ',
        cameraxsize: 2048,
        cameraysize: 1536,
        cansetccdtemperature: true,
        cangetcoolerpower: true,
        gains: ['HighGain', 'MediumGain', 'LowGain'],
        gainmin: 0,
        gainmax: 100,
        subexposureduration: 0.01,
        // Add other properties as needed, e.g., for offset, ensure they are lowercase
        offsets: [], // Example for offset, assuming it might exist
        offsetmin: undefined, // Or a value if testing offset logic
        offsetmax: undefined
      })
    })

    it('should fetch camera properties, update device, and start polling on success', async () => {
      const result = await store.fetchCameraProperties(deviceId)
      expect(result).toBe(true)

      // Verify the getCameraInfo on the shared mockAlpacaClientInstance was called
      expect(mockAlpacaClientInstance.getCameraInfo).toHaveBeenCalledTimes(1)

      expect(mockUpdateDeviceProperties).toHaveBeenCalled()
      const lastUpdateCall = mockUpdateDeviceProperties.mock.calls[mockUpdateDeviceProperties.mock.calls.length - 1]
      const updatedProps = lastUpdateCall[1] // Second argument to updateDeviceProperties

      // Now expect the correctly mapped properties
      expect(updatedProps).toEqual(
        expect.objectContaining({
          sensorName: 'TestSensorXYZ',
          imageWidth: 2048,
          imageHeight: 1536,
          canCool: true,
          canGetCoolerPower: true,
          gains: ['HighGain', 'MediumGain', 'LowGain'],
          gainMode: 'list', // Based on presence of 'gains' array
          hasGain: true, // Based on presence of 'gainmin' and 'gainmax'
          subExposureDuration: 0.01,
          hasOffset: false // Assuming offsetmin/max are undefined in mock for this test focus
          // offsetMode is not set on friendlyProperties if hasOffset is false, so remove from expectation
          // offsetMode: 'unknown'
        })
      )

      // Verify startCameraPropertyPolling was called
      expect(mockStartCameraPropertyPolling).toHaveBeenCalledTimes(1)
      expect(mockStartCameraPropertyPolling).toHaveBeenCalledWith(deviceId)
    })

    it('should return false, log an error, and not start polling if getCameraInfo fails', async () => {
      // Arrange: Make getCameraInfo throw an error
      const errorMessage = 'Failed to get camera info from client'
      mockAlpacaClientInstance.getCameraInfo.mockRejectedValueOnce(new Error(errorMessage))

      const consoleErrorSpy = vi.spyOn(log, 'error').mockImplementation(() => {})

      // Act
      const result = await store.fetchCameraProperties(deviceId)

      // Assert
      expect(result).toBe(false)
      expect(mockAlpacaClientInstance.getCameraInfo).toHaveBeenCalledTimes(1)

      // Check that an error was logged containing the specific message
      expect(consoleErrorSpy).toHaveBeenCalled()
      // Check if any of the calls to console.error includes the expected message
      const errorLogFound = consoleErrorSpy.mock.calls.some((callArgs) =>
        callArgs.some(
          (arg) => (typeof arg === 'string' && arg.includes(errorMessage)) || (arg instanceof Error && arg.message.includes(errorMessage))
        )
      )
      expect(errorLogFound).toBe(true)

      // Ensure updateDeviceProperties might have been called initially, but not with successful full props
      // Depending on implementation, it might be called with an empty object or not at all after an error.
      // For now, let's just check polling was not started.
      expect(mockStartCameraPropertyPolling).not.toHaveBeenCalled()

      // Restore console.error spy
      consoleErrorSpy.mockRestore()
    })

    it('should return false, log an error, and not call client or polling if device is not found', async () => {
      // Arrange: Make getDeviceById return null for this specific deviceId
      const nonExistentDeviceId = 'non-existent-device'
      mockGetDeviceById.mockImplementation((id: string) => {
        if (id === nonExistentDeviceId) return null
        // Fallback to original mock for other device IDs if necessary, though this test focuses on one ID
        if (id === deviceId) return store.devices.get(id) || null
        return null
      })

      const consoleErrorSpy = vi.spyOn(log, 'error').mockImplementation(() => {})
      mockAlpacaClientInstance.getCameraInfo.mockClear() // Ensure no previous calls interfere
      mockStartCameraPropertyPolling.mockClear()

      // Act
      const result = await store.fetchCameraProperties(nonExistentDeviceId)

      // Assert
      expect(result).toBe(false)
      expect(mockGetDeviceById).toHaveBeenCalledWith(nonExistentDeviceId)

      // Check that an error was logged mentioning device not found
      expect(consoleErrorSpy).toHaveBeenCalled()
      const errorLogFound = consoleErrorSpy.mock.calls.some((callArgs) =>
        callArgs.some((arg) => typeof arg === 'string' && arg.includes(`Device not found: ${nonExistentDeviceId}`))
      )
      expect(errorLogFound).toBe(true)

      // Ensure client methods and polling were not called
      expect(mockAlpacaClientInstance.getCameraInfo).not.toHaveBeenCalled()
      expect(mockStartCameraPropertyPolling).not.toHaveBeenCalled()

      // Restore console.error spy and mockGetDeviceById to its beforeEach default
      consoleErrorSpy.mockRestore()
      mockGetDeviceById.mockImplementation((id: string) => {
        // Reset to default beforeEach behavior
        if (id === deviceId) return store.devices.get(id) || null
        return {
          id,
          name: `Mock Camera ${id}`,
          type: 'camera',
          uniqueId: `mock-camera-${id}`,
          deviceNum: 0,
          isConnected: false,
          isConnecting: false,
          isDisconnecting: false,
          status: 'idle' as DeviceState,
          apiBaseUrl: `http://mock.alpaca.api/${id}`,
          properties: { connected: false, isConnecting: false, cam_gainMode: 'unknown', cam_offsetMode: 'unknown' }
        } as UnifiedDevice
      })
    })

    it('should return false, log an error, and not call client methods or polling if client is not found', async () => {
      // Arrange: Ensure getDeviceById returns the device, but getDeviceClient returns null
      // The deviceId from the outer describe block ('test-cam-fetchProps') already exists in the store via beforeEach.
      // We just need to make getDeviceClient return null for it.
      mockGetDeviceClient.mockImplementation((id: string) => {
        if (id === deviceId) return null // Return null for our target device
        // Fallback for other potential calls, though unlikely in this specific test context
        return { ...mockAlpacaClientInstance } as unknown as AlpacaClient
      })

      const consoleErrorSpy = vi.spyOn(log, 'error').mockImplementation(() => {})
      mockAlpacaClientInstance.getCameraInfo.mockClear()
      mockStartCameraPropertyPolling.mockClear()

      // Act
      const result = await store.fetchCameraProperties(deviceId) // Use the existing deviceId

      // Assert
      expect(result).toBe(false)
      expect(mockGetDeviceById).toHaveBeenCalledWith(deviceId)
      expect(mockGetDeviceClient).toHaveBeenCalledWith(deviceId)

      // Check that an error was logged mentioning client not found or similar
      expect(consoleErrorSpy).toHaveBeenCalled()
      const errorLogFound = consoleErrorSpy.mock.calls.some((callArgs) =>
        callArgs.some((arg) => typeof arg === 'string' && arg.includes(`No client available for device ${deviceId}`))
      )
      expect(errorLogFound).toBe(true)

      // Ensure AlpacaClient.getCameraInfo and polling were not called
      expect(mockAlpacaClientInstance.getCameraInfo).not.toHaveBeenCalled()
      expect(mockStartCameraPropertyPolling).not.toHaveBeenCalled()

      // Restore spies and mocks
      consoleErrorSpy.mockRestore()
      // Reset mockGetDeviceClient to its default beforeEach behavior

      mockGetDeviceClient.mockImplementation((_deviceId: string) => {
        return { ...mockAlpacaClientInstance } as unknown as AlpacaClient
      })
    })
  })

  describe('startCameraPropertyPolling', () => {
    const deviceId = 'test-cam-poll'
    const mockPollingDevice: UnifiedDevice = {
      id: deviceId,
      name: 'Test Polling Camera',
      type: 'camera',
      uniqueId: `mock-camera-${deviceId}`,
      deviceNum: 0,
      isConnected: true, // Device must be connected for polling to start/continue
      isConnecting: false,
      isDisconnecting: false,
      status: 'connected' as DeviceState,
      apiBaseUrl: `http://mock.alpaca.api/${deviceId}`,
      properties: {
        connected: true,
        isConnecting: false,
        propertyPollIntervalMs: 1000, // Use a known interval for testing
        cansetccdtemperature: true, // Example capability
        canreadtemperature: true,
        cangetcoolerpower: true,
        isExposing: false // Default to not exposing for initial tests
      },
      capabilities: { cansetccdtemperature: true }
    }

    let mockStopCameraPropertyPolling: MockInstance<() => void>
    let mockFetchDeviceState: MockInstance<
      (deviceId: string, options?: { forceRefresh?: boolean; cacheTtlMs?: number }) => Promise<Record<string, unknown> | null>
    >

    beforeEach(() => {
      vi.useFakeTimers()

      // Ensure the device is in the store
      store.devices.set(deviceId, { ...mockPollingDevice })
      store.devicesArray = Array.from(store.devices.values())

      mockGetDeviceById.mockImplementation((id: string) => {
        if (id === deviceId) return store.devices.get(id) || null
        return null
      })

      // Ensure getDeviceClient returns a functional mock client
      mockGetDeviceClient.mockImplementation((id: string) => {
        if (id === deviceId) return { ...mockAlpacaClientInstance, getProperty: vi.fn().mockResolvedValue(null) } as unknown as AlpacaClient
        return null
      })

      mockAlpacaClientInstance.getProperty.mockClear().mockResolvedValue(null) // Clear and set default for individual props

      // Spy on stopCameraPropertyPolling (it's part of cameraActions itself, so `store as any`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockStopCameraPropertyPolling = vi.spyOn(store as any, 'stopCameraPropertyPolling').mockImplementation(() => {})
      mockFetchDeviceState = vi.spyOn(store, 'fetchDeviceState').mockResolvedValue(null) // Default to no devicestate initially
      mockUpdateDeviceProperties.mockClear()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should set up an interval, call helpers, and attempt to fetch properties', async () => {
      // Arrange
      const consoleLogSpy = vi.spyOn(log, 'info').mockImplementation(() => {})
      const consoleDebugSpy = vi.spyOn(log, 'debug').mockImplementation(() => {})
      // Mock getProperty on the client returned by getDeviceClient for this specific test
      const specificClientMock = { ...mockAlpacaClientInstance, getProperty: vi.fn().mockResolvedValue('test-prop-value') }
      mockGetDeviceClient.mockReturnValueOnce(specificClientMock as unknown as AlpacaClient)

      // Act
      store.startCameraPropertyPolling(deviceId)

      // Assert: Initial setup
      expect(mockStopCameraPropertyPolling).toHaveBeenCalledTimes(1) // Called to clear previous timers
      expect(store._propertyPollingIntervals.has(deviceId)).toBe(true)
      expect(consoleDebugSpy).toHaveBeenCalledWith({ deviceIds: [deviceId] }, `Starting property polling for camera ${deviceId}`)
      expect(consoleDebugSpy).toHaveBeenCalledWith({ deviceIds: [deviceId] }, `Property polling started for camera ${deviceId} with interval 1000ms`)

      // Assert: After one interval tick
      await vi.advanceTimersByTimeAsync(1000) // Advance by the poll interval

      expect(mockGetDeviceById).toHaveBeenCalledWith(deviceId) // Called within interval
      expect(mockGetDeviceClient).toHaveBeenCalledWith(deviceId) // Called within interval

      // Check if fetchDeviceState was called (attempting devicestate first)
      expect(mockFetchDeviceState).toHaveBeenCalledWith(deviceId, { forceRefresh: true, cacheTtlMs: 500 })

      // Since fetchDeviceState is mocked to return null, it should fallback to individual getProperty calls
      // The exact properties depend on defaultPollingProps and capabilities
      expect(specificClientMock.getProperty).toHaveBeenCalled()
      // Example: Check for a common property that should always be polled if no devicestate
      expect(specificClientMock.getProperty).toHaveBeenCalledWith('binx')

      expect(mockUpdateDeviceProperties).toHaveBeenCalled() // Properties should be updated

      // Cleanup spies
      consoleLogSpy.mockRestore()
      consoleDebugSpy.mockRestore()
    })

    it('should stop polling if the device becomes disconnected', async () => {
      // Arrange
      store.startCameraPropertyPolling(deviceId)
      expect(store._propertyPollingIntervals.has(deviceId)).toBe(true)
      mockStopCameraPropertyPolling.mockClear() // Clear initial call from startCameraPropertyPolling

      // Act: First tick (device is connected)
      await vi.advanceTimersByTimeAsync(1000)
      expect(mockStopCameraPropertyPolling).not.toHaveBeenCalled() // Should not stop yet

      // Arrange: Simulate device disconnect
      const disconnectedDevice = { ...mockPollingDevice, isConnected: false }
      mockGetDeviceById.mockImplementation((id: string) => {
        if (id === deviceId) return disconnectedDevice
        return null
      })

      // Act: Second tick (device is now disconnected)
      await vi.advanceTimersByTimeAsync(1000)

      // Assert
      expect(mockGetDeviceById).toHaveBeenCalledWith(deviceId) // Checked connection status
      expect(mockStopCameraPropertyPolling).toHaveBeenCalledTimes(1) // Called due to disconnect
      // Polling interval should have been cleared by stopCameraPropertyPolling
      // Note: stopCameraPropertyPolling is mocked, so it won't actually clear store._propertyPollingIntervals
      // If we wanted to test that, we'd need to spy on clearInterval or let the original run.
      // For now, verifying the call to the mocked stop function is sufficient.
    })

    it('should use devicestate if available and fallback for other properties', async () => {
      // Arrange
      const mockDeviceStateData = {
        binx: 2, // Property available via devicestate
        gain: 150 // Property available via devicestate
        // other properties like ccdtemperature, cooleron might also be in devicestate
      }
      mockFetchDeviceState.mockResolvedValueOnce(mockDeviceStateData)

      // Mock the client returned by getDeviceClient to spy on its getProperty
      const specificClientMock = {
        ...mockAlpacaClientInstance,
        getProperty: vi.fn().mockImplementation(async (propName: string) => {
          // Return some default values for properties not in devicestate
          if (propName === 'offset') return 50
          if (propName === 'readoutmode') return 1
          if (propName === 'ccdtemperature') return -5.5 // Example of a prop that *could* be in devicestate or polled
          return `value-for-${propName}`
        })
      }
      mockGetDeviceClient.mockReturnValueOnce(specificClientMock as unknown as AlpacaClient)

      store.startCameraPropertyPolling(deviceId)
      await vi.advanceTimersByTimeAsync(1000) // Advance by the poll interval

      // Assert
      expect(mockFetchDeviceState).toHaveBeenCalledTimes(1)
      expect(mockFetchDeviceState).toHaveBeenCalledWith(deviceId, { forceRefresh: true, cacheTtlMs: 500 })

      // Properties from devicestate should NOT be fetched individually
      expect(specificClientMock.getProperty).not.toHaveBeenCalledWith('binx')
      expect(specificClientMock.getProperty).not.toHaveBeenCalledWith('gain')

      // Properties NOT in devicestate (based on our mockDeviceStateData) SHOULD be fetched individually
      // e.g., offset, readoutmode, etc. (depending on the default list in startCameraPropertyPolling)
      expect(specificClientMock.getProperty).toHaveBeenCalledWith('offset')
      expect(specificClientMock.getProperty).toHaveBeenCalledWith('readoutmode')
      // Other properties like 'biny', 'startx', etc., would also be called if not in devicestate.

      // Check that updateDeviceProperties was called with usingDeviceState: true and combined data
      expect(mockUpdateDeviceProperties).toHaveBeenCalled()
      const updateCalls = mockUpdateDeviceProperties.mock.calls

      // Verify that usingDeviceState:true was set in one of the calls
      const setUsingDeviceStateCall = updateCalls.find((call) => call[1]?.usingDeviceState === true)
      expect(setUsingDeviceStateCall).toBeDefined()

      // Verify that the actual property data was updated in one of the calls
      // This call might be separate from the one setting usingDeviceState: true
      const dataUpdateCall = updateCalls.find(
        (call) => call[1]?.binx === mockDeviceStateData.binx && call[1]?.gain === mockDeviceStateData.gain && call[1]?.offset === 50
      )
      expect(dataUpdateCall).toBeDefined()

      if (dataUpdateCall) {
        const updatedProps = dataUpdateCall[1]
        expect(updatedProps).toEqual(
          expect.objectContaining({
            ...mockDeviceStateData, // Ensure devicestate props are there
            offset: 50, // And individually fetched props
            readoutmode: 1
            // usingDeviceState might be true or undefined here depending on which call we land on, so don't assert it strictly here.
          })
        )
      }
    })

    it('should NOT poll camerastate or imageready if not exposing and devicestate does not cover them', async () => {
      // Arrange
      mockFetchDeviceState.mockResolvedValueOnce({}) // Ensure devicestate provides nothing for these
      store.devices.get(deviceId)!.properties!.isExposing = false // Explicitly set not exposing

      const specificClientMock = { ...mockAlpacaClientInstance, getProperty: vi.fn().mockResolvedValue('some-value') }
      mockGetDeviceClient.mockReturnValueOnce(specificClientMock as unknown as AlpacaClient)

      // Act
      store.startCameraPropertyPolling(deviceId)
      await vi.advanceTimersByTimeAsync(1000)

      // Assert
      expect(mockFetchDeviceState).toHaveBeenCalledTimes(1)
      expect(specificClientMock.getProperty).not.toHaveBeenCalledWith('camerastate')
      expect(specificClientMock.getProperty).not.toHaveBeenCalledWith('imageready')
      // It should still poll other default properties
      expect(specificClientMock.getProperty).toHaveBeenCalledWith('binx')
    })

    it('should poll camerastate and imageready if exposing and devicestate does not cover them', async () => {
      // Arrange
      mockFetchDeviceState.mockResolvedValueOnce({}) // Ensure devicestate provides nothing for these
      // Update the device in the store to be exposing
      const exposingDevice = {
        ...mockPollingDevice,
        properties: { ...mockPollingDevice.properties, isExposing: true }
      }
      store.devices.set(deviceId, exposingDevice)
      mockGetDeviceById.mockImplementation((id) => (id === deviceId ? exposingDevice : null))

      const specificClientMock = {
        ...mockAlpacaClientInstance,
        getProperty: vi.fn().mockImplementation(async (propName: string) => {
          if (propName === 'camerastate') return 2 // Exposing state
          if (propName === 'imageready') return false
          return `value-for-${propName}`
        })
      }
      mockGetDeviceClient.mockReturnValueOnce(specificClientMock as unknown as AlpacaClient)

      // Act
      store.startCameraPropertyPolling(deviceId)
      await vi.advanceTimersByTimeAsync(1000)

      // Assert
      expect(mockFetchDeviceState).toHaveBeenCalledTimes(1)
      expect(specificClientMock.getProperty).toHaveBeenCalledWith('camerastate')
      expect(specificClientMock.getProperty).toHaveBeenCalledWith('imageready')
      // It should still poll other default properties
      expect(specificClientMock.getProperty).toHaveBeenCalledWith('binx')
    })
  })

  describe('setPropertyPollingInterval', () => {
    const deviceId = 'test-cam-setPollInterval'
    const initialInterval = 2000
    const newInterval = 5000

    beforeEach(() => {
      // Ensure the device is in the store with an initial interval
      const mockDeviceWithInterval: UnifiedDevice = {
        id: deviceId,
        name: 'Test Interval Camera',
        type: 'camera',
        uniqueId: `mock-camera-${deviceId}`,
        deviceNum: 0,
        isConnected: true,
        isConnecting: false,
        isDisconnecting: false,
        status: 'connected' as DeviceState,
        apiBaseUrl: `http://mock.alpaca.api/${deviceId}`,
        properties: {
          connected: true,
          propertyPollIntervalMs: initialInterval
        },
        capabilities: {}
      }
      store.devices.set(deviceId, mockDeviceWithInterval)
      store.devicesArray = Array.from(store.devices.values())

      mockGetDeviceById.mockImplementation((id: string) => {
        if (id === deviceId) return store.devices.get(id) || null
        return null
      })
      mockUpdateDeviceProperties.mockClear()
    })

    it('should update the device property and restart polling with the new interval', () => {
      // Arrange
      // Spy on startCameraPropertyPolling (it's part of cameraActions itself, so `store as any`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const startPollingSpy = vi.spyOn(store as any, 'startCameraPropertyPolling').mockImplementation(() => {})

      // Act
      store.setPropertyPollingInterval(deviceId, newInterval)

      // Assert
      // 1. updateDeviceProperties should have been called to set the new interval
      expect(mockUpdateDeviceProperties).toHaveBeenCalledTimes(1)
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(deviceId, {
        propertyPollIntervalMs: newInterval
      })

      // 2. startCameraPropertyPolling should have been called to restart with the new interval
      expect(startPollingSpy).toHaveBeenCalledTimes(1)
      expect(startPollingSpy).toHaveBeenCalledWith(deviceId)

      startPollingSpy.mockRestore()
    })

    it('should use a minimum interval of 100ms if a smaller interval is provided', () => {
      // Arrange
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const startPollingSpy = vi.spyOn(store as any, 'startCameraPropertyPolling').mockImplementation(() => {})
      const tooSmallInterval = 50
      const minimumInterval = 100
      const consoleWarnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {})

      // Act
      store.setPropertyPollingInterval(deviceId, tooSmallInterval)

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        { deviceIds: [deviceId] },
        `Polling interval too small (${tooSmallInterval}ms), using 100ms minimum`
      )
      expect(mockUpdateDeviceProperties).toHaveBeenCalledTimes(1)
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(deviceId, {
        propertyPollIntervalMs: minimumInterval // Expect it to be corrected to 100ms
      })
      expect(startPollingSpy).toHaveBeenCalledTimes(1)
      expect(startPollingSpy).toHaveBeenCalledWith(deviceId)

      startPollingSpy.mockRestore()
      consoleWarnSpy.mockRestore()
    })
  })

  describe('Device Control Actions', () => {
    const deviceId = 'test-cam-control'
    const mockControlDevice: UnifiedDevice = {
      id: deviceId,
      name: 'Test Control Camera',
      type: 'camera',
      uniqueId: `mock-camera-${deviceId}`,
      deviceNum: 0,
      isConnected: true,
      isConnecting: false,
      isDisconnecting: false,
      status: 'connected' as DeviceState,
      apiBaseUrl: `http://mock.alpaca.api/${deviceId}`,
      properties: { connected: true, isConnecting: false, isExposing: false }
    }

    beforeEach(() => {
      store.devices.set(deviceId, { ...mockControlDevice })
      store.devicesArray = Array.from(store.devices.values())
      mockGetDeviceById.mockImplementation((id: string) => (id === deviceId ? store.devices.get(id) || null : null))
      mockGetDeviceClient.mockImplementation((id: string) => (id === deviceId ? (mockAlpacaClientInstance as unknown as AlpacaClient) : null))

      // Reset the put method on the shared client instance for control actions
      mockAlpacaClientInstance.put.mockReset().mockResolvedValue({}) // Default success for PUT actions
    })

    describe('startCameraExposure', () => {
      const duration = 5
      const light = true

      it('should call client.put with startexposure, update properties, emit event, and track progress on success', async () => {
        const result = await store.startCameraExposure(deviceId, duration, light)

        expect(result).toBe(true)
        expect(mockGetDeviceById).toHaveBeenCalledWith(deviceId)
        expect(mockGetDeviceClient).toHaveBeenCalledWith(deviceId)
        expect(mockAlpacaClientInstance.put).toHaveBeenCalledTimes(1)
        expect(mockAlpacaClientInstance.put).toHaveBeenCalledWith(
          'startexposure',
          expect.objectContaining({
            Duration: duration,
            Light: light,
            ClientID: expect.any(Number),
            ClientTransactionID: expect.any(Number)
          })
        )
        expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(deviceId, {
          isExposing: true,
          exposureStartTime: expect.any(Number),
          cameraState: 2,
          exposureProgress: 0
        })

        // Check if the specific cameraExposureStarted event was emitted
        const exposureStartedEventCall = mockEmitEvent.mock.calls.find((call) => call[0].type === 'cameraExposureStarted')
        expect(exposureStartedEventCall).toBeDefined()
        expect(exposureStartedEventCall?.[0]).toEqual({
          type: 'cameraExposureStarted',
          deviceId,
          duration: duration,
          isLight: light
        })

        expect(mockTrackExposureProgress).toHaveBeenCalledWith(deviceId, duration)
      })

      it('should return false and log error if client.put fails', async () => {
        mockAlpacaClientInstance.put.mockRejectedValueOnce(new Error('Alpaca error'))

        const result = await store.startCameraExposure(deviceId, duration, light)

        expect(result).toBe(false)
        expect(mockAlpacaClientInstance.put).toHaveBeenCalledTimes(1)
        expect(mockConsoleError).toHaveBeenCalledWith(
          { deviceIds: [deviceId] },
          expect.stringContaining('[UnifiedStore/cameraActions] Error starting exposure on camera test-cam-control'),
          expect.any(Error)
        )
        expect(mockUpdateDeviceProperties).not.toHaveBeenCalledWith(deviceId, { isExposing: true })
        expect(mockTrackExposureProgress).not.toHaveBeenCalled()
        // cameraExposureStarted event might still be emitted optimistically by some implementations,
        // but in this one, it seems it's guarded by success. If not, this test would need adjustment.
        // Based on typical patterns, it should not emit if the call fails.
        const exposureStartedEvent = mockEmitEvent.mock.calls.find((call) => call[0].type === 'cameraExposureStarted')
        expect(exposureStartedEvent).toBeUndefined()
      })

      it('should return false and log error if device is not found', async () => {
        mockGetDeviceById.mockReturnValueOnce(null)
        const result = await store.startCameraExposure(deviceId, duration, light)

        expect(result).toBe(false)
        expect(mockConsoleError).toHaveBeenCalledWith(
          { deviceIds: [deviceId] },
          expect.stringContaining('Device test-cam-control not found for startCameraExposure')
        )
        expect(mockAlpacaClientInstance.put).not.toHaveBeenCalled()
        expect(mockTrackExposureProgress).not.toHaveBeenCalled()
      })

      it('should return false and log error if client is not found', async () => {
        mockGetDeviceClient.mockReturnValueOnce(null)
        const result = await store.startCameraExposure(deviceId, duration, light)

        expect(result).toBe(false)
        expect(mockConsoleError).toHaveBeenCalledWith(
          { deviceIds: [deviceId] },
          expect.stringContaining('No client available for device test-cam-control for startCameraExposure')
        )
        expect(mockAlpacaClientInstance.put).not.toHaveBeenCalled()
        expect(mockTrackExposureProgress).not.toHaveBeenCalled()
      })
    })
  })

  describe('handleExposureComplete', () => {
    const deviceId = 'test-cam-exposure-complete'
    let mockExposureDevice: UnifiedDevice
    let fetchMock: MockInstance // Using general vi.MockInstance for fetch spy
    let mockGetDeviceUrlSpy: MockedFunction<(endpoint: string, addClientIDParams?: boolean) => string>

    let testSpecificClient: Partial<AlpacaClient> & {
      getProperty: MockedFunction<(propName: string) => Promise<unknown>>
      get: MockedFunction<(endpoint: string, params?: unknown) => Promise<AlpacaResponse<unknown>>>
      getDeviceUrl: MockedFunction<(endpoint: string) => string | undefined>
      clientId?: number
      deviceType?: string
      deviceNumber?: number
      baseUrl?: string
      device?: UnifiedDevice
    }

    beforeEach(() => {
      mockGetDeviceUrlSpy = vi.fn()

      mockExposureDevice = {
        id: deviceId,
        name: 'Test Exposure Camera',
        type: 'camera',
        uniqueId: `mock-camera-${deviceId}`,
        deviceNum: 0,
        isConnected: true,
        isConnecting: false,
        isDisconnecting: false,
        status: 'connected',
        apiBaseUrl: `http://mock.alpaca.api/${deviceId}`,
        properties: {
          connected: true,
          isConnecting: false,
          isDisconnecting: false,
          cameraState: CameraStates.Exposing,
          imageReady: false, // This is the internal store property state
          exposureProgress: 50,
          exposureTime: 10,
          exposureStartTime: Date.now() - 5000,
          imageBytesSupported: true,
          prefersJsonImage: false,
          imageWidth: 100,
          imageHeight: 80,
          imageElementType: 2
        },
        capabilities: { canAbortExposure: true }
      }
      store.devices.set(deviceId, { ...mockExposureDevice })
      store.devicesArray = Array.from(store.devices.values())

      mockGetDeviceById.mockImplementation((id) => (id === deviceId ? store.devices.get(id) || null : null))

      const baseGetPropertyMock = vi.fn(async (propName: string): Promise<unknown> => {
        if (propName.toLowerCase() === 'imageready') {
          return true // Default to true (direct boolean value)
        }
        if (propName.toLowerCase() === 'camerastate') {
          return CameraStates.Idle // Default to Idle (direct number value)
        }
        return null // Default for other properties
      })

      testSpecificClient = {
        ...mockAlpacaClientInstance,
        getProperty: baseGetPropertyMock,
        get: vi.fn().mockRejectedValue(new Error('testSpecificClient.get not configured for this test (beforeEach)')),
        getDeviceUrl: mockGetDeviceUrlSpy.mockReturnValue('default/mock/url (beforeEach)'),
        clientId: 111,
        deviceType: 'camera',
        deviceNumber: 0,
        baseUrl: mockExposureDevice.apiBaseUrl ?? '',
        device: mockExposureDevice
      }

      mockGetDeviceClient.mockImplementation((_dId: string) => {
        if (_dId === deviceId) {
          return testSpecificClient as unknown as AlpacaClient
        }
        return null
      })

      mockUpdateDeviceProperties.mockClear()
      mockEmitEvent.mockClear()
      mockConsoleError.mockClear()
      fetchMock = vi.spyOn(global, 'fetch')
    })

    afterEach(() => {
      vi.restoreAllMocks() // This should cover fetchMock and consoleError if spied via vi.spyOn
    })

    it('should download BINARY image, update properties, and emit event on success', async () => {
      // testSpecificClient.getProperty will default to returning true for imageready

      testSpecificClient.getDeviceUrl = vi.fn().mockReturnValue(`http://localhost:3000/api/v1/camera/0/imagearray`)
      // Ensure testSpecificClient.get is not called for binary success path
      testSpecificClient.get = vi.fn().mockRejectedValue(new Error('JSON get fallback should not be called in binary success test'))
      testSpecificClient.clientId = 123

      const currentDeviceState = store.devices.get(deviceId)!
      currentDeviceState.properties.imageBytesSupported = true
      currentDeviceState.properties.prefersJsonImage = false
      currentDeviceState.properties.imageWidth = 640
      currentDeviceState.properties.imageHeight = 480
      currentDeviceState.properties.imageElementType = 3 // e.g. Alpaca Int32

      const mockArrayBuffer = new ArrayBuffer(1024)
      fetchMock.mockResolvedValueOnce(new Response(mockArrayBuffer, { status: 200, headers: { 'Content-Type': 'application/imagebytes' } }))

      const expectedFetchUrl = `http://localhost:3000/api/v1/camera/0/imagearray?ClientID=${testSpecificClient.clientId}`

      await store.handleExposureComplete(deviceId)

      expect(testSpecificClient.getProperty).toHaveBeenCalledWith('imageready')
      expect(testSpecificClient.getDeviceUrl).toHaveBeenCalledTimes(1)
      expect(testSpecificClient.getDeviceUrl).toHaveBeenCalledWith('imagearray')

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(expectedFetchUrl, {
        method: 'GET',
        headers: { Accept: 'application/imagebytes', 'User-Agent': 'AlpacaWeb' }
      })
      expect(testSpecificClient.get).not.toHaveBeenCalled()

      expect(mockUpdateDeviceProperties).toHaveBeenCalledTimes(2)
      expect(mockUpdateDeviceProperties).toHaveBeenNthCalledWith(1, deviceId, {
        cameraState: CameraStates.Idle,
        isExposing: false,
        exposureProgress: 100,
        imageReady: true
      })
      expect(mockUpdateDeviceProperties).toHaveBeenNthCalledWith(2, deviceId, {
        imageData: mockArrayBuffer,
        hasImage: true,
        isExposing: false,
        imageReady: false,
        cameraState: CameraStates.Idle
      })
      const imageReadyEvent = mockEmitEvent.mock.calls.find((call) => call[0].type === 'cameraImageReady')
      expect(imageReadyEvent).toBeDefined()
      expect(imageReadyEvent?.[0]).toEqual({
        type: 'cameraImageReady',
        deviceId,
        imageData: mockArrayBuffer
      })
    })

    it('should log an error and not emit image if imageready check fails', async () => {
      const currentDeviceState = store.devices.get(deviceId)!
      currentDeviceState.properties.imageBytesSupported = true
      currentDeviceState.properties.prefersJsonImage = false

      // Specific mock for this test: imageready returns false
      testSpecificClient.getProperty.mockImplementationOnce(async (propName: string) => {
        if (propName.toLowerCase() === 'imageready') {
          return false
        }
        // Fallback for other properties if any were to be checked in this path
        if (propName.toLowerCase() === 'camerastate') return CameraStates.Idle
        return null
      })

      // Ensure getDeviceUrl and get are not called if imageready is false
      testSpecificClient.getDeviceUrl = vi.fn().mockReturnValue('should.not.be.called.url')
      testSpecificClient.get = vi.fn().mockRejectedValue(new Error('should.not.be.called.error'))

      const consoleWarnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {})

      await store.handleExposureComplete(deviceId)

      expect(testSpecificClient.getProperty).toHaveBeenCalledWith('imageready')
      expect(consoleWarnSpy).toHaveBeenCalledWith({ deviceIds: [deviceId] }, 'Camera reports image is not ready, skipping image download')
      expect(fetchMock).not.toHaveBeenCalled()
      expect(testSpecificClient.getDeviceUrl).not.toHaveBeenCalled()
      expect(testSpecificClient.get).not.toHaveBeenCalled()

      expect(mockUpdateDeviceProperties).toHaveBeenCalledTimes(1)
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(deviceId, {
        cameraState: CameraStates.Idle,
        isExposing: false,
        exposureProgress: 100,
        imageReady: true // This is from the initial optimistic update in SUT
      })

      // Check for the specific 'cameraExposureComplete' event
      const exposureCompleteEvent = mockEmitEvent.mock.calls.find((call) => call[0].type === 'cameraExposureComplete')
      expect(exposureCompleteEvent).toBeDefined()
      expect(exposureCompleteEvent?.[0]).toEqual({
        type: 'cameraExposureComplete',
        deviceId
        // No imageData or imageUrl
      })

      // Ensure 'cameraImageReady' was NOT emitted in this path
      const imageReadyEvent = mockEmitEvent.mock.calls.find((call) => call[0].type === 'cameraImageReady')
      expect(imageReadyEvent).toBeUndefined()

      expect(mockConsoleError).not.toHaveBeenCalled() // No actual errors should be logged by console.error

      consoleWarnSpy.mockRestore() // Restore spy
    })

    it('should log an error and not proceed if device is not found', async () => {
      const stagedGetDeviceByIdMockFn = vi.fn().mockImplementationOnce((id: string) => {
        console.log(`DIAGNOSTIC: mockGetDeviceById (STAGED FN - 1st call TARGETING SUT L487) for id: ${id}, returning null`)
        return null // This call should make the device undefined at SUT L487
      })
      // No second mockImplementationOnce needed if the first error path is taken.

      mockGetDeviceById.mockImplementation(stagedGetDeviceByIdMockFn)

      const consoleErrorSpy = vi.spyOn(log, 'error').mockImplementation(() => {})

      await store.handleExposureComplete(deviceId)

      const consoleErrorCalls = consoleErrorSpy.mock.calls
      const expectedErrorMessage = `Device ${deviceId} not found after imageready check`
      const specificErrorLogged = consoleErrorCalls.some((call) => call[1] === expectedErrorMessage)
      expect(specificErrorLogged, 'The specific error message about device not found after imageready was not logged.').toBe(true)

      expect(stagedGetDeviceByIdMockFn, 'stagedGetDeviceByIdMockFn was not called exactly once').toHaveBeenCalledTimes(1)
      expect(testSpecificClient.getProperty, 'getProperty("imageready") was not called').toHaveBeenCalledWith('imageready')

      const completeEventCall = mockEmitEvent.mock.calls.find((call) => call[0].type === 'cameraExposureComplete')
      expect(completeEventCall, 'cameraExposureComplete event was not emitted').toBeDefined()
      if (completeEventCall) {
        const completeEvent = completeEventCall[0] as import('@/stores/types/device-store.types').CameraExposureCompleteEvent // TYPE CAST
        expect(completeEvent.deviceId).toBe(deviceId)
        expect(completeEvent.imageData, 'event.imageData should be undefined').toBeUndefined()
        expect(completeEvent.imageUrl, 'event.imageUrl should be undefined').toBeUndefined()
        // Check that error property is a string and matches
        expect(typeof completeEvent.error).toBe('string')
        expect(completeEvent.error).toBe(expectedErrorMessage)
      }

      // Restore spies
      consoleErrorSpy.mockRestore()
    })
  })

  describe('abortCameraExposure', () => {
    const deviceId = 'test-cam-abort'
    let mockCallDeviceMethod: MockInstance<
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (deviceId: string, method: string, args?: any) => Promise<any>
    >

    beforeEach(() => {
      // Ensure the device is in the store, potentially in an exposing state
      const mockAbortingDevice: UnifiedDevice = {
        id: deviceId,
        name: 'Test Abort Camera',
        type: 'camera',
        uniqueId: `mock-camera-${deviceId}`,
        deviceNum: 0,
        isConnected: true,
        isConnecting: false,
        isDisconnecting: false,
        status: 'connected' as DeviceState,
        apiBaseUrl: `http://mock.alpaca.api/${deviceId}`,
        properties: {
          connected: true,
          isConnecting: false,
          isExposing: true, // Start in exposing state
          cameraState: CameraStates.Exposing,
          exposureProgress: 50
        }
      }
      store.devices.set(deviceId, { ...mockAbortingDevice })
      store.devicesArray = Array.from(store.devices.values())

      // mockGetDeviceById is spied in the main beforeEach, but let's ensure it returns the device for this suite
      mockGetDeviceById.mockImplementation((id: string) => (id === deviceId ? store.devices.get(id) || null : null))
      mockCallDeviceMethod = vi.spyOn(store, 'callDeviceMethod').mockResolvedValue({}) // Default success

      mockUpdateDeviceProperties.mockClear()
      mockEmitEvent.mockClear()
      mockConsoleError.mockClear()
    })

    it('should call client.callDeviceMethod with abortexposure, update properties, and emit event on success', async () => {
      const result = await store.abortCameraExposure(deviceId)

      expect(result).toBe(true)
      // expect(mockGetDeviceById).toHaveBeenCalledWith(deviceId) // Not a direct call from abortCameraExposure
      expect(mockCallDeviceMethod).toHaveBeenCalledTimes(1)
      expect(mockCallDeviceMethod).toHaveBeenCalledWith(deviceId, 'abortexposure', [])

      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(deviceId, {
        isExposing: false,
        exposureProgress: 0,
        imageReady: false,
        cameraState: CameraStates.Idle
      })

      const abortEventCall = mockEmitEvent.mock.calls.find((call) => call[0].type === 'cameraExposureAborted')
      expect(abortEventCall).toBeDefined()
      expect(abortEventCall?.[0]).toEqual<DeviceEvent>({
        type: 'cameraExposureAborted',
        deviceId
      })
    })

    it('should re-throw error, log error, and update properties on client.callDeviceMethod failure', async () => {
      const abortError = new Error('Alpaca abortexposure error')
      mockCallDeviceMethod.mockRejectedValueOnce(abortError)

      await expect(store.abortCameraExposure(deviceId)).rejects.toThrow(abortError)

      expect(mockCallDeviceMethod).toHaveBeenCalledTimes(1)
      expect(mockCallDeviceMethod).toHaveBeenCalledWith(deviceId, 'abortexposure', [])

      expect(mockConsoleError).toHaveBeenCalledWith({ deviceIds: [deviceId] }, `Error aborting exposure on camera ${deviceId}:`, abortError)

      // Check that properties are reset even on error, as per the implementation's catch block
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(deviceId, {
        isExposing: false,
        exposureProgress: 0,
        cameraState: CameraStates.Idle // As per the catch block in SUT
      })

      // Ensure cameraExposureAborted event is NOT emitted on failure
      const abortEventCall = mockEmitEvent.mock.calls.find((call) => call[0].type === 'cameraExposureAborted')
      expect(abortEventCall).toBeUndefined()
    })

    it('should re-throw error and log error if device is not found (via callDeviceMethod guard)', async () => {
      const deviceNotFoundError = new Error(`Device ${deviceId} not found`)
      mockCallDeviceMethod.mockRejectedValueOnce(deviceNotFoundError)

      await expect(store.abortCameraExposure(deviceId)).rejects.toThrow(deviceNotFoundError)

      expect(mockCallDeviceMethod).toHaveBeenCalledTimes(1)
      expect(mockConsoleError).toHaveBeenCalledWith({ deviceIds: [deviceId] }, `Error aborting exposure on camera ${deviceId}:`, deviceNotFoundError)
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(deviceId, {
        isExposing: false,
        exposureProgress: 0,
        cameraState: CameraStates.Idle // As per the catch block in SUT
      })
    })

    // Note: A test for "client not found" would be similar to "device not found"
    // as callDeviceMethod handles that. If callDeviceMethod resolves/rejects differently,
    // specific tests could be added. Given the current structure of abortCameraExposure
    // relying on callDeviceMethod's outcome, these specific guard tests within abort are less critical
    // if callDeviceMethod is robustly tested elsewhere.
  })

  describe('setCameraCooler', () => {
    const deviceId = 'test-cam-cooler'
    let mockCallDeviceMethod: MockInstance<
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (deviceId: string, method: string, args?: any) => Promise<any>
    >

    beforeEach(() => {
      const mockCoolerDevice: UnifiedDevice = {
        id: deviceId,
        name: 'Test Cooler Camera',
        type: 'camera',
        uniqueId: `mock-camera-${deviceId}`,
        deviceNum: 0,
        isConnected: true,
        isConnecting: false,
        isDisconnecting: false,
        status: 'connected' as DeviceState,
        apiBaseUrl: `http://mock.alpaca.api/${deviceId}`,
        properties: {
          connected: true,
          canCool: true, // Assume it can cool for these tests
          coolerEnabled: false,
          targetTemperature: 0
        }
      }
      store.devices.set(deviceId, { ...mockCoolerDevice })
      store.devicesArray = Array.from(store.devices.values())

      mockGetDeviceById.mockImplementation((id: string) => (id === deviceId ? store.devices.get(id) || null : null))
      mockCallDeviceMethod = vi.spyOn(store, 'callDeviceMethod').mockResolvedValue({}) // Default success

      mockUpdateDeviceProperties.mockClear()
      mockEmitEvent.mockClear()
      mockConsoleError.mockClear()
    })

    it('should set cooler on, update properties, and emit event', async () => {
      const enabled = true
      const result = await store.setCameraCooler(deviceId, enabled)

      expect(result).toBe(true)
      expect(mockCallDeviceMethod).toHaveBeenCalledTimes(1)
      expect(mockCallDeviceMethod).toHaveBeenCalledWith(deviceId, 'cooleron', [{ CoolerOn: enabled }])
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(deviceId, {
        coolerEnabled: enabled
      })
      const coolerEvent = mockEmitEvent.mock.calls.find((call) => call[0].type === 'cameraCoolerChanged')
      expect(coolerEvent).toBeDefined()
      expect(coolerEvent?.[0]).toEqual<DeviceEvent>({
        type: 'cameraCoolerChanged',
        deviceId,
        enabled,
        temperature: undefined // No target temp provided
      })
    })

    it('should set cooler on with target temperature, update properties, and emit event', async () => {
      const enabled = true
      const targetTemperature = -10
      const result = await store.setCameraCooler(deviceId, enabled, targetTemperature)

      expect(result).toBe(true)
      expect(mockCallDeviceMethod).toHaveBeenCalledTimes(2)
      expect(mockCallDeviceMethod).toHaveBeenNthCalledWith(1, deviceId, 'cooleron', [{ CoolerOn: enabled }])
      expect(mockCallDeviceMethod).toHaveBeenNthCalledWith(2, deviceId, 'setccdtemperature', [{ SetCCDTemperature: targetTemperature }])
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(deviceId, {
        coolerEnabled: enabled,
        targetTemperature: targetTemperature
      })
      const coolerEvent = mockEmitEvent.mock.calls.find((call) => call[0].type === 'cameraCoolerChanged')
      expect(coolerEvent).toBeDefined()
      expect(coolerEvent?.[0]).toEqual<DeviceEvent>({
        type: 'cameraCoolerChanged',
        deviceId,
        enabled,
        temperature: targetTemperature
      })
    })

    it('should set cooler off, update properties, and emit event', async () => {
      // First set it on to simulate a change
      store.devices.get(deviceId)!.properties!.coolerEnabled = true
      store.devices.get(deviceId)!.properties!.targetTemperature = -5

      const enabled = false
      const targetTemperature = 5 // Alpaca spec allows setting target temp even if cooler is being turned off
      const result = await store.setCameraCooler(deviceId, enabled, targetTemperature)

      expect(result).toBe(true)
      expect(mockCallDeviceMethod).toHaveBeenCalledTimes(2)
      expect(mockCallDeviceMethod).toHaveBeenNthCalledWith(1, deviceId, 'cooleron', [{ CoolerOn: enabled }])
      expect(mockCallDeviceMethod).toHaveBeenNthCalledWith(2, deviceId, 'setccdtemperature', [{ SetCCDTemperature: targetTemperature }])
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(deviceId, {
        coolerEnabled: enabled,
        targetTemperature: targetTemperature
      })
      const coolerEvent = mockEmitEvent.mock.calls.find((call) => call[0].type === 'cameraCoolerChanged')
      expect(coolerEvent).toBeDefined()
      expect(coolerEvent?.[0]).toEqual<DeviceEvent>({
        type: 'cameraCoolerChanged',
        deviceId,
        enabled,
        temperature: targetTemperature
      })
    })

    it('should throw error if callDeviceMethod for cooleron fails', async () => {
      const coolerOnError = new Error('Failed to set cooleron')
      mockCallDeviceMethod.mockImplementation(async (dId, method) => {
        if (method === 'cooleron') throw coolerOnError
        return {}
      })

      await expect(store.setCameraCooler(deviceId, true)).rejects.toThrow(coolerOnError)

      expect(mockCallDeviceMethod).toHaveBeenCalledTimes(1)
      expect(mockCallDeviceMethod).toHaveBeenCalledWith(deviceId, 'cooleron', [{ CoolerOn: true }])
      expect(mockConsoleError).toHaveBeenCalledWith({ deviceIds: [deviceId] }, `Error setting camera ${deviceId} cooler:`, coolerOnError)
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled()
      expect(mockEmitEvent).not.toHaveBeenCalled()
    })

    it('should throw error if callDeviceMethod for setccdtemperature fails', async () => {
      const setTempError = new Error('Failed to set ccdtemperature')
      mockCallDeviceMethod.mockImplementation(async (dId, method) => {
        if (method === 'setccdtemperature') throw setTempError
        return {}
      })

      const targetTemperature = -15
      await expect(store.setCameraCooler(deviceId, true, targetTemperature)).rejects.toThrow(setTempError)

      expect(mockCallDeviceMethod).toHaveBeenCalledTimes(2)
      expect(mockCallDeviceMethod).toHaveBeenNthCalledWith(1, deviceId, 'cooleron', [{ CoolerOn: true }])
      expect(mockCallDeviceMethod).toHaveBeenNthCalledWith(2, deviceId, 'setccdtemperature', [{ SetCCDTemperature: targetTemperature }])
      expect(mockConsoleError).toHaveBeenCalledWith({ deviceIds: [deviceId] }, `Error setting camera ${deviceId} cooler:`, setTempError)
      // updateDeviceProperties and emitEvent should not be called if the second call fails
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled()
      expect(mockEmitEvent).not.toHaveBeenCalled()
    })
  })

  describe('setCameraBinning', () => {
    const deviceId = 'test-cam-binning'
    let mockCallDeviceMethod: MockInstance<
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (deviceId: string, method: string, args?: any) => Promise<any>
    >

    beforeEach(() => {
      const mockBinningDevice: UnifiedDevice = {
        id: deviceId,
        name: 'Test Binning Camera',
        type: 'camera',
        uniqueId: `mock-camera-${deviceId}`,
        deviceNum: 0,
        isConnected: true,
        isConnecting: false,
        isDisconnecting: false,
        status: 'connected' as DeviceState,
        apiBaseUrl: `http://mock.alpaca.api/${deviceId}`,
        properties: {
          connected: true,
          canSetBinning: true, // Assume it can set binning
          binX: 1,
          binY: 1,
          binningX: 1, // Friendly property
          binningY: 1 // Friendly property
        }
      }
      store.devices.set(deviceId, { ...mockBinningDevice })
      store.devicesArray = Array.from(store.devices.values())

      mockGetDeviceById.mockImplementation((id: string) => (id === deviceId ? store.devices.get(id) || null : null))
      mockCallDeviceMethod = vi.spyOn(store, 'callDeviceMethod').mockResolvedValue({}) // Default success

      mockUpdateDeviceProperties.mockClear()
      mockEmitEvent.mockClear()
      mockConsoleError.mockClear()
    })

    it('should set binning, update properties, and emit event', async () => {
      const binX = 2
      const binY = 2
      const result = await store.setCameraBinning(deviceId, binX, binY)

      expect(result).toBe(true)
      expect(mockCallDeviceMethod).toHaveBeenCalledTimes(2)
      expect(mockCallDeviceMethod).toHaveBeenNthCalledWith(1, deviceId, 'binx', [{ BinX: binX }])
      expect(mockCallDeviceMethod).toHaveBeenNthCalledWith(2, deviceId, 'biny', [{ BinY: binY }])

      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(deviceId, {
        binningX: binX,
        binningY: binY
      })

      const binningEvent = mockEmitEvent.mock.calls.find((call) => call[0].type === 'cameraBinningChanged')
      expect(binningEvent).toBeDefined()
      expect(binningEvent?.[0]).toEqual<DeviceEvent>({
        type: 'cameraBinningChanged',
        deviceId,
        binX,
        binY
      })
    })

    it('should throw error if callDeviceMethod for binx fails', async () => {
      const binxError = new Error('Failed to set binx')
      mockCallDeviceMethod.mockImplementation(async (dId, method) => {
        if (method === 'binx') throw binxError
        return {}
      })

      await expect(store.setCameraBinning(deviceId, 2, 2)).rejects.toThrow(binxError)

      expect(mockCallDeviceMethod).toHaveBeenCalledTimes(1)
      expect(mockCallDeviceMethod).toHaveBeenCalledWith(deviceId, 'binx', [{ BinX: 2 }])
      expect(mockConsoleError).toHaveBeenCalledWith({ deviceIds: [deviceId] }, `Error setting camera ${deviceId} binning:`, binxError)
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled()
      expect(mockEmitEvent).not.toHaveBeenCalled()
    })

    it('should throw error if callDeviceMethod for biny fails', async () => {
      const binyError = new Error('Failed to set biny')
      mockCallDeviceMethod.mockImplementation(async (dId, method) => {
        if (method === 'biny') throw binyError
        // Allow binx to succeed
        if (method === 'binx') return {}
        return {}
      })

      await expect(store.setCameraBinning(deviceId, 2, 2)).rejects.toThrow(binyError)

      expect(mockCallDeviceMethod).toHaveBeenCalledTimes(2) // binx and biny called
      expect(mockCallDeviceMethod).toHaveBeenNthCalledWith(1, deviceId, 'binx', [{ BinX: 2 }])
      expect(mockCallDeviceMethod).toHaveBeenNthCalledWith(2, deviceId, 'biny', [{ BinY: 2 }])
      expect(mockConsoleError).toHaveBeenCalledWith({ deviceIds: [deviceId] }, `Error setting camera ${deviceId} binning:`, binyError)
      // updateDeviceProperties and emitEvent should not be called if the second call fails
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled()
      expect(mockEmitEvent).not.toHaveBeenCalled()
    })
  })

  describe('setCameraGain', () => {
    const deviceId = 'test-cam-gain'
    let mockCameraClientSetGain: MockInstance<(value: number) => Promise<void>>
    let mockFetchCameraProperties: MockInstance<(deviceId: string) => Promise<boolean>>

    beforeEach(() => {
      // Default device setup, can be overridden in specific tests
      const mockGainDevice: UnifiedDevice = {
        id: deviceId,
        name: 'Test Gain Camera',
        type: 'camera',
        uniqueId: `mock-camera-${deviceId}`,
        deviceNum: 0,
        isConnected: true,
        isConnecting: false,
        isDisconnecting: false,
        status: 'connected' as DeviceState,
        apiBaseUrl: `http://mock.alpaca.api/${deviceId}`,
        properties: {
          connected: true,
          cam_gainMode: 'unknown', // Default to unknown, tests will specify
          gains: [],
          gainmin: 0,
          gainmax: 100
        }
      }
      store.devices.set(deviceId, { ...mockGainDevice })
      store.devicesArray = Array.from(store.devices.values())

      mockGetDeviceById.mockImplementation((id: string) => (id === deviceId ? store.devices.get(id) || null : null))

      mockCameraClientSetGain = vi.fn().mockResolvedValue(undefined)
      // Ensure getDeviceClient returns a client with the mocked setGain
      mockGetDeviceClient.mockImplementation((id: string) => {
        if (id === deviceId) {
          return {
            ...mockAlpacaClientInstance, // Spread other common mocks if needed
            setGain: mockCameraClientSetGain
          } as unknown as AlpacaClient // Cast to AlpacaClient, then SUT casts to CameraClient
        }
        return null
      })

      mockFetchCameraProperties = vi.spyOn(store, 'fetchCameraProperties').mockResolvedValue(true)

      mockUpdateDeviceProperties.mockClear() // Though setCameraGain doesn't call it directly
      mockEmitEvent.mockClear()
      mockConsoleError.mockClear() // Though setCameraGain doesn't call it directly
    })

    describe('List Mode', () => {
      const gainsList = ['Low', 'Medium', 'High']
      beforeEach(() => {
        const device = store.getDeviceById(deviceId)
        if (device && device.properties) {
          device.properties.cam_gainMode = 'list'
          device.properties.gains = gainsList
        }
      })

      it('should set gain by name, call client.setGain with index, emit event, and fetch props', async () => {
        const desiredGainName = 'Medium'
        const expectedIndex = 1

        await store.setCameraGain(deviceId, desiredGainName)

        expect(mockCameraClientSetGain).toHaveBeenCalledWith(expectedIndex)
        expect(mockEmitEvent).toHaveBeenCalledWith({
          type: 'deviceMethodCalled',
          deviceId,
          method: 'setGain',
          args: [expectedIndex],
          result: 'success'
        })
        expect(mockFetchCameraProperties).toHaveBeenCalledWith(deviceId)
      })

      it('should set gain by index, call client.setGain with index, emit event, and fetch props', async () => {
        const desiredGainIndex = 2

        await store.setCameraGain(deviceId, desiredGainIndex)

        expect(mockCameraClientSetGain).toHaveBeenCalledWith(desiredGainIndex)
        expect(mockEmitEvent).toHaveBeenCalledWith({
          type: 'deviceMethodCalled',
          deviceId,
          method: 'setGain',
          args: [desiredGainIndex],
          result: 'success'
        })
        expect(mockFetchCameraProperties).toHaveBeenCalledWith(deviceId)
      })

      it('should emit deviceApiError if gain name not found', async () => {
        await store.setCameraGain(deviceId, 'InvalidGainName')

        expect(mockCameraClientSetGain).not.toHaveBeenCalled()
        expect(mockEmitEvent).toHaveBeenCalledWith({
          type: 'deviceApiError',
          deviceId,
          error: "Gain name 'InvalidGainName' not found in list."
        })
        expect(mockFetchCameraProperties).not.toHaveBeenCalled()
      })

      it('should emit deviceApiError if gain index out of bounds', async () => {
        await store.setCameraGain(deviceId, 99) // Out of bounds index

        expect(mockCameraClientSetGain).not.toHaveBeenCalled()
        expect(mockEmitEvent).toHaveBeenCalledWith({
          type: 'deviceApiError',
          deviceId,
          error: 'Gain index 99 out of bounds.'
        })
        expect(mockFetchCameraProperties).not.toHaveBeenCalled()
      })
    })

    describe('Value Mode', () => {
      const gainMin = 10
      const gainMax = 200
      beforeEach(() => {
        const device = store.getDeviceById(deviceId)
        if (device && device.properties) {
          device.properties.cam_gainMode = 'value'
          device.properties.gainmin = gainMin
          device.properties.gainmax = gainMax
          device.properties.gains = [] // Ensure gains list is empty for value mode
        }
      })

      it('should set gain by numeric value, call client.setGain, emit event, and fetch props', async () => {
        const desiredGainValue = 150
        await store.setCameraGain(deviceId, desiredGainValue)

        expect(mockCameraClientSetGain).toHaveBeenCalledWith(desiredGainValue)
        expect(mockEmitEvent).toHaveBeenCalledWith({
          type: 'deviceMethodCalled',
          deviceId,
          method: 'setGain',
          args: [desiredGainValue],
          result: 'success'
        })
        expect(mockFetchCameraProperties).toHaveBeenCalledWith(deviceId)
      })

      it('should set gain by string value, parse it, call client.setGain, emit event, and fetch props', async () => {
        const desiredGainString = '120'
        const expectedNumericValue = 120
        await store.setCameraGain(deviceId, desiredGainString)

        expect(mockCameraClientSetGain).toHaveBeenCalledWith(expectedNumericValue)
        expect(mockEmitEvent).toHaveBeenCalledWith({
          type: 'deviceMethodCalled',
          deviceId,
          method: 'setGain',
          args: [expectedNumericValue],
          result: 'success'
        })
        expect(mockFetchCameraProperties).toHaveBeenCalledWith(deviceId)
      })

      it('should clamp gain if value is below min', async () => {
        await store.setCameraGain(deviceId, 5) // Below min of 10
        expect(mockCameraClientSetGain).toHaveBeenCalledWith(gainMin) // Should be clamped to min
      })

      it('should clamp gain if value is above max', async () => {
        await store.setCameraGain(deviceId, 250) // Above max of 200
        expect(mockCameraClientSetGain).toHaveBeenCalledWith(gainMax) // Should be clamped to max
      })

      it('should emit deviceApiError if string gain value is invalid', async () => {
        await store.setCameraGain(deviceId, 'NotANumber')

        expect(mockCameraClientSetGain).not.toHaveBeenCalled()
        expect(mockEmitEvent).toHaveBeenCalledWith({
          type: 'deviceApiError',
          deviceId,
          error: "Invalid gain value string 'NotANumber'."
        })
        expect(mockFetchCameraProperties).not.toHaveBeenCalled()
      })
    })

    describe('Unknown Mode and Edge Cases', () => {
      it('should emit deviceApiError if cam_gainMode is unknown', async () => {
        // Device defaults to unknown mode in beforeEach
        await store.setCameraGain(deviceId, 100)

        expect(mockCameraClientSetGain).not.toHaveBeenCalled()
        expect(mockEmitEvent).toHaveBeenCalledWith({
          type: 'deviceApiError',
          deviceId,
          error: 'Gain mode is unknown. Cannot set gain.'
        })
        expect(mockFetchCameraProperties).not.toHaveBeenCalled()
      })

      it('should emit deviceApiError if client or device not found', async () => {
        mockGetDeviceById.mockReturnValueOnce(null) // Simulate device not found
        await store.setCameraGain(deviceId, 100)

        expect(mockCameraClientSetGain).not.toHaveBeenCalled()
        expect(mockEmitEvent).toHaveBeenCalledWith({
          type: 'deviceApiError',
          deviceId,
          error: 'Client or device not found for setCameraGain'
        })
        expect(mockFetchCameraProperties).not.toHaveBeenCalled()
      })

      it('should emit deviceApiError if client.setGain fails', async () => {
        const setGainError = new Error('Client failed to setGain')
        mockCameraClientSetGain.mockRejectedValueOnce(setGainError)

        // Setup for a valid call to reach client.setGain (e.g., value mode)
        const device = store.getDeviceById(deviceId)
        if (device && device.properties) {
          device.properties.cam_gainMode = 'value'
          device.properties.gainmin = 0
          device.properties.gainmax = 200
        }

        await store.setCameraGain(deviceId, 100)

        expect(mockCameraClientSetGain).toHaveBeenCalledWith(100)
        expect(mockEmitEvent).toHaveBeenCalledWith({
          type: 'deviceApiError',
          deviceId,
          error: `Failed to set gain: ${setGainError}`
        })
        expect(mockFetchCameraProperties).not.toHaveBeenCalled() // Should not fetch if setGain failed
      })

      it('should emit deviceApiError if numericValueToSend cannot be determined (e.g. list mode, desiredGain is object)', async () => {
        const device = store.getDeviceById(deviceId)
        if (device && device.properties) {
          device.properties.cam_gainMode = 'list'
          device.properties.gains = ['A', 'B']
        }
        // Pass an object, which is not handled for numeric conversion in list mode
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await store.setCameraGain(deviceId, { complex: 'object' } as any)

        expect(mockCameraClientSetGain).not.toHaveBeenCalled()
        expect(mockEmitEvent).toHaveBeenCalledWith({
          type: 'deviceApiError',
          deviceId,
          error: 'Could not determine numeric gain value to send.'
        })
      })
    })
  })

  describe('setCameraOffset', () => {
    const deviceId = 'test-cam-offset'
    let mockCameraClientSetOffset: MockInstance<(value: number) => Promise<void>>
    let mockFetchCameraProperties: MockInstance<(deviceId: string) => Promise<boolean>>

    beforeEach(() => {
      const mockOffsetDevice: UnifiedDevice = {
        id: deviceId,
        name: 'Test Offset Camera',
        type: 'camera',
        uniqueId: `mock-camera-${deviceId}`,
        deviceNum: 0,
        isConnected: true,
        isConnecting: false,
        isDisconnecting: false,
        status: 'connected' as DeviceState,
        apiBaseUrl: `http://mock.alpaca.api/${deviceId}`,
        properties: {
          connected: true,
          cam_offsetMode: 'unknown', // Default to unknown
          offsets: [],
          offsetmin: 0,
          offsetmax: 100
        }
      }
      store.devices.set(deviceId, { ...mockOffsetDevice })
      store.devicesArray = Array.from(store.devices.values())

      mockGetDeviceById.mockImplementation((id: string) => (id === deviceId ? store.devices.get(id) || null : null))

      mockCameraClientSetOffset = vi.fn().mockResolvedValue(undefined)
      mockGetDeviceClient.mockImplementation((id: string) => {
        if (id === deviceId) {
          return {
            ...mockAlpacaClientInstance,
            setOffset: mockCameraClientSetOffset
          } as unknown as AlpacaClient
        }
        return null
      })

      mockFetchCameraProperties = vi.spyOn(store, 'fetchCameraProperties').mockResolvedValue(true)
      mockEmitEvent.mockClear()
    })

    describe('List Mode', () => {
      const offsetsList = ['Zero', 'Ten', 'Twenty']
      beforeEach(() => {
        const device = store.getDeviceById(deviceId)
        if (device && device.properties) {
          device.properties.cam_offsetMode = 'list'
          device.properties.offsets = offsetsList
        }
      })

      it('should set offset by name, call client.setOffset with index, emit event, and fetch props', async () => {
        const desiredOffsetName = 'Ten'
        const expectedIndex = 1

        await store.setCameraOffset(deviceId, desiredOffsetName)

        expect(mockCameraClientSetOffset).toHaveBeenCalledWith(expectedIndex)
        expect(mockEmitEvent).toHaveBeenCalledWith({
          type: 'deviceMethodCalled',
          deviceId,
          method: 'setOffset',
          args: [expectedIndex],
          result: 'success'
        })
        expect(mockFetchCameraProperties).toHaveBeenCalledWith(deviceId)
      })

      it('should set offset by index, call client.setOffset with index, emit event, and fetch props', async () => {
        const desiredOffsetIndex = 2
        await store.setCameraOffset(deviceId, desiredOffsetIndex)

        expect(mockCameraClientSetOffset).toHaveBeenCalledWith(desiredOffsetIndex)
        expect(mockEmitEvent).toHaveBeenCalledWith({
          type: 'deviceMethodCalled',
          deviceId,
          method: 'setOffset',
          args: [desiredOffsetIndex],
          result: 'success'
        })
        expect(mockFetchCameraProperties).toHaveBeenCalledWith(deviceId)
      })

      it('should emit deviceApiError if offset name not found', async () => {
        await store.setCameraOffset(deviceId, 'InvalidOffsetName')
        expect(mockCameraClientSetOffset).not.toHaveBeenCalled()
        expect(mockEmitEvent).toHaveBeenCalledWith({
          type: 'deviceApiError',
          deviceId,
          error: "Offset name 'InvalidOffsetName' not found in list."
        })
        expect(mockFetchCameraProperties).not.toHaveBeenCalled()
      })

      it('should emit deviceApiError if offset index out of bounds', async () => {
        await store.setCameraOffset(deviceId, 99)
        expect(mockCameraClientSetOffset).not.toHaveBeenCalled()
        expect(mockEmitEvent).toHaveBeenCalledWith({
          type: 'deviceApiError',
          deviceId,
          error: 'Offset index 99 out of bounds.'
        })
        expect(mockFetchCameraProperties).not.toHaveBeenCalled()
      })
    })

    describe('Value Mode', () => {
      const offsetMin = 10
      const offsetMax = 200
      beforeEach(() => {
        const device = store.getDeviceById(deviceId)
        if (device && device.properties) {
          device.properties.cam_offsetMode = 'value'
          device.properties.offsetmin = offsetMin
          device.properties.offsetmax = offsetMax
          device.properties.offsets = [] // Ensure offsets list is empty
        }
      })

      it('should set offset by numeric value, call client.setOffset, emit event, and fetch props', async () => {
        const desiredOffsetValue = 150
        await store.setCameraOffset(deviceId, desiredOffsetValue)

        expect(mockCameraClientSetOffset).toHaveBeenCalledWith(desiredOffsetValue)
        expect(mockEmitEvent).toHaveBeenCalledWith({
          type: 'deviceMethodCalled',
          deviceId,
          method: 'setOffset',
          args: [desiredOffsetValue],
          result: 'success'
        })
        expect(mockFetchCameraProperties).toHaveBeenCalledWith(deviceId)
      })

      it('should set offset by string value, parse it, call client.setOffset, emit event, and fetch props', async () => {
        const desiredOffsetString = '120'
        const expectedNumericValue = 120
        await store.setCameraOffset(deviceId, desiredOffsetString)

        expect(mockCameraClientSetOffset).toHaveBeenCalledWith(expectedNumericValue)
        expect(mockEmitEvent).toHaveBeenCalledWith({
          type: 'deviceMethodCalled',
          deviceId,
          method: 'setOffset',
          args: [expectedNumericValue],
          result: 'success'
        })
        expect(mockFetchCameraProperties).toHaveBeenCalledWith(deviceId)
      })

      it('should clamp offset if value is below min', async () => {
        await store.setCameraOffset(deviceId, 5) // Below min of 10
        expect(mockCameraClientSetOffset).toHaveBeenCalledWith(offsetMin)
      })

      it('should clamp offset if value is above max', async () => {
        await store.setCameraOffset(deviceId, 250) // Above max of 200
        expect(mockCameraClientSetOffset).toHaveBeenCalledWith(offsetMax)
      })

      it('should emit deviceApiError if string offset value is invalid', async () => {
        await store.setCameraOffset(deviceId, 'NotANumber')
        expect(mockCameraClientSetOffset).not.toHaveBeenCalled()
        expect(mockEmitEvent).toHaveBeenCalledWith({
          type: 'deviceApiError',
          deviceId,
          error: "Invalid offset value string 'NotANumber'."
        })
        expect(mockFetchCameraProperties).not.toHaveBeenCalled()
      })
    })

    describe('Unknown Mode and Edge Cases', () => {
      it('should emit deviceApiError if cam_offsetMode is unknown', async () => {
        // Device defaults to unknown mode in beforeEach
        await store.setCameraOffset(deviceId, 100)
        expect(mockCameraClientSetOffset).not.toHaveBeenCalled()
        expect(mockEmitEvent).toHaveBeenCalledWith({
          type: 'deviceApiError',
          deviceId,
          error: 'Offset mode is unknown. Cannot set offset.'
        })
        expect(mockFetchCameraProperties).not.toHaveBeenCalled()
      })

      it('should emit deviceApiError if client or device not found', async () => {
        mockGetDeviceById.mockReturnValueOnce(null) // Simulate device not found
        await store.setCameraOffset(deviceId, 100)
        expect(mockCameraClientSetOffset).not.toHaveBeenCalled()
        expect(mockEmitEvent).toHaveBeenCalledWith({
          type: 'deviceApiError',
          deviceId,
          error: 'Client or device not found for setCameraOffset'
        })
        expect(mockFetchCameraProperties).not.toHaveBeenCalled()
      })

      it('should emit deviceApiError if client.setOffset fails', async () => {
        const setOffsetError = new Error('Client failed to setOffset')
        mockCameraClientSetOffset.mockRejectedValueOnce(setOffsetError)

        const device = store.getDeviceById(deviceId)
        if (device && device.properties) {
          device.properties.cam_offsetMode = 'value' // Ensure a valid mode to reach the call
          device.properties.offsetmin = 0
          device.properties.offsetmax = 200
        }

        await store.setCameraOffset(deviceId, 100)
        expect(mockCameraClientSetOffset).toHaveBeenCalledWith(100)
        expect(mockEmitEvent).toHaveBeenCalledWith({
          type: 'deviceApiError',
          deviceId,
          error: `Failed to set offset: ${setOffsetError}`
        })
        expect(mockFetchCameraProperties).not.toHaveBeenCalled()
      })

      it('should emit deviceApiError if numericValueToSend cannot be determined (e.g., list mode, desiredOffset is object)', async () => {
        const device = store.getDeviceById(deviceId)
        if (device && device.properties) {
          device.properties.cam_offsetMode = 'list'
          device.properties.offsets = ['X', 'Y']
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await store.setCameraOffset(deviceId, { complex: 'object' } as any)
        expect(mockCameraClientSetOffset).not.toHaveBeenCalled()
        expect(mockEmitEvent).toHaveBeenCalledWith({
          type: 'deviceApiError',
          deviceId,
          error: 'Could not determine numeric offset value to send.'
        })
        expect(mockFetchCameraProperties).not.toHaveBeenCalled()
      })
    })
  })

  describe('setCameraReadoutMode', () => {
    const deviceId = 'test-cam-readout'
    let mockCameraClientSetReadoutMode: MockInstance<(value: number) => Promise<void>>
    let mockFetchCameraProperties: MockInstance<(deviceId: string) => Promise<boolean>>

    beforeEach(() => {
      const mockReadoutDevice: UnifiedDevice = {
        id: deviceId,
        name: 'Test ReadoutMode Camera',
        type: 'camera',
        uniqueId: `mock-camera-${deviceId}`,
        deviceNum: 0,
        isConnected: true,
        isConnecting: false,
        isDisconnecting: false,
        status: 'connected' as DeviceState,
        apiBaseUrl: `http://mock.alpaca.api/${deviceId}`,
        properties: {
          connected: true,
          readoutmodes: ['Fast', 'Normal', 'Slow'], // Example modes
          readoutmode: 0 // Current mode index
        }
      }
      store.devices.set(deviceId, { ...mockReadoutDevice })
      store.devicesArray = Array.from(store.devices.values())

      mockGetDeviceById.mockImplementation((id: string) => (id === deviceId ? store.devices.get(id) || null : null))

      mockCameraClientSetReadoutMode = vi.fn().mockResolvedValue(undefined)
      mockGetDeviceClient.mockImplementation((id: string) => {
        if (id === deviceId) {
          return {
            ...mockAlpacaClientInstance,
            setReadoutMode: mockCameraClientSetReadoutMode
          } as unknown as AlpacaClient
        }
        return null
      })

      mockFetchCameraProperties = vi.spyOn(store, 'fetchCameraProperties').mockResolvedValue(true)
      mockEmitEvent.mockClear()
    })

    it('should call client.setReadoutMode, emit event, and fetch properties on success', async () => {
      const modeIndex = 1 // Target 'Normal' mode

      await store.setCameraReadoutMode(deviceId, modeIndex)

      expect(mockCameraClientSetReadoutMode).toHaveBeenCalledWith(modeIndex)
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceMethodCalled',
        deviceId,
        method: 'setReadoutMode',
        args: [modeIndex],
        result: 'success'
      })
      expect(mockFetchCameraProperties).toHaveBeenCalledWith(deviceId)
    })

    it('should emit deviceApiError if client is not found', async () => {
      mockGetDeviceClient.mockReturnValueOnce(null) // Simulate client not found
      const modeIndex = 1

      await store.setCameraReadoutMode(deviceId, modeIndex)

      expect(mockCameraClientSetReadoutMode).not.toHaveBeenCalled()
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId,
        error: 'Client not found for setCameraReadoutMode'
      })
      expect(mockFetchCameraProperties).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError if client.setReadoutMode fails', async () => {
      const setModeError = new Error('Client failed to setReadoutMode')
      mockCameraClientSetReadoutMode.mockRejectedValueOnce(setModeError)
      const modeIndex = 1

      await store.setCameraReadoutMode(deviceId, modeIndex)

      expect(mockCameraClientSetReadoutMode).toHaveBeenCalledWith(modeIndex)
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId,
        error: `Failed to set readout mode: ${setModeError}`
      })
      expect(mockFetchCameraProperties).not.toHaveBeenCalled() // Should not fetch if setReadoutMode failed
    })

    // Note: The SUT for setCameraReadoutMode does not currently validate modeIndex against device.properties.readoutmodes.
    // It directly passes the modeIndex to the client.setReadoutMode.
    // If validation were added, tests for out-of-bounds index would be relevant here.
  })

  describe('setCameraSubframe', () => {
    const deviceId = 'test-cam-subframe'
    let mockCameraClientSetSubframe: MockInstance<(startX: number, startY: number, numX: number, numY: number) => Promise<void>>
    let mockFetchCameraProperties: MockInstance<(deviceId: string) => Promise<boolean>>

    beforeEach(() => {
      const mockSubframeDevice: UnifiedDevice = {
        id: deviceId,
        name: 'Test Subframe Camera',
        type: 'camera',
        uniqueId: `mock-camera-${deviceId}`,
        deviceNum: 0,
        isConnected: true,
        isConnecting: false,
        isDisconnecting: false,
        status: 'connected' as DeviceState,
        apiBaseUrl: `http://mock.alpaca.api/${deviceId}`,
        properties: {
          connected: true
          // Relevant properties like startX, numX etc. are usually updated via polling/fetch
        }
      }
      store.devices.set(deviceId, { ...mockSubframeDevice })
      store.devicesArray = Array.from(store.devices.values())

      mockGetDeviceById.mockImplementation((id: string) => (id === deviceId ? store.devices.get(id) || null : null))

      mockCameraClientSetSubframe = vi.fn().mockResolvedValue(undefined)
      mockGetDeviceClient.mockImplementation((id: string) => {
        if (id === deviceId) {
          return {
            ...mockAlpacaClientInstance,
            setSubframe: mockCameraClientSetSubframe
          } as unknown as AlpacaClient
        }
        return null
      })

      mockFetchCameraProperties = vi.spyOn(store, 'fetchCameraProperties').mockResolvedValue(true)
      mockEmitEvent.mockClear()
    })

    it('should call client.setSubframe, emit event, and fetch properties on success', async () => {
      const startX = 10
      const startY = 20
      const numX = 100
      const numY = 200

      await store.setCameraSubframe(deviceId, startX, startY, numX, numY)

      expect(mockCameraClientSetSubframe).toHaveBeenCalledWith(startX, startY, numX, numY)
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceMethodCalled',
        deviceId,
        method: 'setSubframe',
        args: [startX, startY, numX, numY],
        result: 'success'
      })
      expect(mockFetchCameraProperties).toHaveBeenCalledWith(deviceId)
    })

    it('should emit deviceApiError if client is not found', async () => {
      mockGetDeviceClient.mockReturnValueOnce(null) // Simulate client not found

      await store.setCameraSubframe(deviceId, 10, 20, 100, 200)

      expect(mockCameraClientSetSubframe).not.toHaveBeenCalled()
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId,
        error: 'Client not found for setCameraSubframe'
      })
      expect(mockFetchCameraProperties).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError if client.setSubframe fails', async () => {
      const setSubframeError = new Error('Client failed to setSubframe')
      mockCameraClientSetSubframe.mockRejectedValueOnce(setSubframeError)
      const startX = 10,
        startY = 20,
        numX = 100,
        numY = 200

      await store.setCameraSubframe(deviceId, startX, startY, numX, numY)

      expect(mockCameraClientSetSubframe).toHaveBeenCalledWith(startX, startY, numX, numY)
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId,
        error: `Failed to set subframe: ${setSubframeError}`
      })
      expect(mockFetchCameraProperties).not.toHaveBeenCalled()
    })
  })

  describe('stopCameraExposure', () => {
    const deviceId = 'test-cam-stop-exposure'
    let mockCameraClientStopExposure: MockInstance<() => Promise<void>>

    beforeEach(() => {
      const mockStopExposureDevice: UnifiedDevice = {
        id: deviceId,
        name: 'Test StopExposure Camera',
        type: 'camera',
        uniqueId: `mock-camera-${deviceId}`,
        deviceNum: 0,
        isConnected: true,
        isConnecting: false,
        isDisconnecting: false,
        status: 'connected' as DeviceState,
        apiBaseUrl: `http://mock.alpaca.api/${deviceId}`,
        properties: {
          connected: true,
          isExposing: true // Assume initially exposing
        }
      }
      store.devices.set(deviceId, { ...mockStopExposureDevice })
      store.devicesArray = Array.from(store.devices.values())

      mockGetDeviceById.mockImplementation((id: string) => (id === deviceId ? store.devices.get(id) || null : null))

      mockCameraClientStopExposure = vi.fn().mockResolvedValue(undefined)
      mockGetDeviceClient.mockImplementation((id: string) => {
        if (id === deviceId) {
          return {
            ...mockAlpacaClientInstance,
            stopExposure: mockCameraClientStopExposure
          } as unknown as AlpacaClient
        }
        return null
      })

      mockUpdateDeviceProperties.mockClear()
      mockEmitEvent.mockClear()
    })

    it('should call client.stopExposure, update properties, and emit event on success', async () => {
      await store.stopCameraExposure(deviceId)

      expect(mockCameraClientStopExposure).toHaveBeenCalledTimes(1)
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(deviceId, { isExposing: false })
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceMethodCalled',
        deviceId,
        method: 'stopExposure',
        args: [],
        result: 'success'
      })
    })

    it('should emit deviceApiError if client is not found', async () => {
      mockGetDeviceClient.mockReturnValueOnce(null) // Simulate client not found

      await store.stopCameraExposure(deviceId)

      expect(mockCameraClientStopExposure).not.toHaveBeenCalled()
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled() // Properties should not be updated
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId,
        error: 'Client not found for stopCameraExposure'
      })
    })

    it('should emit deviceApiError if client.stopExposure fails', async () => {
      const stopExposureError = new Error('Client failed to stopExposure')
      mockCameraClientStopExposure.mockRejectedValueOnce(stopExposureError)

      await store.stopCameraExposure(deviceId)

      expect(mockCameraClientStopExposure).toHaveBeenCalledTimes(1)
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled() // Properties should not be updated on error
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId,
        error: `Failed to stop exposure: ${stopExposureError}`
      })
    })
  })

  describe('pulseGuideCamera', () => {
    const deviceId = 'test-cam-pulseguide'
    let mockCameraClientPulseGuide: MockInstance<(direction: number, duration: number) => Promise<void>>
    // No mockFetchCameraProperties needed as it's not called by pulseGuideCamera

    beforeEach(() => {
      const mockPulseGuideDevice: UnifiedDevice = {
        id: deviceId,
        name: 'Test PulseGuide Camera',
        type: 'camera',
        uniqueId: `mock-camera-${deviceId}`,
        deviceNum: 0,
        isConnected: true,
        isConnecting: false,
        isDisconnecting: false,
        status: 'connected' as DeviceState,
        apiBaseUrl: `http://mock.alpaca.api/${deviceId}`,
        properties: {
          connected: true,
          canPulseGuide: true // Assume capability
        }
      }
      store.devices.set(deviceId, { ...mockPulseGuideDevice })
      store.devicesArray = Array.from(store.devices.values())

      mockGetDeviceById.mockImplementation((id: string) => (id === deviceId ? store.devices.get(id) || null : null))

      mockCameraClientPulseGuide = vi.fn().mockResolvedValue(undefined)
      mockGetDeviceClient.mockImplementation((id: string) => {
        if (id === deviceId) {
          return {
            ...mockAlpacaClientInstance,
            pulseGuide: mockCameraClientPulseGuide
          } as unknown as AlpacaClient
        }
        return null
      })

      mockEmitEvent.mockClear()
    })

    it('should call client.pulseGuide and emit event on success', async () => {
      const direction = 0 // Example: GuideNorth
      const duration = 1000 // 1 second

      await store.pulseGuideCamera(deviceId, direction, duration)

      expect(mockCameraClientPulseGuide).toHaveBeenCalledWith(direction, duration)
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceMethodCalled',
        deviceId,
        method: 'pulseGuide',
        args: [direction, duration],
        result: 'success'
      })
    })

    it('should emit deviceApiError if client is not found', async () => {
      mockGetDeviceClient.mockReturnValueOnce(null) // Simulate client not found
      const direction = 1,
        duration = 500

      await store.pulseGuideCamera(deviceId, direction, duration)

      expect(mockCameraClientPulseGuide).not.toHaveBeenCalled()
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId,
        error: 'Client not found for pulseGuideCamera'
      })
    })

    it('should emit deviceApiError if client.pulseGuide fails', async () => {
      const pulseGuideError = new Error('Client failed to pulseGuide')
      mockCameraClientPulseGuide.mockRejectedValueOnce(pulseGuideError)
      const direction = 2,
        duration = 750

      await store.pulseGuideCamera(deviceId, direction, duration)

      expect(mockCameraClientPulseGuide).toHaveBeenCalledWith(direction, duration)
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId,
        error: `Failed to pulse guide: ${pulseGuideError}`
      })
    })
  })
})
