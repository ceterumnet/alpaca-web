import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import EnhancedPanelComponent from '@/components/ui/EnhancedPanelComponent.vue'
import { UIMode } from '@/stores/useUIPreferencesStore'
import { createPinia, setActivePinia } from 'pinia'

// Mock the UI preferences store
vi.mock('@/stores/useUIPreferencesStore', async () => {
  const actual = await vi.importActual('@/stores/useUIPreferencesStore')
  return {
    ...actual,
    useUIPreferencesStore: vi.fn(() => ({
      getDeviceUIMode: vi.fn(() => UIMode.OVERVIEW),
      setDeviceUIMode: vi.fn(),
      isSidebarVisible: true
    }))
  }
})

describe('EnhancedPanelComponent', () => {
  beforeEach(() => {
    // Create and set the active Pinia instance before each test
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders correctly with default props', () => {
    const wrapper = mount(EnhancedPanelComponent, {
      props: {
        panelName: 'Test Panel',
        deviceType: 'telescope',
        deviceId: 'device-1',
        connected: false
      }
    })

    expect(wrapper.find('.panel-title').text()).toBe('Test Panel')
    expect(wrapper.find('.status-indicator').text()).toContain('Disconnected')
  })

  it('displays connected status when connected prop is true', () => {
    const wrapper = mount(EnhancedPanelComponent, {
      props: {
        panelName: 'Test Panel',
        deviceType: 'telescope',
        deviceId: 'device-1',
        connected: true
      }
    })

    expect(wrapper.find('.status-indicator').text()).toContain('Connected')
    expect(wrapper.find('.status-indicator').classes()).toContain('connected')
  })

  it('emits connect event when status indicator is clicked', async () => {
    const wrapper = mount(EnhancedPanelComponent, {
      props: {
        panelName: 'Test Panel',
        deviceType: 'telescope',
        deviceId: 'device-1',
        connected: false
      }
    })

    await wrapper.find('.status-indicator').trigger('click')
    expect(wrapper.emitted('connect')).toBeTruthy()
    expect(wrapper.emitted('connect')?.length).toBe(1)
  })

  it('emits close event when close button is clicked', async () => {
    const wrapper = mount(EnhancedPanelComponent, {
      props: {
        panelName: 'Test Panel',
        deviceType: 'telescope',
        deviceId: 'device-1'
      }
    })

    await wrapper.find('.close-handle').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('close')?.length).toBe(1)
  })

  it('renders appropriate mode buttons based on supported modes', () => {
    const wrapper = mount(EnhancedPanelComponent, {
      props: {
        panelName: 'Test Panel',
        deviceType: 'telescope',
        deviceId: 'device-1',
        supportedModes: [UIMode.OVERVIEW, UIMode.DETAILED, UIMode.FULLSCREEN]
      }
    })

    // All three mode buttons should be present
    const modeButtons = wrapper.findAll('.mode-selector button')
    expect(modeButtons.length).toBe(3)
  })

  it('toggles content collapse when collapse button is clicked', async () => {
    const wrapper = mount(EnhancedPanelComponent, {
      props: {
        panelName: 'Test Panel',
        deviceType: 'telescope',
        deviceId: 'device-1'
      }
    })

    // Initially, content should not be collapsed
    expect(wrapper.find('.panel-content').classes()).not.toContain('content-collapsed')

    // Click the collapse button
    await wrapper.find('.collapse-button').trigger('click')

    // Content should now be collapsed
    expect(wrapper.find('.panel-content').classes()).toContain('content-collapsed')
  })
})
