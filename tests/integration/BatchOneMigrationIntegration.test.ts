import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AppSidebarMigrated from '../../src/components/AppSidebarMigrated.vue'
import BaseDevicePanel from '../../src/components/panels/BaseDevicePanel.vue'
import EnhancedPanelComponentMigrated from '../../src/components/EnhancedPanelComponentMigrated.vue'
import { UIMode } from '../../src/stores/useUIPreferencesStore'

// Mock stores for integration testing
vi.mock('../../src/stores/UnifiedStore', () => {
  const mockStore = {
    devices: [
      {
        id: 'telescope-1',
        name: 'Test Telescope',
        type: 'telescope',
        isConnected: true,
        isConnecting: false,
        isDisconnecting: false,
        properties: {}
      }
    ],
    devicesList: [
      {
        id: 'telescope-1',
        name: 'Test Telescope',
        type: 'telescope',
        isConnected: true,
        isConnecting: false,
        isDisconnecting: false,
        properties: {}
      }
    ],
    getDeviceById: vi.fn((id) => {
      if (id === 'telescope-1') {
        return {
          id: 'telescope-1',
          name: 'Test Telescope',
          type: 'telescope',
          isConnected: true,
          isConnecting: false,
          isDisconnecting: false,
          properties: {}
        }
      }
      return null
    }),
    connectDevice: vi.fn(),
    disconnectDevice: vi.fn()
  }

  return {
    default: vi.fn().mockImplementation(() => mockStore),
    useUnifiedStore: vi.fn(() => mockStore)
  }
})

// Mock UI preferences store
const mockToggleSidebar = vi.fn()
let mockIsSidebarVisible = true

vi.mock('../../src/stores/useUIPreferencesStore', () => {
  return {
    UIMode: {
      OVERVIEW: 'overview',
      DETAILED: 'detailed',
      FULLSCREEN: 'fullscreen'
    },
    useUIPreferencesStore: vi.fn(() => ({
      get isSidebarVisible() {
        return mockIsSidebarVisible
      },
      toggleSidebar: mockToggleSidebar,
      getDeviceUIMode: vi.fn(() => UIMode.OVERVIEW),
      setDeviceUIMode: vi.fn()
    }))
  }
})

describe('Batch 1 Migration Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsSidebarVisible = true
    mockToggleSidebar.mockReset()
  })

  it('AppSidebarMigrated and BaseDevicePanel work together', () => {
    // Mount both components
    const sidebarWrapper = mount(AppSidebarMigrated)
    const panelWrapper = mount(BaseDevicePanel, {
      props: {
        deviceId: 'telescope-1',
        title: 'Test Telescope Panel'
      }
    })

    // Verify sidebar displays the device
    expect(sidebarWrapper.text()).toContain('Test Telescope')
    expect(sidebarWrapper.find('.device-connected').exists()).toBe(true)

    // Verify panel properly loads device
    expect(panelWrapper.text()).toBe('') // Empty because it's just a container with slots
    expect(panelWrapper.vm.isConnected).toBe(true)
    expect(panelWrapper.vm.deviceType).toBe('telescope')
  })

  it('AppSidebarMigrated and EnhancedPanelComponentMigrated work together', () => {
    // Mount components
    const sidebarWrapper = mount(AppSidebarMigrated)
    const panelWrapper = mount(EnhancedPanelComponentMigrated, {
      props: {
        panelName: 'Telescope Panel',
        deviceType: 'telescope',
        deviceId: 'telescope-1',
        connected: true
      }
    })

    // Verify sidebar shows the connected device
    expect(sidebarWrapper.text()).toContain('Test Telescope')

    // Verify panel renders correctly
    expect(panelWrapper.find('.panel-title').text()).toBe('Telescope Panel')
    expect(panelWrapper.find('.status-indicator').text()).toContain('Connected')
  })

  it('EnhancedPanelComponentMigrated and BaseDevicePanel use UI preferences correctly', () => {
    // Mount components
    const basePanel = mount(BaseDevicePanel, {
      props: {
        deviceId: 'telescope-1',
        title: 'Test Telescope'
      }
    })

    const enhancedPanel = mount(EnhancedPanelComponentMigrated, {
      props: {
        panelName: 'Enhanced Panel',
        deviceType: 'telescope',
        deviceId: 'telescope-1',
        connected: true
      }
    })

    // Both panels should have access to UI modes
    expect(basePanel.vm.currentMode).toBeDefined()
    expect(enhancedPanel.props().deviceType).toBe('telescope')

    // Sidebar visibility changes should affect panel appearance
    mockIsSidebarVisible = false
    const updatedPanel = mount(EnhancedPanelComponentMigrated, {
      props: {
        panelName: 'Enhanced Panel',
        deviceType: 'telescope',
        deviceId: 'telescope-1',
        connected: true
      }
    })

    // Panel should not have sidebar-expanded class
    expect(updatedPanel.classes()).not.toContain('sidebar-expanded')
  })
})
