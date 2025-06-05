import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FocuserClient } from '@/api/alpaca/focuser-client'
import type { Device } from '@/stores/types/device-store.types'
import type { FocuserDevice } from '@/types/device.types'
import { AlpacaError } from '@/api/alpaca/errors'
import { DEFAULT_OPTIONS, type RequestOptions } from '@/api/alpaca/types' // For Pattern #11

const mockFetch = (global.fetch = vi.fn())

describe('FocuserClient', () => {
  const baseUrl = 'http://localhost:11111'
  const deviceNumber = 0 // Used for client constructor and mock uniqueId
  let client: FocuserClient
  let mockFocuserDevice: FocuserDevice

  beforeEach(() => {
    mockFocuserDevice = {
      // UnifiedDevice properties (mandatory and common optionals)
      id: 'focuser-1',
      name: 'Test Focuser',
      type: 'focuser', // Correct type discriminator
      isConnected: true,
      isConnecting: false,
      isDisconnecting: false,
      status: 'connected',
      uniqueId: `ASCOM-focuser-${deviceNumber}-12345`, // From base AlpacaClient needs
      deviceNumber, // Passed to client constructor, distinct from deviceNum on UnifiedDevice
      deviceType: 'Focuser', // Legacy/compatibility, AlpacaClient uses this
      interfaceVersion: 1, // From base AlpacaClient needs
      driverVersion: '1.0', // From base AlpacaClient needs
      driverInfo: 'Test Focuser Driver', // From base AlpacaClient needs
      supportedActions: [], // From base AlpacaClient needs
      description: 'A test focuser device', // From base AlpacaClient needs
      // deviceNum: deviceNumber, // UnifiedDevice specific device number
      properties: {}, // Initialize properties object

      // Focuser specific mock properties (can be overridden in tests)
      // These would typically go into the `properties` field if strictly following UnifiedDevice,
      // but for direct use in mock setup, having them at top level is fine as FocuserDevice allows extra props.
      // absolute: true,
      maxIncrement: 1000,
      maxStep: 10000,
      stepSize: 1,
      tempComp: false,
      tempCompAvailable: true,
      temperature: 10.5,
      position: 5000,
      isMoving: false
    } // Cast to FocuserDevice is now more accurate
    client = new FocuserClient(baseUrl, deviceNumber, mockFocuserDevice as Device) // Client expects Device type
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // --- Start of tests ---

  it('should initialize correctly', () => {
    expect(client.deviceType).toBe('focuser')
    expect(client.deviceNumber).toBe(deviceNumber)
    expect(client.device).toBe(mockFocuserDevice)
    expect(client.baseUrl).toBe(baseUrl)
    expect(client.clientId).toBeGreaterThan(0)
  })

  // --- Read-only properties ---

  describe('isMoving', () => {
    it('should get isMoving status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: true, ErrorNumber: 0, ErrorMessage: '' })
      })
      const result = await client.isMoving()
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v1/focuser/${deviceNumber}/ismoving?ClientID=${client.clientId}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: expect.any(AbortSignal)
      })
    })
  })

  describe('getPosition', () => {
    it('should get position', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: 5000, ErrorNumber: 0, ErrorMessage: '' })
      })
      const result = await client.getPosition()
      expect(result).toBe(5000)
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v1/focuser/${deviceNumber}/position?ClientID=${client.clientId}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: expect.any(AbortSignal)
      })
    })
  })

  describe('getStepSize', () => {
    it('should get step size', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: 1.5, ErrorNumber: 0, ErrorMessage: '' })
      })
      const result = await client.getStepSize()
      expect(result).toBe(1.5)
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v1/focuser/${deviceNumber}/stepsize?ClientID=${client.clientId}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: expect.any(AbortSignal)
      })
    })
  })

  describe('getMaxStep', () => {
    it('should get max step', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: 10000, ErrorNumber: 0, ErrorMessage: '' })
      })
      const result = await client.getMaxStep()
      expect(result).toBe(10000)
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v1/focuser/${deviceNumber}/maxstep?ClientID=${client.clientId}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: expect.any(AbortSignal)
      })
    })
  })

  describe('getMaxIncrement', () => {
    it('should get max increment', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: 1000, ErrorNumber: 0, ErrorMessage: '' })
      })
      const result = await client.getMaxIncrement()
      expect(result).toBe(1000)
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v1/focuser/${deviceNumber}/maxincrement?ClientID=${client.clientId}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: expect.any(AbortSignal)
      })
    })
  })

  describe('getTemperature', () => {
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>
    let originalDefaultOptions_retries: RequestOptions['retries']
    let originalDefaultOptions_retryDelay: RequestOptions['retryDelay']
    let originalDefaultOptions_timeout: RequestOptions['timeout']

    beforeEach(() => {
      // Store and override DEFAULT_OPTIONS for speed
      originalDefaultOptions_retries = DEFAULT_OPTIONS.retries
      originalDefaultOptions_retryDelay = DEFAULT_OPTIONS.retryDelay
      originalDefaultOptions_timeout = DEFAULT_OPTIONS.timeout

      DEFAULT_OPTIONS.retries = 0 // No retries from base client for these tests
      DEFAULT_OPTIONS.retryDelay = 1 // ms
      DEFAULT_OPTIONS.timeout = 10 // ms

      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
      // Restore DEFAULT_OPTIONS explicitly
      if (originalDefaultOptions_retries === undefined) {
        DEFAULT_OPTIONS.retries = undefined
      } else {
        DEFAULT_OPTIONS.retries = originalDefaultOptions_retries
      }
      if (originalDefaultOptions_retryDelay === undefined) {
        DEFAULT_OPTIONS.retryDelay = undefined
      } else {
        DEFAULT_OPTIONS.retryDelay = originalDefaultOptions_retryDelay
      }
      if (originalDefaultOptions_timeout === undefined) {
        DEFAULT_OPTIONS.timeout = undefined
      } else {
        DEFAULT_OPTIONS.timeout = originalDefaultOptions_timeout
      }
      consoleWarnSpy.mockRestore()
    })

    it('should get temperature if available and numeric', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: 15.5, ErrorNumber: 0, ErrorMessage: '' })
      })
      const result = await client.getTemperature()
      expect(result).toBe(15.5)
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v1/focuser/${deviceNumber}/temperature?ClientID=${client.clientId}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: expect.any(AbortSignal)
      })
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it("should return null and NOT warn if temperature is valid ASCOM response but not numeric (e.g., 'N/A')", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: 'N/A', ErrorNumber: 0, ErrorMessage: '' }) // Valid ASCOM response
      })
      const result = await client.getTemperature()
      expect(result).toBeNull()
      // Client currently does not warn for this specific case, only if getProperty throws.
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it('should return null and warn if fetching temperature throws an error (network/fetch level)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      const result = await client.getTemperature()
      expect(result).toBeNull()
      expect(mockFetch).toHaveBeenCalledTimes(1) // Ensure fetch was attempted once
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Error reading temperature for focuser ${client.device.id}: Error: Network error`)
      )
    })

    it('should return null and warn if fetching temperature returns Alpaca error (device level)', async () => {
      const alpacaErrorMessage = 'Not implemented'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: null, ErrorNumber: 1025, ErrorMessage: alpacaErrorMessage })
      })
      const result = await client.getTemperature()
      expect(result).toBeNull()
      expect(mockFetch).toHaveBeenCalledTimes(1) // Ensure fetch was attempted once
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Error reading temperature for focuser ${client.device.id}: AlpacaError: ${alpacaErrorMessage}`)
      )
    })
  })

  describe('isTempCompAvailable', () => {
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>
    let originalDefaultOptions_retries: RequestOptions['retries']
    let originalDefaultOptions_retryDelay: RequestOptions['retryDelay']
    let originalDefaultOptions_timeout: RequestOptions['timeout']

    beforeEach(() => {
      // Store and override DEFAULT_OPTIONS for speed
      originalDefaultOptions_retries = DEFAULT_OPTIONS.retries
      originalDefaultOptions_retryDelay = DEFAULT_OPTIONS.retryDelay
      originalDefaultOptions_timeout = DEFAULT_OPTIONS.timeout

      DEFAULT_OPTIONS.retries = 0
      DEFAULT_OPTIONS.retryDelay = 1
      DEFAULT_OPTIONS.timeout = 10

      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
      // Restore DEFAULT_OPTIONS explicitly
      if (originalDefaultOptions_retries === undefined) {
        DEFAULT_OPTIONS.retries = undefined
      } else {
        DEFAULT_OPTIONS.retries = originalDefaultOptions_retries
      }
      if (originalDefaultOptions_retryDelay === undefined) {
        DEFAULT_OPTIONS.retryDelay = undefined
      } else {
        DEFAULT_OPTIONS.retryDelay = originalDefaultOptions_retryDelay
      }
      if (originalDefaultOptions_timeout === undefined) {
        DEFAULT_OPTIONS.timeout = undefined
      } else {
        DEFAULT_OPTIONS.timeout = originalDefaultOptions_timeout
      }
      consoleWarnSpy.mockRestore()
    })

    it('should get tempcompavailable status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: true, ErrorNumber: 0, ErrorMessage: '' })
      })
      const result = await client.isTempCompAvailable()
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v1/focuser/${deviceNumber}/tempcompavailable?ClientID=${client.clientId}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: expect.any(AbortSignal)
      })
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it('should return false and warn if fetching tempcompavailable throws an error (network/fetch level)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Device not responding'))
      const result = await client.isTempCompAvailable()
      expect(result).toBe(false)
      expect(mockFetch).toHaveBeenCalledTimes(1) // Ensure fetch was attempted once
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Error checking tempcompavailable for focuser ${client.device.id}: Error: Device not responding`)
      )
    })

    it('should return false and warn if fetching tempcompavailable returns Alpaca error (device level)', async () => {
      const alpacaErrorMessage = 'Not supported'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: null, ErrorNumber: 1026, ErrorMessage: alpacaErrorMessage })
      })
      const result = await client.isTempCompAvailable()
      expect(result).toBe(false)
      expect(mockFetch).toHaveBeenCalledTimes(1) // Ensure fetch was attempted once
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Error checking tempcompavailable for focuser ${client.device.id}: AlpacaError: ${alpacaErrorMessage}`)
      )
    })
  })

  describe('getTempComp', () => {
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>
    let originalDefaultOptions_retries: RequestOptions['retries']
    let originalDefaultOptions_retryDelay: RequestOptions['retryDelay']
    let originalDefaultOptions_timeout: RequestOptions['timeout']

    beforeEach(() => {
      originalDefaultOptions_retries = DEFAULT_OPTIONS.retries
      originalDefaultOptions_retryDelay = DEFAULT_OPTIONS.retryDelay
      originalDefaultOptions_timeout = DEFAULT_OPTIONS.timeout

      DEFAULT_OPTIONS.retries = 0
      DEFAULT_OPTIONS.retryDelay = 1
      DEFAULT_OPTIONS.timeout = 10
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
      // Restore DEFAULT_OPTIONS explicitly
      if (originalDefaultOptions_retries === undefined) {
        DEFAULT_OPTIONS.retries = undefined
      } else {
        DEFAULT_OPTIONS.retries = originalDefaultOptions_retries
      }
      if (originalDefaultOptions_retryDelay === undefined) {
        DEFAULT_OPTIONS.retryDelay = undefined
      } else {
        DEFAULT_OPTIONS.retryDelay = originalDefaultOptions_retryDelay
      }
      if (originalDefaultOptions_timeout === undefined) {
        DEFAULT_OPTIONS.timeout = undefined
      } else {
        DEFAULT_OPTIONS.timeout = originalDefaultOptions_timeout
      }
      consoleWarnSpy.mockRestore()
    })

    it('should get tempcomp status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: false, ErrorNumber: 0, ErrorMessage: '' })
      })
      const result = await client.getTempComp()
      expect(result).toBe(false)
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v1/focuser/${deviceNumber}/tempcomp?ClientID=${client.clientId}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: expect.any(AbortSignal)
      })
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it('should return null and warn if fetching tempcomp throws an error (network/fetch level)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Device error'))
      const result = await client.getTempComp()
      expect(result).toBeNull()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Error reading tempcomp for focuser ${client.device.id}: Error: Device error`)
      )
    })

    it('should return null and warn if fetching tempcomp returns Alpaca error (device level)', async () => {
      const alpacaErrorMessage = 'Could not read'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: null, ErrorNumber: 1027, ErrorMessage: alpacaErrorMessage })
      })
      const result = await client.getTempComp()
      expect(result).toBeNull()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Error reading tempcomp for focuser ${client.device.id}: AlpacaError: ${alpacaErrorMessage}`)
      )
    })
  })

  describe('getAbsolute', () => {
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>
    let originalDefaultOptions_retries: RequestOptions['retries']
    let originalDefaultOptions_retryDelay: RequestOptions['retryDelay']
    let originalDefaultOptions_timeout: RequestOptions['timeout']

    beforeEach(() => {
      originalDefaultOptions_retries = DEFAULT_OPTIONS.retries
      originalDefaultOptions_retryDelay = DEFAULT_OPTIONS.retryDelay
      originalDefaultOptions_timeout = DEFAULT_OPTIONS.timeout

      DEFAULT_OPTIONS.retries = 0
      DEFAULT_OPTIONS.retryDelay = 1
      DEFAULT_OPTIONS.timeout = 10
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
      // Restore DEFAULT_OPTIONS explicitly
      if (originalDefaultOptions_retries === undefined) {
        DEFAULT_OPTIONS.retries = undefined
      } else {
        DEFAULT_OPTIONS.retries = originalDefaultOptions_retries
      }
      if (originalDefaultOptions_retryDelay === undefined) {
        DEFAULT_OPTIONS.retryDelay = undefined
      } else {
        DEFAULT_OPTIONS.retryDelay = originalDefaultOptions_retryDelay
      }
      if (originalDefaultOptions_timeout === undefined) {
        DEFAULT_OPTIONS.timeout = undefined
      } else {
        DEFAULT_OPTIONS.timeout = originalDefaultOptions_timeout
      }
      consoleWarnSpy.mockRestore()
    })

    it('should get absolute status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: true, ErrorNumber: 0, ErrorMessage: '' })
      })
      const result = await client.getAbsolute()
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v1/focuser/${deviceNumber}/absolute?ClientID=${client.clientId}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: expect.any(AbortSignal)
      })
    })
  })

  // --- Write methods ---

  describe('setTempComp', () => {
    it('should set temp comp to true', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ErrorNumber: 0, ErrorMessage: '', Value: null })
      })

      await client.setTempComp(true)

      const expectedBody = new URLSearchParams()
      expectedBody.append('TempComp', 'True') // Expect "True" as per Alpaca Spec / Pattern #7
      expectedBody.append('ClientID', client.clientId.toString())

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v1/focuser/${deviceNumber}/tempcomp`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: expectedBody.toString(),
        signal: expect.any(AbortSignal)
      })
    })

    it('should set temp comp to false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ErrorNumber: 0, ErrorMessage: '', Value: null })
      })

      await client.setTempComp(false)

      const expectedBody = new URLSearchParams()
      expectedBody.append('TempComp', 'False') // Expect "False"
      expectedBody.append('ClientID', client.clientId.toString())

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v1/focuser/${deviceNumber}/tempcomp`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: expectedBody.toString(),
        signal: expect.any(AbortSignal)
      })
    })

    it('should throw AlpacaError if setting temp comp fails (device error)', async () => {
      const alpacaErrorMessage = 'Focuser busy'
      const alpacaErrorNumber = 1028
      // Setup mock for the first call (from toThrowError)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ErrorNumber: alpacaErrorNumber, ErrorMessage: alpacaErrorMessage, Value: null })
      })

      await expect(client.setTempComp(false)).rejects.toThrowError(AlpacaError)

      // Re-setup mock for the second call (from toSatisfy)
      // This is crucial because the previous expect consumes the mock.
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ErrorNumber: alpacaErrorNumber, ErrorMessage: alpacaErrorMessage, Value: null })
      })
      await expect(client.setTempComp(false)).rejects.toSatisfy((err: AlpacaError) => {
        return err.message.includes(alpacaErrorMessage) && err.deviceError?.errorNumber === alpacaErrorNumber
      })
      expect(mockFetch).toHaveBeenCalledTimes(2) // Ensure it was called twice
    })
  })

  describe('halt', () => {
    it('should send halt command', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ErrorNumber: 0, ErrorMessage: '', Value: null })
      })

      await client.halt()

      const expectedBody = new URLSearchParams()
      expectedBody.append('ClientID', client.clientId.toString())

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v1/focuser/${deviceNumber}/halt`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: expectedBody.toString(),
        signal: expect.any(AbortSignal)
      })
    })

    it('should throw AlpacaError if halt fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ErrorNumber: 1029, ErrorMessage: 'Cannot halt', Value: null })
      })
      await expect(client.halt()).rejects.toThrowError(AlpacaError)
    })
  })

  describe('move', () => {
    it('should send move command with specified position', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ErrorNumber: 0, ErrorMessage: '', Value: null })
      })
      const targetPosition = 7500
      await client.move(targetPosition)

      const expectedBody = new URLSearchParams()
      expectedBody.append('Position', targetPosition.toString())
      expectedBody.append('ClientID', client.clientId.toString())

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v1/focuser/${deviceNumber}/move`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: expectedBody.toString(),
        signal: expect.any(AbortSignal)
      })
    })

    it('should throw AlpacaError if move fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ErrorNumber: 1030, ErrorMessage: 'Move failed', Value: null })
      })
      await expect(client.move(100)).rejects.toThrowError(AlpacaError)
    })
  })

  // --- Error handling and retries (Pattern #11) ---
  describe('Alpaca Interaction Error Handling (Retries)', () => {
    const originalRetries = DEFAULT_OPTIONS.retries
    const originalRetryDelay = DEFAULT_OPTIONS.retryDelay
    const originalTimeout = DEFAULT_OPTIONS.timeout

    beforeEach(() => {
      // Apply fast retry options for these specific tests
      // Linter might complain about these being possibly undefined, but they are defined in types.ts
      DEFAULT_OPTIONS.retries = 1
      DEFAULT_OPTIONS.retryDelay = 1
      DEFAULT_OPTIONS.timeout = 100
    })

    afterEach(() => {
      // CRITICAL: Restore original options
      DEFAULT_OPTIONS.retries = originalRetries
      DEFAULT_OPTIONS.retryDelay = originalRetryDelay
      DEFAULT_OPTIONS.timeout = originalTimeout
    })

    it('should retry GET properties on network failure according to DEFAULT_OPTIONS', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network Error 1')) // Initial attempt
        .mockRejectedValueOnce(new Error('Network Error 2')) // First retry (DEFAULT_OPTIONS.retries = 1)

      // Example: getPosition
      await expect(client.getPosition()).rejects.toThrowError('Network Error 2') // Should throw the error from the last attempt

      expect(mockFetch).toHaveBeenCalledTimes(1 + DEFAULT_OPTIONS.retries!) // Initial call + configured retries
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        `${baseUrl}/api/v1/focuser/${deviceNumber}/position?ClientID=${client.clientId}`,
        expect.any(Object)
      )
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        `${baseUrl}/api/v1/focuser/${deviceNumber}/position?ClientID=${client.clientId}`,
        expect.any(Object)
      )
    })

    it('should retry PUT methods on network failure according to DEFAULT_OPTIONS', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network Error 1 Put')).mockRejectedValueOnce(new Error('Network Error 2 Put'))

      // Example: halt
      await expect(client.halt()).rejects.toThrowError('Network Error 2 Put')

      expect(mockFetch).toHaveBeenCalledTimes(1 + DEFAULT_OPTIONS.retries!) // Initial call + configured retries
      const expectedBody = new URLSearchParams()
      expectedBody.append('ClientID', client.clientId.toString())
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        `${baseUrl}/api/v1/focuser/${deviceNumber}/halt`,
        expect.objectContaining({ method: 'PUT', body: expectedBody.toString() })
      )
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        `${baseUrl}/api/v1/focuser/${deviceNumber}/halt`,
        expect.objectContaining({ method: 'PUT', body: expectedBody.toString() })
      )
    })

    it('should NOT retry on Alpaca specific errors (ErrorNumber !== 0)', async () => {
      const alpacaErrorMessage = 'Device reported an error'
      const alpacaErrorNumber = 1234 // Some non-zero error number

      // Setup mock for the first call (from toThrowError)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: null, ErrorNumber: alpacaErrorNumber, ErrorMessage: alpacaErrorMessage })
      })

      await expect(client.getPosition()).rejects.toThrowError(AlpacaError)

      // Re-setup mock for the second call (from toSatisfy)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Value: null, ErrorNumber: alpacaErrorNumber, ErrorMessage: alpacaErrorMessage })
      })
      await expect(client.getPosition()).rejects.toSatisfy((err: AlpacaError) => {
        return err.message.includes(alpacaErrorMessage) && err.deviceError?.errorNumber === alpacaErrorNumber
      })

      expect(mockFetch).toHaveBeenCalledTimes(2) // Called once for each expect a client method
    })
  })
})
