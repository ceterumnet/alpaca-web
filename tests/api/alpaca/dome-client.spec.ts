import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { DomeClient } from '@/api/alpaca/dome-client'
import type { Device } from '@/stores/types/device-store.types'
import { AlpacaError } from '@/api/alpaca/errors'
import { DEFAULT_OPTIONS } from '@/api/alpaca/types'

const mockFetch = (global.fetch = vi.fn())
const baseUrl = 'http://localhost'
const deviceNumber = 0
const mockDomeDevice = {
  DeviceNumber: deviceNumber,
  DeviceName: 'Test Dome',
  DeviceType: 'Dome',
  SupportedActions: [],
  DriverInfo: 'Test Dome Driver',
  DriverVersion: '1.0',
  Description: 'A test dome',
  UniqueID: 'uuid-dome-123',
  Connected: true,
  InterfaceVersion: 1,
  ClientTransactionID: 0,
  ServerTransactionID: 0,
  ErrorNumber: 0,
  ErrorMessage: '',
  Name: 'Test Dome',
  CanSetAltitude: true,
  CanSetAzimuth: true,
  CanSetPark: true,
  CanSetShutter: true,
  CanSlave: true,
  CanSyncAzimuth: true,
  CanFindHome: true,
  CanAbortSlew: true
} as unknown as Device // Using unknown for properties not in base Device type

let client: DomeClient

describe('DomeClient', () => {
  beforeEach(() => {
    client = new DomeClient(baseUrl, deviceNumber, mockDomeDevice as Device)
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should initialize with correct base client properties', () => {
    expect(client.deviceType).toBe('dome')
    expect(client.deviceNumber).toBe(deviceNumber)
    expect(client.device).toBe(mockDomeDevice)
    expect(client.baseUrl).toBe(baseUrl)
  })

  // TODO: Add tests for all DomeClient methods

  // Capability Methods Tests (Pattern #4)
  const capabilityMethods: { name: keyof DomeClient; alpacaName: string }[] = [
    { name: 'canFindHome', alpacaName: 'canfindhome' },
    { name: 'canPark', alpacaName: 'canpark' },
    { name: 'canSetAltitude', alpacaName: 'cansetaltitude' },
    { name: 'canSetAzimuth', alpacaName: 'cansetazimuth' },
    { name: 'canSetPark', alpacaName: 'cansetpark' },
    { name: 'canSetShutter', alpacaName: 'cansetshutter' },
    { name: 'canSlave', alpacaName: 'canslave' },
    { name: 'canSyncAzimuth', alpacaName: 'cansyncazimuth' }
  ]

  capabilityMethods.forEach(({ name, alpacaName }) => {
    describe(name, () => {
      it(`should return true when ${alpacaName} is true`, async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ Value: true, ErrorNumber: 0, ErrorMessage: '' })
        })
        // @ts-expect-error - awoiding complex typing for dynamic method call
        const result = await client[name]()
        expect(result).toBe(true)
        expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v1/dome/${deviceNumber}/${alpacaName}?ClientID=${client.clientId}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: expect.any(AbortSignal)
        })
      })

      it(`should return false when ${alpacaName} is false`, async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ Value: false, ErrorNumber: 0, ErrorMessage: '' })
        })
        // @ts-expect-error - awoiding complex typing for dynamic method call
        const result = await client[name]()
        expect(result).toBe(false)
        expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v1/dome/${deviceNumber}/${alpacaName}?ClientID=${client.clientId}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: expect.any(AbortSignal)
        })
      })

      it('should throw AlpacaError on API error', async () => {
        const originalRetries = DEFAULT_OPTIONS.retries
        const originalRetryDelay = DEFAULT_OPTIONS.retryDelay
        const originalTimeout = DEFAULT_OPTIONS.timeout
        DEFAULT_OPTIONS.retries = 0 // Typically, client-side Alpaca errors (ErrorNumber != 0 in response) are not retried
        DEFAULT_OPTIONS.retryDelay = 1
        DEFAULT_OPTIONS.timeout = 100

        try {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ Value: null, ErrorNumber: 1, ErrorMessage: 'Alpaca error' })
          })
          // @ts-expect-error - avoiding complex typing for dynamic method call
          await client[name]()
        } catch (e) {
          expect(e).toBeInstanceOf(AlpacaError)
          // @ts-expect-error - e is of type unknown
          expect(e.message).toBe('Alpaca error')
          // @ts-expect-error - e is of type unknown
          expect(e.deviceError?.errorNumber).toBe(1)
          expect(mockFetch).toHaveBeenCalledTimes(1) // No retry for this type of error by default
        } finally {
          DEFAULT_OPTIONS.retries = originalRetries
          DEFAULT_OPTIONS.retryDelay = originalRetryDelay
          DEFAULT_OPTIONS.timeout = originalTimeout
        }
      })

      it('should throw Error on network error', async () => {
        const originalRetries = DEFAULT_OPTIONS.retries
        const originalRetryDelay = DEFAULT_OPTIONS.retryDelay
        const originalTimeout = DEFAULT_OPTIONS.timeout
        DEFAULT_OPTIONS.retries = 1
        DEFAULT_OPTIONS.retryDelay = 1
        DEFAULT_OPTIONS.timeout = 100

        try {
          mockFetch.mockRejectedValue(new Error('Network error')) // mockRejectedValue for all attempts
          // @ts-expect-error - avoiding complex typing for dynamic method call
          await client[name]()
        } catch (e) {
          // @ts-expect-error - e is of type unknown
          expect(e.message).toBe('Network error')
          expect(mockFetch).toHaveBeenCalledTimes(1 + DEFAULT_OPTIONS.retries) // Original call + 1 retry
        } finally {
          DEFAULT_OPTIONS.retries = originalRetries
          DEFAULT_OPTIONS.retryDelay = originalRetryDelay
          DEFAULT_OPTIONS.timeout = originalTimeout
        }
      })
    })
  })

  // Simple GET Properties (Pattern #6)
  interface GetterTestCase {
    methodName: keyof DomeClient
    alpacaName: string
    mockValue: unknown
    expectedValue?: unknown // If different from mockValue, e.g. for type coercion
  }

  const getterTestCases: GetterTestCase[] = [
    { methodName: 'altitude', alpacaName: 'altitude', mockValue: 90.0 },
    { methodName: 'atHome', alpacaName: 'athome', mockValue: true },
    { methodName: 'atPark', alpacaName: 'atpark', mockValue: false },
    { methodName: 'azimuth', alpacaName: 'azimuth', mockValue: 180.0 },
    { methodName: 'shutterStatus', alpacaName: 'shutterstatus', mockValue: 0 /* Open */ }, // DomeShutterState.Open = 0
    { methodName: 'slaved', alpacaName: 'slaved', mockValue: true },
    { methodName: 'slewing', alpacaName: 'slewing', mockValue: false }
  ]

  getterTestCases.forEach(({ methodName, alpacaName, mockValue, expectedValue }) => {
    describe(methodName, () => {
      it(`should return the ${alpacaName} value from the API`, async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ Value: mockValue, ErrorNumber: 0, ErrorMessage: '' })
        })

        // @ts-expect-error - avoiding complex typing for dynamic method call
        const result = await client[methodName]()
        expect(result).toBe(expectedValue !== undefined ? expectedValue : mockValue)
        expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v1/dome/${deviceNumber}/${alpacaName}?ClientID=${client.clientId}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: expect.any(AbortSignal)
        })
      })

      it('should throw AlpacaError on API error', async () => {
        const originalRetries = DEFAULT_OPTIONS.retries
        const originalRetryDelay = DEFAULT_OPTIONS.retryDelay
        const originalTimeout = DEFAULT_OPTIONS.timeout
        DEFAULT_OPTIONS.retries = 0
        DEFAULT_OPTIONS.retryDelay = 1
        DEFAULT_OPTIONS.timeout = 100

        try {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ Value: null, ErrorNumber: 1, ErrorMessage: 'Alpaca error' })
          })
          // @ts-expect-error - avoiding complex typing for dynamic method call
          await client[methodName]()
        } catch (e) {
          expect(e).toBeInstanceOf(AlpacaError)
          // @ts-expect-error - e is of type unknown
          expect(e.message).toBe('Alpaca error')
          // @ts-expect-error - e is of type unknown
          expect(e.deviceError?.errorNumber).toBe(1)
          expect(mockFetch).toHaveBeenCalledTimes(1)
        } finally {
          DEFAULT_OPTIONS.retries = originalRetries
          DEFAULT_OPTIONS.retryDelay = originalRetryDelay
          DEFAULT_OPTIONS.timeout = originalTimeout
        }
      })

      it('should throw Error on network error', async () => {
        const originalRetries = DEFAULT_OPTIONS.retries
        const originalRetryDelay = DEFAULT_OPTIONS.retryDelay
        const originalTimeout = DEFAULT_OPTIONS.timeout
        DEFAULT_OPTIONS.retries = 1
        DEFAULT_OPTIONS.retryDelay = 1
        DEFAULT_OPTIONS.timeout = 100

        try {
          mockFetch.mockRejectedValue(new Error('Network error'))
          // @ts-expect-error - avoiding complex typing for dynamic method call
          await client[methodName]()
        } catch (e) {
          // @ts-expect-error - e is of type unknown
          expect(e.message).toBe('Network error')
          expect(mockFetch).toHaveBeenCalledTimes(1 + DEFAULT_OPTIONS.retries)
        } finally {
          DEFAULT_OPTIONS.retries = originalRetries
          DEFAULT_OPTIONS.retryDelay = originalRetryDelay
          DEFAULT_OPTIONS.timeout = originalTimeout
        }
      })
    })
  })

  // Action Methods (PUT with no parameters - Pattern #5)
  interface ActionTestCase {
    methodName: keyof DomeClient
    alpacaName: string
  }

  const actionTestCases: ActionTestCase[] = [
    { methodName: 'openShutter', alpacaName: 'openshutter' },
    { methodName: 'closeShutter', alpacaName: 'closeshutter' },
    { methodName: 'parkDome', alpacaName: 'park' },
    { methodName: 'findHomeDome', alpacaName: 'findhome' },
    { methodName: 'abortSlewDome', alpacaName: 'abortslew' },
    { methodName: 'setPark', alpacaName: 'setpark' } // Sets current Az/Alt as park
  ]

  actionTestCases.forEach(({ methodName, alpacaName }) => {
    describe(methodName, () => {
      it('should send a PUT request to the correct endpoint', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ Value: null, ErrorNumber: 0, ErrorMessage: '' })
        })

        // @ts-expect-error - avoiding complex typing for dynamic method call
        await client[methodName]()

        const expectedBody = new URLSearchParams()
        expectedBody.append('ClientID', client.clientId.toString())

        expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v1/dome/${deviceNumber}/${alpacaName}`, {
          method: 'PUT',
          headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
          body: expectedBody.toString(),
          signal: expect.any(AbortSignal)
        })
      })

      it('should throw AlpacaError on API error', async () => {
        const originalRetries = DEFAULT_OPTIONS.retries
        const originalRetryDelay = DEFAULT_OPTIONS.retryDelay
        const originalTimeout = DEFAULT_OPTIONS.timeout
        DEFAULT_OPTIONS.retries = 0
        DEFAULT_OPTIONS.retryDelay = 1
        DEFAULT_OPTIONS.timeout = 100

        try {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ Value: null, ErrorNumber: 1, ErrorMessage: 'Alpaca error' })
          })
          // @ts-expect-error - avoiding complex typing for dynamic method call
          await client[methodName]()
        } catch (e) {
          expect(e).toBeInstanceOf(AlpacaError)
          // @ts-expect-error - e is of type unknown
          expect(e.message).toBe('Alpaca error')
          // @ts-expect-error - e is of type unknown
          expect(e.deviceError?.errorNumber).toBe(1)
          expect(mockFetch).toHaveBeenCalledTimes(1)
        } finally {
          DEFAULT_OPTIONS.retries = originalRetries
          DEFAULT_OPTIONS.retryDelay = originalRetryDelay
          DEFAULT_OPTIONS.timeout = originalTimeout
        }
      })

      it('should throw Error on network error', async () => {
        const originalRetries = DEFAULT_OPTIONS.retries
        const originalRetryDelay = DEFAULT_OPTIONS.retryDelay
        const originalTimeout = DEFAULT_OPTIONS.timeout
        DEFAULT_OPTIONS.retries = 1
        DEFAULT_OPTIONS.retryDelay = 1
        DEFAULT_OPTIONS.timeout = 100

        try {
          mockFetch.mockRejectedValue(new Error('Network error'))
          // @ts-expect-error - avoiding complex typing for dynamic method call
          await client[methodName]()
        } catch (e) {
          // @ts-expect-error - e is of type unknown
          expect(e.message).toBe('Network error')
          expect(mockFetch).toHaveBeenCalledTimes(1 + DEFAULT_OPTIONS.retries)
        } finally {
          DEFAULT_OPTIONS.retries = originalRetries
          DEFAULT_OPTIONS.retryDelay = originalRetryDelay
          DEFAULT_OPTIONS.timeout = originalTimeout
        }
      })
    })
  })

  // PUT Methods with parameters (Pattern #5)
  describe('slewToAltitude', () => {
    const altitude = 45.0
    it('should send PUT request with Altitude parameter', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: null, ErrorNumber: 0, ErrorMessage: '' }) })
      await client.slewToAltitude(altitude)
      const expectedBody = new URLSearchParams()
      expectedBody.append('Altitude', altitude.toString())
      expectedBody.append('ClientID', client.clientId.toString())
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v1/dome/${deviceNumber}/slewtoaltitude`, {
        method: 'PUT',
        headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: expectedBody.toString(),
        signal: expect.any(AbortSignal)
      })
    })
    it('should throw AlpacaError on API error', async () => {
      const originalRetries = DEFAULT_OPTIONS.retries
      const originalRetryDelay = DEFAULT_OPTIONS.retryDelay
      const originalTimeout = DEFAULT_OPTIONS.timeout
      DEFAULT_OPTIONS.retries = 0
      DEFAULT_OPTIONS.retryDelay = 1
      DEFAULT_OPTIONS.timeout = 100
      try {
        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: null, ErrorNumber: 1, ErrorMessage: 'Alpaca error' }) })
        await client.slewToAltitude(altitude)
      } catch (e) {
        expect(e).toBeInstanceOf(AlpacaError)
        // @ts-expect-error - e is of type unknown
        expect(e.message).toBe('Alpaca error')
        // @ts-expect-error - e is of type unknown
        expect(e.deviceError?.errorNumber).toBe(1)
        expect(mockFetch).toHaveBeenCalledTimes(1)
      } finally {
        DEFAULT_OPTIONS.retries = originalRetries
        DEFAULT_OPTIONS.retryDelay = originalRetryDelay
        DEFAULT_OPTIONS.timeout = originalTimeout
      }
    })
    it('should throw Error on network error', async () => {
      const originalRetries = DEFAULT_OPTIONS.retries
      const originalRetryDelay = DEFAULT_OPTIONS.retryDelay
      const originalTimeout = DEFAULT_OPTIONS.timeout
      DEFAULT_OPTIONS.retries = 1
      DEFAULT_OPTIONS.retryDelay = 1
      DEFAULT_OPTIONS.timeout = 100
      try {
        mockFetch.mockRejectedValue(new Error('Network error'))
        await client.slewToAltitude(altitude)
      } catch (e) {
        // @ts-expect-error - e is of type unknown
        expect(e.message).toBe('Network error')
        expect(mockFetch).toHaveBeenCalledTimes(1 + DEFAULT_OPTIONS.retries)
      } finally {
        DEFAULT_OPTIONS.retries = originalRetries
        DEFAULT_OPTIONS.retryDelay = originalRetryDelay
        DEFAULT_OPTIONS.timeout = originalTimeout
      }
    })
  })

  describe('slewToAzimuth', () => {
    const azimuth = 120.0
    it('should send PUT request with Azimuth parameter', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: null, ErrorNumber: 0, ErrorMessage: '' }) })
      await client.slewToAzimuth(azimuth)
      const expectedBody = new URLSearchParams()
      expectedBody.append('Azimuth', azimuth.toString())
      expectedBody.append('ClientID', client.clientId.toString())
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v1/dome/${deviceNumber}/slewtoazimuth`, {
        method: 'PUT',
        headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: expectedBody.toString(),
        signal: expect.any(AbortSignal)
      })
    })
    it('should throw AlpacaError on API error', async () => {
      const originalRetries = DEFAULT_OPTIONS.retries
      const originalRetryDelay = DEFAULT_OPTIONS.retryDelay
      const originalTimeout = DEFAULT_OPTIONS.timeout
      DEFAULT_OPTIONS.retries = 0
      DEFAULT_OPTIONS.retryDelay = 1
      DEFAULT_OPTIONS.timeout = 100
      try {
        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: null, ErrorNumber: 1, ErrorMessage: 'Alpaca error' }) })
        await client.slewToAzimuth(azimuth)
      } catch (e) {
        expect(e).toBeInstanceOf(AlpacaError)
        // @ts-expect-error - e is of type unknown
        expect(e.message).toBe('Alpaca error')
        // @ts-expect-error - e is of type unknown
        expect(e.deviceError?.errorNumber).toBe(1)
        expect(mockFetch).toHaveBeenCalledTimes(1)
      } finally {
        DEFAULT_OPTIONS.retries = originalRetries
        DEFAULT_OPTIONS.retryDelay = originalRetryDelay
        DEFAULT_OPTIONS.timeout = originalTimeout
      }
    })
    it('should throw Error on network error', async () => {
      const originalRetries = DEFAULT_OPTIONS.retries
      const originalRetryDelay = DEFAULT_OPTIONS.retryDelay
      const originalTimeout = DEFAULT_OPTIONS.timeout
      DEFAULT_OPTIONS.retries = 1
      DEFAULT_OPTIONS.retryDelay = 1
      DEFAULT_OPTIONS.timeout = 100
      try {
        mockFetch.mockRejectedValue(new Error('Network error'))
        await client.slewToAzimuth(azimuth)
      } catch (e) {
        // @ts-expect-error - e is of type unknown
        expect(e.message).toBe('Network error')
        expect(mockFetch).toHaveBeenCalledTimes(1 + DEFAULT_OPTIONS.retries)
      } finally {
        DEFAULT_OPTIONS.retries = originalRetries
        DEFAULT_OPTIONS.retryDelay = originalRetryDelay
        DEFAULT_OPTIONS.timeout = originalTimeout
      }
    })
  })

  describe('syncToAzimuth', () => {
    const azimuth = 270.0
    it('should send PUT request with Azimuth parameter', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: null, ErrorNumber: 0, ErrorMessage: '' }) })
      await client.syncToAzimuth(azimuth)
      const expectedBody = new URLSearchParams()
      expectedBody.append('Azimuth', azimuth.toString())
      expectedBody.append('ClientID', client.clientId.toString())
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v1/dome/${deviceNumber}/synctoazimuth`, {
        method: 'PUT',
        headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: expectedBody.toString(),
        signal: expect.any(AbortSignal)
      })
    })
    it('should throw AlpacaError on API error', async () => {
      const originalRetries = DEFAULT_OPTIONS.retries
      const originalRetryDelay = DEFAULT_OPTIONS.retryDelay
      const originalTimeout = DEFAULT_OPTIONS.timeout
      DEFAULT_OPTIONS.retries = 0
      DEFAULT_OPTIONS.retryDelay = 1
      DEFAULT_OPTIONS.timeout = 100
      try {
        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: null, ErrorNumber: 1, ErrorMessage: 'Alpaca error' }) })
        await client.syncToAzimuth(azimuth)
      } catch (e) {
        expect(e).toBeInstanceOf(AlpacaError)
        // @ts-expect-error - e is of type unknown
        expect(e.message).toBe('Alpaca error')
        // @ts-expect-error - e is of type unknown
        expect(e.deviceError?.errorNumber).toBe(1)
        expect(mockFetch).toHaveBeenCalledTimes(1)
      } finally {
        DEFAULT_OPTIONS.retries = originalRetries
        DEFAULT_OPTIONS.retryDelay = originalRetryDelay
        DEFAULT_OPTIONS.timeout = originalTimeout
      }
    })
    it('should throw Error on network error', async () => {
      const originalRetries = DEFAULT_OPTIONS.retries
      const originalRetryDelay = DEFAULT_OPTIONS.retryDelay
      const originalTimeout = DEFAULT_OPTIONS.timeout
      DEFAULT_OPTIONS.retries = 1
      DEFAULT_OPTIONS.retryDelay = 1
      DEFAULT_OPTIONS.timeout = 100
      try {
        mockFetch.mockRejectedValue(new Error('Network error'))
        await client.syncToAzimuth(azimuth)
      } catch (e) {
        // @ts-expect-error - e is of type unknown
        expect(e.message).toBe('Network error')
        expect(mockFetch).toHaveBeenCalledTimes(1 + DEFAULT_OPTIONS.retries)
      } finally {
        DEFAULT_OPTIONS.retries = originalRetries
        DEFAULT_OPTIONS.retryDelay = originalRetryDelay
        DEFAULT_OPTIONS.timeout = originalTimeout
      }
    })
  })

  // Property Setters (Pattern #7)
  describe('setSlaved', () => {
    const testCases = [
      { value: true, expectedParamValue: 'True' },
      { value: false, expectedParamValue: 'False' }
    ]

    testCases.forEach(({ value, expectedParamValue }) => {
      it(`should send PUT request with Slaved=${expectedParamValue} when called with ${value}`, async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: null, ErrorNumber: 0, ErrorMessage: '' }) })
        await client.setSlaved(value)

        const expectedBody = new URLSearchParams()
        expectedBody.append('Slaved', expectedParamValue)
        expectedBody.append('ClientID', client.clientId.toString())

        expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v1/dome/${deviceNumber}/slaved`, {
          method: 'PUT',
          headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
          body: expectedBody.toString(),
          signal: expect.any(AbortSignal)
        })
      })
    })

    it('should throw AlpacaError on API error', async () => {
      const originalRetries = DEFAULT_OPTIONS.retries
      const originalRetryDelay = DEFAULT_OPTIONS.retryDelay
      const originalTimeout = DEFAULT_OPTIONS.timeout
      DEFAULT_OPTIONS.retries = 0
      DEFAULT_OPTIONS.retryDelay = 1
      DEFAULT_OPTIONS.timeout = 100

      try {
        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: null, ErrorNumber: 1, ErrorMessage: 'Alpaca error' }) })
        await client.setSlaved(true)
      } catch (e) {
        expect(e).toBeInstanceOf(AlpacaError)
        // @ts-expect-error - e is of type unknown
        expect(e.message).toBe('Alpaca error')
        // @ts-expect-error - e is of type unknown
        expect(e.deviceError?.errorNumber).toBe(1)
        expect(mockFetch).toHaveBeenCalledTimes(1)
      } finally {
        DEFAULT_OPTIONS.retries = originalRetries
        DEFAULT_OPTIONS.retryDelay = originalRetryDelay
        DEFAULT_OPTIONS.timeout = originalTimeout
      }
    })

    it('should throw Error on network error', async () => {
      const originalRetries = DEFAULT_OPTIONS.retries
      const originalRetryDelay = DEFAULT_OPTIONS.retryDelay
      const originalTimeout = DEFAULT_OPTIONS.timeout
      DEFAULT_OPTIONS.retries = 1
      DEFAULT_OPTIONS.retryDelay = 1
      DEFAULT_OPTIONS.timeout = 100

      try {
        mockFetch.mockRejectedValue(new Error('Network error'))
        await client.setSlaved(true)
      } catch (e) {
        // @ts-expect-error - e is of type unknown
        expect(e.message).toBe('Network error')
        expect(mockFetch).toHaveBeenCalledTimes(1 + DEFAULT_OPTIONS.retries)
      } finally {
        DEFAULT_OPTIONS.retries = originalRetries
        DEFAULT_OPTIONS.retryDelay = originalRetryDelay
        DEFAULT_OPTIONS.timeout = originalTimeout
      }
    })
  })

  // Complex Getter Methods (Simplified Pattern #8)
  describe('getDomeState', () => {
    it('should fetch all specified dome properties and return them', async () => {
      // Expected final result from client.getDomeState() - keys are camelCased by toTsFormat
      const mockDomeStateResponseFinal = {
        altitude: 45,
        atHome: false, // Mapped by toTsFormat from 'athome'
        atPark: false, // Mapped by toTsFormat from 'atpark'
        azimuth: 180,
        canFindHome: true, // Mapped by toTsFormat from 'canfindhome'
        canPark: true, // Mapped by toTsFormat from 'canpark'
        // Properties NOT in propertyNameFormats map, toTsFormat likely returns them as-is (lowercase)
        // or if they are in the map and map to camelCase, they are camelCased.
        cansetaltitude: true,
        cansetazimuth: true,
        canSetPark: true, // Mapped to 'canSetPark' by toTsFormat from 'cansetpark'
        cansetshutter: true,
        canslave: true,
        cansyncazimuth: true,
        shutterStatus: 0, // Mapped by toTsFormat from 'shutterstatus'
        slaved: false,
        slewing: false,
        isConnected: true, // Mapped by toTsFormat from 'connected'
        description: 'Test Dome Device', // Mapped by toTsFormat from 'description'
        driverInfo: 'Test Driver', // Mapped by toTsFormat from 'driverinfo'
        driverVersion: 1.0, // Value after fromAscomValue (assuming it becomes number)
        name: 'Dome', // Mapped by toTsFormat from 'name'
        interfaceVersion: 1, // Mapped by toTsFormat from 'interfaceversion'
        supportedActions: [] // Mapped by toTsFormat from 'supportedactions'
      }

      // Values returned by individual getProperty(alpacaPropName) calls (raw-ish)
      const alpacaPropertyValues: Record<string, unknown> = {
        altitude: 45,
        athome: false,
        atpark: false,
        azimuth: 180,
        canfindhome: true,
        canpark: true,
        cansetaltitude: true, // These are lowercase as they are the Alpaca prop names
        cansetazimuth: true,
        cansetpark: true,
        cansetshutter: true,
        canslave: true,
        cansyncazimuth: true,
        shutterstatus: 0,
        slaved: false,
        slewing: false,
        connected: true,
        description: 'Test Dome Device',
        driverinfo: 'Test Driver',
        driverversion: '1.0', // String, as device might send, fromAscomValue handles conversion
        name: 'Dome',
        interfaceversion: 1,
        supportedactions: []
      }

      mockFetch.mockImplementation(async (url: string) => {
        const alpacaPropertyName = url.substring(url.lastIndexOf('/') + 1, url.indexOf('?'))
        const valueToReturn: unknown = alpacaPropertyValues[alpacaPropertyName]
        if (valueToReturn !== undefined) {
          return Promise.resolve({ ok: true, json: async () => ({ Value: valueToReturn, ErrorNumber: 0, ErrorMessage: '' }) })
        }
        return Promise.reject(new Error(`Unexpected property request in getDomeState mock: ${alpacaPropertyName}`))
      })

      const result = await client.getDomeState()
      expect(result).toEqual(mockDomeStateResponseFinal)

      const expectedPropertiesToFetch = Object.keys(alpacaPropertyValues)
      expect(mockFetch).toHaveBeenCalledTimes(expectedPropertiesToFetch.length)
      expectedPropertiesToFetch.forEach((prop) => {
        const expectedUrl = `${baseUrl}/api/v1/dome/${deviceNumber}/${prop.toLowerCase()}?ClientID=${client.clientId}`
        expect(mockFetch).toHaveBeenCalledWith(expectedUrl, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: expect.any(AbortSignal)
        })
      })
    })
  })
})
