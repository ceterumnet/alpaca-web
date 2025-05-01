import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import BreadcrumbNav from '@/components/navigation/BreadcrumbNav.vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
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
    { path: '/devices', component: { template: '<div>Devices</div>' } },
    { path: '/devices/:deviceId', component: { template: '<div>Device Details</div>' } },
    { path: '/discovery', component: { template: '<div>Discovery</div>' } }
  ]
})

describe('BreadcrumbNav', () => {
  let pinia: ReturnType<typeof createPinia>
  let unifiedStore: ReturnType<typeof useUnifiedStore>
  let discoveryStore: ReturnType<typeof useEnhancedDiscoveryStore>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    // Get stores
    unifiedStore = useUnifiedStore()
    discoveryStore = useEnhancedDiscoveryStore()

    // Mock store methods
    discoveryStore.discoverDevices = vi.fn().mockResolvedValue({
      servers: [],
      status: 'idle',
      lastDiscoveryTime: new Date().toISOString(),
      error: null
    })
  })

  it('renders home breadcrumb correctly', () => {
    // Set route to home
    vi.spyOn(router, 'currentRoute', 'get').mockReturnValue({
      path: '/',
      params: {}
    } as any)

    const wrapper = mount(BreadcrumbNav, {
      global: {
        plugins: [pinia, router],
        mocks: {
          $route: router.currentRoute.value,
          $router: router
        }
      }
    })

    expect(wrapper.find('.breadcrumb-list').exists()).toBe(true)
    expect(wrapper.findAll('.breadcrumb-item').length).toBe(1)
    expect(wrapper.find('.breadcrumb-label').text()).toBe('Home')
  })

  it('shows device context in breadcrumbs when present', async () => {
    // Mock a device in the store
    const mockDevice = {
      id: 'device-1',
      name: 'Test Device',
      type: 'camera',
      isConnected: true,
      isConnecting: false,
      isDisconnecting: false,
      properties: {}
    }

    unifiedStore.getDeviceById = vi.fn().mockReturnValue(mockDevice)

    // Set route to device detail
    vi.spyOn(router, 'currentRoute', 'get').mockReturnValue({
      path: '/devices/device-1',
      params: { deviceId: 'device-1' }
    } as any)

    const wrapper = mount(BreadcrumbNav, {
      global: {
        plugins: [pinia, router],
        mocks: {
          $route: router.currentRoute.value,
          $router: router
        }
      }
    })

    expect(wrapper.findAll('.breadcrumb-item').length).toBe(2)
    expect(wrapper.findAll('.breadcrumb-label')[1].text()).toBe('Test Device')
  })

  it('shows discovery action on device pages', async () => {
    // Set route to devices
    vi.spyOn(router, 'currentRoute', 'get').mockReturnValue({
      path: '/devices',
      params: {}
    } as any)

    const wrapper = mount(BreadcrumbNav, {
      global: {
        plugins: [pinia, router],
        mocks: {
          $route: router.currentRoute.value,
          $router: router
        }
      }
    })

    expect(wrapper.find('.discovery-action').exists()).toBe(true)
  })

  it('triggers discovery when action button is clicked', async () => {
    // Set route to devices
    vi.spyOn(router, 'currentRoute', 'get').mockReturnValue({
      path: '/devices',
      params: {}
    } as any)

    const wrapper = mount(BreadcrumbNav, {
      global: {
        plugins: [pinia, router],
        mocks: {
          $route: router.currentRoute.value,
          $router: router
        }
      }
    })

    // Click the discovery action button
    await wrapper.find('.discovery-action').trigger('click')

    // Should trigger discovery
    expect(discoveryStore.discoverDevices).toHaveBeenCalled()
    // Should navigate to discovery page
    expect(router.push).toHaveBeenCalledWith('/discovery')
  })

  it('does not show discovery action on non-device pages with connected devices', async () => {
    // Mock connected devices
    vi.spyOn(unifiedStore, 'connectedDevices', 'get').mockReturnValue([
      {
        id: 'device-1',
        name: 'Test Device',
        type: 'camera',
        isConnected: true,
        isConnecting: false,
        isDisconnecting: false,
        properties: {}
      }
    ])

    // Set route to non-device page
    vi.spyOn(router, 'currentRoute', 'get').mockReturnValue({
      path: '/',
      params: {}
    } as any)

    const wrapper = mount(BreadcrumbNav, {
      global: {
        plugins: [pinia, router],
        mocks: {
          $route: router.currentRoute.value,
          $router: router
        }
      }
    })

    expect(wrapper.find('.discovery-action').exists()).toBe(false)
  })
})
