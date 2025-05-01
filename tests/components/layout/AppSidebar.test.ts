/**
 * Unit tests for the migrated AppSidebar component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import { createPinia, setActivePinia } from 'pinia'

// Mock the UI Preferences store
const mockToggleSidebar = vi.fn()
let mockIsSidebarVisible = true

vi.mock('@/stores/useUIPreferencesStore', () => ({
  useUIPreferencesStore: vi.fn(() => ({
    isSidebarVisible: mockIsSidebarVisible,
    toggleSidebar: mockToggleSidebar
  }))
}))

// Mock UnifiedStore
interface MockDevice {
  id: string
  name: string
  type: string
  isConnected: boolean
  ipAddress: string
  port: number
  isConnecting: boolean
  isDisconnecting: boolean
  properties: Record<string, unknown>
}

const mockDevices: MockDevice[] = [
  {
    id: 'telescope-1',
    name: 'Main Telescope',
    type: 'telescope',
    isConnected: true,
    ipAddress: '192.168.1.100',
    port: 11111,
    isConnecting: false,
    isDisconnecting: false,
    properties: {
      apiBaseUrl: 'http://192.168.1.100:11111/api/v1/telescope/0'
    }
  },
  {
    id: 'camera-1',
    name: 'Main Camera',
    type: 'camera',
    isConnected: false,
    ipAddress: '192.168.1.101',
    port: 11112,
    isConnecting: false,
    isDisconnecting: false,
    properties: {
      apiBaseUrl: 'http://192.168.1.101:11112/api/v1/camera/0'
    }
  }
]

vi.mock('../../../src/stores/UnifiedStore', () => {
  return {
    useUnifiedStore: vi.fn(() => ({
      devicesList: mockDevices,
      isSidebarVisible: true
    }))
  }
})

// Mock the Icon component
vi.mock('../../../src/components/ui/Icon.vue', () => ({
  default: {
    name: 'Icon',
    props: ['type'],
    template: '<div class="icon" :data-icon-type="type"></div>'
  }
}))

describe('AppSidebar', () => {
  beforeEach(() => {
    // Create and set the active Pinia instance before each test
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockIsSidebarVisible = true // Reset for each test
  })

  it('renders the sidebar with correct device categories', () => {
    const wrapper = mount(AppSidebar)

    // Check if the sidebar is rendered
    expect(wrapper.find('.sidebar').exists()).toBe(true)

    // Check if we have the expected device categories
    const categories = wrapper.findAll('.category-title')
    expect(categories.length).toBe(2)
    expect(categories[0].text()).toBe('telescope')
    expect(categories[1].text()).toBe('camera')
  })

  it('renders device items with correct information', () => {
    const wrapper = mount(AppSidebar)

    // Check device items
    const deviceItems = wrapper.findAll('.device-item')
    expect(deviceItems.length).toBe(2)

    // Check first device (telescope - connected)
    expect(deviceItems[0].find('.device-name').text()).toBe('Main Telescope')
    expect(deviceItems[0].classes()).toContain('device-connected')

    // Check second device (camera - not connected)
    expect(deviceItems[1].find('.device-name').text()).toBe('Main Camera')
    expect(deviceItems[1].classes()).not.toContain('device-connected')
  })

  it('toggles sidebar when button is clicked', async () => {
    const wrapper = mount(AppSidebar)

    // Find and click the collapse toggle button
    const toggleButton = wrapper.find('.collapse-toggle')
    await toggleButton.trigger('click')

    // Check if toggleSidebar was called
    expect(mockToggleSidebar).toHaveBeenCalledTimes(1)
  })

  it('shows correct collapsed view when sidebar is collapsed', async () => {
    // Change the mock value for this test
    mockIsSidebarVisible = false

    const wrapper = mount(AppSidebar)

    // Check if sidebar has collapsed class
    expect(wrapper.find('.sidebar').classes()).toContain('sidebar-collapsed')

    // Check if device categories are not shown
    expect(wrapper.find('.device-category').exists()).toBe(false)

    // Check if collapsed devices are shown
    const collapsedDevices = wrapper.findAll('.collapsed-device-item')
    expect(collapsedDevices.length).toBe(2)

    // Check if tooltips are set correctly
    expect(collapsedDevices[0].attributes('title')).toBe('Main Telescope')
    expect(collapsedDevices[1].attributes('title')).toBe('Main Camera')
  })

  // Update the icons test
  it('renders icons for different device types', () => {
    const wrapper = mount(AppSidebar)

    // Check that icons are rendered
    const deviceIcons = wrapper.findAll('.device-icon')
    expect(deviceIcons.length).toBe(2)
  })
})
