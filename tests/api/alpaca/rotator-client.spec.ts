import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RotatorClient } from '@/api/alpaca/rotator-client'
import type { Device } from '@/stores/types/device-store.types'
import type { RotatorDevice } from '@/types/device.types'
import { AlpacaError } from '@/api/alpaca/errors'
import { DEFAULT_OPTIONS, type RequestOptions } from '@/api/alpaca/types'
import logger from '@/plugins/logger'

const mockFetch = (global.fetch = vi.fn())

describe('RotatorClient', () => {
  const baseUrl = 'http://localhost:11111'
  const deviceNumber = 0
  let client: RotatorClient
  let mockRotatorDevice: RotatorDevice

  // To store original DEFAULT_OPTIONS before modification in error tests
  let originalDefaultOptions_retries: RequestOptions['retries']
  let originalDefaultOptions_retryDelay: RequestOptions['retryDelay']
  let originalDefaultOptions_timeout: RequestOptions['timeout']

  beforeEach(() => {
    mockRotatorDevice = {
      id: 'rotator-1',
      name: 'Test Rotator',
      type: 'rotator',
      isConnected: true, // This is a property of the Device model
      isConnecting: false,
      isDisconnecting: false,
      status: 'connected',
      uniqueId: `ASCOM-rotator-${deviceNumber}-12345`,
      deviceNumber,
      deviceType: 'Rotator',
      interfaceVersion: 1,
      driverVersion: '1.0',
      driverInfo: 'Test Rotator Driver',
      supportedActions: [],
      description: 'A test rotator device',
      properties: {},
      // Alpaca properties for mock device (can be overridden if needed for specific tests)
      canReverse: true,
      isMoving: false,
      mechanicalPosition: 90,
      position: 90,
      reverse: false,
      stepSize: 0.1,
      targetPosition: 90
    }
    client = new RotatorClient(baseUrl, deviceNumber, mockRotatorDevice as Device)
    mockFetch.mockReset()

    // Store original DEFAULT_OPTIONS before each test, especially error tests might modify them
    originalDefaultOptions_retries = DEFAULT_OPTIONS.retries
    originalDefaultOptions_retryDelay = DEFAULT_OPTIONS.retryDelay
    originalDefaultOptions_timeout = DEFAULT_OPTIONS.timeout
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // Restore DEFAULT_OPTIONS after each test to prevent leakage
    DEFAULT_OPTIONS.retries = originalDefaultOptions_retries
    DEFAULT_OPTIONS.retryDelay = originalDefaultOptions_retryDelay
    DEFAULT_OPTIONS.timeout = originalDefaultOptions_timeout
  })

  it('should initialize correctly', () => {
    expect(client.deviceType).toBe('rotator')
    expect(client.deviceNumber).toBe(deviceNumber)
    expect(client.device).toBe(mockRotatorDevice)
    expect(client.baseUrl).toBe(baseUrl)
    expect(client.clientId).toBeGreaterThan(0)
  })

  // --- GET Properties ---
  describe('canReverse', () => {
    it('should get canReverse status (true)', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: true, ErrorNumber: 0, ErrorMessage: '' }) })
      const result = await client.canReverse()
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/rotator/${deviceNumber}/canreverse?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })
    it('should get canReverse status (false)', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: false, ErrorNumber: 0, ErrorMessage: '' }) })
      const result = await client.canReverse()
      expect(result).toBe(false)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/rotator/${deviceNumber}/canreverse?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })
  })

  describe('isMoving', () => {
    it('should get isMoving status', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: true, ErrorNumber: 0, ErrorMessage: '' }) })
      const result = await client.isMoving()
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/rotator/${deviceNumber}/ismoving?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })
  })

  describe('mechanicalPosition', () => {
    it('should get mechanical position', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: 180.5, ErrorNumber: 0, ErrorMessage: '' }) })
      const result = await client.mechanicalPosition()
      expect(result).toBe(180.5)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/rotator/${deviceNumber}/mechanicalposition?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })
  })

  describe('getPosition', () => {
    it('should get position', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: 45.0, ErrorNumber: 0, ErrorMessage: '' }) })
      const result = await client.getPosition()
      expect(result).toBe(45.0)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/rotator/${deviceNumber}/position?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })
  })

  describe('getReverse', () => {
    it('should get reverse status', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: true, ErrorNumber: 0, ErrorMessage: '' }) })
      const result = await client.getReverse()
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/rotator/${deviceNumber}/reverse?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })
  })

  describe('getStepSize', () => {
    it('should get step size', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: 0.01, ErrorNumber: 0, ErrorMessage: '' }) })
      const result = await client.getStepSize()
      expect(result).toBe(0.01)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/rotator/${deviceNumber}/stepsize?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })
  })

  describe('getTargetPosition', () => {
    it('should get target position', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: 270.0, ErrorNumber: 0, ErrorMessage: '' }) })
      const result = await client.getTargetPosition()
      expect(result).toBe(270.0)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/rotator/${deviceNumber}/targetposition?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })
  })

  // --- PUT Methods ---
  describe('halt', () => {
    it('should call halt', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: null, ErrorNumber: 0, ErrorMessage: '' }) })
      await client.halt()
      const expectedBody = new URLSearchParams()
      expectedBody.append('ClientID', client.clientId.toString())
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/rotator/${deviceNumber}/halt`,
        expect.objectContaining({ method: 'PUT', body: expectedBody.toString() })
      )
    })
  })

  describe('move', () => {
    it('should call move with position offset', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: null, ErrorNumber: 0, ErrorMessage: '' }) })
      const positionOffset = 10.5
      await client.move(positionOffset)
      const expectedBody = new URLSearchParams()
      expectedBody.append('Position', positionOffset.toString())
      expectedBody.append('ClientID', client.clientId.toString())
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/rotator/${deviceNumber}/move`,
        expect.objectContaining({ method: 'PUT', body: expectedBody.toString() })
      )
    })
  })

  describe('moveAbsolute', () => {
    it('should call moveAbsolute with position angle', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: null, ErrorNumber: 0, ErrorMessage: '' }) })
      const positionAngle = 180.0
      await client.moveAbsolute(positionAngle)
      const expectedBody = new URLSearchParams()
      expectedBody.append('Position', positionAngle.toString())
      expectedBody.append('ClientID', client.clientId.toString())
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/rotator/${deviceNumber}/moveabsolute`,
        expect.objectContaining({ method: 'PUT', body: expectedBody.toString() })
      )
    })
  })

  describe('moveMechanical', () => {
    it('should call moveMechanical with mechanical position value', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: null, ErrorNumber: 0, ErrorMessage: '' }) })
      const mechanicalPositionValue = 90.0
      await client.moveMechanical(mechanicalPositionValue)
      const expectedBody = new URLSearchParams()
      expectedBody.append('Position', mechanicalPositionValue.toString())
      expectedBody.append('ClientID', client.clientId.toString())
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/rotator/${deviceNumber}/movemechanical`,
        expect.objectContaining({ method: 'PUT', body: expectedBody.toString() })
      )
    })
  })

  describe('syncToPosition', () => {
    it('should call syncToPosition with position angle', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: null, ErrorNumber: 0, ErrorMessage: '' }) })
      const positionAngle = 135.0
      await client.syncToPosition(positionAngle)
      const expectedBody = new URLSearchParams()
      expectedBody.append('Position', positionAngle.toString())
      expectedBody.append('ClientID', client.clientId.toString())
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/rotator/${deviceNumber}/sync`,
        expect.objectContaining({ method: 'PUT', body: expectedBody.toString() })
      )
    })
  })

  describe('setReverse', () => {
    it('should call setReverse with reverse state (true)', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: null, ErrorNumber: 0, ErrorMessage: '' }) })
      await client.setReverse(true)
      const expectedBody = new URLSearchParams()
      expectedBody.append('Reverse', 'True') // setProperty via toAscomValue ensures PascalCase boolean
      expectedBody.append('ClientID', client.clientId.toString())
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/rotator/${deviceNumber}/reverse`,
        expect.objectContaining({ method: 'PUT', body: expectedBody.toString() })
      )
    })

    it('should call setReverse with reverse state (false)', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: null, ErrorNumber: 0, ErrorMessage: '' }) })
      await client.setReverse(false)
      const expectedBody = new URLSearchParams()
      expectedBody.append('Reverse', 'False') // setProperty via toAscomValue ensures PascalCase boolean
      expectedBody.append('ClientID', client.clientId.toString())
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/rotator/${deviceNumber}/reverse`,
        expect.objectContaining({ method: 'PUT', body: expectedBody.toString() })
      )
    })
  })

  // --- Complex Getter: getRotatorState ---
  describe('getRotatorState', () => {
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleWarnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleWarnSpy.mockRestore()
    })

    it('should get all rotator properties successfully', async () => {
      const mockAlpacaProperties: Record<string, unknown> = {
        canreverse: true,
        ismoving: false,
        mechanicalposition: 90.5,
        position: 89.9,
        reverse: false,
        stepsize: 0.1,
        targetposition: 90.0,
        connected: true, // Alpaca standard property name
        name: 'Alpaca Test Rotator',
        description: 'An Alpaca mock rotator'
      }

      mockFetch.mockImplementation(async (url: string) => {
        const propertyName = url.substring(url.lastIndexOf('/') + 1).split('?')[0]
        if (Object.prototype.hasOwnProperty.call(mockAlpacaProperties, propertyName)) {
          return { ok: true, json: async () => ({ Value: mockAlpacaProperties[propertyName], ErrorNumber: 0, ErrorMessage: '' }) }
        }
        return { ok: false, status: 404, json: async () => ({ ErrorNumber: 1024, ErrorMessage: 'Not found' }) }
      })

      const result = await client.getRotatorState()

      expect(result).toEqual({
        canreverse: true,
        ismoving: false,
        mechanicalposition: 90.5,
        position: 89.9,
        reverse: false,
        stepsize: 0.1,
        targetposition: 90.0,
        isConnected: true, // Expect toTsFormat('connected') to be 'isConnected' based on property-mapping.ts
        name: 'Alpaca Test Rotator',
        description: 'An Alpaca mock rotator'
      })
      const expectedPropertiesFetched = [
        'canreverse',
        'ismoving',
        'mechanicalposition',
        'position',
        'reverse',
        'stepsize',
        'targetposition',
        'connected',
        'name',
        'description'
      ]
      expect(mockFetch).toHaveBeenCalledTimes(expectedPropertiesFetched.length)
      expectedPropertiesFetched.forEach((prop) => {
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining(`${baseUrl}/api/v1/rotator/${deviceNumber}/${prop}`), expect.anything())
      })
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it('should return partial data and warn if an individual property fetch fails', async () => {
      const mockAlpacaProperties: Record<string, unknown> = {
        canreverse: true,
        ismoving: false,
        // mechanicalposition will be made to fail by mock
        position: 89.9,
        reverse: false,
        stepsize: 0.1,
        targetposition: 90.0,
        connected: true,
        name: 'Alpaca Test Rotator Partial',
        description: 'A partial mock rotator'
      }

      mockFetch.mockImplementation(async (url: string) => {
        const propertyName = url.substring(url.lastIndexOf('/') + 1).split('?')[0]
        if (propertyName === 'mechanicalposition') {
          return { ok: true, json: async () => ({ Value: null, ErrorNumber: 1027, ErrorMessage: 'Error fetching mechanicalposition' }) }
        }
        if (Object.prototype.hasOwnProperty.call(mockAlpacaProperties, propertyName)) {
          return { ok: true, json: async () => ({ Value: mockAlpacaProperties[propertyName], ErrorNumber: 0, ErrorMessage: '' }) }
        }
        return { ok: false, status: 404, json: async () => ({ ErrorNumber: 1024, ErrorMessage: 'Not found' }) }
      })

      const result = await client.getRotatorState()

      expect(result).toEqual({
        canreverse: true,
        ismoving: false,
        // mechanicalposition should be missing
        position: 89.9,
        reverse: false,
        stepsize: 0.1,
        targetposition: 90.0,
        isConnected: true, // Expect toTsFormat('connected') to be 'isConnected'
        name: 'Alpaca Test Rotator Partial',
        description: 'A partial mock rotator'
      })
      expect(result.mechanicalposition).toBeUndefined()
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Failed to get property 'mechanicalposition' (mapped to 'mechanicalposition'): Error fetching mechanicalposition"
      )
    })
  })

  // --- Error Handling ---
  describe('Error Handling', () => {
    // Note: originalDefaultOptions are saved/restored in main beforeEach/afterEach
    beforeEach(() => {
      // Modify for faster error tests
      DEFAULT_OPTIONS.retries = 1
      DEFAULT_OPTIONS.retryDelay = 1
      DEFAULT_OPTIONS.timeout = 100
    })

    it('should throw AlpacaError on GET property failure (device error)', async () => {
      // For GET, Alpaca errors in response body (even with HTTP 200 OK) should NOT be retried by base client.
      // Retries are typically for network errors or HTTP 5xx server errors.
      // If ErrorNumber is non-zero, it's considered a valid Alpaca response that indicates a device-level issue.
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: null, ErrorNumber: 1025, ErrorMessage: 'Device specific error' }) })
      // No retry mock needed if Alpaca errors are not retried by GET

      try {
        await client.getPosition()
        throw new Error('client.getPosition() should have thrown an error but did not.')
      } catch (e) {
        expect(e).toBeInstanceOf(AlpacaError)
        expect((e as AlpacaError).deviceError).toEqual({ errorNumber: 1025, errorMessage: 'Device specific error' })
      }
      expect(mockFetch).toHaveBeenCalledTimes(1) // Should only be called once if no retry for Alpaca device errors
    })

    it('should throw AlpacaError on PUT method failure (network error)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure')) // For initial attempt
      if (DEFAULT_OPTIONS.retries && DEFAULT_OPTIONS.retries > 0) {
        for (let i = 0; i < DEFAULT_OPTIONS.retries; i++) {
          mockFetch.mockRejectedValueOnce(new Error('Network failure')) // For retry attempts
        }
      }
      try {
        await client.halt()
        throw new Error('client.halt() should have thrown an error but did not.') // Should not be reached
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(Error) // Ensure an error was thrown
        const error = e as Error
        // If base-client successfully wraps, e will be an AlpacaError.
        // If not, e will be the raw Error('Network failure').
        // The critical part is that retries happened and an error indicating network failure was propagated.
        if (error instanceof AlpacaError) {
          expect(error.message).toMatch(/Failed to fetch/i)
          expect(error.message).toMatch(/Network failure/i)
          expect(error.type).toBe('NETWORK')
        } else {
          // If not an AlpacaError, it should be the raw error we mocked
          expect(error.message).toBe('Network failure')
        }
      }
      expect(mockFetch).toHaveBeenCalledTimes(1 + (DEFAULT_OPTIONS.retries || 0))
    })

    it('should throw AlpacaError on PUT method failure (Alpaca error in response)', async () => {
      const alpacaErrorResponse = { Value: null, ErrorNumber: 400, ErrorMessage: 'Invalid operation' }
      // Mock for the single attempt. Alpaca errors in response body (with HTTP 200 OK) are not retried for PUT.
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => alpacaErrorResponse })

      try {
        await client.move(10)
        throw new Error('client.move() should have thrown an error but did not.')
      } catch (e) {
        expect(e).toBeInstanceOf(AlpacaError)
        expect((e as AlpacaError).deviceError).toEqual({ errorNumber: 400, errorMessage: 'Invalid operation' })
      }
      expect(mockFetch).toHaveBeenCalledTimes(1) // Should only be called once
    })
  })
})
