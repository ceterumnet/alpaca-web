/**
 * Tests for AppSidebarMigrated component
 *
 * This test file verifies the functionality of the AppSidebarMigrated component
 * which uses the UnifiedStore directly instead of the adapter pattern.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import AppSidebarMigrated from '@/components/AppSidebarMigrated.vue'
import { createPinia, setActivePinia } from 'pinia'

// Create mock functions for UI store
const mockToggleSidebar = vi.fn()
let mockIsSidebarVisible = true

// Control the devices list
let mockDevicesList = [
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

// Interface for the component's instance
interface ComponentInstance {
  getIconForDeviceType: (type: string) => string
  devicesByCategory: Record<string, unknown[]>
}

// Mock the stores
vi.mock('@/stores/UnifiedStore', () => ({
  useUnifiedStore: () => ({
    get devicesList() {
      return mockDevicesList
    }
  })
}))

// Mock the useUIPreferencesStore
vi.mock('@/stores/useUIPreferencesStore', () => ({
  useUIPreferencesStore: vi.fn(() => ({
    get isSidebarVisible() {
      return mockIsSidebarVisible
    },
    toggleSidebar: mockToggleSidebar
  }))
}))

// Mock the Icon component to avoid SVG loading issues
vi.mock('@/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    props: ['type'],
    template: '<div class="icon" :data-type="type">{{ type }}</div>'
  }
}))

describe('AppSidebarMigrated.vue (Direct Store)', () => {
  let wrapper: VueWrapper

  // Set up before each test
  beforeEach(() => {
    // Create a fresh pinia for each test
    setActivePinia(createPinia())

    // Reset sidebar visibility to true for most tests
    mockIsSidebarVisible = true

    // Reset devices list to default
    mockDevicesList = [
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

    // Reset all mocks
    vi.clearAllMocks()

    // Initialize component wrapper
    wrapper = mount(AppSidebarMigrated)
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
    expect(mockToggleSidebar).toHaveBeenCalled()
  })

  /**
   * Test 3: Device Connection Status
   * Verifies that device connection status is displayed correctly
   */
  it('shows correct connection status for devices', () => {
    // Get all device items
    const deviceItems = wrapper.findAll('.device-item')

    // First device (telescope) is not connected
    expect(deviceItems[0].classes()).not.toContain('device-connected')

    // Second device (camera) is connected
    expect(deviceItems[1].classes()).toContain('device-connected')
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
    // Access the component's instance
    const vm = wrapper.vm as unknown as ComponentInstance

    // Check that icons have the correct type returned by the method
    expect(vm.getIconForDeviceType('telescope')).toBe('search')
    expect(vm.getIconForDeviceType('camera')).toBe('camera')
    expect(vm.getIconForDeviceType('focuser')).toBe('focus')
  })

  /**
   * Test 6: Collapsed View
   * Tests that the collapsed view shows correct elements
   */
  it('displays collapsed view when sidebar is collapsed', async () => {
    // Set mockIsSidebarVisible to false for this test
    mockIsSidebarVisible = false

    // Create a new wrapper with collapsed state
    const collapsedWrapper = mount(AppSidebarMigrated)

    // Check that sidebar has collapsed class
    expect(collapsedWrapper.find('.sidebar').classes()).toContain('sidebar-collapsed')

    // Check that collapsed devices are shown
    expect(collapsedWrapper.find('.sidebar-collapsed-content').exists()).toBe(true)

    // Check that expanded content is not shown
    expect(collapsedWrapper.find('.sidebar-content').exists()).toBe(false)
  })

  /**
   * Test 7: Empty State
   * Verifies that component handles empty device list gracefully
   */
  it('handles empty device list gracefully', async () => {
    // Set device list to empty for this test
    mockDevicesList = []

    // Create a new wrapper with empty device list
    const emptyWrapper = mount(AppSidebarMigrated)

    // Check that no device categories are rendered
    expect(emptyWrapper.findAll('.device-category')).toHaveLength(0)

    // Check that no device items are rendered
    expect(emptyWrapper.findAll('.device-item')).toHaveLength(0)
  })
})
