import { describe, it, expect, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import AppSidebar from '../../src/components/AppSidebar.vue'
import { useSidebarStore, type Device } from '../../src/stores/SidebarStore'

describe('AppSidebar.vue', () => {
  let wrapper: VueWrapper
  let store: ReturnType<typeof useSidebarStore>

  const mockDevices: Device[] = [
    {
      id: 'camera1',
      name: 'Main Camera',
      type: 'camera',
      connected: true
    },
    {
      id: 'dome1',
      name: 'Observatory Dome',
      type: 'dome',
      connected: false
    }
  ]

  beforeEach(() => {
    // Create a fresh Pinia instance and store for each test
    setActivePinia(createPinia())
    store = useSidebarStore()

    // Add some mock devices to the store
    mockDevices.forEach((device) => store.addDevice(device))

    // Mount the component
    wrapper = mount(AppSidebar, {
      global: {
        plugins: [createPinia()]
      }
    })
  })

  it('renders correctly with the store data', async () => {
    // Check if device list is rendered
    const deviceItems = wrapper.findAll('.app-sidebar__device-item')
    expect(deviceItems.length).toBe(2)

    // Check if device names are displayed
    expect(deviceItems[0].text()).toContain('Main Camera')
    expect(deviceItems[1].text()).toContain('Observatory Dome')

    // Check if connection status is displayed correctly
    expect(deviceItems[0].text()).toContain('Connected')
    expect(deviceItems[1].text()).toContain('Disconnected')
  })

  it('toggles sidebar visibility', async () => {
    // Initially the sidebar should be visible
    expect(store.isSidebarVisible).toBe(true)
    expect(wrapper.classes()).not.toContain('app-sidebar--collapsed')

    // Click the toggle button
    await wrapper.find('.app-sidebar__toggle').trigger('click')

    // The sidebar should be collapsed
    expect(store.isSidebarVisible).toBe(false)
    expect(wrapper.classes()).toContain('app-sidebar--collapsed')
  })

  it('selects a device when clicked', async () => {
    // Initially no device is selected
    expect(store.selectedDeviceId).toBeNull()

    // Click on a device
    await wrapper.findAll('.app-sidebar__device-item')[0].trigger('click')

    // The device should be selected in the store
    expect(store.selectedDeviceId).toBe('camera1')

    // The device item should have the active class
    expect(wrapper.findAll('.app-sidebar__device-item')[0].classes()).toContain(
      'app-sidebar__device-item--active'
    )
  })

  it('toggles the theme when theme option is clicked', async () => {
    // Initially the theme is 'light'
    expect(store.theme).toBe('light')

    // Click the theme toggle option
    await wrapper.find('.app-sidebar__setting-item').trigger('click')

    // The theme should change to 'dark'
    expect(store.theme).toBe('dark')

    // The theme label should change
    expect(wrapper.find('.app-sidebar__setting-item').text()).toContain('Light Mode')
  })
})
