import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import type { AlpacaClient } from '@/api/AlpacaClient' // Main client type
import type { UnifiedDevice, DeviceEvent } from '@/stores/types/device-store.types'
import type { DeviceState } from '@/types/device.types' // Ensured correct path
import { createAlpacaClient } from '@/api/AlpacaClient'

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
  getCameraInfo: vi.fn().mockResolvedValue({})
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
      message?: any, // eslint-disable-line @typescript-eslint/no-explicit-any
      ...optionalParams: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
    ) => void
  >
  let mockTrackExposureProgress: MockInstance<(deviceId: string, expectedDuration: number) => void>
  let mockHandleExposureComplete: MockInstance<(deviceId: string) => Promise<void>>

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
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
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

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

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

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
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

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
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
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
      // Mock getProperty on the client returned by getDeviceClient for this specific test
      const specificClientMock = { ...mockAlpacaClientInstance, getProperty: vi.fn().mockResolvedValue('test-prop-value') }
      mockGetDeviceClient.mockReturnValueOnce(specificClientMock as unknown as AlpacaClient)

      // Act
      store.startCameraPropertyPolling(deviceId)

      // Assert: Initial setup
      expect(mockStopCameraPropertyPolling).toHaveBeenCalledTimes(1) // Called to clear previous timers
      expect(store._propertyPollingIntervals.has(deviceId)).toBe(true)
      expect(consoleLogSpy).toHaveBeenCalledWith(`Starting property polling for camera ${deviceId}`)
      expect(consoleLogSpy).toHaveBeenCalledWith(`Property polling started for camera ${deviceId} with interval 1000ms`)

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
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Act
      store.setPropertyPollingInterval(deviceId, tooSmallInterval)

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith(`Polling interval too small (${tooSmallInterval}ms), using 100ms minimum`)
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
        expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Device test-cam-control not found for startCameraExposure'))
        expect(mockAlpacaClientInstance.put).not.toHaveBeenCalled()
        expect(mockTrackExposureProgress).not.toHaveBeenCalled()
      })

      it('should return false and log error if client is not found', async () => {
        mockGetDeviceClient.mockReturnValueOnce(null)
        const result = await store.startCameraExposure(deviceId, duration, light)

        expect(result).toBe(false)
        expect(mockConsoleError).toHaveBeenCalledWith(
          expect.stringContaining('No client available for device test-cam-control for startCameraExposure')
        )
        expect(mockAlpacaClientInstance.put).not.toHaveBeenCalled()
        expect(mockTrackExposureProgress).not.toHaveBeenCalled()
      })
    })
  })

  describe('trackExposureProgress', () => {
    const deviceId = 'test-cam-track'
    const exposureTime = 3 // seconds
    let mockExposureDevice: UnifiedDevice
    let specificMockGetProperty: MockInstance<(propName: string) => Promise<unknown>>
    let mockHandleExposureCompleteSpy: MockInstance<(deviceId: string) => Promise<void>>
    let clearIntervalSpy: MockInstance<(id?: number) => void>

    beforeEach(() => {
      vi.useFakeTimers()
      const setupTime = Date.now()

      if (mockTrackExposureProgress && typeof mockTrackExposureProgress.mockRestore === 'function') {
        mockTrackExposureProgress.mockRestore()
      }

      specificMockGetProperty = vi.fn().mockImplementation(async (propName: string) => {
        if (propName === 'camerastate') return CameraStates.Idle
        if (propName === 'imageready') return false
        return null
      })

      const clientForTrackProgressTests = {
        ...mockAlpacaClientInstance,
        getProperty: specificMockGetProperty // Ensure this specific mock is used
      }

      mockGetDeviceClient.mockImplementation((id: string) => (id === deviceId ? (clientForTrackProgressTests as unknown as AlpacaClient) : null))

      mockExposureDevice = {
        id: deviceId,
        name: 'Test Tracking Camera',
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
          isExposing: false,
          exposureProgress: 0,
          exposureStartTime: setupTime,
          cameraState: CameraStates.Idle,
          imageready: false,
          propertyPollIntervalMs: 1000
        }
      }
      store.devices.set(deviceId, { ...mockExposureDevice })
      store.devicesArray = Array.from(store.devices.values())

      mockGetDeviceById.mockImplementation((id: string) => (id === deviceId ? store.devices.get(id) || null : null))

      // Spy on handleExposureComplete for this describe block
      mockHandleExposureCompleteSpy = vi.spyOn(store, 'handleExposureComplete').mockResolvedValue(undefined)
      clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      mockUpdateDeviceProperties.mockClear()
      mockEmitEvent.mockClear()
    })

    afterEach(() => {
      vi.useRealTimers()
      mockHandleExposureCompleteSpy.mockRestore() // Restore spy
      clearIntervalSpy.mockRestore() // Restore spy
    })

    it('should initialize device properties and start interval timer', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval')

      store.trackExposureProgress(deviceId, exposureTime)

      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(deviceId, {
        isExposing: true,
        exposureProgress: 0
      })
      expect(setIntervalSpy).toHaveBeenCalledTimes(1)
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 500) // POLLING_INTERVAL
    })

    it('should update progress based on camerastate if exposing and emit event', async () => {
      // Override specificMockGetProperty for this test case
      specificMockGetProperty.mockImplementation(async (propName: string) => {
        if (propName === 'camerastate') return CameraStates.Exposing // Exposing
        if (propName === 'imageready') return false
        return null
      })

      store.trackExposureProgress(deviceId, exposureTime) // 3 seconds exposure

      // Advance time by one interval (500ms)
      await vi.advanceTimersByTimeAsync(500)

      expect(specificMockGetProperty).toHaveBeenCalledWith('camerastate') // Corrected Assertion

      // Progress for 500ms out of 3000ms (3s) = (500/3000)*100 = 16.66... ~ 17%
      // The action logs 'Camera X state: Y', and then updates properties with cameraState and isExposing.
      // Then calculates progress.
      // Call 1: Initial isExposing: true, exposureProgress: 0
      // Call 2: camerastate update (isExposing: true, cameraState: 2)
      // Call 3: progress update (isExposing: true, exposureProgress: 17)
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(deviceId, expect.objectContaining({ exposureProgress: 17 }))

      const changedEvent = mockEmitEvent.mock.calls.find((call) => call[0].type === 'cameraExposureChanged')
      expect(changedEvent).toBeDefined()
      if (changedEvent) {
        expect(changedEvent[0]).toEqual(expect.objectContaining({ type: 'cameraExposureChanged', deviceId, percentComplete: 17 }))
      }

      // Advance time to just over half the exposure (e.g., 1600ms total, which is 3 intervals + 100ms)
      // Total elapsed: 500ms (previous) + 1100ms (current) = 1600ms
      // The setInterval fires at t=500 (prog=17), t=1000 (prog=33), t=1500 (prog=50)
      // The last progress update before time reaches 1600ms is from t=1500ms.
      await vi.advanceTimersByTimeAsync(1100)
      // Progress for 1500ms out of 3000ms = (1500/3000)*100 = 50%
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(deviceId, expect.objectContaining({ exposureProgress: 50 }))
      const changedEvent2 = mockEmitEvent.mock.calls.filter((call) => call[0].type === 'cameraExposureChanged').pop()
      expect(changedEvent2).toBeDefined()
      if (changedEvent2) {
        expect(changedEvent2[0]).toEqual(expect.objectContaining({ type: 'cameraExposureChanged', deviceId, percentComplete: 50 }))
      }
    })

    it('should call handleExposureComplete when exposure finishes and image is ready', async () => {
      const shortExposureTime = 1 // 1 second for quicker test
      mockExposureDevice.properties.exposureStartTime = Date.now() // Reset start time for this test
      store.devices.set(deviceId, { ...mockExposureDevice })

      // Phase 1: Exposing
      specificMockGetProperty.mockImplementation(async (propName: string) => {
        if (propName === 'camerastate') return CameraStates.Exposing
        if (propName === 'imageready') return false
        return null
      })

      store.trackExposureProgress(deviceId, shortExposureTime)
      await vi.advanceTimersByTimeAsync(500) // Interval 1: elapsedTime = 500ms, progress = 50%
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(deviceId, expect.objectContaining({ exposureProgress: 50 }))

      // Phase 2: Exposure time passed, camera becomes Idle, image not yet ready
      // Total time elapsed needs to be > shortExposureTime * 1000 (i.e., > 1000ms)
      // Advance by another 600ms. Total elapsed = 500 + 600 = 1100ms.
      specificMockGetProperty.mockImplementation(async (propName: string) => {
        if (propName === 'camerastate') return CameraStates.Idle // Now idle
        if (propName === 'imageready') return false // Image still not ready
        return null
      })
      await vi.advanceTimersByTimeAsync(600)
      // Action should log 'Exposure time complete, starting to poll for image ready'
      // It will then check imageready (which is false) - handleExposureComplete not called yet.
      expect(mockHandleExposureCompleteSpy).not.toHaveBeenCalled()

      // Phase 3: Camera still Idle, image becomes ready
      // Advance by another 500ms. Total elapsed = 1100 + 500 = 1600ms.
      specificMockGetProperty.mockImplementation(async (propName: string) => {
        if (propName === 'camerastate') return CameraStates.Idle
        if (propName === 'imageready') return true // Image IS NOW READY
        return null
      })
      await vi.advanceTimersByTimeAsync(500)

      expect(mockHandleExposureCompleteSpy).toHaveBeenCalledWith(deviceId)
      expect(clearIntervalSpy).toHaveBeenCalled() // Timer should be cleared
    })

    it('should fallback to time-based progress if camerastate fetch fails', async () => {
      const shortExposureTime = 2 // 2 seconds
      mockExposureDevice.properties.exposureStartTime = Date.now()
      store.devices.set(deviceId, { ...mockExposureDevice })

      // Mock getProperty to throw an error for camerastate
      specificMockGetProperty.mockImplementation(async (propName: string) => {
        if (propName === 'camerastate') {
          throw new Error('Simulated client error getting camerastate')
        }
        if (propName === 'imageready') return false
        return null
      })

      const consoleWarnSpy = vi.spyOn(console, 'warn')

      store.trackExposureProgress(deviceId, shortExposureTime)

      // Advance time by 500ms (1st interval)
      // elapsedTime = 500ms. Progress = (500 / 2000) * 100 = 25%
      await vi.advanceTimersByTimeAsync(500)
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Error checking camera state'), expect.any(Error))
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(deviceId, expect.objectContaining({ exposureProgress: 25 }))

      const exposureChangedEvents1 = mockEmitEvent.mock.calls
        .map((call) => call[0])
        .filter((event) => event.type === 'cameraExposureChanged') as Extract<DeviceEvent, { type: 'cameraExposureChanged' }>[]
      expect(exposureChangedEvents1.find((e) => e.percentComplete === 25)).toBeDefined()

      // Advance time by another 1000ms (2nd interval, total 1500ms)
      // elapsedTime = 1500ms. Progress = (1500 / 2000) * 100 = 75%
      await vi.advanceTimersByTimeAsync(1000)
      expect(consoleWarnSpy).toHaveBeenCalledTimes(3) // Corrected: Expect 3 warnings (initial + two more ticks)
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(deviceId, expect.objectContaining({ exposureProgress: 75 }))

      const exposureChangedEvents2 = mockEmitEvent.mock.calls
        .map((call) => call[0])
        .filter((event) => event.type === 'cameraExposureChanged') as Extract<DeviceEvent, { type: 'cameraExposureChanged' }>[]
      expect(exposureChangedEvents2.find((e) => e.percentComplete === 75)).toBeDefined()

      consoleWarnSpy.mockRestore()
    })

    it('should timeout if exposure exceeds MAX_WAIT_TIME', async () => {
      const longExposureTime = 10 // 10 seconds, but MAX_WAIT_TIME is 300s in source
      const MAX_WAIT_TIME_FROM_SOURCE = 300000 // As defined in cameraActions.ts
      mockExposureDevice.properties.exposureStartTime = Date.now()
      store.devices.set(deviceId, { ...mockExposureDevice })

      // Ensure camerastate remains exposing and image is never ready
      specificMockGetProperty.mockImplementation(async (propName: string) => {
        if (propName === 'camerastate') return CameraStates.Exposing
        if (propName === 'imageready') return false
        return null
      })

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      store.trackExposureProgress(deviceId, longExposureTime)

      // Advance time just past MAX_WAIT_TIME
      await vi.advanceTimersByTimeAsync(MAX_WAIT_TIME_FROM_SOURCE + 500)

      expect(consoleWarnSpy).toHaveBeenCalledWith(`Exposure for ${deviceId} exceeded maximum wait time (${MAX_WAIT_TIME_FROM_SOURCE}ms), aborting`)
      expect(clearIntervalSpy).toHaveBeenCalled()
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(deviceId, {
        isExposing: false,
        exposureProgress: 100, // As per source code on timeout
        cameraState: CameraStates.Idle // As per source code on timeout
      })
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'cameraExposureFailed',
        deviceId,
        error: 'Exposure timed out waiting for image'
      })
      expect(mockHandleExposureCompleteSpy).not.toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })

    it('should stop polling and log a warning if device disconnects during exposure', async () => {
      mockExposureDevice.properties.exposureStartTime = Date.now()
      store.devices.set(deviceId, { ...mockExposureDevice })

      // Initial state: device connected, camera exposing
      specificMockGetProperty.mockImplementation(async (propName: string) => {
        if (propName === 'camerastate') return CameraStates.Exposing
        if (propName === 'imageready') return false
        return null
      })
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      store.trackExposureProgress(deviceId, exposureTime)

      // First tick, device is connected
      await vi.advanceTimersByTimeAsync(500)
      expect(mockGetDeviceById).toHaveBeenCalledWith(deviceId) // Ensure it was called for the first tick
      expect(clearIntervalSpy).not.toHaveBeenCalled() // Not yet
      const callsBeforeDisconnect = mockUpdateDeviceProperties.mock.calls.length

      // Simulate device disconnect
      mockGetDeviceById.mockImplementation((id: string) => (id === deviceId ? null : null))
      // Verify the mock is active for the current scope
      expect(store.getDeviceById(deviceId)).toBeNull() // Explicitly check the store method with the spy applied

      // Second tick, device is now disconnected
      await vi.advanceTimersByTimeAsync(500)

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        `[UnifiedStore/cameraActions] Device ${deviceId} not found during exposure tracking interval. Clearing timer.`
      )
      expect(clearIntervalSpy).toHaveBeenCalled()
      expect(mockHandleExposureCompleteSpy).not.toHaveBeenCalled()
      // Check that no new calls to updateDeviceProperties happened for this device after disconnect simulation
      // The calls made *before* disconnect are expected (e.g. initial set, progress update)
      // So, we check if the number of calls increased *after* the point of disconnect and subsequent timer advance.
      await vi.advanceTimersByTimeAsync(500) // another tick to ensure no more calls
      expect(mockUpdateDeviceProperties.mock.calls.length).toBe(callsBeforeDisconnect)

      consoleWarnSpy.mockRestore()
    })

    it('should call handleExposureComplete and update state if camera reports an error', async () => {
      mockExposureDevice.properties.exposureStartTime = Date.now()
      store.devices.set(deviceId, { ...mockExposureDevice })

      // Camera reports error state
      specificMockGetProperty.mockImplementation(async (propName: string) => {
        if (propName === 'camerastate') return CameraStates.Error // Error state (value 5)
        return null // imageready doesn't matter here
      })

      store.trackExposureProgress(deviceId, exposureTime)

      await vi.advanceTimersByTimeAsync(500) // Let one interval pass

      expect(specificMockGetProperty).toHaveBeenCalledWith('camerastate')
      expect(clearIntervalSpy).toHaveBeenCalled()

      // Verify that the client.getProperty was called and it would have returned CameraStates.Error
      // This can be indirectly verified by the subsequent behavior.

      // According to the source, when cameraState is Error (5):
      // - clearInterval is called (asserted above)
      // - updateDeviceProperties is called with isExposing: false, cameraState: 5
      // - cameraExposureFailed event is emitted
      // - handleExposureComplete is NOT called

      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(deviceId, {
        isExposing: false,
        exposureProgress: 0, // Source sets progress to 0 on error
        cameraState: CameraStates.Error
      })

      expect(mockHandleExposureCompleteSpy).not.toHaveBeenCalled() // Should NOT be called

      const exposureFailedEvent = mockEmitEvent.mock.calls.find((call) => call[0].type === 'cameraExposureFailed')
      expect(exposureFailedEvent).toBeDefined()
      expect(exposureFailedEvent?.[0]).toEqual({
        type: 'cameraExposureFailed',
        deviceId,
        error: 'Camera reported error state'
      })
    })
  })
})
