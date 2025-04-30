<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useUIPreferencesStore, UIMode } from '@/stores/useUIPreferencesStore'
import { useLayoutStore } from '@/stores/useLayoutStore'
import { useNotificationStore } from '@/stores/useNotificationStore'
//import Icon from '@/components/ui/Icon.vue'

defineOptions({
  name: 'SettingsPanelMigrated'
})

// Get stores
const uiStore = useUIPreferencesStore()
const layoutStore = useLayoutStore()
const notificationStore = useNotificationStore()

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

function saveSettings() {
  // Apply UI preferences
  if (formState.isDarkMode !== uiStore.isDarkMode) {
    uiStore.toggleDarkMode()
  }

  uiStore.setGlobalUIMode(formState.defaultUIMode)

  if (formState.isSidebarVisible !== uiStore.isSidebarVisible) {
    uiStore.toggleSidebar()
  }

  // Apply notification settings
  notificationStore.maxHistory = formState.maxNotificationHistory

  // Apply device settings
  // TODO: Implement device settings when supported by the API

  // Notify user
  notificationStore.showSuccess('Settings saved successfully')
}

function resetToDefaults() {
  if (confirm('Reset all settings to default values? This cannot be undone.')) {
    uiStore.resetUIPreferences()
    formState.isDarkMode = uiStore.isDarkMode
    formState.defaultUIMode = uiStore.globalUIMode
    formState.isSidebarVisible = uiStore.isSidebarVisible
    notificationStore.showInfo('Settings reset to defaults')
  }
}

function exportSettings() {
  // Create a settings object combining all relevant stores
  const settings = {
    ui: {
      isDarkMode: uiStore.isDarkMode,
      globalUIMode: uiStore.globalUIMode,
      isSidebarVisible: uiStore.isSidebarVisible,
      deviceModePreferences: uiStore.deviceModePreferences
    },
    notifications: {
      maxHistory: notificationStore.maxHistory
    },
    layout: layoutStore.layout
  }

  // Convert to JSON and create download
  const dataStr = JSON.stringify(settings, null, 2)
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)

  const exportFileDefaultName = 'alpaca-web-settings.json'

  const linkElement = document.createElement('a')
  linkElement.setAttribute('href', dataUri)
  linkElement.setAttribute('download', exportFileDefaultName)
  linkElement.click()
}

interface ImportedDeviceModePreference {
  deviceType: string
  deviceId: string | number
  preferredMode: UIMode
}

function importSettings() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'

  input.onchange = (e: Event) => {
    const target = e.target as HTMLInputElement
    if (target.files && target.files.length > 0) {
      const file = target.files[0]
      const reader = new FileReader()

      reader.onload = (event) => {
        try {
          const settings = JSON.parse(event.target?.result as string)

          // Apply imported settings
          if (settings.ui) {
            if (settings.ui.isDarkMode !== uiStore.isDarkMode) {
              uiStore.toggleDarkMode()
            }

            if (settings.ui.globalUIMode) {
              uiStore.setGlobalUIMode(settings.ui.globalUIMode)
            }

            if (settings.ui.isSidebarVisible !== uiStore.isSidebarVisible) {
              uiStore.toggleSidebar()
            }

            if (settings.ui.deviceModePreferences) {
              // Reset existing preferences
              uiStore.deviceModePreferences.length = 0

              // Apply imported preferences
              settings.ui.deviceModePreferences.forEach((pref: ImportedDeviceModePreference) => {
                uiStore.setDeviceUIMode(pref.deviceType, pref.deviceId, pref.preferredMode)
              })
            }
          }

          if (settings.notifications) {
            if (settings.notifications.maxHistory) {
              notificationStore.maxHistory = settings.notifications.maxHistory
            }
          }

          if (settings.layout) {
            layoutStore.updateLayout(settings.layout)
          }

          // Update form state
          formState.isDarkMode = uiStore.isDarkMode
          formState.defaultUIMode = uiStore.globalUIMode
          formState.isSidebarVisible = uiStore.isSidebarVisible
          formState.maxNotificationHistory = notificationStore.maxHistory

          notificationStore.showSuccess('Settings imported successfully')
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
</script>

<template>
  <div class="settings-panel" data-testid="settings-panel">
    <header class="settings-header">
      <h2>Application Settings</h2>
      <p>Configure your preferences for the application</p>
    </header>

    <div class="settings-body">
      <!-- Tab navigation -->
      <div class="settings-tabs">
        <button
          data-testid="tab-appearance"
          class="tab-button"
          :class="{ active: activeTab === 'appearance' }"
          @click="setActiveTab('appearance')"
        >
          <Icon type="gear" />
          <span>Appearance</span>
        </button>

        <button
          data-testid="tab-layout"
          class="tab-button"
          :class="{ active: activeTab === 'layout' }"
          @click="setActiveTab('layout')"
        >
          <Icon type="compact" />
          <span>Layout</span>
        </button>

        <button
          data-testid="tab-devices"
          class="tab-button"
          :class="{ active: activeTab === 'devices' }"
          @click="setActiveTab('devices')"
        >
          <Icon type="device-unknown" />
          <span>Devices</span>
        </button>

        <button
          data-testid="tab-notifications"
          class="tab-button"
          :class="{ active: activeTab === 'notifications' }"
          @click="setActiveTab('notifications')"
        >
          <Icon type="device-unknown" />
          <span>Notifications</span>
        </button>

        <button
          data-testid="tab-advanced"
          class="tab-button"
          :class="{ active: activeTab === 'advanced' }"
          @click="setActiveTab('advanced')"
        >
          <Icon type="gear" />
          <span>Advanced</span>
        </button>
      </div>

      <!-- Tab content -->
      <div class="settings-content">
        <!-- Appearance Settings -->
        <div v-if="activeTab === 'appearance'" class="tab-content" data-testid="content-appearance">
          <h3>Theme & Visual Preferences</h3>

          <div class="setting-group">
            <div class="setting-row">
              <label for="dark-mode">Dark Mode</label>
              <div class="toggle-switch">
                <input
                  id="dark-mode"
                  v-model="formState.isDarkMode"
                  data-testid="input-dark-mode"
                  type="checkbox"
                />
                <span class="toggle-slider"></span>
              </div>
            </div>

            <div class="setting-row">
              <label for="default-ui-mode">Default Panel Mode</label>
              <select
                id="default-ui-mode"
                v-model="formState.defaultUIMode"
                data-testid="select-ui-mode"
              >
                <option :value="UIMode.OVERVIEW">Overview</option>
                <option :value="UIMode.DETAILED">Detailed</option>
                <option :value="UIMode.FULLSCREEN">Fullscreen</option>
              </select>
            </div>

            <div class="setting-row">
              <label for="sidebar-visible">Show Sidebar</label>
              <div class="toggle-switch">
                <input
                  id="sidebar-visible"
                  v-model="formState.isSidebarVisible"
                  data-testid="input-sidebar-visible"
                  type="checkbox"
                />
                <span class="toggle-slider"></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Layout Settings -->
        <div v-if="activeTab === 'layout'" class="tab-content" data-testid="content-layout">
          <h3>Panel Layout Configuration</h3>

          <div class="setting-group">
            <p class="setting-description">
              Configure default sizes and layout behavior for device panels.
            </p>

            <div class="setting-row">
              <label>Default Camera Panel Size</label>
              <div class="size-inputs">
                <div class="size-input">
                  <label for="camera-width">W</label>
                  <input
                    id="camera-width"
                    v-model.number="formState.defaultCameraPanelSize.w"
                    data-testid="input-camera-width"
                    type="number"
                    min="1"
                    max="12"
                  />
                </div>
                <div class="size-input">
                  <label for="camera-height">H</label>
                  <input
                    id="camera-height"
                    v-model.number="formState.defaultCameraPanelSize.h"
                    data-testid="input-camera-height"
                    type="number"
                    min="1"
                    max="40"
                  />
                </div>
              </div>
            </div>

            <div class="setting-row">
              <label>Default Telescope Panel Size</label>
              <div class="size-inputs">
                <div class="size-input">
                  <label for="telescope-width">W</label>
                  <input
                    id="telescope-width"
                    v-model.number="formState.defaultTelescopePanelSize.w"
                    data-testid="input-telescope-width"
                    type="number"
                    min="1"
                    max="12"
                  />
                </div>
                <div class="size-input">
                  <label for="telescope-height">H</label>
                  <input
                    id="telescope-height"
                    v-model.number="formState.defaultTelescopePanelSize.h"
                    data-testid="input-telescope-height"
                    type="number"
                    min="1"
                    max="40"
                  />
                </div>
              </div>
            </div>

            <div class="setting-actions">
              <button
                data-testid="reset-layout-btn"
                class="action-button danger"
                @click="layoutStore.resetLayout()"
              >
                Reset Current Layout
              </button>
            </div>
          </div>
        </div>

        <!-- Device Settings -->
        <div v-if="activeTab === 'devices'" class="tab-content" data-testid="content-devices">
          <h3>Device Connection Preferences</h3>

          <div class="setting-group">
            <p class="setting-description">
              Configure how the application interacts with connected devices.
            </p>

            <div class="setting-row">
              <label for="auto-connect">Auto-connect Devices</label>
              <div class="toggle-switch">
                <input
                  id="auto-connect"
                  v-model="formState.autoConnectDevices"
                  data-testid="input-auto-connect"
                  type="checkbox"
                />
                <span class="toggle-slider"></span>
              </div>
            </div>

            <div class="setting-row">
              <label for="polling-interval">Device Polling Interval (ms)</label>
              <input
                id="polling-interval"
                v-model.number="formState.devicePollingInterval"
                data-testid="input-polling-interval"
                type="number"
                min="1000"
                step="500"
              />
            </div>
          </div>
        </div>

        <!-- Notification Settings -->
        <div
          v-if="activeTab === 'notifications'"
          class="tab-content"
          data-testid="content-notifications"
        >
          <h3>Notification Preferences</h3>

          <div class="setting-group">
            <div class="setting-row">
              <label for="notification-position">Default Position</label>
              <select
                id="notification-position"
                v-model="formState.notificationPosition"
                data-testid="select-notification-position"
              >
                <option value="top-right">Top Right</option>
                <option value="top-left">Top Left</option>
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="top-center">Top Center</option>
                <option value="bottom-center">Bottom Center</option>
              </select>
            </div>

            <div class="setting-row">
              <label for="notification-duration">Duration (ms)</label>
              <input
                id="notification-duration"
                v-model.number="formState.notificationDuration"
                data-testid="input-notification-duration"
                type="number"
                min="1000"
                step="500"
              />
            </div>

            <div class="setting-row">
              <label for="max-history">Max History Items</label>
              <input
                id="max-history"
                v-model.number="formState.maxNotificationHistory"
                data-testid="input-max-history"
                type="number"
                min="10"
                max="200"
              />
            </div>

            <div class="setting-actions">
              <button
                data-testid="clear-notifications-btn"
                class="action-button"
                @click="notificationStore.clearHistory()"
              >
                Clear Notification History
              </button>
            </div>
          </div>
        </div>

        <!-- Advanced Settings -->
        <div v-if="activeTab === 'advanced'" class="tab-content" data-testid="content-advanced">
          <h3>Advanced Options</h3>

          <div class="setting-group">
            <p class="setting-description">
              Export your settings to backup or transfer to another device. Import settings from a
              previously exported file.
            </p>

            <div class="setting-actions">
              <button
                data-testid="export-settings-btn"
                class="action-button btn"
                @click="exportSettings"
              >
                <Icon type="gear" />
                Export Settings
              </button>

              <button
                data-testid="import-settings-btn"
                class="action-button btn"
                @click="importSettings"
              >
                <Icon type="gear" />
                Import Settings
              </button>
            </div>
          </div>

          <div class="setting-group danger-zone">
            <h4>Danger Zone</h4>
            <p class="setting-description warning">These actions cannot be undone. Be careful!</p>

            <div class="setting-actions">
              <button
                data-testid="reset-ui-btn"
                class="action-button btn danger"
                @click="resetToDefaults"
              >
                Reset All Settings to Defaults
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <footer class="settings-footer">
      <div class="footer-actions">
        <button
          data-testid="save-settings-btn"
          class="action-button btn primary"
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
.settings-panel {
  display: flex;
  flex-direction: column;
  background-color: var(--aw-panel-bg-color);
  border-radius: 8px;
  border: 1px solid var(--aw-panel-border-color);
  overflow: hidden;
  max-width: 800px;
  margin: 0 auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  height: 100%;
}

.settings-header {
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
  padding: 16px 24px;
  border-bottom: 1px solid var(--aw-panel-border-color);
}

.settings-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.settings-header p {
  margin: 6px 0 0;
  opacity: 0.8;
  font-size: 0.9rem;
}

.settings-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.settings-tabs {
  width: 180px;
  background-color: rgba(0, 0, 0, 0.05);
  border-right: 1px solid var(--aw-panel-border-color);
  padding: 16px 0;
  display: flex;
  flex-direction: column;
}

.tab-button {
  display: flex;
  align-items: center;
  padding: 12px 16px;
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

.tab-button:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.tab-button.active {
  background-color: rgba(0, 0, 0, 0.15);
  border-left-color: var(--aw-panel-resize-bg-color);
  font-weight: 500;
}

.tab-button span {
  margin-left: 8px;
}

.settings-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.tab-content {
  max-width: 550px;
}

.tab-content h3 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 1.2rem;
  color: var(--aw-text-color);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--aw-panel-border-color);
}

.setting-group {
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.setting-row:last-child {
  margin-bottom: 0;
}

.setting-description {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 0.9rem;
  opacity: 0.8;
}

.setting-description.warning {
  color: #ff6b6b;
}

/* Controls */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 46px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 24px;
  transition: 0.4s;
}

.toggle-slider:before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: 0.4s;
}

input:checked + .toggle-slider {
  background-color: var(--aw-panel-resize-bg-color);
}

input:checked + .toggle-slider:before {
  transform: translateX(22px);
}

input[type='number'],
select {
  background-color: var(--aw-input-bg-color);
  border: 1px solid var(--aw-panel-border-color);
  color: var(--aw-text-color);
  padding: 6px 10px;
  border-radius: 4px;
  width: 120px;
}

select {
  width: 150px;
}

.size-inputs {
  display: flex;
  gap: 8px;
}

.size-input {
  display: flex;
  align-items: center;
}

.size-input label {
  margin-right: 4px;
  opacity: 0.7;
  font-size: 0.8rem;
}

.size-input input {
  width: 50px;
}

/* Actions */
.setting-actions {
  display: flex;
  justify-content: flex-start;
  gap: 8px;
  margin-top: 16px;
}

.action-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.action-button.primary {
  background-color: var(--aw-button-primary-bg);
  color: var(--aw-button-primary-text);
}

.action-button.primary:hover:not(:disabled) {
  background-color: var(--aw-button-primary-hover-bg);
}

.action-button.danger {
  background-color: var(--aw-button-danger-bg);
  color: var(--aw-button-danger-text);
}

.action-button.danger:hover:not(:disabled) {
  background-color: var(--aw-button-danger-hover-bg);
}

.danger-zone {
  border: 1px solid rgba(255, 0, 0, 0.3);
}

.danger-zone h4 {
  color: #ff6b6b;
  margin-top: 0;
  margin-bottom: 8px;
}

/* Footer */
.settings-footer {
  background-color: rgba(0, 0, 0, 0.05);
  border-top: 1px solid var(--aw-panel-border-color);
  padding: 16px 24px;
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .settings-body {
    flex-direction: column;
  }

  .settings-tabs {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--aw-panel-border-color);
    flex-direction: row;
    overflow-x: auto;
    padding: 0;
  }

  .tab-button {
    flex-direction: column;
    border-left: none;
    border-bottom: 3px solid transparent;
    padding: 12px 8px;
    font-size: 0.8rem;
  }

  .tab-button.active {
    border-left-color: transparent;
    border-bottom-color: var(--aw-panel-resize-bg-color);
  }

  .tab-button span {
    margin-left: 0;
    margin-top: 4px;
  }

  .settings-content {
    padding: 16px;
  }

  .setting-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .setting-row label {
    margin-bottom: 8px;
  }

  input[type='number'],
  select {
    width: 100%;
  }
}
</style>
