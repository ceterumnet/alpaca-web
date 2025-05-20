import { beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import type { Device, UnifiedDevice, DeviceEvent } from '@/stores/types/device-store.types'
import { DomeClient } from '@/api/alpaca/dome-client'
import type { UnifiedStoreType } from '@/stores/UnifiedStore'
import type { DomeDeviceProperties } from '@/stores/modules/domeActions'

const mockAlpacaClientBaseProperties = {
  baseUrl: '',
  deviceType: 'dome' as string,
  deviceNumber: 0,
  device: {} as UnifiedDevice,
  clientId: 0,
  transactionId: 0,
  get localTransactionMode() {
    return false
  },
  set localTransactionMode(value: boolean) {
    /* no-op */
  },
  get useSeparateClientAndTransactions() {
    return false
  },
  set useSeparateClientAndTransactions(value: boolean) {
    /* no-op */
  },
  get clientTransactionId() {
    return 0
  },
  set clientTransactionId(value: number) {
    /* no-op */
  },
  get serverTransactionId() {
    return 0
  },
  set serverTransactionId(value: number) {
    /* no-op */
  }
}

// Extracted public methods to avoid conflicts with private/protected base class methods
const publicAlpacaBaseMethods = {
  isConnected: vi.fn().mockResolvedValue(true),
  setConnected: vi.fn().mockResolvedValue(undefined),
  getmanagementinfo: vi.fn().mockResolvedValue({ ImageUrl: '', VideoUrl: '' }),
  getconfigureddevices: vi.fn().mockResolvedValue([]),
  isAlpacaDevice: vi.fn().mockReturnValue(true),
  iscommoncommand: vi.fn().mockReturnValue(true),
  getcommonpropertytype: vi.fn().mockReturnValue('number'),
  // getproperty, setproperty, callmethod are more complex due to potential protected versions
  // For now, let's stick to definitely public ones. If specific tests need them, they can be added to mockDomeClientInstance directly.
  getdescription: vi.fn().mockResolvedValue(''),
  getdriverinfo: vi.fn().mockResolvedValue(''),
  getdriverversion: vi.fn().mockResolvedValue(''),
  getinterfaceversion: vi.fn().mockResolvedValue(0),
  getname: vi.fn().mockResolvedValue(''),
  getsupportedactions: vi.fn().mockResolvedValue([]),
  getuniqueid: vi.fn().mockResolvedValue(''),
  disposed: vi.fn().mockResolvedValue(undefined),
  setupdialog: vi.fn().mockResolvedValue(undefined),
  commandblind: vi.fn().mockResolvedValue(undefined),
  commandbool: vi.fn().mockResolvedValue(false),
  commandstring: vi.fn().mockResolvedValue(''),
  action: vi.fn().mockResolvedValue(''),
  generateTransactionId: vi.fn(() => 123),
  generateClientId: vi.fn(() => 456)
  // OMIT sleep, handleResponse, executeRequest, get, put, delete, post, head, options, patch, getProperty, setProperty, callMethod, getProperties, getDeviceState
  // as these might have protected counterparts or are covered by specific client methods
}

const mockDomeClientSpecificMethods = {
  openShutter: vi.fn(),
  closeShutter: vi.fn(),
  parkDome: vi.fn(),
  findHomeDome: vi.fn(),
  abortSlewDome: vi.fn(),
  setPark: vi.fn(),
  slewToAltitude: vi.fn(),
  slewToAzimuth: vi.fn(),
  syncToAzimuth: vi.fn(),
  setSlaved: vi.fn(),
  getDomeState: vi.fn(), // Will be mocked per test or in beforeEach
  altitude: vi.fn().mockResolvedValue(0),
  atHome: vi.fn().mockResolvedValue(false),
  atPark: vi.fn().mockResolvedValue(false),
  azimuth: vi.fn().mockResolvedValue(0),
  canFindHome: vi.fn().mockResolvedValue(true),
  canPark: vi.fn().mockResolvedValue(true),
  canSetAltitude: vi.fn().mockResolvedValue(true),
  canSetAzimuth: vi.fn().mockResolvedValue(true),
  canSetPark: vi.fn().mockResolvedValue(true),
  canSetShutter: vi.fn().mockResolvedValue(true),
  canSlave: vi.fn().mockResolvedValue(true),
  canSyncAzimuth: vi.fn().mockResolvedValue(true),
  shutterStatus: vi.fn().mockResolvedValue(1),
  slaved: vi.fn().mockResolvedValue(false),
  slewing: vi.fn().mockResolvedValue(false)
}

// This will be the shared mock instance returned by the DomeClient constructor mock
const mockDomeClientInstance: DomeClient = {
  ...mockAlpacaClientBaseProperties,
  ...publicAlpacaBaseMethods, // Use the filtered public methods
  ...mockDomeClientSpecificMethods,
  // Ensure methods that are frequently re-mocked per test are here as vi.fn()
  getDomeState: vi.fn(), // Already in mockDomeClientSpecificMethods, reiterated for clarity
  openShutter: vi.fn(), // ditto
  closeShutter: vi.fn(), // ditto
  parkDome: vi.fn(), // ditto
  // Add any generic AlpacaClient methods if they are directly called and need mocking, e.g.
  getProperty: vi.fn(),
  setProperty: vi.fn(),
  callMethod: vi.fn(),
  getDeviceState: vi.fn() // if used directly by domeActions
} as unknown as DomeClient

vi.mock('@/api/alpaca/dome-client', () => {
  const MockConstructor = vi.fn((_baseUrl, _deviceNum, _device) => {
    // Always return the same shared mock instance
    return mockDomeClientInstance
  })
  return { DomeClient: MockConstructor }
})

// This type alias points to the mocked constructor from vi.mock
const MockedDomeClientConstructor = DomeClient as unknown as MockInstance<
  (baseUrl: string, deviceNumber: number, device: UnifiedDevice) => DomeClient // Changed to DomeClient
>

const createMockDevice = (overrides: Partial<UnifiedDevice> & { deviceType: string; id: string }): UnifiedDevice => {
  return {
    name: 'Test Device',
    driverVersion: '1.0',
    driverInfo: 'Test Driver',
    supportedActions: [],
    uniqueId: `${overrides.id}-unique`,
    deviceNum: 0,
    isConnected: false,
    isConnecting: false,
    isDisconnecting: false,
    status: 'idle',
    type: overrides.deviceType,
    properties: {} as DomeDeviceProperties,
    ...overrides
  } as UnifiedDevice
}

describe('domeActions', () => {
  let store: ReturnType<typeof useUnifiedStore>
  let mockGetDeviceById: MockInstance<(deviceId: string) => Device | null>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useUnifiedStore()

    vi.clearAllMocks()

    mockGetDeviceById = vi.spyOn(store, 'getDeviceById')

    // Remove previous MockedDomeClientConstructor.mockImplementation
    // Reset methods on the shared mockDomeClientInstance instead
    vi.mocked(mockDomeClientInstance.getDomeState)
      .mockReset()
      .mockResolvedValue({ altitude: 0, azimuth: 0, athome: false, atpark: false, shutterstatus: 1, slewing: false, slaved: false })
    vi.mocked(mockDomeClientInstance.openShutter).mockReset()
    vi.mocked(mockDomeClientInstance.closeShutter).mockReset()
    vi.mocked(mockDomeClientInstance.parkDome).mockReset()
    vi.mocked(mockDomeClientInstance.findHomeDome).mockReset()
    vi.mocked(mockDomeClientInstance.abortSlewDome).mockReset()
    vi.mocked(mockDomeClientInstance.getProperty).mockReset()
    vi.mocked(mockDomeClientInstance.setProperty).mockReset()
    vi.mocked(mockDomeClientInstance.callMethod).mockReset()
    vi.mocked(mockDomeClientInstance.getDeviceState).mockReset()
  })

  describe('_getDomeClient', () => {
    it('should return a DomeClient instance for a valid dome device with apiBaseUrl', () => {
      const mockDevice = createMockDevice({
        id: 'dome1',
        deviceType: 'dome',
        isConnected: true,
        apiBaseUrl: 'http://localhost:11111'
      })
      mockGetDeviceById.mockReturnValue(mockDevice as Device)

      const client = (store as UnifiedStoreType)._getDomeClient?.('dome1')
      expect(client).toBe(mockDomeClientInstance)
      expect(MockedDomeClientConstructor).toHaveBeenCalledWith('http://localhost:11111', 0, mockDevice)
    })

    it('should return a DomeClient instance using address and port if apiBaseUrl is missing', () => {
      const mockDevice = createMockDevice({
        id: 'dome2',
        deviceType: 'dome',
        deviceNum: 1,
        isConnected: true,
        address: '192.168.1.100',
        port: 12345
      })
      mockGetDeviceById.mockReturnValue(mockDevice as Device)

      const client = (store as UnifiedStoreType)._getDomeClient?.('dome2')
      expect(client).toBe(mockDomeClientInstance)
      expect(MockedDomeClientConstructor).toHaveBeenCalledWith('http://192.168.1.100:12345', 1, mockDevice)
    })

    it('should return a DomeClient instance using ipAddress and port if apiBaseUrl and address are missing', () => {
      const mockDevice = createMockDevice({
        id: 'dome3',
        deviceType: 'dome',
        deviceNum: 1,
        isConnected: true,
        ipAddress: '192.168.1.101',
        port: 12345
      })
      mockGetDeviceById.mockReturnValue(mockDevice as Device)

      const client = (store as UnifiedStoreType)._getDomeClient?.('dome3')
      expect(client).toBe(mockDomeClientInstance)
      expect(MockedDomeClientConstructor).toHaveBeenCalledWith('http://192.168.1.101:12345', 1, mockDevice)
    })

    it('should return null if device is not found', () => {
      mockGetDeviceById.mockReturnValue(null)
      const client = (store as UnifiedStoreType)._getDomeClient?.('nonexistent')
      expect(client).toBeNull()
      expect(MockedDomeClientConstructor).not.toHaveBeenCalled()
    })

    it('should return null if device is not a dome', () => {
      const mockDevice = createMockDevice({
        id: 'camera1',
        deviceType: 'camera', // Not a dome
        isConnected: true,
        apiBaseUrl: 'http://localhost:11111'
      })
      mockGetDeviceById.mockReturnValue(mockDevice as Device)
      const client = (store as UnifiedStoreType)._getDomeClient?.('camera1')
      expect(client).toBeNull()
      expect(MockedDomeClientConstructor).not.toHaveBeenCalled()
    })

    it('should return null if device has no address details', () => {
      const mockDevice = createMockDevice({
        id: 'dome4',
        deviceType: 'dome',
        isConnected: true
        // No apiBaseUrl, address, or ipAddress
      })
      mockGetDeviceById.mockReturnValue(mockDevice as Device)
      const client = (store as UnifiedStoreType)._getDomeClient?.('dome4')
      expect(client).toBeNull()
      expect(MockedDomeClientConstructor).not.toHaveBeenCalled()
    })

    it('should remove trailing slash from apiBaseUrl', () => {
      const mockDevice = createMockDevice({
        id: 'dome5',
        deviceType: 'dome',
        isConnected: true,
        apiBaseUrl: 'http://localhost:11111/' // Trailing slash
      })
      mockGetDeviceById.mockReturnValue(mockDevice as Device)

      const client = (store as UnifiedStoreType)._getDomeClient?.('dome5')
      expect(client).toBe(mockDomeClientInstance)
      expect(MockedDomeClientConstructor).toHaveBeenCalledWith('http://localhost:11111', 0, mockDevice)
    })

    it('should use deviceNum 0 if device.deviceNum is undefined', () => {
      const mockDevicePayload = {
        id: 'dome6',
        deviceType: 'dome' as string,
        isConnected: true,
        apiBaseUrl: 'http://localhost:11111',
        name: 'Test Dome 6',
        driverVersion: '1.0',
        driverInfo: 'Test Driver',
        supportedActions: [],
        uniqueId: 'dome6-unique'
        // deviceNum is intentionally omitted
      }
      const mockDevice = createMockDevice(mockDevicePayload)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore explicitly testing undefined deviceNum
      delete mockDevice.deviceNum

      mockGetDeviceById.mockReturnValue(mockDevice as Device)

      const client = (store as UnifiedStoreType)._getDomeClient?.('dome6')
      expect(client).toBe(mockDomeClientInstance)
      expect(MockedDomeClientConstructor).toHaveBeenCalledWith('http://localhost:11111', 0, mockDevice)
    })
  })

  describe('fetchDomeStatus', () => {
    let mockEmitEvent: MockInstance<UnifiedStoreType['_emitEvent']>
    let mockUpdateDevice: MockInstance<UnifiedStoreType['updateDevice']>
    let mockGetDomeClient: MockInstance<UnifiedStoreType['_getDomeClient']>

    beforeEach(() => {
      mockEmitEvent = vi.spyOn(store as UnifiedStoreType, '_emitEvent') as typeof mockEmitEvent
      mockUpdateDevice = vi.spyOn(store, 'updateDevice') as typeof mockUpdateDevice
      mockGetDomeClient = vi.spyOn(store as UnifiedStoreType, '_getDomeClient') as typeof mockGetDomeClient
    })

    it('should fetch dome status, update device, and emit propertyChanged event on success', async () => {
      const deviceId = 'dome1'
      mockGetDomeClient.mockReturnValue(mockDomeClientInstance as unknown as DomeClient)
      const domeStateResponse = {
        altitude: 30,
        azimuth: 120,
        athome: false,
        atpark: false,
        shutterstatus: 0, // Open
        slewing: false,
        slaved: true
      }
      vi.mocked(mockDomeClientInstance.getDomeState).mockResolvedValue(domeStateResponse)

      await (store as UnifiedStoreType).fetchDomeStatus?.(deviceId)

      expect(mockGetDomeClient).toHaveBeenCalledWith(deviceId)
      expect(mockDomeClientInstance.getDomeState).toHaveBeenCalledTimes(1)
      expect(mockUpdateDevice).toHaveBeenCalledWith(deviceId, {
        dome_altitude: 30,
        dome_azimuth: 120,
        dome_atHome: false,
        dome_atPark: false,
        dome_shutterStatus: 0,
        dome_slewing: false,
        dome_slaved: true
      })
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'devicePropertyChanged',
          deviceId,
          property: 'domeStatus',
          value: {
            dome_altitude: 30,
            dome_azimuth: 120,
            dome_atHome: false,
            dome_atPark: false,
            dome_shutterStatus: 0,
            dome_slewing: false,
            dome_slaved: true
          }
        } as DeviceEvent)
      )
    })

    it('should handle nullish values from getDomeState correctly', async () => {
      const deviceId = 'dome2'
      mockGetDomeClient.mockReturnValue(mockDomeClientInstance as unknown as DomeClient)

      const domeStateResponse = {
        altitude: null,
        azimuth: undefined,
        athome: false,
        atpark: true,
        shutterstatus: 1,
        slewing: false,
        slaved: false
      }
      vi.mocked(mockDomeClientInstance.getDomeState).mockResolvedValue(domeStateResponse)

      await (store as UnifiedStoreType).fetchDomeStatus?.(deviceId)

      expect(mockUpdateDevice).toHaveBeenCalledWith(deviceId, {
        dome_altitude: null,
        dome_azimuth: null,
        dome_atHome: false,
        dome_atPark: true,
        dome_shutterStatus: 1,
        dome_slewing: false,
        dome_slaved: false
      })
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'devicePropertyChanged',
          deviceId,
          property: 'domeStatus',
          value: {
            dome_altitude: null,
            dome_azimuth: null,
            dome_atHome: false,
            dome_atPark: true,
            dome_shutterStatus: 1,
            dome_slewing: false,
            dome_slaved: false
          }
        } as DeviceEvent)
      )
    })

    it('should not call client or update if _getDomeClient returns null', async () => {
      const deviceId = 'dome_no_client'
      mockGetDomeClient.mockReturnValue(null)

      await (store as UnifiedStoreType).fetchDomeStatus?.(deviceId)

      expect(mockGetDomeClient).toHaveBeenCalledWith(deviceId)
      expect(mockUpdateDevice).not.toHaveBeenCalled()
      expect(mockEmitEvent).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError and not update device if getDomeState throws an error', async () => {
      const deviceId = 'dome_error'
      mockGetDomeClient.mockReturnValue(mockDomeClientInstance as unknown as DomeClient)
      const errorMessage = 'Failed to get state'

      vi.mocked(mockDomeClientInstance.getDomeState).mockRejectedValue(new Error(errorMessage))

      await (store as UnifiedStoreType).fetchDomeStatus?.(deviceId)

      expect(mockDomeClientInstance.getDomeState).toHaveBeenCalledTimes(1)
      expect(mockUpdateDevice).not.toHaveBeenCalled()
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceApiError',
          deviceId,
          error: `Failed to fetch dome status: Error: ${errorMessage}`
        } as DeviceEvent)
      )
    })
  })

  describe('_executeDomeAction', () => {
    let mockEmitEvent: MockInstance<UnifiedStoreType['_emitEvent']>
    let mockGetDomeClient: MockInstance<UnifiedStoreType['_getDomeClient']>
    let mockFetchDomeStatus: MockInstance<UnifiedStoreType['fetchDomeStatus']>
    let mockClientInstance: typeof mockDomeClientInstance // Use the type of the shared instance

    const deviceId = 'test-dome-device'
    type DomeActionName = keyof Pick<DomeClient, 'openShutter' | 'closeShutter' | 'parkDome' | 'findHomeDome' | 'abortSlewDome'>

    beforeEach(() => {
      mockEmitEvent = vi.spyOn(store as UnifiedStoreType, '_emitEvent') as typeof mockEmitEvent
      mockGetDomeClient = vi.spyOn(store as UnifiedStoreType, '_getDomeClient') as typeof mockGetDomeClient
      mockFetchDomeStatus = vi.spyOn(store as UnifiedStoreType, 'fetchDomeStatus') as typeof mockFetchDomeStatus
      mockFetchDomeStatus.mockResolvedValue()

      // mockClientInstance now refers to the shared mockDomeClientInstance
      mockClientInstance = mockDomeClientInstance
      // Methods are reset in the main beforeEach. Specific mockResolvedValue/mockRejectedValue will be set per test.
    })

    it('should call the correct client action, fetch status, and emit event on success', async () => {
      const actionName: DomeActionName = 'openShutter'
      mockGetDomeClient.mockReturnValue(mockClientInstance as unknown as DomeClient) // mockGetDomeClient returns the shared instance
      vi.mocked(mockClientInstance.openShutter).mockResolvedValue(undefined) // Mock specific action success

      await (store as UnifiedStoreType)._executeDomeAction?.(deviceId, actionName)

      expect(mockGetDomeClient).toHaveBeenCalledWith(deviceId)
      expect(mockClientInstance.openShutter).toHaveBeenCalledTimes(1)
      expect(mockFetchDomeStatus).toHaveBeenCalledWith(deviceId)
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceMethodCalled',
          deviceId,
          method: actionName,
          args: [],
          result: 'success'
        } as DeviceEvent)
      )
    })

    it('should fetch status and emit error event if client action fails', async () => {
      const actionName: DomeActionName = 'closeShutter'
      const errorMessage = 'Shutter jammed'
      mockGetDomeClient.mockReturnValue(mockClientInstance as unknown as DomeClient)
      vi.mocked(mockClientInstance.closeShutter).mockRejectedValue(new Error(errorMessage)) // Mock specific action failure

      await (store as UnifiedStoreType)._executeDomeAction?.(deviceId, actionName)

      expect(mockGetDomeClient).toHaveBeenCalledWith(deviceId)
      expect(mockClientInstance.closeShutter).toHaveBeenCalledTimes(1)
      expect(mockFetchDomeStatus).toHaveBeenCalledWith(deviceId) // Should still be called
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceApiError',
          deviceId,
          error: `Failed to ${actionName} dome: Error: ${errorMessage}`
        } as DeviceEvent)
      )
    })

    it('should not call client action or fetch status if _getDomeClient returns null', async () => {
      const actionName: DomeActionName = 'parkDome'
      mockGetDomeClient.mockReturnValue(null)

      await (store as UnifiedStoreType)._executeDomeAction?.(deviceId, actionName)

      expect(mockGetDomeClient).toHaveBeenCalledWith(deviceId)
      expect(mockClientInstance.parkDome).not.toHaveBeenCalled()
      expect(mockFetchDomeStatus).not.toHaveBeenCalled()
      expect(mockEmitEvent).not.toHaveBeenCalled() // No client, so no API error either
    })

    // Test for another action to ensure generality
    it('should work for parkDome action on success', async () => {
      const actionName: DomeActionName = 'parkDome'
      mockGetDomeClient.mockReturnValue(mockClientInstance as unknown as DomeClient)
      vi.mocked(mockClientInstance.parkDome).mockResolvedValue(undefined)

      await (store as UnifiedStoreType)._executeDomeAction?.(deviceId, actionName)

      expect(mockClientInstance.parkDome).toHaveBeenCalledTimes(1)
      expect(mockFetchDomeStatus).toHaveBeenCalledWith(deviceId)
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceMethodCalled',
          deviceId,
          method: actionName,
          result: 'success'
        } as DeviceEvent)
      )
    })
  })
})
