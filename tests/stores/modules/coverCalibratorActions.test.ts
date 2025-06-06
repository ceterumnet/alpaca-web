import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import type { UnifiedStoreType } from '@/stores/UnifiedStore'
import type { CoverCalibratorClient } from '@/api/alpaca/covercalibrator-client'
import type { Device, DeviceEvent } from '@/stores/types/device-store.types'
import { createAlpacaClient } from '@/api/AlpacaClient' // Import the actual factory
import type { MockInstance } from 'vitest'
import type { CoverCalibratorDevice } from '@/types/device.types'

// Define a more concrete type for the mock client instance
interface MockedCoverCalibratorClientMethods {
  getCoverCalibratorState: MockInstance<() => Promise<Record<string, unknown>>>
  put: MockInstance<(method: string, params: Record<string, unknown>) => Promise<void>>
  // Add other methods from CoverCalibratorClient if they exist and need to be mocked,
  // otherwise this partial interface is fine as long as it covers what's used.
}

const mockCoverCalibratorClientInstance: MockedCoverCalibratorClientMethods = {
  getCoverCalibratorState: vi.fn(),
  put: vi.fn()
}

vi.mock('@/api/AlpacaClient', () => ({
  createAlpacaClient: vi.fn(() => mockCoverCalibratorClientInstance as unknown as CoverCalibratorClient)
}))

vi.mock('@/api/alpaca/covercalibrator-client', () => ({
  CoverCalibratorClient: vi.fn(() => mockCoverCalibratorClientInstance as unknown as CoverCalibratorClient)
}))

describe('coverCalibratorActions', () => {
  let store: UnifiedStoreType
  let mockEmitEvent: MockInstance<(event: DeviceEvent) => void>
  let mockedCreateAlpacaClient: MockInstance<
    (baseUrl: string, deviceType: string, deviceNumber: number | undefined, device: Device) => CoverCalibratorClient
  >

  const deviceId = 'covercalibrator-1'
  const mockDevice: Device = {
    id: deviceId,
    deviceNumber: 0,
    type: 'covercalibrator',
    name: 'Test CoverCalibrator',
    isConnected: true,
    isConnecting: false,
    isDisconnecting: false,
    status: 'idle',
    apiBaseUrl: 'http://localhost:11111',
    properties: {}
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useUnifiedStore()

    store.addDevice(mockDevice)

    vi.clearAllMocks() // Clears call counts, etc., for all mocks

    // Reset the mock implementations for client methods before each test
    mockCoverCalibratorClientInstance.getCoverCalibratorState.mockReset()
    mockCoverCalibratorClientInstance.put.mockReset()

    mockEmitEvent = vi.spyOn(store, '_emitEvent') as MockInstance<(event: DeviceEvent) => void>
    vi.spyOn(store, 'getDeviceById').mockReturnValue(mockDevice)
    // Ensure getDeviceClient returns our specifically typed mock instance, cast to the full client type
    vi.spyOn(store, 'getDeviceClient').mockReturnValue(mockCoverCalibratorClientInstance as unknown as CoverCalibratorClient)

    mockedCreateAlpacaClient = createAlpacaClient as unknown as MockInstance<
      (baseUrl: string, deviceType: string, deviceNumber: number | undefined, device: Device) => CoverCalibratorClient
    >
    mockedCreateAlpacaClient.mockReturnValue(mockCoverCalibratorClientInstance as unknown as CoverCalibratorClient)
  })

  afterEach(() => {
    vi.restoreAllMocks() // Restores original implementations if any were spied on and changed globally
  })

  it('should have initial state set up by beforeEach', () => {
    expect(store.getDeviceById(deviceId) as CoverCalibratorDevice).toBeDefined()
    expect((store.getDeviceById(deviceId) as CoverCalibratorDevice).coverState).toBeUndefined()
  })

  // describe('clearCoverCalibratorState', () => {
  //   it('should reset the state for a given deviceId', () => {
  //     store.updateDevice(deviceId, {
  //       coverState: 2,
  //       calibratorState: 3,
  //       currentBrightness: 100,
  //       maxBrightness: 255,
  //       calibratorChanging: false,
  //       coverMoving: false
  //     } as Partial<CoverCalibratorDevice>)
  //     expect(store.getDeviceById(deviceId) as CoverCalibratorDevice).toEqual({
  //       coverState: undefined,
  //       calibratorState: undefined,
  //       currentBrightness: undefined,
  //       maxBrightness: undefined,
  //       calibratorChanging: undefined,
  //       coverMoving: undefined
  //     })
  //   })
  // })

  describe('fetchCoverCalibratorStatus', () => {
    // TODO: Rewrite this test
    // it('should fetch status, update state, and emit devicePropertyChanged on success', async () => {
    //   vi.mocked(mockCoverCalibratorClientInstance.getCoverCalibratorState).mockResolvedValue(mockStatusResponse)
    //   const patchSpy = vi.spyOn(store, '$patch')

    //   await store.fetchCoverCalibratorStatus(deviceId)

    //   expect(store.getDeviceClient).toHaveBeenCalledWith(deviceId)
    //   expect(mockCoverCalibratorClientInstance.getCoverCalibratorState).toHaveBeenCalledTimes(1)

    //   const expectedState = {
    //     coverState: mockStatusResponse.coverstate as number,
    //     calibratorState: mockStatusResponse.calibratorstate as number,
    //     currentBrightness: mockStatusResponse.brightness as number,
    //     maxBrightness: mockStatusResponse.maxbrightness as number,
    //     calibratorChanging: mockStatusResponse.calibratorchanging as boolean,
    //     coverMoving: mockStatusResponse.covermoving as boolean
    //   }
    //   expect(store.getDeviceById(deviceId) as CoverCalibratorDevice).toEqual(expectedState)
    //   expect(patchSpy).toHaveBeenCalledTimes(1)
    //   // Verifying the content of coverCalibratorData is sufficient to test $patch indirectly

    //   expect(mockEmitEvent).toHaveBeenCalledWith({
    //     type: 'devicePropertyChanged',
    //     deviceId,
    //     property: 'coverCalibratorStatus',
    //     value: expect.objectContaining(expectedState)
    //   })
    // })

    // I'm not sure this is a valuable test.
    // it('should handle nullish values from API response', async () => {
    //   const mockStatusNullishData: Record<string, unknown | null | undefined> = {
    //     coverstate: null,
    //     calibratorstate: undefined,
    //     brightness: null,
    //     maxbrightness: undefined,
    //     calibratorchanging: null,
    //     covermoving: undefined
    //   }
    //   vi.mocked(mockCoverCalibratorClientInstance.getCoverCalibratorState).mockResolvedValue(mockStatusNullishData)

    //   await store.fetchCoverCalibratorStatus(deviceId)

    //   const expectedState = {
    //     coverState: undefined,
    //     calibratorState: undefined,
    //     currentBrightness: undefined,
    //     maxBrightness: undefined,
    //     calibratorChanging: undefined,
    //     coverMoving: undefined
    //   }
    //   expect(store.getDeviceById(deviceId) as CoverCalibratorDevice).toEqual(expectedState)
    //   expect(mockEmitEvent).toHaveBeenCalledWith({
    //     type: 'devicePropertyChanged',
    //     deviceId,
    //     property: 'coverCalibratorStatus',
    //     value: expect.objectContaining(expectedState)
    //   })
    // })

    it('should emit deviceApiError if client.getCoverCalibratorState fails', async () => {
      const testError = new Error('API Call Failed')
      vi.mocked(mockCoverCalibratorClientInstance.getCoverCalibratorState).mockRejectedValue(testError)

      await store.fetchCoverCalibratorStatus(deviceId)

      expect(mockEmitEvent).toHaveBeenCalledWith({
        type: 'deviceApiError',
        deviceId,
        action: 'fetchCoverCalibratorStatus',
        error: testError
      })
      expect((store.getDeviceById(deviceId) as CoverCalibratorDevice).brightness).toBeUndefined()
    })
  })

  describe('Control Actions', () => {
    // Test each action directly

    describe('openCover', () => {
      it('should call client.put with opencover, emit event, and refresh status', async () => {
        vi.mocked(mockCoverCalibratorClientInstance.put).mockResolvedValue(undefined)
        const fetchStatusSpy = vi.spyOn(store, 'fetchCoverCalibratorStatus').mockResolvedValue(undefined)
        await store.openCover(deviceId)
        expect(mockCoverCalibratorClientInstance.put).toHaveBeenCalledWith('opencover', {})
        expect(mockEmitEvent).toHaveBeenCalledWith({ type: 'deviceMethodCalled', deviceId, method: 'openCover', args: [], result: 'success' })
        expect(fetchStatusSpy).toHaveBeenCalledWith(deviceId)
      })
    })

    describe('closeCover', () => {
      it('should call client.put with closecover, emit event, and refresh status', async () => {
        vi.mocked(mockCoverCalibratorClientInstance.put).mockResolvedValue(undefined)
        const fetchStatusSpy = vi.spyOn(store, 'fetchCoverCalibratorStatus').mockResolvedValue(undefined)
        await store.closeCover(deviceId)
        expect(mockCoverCalibratorClientInstance.put).toHaveBeenCalledWith('closecover', {})
        expect(mockEmitEvent).toHaveBeenCalledWith({ type: 'deviceMethodCalled', deviceId, method: 'closeCover', args: [], result: 'success' })
        expect(fetchStatusSpy).toHaveBeenCalledWith(deviceId)
      })
    })

    describe('haltCover', () => {
      it('should call client.put with haltcover, emit event, and refresh status', async () => {
        vi.mocked(mockCoverCalibratorClientInstance.put).mockResolvedValue(undefined)
        const fetchStatusSpy = vi.spyOn(store, 'fetchCoverCalibratorStatus').mockResolvedValue(undefined)
        await store.haltCover(deviceId)
        expect(mockCoverCalibratorClientInstance.put).toHaveBeenCalledWith('haltcover', {})
        expect(mockEmitEvent).toHaveBeenCalledWith({ type: 'deviceMethodCalled', deviceId, method: 'haltCover', args: [], result: 'success' })
        expect(fetchStatusSpy).toHaveBeenCalledWith(deviceId)
      })
    })

    describe('calibratorOff', () => {
      it('should call client.put with calibratoroff, emit event, and refresh status', async () => {
        vi.mocked(mockCoverCalibratorClientInstance.put).mockResolvedValue(undefined)
        const fetchStatusSpy = vi.spyOn(store, 'fetchCoverCalibratorStatus').mockResolvedValue(undefined)
        await store.calibratorOff(deviceId)
        expect(mockCoverCalibratorClientInstance.put).toHaveBeenCalledWith('calibratoroff', {})
        expect(mockEmitEvent).toHaveBeenCalledWith({ type: 'deviceMethodCalled', deviceId, method: 'calibratorOff', args: [], result: 'success' })
        expect(fetchStatusSpy).toHaveBeenCalledWith(deviceId)
      })
    })

    describe('calibratorOn', () => {
      const brightness = 100
      it('should call client.put with calibratoron and Brightness, emit event, and refresh status', async () => {
        vi.mocked(mockCoverCalibratorClientInstance.put).mockResolvedValue(undefined)
        const fetchStatusSpy = vi.spyOn(store, 'fetchCoverCalibratorStatus').mockResolvedValue(undefined)
        await store.calibratorOn(deviceId, brightness)
        expect(mockCoverCalibratorClientInstance.put).toHaveBeenCalledWith('calibratoron', { Brightness: brightness })
        expect(mockEmitEvent).toHaveBeenCalledWith({
          type: 'deviceMethodCalled',
          deviceId,
          method: 'calibratorOn',
          args: [brightness],
          result: 'success'
        })
        expect(fetchStatusSpy).toHaveBeenCalledWith(deviceId)
      })
    })
  })
})
