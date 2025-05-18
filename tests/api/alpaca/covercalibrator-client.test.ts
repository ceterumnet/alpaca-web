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
  lastseen: Date.now(),
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
        connected: true,
        name: 'MockCoverCalibrator',
        description: 'Mock Device',
        driverinfo: 'Mock Driver',
        driverversion: '1.0',
        interfaceversion: 2, // Assuming some value
        supportedactions: []
      }

      mockFetch.mockImplementation(async (url: URL | string) => {
        const urlString = typeof url === 'string' ? url : url.toString()
        const pathOnly = urlString.split('?')[0]
        const propertyName = pathOnly.split('/').pop()?.toLowerCase()
        const value = propertyName ? mockProperties[propertyName] : undefined

        if (value !== undefined) {
          return {
            ok: true,
            json: async () => ({ Value: value, ErrorNumber: 0, ErrorMessage: '' })
          }
        }
        return {
          ok: false,
          status: 400, // ASCOM: Invalid Operation for property not implemented by device
          json: async () => ({ ErrorNumber: 0x40c, ErrorMessage: `Property ${propertyName} not implemented` })
        }
      })

      const result = await client.getCoverCalibratorState()

      expect(result).toEqual(
        expect.objectContaining({
          brightness: 100,
          calibratorstate: 3,
          coverstate: 2,
          maxbrightness: 255,
          calibratorchanging: false,
          covermoving: true,
          isConnected: true,
          name: 'MockCoverCalibrator',
          description: 'Mock Device',
          driverInfo: 'Mock Driver',
          driverVersion: 1,
          interfaceVersion: 2,
          supportedActions: []
        })
      )

      const expectedProperties = [
        'brightness',
        'calibratorstate',
        'coverstate',
        'maxbrightness',
        'calibratorchanging',
        'covermoving',
        'connected',
        'name',
        'description',
        'driverinfo',
        'driverversion',
        'interfaceversion',
        'supportedactions'
      ]
      expect(mockFetch).toHaveBeenCalledTimes(expectedProperties.length)
      expectedProperties.forEach((prop) => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/v1/covercalibrator/${deviceNumber}/${prop.toLowerCase()}`),
          expect.objectContaining({ method: 'GET' })
        )
      })
    })

    it('should reject with AlpacaError if an individual property fetch fails (with retries)', async () => {
      const originalRetries = DEFAULT_OPTIONS.retries
      const originalRetryDelay = DEFAULT_OPTIONS.retryDelay
      const originalTimeout = DEFAULT_OPTIONS.timeout

      DEFAULT_OPTIONS.retries = 1
      DEFAULT_OPTIONS.retryDelay = 1
      DEFAULT_OPTIONS.timeout = 100

      expect.assertions(2)
      const failingPropertyName = 'brightness'
      mockFetch.mockImplementation(async (url: URL | string) => {
        const currentUrlString = typeof url === 'string' ? url : url.toString()
        const pathOnly = currentUrlString.split('?')[0]
        const propertyNameFromUrl = pathOnly.split('/').pop()?.toLowerCase()

        if (propertyNameFromUrl === failingPropertyName) {
          // Return a new error object structure for each call to brightness
          return {
            ok: false,
            status: 500,
            statusText: 'Brightness Fetch Error',
            json: async () => ({ ErrorNumber: 1, ErrorMessage: 'Brightness error' })
          }
        }
        // Return a new success object structure for others
        return {
          ok: true,
          statusText: 'OK',
          json: async () => ({ Value: `mock-${propertyNameFromUrl ?? 'unknown'}`, ErrorNumber: 0, ErrorMessage: '' })
        }
      })

      try {
        await client.getCoverCalibratorState()
      } catch (error) {
        expect(error).toBeInstanceOf(AlpacaError)
      } finally {
        DEFAULT_OPTIONS.retries = originalRetries
        DEFAULT_OPTIONS.retryDelay = originalRetryDelay
        DEFAULT_OPTIONS.timeout = originalTimeout
      }

      const brightnessCalls = mockFetch.mock.calls.filter((call) => {
        const currentUrl = call[0]
        const urlStringForFilter = typeof currentUrl === 'string' ? currentUrl : currentUrl.toString()
        return urlStringForFilter.includes(`/${failingPropertyName}`)
      })
      expect(brightnessCalls.length).toBe(1 + 1) // Based on temporary DEFAULT_OPTIONS.retries = 1
    })
  })
})
