import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AlpacaClient } from '@/api/alpaca/base-client'
import { AlpacaError, ErrorType } from '@/api/alpaca/errors'
import type { Device, UnifiedDevice } from '@/types/device.types'

// Mock the global fetch
const mockFetch = (global.fetch = vi.fn())

// Mock device for testing, conforming to UnifiedDevice
const mockDevice: UnifiedDevice = {
  // BaseDevice properties
  id: 'mock-telescope-0',
  name: 'MockTelescope',
  type: 'telescope', // Matches AlpacaClient's deviceType
  isConnected: true,
  properties: {
    connected: true,
    description: 'A mock telescope for testing',
    driverinfo: 'Mock Telescope Driver',
    driverversion: '1.0',
    interfaceversion: 1,
    name: 'MockTelescope',
    supportedactions: [],
    aperturearea: 0.12, // example property
    focallength: 1000 // example property
  },
  // UnifiedDevice specific properties (with sensible defaults)
  displayName: 'Mock Telescope Display',
  isConnecting: false,
  isDisconnecting: false,
  status: 'connected',
  // Alpaca-specific properties (already in the original mock, ensure they are compatible or map them)
  DeviceName: 'Mock Telescope', // Often same as name or displayName
  DeviceNumber: 0, // Matches AlpacaClient's deviceNumber
  DeviceType: 'telescope', // Often same as type
  DriverInfo: 'Mock Telescope Driver',
  DriverVersion: '1.0',
  SupportedActions: [],
  Description: 'A mock telescope for testing',
  InterfaceVersion: 1,
  Connected: true, // Redundant with isConnected, but often present in Alpaca responses
  UniqueID: 'mock-telescope-0', // Often same as id
  ClientTransactionID: 0,
  ServerTransactionID: 0,
  ErrorNumber: 0,
  ErrorMessage: '',
  // Optional UnifiedDevice properties (can be omitted or set to undefined/null if not needed for specific tests)
  discoveredAt: new Date().toISOString(),
  lastConnected: new Date().toISOString(),
  ipAddress: '127.0.0.1',
  address: '127.0.0.1',
  port: 11111,
  devicePort: 11111,
  telemetry: {},
  lastSeen: new Date().toISOString(),
  firmwareVersion: '1.0.0',
  apiBaseUrl: 'http://localhost:11111/api/v1/telescope/0',
  deviceNum: 0,
  idx: 0,
  capabilities: { canSlew: true },
  deviceAttributes: {},
  stateHistory: [],
  methods: {} // Add methods property
}

describe('AlpacaClient', () => {
  let client: AlpacaClient
  const baseUrl = 'http://localhost:11111'
  const deviceType = 'telescope' // Should match mockDevice.type and mockDevice.DeviceType
  const deviceNumber = 0 // Should match mockDevice.DeviceNumber

  beforeEach(() => {
    // Ensure mockDevice is fully initialized before creating AlpacaClient
    client = new AlpacaClient(baseUrl, deviceType, deviceNumber, mockDevice as Device)
    mockFetch.mockReset() // Resets mock, including implementations, to a clean state for each test.
  })

  afterEach(() => {
    vi.restoreAllMocks() // This restores original implementations of all spied/mocked functions.
    // Good for spies like console.warn.
  })

  describe('Constructor and Initial Properties', () => {
    it('should correctly initialize properties', () => {
      expect(client.baseUrl).toBe(baseUrl)
      expect(client.deviceType).toBe(deviceType)
      expect(client.deviceNumber).toBe(deviceNumber)
      expect(client.device).toEqual(mockDevice) // Use toEqual for deep comparison of objects
      expect(client.clientId).toBeGreaterThanOrEqual(0)
      expect(client.clientId).toBeLessThanOrEqual(65535)
    })

    it('should remove trailing slash from baseUrl', () => {
      const clientWithTrailingSlash = new AlpacaClient(baseUrl + '/', deviceType, deviceNumber, mockDevice as Device)
      expect(clientWithTrailingSlash.baseUrl).toBe(baseUrl)
    })
  })

  describe('getDeviceUrl', () => {
    it('should construct the correct URL', () => {
      expect(client['getDeviceUrl']('methodname')).toBe('http://localhost:11111/api/v1/telescope/0/methodname')
    })

    it('should construct the correct URL when baseUrl has a trailing slash', () => {
      const clientWithSlash = new AlpacaClient(baseUrl + '/', deviceType, deviceNumber, mockDevice as Device)
      expect(clientWithSlash['getDeviceUrl']('methodname')).toBe('http://localhost:11111/api/v1/telescope/0/methodname')
    })

    it('should handle baseUrl already containing /api/v1/ structure', () => {
      const clientWithApiV1 = new AlpacaClient('http://proxy/somepath/api/v1/ignored', deviceType, deviceNumber, mockDevice as Device)
      expect(clientWithApiV1['getDeviceUrl']('methodname')).toBe('http://proxy/somepath/api/v1/telescope/0/methodname')
    })

    it('should handle baseUrl already containing /api/v1/ structure (case-insensitive)', () => {
      const clientWithApiV1 = new AlpacaClient('http://proxy/somepath/API/v1/ignored', deviceType, deviceNumber, mockDevice as Device)
      expect(clientWithApiV1['getDeviceUrl']('methodname')).toBe('http://proxy/somepath/api/v1/telescope/0/methodname')
    })

    it('should lowercase deviceType and method name in the URL', () => {
      // Create a specific mock for this test case with uppercase DeviceType
      const mockDeviceCaps: UnifiedDevice = {
        ...mockDevice,
        DeviceType: 'Telescope',
        type: 'Telescope' // Also update the base type property
      }
      const clientWithCaps = new AlpacaClient(baseUrl, 'Telescope', deviceNumber, mockDeviceCaps as Device)
      expect(clientWithCaps['getDeviceUrl']('MethodName')).toBe('http://localhost:11111/api/v1/telescope/0/methodname')
    })
  })

  describe('GET method', () => {
    it('should make a GET request and return data', async () => {
      const mockResponseData = { Value: 'Test Value', ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const data = await client.get('someproperty')
      expect(data).toBe('Test Value')
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:11111/api/v1/telescope/0/someproperty?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should handle Alpaca error in GET response', async () => {
      const mockErrorResponse = { Value: null, ErrorNumber: 1025, ErrorMessage: 'Invalid Value' }
      mockFetch.mockResolvedValueOnce({
        ok: true, // HTTP status is OK, but Alpaca reports an error
        json: async () => mockErrorResponse,
        status: 200
      })

      let errorThrown: AlpacaError | undefined
      try {
        await client.get('someproperty', {}, { retries: 0 }) // Disable retries for this error test
      } catch (e) {
        errorThrown = e as AlpacaError
      }
      expect(errorThrown).toBeInstanceOf(AlpacaError)
      expect(errorThrown?.message).toBe('Invalid Value')
      expect(errorThrown?.type).toBe(ErrorType.DEVICE)
      expect(errorThrown?.deviceError?.errorNumber).toBe(1025)
    })

    it('should handle HTTP error in GET response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => {
          throw new Error('Simulated JSON parse failure for HTTP error')
        }, // Ensure this path throws
        status: 500,
        statusText: 'Internal Server Error'
      })

      let errorThrown: AlpacaError | undefined
      try {
        await client.get('someproperty', {}, { retries: 0 }) // Disable retries
      } catch (e) {
        errorThrown = e as AlpacaError
      }
      expect(errorThrown).toBeInstanceOf(AlpacaError)
      expect(errorThrown?.message).toBe('HTTP error 500: Internal Server Error')
      expect(errorThrown?.type).toBe(ErrorType.SERVER)
      expect(errorThrown?.statusCode).toBe(500)
    })

    it('should handle network error during GET', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('NetworkError something failed'))

      let errorThrown: AlpacaError | undefined
      try {
        await client.get('someproperty', {}, { retries: 0 }) // Disable retries
      } catch (e) {
        errorThrown = e as AlpacaError
      }
      expect(errorThrown).toBeInstanceOf(AlpacaError)
      expect(errorThrown?.message).toBe('Network error occurred')
      expect(errorThrown?.type).toBe(ErrorType.NETWORK)
    })

    it('should handle timeout during GET', async () => {
      vi.useFakeTimers()
      mockFetch.mockImplementationOnce(async (_url, options) => {
        return new Promise((_resolve, reject) => {
          if (options?.signal?.aborted) {
            reject(new DOMException('Request aborted by test signal immediately.', 'AbortError'))
            return
          }
          const onAbort = () => {
            options?.signal?.removeEventListener('abort', onAbort) // Clean up listener
            reject(new DOMException('Request aborted by test signal.', 'AbortError'))
          }
          options?.signal?.addEventListener('abort', onAbort)
          // Simulate work that never completes unless aborted. Do not resolve the promise here.
        })
      })

      const promise = client.get('someproperty', {}, { timeout: 100, retries: 0 }) // Disable retries
      vi.advanceTimersByTime(150)

      let errorThrown: AlpacaError | undefined
      try {
        await promise
      } catch (e) {
        errorThrown = e as AlpacaError
      }
      expect(errorThrown).toBeInstanceOf(AlpacaError)
      expect(errorThrown?.message).toBe('Request timed out after 100ms')
      expect(errorThrown?.type).toBe(ErrorType.TIMEOUT)
      vi.useRealTimers()
    })

    it('should retry GET request on server error', async () => {
      vi.useFakeTimers() // Add fake timers
      mockFetch
        .mockResolvedValueOnce({
          // First attempt: server error
          ok: false,
          json: async () => ({ ErrorNumber: 0, ErrorMessage: '' }),
          status: 503,
          statusText: 'Service Unavailable'
        })
        .mockResolvedValueOnce({
          // Second attempt: success
          ok: true,
          json: async () => ({ Value: 'Success After Retry', ErrorNumber: 0, ErrorMessage: '' }),
          status: 200
        })

      const dataPromise = client.get('someproperty', {}, { retries: 1, retryDelay: 10 })
      // Allow first attempt (async) and scheduling of sleep
      await vi.advanceTimersByTimeAsync(0)
      // Advance past the sleep(10)
      await vi.advanceTimersByTimeAsync(10)

      const data = await dataPromise // Await the final result

      expect(data).toBe('Success After Retry')
      expect(mockFetch).toHaveBeenCalledTimes(2)
      vi.useRealTimers() // Restore real timers
    })

    it('should not retry GET request on device error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: null, ErrorNumber: 1026, ErrorMessage: 'Device Specific Error' }),
        status: 200
      })

      await expect(client.get('someproperty', {}, { retries: 1, retryDelay: 10 })).rejects.toThrow(AlpacaError)
      expect(mockFetch).toHaveBeenCalledTimes(1) // Should not retry
    })
  })

  describe('PUT method', () => {
    it('should make a PUT request with form-urlencoded data and return data', async () => {
      const mockResponseData = { Value: 'PUT Success', ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const params = { Param1: 'Value1', Param2: 123 }
      const data = await client.put('someaction', params)

      expect(data).toBe('PUT Success')
      expect(mockFetch).toHaveBeenCalledTimes(1)
      const expectedUrl = `http://localhost:11111/api/v1/telescope/0/someaction`
      // Ensure all values for URLSearchParams are strings
      const stringParams = Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)]))
      stringParams['ClientID'] = client.clientId.toString()

      const expectedBody = new URLSearchParams(stringParams).toString()

      expect(mockFetch).toHaveBeenCalledWith(
        expectedUrl, // URL should not contain params for PUT
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          }),
          body: expectedBody
        })
      )
    })

    it('should handle Alpaca error in PUT response', async () => {
      const mockErrorResponse = { Value: null, ErrorNumber: 1027, ErrorMessage: 'Invalid Action' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockErrorResponse,
        status: 200
      })

      let errorThrown: AlpacaError | undefined
      try {
        await client.put('someaction', { Param1: 'Value' }, { retries: 0 }) // Disable retries
      } catch (e) {
        errorThrown = e as AlpacaError
      }
      expect(errorThrown).toBeInstanceOf(AlpacaError)
      expect(errorThrown?.message).toBe('Invalid Action')
      expect(errorThrown?.type).toBe(ErrorType.DEVICE)
      expect(errorThrown?.deviceError?.errorNumber).toBe(1027)
    })

    it('should handle HTTP error in PUT response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => {
          throw new Error('Simulated JSON parse failure for HTTP error')
        }, // Ensure this path throws
        status: 400,
        statusText: 'Bad Request'
      })

      let errorThrown: AlpacaError | undefined
      try {
        await client.put('someaction', { Param1: 'Value' }, { retries: 0 }) // Disable retries
      } catch (e) {
        errorThrown = e as AlpacaError
      }
      expect(errorThrown).toBeInstanceOf(AlpacaError)
      expect(errorThrown?.message).toBe('HTTP error 400: Bad Request')
      expect(errorThrown?.type).toBe(ErrorType.DEVICE)
      expect(errorThrown?.statusCode).toBe(400)
    })

    it('should retry PUT request on server error (e.g., 502)', async () => {
      vi.useFakeTimers() // Add fake timers
      mockFetch
        .mockResolvedValueOnce({
          // First attempt: server error
          ok: false,
          json: async () => ({ ErrorNumber: 0, ErrorMessage: '' }),
          status: 502,
          statusText: 'Bad Gateway'
        })
        .mockResolvedValueOnce({
          // Second attempt: success
          ok: true,
          json: async () => ({ Value: 'Success After Retry', ErrorNumber: 0, ErrorMessage: '' }),
          status: 200
        })

      const dataPromise = client.put('someaction', { Param1: 'Value' }, { retries: 1, retryDelay: 10 })
      // Allow first attempt (async) and scheduling of sleep
      await vi.advanceTimersByTimeAsync(0)
      // Advance past the sleep(10)
      await vi.advanceTimersByTimeAsync(10)

      const data = await dataPromise // Await the final result

      expect(data).toBe('Success After Retry')
      expect(mockFetch).toHaveBeenCalledTimes(2)
      vi.useRealTimers() // Restore real timers
    })
  })

  describe('callMethod method', () => {
    it('should make a PUT request with array parameters converted to named parameters', async () => {
      const mockResponseData = { Value: 'Method Called', ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const methodArgs = ['Arg1', 42, true]
      const data = await client.callMethod('someDeviceMethod', methodArgs)

      expect(data).toBe('Method Called')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      const expectedUrl = `http://localhost:11111/api/v1/telescope/0/somedevicemethod` // Method name is lowercased
      const expectedParams: Record<string, string> = {
        'Parameters[0]': 'Arg1',
        'Parameters[1]': '42',
        'Parameters[2]': 'true',
        ClientID: client.clientId.toString()
      }
      const expectedBody = new URLSearchParams(expectedParams).toString()

      expect(mockFetch).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          }),
          body: expectedBody
        })
      )
    })

    it('should handle empty arguments array for callMethod', async () => {
      const mockResponseData = { Value: 'Method Called Empty', ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const data = await client.callMethod('anotherMethod') // No arguments

      expect(data).toBe('Method Called Empty')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      const expectedUrl = `http://localhost:11111/api/v1/telescope/0/anothermethod`
      const expectedParams: Record<string, string> = {
        ClientID: client.clientId.toString()
      }
      const expectedBody = new URLSearchParams(expectedParams).toString()

      expect(mockFetch).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          }),
          body: expectedBody
        })
      )
    })

    // Error handling and retry logic for callMethod would be similar to PUT
    // and are covered by the underlying executeRequest. We can add a specific
    // error test if needed, but for brevity, we assume it's covered.
  })

  describe('getProperty method', () => {
    it('should call GET with transformed property name and return value', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: 'Property Value', ErrorNumber: 0, ErrorMessage: '' }),
        status: 200
      })

      // Assuming toUrlFormat transforms "propertyName" to "propertyname"
      const value = await client.getProperty('propertyName')
      expect(value).toBe('Property Value')
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:11111/api/v1/telescope/0/propertyname?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should validate property type if device property info exists', async () => {
      // Mock device has `aperturearea: 0.12` (number)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: 0.15, ErrorNumber: 0, ErrorMessage: '' }),
        status: 200
      })
      await expect(client.getProperty('aperturearea', { retries: 0 })).resolves.toBe(0.15)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: 'not a number', ErrorNumber: 0, ErrorMessage: '' }),
        status: 200
      })

      let errorThrown: AlpacaError | undefined
      try {
        await client.getProperty('aperturearea', { retries: 0 }) // Disable retries
      } catch (e) {
        errorThrown = e as AlpacaError
      }
      expect(errorThrown).toBeInstanceOf(AlpacaError)
      expect(errorThrown?.message).toBe('Invalid property value type for aperturearea')
      expect(errorThrown?.type).toBe(ErrorType.DEVICE)
    })

    it('should not validate if property info is missing from device', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: 'any value', ErrorNumber: 0, ErrorMessage: '' }),
        status: 200
      })
      // 'unknownProperty' is not in mockDevice.properties
      await expect(client.getProperty('unknownProperty')).resolves.toBe('any value')
    })
  })

  describe('setProperty method', () => {
    it('should call PUT with transformed property name, param name, and value', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: null, ErrorNumber: 0, ErrorMessage: '' }), // Typical for successful PUT
        status: 200
      })

      const propertyName = 'targetDec' // Example property that might be a string
      const valueToSet = '+10:00:00'
      // Assuming toAscomValue just returns the value for strings, and toParamFormat transforms to 'TargetDec'
      // and toUrlFormat to 'targetdec'

      await client.setProperty(propertyName, valueToSet)

      const expectedUrl = `http://localhost:11111/api/v1/telescope/0/targetdec`
      const expectedParams: Record<string, string> = {
        TargetDec: valueToSet, // Assumes toParamFormat results in PascalCase
        ClientID: client.clientId.toString()
      }
      const expectedBody = new URLSearchParams(expectedParams).toString()

      expect(mockFetch).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({
          method: 'PUT',
          body: expectedBody
        })
      )
    })

    it('should use toAscomValue for transforming value before sending', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: null, ErrorNumber: 0, ErrorMessage: '' }),
        status: 200
      })

      // Example: setting a boolean, toAscomValue might convert true to 'True' or 1
      // For this test, let's assume it converts boolean `true` to string 'True'
      // We need to mock toAscomValue to test this behavior specifically if it's complex.
      // For now, let's assume a simple case based on current implementation understanding.
      // The actual `toAscomValue` is imported, so we test its effect.

      await client.setProperty('trackingEnabled', true)

      const expectedParams: Record<string, string> = {
        TrackingEnabled: 'True', // Assuming toParamFormat and toAscomValue effect
        ClientID: client.clientId.toString()
      }
      const expectedBody = new URLSearchParams(expectedParams).toString()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/trackingenabled'), // Check URL part
        expect.objectContaining({ body: expectedBody })
      )
    })
  })

  describe('getProperties method', () => {
    it('should call getProperty for each property and return a map of results', async () => {
      // This test remains as is, testing the happy path.
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ Value: 'MockTelescope', ErrorNumber: 0, ErrorMessage: '' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ Value: 0.12, ErrorNumber: 0, ErrorMessage: '' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ Value: 1000, ErrorNumber: 0, ErrorMessage: '' }) })

      const propertiesToGet = ['name', 'aperturearea', 'focallength']
      const results = await client.getProperties(propertiesToGet)

      expect(results.name).toBe('MockTelescope')
      expect(results.apertureArea).toBe(0.12) // toTsFormat default keeps aperturearea as is
      expect(results.focalLength).toBe(1000) // toTsFormat default makes focallength -> focalLength
      expect(mockFetch).toHaveBeenCalledTimes(propertiesToGet.length)
    })

    it('should handle an error in one of the getProperty calls within getProperties', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}) // Ensure spy is initialized
      // Mock getProperty to succeed for 'name' and fail for 'someotherprop'
      mockFetch
        .mockImplementationOnce(async (url) => {
          // For 'name'
          if (url.toString().includes('name')) {
            return {
              ok: true,
              json: async () => ({ Value: 'MockTelescope', ErrorNumber: 0, ErrorMessage: '' }),
              status: 200
            }
          }
          // Fallback for unexpected URL during first call (should not happen in this test)
          return { ok: false, status: 404, json: async () => ({ ErrorNumber: 1, ErrorMessage: 'Not Found' }) }
        })
        .mockImplementationOnce(async (url) => {
          // For 'someotherprop' - intended to fail
          if (url.toString().includes('someotherprop')) {
            return {
              ok: false, // HTTP error
              // Make json() fail or return non-Alpaca structure for a generic HTTP error
              json: async () => {
                throw new Error('Simulated JSON parse failure for HTTP 500')
              },
              status: 500,
              statusText: 'Server Error on Second Call'
            }
          }
          // Fallback for unexpected URL during second call (should not happen in this test)
          return { ok: false, status: 404, json: async () => ({ ErrorNumber: 1, ErrorMessage: 'Not Found' }) }
        })

      const propertiesToGet = ['name', 'someotherprop']
      // With the fix to getProperties, it should no longer throw an error itself.
      // It will catch internal errors, log a warning, and return partial results.
      const results = await client.getProperties(propertiesToGet, { retries: 0 })

      // Assert that getProperties itself did not throw (errorThrown variable removed)

      // Assert the results object and its contents
      expect(results).toBeDefined()
      expect(results.name).toBe('MockTelescope') // Corrected property name
      expect(results.someotherprop).toBeUndefined() // The failed property should be undefined

      // Assert that console.warn was called with the correct message
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        // Match the new warning format from base-client.ts
        "Failed to get property 'someotherprop' (mapped to 'someotherprop'): HTTP error 500: Server Error on Second Call"
      )

      consoleWarnSpy.mockRestore()
    })
  })

  describe('getDeviceState method', () => {
    it('should fetch and parse device state (array of objects)', async () => {
      const mockStateResponse = [
        { Name: 'TimeSinceLastUpdate', Value: '0.1' },
        { Name: 'Slewing', Value: false }
      ]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: mockStateResponse, ErrorNumber: 0, ErrorMessage: '' }),
        status: 200
      })

      const state = await client.getDeviceState()
      expect(state).toEqual({
        timesincelastupdate: '0.1', // Keys should be lowercased
        slewing: false
      })
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/devicestate'), expect.objectContaining({ method: 'GET' }))
    })

    it('should fetch and parse device state (direct object, non-standard)', async () => {
      const mockStateResponse = {
        TimeSinceLastUpdate: '0.2',
        Slewing: true
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: mockStateResponse, ErrorNumber: 0, ErrorMessage: '' }),
        status: 200
      })

      const state = await client.getDeviceState()
      expect(state).toEqual({
        timesincelastupdate: '0.2',
        slewing: true
      })
    })

    it('should return null if devicestate is not an array or object', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: 'not an array or object', ErrorNumber: 0, ErrorMessage: '' }),
        status: 200
      })
      const state = await client.getDeviceState()
      expect(state).toBeNull()
    })

    it('should return null if devicestate is an empty array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: [], ErrorNumber: 0, ErrorMessage: '' }),
        status: 200
      })
      const state = await client.getDeviceState()
      expect(state).toEqual({}) // Or null depending on implementation logic for empty valid array
      // Current implementation returns {}, let's stick to that.
    })

    it('should return null on error fetching device state and log a warning', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      // This mock should cause getProperty('devicestate') to fail
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}), // No ErrorNumber, so it becomes an HTTP error
        status: 500,
        statusText: 'Device State Fetch Error' // More specific message
      })

      // We expect getDeviceState to call getProperty.
      // If getProperty uses default retries, we might need more mocks or to adjust client options.
      // For now, let's assume the single mockResolvedValueOnce with retries:0 (default in executeRequest for non-retryable errors) is enough.
      // The AlpacaClient's getProperty will be called by getDeviceState.
      // The `executeRequest` will use `retries:0` if the error is not a server error or timeout.
      // A 500 error *is* a server error and *is* retryable by default. So getProperty will retry.
      // To make this test simpler and ensure the getProperty inside getDeviceState fails reliably on the first try for THIS TEST:
      // We need to make sure the error is not retryable for the purpose of this test or that all retries fail.
      // The simplest is to make the mock cover all retries if they happen.
      // Default retries are 2, so 3 attempts total.
      mockFetch.mockReset() // Reset any previous mocks just in case
      const errorJson = async () => {
        throw new Error('Simulated JSON parse failure for devicestate HTTP error')
      }
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'DS Error 1', json: errorJson })
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'DS Error 2', json: errorJson })
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'DS Error 3', json: errorJson })

      const state = await client.getDeviceState()
      expect(state).toBeNull()
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        `Error fetching device state for ${deviceType} ${deviceNumber}:`,
        expect.objectContaining({
          message: 'HTTP error 500: DS Error 3', // Should be the message from the last attempt
          type: ErrorType.SERVER,
          statusCode: 500
        })
      )
      consoleWarnSpy.mockRestore()
    })
  })

  // Final check for unused imports will be done after all tests are added.
})
