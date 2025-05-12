// Status: Good - Core Store
// This is the UI preferences store that:
// - Manages user interface settings
// - Handles theme and appearance
// - Provides customization options
// - Supports preference persistence
// - Maintains user preferences

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

  // Layout selection mode: 'simple' or 'advanced'
  const layoutSelectionMode = ref<'simple' | 'advanced'>((localStorage.getItem('layout-selection-mode') as 'simple' | 'advanced') || 'advanced')

  // Set the global UI mode
  function setGlobalUIMode(mode: UIMode) {
    globalUIMode.value = mode
  }

  // Set a device-specific UI mode preference
  function setDeviceUIMode(deviceType: string, deviceId: string | number, mode: UIMode) {
    // Remove any existing preference for this device
    const index = deviceModePreferences.value.findIndex((pref) => pref.deviceType === deviceType && pref.deviceId === deviceId)

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
    const devicePref = deviceModePreferences.value.find((pref) => pref.deviceType === deviceType && pref.deviceId === deviceId)

    return devicePref?.preferredMode || globalUIMode.value
  }

  // Toggle sidebar visibility
  function toggleSidebar() {
    isSidebarVisible.value = !isSidebarVisible.value
  }

  // Toggle dark mode
  function toggleDarkMode() {
    console.log('Before toggle:', isDarkMode.value)
    isDarkMode.value = !isDarkMode.value
    console.log('After toggle:', isDarkMode.value)

    // Save preference to localStorage
    localStorage.setItem('dark-theme-preference', isDarkMode.value.toString())
    console.log('Saved to localStorage:', isDarkMode.value.toString())

    // Apply dark mode class to document
    if (isDarkMode.value) {
      console.log('Adding dark-theme class')
      document.documentElement.classList.add('dark-theme')
    } else {
      console.log('Removing dark-theme class')
      document.documentElement.classList.remove('dark-theme')
    }

    // Check if class was applied correctly
    console.log('Has dark-theme class:', document.documentElement.classList.contains('dark-theme'))
  }

  // Initialize dark mode on store creation
  function initializeDarkMode() {
    console.log('Initializing dark mode')
    // Check if we have a stored preference
    const storedPref = localStorage.getItem('dark-theme-preference')
    console.log('Stored preference:', storedPref)
    if (storedPref !== null) {
      isDarkMode.value = storedPref === 'true'
      console.log('Using stored preference:', isDarkMode.value)
    } else {
      console.log('No stored preference, using default:', isDarkMode.value)
    }

    // Apply the current theme
    if (isDarkMode.value) {
      console.log('Adding dark-theme class on init')
      document.documentElement.classList.add('dark-theme')
    } else {
      console.log('Removing dark-theme class on init')
      document.documentElement.classList.remove('dark-theme')
    }

    // Check if class was applied correctly
    console.log('Has dark-theme class after init:', document.documentElement.classList.contains('dark-theme'))
  }

  // Reset all UI preferences to defaults
  function resetUIPreferences() {
    globalUIMode.value = UIMode.OVERVIEW
    deviceModePreferences.value = []
    isSidebarVisible.value = true
    // Keep dark mode as is
  }

  function setLayoutSelectionMode(mode: 'simple' | 'advanced') {
    layoutSelectionMode.value = mode
    localStorage.setItem('layout-selection-mode', mode)
  }

  return {
    globalUIMode,
    deviceModePreferences,
    isSidebarVisible,
    isDarkMode,
    layoutSelectionMode,
    setGlobalUIMode,
    setDeviceUIMode,
    getDeviceUIMode,
    toggleSidebar,
    toggleDarkMode,
    initializeDarkMode,
    resetUIPreferences,
    setLayoutSelectionMode
  }
})
