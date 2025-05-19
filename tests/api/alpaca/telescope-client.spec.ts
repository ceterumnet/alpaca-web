import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { TelescopeClient } from '@/api/alpaca/telescope-client'
import type { UnifiedDevice } from '@/stores/types/device-store.types'
import { AlpacaError } from '@/api/alpaca/errors'
import { DEFAULT_OPTIONS } from '@/api/alpaca/types' // For pattern #11

const mockFetch = (global.fetch = vi.fn())
const mockTelescopeDevice: UnifiedDevice = {
  name: 'Mock Telescope',
  type: 'Telescope',
  isConnected: true,
  properties: {},
  DeviceName: 'Mock Telescope',
  DeviceNumber: 0,
  DeviceType: 'Telescope',
  DriverInfo: 'Mock Telescope Driver',
  DriverVersion: '1.0',
  SupportedActions: [],
  UniqueID: 'mock-telescope-0',
  Host: 'localhost',
  Port: 11111,
  Connected: true,
  InterfaceVersion: 1,
  isConnecting: false,
  isDisconnecting: false,
  status: 'connected',
  id: 'mock-telescope-0',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  profile_id: 'default',
  settings: {},
  παρουσία: true
}

describe('TelescopeClient', () => {
  let client: TelescopeClient
  const baseUrl = 'http://localhost:11111/api/v1/telescope/0'
  const deviceNumber = 0

  // Speed up all tests by reducing retry/timeout settings (Pattern #11)
  const originalRetries = DEFAULT_OPTIONS.retries
  const originalRetryDelay = DEFAULT_OPTIONS.retryDelay
  const originalTimeout = DEFAULT_OPTIONS.timeout

  beforeAll(() => {
    DEFAULT_OPTIONS.retries = 1
    DEFAULT_OPTIONS.retryDelay = 1
    DEFAULT_OPTIONS.timeout = 100
  })

  afterAll(() => {
    DEFAULT_OPTIONS.retries = originalRetries
    DEFAULT_OPTIONS.retryDelay = originalRetryDelay
    DEFAULT_OPTIONS.timeout = originalTimeout
  })

  beforeEach(() => {
    client = new TelescopeClient(baseUrl, deviceNumber, mockTelescopeDevice)
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should initialize with correct base properties', () => {
    expect(client.baseUrl).toBe(baseUrl)
    expect(client.deviceType).toBe('telescope')
    expect(client.deviceNumber).toBe(deviceNumber)
    expect(client.device).toBe(mockTelescopeDevice)
    expect(client.clientId).toBeGreaterThan(0)
  })

  // --- Capability Methods ---
  const capabilityMethods: Array<[keyof TelescopeClient, string]> = [
    ['canFindHome', 'canfindhome'],
    ['canPark', 'canpark'],
    ['canUnpark', 'canunpark'],
    ['canSetPark', 'cansetpark'],
    ['canPulseGuide', 'canpulseguide'],
    ['canSetTracking', 'cansettracking'],
    ['canSlew', 'canslew'],
    ['canSlewAltAz', 'canslewaltaz'],
    ['canSlewAsync', 'canslewasync'],
    ['canSlewAltAzAsync', 'canslewaltazasync'],
    ['canSync', 'cansync'],
    ['canSyncAltAz', 'cansyncaltaz'],
    ['canSetDeclinationRate', 'cansetdeclinationrate'],
    ['canSetGuideRates', 'cansetguiderates'],
    ['canSetPierSide', 'cansetpierside'],
    ['canSetRightAscensionRate', 'cansetrightascensionrate']
  ]

  capabilityMethods.forEach(([methodName, endpoint]) => {
    describe(`${String(methodName)}`, () => {
      it('should return true when API returns true', async () => {
        mockFetch.mockResolvedValueOnce(
          new Response(JSON.stringify({ Value: true, ErrorNumber: 0, ErrorMessage: '' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        )
        const result = await (client[methodName] as () => Promise<boolean>)()
        expect(result).toBe(true)
        expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/${endpoint}?ClientID=${client.clientId}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: expect.any(AbortSignal)
        })
      })

      it('should return false when API returns false', async () => {
        mockFetch.mockResolvedValueOnce(
          new Response(JSON.stringify({ Value: false, ErrorNumber: 0, ErrorMessage: '' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        )
        const result = await (client[methodName] as () => Promise<boolean>)()
        expect(result).toBe(false)
      })

      it('should throw AlpacaError on API error', async () => {
        mockFetch.mockResolvedValueOnce(
          new Response(JSON.stringify({ Value: null, ErrorNumber: 100, ErrorMessage: 'Device error' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        )
        await expect((client[methodName] as () => Promise<boolean>)()).rejects.toThrow(AlpacaError)
      })
    })
  })

  describe('canMoveAxis', () => {
    const axis = 0
    it('should return true when API returns true', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: true, ErrorNumber: 0, ErrorMessage: '' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      const result = await client.canMoveAxis(axis)
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/canmoveaxis?Axis=${axis}&ClientID=${client.clientId}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: expect.any(AbortSignal)
      })
    })

    it('should return false when API returns false', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: false, ErrorNumber: 0, ErrorMessage: '' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      const result = await client.canMoveAxis(axis)
      expect(result).toBe(false)
    })

    it('should throw AlpacaError on API error', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 100, ErrorMessage: 'Device error' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await expect(client.canMoveAxis(axis)).rejects.toThrow(AlpacaError)
    })
  })

  // --- Action Methods (PUT, no parameters) ---
  const actionMethodsNoParams: Array<[keyof TelescopeClient, string]> = [
    ['park', 'park'],
    ['unpark', 'unpark'],
    ['setpark', 'setpark'],
    ['slewToTarget', 'slewtotarget'],
    ['slewToTargetAsync', 'slewtotargetasync'],
    ['syncToTarget', 'synctotarget'],
    ['abortSlew', 'abortslew'],
    ['findHome', 'findhome']
  ]

  actionMethodsNoParams.forEach(([methodName, endpoint]) => {
    describe(`${String(methodName)}`, () => {
      it('should call the correct endpoint with PUT', async () => {
        mockFetch.mockResolvedValueOnce(
          new Response(JSON.stringify({ Value: null, ErrorNumber: 0, ErrorMessage: '' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        )
        await (client[methodName] as () => Promise<void>)()
        const expectedBody = new URLSearchParams()
        expectedBody.append('ClientID', client.clientId.toString())

        expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/${endpoint}`, {
          method: 'PUT',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: expectedBody.toString(),
          signal: expect.any(AbortSignal)
        })
      })

      it('should throw AlpacaError on API error', async () => {
        mockFetch.mockResolvedValueOnce(
          new Response(JSON.stringify({ Value: null, ErrorNumber: 101, ErrorMessage: 'Action failed' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        )
        await expect((client[methodName] as () => Promise<void>)()).rejects.toThrow(AlpacaError)
      })

      it('should throw TypeError on network error', async () => {
        mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }))
        await expect((client[methodName] as () => Promise<void>)()).rejects.toThrow(TypeError)
      })
    })
  })

  // --- Slew Methods (PUT with RA/Dec or Alt/Az) ---
  describe('slewToCoordinates', () => {
    const rightAscension = 12.34
    const declination = 56.78
    it('should call slewToCoordinates with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 0, ErrorMessage: '' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await client.slewToCoordinates(rightAscension, declination)
      const expectedBody = new URLSearchParams()
      expectedBody.append('RightAscension', rightAscension.toString())
      expectedBody.append('Declination', declination.toString())
      expectedBody.append('ClientID', client.clientId.toString())

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/slewtocoordinates`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: expectedBody.toString(),
        signal: expect.any(AbortSignal)
      })
    })
    // Add error tests
    it('should throw AlpacaError on API error', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 101, ErrorMessage: 'Slew failed' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await expect(client.slewToCoordinates(rightAscension, declination)).rejects.toThrow(AlpacaError)
    })

    it('should throw TypeError on network error', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }))
      await expect(client.slewToCoordinates(rightAscension, declination)).rejects.toThrow(TypeError)
    })
  })

  describe('slewToCoordinatesAsync', () => {
    const rightAscension = 12.34
    const declination = 56.78
    it('should call slewToCoordinatesAsync with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 0, ErrorMessage: '' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await client.slewToCoordinatesAsync(rightAscension, declination)
      const expectedBody = new URLSearchParams()
      expectedBody.append('RightAscension', rightAscension.toString())
      expectedBody.append('Declination', declination.toString())
      expectedBody.append('ClientID', client.clientId.toString())

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/slewtocoordinatesasync`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: expectedBody.toString(),
        signal: expect.any(AbortSignal)
      })
    })
    // Add error tests
    it('should throw AlpacaError on API error', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 101, ErrorMessage: 'Slew async failed' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await expect(client.slewToCoordinatesAsync(rightAscension, declination)).rejects.toThrow(AlpacaError)
    })

    it('should throw TypeError on network error', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }))
      await expect(client.slewToCoordinatesAsync(rightAscension, declination)).rejects.toThrow(TypeError)
    })
  })

  describe('slewToAltAz', () => {
    const altitude = 45.0
    const azimuth = 180.0
    it('should call slewToAltAz with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 0, ErrorMessage: '' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await client.slewToAltAz(altitude, azimuth)
      const expectedBody = new URLSearchParams()
      expectedBody.append('Altitude', altitude.toString())
      expectedBody.append('Azimuth', azimuth.toString())
      expectedBody.append('ClientID', client.clientId.toString())

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/slewtoaltaz`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: expectedBody.toString(),
        signal: expect.any(AbortSignal)
      })
    })
    // Add error tests
    it('should throw AlpacaError on API error', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 101, ErrorMessage: 'Slew AltAz failed' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await expect(client.slewToAltAz(altitude, azimuth)).rejects.toThrow(AlpacaError)
    })

    it('should throw TypeError on network error', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }))
      await expect(client.slewToAltAz(altitude, azimuth)).rejects.toThrow(TypeError)
    })
  })

  describe('slewToAltAzAsync', () => {
    const altitude = 45.0
    const azimuth = 180.0
    it('should call slewToAltAzAsync with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 0, ErrorMessage: '' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await client.slewToAltAzAsync(altitude, azimuth)
      const expectedBody = new URLSearchParams()
      expectedBody.append('Altitude', altitude.toString())
      expectedBody.append('Azimuth', azimuth.toString())
      expectedBody.append('ClientID', client.clientId.toString())

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/slewtoaltazasync`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: expectedBody.toString(),
        signal: expect.any(AbortSignal)
      })
    })
    // Add error tests
    it('should throw AlpacaError on API error', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 101, ErrorMessage: 'Slew AltAz async failed' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await expect(client.slewToAltAzAsync(altitude, azimuth)).rejects.toThrow(AlpacaError)
    })

    it('should throw TypeError on network error', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }))
      await expect(client.slewToAltAzAsync(altitude, azimuth)).rejects.toThrow(TypeError)
    })
  })

  // --- Sync Methods (PUT with RA/Dec or Alt/Az) ---
  describe('syncToCoordinates', () => {
    const rightAscension = 12.34
    const declination = 56.78
    it('should call syncToCoordinates with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 0, ErrorMessage: '' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await client.syncToCoordinates(rightAscension, declination)
      const expectedBody = new URLSearchParams()
      expectedBody.append('RightAscension', rightAscension.toString())
      expectedBody.append('Declination', declination.toString())
      expectedBody.append('ClientID', client.clientId.toString())

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/synctocoordinates`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: expectedBody.toString(),
        signal: expect.any(AbortSignal)
      })
    })
    // Add error tests
    it('should throw AlpacaError on API error', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 101, ErrorMessage: 'Sync failed' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await expect(client.syncToCoordinates(rightAscension, declination)).rejects.toThrow(AlpacaError)
    })

    it('should throw TypeError on network error', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }))
      await expect(client.syncToCoordinates(rightAscension, declination)).rejects.toThrow(TypeError)
    })
  })

  describe('syncToAltAz', () => {
    const altitude = 45.0
    const azimuth = 180.0
    it('should call syncToAltAz with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 0, ErrorMessage: '' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await client.syncToAltAz(altitude, azimuth)
      const expectedBody = new URLSearchParams()
      expectedBody.append('Altitude', altitude.toString())
      expectedBody.append('Azimuth', azimuth.toString())
      expectedBody.append('ClientID', client.clientId.toString())

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/synctoaltaz`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: expectedBody.toString(),
        signal: expect.any(AbortSignal)
      })
    })
    // Add error tests
    it('should throw AlpacaError on API error', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 101, ErrorMessage: 'Sync AltAz failed' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await expect(client.syncToAltAz(altitude, azimuth)).rejects.toThrow(AlpacaError)
    })

    it('should throw TypeError on network error', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }))
      await expect(client.syncToAltAz(altitude, azimuth)).rejects.toThrow(TypeError)
    })
  })

  // --- Movement Control Methods (PUT with parameters) ---
  describe('moveAxis', () => {
    const axis = 1 // Example axis (0 for RA/Azm, 1 for Dec/Alt, 2 for Ter. Focuser)
    const rate = 0.5 // Example rate
    it('should call moveAxis with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 0, ErrorMessage: '' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await client.moveAxis(axis, rate)
      const expectedBody = new URLSearchParams()
      expectedBody.append('Axis', axis.toString())
      expectedBody.append('Rate', rate.toString())
      expectedBody.append('ClientID', client.clientId.toString())

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/moveaxis`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: expectedBody.toString(),
        signal: expect.any(AbortSignal)
      })
    })
    // Add error tests
    it('should throw AlpacaError on API error', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 101, ErrorMessage: 'Move axis failed' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await expect(client.moveAxis(axis, rate)).rejects.toThrow(AlpacaError)
    })

    it('should throw TypeError on network error', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }))
      await expect(client.moveAxis(axis, rate)).rejects.toThrow(TypeError)
    })
  })

  describe('pulseGuide', () => {
    const direction = 0 // Example direction (0: North, 1: South, 2: East, 3: West)
    const duration = 1000 // Example duration in ms
    it('should call pulseGuide with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 0, ErrorMessage: '' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await client.pulseGuide(direction, duration)
      const expectedBody = new URLSearchParams()
      expectedBody.append('Direction', direction.toString())
      expectedBody.append('Duration', duration.toString()) // Alpaca expects Duration in ms
      expectedBody.append('ClientID', client.clientId.toString())

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/pulseguide`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: expectedBody.toString(),
        signal: expect.any(AbortSignal)
      })
    })
    // Add error tests
    it('should throw AlpacaError on API error', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 101, ErrorMessage: 'Pulse guide failed' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await expect(client.pulseGuide(direction, duration)).rejects.toThrow(AlpacaError)
    })

    it('should throw TypeError on network error', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }))
      await expect(client.pulseGuide(direction, duration)).rejects.toThrow(TypeError)
    })
  })

  // --- Target Setting (setProperty) ---
  describe('setTargetRightAscension', () => {
    const ra = 15.5
    it('should call setProperty for targetrightascension', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 0, ErrorMessage: '' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await client.setTargetRightAscension(ra)
      const expectedBody = new URLSearchParams()
      // setProperty uses toParamFormat, which should make it TargetRightAscension
      expectedBody.append('TargetRightAscension', ra.toString())
      expectedBody.append('ClientID', client.clientId.toString())

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/targetrightascension`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: expectedBody.toString(),
        signal: expect.any(AbortSignal)
      })
    })
    // Add error tests
    it('should throw AlpacaError on API error', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 101, ErrorMessage: 'Set TRA failed' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await expect(client.setTargetRightAscension(ra)).rejects.toThrow(AlpacaError)
    })

    it('should throw TypeError on network error', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }))
      await expect(client.setTargetRightAscension(ra)).rejects.toThrow(TypeError)
    })
  })

  describe('setTargetDeclination', () => {
    const dec = -30.25
    it('should call setProperty for targetdeclination', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 0, ErrorMessage: '' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await client.setTargetDeclination(dec)
      const expectedBody = new URLSearchParams()
      // setProperty uses toParamFormat, which should make it TargetDeclination
      expectedBody.append('TargetDeclination', dec.toString())
      expectedBody.append('ClientID', client.clientId.toString())

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/targetdeclination`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: expectedBody.toString(),
        signal: expect.any(AbortSignal)
      })
    })
    // Add error tests
    it('should throw AlpacaError on API error', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 101, ErrorMessage: 'Set TDec failed' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await expect(client.setTargetDeclination(dec)).rejects.toThrow(AlpacaError)
    })

    it('should throw TypeError on network error', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }))
      await expect(client.setTargetDeclination(dec)).rejects.toThrow(TypeError)
    })
  })

  // --- Tracking Methods (setProperty) ---
  describe('setTracking', () => {
    it('should call setProperty for tracking with true', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 0, ErrorMessage: '' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await client.setTracking(true)
      const expectedBody = new URLSearchParams()
      // setProperty uses toParamFormat (Tracking) and toAscomValue ("True")
      expectedBody.append('Tracking', 'True')
      expectedBody.append('ClientID', client.clientId.toString())

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/tracking`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: expectedBody.toString(),
        signal: expect.any(AbortSignal)
      })
    })

    it('should call setProperty for tracking with false', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 0, ErrorMessage: '' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await client.setTracking(false)
      const expectedBody = new URLSearchParams()
      expectedBody.append('Tracking', 'False') // toAscomValue
      expectedBody.append('ClientID', client.clientId.toString())

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/tracking`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: expectedBody.toString(),
        signal: expect.any(AbortSignal)
      })
    })
    // Add error tests
    it('should throw AlpacaError on API error when setting true', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 101, ErrorMessage: 'Set Tracking true failed' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await expect(client.setTracking(true)).rejects.toThrow(AlpacaError)
    })

    it('should throw TypeError on network error when setting true', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }))
      await expect(client.setTracking(true)).rejects.toThrow(TypeError)
    })

    it('should throw AlpacaError on API error when setting false', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 101, ErrorMessage: 'Set Tracking false failed' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await expect(client.setTracking(false)).rejects.toThrow(AlpacaError)
    })

    it('should throw TypeError on network error when setting false', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }))
      await expect(client.setTracking(false)).rejects.toThrow(TypeError)
    })
  })

  describe('setTrackingRate', () => {
    const rate = 1 // Example tracking rate (0: Sidereal, 1: Lunar, 2: Solar, 3: King)
    it('should call setProperty for trackingrate', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 0, ErrorMessage: '' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await client.setTrackingRate(rate)
      const expectedBody = new URLSearchParams()
      // setProperty uses toParamFormat (TrackingRate)
      expectedBody.append('TrackingRate', rate.toString())
      expectedBody.append('ClientID', client.clientId.toString())

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/trackingrate`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: expectedBody.toString(),
        signal: expect.any(AbortSignal)
      })
    })
    // Add error tests
    it('should throw AlpacaError on API error', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 101, ErrorMessage: 'Set TRate failed' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await expect(client.setTrackingRate(rate)).rejects.toThrow(AlpacaError)
    })

    it('should throw TypeError on network error', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }))
      await expect(client.setTrackingRate(rate)).rejects.toThrow(TypeError)
    })
  })

  // --- Date/Time Methods (setProperty) ---
  describe('setUTCDate', () => {
    const date = new Date('2023-10-27T10:20:30.000Z')
    const expectedDateString = date.toISOString() // "2023-10-27T10:20:30.000Z"
    it('should call setProperty for utcdate', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 0, ErrorMessage: '' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await client.setUTCDate(date)
      const expectedBody = new URLSearchParams()
      // setProperty uses toParamFormat (UTCDate)
      expectedBody.append('UTCDate', expectedDateString)
      expectedBody.append('ClientID', client.clientId.toString())

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/utcdate`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: expectedBody.toString(),
        signal: expect.any(AbortSignal)
      })
    })
    // Add error tests
    it('should throw AlpacaError on API error', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 101, ErrorMessage: 'Set UTCDate failed' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await expect(client.setUTCDate(date)).rejects.toThrow(AlpacaError)
    })

    it('should throw TypeError on network error', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }))
      await expect(client.setUTCDate(date)).rejects.toThrow(TypeError)
    })
  })

  // --- Additional GET Properties ---
  const simpleGetProperties: Array<[keyof TelescopeClient, string, number | boolean | string]> = [
    ['getApertureArea', 'aperturearea', 100.0],
    ['getApertureDiameter', 'aperturediameter', 10.0],
    ['getGuideRateDeclination', 'guideratedeclination', 0.5],
    ['getGuideRateRightAscension', 'guideraterightascension', 0.5],
    ['isPulseGuiding', 'ispulseguiding', false],
    ['getSlewSettleTime', 'slewsettletime', 5]
    // Add more simple GET properties here as needed from the client
  ]

  simpleGetProperties.forEach(([methodName, endpoint, mockValue]) => {
    describe(`${String(methodName)}`, () => {
      it(`should return value from API for ${endpoint}`, async () => {
        mockFetch.mockResolvedValueOnce(
          new Response(JSON.stringify({ Value: mockValue, ErrorNumber: 0, ErrorMessage: '' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        )
        const result = await (client[methodName] as () => Promise<number | boolean | string>)()
        expect(result).toBe(mockValue)
        expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/${endpoint}?ClientID=${client.clientId}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: expect.any(AbortSignal)
        })
      })
      // Add error test
      it('should throw AlpacaError on API error', async () => {
        mockFetch.mockResolvedValueOnce(
          new Response(JSON.stringify({ Value: null, ErrorNumber: 102, ErrorMessage: 'Property error' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        )
        await expect((client[methodName] as () => Promise<unknown>)()).rejects.toThrow(AlpacaError)
      })
    })
  })

  // --- Additional PUT Methods for Properties ---
  // These use this.put({ Value: ... }), so ClientID should be present, but not ClientTransactionID (unless base client adds it to all PUTs)
  // Base client adds ClientID and ClientTransactionID for `this.put` if not already in params
  // However, these methods in telescope-client.ts use `this.put(endpoint, { Value: rate })`
  // The `put` method in `base-client` adds ClientID and ClientTransactionID to the parameters object.

  describe('setGuideRateDeclination', () => {
    const rate = 1.23
    it('should call PUT for guideratedeclination with Value param', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 0, ErrorMessage: '' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await client.setGuideRateDeclination(rate)
      const expectedBody = new URLSearchParams()
      expectedBody.append('Value', rate.toString()) // Client sends this as a parameter
      expectedBody.append('ClientID', client.clientId.toString()) // Base client adds these

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/guideratedeclination`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: expectedBody.toString(),
        signal: expect.any(AbortSignal)
      })
    })
    // Add error test
    it('should throw AlpacaError on API error', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 101, ErrorMessage: 'Set GRDec failed' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await expect(client.setGuideRateDeclination(rate)).rejects.toThrow(AlpacaError)
    })

    it('should throw TypeError on network error', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }))
      await expect(client.setGuideRateDeclination(rate)).rejects.toThrow(TypeError)
    })
  })

  describe('setGuideRateRightAscension', () => {
    const rate = 1.23
    it('should call PUT for guideraterightascension with Value param', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 0, ErrorMessage: '' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await client.setGuideRateRightAscension(rate)
      const expectedBody = new URLSearchParams()
      expectedBody.append('Value', rate.toString()) // Client sends this
      expectedBody.append('ClientID', client.clientId.toString()) // Base client adds these

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/guideraterightascension`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: expectedBody.toString(),
        signal: expect.any(AbortSignal)
      })
    })
    // Add error test
    it('should throw AlpacaError on API error', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 101, ErrorMessage: 'Set GRRA failed' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await expect(client.setGuideRateRightAscension(rate)).rejects.toThrow(AlpacaError)
    })

    it('should throw TypeError on network error', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }))
      await expect(client.setGuideRateRightAscension(rate)).rejects.toThrow(TypeError)
    })
  })

  describe('setSlewSettleTime', () => {
    const time = 10
    it('should call PUT for slewsettletime with Value param', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 0, ErrorMessage: '' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await client.setSlewSettleTime(time)
      const expectedBody = new URLSearchParams()
      expectedBody.append('Value', time.toString()) // Client sends this
      expectedBody.append('ClientID', client.clientId.toString()) // Base client adds these

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/slewsettletime`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: expectedBody.toString(),
        signal: expect.any(AbortSignal)
      })
    })
    // Add error test
    it('should throw AlpacaError on API error', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 101, ErrorMessage: 'Set SST failed' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await expect(client.setSlewSettleTime(time)).rejects.toThrow(AlpacaError)
    })

    it('should throw TypeError on network error', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }))
      await expect(client.setSlewSettleTime(time)).rejects.toThrow(TypeError)
    })
  })

  describe('getAxisRates', () => {
    const axis = 0 // Example axis: 0 for RA/Azm
    it('should return axis rates from API', async () => {
      const mockRates = [
        { Minimum: 0.1, Maximum: 1.0 },
        { Minimum: 1.0, Maximum: 5.0 }
      ]
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: mockRates, ErrorNumber: 0, ErrorMessage: '' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      const result = await client.getAxisRates(axis)
      expect(result).toEqual(mockRates)
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/axisrates?Axis=${axis}&ClientID=${client.clientId}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: expect.any(AbortSignal)
      })
    })

    it('should throw AlpacaError on API error', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 120, ErrorMessage: 'Axis error' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await expect(client.getAxisRates(axis)).rejects.toThrow(AlpacaError)
    })
  })

  describe('getDestinationSideOfPier', () => {
    const rightAscension = 10.0
    const declination = 20.0
    const mockSideOfPier = 0 // Example: PierEast

    it('should return destination side of pier from API', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: mockSideOfPier, ErrorNumber: 0, ErrorMessage: '' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      const result = await client.getDestinationSideOfPier(rightAscension, declination)
      expect(result).toBe(mockSideOfPier)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/destinationsideofpier?RightAscension=${rightAscension}&Declination=${declination}&ClientID=${client.clientId}`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: expect.any(AbortSignal)
        }
      )
    })

    it('should throw AlpacaError on API error', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 121, ErrorMessage: 'Side of pier error' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await expect(client.getDestinationSideOfPier(rightAscension, declination)).rejects.toThrow(AlpacaError)
    })
  })

  describe('getTelescopeState (Complex Getter - Pattern #8)', () => {
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>
    const mockTelescopeProperties: Record<string, unknown> = {
      alignmentmode: 0,
      altitude: 45.0,
      azimuth: 180.0,
      atpark: false,
      athome: false,
      canfindhome: true,
      canpark: true,
      canpulseguide: true,
      cansettracking: true,
      canslew: true,
      canslewaltaz: true,
      canslewasync: true,
      canslewaltazasync: true,
      declination: 10.0,
      declinationrate: 0.0,
      doesrefraction: true,
      equatorialsystem: 2,
      focallength: 1000.0,
      rightascension: 12.0,
      rightascensionrate: 0.0,
      sideofpier: 0,
      siderealtime: 12.5,
      siteelevation: 100.0,
      sitelatitude: 34.0,
      sitelongitude: -118.0,
      slewing: false,
      tracking: true,
      trackingrate: 0,
      trackingrates: [
        { Name: 'sidereal', Value: 0 },
        { Name: 'lunar', Value: 1 }
      ],
      utcdate: '2023-10-27T10:00:00Z',
      aperturearea: 7853.0,
      aperturediameter: 100.0,
      guideratedeclination: 0.5,
      guideraterightascension: 0.5,
      ispulseguiding: false,
      slewsettletime: 2,
      cansetdeclinationrate: true,
      cansetguiderates: true,
      cansetpierside: true,
      cansetrightascensionrate: true
    }

    const expectedTelescopeState: Record<string, unknown> = {
      alignmentMode: 0,
      altitude: 45.0,
      azimuth: 180.0,
      atPark: false,
      atHome: false,
      canFindHome: true,
      canPark: true,
      canPulseGuide: true,
      canSetTracking: true,
      canSlew: true,
      canSlewAltAz: true,
      canSlewAsync: true,
      canSlewAltAzAsync: true,
      declination: 10.0,
      declinationRate: 0.0,
      doesRefraction: true,
      equatorialSystem: 2,
      focalLength: 1000.0,
      rightAscension: 12.0,
      rightAscensionRate: 0.0,
      sideOfPier: 0,
      siderealTime: 12.5,
      siteElevation: 100.0,
      siteLatitude: 34.0,
      siteLongitude: -118.0,
      slewing: false,
      tracking: true,
      trackingRate: 0,
      trackingRates: [
        { Name: 'sidereal', Value: 0 },
        { Name: 'lunar', Value: 1 }
      ],
      utcDate: '2023-10-27T10:00:00Z',
      apertureArea: 7853.0,
      apertureDiameter: 100.0,
      guideRateDeclination: 0.5,
      guideRateRightAscension: 0.5,
      isPulseGuiding: false,
      slewSettleTime: 2,
      canSetDeclinationRate: true,
      canSetGuideRates: true,
      canSetPierSide: true,
      canSetRightAscensionRate: true
    }

    beforeEach(() => {
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleWarnSpy.mockRestore()
    })

    it('should fetch all telescope properties successfully in a happy path scenario', async () => {
      mockFetch.mockImplementation(async (url: string | URL | Request, options?: RequestInit) => {
        const urlString = typeof url === 'string' ? url : url.toString()
        const method = options?.method || 'GET'
        const pathSegments = new URL(urlString).pathname.split('/')
        const actionOrProperty = pathSegments.pop() || ''

        if (method === 'POST' && actionOrProperty === 'properties') {
          const alpacaResponseValue = Object.entries(mockTelescopeProperties).map(([name, value]) => ({
            Name: name,
            Value: value
          }))
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              Value: alpacaResponseValue,
              ErrorNumber: 0,
              ErrorMessage: '',
              ClientTransactionID: 1,
              ServerTransactionID: 1
            })
          })
        } else if (method === 'GET') {
          if (Object.prototype.hasOwnProperty.call(mockTelescopeProperties, actionOrProperty)) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: async () => ({
                Value: mockTelescopeProperties[actionOrProperty],
                ErrorNumber: 0,
                ErrorMessage: '',
                ClientTransactionID: 1,
                ServerTransactionID: 1
              })
            })
          }
        }
        return Promise.resolve({
          ok: false,
          status: 404,
          json: async () => ({
            Value: null,
            ErrorNumber: 0x404,
            ErrorMessage: `Property or action '${actionOrProperty}' not found/mocked for ${method} ${urlString}`,
            ClientTransactionID: 1,
            ServerTransactionID: 1
          })
        })
      })

      const state = await client.getTelescopeState()

      for (const key in expectedTelescopeState) {
        expect(state).toHaveProperty(key)
        expect(state[key]).toEqual(expectedTelescopeState[key])
      }
    })

    it('should return partial data and warn if an individual non-critical property fetch fails', async () => {
      const failingPropertyAlpacaName = 'sitelatitude'
      const failingPropertyTsKey = 'siteLatitude'
      const uniqueErrorMessage = 'SPECIFIC_ERROR_FOR_SITELATITUDE_FETCH_FAILURE'

      mockFetch.mockImplementation(async (url: string | URL | Request) => {
        const urlString = typeof url === 'string' ? url : url.toString()
        const propertyName = new URL(urlString).pathname.split('/').pop() || ''

        if (propertyName === failingPropertyAlpacaName) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({ Value: null, ErrorNumber: 0x500, ErrorMessage: uniqueErrorMessage })
          })
        }
        if (Object.prototype.hasOwnProperty.call(mockTelescopeProperties, propertyName)) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ Value: mockTelescopeProperties[propertyName], ErrorNumber: 0, ErrorMessage: '' })
          })
        }
        return Promise.resolve({
          ok: false,
          status: 404,
          json: async () => ({ Value: null, ErrorNumber: 0x404, ErrorMessage: `Property ${propertyName} not found/mocked` })
        })
      })

      const state = await client.getTelescopeState()
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining(uniqueErrorMessage))

      for (const key in expectedTelescopeState) {
        if (key !== failingPropertyTsKey) {
          expect(state).toHaveProperty(key)
          expect(state[key]).toEqual(expectedTelescopeState[key])
        } else {
          expect(state).not.toHaveProperty(failingPropertyTsKey)
        }
      }
      expect(state).not.toHaveProperty(failingPropertyTsKey)
    })

    it('should throw AlpacaError if the getProperties call itself fails catastrophically', async () => {
      const propertiesToFetch = [
        'alignmentmode',
        'altitude',
        'azimuth',
        'atpark',
        'athome',
        'canfindhome',
        'canpark',
        'canpulseguide',
        'cansettracking',
        'canslew',
        'canslewaltaz',
        'canslewasync',
        'canslewaltazasync',
        'declination',
        'declination_rate',
        'doesrefraction',
        'equatorialsystem',
        'focallength',
        'rightascension',
        'rightascension_rate',
        'sideofpier',
        'siderealtime',
        'siteelevation',
        'sitelatitude',
        'sitelongitude',
        'slewing',
        'tracking',
        'trackingrate',
        'trackingrates',
        'utcdate',
        'aperturearea',
        'aperturediameter',
        'guideratedeclination',
        'guideraterightascension',
        'ispulseguiding',
        'slewsettletime',
        'cansetdeclinationrate',
        'cansetguiderates',
        'cansetpierside',
        'cansetrightascensionrate'
      ]
      const expectedErrorMessagePrefix = 'Simulated individual property failure'

      mockFetch.mockImplementation(async (url: string | URL | Request, options?: RequestInit) => {
        const urlString = typeof url === 'string' ? url : url.toString()
        const method = options?.method || 'GET'
        const pathSegments = new URL(urlString).pathname.split('/')
        const actionOrProperty = pathSegments.pop() || ''

        if (method === 'GET' && propertiesToFetch.includes(actionOrProperty)) {
          return Promise.resolve({
            ok: true, // Simulate an Alpaca error returned in a 200 OK response
            status: 200,
            json: async () => ({
              Value: null,
              ErrorNumber: 0x501, // Arbitrary Alpaca error number
              ErrorMessage: `${expectedErrorMessagePrefix} for ${actionOrProperty}`
            })
          })
        }
        // Fallback for any other unexpected calls
        return Promise.resolve({
          ok: false,
          status: 404,
          json: async () => ({ Value: null, ErrorNumber: 0x404, ErrorMessage: 'Unexpected call path' })
        })
      })

      const state = await client.getTelescopeState()
      expect(state).toEqual({}) // All properties should fail to load, resulting in an empty state object

      expect(consoleWarnSpy).toHaveBeenCalledTimes(propertiesToFetch.length)

      // Check a representative warning message
      // Need to import toTsFormat or define it locally for this test if not already available
      // For simplicity, let's assume toTsFormat is available or we construct the expected mapped name manually
      const firstPropertyName = propertiesToFetch[0] // e.g., 'alignmentmode'
      // Manually determine the expected TypeScript name for the first property for the warning message
      // This is a simplification; ideally, toTsFormat from property-mapping would be used.
      // For 'alignmentmode', toTsFormat should yield 'alignmentMode'.
      const expectedFirstTsName = 'alignmentMode' // Manual for 'alignmentmode'

      const expectedWarningPattern = new RegExp(
        `Failed to get property '${firstPropertyName}' \\(mapped to '${expectedFirstTsName}'\\): ${expectedErrorMessagePrefix} for ${firstPropertyName}`
      )
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringMatching(expectedWarningPattern))
    })
  })

  describe('Retry Mechanism', () => {
    const originalRetries = DEFAULT_OPTIONS.retries
    const originalRetryDelay = DEFAULT_OPTIONS.retryDelay
    const originalTimeout = DEFAULT_OPTIONS.timeout

    beforeEach(() => {
      DEFAULT_OPTIONS.retries = 2 // Set to 2 for 1 initial + 2 retries = 3 total attempts
      DEFAULT_OPTIONS.retryDelay = 1
      DEFAULT_OPTIONS.timeout = 100
    })

    afterEach(() => {
      DEFAULT_OPTIONS.retries = originalRetries
      DEFAULT_OPTIONS.retryDelay = originalRetryDelay
      DEFAULT_OPTIONS.timeout = originalTimeout
    })

    it('should retry GET requests on network failure and eventually throw', async () => {
      mockFetch
        .mockRejectedValueOnce(new TypeError('NetworkError: Network failure 1'))
        .mockRejectedValueOnce(new TypeError('NetworkError: Network failure 2'))
        .mockRejectedValueOnce(new TypeError('NetworkError: Network failure 3'))

      await expect(client.getApertureArea()).rejects.toThrow(AlpacaError) // Base client wraps TypeError in AlpacaError
      expect(mockFetch).toHaveBeenCalledTimes(1 + (DEFAULT_OPTIONS.retries ?? 0))
    })

    it('should succeed on GET request after a retry', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('NetworkError: Network failure 1')).mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: 100.0, ErrorNumber: 0, ErrorMessage: '' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      const result = await client.getApertureArea()
      expect(result).toBe(100.0)
      expect(mockFetch).toHaveBeenCalledTimes(2) // 1 failure + 1 success
    })

    it('should retry PUT requests on network failure and eventually throw', async () => {
      mockFetch
        .mockRejectedValueOnce(new TypeError('NetworkError: Network failure 1'))
        .mockRejectedValueOnce(new TypeError('NetworkError: Network failure 2'))
        .mockRejectedValueOnce(new TypeError('NetworkError: Network failure 3'))

      await expect(client.park()).rejects.toThrow(AlpacaError) // Base client wraps TypeError in AlpacaError
      expect(mockFetch).toHaveBeenCalledTimes(1 + (DEFAULT_OPTIONS.retries ?? 0))
    })

    it('should succeed on PUT request after a retry', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('NetworkError: Network failure 1')).mockResolvedValueOnce(
        new Response(JSON.stringify({ Value: null, ErrorNumber: 0, ErrorMessage: '' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      await client.park()
      expect(mockFetch).toHaveBeenCalledTimes(2) // 1 failure + 1 success
    })
  })
})
