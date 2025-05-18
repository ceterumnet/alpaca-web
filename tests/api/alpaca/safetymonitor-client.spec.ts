import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SafetyMonitorClient, type SafetyMonitorAlpacaStatus } from '@/api/alpaca/safetymonitor-client'
import type { Device } from '@/stores/types/device-store.types'
import type { SafetyMonitorDevice } from '@/types/device.types' // Assuming SafetyMonitorDevice type exists
import { AlpacaError } from '@/api/alpaca/errors'
import { DEFAULT_OPTIONS, type RequestOptions } from '@/api/alpaca/types'

const mockFetch = (global.fetch = vi.fn())

describe('SafetyMonitorClient', () => {
  const baseUrl = 'http://localhost:11111'
  const deviceNumber = 0
  let client: SafetyMonitorClient
  let mockSafetyMonitorDevice: SafetyMonitorDevice

  // To store original DEFAULT_OPTIONS before modification in error tests
  let originalDefaultOptions_retries: RequestOptions['retries']
  let originalDefaultOptions_retryDelay: RequestOptions['retryDelay']
  let originalDefaultOptions_timeout: RequestOptions['timeout']

  beforeEach(() => {
    mockSafetyMonitorDevice = {
      id: 'safetymonitor-1',
      name: 'Test SafetyMonitor',
      type: 'safetymonitor',
      isConnected: true,
      isConnecting: false,
      isDisconnecting: false,
      status: 'connected',
      uniqueId: `ASCOM-safetymonitor-${deviceNumber}-12345`,
      deviceNumber,
      deviceType: 'SafetyMonitor', // Base AlpacaClient uses this
      interfaceVersion: 1,
      driverVersion: '1.0',
      driverInfo: 'Test SafetyMonitor Driver',
      supportedActions: [],
      description: 'A test safetymonitor device',
      properties: {
        IsSafe: true // Default mock property
      }
    }
    client = new SafetyMonitorClient(baseUrl, deviceNumber, mockSafetyMonitorDevice as Device)
    mockFetch.mockReset()

    originalDefaultOptions_retries = DEFAULT_OPTIONS.retries
    originalDefaultOptions_retryDelay = DEFAULT_OPTIONS.retryDelay
    originalDefaultOptions_timeout = DEFAULT_OPTIONS.timeout
  })

  afterEach(() => {
    vi.restoreAllMocks()
    DEFAULT_OPTIONS.retries = originalDefaultOptions_retries
    DEFAULT_OPTIONS.retryDelay = originalDefaultOptions_retryDelay
    DEFAULT_OPTIONS.timeout = originalDefaultOptions_timeout
  })

  it('should initialize correctly', () => {
    expect(client.deviceType).toBe('safetymonitor')
    expect(client.deviceNumber).toBe(deviceNumber)
    expect(client.device).toBe(mockSafetyMonitorDevice)
    expect(client.baseUrl).toBe(baseUrl)
    expect(client.clientId).toBeGreaterThan(0)
  })

  // --- GET Properties ---
  describe('getIsSafe', () => {
    it('should get IsSafe status (true)', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: true, ErrorNumber: 0, ErrorMessage: '' }) })
      const result = await client.getIsSafe()
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/safetymonitor/${deviceNumber}/issafe?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should get IsSafe status (false)', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: false, ErrorNumber: 0, ErrorMessage: '' }) })
      const result = await client.getIsSafe()
      expect(result).toBe(false)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/safetymonitor/${deviceNumber}/issafe?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should throw AlpacaError if getProperty fails', async () => {
      DEFAULT_OPTIONS.retries = 0 // No retries for this specific test
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: null, ErrorNumber: 1025, ErrorMessage: 'Device error' }) })
      try {
        await client.getIsSafe()
        throw new Error('client.getIsSafe() should have thrown an error but did not.')
      } catch (e) {
        expect(e).toBeInstanceOf(AlpacaError)
        expect((e as AlpacaError).deviceError).toEqual({ errorNumber: 1025, errorMessage: 'Device error' })
      }
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  // --- Complex Method: fetchStatus ---
  describe('fetchStatus', () => {
    it('should return SafetyMonitorAlpacaStatus with IsSafe true', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: true, ErrorNumber: 0, ErrorMessage: '' }) })
      const result = await client.fetchStatus()
      expect(result).toEqual<SafetyMonitorAlpacaStatus>({ IsSafe: true })
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/safetymonitor/${deviceNumber}/issafe?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should return SafetyMonitorAlpacaStatus with IsSafe false', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: false, ErrorNumber: 0, ErrorMessage: '' }) })
      const result = await client.fetchStatus()
      expect(result).toEqual<SafetyMonitorAlpacaStatus>({ IsSafe: false })
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/safetymonitor/${deviceNumber}/issafe?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should throw error if getIsSafe within fetchStatus fails', async () => {
      DEFAULT_OPTIONS.retries = 0
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: null, ErrorNumber: 1026, ErrorMessage: 'Failed to get isSafe' }) })
      try {
        await client.fetchStatus()
        throw new Error('client.fetchStatus() should have thrown an error but did not.')
      } catch (e) {
        expect(e).toBeInstanceOf(AlpacaError)
        expect((e as AlpacaError).deviceError).toEqual({ errorNumber: 1026, errorMessage: 'Failed to get isSafe' })
      }
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  // --- Error Handling for getIsSafe (covering network errors) ---
  describe('getIsSafe Error Handling', () => {
    beforeEach(() => {
      DEFAULT_OPTIONS.retries = 1
      DEFAULT_OPTIONS.retryDelay = 1
      DEFAULT_OPTIONS.timeout = 100
    })

    it('should throw AlpacaError on network failure after retries', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure')) // Initial attempt
      mockFetch.mockRejectedValueOnce(new Error('Network failure')) // Retry attempt

      try {
        await client.getIsSafe()
        throw new Error('client.getIsSafe() should have thrown an error but did not.')
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(Error)
        const error = e as Error
        if (error instanceof AlpacaError) {
          expect(error.message).toMatch(/Failed to fetch/i)
          expect(error.message).toMatch(/Network failure/i)
          expect(error.type).toBe('NETWORK')
        } else {
          expect(error.message).toBe('Network failure')
        }
      }
      expect(mockFetch).toHaveBeenCalledTimes(1 + (DEFAULT_OPTIONS.retries || 0))
    })
  })
})
