import { mount, VueWrapper } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CameraPanel from '@/components/devices/CameraPanel.vue'
import { createTestingPinia } from '@pinia/testing'

// Create a mock device and store functions
const mockDevice = {
  id: 'camera-1',
  name: 'Test Camera',
  type: 'camera',
  isConnected: true,
  isConnecting: false,
  isDisconnecting: false,
  properties: {
    exposureTime: 5,
    gain: 100,
    offset: 10,
    coolerEnabled: true,
    targetTemperature: -10,
    currentTemperature: -5,
    readoutMode: 1
  }
}

const mockGetDeviceById = vi.fn((id) => {
  if (id === 'camera-1') {
    return mockDevice
  }
  return null
})

const mockUpdateDeviceProperties = vi.fn()
const mockEmit = vi.fn()
const mockCallDeviceMethod = vi.fn().mockResolvedValue(true)
const mockDevicesList = [mockDevice]

// Mock UnifiedStore with correct export and structure
vi.mock('@/stores/UnifiedStore', () => ({
  useUnifiedStore: vi.fn(() => ({
    devicesList: mockDevicesList,
    getDeviceById: mockGetDeviceById,
    updateDeviceProperties: mockUpdateDeviceProperties,
    emit: mockEmit,
    connectDevice: vi.fn(),
    disconnectDevice: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    callDeviceMethod: mockCallDeviceMethod,
    fetchDeviceProperties: vi.fn()
  }))
}))

// Mock the UIPreferencesStore (needed by EnhancedPanelComponent)
vi.mock('@/stores/useUIPreferencesStore', () => ({
  useUIPreferencesStore: vi.fn(() => ({
    getDeviceUIMode: () => 'detailed',
    setDeviceUIMode: vi.fn(),
    isSidebarVisible: false
  })),
  UIMode: {
    OVERVIEW: 'overview',
    DETAILED: 'detailed',
    FULLSCREEN: 'fullscreen'
  }
}))

// Mock BaseDevicePanel component
vi.mock('@/components/panels/BaseDevicePanel.vue', () => ({
  default: {
    name: 'BaseDevicePanel',
    template: '<div><slot></slot></div>',
    props: ['deviceId', 'title', 'apiBaseUrl'],
    setup() {
      return {
        isConnected: true,
        deviceType: 'camera',
        deviceNum: 1,
        handleConnect: vi.fn(),
        handleModeChange: vi.fn()
      }
    }
  }
}))

// Mock EnhancedCameraPanel component
vi.mock('@/components/devices/EnhancedCameraPanel.vue', () => ({
  default: {
    name: 'EnhancedCameraPanel',
    template: '<div class="camera-panel">Camera Panel Content</div>',
    props: ['panelName', 'connected', 'deviceType', 'deviceId', 'deviceNum', 'idx'],
    emits: [
      'connect',
      'modeChange',
      'start-exposure',
      'abort-exposure',
      'set-cooler',
      'set-gain',
      'set-offset',
      'set-read-mode'
    ]
  }
}))

// Mock EnhancedPanelComponent to prevent Pinia issues
vi.mock('@/components/ui/EnhancedPanelComponent.vue', () => ({
  default: {
    name: 'EnhancedPanelComponent',
    template: '<div class="panel"><slot></slot></div>',
    props: ['panelName', 'connected', 'deviceType', 'deviceId', 'supportedModes'],
    emits: ['close', 'configure', 'connect', 'modeChange']
  }
}))

describe('CameraPanel', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let wrapper: VueWrapper<any>

  beforeEach(() => {
    vi.clearAllMocks()
    wrapper = mount(CameraPanel, {
      props: {
        deviceId: 'camera-1',
        title: 'Test Camera Panel'
      },
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn
          })
        ]
      }
    })
  })

  it('renders correctly with default props', () => {
    expect(wrapper.find('.camera-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('Camera Panel Content')
  })

  it('passes correct props to EnhancedCameraPanel', () => {
    const enhancedPanel = wrapper.findComponent({ name: 'EnhancedCameraPanel' })
    expect(enhancedPanel.props()).toMatchObject({
      panelName: 'Test Camera Panel',
      connected: true,
      deviceType: 'camera',
      deviceId: 'camera-1'
    })
  })

  it('handles start exposure correctly', async () => {
    const enhancedPanel = wrapper.findComponent({ name: 'EnhancedCameraPanel' })
    await enhancedPanel.vm.$emit('start-exposure', 10)

    expect(mockEmit).toHaveBeenCalledWith('callDeviceMethod', 'camera-1', 'startExposure', [10])
  })

  it('handles abort exposure correctly', async () => {
    const enhancedPanel = wrapper.findComponent({ name: 'EnhancedCameraPanel' })
    await enhancedPanel.vm.$emit('abort-exposure')

    expect(mockEmit).toHaveBeenCalledWith('callDeviceMethod', 'camera-1', 'abortExposure', [])
  })

  it('handles set cooler correctly', async () => {
    const enhancedPanel = wrapper.findComponent({ name: 'EnhancedCameraPanel' })
    await enhancedPanel.vm.$emit('set-cooler', true, -15)

    expect(mockUpdateDeviceProperties).toHaveBeenCalledWith('camera-1', {
      coolerEnabled: true,
      targetTemperature: -15
    })
  })

  it('handles set gain correctly', async () => {
    const enhancedPanel = wrapper.findComponent({ name: 'EnhancedCameraPanel' })
    await enhancedPanel.vm.$emit('set-gain', 200)

    expect(mockUpdateDeviceProperties).toHaveBeenCalledWith('camera-1', { gain: 200 })
  })

  it('handles set offset correctly', async () => {
    const enhancedPanel = wrapper.findComponent({ name: 'EnhancedCameraPanel' })
    await enhancedPanel.vm.$emit('set-offset', 15)

    expect(mockUpdateDeviceProperties).toHaveBeenCalledWith('camera-1', { offset: 15 })
  })

  it('handles set read mode correctly', async () => {
    const enhancedPanel = wrapper.findComponent({ name: 'EnhancedCameraPanel' })
    await enhancedPanel.vm.$emit('set-read-mode', 2)

    expect(mockUpdateDeviceProperties).toHaveBeenCalledWith('camera-1', { readoutMode: 2 })
  })
})
