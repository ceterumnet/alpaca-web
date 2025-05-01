import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import type { ComponentPublicInstance } from 'vue'
import { nextTick } from 'vue'
import DeviceDetailView from '@/views/DeviceDetailView.vue'
import type { UnifiedDevice } from '@/types/DeviceTypes'

// Create a mock router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/devices/:id',
      name: 'DeviceDetail',
      component: DeviceDetailView
    },
    {
      path: '/devices',
      name: 'Devices',
      component: { template: '<div>Devices</div>' }
    }
  ]
})

// Create mock functions for the store
const mockGetDeviceById = vi.fn()
const mockUpdateDevice = vi.fn()
const mockConnectDevice = vi.fn().mockResolvedValue(undefined)
const mockDisconnectDevice = vi.fn().mockResolvedValue(undefined)

// Mock the UnifiedStore
vi.mock('@/stores/UnifiedStore', () => ({
  useUnifiedStore: () => ({
    getDeviceById: mockGetDeviceById,
    updateDevice: mockUpdateDevice,
    connectDevice: mockConnectDevice,
    disconnectDevice: mockDisconnectDevice,
    devicesList: []
  })
}))

// Mock the panel components
vi.mock('@/components/devices/TelescopePanel.vue', () => ({
  default: {
    template: '<div data-testid="telescope-panel"></div>',
    props: ['deviceId', 'connected', 'panelName', 'deviceType', 'supportedModes']
  }
}))

vi.mock('@/components/devices/CameraPanel.vue', () => ({
  default: {
    template: '<div data-testid="camera-panel"></div>',
    props: ['deviceId', 'connected', 'panelName', 'deviceType', 'supportedModes']
  }
}))

vi.mock('@/components/ui/EnhancedPanelComponent.vue', () => ({
  default: {
    template: '<div data-testid="enhanced-panel"></div>',
    props: ['deviceId', 'connected', 'panelName', 'deviceType', 'supportedModes']
  }
}))

// Mock the UIMode enum
vi.mock('@/stores/useUIPreferencesStore', () => ({
  UIMode: {
    OVERVIEW: 'overview',
    DETAILED: 'detailed',
    FULLSCREEN: 'fullscreen'
  },
  useUIPreferencesStore: vi.fn().mockReturnValue({
    // Add properties and methods your components expect
    currentMode: 'overview',
    setMode: vi.fn(),
    getDeviceUIMode: vi.fn(() => 'overview'),
    setDeviceUIMode: vi.fn(),
    isSidebarVisible: true
  })
}))

// Interface for the component instance to avoid using 'any'
interface DeviceDetailViewInstance extends ComponentPublicInstance {
  isConnectionChanging: boolean
}

describe('DeviceDetailView', () => {
  const mockDevices: Record<string, UnifiedDevice> = {
    'telescope-123': {
      id: 'telescope-123',
      name: 'Test Telescope',
      type: 'telescope',
      isConnected: true,
      isConnecting: false,
      isDisconnecting: false,
      properties: {}
    },
    'camera-456': {
      id: 'camera-456',
      name: 'Test Camera',
      type: 'camera',
      isConnected: false,
      isConnecting: false,
      isDisconnecting: false,
      properties: {}
    },
    'focuser-789': {
      id: 'focuser-789',
      name: 'Test Focuser',
      type: 'focuser',
      isConnected: false,
      isConnecting: false,
      isDisconnecting: false,
      properties: {}
    },
    'connecting-device': {
      id: 'connecting-device',
      name: 'Connecting Device',
      type: 'telescope',
      isConnected: false,
      isConnecting: true,
      isDisconnecting: false,
      properties: {}
    },
    'disconnecting-device': {
      id: 'disconnecting-device',
      name: 'Disconnecting Device',
      type: 'telescope',
      isConnected: true,
      isConnecting: false,
      isDisconnecting: true,
      properties: {}
    },
    'device-with-location': {
      id: 'device-with-location',
      name: 'Location Device',
      type: 'telescope',
      isConnected: true,
      isConnecting: false,
      isDisconnecting: false,
      location: 'Observatory 1',
      server: 'Main Server',
      properties: {}
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup the route
    router.push('/devices/telescope-123')

    // Setup mock getDeviceById to return the appropriate device
    mockGetDeviceById.mockImplementation((id: string) => {
      return mockDevices[id] || null
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should display device details when device exists', async () => {
    // Set the route first, then wait for it to be ready
    await router.push('/devices/telescope-123')
    await router.isReady()

    const wrapper = mount(DeviceDetailView, {
      global: {
        plugins: [router]
      }
    })
    await flushPromises()

    // Check device details are displayed
    expect(wrapper.find('h1').text()).toBe('Test Telescope')

    // Look for type info in info-value
    const infoItems = wrapper.findAll('.info-item')
    const typeValue = infoItems[0].find('.info-value')
    expect(typeValue.text()).toBe('telescope')

    // Check status
    const statusValue = infoItems[3].find('.info-value')
    expect(statusValue.text()).toBe('Connected')
  })

  it('should display the appropriate panel component for a telescope device', async () => {
    // Set the route first, then wait for it to be ready
    await router.push('/devices/telescope-123')
    await router.isReady()

    const wrapper = mount(DeviceDetailView, {
      global: {
        plugins: [router]
      }
    })
    await flushPromises()

    // Should contain telescope panel
    expect(wrapper.find('[data-testid="telescope-panel"]').exists()).toBe(true)
  })

  it('should display the appropriate panel component for a camera device', async () => {
    // Change route to camera device
    await router.push('/devices/camera-456')
    await router.isReady()

    const wrapper = mount(DeviceDetailView, {
      global: {
        plugins: [router]
      }
    })
    await flushPromises()

    // Should not contain telescope panel
    expect(wrapper.find('[data-testid="telescope-panel"]').exists()).toBe(false)

    // Camera device is not connected, so no panel should be shown
    expect(wrapper.find('[data-testid="camera-panel"]').exists()).toBe(false)

    // Should show placeholder for not connected device
    const placeholder = wrapper.find('.detail-content-placeholder')
    expect(placeholder.exists()).toBe(true)
    expect(placeholder.text()).toBe('Connect to the device to access controls.')
  })

  it('should display not found message when device does not exist', async () => {
    // Change route to non-existent device
    await router.push('/devices/unknown-device')
    await router.isReady()

    const wrapper = mount(DeviceDetailView, {
      global: {
        plugins: [router]
      }
    })
    await flushPromises()

    // Should show not found message
    const notFoundElement = wrapper.find('.not-found')
    expect(notFoundElement.exists()).toBe(true)
    expect(notFoundElement.find('p').text()).toBe('The requested device could not be found.')

    // Should have a go back button
    const backButton = notFoundElement.find('button.action-button')
    expect(backButton.exists()).toBe(true)
    expect(backButton.text()).toBe('Go Back')
  })

  it('should connect a device when the connect button is clicked', async () => {
    // Change route to camera device (which is not connected)
    await router.push('/devices/camera-456')
    await router.isReady()

    const wrapper = mount(DeviceDetailView, {
      global: {
        plugins: [router]
      }
    })
    await flushPromises()

    // Click connect button
    await wrapper.find('button.action-button').trigger('click')
    await flushPromises()

    // Should call connectDevice
    expect(mockConnectDevice).toHaveBeenCalledWith('camera-456')
  })

  it('should disconnect a device when the disconnect button is clicked', async () => {
    // Use telescope device (which is connected)
    await router.push('/devices/telescope-123')
    await router.isReady()

    const wrapper = mount(DeviceDetailView, {
      global: {
        plugins: [router]
      }
    })
    await flushPromises()

    // Click disconnect button
    await wrapper.find('button.action-button').trigger('click')
    await flushPromises()

    // Should call disconnectDevice
    expect(mockDisconnectDevice).toHaveBeenCalledWith('telescope-123')
  })

  it('should navigate back to devices view when back button is clicked', async () => {
    // Set the route first, then wait for it to be ready
    await router.push('/devices/telescope-123')
    await router.isReady()

    const wrapper = mount(DeviceDetailView, {
      global: {
        plugins: [router]
      }
    })
    await flushPromises()

    // Click back button
    await wrapper.find('button.back-button').trigger('click')
    await flushPromises()

    // Should navigate to devices route
    expect(router.currentRoute.value.path).toBe('/devices')
  })

  it('should handle connection errors gracefully', async () => {
    // Setup connectDevice to fail
    mockConnectDevice.mockRejectedValue(new Error('Connection failed'))

    // Change route to camera device
    await router.push('/devices/camera-456')
    await router.isReady()

    const wrapper = mount(DeviceDetailView, {
      global: {
        plugins: [router]
      }
    })
    await flushPromises()

    // Click connect button
    await wrapper.find('button.action-button').trigger('click')
    await flushPromises()

    // Should have called connectDevice
    expect(mockConnectDevice).toHaveBeenCalledWith('camera-456')

    // Component should recover from error and reset isConnectionChanging flag
    const vm = wrapper.vm as DeviceDetailViewInstance
    expect(vm.isConnectionChanging).toBe(false)

    // Component should not crash
    expect(wrapper.find('button.action-button').exists()).toBe(true)
  })

  it('should handle disconnection errors gracefully', async () => {
    // Setup disconnectDevice to fail
    mockDisconnectDevice.mockRejectedValue(new Error('Disconnection failed'))

    // Use telescope device (which is connected)
    await router.push('/devices/telescope-123')
    await router.isReady()

    const wrapper = mount(DeviceDetailView, {
      global: {
        plugins: [router]
      }
    })
    await flushPromises()

    // Click disconnect button
    await wrapper.find('button.action-button').trigger('click')
    await flushPromises()

    // Should have called disconnectDevice
    expect(mockDisconnectDevice).toHaveBeenCalledWith('telescope-123')

    // Component should recover from error and reset isConnectionChanging flag
    const vm = wrapper.vm as DeviceDetailViewInstance
    expect(vm.isConnectionChanging).toBe(false)

    // Component should not crash
    expect(wrapper.find('button.action-button').exists()).toBe(true)
  })

  it('should disable connect/disconnect button during connection changes', async () => {
    // Use a device that is in connecting state
    await router.push('/devices/connecting-device')
    await router.isReady()

    const wrapper = mount(DeviceDetailView, {
      global: {
        plugins: [router]
      }
    })
    await flushPromises()

    // Button should be disabled
    const button = wrapper.find('button.action-button')
    expect(button.attributes('disabled')).toBeDefined()

    // Button should show "Connecting..." text
    expect(button.text()).toContain('Connecting')
  })

  it('should disable connect/disconnect button during disconnection changes', async () => {
    // Use a device that is in disconnecting state
    await router.push('/devices/disconnecting-device')
    await router.isReady()

    const wrapper = mount(DeviceDetailView, {
      global: {
        plugins: [router]
      }
    })
    await flushPromises()

    // Button should be disabled
    const button = wrapper.find('button.action-button')
    expect(button.attributes('disabled')).toBeDefined()

    // Button should show "Disconnecting..." text
    expect(button.text()).toContain('Disconnecting')
  })

  it('should display the enhanced panel component for unknown device types', async () => {
    // Mock a device with an unknown type
    mockGetDeviceById.mockImplementation((id: string) => {
      if (id === 'unknown-type-device') {
        return {
          id: 'unknown-type-device',
          name: 'Unknown Type Device',
          type: 'unknown-type',
          isConnected: true,
          isConnecting: false,
          isDisconnecting: false,
          properties: {}
        }
      }
      return mockDevices[id] || null
    })

    // Change route to the unknown type device
    await router.push('/devices/unknown-type-device')
    await router.isReady()

    const wrapper = mount(DeviceDetailView, {
      global: {
        plugins: [router]
      }
    })
    await flushPromises()

    // Should show enhanced panel
    expect(wrapper.find('[data-testid="enhanced-panel"]').exists()).toBe(true)
  })

  it('should show location and server information when available', async () => {
    // Use a device with location and server information
    await router.push('/devices/device-with-location')
    await router.isReady()

    const wrapper = mount(DeviceDetailView, {
      global: {
        plugins: [router]
      }
    })
    await flushPromises()

    // Find location value
    const infoItems = wrapper.findAll('.info-item')
    const locationValue = infoItems[1].find('.info-value')
    expect(locationValue.text()).toBe('Observatory 1')

    // Find server value
    const serverValue = infoItems[2].find('.info-value')
    expect(serverValue.text()).toBe('Main Server')
  })

  it('should show "Unknown" for missing location and server information', async () => {
    // Use a device without location and server information
    await router.push('/devices/telescope-123')
    await router.isReady()

    const wrapper = mount(DeviceDetailView, {
      global: {
        plugins: [router]
      }
    })
    await flushPromises()

    // Find location information
    const infoItems = wrapper.findAll('.info-item')
    const locationLabel = infoItems[1].find('.info-label')
    expect(locationLabel.text()).toBe('Location:')
    const locationValue = infoItems[1].find('.info-value')
    expect(locationValue.text()).toBe('Unknown')

    // Find server information
    const serverLabel = infoItems[2].find('.info-label')
    expect(serverLabel.text()).toBe('Server:')
    const serverValue = infoItems[2].find('.info-value')
    expect(serverValue.text()).toBe('Unknown')
  })

  it('should handle local connection state changes and UI updates', async () => {
    // Use a device
    await router.push('/devices/camera-456')
    await router.isReady()

    const wrapper = mount(DeviceDetailView, {
      global: {
        plugins: [router]
      }
    })
    await flushPromises()

    // Manually trigger isConnectionChanging state
    const vm = wrapper.vm as DeviceDetailViewInstance
    vm.isConnectionChanging = true
    await nextTick()

    // Should show placeholder
    expect(wrapper.text()).toContain('Connect to the device to access controls')

    // Reset and fake a connection
    vm.isConnectionChanging = false
    // Mock that the device is now connected
    mockDevices['camera-456'].isConnected = true
    await nextTick()

    // Update the component
    await flushPromises()

    // Should not show placeholder anymore
    expect(wrapper.text()).not.toContain('Connect to the device to access controls')
  })

  it('should update panel visibility when a device connection state changes', async () => {
    // Make sure camera device is not connected
    mockDevices['camera-456'].isConnected = false

    // Use camera device
    await router.push('/devices/camera-456')
    await router.isReady()

    const wrapper = mount(DeviceDetailView, {
      global: {
        plugins: [router]
      }
    })
    await flushPromises()

    // Initially, camera panel should not be visible because device is not connected
    expect(wrapper.find('[data-testid="camera-panel"]').exists()).toBe(false)
    expect(wrapper.find('.detail-content-placeholder').exists()).toBe(true)

    // Mock that the device is now connected
    mockDevices['camera-456'].isConnected = true

    // Re-render component by forcing component update
    await wrapper.vm.$forceUpdate()
    await flushPromises()

    // Now the camera panel should be visible
    expect(wrapper.find('[data-testid="camera-panel"]').exists()).toBe(true)
    expect(wrapper.find('.detail-content-placeholder').exists()).toBe(false)
  })
})
