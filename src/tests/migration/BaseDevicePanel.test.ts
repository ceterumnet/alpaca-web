/**
 * Tests for BaseDevicePanel component
 *
 * This test file verifies the functionality of the BaseDevicePanel component
 * which uses the UnifiedStore directly instead of the adapter pattern.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount, VueWrapper } from '@vue/test-utils'
import BaseDevicePanel from '@/components/panels/BaseDevicePanel.vue'
import { UIMode } from '@/stores/useUIPreferencesStore'
import type { Device } from '@/types/DeviceTypes'
import { createPinia, setActivePinia } from 'pinia'

// Create mock functions for store methods
const mockGetDeviceById = vi.fn()
const mockConnectDevice = vi.fn().mockResolvedValue(true)
const mockDisconnectDevice = vi.fn().mockResolvedValue(true)

// Mock the Pinia store
vi.mock('@/stores/UnifiedStore', () => ({
  useUnifiedStore: () => ({
    getDeviceById: mockGetDeviceById,
    connectDevice: mockConnectDevice,
    disconnectDevice: mockDisconnectDevice,
    devicesList: []
  })
}))

// Define an interface for the exposed properties of BaseDevicePanel
interface BasePanelExposed {
  device: Device | undefined
  isConnected: boolean
  deviceType: string
  deviceNum: number
  currentMode: UIMode
  handleConnect: () => void
  handleModeChange: (mode: UIMode) => void
}

describe('BaseDevicePanel.vue (Direct Store)', () => {
  let testDevices: Device[]
  let wrapper: VueWrapper

  // Set up before each test
  beforeEach(() => {
    // Create a fresh pinia for each test
    setActivePinia(createPinia())

    // Reset all mocks
    vi.clearAllMocks()

    // Create test devices
    testDevices = [
      {
        id: 'telescope-1',
        name: 'Test Telescope',
        type: 'telescope',
        ipAddress: '192.168.1.100',
        port: 4567,
        isConnected: false,
        isConnecting: false,
        isDisconnecting: false,
        properties: {}
      },
      {
        id: 'camera-2',
        name: 'Test Camera',
        type: 'camera',
        ipAddress: '192.168.1.101',
        port: 4568,
        isConnected: true,
        isConnecting: false,
        isDisconnecting: false,
        properties: {}
      }
    ]

    // Mock the getDeviceById method to return our test devices
    mockGetDeviceById.mockImplementation((id: string) => {
      return testDevices.find((d) => d.id === id) || null
    })

    // Initialize component wrapper with the disconnected device
    wrapper = shallowMount(BaseDevicePanel, {
      props: {
        deviceId: 'telescope-1',
        title: 'Test Telescope Panel'
      }
    })
  })

  /**
   * Test 1: Basic Props and Computed Properties
   * Verifies that the component handles props correctly and computes derived properties
   */
  it('computes correct device properties from store', async () => {
    // Get the exposed properties from the component
    const vm = wrapper.vm as unknown as BasePanelExposed

    // Check that device was retrieved correctly
    expect(mockGetDeviceById).toHaveBeenCalledWith('telescope-1')

    // Check derived computed properties
    expect(vm.deviceType).toBe('telescope')
    expect(vm.isConnected).toBe(false)
    expect(vm.deviceNum).toBe(0)
  })

  /**
   * Test 2: Connect Handling
   * Verifies that the component correctly handles device connection
   */
  it('handles connect action correctly for disconnected device', async () => {
    // Get the component instance
    const vm = wrapper.vm as unknown as BasePanelExposed

    // Call the connect handler
    vm.handleConnect()

    // Verify connectDevice was called with the correct ID
    expect(mockConnectDevice).toHaveBeenCalledWith('telescope-1')
    expect(mockDisconnectDevice).not.toHaveBeenCalled()
  })

  /**
   * Test 3: Disconnect Handling
   * Verifies that the component correctly handles device disconnection
   */
  it('handles connect action correctly for connected device', async () => {
    // Reset the mock implementation for this test
    mockGetDeviceById.mockImplementation((id: string) => {
      const device = testDevices.find((d) => d.id === id)
      if (device) {
        return { ...device }
      }
      return null
    })

    // Create a wrapper with the connected device
    const connectedWrapper = shallowMount(BaseDevicePanel, {
      props: {
        deviceId: 'camera-2',
        title: 'Test Camera Panel'
      }
    })

    // Get the component instance
    const vm = connectedWrapper.vm as unknown as BasePanelExposed

    // Call the connect handler
    vm.handleConnect()

    // Verify disconnectDevice was called with the correct ID
    expect(mockDisconnectDevice).toHaveBeenCalledWith('camera-2')
    expect(mockConnectDevice).not.toHaveBeenCalled()
  })

  /**
   * Test 4: Mode Change
   * Verifies that the component correctly handles UI mode changes
   */
  it('handles mode changes correctly', async () => {
    // Get the component instance
    const vm = wrapper.vm as unknown as BasePanelExposed

    // Initial mode should be OVERVIEW
    expect(vm.currentMode).toBe(UIMode.OVERVIEW)

    // Change to DETAILED mode
    vm.handleModeChange(UIMode.DETAILED)

    // Verify mode was updated
    expect(vm.currentMode).toBe(UIMode.DETAILED)
  })

  /**
   * Test 5: Slot Rendering
   * Verifies that the component correctly renders content in its slot
   */
  it('renders content in slot correctly', async () => {
    // Create wrapper with slot content
    const wrapperWithSlot = shallowMount(BaseDevicePanel, {
      props: {
        deviceId: 'telescope-1',
        title: 'Test Telescope Panel'
      },
      slots: {
        default: '<div class="test-content">Panel Content</div>'
      }
    })

    // Check if slot content is rendered
    expect(wrapperWithSlot.find('.test-content').exists()).toBe(true)
    expect(wrapperWithSlot.find('.test-content').text()).toBe('Panel Content')
  })

  /**
   * Test 6: Invalid Device ID
   * Verifies that the component handles cases where the device ID doesn't exist
   */
  it('handles invalid device IDs gracefully', async () => {
    // Reset mock to return null for non-existent devices
    mockGetDeviceById.mockReturnValue(null)

    // Create wrapper with invalid device ID
    const invalidWrapper = shallowMount(BaseDevicePanel, {
      props: {
        deviceId: 'non-existent-device',
        title: 'Invalid Device'
      }
    })

    // Get the component instance
    const vm = invalidWrapper.vm as unknown as BasePanelExposed

    // Check that computed properties have default values
    expect(vm.deviceType).toBe('')
    expect(vm.isConnected).toBe(false)
    expect(vm.deviceNum).toBe(0)

    // Ensure calling handleConnect doesn't throw an error
    expect(() => vm.handleConnect()).not.toThrow()
  })
})
