import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import DiscoveryPanelMigrated from '../DiscoveryPanelMigrated.vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import type { UnifiedDevice } from '@/types/DeviceTypes'

// Mock the UnifiedStore
vi.mock('@/stores/UnifiedStore', () => ({
  useUnifiedStore: vi.fn(),
  default: vi.fn().mockImplementation(() => ({
    startDiscovery: vi.fn(),
    stopDiscovery: vi.fn(),
    isDiscovering: false,
    devicesList: [],
    on: vi.fn(),
    off: vi.fn()
  }))
}))

describe('DiscoveryPanelMigrated.vue', () => {
  let mockStore: {
    devicesList: UnifiedDevice[]
    isDiscovering: boolean
    startDiscovery: ReturnType<typeof vi.fn>
    stopDiscovery: ReturnType<typeof vi.fn>
    connectDevice: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock the store
    mockStore = {
      devicesList: [
        {
          id: 'telescope-1',
          name: 'Sample Telescope',
          type: 'telescope',
          ipAddress: '192.168.1.100',
          port: 8000,
          isConnected: false,
          isConnecting: false,
          isDisconnecting: false,
          properties: {}
        },
        {
          id: 'camera-1',
          name: 'Sample Camera',
          type: 'camera',
          ipAddress: '192.168.1.101',
          port: 8001,
          isConnected: true,
          isConnecting: false,
          isDisconnecting: false,
          properties: {}
        }
      ],
      isDiscovering: false,
      startDiscovery: vi.fn().mockResolvedValue(true),
      stopDiscovery: vi.fn().mockResolvedValue(true),
      connectDevice: vi.fn().mockResolvedValue(true)
    }

    // Make useUnifiedStore return our mock store
    vi.mocked(useUnifiedStore).mockReturnValue(
      mockStore as unknown as ReturnType<typeof useUnifiedStore>
    )
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders the component with device list', async () => {
    const wrapper = mount(DiscoveryPanelMigrated)
    await flushPromises()

    // Check if the title is rendered correctly
    expect(wrapper.find('h2').text()).toBe('Device Discovery')

    // Check if the discover button is rendered
    expect(wrapper.find('.discover-button').exists()).toBe(true)
    expect(wrapper.find('.discover-button').text()).toBe('Start Discovery')

    // Check if the devices are rendered
    const deviceItems = wrapper.findAll('.device-item')
    expect(deviceItems.length).toBe(2)

    // Verify first device details
    expect(deviceItems[0].find('.device-name').text()).toBe('Sample Telescope')
    expect(deviceItems[0].find('.device-type').text()).toBe('telescope')
    expect(deviceItems[0].find('.device-address').text()).toBe('192.168.1.100:8000')
    expect(deviceItems[0].find('.connect-button').text()).toBe('Connect')

    // Verify second device details
    expect(deviceItems[1].find('.device-name').text()).toBe('Sample Camera')
    expect(deviceItems[1].find('.device-type').text()).toBe('camera')
    expect(deviceItems[1].find('.device-address').text()).toBe('192.168.1.101:8001')
    expect(deviceItems[1].find('.connect-button').text()).toBe('Connected')
  })

  it('shows a message when no devices are discovered', async () => {
    // Override the mock to return empty device list
    mockStore.devicesList = []

    const wrapper = mount(DiscoveryPanelMigrated)
    await flushPromises()

    // Check if the no devices message is shown
    expect(wrapper.find('.no-devices').exists()).toBe(true)
    expect(wrapper.find('.no-devices').text()).toBe('No devices discovered yet')
  })

  it('starts discovery when button is clicked', async () => {
    const wrapper = mount(DiscoveryPanelMigrated)
    await flushPromises()

    // Click the discover button
    await wrapper.find('.discover-button').trigger('click')

    // Check if startDiscovery was called
    expect(mockStore.startDiscovery).toHaveBeenCalled()

    // Verify that the discover event was emitted
    expect(wrapper.emitted('discover')?.[0]).toEqual([true])
  })

  it('stops discovery when button is clicked while discovering', async () => {
    // Set isDiscovering to true
    mockStore.isDiscovering = true

    const wrapper = mount(DiscoveryPanelMigrated)
    await flushPromises()

    // Check if button text reflects the discovering state
    expect(wrapper.find('.discover-button').text()).toBe('Stop Discovery')

    // Click the discover button
    await wrapper.find('.discover-button').trigger('click')

    // Check if stopDiscovery was called
    expect(mockStore.stopDiscovery).toHaveBeenCalled()

    // Verify that the discover event was emitted
    expect(wrapper.emitted('discover')?.[0]).toEqual([false])
  })

  it('emits connect-device event and calls connectDevice when connect button is clicked', async () => {
    const wrapper = mount(DiscoveryPanelMigrated)
    await flushPromises()

    // Click the connect button for the first device
    await wrapper.findAll('.connect-button')[0].trigger('click')

    // Check if connectDevice was called with the correct device ID
    expect(mockStore.connectDevice).toHaveBeenCalledWith('telescope-1')

    // Verify that the connect-device event was emitted with the device object
    const emitted = wrapper.emitted('connect-device')
    expect(emitted).toBeDefined()
    expect(emitted?.[0][0]).toEqual(mockStore.devicesList[0])
  })

  it('disabled connect button for already connected devices', async () => {
    const wrapper = mount(DiscoveryPanelMigrated)
    await flushPromises()

    // The second device is already connected
    const secondDeviceButton = wrapper.findAll('.connect-button')[1]

    // Check if the button is disabled
    expect(secondDeviceButton.attributes('disabled')).toBeDefined()
  })
})
