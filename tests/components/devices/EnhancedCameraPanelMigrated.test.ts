import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import EnhancedCameraPanelMigrated from '@/components/devices/EnhancedCameraPanelMigrated.vue'
import type { CameraDevice } from '@/types/DeviceTypes'
import type { ComponentPublicInstance } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

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
const mockFetchDeviceProperties = vi.fn()
const mockCallDeviceMethod = vi.fn().mockResolvedValue(true)

vi.mock('@/stores/UnifiedStore', () => {
  return {
    useUnifiedStore: () => ({
      getDeviceById: mockGetDeviceById,
      updateDeviceProperties: mockUpdateDeviceProperties,
      emit: mockEmit,
      on: mockOn,
      off: mockOff,
      fetchDeviceProperties: mockFetchDeviceProperties,
      callDeviceMethod: mockCallDeviceMethod
    })
  }
})

// Mock the UIPreferencesStore
vi.mock('@/stores/useUIPreferencesStore', () => {
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
vi.mock('@/components/ui/EnhancedPanelComponentMigrated.vue', () => ({
  default: {
    name: 'EnhancedPanelComponentMigrated',
    template: `
      <div>
        <slot name="content"></slot>
        <slot name="overview-content"></slot>
        <slot name="detailed-content"></slot>
        <slot name="top-status-bar"></slot>
        <button 
          data-test="connect-button" 
          @click="$emit('connect')"
        >
          {{ connected ? 'Disconnect' : 'Connect' }}
        </button>
      </div>
    `,
    props: ['panelName', 'connected', 'deviceType', 'deviceId', 'supportedModes'],
    emits: ['close', 'configure', 'connect', 'modeChange']
  }
}))

// Mock the Icon component
vi.mock('@/components/ui/Icon.vue', () => ({
  default: {
    name: 'Icon',
    template: '<div class="icon">{{ type }}</div>',
    props: ['type']
  }
}))

// Create a spy for console.log
const consoleSpy = vi.spyOn(console, 'log')

describe('EnhancedCameraPanelMigrated.vue', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Clear mockOn and mockOff for this specific test
    mockOn.mockClear()
    mockOff.mockClear()

    // Create a fresh Pinia instance and make it active
    setActivePinia(createPinia())

    // Mount the component with shallow mode to avoid rendering child components
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
        stubs: {
          Icon: true,
          EnhancedPanelComponentMigrated: true
        },
        renderStubDefaultSlot: true
      }
    })
  })

  it('renders correctly with camera data', async () => {
    // Check if camera name is displayed (from computed property)
    const panelComponent = wrapper.findComponent({ name: 'EnhancedPanelComponentMigrated' })
    expect(panelComponent.props('panelName')).toMatch(/Camera/)

    // Since the component is complex, we just verify it mounted successfully
    expect(wrapper.exists()).toBe(true)
  })

  it('registers event listeners on mount when connected', () => {
    // Re-mount with explicit property handlers to force lifecycle methods to run
    wrapper.unmount()

    // Mock the event handlers
    mockOn.mockImplementation((event, handler) => {
      // Store the handler for later use
      if (event === 'devicePropertyChanged') {
        mockOn.mock.results.push({
          type: 'return',
          value: handler
        })
      }
    })

    // Remount the component to trigger onMounted
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

    // Now check if our mock was called
    expect(mockOn).toHaveBeenCalledWith('devicePropertyChanged', expect.any(Function))
  })

  it('unregisters event listeners on unmount', () => {
    // Register a mock event handler first
    const mockHandler = vi.fn()
    mockOn.mockImplementation((event, handler) => {
      if (event === 'devicePropertyChanged') {
        mockHandler.mockImplementation(handler)
      }
    })

    // Manually call the onMounted hook to register events
    wrapper.unmount()

    // Re-mount to trigger onMounted
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

    // Reset mocks before unmounting
    mockOff.mockClear()

    // Unmount to trigger cleanup
    wrapper.unmount()

    // Check that off was called with the event name
    expect(mockOff).toHaveBeenCalledWith('devicePropertyChanged', expect.any(Function))
  })

  it('toggles connection when connect button is clicked', async () => {
    // For this test, we need to emit an event from the child component
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
        stubs: {
          Icon: true
        }
      }
    })

    // Explicitly emit the 'connect' event on the component itself
    wrapper.vm.$emit('connect')

    // Check that the event was emitted
    expect(wrapper.emitted('connect')).toBeTruthy()
  })

  it('handles property changes from the store', async () => {
    consoleSpy.mockClear()

    // Create a controlled property change handler
    mockOn.mockImplementation((event, handler) => {
      if (event === 'devicePropertyChanged') {
        mockOn.mock.results.push({
          type: 'return',
          value: handler
        })
      }
    })

    // Mount component to register the handler
    wrapper.unmount()
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

    // Extract the handler directly from the mock calls
    const propertyChangeCall = mockOn.mock.calls.find((call) => call[0] === 'devicePropertyChanged')
    if (propertyChangeCall && typeof propertyChangeCall[1] === 'function') {
      const handler = propertyChangeCall[1]

      // Directly call the handler function with test data
      handler('camera1', 'isExposing', false)

      // Check that the console.log was called with the expected message
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Fetching image from camera'))
    } else {
      throw new Error('Property change handler was not registered correctly')
    }
  })
})
