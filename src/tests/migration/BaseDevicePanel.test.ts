/**
 * Tests for BaseDevicePanel component
 *
 * This test file verifies the functionality of the BaseDevicePanel component
 * which uses the UnifiedStore directly instead of the adapter pattern.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount, VueWrapper } from '@vue/test-utils'
import BaseDevicePanel from '@/components/BaseDevicePanel.vue'
import UnifiedStore from '@/stores/UnifiedStore'
import { UIMode } from '@/stores/useUIPreferencesStore'
import type { Device } from '@/types/DeviceTypes'

// Define an interface for the exposed properties of BaseDevicePanel
interface BasePanelExposed {
  device: Device | undefined
  connected: boolean
  deviceType: string
  deviceNum: number
  currentMode: UIMode
  handleConnect: () => void
  handleModeChange: (mode: UIMode) => void
}

describe('BaseDevicePanel.vue (Direct Store)', () => {
  let store: UnifiedStore
  let testDevices: Device[]
  let wrapper: VueWrapper

  // Set up before each test
  beforeEach(() => {
    // Create a fresh store for each test
    store = new UnifiedStore()

    // Mock store methods as needed
    store.connectDevice = vi.fn().mockResolvedValue(true)
    store.disconnectDevice = vi.fn().mockResolvedValue(true)

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
    store.getDeviceById = vi.fn().mockImplementation((id: string) => {
      return testDevices.find((d) => d.id === id)
    })

    // Initialize component wrapper with the disconnected device
    wrapper = shallowMount(BaseDevicePanel, {
      props: {
        deviceId: 'telescope-1',
        title: 'Test Telescope Panel'
      },
      global: {
        // Provide the store for components that might inject it
        provide: {
          store
        }
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
    expect(store.getDeviceById).toHaveBeenCalledWith('telescope-1')

    // Check derived computed properties
    expect(vm.deviceType).toBe('telescope')
    expect(vm.connected).toBe(false)
    expect(vm.deviceNum).toBe(1)
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
    expect(store.connectDevice).toHaveBeenCalledWith('telescope-1')
    expect(store.disconnectDevice).not.toHaveBeenCalled()
  })

  /**
   * Test 3: Disconnect Handling
   * Verifies that the component correctly handles device disconnection
   */
  it('handles connect action correctly for connected device', async () => {
    // Create a wrapper with the connected device
    const connectedWrapper = shallowMount(BaseDevicePanel, {
      props: {
        deviceId: 'camera-2',
        title: 'Test Camera Panel'
      },
      global: {
        provide: {
          store
        }
      }
    })

    // Get the component instance
    const vm = connectedWrapper.vm as unknown as BasePanelExposed

    // Call the connect handler
    vm.handleConnect()

    // Verify disconnectDevice was called with the correct ID
    expect(store.disconnectDevice).toHaveBeenCalledWith('camera-2')
    expect(store.connectDevice).not.toHaveBeenCalled()
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
    expect(vm.connected).toBe(false)
    expect(vm.deviceNum).toBe(0)

    // Ensure calling handleConnect doesn't throw an error
    expect(() => vm.handleConnect()).not.toThrow()
  })
})
