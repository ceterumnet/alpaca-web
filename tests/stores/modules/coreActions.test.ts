import { describe, it, expect, beforeEach, vi, type MockInstance } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import type { CoreState } from '@/stores/modules/coreActions'
import type { Device, StoreOptions, DeviceEvent, UnifiedDevice } from '@/stores/types/device-store.types'
import type { AlpacaClient } from '@/api/alpaca/base-client'
import type { RequestOptions } from '@/api/alpaca/types'

// Import the function to be mocked HERE, so we can refer to its mocked version later
import { createAlpacaClient } from '@/api/AlpacaClient'

// Mock AlpacaClient instance structure
const mockAlpacaClientInstance = {
  getProperty: vi.fn(),
  setProperty: vi.fn(),
  callMethod: vi.fn(),
  put: vi.fn(),
  get: vi.fn(),
  connected: vi.fn().mockResolvedValue(false),
  setConnected: vi.fn().mockResolvedValue(undefined),
  getDeviceState: vi.fn().mockResolvedValue({}),
  // Add common device-specific info methods that might be called by handlers
  getCameraInfo: vi.fn().mockResolvedValue([
    { Name: 'SensorName', Value: 'TestSensor' },
    { Name: 'SensorType', Value: 0 },
    { Name: 'CameraXSize', Value: 1024 },
    { Name: 'CameraYSize', Value: 768 },
    { Name: 'PixelSizeX', Value: 5.2 },
    { Name: 'PixelSizeY', Value: 5.2 },
    { Name: 'MaxBinX', Value: 2 },
    { Name: 'MaxBinY', Value: 2 },
    { Name: 'Gains', Value: ['High', 'Low'] },
    { Name: 'GainMin', Value: 0 },
    { Name: 'GainMax', Value: 100 },
    { Name: 'OffsetMin', Value: 0 },
    { Name: 'OffsetMax', Value: 255 }
  ]),
  getTelescopeInfo: vi.fn().mockResolvedValue([]), // Add for other types if needed by handlers
  getFilterWheelInfo: vi.fn().mockResolvedValue([]),
  getFocuserInfo: vi.fn().mockResolvedValue([])
  // etc. for other device types
  // Ensure all methods used by coreActions are mocked here or added to the spread in mockImplementation
}

// Now, mock the module. The factory creates the mock function.
vi.mock('@/api/AlpacaClient', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createAlpacaClient: vi.fn((..._args: any[]) => mockAlpacaClientInstance as unknown as AlpacaClient)
}))

describe('coreActions', () => {
  let store: ReturnType<typeof useUnifiedStore>

  let mockEmitEvent: MockInstance<(event: DeviceEvent) => void>

  // Cast the imported createAlpacaClient to the specific mock signature
  const mockedCreateAlpacaClient = createAlpacaClient as unknown as MockInstance<
    (baseUrl: string, deviceType: string, deviceNumber: number | undefined, device: UnifiedDevice) => AlpacaClient // The return type of the original function
  >

  beforeEach(() => {
    vi.clearAllMocks() // This clears all mocks, including the one for createAlpacaClient

    // Reset implementation for the mocked createAlpacaClient

    mockedCreateAlpacaClient.mockImplementation(
      (..._args: unknown[]) =>
        ({
          ...mockAlpacaClientInstance,
          // Ensure fresh mocks for methods that might be called multiple times if state matters
          setProperty: vi.fn().mockResolvedValue(undefined),
          getProperty: vi.fn().mockResolvedValue(null),
          // Ensure device-specific info methods are also fresh if their call counts/args matter per test
          getCameraInfo: vi.fn().mockResolvedValue([
            { Name: 'SensorName', Value: 'TestSensor' },
            { Name: 'SensorType', Value: 0 },
            { Name: 'CameraXSize', Value: 1024 },
            { Name: 'CameraYSize', Value: 768 },
            { Name: 'PixelSizeX', Value: 5.2 },
            { Name: 'PixelSizeY', Value: 5.2 },
            { Name: 'MaxBinX', Value: 2 },
            { Name: 'MaxBinY', Value: 2 },
            { Name: 'Gains', Value: ['High', 'Low'] },
            { Name: 'GainMin', Value: 0 },
            { Name: 'GainMax', Value: 100 },
            { Name: 'OffsetMin', Value: 0 },
            { Name: 'OffsetMax', Value: 255 }
          ])
        }) as unknown as AlpacaClient
    )

    setActivePinia(createPinia())
    store = useUnifiedStore()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockEmitEvent = vi.spyOn(store as any, '_emitEvent')
  })

  describe('Initial State', () => {
    it('should have the correct initial CoreState', () => {
      const expectedInitialState: Partial<CoreState> = {
        devices: new Map(),
        devicesArray: [],
        selectedDeviceId: null,
        deviceClients: new Map(),
        deviceStateCache: new Map(),
        _propertyPollingIntervals: new Map(),
        _deviceStateAvailableProps: new Map(),
        _deviceStateUnsupported: new Set(),
        lastDeviceStateFetch: new Map()
      }
      expect(store.devices).toEqual(expectedInitialState.devices)
      expect(store.devicesArray).toEqual(expectedInitialState.devicesArray)
      expect(store.selectedDeviceId).toEqual(expectedInitialState.selectedDeviceId)
      expect(store.deviceClients).toEqual(expectedInitialState.deviceClients)
      expect(store.deviceStateCache).toEqual(expectedInitialState.deviceStateCache)
      expect(store._propertyPollingIntervals).toEqual(expectedInitialState._propertyPollingIntervals)
      expect(store._deviceStateAvailableProps).toEqual(expectedInitialState._deviceStateAvailableProps)
      expect(store._deviceStateUnsupported).toEqual(expectedInitialState._deviceStateUnsupported)
      expect(store.lastDeviceStateFetch).toEqual(expectedInitialState.lastDeviceStateFetch) // Corrected property name
    })
  })

  describe('addDevice / addDeviceWithCheck', () => {
    const sampleDevice: Partial<Device> = {
      id: 'test-device-1:127.0.0.1:11111:camera:0',
      name: 'Test Camera 1',
      type: 'camera',
      deviceNum: 0,
      apiBaseUrl: 'http://127.0.0.1:11111/api/v1/camera/0'
    }
    const addDeviceOptionsDefault: StoreOptions = { silent: false }
    const addDeviceOptionsSilent: StoreOptions = { silent: true }

    it('should add a new device successfully and emit deviceAdded event', () => {
      const result = store.addDevice(sampleDevice, addDeviceOptionsDefault)
      expect(result).toBe(true)
      expect(store.devices.has(sampleDevice.id!)).toBe(true)
      expect(store.devicesArray.length).toBe(1)
      expect(store.devicesArray[0]?.id).toBe(sampleDevice.id)
      expect(store.deviceClients.has(sampleDevice.id!)).toBe(true)
      expect(mockedCreateAlpacaClient).toHaveBeenCalledTimes(1)
      expect(mockedCreateAlpacaClient).toHaveBeenCalledWith(sampleDevice.apiBaseUrl, sampleDevice.type, sampleDevice.deviceNum, expect.anything())

      expect(mockEmitEvent).toHaveBeenCalledTimes(1)
      const emittedEvent = mockEmitEvent.mock.calls[0][0]
      expect(emittedEvent.type).toBe('deviceAdded')
      if (emittedEvent.type === 'deviceAdded') {
        expect(emittedEvent.device).toHaveProperty('id', sampleDevice.id)
      }
    })

    it('should not add a duplicate device and return false, and not emit event', () => {
      store.addDevice(sampleDevice, addDeviceOptionsDefault) // Add once
      mockEmitEvent.mockClear()
      mockedCreateAlpacaClient.mockClear() // Clear calls for this specific test path

      const result = store.addDevice(sampleDevice, addDeviceOptionsDefault) // Attempt to add again
      expect(result).toBe(false)
      expect(store.devices.size).toBe(1)
      expect(store.devicesArray.length).toBe(1)
      expect(mockedCreateAlpacaClient).not.toHaveBeenCalled() // Not called again for duplicate
      expect(mockEmitEvent).not.toHaveBeenCalled()
    })

    it('should add a device without apiBaseUrl if ID can be parsed and emit event', () => {
      const deviceWithoutApiUrl: Partial<Device> = {
        id: '192.168.1.100:8080:telescope:1',
        name: 'Test Telescope Parsed',
        type: 'telescope',
        deviceNum: 1
      }
      const expectedApiBaseUrl = 'http://192.168.1.100:8080/api/v1/telescope/1'

      const result = store.addDevice(deviceWithoutApiUrl, addDeviceOptionsDefault)
      expect(result).toBe(true)
      expect(store.devices.has(deviceWithoutApiUrl.id!)).toBe(true)
      const addedDevice = store.getDeviceById(deviceWithoutApiUrl.id!)
      expect(addedDevice?.apiBaseUrl).toBe(expectedApiBaseUrl)
      expect(store.deviceClients.has(deviceWithoutApiUrl.id!)).toBe(true)
      expect(mockedCreateAlpacaClient).toHaveBeenCalledTimes(1) // Called once for this test
      expect(mockedCreateAlpacaClient).toHaveBeenCalledWith(
        expectedApiBaseUrl,
        deviceWithoutApiUrl.type,
        deviceWithoutApiUrl.deviceNum,
        expect.anything()
      )
      expect(mockEmitEvent).toHaveBeenCalledTimes(1)
      const emittedEvent = mockEmitEvent.mock.calls[0][0]
      expect(emittedEvent.type).toBe('deviceAdded')
      if (emittedEvent.type === 'deviceAdded') {
        expect(emittedEvent.device).toHaveProperty('id', deviceWithoutApiUrl.id)
      }
    })

    it('should add device, but not create client if apiBaseUrl missing & ID not parsable; emits event', () => {
      const deviceInvalid: Partial<Device> = {
        id: 'invalid-device-id', // Not parsable into IP:Port:Type:Num
        name: 'Invalid Device',
        type: 'unknown'
      }

      const result = store.addDevice(deviceInvalid, addDeviceOptionsDefault)
      expect(result).toBe(true)
      expect(store.devices.has(deviceInvalid.id!)).toBe(true)
      expect(store.deviceClients.has(deviceInvalid.id!)).toBe(false)
      expect(mockedCreateAlpacaClient).not.toHaveBeenCalled()

      expect(mockEmitEvent).toHaveBeenCalledTimes(1)
      const emittedEvent = mockEmitEvent.mock.calls[0][0]
      expect(emittedEvent.type).toBe('deviceAdded')
      if (emittedEvent.type === 'deviceAdded') {
        expect(emittedEvent.device).toHaveProperty('id', deviceInvalid.id)
      }
    })

    it('should add device, but not create client if client creation (imported fn) throws; emits event', () => {
      const deviceWithFailingClient: Partial<Device> = {
        id: 'fail-device-1:127.0.0.1:11111:camera:0',
        name: 'Test Camera Fail',
        type: 'camera',
        deviceNum: 0,
        apiBaseUrl: 'http://127.0.0.1:11111/api/v1/camera/0'
      }
      mockedCreateAlpacaClient.mockImplementationOnce((..._args: unknown[]) => {
        throw new Error('Simulated client creation failure')
      })

      const result = store.addDevice(deviceWithFailingClient, addDeviceOptionsDefault)
      expect(result).toBe(true)
      expect(store.devices.has(deviceWithFailingClient.id!)).toBe(true)
      expect(store.deviceClients.has(deviceWithFailingClient.id!)).toBe(false)
      expect(mockedCreateAlpacaClient).toHaveBeenCalledTimes(1)

      expect(mockEmitEvent).toHaveBeenCalledTimes(1)
      const emittedEvent = mockEmitEvent.mock.calls[0][0]
      expect(emittedEvent.type).toBe('deviceAdded')
      if (emittedEvent.type === 'deviceAdded') {
        expect(emittedEvent.device).toHaveProperty('id', deviceWithFailingClient.id)
      }
    })

    it('should not emit deviceAdded event if options.silent is true', () => {
      store.addDevice(sampleDevice, addDeviceOptionsSilent)
      // Check that it was not called with 'deviceAdded', but other events might still occur if not scoped properly.
      // To be very specific:
      const deviceAddedCalls = mockEmitEvent.mock.calls.filter((call) => {
        const event = call[0] // call[0] is the DeviceEvent object
        return event.type === 'deviceAdded'
      })
      expect(deviceAddedCalls.length).toBe(0)
    })
  })

  describe('removeDevice', () => {
    const deviceId1 = 'test-cam-1:127.0.0.1:11111:camera:0'
    const device1: Partial<Device> = {
      id: deviceId1,
      name: 'Test Camera 1',
      type: 'camera',
      deviceNum: 0,
      apiBaseUrl: 'http://127.0.0.1:11111/api/v1/camera/0'
    }
    const deviceId2 = 'test-scope-2:127.0.0.1:11112:telescope:0'
    const device2: Partial<Device> = {
      id: deviceId2,
      name: 'Test Scope 2',
      type: 'telescope',
      deviceNum: 0,
      apiBaseUrl: 'http://127.0.0.1:11112/api/v1/telescope/0'
    }

    beforeEach(() => {
      // Add a couple of devices for testing removal
      store.addDevice(device1)
      store.addDevice(device2)
      // Clear mocks that might have been called during addDevice
      mockEmitEvent.mockClear()
      mockedCreateAlpacaClient.mockClear()
    })

    it('should remove an existing device successfully', () => {
      expect(store.devices.has(deviceId1)).toBe(true)
      expect(store.deviceClients.has(deviceId1)).toBe(true)
      const initialArrayLength = store.devicesArray.length

      const result = store.removeDevice(deviceId1)

      expect(result).toBe(true)
      expect(store.devices.has(deviceId1)).toBe(false)
      expect(store.devicesArray.length).toBe(initialArrayLength - 1)
      expect(store.devicesArray.find((d) => d.id === deviceId1)).toBeUndefined()
      expect(store.deviceClients.has(deviceId1)).toBe(false) // Client should be removed
    })

    it('should emit deviceRemoved event when a device is removed', () => {
      store.removeDevice(deviceId1)
      expect(mockEmitEvent).toHaveBeenCalledTimes(1)
      const emittedEvent = mockEmitEvent.mock.calls[0][0]
      expect(emittedEvent.type).toBe('deviceRemoved')
      if (emittedEvent.type === 'deviceRemoved') {
        expect(emittedEvent.deviceId).toBe(deviceId1)
      }
    })

    it('should not emit deviceRemoved event if options.silent is true', () => {
      store.removeDevice(deviceId1, { silent: true })
      expect(mockEmitEvent).not.toHaveBeenCalled()
    })

    it('should return false and not emit event when trying to remove a non-existent device', () => {
      const nonExistentDeviceId = 'non-existent-device'
      const result = store.removeDevice(nonExistentDeviceId)

      expect(result).toBe(false)
      expect(store.devices.size).toBe(2) // No change in size
      expect(mockEmitEvent).not.toHaveBeenCalled()
    })

    it('should clear selectedDeviceId if the selected device is removed', () => {
      store.selectDevice(deviceId1) // Select the device first
      expect(store.selectedDeviceId).toBe(deviceId1)

      store.removeDevice(deviceId1)

      expect(store.selectedDeviceId).toBeNull()
      // Also check event for selection change or deviceRemoved is still correct
      expect(mockEmitEvent).toHaveBeenCalledTimes(1) // Only deviceRemoved should be emitted
      const emittedEvent = mockEmitEvent.mock.calls[0][0] // Check the first (and only) event
      expect(emittedEvent.type).toBe('deviceRemoved')
      if (emittedEvent.type === 'deviceRemoved') {
        expect(emittedEvent.deviceId).toBe(deviceId1)
      }
    })

    it('should not change selectedDeviceId if a different device is removed', () => {
      store.selectDevice(deviceId1) // Select device1
      expect(store.selectedDeviceId).toBe(deviceId1)
      mockEmitEvent.mockClear() // Clear events from selectDevice or previous

      store.removeDevice(deviceId2) // Remove device2

      expect(store.selectedDeviceId).toBe(deviceId1) // Selection should persist
      expect(mockEmitEvent).toHaveBeenCalledTimes(1)
      const emittedEvent = mockEmitEvent.mock.calls[0][0]
      expect(emittedEvent.type).toBe('deviceRemoved')
      if (emittedEvent.type === 'deviceRemoved') {
        expect(emittedEvent.deviceId).toBe(deviceId2)
      }
    })

    // TODO: Test for module-specific cleanup being called if coreActions.removeDevice handles this.
    // This might require spying on specific methods if coreActions directly invokes them, or be part of device-specific module tests.
  })

  describe('updateDevice', () => {
    const deviceId = 'test-update-dev:127.0.0.1:11111:camera:0'
    const initialDevice: Partial<Device> = {
      id: deviceId,
      name: 'Initial Name',
      type: 'camera',
      deviceNum: 0,
      apiBaseUrl: 'http://127.0.0.1:11111/api/v1/camera/0',
      properties: { customProp: 'initialValue' }
    }

    beforeEach(() => {
      store.addDevice(initialDevice)
      mockEmitEvent.mockClear()
      mockedCreateAlpacaClient.mockClear()
    })

    it('should update properties of an existing device', () => {
      const updates: Partial<Device> = {
        name: 'Updated Name',
        properties: { ...initialDevice.properties, customProp: 'updatedValue', newProp: 123 }
      }
      const result = store.updateDevice(deviceId, updates)

      expect(result).toBe(true)
      const updatedDevice = store.getDeviceById(deviceId)
      expect(updatedDevice).toBeDefined()
      expect(updatedDevice?.name).toBe('Updated Name')
      expect(updatedDevice?.properties?.customProp).toBe('updatedValue')
      expect(updatedDevice?.properties?.newProp).toBe(123)
    })

    it('should emit deviceUpdated event with updates', () => {
      const updates: Partial<Device> = { name: 'Event Name' }
      store.updateDevice(deviceId, updates)

      expect(mockEmitEvent).toHaveBeenCalledTimes(1)
      const emittedEvent = mockEmitEvent.mock.calls[0][0]
      expect(emittedEvent.type).toBe('deviceUpdated')
      if (emittedEvent.type === 'deviceUpdated') {
        expect(emittedEvent.deviceId).toBe(deviceId)
        // Check that the updates object within the event contains the name change
        expect(emittedEvent.updates).toEqual(expect.objectContaining({ name: 'Event Name' }))
      }
    })

    it('should not emit deviceUpdated event if options.silent is true', () => {
      const updates: Partial<Device> = { name: 'Silent Update' }
      store.updateDevice(deviceId, updates, { silent: true })
      expect(mockEmitEvent).not.toHaveBeenCalled()
    })

    it('should recreate alpaca client if apiBaseUrl changes', () => {
      const newApiBaseUrl = 'http://127.0.0.1:22222/api/v1/camera/0'
      const updates: Partial<Device> = { apiBaseUrl: newApiBaseUrl }

      // Ensure a client exists initially
      expect(store.deviceClients.has(deviceId)).toBe(true)
      const oldClient = store.getDeviceClient(deviceId)

      store.updateDevice(deviceId, updates)

      expect(mockedCreateAlpacaClient).toHaveBeenCalledTimes(1)
      expect(mockedCreateAlpacaClient).toHaveBeenCalledWith(
        newApiBaseUrl,
        initialDevice.type,
        initialDevice.deviceNum,
        expect.objectContaining({ id: deviceId, apiBaseUrl: newApiBaseUrl })
      )

      const newClient = store.getDeviceClient(deviceId)
      expect(newClient).not.toBe(oldClient) // A new client instance should have been created
      expect(store.deviceClients.has(deviceId)).toBe(true) // Client should still exist or be replaced
    })

    it('should not recreate alpaca client if apiBaseUrl does not change', () => {
      const updates: Partial<Device> = { name: 'No URL Change' }
      store.updateDevice(deviceId, updates)
      expect(mockedCreateAlpacaClient).not.toHaveBeenCalled()
    })

    it('should return false if device does not exist and not emit event', () => {
      const nonExistentDeviceId = 'non-existent'
      const updates: Partial<Device> = { name: 'Non Existent Update' }
      const result = store.updateDevice(nonExistentDeviceId, updates)

      expect(result).toBe(false)
      expect(mockEmitEvent).not.toHaveBeenCalled()
    })
  })

  describe('updateDeviceProperties', () => {
    const deviceId = 'test-props-dev:127.0.0.1:11111:camera:0'
    const initialDevice: Partial<Device> = {
      id: deviceId,
      name: 'Initial Props Name',
      type: 'camera',
      deviceNum: 0,
      properties: { temperature: 25, connected: false },
      capabilities: { canSetTemperature: true } // Example capability
    }
    let mockUpdateDeviceCapabilities: MockInstance<(deviceId: string) => boolean> // Spy for updateDeviceCapabilities

    beforeEach(() => {
      store.addDevice(initialDevice)
      // Spy on updateDeviceCapabilities. It's an action on the store itself.
      mockUpdateDeviceCapabilities = vi.spyOn(store, 'updateDeviceCapabilities')
      mockEmitEvent.mockClear()
    })

    it('should update specific device properties and keep others', () => {
      const propertiesToUpdate = { temperature: 10, status: 'cooling' }
      const result = store.updateDeviceProperties(deviceId, propertiesToUpdate)

      expect(result).toBe(true)
      const updatedDevice = store.getDeviceById(deviceId)
      expect(updatedDevice?.properties?.temperature).toBe(10)
      expect(updatedDevice?.properties?.status).toBe('cooling')
      expect(updatedDevice?.properties?.connected).toBe(false) // Initial property should remain
    })

    it('should emit devicePropertyChanged event for each changed property', () => {
      const propertiesToUpdate = { temperature: 5, humidity: 50 }
      store.updateDeviceProperties(deviceId, propertiesToUpdate)

      expect(mockEmitEvent).toHaveBeenCalledTimes(2) // Once for each property

      const propChangeEvent1 = mockEmitEvent.mock.calls[0][0]
      expect(propChangeEvent1.type).toBe('devicePropertyChanged')
      if (propChangeEvent1.type === 'devicePropertyChanged') {
        expect(propChangeEvent1.deviceId).toBe(deviceId)
        expect(propChangeEvent1.property).toBe('temperature')
        expect(propChangeEvent1.value).toBe(5)
      }

      const propChangeEvent2 = mockEmitEvent.mock.calls[1][0]
      expect(propChangeEvent2.type).toBe('devicePropertyChanged')
      if (propChangeEvent2.type === 'devicePropertyChanged') {
        expect(propChangeEvent2.deviceId).toBe(deviceId)
        expect(propChangeEvent2.property).toBe('humidity')
        expect(propChangeEvent2.value).toBe(50)
      }
    })

    it('should not emit devicePropertyChanged if property value does not change', () => {
      const propertiesToUpdate = { temperature: 25 } // Same as initial
      store.updateDeviceProperties(deviceId, propertiesToUpdate)
      expect(mockEmitEvent).not.toHaveBeenCalledWith('devicePropertyChanged', expect.anything())
    })

    it('should call updateDeviceCapabilities after updating properties', () => {
      const propertiesToUpdate = { canAbortExposure: true }
      store.updateDeviceProperties(deviceId, propertiesToUpdate)
      expect(mockUpdateDeviceCapabilities).toHaveBeenCalledTimes(1)
      expect(mockUpdateDeviceCapabilities).toHaveBeenCalledWith(deviceId)
    })

    it('should return false if device does not exist and not emit events or call capability update', () => {
      const nonExistentDeviceId = 'non-existent'
      const propertiesToUpdate = { temperature: 0 }
      const result = store.updateDeviceProperties(nonExistentDeviceId, propertiesToUpdate)

      expect(result).toBe(false)
      expect(mockEmitEvent).not.toHaveBeenCalled()
      expect(mockUpdateDeviceCapabilities).not.toHaveBeenCalled()
    })

    // Consider a test where some properties update and some don't, to check emit count precisely.
    it('should only emit for properties that actually change value', () => {
      const propertiesToUpdate = { temperature: 15, connected: false } // 'connected' is not changing
      store.updateDeviceProperties(deviceId, propertiesToUpdate)

      expect(mockEmitEvent).toHaveBeenCalledTimes(1)
      const emittedEvent = mockEmitEvent.mock.calls[0][0]
      expect(emittedEvent.type).toBe('devicePropertyChanged')
      if (emittedEvent.type === 'devicePropertyChanged') {
        expect(emittedEvent.deviceId).toBe(deviceId)
        expect(emittedEvent.property).toBe('temperature')
        expect(emittedEvent.value).toBe(15)
      }
      // Check that no event was emitted for 'connected'
      mockEmitEvent.mock.calls.forEach((call) => {
        const event = call[0]
        if (event.type === 'devicePropertyChanged') {
          expect(event.property).not.toBe('connected')
        }
      })
    })
  })

  describe('connectDevice', () => {
    const deviceId = 'test-connect-dev:127.0.0.1:11111:camera:0'
    const device: Partial<Device> = {
      id: deviceId,
      name: 'Test Connect Camera',
      type: 'camera',
      deviceNum: 0,
      apiBaseUrl: 'http://127.0.0.1:11111/api/v1/camera/0',
      properties: { connected: false, isConnecting: false }
    }
    let mockDeviceClient: AlpacaClient
    let mockFetchCameraProperties: MockInstance<(deviceId: string, options?: StoreOptions) => Promise<boolean | undefined>>

    beforeEach(() => {
      store.addDevice(device) // Add the device for connection tests
      mockEmitEvent.mockClear()
      mockedCreateAlpacaClient.mockClear() // Clear this as addDevice calls it

      // Spy on fetchCameraProperties for the store instance
      // Ensure this is done after store is initialized and reset per test if needed
      mockFetchCameraProperties = vi.spyOn(store, 'fetchCameraProperties').mockResolvedValue(true) // Mock implementation

      const clientInstance = store.getDeviceClient(deviceId)
      if (clientInstance) {
        mockDeviceClient = clientInstance
        vi.spyOn(mockDeviceClient, 'setProperty').mockResolvedValue({
          ClientTransactionID: 1,
          ServerTransactionID: 1,
          ErrorNumber: 0,
          ErrorMessage: ''
        })
      } else {
        // Fallback or throw if client isn't found, though setup should ensure it is.
        // For robust testing, we might mock createAlpacaClient to return a spy-able instance directly for each test.
        // The current setup in the global beforeEach for mockedCreateAlpacaClient
        // should provide a default mock. We might need to enhance it to customize behavior per test.
        // Re-configure the global mock if a specific instance isn't easily retrievable or needs fresh mocks.
        // This is tricky due to the global mock setup.
        // A simpler way for connect/disconnect might be to directly access the client from deviceClients map
        // and then spyOn its methods.
      }
    })

    it('should successfully connect a device, update state, and emit deviceConnected', async () => {
      // Ensure client mock for setProperty is correctly set up for 'Connected'
      // The client is fetched via getDeviceClient within connectDevice
      const client = store.getDeviceClient(deviceId)
      if (!client) throw new Error('Client not found for device in test setup')

      // Mock setProperty on the specific client instance used by connectDevice
      const mockSetProperty = vi.spyOn(client, 'setProperty').mockResolvedValue({
        ClientTransactionID: 1,
        ServerTransactionID: 1,
        ErrorNumber: 0,
        ErrorMessage: ''
      })
      // Also mock setConnected if that's the primary method used by the client for connection status
      // const mockSetConnected = vi.spyOn(client, 'setConnected').mockResolvedValue(undefined)

      await store.connectDevice(deviceId)

      const updatedDevice = store.getDeviceById(deviceId)
      console.log('mockSetProperty calls:', JSON.stringify(mockSetProperty.mock.calls, null, 2))
      console.log('Updated device properties after connect:', JSON.stringify(updatedDevice?.properties, null, 2))
      expect(updatedDevice?.properties?.isConnecting).toBe(false)
      expect(updatedDevice?.properties?.connected).toBe(true)
      expect(updatedDevice?.status).toBe('connected') // Check top-level status

      expect(mockSetProperty).toHaveBeenCalledWith('connected', true)

      // Check specifically for the deviceConnected event
      const deviceConnectedEventCall = mockEmitEvent.mock.calls.find((call) => call[0].type === 'deviceConnected')
      expect(deviceConnectedEventCall).toBeDefined()
      if (deviceConnectedEventCall) {
        const eventPayload = deviceConnectedEventCall[0] as DeviceEvent
        // Add a type guard for the specific event type
        if (eventPayload.type === 'deviceConnected') {
          expect(eventPayload.deviceId).toBe(deviceId)
        } else {
          // This should not be reached if the .find() is correct
          expect('Expected deviceConnected event, got ' + eventPayload.type).toBe('eventMismatch')
        }
      }

      // Verify that fetchCameraProperties was called
      expect(mockFetchCameraProperties).toHaveBeenCalledTimes(1)
      expect(mockFetchCameraProperties).toHaveBeenCalledWith(deviceId)
    })

    it('should do nothing and return true if device is already connected', async () => {
      // First connection
      await store.connectDevice(deviceId)
      const initiallyConnectedDevice = store.getDeviceById(deviceId)
      expect(initiallyConnectedDevice?.isConnected).toBe(true)
      expect(initiallyConnectedDevice?.properties?.connected).toBe(true)

      // Clear mocks before the second call
      const client = store.getDeviceClient(deviceId)
      if (!client) throw new Error('Client not found after first connect')
      const mockSetProperty = vi.spyOn(client, 'setProperty').mockClear() // Clear calls from first connect
      mockEmitEvent.mockClear() // Clear events from first connect

      // Attempt to connect again
      const result = await store.connectDevice(deviceId)
      expect(result).toBe(true)

      const deviceAfterSecondAttempt = store.getDeviceById(deviceId)
      // Ensure state hasn't negatively changed
      expect(deviceAfterSecondAttempt?.isConnected).toBe(true)
      expect(deviceAfterSecondAttempt?.properties?.connected).toBe(true)
      expect(deviceAfterSecondAttempt?.properties?.isConnecting).toBe(false)
      expect(deviceAfterSecondAttempt?.status).toBe('connected')

      // Ensure no redundant client calls or events
      expect(mockSetProperty).not.toHaveBeenCalled()
      expect(mockEmitEvent).not.toHaveBeenCalled()
    })

    it('should handle connection failure, update state, and emit deviceConnectionError', async () => {
      const errorMessage = 'Simulated connection failure'

      if (!mockDeviceClient) throw new Error('mockDeviceClient not set up in beforeEach for connectDevice suite')

      // Directly mock the implementation of the setProperty method on the mockDeviceClient
      const spiedSetProperty = mockDeviceClient.setProperty as unknown as MockInstance<
        (propertyName: string, value: unknown, options?: RequestOptions) => Promise<unknown>
      >

      spiedSetProperty.mockImplementation(async (propName: string, value: unknown, _options?: RequestOptions) => {
        if (propName === 'connected' && value === true) {
          console.log('[TEST MOCK] setProperty("connected", true) throwing error') // Test debug
          throw new Error(errorMessage)
        }
        // Fallback for any other setProperty calls on this client during this test
        console.log(`[TEST MOCK] setProperty('${propName}', ...) called, resolving normally`) // Test debug
        return { ClientTransactionID: 0, ServerTransactionID: 0, ErrorNumber: 0, ErrorMessage: '' }
      })

      mockEmitEvent.mockClear() // Clear any events from addDevice or previous test runs on this device

      await expect(store.connectDevice(deviceId)).resolves.toBe(false)

      const updatedDevice = store.getDeviceById(deviceId)
      expect(updatedDevice?.properties?.isConnecting).toBe(false)
      expect(updatedDevice?.isConnected).toBe(false) // Top-level isConnected
      expect(updatedDevice?.properties?.connected).toBe(false) // Property connected
      expect(updatedDevice?.status).toBe('error')

      // Verify that the mocked setProperty was indeed called as expected
      expect(mockDeviceClient.setProperty).toHaveBeenCalledWith('connected', true)

      // Check for deviceConnectionError event
      const connectionErrorEvent = mockEmitEvent.mock.calls.find((call) => call[0].type === 'deviceConnectionError')
      expect(connectionErrorEvent).toBeDefined()
      if (connectionErrorEvent) {
        const eventPayload = connectionErrorEvent[0]
        if (eventPayload.type === 'deviceConnectionError') {
          expect(eventPayload.deviceId).toBe(deviceId)
          expect(eventPayload.error).toContain(errorMessage)
        }
      }
    })
  })

  // Next: describe('disconnectDevice', () => { ... })
})
