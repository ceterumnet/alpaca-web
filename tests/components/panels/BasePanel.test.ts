import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Device } from '@/types/device.types'
import type { DeviceServer } from '@/services/interfaces/DeviceDiscoveryInterface'

// Mock devices for testing
const mockDevices: Device[] = [
  {
    id: 'device1',
    name: 'Test Telescope 1',
    type: 'telescope',
    isConnected: false,
    isConnecting: false,
    isDisconnecting: false,
    status: 'idle',
    ipAddress: '192.168.1.100',
    port: 11111,
    properties: {}
  },
  {
    id: 'device2',
    name: 'Test Telescope 2',
    type: 'telescope',
    isConnected: true,
    isConnecting: false,
    isDisconnecting: false,
    status: 'idle',
    ipAddress: '192.168.1.101',
    port: 11111,
    properties: {}
  },
  {
    id: 'device3',
    name: 'Test Camera',
    type: 'camera',
    isConnected: false,
    isConnecting: false,
    isDisconnecting: false,
    status: 'idle',
    ipAddress: '192.168.1.102',
    port: 11111,
    properties: {}
  }
]

// Mocks for discovery services
const mockDiscoverDevices = vi.fn().mockResolvedValue({
  servers: [],
  status: 'success',
  lastDiscoveryTime: new Date(),
  error: null
})

const mockServers: DeviceServer[] = [
  {
    id: 'server1',
    address: '192.168.1.100',
    port: 11111,
    serverName: 'Test Server 1',
    manufacturer: 'ASCOM',
    lastDiscovered: new Date(),
    isManual: false,
    devices: []
  }
]

// Mock implementations
const mockGetDeviceById = vi.fn((id) => mockDevices.find((d) => d.id === id) || null)
const mockConnectDevice = vi.fn().mockResolvedValue(true)
const mockDisconnectDevice = vi.fn().mockResolvedValue(true)

// Mock the stores before importing any components that use them
vi.mock('@/stores/UnifiedStore', () => ({
  useUnifiedStore: vi.fn().mockImplementation(() => ({
    getDeviceById: mockGetDeviceById,
    connectDevice: mockConnectDevice,
    disconnectDevice: mockDisconnectDevice,
    devicesList: mockDevices
  }))
}))

vi.mock('@/stores/useUIPreferencesStore', () => ({
  useUIPreferencesStore: vi.fn().mockImplementation(() => ({
    getDeviceUIMode: vi.fn().mockReturnValue('OVERVIEW')
  })),
  UIMode: {
    OVERVIEW: 'OVERVIEW',
    DETAILED: 'DETAILED',
    FULLSCREEN: 'FULLSCREEN'
  }
}))

vi.mock('@/stores/useEnhancedDiscoveryStore', () => ({
  useEnhancedDiscoveryStore: vi.fn().mockImplementation(() => ({
    discoverDevices: mockDiscoverDevices,
    servers: mockServers
  }))
}))

// Mock the EnhancedPanelComponent
vi.mock('@/components/ui/EnhancedPanelComponent.vue', () => ({
  default: {
    name: 'EnhancedPanelComponent',
    template: '<div><slot name="overview-content"></slot></div>',
    props: ['panelName', 'connected', 'deviceType', 'deviceId', 'supportedModes']
  }
}))

// Now import the component that uses the mocked stores
import BasePanel from '@/components/panels/BasePanel.vue'
import { UIMode } from '@/stores/useUIPreferencesStore'

// Mock local storage for testing recently used devices
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    clear: () => {
      store = {}
    }
  }
})()

// Replace global localStorage with our mock
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('BasePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  it('renders without errors', () => {
    const wrapper = mount(BasePanel, {
      props: {
        panelId: 'test-panel',
        deviceType: 'telescope',
        title: 'Test Panel',
        features: []
      }
    })

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.selected-device').exists()).toBe(true)
  })

  it('auto-selects first available device of the specified type', async () => {
    const wrapper = mount(BasePanel, {
      props: {
        panelId: 'test-panel',
        deviceType: 'telescope',
        title: 'Test Panel',
        features: []
      }
    })

    await wrapper.vm.$nextTick()

    // Should have selected the first telescope device
    expect(wrapper.emitted('deviceChange')?.[0]).toEqual(['device1'])
    expect(wrapper.find('.selected-device').text()).toContain('Test Telescope 1')
  })

  it('respects initial deviceId prop', async () => {
    const wrapper = mount(BasePanel, {
      props: {
        panelId: 'test-panel',
        deviceType: 'telescope',
        title: 'Test Panel',
        deviceId: 'device2',
        features: []
      }
    })

    await wrapper.vm.$nextTick()

    // Should not emit deviceChange because device2 was already selected
    expect(wrapper.emitted('deviceChange')).toBeFalsy()
    expect(wrapper.find('.selected-device').text()).toContain('Test Telescope 2')
  })

  it('shows device selector dropdown when clicking the selected device', async () => {
    const wrapper = mount(BasePanel, {
      props: {
        panelId: 'test-panel',
        deviceType: 'telescope',
        title: 'Test Panel',
        deviceId: 'device1',
        features: []
      }
    })

    expect(wrapper.find('.device-selector-dropdown').exists()).toBe(false)

    // Click to open the dropdown
    await wrapper.find('.selected-device').trigger('click')
    expect(wrapper.find('.device-selector-dropdown').exists()).toBe(true)

    // Should show both telescope devices
    const deviceItems = wrapper.findAll('.device-item')
    expect(deviceItems.length).toBe(2)
    expect(deviceItems[0].text()).toContain('Test Telescope 1')
    expect(deviceItems[1].text()).toContain('Test Telescope 2')
  })

  it('shows discovery button when no devices are available', async () => {
    // Mock empty device list
    const emptyDeviceList: Device[] = []
    mockGetDeviceById.mockImplementation(() => null)
    vi.mocked(vi.importMock('@/stores/UnifiedStore')).mockImplementation(() => ({
      getDeviceById: mockGetDeviceById,
      connectDevice: mockConnectDevice,
      disconnectDevice: mockDisconnectDevice,
      devicesList: emptyDeviceList
    }))

    const wrapper = mount(BasePanel, {
      props: {
        panelId: 'test-panel',
        deviceType: 'focuser', // Use a type that has no devices
        title: 'Test Panel',
        features: []
      }
    })

    // Click to open the dropdown
    await wrapper.find('.selected-device').trigger('click')

    // Should show empty message and discovery button
    expect(wrapper.find('.empty-device-list').exists()).toBe(true)
    expect(wrapper.find('.discover-button').exists()).toBe(true)
  })

  it('connects to a device when connect is triggered', async () => {
    const wrapper = mount(BasePanel, {
      props: {
        panelId: 'test-panel',
        deviceType: 'telescope',
        title: 'Test Panel',
        deviceId: 'device1',
        features: []
      }
    })

    // Click connect button (simulate the event from EnhancedPanelComponent)
    await wrapper.findComponent({ name: 'EnhancedPanelComponent' }).vm.$emit('connect')

    expect(mockConnectDevice).toHaveBeenCalledWith('device1')
    expect(wrapper.emitted('connect')).toBeTruthy()

    // Test that localStorage was updated - this adds to recently used devices
    // When connecting, the device should be added to recently used
    const storedData = localStorage.getItem('recentlyUsed:telescope')
    expect(storedData).toBeTruthy()
    if (storedData) {
      const recentlyUsed = JSON.parse(storedData)
      expect(recentlyUsed).toContain('device1')
    }
  })

  it('disconnects from a device when connect is triggered on connected device', async () => {
    const wrapper = mount(BasePanel, {
      props: {
        panelId: 'test-panel',
        deviceType: 'telescope',
        title: 'Test Panel',
        deviceId: 'device2', // This device is connected
        features: []
      }
    })

    // Click connect button (which acts as disconnect for connected devices)
    await wrapper.findComponent({ name: 'EnhancedPanelComponent' }).vm.$emit('connect')

    expect(mockDisconnectDevice).toHaveBeenCalledWith('device2')
    expect(wrapper.emitted('disconnect')).toBeTruthy()
  })

  it('changes device when a different device is selected', async () => {
    const wrapper = mount(BasePanel, {
      props: {
        panelId: 'test-panel',
        deviceType: 'telescope',
        title: 'Test Panel',
        deviceId: 'device1',
        features: []
      }
    })

    // Click to open the dropdown
    await wrapper.find('.selected-device').trigger('click')

    // Click on the second device
    const deviceItems = wrapper.findAll('.device-item')
    await deviceItems[1].trigger('click')

    expect(wrapper.emitted('deviceChange')?.[0]).toEqual(['device2'])

    // If device was connected, it should be disconnected
    expect(mockDisconnectDevice).not.toHaveBeenCalled() // device1 wasn't connected

    // The device should be added to recently used
    const storedData = localStorage.getItem('recentlyUsed:telescope')
    expect(storedData).toBeTruthy()
    if (storedData) {
      const recentlyUsed = JSON.parse(storedData)
      expect(recentlyUsed).toContain('device2')
    }
  })

  it('initiates device discovery when discovery button is clicked', async () => {
    // Mock empty device list
    const emptyDeviceList: Device[] = []
    mockGetDeviceById.mockImplementation(() => null)
    vi.mocked(vi.importMock('@/stores/UnifiedStore')).mockImplementation(() => ({
      getDeviceById: mockGetDeviceById,
      connectDevice: mockConnectDevice,
      disconnectDevice: mockDisconnectDevice,
      devicesList: emptyDeviceList
    }))

    const wrapper = mount(BasePanel, {
      props: {
        panelId: 'test-panel',
        deviceType: 'focuser', // Use a type that has no devices
        title: 'Test Panel',
        features: []
      }
    })

    // Click to open the dropdown
    await wrapper.find('.selected-device').trigger('click')

    // Click discovery button
    await wrapper.find('.discover-button').trigger('click')

    // Should call discovery and emit openDiscovery event
    expect(mockDiscoverDevices).toHaveBeenCalled()
    expect(wrapper.emitted('openDiscovery')?.[0]).toEqual(['focuser'])

    // Should close the dropdown
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.device-selector-dropdown').exists()).toBe(false)
  })

  it('loads recently used devices from localStorage', async () => {
    // Set up mock localStorage
    localStorage.setItem('recentlyUsed:telescope', JSON.stringify(['device2', 'device1']))

    const wrapper = mount(BasePanel, {
      props: {
        panelId: 'test-panel',
        deviceType: 'telescope',
        title: 'Test Panel',
        deviceId: 'device1',
        features: []
      }
    })

    // Connect to the device (which adds it to recently used)
    await wrapper.vm.$emit('connect')

    // Check localStorage
    const storedData = localStorage.getItem('recentlyUsed:telescope')
    expect(storedData).toBeTruthy()

    const recentlyUsed = JSON.parse(storedData!)
    expect(recentlyUsed).toContain('device1')
  })

  it('loads recently used devices from localStorage', async () => {
    // Set up mock localStorage
    localStorage.setItem('recentlyUsed:telescope', JSON.stringify(['device2', 'device1']))

    const wrapper = mount(BasePanel, {
      props: {
        panelId: 'test-panel',
        deviceType: 'telescope',
        title: 'Test Panel',
        features: []
      }
    })

    // Click to open the dropdown
    await wrapper.find('.selected-device').trigger('click')

    // Should show recently used section
    expect(wrapper.find('.recently-used').exists()).toBe(true)

    const recentDevices = wrapper.findAll('.recent-device')
    expect(recentDevices.length).toBe(2)
    expect(recentDevices[0].text()).toContain('Test Telescope 2')
  })
})
