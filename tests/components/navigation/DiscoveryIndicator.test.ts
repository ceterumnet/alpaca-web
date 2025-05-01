import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import DiscoveryIndicator from '@/components/navigation/DiscoveryIndicator.vue'
import { useEnhancedDiscoveryStore } from '@/stores/useEnhancedDiscoveryStore'

// Mock the Icon component
vi.mock('@/components/ui/Icon.vue', () => ({
  default: {
    name: 'Icon',
    props: {
      type: String
    },
    template: '<div data-testid="icon">{{ type }}</div>'
  }
}))

// Create a router for navigation
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/discovery', component: { template: '<div>Discovery</div>' } }
  ]
})

describe('DiscoveryIndicator', () => {
  let pinia: ReturnType<typeof createPinia>
  let discoveryStore: ReturnType<typeof useEnhancedDiscoveryStore>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    // Get the discovery store
    discoveryStore = useEnhancedDiscoveryStore()

    // Mock the store methods
    discoveryStore.discoverDevices = vi.fn().mockResolvedValue({
      servers: [],
      status: 'idle',
      lastDiscoveryTime: new Date().toISOString(),
      error: null
    })
  })

  it('renders correctly with default props', () => {
    const wrapper = mount(DiscoveryIndicator, {
      global: {
        plugins: [pinia, router],
        mocks: {
          $router: router
        }
      }
    })

    expect(wrapper.find('.discovery-indicator').exists()).toBe(true)
    expect(wrapper.find('.discovery-label').exists()).toBe(true)
  })

  it('hides label when showLabel is false', () => {
    const wrapper = mount(DiscoveryIndicator, {
      props: {
        showLabel: false
      },
      global: {
        plugins: [pinia, router],
        mocks: {
          $router: router
        }
      }
    })

    expect(wrapper.find('.discovery-label').exists()).toBe(false)
  })

  it('shows device badge when devices are available', async () => {
    // Mock store with available devices
    vi.mocked(discoveryStore.availableDevices).mockReturnValue([
      { server: { id: 'server1' }, device: { id: 'device1' } }
    ])

    const wrapper = mount(DiscoveryIndicator, {
      global: {
        plugins: [pinia, router],
        mocks: {
          $router: router
        }
      }
    })

    // Force computed property update
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.device-badge').exists()).toBe(true)
    expect(wrapper.find('.has-devices').exists()).toBe(true)
  })

  it('triggers discovery when clicked', async () => {
    const wrapper = mount(DiscoveryIndicator, {
      global: {
        plugins: [pinia, router],
        mocks: {
          $router: router
        }
      }
    })

    // Click the discovery button
    await wrapper.find('.discovery-button').trigger('click')

    // Since we're not on the discovery page, it should navigate
    expect(router.push).toHaveBeenCalledWith('/discovery')

    // Set the current route to discovery
    vi.mocked(router.currentRoute.value.path).mockReturnValue('/discovery')

    // Click again
    await wrapper.find('.discovery-button').trigger('click')

    // Should trigger discovery directly
    expect(discoveryStore.discoverDevices).toHaveBeenCalled()
  })

  it('shows last discovery time when available', async () => {
    // Mock lastDiscoveryTime
    const mockTime = new Date().toISOString()
    vi.mocked(discoveryStore.lastDiscoveryTime).mockReturnValue(mockTime)

    const wrapper = mount(DiscoveryIndicator, {
      global: {
        plugins: [pinia, router],
        mocks: {
          $router: router
        }
      }
    })

    await wrapper.vm.$nextTick()

    expect(wrapper.find('.discovery-info').exists()).toBe(true)
    expect(wrapper.find('.discovery-info').text()).toContain('Last scan:')
  })
})
