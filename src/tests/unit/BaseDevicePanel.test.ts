import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseDevicePanel from '@/components/panels/BaseDevicePanel.vue'

// Mock the UnifiedStore
const mockStore = {
  getDeviceById: vi.fn(),
  connectDevice: vi.fn(),
  disconnectDevice: vi.fn()
}

vi.mock('@/stores/UnifiedStore', () => ({
  useUnifiedStore: () => mockStore
}))

describe('BaseDevicePanel.vue', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
  })

  it('properly initializes with props', async () => {
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
    mockStore.getDeviceById.mockReturnValue(testDevice)

    // Mount the component
    const wrapper = mount(BaseDevicePanel, {
      props: {
        deviceId: 'test-device-id',
        title: 'Test Panel'
      }
    })

    // Verify props were passed correctly
    expect(wrapper.props('deviceId')).toBe('test-device-id')
    expect(wrapper.props('title')).toBe('Test Panel')

    // Check that the component renders a div
    expect(wrapper.find('div').exists()).toBe(true)
  })

  it('exposes correct methods and properties', async () => {
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
    mockStore.getDeviceById.mockReturnValue(testDevice)

    // Mount the component with the composition API
    const wrapper = mount(BaseDevicePanel, {
      props: {
        deviceId: 'test-device-id',
        title: 'Test Panel'
      }
    })

    // Get the exposed methods
    const exposed = wrapper.vm

    // Check that all expected properties and methods are exposed
    expect(exposed).toHaveProperty('device')
    expect(exposed).toHaveProperty('isConnected')
    expect(exposed).toHaveProperty('deviceType')
    expect(exposed).toHaveProperty('deviceNum')
    expect(exposed).toHaveProperty('currentMode')
    expect(exposed).toHaveProperty('handleConnect')
    expect(exposed).toHaveProperty('handleModeChange')
  })
})
