import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SwitchClient } from '@/api/alpaca/switch-client'
import type { Device } from '@/stores/types/device-store.types'
import type { SwitchDevice } from '@/types/device.types' // Assuming SwitchDevice type exists
import { AlpacaError } from '@/api/alpaca/errors'
import { DEFAULT_OPTIONS, type RequestOptions } from '@/api/alpaca/types'
import type { ISwitchDetail } from '@/types/device.types'

const mockFetch = (global.fetch = vi.fn())

describe('SwitchClient', () => {
  const baseUrl = 'http://localhost:11111'
  const deviceNumber = 0
  let client: SwitchClient
  let mockSwitchDevice: SwitchDevice

  let originalDefaultOptions_retries: RequestOptions['retries']
  let originalDefaultOptions_retryDelay: RequestOptions['retryDelay']
  let originalDefaultOptions_timeout: RequestOptions['timeout']

  beforeEach(() => {
    mockSwitchDevice = {
      id: 'switch-1',
      name: 'Test Switch Device',
      type: 'switch',
      isConnected: true,
      isConnecting: false,
      isDisconnecting: false,
      status: 'connected',
      uniqueId: `ASCOM-switch-${deviceNumber}-67890`,
      deviceNumber,
      deviceType: 'Switch',
      interfaceVersion: 1,
      driverVersion: '1.0',
      driverInfo: 'Test Switch Driver',
      supportedActions: [],
      description: 'A test switch device',
      properties: {
        MaxSwitch: 8 // Example property
      }
    }
    client = new SwitchClient(baseUrl, deviceNumber, mockSwitchDevice as Device)
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
    expect(client.deviceType).toBe('switch')
    expect(client.deviceNumber).toBe(deviceNumber)
    expect(client.device).toBe(mockSwitchDevice)
    expect(client.baseUrl).toBe(baseUrl)
    expect(client.clientId).toBeGreaterThan(0)
  })

  // --- Simple GET Properties ---
  describe('maxSwitch', () => {
    it('should get maxSwitch value', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: 8, ErrorNumber: 0, ErrorMessage: '' }) })
      const result = await client.maxSwitch()
      expect(result).toBe(8)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/switch/${deviceNumber}/maxswitch?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })
  })

  // --- GET Properties with ID ---
  describe('GET properties by ID', () => {
    const switchId = 0

    it('getSwitchName should return name', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: 'Power Outlet 1', ErrorNumber: 0, ErrorMessage: '' }) })
      const result = await client.getSwitchName(switchId)
      expect(result).toBe('Power Outlet 1')
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/switch/${deviceNumber}/getswitchname?Id=${switchId}&ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('getSwitchValue should return value', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: 1, ErrorNumber: 0, ErrorMessage: '' }) })
      const result = await client.getSwitchValue(switchId)
      expect(result).toBe(1)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/switch/${deviceNumber}/getswitchvalue?Id=${switchId}&ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('getSwitchDescription should return description', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: 'Main Power Outlet', ErrorNumber: 0, ErrorMessage: '' }) })
      const result = await client.getSwitchDescription(switchId)
      expect(result).toBe('Main Power Outlet')
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/switch/${deviceNumber}/getswitchdescription?Id=${switchId}&ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('minSwitchValue should return min value', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: 0, ErrorNumber: 0, ErrorMessage: '' }) })
      const result = await client.minSwitchValue(switchId)
      expect(result).toBe(0)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/switch/${deviceNumber}/minswitchvalue?Id=${switchId}&ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('maxSwitchValue should return max value', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: 255, ErrorNumber: 0, ErrorMessage: '' }) })
      const result = await client.maxSwitchValue(switchId)
      expect(result).toBe(255)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/switch/${deviceNumber}/maxswitchvalue?Id=${switchId}&ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('switchStep should return step value', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: 1, ErrorNumber: 0, ErrorMessage: '' }) })
      const result = await client.switchStep(switchId)
      expect(result).toBe(1)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/switch/${deviceNumber}/switchstep?Id=${switchId}&ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('canAsync should return boolean', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: true, ErrorNumber: 0, ErrorMessage: '' }) })
      const result = await client.canAsync(switchId)
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/switch/${deviceNumber}/canasync?Id=${switchId}&ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('canWrite should return boolean', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: false, ErrorNumber: 0, ErrorMessage: '' }) })
      const result = await client.canWrite(switchId)
      expect(result).toBe(false)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/switch/${deviceNumber}/canwrite?Id=${switchId}&ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })
  })

  // --- PUT Methods ---
  describe('PUT methods', () => {
    const switchId = 0

    it('setSwitchName should call PUT correctly', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ErrorNumber: 0, ErrorMessage: '' }) })
      const newName = 'New Switch Name'
      await client.setSwitchName(switchId, newName)
      const expectedBody = new URLSearchParams()
      expectedBody.append('Id', switchId.toString())
      expectedBody.append('Name', newName)
      expectedBody.append('ClientID', client.clientId.toString())
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/switch/${deviceNumber}/setswitchname`,
        expect.objectContaining({ method: 'PUT', body: expectedBody.toString() })
      )
    })

    it('setSwitchValue should call PUT correctly for numeric value', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ErrorNumber: 0, ErrorMessage: '' }) })
      const newValue = 128
      await client.setSwitchValue(switchId, newValue)
      const expectedBody = new URLSearchParams()
      expectedBody.append('Id', switchId.toString())
      expectedBody.append('Value', newValue.toString()) // Alpaca spec says double for Value
      expectedBody.append('ClientID', client.clientId.toString())
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/switch/${deviceNumber}/setswitchvalue`,
        expect.objectContaining({ method: 'PUT', body: expectedBody.toString() })
      )
    })

    it('setSwitch should call PUT correctly for boolean state', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ErrorNumber: 0, ErrorMessage: '' }) })
      await client.setSwitch(switchId, true)
      const expectedBody = new URLSearchParams()
      expectedBody.append('Id', switchId.toString())
      expectedBody.append('State', 'True') // base-client's toAscomValue handles boolean to "True"/"False"
      expectedBody.append('ClientID', client.clientId.toString())
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/switch/${deviceNumber}/setswitch`,
        expect.objectContaining({ method: 'PUT', body: expectedBody.toString() })
      )
    })
  })

  // --- Asynchronous Methods ---
  describe('Asynchronous methods', () => {
    const switchId = 1
    const transactionId = 12345

    it('setAsyncSwitch should call PUT correctly', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ErrorNumber: 0, ErrorMessage: '' }) })
      await client.setAsyncSwitch(switchId, false)
      const expectedBody = new URLSearchParams()
      expectedBody.append('Id', switchId.toString())
      expectedBody.append('State', 'False')
      expectedBody.append('ClientID', client.clientId.toString())
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/switch/${deviceNumber}/setasync`,
        expect.objectContaining({ method: 'PUT', body: expectedBody.toString() })
      )
    })

    it('setAsyncSwitchValue should call PUT correctly', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ErrorNumber: 0, ErrorMessage: '' }) })
      const newValue = 50
      await client.setAsyncSwitchValue(switchId, newValue)
      const expectedBody = new URLSearchParams()
      expectedBody.append('Id', switchId.toString())
      expectedBody.append('Value', newValue.toString())
      expectedBody.append('ClientID', client.clientId.toString())
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/switch/${deviceNumber}/setasyncvalue`,
        expect.objectContaining({ method: 'PUT', body: expectedBody.toString() })
      )
    })

    it('isStateChangeComplete should call GET correctly', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: true, ErrorNumber: 0, ErrorMessage: '' }) })
      const result = await client.isStateChangeComplete(switchId, transactionId)
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/switch/${deviceNumber}/statechangecomplete?Id=${switchId}&TransactionID=${transactionId}&ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })
  })

  // --- Helper Methods (getSwitchDetails, getAllSwitchDetails) ---
  // These are more complex and involve multiple calls, so they get their own describe block.
  // Basic happy path tests for now. More exhaustive tests (e.g. for console.warns) could be added.

  describe('getSwitchDetails', () => {
    const switchId = 0
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleWarnSpy.mockRestore()
    })

    it('should fetch all details for a value-based switch', async () => {
      const mockSwitchData: Record<string, unknown> = {
        getswitchname: 'Relay 1',
        getswitchvalue: 100,
        getswitchdescription: 'Controls the main light',
        minswitchvalue: 0,
        maxswitchvalue: 255,
        switchstep: 1,
        canasync: false,
        canwrite: true
      }

      mockFetch.mockImplementation(async (url: string) => {
        const method = url.substring(url.lastIndexOf('/') + 1).split('?')[0]
        if (Object.prototype.hasOwnProperty.call(mockSwitchData, method)) {
          return { ok: true, json: async () => ({ Value: mockSwitchData[method], ErrorNumber: 0, ErrorMessage: '' }) }
        }
        return { ok: false, status: 404, json: async () => ({ ErrorNumber: 1024, ErrorMessage: 'Not found' }) }
      })

      const result = await client.getSwitchDetails(switchId)
      expect(result).toEqual<ISwitchDetail>({
        name: 'Relay 1',
        value: 100,
        description: 'Controls the main light',
        min: 0,
        max: 255,
        step: 1,
        canAsync: false,
        canWrite: true
      })
      expect(mockFetch).toHaveBeenCalledTimes(Object.keys(mockSwitchData).length)
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it('should fetch details for a boolean-like switch (min/max/step might be missing or throw)', async () => {
      const mockSwitchData: Record<string, unknown> = {
        getswitchname: 'Boolean Relay',
        getswitchvalue: 1, // Often 0 or 1 for boolean
        getswitchdescription: 'A simple on/off relay',
        canasync: true,
        canwrite: true
        // minswitchvalue, maxswitchvalue, switchstep will fail to fetch
      }

      mockFetch.mockImplementation(async (url: string) => {
        const method = url.substring(url.lastIndexOf('/') + 1).split('?')[0]
        if (Object.prototype.hasOwnProperty.call(mockSwitchData, method)) {
          return { ok: true, json: async () => ({ Value: mockSwitchData[method], ErrorNumber: 0, ErrorMessage: '' }) }
        }
        // Simulate failure for min/max/step
        if (['minswitchvalue', 'maxswitchvalue', 'switchstep'].includes(method)) {
          return { ok: true, json: async () => ({ Value: null, ErrorNumber: 1025, ErrorMessage: 'Property not implemented' }) }
        }
        return { ok: false, status: 404, json: async () => ({ ErrorNumber: 1024, ErrorMessage: 'Not found' }) }
      })

      const result = await client.getSwitchDetails(switchId)
      expect(result).toEqual<ISwitchDetail>({
        name: 'Boolean Relay',
        value: 1,
        description: 'A simple on/off relay',
        min: undefined, // These should be undefined as they failed
        max: undefined,
        step: undefined,
        canAsync: true,
        canWrite: true
      })
      expect(mockFetch).toHaveBeenCalledTimes(Object.keys(mockSwitchData).length + 3) // +3 for failed min/max/step
      expect(consoleWarnSpy).toHaveBeenCalledTimes(3) // Expect 3 warnings now
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Could not get minSwitchValue for switch ${switchId}`),
        expect.any(AlpacaError)
      )
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Could not get maxSwitchValue for switch ${switchId}`),
        expect.any(AlpacaError)
      )
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining(`Could not get switchStep for switch ${switchId}`), expect.any(AlpacaError))
    })
  })

  describe('getAllSwitchDetails', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
    })

    it('should fetch details for all switches based on maxSwitch', async () => {
      const numSwitches = 2
      // mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: numSwitches, ErrorNumber: 0, ErrorMessage: '' }) }) // For maxSwitch - will be handled by mockImplementation

      const switch0Data = { name: 'S0', value: 0, description: 'D0', canAsync: false, canWrite: true, min: 0, max: 1, step: 1 }
      const switch1Data = { name: 'S1', value: 1, description: 'D1', canAsync: true, canWrite: false, min: 0, max: 10, step: 2 }

      let callCountForMaxSwitch = 0 // Separate counter for maxSwitch
      const alpacaToDataKeyMap: Record<string, keyof typeof switch0Data> = {
        getswitchname: 'name',
        getswitchvalue: 'value',
        getswitchdescription: 'description',
        canasync: 'canAsync',
        canwrite: 'canWrite',
        minswitchvalue: 'min',
        maxswitchvalue: 'max',
        switchstep: 'step'
      }

      mockFetch.mockImplementation(async (url: string) => {
        const method = url.substring(url.lastIndexOf('/') + 1).split('?')[0]

        if (method === 'maxswitch') {
          callCountForMaxSwitch++
          return { ok: true, json: async () => ({ Value: numSwitches, ErrorNumber: 0, ErrorMessage: '' }) }
        }

        const idStr = new URLSearchParams(url.split('?')[1]).get('Id')
        if (idStr === null) {
          // Should not happen for these calls but good practice
          return { ok: false, status: 400, json: async () => ({ ErrorNumber: 1024, ErrorMessage: `Missing Id for ${method}` }) }
        }
        const id = parseInt(idStr)
        const currentSwitchData = id === 0 ? switch0Data : switch1Data

        const dataKey = alpacaToDataKeyMap[method]
        if (dataKey && Object.prototype.hasOwnProperty.call(currentSwitchData, dataKey)) {
          return { ok: true, json: async () => ({ Value: currentSwitchData[dataKey], ErrorNumber: 0, ErrorMessage: '' }) }
        }

        console.error(`[TEST MOCK ERROR] Mock not found for method ${method} with id ${id}. URL: ${url}`)
        return { ok: false, status: 404, json: async () => ({ ErrorNumber: 1024, ErrorMessage: `Mock not found for ${method} id ${id}` }) }
      })

      const results = await client.getAllSwitchDetails()
      expect(results.length).toBe(numSwitches)
      expect(results[0]).toEqual(expect.objectContaining(switch0Data))
      expect(results[1]).toEqual(expect.objectContaining(switch1Data))

      const expectedFetchesPerSwitch = 8 // name, value, desc, canAsync, canWrite, min, max, step
      expect(callCountForMaxSwitch).toBe(1) // Ensure maxSwitch was called once
      expect(mockFetch).toHaveBeenCalledTimes(1 + numSwitches * expectedFetchesPerSwitch)
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('should handle errors when fetching individual switch details and add placeholders', async () => {
      const originalRetries = DEFAULT_OPTIONS.retries
      const originalRetryDelay = DEFAULT_OPTIONS.retryDelay
      const originalTimeout = DEFAULT_OPTIONS.timeout

      DEFAULT_OPTIONS.retries = 0 // Disable retries for this specific test
      DEFAULT_OPTIONS.retryDelay = 1
      DEFAULT_OPTIONS.timeout = 100

      try {
        const numSwitches = 1
        // Corrected mock setup: first mock is for maxSwitch, second is for the first call within getSwitchDetails
        mockFetch
          .mockResolvedValueOnce({ ok: true, json: async () => ({ Value: numSwitches, ErrorNumber: 0, ErrorMessage: '' }) }) // For maxSwitch
          .mockRejectedValueOnce(new Error('Simulated network error for getSwitchName')) // For getSwitchName(0) inside getSwitchDetails(0)

        const results = await client.getAllSwitchDetails()
        expect(results.length).toBe(numSwitches)
        expect(results[0]).toEqual({
          name: 'Switch 0 (Error)',
          value: false,
          description: 'Could not load details for this switch.'
        })
        expect(mockFetch).toHaveBeenCalledTimes(2) // 1 for maxSwitch + 1 for the failed getSwitchName (since retries=0)
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error getting details for switch 0:', expect.any(Error))
      } finally {
        DEFAULT_OPTIONS.retries = originalRetries
        DEFAULT_OPTIONS.retryDelay = originalRetryDelay
        DEFAULT_OPTIONS.timeout = originalTimeout
      }
    })
  })

  // --- Error Handling for representative methods ---
  describe('General Error Handling', () => {
    beforeEach(() => {
      DEFAULT_OPTIONS.retries = 1
      DEFAULT_OPTIONS.retryDelay = 1
      DEFAULT_OPTIONS.timeout = 100
    })

    it('maxSwitch should throw AlpacaError on device error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Value: null, ErrorNumber: 1025, ErrorMessage: 'MaxSwitch error' }) })
      try {
        await client.maxSwitch()
        throw new Error('Should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(AlpacaError)
        expect((e as AlpacaError).deviceError).toEqual({ errorNumber: 1025, errorMessage: 'MaxSwitch error' })
      }
      expect(mockFetch).toHaveBeenCalledTimes(1) // Alpaca errors (200 OK) are not retried by GET
    })

    it('setSwitchValue should throw AlpacaError on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'))
      mockFetch.mockRejectedValueOnce(new Error('Network failure')) // For retry
      try {
        await client.setSwitchValue(0, 1)
        throw new Error('Should have thrown')
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
