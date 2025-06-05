<template>
  <div class="simplified-panel simplified-filterwheel-panel">
    <div class="panel-content">
      <div v-if="!currentDevice" class="connection-notice">
        <div class="connection-message">No filter wheel selected or available</div>
      </div>
      <div v-else-if="!props.isConnected" class="connection-notice">
        <div class="connection-message">Filter Wheel ({{ currentDevice.name }}) not connected.</div>
        <div class="panel-tip">Use the connect button in the panel header.</div>
      </div>
      <template v-else>
        <!-- Current Position -->
        <div class="panel-section">
          <h3>Current Filter</h3>
          <div class="current-filter-display">
            <span class="label">Position:</span>
            <span class="value">{{ currentPositionDisplay }}</span>
            <span class="label">Name:</span>
            <span class="value">{{ currentFilterNameDisplay }}</span>
          </div>
        </div>

        <!-- Filter Selection -->
        <div class="panel-section">
          <h3>Select Filter</h3>
          <div v-if="filterNamesArray.length > 0" class="filter-selection">
            <select v-model="selectedFilterPosition" @change="selectFilter">
              <option v-for="(name, index) in filterNamesArray" :key="index" :value="index">
                {{ index }}: {{ name }} (Offset: {{ focusOffsetsArray[index] !== undefined ? focusOffsetsArray[index] : 'N/A' }})
              </option>
            </select>
          </div>
          <p v-else>No filter names loaded. Cannot select filter.</p>
        </div>

        <!-- Filter Details & Edit -->
        <div class="panel-section">
          <h3>Filter Details</h3>
          <div v-if="filterNamesArray.length > 0" class="filter-details-grid">
            <div class="grid-header">
              <span class="grid-cell">#</span>
              <span class="grid-cell">Name</span>
              <span class="grid-cell">Offset</span>
            </div>
            <div v-for="(name, index) in filterNamesArray" :key="index" class="grid-row">
              <span class="grid-cell">{{ index }}</span>
              <span class="grid-cell">{{ name }}</span>
              <span class="grid-cell">{{ focusOffsetsArray[index] !== undefined ? focusOffsetsArray[index] : 'N/A' }}</span>
            </div>
          </div>
          <p v-else>No filters to display.</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import log from '@/plugins/logger'
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import type { FilterWheelDevice } from '@/types/device.types'

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  isConnected: {
    type: Boolean,
    required: true
  }
})

const store = useUnifiedStore()

const currentDevice = computed(() => {
  const device = store.getDeviceById(props.deviceId) as FilterWheelDevice
  return device
})

// Local state for UI interaction
const editableFilterNames = ref<string[]>([])
const selectedFilterPosition = ref<number>(0) // Default selection

// Computed properties to get data from the store
const currentPosition = computed(() => {
  const pos = (currentDevice.value?.position as number | undefined) ?? -1
  return pos
})

const filterNamesArray = computed(() => {
  const names = (currentDevice.value?.filterNames as string[] | undefined) || []
  return names
})

const focusOffsetsArray = computed(() => {
  return (currentDevice.value?.focusOffsets as number[] | undefined) || []
})

const currentPositionDisplay = computed(() => {
  return currentPosition.value === -1 ? 'Unknown' : currentPosition.value
})

const currentFilterNameDisplay = computed(() => {
  if (currentPosition.value >= 0 && currentPosition.value < filterNamesArray.value.length) {
    return filterNamesArray.value[currentPosition.value]
  }
  return 'Unknown'
})

// Initialize editable names and selected position when filter names change from store
watch(
  filterNamesArray,
  (newNames) => {
    editableFilterNames.value = [...newNames]
    // also update selectedFilterPosition if currentPosition is valid
    if (currentPosition.value !== -1 && currentPosition.value < newNames.length) {
      selectedFilterPosition.value = currentPosition.value
    }
  },
  { immediate: true, deep: true }
)

// Update selectedFilterPosition when currentPosition from store changes (e.g. due to polling)
watch(currentPosition, (newPos) => {
  if (newPos !== -1 && newPos < filterNamesArray.value.length) {
    selectedFilterPosition.value = newPos
  }
})

const selectFilter = async () => {
  if (props.deviceId && selectedFilterPosition.value !== null) {
    try {
      // Call store action
      await store.setFilterWheelPosition(props.deviceId, selectedFilterPosition.value)
      // The store action will update fw_currentPosition, and computed props will react.
    } catch (error) {
      log.error({ deviceIds: [props.deviceId] }, `Error setting filter position via store to ${selectedFilterPosition.value}:`, error)
      // Optionally, revert selection if store action failed and didn't update position
      // This depends on how store handles errors and updates state on failure.
      // For now, assume store handles state consistency.
    }
  }
}

// New combined watcher for deviceId and isConnected to manage polling and data fetching
watch(
  [() => props.deviceId, () => props.isConnected],
  ([newDeviceId, newIsConnected], [oldDeviceId, oldIsConnected]) => {
    // Stop polling for the old device if it changed and was connected
    if (oldDeviceId && oldDeviceId !== newDeviceId && oldIsConnected) {
      store.stopFilterWheelPolling(oldDeviceId)
    }

    if (newDeviceId) {
      if (newIsConnected) {
        // Device is present and connected
        store.fetchFilterWheelDetails(newDeviceId)
        store.startFilterWheelPolling(newDeviceId)
      } else {
        // Device is present but not connected
        // Stop polling if it was previously connected (oldIsConnected would be true)
        if (oldIsConnected) {
          store.stopFilterWheelPolling(newDeviceId)
        }
      }
    } else if (oldDeviceId && oldIsConnected) {
      // No new deviceId, but there was an old one that was connected
      store.stopFilterWheelPolling(oldDeviceId)
    }
  },
  { immediate: true, deep: true } // deep: true might not be necessary here but immediate is key
)

onBeforeUnmount(() => {
  if (props.deviceId && props.isConnected) {
    store.stopFilterWheelPolling(props.deviceId)
  }
})

// onUnmounted: Polling is managed by the store, so less cleanup here unless specific listeners were added.
</script>

<style scoped>
.simplified-panel {
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-text-color);
  border-radius: var(--aw-border-radius);
  border: 1px solid var(--aw-panel-border-color);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-content {
  overflow-y: auto;
  flex: 1;
  padding: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
}

.panel-section {
  margin-bottom: calc(var(--aw-spacing-md) + var(--aw-spacing-xs));
  background-color: var(--aw-panel-content-bg-color);
  border-radius: calc(var(--aw-spacing-xs) * 1.5);
  padding: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
}

.panel-section h3 {
  margin-top: 0;
  margin-bottom: calc(var(--aw-spacing-sm));
  font-size: var(--aw-font-size-base);
  border-bottom: 1px solid var(--aw-panel-border-color);
  padding-bottom: calc(var(--aw-spacing-xs) * 1.5);
}

.connection-notice,
.loading-notice {
  /* loading-notice might be removed if not used */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100px;
  padding: var(--aw-spacing-md);
  color: var(--aw-text-secondary-color);
}

.current-filter-display {
  display: flex;
  gap: var(--aw-spacing-md);
  align-items: baseline;
  font-size: 1rem;
}

.current-filter-display .label {
  color: var(--aw-text-secondary-color);
  font-size: 0.9rem;
}

.current-filter-display .value {
  font-weight: var(--aw-font-weight-medium);
}

.filter-selection select {
  width: 100%;
  padding: var(--aw-spacing-sm);
  background-color: var(--aw-input-bg-color, var(--aw-panel-bg-color));
  color: var(--aw-text-color);
  border: 1px solid var(--aw-input-border-color, var(--aw-panel-border-color));
  border-radius: var(--aw-border-radius-sm);
}

.filter-details-grid {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--aw-spacing-xs) var(--aw-spacing-md);
  align-items: center;
  background-color: var(--aw-panel-content-bg-color);
  border-radius: var(--aw-border-radius-sm);
  border: 1px solid var(--aw-panel-border-color);
  padding: var(--aw-spacing-sm);
}

.grid-cell {
  padding: var(--aw-spacing-xs) 0;
  font-size: 0.9rem;
}

.grid-cell:first-child {
  color: var(--aw-text-secondary-color);
  font-variant-numeric: tabular-nums;
}

.grid-cell:last-child {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.grid-header {
  display: contents;
  font-weight: var(--aw-font-weight-bold);
  color: var(--aw-text-secondary-color);
  font-size: 0.9rem;
  padding-bottom: var(--aw-spacing-xs);
  border-bottom: 1px solid var(--aw-panel-border-color);
}

.grid-header > .grid-cell {
  padding-bottom: var(--aw-spacing-xs);
}

.grid-row {
  display: contents;
}

.name-input {
  padding: var(--aw-spacing-xs);
  background-color: var(--aw-input-bg-color, var(--aw-panel-bg-color));
  color: var(--aw-text-color);
  border: 1px solid var(--aw-input-border-color, var(--aw-panel-border-color));
  border-radius: var(--aw-border-radius-sm);
  width: 100%; /* Take available space */
}

.action-button-small {
  padding: calc(var(--aw-spacing-xs) / 2) var(--aw-spacing-sm);
  background-color: var(--aw-button-secondary-bg-color, var(--aw-primary-color-variant));
  color: var(--aw-button-secondary-text-color, var(--aw-on-primary-variant));
  border: 1px solid var(--aw-button-secondary-border-color, var(--aw-primary-color-variant));
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
  font-size: 0.8rem;
}

.action-button-small:hover {
  background-color: var(--aw-button-secondary-hover-bg-color, var(--aw-primary-hover-color));
}

.action-button-small:disabled {
  background-color: var(--aw-color-neutral-300);
  border-color: var(--aw-color-neutral-300);
  cursor: not-allowed;
  opacity: 0.7;
}
</style>
