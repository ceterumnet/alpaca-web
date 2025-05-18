import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FilterWheelClient } from '@/api/alpaca/filterwheel-client'
import type { Device } from '@/stores/types/device-store.types'
import { AlpacaError } from '@/api/alpaca/errors'
import { DEFAULT_OPTIONS } from '@/api/alpaca/types' // For pattern #11

const mockFetch = (global.fetch = vi.fn())
const mockFilterWheelDevice = {
  DeviceName: 'Mock FilterWheel',
  DeviceNumber: 0,
  DeviceType: 'FilterWheel',
  uniqueId: 'mock-filterwheel-0',
  profile: { Name: 'Simulator', DriverVersion: '1.0' },
  settings: {}
} as unknown as Device // Cast to Device to satisfy constructor

describe('FilterWheelClient', () => {
  let client: FilterWheelClient
  const baseUrl = 'http://localhost:11111'
  const deviceNumber = 0

  beforeEach(() => {
    client = new FilterWheelClient(baseUrl, deviceNumber, mockFilterWheelDevice)
    mockFetch.mockReset()
    // Default successful response for most GET/PUT calls
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ErrorNumber: 0, ErrorMessage: '', Value: null }),
      text: () => Promise.resolve(''), // Add text() method for AlpacaError parsing
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // --- Constructor Tests ---
  it('should initialize correctly from AlpacaClient', () => {
    expect(client.baseUrl).toBe(baseUrl)
    expect(client.deviceType).toBe('filterwheel')
    expect(client.deviceNumber).toBe(deviceNumber)
    expect(client.device).toBe(mockFilterWheelDevice)
    expect(client.clientId).toEqual(expect.any(Number))
    expect(client.clientId).toBeGreaterThanOrEqual(0)
    expect(client.clientId).toBeLessThanOrEqual(65535)
  })

  // --- GET Properties ---

  // getFocusOffsets()
  describe('getFocusOffsets', () => {
    it('should get focus offsets successfully', async () => {
      const mockOffsets = [100, -50, 0]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ Value: mockOffsets, ErrorNumber: 0, ErrorMessage: '' }),
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' })
      })
      const result = await client.getFocusOffsets()
      expect(result).toEqual(mockOffsets)
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v1/filterwheel/${deviceNumber}/focusoffsets?ClientID=${client.clientId}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: expect.any(AbortSignal)
      })
    })

    it('should throw AlpacaError on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true, // Alpaca errors are often 200 OK with ErrorNumber != 0
        json: () => Promise.resolve({ Value: null, ErrorNumber: 1025, ErrorMessage: 'Filter wheel error' }),
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' })
      })
      await expect(client.getFocusOffsets()).rejects.toThrow(AlpacaError)
    })
  })

  // getFilterNames()
  describe('getFilterNames', () => {
    it('should get filter names successfully', async () => {
      const mockNames = ['Red', 'Green', 'Blue', 'Luminance']
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ Value: mockNames, ErrorNumber: 0, ErrorMessage: '' }),
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' })
      })
      const result = await client.getFilterNames()
      expect(result).toEqual(mockNames)
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v1/filterwheel/${deviceNumber}/names?ClientID=${client.clientId}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: expect.any(AbortSignal)
      })
    })
  })

  // getPosition()
  describe('getPosition', () => {
    it('should get current position successfully', async () => {
      const mockPosition = 2 // 0-based
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ Value: mockPosition, ErrorNumber: 0, ErrorMessage: '' }),
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' })
      })
      const result = await client.getPosition()
      expect(result).toEqual(mockPosition)
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v1/filterwheel/${deviceNumber}/position?ClientID=${client.clientId}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: expect.any(AbortSignal)
      })
    })

    it('should return -1 if position is unknown (as per Alpaca spec for position)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ Value: -1, ErrorNumber: 0, ErrorMessage: '' }),
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' })
      })
      const result = await client.getPosition()
      expect(result).toEqual(-1)
    })
  })

  // --- PUT Methods / Property Setters ---

  // setPosition()
  describe('setPosition', () => {
    it('should set position successfully', async () => {
      const filterNumber = 3
      const expectedBody = new URLSearchParams({
        Position: filterNumber.toString(),
        ClientID: client.clientId.toString()
      })

      await client.setPosition(filterNumber)

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v1/filterwheel/${deviceNumber}/position`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: expectedBody.toString(), // Check stringified body
        signal: expect.any(AbortSignal)
      })
      // Verify the mock resolved (no throw)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should throw AlpacaError on API error during setPosition', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true, // Alpaca errors are often 200 OK with ErrorNumber != 0
        json: () => Promise.resolve({ Value: null, ErrorNumber: 1026, ErrorMessage: 'Error setting position' }),
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' })
      })
      await expect(client.setPosition(1)).rejects.toThrow(AlpacaError)
    })
  })

  // setFilterName() - Custom Extension
  describe('setFilterName (custom extension)', () => {
    it('should set filter name successfully', async () => {
      const filterNumber = 1
      const name = 'Ha'
      const expectedBody = new URLSearchParams({
        FilterNumber: filterNumber.toString(),
        Name: name,
        ClientID: client.clientId.toString()
      })

      await client.setFilterName(filterNumber, name)

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/filterwheel/${deviceNumber}/name`, // Assuming endpoint is 'name'
        {
          method: 'PUT',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: expectedBody.toString(),
          signal: expect.any(AbortSignal)
        }
      )
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  // --- Complex Getters ---

  // getFilterWheelState()
  describe('getFilterWheelState', () => {
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleWarnSpy.mockRestore()
    })

    it('should get all filter wheel properties successfully', async () => {
      const mockState = {
        focusoffsets: [0, 0, 0],
        names: ['R', 'G', 'B'],
        position: 0,
        connected: true, // This is the raw value from device
        name: 'Mock FilterWheel',
        description: 'Mock FilterWheel Device'
      }

      // Mock implementation for getProperties
      mockFetch.mockImplementation(async (url: string) => {
        const urlObj = new URL(url)
        const propertyName = urlObj.pathname.split('/')[5] // Extract property name
        const requestClientId = urlObj.searchParams.get('ClientID')

        expect(parseInt(requestClientId ?? '', 10)).toBe(client.clientId)

        let value: unknown = null
        if (propertyName === 'focusoffsets') value = mockState.focusoffsets
        else if (propertyName === 'names') value = mockState.names
        else if (propertyName === 'position') value = mockState.position
        else if (propertyName === 'connected')
          value = mockState.connected // Alpaca property name is 'connected'
        else if (propertyName === 'name') value = mockState.name
        else if (propertyName === 'description') value = mockState.description
        else {
          console.warn(`Unexpected property request in mock (all props): ${propertyName}`)
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ ErrorNumber: 1, ErrorMessage: 'Mock not found for all props', Value: null }),
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' })
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ Value: value, ErrorNumber: 0, ErrorMessage: '' }),
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' })
        })
      })

      const result = await client.getFilterWheelState()

      // Properties defined in filterwheel-client.ts getFilterWheelState, transformed to TS names
      const expectedProperties = ['focusoffsets', 'names', 'position', 'isConnected', 'name', 'description']

      expect(Object.keys(result).sort()).toEqual(expectedProperties.sort())
      expect(result.focusoffsets).toEqual(mockState.focusoffsets)
      expect(result.names).toEqual(mockState.names)
      expect(result.position).toEqual(mockState.position)
      expect(result.isConnected).toEqual(mockState.connected) // TS name is isConnected
      expect(result.name).toEqual(mockState.name)
      expect(result.description).toEqual(mockState.description)

      expect(mockFetch).toHaveBeenCalledTimes(expectedProperties.length)
      // Check Alpaca URL properties
      const alpacaPropertiesChecked = ['focusoffsets', 'names', 'position', 'connected', 'name', 'description']
      alpacaPropertiesChecked.forEach((prop) => {
        expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v1/filterwheel/${deviceNumber}/${prop}?ClientID=${client.clientId}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: expect.any(AbortSignal)
        })
      })
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it('should return partial data and warn if some properties fail', async () => {
      const mockSuccessfulState = {
        focusoffsets: [1, 2, 3],
        names: ['L', 'R', 'G', 'B'],
        // position will fail
        connected: true, // raw value
        name: 'FW-Partial',
        description: 'Partial Fail Test'
      }

      mockFetch.mockImplementation(async (url: string) => {
        const urlObj = new URL(url)
        const propertyName = urlObj.pathname.split('/')[5]
        const requestClientId = urlObj.searchParams.get('ClientID')
        expect(parseInt(requestClientId ?? '', 10)).toBe(client.clientId)

        if (propertyName === 'position') {
          // Simulate failure for 'position'
          return Promise.resolve({
            ok: true, // Alpaca error, so ok:true
            json: () => Promise.resolve({ ErrorNumber: 1000, ErrorMessage: 'Position failed intentionally', Value: null }),
            text: () => Promise.resolve('Alpaca error text for position'), // Added text() for completeness
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' })
          })
        }

        let value: unknown = null
        if (propertyName === 'focusoffsets') value = mockSuccessfulState.focusoffsets
        else if (propertyName === 'names') value = mockSuccessfulState.names
        else if (propertyName === 'connected') value = mockSuccessfulState.connected
        else if (propertyName === 'name') value = mockSuccessfulState.name
        else if (propertyName === 'description') value = mockSuccessfulState.description
        else {
          // This block should ideally not be hit if logic is correct for expected properties
          console.error(`ERROR: Unmocked property '${propertyName}' in partial data test mock`)
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ ErrorNumber: 1, ErrorMessage: `Mock not found for ${propertyName}`, Value: null }),
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' })
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ Value: value, ErrorNumber: 0, ErrorMessage: '' }),
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' })
        })
      })

      const result = await client.getFilterWheelState()

      expect(result.focusoffsets).toEqual(mockSuccessfulState.focusoffsets)
      expect(result.names).toEqual(mockSuccessfulState.names)
      expect(result.position).toBeUndefined() // Failed property should be undefined
      expect(result.isConnected).toEqual(mockSuccessfulState.connected) // TS name is isConnected
      expect(result.name).toEqual(mockSuccessfulState.name)
      expect(result.description).toEqual(mockSuccessfulState.description)

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1) // For the 'position' failure
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to get property 'position' (mapped to 'position'): Position failed intentionally")
      )
    })

    it('should handle http errors for individual properties in getFilterWheelState', async () => {
      const originalRetries = DEFAULT_OPTIONS.retries ?? 2
      const originalRetryDelay = DEFAULT_OPTIONS.retryDelay ?? 1000
      const originalTimeout = DEFAULT_OPTIONS.timeout ?? 10000

      DEFAULT_OPTIONS.retries = 0 // No retries for this specific test
      DEFAULT_OPTIONS.retryDelay = 1
      DEFAULT_OPTIONS.timeout = 100

      try {
        mockFetch.mockImplementation(async (url: string) => {
          const urlObj = new URL(url)
          const propertyName = urlObj.pathname.split('/')[5]
          const requestClientId = urlObj.searchParams.get('ClientID')
          expect(parseInt(requestClientId ?? '', 10)).toBe(client.clientId)

          if (propertyName === 'names') {
            // Simulate HTTP error for 'names'
            return Promise.resolve({
              ok: false,
              json: () => Promise.reject(new Error('Network error for names')),
              text: () => Promise.resolve('Internal Server Error Text'),
              status: 500,
              statusText: 'Internal Server Error StatusText', // Provide statusText
              headers: new Headers()
            })
          }
          // For other properties, return successfully
          let value: unknown = null
          if (propertyName === 'focusoffsets') value = [1, 1, 1]
          else if (propertyName === 'position') value = 0
          else if (propertyName === 'connected') value = true
          else if (propertyName === 'name') value = 'TestName'
          else if (propertyName === 'description') value = 'TestDescription'
          // else if propertyName is 'names', it's handled above.
          else {
            console.error(`ERROR: Unmocked property '${propertyName}' in HTTP error test mock`)
            return Promise.resolve({
              // Should not happen
              ok: true,
              json: () => Promise.resolve({ ErrorNumber: 1, ErrorMessage: `Mock not found for ${propertyName} in HTTP error test`, Value: null }),
              status: 200,
              headers: new Headers({ 'content-type': 'application/json' })
            })
          }

          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ Value: value, ErrorNumber: 0, ErrorMessage: '' }),
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' })
          })
        })

        const result = await client.getFilterWheelState()
        expect(result.names).toBeUndefined()
        expect(result.focusoffsets).toEqual([1, 1, 1]) // Check a successful one
        expect(result.isConnected).toBe(true) // Check another successful one
        expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Failed to get property 'names' (mapped to 'names'): HTTP error 500: Internal Server Error StatusText")
        )
      } finally {
        DEFAULT_OPTIONS.retries = originalRetries
        DEFAULT_OPTIONS.retryDelay = originalRetryDelay
        DEFAULT_OPTIONS.timeout = originalTimeout
      }
    })
  })

  // --- Error Handling Pattern #11 (Speeding up Retry Tests) ---
  describe('Error Handling with Retries (Pattern #11)', () => {
    // Provide default fallbacks matching DEFAULT_OPTIONS initial values if undefined
    const originalRetries = DEFAULT_OPTIONS.retries ?? 2
    const originalRetryDelay = DEFAULT_OPTIONS.retryDelay ?? 1000
    const originalTimeout = DEFAULT_OPTIONS.timeout ?? 10000

    beforeEach(() => {
      // Apply fast retry settings for these specific tests
      DEFAULT_OPTIONS.retries = 1 // 1 retry means 2 total attempts
      DEFAULT_OPTIONS.retryDelay = 1 // ms
      DEFAULT_OPTIONS.timeout = 100 // ms
    })

    afterEach(() => {
      // CRITICAL: Restore original default options
      DEFAULT_OPTIONS.retries = originalRetries
      DEFAULT_OPTIONS.retryDelay = originalRetryDelay
      DEFAULT_OPTIONS.timeout = originalTimeout
    })

    it('should retry GET requests on HTTP error according to DEFAULT_OPTIONS', async () => {
      mockFetch
        .mockResolvedValueOnce({
          // First attempt: fails
          ok: false,
          status: 500,
          json: () => Promise.reject(new Error('Server Error')),
          text: () => Promise.resolve('Server Error'),
          headers: new Headers()
        })
        .mockResolvedValueOnce({
          // Second attempt (retry): succeeds
          ok: true,
          json: () => Promise.resolve({ Value: [1, 2], ErrorNumber: 0, ErrorMessage: '' }),
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' })
        })

      const offsets = await client.getFocusOffsets()
      expect(offsets).toEqual([1, 2])
      expect(mockFetch).toHaveBeenCalledTimes(1 + (DEFAULT_OPTIONS.retries ?? 0)) // Initial + 1 retry
    })

    it('should throw AlpacaError after all retries fail for GET', async () => {
      mockFetch.mockResolvedValue({
        // All attempts fail
        ok: false,
        status: 503,
        json: () => Promise.reject(new Error('Service Unavailable')),
        text: () => Promise.resolve('Service Unavailable'),
        headers: new Headers()
      })

      await expect(client.getFocusOffsets()).rejects.toThrow(AlpacaError)
      expect(mockFetch).toHaveBeenCalledTimes(1 + (DEFAULT_OPTIONS.retries ?? 0))
    })

    it('should retry PUT requests on HTTP error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          // First attempt: fails
          ok: false,
          status: 500,
          json: () => Promise.reject(new Error('Server Error')),
          text: () => Promise.resolve('Server Error'),
          headers: new Headers()
        })
        .mockResolvedValueOnce({
          // Second attempt (retry): succeeds
          ok: true,
          json: () => Promise.resolve({ ErrorNumber: 0, ErrorMessage: '', Value: null }),
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' })
        })

      await client.setPosition(0)
      expect(mockFetch).toHaveBeenCalledTimes(1 + (DEFAULT_OPTIONS.retries ?? 0))
    })

    it('should throw AlpacaError after all retries fail for PUT', async () => {
      mockFetch.mockResolvedValue({
        // All attempts fail
        ok: false,
        status: 503,
        json: () => Promise.reject(new Error('Service Unavailable')),
        text: () => Promise.resolve('Service Unavailable'),
        headers: new Headers()
      })

      await expect(client.setPosition(0)).rejects.toThrow(AlpacaError)
      expect(mockFetch).toHaveBeenCalledTimes(1 + (DEFAULT_OPTIONS.retries ?? 0))
    })
  })
})
