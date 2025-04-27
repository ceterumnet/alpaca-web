import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import EnhancedCameraPanelMigrated from '../../src/components/EnhancedCameraPanelMigrated.vue'
import UnifiedStore from '../../src/stores/UnifiedStore'
import { CameraDevice } from '../../src/types/DeviceTypes'

// Mock the UnifiedStore
vi.mock('../../src/stores/UnifiedStore', () => {
  const on = vi.fn()
  const off = vi.fn()
  const getDeviceById = vi.fn()
  const updateDeviceProperties = vi.fn()
  const emit = vi.fn()

  return {
    default: vi.fn().mockImplementation(() => ({
      on,
      off,
      getDeviceById,
      updateDeviceProperties,
      emit
    }))
  }
})

describe('EnhancedCameraPanelMigrated.vue', () => {
  let wrapper: VueWrapper
  let mockStore: UnifiedStore

  const mockCamera: CameraDevice = {
    id: 'camera1',
    name: 'Test Camera',
    type: 'camera',
    isConnected: true,
    isConnecting: false,
    isDisconnecting: false,
    properties: {
      exposureTime: 0.5,
      gain: 10,
      offset: 5,
      readoutMode: 1,
      isExposing: false,
      coolerEnabled: true,
      currentTemperature: -5,
      targetTemperature: -10,
      capabilities: {
        minExposureTime: 0.001,
        maxExposureTime: 3600,
        minGain: 0,
        maxGain: 100,
        minOffset: 0,
        maxOffset: 100,
        canAdjustOffset: true,
        canAdjustReadMode: true
      }
    }
  }

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Setup mock store
    mockStore = new UnifiedStore()

    // Setup getDeviceById to return our mock camera
    vi.mocked(mockStore.getDeviceById).mockReturnValue(mockCamera)

    // Mount the component
    wrapper = mount(EnhancedCameraPanelMigrated, {
      props: {
        panelName: 'Camera Panel',
        connected: true,
        deviceType: 'camera',
        deviceId: 'camera1',
        idx: '1',
        deviceNum: 1
      }
    })
  })

  it('renders correctly with camera data', async () => {
    // Check if camera name is displayed
    expect(wrapper.text()).toContain('Camera 1')

    // Check if connection status is displayed
    expect(wrapper.text()).toContain('Connected')

    // Check if exposure time is displayed and matches the camera data
    const exposureDisplay = wrapper.find('[data-test="exposure-time"]')
    expect(exposureDisplay.exists()).toBe(true)
    expect(exposureDisplay.element.getAttribute('value')).toBe('0.5')
  })

  it('registers event listeners on mount when connected', () => {
    // Should register devicePropertyChanged event listener
    expect(mockStore.on).toHaveBeenCalledWith('devicePropertyChanged', expect.any(Function))
  })

  it('unregisters event listeners on unmount', () => {
    // Unmount the component
    wrapper.unmount()

    // Should unregister devicePropertyChanged event listener
    expect(mockStore.off).toHaveBeenCalledWith('devicePropertyChanged', expect.any(Function))
  })

  it('toggles connection when connect button is clicked', async () => {
    // Find and click the connect button
    const connectButton = wrapper.find('[data-test="connect-button"]')
    await connectButton.trigger('click')

    // Should emit the connect event with the inverted connection state
    expect(wrapper.emitted().connect).toBeTruthy()
    expect(wrapper.emitted().connect[0]).toEqual([false]) // Since mockCamera.isConnected was true
  })

  it('starts an exposure when the start exposure button is clicked', async () => {
    // Find and click the start exposure button
    const startButton = wrapper.find('[data-test="start-exposure-button"]')
    await startButton.trigger('click')

    // Should emit the start-exposure event with the exposure time
    expect(wrapper.emitted()['start-exposure']).toBeTruthy()
    expect(wrapper.emitted()['start-exposure'][0]).toEqual([0.5])
  })

  it('aborts an exposure when the abort button is clicked during exposure', async () => {
    // First, set the camera as exposing
    vi.mocked(mockStore.getDeviceById).mockReturnValue({
      ...mockCamera,
      properties: {
        ...mockCamera.properties,
        isExposing: true
      }
    })

    // Re-mount to ensure the new data is used
    wrapper = mount(EnhancedCameraPanelMigrated, {
      props: {
        panelName: 'Camera Panel',
        connected: true,
        deviceType: 'camera',
        deviceId: 'camera1',
        idx: '1',
        deviceNum: 1
      }
    })

    await nextTick()

    // Find and click the abort button
    const abortButton = wrapper.find('[data-test="abort-exposure-button"]')
    await abortButton.trigger('click')

    // Should emit the abort-exposure event
    expect(wrapper.emitted()['abort-exposure']).toBeTruthy()
  })

  it('updates exposure time when changed', async () => {
    // Find and update the exposure time input
    const exposureInput = wrapper.find('[data-test="exposure-time-input"]')
    await exposureInput.setValue(1.0)
    await exposureInput.trigger('change')

    // Should update the store with the new exposure time
    expect(mockStore.updateDeviceProperties).toHaveBeenCalledWith('camera1', {
      exposureTime: 1.0
    })
  })

  it('updates gain when changed', async () => {
    // Find and update the gain input
    const gainInput = wrapper.find('[data-test="gain-input"]')
    await gainInput.setValue(20)
    await gainInput.trigger('change')

    // Should emit the set-gain event with the new gain value
    expect(wrapper.emitted()['set-gain']).toBeTruthy()
    expect(wrapper.emitted()['set-gain'][0]).toEqual([20])
  })

  it('updates offset when changed', async () => {
    // Find and update the offset input
    const offsetInput = wrapper.find('[data-test="offset-input"]')
    await offsetInput.setValue(15)
    await offsetInput.trigger('change')

    // Should emit the set-offset event with the new offset value
    expect(wrapper.emitted()['set-offset']).toBeTruthy()
    expect(wrapper.emitted()['set-offset'][0]).toEqual([15])
  })

  it('updates readout mode when changed', async () => {
    // Find and update the readout mode select
    const readModeSelect = wrapper.find('[data-test="read-mode-select"]')
    await readModeSelect.setValue(2)
    await readModeSelect.trigger('change')

    // Should emit the set-read-mode event with the new mode value
    expect(wrapper.emitted()['set-read-mode']).toBeTruthy()
    expect(wrapper.emitted()['set-read-mode'][0]).toEqual([2])
  })

  it('toggles cooler when cooler button is clicked', async () => {
    // Find and click the cooler toggle button
    const coolerToggle = wrapper.find('[data-test="cooler-toggle"]')
    await coolerToggle.trigger('click')

    // Should emit the set-cooler event with the inverted cooler state
    expect(wrapper.emitted()['set-cooler']).toBeTruthy()
    expect(wrapper.emitted()['set-cooler'][0]).toEqual([false, undefined])
  })

  it('updates target temperature when changed', async () => {
    // Find and update the target temperature input
    const tempInput = wrapper.find('[data-test="target-temp-input"]')
    await tempInput.setValue(-15)
    await tempInput.trigger('change')

    // Should emit the set-cooler event with the new target temperature
    expect(wrapper.emitted()['set-cooler']).toBeTruthy()
    expect(wrapper.emitted()['set-cooler'][0]).toEqual([true, -15])
  })

  it('handles property changes from the store', async () => {
    // Get the handlePropertyChange function that was registered
    const handlePropertyChange = vi
      .mocked(mockStore.on)
      .mock.calls.find((call) => call[0] === 'devicePropertyChanged')?.[1]

    expect(handlePropertyChange).toBeDefined()

    if (handlePropertyChange) {
      // Access component instance with type assertion
      const vm = wrapper.vm as any

      // Create a mock for fetchImage using type assertion
      const fetchImageMock = vi.fn()
      vm.fetchImage = fetchImageMock

      // Call the handler with an isExposing=false property change
      handlePropertyChange('camera1', 'isExposing', false)

      // Should call fetchImage
      expect(fetchImageMock).toHaveBeenCalled()
    }
  })
})
