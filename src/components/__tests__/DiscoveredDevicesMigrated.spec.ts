import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import DiscoveredDevicesMigrated from '../DiscoveredDevicesMigrated.vue'
import { useDiscoveredDevicesStore } from '@/stores/useDiscoveredDevicesStore'
import UnifiedStore from '@/stores/UnifiedStore'
import axios from 'axios'
import type { DiscoveredDevice } from '@/types/DiscoveredDevice'

// Mock axios
vi.mock('axios')

// Mock the component dependencies
vi.mock('@/stores/useDiscoveredDevicesStore', () => ({
  useDiscoveredDevicesStore: vi.fn()
}))

vi.mock('@/stores/UnifiedStore', () => ({
  default: vi.fn().mockImplementation(() => ({
    addDevice: vi.fn(),
    connectDevice: vi.fn(),
    devices: [],
    on: vi.fn(),
    off: vi.fn(),
    createProxy: vi.fn()
  }))
}))

// Mock the ManualDeviceConfig component
vi.mock('../ManualDeviceConfig.vue', () => ({
  default: {
    name: 'ManualDeviceConfig',
    template: '<div data-testid="manual-device-config"></div>'
  }
}))

// Type for the component instance
interface ComponentInstance {
  isLoading: boolean
  connectToDevice: (index: number) => Promise<void>
}

describe('DiscoveredDevicesMigrated.vue', () => {
  let mockDiscoveredDevicesStore: Record<string, any>
  let mockUnifiedStore: Record<string, any>

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Setup mock discovered devices store
    mockDiscoveredDevicesStore = {
      isDiscovering: false,
      lastDiscoveryTime: new Date(),
      discoverDevices: vi.fn(),
      sortedDevices: [
        {
          address: '192.168.1.100',
          port: 11111,
          AlpacaPort: 11111,
          ServerName: 'Test Server',
          Manufacturer: 'Test Manufacturer',
          isManualEntry: false,
          discoveryTime: new Date().toISOString() // Add the required property
        }
      ],
      getProxyUrl: vi.fn().mockReturnValue('/proxy/192.168.1.100/11111')
    }

    // Mock the useDiscoveredDevicesStore to return our mock
    vi.mocked(useDiscoveredDevicesStore).mockReturnValue(mockDiscoveredDevicesStore as any)

    // Setup mock axios responses
    vi.mocked(axios.get).mockImplementation((url: string) => {
      if (url.includes('/management/v1/description')) {
        return Promise.resolve({
          data: {
            Value: {
              ServerName: 'Test Server',
              Manufacturer: 'Test Manufacturer',
              ManufacturerVersion: '1.0',
              Location: 'Test Location'
            }
          }
        })
      } else if (url.includes('/management/v1/configureddevices')) {
        return Promise.resolve({
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
      }
      return Promise.resolve({ data: {} })
    })

    // Create a new instance of UnifiedStore for each test
    mockUnifiedStore = {
      addDevice: vi.fn(),
      connectDevice: vi.fn().mockResolvedValue(undefined),
      devices: [],
      on: vi.fn(),
      off: vi.fn(),
      createProxy: vi.fn()
    }
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders the component correctly', async () => {
    const wrapper = mount(DiscoveredDevicesMigrated)

    // Wait for any promises to resolve
    await flushPromises()

    expect(wrapper.find('h2').text()).toBe('Discovered Devices')
    expect(wrapper.find('.discover-btn').exists()).toBe(true)
  })

  it('calls discoverDevices on mount', async () => {
    mount(DiscoveredDevicesMigrated)

    // Wait for any promises to resolve
    await flushPromises()

    expect(mockDiscoveredDevicesStore.discoverDevices).toHaveBeenCalled()
  })

  it('refreshes device list when lastDiscoveryTime changes', async () => {
    // Mount component
    const wrapper = mount(DiscoveredDevicesMigrated)
    await flushPromises()

    // Clear the calls record
    vi.mocked(axios.get).mockClear()

    // Change the lastDiscoveryTime
    const newTime = new Date(mockDiscoveredDevicesStore.lastDiscoveryTime.getTime() + 5000)
    mockDiscoveredDevicesStore.lastDiscoveryTime = newTime

    // Force Vue to react to the change
    await wrapper.vm.$nextTick()
    await flushPromises()

    // Check that the API calls were made to fetch devices
    expect(axios.get).toHaveBeenCalledWith(
      '/proxy/192.168.1.100/11111/management/v1/configureddevices'
    )
  })

  it('adds devices to UnifiedStore when connectToDevice is called', async () => {
    // Replace the UnifiedStore class mock implementation
    vi.mocked(UnifiedStore).mockImplementation(() => mockUnifiedStore)

    const wrapper = mount(DiscoveredDevicesMigrated)
    await flushPromises()

    // Wait for devices to be discovered and populate
    await wrapper.vm.$nextTick()

    // Manually trigger the connectToDevice method with type assertion
    await (wrapper.vm as any).connectToDevice(0)

    // Verify that addDevice was called
    expect(mockUnifiedStore.addDevice).toHaveBeenCalled()
    // Verify that connectDevice was called with the correct ID
    expect(mockUnifiedStore.connectDevice).toHaveBeenCalled()
  })

  it('displays the correct number of devices', async () => {
    const wrapper = mount(DiscoveredDevicesMigrated)
    await flushPromises()

    // Wait for devices to be discovered and populate
    await wrapper.vm.$nextTick()

    // Check if we get device cards rendered
    const deviceCards = wrapper.findAll('.device-card')
    expect(deviceCards.length).toBeGreaterThan(0)
  })

  it('includes the ManualDeviceConfig component', async () => {
    const wrapper = mount(DiscoveredDevicesMigrated)
    await flushPromises()

    expect(wrapper.find('[data-testid="manual-device-config"]').exists()).toBe(true)
  })

  it('shows loading state during device connection', async () => {
    const wrapper = mount(DiscoveredDevicesMigrated)
    await flushPromises()

    // Wait for devices to be discovered and populate
    await wrapper.vm.$nextTick()

    // Start the connection process but don't wait for it to complete
    const connectButton = wrapper.find('.connect-btn')
    connectButton.trigger('click')

    // Wait for the UI to update but not for the promises to resolve
    await wrapper.vm.$nextTick()

    // Check for loading indicators using type assertion
    expect((wrapper.vm as any).isLoading).toBe(true)
  })
})
