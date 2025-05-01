// Status: Good - Core Store
// This is the sidebar store that:
// - Manages sidebar visibility state
// - Handles sidebar content switching
// - Provides sidebar customization
// - Supports responsive behavior
// - Maintains sidebar preferences

import { defineStore } from 'pinia'

// Types
export type Theme = 'light' | 'dark'

export interface Device {
  id: string
  name: string
  type: string
  connected: boolean
}

// Main store definition
export const useSidebarStore = defineStore('sidebar', {
  state: () => ({
    // Sidebar state
    isSidebarVisible: true,

    // Devices
    devices: [] as Device[],
    selectedDeviceId: null as string | null,

    // UI preferences
    theme: 'light' as Theme
  }),

  getters: {
    selectedDevice: (state) => {
      if (!state.selectedDeviceId) return null
      return state.devices.find((d) => d.id === state.selectedDeviceId) || null
    }
  },

  actions: {
    // Sidebar actions
    toggleSidebar() {
      this.isSidebarVisible = !this.isSidebarVisible
    },

    // Device actions
    addDevice(device: Device) {
      const existingIndex = this.devices.findIndex((d) => d.id === device.id)
      if (existingIndex >= 0) {
        // Update existing device
        this.devices[existingIndex] = device
      } else {
        // Add new device
        this.devices.push(device)
      }
    },

    removeDevice(deviceId: string) {
      this.devices = this.devices.filter((d) => d.id !== deviceId)
      if (this.selectedDeviceId === deviceId) {
        this.selectedDeviceId = null
      }
    },

    updateDeviceConnection(deviceId: string, connected: boolean) {
      const deviceIndex = this.devices.findIndex((d) => d.id === deviceId)
      if (deviceIndex >= 0) {
        this.devices[deviceIndex].connected = connected
      }
    },

    selectDevice(deviceId: string) {
      this.selectedDeviceId = deviceId
    },

    // Theme actions
    setTheme(theme: Theme) {
      this.theme = theme

      // Apply theme to document
      document.documentElement.setAttribute('data-theme', theme)
    }
  }
})
