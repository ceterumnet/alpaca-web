import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ResponsivePanel from '@/components/panels/ResponsivePanel.vue'
import { PriorityLevel, FeatureSource, InteractionType } from '@/types/panels/FeatureTypes'
import type { PanelFeatureDefinition } from '@/types/panels/FeatureTypes'

// Mock useResizeObserver
vi.mock('@vueuse/core', () => ({
  useResizeObserver: vi.fn((_, callback) => {
    // Store the callback for manual triggering in tests
    ;(global as any).resizeCallback = callback
    return { stop: vi.fn() }
  })
}))

describe('ResponsivePanel.vue', () => {
  let features: PanelFeatureDefinition[]

  beforeEach(() => {
    // Reset mock features for each test
    features = [
      {
        id: 'feature1',
        label: 'Primary Feature',
        source: FeatureSource.CoreAlpaca,
        interactionType: InteractionType.Action,
        priority: PriorityLevel.Primary,
        component: 'div',
        section: 'main',
        icon: 'star'
      },
      {
        id: 'feature2',
        label: 'Secondary Feature',
        source: FeatureSource.CoreAlpaca,
        interactionType: InteractionType.Setting,
        priority: PriorityLevel.Secondary,
        component: 'div',
        section: 'main'
      },
      {
        id: 'feature3',
        label: 'Tertiary Feature',
        source: FeatureSource.Extended,
        interactionType: InteractionType.DynamicData,
        priority: PriorityLevel.Tertiary,
        component: 'div',
        section: 'advanced'
      }
    ]
  })

  it('renders with the correct title', () => {
    const wrapper = mount(ResponsivePanel, {
      props: {
        deviceId: 'test-device',
        title: 'Test Panel',
        features
      },
      global: {
        stubs: {
          CollapsibleSection: true
        }
      }
    })

    expect(wrapper.find('.panel-title').text()).toBe('Test Panel')
  })

  it('groups features by section', async () => {
    const wrapper = mount(ResponsivePanel, {
      props: {
        deviceId: 'test-device',
        title: 'Test Panel',
        features
      },
      global: {
        stubs: {
          CollapsibleSection: true
        }
      }
    })

    // Default size mode should be 'standard' showing primary and secondary features
    const sections = wrapper.findAllComponents({ name: 'CollapsibleSection' })

    // Should have two sections: main and advanced
    expect(sections.length).toBe(2)

    // Check section titles
    expect(sections[0].props('title')).toBe('Main')
    expect(sections[1].props('title')).toBe('Advanced')
  })

  it('shows only primary features in compact mode', async () => {
    const wrapper = mount(ResponsivePanel, {
      props: {
        deviceId: 'test-device',
        title: 'Test Panel',
        features
      },
      global: {
        stubs: {
          CollapsibleSection: true
        }
      }
    })

    // Manually set component instance to compact mode
    await wrapper.setData({ sizeMode: 'compact' })

    // Should emit featuresChanged event with only primary features
    const emitted = wrapper.emitted('featuresChanged')
    expect(emitted).toBeTruthy()
    if (emitted) {
      const lastEmittedFeatures = emitted[emitted.length - 1][0]
      expect(lastEmittedFeatures.length).toBe(1)
      expect(lastEmittedFeatures[0].priority).toBe(PriorityLevel.Primary)
    }
  })

  it('shows primary and secondary features in standard mode', async () => {
    const wrapper = mount(ResponsivePanel, {
      props: {
        deviceId: 'test-device',
        title: 'Test Panel',
        features
      },
      global: {
        stubs: {
          CollapsibleSection: true
        }
      }
    })

    // Manually set component instance to standard mode
    await wrapper.setData({ sizeMode: 'standard' })

    // Should emit featuresChanged event with primary and secondary features
    const emitted = wrapper.emitted('featuresChanged')
    expect(emitted).toBeTruthy()
    if (emitted) {
      const lastEmittedFeatures = emitted[emitted.length - 1][0]
      expect(lastEmittedFeatures.length).toBe(2)
      expect(lastEmittedFeatures.some((f) => f.priority === PriorityLevel.Primary)).toBe(true)
      expect(lastEmittedFeatures.some((f) => f.priority === PriorityLevel.Secondary)).toBe(true)
      expect(lastEmittedFeatures.some((f) => f.priority === PriorityLevel.Tertiary)).toBe(false)
    }
  })

  it('shows all features in expanded mode', async () => {
    const wrapper = mount(ResponsivePanel, {
      props: {
        deviceId: 'test-device',
        title: 'Test Panel',
        features
      },
      global: {
        stubs: {
          CollapsibleSection: true
        }
      }
    })

    // Manually set component instance to expanded mode
    await wrapper.setData({ sizeMode: 'expanded' })

    // Should emit featuresChanged event with all features
    const emitted = wrapper.emitted('featuresChanged')
    expect(emitted).toBeTruthy()
    if (emitted) {
      const lastEmittedFeatures = emitted[emitted.length - 1][0]
      expect(lastEmittedFeatures.length).toBe(3)
    }
  })

  it('passes device ID to feature components', () => {
    const wrapper = mount(ResponsivePanel, {
      props: {
        deviceId: 'test-device',
        title: 'Test Panel',
        features: [
          {
            id: 'feature1',
            label: 'Test Feature',
            source: FeatureSource.CoreAlpaca,
            interactionType: InteractionType.Action,
            priority: PriorityLevel.Primary,
            component: 'div'
          }
        ]
      }
    })

    const featureComponent = wrapper.find('.feature-wrapper component')
    expect(featureComponent.attributes('deviceid')).toBe('test-device')
  })
})
