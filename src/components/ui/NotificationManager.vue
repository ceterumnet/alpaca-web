// Status: Good - Core UI Component // This is the notification manager implementation that: // -
Manages all system notifications // - Provides filtering by type and state // - Handles notification
acknowledgment // - Supports notification history // - Implements proper notification lifecycle

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  useNotificationStore,
  type NotificationType,
  type NotificationFilter
} from '@/stores/useNotificationStore'

defineOptions({
  name: 'NotificationManager'
})

const notificationStore = useNotificationStore()

// Filter state
const selectedTypes = ref<NotificationType[]>([])
const readFilter = ref<boolean | null>(null)
const acknowledgedFilter = ref<boolean | null>(null)
const showFilterPanel = ref(false)

// Filter options
const notificationTypes: NotificationType[] = ['success', 'error', 'info', 'warning']

// Apply filters
const filteredNotifications = computed(() => {
  const filter: NotificationFilter = {}

  if (selectedTypes.value.length > 0) {
    filter.types = selectedTypes.value
  }

  if (readFilter.value !== null) {
    filter.readState = readFilter.value
  }

  if (acknowledgedFilter.value !== null) {
    filter.acknowledgedState = acknowledgedFilter.value
  }

  return notificationStore.filterNotifications(filter)
})

// Toggle filter selection
function toggleTypeFilter(type: NotificationType) {
  const index = selectedTypes.value.indexOf(type)
  if (index === -1) {
    selectedTypes.value.push(type)
  } else {
    selectedTypes.value.splice(index, 1)
  }
}

// Clear all filters
function clearFilters() {
  selectedTypes.value = []
  readFilter.value = null
  acknowledgedFilter.value = null
}

// Clear all notifications
function clearAllNotifications() {
  notificationStore.dismissAllNotifications()
  notificationStore.clearHistory()
}

// Acknowledge all notifications
function acknowledgeAllNotifications() {
  notificationStore.acknowledgeAll()
}

// Export notification history
function exportHistory() {
  const dataUri = notificationStore.exportNotificationHistory()
  const link = document.createElement('a')
  link.setAttribute('href', dataUri)
  link.setAttribute(
    'download',
    `notification-history-${new Date().toISOString().split('T')[0]}.json`
  )
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Format timestamp
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString()
}

// Toggle filter panel
function toggleFilterPanel() {
  showFilterPanel.value = !showFilterPanel.value
}
</script>

<template>
  <div class="aw-notification-manager">
    <div class="aw-notification-manager__header">
      <h2 class="aw-notification-manager__title">Notifications</h2>
      <div class="aw-notification-manager__actions">
        <button class="aw-notification-manager__action-btn" title="Filter notifications" @click="toggleFilterPanel">
          <i class="aw-notification-manager__icon aw-notification-manager__icon--filter"></i>
          <span>Filter</span>
        </button>
        <button class="aw-notification-manager__action-btn" title="Acknowledge all" @click="acknowledgeAllNotifications">
          <i class="aw-notification-manager__icon aw-notification-manager__icon--check"></i>
          <span>Acknowledge All</span>
        </button>
        <button class="aw-notification-manager__action-btn" title="Clear all" @click="clearAllNotifications">
          <i class="aw-notification-manager__icon aw-notification-manager__icon--clear"></i>
          <span>Clear All</span>
        </button>
        <button class="aw-notification-manager__action-btn" title="Export history" @click="exportHistory">
          <i class="aw-notification-manager__icon aw-notification-manager__icon--download"></i>
          <span>Export</span>
        </button>
      </div>
    </div>

    <!-- Filter panel -->
    <div v-if="showFilterPanel" class="aw-notification-manager__filter-panel">
      <div class="aw-notification-manager__filter-section">
        <h3 class="aw-notification-manager__filter-title">Type</h3>
        <div class="aw-notification-manager__filter-options">
          <label v-for="type in notificationTypes" :key="type" class="aw-notification-manager__filter-option">
            <input
              type="checkbox"
              :checked="selectedTypes.includes(type)"
              @change="toggleTypeFilter(type)"
            />
            <span 
              class="aw-notification-manager__type-label" 
              :class="`aw-notification-manager__type-label--${type}`"
            >{{ type }}</span>
          </label>
        </div>
      </div>
      <div class="aw-notification-manager__filter-section">
        <h3 class="aw-notification-manager__filter-title">Read Status</h3>
        <div class="aw-notification-manager__filter-options">
          <label class="aw-notification-manager__filter-option">
            <input
              type="radio"
              name="read-status"
              :checked="readFilter === null"
              @change="readFilter = null"
            />
            <span>All</span>
          </label>
          <label class="aw-notification-manager__filter-option">
            <input
              type="radio"
              name="read-status"
              :checked="readFilter === false"
              @change="readFilter = false"
            />
            <span>Unread</span>
          </label>
          <label class="aw-notification-manager__filter-option">
            <input
              type="radio"
              name="read-status"
              :checked="readFilter === true"
              @change="readFilter = true"
            />
            <span>Read</span>
          </label>
        </div>
      </div>
      <div class="aw-notification-manager__filter-section">
        <h3 class="aw-notification-manager__filter-title">Acknowledgement</h3>
        <div class="aw-notification-manager__filter-options">
          <label class="aw-notification-manager__filter-option">
            <input
              type="radio"
              name="acknowledgement"
              :checked="acknowledgedFilter === null"
              @change="acknowledgedFilter = null"
            />
            <span>All</span>
          </label>
          <label class="aw-notification-manager__filter-option">
            <input
              type="radio"
              name="acknowledgement"
              :checked="acknowledgedFilter === false"
              @change="acknowledgedFilter = false"
            />
            <span>Needs Acknowledgement</span>
          </label>
          <label class="aw-notification-manager__filter-option">
            <input
              type="radio"
              name="acknowledgement"
              :checked="acknowledgedFilter === true"
              @change="acknowledgedFilter = true"
            />
            <span>Acknowledged</span>
          </label>
        </div>
      </div>
      <div class="aw-notification-manager__filter-actions">
        <button class="aw-notification-manager__btn aw-notification-manager__btn--secondary" @click="clearFilters">
          Clear Filters
        </button>
        <button class="aw-notification-manager__btn aw-notification-manager__btn--primary" @click="toggleFilterPanel">
          Apply
        </button>
      </div>
    </div>

    <!-- Notification list -->
    <div class="aw-notification-manager__list">
      <div v-if="filteredNotifications.length === 0" class="aw-notification-manager__empty-state">
        No notifications to display
      </div>
      <div
        v-for="notification in filteredNotifications"
        v-else
        :key="notification.id"
        class="aw-notification-manager__item"
        :class="{
          [`aw-notification-manager__item--${notification.type}`]: true,
          'aw-notification-manager__item--read': notification.read
        }"
      >
        <div class="aw-notification-manager__item-content">
          <div 
            class="aw-notification-manager__item-icon" 
            :class="`aw-notification-manager__item-icon--${notification.type}`"
          ></div>
          <div class="aw-notification-manager__item-details">
            <div class="aw-notification-manager__item-message">{{ notification.message }}</div>
            <div class="aw-notification-manager__item-time">{{ formatTime(notification.timestamp) }}</div>
          </div>
          <div class="aw-notification-manager__item-actions">
            <button
              v-if="!notification.acknowledged && notification.requiresAcknowledgment"
              class="aw-notification-manager__btn aw-notification-manager__btn--acknowledge"
              @click="notificationStore.acknowledgeNotification(notification.id)"
            >
              Acknowledge
            </button>
            <button
              v-if="!notification.read"
              class="aw-notification-manager__btn aw-notification-manager__btn--dismiss"
              @click="notificationStore.dismissNotification(notification.id)"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.aw-notification-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-panel-content-color);
  border-radius: var(--aw-border-radius-md);
  overflow: hidden;
}

.aw-notification-manager__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--aw-spacing-md);
  border-bottom: 1px solid var(--aw-panel-border-color);
}

.aw-notification-manager__title {
  margin: 0;
  font-size: 1.2rem;
}

.aw-notification-manager__actions {
  display: flex;
  gap: var(--aw-spacing-sm);
}

.aw-notification-manager__action-btn {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-xs);
  padding: var(--aw-spacing-xs) var(--aw-spacing-sm);
  border-radius: var(--aw-border-radius-sm);
  border: 1px solid var(--aw-panel-border-color);
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
  cursor: pointer;
  font-size: 0.8rem;
  transition: background-color 0.2s ease;
}

.aw-notification-manager__action-btn:hover {
  background-color: var(--aw-panel-resize-bg-color);
}

.aw-notification-manager__filter-panel {
  padding: var(--aw-spacing-md);
  border-bottom: 1px solid var(--aw-panel-border-color);
  background-color: var(--aw-panel-bg-color);
}

.aw-notification-manager__filter-section {
  margin-bottom: var(--aw-spacing-sm);
}

.aw-notification-manager__filter-title {
  margin: 0 0 var(--aw-spacing-sm) 0;
  font-size: 0.9rem;
}

.aw-notification-manager__filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--aw-spacing-sm);
}

.aw-notification-manager__filter-option {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-xs);
  cursor: pointer;
  font-size: 0.8rem;
}

.aw-notification-manager__type-label {
  padding: calc(var(--aw-spacing-xs) / 2) calc(var(--aw-spacing-xs) * 1.5);
  border-radius: var(--aw-border-radius-sm);
  font-size: 0.7rem;
}

.aw-notification-manager__type-label--success {
  background-color: var(--aw-success-muted);
  color: var(--aw-color-success-500);
}

.aw-notification-manager__type-label--error {
  background-color: var(--aw-error-muted);
  color: var(--aw-color-error-500);
}

.aw-notification-manager__type-label--warning {
  background-color: var(--aw-warning-muted);
  color: var(--aw-color-warning-500);
}

.aw-notification-manager__type-label--info {
  background-color: var(--aw-color-primary-100);
  color: var(--aw-color-primary-700);
}

.aw-notification-manager__filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--aw-spacing-sm);
  margin-top: var(--aw-spacing-md);
}

.aw-notification-manager__btn {
  padding: var(--aw-spacing-xs) var(--aw-spacing-sm);
  border-radius: var(--aw-border-radius-sm);
  border: 1px solid var(--aw-panel-border-color);
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s ease;
}

.aw-notification-manager__btn--primary {
  background-color: var(--aw-button-primary-bg);
  color: var(--aw-button-primary-text);
  border-color: var(--aw-button-primary-bg);
}

.aw-notification-manager__btn--primary:hover {
  background-color: var(--aw-button-primary-hover-bg);
  border-color: var(--aw-button-primary-hover-bg);
}

.aw-notification-manager__btn--secondary {
  background-color: transparent;
  color: var(--aw-panel-content-color);
}

.aw-notification-manager__btn--secondary:hover {
  background-color: var(--aw-panel-hover-bg-color);
}

.aw-notification-manager__list {
  flex: 1;
  overflow-y: auto;
  padding: var(--aw-spacing-md);
}

.aw-notification-manager__empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100px;
  color: var(--aw-panel-content-secondary-color);
  font-style: italic;
}

.aw-notification-manager__item {
  margin-bottom: var(--aw-spacing-sm);
  border-radius: var(--aw-border-radius-sm);
  border: 1px solid var(--aw-panel-border-color);
  overflow: hidden;
}

.aw-notification-manager__item--read {
  opacity: 0.7;
}

.aw-notification-manager__item--success {
  border-left: 4px solid var(--aw-color-success-500);
}

.aw-notification-manager__item--error {
  border-left: 4px solid var(--aw-color-error-500);
}

.aw-notification-manager__item--warning {
  border-left: 4px solid var(--aw-color-warning-500);
}

.aw-notification-manager__item--info {
  border-left: 4px solid var(--aw-color-primary-500);
}

.aw-notification-manager__item-content {
  display: flex;
  padding: var(--aw-spacing-sm);
}

.aw-notification-manager__item-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  margin-right: var(--aw-spacing-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.aw-notification-manager__item-icon--success::before {
  content: '✓';
  color: var(--aw-color-success-500);
}

.aw-notification-manager__item-icon--error::before {
  content: '✗';
  color: var(--aw-color-error-500);
}

.aw-notification-manager__item-icon--warning::before {
  content: '!';
  color: var(--aw-color-warning-500);
}

.aw-notification-manager__item-icon--info::before {
  content: 'i';
  color: var(--aw-color-primary-500);
}

.aw-notification-manager__item-details {
  flex: 1;
}

.aw-notification-manager__item-message {
  margin-bottom: var(--aw-spacing-xs);
}

.aw-notification-manager__item-time {
  font-size: 0.8rem;
  color: var(--aw-panel-content-secondary-color);
}

.aw-notification-manager__item-actions {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-sm);
}

.aw-notification-manager__btn--acknowledge {
  color: var(--aw-color-primary-500);
  background-color: transparent;
}

.aw-notification-manager__btn--acknowledge:hover {
  background-color: var(--aw-color-primary-100);
}

.aw-notification-manager__btn--dismiss {
  color: var(--aw-panel-content-color);
  background-color: transparent;
}

.aw-notification-manager__btn--dismiss:hover {
  background-color: var(--aw-panel-hover-bg-color);
}

/* Icons */
.aw-notification-manager__icon--filter::before {
  content: '🔍';
}

.aw-notification-manager__icon--check::before {
  content: '✓';
}

.aw-notification-manager__icon--clear::before {
  content: '🗑️';
}

.aw-notification-manager__icon--download::before {
  content: '⬇️';
}
</style>
