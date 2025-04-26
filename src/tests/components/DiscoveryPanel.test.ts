import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import DiscoveryPanel from '../../components/DiscoveryPanel.vue'

describe('DiscoveryPanel', () => {
  it('calls startDiscovery when button is clicked in not discovering state', async () => {
    // Create mock store with isDiscovering = false
    const mockStore = {
      discoveredDevices: [],
      isDiscovering: false,
      startDiscovery: vi.fn().mockReturnValue(true),
      stopDiscovery: vi.fn().mockReturnValue(true),
      connectToDevice: vi.fn().mockResolvedValue(true)
    }

    const wrapper = mount(DiscoveryPanel, {
      props: {
        store: mockStore
      }
    })

    // Initially the button should show "Start Discovery"
    expect(wrapper.find('.discover-button').text()).toContain('Start Discovery')

    // Click to start discovery
    await wrapper.find('.discover-button').trigger('click')
    await flushPromises()

    // Verify startDiscovery was called
    expect(mockStore.startDiscovery).toHaveBeenCalledTimes(1)
  })

  it('calls stopDiscovery when button is clicked in discovering state', async () => {
    // Create mock store with isDiscovering = true
    const mockStore = {
      discoveredDevices: [],
      isDiscovering: true,
      startDiscovery: vi.fn().mockReturnValue(true),
      stopDiscovery: vi.fn().mockReturnValue(true),
      connectToDevice: vi.fn().mockResolvedValue(true)
    }

    console.log('Creating wrapper with isDiscovering:', mockStore.isDiscovering)

    const wrapper = mount(DiscoveryPanel, {
      props: {
        store: mockStore
      }
    })

    // Debug button content and state
    const button = wrapper.find('.discover-button')
    console.log('Button text:', button.text())

    // Initially the button should show "Stop Discovery"
    expect(wrapper.find('.discover-button').text()).toContain('Stop Discovery')

    // Click to stop discovery
    console.log('Clicking button to stop discovery')
    await wrapper.find('.discover-button').trigger('click')
    await flushPromises()

    // Debug if stopDiscovery was called
    console.log('stopDiscovery called times:', mockStore.stopDiscovery.mock.calls.length)

    // Verify stopDiscovery was called
    expect(mockStore.stopDiscovery).toHaveBeenCalledTimes(1)
  })

  it('displays discovered devices', async () => {
    // Mock devices
    const mockDevices = [
      {
        id: 'device1',
        deviceName: 'Test Device 1',
        deviceType: 'telescope',
        address: '192.168.1.100',
        isConnected: false
      },
      {
        id: 'device2',
        deviceName: 'Test Device 2',
        deviceType: 'camera',
        address: '192.168.1.101',
        isConnected: true
      }
    ]

    const mockStore = {
      discoveredDevices: mockDevices,
      isDiscovering: false,
      startDiscovery: vi.fn().mockReturnValue(true),
      stopDiscovery: vi.fn().mockReturnValue(true),
      connectToDevice: vi.fn().mockResolvedValue(true)
    }

    const wrapper = mount(DiscoveryPanel, {
      props: {
        store: mockStore
      }
    })

    // Check if devices are displayed
    const deviceItems = wrapper.findAll('.device-item')
    expect(deviceItems.length).toBe(2)

    // Verify device names are displayed
    expect(deviceItems[0].find('.device-name').text()).toBe('Test Device 1')
    expect(deviceItems[1].find('.device-name').text()).toBe('Test Device 2')

    // Get connect buttons
    const buttons = wrapper.findAll('.connect-button')

    // First button should be enabled and say "Connect"
    expect(buttons[0].text()).toBe('Connect')
    expect(buttons[0].attributes()).not.toHaveProperty('disabled')

    // Second button should be disabled and say "Connected"
    expect(buttons[1].text()).toBe('Connected')
    expect(buttons[1].attributes()).toHaveProperty('disabled')
  })
})
