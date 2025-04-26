/**
 * Tests for AppSidebarMigrated component
 *
 * This test file verifies the functionality of the AppSidebarMigrated component
 * which uses the UnifiedStore directly instead of the adapter pattern.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount, VueWrapper } from '@vue/test-utils'
import AppSidebarMigrated from '@/components/AppSidebarMigrated.vue'
import UnifiedStore from '@/stores/UnifiedStore'
import { useUIPreferencesStore } from '@/stores/useUIPreferencesStore'
import type { Device } from '@/types/DeviceTypes'

// Mock the useUIPreferencesStore
vi.mock('@/stores/useUIPreferencesStore', () => ({
  useUIPreferencesStore: vi.fn(() => ({
    isSidebarVisible: true,
    toggleSidebar: vi.fn()
  }))
}))

describe('AppSidebarMigrated.vue (Direct Store)', () => {
  let store: UnifiedStore
  let testDevices: Device[]
  let wrapper: VueWrapper
  let mockUIStore: ReturnType<typeof useUIPreferencesStore>

  // Set up before each test
  beforeEach(() => {
    // Create a fresh store for each test
    store = new UnifiedStore()

    // Access the mocked store
    mockUIStore = useUIPreferencesStore()

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
      },
      {
        id: 'focuser-3',
        name: 'Test Focuser',
        type: 'focuser',
        ipAddress: '192.168.1.102',
        port: 4569,
        isConnected: false,
        isConnecting: false,
        isDisconnecting: false,
        properties: {}
      }
    ]

    // Mock the store's devices getter
    Object.defineProperty(store, 'devices', {
      get: vi.fn(() => testDevices)
    })

    // Initialize component wrapper
    wrapper = shallowMount(AppSidebarMigrated, {
      global: {
        // Provide mocked modules
        provide: {
          store
        }
      }
    })
  })

  /**
   * Test 1: Basic Rendering
   * Verifies that the component renders correctly with devices from the store
   */
  it('renders correctly with devices categorized by type', () => {
    // Check that the sidebar exists
    expect(wrapper.find('.sidebar').exists()).toBe(true)

    // Check that device categories are rendered
    expect(wrapper.findAll('.device-category')).toHaveLength(3) // telescope, camera, focuser

    // Check that device items are rendered
    expect(wrapper.findAll('.device-item')).toHaveLength(3) // One for each device
  })

  /**
   * Test 2: Collapse State
   * Tests the sidebar collapse functionality
   */
  it('toggles sidebar visibility correctly', async () => {
    // Initially sidebar should be expanded (isSidebarVisible = true)
    expect(wrapper.find('.sidebar-collapsed').exists()).toBe(false)

    // Click the collapse toggle button
    await wrapper.find('.collapse-toggle').trigger('click')

    // Verify the UI store's toggleSidebar was called
    expect(mockUIStore.toggleSidebar).toHaveBeenCalled()
  })

  /**
   * Test 3: Device Connection Status
   * Verifies that device connection status is displayed correctly
   */
  it('shows correct connection status for devices', () => {
    // Find all connection status indicators
    const statusIndicators = wrapper.findAll('.connection-status')

    // First device (telescope) is not connected
    expect(statusIndicators[0].classes()).not.toContain('connected')

    // Second device (camera) is connected
    expect(statusIndicators[1].classes()).toContain('connected')
  })

  /**
   * Test 4: Device Categorization
   * Verifies that devices are categorized correctly by type
   */
  it('categorizes devices correctly by type', () => {
    // Find all category titles
    const categoryTitles = wrapper.findAll('.category-title')

    // Check that category titles are correct
    expect(categoryTitles[0].text()).toBe('telescope')
    expect(categoryTitles[1].text()).toBe('camera')
    expect(categoryTitles[2].text()).toBe('focuser')
  })

  /**
   * Test 5: Device Icon Selection
   * Verifies that the correct icon is selected for each device type
   */
  it('selects the correct icon for each device type', () => {
    // Find all device icons
    const deviceIcons = wrapper.findAll('.device-icon')

    // Check that icons have the correct type attribute
    expect(deviceIcons[0].attributes('type')).toBe('search') // telescope
    expect(deviceIcons[1].attributes('type')).toBe('camera') // camera
    expect(deviceIcons[2].attributes('type')).toBe('exposure') // focuser
  })

  /**
   * Test 6: Collapsed View
   * Tests that the collapsed view shows correct elements
   */
  it('displays collapsed view when sidebar is collapsed', async () => {
    // Mock the UI store to return collapsed state
    vi.mocked(mockUIStore).isSidebarVisible = false

    // Create a new wrapper with collapsed state
    const collapsedWrapper = shallowMount(AppSidebarMigrated, {
      global: {
        provide: {
          store
        }
      }
    })

    // Check that sidebar has collapsed class
    expect(collapsedWrapper.find('.sidebar-collapsed').exists()).toBe(true)

    // Check that collapsed devices are shown
    expect(collapsedWrapper.findAll('.collapsed-device-item')).toHaveLength(3)

    // Check that expanded devices are not shown
    expect(collapsedWrapper.findAll('.device-item')).toHaveLength(0)
  })

  /**
   * Test 7: Empty State
   * Verifies that component handles empty device list gracefully
   */
  it('handles empty device list gracefully', async () => {
    // Create a store with no devices
    const emptyStore = new UnifiedStore()

    // Mock the devices getter to return an empty array
    Object.defineProperty(emptyStore, 'devices', {
      get: vi.fn(() => [])
    })

    // Create a wrapper with the empty store
    const emptyWrapper = shallowMount(AppSidebarMigrated, {
      global: {
        provide: {
          store: emptyStore
        }
      }
    })

    // Check that no device categories or items are rendered
    expect(emptyWrapper.findAll('.device-category')).toHaveLength(0)
    expect(emptyWrapper.findAll('.device-item')).toHaveLength(0)
  })
})
