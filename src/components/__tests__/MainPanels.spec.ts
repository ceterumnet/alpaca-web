import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import MainPanels from '../MainPanels.vue'
import { createPinia, setActivePinia } from 'pinia'

// Mock the stores
vi.mock('@/stores/useLayoutStore', () => ({
  useLayoutStore: vi.fn(() => ({
    layout: [
      {
        x: 0,
        y: 0,
        w: 6,
        h: 20,
        i: '1',
        deviceType: '',
        static: false
      }
    ],
    initLayout: vi.fn(() => true),
    updateLayout: vi.fn(),
    resetLayout: vi.fn()
  }))
}))

vi.mock('@/stores/useDevicesStore', () => ({
  useDevicesStore: vi.fn(() => ({
    devices: []
  }))
}))

describe('MainPanels', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders properly', () => {
    const wrapper = mount(MainPanels, { props: {} })
    expect(wrapper.text()).toContain('Panel 1')
  })
})
