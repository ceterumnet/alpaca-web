import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import BaseDevicePanel from '../../src/components/panels/BaseDevicePanel.vue'
import { UIMode } from '../../src/stores/useUIPreferencesStore'
import type { Device } from '../../src/types/DeviceTypes'

// Define the exposed interface of the BaseDevicePanel component
interface BasePanelInstance {
  device: Device | null
  isConnected: boolean
  deviceType: string
  deviceNum: number
  currentMode: UIMode
  handleConnect: () => Promise<void>
  handleModeChange: (mode: UIMode) => void
}

// Create a mock device
const mockDevice = {
  id: 'test-device',
  name: 'Test Device',
  type: 'camera',
  isConnected: false,
  isConnecting: false,
  isDisconnecting: false,
  properties: {}
}

// Mock the useUnifiedStore
const mockGetDeviceById = vi.fn().mockReturnValue(mockDevice)
const mockConnectDevice = vi.fn().mockResolvedValue(true)
const mockDisconnectDevice = vi.fn().mockResolvedValue(true)
const mockFetchDeviceProperties = vi.fn().mockResolvedValue(undefined)

vi.mock('../../src/stores/UnifiedStore', () => ({
  useUnifiedStore: vi.fn().mockImplementation(() => ({
    getDeviceById: mockGetDeviceById,
    connectDevice: mockConnectDevice,
    disconnectDevice: mockDisconnectDevice,
    fetchDeviceProperties: mockFetchDeviceProperties
  }))
}))

describe('BaseDevicePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mock device state
    mockDevice.isConnected = false

    // Reset mock implementation for each test
    mockGetDeviceById.mockReturnValue(mockDevice)
  })

  it('renders without errors', () => {
    const wrapper = mount(BaseDevicePanel, {
      props: {
        deviceId: 'test-device',
        title: 'Test Device Panel'
      },
      slots: {
        default: '<div>Test Device Panel Content</div>'
      }
    })

    expect(wrapper.exists()).toBe(true)
    // The component doesn't actually render the title, it just exposes a slot
    expect(wrapper.html()).toContain('div')
    expect(wrapper.text()).toContain('Test Device Panel Content')
  })

  it('exposes the expected methods and computed properties', () => {
    const wrapper = mount(BaseDevicePanel, {
      props: {
        deviceId: 'test-device',
        title: 'Test Device Panel'
      }
    })

    const vm = wrapper.vm as unknown as BasePanelInstance

    // Test computed properties
    expect(vm.device).toBe(mockDevice)
    expect(vm.isConnected).toBe(false)
    expect(vm.deviceType).toBe('camera')
    expect(vm.deviceNum).toBe(0) // Since our deviceId doesn't parse to a number
    expect(vm.currentMode).toBe(UIMode.OVERVIEW)

    // Test that methods exist
    expect(typeof vm.handleConnect).toBe('function')
    expect(typeof vm.handleModeChange).toBe('function')
  })

  it('calls connect when handleConnect is invoked and device is disconnected', async () => {
    const wrapper = mount(BaseDevicePanel, {
      props: {
        deviceId: 'test-device',
        title: 'Test Device Panel'
      }
    })

    const vm = wrapper.vm as unknown as BasePanelInstance
    await vm.handleConnect()

    expect(mockConnectDevice).toHaveBeenCalledWith('test-device')
    expect(mockDisconnectDevice).not.toHaveBeenCalled()
  })

  it('calls disconnect when handleConnect is invoked and device is connected', async () => {
    // Update mock to return a connected device
    mockDevice.isConnected = true

    const wrapper = mount(BaseDevicePanel, {
      props: {
        deviceId: 'test-device',
        title: 'Test Device Panel'
      }
    })

    const vm = wrapper.vm as unknown as BasePanelInstance
    await vm.handleConnect()

    expect(mockDisconnectDevice).toHaveBeenCalledWith('test-device')
    expect(mockConnectDevice).not.toHaveBeenCalled()
  })

  it('updates currentMode when handleModeChange is called', async () => {
    const wrapper = mount(BaseDevicePanel, {
      props: {
        deviceId: 'test-device',
        title: 'Test Device Panel'
      }
    })

    const vm = wrapper.vm as unknown as BasePanelInstance
    expect(vm.currentMode).toBe(UIMode.OVERVIEW)

    await vm.handleModeChange(UIMode.DETAILED)
    expect(vm.currentMode).toBe(UIMode.DETAILED)

    await vm.handleModeChange(UIMode.FULLSCREEN)
    expect(vm.currentMode).toBe(UIMode.FULLSCREEN)
  })

  it('correctly parses numeric deviceId', () => {
    // Set up with a numeric device ID
    const wrapper = mount(BaseDevicePanel, {
      props: {
        deviceId: '123',
        title: 'Test Device Panel'
      }
    })

    const vm = wrapper.vm as unknown as BasePanelInstance
    expect(vm.deviceNum).toBe(123)
  })

  it('handles device not found gracefully', () => {
    // Set up to return null for the device
    mockGetDeviceById.mockReturnValueOnce(null)

    const wrapper = mount(BaseDevicePanel, {
      props: {
        deviceId: 'non-existent-device',
        title: 'Test Device Panel'
      }
    })

    const vm = wrapper.vm as unknown as BasePanelInstance
    expect(vm.device).toBeNull()
    expect(vm.isConnected).toBe(false)
    expect(vm.deviceType).toBe('')
  })
})
