import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import EnhancedCameraPanelMigrated from '../../src/components/EnhancedCameraPanelMigrated.vue'
import { useUnifiedStore } from '../../src/stores/UnifiedStore'
import { useUIPreferencesStore } from '../../src/stores/useUIPreferencesStore'
import { createPinia, setActivePinia } from 'pinia'
import type { CameraDevice } from '../../src/types/DeviceTypes'

// Mock camera data
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

// Mock the UnifiedStore
const mockOn = vi.fn()
const mockOff = vi.fn()
const mockEmit = vi.fn()
const mockGetDeviceById = vi.fn((id) => {
  if (id === 'camera1') return mockCamera
  return null
})
const mockUpdateDeviceProperties = vi.fn()

vi.mock('../../src/stores/UnifiedStore', () => {
  return {
    useUnifiedStore: () => ({
      getDeviceById: mockGetDeviceById,
      updateDeviceProperties: mockUpdateDeviceProperties,
      emit: mockEmit,
      on: mockOn,
      off: mockOff
    })
  }
})

// Mock the UIPreferencesStore
vi.mock('../../src/stores/useUIPreferencesStore', () => {
  return {
    UIMode: {
      OVERVIEW: 'overview',
      DETAILED: 'detailed',
      FULLSCREEN: 'fullscreen'
    },
    useUIPreferencesStore: () => ({
      getDeviceUIMode: vi.fn(() => 'overview'),
      setDeviceUIMode: vi.fn(),
      isSidebarVisible: true
    })
  }
})

// Mock the EnhancedPanelComponentMigrated component
vi.mock('../../src/components/EnhancedPanelComponentMigrated.vue', () => ({
  default: {
    name: 'EnhancedPanelComponentMigrated',
    template: `
      <div>
        <slot name="content"></slot>
        <slot name="overview-content"></slot>
        <slot name="detailed-content"></slot>
        <slot name="top-status-bar"></slot>
        <button 
          v-if="!connected" 
          data-test="connect-button" 
          @click="$emit('connect')"
        >
          Connect
        </button>
        <button 
          v-else 
          data-test="connect-button" 
          @click="$emit('connect')"
        >
          Disconnect
        </button>
      </div>
    `,
    props: ['panelName', 'connected', 'deviceType', 'deviceId', 'supportedModes'],
    emits: ['close', 'configure', 'connect', 'modeChange']
  }
}))

// Mock the Icon component
vi.mock('../../src/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    template: '<div class="icon">{{ type }}</div>',
    props: ['type']
  }
}))

describe('EnhancedCameraPanelMigrated.vue', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Create a fresh Pinia instance and make it active
    setActivePinia(createPinia())

    // Get store instances
    useUnifiedStore()
    useUIPreferencesStore()

    // Mount the component
    wrapper = mount(EnhancedCameraPanelMigrated, {
      props: {
        panelName: 'Camera Panel',
        connected: true,
        deviceType: 'camera',
        deviceId: 'camera1',
        idx: '1',
        deviceNum: 1
      },
      global: {
        plugins: [createPinia()],
        stubs: {
          Icon: true
        }
      }
    })
  })

  it('renders correctly with camera data', async () => {
    // Check if camera name is displayed (from computed property)
    const panelComponent = wrapper.findComponent({ name: 'EnhancedPanelComponentMigrated' })
    expect(panelComponent.props('panelName')).toMatch(/Camera/)

    // Check for exposure time or other controls by class name instead of data-test
    expect(
      wrapper.find('.exposure-time').exists() || wrapper.find('input[type="number"]').exists()
    ).toBe(true)
  })

  it('registers event listeners on mount when connected', () => {
    // Should register devicePropertyChanged event listener
    expect(mockOn).toHaveBeenCalledWith('devicePropertyChanged', expect.any(Function))
  })

  it('unregisters event listeners on unmount', () => {
    // Unmount the component
    wrapper.unmount()

    // Should unregister devicePropertyChanged event listener
    expect(mockOff).toHaveBeenCalledWith('devicePropertyChanged', expect.any(Function))
  })

  it('toggles connection when connect button is clicked', async () => {
    // Find and click the connect button
    const connectButton = wrapper.find('[data-test="connect-button"]')
    await connectButton.trigger('click')

    // Should emit the connect event with the inverted connection state
    expect(wrapper.emitted().connect).toBeTruthy()
  })

  it('handles property changes from the store', async () => {
    // Mock console.log
    const originalConsoleLog = console.log
    console.log = vi.fn()

    try {
      // Get the bound property change handler function that was registered
      const propertyChangeFn = mockOn.mock.calls.find(
        (call) => call[0] === 'devicePropertyChanged'
      )?.[1]
      expect(propertyChangeFn).toBeDefined()

      if (propertyChangeFn) {
        // Verify the handler can be called without errors
        propertyChangeFn('camera1', 'isExposing', false)

        // Check that the fetchImage method was called indirectly via console.log
        expect(console.log).toHaveBeenCalledWith('Fetching image')
      }
    } finally {
      // Restore console.log
      console.log = originalConsoleLog
    }
  })
})
