import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseDevicePanel from '@/components/panels/BaseDevicePanel.vue'

// Mock the UnifiedStore
const mockGetDeviceById = vi.fn()
const mockConnectDevice = vi.fn()
const mockDisconnectDevice = vi.fn()

vi.mock('@/stores/UnifiedStore', () => ({
  useUnifiedStore: vi.fn(() => ({
    getDeviceById: mockGetDeviceById,
    connectDevice: mockConnectDevice,
    disconnectDevice: mockDisconnectDevice
  }))
}))

describe('BaseDevicePanel.vue', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
  })

  it('renders the component and properly handles device connection', async () => {
    // Mock device data
    const testDevice = {
      id: 'test-device-id',
      name: 'Test Device',
      type: 'telescope',
      isConnected: false,
      isConnecting: false,
      isDisconnecting: false
    }

    // Setup mock return value
    mockGetDeviceById.mockReturnValue(testDevice)

    // Mount the component
    const wrapper = mount(BaseDevicePanel, {
      props: {
        deviceId: 'test-device-id',
        title: 'Test Panel'
      }
    })

    // Check that the device info is displayed
    expect(wrapper.find('.device-name').text()).toBe('Test Device')
    expect(wrapper.find('.device-type').text()).toBe('telescope')

    // Connect button should be present when disconnected
    const connectBtn = wrapper.find('.connect-btn')
    expect(connectBtn.exists()).toBe(true)

    // Click connect button
    await connectBtn.trigger('click')

    // Check that connect was called
    expect(mockConnectDevice).toHaveBeenCalledWith('test-device-id')
  })
})
