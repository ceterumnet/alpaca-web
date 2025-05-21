import { describe, it, expect, beforeEach, vi, type MockInstance, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUnifiedStore, type UnifiedStoreType } from '@/stores/UnifiedStore'
import type { SwitchDeviceProperties, Device, UnifiedDevice, DeviceEvent, StoreOptions } from '@/stores/types/device-store.types'
import { SwitchClient, type ISwitchDetail } from '@/api/alpaca/switch-client'
import { type SwitchDevice as CoreSwitchDevice } from '@/types/device.types'
import log from '@/plugins/logger'
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
  let mockFetchDeviceState: MockInstance<
    (deviceId: string, options?: { cacheTtlMs?: number; forceRefresh?: boolean }) => Promise<Record<string, unknown> | null>
  >

  // Declare pollStatusSpy here
  //   let pollStatusSpy: MockInstance<(this: UnifiedStoreType, deviceId: string) => Promise<void>>

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
    mockFetchDeviceState = vi.spyOn(store, 'fetchDeviceState').mockResolvedValue(null) // Default mock

    // let mockedIsSwitchFn: MockInstance<(device: UnifiedDevice) => device is CoreSwitchDevice>
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
      mockFetchDeviceState.mockReset() // Reset fetchDeviceState mock
      store._sw_deviceStateAvailableProps.clear()
      store._sw_deviceStateUnsupported.clear()

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
      // Default behavior for fetchDeviceState in these tests unless overridden
      mockFetchDeviceState.mockResolvedValue(null)
    })

    it('should fetch maxSwitch and all switch details, then update device and emit event on success (no devicestate)', async () => {
      mockFetchDeviceState.mockResolvedValue(null) // Explicitly no devicestate
      vi.mocked(mockSwitchClientInstance.maxSwitch).mockResolvedValue(mockMaxSwitchValue)
      vi.mocked(mockSwitchClientInstance.getAllSwitchDetails).mockResolvedValue(mockSwitchDetails)

      await store.fetchSwitchDetails(deviceId)

      expect(mockGetSwitchClient).toHaveBeenCalledWith(deviceId)
      expect(mockFetchDeviceState).toHaveBeenCalledWith(deviceId, { forceRefresh: true })
      expect(mockSwitchClientInstance.maxSwitch).toHaveBeenCalledTimes(1)
      expect(mockSwitchClientInstance.getAllSwitchDetails).toHaveBeenCalledTimes(1)

      // When fetchDeviceState returns null, _sw_deviceStateAvailableProps should not be updated for this device yet.
      // The first call to updateDevice will be for sw_usingDeviceState.
      expect(mockUpdateDevice).toHaveBeenNthCalledWith(1, deviceId, {
        sw_usingDeviceState: false
      })
      // The second call will be for the main switch properties.
      expect(mockUpdateDevice).toHaveBeenNthCalledWith(2, deviceId, {
        sw_maxSwitch: mockMaxSwitchValue,
        sw_switches: mockSwitchDetails
      })

      // Check the internal module state: it should have an entry for the deviceId, initialized to an empty Set.
      expect(store._sw_deviceStateAvailableProps.has(deviceId)).toBe(true)
      expect(store._sw_deviceStateAvailableProps.get(deviceId)).toEqual(new Set<string>())

      // Critically, ensure that the device itself in the store was NOT updated with sw_deviceStateAvailableProps
      // because fetchDeviceState returned null.
      const updateCalls = mockUpdateDevice.mock.calls
      const wasDeviceStatePropsUpdatedOnDevice = updateCalls.some(
        (call) => call[0] === deviceId && call[1] && Object.prototype.hasOwnProperty.call(call[1], 'sw_deviceStateAvailableProps')
      )
      expect(wasDeviceStatePropsUpdatedOnDevice).toBe(false)

      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'devicePropertyChanged',
        deviceId,
        property: 'switchDetails',
        value: { maxSwitch: mockMaxSwitchValue, switches: mockSwitchDetails }
      } as DeviceEvent)
    })

    it('should use maxSwitch from devicestate if available and valid', async () => {
      const deviceStateWithMaxSwitch = { maxswitch: mockMaxSwitchValue, otherprop: 'test' }
      mockFetchDeviceState.mockResolvedValue(deviceStateWithMaxSwitch)
      vi.mocked(mockSwitchClientInstance.getAllSwitchDetails).mockResolvedValue(mockSwitchDetails)
      // client.maxSwitch() should NOT be called

      await store.fetchSwitchDetails(deviceId)

      expect(mockFetchDeviceState).toHaveBeenCalledWith(deviceId, { forceRefresh: true })
      expect(mockSwitchClientInstance.maxSwitch).not.toHaveBeenCalled()
      expect(mockSwitchClientInstance.getAllSwitchDetails).toHaveBeenCalledTimes(1)

      const expectedAvailableProps = new Set(['maxswitch', 'otherprop'])
      // The first call to updateDevice will be for sw_deviceStateAvailableProps.
      expect(mockUpdateDevice).toHaveBeenNthCalledWith(1, deviceId, {
        sw_deviceStateAvailableProps: expectedAvailableProps
      })
      // The second call will be for sw_usingDeviceState
      expect(mockUpdateDevice).toHaveBeenNthCalledWith(2, deviceId, {
        sw_usingDeviceState: true
      })
      // The third call will be for the main switch properties.
      expect(mockUpdateDevice).toHaveBeenNthCalledWith(3, deviceId, {
        sw_maxSwitch: mockMaxSwitchValue,
        sw_switches: mockSwitchDetails
      })
    })

    it('should fallback to client.maxSwitch if devicestate provides invalid maxswitch (NaN)', async () => {
      const deviceStateWithInvalidMaxSwitch = { maxswitch: 'not-a-number' }
      mockFetchDeviceState.mockResolvedValue(deviceStateWithInvalidMaxSwitch)
      vi.mocked(mockSwitchClientInstance.maxSwitch).mockResolvedValue(mockMaxSwitchValue) // Fallback call
      vi.mocked(mockSwitchClientInstance.getAllSwitchDetails).mockResolvedValue(mockSwitchDetails)

      await store.fetchSwitchDetails(deviceId)

      expect(mockFetchDeviceState).toHaveBeenCalledWith(deviceId, { forceRefresh: true })
      expect(mockSwitchClientInstance.maxSwitch).toHaveBeenCalledTimes(1) // Fallback was used
      expect(mockSwitchClientInstance.getAllSwitchDetails).toHaveBeenCalledTimes(1)

      const expectedAvailableProps = new Set(['maxswitch'])
      expect(mockUpdateDevice).toHaveBeenNthCalledWith(1, deviceId, {
        sw_deviceStateAvailableProps: expectedAvailableProps
      })
      expect(mockUpdateDevice).toHaveBeenNthCalledWith(2, deviceId, {
        sw_usingDeviceState: false // maxswitch was invalid from devicestate, so fetchedViaDeviceState is false
      })
      expect(mockUpdateDevice).toHaveBeenNthCalledWith(3, deviceId, {
        sw_maxSwitch: mockMaxSwitchValue,
        sw_switches: mockSwitchDetails
      })
    })

    it('should fallback to client.maxSwitch if devicestate does not provide maxswitch', async () => {
      const deviceStateWithoutMaxSwitch = { otherprop: 'test' }
      mockFetchDeviceState.mockResolvedValue(deviceStateWithoutMaxSwitch)
      vi.mocked(mockSwitchClientInstance.maxSwitch).mockResolvedValue(mockMaxSwitchValue) // Fallback call
      vi.mocked(mockSwitchClientInstance.getAllSwitchDetails).mockResolvedValue(mockSwitchDetails)

      await store.fetchSwitchDetails(deviceId)

      expect(mockFetchDeviceState).toHaveBeenCalledWith(deviceId, { forceRefresh: true })
      expect(mockSwitchClientInstance.maxSwitch).toHaveBeenCalledTimes(1) // Fallback was used
      const expectedAvailableProps = new Set(['otherprop'])
      expect(mockUpdateDevice).toHaveBeenNthCalledWith(1, deviceId, {
        sw_deviceStateAvailableProps: expectedAvailableProps
      })
      expect(mockUpdateDevice).toHaveBeenNthCalledWith(2, deviceId, {
        sw_usingDeviceState: false // maxswitch was not in devicestate, so fetchedViaDeviceState is false
      })
      expect(mockUpdateDevice).toHaveBeenNthCalledWith(3, deviceId, {
        sw_maxSwitch: mockMaxSwitchValue,
        sw_switches: mockSwitchDetails
      })
    })

    it('should not call fetchDeviceState if device is in _sw_deviceStateUnsupported', async () => {
      store._sw_deviceStateUnsupported.add(deviceId)
      vi.mocked(mockSwitchClientInstance.maxSwitch).mockResolvedValue(mockMaxSwitchValue)
      vi.mocked(mockSwitchClientInstance.getAllSwitchDetails).mockResolvedValue(mockSwitchDetails)

      await store.fetchSwitchDetails(deviceId)

      expect(mockFetchDeviceState).not.toHaveBeenCalled()
      expect(mockSwitchClientInstance.maxSwitch).toHaveBeenCalledTimes(1)
      expect(mockUpdateDevice).toHaveBeenNthCalledWith(1, deviceId, {
        sw_usingDeviceState: false
      })
      expect(mockUpdateDevice).toHaveBeenNthCalledWith(2, deviceId, {
        sw_maxSwitch: mockMaxSwitchValue,
        sw_switches: mockSwitchDetails
      })
    })

    it('should update device with nulls and emit deviceApiError if client.maxSwitch() fails (after devicestate tried and failed to provide it)', async () => {
      mockFetchDeviceState.mockResolvedValue({ someprop: 'test' }) // devicestate doesn't have maxswitch
      const error = new Error('Failed to get maxSwitch')
      vi.mocked(mockSwitchClientInstance.maxSwitch).mockRejectedValue(error)

      await store.fetchSwitchDetails(deviceId)

      expect(mockFetchDeviceState).toHaveBeenCalledTimes(1)
      expect(mockSwitchClientInstance.maxSwitch).toHaveBeenCalledTimes(1)
      expect(mockSwitchClientInstance.getAllSwitchDetails).not.toHaveBeenCalled()

      expect(mockUpdateDevice).toHaveBeenNthCalledWith(1, deviceId, {
        sw_deviceStateAvailableProps: new Set(['someprop'])
      })
      // This assertion needs to be split if sw_usingDeviceState is updated in a separate call
      expect(mockUpdateDevice).toHaveBeenCalledWith(
        deviceId,
        expect.objectContaining({
          sw_maxSwitch: null,
          sw_switches: null,
          sw_usingDeviceState: false // fetchedViaDeviceState is false as maxSwitch didn't come from devicestate
        })
      )
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId,
        error: `Failed to fetch switch details: ${error}`
      } as DeviceEvent)
    })

    it('should update device with nulls and emit deviceApiError if client.getAllSwitchDetails() fails', async () => {
      mockFetchDeviceState.mockResolvedValue({ maxswitch: mockMaxSwitchValue }) // devicestate provides maxswitch
      const error = new Error('Failed to get all switch details')
      vi.mocked(mockSwitchClientInstance.getAllSwitchDetails).mockRejectedValue(error)

      await store.fetchSwitchDetails(deviceId)

      expect(mockFetchDeviceState).toHaveBeenCalledTimes(1)
      expect(mockSwitchClientInstance.maxSwitch).not.toHaveBeenCalled() // Should use from devicestate
      expect(mockSwitchClientInstance.getAllSwitchDetails).toHaveBeenCalledTimes(1)

      // The first call updates sw_deviceStateAvailableProps
      expect(mockUpdateDevice).toHaveBeenNthCalledWith(1, deviceId, {
        sw_deviceStateAvailableProps: new Set(['maxswitch'])
      })
      // The second call updates sw_usingDeviceState (true as maxSwitch came from devicestate)
      expect(mockUpdateDevice).toHaveBeenNthCalledWith(2, deviceId, {
        sw_usingDeviceState: true
      })
      // The third call updates the main properties, including sw_usingDeviceState to false due to error
      expect(mockUpdateDevice).toHaveBeenNthCalledWith(3, deviceId, {
        sw_maxSwitch: null,
        sw_switches: null,
        sw_usingDeviceState: false // This is the final state due to error handling path
      })
      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId,
        error: `Failed to fetch switch details: ${error}`
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
      } as DeviceEvent)
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
      idx: 0,
      capabilities: {},
      deviceAttributes: {},
      stateHistory: []
    }

    let getDeviceByIdSpy: MockInstance<(id: string) => Device | null>

    beforeEach(() => {
      getDeviceByIdSpy = vi.spyOn(store, 'getDeviceById')
      mockedIsSwitch.mockReturnValue(true)
      mockGetSwitchClient.mockReturnValue(mockSwitchClientInstance as unknown as SwitchClient)

      getDeviceByIdSpy.mockReturnValue(JSON.parse(JSON.stringify(switchDeviceMock)))

      mockSwitchClientInstance.getSwitchValue.mockReset()
      mockSwitchClientInstance.getSwitchDetails.mockReset()
      mockSwitchClientInstance.getAllSwitchDetails.mockReset()
      mockUpdateDevice.mockClear()
      mockEmitEvent.mockClear()
      vi.spyOn(store, 'fetchSwitchDetails').mockClear()

      store._sw_pollingTimers.forEach((timerId) => clearInterval(timerId))
      store._sw_pollingTimers.clear()
      store._sw_isPolling.clear()
      vi.clearAllTimers()
    })

    afterEach(() => {
      vi.clearAllTimers()

      if (getDeviceByIdSpy && typeof getDeviceByIdSpy.mockRestore === 'function') {
        getDeviceByIdSpy.mockRestore()
      }
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
        vi.useFakeTimers()
        mockedIsSwitch.mockReturnValue(true)
        pollStatusSpyForStart = vi.spyOn(store as UnifiedStoreType, '_pollSwitchStatus')
        store._sw_pollingTimers.delete(startPollDeviceId)
        store._sw_isPolling.delete(startPollDeviceId)
        vi.clearAllTimers()
      })

      afterEach(() => {
        vi.clearAllTimers()
        vi.useRealTimers()
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
        vi.useFakeTimers()
        pollStatusSpyForStop = vi.spyOn(store as UnifiedStoreType, '_pollSwitchStatus')
        getDeviceByIdSpy.mockReturnValue({
          ...switchDeviceMock,
          id: stopPollDeviceId,
          properties: { propertyPollIntervalMs: 100 }
        } as CoreSwitchDevice)
        mockedIsSwitch.mockReturnValue(true)
        vi.clearAllTimers()
      })

      afterEach(() => {
        vi.clearAllTimers()
        vi.useRealTimers()
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
      let mockDevice: Device & SwitchDeviceProperties

      beforeEach(() => {
        store._sw_isPolling.set(deviceId, true)
        mockGetSwitchClient.mockReturnValue(mockSwitchClientInstance as unknown as SwitchClient)

        mockDevice = {
          ...JSON.parse(JSON.stringify(switchDeviceMock)),
          sw_maxSwitch: mockSwitchesDetails.length,
          sw_switches: JSON.parse(JSON.stringify(mockSwitchesDetails)),
          properties: { propertyPollIntervalMs: 100 } // Default for these tests
        }
        getDeviceByIdSpy.mockReturnValue(mockDevice as Device)

        mockedIsSwitch.mockReturnValue(true)
        mockFetchDeviceState.mockReset().mockResolvedValue(null) // Default for poll tests
        store._sw_deviceStateAvailableProps.clear()
        store._sw_deviceStateUnsupported.clear()

        fetchSwitchDetailsSpy = vi.spyOn(store, 'fetchSwitchDetails').mockResolvedValue(undefined)
        mockSwitchClientInstance.getSwitchValue.mockReset()
      })

      afterEach(() => {
        if (fetchSwitchDetailsSpy && typeof fetchSwitchDetailsSpy.mockRestore === 'function') {
          fetchSwitchDetailsSpy.mockRestore()
        }
      })

      it('should call client.getSwitchValue for each switch and update if changed (devicestate success)', async () => {
        const deviceStateData = { polledProp: 'polledValue' }
        mockFetchDeviceState.mockResolvedValue(deviceStateData)
        mockSwitchClientInstance.getSwitchValue.mockResolvedValueOnce(true).mockResolvedValueOnce(true) // S0 changes to true, S1 no change

        await store._pollSwitchStatus(deviceId)

        const expectedPollInterval = mockDevice.properties!.propertyPollIntervalMs as number
        const expectedCacheTtl = expectedPollInterval / 2

        expect(mockFetchDeviceState).toHaveBeenCalledWith(deviceId, { forceRefresh: true, cacheTtlMs: expectedCacheTtl })
        // 1. sw_deviceStateAvailableProps updated from polling
        expect(mockUpdateDevice).toHaveBeenCalledWith(deviceId, { sw_deviceStateAvailableProps: new Set(['polledprop']) })
        // 2. sw_usingDeviceState updated from polling
        expect(mockUpdateDevice).toHaveBeenCalledWith(deviceId, { sw_usingDeviceState: true })

        expect(mockSwitchClientInstance.getSwitchValue).toHaveBeenCalledTimes(2)
        expect(mockSwitchClientInstance.getSwitchValue).toHaveBeenNthCalledWith(1, 0)
        expect(mockSwitchClientInstance.getSwitchValue).toHaveBeenNthCalledWith(2, 1)

        expect(mockUpdateDevice).toHaveBeenCalledTimes(3) // Total calls: props, usingDeviceState, switches

        // Ensure we are checking the correct call for sw_switches
        const updateDeviceCallForSwitches = mockUpdateDevice.mock.calls.find(
          (call) => call[1] && Object.prototype.hasOwnProperty.call(call[1], 'sw_switches')
        )
        expect(updateDeviceCallForSwitches).toBeDefined()
        const updatedSwitches = updateDeviceCallForSwitches
          ? (updateDeviceCallForSwitches[1] as Partial<Device & SwitchDeviceProperties>).sw_switches
          : undefined

        expect(Array.isArray(updatedSwitches)).toBe(true)
        if (Array.isArray(updatedSwitches)) {
          expect(updatedSwitches.length).toBeGreaterThanOrEqual(2)
          expect(updatedSwitches[0]?.value).toBe(true) // Changed from false to true
          expect(updatedSwitches[1]?.value).toBe(true) // Original value, also true in this call
        } else {
          throw new Error('updatedSwitches is not an array or is too short')
        }

        // 3. sw_switches updated due to value change
        expect(mockUpdateDevice).toHaveBeenCalledWith(deviceId, {
          sw_switches: updatedSwitches
        })

        expect(mockEmitEvent).toHaveBeenCalledTimes(1)
        expect(mockEmitEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'devicePropertyChanged',
            property: 'switchValue_0',
            value: true
          })
        )
      })

      it('should call client.getSwitchValue when devicestate returns null', async () => {
        mockFetchDeviceState.mockResolvedValue(null) // fetchDeviceState fails softly
        // Initial state: S0=false, S1=true. Polled values: S0=false, S1=false. So S1 changes.
        mockSwitchClientInstance.getSwitchValue.mockReset().mockResolvedValueOnce(false).mockResolvedValueOnce(false)

        await store._pollSwitchStatus(deviceId)

        const expectedPollInterval = mockDevice.properties!.propertyPollIntervalMs as number
        const expectedCacheTtl = expectedPollInterval / 2
        expect(mockFetchDeviceState).toHaveBeenCalledWith(deviceId, { forceRefresh: true, cacheTtlMs: expectedCacheTtl })

        // Check updateDevice calls related to deviceState
        expect(mockUpdateDevice).toHaveBeenCalledWith(deviceId, { sw_usingDeviceState: false })

        expect(mockSwitchClientInstance.getSwitchValue).toHaveBeenCalledTimes(2)
        // S1 changes from true to false, so sw_switches should be updated and event emitted
        expect(mockUpdateDevice).toHaveBeenCalledWith(deviceId, expect.objectContaining({ sw_switches: expect.any(Array) }))
        const updatedSwitchesCallWhenNull = mockUpdateDevice.mock.calls.find(
          (call) => call[1] && Object.prototype.hasOwnProperty.call(call[1], 'sw_switches')
        )
        expect(updatedSwitchesCallWhenNull).toBeDefined()

        let polledSwitchesWhenDeviceStateNull: ISwitchDetail[] | undefined
        if (updatedSwitchesCallWhenNull && updatedSwitchesCallWhenNull[1]) {
          const updates = updatedSwitchesCallWhenNull[1] as Partial<Device & SwitchDeviceProperties>
          // Ensure sw_switches is an array before assigning
          if (Array.isArray(updates.sw_switches)) {
            polledSwitchesWhenDeviceStateNull = updates.sw_switches
          } else {
            polledSwitchesWhenDeviceStateNull = undefined // If null, undefined, or not an array
          }
        }
        expect(polledSwitchesWhenDeviceStateNull?.[1]?.value).toBe(false)

        expect(mockEmitEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'devicePropertyChanged',
            property: 'switchValue_1', // S1 changed
            value: false
          })
        )
      })

      it('should call client.getSwitchValue when devicestate throws error', async () => {
        mockFetchDeviceState.mockRejectedValue(new Error('DeviceState exploded'))
        // Initial state from mockDevice: S0=false, S1=true.
        // Polled values: S0=false, S1=false. So S1 changes.
        mockSwitchClientInstance.getSwitchValue.mockReset().mockResolvedValueOnce(false).mockResolvedValueOnce(false)

        await store._pollSwitchStatus(deviceId)

        const expectedPollInterval = mockDevice.properties!.propertyPollIntervalMs as number
        const expectedCacheTtl = expectedPollInterval / 2
        expect(mockFetchDeviceState).toHaveBeenCalledWith(deviceId, { forceRefresh: true, cacheTtlMs: expectedCacheTtl })

        expect(mockUpdateDevice).toHaveBeenCalledWith(deviceId, { sw_usingDeviceState: false })

        expect(mockSwitchClientInstance.getSwitchValue).toHaveBeenCalledTimes(2)
        // S1 changes from true to false, so sw_switches should be updated and event emitted
        expect(mockUpdateDevice).toHaveBeenCalledWith(deviceId, expect.objectContaining({ sw_switches: expect.any(Array) }))
        const updatedSwitchesCallWhenError = mockUpdateDevice.mock.calls.find(
          (call) => call[1] && Object.prototype.hasOwnProperty.call(call[1], 'sw_switches')
        )
        expect(updatedSwitchesCallWhenError).toBeDefined()

        let polledSwitchesWhenDeviceStateError: ISwitchDetail[] | undefined
        if (updatedSwitchesCallWhenError && updatedSwitchesCallWhenError[1]) {
          const updates = updatedSwitchesCallWhenError[1] as Partial<Device & SwitchDeviceProperties>
          if (Array.isArray(updates.sw_switches)) {
            polledSwitchesWhenDeviceStateError = updates.sw_switches
          } else {
            polledSwitchesWhenDeviceStateError = undefined
          }
        }
        expect(polledSwitchesWhenDeviceStateError?.[1]?.value).toBe(false)

        expect(mockEmitEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'devicePropertyChanged',
            property: 'switchValue_1', // S1 changed
            value: false
          })
        )
      })

      it('should not call fetchDeviceState if device is in _sw_deviceStateUnsupported', async () => {
        store._sw_deviceStateUnsupported.add(deviceId)
        mockSwitchClientInstance.getSwitchValue.mockResolvedValueOnce(false).mockResolvedValueOnce(false)

        await store._pollSwitchStatus(deviceId)

        expect(mockFetchDeviceState).not.toHaveBeenCalled()
        expect(mockUpdateDevice).toHaveBeenCalledWith(deviceId, { sw_usingDeviceState: false })
        expect(mockSwitchClientInstance.getSwitchValue).toHaveBeenCalledTimes(2)
      })

      it('should not update or emit if no values changed', async () => {
        // Initial state from mockDevice: S0=false, S1=true.
        // Polled values should also be S0=false, S1=true for no change.
        mockSwitchClientInstance.getSwitchValue.mockReset().mockResolvedValueOnce(false).mockResolvedValueOnce(true)

        await store._pollSwitchStatus(deviceId)

        expect(mockFetchDeviceState).toHaveBeenCalled() // It will be called
        // 1. sw_usingDeviceState updated
        expect(mockUpdateDevice).toHaveBeenCalledWith(deviceId, { sw_usingDeviceState: false }) // Called due to devicestate returning null

        expect(mockSwitchClientInstance.getSwitchValue).toHaveBeenCalledTimes(2)
        // Values S0=false, S1=true don't change from mockDevice initial state.
        // So changedOverall should be false.

        // Only the sw_usingDeviceState update should occur.
        expect(mockUpdateDevice).toHaveBeenCalledTimes(1)
        expect(mockUpdateDevice).not.toHaveBeenCalledWith(deviceId, { sw_switches: expect.any(Array) })
        // When fetchDeviceState is null, sw_deviceStateAvailableProps is not updated directly in _pollSwitchStatus
        // (it would have been initialized in fetchSwitchDetails, but not re-updated here with an empty set from polling a null devicestate)
        // However, the test for `sw_deviceStateAvailableProps` in `_pollSwitchStatus` when devicestate *succeeds* is separate.
        // Here, we just ensure it's not updated with sw_deviceStateAvailableProps if devicestate was null.
        expect(mockUpdateDevice).not.toHaveBeenCalledWith(deviceId, expect.objectContaining({ sw_deviceStateAvailableProps: expect.any(Set) }))
        expect(mockEmitEvent).not.toHaveBeenCalled()
      })

      it('should use polling interval from _propertyPollingIntervals map for cacheTtlMs', async () => {
        const intervalMapKey = 'switchStatus' // Or 'switch', depends on your actual implementation
        const intervalFromMap = 4000
        store._propertyPollingIntervals.set(intervalMapKey, intervalFromMap)
        // Remove from device properties to ensure map is used
        delete mockDevice.properties!.propertyPollIntervalMs
        getDeviceByIdSpy.mockReturnValue(mockDevice as Device)

        mockFetchDeviceState.mockResolvedValue({})
        mockSwitchClientInstance.getSwitchValue.mockResolvedValue(false)

        await store._pollSwitchStatus(deviceId)

        const expectedCacheTtl = intervalFromMap / 2
        expect(mockFetchDeviceState).toHaveBeenCalledWith(deviceId, { forceRefresh: true, cacheTtlMs: expectedCacheTtl })
      })

      it('should use default polling interval for cacheTtlMs if not in properties or map', async () => {
        // Remove from device properties and ensure not in map
        delete mockDevice.properties!.propertyPollIntervalMs
        store._propertyPollingIntervals.clear()
        getDeviceByIdSpy.mockReturnValue(mockDevice as Device)

        mockFetchDeviceState.mockResolvedValue({})
        mockSwitchClientInstance.getSwitchValue.mockResolvedValue(false)

        await store._pollSwitchStatus(deviceId)

        const defaultPollInterval = 2000 // From switchActions.ts
        const expectedCacheTtl = defaultPollInterval / 2
        expect(mockFetchDeviceState).toHaveBeenCalledWith(deviceId, { forceRefresh: true, cacheTtlMs: expectedCacheTtl })
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
    })

    // vi.useRealTimers(); // REMOVED from bottom of Polling Actions
  })
})
