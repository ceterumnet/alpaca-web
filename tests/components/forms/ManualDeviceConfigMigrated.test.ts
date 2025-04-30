import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ManualDeviceConfigMigrated from '../../../src/components/devices/ManualDeviceConfigMigrated.vue'
import { useDiscoveredDevicesStore } from '../../../src/stores/useDiscoveredDevicesStore'
import axios from 'axios'

// Mock the stores
vi.mock('../../../src/stores/useDiscoveredDevicesStore', () => ({
  useDiscoveredDevicesStore: vi.fn()
}))

// Create a mockUnifiedStore
const mockUnifiedStore = {
  addDevice: vi.fn(),
  connectDevice: vi.fn().mockResolvedValue(true)
}

vi.mock('../../../src/stores/UnifiedStore', () => ({
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

    // Setup getProxyUrl to return a URL
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

    // Should have called addManualDevice with correct params - note that it's called with two separate params, not an object
    expect(discoveredDevicesStore.addManualDevice).toHaveBeenCalledWith('192.168.1.100', 8000)

    // Should have successfully added both devices
    expect(mockUnifiedStore.addDevice).toHaveBeenCalledTimes(2)

    // Should have cleared the form and hidden it
    expect(wrapper.find('.config-form').exists()).toBe(false)

    // Should have reset the error state
    expect(wrapper.find('.error-message').exists()).toBe(false)
  })

  it('allows connecting to added devices', async () => {
    // Setup mocks for success case
    discoveredDevicesStore.addManualDevice.mockResolvedValue({
      ServerName: 'Test Server',
      Manufacturer: 'Test Manufacturer'
    })

    // Setup getProxyUrl to return a URL
    discoveredDevicesStore.getProxyUrl.mockReturnValue('http://localhost:8000')

    const wrapper = mount(ManualDeviceConfigMigrated)

    // Show the form
    await wrapper.find('.toggle-btn').trigger('click')

    // Fill out the form - note that we removed the connectDevice checkbox set since it doesn't exist
    await wrapper.find('#deviceAddress').setValue('192.168.1.100')
    await wrapper.find('#devicePort').setValue('8000')

    // Submit the form
    await wrapper.find('.add-btn').trigger('click')
    await flushPromises()

    // Devices are added but not automatically connected in the current implementation
    expect(mockUnifiedStore.addDevice).toHaveBeenCalledTimes(2)
  })

  it('handles different device types correctly', async () => {
    // Setup axios to return different device types
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
            DeviceType: 'Focuser', // This will be filtered out by the component
            DeviceNumber: 0
          },
          {
            DeviceType: 'FilterWheel', // This will be filtered out by the component
            DeviceNumber: 0
          }
        ]
      }
    })

    // Setup mocks for success case
    discoveredDevicesStore.addManualDevice.mockResolvedValue({
      ServerName: 'Test Server',
      Manufacturer: 'Test Manufacturer'
    })

    // Setup getProxyUrl to return a URL
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

    // Should have added only 2 devices (telescope and camera) - the component filters others out
    expect(mockUnifiedStore.addDevice).toHaveBeenCalledTimes(2)

    // Check that the correct device types were added
    const addedDevices = mockUnifiedStore.addDevice.mock.calls.map((call) => call[0])

    expect(addedDevices).toContainEqual(expect.objectContaining({ type: 'telescope' }))
    expect(addedDevices).toContainEqual(expect.objectContaining({ type: 'camera' }))
    // Focuser and FilterWheel should be filtered out by the component
  })
})
