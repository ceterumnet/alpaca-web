// Status: Good - Core UI Component
// This is the settings panel implementation that:
// - Provides application configuration and user preferences
// - Supports multiple setting categories with tab navigation
// - Manages theme and layout preferences
// - Implements import/export functionality
// - Uses the design token system for consistent styling

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useUIPreferencesStore } from '@/stores/useUIPreferencesStore'
import { useNotificationStore } from '@/stores/useNotificationStore'
import { useLayoutStore } from '@/stores/useLayoutStore'
import Icon from '@/components/ui/Icon.vue'
import { 
  LAYOUT_STORAGE_KEY, 
  LAYOUTS_STORAGE_KEY, 
  GRID_LAYOUTS_STORAGE_KEY, 
  CURRENT_LAYOUT_ID_STORAGE_KEY 
} from '@/stores/useLayoutStore'

defineOptions({
  name: 'SettingsPanel'
})

// Get stores
const uiStore = useUIPreferencesStore()
const notificationStore = useNotificationStore()
const layoutStore = useLayoutStore()

// Active tab
const activeTab = ref('appearance')

// Form state
const formState = reactive({
  // Appearance
  isDarkMode: uiStore.isDarkMode,
  defaultUIMode: uiStore.globalUIMode,
  isSidebarVisible: uiStore.isSidebarVisible,

  // Notifications
  notificationPosition: 'top-right',
  notificationDuration: 5000,
  maxNotificationHistory: notificationStore.maxHistory,

  // Devices
  autoConnectDevices: false,
  devicePollingInterval: 5000,

  // Layout
  defaultCameraPanelSize: { w: 6, h: 20 },
  defaultTelescopePanelSize: { w: 6, h: 20 }
})

// Computed properties
const hasChanges = computed(() => {
  return (
    formState.isDarkMode !== uiStore.isDarkMode ||
    formState.defaultUIMode !== uiStore.globalUIMode ||
    formState.isSidebarVisible !== uiStore.isSidebarVisible ||
    formState.maxNotificationHistory !== notificationStore.maxHistory
  )
})

// Methods
function setActiveTab(tab: string) {
  activeTab.value = tab
}

// Save settings
function saveSettings() {
  // Update UI Preferences store
  if (formState.isDarkMode !== uiStore.isDarkMode) {
    uiStore.toggleDarkMode()
  }
  uiStore.setGlobalUIMode(formState.defaultUIMode)
  if (formState.isSidebarVisible !== uiStore.isSidebarVisible) {
    uiStore.toggleSidebar()
  }

  // Update notification settings
  notificationStore.maxHistory = formState.maxNotificationHistory

  // Show success notification
  notificationStore.showSuccess('Settings saved successfully.')
}

// Reset to defaults
function resetToDefaults() {
  // Reset to application defaults
  formState.isDarkMode = false
  formState.maxNotificationHistory = 50

  // Apply changes
  saveSettings()

  // Show notification
  notificationStore.showSuccess('Settings reset to application defaults.')
}

// Export settings
function exportSettings() {
  // Get current settings from stores
  const settings = {
    ui: {
      isDarkMode: uiStore.isDarkMode,
      globalUIMode: uiStore.globalUIMode,
      isSidebarVisible: uiStore.isSidebarVisible
    },
    notifications: {
      maxHistory: notificationStore.maxHistory
    },
    layout: {
      // Add layout settings as needed
    }
  }

  // Convert to JSON and create download
  const settingsJson = JSON.stringify(settings, null, 2)
  const blob = new Blob([settingsJson], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = 'alpaca-web-settings.json'
  a.click()
  
  URL.revokeObjectURL(url)
  
  notificationStore.showSuccess('Settings exported successfully.')
}

// Import settings
function importSettings() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  
  input.onchange = (event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (file) {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const result = e.target?.result
          if (typeof result === 'string') {
            const settings = JSON.parse(result)
            
            // Update form state
            if (settings.ui) {
              formState.isDarkMode = settings.ui.isDarkMode ?? formState.isDarkMode
              formState.defaultUIMode = settings.ui.globalUIMode ?? formState.defaultUIMode
              formState.isSidebarVisible = settings.ui.isSidebarVisible ?? formState.isSidebarVisible
            }
            
            if (settings.notifications) {
              formState.maxNotificationHistory = settings.notifications.maxHistory ?? formState.maxNotificationHistory
            }
            
            // Apply changes
            saveSettings()
            
            notificationStore.showSuccess('Settings imported successfully.')
          }
        } catch (error) {
          console.error('Failed to import settings:', error)
          notificationStore.showError('Failed to import settings. Invalid file format.')
        }
      }

      reader.readAsText(file)
    }
  }

  input.click()
}

// Reset layout storage
function resetLayoutStorage() {
  if (confirm('Are you sure you want to reset all layouts? This will delete all custom layouts and cannot be undone.')) {
    // Clear layout data from local storage
    localStorage.removeItem(LAYOUT_STORAGE_KEY)
    localStorage.removeItem(LAYOUTS_STORAGE_KEY)
    localStorage.removeItem(GRID_LAYOUTS_STORAGE_KEY)
    localStorage.removeItem(CURRENT_LAYOUT_ID_STORAGE_KEY)
    
    // Clear layout store data
    layoutStore.gridLayouts = []
    layoutStore.currentLayoutId = null
    
    // Recreate default layouts next time the app is opened
    notificationStore.showSuccess('Layout storage has been reset. Refresh the page to apply changes.')
  }
}
</script>

<template>
  <div class="aw-settings" data-testid="settings-panel">
    <header class="aw-settings__header">
      <h2 class="aw-settings__title">Application Settings</h2>
      <p class="aw-settings__description">Configure your preferences for the application</p>
    </header>

    <div class="aw-settings__body">
      <!-- Tab navigation -->
      <div class="aw-settings__tabs">
        <button
          data-testid="tab-appearance"
          class="aw-settings__tab-btn"
          :class="{ 'aw-settings__tab-btn--active': activeTab === 'appearance' }"
          @click="setActiveTab('appearance')"
        >
          <Icon type="gear" />
          <span>Appearance</span>
        </button>

        <button
          data-testid="tab-devices"
          class="aw-settings__tab-btn"
          :class="{ 'aw-settings__tab-btn--active': activeTab === 'devices' }"
          @click="setActiveTab('devices')"
        >
          <Icon type="device-unknown" />
          <span>Devices</span>
        </button>

        <button
          data-testid="tab-notifications"
          class="aw-settings__tab-btn"
          :class="{ 'aw-settings__tab-btn--active': activeTab === 'notifications' }"
          @click="setActiveTab('notifications')"
        >
          <Icon type="bell" />
          <span>Notifications</span>
        </button>

        <button
          data-testid="tab-advanced"
          class="aw-settings__tab-btn"
          :class="{ 'aw-settings__tab-btn--active': activeTab === 'advanced' }"
          @click="setActiveTab('advanced')"
        >
          <Icon type="gear" />
          <span>Advanced</span>
        </button>
      </div>

      <!-- Settings content -->
      <div class="aw-settings__content">
        <!-- Appearance Settings -->
        <div v-if="activeTab === 'appearance'" class="aw-settings__tab-content" data-testid="content-appearance">
          <h3 class="aw-settings__section-title">Theme & Display</h3>

          <div class="aw-settings__group">
            <div class="aw-settings__row">
              <label>Dark Mode (Night Vision)</label>
              <label class="aw-settings__toggle">
                <input
                  v-model="formState.isDarkMode"
                  data-testid="toggle-dark-mode"
                  type="checkbox"
                />
                <span class="aw-settings__toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- Layout Settings -->
        <div v-if="activeTab === 'layout'" class="aw-settings__tab-content" data-testid="content-layout">
          <h3 class="aw-settings__section-title">Panel Layout Configuration</h3>

          <div class="aw-settings__group">
            <p class="aw-settings__description">
              Select from a set of pre-defined layouts for your device panels.
            </p>

            <div class="aw-form-group">
              <label class="aw-form-label">Default Camera Panel Size</label>
              <div class="aw-settings__size-inputs">
                <div class="aw-settings__size-input">
                  <label for="camera-width">W</label>
                  <input
                    id="camera-width"
                    v-model.number="formState.defaultCameraPanelSize.w"
                    data-testid="input-camera-width"
                    type="number"
                    min="1"
                    max="12"
                    class="aw-input aw-input--sm"
                  />
                </div>
                <div class="aw-settings__size-input">
                  <label for="camera-height">H</label>
                  <input
                    id="camera-height"
                    v-model.number="formState.defaultCameraPanelSize.h"
                    data-testid="input-camera-height"
                    type="number"
                    min="1"
                    max="40"
                    class="aw-input aw-input--sm"
                  />
                </div>
              </div>
            </div>

            <div class="aw-form-group">
              <label class="aw-form-label">Default Telescope Panel Size</label>
              <div class="aw-settings__size-inputs">
                <div class="aw-settings__size-input">
                  <label for="telescope-width">W</label>
                  <input
                    id="telescope-width"
                    v-model.number="formState.defaultTelescopePanelSize.w"
                    data-testid="input-telescope-width"
                    type="number"
                    min="1"
                    max="12"
                    class="aw-input aw-input--sm"
                  />
                </div>
                <div class="aw-settings__size-input">
                  <label for="telescope-height">H</label>
                  <input
                    id="telescope-height"
                    v-model.number="formState.defaultTelescopePanelSize.h"
                    data-testid="input-telescope-height"
                    type="number"
                    min="1"
                    max="40"
                    class="aw-input aw-input--sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Devices Settings -->
        <div v-if="activeTab === 'devices'" class="aw-settings__tab-content" data-testid="content-devices">
          <h3 class="aw-settings__section-title">Device Connection Settings</h3>

          <div class="aw-settings__group">
            <div class="aw-settings__row">
              <label>Auto-connect Devices</label>
              <label class="aw-settings__toggle">
                <input
                  v-model="formState.autoConnectDevices"
                  data-testid="toggle-auto-connect"
                  type="checkbox"
                />
                <span class="aw-settings__toggle-slider"></span>
              </label>
            </div>

            <div class="aw-settings__row">
              <label>Polling Interval (ms)</label>
              <input
                v-model.number="formState.devicePollingInterval"
                data-testid="input-polling-interval"
                type="number"
                min="1000"
                max="10000"
                step="500"
                class="aw-settings__input"
              />
            </div>
          </div>
        </div>

        <!-- Notifications Settings -->
        <div v-if="activeTab === 'notifications'" class="aw-settings__tab-content" data-testid="content-notifications">
          <h3 class="aw-settings__section-title">Notification Settings</h3>

          <div class="aw-settings__group">
            <div class="aw-settings__row">
              <label>Notification Position</label>
              <select
                v-model="formState.notificationPosition"
                data-testid="select-notification-position"
                class="aw-settings__select"
              >
                <option value="top-right">Top Right</option>
                <option value="top-left">Top Left</option>
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
              </select>
            </div>

            <div class="aw-settings__row">
              <label>Notification Duration (ms)</label>
              <input
                v-model.number="formState.notificationDuration"
                data-testid="input-notification-duration"
                type="number"
                min="1000"
                max="15000"
                step="1000"
                class="aw-settings__input"
              />
            </div>

            <div class="aw-settings__row">
              <label>Max Notification History</label>
              <input
                v-model.number="formState.maxNotificationHistory"
                data-testid="input-max-history"
                type="number"
                min="10"
                max="200"
                step="10"
                class="aw-settings__input"
              />
            </div>
          </div>
        </div>

        <!-- Advanced Settings -->
        <div v-if="activeTab === 'advanced'" class="aw-settings__tab-content" data-testid="content-advanced">
          <h3 class="aw-settings__section-title">Advanced Configuration</h3>

          <div class="aw-settings__group">
            <div class="aw-settings__actions">
              <button class="aw-settings__btn" @click="exportSettings">
                <Icon type="files" />
                Export Settings
              </button>
              <button class="aw-settings__btn" @click="importSettings">
                <Icon type="files" />
                Import Settings
              </button>
            </div>
          </div>

          <div class="aw-settings__group aw-settings__group--danger">
            <h4 class="aw-settings__danger-title">Danger Zone</h4>
            <p class="aw-settings__description aw-settings__description--warning">
              These actions cannot be undone and may affect your application experience.
            </p>

            <div class="aw-settings__actions">
              <button
                class="aw-settings__btn aw-settings__btn--danger"
                data-testid="btn-reset-defaults"
                @click="resetToDefaults"
              >
                <Icon type="reset" />
                Reset to Factory Defaults
              </button>
              <button
                class="aw-settings__btn aw-settings__btn--danger"
                data-testid="btn-reset-layout-storage"
                @click="resetLayoutStorage"
              >
                <Icon type="reset" />
                Reset Layout Storage
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <footer class="aw-settings__footer">
      <div class="aw-settings__footer-actions">
        <button
          class="aw-settings__btn aw-settings__btn--primary"
          data-testid="btn-save"
          :disabled="!hasChanges"
          @click="saveSettings"
        >
          Save Changes
        </button>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.aw-settings {
  display: flex;
  flex-direction: column;
  background-color: var(--aw-panel-bg-color);
  border-radius: var(--aw-border-radius-md);
  border: 1px solid var(--aw-panel-border-color);
  overflow: hidden;
  max-width: 800px;
  margin: 0 auto;
  box-shadow: var(--aw-shadow-md);
  height: 100%;
}

.aw-settings__header {
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
  padding: var(--aw-spacing-md) var(--aw-spacing-lg);
  border-bottom: 1px solid var(--aw-panel-border-color);
}

.aw-settings__title {
  margin: 0;
  font-size: 1.5rem;
}

.aw-settings__description {
  margin: var(--aw-spacing-xs) 0 0;
  opacity: 0.8;
  font-size: 0.9rem;
}

.aw-settings__body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.aw-settings__tabs {
  width: 180px;
  background-color: rgb(0 0 0 / 5%);
  border-right: 1px solid var(--aw-panel-border-color);
  padding: var(--aw-spacing-md) 0;
  display: flex;
  flex-direction: column;
}

.aw-settings__tab-btn {
  display: flex;
  align-items: center;
  padding: var(--aw-spacing-sm) var(--aw-spacing-md);
  border: none;
  background: none;
  text-align: left;
  color: var(--aw-text-color);
  font-size: 0.9rem;
  cursor: pointer;
  transition:
    background-color 0.2s,
    color 0.2s;
  border-left: 3px solid transparent;
}

.aw-settings__tab-btn:hover {
  background-color: var(--aw-panel-hover-bg-color);
}

.aw-settings__tab-btn--active {
  background-color: var(--aw-panel-hover-bg-color);
  border-left-color: var(--aw-panel-resize-bg-color);
  font-weight: 500;
}

.aw-settings__tab-btn span {
  margin-left: var(--aw-spacing-sm);
}

.aw-settings__content {
  flex: 1;
  padding: var(--aw-spacing-lg);
  overflow-y: auto;
}

.aw-settings__tab-content {
  max-width: 550px;
}

.aw-settings__section-title {
  margin-top: 0;
  margin-bottom: var(--aw-spacing-md);
  font-size: 1.2rem;
  color: var(--aw-text-color);
  padding-bottom: var(--aw-spacing-sm);
  border-bottom: 1px solid var(--aw-panel-border-color);
}

.aw-settings__group {
  background-color: var(--aw-panel-content-bg-color);
  border-radius: var(--aw-border-radius-md);
  padding: var(--aw-spacing-md);
  margin-bottom: var(--aw-spacing-lg);
}

.aw-settings__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--aw-spacing-md);
}

.aw-settings__row:last-child {
  margin-bottom: 0;
}

.aw-settings__description {
  margin-top: 0;
  margin-bottom: var(--aw-spacing-md);
  font-size: 0.9rem;
  opacity: 0.8;
}

.aw-settings__description--warning {
  color: var(--aw-error-color);
}

/* Controls */
.aw-settings__toggle {
  position: relative;
  display: inline-block;
  width: 46px;
  height: 24px;
}

.aw-settings__toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.aw-settings__toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: var(--aw-panel-content-bg-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 24px;
  transition: 0.4s;
}

.aw-settings__toggle-slider::before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 2px;
  background-color: var(--aw-button-secondary-bg);
  border-radius: 50%;
  transition: 0.4s;
}

input:checked + .aw-settings__toggle-slider {
  background-color: var(--aw-button-primary-bg);
  border-color: var(--aw-button-primary-bg);
}

input:checked + .aw-settings__toggle-slider::before {
  transform: translateX(22px);
  background-color: var(--aw-button-primary-text);
}

.aw-settings__input,
.aw-settings__select {
  background-color: var(--aw-input-bg-color);
  border: 1px solid var(--aw-input-border-color);
  color: var(--aw-text-color);
  padding: var(--aw-spacing-xs) var(--aw-spacing-sm);
  border-radius: var(--aw-border-radius-sm);
  width: 120px;
}

.aw-settings__select {
  width: 150px;
}

.aw-settings__size-inputs {
  display: flex;
  gap: var(--aw-spacing-sm);
}

.aw-settings__size-input {
  display: flex;
  align-items: center;
}

.aw-settings__size-input label {
  margin-right: var(--aw-spacing-xs);
  opacity: 0.7;
  font-size: 0.8rem;
}

.aw-settings__size-input .aw-settings__input {
  width: 50px;
}

/* Actions */
.aw-settings__actions {
  display: flex;
  justify-content: flex-start;
  gap: var(--aw-spacing-sm);
  margin-top: var(--aw-spacing-md);
}

.aw-settings__btn {
  display: inline-flex;
  align-items: center;
  padding: var(--aw-spacing-xs) var(--aw-spacing-md);
  background-color: var(--aw-button-secondary-bg);
  color: var(--aw-button-secondary-text);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
  font-size: 0.9rem;
  gap: var(--aw-spacing-xs);
  transition: background-color 0.2s ease;
}

.aw-settings__btn:hover:not(:disabled) {
  background-color: var(--aw-button-secondary-hover-bg);
}

.aw-settings__btn--primary {
  background-color: var(--aw-button-primary-bg);
  color: var(--aw-button-primary-text);
  border-color: var(--aw-button-primary-bg);
}

.aw-settings__btn--primary:hover:not(:disabled) {
  background-color: var(--aw-button-primary-hover-bg);
  border-color: var(--aw-button-primary-hover-bg);
}

.aw-settings__btn--danger {
  background-color: var(--aw-button-danger-bg);
  color: var(--aw-button-danger-text);
  border-color: var(--aw-button-danger-bg);
}

.aw-settings__btn--danger:hover:not(:disabled) {
  background-color: var(--aw-button-danger-hover-bg);
  border-color: var(--aw-button-danger-hover-bg);
}

.aw-settings__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.aw-settings__group--danger {
  border: 1px solid var(--aw-error-color);
}

.aw-settings__danger-title {
  color: var(--aw-error-color);
  margin-top: 0;
  margin-bottom: var(--aw-spacing-sm);
}

/* Footer */
.aw-settings__footer {
  background-color: var(--aw-panel-content-bg-color);
  border-top: 1px solid var(--aw-panel-border-color);
  padding: var(--aw-spacing-md) var(--aw-spacing-lg);
}

.aw-settings__footer-actions {
  display: flex;
  justify-content: flex-end;
}

/* Responsive styles */
@media (width <= 768px) {
  .aw-settings__body {
    flex-direction: column;
  }

  .aw-settings__tabs {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--aw-panel-border-color);
    flex-direction: row;
    overflow-x: auto;
    padding: 0;
  }

  .aw-settings__tab-btn {
    flex-direction: column;
    border-left: none;
    border-bottom: 3px solid transparent;
    padding: var(--aw-spacing-sm);
  }

  .aw-settings__tab-btn--active {
    border-left-color: transparent;
    border-bottom-color: var(--aw-panel-resize-bg-color);
  }

  .aw-settings__tab-btn span {
    margin-left: 0;
    margin-top: var(--aw-spacing-xs);
    font-size: 0.8rem;
  }

  .aw-settings__row {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--aw-spacing-sm);
  }

  .aw-settings__content {
    padding: var(--aw-spacing-md);
  }
}
</style>
