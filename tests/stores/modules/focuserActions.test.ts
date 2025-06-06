import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import type { UnifiedStoreType } from '@/stores/UnifiedStore'
import type { Device } from '@/stores/types/device-store.types'
import type { DeviceEvent } from '@/stores/types/device-store.types'
import { FocuserClient } from '@/api/alpaca/focuser-client'
import type { StoreOptions } from '@/stores/types/device-store.types'
// import log from '@/plugins/logger'

// Base properties for all Alpaca clients
const mockAlpacaClientBaseProperties = {
  baseUrl: '',
  deviceType: 'focuser' as string,
  deviceNumber: 0,
  device: {} as Device,
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
}

// Focuser-specific methods
const mockFocuserClientSpecificMethods = {
  getAbsolute: vi.fn(),
  isTempCompAvailable: vi.fn(),
  isMoving: vi.fn(),
  getMaxIncrement: vi.fn(),
  getMaxStep: vi.fn(),
  getPosition: vi.fn(),
  getStepSize: vi.fn(),
  getTempComp: vi.fn(),
  getTemperature: vi.fn(),
  halt: vi.fn(),
  move: vi.fn(),
  setTempComp: vi.fn(),
  setSpeed: vi.fn()
}

// This will be the shared mock instance returned by the FocuserClient constructor mock
const mockFocuserClientInstance = {
  ...mockAlpacaClientBaseProperties,
  ...publicAlpacaBaseMethods,
  ...mockFocuserClientSpecificMethods,
  // Ensure methods that are frequently re-mocked per test are here as vi.fn()
  getProperty: vi.fn(),
  setProperty: vi.fn(),
  callMethod: vi.fn(),
  getDeviceState: vi.fn()
} as unknown as FocuserClient

vi.mock('@/api/alpaca/focuser-client', () => {
  const MockConstructor = vi.fn((_baseUrl, _deviceNum, _device) => {
    // Always return the same shared mock instance
    return mockFocuserClientInstance
  })
  return { FocuserClient: MockConstructor }
})

const createMockDevice = (overrides: Partial<Device> & { deviceType: string; id: string }): Device => {
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
    ...overrides
  } as Device
}

const mockEmitEvent = vi.fn()

describe('focuserActions', () => {
  let store: UnifiedStoreType
  let mockGetDeviceById: MockInstance<(deviceId: string) => Device | null>
  let mockUpdateDeviceProperties: MockInstance<(deviceId: string, updates: Partial<Device>, options?: StoreOptions) => boolean>
  let mockUpdateDevice: MockInstance<(deviceId: string, updates: Partial<Device>, options?: StoreOptions) => boolean>
  let mockCallDeviceMethod: MockInstance<(deviceId: string, method: string, args?: unknown[] | undefined) => Promise<unknown>>
  let emitEventSpy: MockInstance<(event: DeviceEvent) => void>
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let mockGetFocuserClient: MockInstance<UnifiedStoreType['getDeviceClient']>

  const FOCUSER_DEVICE_ID = 'focuser-1'
  const mockFocuserDevice = createMockDevice({
    id: FOCUSER_DEVICE_ID,
    deviceType: 'focuser',
    apiBaseUrl: 'http://localhost:11111/api/v1/focuser/0',
    deviceNum: 0,
    name: 'Test Device',
    driverInfo: 'Test Driver',
    driverVersion: '1.0',
    uniqueId: 'focuser-1-unique',
    supportedActions: [],
    isConnected: false,
    status: 'idle'
  })

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useUnifiedStore()

    // Reset mocks
    vi.clearAllMocks()
    mockEmitEvent.mockClear()

    // Spy on internal _emitEvent
    emitEventSpy = vi.spyOn(store as unknown as { _emitEvent: (event: DeviceEvent) => void }, '_emitEvent').mockImplementation(mockEmitEvent)

    // Spy on relevant core actions
    store.addDevice(mockFocuserDevice)
    mockGetDeviceById = vi.spyOn(store, 'getDeviceById') as MockInstance<(deviceId: string) => Device | null>
    mockUpdateDeviceProperties = vi.spyOn(store, 'updateDeviceProperties') as MockInstance<
      (deviceId: string, updates: Partial<Device>, options?: StoreOptions) => boolean
    >
    mockUpdateDevice = vi.spyOn(store, 'updateDevice') as MockInstance<
      (deviceId: string, updates: Partial<Device>, options?: StoreOptions) => boolean
    >
    mockCallDeviceMethod = vi.spyOn(store, 'callDeviceMethod') as MockInstance<
      (deviceId: string, method: string, args?: unknown[] | undefined) => Promise<unknown>
    >

    // Setup default mock implementations
    mockGetDeviceById.mockImplementation((deviceId) => {
      if (deviceId === FOCUSER_DEVICE_ID) {
        return JSON.parse(JSON.stringify(mockFocuserDevice)) // Return a copy
      }
      return null
    })

    // Setup getDeviceClient mock to return null when device is not found
    mockGetFocuserClient = vi.spyOn(store, 'getDeviceClient').mockImplementation((deviceId) => {
      const device = store.getDeviceById(deviceId)
      if (!device || !device.isConnected) {
        return null
      }
      return mockFocuserClientInstance as unknown as FocuserClient
    })

    mockUpdateDeviceProperties.mockReturnValue(true)
    mockUpdateDevice.mockReturnValue(true)
    mockCallDeviceMethod.mockResolvedValue({ data: 'mocked method call' })

    // Reset focuser specific state in store
    store.isDevicePolling = store.isDevicePolling || new Map()
    store.propertyPollingIntervals = store.propertyPollingIntervals || new Map()
    store.isDevicePolling.clear()
    store.propertyPollingIntervals.forEach(clearTimeout)
    store.propertyPollingIntervals.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchFocuserDetails', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      mockGetDeviceById.mockReturnValue({ ...mockFocuserDevice, isConnected: true })
      vi.mocked(mockFocuserClientInstance.getMaxStep).mockResolvedValue(10000)
      vi.mocked(mockFocuserClientInstance.getMaxIncrement).mockResolvedValue(5000)
      vi.mocked(mockFocuserClientInstance.getStepSize).mockResolvedValue(100)
    })

    it('should fetch focuser details and update properties', async () => {
      await store.fetchFocuserDetails(FOCUSER_DEVICE_ID)

      expect(mockFocuserClientInstance.getMaxStep).toHaveBeenCalledTimes(1)
      expect(mockFocuserClientInstance.getMaxIncrement).toHaveBeenCalledTimes(1)
      expect(mockFocuserClientInstance.getStepSize).toHaveBeenCalledTimes(1)

      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(FOCUSER_DEVICE_ID, {
        focuser_maxStep: 10000,
        focuser_maxIncrement: 5000,
        focuser_stepSize: 100
      })
    })

    it('should not call client methods or update properties if client is not obtained', async () => {
      mockGetDeviceById.mockReturnValue(null)
      await store.fetchFocuserDetails(FOCUSER_DEVICE_ID)

      expect(mockFocuserClientInstance.getMaxStep).not.toHaveBeenCalled()
      expect(mockFocuserClientInstance.getMaxIncrement).not.toHaveBeenCalled()
      expect(mockFocuserClientInstance.getStepSize).not.toHaveBeenCalled()
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled()
      expect(emitEventSpy).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError if fetching details fails', async () => {
      vi.mocked(mockFocuserClientInstance.getMaxStep).mockRejectedValue(new Error('Failed to get max step'))
      await store.fetchFocuserDetails(FOCUSER_DEVICE_ID)

      expect(emitEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceApiError',
          action: 'fetchFocuserDetails',
          deviceId: FOCUSER_DEVICE_ID,
          error: expect.stringContaining('Failed to get max step')
        })
      )
    })
  })

  describe('fetchFocuserStatus', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      mockGetDeviceById.mockReturnValue({ ...mockFocuserDevice, isConnected: true })
      vi.mocked(mockFocuserClientInstance.getPosition).mockResolvedValue(1234)
      vi.mocked(mockFocuserClientInstance.isMoving).mockResolvedValue(false)
      vi.mocked(mockFocuserClientInstance.getTemperature).mockResolvedValue(10.0)
      vi.mocked(mockFocuserClientInstance.getTempComp).mockResolvedValue(false)
    })

    it('should fetch focuser status and update properties', async () => {
      await store.fetchFocuserStatus(FOCUSER_DEVICE_ID)

      expect(mockFocuserClientInstance.getPosition).toHaveBeenCalledTimes(1)
      expect(mockFocuserClientInstance.isMoving).toHaveBeenCalledTimes(1)
      expect(mockFocuserClientInstance.getTemperature).toHaveBeenCalledTimes(1)
      expect(mockFocuserClientInstance.getTempComp).toHaveBeenCalledTimes(1)

      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(FOCUSER_DEVICE_ID, {
        focuser_position: 1234,
        focuser_isMoving: false,
        focuser_temperature: 10.0,
        focuser_tempComp: false
      })
    })

    it('should not call client methods or update properties if client is not obtained', async () => {
      mockGetDeviceById.mockReturnValue(null)
      await store.fetchFocuserStatus(FOCUSER_DEVICE_ID)

      expect(mockFocuserClientInstance.getPosition).not.toHaveBeenCalled()
      expect(mockFocuserClientInstance.isMoving).not.toHaveBeenCalled()
      expect(mockFocuserClientInstance.getTemperature).not.toHaveBeenCalled()
      expect(mockFocuserClientInstance.getTempComp).not.toHaveBeenCalled()
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled()
      expect(emitEventSpy).not.toHaveBeenCalled()
    })

    it('should not emit deviceApiError if fetching status fails (only logs error)', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(mockFocuserClientInstance.getPosition).mockRejectedValue(new Error('Failed to get position'))
      await store.fetchFocuserStatus(FOCUSER_DEVICE_ID)

      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled()
      expect(emitEventSpy).not.toHaveBeenCalled() // No deviceApiError event expected for status polling failures
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        expect.objectContaining({ deviceIds: [FOCUSER_DEVICE_ID] }),
        expect.stringContaining('[FocuserStore] Error fetching status for'),
        expect.any(Error)
      )
    })
  })

  describe('moveFocuser', () => {
    const TARGET_POSITION = 7500

    beforeEach(() => {
      mockGetDeviceById.mockReturnValue({ ...mockFocuserDevice, isConnected: true })
      // Ensure fetchFocuserStatus mocks are set up as it's called after move
      vi.mocked(mockFocuserClientInstance.getPosition).mockResolvedValue(TARGET_POSITION) // Assume move is instant for status check
      vi.mocked(mockFocuserClientInstance.isMoving).mockResolvedValue(false) // Assume move completes
      vi.mocked(mockFocuserClientInstance.getTemperature).mockResolvedValue(10.0) // Default status values
      vi.mocked(mockFocuserClientInstance.getTempComp).mockResolvedValue(false)
    })

    it('should call client.move with target position and refresh status on success', async () => {
      vi.mocked(mockFocuserClientInstance.move).mockResolvedValue(undefined) // Mock successful move

      await store.moveFocuser(FOCUSER_DEVICE_ID, TARGET_POSITION)

      expect(mockFocuserClientInstance.move).toHaveBeenCalledTimes(1)
      expect(mockFocuserClientInstance.move).toHaveBeenCalledWith(TARGET_POSITION)

      expect(emitEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceMethodCalled',
          deviceId: FOCUSER_DEVICE_ID,
          method: 'moveFocuser',
          args: [TARGET_POSITION],
          result: 'success'
        })
      )

      // Verify fetchFocuserStatus was called (by checking one of its client calls)
      expect(mockFocuserClientInstance.getPosition).toHaveBeenCalledTimes(1)
    })

    it('should not call client.move if client is not obtained', async () => {
      mockGetDeviceById.mockReturnValue(null)
      await store.moveFocuser(FOCUSER_DEVICE_ID, TARGET_POSITION)
      expect(mockFocuserClientInstance.move).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError and refresh status if client.move fails', async () => {
      const error = new Error('Move failed')
      vi.mocked(mockFocuserClientInstance.move).mockRejectedValue(error)
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}) // Suppress console output

      await store.moveFocuser(FOCUSER_DEVICE_ID, TARGET_POSITION)

      expect(mockFocuserClientInstance.move).toHaveBeenCalledTimes(1)
      expect(mockFocuserClientInstance.move).toHaveBeenCalledWith(TARGET_POSITION)

      expect(emitEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceApiError',
          deviceId: FOCUSER_DEVICE_ID,
          action: 'moveFocuser',
          error: `Failed to move focuser: ${error}`,
          params: { targetPosition: TARGET_POSITION }
        })
      )

      // Verify fetchFocuserStatus was still called even on error
      expect(mockFocuserClientInstance.getPosition).toHaveBeenCalledTimes(1)
      consoleErrorSpy.mockRestore()
    })
  })

  describe('haltFocuser', () => {
    beforeEach(() => {
      mockGetDeviceById.mockReturnValue({ ...mockFocuserDevice, isConnected: true })
      // Ensure fetchFocuserStatus mocks are set up as it's called after halt
      vi.mocked(mockFocuserClientInstance.getPosition).mockResolvedValue(1234) // Some position
      vi.mocked(mockFocuserClientInstance.isMoving).mockResolvedValue(false) // Assume halt completes and it's not moving
      vi.mocked(mockFocuserClientInstance.getTemperature).mockResolvedValue(10.0)
      vi.mocked(mockFocuserClientInstance.getTempComp).mockResolvedValue(false)
    })

    it('should call client.halt and refresh status on success', async () => {
      vi.mocked(mockFocuserClientInstance.halt).mockResolvedValue(undefined) // Mock successful halt

      await store.haltFocuser(FOCUSER_DEVICE_ID)

      expect(mockFocuserClientInstance.halt).toHaveBeenCalledTimes(1)

      expect(emitEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceMethodCalled',
          deviceId: FOCUSER_DEVICE_ID,
          method: 'haltFocuser',
          args: [],
          result: 'success'
        })
      )

      // Verify fetchFocuserStatus was called
      expect(mockFocuserClientInstance.getPosition).toHaveBeenCalledTimes(1)
    })

    it('should not call client.halt if client is not obtained', async () => {
      mockGetDeviceById.mockReturnValue(null)
      await store.haltFocuser(FOCUSER_DEVICE_ID)
      expect(mockFocuserClientInstance.halt).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError and refresh status if client.halt fails', async () => {
      const error = new Error('Halt failed')
      vi.mocked(mockFocuserClientInstance.halt).mockRejectedValue(error)
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}) // Suppress console output

      await store.haltFocuser(FOCUSER_DEVICE_ID)

      expect(mockFocuserClientInstance.halt).toHaveBeenCalledTimes(1)

      expect(emitEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceApiError',
          deviceId: FOCUSER_DEVICE_ID,
          action: 'haltFocuser',
          error: `Failed to halt focuser: ${error}`
        })
      )

      // Verify fetchFocuserStatus was still called even on error
      expect(mockFocuserClientInstance.getPosition).toHaveBeenCalledTimes(1)
      consoleErrorSpy.mockRestore()
    })
  })

  describe('setFocuserTempComp', () => {
    const ENABLE_TEMP_COMP = true

    beforeEach(() => {
      vi.clearAllMocks()
      mockGetDeviceById.mockReturnValue({ ...mockFocuserDevice, isConnected: true })
      vi.mocked(mockFocuserClientInstance.setTempComp).mockResolvedValue(undefined)
      vi.mocked(mockFocuserClientInstance.getPosition).mockResolvedValue(1234)
      vi.mocked(mockFocuserClientInstance.isMoving).mockResolvedValue(false)
      vi.mocked(mockFocuserClientInstance.getTemperature).mockResolvedValue(10.0)
      vi.mocked(mockFocuserClientInstance.getTempComp).mockResolvedValue(true) // ENABLE_TEMP_COMP
    })

    it('should call client.setTempComp and refresh status on success', async () => {
      await store.setFocuserTempComp(FOCUSER_DEVICE_ID, ENABLE_TEMP_COMP)

      expect(mockFocuserClientInstance.setTempComp).toHaveBeenCalledWith(ENABLE_TEMP_COMP)
      expect(mockFocuserClientInstance.getPosition).toHaveBeenCalledTimes(1)
      expect(mockFocuserClientInstance.isMoving).toHaveBeenCalledTimes(1)
      expect(mockFocuserClientInstance.getTemperature).toHaveBeenCalledTimes(1)
      expect(mockFocuserClientInstance.getTempComp).toHaveBeenCalledTimes(1)

      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(FOCUSER_DEVICE_ID, {
        focuser_position: 1234,
        focuser_isMoving: false,
        focuser_temperature: 10.0,
        focuser_tempComp: ENABLE_TEMP_COMP
      })
    })

    it('should not call client.setTempComp if client is not obtained', async () => {
      mockGetDeviceById.mockReturnValue(null)
      await store.setFocuserTempComp(FOCUSER_DEVICE_ID, ENABLE_TEMP_COMP)

      expect(mockFocuserClientInstance.setTempComp).not.toHaveBeenCalled()
      expect(mockUpdateDeviceProperties).not.toHaveBeenCalled()
      expect(emitEventSpy).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError and refresh status if client.setTempComp fails', async () => {
      const error = new Error('SetTempComp failed')
      vi.mocked(mockFocuserClientInstance.setTempComp).mockRejectedValue(error)

      await store.setFocuserTempComp(FOCUSER_DEVICE_ID, ENABLE_TEMP_COMP)

      expect(mockFocuserClientInstance.setTempComp).toHaveBeenCalledWith(ENABLE_TEMP_COMP)
      expect(emitEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deviceApiError',
          action: 'setFocuserTempComp',
          deviceId: FOCUSER_DEVICE_ID,
          error: expect.stringContaining('Failed to set TempComp'),
          params: { enable: ENABLE_TEMP_COMP }
        })
      )
      // Verify status is still refreshed even after error
      expect(mockFocuserClientInstance.getPosition).toHaveBeenCalled()
      expect(mockFocuserClientInstance.isMoving).toHaveBeenCalled()
      expect(mockFocuserClientInstance.getTemperature).toHaveBeenCalled()
      expect(mockFocuserClientInstance.getTempComp).toHaveBeenCalled()
    })
  })

  describe('Polling Actions', () => {
    const POLL_INTERVAL = 1000

    beforeEach(() => {
      vi.clearAllMocks()
      mockGetDeviceById.mockReturnValue({
        ...mockFocuserDevice,
        isConnected: true,
        properties: {
          ...mockFocuserDevice.properties,
          propertyPollIntervalMs: POLL_INTERVAL
        }
      })
      vi.mocked(mockFocuserClientInstance.getPosition).mockResolvedValue(1234)
      vi.mocked(mockFocuserClientInstance.isMoving).mockResolvedValue(false)
      vi.mocked(mockFocuserClientInstance.getTemperature).mockResolvedValue(10.0)
      vi.mocked(mockFocuserClientInstance.getTempComp).mockResolvedValue(false)
    })

    it('should start polling when startFocuserPolling is called', () => {
      // Mock the store's polling state
      store.isDevicePolling.set(FOCUSER_DEVICE_ID, false)
      store.propertyPollingIntervals.delete(FOCUSER_DEVICE_ID)

      store.startFocuserPolling(FOCUSER_DEVICE_ID)

      expect(store.isDevicePolling.get(FOCUSER_DEVICE_ID)).toBe(true)
      expect(store.propertyPollingIntervals.get(FOCUSER_DEVICE_ID)).toBeDefined()
    })

    it('should call fetchFocuserStatus when _pollFocuserStatus is called', async () => {
      // Mock the store's polling state
      store.isDevicePolling.set(FOCUSER_DEVICE_ID, true)
      store.propertyPollingIntervals.delete(FOCUSER_DEVICE_ID)

      await store._pollFocuserStatus(FOCUSER_DEVICE_ID)

      expect(mockFocuserClientInstance.getPosition).toHaveBeenCalledTimes(1)
      expect(mockFocuserClientInstance.isMoving).toHaveBeenCalledTimes(1)
      expect(mockFocuserClientInstance.getTemperature).toHaveBeenCalledTimes(1)
      expect(mockFocuserClientInstance.getTempComp).toHaveBeenCalledTimes(1)
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(
        FOCUSER_DEVICE_ID,
        expect.objectContaining({
          focuser_position: 1234,
          focuser_isMoving: false,
          focuser_temperature: 10.0,
          focuser_tempComp: false
        })
      )
    })

    it('should stop existing polling before starting new polling', () => {
      // Mock the store's polling state
      store.isDevicePolling.set(FOCUSER_DEVICE_ID, false)
      store.propertyPollingIntervals.delete(FOCUSER_DEVICE_ID)

      store.startFocuserPolling(FOCUSER_DEVICE_ID)
      const firstIntervalId = store.propertyPollingIntervals.get(FOCUSER_DEVICE_ID)

      store.startFocuserPolling(FOCUSER_DEVICE_ID)
      const secondIntervalId = store.propertyPollingIntervals.get(FOCUSER_DEVICE_ID)

      expect(firstIntervalId).toBeDefined()
      expect(secondIntervalId).toBeDefined()
      expect(firstIntervalId).not.toBe(secondIntervalId)
    })
  })

  describe('Connection Handlers', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      mockGetDeviceById.mockReturnValue({
        ...mockFocuserDevice,
        isConnected: true
      })
      vi.mocked(mockFocuserClientInstance.getMaxStep).mockResolvedValue(10000)
      vi.mocked(mockFocuserClientInstance.getMaxIncrement).mockResolvedValue(5000)
      vi.mocked(mockFocuserClientInstance.getStepSize).mockResolvedValue(100)
      vi.mocked(mockFocuserClientInstance.getPosition).mockResolvedValue(1234)
      vi.mocked(mockFocuserClientInstance.isMoving).mockResolvedValue(false)
      vi.mocked(mockFocuserClientInstance.getTemperature).mockResolvedValue(10.0)
      vi.mocked(mockFocuserClientInstance.getTempComp).mockResolvedValue(false)

      // Mock the store's polling state
      store.isDevicePolling.set(FOCUSER_DEVICE_ID, false)
      store.propertyPollingIntervals.delete(FOCUSER_DEVICE_ID)
    })

    it('should fetch details and start polling when handleFocuserConnected is called', async () => {
      await store.handleFocuserConnected(FOCUSER_DEVICE_ID)

      // Verify fetchFocuserDetails was called
      expect(mockFocuserClientInstance.getMaxStep).toHaveBeenCalledTimes(1)
      expect(mockFocuserClientInstance.getMaxIncrement).toHaveBeenCalledTimes(1)
      expect(mockFocuserClientInstance.getStepSize).toHaveBeenCalledTimes(1)
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(
        FOCUSER_DEVICE_ID,
        expect.objectContaining({
          focuser_maxStep: 10000,
          focuser_maxIncrement: 5000,
          focuser_stepSize: 100
        })
      )

      // Verify polling was started
      expect(store.isDevicePolling.get(FOCUSER_DEVICE_ID)).toBe(true)
      expect(store.propertyPollingIntervals.get(FOCUSER_DEVICE_ID)).toBeDefined()
    })

    it('should stop polling and clear properties when handleFocuserDisconnected is called', () => {
      // Start polling first
      store.startFocuserPolling(FOCUSER_DEVICE_ID)
      // const intervalId = store.propertyPollingIntervals.get(FOCUSER_DEVICE_ID)

      store.handleFocuserDisconnected(FOCUSER_DEVICE_ID)

      // Verify polling was stopped
      expect(store.isDevicePolling.get(FOCUSER_DEVICE_ID)).toBe(false)
      expect(store.propertyPollingIntervals.get(FOCUSER_DEVICE_ID)).toBeUndefined()

      // Verify properties were cleared
      expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(FOCUSER_DEVICE_ID, {
        focuser_position: null,
        focuser_isMoving: null,
        focuser_temperature: null,
        focuser_stepSize: null,
        focuser_maxStep: null,
        focuser_maxIncrement: null,
        focuser_tempComp: null
      })
    })

    it('should not start polling if device is not found when handleFocuserConnected is called', () => {
      mockGetDeviceById.mockReturnValue(null)
      store.handleFocuserConnected(FOCUSER_DEVICE_ID)

      expect(store.isDevicePolling.get(FOCUSER_DEVICE_ID)).toBe(false)
      expect(store.propertyPollingIntervals.get(FOCUSER_DEVICE_ID)).toBeUndefined()
    })

    it('should not start polling if device is not a focuser when handleFocuserConnected is called', () => {
      mockGetDeviceById.mockReturnValue({
        ...mockFocuserDevice,
        deviceType: 'camera' // Not a focuser
      })
      store.handleFocuserConnected(FOCUSER_DEVICE_ID)

      expect(store.isDevicePolling.get(FOCUSER_DEVICE_ID)).toBe(false)
      expect(store.propertyPollingIntervals.get(FOCUSER_DEVICE_ID)).toBeUndefined()
    })

    it('should not start polling if device is not connected when handleFocuserConnected is called', () => {
      mockGetDeviceById.mockReturnValue({
        ...mockFocuserDevice,
        isConnected: false
      })
      store.handleFocuserConnected(FOCUSER_DEVICE_ID)

      expect(store.isDevicePolling.get(FOCUSER_DEVICE_ID)).toBe(false)
      expect(store.propertyPollingIntervals.get(FOCUSER_DEVICE_ID)).toBeUndefined()
    })
  })
})
