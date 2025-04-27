import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import NavigationBarMigrated from '@/components/NavigationBarMigrated.vue'
import { useUIPreferencesStore } from '@/stores/useUIPreferencesStore'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { createPinia, setActivePinia } from 'pinia'
import type { Device } from '@/stores/UnifiedStore'

// Component stub for routes
const EmptyComponent = { template: '<div>Empty</div>' }

// Create mock router
const routes: RouteRecordRaw[] = [
  { path: '/', name: 'Home', component: EmptyComponent },
  { path: '/devices', name: 'Devices', component: EmptyComponent },
  { path: '/discovery', name: 'Discovery', component: EmptyComponent },
  { path: '/ui-demo', name: 'UI Demo', component: EmptyComponent }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Mock devices
const mockDevices: Device[] = [
  {
    id: 'device-1',
    name: 'Test Camera',
    type: 'camera',
    isConnected: true,
    isConnecting: false,
    isDisconnecting: false,
    properties: {}
  },
  {
    id: 'device-2',
    name: 'Test Telescope',
    type: 'telescope',
    isConnected: false,
    isConnecting: false,
    isDisconnecting: false,
    properties: {}
  }
]

describe('NavigationBarMigrated.vue', () => {
  // Setup Pinia before each test
  beforeEach(() => {
    // Create a fresh Pinia instance for each test
    const pinia = createPinia()
    setActivePinia(pinia)

    // Setup store state
    const unifiedStore = useUnifiedStore()
    // Use defineProperty to bypass the readonly protection
    Object.defineProperty(unifiedStore, 'devicesList', {
      value: mockDevices,
      writable: true
    })
    Object.defineProperty(unifiedStore, 'connectedDevices', {
      value: mockDevices.filter((device) => device.isConnected),
      writable: true
    })

    // Mock window innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    })

    // Properly type the mocks
    vi.spyOn(window, 'addEventListener')
    vi.spyOn(window, 'removeEventListener')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders correctly with desktop layout', async () => {
    const wrapper = mount(NavigationBarMigrated, {
      global: {
        plugins: [router]
      }
    })

    // Navigation component should exist
    expect(wrapper.find('.navigation-bar').exists()).toBe(true)

    // Should show app title on desktop
    expect(wrapper.find('.app-title').exists()).toBe(true)

    // Should show all navigation links
    expect(wrapper.findAll('.nav-link').length).toBe(4)

    // Should show text in navigation links
    expect(wrapper.findAll('.nav-text').length).toBe(4)

    // Should show device status with correct count
    expect(wrapper.find('.status-indicator').text()).toContain('1 / 2 devices connected')
  })

  it('renders correctly with mobile layout', async () => {
    // Set window to mobile width
    Object.defineProperty(window, 'innerWidth', {
      value: 480
    })

    // Get the resize handler and call it
    const spy = vi.mocked(window.addEventListener)
    const resizeHandler = spy.mock.calls.find((call) => call[0] === 'resize')?.[1] as EventListener

    if (resizeHandler) {
      resizeHandler(new Event('resize'))
    }

    const wrapper = mount(NavigationBarMigrated, {
      global: {
        plugins: [router]
      }
    })

    // Should not show app title on mobile
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.app-title').exists()).toBe(false)

    // Should still show all navigation links but without text
    expect(wrapper.findAll('.nav-link').length).toBe(4)
    expect(wrapper.findAll('.nav-text').length).toBe(0)
  })

  it('toggles dark mode correctly', async () => {
    const wrapper = mount(NavigationBarMigrated, {
      global: {
        plugins: [router]
      }
    })

    const uiStore = useUIPreferencesStore()
    const initialTheme = uiStore.isDarkMode

    // Mock document methods
    document.documentElement.classList.add = vi.fn()
    document.documentElement.classList.remove = vi.fn()
    localStorage.setItem = vi.fn()

    // Click the theme toggle button
    await wrapper.find('.theme-toggle').trigger('click')

    // Check if the theme was toggled
    expect(uiStore.isDarkMode).toBe(!initialTheme)

    // Should update localStorage
    expect(localStorage.setItem).toHaveBeenCalled()

    // Should add or remove the dark-theme class
    if (uiStore.isDarkMode) {
      expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark-theme')
    } else {
      expect(document.documentElement.classList.remove).toHaveBeenCalledWith('dark-theme')
    }
  })

  it('handles active route highlighting correctly', async () => {
    // Navigate to the devices route
    await router.push('/devices')

    const wrapper = mount(NavigationBarMigrated, {
      global: {
        plugins: [router]
      }
    })

    // Find all nav links
    const navLinks = wrapper.findAll('.nav-link')

    // Devices link should be active
    const devicesLink = navLinks.find((link) => link.attributes('to') === '/devices')
    expect(devicesLink?.classes()).toContain('active')

    // Home link should not be active
    const homeLink = navLinks.find((link) => link.attributes('to') === '/')
    expect(homeLink?.classes()).not.toContain('active')
  })

  it('hides device status when no devices exist', async () => {
    // Clear the devices list
    const unifiedStore = useUnifiedStore()
    Object.defineProperty(unifiedStore, 'devicesList', {
      value: [],
      writable: true
    })
    Object.defineProperty(unifiedStore, 'connectedDevices', {
      value: [],
      writable: true
    })

    const wrapper = mount(NavigationBarMigrated, {
      global: {
        plugins: [router]
      }
    })

    // Device status should not be visible
    expect(wrapper.find('.device-status').exists()).toBe(false)
  })
})
