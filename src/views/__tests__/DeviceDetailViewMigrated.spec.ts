import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import DeviceDetailViewMigrated from '../DeviceDetailViewMigrated.vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import type { UnifiedDevice } from '@/types/DeviceTypes'

// Create a mock router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/devices/:id',
      name: 'DeviceDetail',
      component: DeviceDetailViewMigrated
    },
    {
      path: '/devices',
      name: 'Devices',
      component: { template: '<div>Devices</div>' }
    }
  ]
})

// Create a basic mock first
const mockUnifiedStore = {
  getDeviceById: vi.fn(),
  updateDevice: vi.fn(),
  devicesList: []
}

vi.mock('@/stores/UnifiedStore', () => ({
  useUnifiedStore: vi.fn(),
  default: vi.fn().mockImplementation(() => mockUnifiedStore)
}))

// Mock the panel components
vi.mock('@/components/TelescopePanelMigrated.vue', () => ({
  default: {
    template: '<div data-testid="telescope-panel"></div>',
    props: ['deviceId', 'connected', 'panelName', 'deviceType', 'supportedModes']
  }
}))

vi.mock('@/components/CameraPanelMigrated.vue', () => ({
  default: {
    template: '<div data-testid="camera-panel"></div>',
    props: ['deviceId', 'connected', 'panelName', 'deviceType', 'supportedModes']
  }
}))

vi.mock('@/components/EnhancedPanelComponentMigrated.vue', () => ({
  default: {
    template: '<div data-testid="enhanced-panel"></div>',
    props: ['deviceId', 'connected', 'panelName', 'deviceType', 'supportedModes']
  }
}))

describe('DeviceDetailViewMigrated', () => {
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

  let mockStore: ReturnType<typeof useUnifiedStore>

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup the route
    router.push('/devices/telescope-123')

    // Setup mock store
    mockStore = useUnifiedStore()

    // Setup mock getDeviceById to return the appropriate device
    vi.mocked(mockStore.getDeviceById).mockImplementation((id: string) => {
      return mockDevices[id] || null
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should display device details when device exists', async () => {
    const wrapper = mount(DeviceDetailViewMigrated, {
      global: {
        plugins: [router]
      }
    })
    await router.isReady()
    await flushPromises()

    // Check device details are displayed
    expect(wrapper.text()).toContain('Test Telescope')
    expect(wrapper.text()).toContain('telescope')
    expect(wrapper.text()).toContain('Connected')
  })

  it('should display the appropriate panel component for a telescope device', async () => {
    const wrapper = mount(DeviceDetailViewMigrated, {
      global: {
        plugins: [router]
      }
    })
    await router.isReady()
    await flushPromises()

    // Should contain telescope panel
    expect(wrapper.find('[data-testid="telescope-panel"]').exists()).toBe(true)
  })

  it('should display the appropriate panel component for a camera device', async () => {
    // Change route to camera device
    await router.push('/devices/camera-456')

    const wrapper = mount(DeviceDetailViewMigrated, {
      global: {
        plugins: [router]
      }
    })
    await router.isReady()
    await flushPromises()

    // Should not contain telescope panel
    expect(wrapper.find('[data-testid="telescope-panel"]').exists()).toBe(false)

    // Camera device is not connected, so no panel should be shown
    expect(wrapper.find('[data-testid="camera-panel"]').exists()).toBe(false)

    // Should show placeholder
    expect(wrapper.text()).toContain('Connect to the device to access controls')
  })

  it('should display not found message when device does not exist', async () => {
    // Change route to non-existent device
    await router.push('/devices/unknown-device')

    const wrapper = mount(DeviceDetailViewMigrated, {
      global: {
        plugins: [router]
      }
    })
    await router.isReady()
    await flushPromises()

    // Should show not found message
    expect(wrapper.text()).toContain('The requested device could not be found')
  })

  it('should connect a device when the connect button is clicked', async () => {
    // Change route to camera device (which is not connected)
    await router.push('/devices/camera-456')

    const wrapper = mount(DeviceDetailViewMigrated, {
      global: {
        plugins: [router]
      }
    })
    await router.isReady()
    await flushPromises()

    // Click connect button
    await wrapper.find('button.action-button').trigger('click')
    await flushPromises()

    // Should call connectDevice
    expect(mockStore.connectDevice).toHaveBeenCalledWith('camera-456')
  })

  it('should disconnect a device when the disconnect button is clicked', async () => {
    // Use telescope device (which is connected)
    await router.push('/devices/telescope-123')

    const wrapper = mount(DeviceDetailViewMigrated, {
      global: {
        plugins: [router]
      }
    })
    await router.isReady()
    await flushPromises()

    // Click disconnect button
    await wrapper.find('button.action-button').trigger('click')
    await flushPromises()

    // Should call disconnectDevice
    expect(mockStore.disconnectDevice).toHaveBeenCalledWith('telescope-123')
  })

  it('should navigate back to devices view when back button is clicked', async () => {
    const wrapper = mount(DeviceDetailViewMigrated, {
      global: {
        plugins: [router]
      }
    })
    await router.isReady()
    await flushPromises()

    // Click back button
    await wrapper.find('button.back-button').trigger('click')
    await flushPromises()

    // Should navigate to devices route
    expect(router.currentRoute.value.path).toBe('/devices')
  })

  it('should handle connection errors gracefully', async () => {
    // Setup connectDevice to fail
    mockStore.connectDevice = vi.fn().mockRejectedValue(new Error('Connection failed'))

    // Change route to camera device
    await router.push('/devices/camera-456')

    const wrapper = mount(DeviceDetailViewMigrated, {
      global: {
        plugins: [router]
      }
    })
    await router.isReady()
    await flushPromises()

    // Click connect button
    await wrapper.find('button.action-button').trigger('click')
    await flushPromises()

    // Should have called connectDevice
    expect(mockStore.connectDevice).toHaveBeenCalledWith('camera-456')

    // Component should recover from error and reset isConnectionChanging flag
    const vm = wrapper.vm as any
    expect(vm.isConnectionChanging).toBe(false)

    // Component should not crash
    expect(wrapper.find('button.action-button').exists()).toBe(true)
  })

  it('should handle disconnection errors gracefully', async () => {
    // Setup disconnectDevice to fail
    mockStore.disconnectDevice = vi.fn().mockRejectedValue(new Error('Disconnection failed'))

    // Use telescope device (which is connected)
    await router.push('/devices/telescope-123')

    const wrapper = mount(DeviceDetailViewMigrated, {
      global: {
        plugins: [router]
      }
    })
    await router.isReady()
    await flushPromises()

    // Click disconnect button
    await wrapper.find('button.action-button').trigger('click')
    await flushPromises()

    // Should have called disconnectDevice
    expect(mockStore.disconnectDevice).toHaveBeenCalledWith('telescope-123')

    // Component should recover from error and reset isConnectionChanging flag
    const vm = wrapper.vm as any
    expect(vm.isConnectionChanging).toBe(false)

    // Component should not crash
    expect(wrapper.find('button.action-button').exists()).toBe(true)
  })

  it('should disable connect/disconnect button during connection changes', async () => {
    // Use a device that is in the connecting state
    await router.push('/devices/connecting-device')

    const wrapper = mount(DeviceDetailViewMigrated, {
      global: {
        plugins: [router]
      }
    })
    await router.isReady()
    await flushPromises()

    // Button should be disabled
    const button = wrapper.find('button.action-button')
    expect(button.attributes('disabled')).toBeDefined()

    // Should show 'Connecting...' text
    expect(button.text()).toContain('Connecting')
  })

  it('should disable connect/disconnect button during disconnection changes', async () => {
    // Use a device that is in the disconnecting state
    await router.push('/devices/disconnecting-device')

    const wrapper = mount(DeviceDetailViewMigrated, {
      global: {
        plugins: [router]
      }
    })
    await router.isReady()
    await flushPromises()

    // Button should be disabled
    const button = wrapper.find('button.action-button')
    expect(button.attributes('disabled')).toBeDefined()

    // Should show 'Disconnecting...' text
    expect(button.text()).toContain('Disconnecting')
  })

  it('should display the enhanced panel component for unknown device types', async () => {
    // Use a focuser device (which we don't have a specific panel for)
    await router.push('/devices/focuser-789')

    // Mock the device to be connected
    mockDevices['focuser-789'].isConnected = true

    const wrapper = mount(DeviceDetailViewMigrated, {
      global: {
        plugins: [router]
      }
    })
    await router.isReady()
    await flushPromises()

    // Should use the enhanced panel for focuser
    expect(wrapper.find('[data-testid="enhanced-panel"]').exists()).toBe(true)
  })

  it('should show location and server information when available', async () => {
    // Use a device with location and server information
    await router.push('/devices/device-with-location')

    const wrapper = mount(DeviceDetailViewMigrated, {
      global: {
        plugins: [router]
      }
    })
    await router.isReady()
    await flushPromises()

    // Should show location and server information
    expect(wrapper.text()).toContain('Observatory 1')
    expect(wrapper.text()).toContain('Main Server')
  })

  it('should show "Unknown" for missing location and server information', async () => {
    // Use a device without location and server information
    await router.push('/devices/telescope-123')

    const wrapper = mount(DeviceDetailViewMigrated, {
      global: {
        plugins: [router]
      }
    })
    await router.isReady()
    await flushPromises()

    // Should show "Unknown" for location and server
    expect(wrapper.text()).toContain('Location:')
    expect(wrapper.text()).toContain('Unknown')
    expect(wrapper.text()).toContain('Server:')
    expect(wrapper.text()).toContain('Unknown')
  })

  it('should handle local connection state changes and UI updates', async () => {
    const wrapper = mount(DeviceDetailViewMigrated, {
      global: {
        plugins: [router]
      }
    })
    await router.isReady()
    await flushPromises()

    // Get component instance to set isConnectionChanging directly
    const vm = wrapper.vm as any
    vm.isConnectionChanging = true

    // Force UI update
    await wrapper.vm.$nextTick()

    // Button should be disabled during connection state changes
    const button = wrapper.find('button.action-button')
    expect(button.attributes('disabled')).toBeDefined()

    // Reset connection state for cleanup
    vm.isConnectionChanging = false
    await wrapper.vm.$nextTick()
  })

  it('should update panel visibility when a device connection state changes', async () => {
    // Start with a disconnected camera device
    await router.push('/devices/camera-456')

    const wrapper = mount(DeviceDetailViewMigrated, {
      global: {
        plugins: [router]
      }
    })
    await router.isReady()
    await flushPromises()

    // Panel should not be visible initially
    expect(wrapper.find('[data-testid="camera-panel"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Connect to the device to access controls')

    // Update mock device to be connected
    mockDevices['camera-456'].isConnected = true

    // Force a component re-render by changing the component's data
    // We need to call the device getter again to pick up the new state
    await wrapper.vm.$forceUpdate()
    await flushPromises()

    // Panel should now be visible
    expect(wrapper.find('[data-testid="camera-panel"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Connect to the device to access controls')
  })
})
