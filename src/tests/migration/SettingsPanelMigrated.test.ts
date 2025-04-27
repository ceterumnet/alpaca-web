import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SettingsPanelMigrated from '@/components/SettingsPanelMigrated.vue'
import { useUIPreferencesStore, UIMode } from '@/stores/useUIPreferencesStore'
import { useLayoutStore } from '@/stores/useLayoutStore'
import { useNotificationStore } from '@/stores/useNotificationStore'
import { useUnifiedStore } from '@/stores/UnifiedStore'

// Mock the stores
vi.mock('@/stores/useUIPreferencesStore', () => {
  return {
    UIMode: {
      OVERVIEW: 'overview',
      DETAILED: 'detailed',
      FULLSCREEN: 'fullscreen'
    },
    useUIPreferencesStore: vi.fn()
  }
})

vi.mock('@/stores/useLayoutStore', () => {
  return {
    useLayoutStore: vi.fn()
  }
})

vi.mock('@/stores/useNotificationStore', () => {
  return {
    useNotificationStore: vi.fn()
  }
})

// Mock the UnifiedStore
vi.mock('@/stores/UnifiedStore', () => {
  return {
    useUnifiedStore: vi.fn(() => ({
      theme: mockTheme,
      setTheme: mockSetTheme
    }))
  }
})

describe('SettingsPanelMigrated.vue', () => {
  let uiStore: {
    isDarkMode: boolean
    globalUIMode: string
    isSidebarVisible: boolean
    deviceModePreferences: any[]
    toggleDarkMode: any
    setGlobalUIMode: any
    toggleSidebar: any
    resetUIPreferences: any
  }

  let layoutStore: {
    layout: any[]
    resetLayout: any
    updateLayout: any
  }

  let notificationStore: {
    maxHistory: number
    showSuccess: any
    showInfo: any
    showError: any
    clearHistory: any
  }

  let unifiedStore: {
    devicesList: any[]
  }

  beforeEach(() => {
    // Set up a fresh Pinia instance
    const pinia = createPinia()
    setActivePinia(pinia)

    // Mock UI preferences store
    uiStore = {
      isDarkMode: true,
      globalUIMode: UIMode.OVERVIEW,
      isSidebarVisible: true,
      deviceModePreferences: [],
      toggleDarkMode: vi.fn(),
      setGlobalUIMode: vi.fn(),
      toggleSidebar: vi.fn(),
      resetUIPreferences: vi.fn()
    }

    // Mock layout store
    layoutStore = {
      layout: [],
      resetLayout: vi.fn(),
      updateLayout: vi.fn()
    }

    // Mock notification store
    notificationStore = {
      maxHistory: 50,
      showSuccess: vi.fn(),
      showInfo: vi.fn(),
      showError: vi.fn(),
      clearHistory: vi.fn()
    }

    // Mock unified store
    unifiedStore = {
      devicesList: []
    }

    // Set up the mocks
    vi.mocked(useUIPreferencesStore).mockReturnValue(uiStore as any)
    vi.mocked(useLayoutStore).mockReturnValue(layoutStore as any)
    vi.mocked(useNotificationStore).mockReturnValue(notificationStore as any)
    vi.mocked(useUnifiedStore).mockReturnValue(unifiedStore as any)

    // Mock window methods
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') {
        return {
          setAttribute: vi.fn(),
          click: vi.fn()
        } as unknown as HTMLAnchorElement
      }
      if (tagName === 'input') {
        return {
          type: '',
          accept: '',
          click: vi.fn(),
          onchange: null
        } as unknown as HTMLInputElement
      }
      return document.createElement(tagName)
    })

    // Mock global objects
    global.URL.createObjectURL = vi.fn()
    global.URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders correctly with tabs', () => {
    const wrapper = mount(SettingsPanelMigrated)

    // Should render all tabs
    expect(wrapper.find('.settings-panel').exists()).toBe(true)
    expect(wrapper.findAll('.tab-button').length).toBe(5)

    // First tab (appearance) should be active by default
    const activeTab = wrapper.find('.tab-button.active')
    expect(activeTab.exists()).toBe(true)
    expect(activeTab.text()).toContain('Appearance')
  })

  it('switches tabs when clicked', async () => {
    const wrapper = mount(SettingsPanelMigrated)

    // Initial state: Appearance tab is active
    expect(wrapper.find('.tab-button.active').text()).toContain('Appearance')

    // Click on the Layout tab
    await wrapper.findAll('.tab-button')[1].trigger('click')
    expect(wrapper.find('.tab-button.active').text()).toContain('Layout')

    // Layout content should be visible
    expect(wrapper.find('.tab-content h3').text()).toBe('Panel Layout Configuration')
  })

  it('loads initial values from the stores', () => {
    const wrapper = mount(SettingsPanelMigrated)

    // Check if form values match store values
    const vm = wrapper.vm as any
    expect(vm.formState.isDarkMode).toBe(uiStore.isDarkMode)
    expect(vm.formState.defaultUIMode).toBe(uiStore.globalUIMode)
    expect(vm.formState.isSidebarVisible).toBe(uiStore.isSidebarVisible)
    expect(vm.formState.maxNotificationHistory).toBe(notificationStore.maxHistory)
  })

  it('saves settings when the save button is clicked', async () => {
    const wrapper = mount(SettingsPanelMigrated)

    // Change a setting
    const vm = wrapper.vm as any
    vm.formState.maxNotificationHistory = 100

    // Enable the save button by ensuring hasChanges is true
    // We need to manually trigger reactivity since we're modifying VM directly
    await wrapper.setData({
      formState: {
        ...vm.formState,
        maxNotificationHistory: 100
      }
    })

    // Click save button
    await wrapper.find('.action-button.primary').trigger('click')

    // Check if store methods were called
    expect(notificationStore.showSuccess).toHaveBeenCalledWith('Settings saved successfully')
  })

  it('resets settings to defaults when reset button is clicked', async () => {
    // Mock the window.confirm to return true
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    const wrapper = mount(SettingsPanelMigrated)

    // Go to Advanced tab
    await wrapper.findAll('.tab-button')[4].trigger('click')

    // Find and click reset button
    const resetButton = wrapper.find('.danger-zone .action-button.danger')
    await resetButton.trigger('click')

    // Confirm dialog should have been shown
    expect(confirmSpy).toHaveBeenCalled()

    // Reset method should have been called
    expect(uiStore.resetUIPreferences).toHaveBeenCalled()
    expect(notificationStore.showInfo).toHaveBeenCalledWith('Settings reset to defaults')

    // Restore the mock
    confirmSpy.mockRestore()
  })

  it('exports settings when export button is clicked', async () => {
    const wrapper = mount(SettingsPanelMigrated)

    // Go to Advanced tab
    await wrapper.findAll('.tab-button')[4].trigger('click')

    // Find and click export button
    const exportButtons = wrapper.findAll('.setting-actions .action-button')
    const exportButton = exportButtons.find((button) => button.text().includes('Export Settings'))
    await exportButton?.trigger('click')

    // Check if document.createElement was called for the download link
    expect(document.createElement).toHaveBeenCalledWith('a')
  })

  it('shows correct UI for different tabs', async () => {
    const wrapper = mount(SettingsPanelMigrated)

    // Start with Appearance tab (default)
    expect(wrapper.find('.tab-content h3').text()).toBe('Theme & Visual Preferences')

    // Switch to Layout tab
    await wrapper.findAll('.tab-button')[1].trigger('click')
    expect(wrapper.find('.tab-content h3').text()).toBe('Panel Layout Configuration')

    // Switch to Devices tab
    await wrapper.findAll('.tab-button')[2].trigger('click')
    expect(wrapper.find('.tab-content h3').text()).toBe('Device Connection Preferences')

    // Switch to Notifications tab
    await wrapper.findAll('.tab-button')[3].trigger('click')
    expect(wrapper.find('.tab-content h3').text()).toBe('Notification Preferences')

    // Switch to Advanced tab
    await wrapper.findAll('.tab-button')[4].trigger('click')
    expect(wrapper.find('.tab-content h3').text()).toBe('Advanced Options')
  })

  it('handles dark mode toggle correctly', async () => {
    // Set mock initial value
    uiStore.isDarkMode = true

    const wrapper = mount(SettingsPanelMigrated)

    // Toggle dark mode setting
    const darkModeInput = wrapper.find('#dark-mode')
    await darkModeInput.setValue(false)

    // Save settings
    await wrapper.find('.action-button.primary').trigger('click')

    // Toggle should have been called
    expect(uiStore.toggleDarkMode).toHaveBeenCalled()
  })

  it('controls save button state based on changes', async () => {
    const wrapper = mount(SettingsPanelMigrated)

    // Initially, there should be no changes, so button should be disabled
    expect(wrapper.find('.action-button.primary').attributes('disabled')).toBeDefined()

    // Change a setting
    const vm = wrapper.vm as any
    await wrapper.setData({
      formState: {
        ...vm.formState,
        maxNotificationHistory: 100 // Changed from default 50
      }
    })

    // Now the button should be enabled
    expect(wrapper.find('.action-button.primary').attributes('disabled')).toBeUndefined()
  })

  // New tests below

  it('handles UI mode changes correctly', async () => {
    const wrapper = mount(SettingsPanelMigrated)

    // Find the UI mode select dropdown
    const uiModeSelect = wrapper.find('#default-ui-mode')

    // Change UI mode to detailed
    await uiModeSelect.setValue('detailed')

    // Save settings
    await wrapper.find('.action-button.primary').trigger('click')

    // Check if the correct store method was called
    expect(uiStore.setGlobalUIMode).toHaveBeenCalledWith('detailed')
  })

  it('handles sidebar visibility toggle correctly', async () => {
    // Set initial value
    uiStore.isSidebarVisible = true

    const wrapper = mount(SettingsPanelMigrated)

    // Toggle sidebar visibility
    const sidebarToggle = wrapper.find('#sidebar-visible')
    await sidebarToggle.setValue(false)

    // Save settings
    await wrapper.find('.action-button.primary').trigger('click')

    // Check if the correct store method was called
    expect(uiStore.toggleSidebar).toHaveBeenCalled()
  })

  it('handles notification history limit changes', async () => {
    const wrapper = mount(SettingsPanelMigrated)

    // Go to Notifications tab
    await wrapper.findAll('.tab-button')[3].trigger('click')

    // Change notification history limit
    const historyInput = wrapper.find('#notification-history')
    await historyInput.setValue(200)

    // Save settings
    await wrapper.find('.action-button.primary').trigger('click')

    // Check if the value was updated
    expect(notificationStore.maxHistory).toBe(200)
  })

  it('handles notification clear button correctly', async () => {
    const wrapper = mount(SettingsPanelMigrated)

    // Go to Notifications tab
    await wrapper.findAll('.tab-button')[3].trigger('click')

    // Find and click clear notification history button
    const clearButton = wrapper.find('.notification-actions .action-button')
    await clearButton.trigger('click')

    // Check if notification history was cleared
    expect(notificationStore.clearHistory).toHaveBeenCalled()
    expect(notificationStore.showInfo).toHaveBeenCalledWith('Notification history cleared')
  })

  it('imports settings correctly', async () => {
    // Mock FileReader
    const mockFileReader = {
      readAsText: vi.fn(),
      result: JSON.stringify({
        isDarkMode: false,
        defaultUIMode: 'detailed',
        isSidebarVisible: false,
        maxNotificationHistory: 100
      }),
      onload: null,
      onerror: null
    }

    // Mock window.FileReader
    global.FileReader = vi.fn(() => mockFileReader) as any

    const wrapper = mount(SettingsPanelMigrated)

    // Go to Advanced tab
    await wrapper.findAll('.tab-button')[4].trigger('click')

    // Find and click import button
    const importButtons = wrapper.findAll('.setting-actions .action-button')
    const importButton = importButtons.find((button) => button.text().includes('Import Settings'))
    await importButton?.trigger('click')

    // Should create a file input element
    expect(document.createElement).toHaveBeenCalledWith('input')

    // Simulate file selection
    const fileInput = document.createElement('input')

    // Mock a file
    const mockFile = new File(['{}'], 'settings.json', { type: 'application/json' })

    // Trigger file selection
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(mockFile)
    fileInput.files = dataTransfer.files

    // Simulate the onchange event
    if (fileInput.onchange) {
      fileInput.onchange(new Event('change'))
    }

    // Simulate successful file read
    if (mockFileReader.onload) {
      mockFileReader.onload(new Event('load'))
    }

    await flushPromises()

    // Settings should be imported and success message shown
    expect(notificationStore.showSuccess).toHaveBeenCalledWith('Settings imported successfully')
  })

  it('handles layout reset correctly', async () => {
    // Mock the window.confirm to return true
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    const wrapper = mount(SettingsPanelMigrated)

    // Go to Layout tab
    await wrapper.findAll('.tab-button')[1].trigger('click')

    // Find and click reset layout button
    const resetButton = wrapper.find('.layout-actions .action-button.secondary')
    await resetButton.trigger('click')

    // Confirm dialog should have been shown
    expect(confirmSpy).toHaveBeenCalled()

    // Layout should be reset
    expect(layoutStore.resetLayout).toHaveBeenCalled()
    expect(notificationStore.showInfo).toHaveBeenCalledWith('Panel layout reset to default')

    // Restore the mock
    confirmSpy.mockRestore()
  })

  it('handles layout reset cancel correctly', async () => {
    // Mock the window.confirm to return false (user cancels)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    const wrapper = mount(SettingsPanelMigrated)

    // Go to Layout tab
    await wrapper.findAll('.tab-button')[1].trigger('click')

    // Find and click reset layout button
    const resetButton = wrapper.find('.layout-actions .action-button.secondary')
    await resetButton.trigger('click')

    // Confirm dialog should have been shown
    expect(confirmSpy).toHaveBeenCalled()

    // But layout should NOT be reset
    expect(layoutStore.resetLayout).not.toHaveBeenCalled()

    // Restore the mock
    confirmSpy.mockRestore()
  })

  it('handles settings reset cancel correctly', async () => {
    // Mock the window.confirm to return false (user cancels)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    const wrapper = mount(SettingsPanelMigrated)

    // Go to Advanced tab
    await wrapper.findAll('.tab-button')[4].trigger('click')

    // Find and click reset button
    const resetButton = wrapper.find('.danger-zone .action-button.danger')
    await resetButton.trigger('click')

    // Confirm dialog should have been shown
    expect(confirmSpy).toHaveBeenCalled()

    // But settings should NOT be reset
    expect(uiStore.resetUIPreferences).not.toHaveBeenCalled()

    // Restore the mock
    confirmSpy.mockRestore()
  })

  it('handles invalid settings import gracefully', async () => {
    // Mock FileReader with invalid JSON
    const mockFileReader = {
      readAsText: vi.fn(),
      result: '{invalid_json: this is not valid}',
      onload: null,
      onerror: null
    }

    // Mock window.FileReader
    global.FileReader = vi.fn(() => mockFileReader) as any

    const wrapper = mount(SettingsPanelMigrated)

    // Go to Advanced tab
    await wrapper.findAll('.tab-button')[4].trigger('click')

    // Find and click import button
    const importButtons = wrapper.findAll('.setting-actions .action-button')
    const importButton = importButtons.find((button) => button.text().includes('Import Settings'))
    await importButton?.trigger('click')

    // Simulate file selection and load
    const fileInput = document.createElement('input')
    if (fileInput.onchange) {
      fileInput.onchange(new Event('change'))
    }

    // Simulate file load with invalid JSON
    if (mockFileReader.onload) {
      mockFileReader.onload(new Event('load'))
    }

    await flushPromises()

    // Error should be shown
    expect(notificationStore.showError).toHaveBeenCalledWith(
      expect.stringContaining('Error importing settings')
    )
  })

  it('handles file read errors gracefully', async () => {
    // Mock FileReader with an error
    const mockFileReader = {
      readAsText: vi.fn(),
      result: null,
      onload: null,
      onerror: null
    }

    // Mock window.FileReader
    global.FileReader = vi.fn(() => mockFileReader) as any

    const wrapper = mount(SettingsPanelMigrated)

    // Go to Advanced tab
    await wrapper.findAll('.tab-button')[4].trigger('click')

    // Find and click import button
    const importButtons = wrapper.findAll('.setting-actions .action-button')
    const importButton = importButtons.find((button) => button.text().includes('Import Settings'))
    await importButton?.trigger('click')

    // Simulate file selection
    const fileInput = document.createElement('input')
    if (fileInput.onchange) {
      fileInput.onchange(new Event('change'))
    }

    // Simulate file read error
    if (mockFileReader.onerror) {
      mockFileReader.onerror(new Event('error'))
    }

    await flushPromises()

    // Error should be shown
    expect(notificationStore.showError).toHaveBeenCalledWith(
      expect.stringContaining('Error reading file')
    )
  })

  it('cancels import when no file is selected', async () => {
    const wrapper = mount(SettingsPanelMigrated)

    // Go to Advanced tab
    await wrapper.findAll('.tab-button')[4].trigger('click')

    // Find and click import button
    const importButtons = wrapper.findAll('.setting-actions .action-button')
    const importButton = importButtons.find((button) => button.text().includes('Import Settings'))
    await importButton?.trigger('click')

    // Simulate empty file selection (cancel dialog)
    const fileInput = document.createElement('input')
    fileInput.files = null

    // Trigger the onchange event
    if (fileInput.onchange) {
      fileInput.onchange(new Event('change'))
    }

    // Nothing should happen - no errors, no success messages
    expect(notificationStore.showSuccess).not.toHaveBeenCalled()
    expect(notificationStore.showError).not.toHaveBeenCalled()
  })
})
