<script setup lang="ts">
import { ref } from 'vue'

defineProps({
  isDarkMode: {
    type: Boolean,
    default: false
  }
})

const activeTab = ref('devices')
const isSearching = ref(false)

function startSearch() {
  isSearching.value = true
  setTimeout(() => {
    isSearching.value = false
  }, 2000)
}
</script>

<template>
  <div class="discovery-example">
    <h3>Discovery Panel Example</h3>
    <p>A simplified discovery panel component to demonstrate the theme and styling.</p>

    <div class="discovery-header">
      <div class="tabs">
        <button
          class="tab-button"
          :class="{ active: activeTab === 'devices' }"
          @click="activeTab = 'devices'"
        >
          Devices
        </button>
        <button
          class="tab-button"
          :class="{ active: activeTab === 'servers' }"
          @click="activeTab = 'servers'"
        >
          Servers
        </button>
      </div>

      <div class="search-bar">
        <input type="text" placeholder="Search..." />
        <button class="btn btn-primary" :disabled="isSearching" @click="startSearch">
          {{ isSearching ? 'Searching...' : 'Search' }}
        </button>
      </div>
    </div>

    <div class="discovery-content">
      <div v-if="activeTab === 'devices'" class="device-list">
        <div class="device-card">
          <div class="device-header">
            <span class="device-icon">📷</span>
            <span class="device-name">ZWO ASI2600MC Pro</span>
          </div>
          <div class="device-details">
            <div class="detail-row">
              <span class="detail-label">Type:</span>
              <span class="detail-value">Camera</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Address:</span>
              <span class="detail-value">192.168.1.100</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="detail-value">Ready</span>
            </div>
          </div>
          <button class="btn btn-primary connect-btn">Connect</button>
        </div>

        <div class="device-card">
          <div class="device-header">
            <span class="device-icon">📡</span>
            <span class="device-name">Celestron CGX Mount</span>
          </div>
          <div class="device-details">
            <div class="detail-row">
              <span class="detail-label">Type:</span>
              <span class="detail-value">Mount</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Address:</span>
              <span class="detail-value">192.168.1.101</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="detail-value">Ready</span>
            </div>
          </div>
          <button class="btn btn-primary connect-btn">Connect</button>
        </div>
      </div>

      <div v-else class="server-list">
        <div class="server-card">
          <div class="server-header">
            <span class="server-icon">🖥️</span>
            <span class="server-name">Imaging PC</span>
          </div>
          <div class="server-details">
            <div class="detail-row">
              <span class="detail-label">Address:</span>
              <span class="detail-value">192.168.1.10</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Port:</span>
              <span class="detail-value">8000</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="detail-value">Online</span>
            </div>
          </div>
          <button class="btn btn-secondary">Manage</button>
        </div>
      </div>
    </div>

    <div class="discovery-footer">
      <button class="btn btn-secondary">Add Manual Device</button>
    </div>
  </div>
</template>

<style scoped>
.discovery-example {
  background-color: var(--aw-panel-bg-color);
  border-radius: 8px;
  border: 1px solid var(--aw-panel-border-color);
  padding: var(--spacing-md);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  color: var(--aw-text-color);
}

h3,
p {
  margin-top: 0;
  margin-bottom: var(--spacing-md);
  color: var(--aw-text-color);
}

.discovery-header {
  margin-bottom: var(--spacing-md);
}

.tabs {
  display: flex;
  margin-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--aw-panel-border-color);
}

.tab-button {
  padding: var(--spacing-sm) var(--spacing-md);
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  color: var(--aw-text-color);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-button:hover {
  background-color: rgba(127, 127, 127, 0.1);
}

.tab-button.active {
  border-bottom-color: var(--aw-primary-color);
  color: var(--aw-primary-color);
}

.search-bar {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.search-bar input {
  flex: 1;
  padding: var(--spacing-sm);
  background-color: var(--aw-input-bg-color);
  color: var(--aw-text-color);
  border: 1px solid var(--aw-input-border-color);
}

.discovery-content {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.device-card,
.server-card {
  background-color: var(--aw-panel-bg-color);
  border-radius: 4px;
  padding: var(--spacing-md);
  border: 1px solid var(--aw-panel-border-color);
  display: flex;
  flex-direction: column;
  color: var(--aw-text-color);
  transition:
    background-color 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.device-header,
.server-header {
  display: flex;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.device-icon,
.server-icon {
  font-size: var(--font-size-xl);
  margin-right: var(--spacing-sm);
}

.device-name,
.server-name {
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-lg);
  color: var(--aw-text-color);
}

.device-details,
.server-details {
  flex: 1;
  margin-bottom: var(--spacing-md);
}

.detail-row {
  display: flex;
  margin-bottom: var(--spacing-xs);
}

.detail-label {
  width: 80px;
  font-weight: var(--font-weight-medium);
  color: var(--aw-text-secondary-color);
}

.detail-value {
  flex: 1;
  color: var(--aw-text-color);
}

.connect-btn {
  width: 100%;
}

.discovery-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--aw-panel-border-color);
}

/* Dark mode specific adjustments */
:global(.dark-theme) .device-card,
:global(.dark-theme) .server-card {
  background-color: var(--aw-panel-bg-color);
  border-color: var(--aw-panel-border-color);
}

:global(.dark-theme) .detail-value {
  color: var(--aw-panel-content-color);
}

:global(.dark-theme) .device-name,
:global(.dark-theme) .server-name {
  color: var(--aw-panel-content-color);
}
</style>
