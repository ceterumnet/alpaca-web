import { describe, it, expect, beforeEach, vi, type MockInstance, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUnifiedStore, type UnifiedStoreType } from '@/stores/UnifiedStore'
import type { SwitchDeviceProperties, Device, UnifiedDevice, DeviceEvent, StoreOptions } from '@/stores/types/device-store.types'
import { SwitchClient, type ISwitchDetail } from '@/api/alpaca/switch-client'
import { isSwitch, type SwitchDevice as CoreSwitchDevice } from '@/types/device.types'

// Define a type for the mocked SwitchClient methods
type MockedSwitchClientMethods = {
  getProperty: MockInstance<(...args: unknown[]) => Promise<unknown>>
  setProperty: MockInstance<(...args: unknown[]) => Promise<void>>
  callMethod: MockInstance<(...args: unknown[]) => Promise<unknown>>
  getDeviceState: MockInstance<(...args: unknown[]) => Promise<Record<string, unknown>>>
  connected: MockInstance<(...args: unknown[]) => Promise<boolean>>
  setConnected: MockInstance<(...args: unknown[]) => Promise<void>>
  maxSwitch: MockInstance<() => Promise<number>>
  getSwitchName: MockInstance<(...args: unknown[]) => Promise<string | null>>
  getSwitchValue: MockInstance<(...args: unknown[]) => Promise<unknown>>
  getAllSwitchDetails: MockInstance<() => Promise<ISwitchDetail[]>>
  setSwitch: MockInstance<(switchId: number, state: boolean) => Promise<void>>
  setSwitchValue: MockInstance<(switchId: number, value: number) => Promise<void>>
  getSwitchDetails: MockInstance<(switchId: number) => Promise<ISwitchDetail>>
  setSwitchName: MockInstance<(switchId: number, name: string) => Promise<void>>
  setAsyncSwitch: MockInstance<(switchId: number, state: boolean) => Promise<void>>
  setAsyncSwitchValue: MockInstance<(switchId: number, value: number) => Promise<void>>
  isStateChangeComplete: MockInstance<(switchId: number, transactionId: number) => Promise<boolean>>
}

// Mock the SwitchClient constructor
const mockSwitchClientInstance: MockedSwitchClientMethods = {
  getProperty: vi.fn(),
  setProperty: vi.fn(),
  callMethod: vi.fn(),
  getDeviceState: vi.fn().mockResolvedValue({}),
  connected: vi.fn().mockResolvedValue(false),
  setConnected: vi.fn().mockResolvedValue(undefined),
  maxSwitch: vi.fn(),
  getSwitchName: vi.fn(),
  getSwitchValue: vi.fn(),
  getAllSwitchDetails: vi.fn(),
  setSwitch: vi.fn(),
  setSwitchValue: vi.fn(),
  getSwitchDetails: vi.fn(),
  setSwitchName: vi.fn(),
  setAsyncSwitch: vi.fn(),
  setAsyncSwitchValue: vi.fn(),
  isStateChangeComplete: vi.fn()
}

vi.mock('@/api/alpaca/switch-client', () => ({
  SwitchClient: vi.fn(() => mockSwitchClientInstance)
}))

// Mock isSwitch utility
vi.mock('@/types/device.types', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/types/device.types')>()
  return {
    ...actual, // Keep all actual exports
    isSwitch: vi.fn() // Mock only isSwitch
  }
})

describe('switchActions', () => {
  let store: ReturnType<typeof useUnifiedStore>
  let MockedSwitchClientConstructor: MockInstance<(baseUrl: string, deviceNumber: number, device: Device) => SwitchClient>
  let mockedIsSwitch: MockInstance<(device: Device | UnifiedDevice) => boolean>
  let mockUpdateDevice: MockInstance<(deviceId: string, updates: Partial<Device>, options?: StoreOptions) => boolean>
  let mockEmitEvent: MockInstance<(event: DeviceEvent) => void>
  let mockGetSwitchClient: MockInstance<(deviceId: string) => SwitchClient | null>

  // Declare pollStatusSpy here
  let pollStatusSpy: MockInstance<(this: UnifiedStoreType, deviceId: string) => Promise<void>>

  beforeEach(async () => {
    vi.clearAllMocks()

    MockedSwitchClientConstructor = SwitchClient as unknown as MockInstance<(baseUrl: string, deviceNumber: number, device: Device) => SwitchClient>

    const deviceTypesModule = await import('@/types/device.types')
    mockedIsSwitch = deviceTypesModule.isSwitch as unknown as MockInstance<(device: Device | UnifiedDevice) => boolean>
    mockedIsSwitch.mockReturnValue(true)

    setActivePinia(createPinia())
    store = useUnifiedStore()

    mockUpdateDevice = vi.spyOn(store, 'updateDevice')
    mockEmitEvent = vi.spyOn(store, '_emitEvent') as MockInstance<(event: DeviceEvent) => void>
    mockGetSwitchClient = vi.spyOn(store, '_getSwitchClient').mockReturnValue(mockSwitchClientInstance as unknown as SwitchClient)

    let mockedIsSwitchFn: MockInstance<(device: UnifiedDevice) => device is CoreSwitchDevice>
    // pollStatusSpy is NOT assigned here, but in the Polling Actions beforeEach
  })

  it('should be a placeholder test to ensure setup is correct', () => {
    expect(true).toBe(true)
    expect(MockedSwitchClientConstructor).toBeDefined()
    expect(mockedIsSwitch).toBeDefined()
  })

  describe('_getSwitchClient', () => {
    const deviceId = 'switch-device-123'
    const baseDevice: UnifiedDevice = {
      id: deviceId,
      name: 'Test Switch',
      type: 'switch',
      deviceNum: 0,
      isConnected: false,
      isConnecting: false,
      isDisconnecting: false,
      properties: {},
      status: 'idle'
    }

    beforeEach(() => {
      if (mockGetSwitchClient && typeof mockGetSwitchClient.mockRestore === 'function') {
        mockGetSwitchClient.mockRestore()
      }
      MockedSwitchClientConstructor.mockReset()

      mockedIsSwitch.mockReturnValue(true)
    })

    it('should return null if device is not found', () => {
      vi.spyOn(store, 'getDeviceById').mockReturnValue(null)
      const client = store._getSwitchClient('non-existent-device')
      expect(client).toBeNull()
      expect(MockedSwitchClientConstructor).not.toHaveBeenCalled()
    })

    it('should return null if device is found but isSwitch returns false', () => {
      vi.spyOn(store, 'getDeviceById').mockReturnValue({ ...baseDevice, apiBaseUrl: 'http://localhost:11111' } as Device)
      mockedIsSwitch.mockReturnValue(false)
      const client = store._getSwitchClient(deviceId)
      expect(client).toBeNull()
      expect(MockedSwitchClientConstructor).not.toHaveBeenCalled()
    })

    it('should return null if device has no address details', () => {
      vi.spyOn(store, 'getDeviceById').mockReturnValue({ ...baseDevice } as Device)
      const client = store._getSwitchClient(deviceId)
      expect(client).toBeNull()
      expect(MockedSwitchClientConstructor).not.toHaveBeenCalled()
    })

    it('should create SwitchClient with apiBaseUrl if available', () => {
      const deviceWithApiUrl = { ...baseDevice, apiBaseUrl: 'http://localhost:12345/api/v1/switch/0' } as Device
      vi.spyOn(store, 'getDeviceById').mockReturnValue(deviceWithApiUrl)

      const client = store._getSwitchClient(deviceId)
      expect(client).toBe(mockSwitchClientInstance)
      expect(MockedSwitchClientConstructor).toHaveBeenCalledTimes(1)
      expect(MockedSwitchClientConstructor).toHaveBeenCalledWith(
        'http://localhost:12345/api/v1/switch/0',
        deviceWithApiUrl.deviceNum,
        deviceWithApiUrl
      )
    })

    it('should create SwitchClient with http://address:port if available', () => {
      const deviceWithAddrPort = { ...baseDevice, address: '192.168.1.100', port: 8080 } as Device
      vi.spyOn(store, 'getDeviceById').mockReturnValue(deviceWithAddrPort)

      const client = store._getSwitchClient(deviceId)
      expect(client).toBe(mockSwitchClientInstance)
      expect(MockedSwitchClientConstructor).toHaveBeenCalledTimes(1)
      expect(MockedSwitchClientConstructor).toHaveBeenCalledWith('http://192.168.1.100:8080', deviceWithAddrPort.deviceNum, deviceWithAddrPort)
    })

    it('should create SwitchClient with http://ipAddress:port if available', () => {
      const deviceWithIpAddrPort = { ...baseDevice, ipAddress: '10.0.0.5', port: 9000 } as Device
      vi.spyOn(store, 'getDeviceById').mockReturnValue(deviceWithIpAddrPort)

      const client = store._getSwitchClient(deviceId)
      expect(client).toBe(mockSwitchClientInstance)
      expect(MockedSwitchClientConstructor).toHaveBeenCalledTimes(1)
      expect(MockedSwitchClientConstructor).toHaveBeenCalledWith('http://10.0.0.5:9000', deviceWithIpAddrPort.deviceNum, deviceWithIpAddrPort)
    })

    it('should remove trailing slash from baseUrl', () => {
      const deviceWithTrailingSlash = { ...baseDevice, apiBaseUrl: 'http://localhost:7777/' } as Device
      vi.spyOn(store, 'getDeviceById').mockReturnValue(deviceWithTrailingSlash)

      const client = store._getSwitchClient(deviceId)
      expect(client).toBe(mockSwitchClientInstance)
      expect(MockedSwitchClientConstructor).toHaveBeenCalledWith('http://localhost:7777', deviceWithTrailingSlash.deviceNum, deviceWithTrailingSlash)
    })

    it('should use deviceNum if present, otherwise default to 0', () => {
      const deviceWithNum = { ...baseDevice, apiBaseUrl: 'http://localhost:1111', deviceNum: 5 } as Device
      vi.spyOn(store, 'getDeviceById').mockReturnValue(deviceWithNum)
      store._getSwitchClient(deviceId)
      expect(MockedSwitchClientConstructor).toHaveBeenCalledWith(expect.any(String), 5, deviceWithNum)
      MockedSwitchClientConstructor.mockClear()

      const deviceWithoutNum = { ...baseDevice, apiBaseUrl: 'http://localhost:2222' } as UnifiedDevice
      const deviceWithoutNumForTest = { ...deviceWithoutNum, deviceNum: undefined }
      vi.spyOn(store, 'getDeviceById').mockReturnValue(deviceWithoutNumForTest as Device)
      store._getSwitchClient(deviceId)
      expect(MockedSwitchClientConstructor).toHaveBeenCalledWith(expect.any(String), 0, deviceWithoutNumForTest)
    })
  })

  describe('fetchSwitchDetails', () => {
    const deviceId = 'switch-fetch-test'
    const mockMaxSwitchValue = 3
    const mockSwitchDetails: ISwitchDetail[] = [
      { name: 'Switch 0', description: 'First', value: true, canWrite: true, min: 0, max: 0, step: 0 },
      { name: 'Switch 1', description: 'Second', value: false, canWrite: true, min: 0, max: 0, step: 0 },
      { name: 'Switch 2', description: 'Third', value: 10, canWrite: true, min: 0, max: 100, step: 1 }
    ]

    beforeEach(() => {
      vi.mocked(mockSwitchClientInstance.maxSwitch).mockReset()
      vi.mocked(mockSwitchClientInstance.getAllSwitchDetails).mockReset()

      vi.spyOn(store, 'getDeviceById').mockReturnValue({
        id: deviceId,
        name: 'Test Switch for FetchDetails',
        type: 'switch',
        deviceNum: 0,
        isConnected: true,
        isConnecting: false,
        isDisconnecting: false,
        status: 'idle',
        properties: {},
        apiBaseUrl: 'http://mock.fetch.details/api/v1/switch/0'
      } as Device)

      mockedIsSwitch.mockReturnValue(true)
      mockGetSwitchClient.mockReturnValue(mockSwitchClientInstance as unknown as SwitchClient)
    })

    it('should fetch maxSwitch and all switch details, then update device and emit event on success', async () => {
      vi.mocked(mockSwitchClientInstance.maxSwitch).mockResolvedValue(mockMaxSwitchValue)
      vi.mocked(mockSwitchClientInstance.getAllSwitchDetails).mockResolvedValue(mockSwitchDetails)

      await store.fetchSwitchDetails(deviceId)

      expect(mockGetSwitchClient).toHaveBeenCalledWith(deviceId)
      expect(mockSwitchClientInstance.maxSwitch).toHaveBeenCalledTimes(1)
      expect(mockSwitchClientInstance.getAllSwitchDetails).toHaveBeenCalledTimes(1)

      expect(mockUpdateDevice).toHaveBeenCalledWith(deviceId, {
        sw_maxSwitch: mockMaxSwitchValue,
        sw_switches: mockSwitchDetails
      })
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'devicePropertyChanged',
        deviceId,
        property: 'switchDetails',
        value: { maxSwitch: mockMaxSwitchValue, switches: mockSwitchDetails }
      } as DeviceEvent)
    })

    it('should not call client methods or update store if _getSwitchClient returns null', async () => {
      mockGetSwitchClient.mockReturnValue(null)

      await store.fetchSwitchDetails(deviceId)

      expect(mockSwitchClientInstance.maxSwitch).not.toHaveBeenCalled()
      expect(mockSwitchClientInstance.getAllSwitchDetails).not.toHaveBeenCalled()
      expect(mockUpdateDevice).not.toHaveBeenCalled()
      expect(mockEmitEvent).not.toHaveBeenCalled()
    })

    it('should update device with nulls and emit deviceApiError if client.maxSwitch() fails', async () => {
      const error = new Error('Failed to get maxSwitch')
      vi.mocked(mockSwitchClientInstance.maxSwitch).mockRejectedValue(error)

      await store.fetchSwitchDetails(deviceId)

      expect(mockSwitchClientInstance.maxSwitch).toHaveBeenCalledTimes(1)
      expect(mockSwitchClientInstance.getAllSwitchDetails).not.toHaveBeenCalled()

      expect(mockUpdateDevice).toHaveBeenCalledWith(deviceId, {
        sw_maxSwitch: null,
        sw_switches: null
      })
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId,
        error: `Failed to fetch switch details: ${error}`
      } as DeviceEvent)
    })

    it('should update device with nulls and emit deviceApiError if client.getAllSwitchDetails() fails', async () => {
      const error = new Error('Failed to get all switch details')
      vi.mocked(mockSwitchClientInstance.maxSwitch).mockResolvedValue(mockMaxSwitchValue)
      vi.mocked(mockSwitchClientInstance.getAllSwitchDetails).mockRejectedValue(error)

      await store.fetchSwitchDetails(deviceId)

      expect(mockSwitchClientInstance.maxSwitch).toHaveBeenCalledTimes(1)
      expect(mockSwitchClientInstance.getAllSwitchDetails).toHaveBeenCalledTimes(1)

      expect(mockUpdateDevice).toHaveBeenCalledWith(deviceId, {
        sw_maxSwitch: null,
        sw_switches: null
      })
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId,
        error: `Failed to fetch switch details: ${error}`
      } as DeviceEvent)
    })
  })

  describe('setDeviceSwitchValue', () => {
    const deviceId = 'switch-set-value-test'
    const switchId = 1
    const mockInitialSwitches: ISwitchDetail[] = [
      { name: 'Switch 0', description: 'desc 0', value: false, canWrite: true, min: 0, max: 0, step: 0 },
      { name: 'Switch 1', description: 'desc 1', value: true, canWrite: true, min: 0, max: 0, step: 0 },
      { name: 'Switch 2', description: 'desc 2', value: 50, canWrite: true, min: 0, max: 100, step: 1 }
    ]

    let fetchSwitchDetailsSpy: MockInstance<() => Promise<void>>

    beforeEach(() => {
      mockSwitchClientInstance.setSwitch.mockReset()
      mockSwitchClientInstance.setSwitchValue.mockReset()
      mockSwitchClientInstance.getSwitchDetails.mockReset()

      fetchSwitchDetailsSpy = vi.spyOn(store, 'fetchSwitchDetails').mockResolvedValue(undefined)

      mockGetSwitchClient.mockReturnValue(mockSwitchClientInstance as unknown as SwitchClient)
      vi.spyOn(store, 'getDeviceById').mockImplementation((id) => {
        if (id === deviceId) {
          return {
            id: deviceId,
            name: 'Test Switch SetValue',
            type: 'switch',
            isConnected: true,
            sw_switches: JSON.parse(JSON.stringify(mockInitialSwitches)),
            apiBaseUrl: 'http://mock.setvalue.api'
          } as unknown as Device
        }
        return null
      })
      mockUpdateDevice.mockClear()
      mockEmitEvent.mockClear()
    })

    it('should call client.setSwitch for boolean value and update specific switch detail', async () => {
      const newValue = false
      const updatedDetailForSwitch1: ISwitchDetail = { ...mockInitialSwitches[switchId], value: newValue }
      mockSwitchClientInstance.setSwitch.mockResolvedValue(undefined)
      mockSwitchClientInstance.getSwitchDetails.mockResolvedValue(updatedDetailForSwitch1)

      await store.setDeviceSwitchValue(deviceId, switchId, newValue)

      expect(mockGetSwitchClient).toHaveBeenCalledWith(deviceId)
      expect(mockSwitchClientInstance.setSwitch).toHaveBeenCalledWith(switchId, newValue)
      expect(mockSwitchClientInstance.setSwitchValue).not.toHaveBeenCalled()
      expect(mockSwitchClientInstance.getSwitchDetails).toHaveBeenCalledWith(switchId)

      const expectedNewSwitches = JSON.parse(JSON.stringify(mockInitialSwitches))
      expectedNewSwitches[switchId] = updatedDetailForSwitch1
      expect(mockUpdateDevice).toHaveBeenCalledWith(deviceId, { sw_switches: expectedNewSwitches })
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'devicePropertyChanged',
        deviceId,
        property: `switchValue_${switchId}`,
        value: newValue
      })
      expect(fetchSwitchDetailsSpy).not.toHaveBeenCalled()
    })

    it('should call client.setSwitchValue for number value and update specific switch detail', async () => {
      const newValue = 75
      const targetSwitchId = 2
      const updatedDetailForSwitch2: ISwitchDetail = { ...mockInitialSwitches[targetSwitchId], value: newValue }
      mockSwitchClientInstance.setSwitchValue.mockResolvedValue(undefined)
      mockSwitchClientInstance.getSwitchDetails.mockResolvedValue(updatedDetailForSwitch2)

      await store.setDeviceSwitchValue(deviceId, targetSwitchId, newValue)

      expect(mockSwitchClientInstance.setSwitchValue).toHaveBeenCalledWith(targetSwitchId, newValue)
      expect(mockSwitchClientInstance.setSwitch).not.toHaveBeenCalled()
      expect(mockSwitchClientInstance.getSwitchDetails).toHaveBeenCalledWith(targetSwitchId)

      const expectedNewSwitches = JSON.parse(JSON.stringify(mockInitialSwitches))
      expectedNewSwitches[targetSwitchId] = updatedDetailForSwitch2
      expect(mockUpdateDevice).toHaveBeenCalledWith(deviceId, { sw_switches: expectedNewSwitches })
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'devicePropertyChanged',
        deviceId,
        property: `switchValue_${targetSwitchId}`,
        value: newValue
      })
      expect(fetchSwitchDetailsSpy).not.toHaveBeenCalled()
    })

    it('should call fetchSwitchDetails if switchId is not found in current store state', async () => {
      const invalidSwitchId = 99
      const newValue = true
      mockSwitchClientInstance.setSwitch.mockResolvedValue(undefined)

      await store.setDeviceSwitchValue(deviceId, invalidSwitchId, newValue)

      expect(mockSwitchClientInstance.setSwitch).toHaveBeenCalledWith(invalidSwitchId, newValue)
      expect(mockSwitchClientInstance.getSwitchDetails).not.toHaveBeenCalled()
      expect(mockUpdateDevice).not.toHaveBeenCalled()
      expect(mockEmitEvent).not.toHaveBeenCalledWith(expect.objectContaining({ property: expect.stringContaining('switchValue_') }))
      expect(fetchSwitchDetailsSpy).toHaveBeenCalledWith(deviceId)
    })

    it('should call fetchSwitchDetails and emit deviceApiError if client.setSwitch fails', async () => {
      const error = new Error('SetSwitch failed')
      mockSwitchClientInstance.setSwitch.mockRejectedValue(error)

      await store.setDeviceSwitchValue(deviceId, switchId, true)

      expect(mockSwitchClientInstance.setSwitch).toHaveBeenCalledWith(switchId, true)
      expect(mockUpdateDevice).not.toHaveBeenCalled()
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId,
        error: `Failed to set switch value: ${error}`
      })
      expect(fetchSwitchDetailsSpy).toHaveBeenCalledWith(deviceId)
    })

    it('should call fetchSwitchDetails and emit deviceApiError if client.setSwitchValue fails', async () => {
      const error = new Error('SetSwitchValue failed')
      mockSwitchClientInstance.setSwitchValue.mockRejectedValue(error)

      await store.setDeviceSwitchValue(deviceId, switchId, 123)

      expect(mockSwitchClientInstance.setSwitchValue).toHaveBeenCalledWith(switchId, 123)
      expect(mockUpdateDevice).not.toHaveBeenCalled()
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId,
        error: `Failed to set switch value: ${error}`
      })
      expect(fetchSwitchDetailsSpy).toHaveBeenCalledWith(deviceId)
    })

    it('should not call client if _getSwitchClient returns null', async () => {
      mockGetSwitchClient.mockReturnValue(null)

      await store.setDeviceSwitchValue(deviceId, switchId, true)

      expect(mockSwitchClientInstance.setSwitch).not.toHaveBeenCalled()
      expect(mockSwitchClientInstance.setSwitchValue).not.toHaveBeenCalled()
      expect(fetchSwitchDetailsSpy).not.toHaveBeenCalled()
      expect(mockUpdateDevice).not.toHaveBeenCalled()
      expect(mockEmitEvent).not.toHaveBeenCalled()
    })
  })

  describe('setDeviceSwitchName', () => {
    const deviceId = 'switch-set-name-test'
    const switchId = 0
    const newName = 'Relay Alpha'
    const mockInitialSwitches: ISwitchDetail[] = [
      { name: 'Switch 0', description: 'Original Desc 0', value: false, canWrite: true, min: 0, max: 0, step: 0 },
      { name: 'Switch 1', description: 'Original Desc 1', value: true, canWrite: true, min: 0, max: 0, step: 0 }
    ]

    let fetchSwitchDetailsSpy: MockInstance<() => Promise<void>>

    beforeEach(() => {
      mockSwitchClientInstance.setSwitchName.mockReset()
      mockSwitchClientInstance.getSwitchDetails.mockReset() // Also used to refresh after set

      fetchSwitchDetailsSpy = vi.spyOn(store, 'fetchSwitchDetails').mockResolvedValue(undefined)
      mockGetSwitchClient.mockReturnValue(mockSwitchClientInstance as unknown as SwitchClient)
      vi.spyOn(store, 'getDeviceById').mockImplementation((id) => {
        if (id === deviceId) {
          return {
            id: deviceId,
            name: 'Test Switch SetName',
            type: 'switch',
            isConnected: true,
            sw_switches: JSON.parse(JSON.stringify(mockInitialSwitches)), // Deep copy
            apiBaseUrl: 'http://mock.setname.api'
          } as unknown as Device
        }
        return null
      })
      mockUpdateDevice.mockClear()
      mockEmitEvent.mockClear()
    })

    it('should call client.setSwitchName and update specific switch detail via getSwitchDetails', async () => {
      const updatedDetailForSwitch0: ISwitchDetail = { ...mockInitialSwitches[switchId], name: newName }
      mockSwitchClientInstance.setSwitchName.mockResolvedValue(undefined)
      mockSwitchClientInstance.getSwitchDetails.mockResolvedValue(updatedDetailForSwitch0)

      await store.setDeviceSwitchName(deviceId, switchId, newName)

      expect(mockGetSwitchClient).toHaveBeenCalledWith(deviceId)
      expect(mockSwitchClientInstance.setSwitchName).toHaveBeenCalledWith(switchId, newName)
      expect(mockSwitchClientInstance.getSwitchDetails).toHaveBeenCalledWith(switchId)

      const expectedNewSwitches = JSON.parse(JSON.stringify(mockInitialSwitches))
      expectedNewSwitches[switchId] = updatedDetailForSwitch0
      expect(mockUpdateDevice).toHaveBeenCalledWith(deviceId, { sw_switches: expectedNewSwitches })
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'devicePropertyChanged',
        deviceId,
        property: `switchName_${switchId}`,
        value: newName // The action emits the new name as the value for this event
      })
      expect(fetchSwitchDetailsSpy).not.toHaveBeenCalled()
    })

    it('should call fetchSwitchDetails if switchId is not found in current store state', async () => {
      const invalidSwitchId = 99
      mockSwitchClientInstance.setSwitchName.mockResolvedValue(undefined)

      await store.setDeviceSwitchName(deviceId, invalidSwitchId, newName)

      expect(mockSwitchClientInstance.setSwitchName).toHaveBeenCalledWith(invalidSwitchId, newName)
      expect(mockSwitchClientInstance.getSwitchDetails).not.toHaveBeenCalled()
      expect(mockUpdateDevice).not.toHaveBeenCalled()
      expect(mockEmitEvent).not.toHaveBeenCalledWith(expect.objectContaining({ property: expect.stringContaining('switchName_') }))
      expect(fetchSwitchDetailsSpy).toHaveBeenCalledWith(deviceId)
    })

    it('should call fetchSwitchDetails and emit deviceApiError if client.setSwitchName fails', async () => {
      const error = new Error('SetSwitchName failed')
      mockSwitchClientInstance.setSwitchName.mockRejectedValue(error)

      await store.setDeviceSwitchName(deviceId, switchId, newName)

      expect(mockSwitchClientInstance.setSwitchName).toHaveBeenCalledWith(switchId, newName)
      expect(mockUpdateDevice).not.toHaveBeenCalled()
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId,
        error: `Failed to set switch name: ${error}`
      })
      expect(fetchSwitchDetailsSpy).toHaveBeenCalledWith(deviceId)
    })

    it('should not call client if _getSwitchClient returns null', async () => {
      mockGetSwitchClient.mockReturnValue(null)

      await store.setDeviceSwitchName(deviceId, switchId, newName)

      expect(mockSwitchClientInstance.setSwitchName).not.toHaveBeenCalled()
      expect(fetchSwitchDetailsSpy).not.toHaveBeenCalled()
      expect(mockUpdateDevice).not.toHaveBeenCalled()
      expect(mockEmitEvent).not.toHaveBeenCalled()
    })
  })

  describe('setAsyncSwitchStateStoreAction', () => {
    const deviceId = 'switch-async-state-test'
    const switchId = 0
    const newState = true

    beforeEach(() => {
      mockSwitchClientInstance.setAsyncSwitch.mockReset()
      mockGetSwitchClient.mockReturnValue(mockSwitchClientInstance as unknown as SwitchClient)
      mockEmitEvent.mockClear()
    })

    it('should call client.setAsyncSwitch and emit deviceMethodCalled on success', async () => {
      mockSwitchClientInstance.setAsyncSwitch.mockResolvedValue(undefined)

      await store.setAsyncSwitchStateStoreAction(deviceId, switchId, newState)

      expect(mockGetSwitchClient).toHaveBeenCalledWith(deviceId)
      expect(mockSwitchClientInstance.setAsyncSwitch).toHaveBeenCalledWith(switchId, newState)
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceMethodCalled',
        deviceId,
        method: 'setAsyncSwitchState',
        args: [switchId, newState],
        result: 'success'
      })
      expect(mockUpdateDevice).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError if client.setAsyncSwitch fails', async () => {
      const error = new Error('SetAsyncSwitch failed')
      mockSwitchClientInstance.setAsyncSwitch.mockRejectedValue(error)

      await store.setAsyncSwitchStateStoreAction(deviceId, switchId, newState)

      expect(mockSwitchClientInstance.setAsyncSwitch).toHaveBeenCalledWith(switchId, newState)
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId,
        error: `Failed to set async switch state: ${error}`
      })
      expect(mockUpdateDevice).not.toHaveBeenCalled()
    })

    it('should not call client or emit if _getSwitchClient returns null', async () => {
      mockGetSwitchClient.mockReturnValue(null)

      await store.setAsyncSwitchStateStoreAction(deviceId, switchId, newState)

      expect(mockSwitchClientInstance.setAsyncSwitch).not.toHaveBeenCalled()
      expect(mockEmitEvent).not.toHaveBeenCalled()
    })
  })

  describe('setAsyncSwitchValueStoreAction', () => {
    const deviceId = 'switch-async-value-test'
    const switchId = 1
    const newValue = 100

    beforeEach(() => {
      mockSwitchClientInstance.setAsyncSwitchValue.mockReset()
      mockGetSwitchClient.mockReturnValue(mockSwitchClientInstance as unknown as SwitchClient)
      mockEmitEvent.mockClear()
    })

    it('should call client.setAsyncSwitchValue and emit deviceMethodCalled on success', async () => {
      mockSwitchClientInstance.setAsyncSwitchValue.mockResolvedValue(undefined)

      await store.setAsyncSwitchValueStoreAction(deviceId, switchId, newValue)

      expect(mockGetSwitchClient).toHaveBeenCalledWith(deviceId)
      expect(mockSwitchClientInstance.setAsyncSwitchValue).toHaveBeenCalledWith(switchId, newValue)
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceMethodCalled',
        deviceId,
        method: 'setAsyncSwitchValue',
        args: [switchId, newValue],
        result: 'success'
      })
      expect(mockUpdateDevice).not.toHaveBeenCalled()
    })

    it('should emit deviceApiError if client.setAsyncSwitchValue fails', async () => {
      const error = new Error('SetAsyncSwitchValue failed')
      mockSwitchClientInstance.setAsyncSwitchValue.mockRejectedValue(error)

      await store.setAsyncSwitchValueStoreAction(deviceId, switchId, newValue)

      expect(mockSwitchClientInstance.setAsyncSwitchValue).toHaveBeenCalledWith(switchId, newValue)
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId,
        error: `Failed to set async switch value: ${error}`
      })
      expect(mockUpdateDevice).not.toHaveBeenCalled()
    })

    it('should not call client or emit if _getSwitchClient returns null', async () => {
      mockGetSwitchClient.mockReturnValue(null)

      await store.setAsyncSwitchValueStoreAction(deviceId, switchId, newValue)

      expect(mockSwitchClientInstance.setAsyncSwitchValue).not.toHaveBeenCalled()
      expect(mockEmitEvent).not.toHaveBeenCalled()
    })
  })

  describe('getSwitchStateChangeCompleteStoreAction', () => {
    const deviceId = 'switch-state-complete-test'
    const switchId = 0
    const transactionId = 12345

    beforeEach(() => {
      mockSwitchClientInstance.isStateChangeComplete.mockReset()
      mockGetSwitchClient.mockReturnValue(mockSwitchClientInstance as unknown as SwitchClient)
      mockEmitEvent.mockClear()
    })

    it('should call client.isStateChangeComplete and emit/return result on success', async () => {
      const expectedResult = true
      mockSwitchClientInstance.isStateChangeComplete.mockResolvedValue(expectedResult)

      const result = await store.getSwitchStateChangeCompleteStoreAction(deviceId, switchId, transactionId)

      expect(result).toBe(expectedResult)
      expect(mockGetSwitchClient).toHaveBeenCalledWith(deviceId)
      expect(mockSwitchClientInstance.isStateChangeComplete).toHaveBeenCalledWith(switchId, transactionId)
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceMethodCalled',
        deviceId,
        method: 'isStateChangeComplete',
        args: [switchId, transactionId],
        result: expectedResult
      })
    })

    it('should emit deviceApiError and return null if client.isStateChangeComplete fails', async () => {
      const error = new Error('isStateChangeComplete failed')
      mockSwitchClientInstance.isStateChangeComplete.mockRejectedValue(error)

      const result = await store.getSwitchStateChangeCompleteStoreAction(deviceId, switchId, transactionId)

      expect(result).toBeNull()
      expect(mockSwitchClientInstance.isStateChangeComplete).toHaveBeenCalledWith(switchId, transactionId)
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId,
        error: `Failed to check state change completion: ${error}`
      })
    })

    it('should return null and not call client or emit if _getSwitchClient returns null', async () => {
      mockGetSwitchClient.mockReturnValue(null)

      const result = await store.getSwitchStateChangeCompleteStoreAction(deviceId, switchId, transactionId)

      expect(result).toBeNull()
      expect(mockSwitchClientInstance.isStateChangeComplete).not.toHaveBeenCalled()
      expect(mockEmitEvent).not.toHaveBeenCalled()
    })
  })

  describe('Polling Actions', () => {
    // vi.useFakeTimers(); // REMOVED from top of Polling Actions

    const deviceId = 'switch-poll-test'
    const mockSwitchesDetails: ISwitchDetail[] = [
      { name: 'S0', description: 'D0', value: false, canWrite: true, min: 0, max: 0, step: 0 },
      { name: 'S1', description: 'D1', value: true, canWrite: true, min: 0, max: 0, step: 0 }
    ]
    const switchDeviceMock: CoreSwitchDevice = {
      id: deviceId,
      name: 'Test Switch Polling',
      type: 'switch',
      apiBaseUrl: 'http://localhost:11111',
      deviceNumber: 0,
      isConnected: true,
      isConnecting: false,
      isDisconnecting: false,
      status: 'idle',
      properties: { propertyPollIntervalMs: 100 }, // Default poll interval for this mock
      sw_maxSwitch: mockSwitchesDetails.length,
      sw_switches: [...mockSwitchesDetails], // Use a copy
      displayName: 'Test Switch Polling Display',
      discoveredAt: new Date().toISOString(),
      lastConnected: new Date().toISOString(),
      ipAddress: '127.0.0.1',
      address: '127.0.0.1',
      port: 11111,
      devicePort: 11111,
      telemetry: {},
      lastSeen: Date.now(),
      firmwareVersion: '1.0',
      // deviceNum: 0, // already above
      idx: 0,
      capabilities: {},
      deviceAttributes: {},
      stateHistory: []
    }

    let getDeviceByIdSpy: MockInstance<(id: string) => Device | null>
    // mockedIsSwitch is already declared in the outer scope and set up in the main beforeEach
    // pollStatusSpy will be set up within the describe blocks that need it

    beforeEach(() => {
      // For ALL tests within Polling Actions
      // DO NOT call vi.useFakeTimers() here

      getDeviceByIdSpy = vi.spyOn(store, 'getDeviceById')
      mockedIsSwitch.mockReturnValue(true) // Default for polling tests
      mockGetSwitchClient.mockReturnValue(mockSwitchClientInstance as unknown as SwitchClient) // Default for polling tests

      // Reset device state and mocks
      getDeviceByIdSpy.mockReturnValue(JSON.parse(JSON.stringify(switchDeviceMock))) // Return a fresh copy

      mockSwitchClientInstance.getSwitchValue.mockReset()
      mockSwitchClientInstance.getSwitchDetails.mockReset()
      mockSwitchClientInstance.getAllSwitchDetails.mockReset()
      mockUpdateDevice.mockClear()
      mockEmitEvent.mockClear()
      vi.spyOn(store, 'fetchSwitchDetails').mockClear()

      // Clear polling state and ALL timers thoroughly
      store._sw_pollingTimers.forEach((timerId) => clearInterval(timerId))
      store._sw_pollingTimers.clear()
      store._sw_isPolling.clear()
      vi.clearAllTimers() // Vitest's own timer cleanup
    })

    afterEach(() => {
      // For ALL tests within Polling Actions
      // DO NOT call vi.useRealTimers() or vi.runOnlyPendingTimers() here
      vi.clearAllTimers() // Clean up any timers that might have been set

      if (getDeviceByIdSpy && typeof getDeviceByIdSpy.mockRestore === 'function') {
        getDeviceByIdSpy.mockRestore()
      }
      // Spies created within specific describe blocks will be handled there
    })

    describe('startSwitchPolling', () => {
      const startPollDeviceId = 'switch-start-polling-test'
      const pollInterval = 500
      let pollStatusSpyForStart: MockInstance<(this: UnifiedStoreType, deviceId: string) => Promise<void>>

      const basePollingDevice: Device & SwitchDeviceProperties = {
        id: startPollDeviceId,
        name: 'Polling Switch For Start',
        type: 'switch',
        deviceNum: 0,
        isConnected: true,
        isConnecting: false,
        isDisconnecting: false,
        status: 'idle',
        properties: { propertyPollIntervalMs: pollInterval },
        sw_switches: [{ name: 'SW0', description: '', value: false, canWrite: true, min: 0, max: 0, step: 0 }]
      }

      beforeEach(() => {
        vi.useFakeTimers() // ADDED for this specific suite
        mockedIsSwitch.mockReturnValue(true)
        pollStatusSpyForStart = vi.spyOn(store as UnifiedStoreType, '_pollSwitchStatus')
        store._sw_pollingTimers.delete(startPollDeviceId)
        store._sw_isPolling.delete(startPollDeviceId)
        vi.clearAllTimers() // Clear any timers before starting tests in this suite
      })

      afterEach(() => {
        vi.clearAllTimers() // Clear timers used in this suite
        vi.useRealTimers() // ADDED for this specific suite
        if (pollStatusSpyForStart && typeof pollStatusSpyForStart.mockRestore === 'function') {
          pollStatusSpyForStart.mockRestore()
        }
        store.stopSwitchPolling(startPollDeviceId)
      })

      it('should not start polling if device is not found', () => {
        getDeviceByIdSpy.mockReturnValue(null)
        store.startSwitchPolling(startPollDeviceId)
        expect(store._sw_isPolling.get(startPollDeviceId)).toBeUndefined()
        expect(store._sw_pollingTimers.has(startPollDeviceId)).toBe(false)
        expect(pollStatusSpyForStart).not.toHaveBeenCalled()
      })

      it('should not start polling if device is not a switch', () => {
        getDeviceByIdSpy.mockReturnValue(basePollingDevice as Device)
        mockedIsSwitch.mockReturnValue(false)
        store.startSwitchPolling(startPollDeviceId)
        expect(store._sw_isPolling.get(startPollDeviceId)).toBeUndefined()
        expect(store._sw_pollingTimers.has(startPollDeviceId)).toBe(false)
        expect(pollStatusSpyForStart).not.toHaveBeenCalled()
      })

      it('should not start polling if device is not connected', () => {
        getDeviceByIdSpy.mockReturnValue({ ...basePollingDevice, isConnected: false } as Device)
        store.startSwitchPolling(startPollDeviceId)
        expect(store._sw_isPolling.get(startPollDeviceId)).toBeUndefined()
        expect(store._sw_pollingTimers.has(startPollDeviceId)).toBe(false)
        expect(pollStatusSpyForStart).not.toHaveBeenCalled()
      })

      it('should start polling if device is a connected switch', () => {
        getDeviceByIdSpy.mockReturnValue(basePollingDevice as Device)
        store.startSwitchPolling(startPollDeviceId)
        expect(store._sw_isPolling.get(startPollDeviceId)).toBe(true)
        expect(store._sw_pollingTimers.has(startPollDeviceId)).toBe(true)
        expect(pollStatusSpyForStart).not.toHaveBeenCalled()

        vi.advanceTimersByTime(pollInterval)
        expect(pollStatusSpyForStart).toHaveBeenCalledTimes(1)
        expect(pollStatusSpyForStart).toHaveBeenCalledWith(startPollDeviceId)

        vi.advanceTimersByTime(pollInterval)
        expect(pollStatusSpyForStart).toHaveBeenCalledTimes(2)
      })

      it('should stop existing polling before starting a new one for the same device', () => {
        getDeviceByIdSpy.mockReturnValue(basePollingDevice as Device)
        const stopPollingSpy = vi.spyOn(store, 'stopSwitchPolling')

        store.startSwitchPolling(startPollDeviceId)
        const firstTimerId = store._sw_pollingTimers.get(startPollDeviceId)

        store.startSwitchPolling(startPollDeviceId)
        expect(stopPollingSpy).toHaveBeenCalledWith(startPollDeviceId)
        expect(store._sw_isPolling.get(startPollDeviceId)).toBe(true)
        const secondTimerId = store._sw_pollingTimers.get(startPollDeviceId)
        expect(secondTimerId).not.toBe(firstTimerId)

        vi.advanceTimersByTime(pollInterval)
        expect(pollStatusSpyForStart).toHaveBeenCalledTimes(1)
        stopPollingSpy.mockRestore()
      })

      it('should use default poll interval if not specified in device properties', () => {
        const deviceWithoutInterval = {
          ...basePollingDevice,
          properties: {}
        } as Device & SwitchDeviceProperties
        getDeviceByIdSpy.mockReturnValue(deviceWithoutInterval as Device)
        store.startSwitchPolling(startPollDeviceId)
        expect(store._sw_isPolling.get(startPollDeviceId)).toBe(true)

        vi.advanceTimersByTime(3000)
        expect(pollStatusSpyForStart).toHaveBeenCalledTimes(1)
      })
    })

    describe('stopSwitchPolling', () => {
      const stopPollDeviceId = 'switch-stop-polling-test'
      let pollStatusSpyForStop: MockInstance<(this: UnifiedStoreType, deviceId: string) => Promise<void>>

      beforeEach(() => {
        vi.useFakeTimers() // ADDED for this specific suite
        pollStatusSpyForStop = vi.spyOn(store as UnifiedStoreType, '_pollSwitchStatus')
        getDeviceByIdSpy.mockReturnValue({
          ...switchDeviceMock,
          id: stopPollDeviceId,
          properties: { propertyPollIntervalMs: 100 }
        } as CoreSwitchDevice)
        mockedIsSwitch.mockReturnValue(true)
        vi.clearAllTimers() // Clear any timers before starting tests in this suite
      })

      afterEach(() => {
        vi.clearAllTimers() // Clear timers used in this suite
        vi.useRealTimers() // ADDED for this specific suite
        if (pollStatusSpyForStop && typeof pollStatusSpyForStop.mockRestore === 'function') {
          pollStatusSpyForStop.mockRestore()
        }
        store.stopSwitchPolling(stopPollDeviceId)
      })

      it('should stop polling and clear timer', () => {
        store.startSwitchPolling(stopPollDeviceId)
        expect(store._sw_isPolling.get(stopPollDeviceId)).toBe(true)

        store.stopSwitchPolling(stopPollDeviceId)
        expect(store._sw_isPolling.get(stopPollDeviceId)).toBe(false)
        expect(store._sw_pollingTimers.has(stopPollDeviceId)).toBe(false)

        pollStatusSpyForStop.mockClear()
        vi.advanceTimersByTime(200)
        expect(pollStatusSpyForStop).not.toHaveBeenCalled()
      })
    })

    describe('_pollSwitchStatus', () => {
      let fetchSwitchDetailsSpy: MockInstance<(deviceId: string) => Promise<void>>

      beforeEach(() => {
        store._sw_isPolling.set(deviceId, true)
        mockGetSwitchClient.mockReturnValue(mockSwitchClientInstance as unknown as SwitchClient)
        getDeviceByIdSpy.mockReturnValue(JSON.parse(JSON.stringify(switchDeviceMock)))
        mockedIsSwitch.mockReturnValue(true)

        fetchSwitchDetailsSpy = vi.spyOn(store, 'fetchSwitchDetails').mockResolvedValue(undefined)
        mockSwitchClientInstance.getSwitchValue.mockReset()
      })

      afterEach(() => {
        if (fetchSwitchDetailsSpy && typeof fetchSwitchDetailsSpy.mockRestore === 'function') {
          fetchSwitchDetailsSpy.mockRestore()
        }
      })

      it('should call client.getSwitchValue for each switch and update if changed', async () => {
        mockSwitchClientInstance.getSwitchValue.mockResolvedValueOnce(true).mockResolvedValueOnce(true)

        await store._pollSwitchStatus(deviceId)

        expect(mockSwitchClientInstance.getSwitchValue).toHaveBeenCalledTimes(2)
        expect(mockSwitchClientInstance.getSwitchValue).toHaveBeenNthCalledWith(1, 0)
        expect(mockSwitchClientInstance.getSwitchValue).toHaveBeenNthCalledWith(2, 1)

        expect(mockUpdateDevice).toHaveBeenCalledTimes(1)
        const updatedDeviceArg = mockUpdateDevice.mock.calls[0][1] as Partial<Device & SwitchDeviceProperties>
        const updatedSwitches = updatedDeviceArg.sw_switches

        expect(Array.isArray(updatedSwitches)).toBe(true)
        if (Array.isArray(updatedSwitches)) {
          expect(updatedSwitches.length).toBeGreaterThanOrEqual(2)
          expect(updatedSwitches[0]?.value).toBe(true)
          expect(updatedSwitches[1]?.value).toBe(true)
        } else {
          throw new Error('updatedSwitches is not an array or is too short')
        }

        expect(mockEmitEvent).toHaveBeenCalledTimes(1)
        expect(mockEmitEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'devicePropertyChanged',
            property: 'switchValue_0',
            value: true
          })
        )
      })

      it('should not update or emit if no values changed', async () => {
        mockSwitchClientInstance.getSwitchValue.mockResolvedValueOnce(false).mockResolvedValueOnce(true)

        await store._pollSwitchStatus(deviceId)

        expect(mockSwitchClientInstance.getSwitchValue).toHaveBeenCalledTimes(2)
        expect(mockUpdateDevice).not.toHaveBeenCalled()
        expect(mockEmitEvent).not.toHaveBeenCalled()
      })

      it('should stop polling if device becomes disconnected during poll', async () => {
        const disconnectedDevice = { ...JSON.parse(JSON.stringify(switchDeviceMock)), isConnected: false }
        getDeviceByIdSpy.mockReturnValueOnce(disconnectedDevice as Device)
        const stopPollingSpy = vi.spyOn(store, 'stopSwitchPolling')

        await store._pollSwitchStatus(deviceId)

        expect(stopPollingSpy).toHaveBeenCalledWith(deviceId)
        expect(mockSwitchClientInstance.getSwitchValue).not.toHaveBeenCalled()
        stopPollingSpy.mockRestore()
      })

      it('should call fetchSwitchDetails if sw_switches is not on device', async () => {
        const deviceWithoutSwitches = { ...JSON.parse(JSON.stringify(switchDeviceMock)), sw_switches: undefined }
        getDeviceByIdSpy.mockReturnValueOnce(deviceWithoutSwitches as Device)

        await store._pollSwitchStatus(deviceId)

        expect(fetchSwitchDetailsSpy).toHaveBeenCalledWith(deviceId)
        expect(mockSwitchClientInstance.getSwitchValue).not.toHaveBeenCalled()
      })

      it('should log warning if client.getSwitchValue fails for one switch but continue for others', async () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        mockSwitchClientInstance.getSwitchValue.mockRejectedValueOnce(new Error('Poll fail for S0')).mockResolvedValueOnce(false)

        await store._pollSwitchStatus(deviceId)

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining(`[SwitchStore] Error polling value for switch 0 on ${deviceId}:`),
          expect.any(Error)
        )
        expect(mockSwitchClientInstance.getSwitchValue).toHaveBeenCalledTimes(2)

        expect(mockUpdateDevice).toHaveBeenCalledTimes(1)
        const updatedDeviceArg = mockUpdateDevice.mock.calls[0][1] as Partial<Device & SwitchDeviceProperties>
        const updatedSwitches = updatedDeviceArg.sw_switches

        expect(Array.isArray(updatedSwitches)).toBe(true)
        if (Array.isArray(updatedSwitches)) {
          expect(updatedSwitches.length).toBeGreaterThanOrEqual(2)
          expect(updatedSwitches[1]?.value).toBe(false)
        } else {
          throw new Error('updatedSwitches is not an array or is too short')
        }

        expect(mockEmitEvent).toHaveBeenCalledTimes(1)
        expect(mockEmitEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'devicePropertyChanged',
            property: 'switchValue_1',
            value: false
          })
        )
        consoleWarnSpy.mockRestore()
      })

      it('should not proceed if _getSwitchClient returns null', async () => {
        mockGetSwitchClient.mockReturnValueOnce(null)
        await store._pollSwitchStatus(deviceId)
        expect(mockSwitchClientInstance.getSwitchValue).not.toHaveBeenCalled()
      })
    })

    // vi.useRealTimers(); // REMOVED from bottom of Polling Actions
  })
})
