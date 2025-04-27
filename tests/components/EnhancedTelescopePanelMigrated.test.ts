import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import EnhancedTelescopePanelMigrated from '../../src/components/EnhancedTelescopePanelMigrated.vue'
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
    emit: vi.fn(),
    connectDevice: vi.fn(),
    disconnectDevice: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  }

  return {
    default: vi.fn().mockImplementation(() => mockStore),
    useUnifiedStore: vi.fn(() => mockStore)
  }
})

// Mock EnhancedPanelComponentMigrated
vi.mock('../../src/components/EnhancedPanelComponentMigrated.vue', () => ({
  default: {
    name: 'EnhancedPanelComponentMigrated',
    template:
      '<div><slot name="overview-content"></slot><slot name="detailed-content"></slot></div>',
    props: ['panelName', 'connected', 'deviceType', 'deviceId', 'supportedModes'],
    emits: ['close', 'configure', 'connect', 'modeChange']
  }
}))

// Mock Icon component
vi.mock('../../src/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    template: '<div class="icon">{{ type }}</div>',
    props: ['type']
  }
}))

describe('EnhancedTelescopePanelMigrated', () => {
  let wrapper
  let mockStore

  beforeEach(() => {
    vi.clearAllMocks()
    mockStore = useUnifiedStore()

    wrapper = mount(EnhancedTelescopePanelMigrated, {
      props: {
        panelName: 'Test Telescope',
        deviceId: 'telescope-1',
        connected: true,
        deviceType: 'telescope',
        idx: 1,
        deviceNum: 1
      },
      global: {
        stubs: {
          // Stub child components to make them easier to test
          Icon: true
        }
      }
    })
  })

  it('renders the panel name correctly', () => {
    expect(wrapper.text()).toContain('Test Telescope')
  })

  it('displays telescope coordinates correctly', () => {
    expect(wrapper.text()).toContain('RA')
    expect(wrapper.text()).toContain('Dec')
    expect(wrapper.text()).toContain('Alt')
    expect(wrapper.text()).toContain('Az')

    // Verify the coordinates from the mock store are displayed
    const telescopeData = mockStore.getDeviceById('telescope-1')
    expect(wrapper.text()).toContain(telescopeData.properties.rightAscension)
    expect(wrapper.text()).toContain(telescopeData.properties.declination)
  })

  it('displays tracking status correctly', () => {
    expect(wrapper.text()).toContain('Tracking')

    // Verify tracking status from mock store
    const telescopeData = mockStore.getDeviceById('telescope-1')
    expect(telescopeData.properties.tracking).toBe(true)
  })

  it('has slew functionality', () => {
    // Verify the slewToCoordinates method exists
    expect(typeof wrapper.vm.slewToCoordinates).toBe('function')
  })

  it('has tracking toggle functionality', () => {
    // Verify the toggleTracking method exists
    expect(typeof wrapper.vm.toggleTracking).toBe('function')
  })

  it('has park functionality', () => {
    // Verify the parkTelescope method exists
    expect(typeof wrapper.vm.parkTelescope).toBe('function')
  })

  it('has unpark functionality', () => {
    // Verify the unparkTelescope method exists
    expect(typeof wrapper.vm.unparkTelescope).toBe('function')
  })
})
