import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUnifiedStore, type Device } from '../../src/stores/UnifiedStore'

describe('unifiedStore', () => {
  beforeEach(() => {
    // Create a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it
    setActivePinia(createPinia())
  })

  it('has default state', () => {
    const store = useUnifiedStore()
    expect(store.isSidebarVisible).toBe(true)
    expect(store.devices).toEqual(new Map())
    expect(store.selectedDeviceId).toBeNull()
    expect(store.theme).toBe('light')
  })

  describe('device management', () => {
    it('can add a device', () => {
      const store = useUnifiedStore()
      const device: Device = {
        id: 'test-device',
        name: 'Test Device',
        type: 'camera',
        connected: true,
        isConnecting: false,
        isDisconnecting: false,
        isConnected: false,
        properties: {},
        discoveredAt: new Date().toISOString()
      }

      store.addDevice(device)
      expect(store.devices).toHaveLength(1)
      expect(store.devicesList[0]).toEqual(device)
    })

    it('updates a device if it already exists', () => {
      const store = useUnifiedStore()
      const device: Device = {
        id: 'test-device',
        name: 'Test Device',
        type: 'camera',
        connected: true,
        isConnecting: false,
        isDisconnecting: false,
        isConnected: false,
        properties: {}
      }

      store.addDevice(device)

      const updatedDevice: Device = {
        ...device,
        name: 'Updated Device',
        connected: false
      }

      expect(store.addDevice(updatedDevice)).toBe(false)
      expect(store.devices).toHaveLength(1)
    })

    it('can remove a device', () => {
      const store = useUnifiedStore()
      const device: Device = {
        id: 'test-device',
        name: 'Test Device',
        type: 'camera',
        connected: true,
        isConnecting: false,
        isDisconnecting: false,
        isConnected: false,
        properties: {}
      }

      store.addDevice(device)
      expect(store.devices).toHaveLength(1)

      store.removeDevice('test-device')
      expect(store.devices).toHaveLength(0)
    })

    it('clears selected device if it is removed', () => {
      const store = useUnifiedStore()
      const device: Device = {
        id: 'test-device',
        name: 'Test Device',
        type: 'camera',
        connected: true,
        isConnecting: false,
        isDisconnecting: false,
        isConnected: false,
        properties: {}
      }

      store.addDevice(device)
      store.selectDevice('test-device')
      expect(store.selectedDeviceId).toBe('test-device')

      store.removeDevice('test-device')
      expect(store.selectedDeviceId).toBeNull()
    })

    it('can update a device connection status', () => {
      const store = useUnifiedStore()
      const device: Device = {
        id: 'test-device',
        name: 'Test Device',
        type: 'camera',
        isConnecting: false,
        isDisconnecting: false,
        isConnected: false,
        properties: {}
      }

      store.addDevice(device)
      expect(store.getDeviceById('test-device')?.isConnected).toBe(false)

      store.updateDevice('test-device', { isConnected: true })
      expect(store.getDeviceById('test-device')?.isConnected).toBe(true)
    })
  })

  describe('sidebar management', () => {
    it('can toggle sidebar visibility', () => {
      const store = useUnifiedStore()
      expect(store.isSidebarVisible).toBe(true)

      store.toggleSidebar()
      expect(store.isSidebarVisible).toBe(false)

      store.toggleSidebar()
      expect(store.isSidebarVisible).toBe(true)
    })
  })

  describe('theme management', () => {
    it('can set theme', () => {
      const store = useUnifiedStore()
      expect(store.theme).toBe('light')

      store.setTheme('dark')
      expect(store.theme).toBe('dark')
    })
  })
})
