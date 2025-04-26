/**
 * Tests for the migrated DiscoveryPanel component
 *
 * This test file demonstrates how to test components
 * that use the UnifiedStore directly instead of through
 * the adapter pattern.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import DiscoveryPanel from './DiscoveryPanel.vue'
import UnifiedStore from '../../stores/UnifiedStore'
import type { Device } from '../../types/DeviceTypes'

describe('DiscoveryPanel.vue (Direct Store)', () => {
  let store: UnifiedStore
  let testDevices: Device[]

  beforeEach(() => {
    // Create a fresh store for each test
    store = new UnifiedStore()

    // Mock store methods
    store.startDiscovery = vi.fn().mockReturnValue(true)
    store.stopDiscovery = vi.fn().mockReturnValue(true)
    store.connectDevice = vi.fn().mockResolvedValue(true)

    // Create test devices
    testDevices = [
      {
        id: 'test-device-1',
        name: 'Test Telescope',
        type: 'telescope',
        ipAddress: '192.168.1.100',
        port: 4567,
        isConnected: false,
        isConnecting: false,
        isDisconnecting: false,
        properties: {}
      },
      {
        id: 'test-device-2',
        name: 'Test Camera',
        type: 'camera',
        ipAddress: '192.168.1.101',
        port: 4568,
        isConnected: true,
        isConnecting: false,
        isDisconnecting: false,
        properties: {}
      }
    ]

    // Add devices to store
    testDevices.forEach((device) => store.addDevice(device))
  })

  it('renders correctly with devices', () => {
    const wrapper = shallowMount(DiscoveryPanel, {
      props: {
        store
      }
    })

    // Check that component renders devices
    expect(wrapper.findAll('.device-item').length).toBe(2)

    // Check device names are displayed
    const deviceNames = wrapper.findAll('.device-name')
    expect(deviceNames[0].text()).toBe('Test Telescope')
    expect(deviceNames[1].text()).toBe('Test Camera')

    // Check device types are displayed
    const deviceTypes = wrapper.findAll('.device-type')
    expect(deviceTypes[0].text()).toBe('telescope')
    expect(deviceTypes[1].text()).toBe('camera')

    // Check IP addresses are displayed
    const deviceAddresses = wrapper.findAll('.device-address')
    expect(deviceAddresses[0].text()).toBe('192.168.1.100')
    expect(deviceAddresses[1].text()).toBe('192.168.1.101')
  })

  it('displays connected state correctly', () => {
    const wrapper = shallowMount(DiscoveryPanel, {
      props: {
        store
      }
    })

    // Find all connect buttons
    const connectButtons = wrapper.findAll('.connect-button')

    // First device is not connected
    expect(connectButtons[0].attributes('disabled')).toBeUndefined()
    expect(connectButtons[0].text()).toBe('Connect')

    // Second device is connected
    expect(connectButtons[1].attributes('disabled')).toBeDefined()
    expect(connectButtons[1].text()).toBe('Connected')
  })

  it('toggles discovery when button is clicked', async () => {
    // Set initial discovery state
    store.isDiscovering = false

    const wrapper = shallowMount(DiscoveryPanel, {
      props: {
        store
      }
    })

    // Click the discover button
    await wrapper.find('.discover-button').trigger('click')

    // Check that startDiscovery was called
    expect(store.startDiscovery).toHaveBeenCalled()
    expect(store.stopDiscovery).not.toHaveBeenCalled()

    // Set discovery to active
    store.isDiscovering = true
    await wrapper.vm.$nextTick()

    // Button text should change
    expect(wrapper.find('.discover-button').text()).toBe('Stop Discovery')

    // Click the button again
    await wrapper.find('.discover-button').trigger('click')

    // Check that stopDiscovery was called
    expect(store.stopDiscovery).toHaveBeenCalled()
  })

  it('calls connectDevice when connect button is clicked', async () => {
    const wrapper = shallowMount(DiscoveryPanel, {
      props: {
        store
      }
    })

    // Click the connect button of the first (non-connected) device
    await wrapper.findAll('.connect-button')[0].trigger('click')

    // Check that connectDevice was called with correct device ID
    expect(store.connectDevice).toHaveBeenCalledWith('test-device-1')
  })

  it('emits connect-device event when connect button is clicked', async () => {
    const wrapper = shallowMount(DiscoveryPanel, {
      props: {
        store
      }
    })

    // Click the connect button of the first device
    await wrapper.findAll('.connect-button')[0].trigger('click')

    // Check that the connect-device event was emitted with the device
    const emittedEvents = wrapper.emitted('connect-device')
    expect(emittedEvents).toBeTruthy()
    expect(emittedEvents?.[0][0]).toEqual(testDevices[0])
  })

  it('handles empty device list', () => {
    // Create a store with no devices
    const emptyStore = new UnifiedStore()

    const wrapper = shallowMount(DiscoveryPanel, {
      props: {
        store: emptyStore
      }
    })

    // Check that no-devices message is displayed
    expect(wrapper.find('.no-devices').exists()).toBe(true)
    expect(wrapper.find('.no-devices').text()).toBe('No devices discovered yet')

    // Check that no device items are rendered
    expect(wrapper.findAll('.device-item').length).toBe(0)
  })
})
