// Status: Good - Core Store
// This is the UI preferences store that:
// - Manages user interface settings
// - Handles theme and appearance
// - Provides customization options
// - Supports preference persistence
// - Maintains user preferences

import log from '@/plugins/logger'

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
    log.debug('Before toggle:', isDarkMode.value)
    isDarkMode.value = !isDarkMode.value
    log.debug('After toggle:', isDarkMode.value)

    // Save preference to localStorage
    localStorage.setItem('dark-theme-preference', isDarkMode.value.toString())
    log.debug('Saved to localStorage:', isDarkMode.value.toString())

    // Apply dark mode class to document
    if (isDarkMode.value) {
      log.debug('Adding dark-theme class')
      document.documentElement.classList.add('dark-theme')
    } else {
      log.debug('Removing dark-theme class')
      document.documentElement.classList.remove('dark-theme')
    }

    // Check if class was applied correctly
    log.debug('Has dark-theme class:', document.documentElement.classList.contains('dark-theme'))
  }

  // Initialize dark mode on store creation
  function initializeDarkMode() {
    log.debug('Initializing dark mode')
    // Check if we have a stored preference
    const storedPref = localStorage.getItem('dark-theme-preference')
    log.debug('Stored preference:', storedPref)
    if (storedPref !== null) {
      isDarkMode.value = storedPref === 'true'
      log.debug('Using stored preference:', isDarkMode.value)
    } else {
      log.debug('No stored preference, using default:', isDarkMode.value)
    }

    // Apply the current theme
    if (isDarkMode.value) {
      log.debug('Adding dark-theme class on init')
      document.documentElement.classList.add('dark-theme')
    } else {
      log.debug('Removing dark-theme class on init')
      document.documentElement.classList.remove('dark-theme')
    }

    // Check if class was applied correctly
    log.debug('Has dark-theme class after init:', document.documentElement.classList.contains('dark-theme'))
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
