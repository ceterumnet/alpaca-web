import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ObservingConditionsClient } from '@/api/alpaca/observingconditions-client'
import { AlpacaError } from '@/api/alpaca/errors'
import type { UnifiedDevice, ObservingConditionsDevice, DeviceStatus } from '@/types/device.types'
import { DEFAULT_OPTIONS, type RequestOptions } from '@/api/alpaca/types'

const mockFetch = (global.fetch = vi.fn())
// const globalBaseUrl = 'http://localhost' // Removed unused variable
const globalDeviceNumber = 0

const mockAlpacaDeviceProperties = {
  DeviceNumber: globalDeviceNumber,
  DeviceName: 'Mock ObservingConditions Alpaca',
  DeviceType: 'observingconditions', // Corrected to lowercase
  DriverVersion: '1.0',
  SupportedActions: []
}

const mockDeviceForClient: UnifiedDevice & ObservingConditionsDevice = {
  ...mockAlpacaDeviceProperties,
  id: `observingconditions:${globalDeviceNumber}`,
  name: 'Mock OCS Store Name',
  type: 'observingconditions', // Ensured this is lowercase
  isConnected: true,
  isConnecting: false,
  isDisconnecting: false,
  status: 'connected' as DeviceStatus,
  properties: {
    ...mockAlpacaDeviceProperties
  },
  deviceAttributes: { customAttribute: 'someValue' },
  averageperiod: 0,
  cloudcover: 0,
  dewpoint: 0,
  humidity: 0,
  pressure: 0,
  rainrate: 0,
  skybrightness: 0,
  skytemperature: 0,
  starfwhm: 0,
  temperature: 0,
  winddirection: 0,
  windgust: 0,
  windspeed: 0
}

describe('ObservingConditionsClient', () => {
  const baseUrl = 'http://localhost:11111'
  const deviceNumber = 0
  let client: ObservingConditionsClient
  let originalRetries: RequestOptions['retries']
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    client = new ObservingConditionsClient(baseUrl, deviceNumber, mockDeviceForClient)
    mockFetch.mockReset()
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    originalRetries = DEFAULT_OPTIONS.retries
  })

  afterEach(() => {
    vi.restoreAllMocks()
    DEFAULT_OPTIONS.retries = originalRetries
    if (consoleWarnSpy) {
      consoleWarnSpy.mockRestore()
    }
  })

  it('should initialize correctly', () => {
    expect(client.baseUrl).toBe(baseUrl)
    expect(client.deviceNumber).toBe(deviceNumber)
    expect(client.deviceType).toBe('observingconditions')
    expect(client.device).toBe(mockDeviceForClient)
  })

  describe('getAveragePeriod', () => {
    const propertyName = 'averageperiod'
    it(`should get ${propertyName} successfully`, async () => {
      const mockValue = 60
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: mockValue, ErrorNumber: 0, ErrorMessage: '' })
      })

      const result = await client.getAveragePeriod()

      expect(result).toBe(mockValue)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v1/observingconditions/${deviceNumber}/${propertyName}?ClientID=${client.clientId}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: expect.any(AbortSignal)
      })
    })

    it(`should handle Alpaca error when getting ${propertyName}`, async () => {
      const alpacaErrorNum = 1025
      const alpacaErrorMsg = 'Invalid Value'
      const alpacaErrorResponse = {
        ok: true,
        json: async () => ({ Value: null, ErrorNumber: alpacaErrorNum, ErrorMessage: alpacaErrorMsg })
      }
      mockFetch.mockResolvedValue(alpacaErrorResponse)

      let caughtError: AlpacaError | null = null
      try {
        await client.getAveragePeriod()
      } catch (e) {
        caughtError = e as AlpacaError
      }

      expect(caughtError).toBeInstanceOf(AlpacaError)
      if (caughtError) {
        expect(caughtError.message).toContain(alpacaErrorMsg)
        expect(caughtError.deviceError?.errorNumber).toBe(alpacaErrorNum)
      }
    })

    it(`should handle fetch error when getting ${propertyName} (e.g. server error, JSON parse fails)`, async () => {
      const fetchErrorResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON at position 0')
        },
        text: async () => '<html><body><h1>500 Internal Server Error</h1></body></html>'
      }
      mockFetch.mockResolvedValue(fetchErrorResponse)

      DEFAULT_OPTIONS.retries = 0

      let caughtError: AlpacaError | null = null
      try {
        await client.getAveragePeriod()
      } catch (e) {
        caughtError = e as AlpacaError
      }

      expect(caughtError).toBeInstanceOf(AlpacaError)
      if (caughtError) {
        expect(caughtError.message).toMatch(/HTTP error 500: Internal Server Error|Failed to parse response as JSON/)
        expect(caughtError.deviceError?.errorNumber).toBeUndefined()
        expect(caughtError.statusCode).toBe(500)
      }
    })
  })
})
