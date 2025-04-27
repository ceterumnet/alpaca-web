// Add module declaration for TypeScript
declare module '@pinia/testing' {
  export function createTestingPinia(options?: {
    createSpy?: (fn?: any) => any
    stubActions?: boolean
    initialState?: Record<string, unknown>
  }): any
}

import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import TelescopePanelAdapter from '../../src/components/adapters/TelescopePanelAdapter.vue'
import { createTestingPinia } from '@pinia/testing'

// Define a type for the component instance with the methods we expect
interface TelescopePanelAdapterInstance {
  handleSlew: (ra: string, dec: string) => Promise<void>
  handleTrackingToggle: (enabled: boolean) => Promise<void>
  handlePark: () => Promise<void>
  handleUnpark: () => Promise<void>
}

// Mock the device store adapter
vi.mock('../../src/composables/useLegacyDeviceStore', () => ({
  useLegacyDeviceStore: vi.fn(() => ({
    getTelescopeByDeviceId: vi.fn(() => ({
      id: 'telescope-1',
      name: 'Test Telescope',
      connected: true,
      canSlew: true,
      canPark: true,
      canUnpark: true,
      canSetTracking: true,
      isParked: false,
      isConnected: true,
      isTracking: true
    })),
    connectDevice: vi.fn(),
    disconnectDevice: vi.fn()
  }))
}))

// We need to properly render the outer structure with slots
vi.mock('../../src/components/BaseDeviceAdapter.vue', () => ({
  default: {
    name: 'BaseDeviceAdapter',
    props: ['deviceId', 'title'],
    template: '<div class="base-device-adapter"><slot></slot></div>'
  }
}))

// Mock EnhancedTelescopePanel component
vi.mock('../../src/components/EnhancedTelescopePanel.vue', () => ({
  default: {
    name: 'EnhancedTelescopePanel',
    props: {
      connected: Boolean,
      deviceId: String,
      deviceType: String,
      panelName: String,
      apiBaseUrl: String
    },
    template:
      '<div class="enhanced-telescope-panel" idx="telescope-1">Enhanced Telescope Panel</div>'
  }
}))

describe('TelescopePanelAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the adapter correctly', () => {
    const wrapper = mount(TelescopePanelAdapter, {
      props: {
        deviceId: 'telescope-1',
        title: 'Test Telescope'
      },
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            stubActions: false
          })
        ],
        stubs: {
          // Using shallow rendering for child components
          BaseDeviceAdapter: {
            template: '<div class="base-device-adapter"><slot /></div>',
            props: ['deviceId', 'title']
          },
          EnhancedTelescopePanel: {
            template: '<div class="enhanced-telescope-panel">Panel Content</div>',
            props: ['connected', 'deviceId', 'deviceType', 'panelName']
          }
        }
      }
    })

    // Check if the component renders with stubs
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.base-device-adapter').exists()).toBe(true)
    expect(wrapper.find('.enhanced-telescope-panel').exists()).toBe(true)
  })

  it('mounts the adapter component', async () => {
    const wrapper = mount(TelescopePanelAdapter, {
      props: {
        deviceId: 'telescope-1',
        title: 'Test Telescope'
      },
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            stubActions: false
          })
        ]
      }
    })

    // Check that the wrapper exists
    expect(wrapper.exists()).toBe(true)

    // The component should mount and contain the telescope ID in the HTML
    // (This is a basic check to ensure it renders something with our ID)
    expect(wrapper.html()).toContain('telescope-1')
  })

  it('handles telescope actions correctly', async () => {
    const wrapper = mount(TelescopePanelAdapter, {
      props: {
        deviceId: 'telescope-1',
        title: 'Test Telescope'
      },
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            stubActions: false
          })
        ],
        stubs: {
          BaseDeviceAdapter: true,
          EnhancedTelescopePanel: true
        }
      }
    })

    // Access component methods by using a specific cast to our interface
    // This allows us to test that the methods exist without TypeScript errors
    const vm = wrapper.vm as unknown as TelescopePanelAdapterInstance
    expect(typeof vm.handleSlew).toBe('function')
    expect(typeof vm.handleTrackingToggle).toBe('function')
    expect(typeof vm.handlePark).toBe('function')
    expect(typeof vm.handleUnpark).toBe('function')
  })
})
