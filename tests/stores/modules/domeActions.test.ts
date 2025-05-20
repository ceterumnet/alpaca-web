import { beforeEach, describe, expect, it, vi, type MockInstance, afterEach } from 'vitest'
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

  // TODO: Add tests for specific action wrappers (openDomeShutter, etc.) that call _executeDomeAction
  // These tests will be simpler, primarily checking if _executeDomeAction is spied on and called correctly.

  describe('openDomeShutter', () => {
    it('should call _executeDomeAction with "openShutter"', async () => {
      const deviceId = 'dome1'
      const mockDevice = createMockDevice({ id: deviceId, deviceType: 'dome', apiBaseUrl: 'http://localhost:11111' })
      mockGetDeviceById.mockReturnValue(mockDevice as Device)
      const executeSpy = vi.spyOn(store, '_executeDomeAction') as MockInstance<
        (
          deviceId: string,
          action: keyof Pick<DomeClient, 'openShutter' | 'closeShutter' | 'parkDome' | 'findHomeDome' | 'abortSlewDome'>
        ) => Promise<void>
      >
      executeSpy.mockResolvedValue(undefined)

      await store.openDomeShutter(deviceId)

      expect(executeSpy).toHaveBeenCalledWith(deviceId, 'openShutter')
    })
  })

  describe('closeDomeShutter', () => {
    it('should call _executeDomeAction with "closeShutter"', async () => {
      const deviceId = 'dome1'
      const mockDevice = createMockDevice({ id: deviceId, deviceType: 'dome', apiBaseUrl: 'http://localhost:11111' })
      mockGetDeviceById.mockReturnValue(mockDevice as Device)
      const executeSpy = vi.spyOn(store, '_executeDomeAction') as MockInstance<
        (
          deviceId: string,
          action: keyof Pick<DomeClient, 'openShutter' | 'closeShutter' | 'parkDome' | 'findHomeDome' | 'abortSlewDome'>
        ) => Promise<void>
      >
      executeSpy.mockResolvedValue(undefined)

      await store.closeDomeShutter(deviceId)

      expect(executeSpy).toHaveBeenCalledWith(deviceId, 'closeShutter')
    })
  })

  describe('parkDomeDevice', () => {
    it('should call _executeDomeAction with "parkDome"', async () => {
      const deviceId = 'dome1'
      const mockDevice = createMockDevice({ id: deviceId, deviceType: 'dome', apiBaseUrl: 'http://localhost:11111' })
      mockGetDeviceById.mockReturnValue(mockDevice as Device)
      const executeSpy = vi.spyOn(store, '_executeDomeAction') as MockInstance<
        (
          deviceId: string,
          action: keyof Pick<DomeClient, 'openShutter' | 'closeShutter' | 'parkDome' | 'findHomeDome' | 'abortSlewDome'>
        ) => Promise<void>
      >
      executeSpy.mockResolvedValue(undefined)

      await store.parkDomeDevice(deviceId)

      expect(executeSpy).toHaveBeenCalledWith(deviceId, 'parkDome')
    })
  })

  describe('findDomeHome', () => {
    it('should call _executeDomeAction with "findHomeDome"', async () => {
      const deviceId = 'dome1'
      const mockDevice = createMockDevice({ id: deviceId, deviceType: 'dome', apiBaseUrl: 'http://localhost:11111' })
      mockGetDeviceById.mockReturnValue(mockDevice as Device)
      const executeSpy = vi.spyOn(store, '_executeDomeAction') as MockInstance<
        (
          deviceId: string,
          action: keyof Pick<DomeClient, 'openShutter' | 'closeShutter' | 'parkDome' | 'findHomeDome' | 'abortSlewDome'>
        ) => Promise<void>
      >
      executeSpy.mockResolvedValue(undefined)

      await store.findDomeHome(deviceId)

      expect(executeSpy).toHaveBeenCalledWith(deviceId, 'findHomeDome')
    })
  })

  describe('abortDomeSlew', () => {
    it('should call _executeDomeAction with "abortSlewDome"', async () => {
      const deviceId = 'dome1'
      const mockDevice = createMockDevice({ id: deviceId, deviceType: 'dome', apiBaseUrl: 'http://localhost:11111' })
      mockGetDeviceById.mockReturnValue(mockDevice as Device)
      const executeSpy = vi.spyOn(store, '_executeDomeAction') as MockInstance<
        (
          deviceId: string,
          action: keyof Pick<DomeClient, 'openShutter' | 'closeShutter' | 'parkDome' | 'findHomeDome' | 'abortSlewDome'>
        ) => Promise<void>
      >
      executeSpy.mockResolvedValue(undefined)

      await store.abortDomeSlew(deviceId)

      expect(executeSpy).toHaveBeenCalledWith(deviceId, 'abortSlewDome')
    })
  })

  describe('setDomeParkPosition', () => {
    const deviceId = 'dome-park-test'
    let mockEmitEvent: MockInstance<(event: DeviceEvent) => void>
    let mockGetDomeClient: MockInstance<(deviceId: string) => DomeClient | null>

    beforeEach(() => {
      mockEmitEvent = vi.spyOn(store, '_emitEvent') as MockInstance<(event: DeviceEvent) => void>
      mockGetDomeClient = vi.spyOn(store, '_getDomeClient') as MockInstance<(deviceId: string) => DomeClient | null>
      vi.mocked(mockDomeClientInstance.setPark).mockReset()
    })

    it('should call client.setPark and emit deviceMethodCalled on success', async () => {
      mockGetDomeClient.mockReturnValue(mockDomeClientInstance as unknown as DomeClient)
      vi.mocked(mockDomeClientInstance.setPark).mockResolvedValue(undefined)

      await store.setDomeParkPosition(deviceId)

      expect(mockGetDomeClient).toHaveBeenCalledWith(deviceId)
      expect(mockDomeClientInstance.setPark).toHaveBeenCalledTimes(1)
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceMethodCalled',
          deviceId,
          method: 'setPark',
          args: [],
          result: 'success'
        } as DeviceEvent)
      )
    })

    it('should emit deviceApiError if client.setPark fails', async () => {
      const errorMessage = 'Failed to set park position'
      mockGetDomeClient.mockReturnValue(mockDomeClientInstance as unknown as DomeClient)
      vi.mocked(mockDomeClientInstance.setPark).mockRejectedValue(new Error(errorMessage))

      await store.setDomeParkPosition(deviceId)

      expect(mockDomeClientInstance.setPark).toHaveBeenCalledTimes(1)
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceApiError',
          deviceId,
          error: `Failed to set park position: Error: ${errorMessage}`
        } as DeviceEvent)
      )
    })

    it('should not call client.setPark or emit events if _getDomeClient returns null', async () => {
      mockGetDomeClient.mockReturnValue(null)

      await store.setDomeParkPosition(deviceId)

      expect(mockDomeClientInstance.setPark).not.toHaveBeenCalled()
      expect(mockEmitEvent).not.toHaveBeenCalled()
    })
  })

  describe('slewDomeToAltitude', () => {
    const deviceId = 'dome-slew-alt-test'
    const testAltitude = 45
    let mockGetDomeClient: MockInstance<(deviceId: string) => DomeClient | null>
    let mockEmitEvent: MockInstance<(event: DeviceEvent) => void>
    let mockFetchDomeStatus: MockInstance<(deviceId: string) => Promise<void>>

    beforeEach(() => {
      mockGetDomeClient = vi.spyOn(store, '_getDomeClient') as MockInstance<(deviceId: string) => DomeClient | null>
      mockEmitEvent = vi.spyOn(store, '_emitEvent') as MockInstance<(event: DeviceEvent) => void>
      // Assuming fetchDomeStatus is a public action on the store
      mockFetchDomeStatus = vi.spyOn(store, 'fetchDomeStatus') as MockInstance<(deviceId: string) => Promise<void>>
      mockFetchDomeStatus.mockResolvedValue(undefined) // Default mock for success

      vi.mocked(mockDomeClientInstance.slewToAltitude).mockReset()
    })

    it('should call client.slewToAltitude, fetch status, and emit event on success', async () => {
      mockGetDomeClient.mockReturnValue(mockDomeClientInstance as unknown as DomeClient)
      vi.mocked(mockDomeClientInstance.slewToAltitude).mockResolvedValue(undefined)

      await store.slewDomeToAltitude(deviceId, testAltitude)

      expect(mockGetDomeClient).toHaveBeenCalledWith(deviceId)
      expect(mockDomeClientInstance.slewToAltitude).toHaveBeenCalledWith(testAltitude)
      expect(mockFetchDomeStatus).toHaveBeenCalledWith(deviceId)
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceMethodCalled',
          deviceId,
          method: 'slewToAltitude',
          args: [testAltitude],
          result: 'success'
        } as DeviceEvent)
      )
    })

    it('should call client.slewToAltitude, fetch status, and emit error on client failure', async () => {
      const errorMessage = 'Slew failed'
      mockGetDomeClient.mockReturnValue(mockDomeClientInstance as unknown as DomeClient)
      vi.mocked(mockDomeClientInstance.slewToAltitude).mockRejectedValue(new Error(errorMessage))

      await store.slewDomeToAltitude(deviceId, testAltitude)

      expect(mockDomeClientInstance.slewToAltitude).toHaveBeenCalledWith(testAltitude)
      expect(mockFetchDomeStatus).toHaveBeenCalledWith(deviceId) // Should still fetch status
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceApiError',
          deviceId,
          error: `Failed to slew to altitude: Error: ${errorMessage}`
        } as DeviceEvent)
      )
    })

    it('should not call client or fetch status if _getDomeClient returns null', async () => {
      mockGetDomeClient.mockReturnValue(null)

      await store.slewDomeToAltitude(deviceId, testAltitude)

      expect(mockDomeClientInstance.slewToAltitude).not.toHaveBeenCalled()
      expect(mockFetchDomeStatus).not.toHaveBeenCalled()
      expect(mockEmitEvent).not.toHaveBeenCalled()
    })
  })

  describe('slewDomeToAzimuth', () => {
    const deviceId = 'dome-slew-az-test'
    const testAzimuth = 180
    let mockGetDomeClient: MockInstance<(deviceId: string) => DomeClient | null>
    let mockEmitEvent: MockInstance<(event: DeviceEvent) => void>
    let mockFetchDomeStatus: MockInstance<(deviceId: string) => Promise<void>>

    beforeEach(() => {
      mockGetDomeClient = vi.spyOn(store, '_getDomeClient') as MockInstance<(deviceId: string) => DomeClient | null>
      mockEmitEvent = vi.spyOn(store, '_emitEvent') as MockInstance<(event: DeviceEvent) => void>
      mockFetchDomeStatus = vi.spyOn(store, 'fetchDomeStatus') as MockInstance<(deviceId: string) => Promise<void>>
      mockFetchDomeStatus.mockResolvedValue(undefined)

      vi.mocked(mockDomeClientInstance.slewToAzimuth).mockReset()
    })

    it('should call client.slewToAzimuth, fetch status, and emit event on success', async () => {
      mockGetDomeClient.mockReturnValue(mockDomeClientInstance as unknown as DomeClient)
      vi.mocked(mockDomeClientInstance.slewToAzimuth).mockResolvedValue(undefined)

      await store.slewDomeToAzimuth(deviceId, testAzimuth)

      expect(mockGetDomeClient).toHaveBeenCalledWith(deviceId)
      expect(mockDomeClientInstance.slewToAzimuth).toHaveBeenCalledWith(testAzimuth)
      expect(mockFetchDomeStatus).toHaveBeenCalledWith(deviceId)
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceMethodCalled',
          deviceId,
          method: 'slewToAzimuth',
          args: [testAzimuth],
          result: 'success'
        } as DeviceEvent)
      )
    })

    it('should call client.slewToAzimuth, fetch status, and emit error on client failure', async () => {
      const errorMessage = 'Slew failed'
      mockGetDomeClient.mockReturnValue(mockDomeClientInstance as unknown as DomeClient)
      vi.mocked(mockDomeClientInstance.slewToAzimuth).mockRejectedValue(new Error(errorMessage))

      await store.slewDomeToAzimuth(deviceId, testAzimuth)

      expect(mockDomeClientInstance.slewToAzimuth).toHaveBeenCalledWith(testAzimuth)
      expect(mockFetchDomeStatus).toHaveBeenCalledWith(deviceId)
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceApiError',
          deviceId,
          error: `Failed to slew to azimuth: Error: ${errorMessage}`
        } as DeviceEvent)
      )
    })

    it('should not call client or fetch status if _getDomeClient returns null', async () => {
      mockGetDomeClient.mockReturnValue(null)

      await store.slewDomeToAzimuth(deviceId, testAzimuth)

      expect(mockDomeClientInstance.slewToAzimuth).not.toHaveBeenCalled()
      expect(mockFetchDomeStatus).not.toHaveBeenCalled()
      expect(mockEmitEvent).not.toHaveBeenCalled()
    })
  })

  describe('syncDomeToAzimuth', () => {
    const deviceId = 'dome-sync-az-test'
    const testAzimuth = 270
    let mockGetDomeClient: MockInstance<(deviceId: string) => DomeClient | null>
    let mockEmitEvent: MockInstance<(event: DeviceEvent) => void>
    let mockFetchDomeStatus: MockInstance<(deviceId: string) => Promise<void>>

    beforeEach(() => {
      mockGetDomeClient = vi.spyOn(store, '_getDomeClient') as MockInstance<(deviceId: string) => DomeClient | null>
      mockEmitEvent = vi.spyOn(store, '_emitEvent') as MockInstance<(event: DeviceEvent) => void>
      mockFetchDomeStatus = vi.spyOn(store, 'fetchDomeStatus') as MockInstance<(deviceId: string) => Promise<void>>
      mockFetchDomeStatus.mockResolvedValue(undefined)

      vi.mocked(mockDomeClientInstance.syncToAzimuth).mockReset()
    })

    it('should call client.syncToAzimuth, fetch status, and emit event on success', async () => {
      mockGetDomeClient.mockReturnValue(mockDomeClientInstance as unknown as DomeClient)
      vi.mocked(mockDomeClientInstance.syncToAzimuth).mockResolvedValue(undefined)

      await store.syncDomeToAzimuth(deviceId, testAzimuth)

      expect(mockGetDomeClient).toHaveBeenCalledWith(deviceId)
      expect(mockDomeClientInstance.syncToAzimuth).toHaveBeenCalledWith(testAzimuth)
      expect(mockFetchDomeStatus).toHaveBeenCalledWith(deviceId)
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceMethodCalled',
          deviceId,
          method: 'syncToAzimuth',
          args: [testAzimuth],
          result: 'success'
        } as DeviceEvent)
      )
    })

    it('should call client.syncToAzimuth, fetch status, and emit error on client failure', async () => {
      const errorMessage = 'Sync failed'
      mockGetDomeClient.mockReturnValue(mockDomeClientInstance as unknown as DomeClient)
      vi.mocked(mockDomeClientInstance.syncToAzimuth).mockRejectedValue(new Error(errorMessage))

      await store.syncDomeToAzimuth(deviceId, testAzimuth)

      expect(mockDomeClientInstance.syncToAzimuth).toHaveBeenCalledWith(testAzimuth)
      expect(mockFetchDomeStatus).toHaveBeenCalledWith(deviceId)
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceApiError',
          deviceId,
          error: `Failed to sync to azimuth: Error: ${errorMessage}` // Message from domeActions.ts
        } as DeviceEvent)
      )
    })

    it('should not call client or fetch status if _getDomeClient returns null', async () => {
      mockGetDomeClient.mockReturnValue(null)

      await store.syncDomeToAzimuth(deviceId, testAzimuth)

      expect(mockDomeClientInstance.syncToAzimuth).not.toHaveBeenCalled()
      expect(mockFetchDomeStatus).not.toHaveBeenCalled()
      expect(mockEmitEvent).not.toHaveBeenCalled()
    })
  })

  describe('setDomeSlavedState', () => {
    const deviceId = 'dome-slave-test'
    let mockGetDomeClient: MockInstance<(deviceId: string) => DomeClient | null>
    let mockEmitEvent: MockInstance<(event: DeviceEvent) => void>
    let mockUpdateDevice: MockInstance<UnifiedStoreType['updateDevice']>
    let mockFetchDomeStatus: MockInstance<(deviceId: string) => Promise<void>>

    beforeEach(() => {
      mockGetDomeClient = vi.spyOn(store, '_getDomeClient') as MockInstance<(deviceId: string) => DomeClient | null>
      mockEmitEvent = vi.spyOn(store, '_emitEvent') as MockInstance<(event: DeviceEvent) => void>
      mockUpdateDevice = vi.spyOn(store, 'updateDevice') as MockInstance<UnifiedStoreType['updateDevice']>
      mockFetchDomeStatus = vi.spyOn(store, 'fetchDomeStatus') as MockInstance<(deviceId: string) => Promise<void>>
      mockFetchDomeStatus.mockResolvedValue(undefined) // For error case

      vi.mocked(mockDomeClientInstance.setSlaved).mockReset()
    })

    it('should call client.setSlaved, update device, and emit event on success for true', async () => {
      const slavedState = true
      mockGetDomeClient.mockReturnValue(mockDomeClientInstance as unknown as DomeClient)
      vi.mocked(mockDomeClientInstance.setSlaved).mockResolvedValue(undefined)

      await store.setDomeSlavedState(deviceId, slavedState)

      expect(mockGetDomeClient).toHaveBeenCalledWith(deviceId)
      expect(mockDomeClientInstance.setSlaved).toHaveBeenCalledWith(slavedState)
      expect(mockUpdateDevice).toHaveBeenCalledWith(deviceId, { dome_slaved: slavedState })
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceMethodCalled',
          deviceId,
          method: 'setSlaved',
          args: [slavedState],
          result: 'success'
        } as DeviceEvent)
      )
      expect(mockFetchDomeStatus).not.toHaveBeenCalled() // Should not be called on success
    })

    it('should call client.setSlaved, update device, and emit event on success for false', async () => {
      const slavedState = false
      mockGetDomeClient.mockReturnValue(mockDomeClientInstance as unknown as DomeClient)
      vi.mocked(mockDomeClientInstance.setSlaved).mockResolvedValue(undefined)

      await store.setDomeSlavedState(deviceId, slavedState)

      expect(mockDomeClientInstance.setSlaved).toHaveBeenCalledWith(slavedState)
      expect(mockUpdateDevice).toHaveBeenCalledWith(deviceId, { dome_slaved: slavedState })
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceMethodCalled',
          deviceId,
          method: 'setSlaved',
          args: [slavedState],
          result: 'success'
        } as DeviceEvent)
      )
      expect(mockFetchDomeStatus).not.toHaveBeenCalled()
    })

    it('should emit error and fetch status if client.setSlaved fails', async () => {
      const slavedState = true
      const errorMessage = 'Set slaved failed'
      mockGetDomeClient.mockReturnValue(mockDomeClientInstance as unknown as DomeClient)
      vi.mocked(mockDomeClientInstance.setSlaved).mockRejectedValue(new Error(errorMessage))

      await store.setDomeSlavedState(deviceId, slavedState)

      expect(mockDomeClientInstance.setSlaved).toHaveBeenCalledWith(slavedState)
      expect(mockUpdateDevice).not.toHaveBeenCalled()
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceApiError',
          deviceId,
          error: `Failed to set slaved state: Error: ${errorMessage}`
        } as DeviceEvent)
      )
      expect(mockFetchDomeStatus).toHaveBeenCalledWith(deviceId) // Called on error
    })

    it('should not call client, update, or emit if _getDomeClient returns null', async () => {
      const slavedState = true
      mockGetDomeClient.mockReturnValue(null)

      await store.setDomeSlavedState(deviceId, slavedState)

      expect(mockDomeClientInstance.setSlaved).not.toHaveBeenCalled()
      expect(mockUpdateDevice).not.toHaveBeenCalled()
      expect(mockEmitEvent).not.toHaveBeenCalled()
      expect(mockFetchDomeStatus).not.toHaveBeenCalled()
    })
  })

  describe('_pollDomeStatus', () => {
    const deviceId = 'dome-poll-test'
    let mockFetchDomeStatus: MockInstance<(deviceId: string) => Promise<void>>
    let mockStopDomePolling: MockInstance<(deviceId: string) => void>

    beforeEach(() => {
      mockFetchDomeStatus = vi.spyOn(store, 'fetchDomeStatus') as MockInstance<(deviceId: string) => Promise<void>>
      mockFetchDomeStatus.mockResolvedValue(undefined)
      mockStopDomePolling = vi.spyOn(store, 'stopDomePolling') as MockInstance<(deviceId: string) => void>

      store._dome_isPolling.set(deviceId, true)
      const mockDevice = createMockDevice({ id: deviceId, deviceType: 'dome', isConnected: true, apiBaseUrl: 'http://localhost:11111' })
      mockGetDeviceById.mockReturnValue(mockDevice as Device)
    })

    afterEach(() => {
      store._dome_isPolling.delete(deviceId)
    })

    it('should call fetchDomeStatus if polling is active and device is connected', async () => {
      await store._pollDomeStatus(deviceId)
      expect(mockFetchDomeStatus).toHaveBeenCalledWith(deviceId)
      expect(mockStopDomePolling).not.toHaveBeenCalled()
    })

    it('should not call fetchDomeStatus if polling is not active for the device', async () => {
      store._dome_isPolling.set(deviceId, false)
      await store._pollDomeStatus(deviceId)
      expect(mockFetchDomeStatus).not.toHaveBeenCalled()
      expect(mockStopDomePolling).not.toHaveBeenCalled()
    })

    it('should call stopDomePolling and not fetchDomeStatus if device is not found', async () => {
      mockGetDeviceById.mockReturnValue(null)
      await store._pollDomeStatus(deviceId)
      expect(mockFetchDomeStatus).not.toHaveBeenCalled()
      expect(mockStopDomePolling).toHaveBeenCalledWith(deviceId)
    })

    it('should call stopDomePolling and not fetchDomeStatus if device is not connected', async () => {
      const mockDevice = createMockDevice({ id: deviceId, deviceType: 'dome', isConnected: false, apiBaseUrl: 'http://localhost:11111' })
      mockGetDeviceById.mockReturnValue(mockDevice as Device)
      await store._pollDomeStatus(deviceId)
      expect(mockFetchDomeStatus).not.toHaveBeenCalled()
      expect(mockStopDomePolling).toHaveBeenCalledWith(deviceId)
    })
  })

  describe('startDomePolling', () => {
    const deviceId = 'dome-start-poll'
    let mockPollDomeStatus: MockInstance<(deviceId: string) => Promise<void>>

    beforeEach(() => {
      vi.useFakeTimers()
      mockPollDomeStatus = vi.spyOn(store, '_pollDomeStatus') as MockInstance<(deviceId: string) => Promise<void>>
      mockPollDomeStatus.mockResolvedValue(undefined)
      store._dome_isPolling.set(deviceId, false)
      store._dome_pollingTimers.delete(deviceId)
      // Ensure getDeviceById returns a valid, connected dome device for these tests
      const mockDevice = createMockDevice({
        id: deviceId,
        deviceType: 'dome',
        isConnected: true,
        apiBaseUrl: 'http://localhost:12345' // Or any valid URL
      })
      // mockGetDeviceById is from the parent describe block
      mockGetDeviceById.mockReturnValue(mockDevice as Device)
    })

    afterEach(() => {
      vi.clearAllTimers()
      vi.useRealTimers()
      store._dome_isPolling.delete(deviceId)
      store._dome_pollingTimers.delete(deviceId)
      store._propertyPollingIntervals.set('domeStatus', 5000)
    })

    it('should start polling, set state, and call _pollDomeStatus immediately', () => {
      store.startDomePolling(deviceId)

      expect(store._dome_isPolling.get(deviceId)).toBe(true)
      expect(store._dome_pollingTimers.has(deviceId)).toBe(true)
      expect(mockPollDomeStatus).toHaveBeenCalledWith(deviceId)
      expect(mockPollDomeStatus).toHaveBeenCalledTimes(1)
    })

    it('should call _pollDomeStatus repeatedly at the default interval', () => {
      store.startDomePolling(deviceId)
      expect(mockPollDomeStatus).toHaveBeenCalledTimes(1)

      const interval = store._propertyPollingIntervals.get('domeStatus') || 5000
      vi.advanceTimersByTime(interval)
      expect(mockPollDomeStatus).toHaveBeenCalledTimes(2)

      vi.advanceTimersByTime(interval)
      expect(mockPollDomeStatus).toHaveBeenCalledTimes(3)
    })

    it('should clear existing timer if polling is restarted for the same device', () => {
      store.startDomePolling(deviceId)
      const firstTimerId = store._dome_pollingTimers.get(deviceId)
      expect(firstTimerId).toBeDefined()
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      store.startDomePolling(deviceId)
      const secondTimerId = store._dome_pollingTimers.get(deviceId)

      expect(clearIntervalSpy).toHaveBeenCalledWith(firstTimerId)
      expect(secondTimerId).toBeDefined()
      expect(secondTimerId).not.toBe(firstTimerId)
      expect(store._dome_isPolling.get(deviceId)).toBe(true)
    })

    it('should not start polling if deviceId is invalid (e.g., empty string)', () => {
      store.startDomePolling('')
      expect(store._dome_isPolling.get('')).toBeUndefined()
      expect(store._dome_pollingTimers.has('')).toBe(false)
      expect(mockPollDomeStatus).not.toHaveBeenCalled()
    })

    it('should use custom polling interval if provided and set in store', () => {
      const customInterval = 1000
      store._propertyPollingIntervals.set('domeStatus', customInterval)
      store.startDomePolling(deviceId)
      expect(mockPollDomeStatus).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(customInterval)
      expect(mockPollDomeStatus).toHaveBeenCalledTimes(2)
    })
  })

  describe('stopDomePolling', () => {
    const deviceId = 'dome-stop-poll'

    beforeEach(() => {
      vi.useFakeTimers()
      store._dome_isPolling.set(deviceId, true)
      const timerId = global.setInterval(() => {}, 1000) as unknown as number
      store._dome_pollingTimers.set(deviceId, timerId)
    })

    afterEach(() => {
      vi.clearAllTimers()
      vi.useRealTimers()
      store._dome_isPolling.delete(deviceId)
      store._dome_pollingTimers.delete(deviceId)
    })

    it('should stop polling, clear state, and clear the timer', () => {
      const timerId = store._dome_pollingTimers.get(deviceId)
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      store.stopDomePolling(deviceId)

      expect(store._dome_isPolling.get(deviceId)).toBe(false)
      expect(store._dome_pollingTimers.has(deviceId)).toBe(false)
      expect(clearIntervalSpy).toHaveBeenCalledWith(timerId)
    })

    it('should do nothing if polling is not active for the device', () => {
      store._dome_isPolling.set(deviceId, false)
      const originalTimerId = store._dome_pollingTimers.get(deviceId)
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      store.stopDomePolling(deviceId)

      expect(store._dome_isPolling.get(deviceId)).toBe(false)
      if (originalTimerId) {
        expect(clearIntervalSpy).toHaveBeenCalledWith(originalTimerId)
        expect(store._dome_pollingTimers.has(deviceId)).toBe(false)
      } else {
        expect(clearIntervalSpy).not.toHaveBeenCalled()
      }
    })

    it('should handle non-existent deviceId gracefully', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
      store.stopDomePolling('nonexistent-device')
      expect(clearIntervalSpy).not.toHaveBeenCalled()
      expect(store._dome_isPolling.get('nonexistent-device')).toBe(false)
    })
  })

  describe('handleDomeConnected', () => {
    const deviceId = 'dome-connect-handler'
    let mockFetchDomeStatus: MockInstance<(deviceId: string) => Promise<void>>
    let mockStartDomePolling: MockInstance<(deviceId: string) => void>

    beforeEach(() => {
      mockFetchDomeStatus = vi.spyOn(store, 'fetchDomeStatus').mockResolvedValue(undefined)
      mockStartDomePolling = vi.spyOn(store, 'startDomePolling').mockReturnValue(undefined) // Assuming it returns void
    })

    it('should call fetchDomeStatus and startDomePolling for the device', () => {
      store.handleDomeConnected(deviceId)

      expect(mockFetchDomeStatus).toHaveBeenCalledWith(deviceId)
      expect(mockStartDomePolling).toHaveBeenCalledWith(deviceId)
    })

    it('should not throw if deviceId is invalid (e.g., empty string)', () => {
      // Depending on implementation, it might log an error or do nothing.
      // The key is that it doesn't crash the store.
      expect(() => store.handleDomeConnected('')).not.toThrow()
      // Optionally check that spies were not called with empty string if that's the expected behavior
      expect(mockFetchDomeStatus).not.toHaveBeenCalledWith('')
      expect(mockStartDomePolling).not.toHaveBeenCalledWith('')
    })
  })

  describe('handleDomeDisconnected', () => {
    const deviceId = 'dome-disconnect-handler'
    let mockStopDomePolling: MockInstance<(deviceId: string) => void>
    let mockUpdateDevice: MockInstance<UnifiedStoreType['updateDevice']>

    beforeEach(() => {
      mockStopDomePolling = vi.spyOn(store, 'stopDomePolling').mockReturnValue(undefined)
      mockUpdateDevice = vi.spyOn(store, 'updateDevice').mockReturnValue(true) // Assuming it returns boolean
    })

    it('should call stopDomePolling and updateDevice with cleared properties', () => {
      // Ensure the device exists for updateDevice to be meaningful, though not strictly necessary for this handler test
      const mockDevice = createMockDevice({ id: deviceId, deviceType: 'dome', apiBaseUrl: 'http://localhost:11111' })
      mockGetDeviceById.mockReturnValue(mockDevice as Device)

      store.handleDomeDisconnected(deviceId)

      expect(mockStopDomePolling).toHaveBeenCalledWith(deviceId)
      const expectedClearedProperties: DomeDeviceProperties = {
        dome_altitude: null,
        dome_azimuth: null,
        dome_atHome: null,
        dome_atPark: null,
        dome_shutterStatus: null,
        dome_slewing: null,
        dome_slaved: null
      }
      expect(mockUpdateDevice).toHaveBeenCalledWith(deviceId, expectedClearedProperties)
    })

    it('should not throw if deviceId is invalid (e.g., empty string)', () => {
      expect(() => store.handleDomeDisconnected('')).not.toThrow()
      expect(mockStopDomePolling).not.toHaveBeenCalledWith('')
      expect(mockUpdateDevice).not.toHaveBeenCalledWith('', expect.anything())
    })
  })
}) // End of main describe('domeActions')
