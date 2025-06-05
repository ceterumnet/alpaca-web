import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CoverCalibratorClient } from '@/api/alpaca/covercalibrator-client'
import type { Device } from '@/types/device.types'
import { AlpacaError } from '@/api/alpaca/errors'
// import type { AlpacaClient } from '@/api/alpaca/base-client' // Removed unused import
import { DEFAULT_OPTIONS } from '@/api/alpaca/types' // Import for DEFAULT_OPTIONS

// Mock an unified device for the constructor
const mockCoverCalibratorDevice = {
  DeviceName: 'MockCoverCalibrator',
  DeviceType: 'CoverCalibrator',
  DeviceNumber: 0,
  Connected: true,
  UniqueID: 'mock-covercalibrator-0',
  DriverVersion: '1.0',
  DriverInfo: 'Mock CoverCalibrator Driver',
  SupportedActions: [],
  id: 'covercalibrator-0',
  profile: { id: 'default', name: 'Default Profile' },
  settings: {},
  selected: false,
  available: true,
  properties: {},
  methods: {}
} as unknown as Device

const baseUrl = 'http://localhost:11111'
const deviceNumber = 0
let client: CoverCalibratorClient

const mockFetch = (global.fetch = vi.fn())

describe('CoverCalibratorClient', () => {
  beforeEach(() => {
    client = new CoverCalibratorClient(baseUrl, deviceNumber, mockCoverCalibratorDevice)
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // vi.useRealTimers() // Removed as we are removing fake timers from problematic tests
    // If other tests in this file use fake timers, this might need to be reinstated
    // or handled more granularly (e.g., in describe blocks that use fake timers).
    // For now, assuming no other widespread fake timer use that needs global cleanup.
  })

  it('should initialize with correct base client properties', () => {
    expect(client.baseUrl).toBe(baseUrl)
    expect(client.deviceType).toBe('covercalibrator')
    expect(client.deviceNumber).toBe(deviceNumber)
    expect(client.device).toBe(mockCoverCalibratorDevice)
    expect(client.clientId).toBeGreaterThanOrEqual(0)
    expect(client.clientId).toBeLessThanOrEqual(65535)
  })

  // GET Properties Tests
  describe('getProperty methods', () => {
    const testCases = [
      { method: 'getBrightness', propertyName: 'brightness', expectedValue: 100 },
      { method: 'getCalibratorState', propertyName: 'calibratorstate', expectedValue: 3 }, // Ready
      { method: 'getCoverState', propertyName: 'coverstate', expectedValue: 2 }, // Closed
      { method: 'getMaxBrightness', propertyName: 'maxbrightness', expectedValue: 255 },
      { method: 'getCalibratorChanging', propertyName: 'calibratorchanging', expectedValue: false },
      { method: 'getCoverMoving', propertyName: 'covermoving', expectedValue: true }
    ]

    testCases.forEach(({ method, propertyName, expectedValue }) => {
      it(`${method} should call getProperty with '${propertyName}' and return its value`, async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          statusText: 'OK',
          json: async () => ({ Value: expectedValue, ErrorNumber: 0, ErrorMessage: '' })
        })
        const result = await (client[method as keyof CoverCalibratorClient] as () => Promise<unknown>)()
        expect(result).toBe(expectedValue)
        expect(mockFetch).toHaveBeenCalledOnce()
        const fetchCall = mockFetch.mock.calls[0]
        const url = fetchCall[0]
        expect(url.toString()).toContain(`/api/v1/covercalibrator/${deviceNumber}/${propertyName.toLowerCase()}`)
        expect(fetchCall[1]?.method).toBe('GET')
      })

      it(`${method} should throw AlpacaError if fetch fails (with retries)`, async () => {
        const originalRetries = DEFAULT_OPTIONS.retries
        const originalRetryDelay = DEFAULT_OPTIONS.retryDelay
        const originalTimeout = DEFAULT_OPTIONS.timeout

        DEFAULT_OPTIONS.retries = 1
        DEFAULT_OPTIONS.retryDelay = 1
        DEFAULT_OPTIONS.timeout = 100

        expect.assertions(2)
        const errorResponse = {
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => ({ ErrorNumber: 1000, ErrorMessage: 'Device error' })
        }
        mockFetch.mockResolvedValueOnce(JSON.parse(JSON.stringify(errorResponse))).mockResolvedValueOnce(JSON.parse(JSON.stringify(errorResponse)))

        try {
          await (client[method as keyof CoverCalibratorClient] as () => Promise<unknown>)()
        } catch (error) {
          expect(error).toBeInstanceOf(AlpacaError)
        } finally {
          DEFAULT_OPTIONS.retries = originalRetries
          DEFAULT_OPTIONS.retryDelay = originalRetryDelay
          DEFAULT_OPTIONS.timeout = originalTimeout
        }
        expect(mockFetch).toHaveBeenCalledTimes(1 + 1) // Based on temporary DEFAULT_OPTIONS.retries = 1
      })
    })
  })

  // PUT Methods Tests
  describe('put methods', () => {
    it('calibratorOff should send PUT request to calibratoroff', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: null, ErrorNumber: 0, ErrorMessage: '' })
      })

      await client.calibratorOff()
      expect(mockFetch).toHaveBeenCalledOnce()
      const fetchCall = mockFetch.mock.calls[0]
      const url = fetchCall[0]
      const options = fetchCall[1]
      expect(url.toString()).toBe(`${baseUrl}/api/v1/covercalibrator/${deviceNumber}/calibratoroff`)
      expect(options?.method).toBe('PUT')
      const expectedBody = new URLSearchParams({ ClientID: client.clientId.toString() })
      expect(options?.body.toString()).toBe(expectedBody.toString())
    })

    it('calibratorOn should send PUT request to calibratoron with Brightness', async () => {
      const brightness = 150
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: null, ErrorNumber: 0, ErrorMessage: '' })
      })

      await client.calibratorOn(brightness)
      expect(mockFetch).toHaveBeenCalledOnce()
      const fetchCall = mockFetch.mock.calls[0]
      const url = fetchCall[0]
      const options = fetchCall[1]
      expect(url.toString()).toBe(`${baseUrl}/api/v1/covercalibrator/${deviceNumber}/calibratoron`)
      expect(options?.method).toBe('PUT')
      const actualParams = new URLSearchParams(options?.body.toString())
      expect(actualParams.get('Brightness')).toBe(brightness.toString())
      expect(actualParams.get('ClientID')).toBe(client.clientId.toString())
    })

    it('closeCover should send PUT request to closecover', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: null, ErrorNumber: 0, ErrorMessage: '' })
      })

      await client.closeCover()
      expect(mockFetch).toHaveBeenCalledOnce()
      const fetchCall = mockFetch.mock.calls[0]
      const url = fetchCall[0]
      const options = fetchCall[1]
      expect(url.toString()).toBe(`${baseUrl}/api/v1/covercalibrator/${deviceNumber}/closecover`)
      expect(options?.method).toBe('PUT')
      const expectedBody = new URLSearchParams({ ClientID: client.clientId.toString() })
      expect(options?.body.toString()).toBe(expectedBody.toString())
    })

    it('haltCover should send PUT request to haltcover', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: null, ErrorNumber: 0, ErrorMessage: '' })
      })

      await client.haltCover()
      expect(mockFetch).toHaveBeenCalledOnce()
      const fetchCall = mockFetch.mock.calls[0]
      const url = fetchCall[0]
      const options = fetchCall[1]
      expect(url.toString()).toBe(`${baseUrl}/api/v1/covercalibrator/${deviceNumber}/haltcover`)
      expect(options?.method).toBe('PUT')
      const expectedBody = new URLSearchParams({ ClientID: client.clientId.toString() })
      expect(options?.body.toString()).toBe(expectedBody.toString())
    })

    it('openCover should send PUT request to opencover', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: null, ErrorNumber: 0, ErrorMessage: '' })
      })

      await client.openCover()
      expect(mockFetch).toHaveBeenCalledOnce()
      const fetchCall = mockFetch.mock.calls[0]
      const url = fetchCall[0]
      const options = fetchCall[1]
      expect(url.toString()).toBe(`${baseUrl}/api/v1/covercalibrator/${deviceNumber}/opencover`)
      expect(options?.method).toBe('PUT')
      const expectedBody = new URLSearchParams({ ClientID: client.clientId.toString() })
      expect(options?.body.toString()).toBe(expectedBody.toString())
    })

    it('put methods should throw AlpacaError if fetch fails (with retries)', async () => {
      const originalRetries = DEFAULT_OPTIONS.retries
      const originalRetryDelay = DEFAULT_OPTIONS.retryDelay
      const originalTimeout = DEFAULT_OPTIONS.timeout

      DEFAULT_OPTIONS.retries = 1
      DEFAULT_OPTIONS.retryDelay = 1
      DEFAULT_OPTIONS.timeout = 100

      expect.assertions(2)
      const errorResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ ErrorNumber: 1000, ErrorMessage: 'Device error' })
      }
      mockFetch.mockResolvedValueOnce(JSON.parse(JSON.stringify(errorResponse))).mockResolvedValueOnce(JSON.parse(JSON.stringify(errorResponse)))

      try {
        await client.calibratorOff()
      } catch (error) {
        expect(error).toBeInstanceOf(AlpacaError)
      } finally {
        DEFAULT_OPTIONS.retries = originalRetries
        DEFAULT_OPTIONS.retryDelay = originalRetryDelay
        DEFAULT_OPTIONS.timeout = originalTimeout
      }
      expect(mockFetch).toHaveBeenCalledTimes(1 + 1) // Based on temporary DEFAULT_OPTIONS.retries = 1
    })
  })

  // getCoverCalibratorState Tests
  describe('getCoverCalibratorState', () => {
    it('should fetch all specified properties and return them in a record', async () => {
      const mockProperties: Record<string, unknown> = {
        brightness: 100,
        calibratorstate: 3,
        coverstate: 2,
        maxbrightness: 255,
        calibratorchanging: false,
        covermoving: true,
        connected: true, // Alpaca name
        name: 'MockCoverCalibrator',
        description: 'Mock Device',
        driverinfo: 'Mock Driver',
        driverversion: 1,
        interfaceversion: 1,
        supportedactions: []
      }

      mockFetch.mockImplementation(async (url: string) => {
        const urlObj = new URL(url.toString())
        // Correctly extract property name assuming it's the last part of the path before query params
        const pathSegments = urlObj.pathname.split('/')
        const propertyName = pathSegments[pathSegments.length - 1] || ''

        if (Object.prototype.hasOwnProperty.call(mockProperties, propertyName)) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ Value: mockProperties[propertyName], ErrorNumber: 0, ErrorMessage: '' }),
            text: async () => '' // Added text for mock completeness
          }
        }
        return { ok: false, status: 404, json: async () => ({ ErrorNumber: 1, ErrorMessage: 'Not Found' }), text: async () => 'Not Found' }
      })

      const result = await client.getCoverCalibratorState()

      // Expect TS-formatted names in the result
      expect(result.brightness).toBe(mockProperties.brightness)
      expect(result.calibratorstate).toBe(mockProperties.calibratorstate)
      expect(result.coverstate).toBe(mockProperties.coverstate)
      expect(result.maxbrightness).toBe(mockProperties.maxbrightness)
      expect(result.calibratorchanging).toBe(mockProperties.calibratorchanging)
      expect(result.covermoving).toBe(mockProperties.covermoving)
      expect(result.isConnected).toBe(mockProperties.connected)
      expect(result.name).toBe(mockProperties.name)
      expect(result.description).toBe(mockProperties.description)
      expect(result.driverInfo).toBe(mockProperties.driverinfo)
      expect(result.driverVersion).toBe(mockProperties.driverversion)
      expect(result.interfaceVersion).toBe(mockProperties.interfaceversion)
      expect(result.supportedActions).toEqual(mockProperties.supportedactions)
    })

    // Renamed test to reflect new behavior and removed (with retries) as it's now about getProperties handling
    it('should return partial data and warn if an individual property fetch fails', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const originalRetries = DEFAULT_OPTIONS.retries
      const originalRetryDelay = DEFAULT_OPTIONS.retryDelay
      const originalTimeout = DEFAULT_OPTIONS.timeout

      DEFAULT_OPTIONS.retries = 0
      DEFAULT_OPTIONS.retryDelay = 1
      DEFAULT_OPTIONS.timeout = 100

      // Define all properties that getCoverCalibratorState will try to fetch
      const expectedProperties: Record<string, unknown> = {
        brightness: null, // This one will fail
        calibratorstate: 3,
        coverstate: 2, // Assuming a default success value
        maxbrightness: 255,
        calibratorchanging: false,
        covermoving: false,
        connected: true,
        name: 'MockDevice',
        description: 'Mock Description',
        driverinfo: 'Mock DriverInfo',
        driverversion: 1,
        interfaceversion: 1,
        supportedactions: []
      }

      mockFetch.mockImplementation(async (url: string) => {
        const urlObj = new URL(url.toString())
        const pathSegments = urlObj.pathname.split('/')
        const propertyName = pathSegments[pathSegments.length - 1] || ''

        if (propertyName === 'brightness') {
          // Simulate Alpaca error for brightness
          return {
            ok: true,
            status: 200,
            json: async () => ({ Value: null, ErrorNumber: 1001, ErrorMessage: 'Brightness error' }),
            text: async () => 'Brightness error text'
          }
        }

        // For all other expected properties, return success based on expectedProperties
        if (Object.prototype.hasOwnProperty.call(expectedProperties, propertyName)) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ Value: expectedProperties[propertyName], ErrorNumber: 0, ErrorMessage: '' }),
            text: async () => ''
          }
        }

        // Fallback for any UNEXPECTED properties (should not be hit if expectedProperties is complete)
        console.error(`Unexpected property fetch in test: ${propertyName}`)
        return {
          ok: false,
          status: 404,
          json: async () => ({ ErrorNumber: 1, ErrorMessage: 'Unexpected property in test mock' }),
          text: async () => 'Unexpected property'
        }
      })

      const result = await client.getCoverCalibratorState()

      // Check that the failing property is undefined
      expect(result.brightness).toBeUndefined()
      // Check that succeeding properties are present with their TS-formatted names
      expect(result.calibratorstate).toBe(expectedProperties.calibratorstate)
      expect(result.coverstate).toBe(expectedProperties.coverstate)
      expect(result.maxbrightness).toBe(expectedProperties.maxbrightness)
      expect(result.calibratorchanging).toBe(expectedProperties.calibratorchanging)
      expect(result.covermoving).toBe(expectedProperties.covermoving)
      expect(result.isConnected).toBe(expectedProperties.connected)
      expect(result.name).toBe(expectedProperties.name)
      // ... add other checks as needed for completeness

      // Check that console.warn was called only for the 'brightness' property failure
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.any(String),
        "Failed to get property 'brightness' (mapped to 'brightness'): Brightness error"
      )
      DEFAULT_OPTIONS.retries = originalRetries
      DEFAULT_OPTIONS.retryDelay = originalRetryDelay
      DEFAULT_OPTIONS.timeout = originalTimeout
      consoleWarnSpy.mockRestore()
    })
  })
})
