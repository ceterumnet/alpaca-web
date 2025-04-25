import { defineStore } from 'pinia'
import { ref } from 'vue'

// Define the available UI modes
export enum UIMode {
  OVERVIEW = 'overview', // Compact mode showing essential controls
  DETAILED = 'detailed', // Expanded controls with more options
  FULLSCREEN = 'fullscreen' // Maximum screen real estate for complex devices
}

// Define a type for device-specific mode preferences
export interface DeviceModePreference {
  deviceType: string
  deviceId: string | number
  preferredMode: UIMode
}

export const useUIPreferencesStore = defineStore('uiPreferences', () => {
  // Global UI mode preference
  const globalUIMode = ref<UIMode>(UIMode.OVERVIEW)

  // Device-specific mode preferences
  const deviceModePreferences = ref<DeviceModePreference[]>([])

  // Sidebar visibility
  const isSidebarVisible = ref(true)

  // Dark mode preference (extending existing functionality)
  const isDarkMode = ref(true)

  // Set the global UI mode
  function setGlobalUIMode(mode: UIMode) {
    globalUIMode.value = mode
  }

  // Set a device-specific UI mode preference
  function setDeviceUIMode(deviceType: string, deviceId: string | number, mode: UIMode) {
    // Remove any existing preference for this device
    const index = deviceModePreferences.value.findIndex(
      (pref) => pref.deviceType === deviceType && pref.deviceId === deviceId
    )

    if (index >= 0) {
      deviceModePreferences.value[index].preferredMode = mode
    } else {
      // Add new preference
      deviceModePreferences.value.push({
        deviceType,
        deviceId,
        preferredMode: mode
      })
    }
  }

  // Get the effective UI mode for a device (device-specific if set, otherwise global)
  function getDeviceUIMode(deviceType: string, deviceId: string | number): UIMode {
    const devicePref = deviceModePreferences.value.find(
      (pref) => pref.deviceType === deviceType && pref.deviceId === deviceId
    )

    return devicePref?.preferredMode || globalUIMode.value
  }

  // Toggle sidebar visibility
  function toggleSidebar() {
    isSidebarVisible.value = !isSidebarVisible.value
  }

  // Toggle dark mode
  function toggleDarkMode() {
    isDarkMode.value = !isDarkMode.value
    // Apply dark mode class to document
    if (isDarkMode.value) {
      document.documentElement.classList.add('dark-mode')
    } else {
      document.documentElement.classList.remove('dark-mode')
    }
  }

  // Initialize dark mode on store creation
  function initializeDarkMode() {
    if (isDarkMode.value) {
      document.documentElement.classList.add('dark-mode')
    }
  }

  // Reset all UI preferences to defaults
  function resetUIPreferences() {
    globalUIMode.value = UIMode.OVERVIEW
    deviceModePreferences.value = []
    isSidebarVisible.value = true
    // Keep dark mode as is
  }

  return {
    globalUIMode,
    deviceModePreferences,
    isSidebarVisible,
    isDarkMode,
    setGlobalUIMode,
    setDeviceUIMode,
    getDeviceUIMode,
    toggleSidebar,
    toggleDarkMode,
    initializeDarkMode,
    resetUIPreferences
  }
})
