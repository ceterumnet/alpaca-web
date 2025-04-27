import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSidebarStore, type Device } from '../../src/stores/SidebarStore'

describe('SidebarStore', () => {
  beforeEach(() => {
    // Create a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it
    setActivePinia(createPinia())
  })

  it('has default state', () => {
    const store = useSidebarStore()
    expect(store.isSidebarVisible).toBe(true)
    expect(store.devices).toEqual([])
    expect(store.selectedDeviceId).toBeNull()
    expect(store.theme).toBe('light')
  })

  describe('device management', () => {
    it('can add a device', () => {
      const store = useSidebarStore()
      const device: Device = {
        id: 'test-device',
        name: 'Test Device',
        type: 'camera',
        connected: true
      }

      store.addDevice(device)
      expect(store.devices).toHaveLength(1)
      expect(store.devices[0]).toEqual(device)
    })

    it('updates a device if it already exists', () => {
      const store = useSidebarStore()
      const device: Device = {
        id: 'test-device',
        name: 'Test Device',
        type: 'camera',
        connected: true
      }

      store.addDevice(device)

      const updatedDevice: Device = {
        ...device,
        name: 'Updated Device',
        connected: false
      }

      store.addDevice(updatedDevice)

      expect(store.devices).toHaveLength(1)
      expect(store.devices[0]).toEqual(updatedDevice)
    })

    it('can remove a device', () => {
      const store = useSidebarStore()
      const device: Device = {
        id: 'test-device',
        name: 'Test Device',
        type: 'camera',
        connected: true
      }

      store.addDevice(device)
      expect(store.devices).toHaveLength(1)

      store.removeDevice('test-device')
      expect(store.devices).toHaveLength(0)
    })

    it('clears selected device if it is removed', () => {
      const store = useSidebarStore()
      const device: Device = {
        id: 'test-device',
        name: 'Test Device',
        type: 'camera',
        connected: true
      }

      store.addDevice(device)
      store.selectDevice('test-device')
      expect(store.selectedDeviceId).toBe('test-device')

      store.removeDevice('test-device')
      expect(store.selectedDeviceId).toBeNull()
    })

    it('can update a device connection status', () => {
      const store = useSidebarStore()
      const device: Device = {
        id: 'test-device',
        name: 'Test Device',
        type: 'camera',
        connected: true
      }

      store.addDevice(device)
      expect(store.devices[0].connected).toBe(true)

      store.updateDeviceConnection('test-device', false)
      expect(store.devices[0].connected).toBe(false)
    })
  })

  describe('sidebar management', () => {
    it('can toggle sidebar visibility', () => {
      const store = useSidebarStore()
      expect(store.isSidebarVisible).toBe(true)

      store.toggleSidebar()
      expect(store.isSidebarVisible).toBe(false)

      store.toggleSidebar()
      expect(store.isSidebarVisible).toBe(true)
    })
  })

  describe('theme management', () => {
    it('can set theme', () => {
      const store = useSidebarStore()
      expect(store.theme).toBe('light')

      store.setTheme('dark')
      expect(store.theme).toBe('dark')
    })
  })
})
