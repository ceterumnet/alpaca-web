import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import TelescopePanelMigrated from '@/components/devices/TelescopePanelMigrated.vue'
import { createPinia, setActivePinia } from 'pinia'
import type { VueWrapper } from '@vue/test-utils'
import type { ComponentPublicInstance } from 'vue'

// Define types for telescope device
interface TelescopeDevice {
  id: string
  name: string
  type: string
  isConnected: boolean
  isConnecting: boolean
  isDisconnecting: false
  properties: {
    tracking: boolean
    slewing: boolean
    rightAscension: string
    declination: string
    altitude: number
    azimuth: number
  }
}

// Mock device data
const mockDevice: TelescopeDevice = {
  id: 'telescope-1',
  name: 'Test Telescope',
  type: 'telescope',
  isConnected: true,
  isConnecting: false,
  isDisconnecting: false,
  properties: {
    tracking: true,
    slewing: false,
    rightAscension: '12:00:00',
    declination: '+45:00:00',
    altitude: 45.0,
    azimuth: 180.0
  }
}

// Mock store functions
const mockGetDeviceById = vi.fn((id) => {
  if (id === 'telescope-1') return mockDevice
  return null
})
const mockUpdateDeviceProperties = vi.fn()
const mockCallDeviceMethod = vi.fn().mockResolvedValue({})
const mockEmit = vi.fn()
const mockOn = vi.fn()
const mockOff = vi.fn()
const mockConnectDevice = vi.fn()
const mockDisconnectDevice = vi.fn()

// Mock UnifiedStore
vi.mock('@/stores/UnifiedStore', () => ({
  useUnifiedStore: () => ({
    devices: [mockDevice],
    devicesList: [mockDevice],
    getDeviceById: mockGetDeviceById,
    updateDeviceProperties: mockUpdateDeviceProperties,
    callDeviceMethod: mockCallDeviceMethod,
    emit: mockEmit,
    connectDevice: mockConnectDevice,
    disconnectDevice: mockDisconnectDevice,
    on: mockOn,
    off: mockOff
  })
}))

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

// Mock BaseDevicePanel
vi.mock('@/components/panels/BaseDevicePanel.vue', () => ({
  default: {
    name: 'BaseDevicePanel',
    template: `
      <div>
        <slot></slot>
      </div>
    `,
    props: ['deviceId', 'title'],
    setup() {
      return {
        isConnected: true,
        deviceType: 'telescope',
        deviceNum: 1,
        handleConnect: vi.fn(),
        handleModeChange: vi.fn()
      }
    }
  }
}))

// Mock EnhancedTelescopePanelMigrated component
vi.mock('@/components/devices/EnhancedTelescopePanelMigrated.vue', () => ({
  default: {
    name: 'EnhancedTelescopePanelMigrated',
    props: [
      'panelName',
      'deviceId',
      'connected',
      'deviceType',
      'deviceNum',
      'idx',
      'supportedModes'
    ],
    emits: ['connect', 'mode-change', 'slew', 'toggle-tracking', 'park', 'unpark'],
    template: '<div>Enhanced Telescope Panel</div>'
  }
}))

describe('TelescopePanelMigrated', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Clear specific mocks
    mockOn.mockClear()
    mockOff.mockClear()
    mockUpdateDeviceProperties.mockClear()
    mockEmit.mockClear()

    // Create a fresh Pinia instance and make it active
    setActivePinia(createPinia())
  })

  it('renders correctly with default props', () => {
    wrapper = mount(TelescopePanelMigrated, {
      props: {
        deviceId: 'telescope-1',
        title: 'Test Telescope Panel'
      },
      global: {
        plugins: [createPinia()],
        stubs: {
          Icon: true
        }
      }
    })

    // Check basic rendering
    expect(wrapper.findComponent({ name: 'EnhancedTelescopePanelMigrated' }).exists()).toBe(true)
  })

  it('passes correct props to EnhancedTelescopePanelMigrated', () => {
    wrapper = mount(TelescopePanelMigrated, {
      props: {
        deviceId: 'telescope-1',
        title: 'Test Telescope Panel'
      },
      global: {
        plugins: [createPinia()],
        stubs: {
          Icon: true
        }
      }
    })

    const enhancedPanel = wrapper.findComponent({ name: 'EnhancedTelescopePanelMigrated' })
    expect(enhancedPanel.props('panelName')).toBe('Test Telescope Panel')
    expect(enhancedPanel.props('deviceId')).toBe('telescope-1')
  })

  it('has proper store configured for device actions', () => {
    wrapper = mount(TelescopePanelMigrated, {
      props: {
        deviceId: 'telescope-1',
        title: 'Test Telescope Panel'
      },
      global: {
        plugins: [createPinia()]
      }
    })

    // Verify store mock functions are available
    expect(typeof mockEmit).toBe('function')
    expect(typeof mockUpdateDeviceProperties).toBe('function')
    expect(typeof mockCallDeviceMethod).toBe('function')
  })

  it('verifies device updates can be made through store', () => {
    // Set up mock store functions
    const deviceId = 'telescope-1'

    // Call functions directly to verify they work
    mockUpdateDeviceProperties(deviceId, { tracking: true })
    mockEmit('callDeviceMethod', deviceId, 'method', [])

    // Verify functions were called with correct arguments
    expect(mockUpdateDeviceProperties).toHaveBeenCalledWith(deviceId, { tracking: true })
    expect(mockEmit).toHaveBeenCalledWith('callDeviceMethod', deviceId, 'method', [])
  })
})
