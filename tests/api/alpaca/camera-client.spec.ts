import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CameraClient } from '@/api/alpaca/camera-client'
import { AlpacaError, ErrorType } from '@/api/alpaca/errors'
import type { Device, UnifiedDevice } from '@/types/device.types' // Using UnifiedDevice for a more complete mock

// Mock the global fetch
const mockFetch = (global.fetch = vi.fn())

// Mock device for testing, conforming to UnifiedDevice
const mockCameraDevice: UnifiedDevice = {
  // BaseDevice properties
  id: 'mock-camera-0',
  name: 'MockCamera',
  type: 'camera',
  isConnected: true,
  properties: {
    // Common properties
    connected: true,
    description: 'A mock camera for testing',
    driverinfo: 'Mock Camera Driver',
    driverversion: '1.0',
    interfaceversion: 3, // Assuming Camera API v3 for example
    name: 'MockCamera',
    supportedactions: [],
    // Camera specific properties (examples, add more as needed for tests)
    cameraxsize: 1024,
    cameraysize: 768,
    pixelsizex: 5.2,
    pixelsizey: 5.2,
    canabortexposure: true,
    canstopexposure: true,
    gain: 100,
    offset: 10
  },
  // UnifiedDevice specific properties
  displayName: 'Mock Camera Display',
  isConnecting: false,
  isDisconnecting: false,
  status: 'connected',
  // Alpaca-specific properties
  DeviceName: 'MockCamera',
  DeviceNumber: 0,
  DeviceType: 'camera',
  DriverInfo: 'Mock Camera Driver',
  DriverVersion: '1.0',
  SupportedActions: [],
  Description: 'A mock camera for testing',
  InterfaceVersion: 3,
  Connected: true,
  UniqueID: 'mock-camera-0',
  ClientTransactionID: 0,
  ServerTransactionID: 0,
  ErrorNumber: 0,
  ErrorMessage: '',
  // Optional UnifiedDevice properties
  discoveredAt: new Date().toISOString(),
  lastConnected: new Date().toISOString(),
  ipAddress: '127.0.0.1',
  address: '127.0.0.1',
  port: 11111,
  devicePort: 11111,
  telemetry: {},
  lastSeen: new Date().toISOString(),
  firmwareVersion: '1.0.0',
  apiBaseUrl: 'http://localhost:11111/api/v1/camera/0',
  deviceNum: 0,
  idx: 0,
  capabilities: {
    canAbortExposure: true,
    canStopExposure: true,
    canSetCCDTemperature: true,
    canGetCoolerPower: true
  },
  deviceAttributes: {},
  stateHistory: [],
  methods: {}
}

describe('CameraClient', () => {
  let client: CameraClient
  const baseUrl = 'http://localhost:11111'
  const deviceType = 'camera' // Should match mockCameraDevice.type
  const deviceNumber = 0 // Should match mockCameraDevice.DeviceNumber

  beforeEach(() => {
    client = new CameraClient(baseUrl, deviceNumber, mockCameraDevice as Device)
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Constructor and Initial Properties', () => {
    it('should correctly initialize properties from AlpacaClient', () => {
      expect(client.baseUrl).toBe(baseUrl)
      expect(client.deviceType).toBe(deviceType)
      expect(client.deviceNumber).toBe(deviceNumber)
      expect(client.device).toEqual(mockCameraDevice)
      expect(client.clientId).toBeGreaterThanOrEqual(0)
      expect(client.clientId).toBeLessThanOrEqual(65535)
    })
  })

  // We will add tests for camera-specific methods here.
  // For example: canAbortExposure, startExposure, getImageData, etc.

  describe('Capability Methods', () => {
    it('canAbortExposure should call getProperty with canabortexposure and return boolean', async () => {
      const mockResponseData = { Value: true, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const result = await client.canAbortExposure()
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:11111/api/v1/camera/0/canabortexposure?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('canAbortExposure should handle a false response', async () => {
      const mockResponseData = { Value: false, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const result = await client.canAbortExposure()
      expect(result).toBe(false)
    })

    it('canAsymmetricBin should call getProperty with canasymmetricbin and return boolean', async () => {
      const mockResponseData = { Value: true, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const result = await client.canAsymmetricBin()
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:11111/api/v1/camera/0/canasymmetricbin?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('canAsymmetricBin should handle a false response', async () => {
      const mockResponseData = { Value: false, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const result = await client.canAsymmetricBin()
      expect(result).toBe(false)
    })

    it('canGetCoolerPower should call getProperty with cangetcoolerpower and return boolean', async () => {
      const mockResponseData = { Value: true, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const result = await client.canGetCoolerPower()
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:11111/api/v1/camera/0/cangetcoolerpower?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('canGetCoolerPower should handle a false response', async () => {
      const mockResponseData = { Value: false, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const result = await client.canGetCoolerPower()
      expect(result).toBe(false)
    })

    it('canPulseGuide should call getProperty with canpulseguide and return boolean', async () => {
      const mockResponseData = { Value: true, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const result = await client.canPulseGuide()
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:11111/api/v1/camera/0/canpulseguide?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('canPulseGuide should handle a false response', async () => {
      const mockResponseData = { Value: false, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const result = await client.canPulseGuide()
      expect(result).toBe(false)
    })

    it('canSetCCDTemperature should call getProperty with cansetccdtemperature and return boolean', async () => {
      const mockResponseData = { Value: true, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const result = await client.canSetCCDTemperature()
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:11111/api/v1/camera/0/cansetccdtemperature?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('canSetCCDTemperature should handle a false response', async () => {
      const mockResponseData = { Value: false, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const result = await client.canSetCCDTemperature()
      expect(result).toBe(false)
    })

    it('canStopExposure should call getProperty with canstopexposure and return boolean', async () => {
      const mockResponseData = { Value: true, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const result = await client.canStopExposure()
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:11111/api/v1/camera/0/canstopexposure?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('canStopExposure should handle a false response', async () => {
      const mockResponseData = { Value: false, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const result = await client.canStopExposure()
      expect(result).toBe(false)
    })

    it('canFastReadout should call getProperty with canfastreadout and return boolean', async () => {
      const mockResponseData = { Value: true, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const result = await client.canFastReadout()
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:11111/api/v1/camera/0/canfastreadout?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('canFastReadout should handle a false response', async () => {
      const mockResponseData = { Value: false, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const result = await client.canFastReadout()
      expect(result).toBe(false)
    })

    it('isImageReady should call getProperty with imageready and return boolean', async () => {
      const mockResponseData = { Value: true, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const result = await client.isImageReady()
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:11111/api/v1/camera/0/imageready?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('isImageReady should handle a false response', async () => {
      const mockResponseData = { Value: false, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const result = await client.isImageReady()
      expect(result).toBe(false)
    })
  })

  describe('Action Methods', () => {
    it('startExposure should make a PUT request with correct parameters', async () => {
      const mockResponseData = { Value: null, ErrorNumber: 0, ErrorMessage: '' } // Typical success for PUT
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const duration = 10.5
      const light = true

      await client.startExposure(duration, light)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const expectedUrl = `http://localhost:11111/api/v1/camera/0/startexposure`
      const expectedBody = new URLSearchParams({
        Duration: duration.toString(),
        Light: light.toString(),
        ClientID: client.clientId.toString()
      }).toString()

      expect(mockFetch).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          }),
          body: expectedBody
        })
      )
    })

    it('startExposure should use default light=true if not provided', async () => {
      const mockResponseData = { Value: null, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const duration = 5.0
      await client.startExposure(duration) // Light parameter omitted

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const expectedBody = new URLSearchParams({
        Duration: duration.toString(),
        Light: 'true', // Default value
        ClientID: client.clientId.toString()
      }).toString()

      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ body: expectedBody }))
    })

    it('abortExposure should make a PUT request to abortexposure', async () => {
      const mockResponseData = { Value: null, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      await client.abortExposure()

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const expectedUrl = `http://localhost:11111/api/v1/camera/0/abortexposure`
      const expectedBody = new URLSearchParams({
        ClientID: client.clientId.toString()
      }).toString()

      expect(mockFetch).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          }),
          body: expectedBody
        })
      )
    })

    it('stopExposure should make a PUT request to stopexposure', async () => {
      const mockResponseData = { Value: null, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      await client.stopExposure()

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const expectedUrl = `http://localhost:11111/api/v1/camera/0/stopexposure`
      const expectedBody = new URLSearchParams({
        ClientID: client.clientId.toString()
      }).toString()

      expect(mockFetch).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          }),
          body: expectedBody
        })
      )
    })

    it('pulseGuide should make a PUT request with Direction and Duration parameters', async () => {
      const mockResponseData = { Value: null, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const direction = 0 // Example: North
      const duration = 1000 // Milliseconds

      await client.pulseGuide(direction, duration)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const expectedUrl = `http://localhost:11111/api/v1/camera/0/pulseguide`
      // Based on `this.put` behavior, ClientID is added by the base client.
      // The order of Direction, Duration, and ClientID might matter if URLSearchParams.toString() is order-sensitive.
      // Assuming specific params come first, then ClientID based on `...params, ClientID` in `executeRequest`.
      const expectedBodyParams: Record<string, string> = {
        Direction: direction.toString(),
        Duration: duration.toString(),
        ClientID: client.clientId.toString()
      }
      const expectedBody = new URLSearchParams(expectedBodyParams).toString()

      expect(mockFetch).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          }),
          body: expectedBody
        })
      )
    })
  })

  describe('Image Data Methods', () => {
    it('getImageData should fetch image data as ArrayBuffer from imagearray endpoint', async () => {
      const mockArrayBuffer = new ArrayBuffer(8)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockArrayBuffer,
        status: 200
      })

      const result = await client.getImageData()

      expect(result).toBeInstanceOf(ArrayBuffer)
      expect(result).toEqual(mockArrayBuffer)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:11111/api/v1/camera/0/imagearray`,
        expect.objectContaining({
          method: 'GET',
          headers: {
            Accept: 'application/json' // Note: The client sends Accept: application/json, but expects ArrayBuffer. This might be a point of review in the client code.
          }
        })
      )
    })

    it('getImageData should throw AlpacaError on failed fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        arrayBuffer: async () => new ArrayBuffer(0) // Should not be called if ok is false
      })

      let errorThrown: AlpacaError | undefined
      try {
        await client.getImageData()
      } catch (e) {
        errorThrown = e as AlpacaError
      }

      expect(errorThrown).toBeInstanceOf(AlpacaError)
      expect(errorThrown?.message).toBe('Failed to get image data: 500 Internal Server Error')
      expect(errorThrown?.type).toBe(ErrorType.SERVER)
      expect(errorThrown?.requestUrl).toBe(`http://localhost:11111/api/v1/camera/0/imagearray`)
      expect(errorThrown?.statusCode).toBe(500)
    })
  })

  describe('State and Property Getters', () => {
    it('getCameraState should call getProperty with camerastate and return number', async () => {
      const mockCameraState = 2 // Example state: Exposing
      const mockResponseData = { Value: mockCameraState, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const result = await client.getCameraState()
      expect(result).toBe(mockCameraState)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:11111/api/v1/camera/0/camerastate?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('getCameraXSize should call getProperty with cameraxsize and return number', async () => {
      const mockXSize = 1024
      const mockResponseData = { Value: mockXSize, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const result = await client.getCameraXSize()
      expect(result).toBe(mockXSize)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:11111/api/v1/camera/0/cameraxsize?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('getCameraYSize should call getProperty with cameraysize and return number', async () => {
      const mockYSize = 768
      const mockResponseData = { Value: mockYSize, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const result = await client.getCameraYSize()
      expect(result).toBe(mockYSize)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:11111/api/v1/camera/0/cameraysize?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('getExposureMax should call getProperty with exposuremax and return number', async () => {
      const mockExposureMax = 3600
      const mockResponseData = { Value: mockExposureMax, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const result = await client.getExposureMax()
      expect(result).toBe(mockExposureMax)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:11111/api/v1/camera/0/exposuremax?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('getExposureMin should call getProperty with exposuremin and return number', async () => {
      const mockExposureMin = 0.001
      const mockResponseData = { Value: mockExposureMin, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const result = await client.getExposureMin()
      expect(result).toBe(mockExposureMin)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:11111/api/v1/camera/0/exposuremin?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('getExposureResolution should call getProperty with exposureresolution and return number', async () => {
      const mockExposureResolution = 0.001
      const mockResponseData = { Value: mockExposureResolution, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const result = await client.getExposureResolution()
      expect(result).toBe(mockExposureResolution)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:11111/api/v1/camera/0/exposureresolution?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('getOffsetMax should call getProperty with offsetmax and return number', async () => {
      const mockOffsetMax = 1000
      const mockResponseData = { Value: mockOffsetMax, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const result = await client.getOffsetMax()
      expect(result).toBe(mockOffsetMax)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:11111/api/v1/camera/0/offsetmax?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('getOffsetMin should call getProperty with offsetmin and return number', async () => {
      const mockOffsetMin = 0
      const mockResponseData = { Value: mockOffsetMin, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const result = await client.getOffsetMin()
      expect(result).toBe(mockOffsetMin)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:11111/api/v1/camera/0/offsetmin?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('getSubExposureDuration should call getProperty with subexposureduration and return number', async () => {
      const mockSubExposureDuration = 0.5
      const mockResponseData = { Value: mockSubExposureDuration, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const result = await client.getSubExposureDuration()
      expect(result).toBe(mockSubExposureDuration)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:11111/api/v1/camera/0/subexposureduration?ClientID=${client.clientId}`,
        expect.objectContaining({ method: 'GET' })
      )
    })
  })

  describe('Property Setters', () => {
    it('setGain should make a PUT request with gain parameter', async () => {
      const mockResponseData = { Value: null, ErrorNumber: 0, ErrorMessage: '' } // Typical for successful PUT
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const gainValue = 150
      await client.setGain(gainValue)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const expectedUrl = `http://localhost:11111/api/v1/camera/0/gain`
      const expectedBody = new URLSearchParams({
        Gain: gainValue.toString(), // Property name in PascalCase as per toParamFormat for setProperty
        ClientID: client.clientId.toString()
      }).toString()

      expect(mockFetch).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          }),
          body: expectedBody
        })
      )
    })

    it('setOffset should make a PUT request with offset parameter', async () => {
      const mockResponseData = { Value: null, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const offsetValue = 50
      await client.setOffset(offsetValue)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const expectedUrl = `http://localhost:11111/api/v1/camera/0/offset`
      const expectedBody = new URLSearchParams({
        Offset: offsetValue.toString(), // Property name in PascalCase
        ClientID: client.clientId.toString()
      }).toString()

      expect(mockFetch).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          }),
          body: expectedBody
        })
      )
    })

    it('setReadoutMode should make a PUT request with readoutmode parameter', async () => {
      const mockResponseData = { Value: null, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const readoutModeValue = 1
      await client.setReadoutMode(readoutModeValue)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const expectedUrl = `http://localhost:11111/api/v1/camera/0/readoutmode`
      const expectedBody = new URLSearchParams({
        ReadoutMode: readoutModeValue.toString(), // Property name in PascalCase
        ClientID: client.clientId.toString()
      }).toString()

      expect(mockFetch).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          }),
          body: expectedBody
        })
      )
    })

    it('setBinning should make two PUT requests for binx and biny', async () => {
      const mockResponseData = { Value: null, ErrorNumber: 0, ErrorMessage: '' }
      // Mock twice for two calls
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const binXValue = 2
      const binYValue = 2
      await client.setBinning(binXValue, binYValue)

      expect(mockFetch).toHaveBeenCalledTimes(2)

      // Check first call (binx)
      const expectedUrlBinX = `http://localhost:11111/api/v1/camera/0/binx`
      const expectedBodyBinX = new URLSearchParams({
        BinX: binXValue.toString(),
        ClientID: client.clientId.toString()
      }).toString()
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        expectedUrlBinX,
        expect.objectContaining({
          method: 'PUT',
          body: expectedBodyBinX
        })
      )

      // Check second call (biny)
      const expectedUrlBinY = `http://localhost:11111/api/v1/camera/0/biny`
      const expectedBodyBinY = new URLSearchParams({
        BinY: binYValue.toString(),
        ClientID: client.clientId.toString()
      }).toString()
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        expectedUrlBinY,
        expect.objectContaining({
          method: 'PUT',
          body: expectedBodyBinY
        })
      )
    })

    it('setCooler should make a PUT request with cooleron parameter', async () => {
      const mockResponseData = { Value: null, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const coolerEnabled = true
      await client.setCooler(coolerEnabled)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const expectedUrl = `http://localhost:11111/api/v1/camera/0/cooleron`
      // The toAscomValue transform in setProperty will convert boolean true to 'True' for the body
      const expectedBody = new URLSearchParams({
        Cooleron: 'True',
        ClientID: client.clientId.toString()
      }).toString()

      expect(mockFetch).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({
          method: 'PUT',
          body: expectedBody
        })
      )
    })

    it('setCooler should handle false value for cooleron parameter', async () => {
      const mockResponseData = { Value: null, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const coolerEnabled = false
      await client.setCooler(coolerEnabled)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const expectedUrl = `http://localhost:11111/api/v1/camera/0/cooleron`
      // The toAscomValue transform in setProperty will convert boolean false to 'False' for the body
      const expectedBody = new URLSearchParams({
        Cooleron: 'False',
        ClientID: client.clientId.toString()
      }).toString()

      expect(mockFetch).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({
          method: 'PUT',
          body: expectedBody
        })
      )
    })

    it('setTemperature should make a PUT request with Setccdtemperature parameter', async () => {
      const mockResponseData = { Value: null, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const temperatureValue = -10.5
      await client.setTemperature(temperatureValue)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const expectedUrl = `http://localhost:11111/api/v1/camera/0/setccdtemperature`
      const expectedBody = new URLSearchParams({
        Setccdtemperature: temperatureValue.toString(), // Parameter name from toParamFormat('setccdtemperature')
        ClientID: client.clientId.toString()
      }).toString()

      expect(mockFetch).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({
          method: 'PUT',
          body: expectedBody
        })
      )
    })

    it('setSubframe should make four PUT requests for startx, starty, numx, and numy', async () => {
      const mockResponseData = { Value: null, ErrorNumber: 0, ErrorMessage: '' }
      // Mock four times for four calls
      for (let i = 0; i < 4; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponseData,
          status: 200
        })
      }

      const startX = 10,
        startY = 20,
        numX = 100,
        numY = 200
      await client.setSubframe(startX, startY, numX, numY)

      expect(mockFetch).toHaveBeenCalledTimes(4)

      const paramsToTest = [
        { name: 'StartX', value: startX, urlPath: 'startx' },
        { name: 'StartY', value: startY, urlPath: 'starty' },
        { name: 'Numx', value: numX, urlPath: 'numx' },
        { name: 'Numy', value: numY, urlPath: 'numy' }
      ]

      for (let i = 0; i < paramsToTest.length; i++) {
        const param = paramsToTest[i]
        const expectedUrl = `http://localhost:11111/api/v1/camera/0/${param.urlPath}`
        // Construct params to match client's effective order: specific param then ClientID
        const tempBodyParams: Record<string, string> = {}
        tempBodyParams[param.name] = param.value.toString() // Specific parameter first
        tempBodyParams['ClientID'] = client.clientId.toString() // ClientID second
        const expectedBody = new URLSearchParams(tempBodyParams).toString()

        expect(mockFetch).toHaveBeenNthCalledWith(
          i + 1,
          expectedUrl,
          expect.objectContaining({
            method: 'PUT',
            body: expectedBody
          })
        )
      }
    })

    it('setSubExposureDuration should make a PUT request with SubExposureDuration parameter', async () => {
      const mockResponseData = { Value: null, ErrorNumber: 0, ErrorMessage: '' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
        status: 200
      })

      const durationValue = 0.75
      await client.setSubExposureDuration(durationValue)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const expectedUrl = `http://localhost:11111/api/v1/camera/0/subexposureduration`
      const expectedBody = new URLSearchParams({
        // Corrected casing based on test failure
        SubExposureDuration: durationValue.toString(),
        ClientID: client.clientId.toString()
      }).toString()

      expect(mockFetch).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({
          method: 'PUT',
          body: expectedBody
        })
      )
    })
  })
})
