import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import MainPanels from '../MainPanels.vue'

describe('MainPanels', () => {
  it('renders properly', () => {
    const wrapper = mount(MainPanels, { props: {} })
    expect(wrapper.text()).toContain('Panel1')
  })
})
