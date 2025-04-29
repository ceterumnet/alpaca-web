import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import TelescopePanelMigrated from '../../src/components/TelescopePanelMigrated.vue'
import { useUnifiedStore } from '../../src/stores/UnifiedStore'

// Mock UnifiedStore
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
        properties: {
          tracking: true,
          slewing: false,
          rightAscension: '12:00:00',
          declination: '+45:00:00',
          altitude: 45.0,
          azimuth: 180.0
        }
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
        properties: {
          tracking: true,
          slewing: false,
          rightAscension: '12:00:00',
          declination: '+45:00:00',
          altitude: 45.0,
          azimuth: 180.0
        }
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
          properties: {
            tracking: true,
            slewing: false,
            rightAscension: '12:00:00',
            declination: '+45:00:00',
            altitude: 45.0,
            azimuth: 180.0
          }
        }
      }
      return null
    }),
    updateDeviceProperties: vi.fn(),
    callDeviceMethod: vi.fn().mockResolvedValue({}),
    emit: vi.fn(),
    connectDevice: vi.fn(),
    disconnectDevice: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  }

  return {
    default: mockStore,
    useUnifiedStore: vi.fn(() => mockStore)
  }
})

// Mock BaseDevicePanel
vi.mock('../../src/components/panels/BaseDevicePanel.vue', () => ({
  default: {
    name: 'BaseDevicePanel',
    template: `
      <div>
        <slot></slot>
      </div>
    `,
    props: ['deviceId', 'title'],
    setup() {
      return {
        isConnected: true,
        deviceType: 'telescope',
        deviceNum: 1,
        handleConnect: vi.fn(),
        handleModeChange: vi.fn()
      }
    }
  }
}))

// Mock EnhancedTelescopePanelMigrated component
vi.mock('../../src/components/EnhancedTelescopePanelMigrated.vue', () => ({
  default: {
    name: 'EnhancedTelescopePanelMigrated',
    template: `
      <div>
        <button class="slew-button" @click="$emit('slew', '12:00:00', '+45:00:00')">Slew</button>
        <button class="tracking-toggle" @click="$emit('toggle-tracking', false)">Toggle Tracking</button>
        <button class="park-button" @click="$emit('park')">Park</button>
        <button class="unpark-button" @click="$emit('unpark')">Unpark</button>
      </div>
    `,
    props: [
      'panelName',
      'deviceId',
      'connected',
      'deviceType',
      'deviceNum',
      'idx',
      'supportedModes'
    ],
    emits: ['connect', 'mode-change', 'slew', 'toggle-tracking', 'park', 'unpark']
  }
}))

describe('TelescopePanelMigrated', () => {
  // Get the mock store to use in assertions
  let mockStore: ReturnType<typeof useUnifiedStore>

  beforeEach(() => {
    vi.clearAllMocks()
    mockStore = useUnifiedStore()
  })

  it('renders correctly with default props', () => {
    const wrapper = mount(TelescopePanelMigrated, {
      props: {
        deviceId: 'telescope-1',
        title: 'Test Telescope Panel'
      }
    })

    // Check basic rendering
    expect(wrapper.findComponent({ name: 'EnhancedTelescopePanelMigrated' }).exists()).toBe(true)
  })

  it('passes correct props to EnhancedTelescopePanelMigrated', () => {
    const wrapper = mount(TelescopePanelMigrated, {
      props: {
        deviceId: 'telescope-1',
        title: 'Test Telescope Panel'
      }
    })

    const enhancedPanel = wrapper.findComponent({ name: 'EnhancedTelescopePanelMigrated' })
    expect(enhancedPanel.props('panelName')).toBe('Test Telescope Panel')
    expect(enhancedPanel.props('deviceId')).toBe('telescope-1')
  })

  it('handles slew action correctly', async () => {
    const wrapper = mount(TelescopePanelMigrated, {
      props: {
        deviceId: 'telescope-1',
        title: 'Test Telescope Panel'
      }
    })

    // Find the slew button and trigger a click
    const enhancedPanel = wrapper.findComponent({ name: 'EnhancedTelescopePanelMigrated' })
    await enhancedPanel.find('.slew-button').trigger('click')

    // Check that the correct store method was called
    expect(mockStore.emit).toHaveBeenCalledWith(
      'callDeviceMethod',
      'telescope-1',
      expect.any(String),
      expect.any(Array)
    )
  })

  it('handles tracking toggle correctly', async () => {
    const wrapper = mount(TelescopePanelMigrated, {
      props: {
        deviceId: 'telescope-1',
        title: 'Test Telescope Panel'
      }
    })

    // Find the tracking toggle button and trigger a click
    const enhancedPanel = wrapper.findComponent({ name: 'EnhancedTelescopePanelMigrated' })
    await enhancedPanel.find('.tracking-toggle').trigger('click')

    // Check that the correct store method was called
    expect(mockStore.updateDeviceProperties).toHaveBeenCalledWith(
      'telescope-1',
      expect.objectContaining({
        tracking: expect.any(Boolean)
      })
    )
  })

  it('handles park action correctly', async () => {
    const wrapper = mount(TelescopePanelMigrated, {
      props: {
        deviceId: 'telescope-1',
        title: 'Test Telescope Panel'
      }
    })

    // Find the park button and trigger a click
    const enhancedPanel = wrapper.findComponent({ name: 'EnhancedTelescopePanelMigrated' })
    await enhancedPanel.find('.park-button').trigger('click')

    // Check that the correct store method was called
    expect(mockStore.updateDeviceProperties).toHaveBeenCalledWith(
      'telescope-1',
      expect.objectContaining({
        parking: true,
        parked: false
      })
    )
  })

  it('handles unpark action correctly', async () => {
    const wrapper = mount(TelescopePanelMigrated, {
      props: {
        deviceId: 'telescope-1',
        title: 'Test Telescope Panel'
      }
    })

    // Find the unpark button and trigger a click
    const enhancedPanel = wrapper.findComponent({ name: 'EnhancedTelescopePanelMigrated' })
    await enhancedPanel.find('.unpark-button').trigger('click')

    // Check that property updates are called
    expect(mockStore.updateDeviceProperties).toHaveBeenCalledWith(
      'telescope-1',
      expect.objectContaining({
        parking: expect.any(Boolean)
      })
    )
  })
})
