import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CameraClient } from '@/api/alpaca/camera-client'
import { AlpacaError, ErrorType } from '@/api/alpaca/errors'
import type { Device, UnifiedDevice } from '@/types/device.types' // Using UnifiedDevice for a more complete mock
import { DEFAULT_OPTIONS } from '@/api/alpaca/types' // Import for DEFAULT_OPTIONS
import logger from '@/plugins/logger' // Added import

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
        { name: 'NumX', value: numX, urlPath: 'numx' },
        { name: 'NumY', value: numY, urlPath: 'numy' }
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

  describe('getCameraInfo', () => {
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      // Spy on console.warn before each test in this block
      consoleWarnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {}) // Changed from console.warn to logger.warn
    })

    afterEach(() => {
      // Restore the original console.warn after each test
      consoleWarnSpy.mockRestore()
    })

    it('should fetch most common properties successfully in a happy path scenario', async () => {
      const mockProperties: Record<string, unknown> = {
        sensortype: 1,
        cangetcoolerpower: true,
        cansetccdtemperature: true,
        canfastreadout: true,
        canabortexposure: true,
        canasymmetricbin: false,
        canpulseguide: true,
        canstopexposure: true,
        gains: ['High', 'Low'],
        offsets: [10, 20],
        binx: 1,
        biny: 1,
        camerastate: 0,
        cameraxsize: 2048,
        cameraysize: 1536,
        electronsperadu: 1.5,
        exposuremax: 3600,
        exposuremin: 0.001,
        exposureresolution: 0.001,
        fullwellcapacity: 60000,
        hasshutter: true,
        imageready: true,
        maxadu: 65535,
        maxbinx: 4,
        maxbiny: 4,
        numx: 2048,
        numy: 1536,
        percentcompleted: 0,
        pixelsizex: 3.8,
        pixelsizey: 3.8,
        readoutmode: 0,
        readoutmodes: ['Normal', 'Fast'],
        sensorname: 'IMX571',
        startx: 0,
        starty: 0,
        subexposureduration: 0,
        ispulseguiding: false,
        lastexposureduration: -1,
        lastexposurestarttime: 'N/A',
        gain: 0,
        offset: 1,
        bayeroffsetx: 0,
        bayeroffsety: 1,
        coolerpower: 75.5,
        heatsinktemperature: 25.0,
        ccdtemperature: -10.0,
        cooleron: true,
        setccdtemperature: -10.0,
        fastreadout: false
      }
      mockFetch.mockImplementation(async (url: string | URL | Request) => {
        const urlString = typeof url === 'string' ? url : url.toString()
        const propertyName = new URL(urlString).pathname.split('/').pop() || ''
        // console.log(`[Test MockFetch] Attempting to fetch: ${propertyName}`); // Test Debug Log

        if (Object.prototype.hasOwnProperty.call(mockProperties, propertyName)) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ Value: mockProperties[propertyName], ErrorNumber: 0, ErrorMessage: '' })
          })
        }
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({ Value: null, ErrorNumber: 0x401, ErrorMessage: 'Not implemented/Not applicable' })
        })
      })
      const cameraInfo = await client.getCameraInfo()
      expect(cameraInfo['sensortype']).toBe(mockProperties.sensortype)
      expect(cameraInfo['cangetcoolerpower']).toBe(mockProperties.cangetcoolerpower)
      expect(cameraInfo['gains']).toEqual(mockProperties.gains)
      expect(cameraInfo['cameraxsize']).toBe(mockProperties.cameraxsize)
      expect(cameraInfo['gain']).toBe(mockProperties.gain)
      expect(cameraInfo['bayeroffsetx']).toBe(mockProperties.bayeroffsetx)
      expect(cameraInfo['ccdtemperature']).toBe(mockProperties.ccdtemperature)
      expect(cameraInfo['fastreadout']).toBe(mockProperties.fastreadout)
      expect(cameraInfo['lastexposureduration']).toBe(mockProperties.lastexposureduration)
      for (const key in mockProperties) {
        if (key === 'gainmin' || key === 'gainmax' || key === 'offsetmin' || key === 'offsetmax') {
          continue
        }
        expect(cameraInfo).toHaveProperty(key)
        expect(cameraInfo[key]).toEqual(mockProperties[key])
      }
      const totalPropertiesAttempted = Object.keys(mockProperties).length + 3
      expect(consoleWarnSpy.mock.calls.length).toBeLessThan(totalPropertiesAttempted / 2)
      consoleWarnSpy.mock.calls.forEach((call) => {
        expect(call[0]).not.toContain('sensortype')
        expect(call[0]).not.toContain('cameraxsize')
      })
    })

    it('should not fetch Bayer properties if sensortype indicates monochrome', async () => {
      const mockMonochromeProperties: Record<string, unknown> = {
        sensortype: 0,
        cangetcoolerpower: false,
        cansetccdtemperature: false,
        canfastreadout: false,
        gains: [],
        offsets: [],
        cameraxsize: 100
      }
      mockFetch.mockImplementation(async (url: string | URL | Request) => {
        const urlString = typeof url === 'string' ? url : url.toString()
        const propertyName = new URL(urlString).pathname.split('/').pop() || ''
        if (propertyName === 'bayeroffsetx' || propertyName === 'bayeroffsety') {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: async () => ({ Value: null, ErrorNumber: 0x401, ErrorMessage: 'Should not be called for monochrome' })
          })
        }
        if (Object.prototype.hasOwnProperty.call(mockMonochromeProperties, propertyName)) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ Value: mockMonochromeProperties[propertyName], ErrorNumber: 0, ErrorMessage: '' })
          })
        }
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({ Value: null, ErrorNumber: 0x401, ErrorMessage: 'Not implemented' })
        })
      })
      const cameraInfo = await client.getCameraInfo()
      expect(cameraInfo['sensortype']).toBe(0)
      expect(cameraInfo).not.toHaveProperty('bayeroffsetx')
      expect(cameraInfo).not.toHaveProperty('bayeroffsety')
      let bayerFetchCalled = false
      mockFetch.mock.calls.forEach((call) => {
        const urlString = typeof call[0] === 'string' ? call[0] : call[0].toString()
        const pathSegments = new URL(urlString).pathname.split('/')
        const actualFetchedProperty = pathSegments[pathSegments.length - 1]
        if (actualFetchedProperty === 'bayeroffsetx' || actualFetchedProperty === 'bayeroffsety') {
          bayerFetchCalled = true
        }
      })
      expect(bayerFetchCalled).toBe(false)
      consoleWarnSpy.mock.calls.forEach((call) => {
        expect(call[0]).not.toContain('bayeroffsetx')
        expect(call[0]).not.toContain('bayeroffsety')
      })
    })

    it('should not fetch cooler properties if cooler capabilities are false', async () => {
      const mockNoCoolerProperties: Record<string, unknown> = {
        sensortype: 0,
        cangetcoolerpower: false,
        cansetccdtemperature: false,
        canfastreadout: false,
        gains: [],
        offsets: [],
        cameraxsize: 100
      }
      const coolerPropertyNames = ['coolerpower', 'heatsinktemperature', 'ccdtemperature', 'cooleron', 'setccdtemperature']
      mockFetch.mockImplementation(async (url: string | URL | Request) => {
        const urlString = typeof url === 'string' ? url : url.toString()
        const propertyName = new URL(urlString).pathname.split('/').pop() || ''
        if (coolerPropertyNames.includes(propertyName)) {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: async () => ({ Value: null, ErrorNumber: 0x401, ErrorMessage: `Should not be called when cooler caps are false: ${propertyName}` })
          })
        }
        if (Object.prototype.hasOwnProperty.call(mockNoCoolerProperties, propertyName)) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ Value: mockNoCoolerProperties[propertyName], ErrorNumber: 0, ErrorMessage: '' })
          })
        }
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({ Value: null, ErrorNumber: 0x401, ErrorMessage: 'Not implemented' })
        })
      })
      const cameraInfo = await client.getCameraInfo()
      expect(cameraInfo['cangetcoolerpower']).toBe(false)
      expect(cameraInfo['cansetccdtemperature']).toBe(false)
      coolerPropertyNames.forEach((propName) => {
        expect(cameraInfo).not.toHaveProperty(propName)
      })
      let coolerFetchCalled = false
      let offendingUrl = ''
      mockFetch.mock.calls.forEach((call) => {
        const urlString = typeof call[0] === 'string' ? call[0] : call[0].toString()
        const pathSegments = new URL(urlString).pathname.split('/')
        const actualFetchedProperty = pathSegments[pathSegments.length - 1]
        if (coolerPropertyNames.includes(actualFetchedProperty)) {
          if (!coolerFetchCalled) {
            offendingUrl = urlString
          }
          coolerFetchCalled = true
        }
      })
      if (coolerFetchCalled) {
        console.log('[Test Debug] Offending URL that set coolerFetchCalled to true (data property was fetched):', offendingUrl)
      }
      expect(coolerFetchCalled).toBe(false)
      consoleWarnSpy.mock.calls.forEach((call) => {
        coolerPropertyNames.forEach((propName) => {
          expect(call[0]).not.toContain(propName)
        })
      })
    })

    it('should not fetch fastreadout data property if canfastreadout capability is false', async () => {
      const mockNoFastReadoutProperties: Record<string, unknown> = {
        sensortype: 0,
        cangetcoolerpower: false,
        cansetccdtemperature: false,
        canfastreadout: false,
        gains: [],
        offsets: [],
        cameraxsize: 100
      }
      const fastReadoutDataPropertyName = 'fastreadout'
      mockFetch.mockImplementation(async (url: string | URL | Request) => {
        const urlString = typeof url === 'string' ? url : url.toString()
        const propertyName = new URL(urlString).pathname.split('/').pop() || ''
        if (propertyName === fastReadoutDataPropertyName) {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: async () => ({
              Value: null,
              ErrorNumber: 0x401,
              ErrorMessage: `Should not call ${fastReadoutDataPropertyName} when canfastreadout is false`
            })
          })
        }
        if (Object.prototype.hasOwnProperty.call(mockNoFastReadoutProperties, propertyName)) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ Value: mockNoFastReadoutProperties[propertyName], ErrorNumber: 0, ErrorMessage: '' })
          })
        }
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({ Value: null, ErrorNumber: 0x401, ErrorMessage: 'Not implemented' })
        })
      })
      const cameraInfo = await client.getCameraInfo()
      expect(cameraInfo['canfastreadout']).toBe(false)
      expect(cameraInfo).not.toHaveProperty(fastReadoutDataPropertyName)
      let fastReadoutDataPropertyFetched = false
      mockFetch.mock.calls.forEach((call) => {
        const urlString = typeof call[0] === 'string' ? call[0] : call[0].toString()
        const pathSegments = new URL(urlString).pathname.split('/')
        const actualFetchedProperty = pathSegments[pathSegments.length - 1]
        if (actualFetchedProperty === fastReadoutDataPropertyName) {
          fastReadoutDataPropertyFetched = true
        }
      })
      expect(fastReadoutDataPropertyFetched).toBe(false)
      consoleWarnSpy.mock.calls.forEach((call) => {
        const warningMessage = call[1] as string
        expect(warningMessage.includes(`Failed to fetch ${fastReadoutDataPropertyName}`) && warningMessage.includes('CanFastReadout is true')).toBe(
          false
        )
      })
    })

    it('should fetch gain (index) and not gainmin/gainmax if gains list is present and non-empty', async () => {
      const mockGainsList = ['High', 'Medium', 'Low']
      const mockGainIndex = 1
      const mockPropertiesWithGainsList: Record<string, unknown> = {
        sensortype: 0,
        cangetcoolerpower: false,
        cansetccdtemperature: false,
        canfastreadout: false,
        gains: mockGainsList,
        gain: mockGainIndex,
        offsets: [],
        cameraxsize: 100
      }
      mockFetch.mockImplementation(async (url: string | URL | Request) => {
        const urlString = typeof url === 'string' ? url : url.toString()
        const propertyName = new URL(urlString).pathname.split('/').pop() || ''
        if (propertyName === 'gainmin' || propertyName === 'gainmax') {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: async () => ({ Value: null, ErrorNumber: 0x401, ErrorMessage: `Should not call ${propertyName} in Gains List Mode` })
          })
        }
        if (Object.prototype.hasOwnProperty.call(mockPropertiesWithGainsList, propertyName)) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ Value: mockPropertiesWithGainsList[propertyName], ErrorNumber: 0, ErrorMessage: '' })
          })
        }
        return Promise.resolve({ ok: false, status: 400, json: async () => ({ Value: null, ErrorNumber: 0x401, ErrorMessage: 'Not implemented' }) })
      })
      const cameraInfo = await client.getCameraInfo()
      expect(cameraInfo['gains']).toEqual(mockGainsList)
      expect(cameraInfo['gain']).toBe(mockGainIndex)
      expect(cameraInfo).not.toHaveProperty('gainmin')
      expect(cameraInfo).not.toHaveProperty('gainmax')
      let gainMinFetched = false
      let gainMaxFetched = false
      mockFetch.mock.calls.forEach((call) => {
        const urlString = typeof call[0] === 'string' ? call[0] : call[0].toString()
        const actualFetchedProperty = new URL(urlString).pathname.split('/').pop() || ''
        if (actualFetchedProperty === 'gainmin') gainMinFetched = true
        if (actualFetchedProperty === 'gainmax') gainMaxFetched = true
      })
      expect(gainMinFetched).toBe(false)
      expect(gainMaxFetched).toBe(false)
    })

    it('should fetch gain (value), gainmin, and gainmax if gains list is present but empty', async () => {
      const mockEmptyGainsList: string[] = []
      const mockGainValue = 150
      const mockGainMin = 0
      const mockGainMax = 300
      const mockPropertiesWithEmptyGainsList: Record<string, unknown> = {
        sensortype: 0,
        cangetcoolerpower: false,
        cansetccdtemperature: false,
        canfastreadout: false,
        gains: mockEmptyGainsList,
        gain: mockGainValue,
        gainmin: mockGainMin,
        gainmax: mockGainMax,
        offsets: [],
        cameraxsize: 100
      }

      mockFetch.mockImplementation(async (url: string | URL | Request) => {
        const urlString = typeof url === 'string' ? url : url.toString()
        const propertyName = new URL(urlString).pathname.split('/').pop() || ''

        if (Object.prototype.hasOwnProperty.call(mockPropertiesWithEmptyGainsList, propertyName)) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ Value: mockPropertiesWithEmptyGainsList[propertyName], ErrorNumber: 0, ErrorMessage: '' })
          })
        }
        const nonCriticalCommonProps = ['cameraxsize', 'sensortype', 'cangetcoolerpower', 'cansetccdtemperature', 'canfastreadout', 'offsets']
        if (nonCriticalCommonProps.includes(propertyName) || propertyName.startsWith('can') || propertyName.includes('offset')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ Value: null, ErrorNumber: 0, ErrorMessage: 'Generic Mock' }) })
        }
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({ Value: null, ErrorNumber: 0x401, ErrorMessage: `Not implemented or unexpected call to ${propertyName}` })
        })
      })

      const cameraInfo = await client.getCameraInfo()

      expect(cameraInfo['gains']).toEqual(mockEmptyGainsList)
      expect(cameraInfo['gain']).toBe(mockGainValue)
      expect(cameraInfo['gainmin']).toBe(mockGainMin)
      expect(cameraInfo['gainmax']).toBe(mockGainMax)

      let gainFetched = false
      let gainMinFetched = false
      let gainMaxFetched = false
      mockFetch.mock.calls.forEach((call) => {
        const urlString = typeof call[0] === 'string' ? call[0] : call[0].toString()
        const actualFetchedProperty = new URL(urlString).pathname.split('/').pop() || ''
        if (actualFetchedProperty === 'gain') gainFetched = true
        if (actualFetchedProperty === 'gainmin') gainMinFetched = true
        if (actualFetchedProperty === 'gainmax') gainMaxFetched = true
      })
      expect(gainFetched).toBe(true)
      expect(gainMinFetched).toBe(true)
      expect(gainMaxFetched).toBe(true)
    })

    it('should fetch gain (value), gainmin, and gainmax if fetching gains list fails', async () => {
      const originalRetries = DEFAULT_OPTIONS.retries
      const originalRetryDelay = DEFAULT_OPTIONS.retryDelay
      const originalTimeout = DEFAULT_OPTIONS.timeout

      DEFAULT_OPTIONS.retries = 1
      DEFAULT_OPTIONS.retryDelay = 1
      DEFAULT_OPTIONS.timeout = 100

      const mockGainValue = 150
      const mockGainMin = 0
      const mockGainMax = 300
      const mockPropertiesUndefinedGainsList: Record<string, unknown> = {
        sensortype: 0,
        cangetcoolerpower: false,
        cansetccdtemperature: false,
        canfastreadout: false,
        gain: mockGainValue,
        gainmin: mockGainMin,
        gainmax: mockGainMax,
        offsets: [],
        cameraxsize: 100
      }

      mockFetch.mockImplementation(async (url: string | URL | Request) => {
        const urlString = typeof url === 'string' ? url : url.toString()
        const propertyName = new URL(urlString).pathname.split('/').pop() || ''

        if (propertyName === 'gains') {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({ Value: null, ErrorNumber: 0x500, ErrorMessage: 'Simulated server error for gains' })
          })
        }
        if (Object.prototype.hasOwnProperty.call(mockPropertiesUndefinedGainsList, propertyName)) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ Value: mockPropertiesUndefinedGainsList[propertyName], ErrorNumber: 0, ErrorMessage: '' })
          })
        }
        const nonCriticalCommonProps = ['cameraxsize', 'sensortype', 'cangetcoolerpower', 'cansetccdtemperature', 'canfastreadout', 'offsets']
        if (nonCriticalCommonProps.includes(propertyName) || propertyName.startsWith('can') || propertyName.includes('offset')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ Value: null, ErrorNumber: 0, ErrorMessage: 'Generic Mock' }) })
        }
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({ Value: null, ErrorNumber: 0x401, ErrorMessage: `Not implemented or unexpected call to ${propertyName}` })
        })
      })

      try {
        consoleWarnSpy.mockClear()
        const cameraInfo = await client.getCameraInfo()

        expect(cameraInfo).not.toHaveProperty('gains')
        expect(cameraInfo['gain']).toBe(mockGainValue)
        expect(cameraInfo['gainmin']).toBe(mockGainMin)
        expect(cameraInfo['gainmax']).toBe(mockGainMax)

        let gainsFetchAttempted = false
        let gainFetched = false
        let gainMinFetched = false
        let gainMaxFetched = false
        mockFetch.mock.calls.forEach((call) => {
          const urlString = typeof call[0] === 'string' ? call[0] : call[0].toString()
          const actualFetchedProperty = new URL(urlString).pathname.split('/').pop() || ''
          if (actualFetchedProperty === 'gains') gainsFetchAttempted = true
          if (actualFetchedProperty === 'gain') gainFetched = true
          if (actualFetchedProperty === 'gainmin') gainMinFetched = true
          if (actualFetchedProperty === 'gainmax') gainMaxFetched = true
        })
        expect(gainsFetchAttempted).toBe(true)
        expect(gainFetched).toBe(true)
        expect(gainMinFetched).toBe(true)
        expect(gainMaxFetched).toBe(true)

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.objectContaining({ deviceIds: expect.arrayContaining([client.device.id]) }),
          "Could not fetch 'gains' list.",
          expect.any(Error)
        )

        const gainsCalls = mockFetch.mock.calls.filter((call) => {
          const urlString = typeof call[0] === 'string' ? call[0] : call[0].toString()
          return (new URL(urlString).pathname.split('/').pop() || '') === 'gains'
        })
        expect(gainsCalls.length).toBe(1 + 1)
      } finally {
        DEFAULT_OPTIONS.retries = originalRetries
        DEFAULT_OPTIONS.retryDelay = originalRetryDelay
        DEFAULT_OPTIONS.timeout = originalTimeout
      }
    })

    it('should fetch offset (index) and not offsetmin/offsetmax if offsets list is present and non-empty', async () => {
      const mockOffsetsList = [10, 20, 30]
      const mockOffsetIndex = 0
      const mockPropertiesWithOffsetsList: Record<string, unknown> = {
        sensortype: 0,
        cangetcoolerpower: false,
        cansetccdtemperature: false,
        canfastreadout: false,
        gains: [],
        offsets: mockOffsetsList,
        offset: mockOffsetIndex,
        cameraxsize: 100
      }
      mockFetch.mockImplementation(async (url: string | URL | Request) => {
        const urlString = typeof url === 'string' ? url : url.toString()
        const propertyName = new URL(urlString).pathname.split('/').pop() || ''
        if (propertyName === 'offsetmin' || propertyName === 'offsetmax') {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: async () => ({ Value: null, ErrorNumber: 0x401, ErrorMessage: `Should not call ${propertyName} in Offsets List Mode` })
          })
        }
        if (Object.prototype.hasOwnProperty.call(mockPropertiesWithOffsetsList, propertyName)) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ Value: mockPropertiesWithOffsetsList[propertyName], ErrorNumber: 0, ErrorMessage: '' })
          })
        }
        const nonCriticalCommonProps = ['cameraxsize', 'sensortype', 'cangetcoolerpower', 'cansetccdtemperature', 'canfastreadout', 'gains']
        if (nonCriticalCommonProps.includes(propertyName) || propertyName.startsWith('can') || propertyName.includes('gain')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ Value: null, ErrorNumber: 0, ErrorMessage: 'Generic Mock' }) })
        }
        return Promise.resolve({ ok: false, status: 400, json: async () => ({ Value: null, ErrorNumber: 0x401, ErrorMessage: 'Not implemented' }) })
      })
      const cameraInfo = await client.getCameraInfo()
      expect(cameraInfo['offsets']).toEqual(mockOffsetsList)
      expect(cameraInfo['offset']).toBe(mockOffsetIndex)
      expect(cameraInfo).not.toHaveProperty('offsetmin')
      expect(cameraInfo).not.toHaveProperty('offsetmax')
      let offsetMinFetched = false
      let offsetMaxFetched = false
      mockFetch.mock.calls.forEach((call) => {
        const urlString = typeof call[0] === 'string' ? call[0] : call[0].toString()
        const actualFetchedProperty = new URL(urlString).pathname.split('/').pop() || ''
        if (actualFetchedProperty === 'offsetmin') offsetMinFetched = true
        if (actualFetchedProperty === 'offsetmax') offsetMaxFetched = true
      })
      expect(offsetMinFetched).toBe(false)
      expect(offsetMaxFetched).toBe(false)
    })

    it('should fetch offset (value), offsetmin, and offsetmax if offsets list is present but empty', async () => {
      const mockEmptyOffsetsList: number[] = []
      const mockOffsetValue = 50
      const mockOffsetMin = 0
      const mockOffsetMax = 100
      const mockPropertiesWithEmptyOffsetsList: Record<string, unknown> = {
        sensortype: 0,
        cangetcoolerpower: false,
        cansetccdtemperature: false,
        canfastreadout: false,
        gains: [],
        offsets: mockEmptyOffsetsList,
        offset: mockOffsetValue,
        offsetmin: mockOffsetMin,
        offsetmax: mockOffsetMax,
        cameraxsize: 100
      }
      mockFetch.mockImplementation(async (url: string | URL | Request) => {
        const urlString = typeof url === 'string' ? url : url.toString()
        const propertyName = new URL(urlString).pathname.split('/').pop() || ''
        if (Object.prototype.hasOwnProperty.call(mockPropertiesWithEmptyOffsetsList, propertyName)) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ Value: mockPropertiesWithEmptyOffsetsList[propertyName], ErrorNumber: 0, ErrorMessage: '' })
          })
        }
        const nonCriticalCommonProps = ['cameraxsize', 'sensortype', 'cangetcoolerpower', 'cansetccdtemperature', 'canfastreadout', 'gains']
        if (nonCriticalCommonProps.includes(propertyName) || propertyName.startsWith('can') || propertyName.includes('gain')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ Value: null, ErrorNumber: 0, ErrorMessage: 'Generic Mock' }) })
        }
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({ Value: null, ErrorNumber: 0x401, ErrorMessage: `Not implemented or unexpected call to ${propertyName}` })
        })
      })
      const cameraInfo = await client.getCameraInfo()
      expect(cameraInfo['offsets']).toEqual(mockEmptyOffsetsList)
      expect(cameraInfo['offset']).toBe(mockOffsetValue)
      expect(cameraInfo['offsetmin']).toBe(mockOffsetMin)
      expect(cameraInfo['offsetmax']).toBe(mockOffsetMax)
      let offsetFetched = false
      let offsetMinFetched = false
      let offsetMaxFetched = false
      mockFetch.mock.calls.forEach((call) => {
        const urlString = typeof call[0] === 'string' ? call[0] : call[0].toString()
        const actualFetchedProperty = new URL(urlString).pathname.split('/').pop() || ''
        if (actualFetchedProperty === 'offset') offsetFetched = true
        if (actualFetchedProperty === 'offsetmin') offsetMinFetched = true
        if (actualFetchedProperty === 'offsetmax') offsetMaxFetched = true
      })
      expect(offsetFetched).toBe(true)
      expect(offsetMinFetched).toBe(true)
      expect(offsetMaxFetched).toBe(true)
    })

    it('should fetch offset (value), offsetmin, and offsetmax if fetching offsets list fails', async () => {
      const originalRetries = DEFAULT_OPTIONS.retries
      const originalRetryDelay = DEFAULT_OPTIONS.retryDelay
      const originalTimeout = DEFAULT_OPTIONS.timeout

      DEFAULT_OPTIONS.retries = 1
      DEFAULT_OPTIONS.retryDelay = 1
      DEFAULT_OPTIONS.timeout = 100

      const mockOffsetValue = 50
      const mockOffsetMin = 0
      const mockOffsetMax = 100
      const mockPropertiesUndefinedOffsetsList: Record<string, unknown> = {
        sensortype: 0,
        cangetcoolerpower: false,
        cansetccdtemperature: false,
        canfastreadout: false,
        gains: [],
        offset: mockOffsetValue,
        offsetmin: mockOffsetMin,
        offsetmax: mockOffsetMax,
        cameraxsize: 100
      }

      mockFetch.mockImplementation(async (url: string | URL | Request) => {
        const urlString = typeof url === 'string' ? url : url.toString()
        const propertyName = new URL(urlString).pathname.split('/').pop() || ''

        if (propertyName === 'offsets') {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({ Value: null, ErrorNumber: 0x500, ErrorMessage: 'Simulated server error for offsets' })
          })
        }
        if (Object.prototype.hasOwnProperty.call(mockPropertiesUndefinedOffsetsList, propertyName)) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ Value: mockPropertiesUndefinedOffsetsList[propertyName], ErrorNumber: 0, ErrorMessage: '' })
          })
        }
        const nonCriticalCommonProps = ['cameraxsize', 'sensortype', 'cangetcoolerpower', 'cansetccdtemperature', 'canfastreadout', 'gains']
        if (nonCriticalCommonProps.includes(propertyName) || propertyName.startsWith('can') || propertyName.includes('gain')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ Value: null, ErrorNumber: 0, ErrorMessage: 'Generic Mock' }) })
        }
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({ Value: null, ErrorNumber: 0x401, ErrorMessage: `Not implemented or unexpected call to ${propertyName}` })
        })
      })

      try {
        consoleWarnSpy.mockClear()
        const cameraInfo = await client.getCameraInfo()

        expect(cameraInfo).not.toHaveProperty('offsets')
        expect(cameraInfo['offset']).toBe(mockOffsetValue)
        expect(cameraInfo['offsetmin']).toBe(mockOffsetMin)
        expect(cameraInfo['offsetmax']).toBe(mockOffsetMax)

        let offsetsFetchAttempted = false
        let offsetFetched = false
        let offsetMinFetched = false
        let offsetMaxFetched = false
        mockFetch.mock.calls.forEach((call) => {
          const urlString = typeof call[0] === 'string' ? call[0] : call[0].toString()
          const actualFetchedProperty = new URL(urlString).pathname.split('/').pop() || ''
          if (actualFetchedProperty === 'offsets') offsetsFetchAttempted = true
          if (actualFetchedProperty === 'offset') offsetFetched = true
          if (actualFetchedProperty === 'offsetmin') offsetMinFetched = true
          if (actualFetchedProperty === 'offsetmax') offsetMaxFetched = true
        })
        expect(offsetsFetchAttempted).toBe(true)
        expect(offsetFetched).toBe(true)
        expect(offsetMinFetched).toBe(true)
        expect(offsetMaxFetched).toBe(true)

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.objectContaining({ deviceIds: expect.arrayContaining([client.device.id]) }),
          "Could not fetch 'offsets' list.",
          expect.any(Error)
        )

        const offsetsCalls = mockFetch.mock.calls.filter((call) => {
          const urlString = typeof call[0] === 'string' ? call[0] : call[0].toString()
          return (new URL(urlString).pathname.split('/').pop() || '') === 'offsets'
        })
        expect(offsetsCalls.length).toBe(1 + 1)
      } finally {
        DEFAULT_OPTIONS.retries = originalRetries
        DEFAULT_OPTIONS.retryDelay = originalRetryDelay
        DEFAULT_OPTIONS.timeout = originalTimeout
      }
    })
  })
})
