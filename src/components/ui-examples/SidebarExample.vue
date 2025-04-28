<script setup lang="ts">
defineProps({
  isDarkMode: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <div class="sidebar-example">
    <h3>Sidebar Example Component</h3>
    <p>A simplified sidebar component to demonstrate the theme and styling.</p>
    <div class="sidebar-content">
      <div class="sidebar-section">
        <h4>Devices</h4>
        <ul class="device-list">
          <li class="device-item connected">
            <span class="device-icon">📷</span>
            <span class="device-name">Main Camera</span>
            <span class="device-status">Connected</span>
          </li>
          <li class="device-item">
            <span class="device-icon">📡</span>
            <span class="device-name">Telescope Mount</span>
            <span class="device-status">Disconnected</span>
          </li>
          <li class="device-item connected">
            <span class="device-icon">🔭</span>
            <span class="device-name">Guide Scope</span>
            <span class="device-status">Connected</span>
          </li>
        </ul>
      </div>
      <div class="sidebar-section">
        <h4>Filters</h4>
        <div class="filter-options">
          <label> <input type="checkbox" checked /> Show Connected </label>
          <label> <input type="checkbox" checked /> Show Disconnected </label>
          <label> <input type="checkbox" checked /> Show Cameras </label>
          <label> <input type="checkbox" checked /> Show Mounts </label>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sidebar-example {
  background-color: var(--aw-panel-bg-color);
  border-radius: 8px;
  border: 1px solid var(--aw-panel-border-color);
  padding: var(--spacing-md);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  color: var(--aw-text-color);
}

h3,
h4,
p {
  margin-top: 0;
  margin-bottom: var(--spacing-md);
  color: var(--aw-text-color);
}

h4 {
  font-size: var(--font-size-base);
  margin-bottom: var(--spacing-sm);
}

.sidebar-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.device-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.device-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-sm);
  background-color: var(--aw-input-bg-color);
  border-radius: 4px;
  border-left: 3px solid var(--aw-panel-border-color);
  color: var(--aw-text-color);
  transition:
    background-color 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease;
}

.device-item.connected {
  border-left-color: var(--aw-success-color);
}

.device-icon {
  margin-right: var(--spacing-sm);
  font-size: var(--font-size-xl);
}

.device-name {
  flex: 1;
  font-weight: var(--font-weight-medium);
  color: var(--aw-text-color);
}

.device-status {
  font-size: var(--font-size-xs);
  padding: 2px 6px;
  border-radius: 10px;
  background-color: rgba(127, 127, 127, 0.15);
  color: var(--aw-text-secondary-color);
}

.device-item.connected .device-status {
  background-color: rgba(76, 175, 80, 0.1);
  color: var(--aw-success-color);
}

.filter-options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.filter-options label {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--aw-text-color);
}

/* Dark mode specific adjustments */
:global(.dark-theme) .device-item {
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-panel-content-color);
}

:global(.dark-theme) .device-name {
  color: var(--aw-panel-content-color);
}

:global(.dark-theme) .device-status {
  background-color: rgba(127, 127, 127, 0.15);
}

:global(.dark-theme) .filter-options label {
  color: var(--aw-panel-content-color);
}
</style>
