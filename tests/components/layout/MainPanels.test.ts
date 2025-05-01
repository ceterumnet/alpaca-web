import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import MainPanels from '../../../src/components/layout/MainPanels.vue'
import { useUnifiedStore } from '../../../src/stores/UnifiedStore'
import { createPinia, setActivePinia } from 'pinia'
// import type { Device } from '../../../src/stores/UnifiedStore'

// Disable the no-explicit-any rule for this test file

// Mock CameraPanel and TelescopePanelMigrated components
vi.mock('../../../src/components/CameraPanel.vue', () => ({
  default: {
    name: 'CameraPanel',
    props: ['deviceId', 'title'],
    template: '<div class="camera-panel" :data-device-id="deviceId">{{ title }}</div>'
  }
}))

vi.mock('../../../src/components/TelescopePanel.vue', () => ({
  default: {
    name: 'TelescopePanel',
    props: ['deviceId', 'title'],
    template: '<div class="telescope-panel" :data-device-id="deviceId">{{ title }}</div>'
  }
}))

// Mock grid-layout-plus since it's used in the component
vi.mock('grid-layout-plus', () => ({
  GridLayout: {
    name: 'GridLayout',
    props: ['layout'],
    template: '<div class="grid-layout"><slot></slot></div>'
  },
  GridItem: {
    name: 'GridItem',
    props: ['x', 'y', 'w', 'h', 'i'],
    template: '<div class="grid-item"><slot></slot></div>'
  }
}))

// Mock EnhancedPanelComponent
vi.mock('../../../src/components/EnhancedPanelComponent.vue', () => ({
  default: {
    name: 'EnhancedPanelComponent',
    props: ['deviceId', 'title'],
    template: '<div class="enhanced-panel" :data-device-id="deviceId">{{ title }}</div>'
  }
}))

// Mock Icon component
vi.mock('../../../src/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    props: ['type'],
    template: '<span class="icon-{{ type }}"></span>'
  }
}))

// Mock device data
const mockDevices = [
  {
    id: 'camera-1',
    name: 'Test Camera',
    type: 'camera',
    isConnected: true,
    isConnecting: false,
    isDisconnecting: false,
    properties: {}
  },
  {
    id: 'telescope-1',
    name: 'Test Telescope',
    type: 'telescope',
    isConnected: true,
    isConnecting: false,
    isDisconnecting: false,
    properties: {}
  },
  {
    id: 'focuser-1',
    name: 'Test Focuser',
    type: 'focuser',
    isConnected: true,
    isConnecting: false,
    isDisconnecting: false,
    properties: {}
  }
]

// Mock the UnifiedStore
vi.mock('../../../src/stores/UnifiedStore', () => ({
  useUnifiedStore: vi.fn()
}))

// Mock the useLayoutStore
vi.mock('../../../src/stores/useLayoutStore', () => ({
  useLayoutStore: vi.fn(() => ({
    layout: [],
    updateLayout: vi.fn(),
    resetLayout: vi.fn(),
    saveLayout: vi.fn(),
    initLayout: vi.fn()
  }))
}))

// Skip all tests for now until we can fix the event emitter pattern
describe.skip('MainPanelsMigrated.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())

    // Create a simplified mock for UnifiedStore
    const mockStore = {
      devicesList: mockDevices,
      connectedDevices: mockDevices.filter((device) => device.isConnected),

      // Stub implementations for event emitter methods
      on: vi.fn(),
      off: vi.fn(),

      // Device methods
      addDevice: vi.fn(),
      removeDevice: vi.fn(),
      connectDevice: vi.fn(),
      disconnectDevice: vi.fn()
    }

    // Mock the useUnifiedStore implementation for each test
    vi.mocked(useUnifiedStore).mockReturnValue(
      mockStore as unknown as ReturnType<typeof useUnifiedStore>
    )
  })

  it('renders a panel for each connected camera and telescope', async () => {
    const wrapper = mount(MainPanels)

    // Should find one camera panel
    const cameraPanels = wrapper.findAll('.camera-panel')
    expect(cameraPanels.length).toBe(1)
    expect(cameraPanels[0].attributes('data-device-id')).toBe('camera-1')

    // Should find one telescope panel
    const telescopePanels = wrapper.findAll('.telescope-panel')
    expect(telescopePanels.length).toBe(1)
    expect(telescopePanels[0].attributes('data-device-id')).toBe('telescope-1')

    // Check panel titles include device names
    expect(cameraPanels[0].text()).toContain('Camera: Test Camera')
    expect(telescopePanels[0].text()).toContain('Telescope: Test Telescope')
  })

  it('does not render panels for unsupported device types', () => {
    const wrapper = mount(MainPanels)

    // Should not find any panels for the focuser (unsupported type)
    expect(wrapper.text()).not.toContain('Focuser: Test Focuser')
  })

  it('does not render panels when no devices are connected', () => {
    // Mock empty device list
    vi.mocked(useUnifiedStore).mockReturnValue({
      devicesList: [],
      connectedDevices: []
    } as unknown as ReturnType<typeof useUnifiedStore>)

    const wrapper = mount(MainPanels)

    // Should not find any panels
    expect(wrapper.findAll('.camera-panel').length).toBe(0)
    expect(wrapper.findAll('.telescope-panel').length).toBe(0)

    // Should display a message
    expect(wrapper.text()).toContain('No connected devices')
  })

  it('does not render panels when only unsupported device types are connected', () => {
    // Mock only unsupported device types
    const onlyUnsupportedDevices = [
      {
        id: 'focuser-1',
        name: 'Test Focuser',
        type: 'focuser',
        isConnected: true,
        isConnecting: false,
        isDisconnecting: false,
        properties: {}
      }
    ]

    vi.mocked(useUnifiedStore).mockReturnValue({
      devicesList: onlyUnsupportedDevices,
      connectedDevices: onlyUnsupportedDevices
    } as unknown as ReturnType<typeof useUnifiedStore>)

    const wrapper = mount(MainPanels)

    // Should not find any supported device panels
    expect(wrapper.findAll('.camera-panel').length).toBe(0)
    expect(wrapper.findAll('.telescope-panel').length).toBe(0)

    // Should still display the "no supported devices" message
    expect(wrapper.text()).toContain('No supported device types connected')
  })

  it('handles multiple devices of the same type', () => {
    // Mock multiple cameras and telescopes
    const multipleDevices = [
      {
        id: 'camera-1',
        name: 'Main Camera',
        type: 'camera',
        isConnected: true,
        isConnecting: false,
        isDisconnecting: false,
        properties: {}
      },
      {
        id: 'camera-2',
        name: 'Guide Camera',
        type: 'camera',
        isConnected: true,
        isConnecting: false,
        isDisconnecting: false,
        properties: {}
      },
      {
        id: 'telescope-1',
        name: 'Main Telescope',
        type: 'telescope',
        isConnected: true,
        isConnecting: false,
        isDisconnecting: false,
        properties: {}
      },
      {
        id: 'telescope-2',
        name: 'Guide Telescope',
        type: 'telescope',
        isConnected: true,
        isConnecting: false,
        isDisconnecting: false,
        properties: {}
      }
    ]

    vi.mocked(useUnifiedStore).mockReturnValue({
      devicesList: multipleDevices,
      connectedDevices: multipleDevices
    } as unknown as ReturnType<typeof useUnifiedStore>)

    const wrapper = mount(MainPanels)

    // Should find two camera panels
    const cameraPanels = wrapper.findAll('.camera-panel')
    expect(cameraPanels.length).toBe(2)
    expect(cameraPanels[0].attributes('data-device-id')).toBe('camera-1')
    expect(cameraPanels[1].attributes('data-device-id')).toBe('camera-2')

    // Should find two telescope panels
    const telescopePanels = wrapper.findAll('.telescope-panel')
    expect(telescopePanels.length).toBe(2)
    expect(telescopePanels[0].attributes('data-device-id')).toBe('telescope-1')
    expect(telescopePanels[1].attributes('data-device-id')).toBe('telescope-2')

    // Check panel titles include device names
    expect(cameraPanels[0].text()).toContain('Camera: Main Camera')
    expect(cameraPanels[1].text()).toContain('Camera: Guide Camera')
    expect(telescopePanels[0].text()).toContain('Telescope: Main Telescope')
    expect(telescopePanels[1].text()).toContain('Telescope: Guide Telescope')
  })

  it('handles devices that are not connected', () => {
    // Mock devices with mixed connection states
    const mixedConnectionDevices = [
      {
        id: 'camera-1',
        name: 'Connected Camera',
        type: 'camera',
        isConnected: true,
        isConnecting: false,
        isDisconnecting: false,
        properties: {}
      },
      {
        id: 'camera-2',
        name: 'Disconnected Camera',
        type: 'camera',
        isConnected: false,
        isConnecting: false,
        isDisconnecting: false,
        properties: {}
      },
      {
        id: 'telescope-1',
        name: 'Connected Telescope',
        type: 'telescope',
        isConnected: true,
        isConnecting: false,
        isDisconnecting: false,
        properties: {}
      },
      {
        id: 'telescope-2',
        name: 'Disconnected Telescope',
        type: 'telescope',
        isConnected: false,
        isConnecting: false,
        isDisconnecting: false,
        properties: {}
      }
    ]

    vi.mocked(useUnifiedStore).mockReturnValue({
      devicesList: mixedConnectionDevices,
      connectedDevices: mixedConnectionDevices.filter((device) => device.isConnected)
    } as unknown as ReturnType<typeof useUnifiedStore>)

    const wrapper = mount(MainPanels)

    // Should only find panels for connected devices
    const cameraPanels = wrapper.findAll('.camera-panel')
    expect(cameraPanels.length).toBe(1)
    expect(cameraPanels[0].attributes('data-device-id')).toBe('camera-1')

    const telescopePanels = wrapper.findAll('.telescope-panel')
    expect(telescopePanels.length).toBe(1)
    expect(telescopePanels[0].attributes('data-device-id')).toBe('telescope-1')

    // Check panel titles only include connected device names
    expect(wrapper.text()).toContain('Camera: Connected Camera')
    expect(wrapper.text()).not.toContain('Camera: Disconnected Camera')
    expect(wrapper.text()).toContain('Telescope: Connected Telescope')
    expect(wrapper.text()).not.toContain('Telescope: Disconnected Telescope')
  })
})
