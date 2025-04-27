import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import EnhancedTelescopePanelMigrated from '../../src/components/EnhancedTelescopePanelMigrated.vue'
import { UIMode } from '../../src/stores/useUIPreferencesStore'

// Mock UnifiedStore with telescope-specific data
vi.mock('../../src/stores/UnifiedStore', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      devices: [
        {
          id: 'telescope-1',
          name: 'Test Telescope',
          type: 'telescope',
          isConnected: true,
          isConnecting: false,
          isDisconnecting: false,
          properties: {
            rightAscension: 12.5,
            declination: 45.7,
            altitude: 30.5,
            azimuth: 180.3,
            trackingEnabled: true,
            isSlewing: false,
            pierSide: 'East',
            parked: false,
            siderealTime: 15.75,
            targetRightAscension: 12.6,
            targetDeclination: 45.8
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
              rightAscension: 12.5,
              declination: 45.7,
              altitude: 30.5,
              azimuth: 180.3,
              trackingEnabled: true,
              isSlewing: false,
              pierSide: 'East',
              parked: false,
              siderealTime: 15.75,
              targetRightAscension: 12.6,
              targetDeclination: 45.8
            }
          }
        }
        return null
      }),
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn()
    }))
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let wrapper: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let storeMock: any

  beforeEach(() => {
    vi.clearAllMocks()
    wrapper = mount(EnhancedTelescopePanelMigrated, {
      props: {
        panelName: 'Test Telescope',
        connected: true,
        deviceType: 'telescope',
        deviceId: 'telescope-1',
        deviceNum: 1,
        idx: 'telescope-1',
        supportedModes: [UIMode.OVERVIEW, UIMode.DETAILED]
      }
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    storeMock = wrapper.vm.store as any
  })

  it('renders correctly with default props', () => {
    expect(wrapper.text()).toContain('Telescope')
    expect(wrapper.find('.telescope-overview').exists()).toBe(true)
  })

  it('displays telescope coordinates correctly', () => {
    expect(wrapper.text()).toContain('RA')
    expect(wrapper.text()).toContain('Dec')
    expect(wrapper.text()).toContain('Alt')
    expect(wrapper.text()).toContain('Az')
  })

  it('displays tracking status correctly', () => {
    expect(wrapper.text()).toContain('Tracking')
  })

  it('emits tracking toggle event when tracking button is clicked', async () => {
    const trackingButton = wrapper.find('.control-btn')
    await trackingButton.trigger('click')

    expect(wrapper.emitted('toggle-tracking')).toBeTruthy()
    expect(wrapper.emitted('toggle-tracking')[0]).toEqual([false]) // Toggle from true to false
  })

  it('handles manual slew controls correctly', async () => {
    // Test North button
    const northButton = wrapper.find('.slew-btn.north')
    await northButton.trigger('click')

    expect(storeMock.emit).toHaveBeenCalledWith(
      'callDeviceMethod',
      'telescope-1',
      'moveAxis',
      [1, 0.5] // Secondary axis, Center rate (0.5)
    )

    // Test South button
    const southButton = wrapper.find('.slew-btn.south')
    await southButton.trigger('click')

    expect(storeMock.emit).toHaveBeenCalledWith(
      'callDeviceMethod',
      'telescope-1',
      'moveAxis',
      [1, -0.5] // Secondary axis, negative Center rate (-0.5)
    )
  })

  it('emits slew event when slew to coordinates button is clicked', async () => {
    // Switch to detailed mode to see the coords input
    const panel = wrapper.findComponent({ name: 'EnhancedPanelComponentMigrated' })
    await panel.vm.$emit('modeChange', UIMode.DETAILED)

    // Set RA/Dec values
    await wrapper.find('#targetRA').setValue('14:30:00')
    await wrapper.find('#targetDec').setValue('+45:00:00')

    // Click the slew button
    const slewButton = wrapper.find('.slew-to-coords')
    await slewButton.trigger('click')

    expect(wrapper.emitted('slew')).toBeTruthy()
    expect(wrapper.emitted('slew')[0]).toEqual(['14:30:00', '+45:00:00'])
  })

  it('emits park event when park button is clicked', async () => {
    // Switch to detailed mode to see the park button
    const panel = wrapper.findComponent({ name: 'EnhancedPanelComponentMigrated' })
    await panel.vm.$emit('modeChange', UIMode.DETAILED)

    // Find all action buttons and click the Park button (the second one)
    const buttons = wrapper.findAll('.action-btn')
    await buttons[1].trigger('click')

    expect(wrapper.emitted('park')).toBeTruthy()
  })

  it('registers and unregisters event listeners correctly', async () => {
    expect(storeMock.on).toHaveBeenCalledWith('devicePropertyChanged', expect.any(Function))

    // Unmount to check for unregistration
    wrapper.unmount()

    expect(storeMock.off).toHaveBeenCalledWith('devicePropertyChanged', expect.any(Function))
  })
})
