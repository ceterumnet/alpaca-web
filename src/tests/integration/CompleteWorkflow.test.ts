/**
 * Complete Workflow Integration Tests with Migrated Components
 *
 * This test suite verifies the complete end-to-end flow using the new migrated components
 * that directly use the UnifiedStore without adapters.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import UnifiedStore from '../../stores/UnifiedStore'
import { useUnifiedStore } from '../../stores/UnifiedStore'
import { createPinia, setActivePinia } from 'pinia'
import type { UnifiedDevice } from '../../types/DeviceTypes'

// Import migrated components
import DiscoveryPanelMigrated from '../../components/DiscoveryPanelMigrated.vue'
import AppSidebarMigrated from '../../components/AppSidebarMigrated.vue'
import DeviceDetailViewMigrated from '../../views/DeviceDetailViewMigrated.vue'
import DevicePageMigrated from '../../views/DevicePageMigrated.vue'
import TelescopePanelMigrated from '../../components/TelescopePanelMigrated.vue'
import CameraPanelMigrated from '../../components/CameraPanelMigrated.vue'
import SettingsPanelMigrated from '../../components/SettingsPanelMigrated.vue'
import ManualDeviceConfigMigrated from '../../components/ManualDeviceConfigMigrated.vue'

// Mock any API calls
vi.mock('axios', () => ({
  default: {
    get: vi.fn().mockImplementation((url) => {
      if (url.includes('/management/v1/configureddevices')) {
        return Promise.resolve({
          data: {
            Value: [
              { DeviceType: 'Telescope', DeviceNumber: 0 },
              { DeviceType: 'Camera', DeviceNumber: 0 }
            ]
          }
        })
      }
      if (url.includes('/api/v1/telescope/0/canslew')) {
        return Promise.resolve({ data: { Value: true } })
      }
      if (url.includes('/api/v1/camera/0/canstopliveview')) {
        return Promise.resolve({ data: { Value: true } })
      }
      return Promise.resolve({ data: { Value: null } })
    }),
    post: vi.fn().mockResolvedValue({ data: { Value: true } })
  }
}))

// Mock Vue components that might be challenging to test
vi.mock('../../components/EnhancedPanelComponentMigrated.vue', () => ({
  default: {
    name: 'EnhancedPanelComponentMigrated',
    template: '<div data-testid="enhanced-panel">Enhanced Panel</div>',
    props: ['deviceId', 'connected', 'panelName', 'deviceType', 'supportedModes']
  }
}))

// Create a router for component navigation
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: { template: '<div>Home</div>' }
    },
    {
      path: '/discover',
      name: 'Discover',
      component: { template: '<div>Discover</div>' }
    },
    {
      path: '/devices',
      name: 'Devices',
      component: { template: '<div>Devices</div>' }
    },
    {
      path: '/devices/:id',
      name: 'DeviceDetail',
      component: DevicePageMigrated
    },
    {
      path: '/settings',
      name: 'Settings',
      component: { template: '<div><SettingsPanelMigrated /></div>' }
    }
  ]
})

describe('Complete Workflow Integration - Migrated Components', () => {
  // Store references to mounted components
  let discoveryPanel: ReturnType<typeof mount>
  let appSidebar: ReturnType<typeof mount>
  let store: UnifiedStore

  // Sample devices for testing
  const mockDevices: UnifiedDevice[] = [
    {
      id: 'telescope-1',
      name: 'Main Telescope',
      type: 'telescope',
      ipAddress: '192.168.1.100',
      port: 4567,
      isConnected: false,
      isConnecting: false,
      isDisconnecting: false,
      properties: {
        aperture: 200,
        focalLength: 1000,
        maxSlew: 5
      }
    },
    {
      id: 'camera-1',
      name: 'CCD Camera',
      type: 'camera',
      ipAddress: '192.168.1.101',
      port: 4568,
      isConnected: false,
      isConnecting: false,
      isDisconnecting: false,
      properties: {
        sensorWidth: 3000,
        sensorHeight: 2000,
        pixelSize: 3.8
      }
    }
  ]

  beforeEach(async () => {
    // Set up a fresh Pinia instance
    const pinia = createPinia()
    setActivePinia(pinia)

    // Initialize the router
    router.push('/')
    await router.isReady()

    // Create a real UnifiedStore instance
    store = new UnifiedStore()

    // Mock useUnifiedStore
    vi.mocked(useUnifiedStore).mockReturnValue(store)

    // Setup spies and mock methods on the store
    vi.spyOn(store, 'startDiscovery').mockImplementation(() => {
      // Simulate discovery process
      setTimeout(() => {
        // Add mock devices after a delay
        mockDevices.forEach((device) => {
          store.addDevice(device)
        })
      }, 100)
      return Promise.resolve(true)
    })

    vi.spyOn(store, 'connectDevice').mockImplementation((deviceId) => {
      const device = store.getDeviceById(deviceId)
      if (device) {
        // Update connecting state
        store.updateDevice(deviceId, {
          isConnecting: true,
          isConnected: false
        })

        // Simulate connection delay
        return new Promise((resolve) => {
          setTimeout(() => {
            // Update to connected
            store.updateDevice(deviceId, {
              isConnected: true,
              isConnecting: false,
              lastConnected: new Date().toISOString()
            })

            resolve(true)
          }, 100)
        })
      }
      return Promise.resolve(false)
    })

    vi.spyOn(store, 'disconnectDevice').mockImplementation((deviceId) => {
      const device = store.getDeviceById(deviceId)
      if (device) {
        // Update disconnecting state
        store.updateDevice(deviceId, {
          isDisconnecting: true,
          isConnected: true
        })

        // Simulate disconnection delay
        return new Promise((resolve) => {
          setTimeout(() => {
            // Update to disconnected
            store.updateDevice(deviceId, {
              isConnected: false,
              isDisconnecting: false
            })

            resolve(true)
          }, 100)
        })
      }
      return Promise.resolve(false)
    })

    // Mount the discovery panel component
    discoveryPanel = mount(DiscoveryPanelMigrated, {
      global: {
        plugins: [router, pinia]
      }
    })

    // Mount the sidebar component
    appSidebar = mount(AppSidebarMigrated, {
      global: {
        plugins: [router, pinia]
      }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    discoveryPanel.unmount()
    appSidebar.unmount()
  })

  describe('Discovery and Connection Flow', () => {
    it('should discover and connect to devices using migrated components', async () => {
      // Verify initial state
      expect(store.isDiscovering).toBe(false)

      // Start discovery through the component UI
      await discoveryPanel.find('.discovery-button').trigger('click')

      // Wait for store method to be called
      expect(store.startDiscovery).toHaveBeenCalled()

      // Wait for mock devices to be added
      await new Promise((resolve) => setTimeout(resolve, 150))
      await flushPromises()

      // Verify devices were added to the store
      expect(store.devices.length).toBe(2)

      // Verify devices show up in the discovery panel
      await flushPromises()
      const deviceItems = discoveryPanel.findAll('.device-item')
      expect(deviceItems.length).toBe(2)

      // Connect to the telescope device
      const telescopeDeviceItem = deviceItems[0]
      await telescopeDeviceItem.find('.connect-button').trigger('click')

      // Wait for connection to complete
      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Verify telescope is now connected
      const telescopeDevice = store.getDeviceById('telescope-1')
      expect(telescopeDevice?.isConnected).toBe(true)

      // Verify sidebar shows the connected device
      await flushPromises()
      expect(appSidebar.html()).toContain('Main Telescope')

      // Verify connected status is indicated
      const sidebarDeviceItem = appSidebar.find('.device-item')
      expect(sidebarDeviceItem.classes()).toContain('connected')
    })

    it('should navigate to and display device details when selecting a device', async () => {
      // Add devices to the store
      mockDevices.forEach((device) => {
        store.addDevice({
          ...device,
          isConnected: true // Set as connected for this test
        })
      })

      // Wait for sidebar to update
      await flushPromises()

      // Find and click a device in the sidebar
      const deviceItems = appSidebar.findAll('.device-item')
      expect(deviceItems.length).toBeGreaterThan(0)

      // Click on the telescope device
      await deviceItems[0].trigger('click')

      // Wait for navigation
      await flushPromises()

      // Verify we're on the device detail route
      expect(router.currentRoute.value.path).toContain('/devices/telescope-1')

      // Mount device page to verify detail view
      const devicePage = mount(DevicePageMigrated, {
        global: {
          plugins: [router, pinia]
        }
      })

      // Wait for page to load
      await flushPromises()

      // Verify device name is shown
      expect(devicePage.html()).toContain('Main Telescope')

      // Verify the appropriate panel is shown
      expect(devicePage.html()).toContain('telescope-panel')

      // Clean up
      devicePage.unmount()
    })
  })

  describe('Device Control Flow', () => {
    it('should properly interact with the telescope control panel', async () => {
      // Add a connected telescope device
      store.addDevice({
        ...mockDevices[0],
        isConnected: true
      })

      // Navigate to device detail page
      await router.push('/devices/telescope-1')
      await flushPromises()

      // Mount the telescope panel directly
      const telescopePanel = mount(TelescopePanelMigrated, {
        props: {
          deviceId: 'telescope-1',
          connected: true,
          panelName: 'Telescope Control',
          deviceType: 'telescope'
        },
        global: {
          plugins: [pinia]
        }
      })

      // Mock the slew method
      const slewSpy = vi.spyOn(store, 'executeDeviceCommand').mockResolvedValue(true)

      // Use the interface to trigger a slew
      await telescopePanel.find('.slew-button').trigger('click')

      // Verify the command was sent
      expect(slewSpy).toHaveBeenCalled()

      // Clean up
      telescopePanel.unmount()
    })

    it('should properly interact with the camera control panel', async () => {
      // Add a connected camera device
      store.addDevice({
        ...mockDevices[1],
        isConnected: true
      })

      // Navigate to device detail page
      await router.push('/devices/camera-1')
      await flushPromises()

      // Mount the camera panel directly
      const cameraPanel = mount(CameraPanelMigrated, {
        props: {
          deviceId: 'camera-1',
          connected: true,
          panelName: 'Camera Control',
          deviceType: 'camera'
        },
        global: {
          plugins: [pinia]
        }
      })

      // Mock the exposure command
      const exposureSpy = vi.spyOn(store, 'executeDeviceCommand').mockResolvedValue(true)

      // Use the interface to trigger an exposure
      await cameraPanel.find('.exposure-button').trigger('click')

      // Verify the command was sent
      expect(exposureSpy).toHaveBeenCalled()

      // Clean up
      cameraPanel.unmount()
    })
  })

  describe('Settings and Configuration', () => {
    it('should manage application settings through the settings panel', async () => {
      // Mount settings panel component
      const settingsPanel = mount(SettingsPanelMigrated, {
        global: {
          plugins: [pinia]
        }
      })

      // Toggle dark mode
      await settingsPanel.find('#dark-mode').trigger('click')

      // Change UI mode
      await settingsPanel.find('#default-ui-mode').setValue('detailed')

      // Save settings
      await settingsPanel.find('.action-button.primary').trigger('click')

      // Verify settings were saved
      expect(settingsPanel.html()).toContain('Settings saved successfully')

      // Clean up
      settingsPanel.unmount()
    })

    it('should handle manual device configuration', async () => {
      // Mount manual device config component
      const manualConfig = mount(ManualDeviceConfigMigrated, {
        global: {
          plugins: [pinia]
        }
      })

      // Show the form
      await manualConfig.find('.toggle-btn').trigger('click')

      // Fill out the form
      await manualConfig.find('#deviceAddress').setValue('192.168.1.200')
      await manualConfig.find('#devicePort').setValue('8000')

      // Submit the form
      await manualConfig.find('.add-btn').trigger('click')

      // Wait for async operations
      await flushPromises()

      // Verify devices were added (2 devices from the mocked API response)
      expect(store.devices.length).toBeGreaterThan(0)

      // Clean up
      manualConfig.unmount()
    })
  })

  describe('End-to-End User Flow', () => {
    it('should perform a complete user flow from discovery to control to disconnection', async () => {
      // Start with discovery
      await discoveryPanel.find('.discovery-button').trigger('click')

      // Wait for discovery to complete and devices to be added
      await new Promise((resolve) => setTimeout(resolve, 150))
      await flushPromises()

      // Connect to a device
      const deviceItems = discoveryPanel.findAll('.device-item')
      await deviceItems[0].find('.connect-button').trigger('click')

      // Wait for connection to complete
      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Navigate to device detail
      await router.push('/devices/telescope-1')
      await flushPromises()

      // Mount the device page to simulate navigation
      const devicePage = mount(DevicePageMigrated, {
        global: {
          plugins: [router, pinia]
        }
      })

      // Wait for page to load
      await flushPromises()

      // Verify we're showing the device details
      expect(devicePage.html()).toContain('Main Telescope')

      // Mount the telescope panel to interact with it
      const telescopePanel = mount(TelescopePanelMigrated, {
        props: {
          deviceId: 'telescope-1',
          connected: true,
          panelName: 'Telescope Control',
          deviceType: 'telescope'
        },
        global: {
          plugins: [pinia]
        }
      })

      // Interact with the device
      const commandSpy = vi.spyOn(store, 'executeDeviceCommand').mockResolvedValue(true)
      await telescopePanel.find('.slew-button').trigger('click')
      expect(commandSpy).toHaveBeenCalled()

      // Find the disconnect button in the device page
      await devicePage.find('.connection-button').trigger('click')

      // Wait for disconnection to complete
      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Verify device is disconnected
      const telescopeDevice = store.getDeviceById('telescope-1')
      expect(telescopeDevice?.isConnected).toBe(false)

      // Clean up
      devicePage.unmount()
      telescopePanel.unmount()
    })
  })
})
