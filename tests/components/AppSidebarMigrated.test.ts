import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AppSidebarMigrated from '../../src/components/AppSidebarMigrated.vue'

// Mock the required stores
vi.mock('../../src/stores/UnifiedStore', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      devices: [
        {
          id: 'telescope-1',
          name: 'Test Telescope',
          type: 'telescope',
          isConnected: false,
          isConnecting: false,
          isDisconnecting: false,
          properties: {}
        },
        {
          id: 'camera-1',
          name: 'Test Camera',
          type: 'camera',
          isConnected: true,
          isConnecting: false,
          isDisconnecting: false,
          properties: {}
        }
      ]
    }))
  }
})

// Create a mock for the UI preferences store
const mockToggleSidebar = vi.fn()
let mockIsSidebarVisible = true

vi.mock('../../src/stores/useUIPreferencesStore', () => {
  return {
    useUIPreferencesStore: vi.fn(() => ({
      get isSidebarVisible() {
        return mockIsSidebarVisible
      },
      toggleSidebar: mockToggleSidebar
    }))
  }
})

describe('AppSidebarMigrated', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsSidebarVisible = true
    mockToggleSidebar.mockReset()
  })

  it('renders correctly with sidebar expanded', () => {
    const wrapper = mount(AppSidebarMigrated)

    // Should not have collapsed class
    expect(wrapper.classes()).not.toContain('sidebar-collapsed')

    // Should display header title
    expect(wrapper.find('.sidebar-header h2').exists()).toBe(true)

    // Should show device categories
    expect(wrapper.findAll('.device-category').length).toBe(2) // telescope and camera
  })

  it('displays devices with correct connection status', () => {
    const wrapper = mount(AppSidebarMigrated)

    // Find all device items
    const devices = wrapper.findAll('.device-item')
    expect(devices.length).toBe(2)

    // Check connection status for each device
    const connectedDevices = wrapper.findAll('.device-connected')
    expect(connectedDevices.length).toBe(1) // Only camera is connected

    // Check device names are displayed
    expect(wrapper.text()).toContain('Test Telescope')
    expect(wrapper.text()).toContain('Test Camera')

    // Check connection status text
    const statuses = wrapper.findAll('.device-status')
    expect(statuses[0].text()).toContain('Disconnected')
    expect(statuses[1].text()).toContain('Connected')
  })

  it('toggles sidebar visibility when button is clicked', async () => {
    const wrapper = mount(AppSidebarMigrated)
    const toggleButton = wrapper.find('.collapse-toggle')

    // Click the toggle button
    await toggleButton.trigger('click')

    // Check if the toggle function was called
    expect(mockToggleSidebar).toHaveBeenCalledTimes(1)
  })

  it('renders collapsed view when sidebar is not visible', async () => {
    // Update the mock to return sidebar not visible
    mockIsSidebarVisible = false

    const wrapper = mount(AppSidebarMigrated)

    // Should have collapsed class
    expect(wrapper.classes()).toContain('sidebar-collapsed')

    // Should not display header title
    expect(wrapper.find('.sidebar-header h2').exists()).toBe(false)

    // Should show collapsed device items instead of categories
    expect(wrapper.findAll('.collapsed-device-item').length).toBe(2)
    expect(wrapper.findAll('.device-category').length).toBe(0)
  })

  it('renders icons for different device types', () => {
    const wrapper = mount(AppSidebarMigrated)

    // Instead of testing the internal method, check that icons are rendered
    const deviceIcons = wrapper.findAll('.device-icon')

    // Expect two icons (one for each device)
    expect(deviceIcons.length).toBe(2)

    // Each icon should contain an SVG
    expect(deviceIcons[0].find('svg').exists()).toBe(true)
    expect(deviceIcons[1].find('svg').exists()).toBe(true)
  })
})
