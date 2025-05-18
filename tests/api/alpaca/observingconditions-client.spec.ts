import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ObservingConditionsClient } from '@/api/alpaca/observingconditions-client'
import { AlpacaError } from '@/api/alpaca/errors'
import type { Device, UnifiedDevice, DeviceState } from '@/types/device.types'
import { DEFAULT_OPTIONS, type RequestOptions } from '@/api/alpaca/types'

const mockFetch = (global.fetch = vi.fn())
const baseUrl = 'http://localhost'
const deviceNumber = 0

const mockAlpacaDeviceProperties = {
  DeviceNumber: deviceNumber,
  DeviceName: 'Mock ObservingConditions Alpaca',
  DeviceType: 'ObservingConditions',
  DriverVersion: '1.0',
  SupportedActions: []
}

const mockStoreDevice: UnifiedDevice = {
  ...mockAlpacaDeviceProperties,
  id: `observingconditions:${deviceNumber}`,
  name: 'Mock OCS Store Name',
  type: 'ObservingConditions',
  isConnected: true,
  isConnecting: false,
  isDisconnecting: false,
  status: 'connected' as DeviceState,
  properties: { ...mockAlpacaDeviceProperties },
  deviceAttributes: { customAttribute: 'someValue' }
}

describe('ObservingConditionsClient', () => {
  let client: ObservingConditionsClient
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let originalRetries: RequestOptions['retries']

  beforeEach(() => {
    client = new ObservingConditionsClient(baseUrl, deviceNumber, mockStoreDevice as Device)
    mockFetch.mockReset()
    // @ts-expect-error TS6133: 'consoleWarnSpy' is declared but its value is never read.
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    originalRetries = DEFAULT_OPTIONS.retries
  })

  afterEach(() => {
    vi.restoreAllMocks()
    DEFAULT_OPTIONS.retries = originalRetries
  })

  it('should initialize correctly', () => {
    expect(client.baseUrl).toBe(baseUrl)
    expect(client.deviceNumber).toBe(deviceNumber)
    expect(client.deviceType).toBe('observingconditions')
    expect(client.device).toBe(mockStoreDevice)
    expect(client.device.DeviceName).toBe(mockStoreDevice.DeviceName)
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
      // Simulate a server error where the response body isn't valid JSON, or an intermediate proxy error.
      const fetchErrorResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        // Make .json() throw an error to simulate non-JSON response or parse failure
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON at position 0')
        },
        text: async () => '<html><body><h1>500 Internal Server Error</h1></body></html>' // Example non-JSON text
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
        // This will now trigger the generic HTTP error in base-client's handleResponse catch block
        expect(caughtError.message).toMatch(/HTTP error 500: Internal Server Error|Failed to parse response as JSON/)
        expect(caughtError.deviceError?.errorNumber).toBeUndefined()
        expect(caughtError.statusCode).toBe(500)
      }
    })
  })

  // @ts-expect-error TS6133: 'DEFAULT_OPTIONS' is declared but its value is never read (placeholder for future tests).
  const _unusedDefaultOptions = DEFAULT_OPTIONS
})
