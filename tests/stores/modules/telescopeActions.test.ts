import { describe, it, expect, beforeEach, vi, type MockInstance } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import type { createTelescopeActions } from '@/stores/modules/telescopeActions'
import type { AlpacaClient } from '@/api/AlpacaClient'
import { createAlpacaClient } from '@/api/AlpacaClient' // Actual import for mocking
import type { Device, TelescopeDevice, DeviceState } from '@/types/device.types'
import type { DeviceEvent, StoreOptions } from '@/stores/types/device-store.types'
import * as astroCoordinates from '@/utils/astroCoordinates' // Import for mocking

// Mock the AlpacaClient module
const mockAlpacaClientInstance = {
  getProperty: vi.fn(),
  setProperty: vi.fn(),
  callMethod: vi.fn(),
  // Add other methods as needed for TelescopeClient
  park: vi.fn(),
  unpark: vi.fn(),
  slewToCoordinates: vi.fn(),
  slewToAltAz: vi.fn(),
  abortSlew: vi.fn(),
  setTracking: vi.fn(),
  setGuideRateDeclination: vi.fn(),
  setGuideRateRightAscension: vi.fn(),
  setSlewSettleTime: vi.fn()
  // ... any other telescope specific client methods
}

vi.mock('@/api/AlpacaClient', () => ({
  createAlpacaClient: vi.fn((..._args: unknown[]) => mockAlpacaClientInstance as unknown as AlpacaClient)
}))

// Mock the astroCoordinates utility functions
vi.mock('@/utils/astroCoordinates', async (importOriginal) => {
  const actual = await importOriginal<typeof astroCoordinates>()
  return {
    ...actual, // Keep actual implementations for other functions if any
    parseRaString: vi.fn(),
    parseDecString: vi.fn()
  }
})

// Declare the mocked factory function
const mockedCreateAlpacaClient = createAlpacaClient as unknown as MockInstance<
  (baseUrl: string, deviceType: string, deviceNumber: number | undefined, device: Device) => AlpacaClient
>

// Define a type for the actions part of the store module
type TelescopeStoreActions = ReturnType<typeof createTelescopeActions>['actions']

describe('telescopeActions.ts', () => {
  let store: ReturnType<typeof useUnifiedStore> & TelescopeStoreActions
  let mockEmitEvent: MockInstance<(event: DeviceEvent) => void>
  let mockUpdateDeviceProperties: MockInstance<(deviceId: string, updates: Partial<Device>, options?: StoreOptions) => boolean>
  let mockGetDeviceById: MockInstance<(id: string) => Device | null>
  let mockGetDeviceClient: MockInstance<(id: string) => AlpacaClient | null>
  let mockStartTelescopePropertyPolling: MockInstance<(deviceId: string) => void>
  let mockCallDeviceMethod: MockInstance<(deviceId: string, method: string, args?: Record<string, unknown> | unknown[]) => Promise<unknown>>

  const testDeviceId = 'telescope-1'
  const mockTelescopeDevice: TelescopeDevice = {
    id: testDeviceId,
    name: 'Test Telescope',
    type: 'telescope',
    deviceNumber: 0,
    apiBaseUrl: 'http://localhost:11111',
    isConnected: true,
    isConnecting: false,
    isDisconnecting: false,
    status: 'connected' as DeviceState,
    properties: {},
    capabilities: {},
    uniqueId: 'unique-telescope-1',
    errors: []
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useUnifiedStore() as unknown as ReturnType<typeof useUnifiedStore> & TelescopeStoreActions

    // Reset mocks and setup default implementations
    vi.clearAllMocks()

    // Mock createAlpacaClient to return a fresh mock instance each time
    mockedCreateAlpacaClient.mockImplementation(
      (_baseUrl, _deviceType, _deviceNumber, _device) =>
        ({
          ...mockAlpacaClientInstance,
          getProperty: vi.fn(), // Ensure fresh vi.fn() for each test
          setProperty: vi.fn(),
          callMethod: vi.fn(),
          park: vi.fn(),
          unpark: vi.fn(),
          slewToCoordinates: vi.fn(),
          slewToAltAz: vi.fn(),
          abortSlew: vi.fn(),
          setTracking: vi.fn(),
          setGuideRateDeclination: vi.fn(),
          setGuideRateRightAscension: vi.fn(),
          setSlewSettleTime: vi.fn()
        }) as unknown as AlpacaClient
    )

    // Spy on store actions/getters
    mockEmitEvent = vi.spyOn(store as unknown as { _emitEvent: (event: DeviceEvent) => void }, '_emitEvent')
    mockUpdateDeviceProperties = vi.spyOn(store, 'updateDeviceProperties').mockReturnValue(true)
    mockGetDeviceById = vi.spyOn(store, 'getDeviceById').mockReturnValue(mockTelescopeDevice)
    mockGetDeviceClient = vi.spyOn(store, 'getDeviceClient').mockReturnValue(mockAlpacaClientInstance as unknown as AlpacaClient)
    mockStartTelescopePropertyPolling = vi.spyOn(store, 'startTelescopePropertyPolling')
    mockCallDeviceMethod = vi.spyOn(store, 'callDeviceMethod')

    // Default mock for getProperty
    mockAlpacaClientInstance.getProperty.mockImplementation(async (property: string) => {
      switch (property) {
        case 'canfindhome':
          return true
        case 'canpark':
          return true
        case 'cansetpark':
          return true
        case 'canpulseguide':
          return true
        case 'cansettracking':
          return true
        case 'canslew':
          return true
        case 'canslewaltaz':
          return true
        case 'cansync':
          return true
        case 'cansyncaltaz':
          return true
        case 'alignmentmode':
          return 0 // e.g., AltAz
        case 'equatorialsystem':
          return 2 // e.g., J2000
        case 'focallength':
          return 1000
        case 'doesrefraction':
          return true
        case 'siteelevation':
          return 100
        case 'sitelatitude':
          return 34.0
        case 'sitelongitude':
          return -118.0
        case 'trackingrates':
          return [{ Name: 'Sidereal', Minimum: 0, Maximum: 0, Value: 0 }] // Example
        default:
          return null
      }
    })
  })

  describe('fetchTelescopeProperties', () => {
    it('should fetch and update read-only telescope properties successfully', async () => {
      const result = await store.fetchTelescopeProperties(testDeviceId)

      expect(result).toBe(true)
      expect(mockGetDeviceById).toHaveBeenCalledWith(testDeviceId)
      expect(mockGetDeviceClient).toHaveBeenCalledWith(testDeviceId)

      // Check that client.getProperty was called for each read-only property
      const readOnlyProperties = [
        'canfindhome',
        'canpark',
        'cansetpark',
        'canpulseguide',
        'cansettracking',
        'canslew',
        'canslewaltaz',
        'cansync',
        'cansyncaltaz',
        'alignmentmode',
        'equatorialsystem',
        'focallength',
        'doesrefraction',
        'siteelevation',
        'sitelatitude',
        'sitelongitude',
        'trackingrates'
      ]
      expect(mockAlpacaClientInstance.getProperty).toHaveBeenCalledTimes(readOnlyProperties.length)
      readOnlyProperties.forEach((prop) => {
        expect(mockAlpacaClientInstance.getProperty).toHaveBeenCalledWith(prop)
      })

      // Check that updateDeviceProperties was called with the fetched properties
      expect(mockUpdateDeviceProperties).toHaveBeenCalledTimes(1)
      const updateCallArgs = mockUpdateDeviceProperties.mock.calls[0][1]
      expect(updateCallArgs).toEqual(
        expect.objectContaining({
          canfindhome: true,
          canpark: true,
          canPark: true, // friendly property
          canUnpark: true, // friendly property
          cansettracking: true,
          canSetTracking: true, // friendly property
          canslew: true,
          canSlew: true, // friendly property
          focallength: 1000
        })
      )

      // Check that startTelescopePropertyPolling was called
      expect(mockStartTelescopePropertyPolling).toHaveBeenCalledWith(testDeviceId)
    })

    it('should throw an error if device is not found', async () => {
      mockGetDeviceById.mockReturnValue(null)
      await expect(store.fetchTelescopeProperties(testDeviceId)).rejects.toThrow(`Device not found: ${testDeviceId}`)
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled()
      expect(mockStartTelescopePropertyPolling).not.toHaveBeenCalled()
    })

    it('should throw an error if device is not a telescope', async () => {
      mockGetDeviceById.mockReturnValue({ ...mockTelescopeDevice, type: 'camera' } as Device)
      await expect(store.fetchTelescopeProperties(testDeviceId)).rejects.toThrow(`Device ${testDeviceId} is not a telescope`)
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled()
    })

    it('should throw an error if client is not found', async () => {
      mockGetDeviceClient.mockReturnValue(null)
      await expect(store.fetchTelescopeProperties(testDeviceId)).rejects.toThrow(`No API client available for device ${testDeviceId}`)
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled()
    })

    it('should handle errors during client.getProperty calls gracefully and still return true', async () => {
      mockAlpacaClientInstance.getProperty.mockImplementation(async (property: string) => {
        if (property === 'focallength') {
          throw new Error('Simulated API error')
        }
        return 'default value'
      })

      const result = await store.fetchTelescopeProperties(testDeviceId)
      expect(result).toBe(true) // Still true as other props might be fetched

      // updateDeviceProperties should still be called, but focallength might be missing or undefined
      expect(mockUpdateDeviceProperties).toHaveBeenCalled()
      const updatedProps = mockUpdateDeviceProperties.mock.calls[0][1]
      expect(updatedProps.focallength).toBeUndefined()
      expect(updatedProps.canfindhome).toBe('default value') // Other props should be there

      expect(mockStartTelescopePropertyPolling).toHaveBeenCalledWith(testDeviceId)
    })

    it('should throw an error if getDeviceClient throws an error', async () => {
      // Simulate getDeviceClient itself throwing an error
      mockGetDeviceClient.mockImplementation(() => {
        throw new Error('Unexpected client creation error')
      })

      await expect(store.fetchTelescopeProperties(testDeviceId)).rejects.toThrow('Unexpected client creation error')
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled()
      expect(mockStartTelescopePropertyPolling).not.toHaveBeenCalled()
    })
  })

  describe('startTelescopePropertyPolling', () => {
    it('should start polling for dynamic properties if device exists and is a telescope', () => {
      store.startTelescopePropertyPolling(testDeviceId)
      // More detailed checks will involve timers and calls within the polling function itself,
      // which will be tested with _pollTelescopeStatus (or similar internal polling method if it exists)
      // For now, just check that it attempts to get the device
      expect(mockGetDeviceById).toHaveBeenCalledWith(testDeviceId)
      // We can also check if it initializes internal state if applicable, e.g., polling interval maps
      // This depends on the implementation details of TelescopeState and startTelescopePropertyPolling
    })

    it('should not start polling if device is not found', () => {
      mockGetDeviceById.mockReturnValue(null)
      store.startTelescopePropertyPolling(testDeviceId)
      // Ensure no polling logic (like setting intervals) is triggered.
      // This might require checking if internal polling maps/timers are affected, or if other functions are called.
      // For now, we confirm getDeviceById was called and returned null.
      expect(mockGetDeviceById).toHaveBeenCalledWith(testDeviceId)
      // Add specific checks here if startTelescopePropertyPolling has side effects even on device not found
      // For example, ensure updateDeviceProperties or emitEvent are not called.
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled()
      expect(mockEmitEvent).not.toHaveBeenCalled()
    })

    // TODO: Add test for case where device is not a telescope, if startTelescopePropertyPolling handles this.
    // The current implementation of startTelescopePropertyPolling does not explicitly check device.type,
    // relying on fetchTelescopeProperties to set up for the correct type.
    // If startTelescopePropertyPolling were to be called independently for a non-telescope device,
    // its behavior might be undefined or implicitly rely on telescope-specific properties not existing.

    // TODO: Test polling interval setup (default and from device properties).
    // TODO: Test devicestate usage and fallback logic if implemented in start or the polling function.
  })

  // TODO: describe('_pollTelescopeStatus', () => { ... }); // Or whatever the internal polling fn is
  // This is where we'd mock client.getProperty for dynamic props, test updateDeviceProperties calls, LST formatting, etc.

  describe('parkTelescope', () => {
    it('should call device method "park", update atpark, and emit events on success', async () => {
      mockCallDeviceMethod.mockResolvedValue(undefined) // Simulate successful park
      mockGetDeviceById.mockReturnValue({
        // Device is found and is a telescope
        ...mockTelescopeDevice,
        properties: { ...mockTelescopeDevice.properties, atpark: false } // Not parked initially
      })

      const result = await store.parkTelescope(testDeviceId)

      expect(result).toBe(true)
      expect(mockGetDeviceById).toHaveBeenCalledWith(testDeviceId)
      expect(mockCallDeviceMethod).toHaveBeenCalledWith(testDeviceId, 'park', []) // Corrected args
      // parkTelescope directly updates atpark on success
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(testDeviceId, { atpark: true })
      expect(mockEmitEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'telescopeParkStarted', deviceId: testDeviceId }))
      expect(mockEmitEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'telescopeParked', deviceId: testDeviceId }))
    })

    it('should throw, emit error, and not update atpark if callDeviceMethod fails', async () => {
      mockGetDeviceById.mockReturnValue({
        ...mockTelescopeDevice,
        properties: { ...mockTelescopeDevice.properties, atpark: false }
      })
      const apiError = new Error('Alpaca API error')
      mockCallDeviceMethod.mockRejectedValue(apiError)

      await expect(store.parkTelescope(testDeviceId)).rejects.toThrow(apiError)

      expect(mockCallDeviceMethod).toHaveBeenCalledWith(testDeviceId, 'park', [])
      expect(mockEmitEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'telescopeParkStarted', deviceId: testDeviceId }))
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'telescopeParkError',
          deviceId: testDeviceId,
          error: String(apiError) // Error is stringified in the action
        })
      )
      // Ensure atpark was not set to true
      const atParkUpdateCall = mockUpdateDeviceProperties.mock.calls.find((call) => call[1].atpark === true)
      expect(atParkUpdateCall).toBeUndefined()
    })

    it('should throw an error if device is not found and not emit park events', async () => {
      mockGetDeviceById.mockReturnValue(null)
      const expectedError = new Error(`Device not found: ${testDeviceId}`)

      await expect(store.parkTelescope(testDeviceId)).rejects.toThrow(expectedError.message)

      expect(mockCallDeviceMethod).not.toHaveBeenCalled()
      expect(mockEmitEvent).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'telescopeParkStarted' }))
      expect(mockEmitEvent).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'telescopeParkError' }))
    })

    it('should throw an error if device is not a telescope and not emit park events', async () => {
      mockGetDeviceById.mockReturnValue({ ...mockTelescopeDevice, type: 'camera' } as Device)
      const expectedError = new Error(`Device ${testDeviceId} is not a telescope`)

      await expect(store.parkTelescope(testDeviceId)).rejects.toThrow(expectedError.message)

      expect(mockCallDeviceMethod).not.toHaveBeenCalled()
      expect(mockEmitEvent).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'telescopeParkStarted' }))
      expect(mockEmitEvent).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'telescopeParkError' }))
    })
  })

  describe('unparkTelescope', () => {
    it('should call device method "unpark", update atpark, and emit events on success', async () => {
      mockCallDeviceMethod.mockResolvedValue(undefined) // Simulate successful unpark
      mockGetDeviceById.mockReturnValue({
        // Device is found, is a telescope, and is parked
        ...mockTelescopeDevice,
        properties: { ...mockTelescopeDevice.properties, atpark: true }
      })

      const result = await store.unparkTelescope(testDeviceId)

      expect(result).toBe(true)
      expect(mockGetDeviceById).toHaveBeenCalledWith(testDeviceId)
      expect(mockCallDeviceMethod).toHaveBeenCalledWith(testDeviceId, 'unpark', [])
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(testDeviceId, { atpark: false })
      expect(mockEmitEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'telescopeUnparkStarted', deviceId: testDeviceId }))
      expect(mockEmitEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'telescopeUnparked', deviceId: testDeviceId }))
    })

    it('should throw, emit error, and not update atpark if callDeviceMethod fails', async () => {
      mockGetDeviceById.mockReturnValue({
        ...mockTelescopeDevice,
        properties: { ...mockTelescopeDevice.properties, atpark: true }
      })
      const apiError = new Error('Alpaca API error for unpark')
      mockCallDeviceMethod.mockRejectedValue(apiError)

      await expect(store.unparkTelescope(testDeviceId)).rejects.toThrow(apiError)

      expect(mockCallDeviceMethod).toHaveBeenCalledWith(testDeviceId, 'unpark', [])
      expect(mockEmitEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'telescopeUnparkStarted', deviceId: testDeviceId }))
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'telescopeUnparkError',
          deviceId: testDeviceId,
          error: String(apiError)
        })
      )
      const atParkUpdateCall = mockUpdateDeviceProperties.mock.calls.find((call) => call[1].atpark === false)
      expect(atParkUpdateCall).toBeUndefined()
    })

    it('should throw an error if device is not found and not emit unpark events', async () => {
      mockGetDeviceById.mockReturnValue(null)
      const expectedErrorMsg = `Device not found: ${testDeviceId}`

      await expect(store.unparkTelescope(testDeviceId)).rejects.toThrow(expectedErrorMsg)

      expect(mockCallDeviceMethod).not.toHaveBeenCalled()
      expect(mockEmitEvent).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'telescopeUnparkStarted' }))
      expect(mockEmitEvent).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'telescopeUnparkError' }))
    })

    it('should throw an error if device is not a telescope and not emit unpark events', async () => {
      mockGetDeviceById.mockReturnValue({ ...mockTelescopeDevice, type: 'camera' } as Device)
      const expectedErrorMsg = `Device ${testDeviceId} is not a telescope`

      await expect(store.unparkTelescope(testDeviceId)).rejects.toThrow(expectedErrorMsg)

      expect(mockCallDeviceMethod).not.toHaveBeenCalled()
      expect(mockEmitEvent).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'telescopeUnparkStarted' }))
      expect(mockEmitEvent).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'telescopeUnparkError' }))
    })

    // Note: Similar to park, unparkTelescope doesn't have explicit checks for 'canunpark' (Alpaca doesn't define it)
    // or if it's already unparked before calling the device method.
    // Such conditions would result in callDeviceMethod rejecting if the device enforces them.
  })

  describe('setTelescopeTracking', () => {
    it('should set tracking state and emit devicePropertyChanged on success', async () => {
      mockCallDeviceMethod.mockResolvedValue(undefined) // Mocks for settracking and trackingrate
      mockGetDeviceById.mockReturnValue(mockTelescopeDevice)

      const result = await store.setTelescopeTracking(testDeviceId, true)

      expect(result).toBe(true)
      expect(mockGetDeviceById).toHaveBeenCalledWith(testDeviceId)
      expect(mockCallDeviceMethod).toHaveBeenCalledWith(testDeviceId, 'settracking', [true])
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(testDeviceId, { tracking: true })
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'devicePropertyChanged',
          deviceId: testDeviceId,
          property: 'tracking',
          value: { enabled: true, trackingRate: undefined }
        })
      )
    })

    it('should set tracking state and rate, and emit devicePropertyChanged on success', async () => {
      mockCallDeviceMethod.mockResolvedValue(undefined) // Mocks for settracking and trackingrate
      mockGetDeviceById.mockReturnValue(mockTelescopeDevice)
      const trackingRate = 1 // Example tracking rate (e.g., sidereal)

      const result = await store.setTelescopeTracking(testDeviceId, true, trackingRate)

      expect(result).toBe(true)
      expect(mockCallDeviceMethod).toHaveBeenCalledWith(testDeviceId, 'settracking', [true])
      expect(mockCallDeviceMethod).toHaveBeenCalledWith(testDeviceId, 'trackingrate', [trackingRate])
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(testDeviceId, { tracking: true })
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(testDeviceId, { trackingrate: trackingRate })
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'devicePropertyChanged',
          deviceId: testDeviceId,
          property: 'tracking',
          value: { enabled: true, trackingRate: trackingRate }
        })
      )
    })

    it('should return false and emit deviceApiError if callDeviceMethod for settracking fails', async () => {
      mockGetDeviceById.mockReturnValue(mockTelescopeDevice)
      const apiError = new Error('Failed to set tracking state')
      // Fail only the first call to callDeviceMethod (settracking)
      mockCallDeviceMethod.mockImplementation(async (deviceId, method) => {
        if (method === 'settracking') {
          throw apiError
        }
        return undefined // Other calls succeed
      })

      const result = await store.setTelescopeTracking(testDeviceId, true)

      expect(result).toBe(false)
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceApiError',
          deviceId: testDeviceId,
          error: `Failed to set tracking: ${apiError}`
        })
      )
    })

    it('should return false and emit deviceApiError if callDeviceMethod for trackingrate fails', async () => {
      mockGetDeviceById.mockReturnValue(mockTelescopeDevice)
      const apiError = new Error('Failed to set tracking rate')
      // Fail only the second call to callDeviceMethod (trackingrate)
      mockCallDeviceMethod.mockImplementation(async (deviceId, method) => {
        if (method === 'trackingrate') {
          throw apiError
        }
        return undefined // settracking call succeeds
      })
      const trackingRate = 1

      const result = await store.setTelescopeTracking(testDeviceId, true, trackingRate)

      expect(result).toBe(false)
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceApiError',
          deviceId: testDeviceId,
          error: `Failed to set tracking: ${apiError}` // The error message might be generic for any failure in the block
        })
      )
    })

    it('should throw an error if device is not found', async () => {
      mockGetDeviceById.mockReturnValue(null)
      await expect(store.setTelescopeTracking(testDeviceId, true)).rejects.toThrow(`Device not found: ${testDeviceId}`)
      expect(mockCallDeviceMethod).not.toHaveBeenCalled()
    })
  })

  describe('setTelescopeGuideRateDeclination', () => {
    let mockFetchTelescopeProperties: MockInstance<() => Promise<boolean>>

    beforeEach(() => {
      mockFetchTelescopeProperties = vi.spyOn(store, 'fetchTelescopeProperties').mockResolvedValue(true)
      const specificClientMock = {
        ...mockAlpacaClientInstance,
        setGuideRateDeclination: vi.fn().mockResolvedValue(undefined),
        getProperty: vi.fn()
      }
      mockGetDeviceClient.mockReturnValue(specificClientMock as unknown as AlpacaClient)
    })

    it('should call client.setGuideRateDeclination, emit event, and re-fetch properties on success', async () => {
      const rate = 0.5
      const result = await store.setTelescopeGuideRateDeclination(testDeviceId, rate)

      expect(result).toBe(true)
      expect(mockGetDeviceClient).toHaveBeenCalledWith(testDeviceId)
      const clientInstance = mockGetDeviceClient.mock.results[0].value
      expect(clientInstance.setGuideRateDeclination).toHaveBeenCalledWith(rate)
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceMethodCalled',
          deviceId: testDeviceId,
          method: 'setGuideRateDeclination',
          args: [rate],
          result: 'success'
        })
      )
      expect(mockFetchTelescopeProperties).toHaveBeenCalledWith(testDeviceId)
    })

    it('should return false and emit deviceApiError if client.setGuideRateDeclination fails', async () => {
      const rate = 0.5
      const apiError = new Error('Failed to set guide rate declination')

      const rejectingClientMock = {
        ...mockAlpacaClientInstance,
        setGuideRateDeclination: vi.fn().mockRejectedValue(apiError),
        getProperty: vi.fn()
      }
      mockGetDeviceClient.mockReturnValue(rejectingClientMock as unknown as AlpacaClient)

      const result = await store.setTelescopeGuideRateDeclination(testDeviceId, rate)

      expect(result).toBe(false)
      expect(rejectingClientMock.setGuideRateDeclination).toHaveBeenCalledWith(rate)
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceApiError',
          deviceId: testDeviceId,
          error: `Failed to set guide rate declination: ${apiError}`
        })
      )
      expect(mockFetchTelescopeProperties).not.toHaveBeenCalled()
    })

    it('should throw an error if no client is available', async () => {
      mockGetDeviceClient.mockReturnValue(null)
      const rate = 0.5
      await expect(store.setTelescopeGuideRateDeclination(testDeviceId, rate)).rejects.toThrow(
        `No Telescope client available for device ${testDeviceId}`
      )
    })
  })

  describe('setTelescopeGuideRateRightAscension', () => {
    let mockFetchTelescopeProperties: MockInstance<() => Promise<boolean>>

    beforeEach(() => {
      mockFetchTelescopeProperties = vi.spyOn(store, 'fetchTelescopeProperties').mockResolvedValue(true)
      const specificClientMock = {
        ...mockAlpacaClientInstance,
        setGuideRateRightAscension: vi.fn().mockResolvedValue(undefined),
        getProperty: vi.fn()
      }
      mockGetDeviceClient.mockReturnValue(specificClientMock as unknown as AlpacaClient)
    })

    it('should call client.setGuideRateRightAscension, emit event, and re-fetch properties on success', async () => {
      const rate = 0.75
      const result = await store.setTelescopeGuideRateRightAscension(testDeviceId, rate)

      expect(result).toBe(true)
      expect(mockGetDeviceClient).toHaveBeenCalledWith(testDeviceId)
      const clientInstance = mockGetDeviceClient.mock.results[0].value
      expect(clientInstance.setGuideRateRightAscension).toHaveBeenCalledWith(rate)
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceMethodCalled',
          deviceId: testDeviceId,
          method: 'setGuideRateRightAscension',
          args: [rate],
          result: 'success'
        })
      )
      expect(mockFetchTelescopeProperties).toHaveBeenCalledWith(testDeviceId)
    })

    it('should return false and emit deviceApiError if client.setGuideRateRightAscension fails', async () => {
      const rate = 0.75
      const apiError = new Error('Failed to set guide rate right ascension')

      const rejectingClientMock = {
        ...mockAlpacaClientInstance,
        setGuideRateRightAscension: vi.fn().mockRejectedValue(apiError),
        getProperty: vi.fn()
      }
      mockGetDeviceClient.mockReturnValue(rejectingClientMock as unknown as AlpacaClient)

      const result = await store.setTelescopeGuideRateRightAscension(testDeviceId, rate)

      expect(result).toBe(false)
      expect(rejectingClientMock.setGuideRateRightAscension).toHaveBeenCalledWith(rate)
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceApiError',
          deviceId: testDeviceId,
          error: `Failed to set guide rate RA: ${apiError}` // Corrected error message
        })
      )
      expect(mockFetchTelescopeProperties).not.toHaveBeenCalled()
    })

    it('should throw an error if no client is available', async () => {
      mockGetDeviceClient.mockReturnValue(null)
      const rate = 0.75
      await expect(store.setTelescopeGuideRateRightAscension(testDeviceId, rate)).rejects.toThrow(
        `No Telescope client available for device ${testDeviceId}`
      )
    })
  })

  describe('setTelescopeSlewSettleTime', () => {
    let mockFetchTelescopeProperties: MockInstance<() => Promise<boolean>>

    beforeEach(() => {
      mockFetchTelescopeProperties = vi.spyOn(store, 'fetchTelescopeProperties').mockResolvedValue(true)
      const specificClientMock = {
        ...mockAlpacaClientInstance,
        setSlewSettleTime: vi.fn().mockResolvedValue(undefined),
        getProperty: vi.fn()
      }
      mockGetDeviceClient.mockReturnValue(specificClientMock as unknown as AlpacaClient)
    })

    it('should call client.setSlewSettleTime, emit event, and re-fetch properties on success', async () => {
      const time = 5
      const result = await store.setTelescopeSlewSettleTime(testDeviceId, time)

      expect(result).toBe(true)
      expect(mockGetDeviceClient).toHaveBeenCalledWith(testDeviceId)
      const clientInstance = mockGetDeviceClient.mock.results[0].value
      expect(clientInstance.setSlewSettleTime).toHaveBeenCalledWith(time)
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceMethodCalled',
          deviceId: testDeviceId,
          method: 'setSlewSettleTime',
          args: [time],
          result: 'success'
        })
      )
      expect(mockFetchTelescopeProperties).toHaveBeenCalledWith(testDeviceId)
    })

    it('should return false and emit deviceApiError if client.setSlewSettleTime fails', async () => {
      const time = 5
      const apiError = new Error('Failed to set slew settle time')

      const rejectingClientMock = {
        ...mockAlpacaClientInstance,
        setSlewSettleTime: vi.fn().mockRejectedValue(apiError),
        getProperty: vi.fn()
      }
      mockGetDeviceClient.mockReturnValue(rejectingClientMock as unknown as AlpacaClient)

      const result = await store.setTelescopeSlewSettleTime(testDeviceId, time)

      expect(result).toBe(false)
      expect(rejectingClientMock.setSlewSettleTime).toHaveBeenCalledWith(time)
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceApiError',
          deviceId: testDeviceId,
          error: `Failed to set slew settle time: ${apiError}`
        })
      )
      expect(mockFetchTelescopeProperties).not.toHaveBeenCalled()
    })

    it('should throw an error if no client is available', async () => {
      mockGetDeviceClient.mockReturnValue(null)
      const time = 5
      await expect(store.setTelescopeSlewSettleTime(testDeviceId, time)).rejects.toThrow(`No Telescope client available for device ${testDeviceId}`)
    })
  })

  describe('slewToCoordinates', () => {
    const testRA = 12.5
    const testDec = 45.75

    it('should call target, slew async, update props, and emit events on success (async)', async () => {
      mockCallDeviceMethod.mockResolvedValue(undefined) // All calls succeed
      const mockDevice = {
        ...mockTelescopeDevice,
        properties: { ...mockTelescopeDevice.properties, slewing: false, tracking: true }
      }
      mockGetDeviceById.mockReturnValue(mockDevice)

      const result = await store.slewToCoordinates(testDeviceId, testRA, testDec, true)

      expect(result).toBe(true)
      expect(mockGetDeviceById).toHaveBeenCalledWith(testDeviceId)
      expect(mockCallDeviceMethod).toHaveBeenCalledWith(testDeviceId, 'targetrightascension', [{ TargetRightAscension: testRA }])
      expect(mockCallDeviceMethod).toHaveBeenCalledWith(testDeviceId, 'targetdeclination', [{ TargetDeclination: testDec }])
      expect(mockCallDeviceMethod).toHaveBeenCalledWith(testDeviceId, 'slewtocoordinatesasync', [])

      // For async, the action itself might not update slewing: true and tracking: false immediately.
      // This depends on whether the action optimistically updates or waits for polling.
      // The provided code snippet for slewToCoordinates (async) does NOT update these properties itself.
      // It only emits 'telescopeSlewStarted'. Let's assume no direct property update here.
      // expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(testDeviceId, { slewing: true, tracking: false })

      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'telescopeSlewStarted',
          deviceId: testDeviceId,
          targetRA: testRA,
          targetDec: testDec
        })
      )
    })

    it('should call target, slew sync, update props, and emit events on success (sync)', async () => {
      mockCallDeviceMethod.mockResolvedValue(undefined) // All calls succeed
      const mockDevice = {
        ...mockTelescopeDevice,
        properties: { ...mockTelescopeDevice.properties, slewing: false, tracking: true }
      }
      mockGetDeviceById.mockReturnValue(mockDevice)

      const result = await store.slewToCoordinates(testDeviceId, testRA, testDec, false) // useAsync = false

      expect(result).toBe(true)
      expect(mockCallDeviceMethod).toHaveBeenCalledWith(testDeviceId, 'targetrightascension', [{ TargetRightAscension: testRA }])
      expect(mockCallDeviceMethod).toHaveBeenCalledWith(testDeviceId, 'targetdeclination', [{ TargetDeclination: testDec }])
      expect(mockCallDeviceMethod).toHaveBeenCalledWith(testDeviceId, 'slewtocoordinates', [])

      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(testDeviceId, {
        rightascension: testRA,
        declination: testDec,
        slewing: false
      })
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'telescopeSlewStarted',
          deviceId: testDeviceId,
          targetRA: testRA,
          targetDec: testDec
        })
      )
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'telescopeSlewComplete',
          deviceId: testDeviceId,
          coordinates: { rightAscension: testRA, declination: testDec }
        })
      )
    })

    it('should throw, emit error, and not update properties if any callDeviceMethod fails', async () => {
      const apiError = new Error('Alpaca API error during slew setup')
      // Let's simulate failure on the first call (targetrightascension)
      mockCallDeviceMethod.mockImplementation(async (deviceId, method) => {
        if (method === 'targetrightascension') {
          throw apiError
        }
        return undefined
      })
      mockGetDeviceById.mockReturnValue(mockTelescopeDevice)

      await expect(store.slewToCoordinates(testDeviceId, testRA, testDec, true)).rejects.toThrow(apiError)

      expect(mockCallDeviceMethod).toHaveBeenCalledWith(testDeviceId, 'targetrightascension', [{ TargetRightAscension: testRA }])
      // SlewStarted event should not be emitted if setting target fails before that point
      // However, the current code emits slewStarted *before* the actual slew command, after setting targets.
      // Let's check the current implementation for when slewStarted is emitted. It's after target setting.
      // So if targetrightascension fails, slewStarted is NOT emitted. If targetdeclination fails, it is also NOT emitted.
      // If slewtocoordinatesasync fails, then slewStarted WOULD have been emitted.
      // For this test, where targetrightascension fails, slewStarted should not be emitted.
      expect(mockEmitEvent).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'telescopeSlewStarted' }))

      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'telescopeSlewError',
          deviceId: testDeviceId,
          error: String(apiError),
          coordinates: { rightAscension: testRA, declination: testDec }
        })
      )
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalledWith(testDeviceId, expect.objectContaining({ slewing: expect.any(Boolean) }))
    })

    it('should emit error if slewtocoordinatesasync fails (after targets are set)', async () => {
      const apiError = new Error('Alpaca API error during slewtocoordinatesasync')
      mockCallDeviceMethod.mockImplementation(async (deviceId, method) => {
        if (method === 'slewtocoordinatesasync') {
          throw apiError
        }
        return undefined // targetrightascension and targetdeclination succeed
      })
      mockGetDeviceById.mockReturnValue(mockTelescopeDevice)

      await expect(store.slewToCoordinates(testDeviceId, testRA, testDec, true)).rejects.toThrow(apiError)

      expect(mockCallDeviceMethod).toHaveBeenCalledWith(testDeviceId, 'targetrightascension', [{ TargetRightAscension: testRA }])
      expect(mockCallDeviceMethod).toHaveBeenCalledWith(testDeviceId, 'targetdeclination', [{ TargetDeclination: testDec }])
      expect(mockCallDeviceMethod).toHaveBeenCalledWith(testDeviceId, 'slewtocoordinatesasync', [])

      // SlewStarted IS emitted before the actual slew command if targets were set successfully
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'telescopeSlewStarted',
          deviceId: testDeviceId,
          targetRA: testRA,
          targetDec: testDec
        })
      )
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'telescopeSlewError',
          deviceId: testDeviceId,
          error: String(apiError),
          coordinates: { rightAscension: testRA, declination: testDec }
        })
      )
    })

    it('should throw an error if device is not found', async () => {
      mockGetDeviceById.mockReturnValue(null)
      await expect(store.slewToCoordinates(testDeviceId, testRA, testDec)).rejects.toThrow(`Device not found: ${testDeviceId}`)
    })

    it('should throw an error if device is not a telescope', async () => {
      mockGetDeviceById.mockReturnValue({ ...mockTelescopeDevice, type: 'camera' } as Device)
      await expect(store.slewToCoordinates(testDeviceId, testRA, testDec)).rejects.toThrow(`Device ${testDeviceId} is not a telescope`)
    })
  })

  describe('slewToAltAz', () => {
    const testAlt = 45.0
    const testAz = 180.0

    it('should call target, slew async, and emit events on success (async)', async () => {
      mockCallDeviceMethod.mockResolvedValue(undefined) // All calls succeed
      const mockDevice = {
        ...mockTelescopeDevice,
        properties: { ...mockTelescopeDevice.properties, slewing: false }
      }
      mockGetDeviceById.mockReturnValue(mockDevice)

      const result = await store.slewToAltAz(testDeviceId, testAlt, testAz, true)

      expect(result).toBe(true)
      expect(mockGetDeviceById).toHaveBeenCalledWith(testDeviceId)
      expect(mockCallDeviceMethod).toHaveBeenCalledWith(testDeviceId, 'targetaltitude', [{ TargetAltitude: testAlt }])
      expect(mockCallDeviceMethod).toHaveBeenCalledWith(testDeviceId, 'targetazimuth', [{ TargetAzimuth: testAz }])
      expect(mockCallDeviceMethod).toHaveBeenCalledWith(testDeviceId, 'slewtoaltazasync', [])

      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'telescopeSlewStarted',
          deviceId: testDeviceId,
          targetAlt: testAlt,
          targetAz: testAz
        })
      )
      // Async slews in the action do not directly update properties like slewing or emit SlewComplete
    })

    it('should call target, slew sync, update props, and emit events on success (sync)', async () => {
      mockCallDeviceMethod.mockResolvedValue(undefined) // All calls succeed
      const mockDevice = {
        ...mockTelescopeDevice,
        properties: { ...mockTelescopeDevice.properties, slewing: false }
      }
      mockGetDeviceById.mockReturnValue(mockDevice)

      const result = await store.slewToAltAz(testDeviceId, testAlt, testAz, false) // useAsync = false

      expect(result).toBe(true)
      expect(mockCallDeviceMethod).toHaveBeenCalledWith(testDeviceId, 'targetaltitude', [{ TargetAltitude: testAlt }])
      expect(mockCallDeviceMethod).toHaveBeenCalledWith(testDeviceId, 'targetazimuth', [{ TargetAzimuth: testAz }])
      expect(mockCallDeviceMethod).toHaveBeenCalledWith(testDeviceId, 'slewtoaltaz', [])

      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(testDeviceId, {
        altitude: testAlt,
        azimuth: testAz,
        slewing: false
      })
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'telescopeSlewStarted',
          deviceId: testDeviceId,
          targetAlt: testAlt,
          targetAz: testAz
        })
      )
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'telescopeSlewComplete',
          deviceId: testDeviceId,
          coordinates: { altitude: testAlt, azimuth: testAz }
        })
      )
    })

    it('should throw and emit error if targetaltitude fails', async () => {
      const apiError = new Error('Alpaca API error during targetaltitude')
      mockCallDeviceMethod.mockImplementation(async (deviceId, method) => {
        if (method === 'targetaltitude') {
          throw apiError
        }
        return undefined
      })
      mockGetDeviceById.mockReturnValue(mockTelescopeDevice)

      await expect(store.slewToAltAz(testDeviceId, testAlt, testAz, true)).rejects.toThrow(apiError)

      expect(mockCallDeviceMethod).toHaveBeenCalledWith(testDeviceId, 'targetaltitude', [{ TargetAltitude: testAlt }])
      // Note: The current action implementation emits SlewStarted *before* setting targets.
      // This might be a bug in the action. Let's test current behavior.
      expect(mockEmitEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'telescopeSlewStarted' }))

      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'telescopeSlewError',
          deviceId: testDeviceId,
          error: String(apiError),
          coordinates: { altitude: testAlt, azimuth: testAz }
        })
      )
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalledWith(testDeviceId, expect.objectContaining({ slewing: expect.any(Boolean) }))
    })

    it('should throw and emit error if slewtoaltazasync fails (after targets are set and SlewStarted emitted)', async () => {
      const apiError = new Error('Alpaca API error during slewtoaltazasync')
      mockCallDeviceMethod.mockImplementation(async (deviceId, method) => {
        if (method === 'slewtoaltazasync') {
          throw apiError
        }
        return undefined // targetaltitude and targetazimuth succeed
      })
      mockGetDeviceById.mockReturnValue(mockTelescopeDevice)

      await expect(store.slewToAltAz(testDeviceId, testAlt, testAz, true)).rejects.toThrow(apiError)

      expect(mockCallDeviceMethod).toHaveBeenCalledWith(testDeviceId, 'targetaltitude', [{ TargetAltitude: testAlt }])
      expect(mockCallDeviceMethod).toHaveBeenCalledWith(testDeviceId, 'targetazimuth', [{ TargetAzimuth: testAz }])
      expect(mockCallDeviceMethod).toHaveBeenCalledWith(testDeviceId, 'slewtoaltazasync', [])

      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'telescopeSlewStarted',
          deviceId: testDeviceId,
          targetAlt: testAlt,
          targetAz: testAz
        })
      )
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'telescopeSlewError',
          deviceId: testDeviceId,
          error: String(apiError),
          coordinates: { altitude: testAlt, azimuth: testAz }
        })
      )
    })

    it('should throw an error if device is not found', async () => {
      mockGetDeviceById.mockReturnValue(null)
      await expect(store.slewToAltAz(testDeviceId, testAlt, testAz)).rejects.toThrow(`Device not found: ${testDeviceId}`)
    })

    it('should throw an error if device is not a telescope', async () => {
      mockGetDeviceById.mockReturnValue({ ...mockTelescopeDevice, type: 'camera' } as Device)
      await expect(store.slewToAltAz(testDeviceId, testAlt, testAz)).rejects.toThrow(`Device ${testDeviceId} is not a telescope`)
    })
  })

  describe('slewToCoordinatesString', () => {
    const testRaString = '12:30:00'
    const testDecString = '+45:00:00'
    const parsedRA = 12.5
    const parsedDec = 45.0
    let mockSlewToCoordinates: MockInstance<(deviceId: string, rightAscension: number, declination: number, useAsync?: boolean) => Promise<boolean>>
    let mockedParseRaString: MockInstance<(raString: string) => number>
    let mockedParseDecString: MockInstance<(decString: string) => number>

    beforeEach(() => {
      // Spy on the numerical slewToCoordinates action
      mockSlewToCoordinates = vi.spyOn(store, 'slewToCoordinates').mockResolvedValue(true)

      // Get mock instances of the parsing functions
      mockedParseRaString = vi.mocked(astroCoordinates.parseRaString)
      mockedParseDecString = vi.mocked(astroCoordinates.parseDecString)

      // Default successful parsing
      mockedParseRaString.mockReturnValue(parsedRA)
      mockedParseDecString.mockReturnValue(parsedDec)

      mockGetDeviceById.mockReturnValue(mockTelescopeDevice) // Default device found
    })

    it('should parse RA/Dec strings and call slewToCoordinates with parsed values on success', async () => {
      const result = await store.slewToCoordinatesString(testDeviceId, testRaString, testDecString, true)

      expect(result).toBe(true)
      expect(mockedParseRaString).toHaveBeenCalledWith(testRaString)
      expect(mockedParseDecString).toHaveBeenCalledWith(testDecString)
      expect(mockSlewToCoordinates).toHaveBeenCalledWith(testDeviceId, parsedRA, parsedDec, true)
      // Event emission for slew started/completed is handled by the underlying slewToCoordinates,
      // so we don't need to re-test that directly here unless slewToCoordinatesString adds its own.
    })

    it('should propagate useAsync parameter to slewToCoordinates', async () => {
      await store.slewToCoordinatesString(testDeviceId, testRaString, testDecString, false) // useAsync = false
      expect(mockSlewToCoordinates).toHaveBeenCalledWith(testDeviceId, parsedRA, parsedDec, false)

      await store.slewToCoordinatesString(testDeviceId, testRaString, testDecString, true) // useAsync = true
      expect(mockSlewToCoordinates).toHaveBeenCalledWith(testDeviceId, parsedRA, parsedDec, true)

      await store.slewToCoordinatesString(testDeviceId, testRaString, testDecString) // useAsync = undefined (defaults to true in action)
      expect(mockSlewToCoordinates).toHaveBeenCalledWith(testDeviceId, parsedRA, parsedDec, true)
    })

    it('should return false and emit telescopeSlewError if parseRaString fails', async () => {
      const parseError = new Error('Invalid RA format')
      mockedParseRaString.mockImplementation(() => {
        throw parseError
      })

      const result = await store.slewToCoordinatesString(testDeviceId, testRaString, testDecString, true)

      expect(result).toBe(false)
      expect(mockSlewToCoordinates).not.toHaveBeenCalled()
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'telescopeSlewError',
          deviceId: testDeviceId,
          error: `Error parsing RA/Dec strings or slewing: ${parseError.message} (input RA: "${testRaString}", Dec: "${testDecString}")`,
          coordinates: {} // Action emits empty coordinates object on parse error
        })
      )
    })

    it('should return false and emit telescopeSlewError if parseDecString fails', async () => {
      const parseError = new Error('Invalid Dec format')
      mockedParseDecString.mockImplementation(() => {
        throw parseError
      })

      const result = await store.slewToCoordinatesString(testDeviceId, testRaString, testDecString, true)

      expect(result).toBe(false)
      expect(mockSlewToCoordinates).not.toHaveBeenCalled()
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'telescopeSlewError',
          deviceId: testDeviceId,
          error: `Error parsing RA/Dec strings or slewing: ${parseError.message} (input RA: "${testRaString}", Dec: "${testDecString}")`,
          coordinates: {} // Action emits empty coordinates object on parse error
        })
      )
    })

    it('should return false and emit telescopeSlewError if underlying slewToCoordinates fails by returning false', async () => {
      const slewErrorMsg = 'Slew failed internally'
      // Simulate the numerical slewToCoordinates action itself returning false
      // AND emitting its own error (as it normally would)
      mockSlewToCoordinates.mockImplementation(async () => {
        store._emitEvent({
          type: 'telescopeSlewError',
          deviceId: testDeviceId,
          error: slewErrorMsg,
          coordinates: { rightAscension: parsedRA, declination: parsedDec }
        } as DeviceEvent)
        return false
      })

      const result = await store.slewToCoordinatesString(testDeviceId, testRaString, testDecString, true)

      expect(result).toBe(false)
      expect(mockSlewToCoordinates).toHaveBeenCalledWith(testDeviceId, parsedRA, parsedDec, true)
      // Check that the original error from slewToCoordinates was emitted.
      // slewToCoordinatesString itself does not emit another error if the underlying action fails by returning false.
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'telescopeSlewError',
          deviceId: testDeviceId,
          error: slewErrorMsg, // This error comes from the mocked slewToCoordinates
          coordinates: { rightAscension: parsedRA, declination: parsedDec }
        })
      )
      // Ensure slewToCoordinatesString didn't emit its own redundant error event for this case
      const stringSlewErrorCalls = mockEmitEvent.mock.calls.filter((callArguments) => {
        const event = callArguments[0] // event is DeviceEvent because mockEmitEvent is MockInstance<(event: DeviceEvent) => void>
        if (event.type === 'telescopeSlewError') {
          // Within this block, TypeScript knows event is the TelescopeSlewError variant,
          // which has a mandatory 'error: string' property.
          return event.error.startsWith('Error parsing RA/Dec strings or slewing')
        }
        return false
      })
      expect(stringSlewErrorCalls.length).toBe(0) // Or check based on the specific event from slewToCoordinates
    })

    it('should return false and emit its own error if underlying slewToCoordinates throws', async () => {
      const slewException = new Error('Slew exception from numerical func')
      mockSlewToCoordinates.mockRejectedValue(slewException) // Simulate numerical slew throwing

      const result = await store.slewToCoordinatesString(testDeviceId, testRaString, testDecString, true)

      expect(result).toBe(false) // slewToCoordinatesString catches the error and returns false
      expect(mockSlewToCoordinates).toHaveBeenCalledWith(testDeviceId, parsedRA, parsedDec, true)

      // slewToCoordinatesString should emit its own error event when the underlying action throws
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'telescopeSlewError',
          deviceId: testDeviceId,
          error: `Error parsing RA/Dec strings or slewing: ${slewException.message} (input RA: "${testRaString}", Dec: "${testDecString}")`,
          coordinates: {}
        })
      )
    })

    it('should return false and emit error if device is not found', async () => {
      mockGetDeviceById.mockReturnValue(null)
      const expectedErrorMsg = `Device not found: ${testDeviceId} (input RA: "${testRaString}", Dec: "${testDecString}")`

      const result = await store.slewToCoordinatesString(testDeviceId, testRaString, testDecString)

      expect(result).toBe(false)
      expect(mockedParseRaString).not.toHaveBeenCalled()
      expect(mockedParseDecString).not.toHaveBeenCalled()
      expect(mockSlewToCoordinates).not.toHaveBeenCalled()
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'telescopeSlewError',
          deviceId: testDeviceId,
          error: expectedErrorMsg,
          coordinates: {}
        })
      )
    })

    it('should return false and emit error if device is not a telescope', async () => {
      mockGetDeviceById.mockReturnValue({ ...mockTelescopeDevice, type: 'camera' } as Device)
      const expectedErrorMsg = `Device ${testDeviceId} is not a telescope (input RA: "${testRaString}", Dec: "${testDecString}")`

      const result = await store.slewToCoordinatesString(testDeviceId, testRaString, testDecString)

      expect(result).toBe(false)
      expect(mockedParseRaString).not.toHaveBeenCalled()
      expect(mockedParseDecString).not.toHaveBeenCalled()
      expect(mockSlewToCoordinates).not.toHaveBeenCalled()
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'telescopeSlewError',
          deviceId: testDeviceId,
          error: expectedErrorMsg,
          coordinates: {}
        })
      )
    })
  })

  describe('abortSlew', () => {
    it('should call device method "abortslew", update slewing, and emit event on success', async () => {
      mockCallDeviceMethod.mockResolvedValue(undefined) // Simulate successful abort
      mockGetDeviceById.mockReturnValue(mockTelescopeDevice)

      const result = await store.abortSlew(testDeviceId)

      expect(result).toBe(true)
      expect(mockGetDeviceById).toHaveBeenCalledWith(testDeviceId)
      expect(mockCallDeviceMethod).toHaveBeenCalledWith(testDeviceId, 'abortslew', [])
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(testDeviceId, { slewing: false })
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'telescopeSlewAborted',
          deviceId: testDeviceId
        })
      )
    })

    it('should throw an error if callDeviceMethod fails', async () => {
      const apiError = new Error('Alpaca API error on abortslew')
      mockCallDeviceMethod.mockRejectedValue(apiError)
      mockGetDeviceById.mockReturnValue(mockTelescopeDevice)

      await expect(store.abortSlew(testDeviceId)).rejects.toThrow(apiError)

      expect(mockCallDeviceMethod).toHaveBeenCalledWith(testDeviceId, 'abortslew', [])
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled()
      expect(mockEmitEvent).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'telescopeSlewAborted' }))
    })

    it('should throw an error if device is not found', async () => {
      mockGetDeviceById.mockReturnValue(null)
      await expect(store.abortSlew(testDeviceId)).rejects.toThrow(`Device not found: ${testDeviceId}`)
      expect(mockCallDeviceMethod).not.toHaveBeenCalled()
    })

    it('should throw an error if device is not a telescope', async () => {
      mockGetDeviceById.mockReturnValue({ ...mockTelescopeDevice, type: 'camera' } as Device)
      await expect(store.abortSlew(testDeviceId)).rejects.toThrow(`Device ${testDeviceId} is not a telescope`)
      expect(mockCallDeviceMethod).not.toHaveBeenCalled()
    })
  })
})
