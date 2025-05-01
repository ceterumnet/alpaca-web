import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CollapsibleSection from '@/components/panels/features/CollapsibleSection.vue'

describe('CollapsibleSection.vue', () => {
  it('renders with the correct title', () => {
    const title = 'Test Section'
    const wrapper = mount(CollapsibleSection, {
      props: {
        title
      }
    })

    expect(wrapper.find('.section-title').text()).toBe(title)
  })

  it('is collapsed by default', () => {
    const wrapper = mount(CollapsibleSection, {
      props: {
        title: 'Test Section'
      }
    })

    expect(wrapper.find('.section-content').isVisible()).toBe(false)
    expect(wrapper.find('.collapsible-section').classes()).not.toContain('is-open')
  })

  it('can be open by default when open prop is true', () => {
    const wrapper = mount(CollapsibleSection, {
      props: {
        title: 'Test Section',
        open: true
      }
    })

    expect(wrapper.find('.section-content').isVisible()).toBe(true)
    expect(wrapper.find('.collapsible-section').classes()).toContain('is-open')
  })

  it('toggles open state when header is clicked', async () => {
    const wrapper = mount(CollapsibleSection, {
      props: {
        title: 'Test Section'
      }
    })

    // Initially closed
    expect(wrapper.find('.section-content').isVisible()).toBe(false)

    // Click to open
    await wrapper.find('.section-header').trigger('click')
    expect(wrapper.find('.section-content').isVisible()).toBe(true)
    expect(wrapper.find('.collapsible-section').classes()).toContain('is-open')

    // Click to close
    await wrapper.find('.section-header').trigger('click')
    expect(wrapper.find('.section-content').isVisible()).toBe(false)
    expect(wrapper.find('.collapsible-section').classes()).not.toContain('is-open')
  })

  it('displays an icon when provided', () => {
    const wrapper = mount(CollapsibleSection, {
      props: {
        title: 'Test Section',
        icon: 'settings'
      }
    })

    const iconElement = wrapper.find('.section-icon')
    expect(iconElement.exists()).toBe(true)
    expect(iconElement.attributes('name')).toBe('settings')
  })

  it('applies the correct priority class', () => {
    const wrapper = mount(CollapsibleSection, {
      props: {
        title: 'Test Section',
        priority: 'secondary'
      }
    })

    expect(wrapper.find('.collapsible-section').classes()).toContain('priority-secondary')
  })

  it('renders content in the slot', () => {
    const wrapper = mount(CollapsibleSection, {
      props: {
        title: 'Test Section',
        open: true
      },
      slots: {
        default: '<div class="test-content">Test content</div>'
      }
    })

    expect(wrapper.find('.test-content').exists()).toBe(true)
    expect(wrapper.find('.test-content').text()).toBe('Test content')
  })
})
