import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ManualDeviceConfigMigrated from '@/components/ManualDeviceConfigMigrated.vue'
import { useDiscoveredDevicesStore } from '@/stores/useDiscoveredDevicesStore'
import axios from 'axios'

// Mock the stores
vi.mock('@/stores/useDiscoveredDevicesStore', () => ({
  useDiscoveredDevicesStore: vi.fn()
}))

// Create a mockUnifiedStore
const mockUnifiedStore = {
  addDevice: vi.fn(),
  connectDevice: vi.fn().mockResolvedValue(true)
}

vi.mock('@/stores/UnifiedStore', () => ({
  useUnifiedStore: vi.fn(() => mockUnifiedStore)
}))

// Mock axios
vi.mock('axios')

// Define a type for our mocked store
interface MockDiscoveredDevicesStore {
  addManualDevice: ReturnType<typeof vi.fn>
  getProxyUrl: ReturnType<typeof vi.fn>
}

describe('ManualDeviceConfigMigrated.vue', () => {
  let discoveredDevicesStore: MockDiscoveredDevicesStore

  beforeEach(() => {
    // Set up a fresh Pinia instance
    const pinia = createPinia()
    setActivePinia(pinia)

    // Clear mocks
    mockUnifiedStore.addDevice.mockClear()
    mockUnifiedStore.connectDevice.mockClear()

    // Mock discovered devices store
    discoveredDevicesStore = {
      addManualDevice: vi.fn(),
      getProxyUrl: vi.fn()
    }

    // Setup mocks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useDiscoveredDevicesStore).mockReturnValue(discoveredDevicesStore as any)

    // Setup axios mock
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        Value: [
          {
            DeviceType: 'Telescope',
            DeviceNumber: 0
          },
          {
            DeviceType: 'Camera',
            DeviceNumber: 0
          }
        ]
      }
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders correctly with initially hidden form', () => {
    const wrapper = mount(ManualDeviceConfigMigrated)

    // Should render the component
    expect(wrapper.find('.manual-device-config').exists()).toBe(true)

    // Form should be initially hidden
    expect(wrapper.find('.config-form').exists()).toBe(false)

    // Button should say "Add Device Manually"
    const button = wrapper.find('.toggle-btn')
    expect(button.exists()).toBe(true)
    expect(button.text()).toBe('Add Device Manually')
  })

  it('shows the form when button is clicked', async () => {
    const wrapper = mount(ManualDeviceConfigMigrated)

    // Click the button to show the form
    await wrapper.find('.toggle-btn').trigger('click')

    // Form should now be visible
    expect(wrapper.find('.config-form').exists()).toBe(true)

    // Button should now say "Cancel"
    expect(wrapper.find('.toggle-btn').text()).toBe('Cancel')
  })

  it('hides the form when Cancel is clicked', async () => {
    const wrapper = mount(ManualDeviceConfigMigrated)

    // First show the form
    await wrapper.find('.toggle-btn').trigger('click')
    expect(wrapper.find('.config-form').exists()).toBe(true)

    // Now click Cancel to hide it
    await wrapper.find('.toggle-btn').trigger('click')
    expect(wrapper.find('.config-form').exists()).toBe(false)
  })

  it('shows validation error for empty fields', async () => {
    const wrapper = mount(ManualDeviceConfigMigrated)

    // Show the form
    await wrapper.find('.toggle-btn').trigger('click')

    // Clear the inputs (they have default values)
    await wrapper.find('#deviceAddress').setValue('')
    await wrapper.find('#devicePort').setValue('')

    // Submit the form
    await wrapper.find('.add-btn').trigger('click')

    // Should show validation error
    expect(wrapper.find('.error-message').exists()).toBe(true)
    expect(wrapper.find('.error-message').text()).toContain('Address and port are required')

    // addManualDevice should not have been called
    expect(discoveredDevicesStore.addManualDevice).not.toHaveBeenCalled()
  })

  it('handles server error during device addition', async () => {
    // Setup mock to throw an error
    discoveredDevicesStore.addManualDevice.mockRejectedValue(new Error('Connection failed'))

    const wrapper = mount(ManualDeviceConfigMigrated)

    // Show the form
    await wrapper.find('.toggle-btn').trigger('click')

    // Fill out the form
    await wrapper.find('#deviceAddress').setValue('192.168.1.100')
    await wrapper.find('#devicePort').setValue('8000')

    // Submit the form
    await wrapper.find('.add-btn').trigger('click')
    await flushPromises()

    // Should show error message
    expect(wrapper.find('.error-message').exists()).toBe(true)
    expect(wrapper.find('.error-message').text()).toContain('Connection failed')

    // Form should still be visible
    expect(wrapper.find('.config-form').exists()).toBe(true)
  })

  it('handles API error during device configuration fetch', async () => {
    // Setup addManualDevice to succeed
    discoveredDevicesStore.addManualDevice.mockResolvedValue({
      ServerName: 'Test Server',
      Manufacturer: 'Test Manufacturer'
    })

    // Setup getProxyUrl to return a URL
    discoveredDevicesStore.getProxyUrl.mockReturnValue('http://localhost:8000')

    // Setup axios to throw an error
    vi.mocked(axios.get).mockRejectedValue(new Error('API error'))

    const wrapper = mount(ManualDeviceConfigMigrated)

    // Show the form
    await wrapper.find('.toggle-btn').trigger('click')

    // Fill out the form
    await wrapper.find('#deviceAddress').setValue('192.168.1.100')
    await wrapper.find('#devicePort').setValue('8000')

    // Submit the form
    await wrapper.find('.add-btn').trigger('click')
    await flushPromises()

    // Should show error message
    expect(wrapper.find('.error-message').exists()).toBe(true)
    expect(wrapper.find('.error-message').text()).toContain('API error')

    // Form should still be visible
    expect(wrapper.find('.config-form').exists()).toBe(true)
  })

  it('successfully adds discovered devices to the unified store', async () => {
    // Setup mocks for success case
    discoveredDevicesStore.addManualDevice.mockResolvedValue({
      ServerName: 'Test Server',
      Manufacturer: 'Test Manufacturer',
      Location: 'Test Location'
    })
    discoveredDevicesStore.getProxyUrl.mockReturnValue('http://localhost:8000')

    const wrapper = mount(ManualDeviceConfigMigrated)

    // Show the form
    await wrapper.find('.toggle-btn').trigger('click')

    // Fill out the form
    await wrapper.find('#deviceAddress').setValue('192.168.1.100')
    await wrapper.find('#devicePort').setValue('8000')

    // Submit the form
    await wrapper.find('.add-btn').trigger('click')
    await flushPromises()

    // Verify addManualDevice was called with correct params
    expect(discoveredDevicesStore.addManualDevice).toHaveBeenCalledWith('192.168.1.100', 8000)

    // Verify getProxyUrl was called
    expect(discoveredDevicesStore.getProxyUrl).toHaveBeenCalled()

    // Verify axios.get was called with correct URL
    expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/management/v1/configureddevices')

    // Verify addDevice was called for each device
    expect(mockUnifiedStore.addDevice).toHaveBeenCalledTimes(2)

    // Check first device
    expect(mockUnifiedStore.addDevice).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '192.168.1.100:8000:telescope:0',
        name: 'Telescope 0',
        type: 'telescope'
      })
    )

    // Check second device
    expect(mockUnifiedStore.addDevice).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '192.168.1.100:8000:camera:0',
        name: 'Camera 0',
        type: 'camera'
      })
    )

    // Form should be hidden after successful submission
    expect(wrapper.find('.config-form').exists()).toBe(false)
  })

  it('filters out unsupported device types', async () => {
    // Setup response with unsupported device types
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        Value: [
          {
            DeviceType: 'Telescope',
            DeviceNumber: 0
          },
          {
            DeviceType: 'Camera',
            DeviceNumber: 0
          },
          {
            DeviceType: 'Focuser',
            DeviceNumber: 0
          },
          {
            DeviceType: 'FilterWheel',
            DeviceNumber: 0
          }
        ]
      }
    })

    // Setup other mocks for success case
    discoveredDevicesStore.addManualDevice.mockResolvedValue({
      ServerName: 'Test Server',
      Manufacturer: 'Test Manufacturer'
    })
    discoveredDevicesStore.getProxyUrl.mockReturnValue('http://localhost:8000')

    const wrapper = mount(ManualDeviceConfigMigrated)

    // Show the form
    await wrapper.find('.toggle-btn').trigger('click')

    // Fill out and submit the form
    await wrapper.find('#deviceAddress').setValue('192.168.1.100')
    await wrapper.find('#devicePort').setValue('8000')
    await wrapper.find('.add-btn').trigger('click')
    await flushPromises()

    // Only telescope and camera should be added (other types should be filtered out)
    expect(mockUnifiedStore.addDevice).toHaveBeenCalledTimes(2)
  })

  it('shows loading state during submission', async () => {
    // Setup mocks with delayed resolution to test loading state
    discoveredDevicesStore.addManualDevice.mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ServerName: 'Test Server',
            Manufacturer: 'Test Manufacturer'
          })
        }, 100)
      })
    })

    const wrapper = mount(ManualDeviceConfigMigrated)

    // Show the form
    await wrapper.find('.toggle-btn').trigger('click')

    // Fill out the form
    await wrapper.find('#deviceAddress').setValue('192.168.1.100')
    await wrapper.find('#devicePort').setValue('8000')

    // Submit the form
    await wrapper.find('.add-btn').trigger('click')

    // Button should show loading state
    expect(wrapper.find('.add-btn').text()).toBe('Adding...')
    expect(wrapper.find('.add-btn').attributes('disabled')).toBeDefined()

    // Wait for the request to complete
    await flushPromises()
  })

  it('creates correct API base URL for added devices', async () => {
    // Setup mocks for success case
    discoveredDevicesStore.addManualDevice.mockResolvedValue({
      ServerName: 'Test Server',
      Manufacturer: 'Test Manufacturer'
    })
    discoveredDevicesStore.getProxyUrl.mockReturnValue('http://localhost:8000')

    const wrapper = mount(ManualDeviceConfigMigrated)

    // Show the form
    await wrapper.find('.toggle-btn').trigger('click')

    // Fill out the form
    await wrapper.find('#deviceAddress').setValue('192.168.1.100')
    await wrapper.find('#devicePort').setValue('8000')

    // Submit the form
    await wrapper.find('.add-btn').trigger('click')
    await flushPromises()

    // Verify the apiBaseUrl is correctly formatted
    expect(mockUnifiedStore.addDevice).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({
          apiBaseUrl: 'http://localhost:8000/api/v1/telescope/0'
        })
      })
    )
  })

  it('correctly marks devices as manual entries', async () => {
    // Setup mocks for success case
    discoveredDevicesStore.addManualDevice.mockResolvedValue({
      ServerName: 'Test Server',
      Manufacturer: 'Test Manufacturer'
    })
    discoveredDevicesStore.getProxyUrl.mockReturnValue('http://localhost:8000')

    const wrapper = mount(ManualDeviceConfigMigrated)

    // Show the form and submit
    await wrapper.find('.toggle-btn').trigger('click')
    await wrapper.find('#deviceAddress').setValue('192.168.1.100')
    await wrapper.find('#devicePort').setValue('8000')
    await wrapper.find('.add-btn').trigger('click')
    await flushPromises()

    // Verify devices are marked as manual entries
    expect(mockUnifiedStore.addDevice).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({
          isManualEntry: true
        })
      })
    )
  })
})
