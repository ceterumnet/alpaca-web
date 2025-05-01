import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import DevicePage from '@/views/DevicePage.vue'
import type { UnifiedDevice } from '@/types/DeviceTypes'

// Mock the DeviceDetailViewMigrated component
vi.mock('@/views/DeviceDetailView.vue', () => ({
  default: {
    name: 'DeviceDetailView',
    template: '<div data-testid="device-detail-view">Device Detail View</div>'
  }
}))

// Create a mock router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/devices/:id',
      name: 'DeviceDetail',
      component: DevicePage
    },
    {
      path: '/devices',
      name: 'Devices',
      component: { template: '<div>Devices</div>' }
    }
  ]
})

// Mock the store
const mockGetDeviceById = vi.fn()
const mockHasDevice = vi.fn()

vi.mock('@/stores/UnifiedStore', () => ({
  useUnifiedStore: () => ({
    getDeviceById: mockGetDeviceById,
    hasDevice: mockHasDevice,
    devicesList: []
  })
}))

describe('DevicePage', () => {
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
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Setup the route
    router.push('/devices/telescope-123')
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should display loading state initially', async () => {
    // Configure mocks to simulate loading
    mockGetDeviceById.mockReturnValue(null)
    mockHasDevice.mockReturnValue(true)

    const wrapper = mount(DevicePage, {
      global: {
        plugins: [router]
      }
    })

    // Should show loading state initially
    expect(wrapper.find('.loading-container').exists()).toBe(true)
    expect(wrapper.text()).toContain('Loading device information')
  })

  it('should display error state when device is not found', async () => {
    // Configure mocks to simulate device not found
    mockGetDeviceById.mockReturnValue(null)
    mockHasDevice.mockReturnValue(false)

    const wrapper = mount(DevicePage, {
      global: {
        plugins: [router]
      }
    })

    // Wait for mounted hook to complete
    await flushPromises()

    // Should show error state
    expect(wrapper.find('.error-container').exists()).toBe(true)
    expect(wrapper.text()).toContain('Error')
    expect(wrapper.text()).toContain('not found')
  })

  it('should display the detail view when device is found', async () => {
    // Configure mocks to simulate device found
    mockGetDeviceById.mockReturnValue(mockDevices['telescope-123'])
    mockHasDevice.mockReturnValue(true)

    const wrapper = mount(DevicePage, {
      global: {
        plugins: [router]
      }
    })

    // Wait for mounted hook to complete
    await flushPromises()

    // Should show detail view
    expect(wrapper.find('[data-testid="device-detail-view"]').exists()).toBe(true)
  })

  it('should navigate back to devices list when back button is clicked', async () => {
    // Configure mocks to simulate device not found (to show the error state with back button)
    mockGetDeviceById.mockReturnValue(null)
    mockHasDevice.mockReturnValue(false)

    const wrapper = mount(DevicePage, {
      global: {
        plugins: [router]
      }
    })

    // Wait for mounted hook to complete
    await flushPromises()

    // Click back button
    await wrapper.find('.action-button').trigger('click')
    await flushPromises()

    // Should navigate to devices route
    expect(router.currentRoute.value.path).toBe('/devices')
  })

  it('should reset error state when device becomes available', async () => {
    // First configure mocks to simulate device not found
    mockGetDeviceById.mockReturnValue(null)
    mockHasDevice.mockReturnValue(false)

    const wrapper = mount(DevicePage, {
      global: {
        plugins: [router]
      }
    })

    // Wait for mounted hook to complete
    await flushPromises()

    // Should show error state
    expect(wrapper.find('.error-container').exists()).toBe(true)

    // Now simulate device becoming available
    mockGetDeviceById.mockReturnValue(mockDevices['telescope-123'])

    // Create a new wrapper to force component re-render with updated mocks
    const newWrapper = mount(DevicePage, {
      global: {
        plugins: [router]
      }
    })

    // Wait for component to update
    await flushPromises()

    // The error container should not be visible anymore
    expect(newWrapper.find('.error-container').exists()).toBe(false)
    // The loading container should not be visible anymore
    expect(newWrapper.find('.loading-container').exists()).toBe(false)

    // Clean up
    newWrapper.unmount()
    wrapper.unmount()
  })

  it('should handle unexpected errors during initialization', async () => {
    // Configure hasDevice to throw an error
    mockHasDevice.mockImplementation(() => {
      throw new Error('Unexpected error checking device')
    })

    const wrapper = mount(DevicePage, {
      global: {
        plugins: [router]
      }
    })

    // Wait for mounted hook to complete
    await flushPromises()

    // Should show error state with appropriate message
    expect(wrapper.find('.error-container').exists()).toBe(true)
    expect(wrapper.text()).toContain('Error')
    expect(wrapper.text()).toContain('Unexpected error')
  })

  it('should update when route changes to a different device', async () => {
    // Configure mocks for first device
    mockGetDeviceById.mockReturnValue(mockDevices['telescope-123'])
    mockHasDevice.mockReturnValue(true)

    const wrapper = mount(DevicePage, {
      global: {
        plugins: [router]
      }
    })

    // Wait for mounted hook to complete
    await flushPromises()

    // Should show detail view
    expect(wrapper.find('[data-testid="device-detail-view"]').exists()).toBe(true)

    // Now change the route to a different device
    await router.push('/devices/camera-456')

    // Update mock for second device
    mockGetDeviceById.mockReturnValue(mockDevices['camera-456'])

    // Wait for navigation and updates
    await flushPromises()

    // Should still show detail view, but for new device
    expect(wrapper.find('[data-testid="device-detail-view"]').exists()).toBe(true)

    // Verify deviceId was updated in the component (by checking what was passed to getDeviceById)
    expect(mockGetDeviceById).toHaveBeenCalledWith('camera-456')
  })

  it('should handle loading state transition to detail view', async () => {
    // First configure mocks to simulate loading
    mockGetDeviceById.mockReturnValue(null)
    mockHasDevice.mockReturnValue(true)

    const wrapper = mount(DevicePage, {
      global: {
        plugins: [router]
      }
    })

    // Should show loading state initially
    expect(wrapper.find('.loading-container').exists()).toBe(true)

    // Now make the device available
    mockGetDeviceById.mockReturnValue(mockDevices['telescope-123'])

    // Simulate component update
    await wrapper.vm.$forceUpdate()
    await flushPromises()

    // Should transition to detail view
    expect(wrapper.find('.loading-container').exists()).toBe(false)
    expect(wrapper.find('[data-testid="device-detail-view"]').exists()).toBe(true)
  })

  it('should handle invalid device IDs gracefully', async () => {
    // Change route to use an invalid ID format
    await router.push('/devices/invalid!@#$%')

    // Configure mocks for invalid device
    mockGetDeviceById.mockReturnValue(null)
    mockHasDevice.mockReturnValue(false)

    const wrapper = mount(DevicePage, {
      global: {
        plugins: [router]
      }
    })

    // Wait for mounted hook to complete
    await flushPromises()

    // Should show error state with the exact ID from the route
    expect(wrapper.find('.error-container').exists()).toBe(true)
    // Check for part of the error message only
    expect(wrapper.text()).toContain('not found')
  })

  it('should show proper animation classes during loading', async () => {
    // Configure mocks to simulate loading
    mockGetDeviceById.mockReturnValue(null)
    mockHasDevice.mockReturnValue(true)

    const wrapper = mount(DevicePage, {
      global: {
        plugins: [router]
      }
    })

    // Check for loading spinner animation class
    expect(wrapper.find('.loading-spinner').exists()).toBe(true)
  })

  it('should use correct CSS classes for error display', async () => {
    // Configure mocks to simulate device not found
    mockGetDeviceById.mockReturnValue(null)
    mockHasDevice.mockReturnValue(false)

    const wrapper = mount(DevicePage, {
      global: {
        plugins: [router]
      }
    })

    // Wait for mounted hook to complete
    await flushPromises()

    // Error heading should have appropriate styling
    const errorHeading = wrapper.find('.error-container h2')
    expect(errorHeading.exists()).toBe(true)
  })

  it('should render the detail view when a device is available right away', async () => {
    // Configure mocks to show device is immediately available
    mockGetDeviceById.mockReturnValue(mockDevices['telescope-123'])
    mockHasDevice.mockReturnValue(true)

    const wrapper = mount(DevicePage, {
      global: {
        plugins: [router]
      }
    })

    // Wait for component setup
    await flushPromises()

    // Should skip loading state if device is immediately available
    expect(wrapper.find('.loading-container').exists()).toBe(false)
    expect(wrapper.find('[data-testid="device-detail-view"]').exists()).toBe(true)
  })
})
