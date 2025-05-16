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
          <h3>Filter Details & Edit Names</h3>
          <div v-if="filterNamesArray.length > 0" class="filter-details-grid">
            <div class="grid-header">
              <span>#</span>
              <span>Name (Editable)</span>
              <span>Offset</span>
              <span>Action</span>
            </div>
            <div v-for="(name, index) in filterNamesArray" :key="index" class="grid-row">
              <span>{{ index }}</span>
              <input v-model="editableFilterNames[index]" type="text" class="name-input" />
              <span>{{ focusOffsetsArray[index] !== undefined ? focusOffsetsArray[index] : 'N/A' }}</span>
              <button 
                :disabled="!editableFilterNames[index] || editableFilterNames[index] === filterNamesArray[index]" 
                class="action-button-small"
                @click="updateFilterName(index)"
              >Save</button>
            </div>
          </div>
          <p v-else>No filters to display.</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'

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
  return store.getDeviceById(props.deviceId)
})

// Local state for UI interaction
const editableFilterNames = ref<string[]>([])
const selectedFilterPosition = ref<number>(0) // Default selection

// Computed properties to get data from the store
const currentPosition = computed(() => {
  return currentDevice.value?.properties?.fw_currentPosition as number | undefined ?? -1;
});

const filterNamesArray = computed(() => {
  return (currentDevice.value?.properties?.fw_filterNames as string[] | undefined) || [];
});

const focusOffsetsArray = computed(() => {
  return (currentDevice.value?.properties?.fw_focusOffsets as number[] | undefined) || [];
});

const currentPositionDisplay = computed(() => {
  return currentPosition.value === -1 ? 'Unknown' : currentPosition.value;
});

const currentFilterNameDisplay = computed(() => {
  if (currentPosition.value >= 0 && currentPosition.value < filterNamesArray.value.length) {
    return filterNamesArray.value[currentPosition.value];
  }
  return 'Unknown';
});

// Initialize editable names and selected position when filter names change from store
watch(filterNamesArray, (newNames) => {
  editableFilterNames.value = [...newNames];
  // also update selectedFilterPosition if currentPosition is valid
  if (currentPosition.value !== -1 && currentPosition.value < newNames.length) {
    selectedFilterPosition.value = currentPosition.value;
  }
}, { immediate: true, deep: true });

// Update selectedFilterPosition when currentPosition from store changes (e.g. due to polling)
watch(currentPosition, (newPos) => {
  if (newPos !== -1 && newPos < filterNamesArray.value.length) {
    selectedFilterPosition.value = newPos;
  }
});

const selectFilter = async () => {
  if (props.deviceId && selectedFilterPosition.value !== null) {
    try {
      // Call store action
      await store.setFilterWheelPosition(props.deviceId, selectedFilterPosition.value)
      // The store action will update fw_currentPosition, and computed props will react.
    } catch (error) {
      console.error(`Error setting filter position via store to ${selectedFilterPosition.value}:`, error)
      // Optionally, revert selection if store action failed and didn't update position
      // This depends on how store handles errors and updates state on failure.
      // For now, assume store handles state consistency.
    }
  }
}

const updateFilterName = async (filterIndex: number) => {
  if (props.deviceId && editableFilterNames.value[filterIndex]) {
    const newName = editableFilterNames.value[filterIndex];
    try {
      // Call store action
      await store.setFilterWheelName(props.deviceId, filterIndex, newName);
      // Store action should refresh fw_filterNames, triggering reactive updates.
    } catch (error) {
      console.error(`Error updating name for filter ${filterIndex} via store:`, error)
      // Revert editable name if API call fails and store doesn't handle it
      // This part might need adjustment based on store error handling behavior
      if (filterNamesArray.value[filterIndex]) {
         editableFilterNames.value[filterIndex] = filterNamesArray.value[filterIndex];
      }
    }
  }
}

// Lifecycle hooks for store-based polling/setup trigger if needed
onMounted(() => {
  if (props.deviceId && props.isConnected) {
    // Initial fetch if not already handled by connect logic in store
    // The store's handleFilterWheelConnected should ideally cover this.
    // store.fetchFilterWheelDetails(props.deviceId);
    // store.startFilterWheelPolling(props.deviceId); // Polling now managed by store on connect
  }
});

// Watch for connection status changes to trigger store actions if necessary
// This logic might be redundant if coreActions already calls handleFilterWheelConnected/Disconnected
watch(() => props.isConnected, (newIsConnected) => {
  if (props.deviceId) {
    if (newIsConnected) {
      // store.handleFilterWheelConnected(props.deviceId); // Should be called by core store logic
      // Ensure data is fresh upon reconnect if polling didn't catch up or for initial load
      store.fetchFilterWheelDetails(props.deviceId);
    } else {
      // store.handleFilterWheelDisconnected(props.deviceId); // Should be called by core store logic
    }
  }
});

watch(() => props.deviceId, (newDeviceId) => {
  if (newDeviceId && props.isConnected) {
      // store.handleFilterWheelConnected(newDeviceId); // Called by core store logic
      // Fetch details for the new device
      store.fetchFilterWheelDetails(newDeviceId);
  }
}, { immediate: true });

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

.connection-notice, .loading-notice { /* loading-notice might be removed if not used */
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
.current-filter-display .label { color: var(--aw-text-secondary-color); font-size: 0.9rem; }
.current-filter-display .value { font-weight: var(--aw-font-weight-medium); }

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
  grid-template-columns: auto 1fr auto auto;
  gap: var(--aw-spacing-sm) var(--aw-spacing-md);
  align-items: center;
}

.grid-header {
  display: contents; /* Allows children to participate in grid layout */
  font-weight: var(--aw-font-weight-bold);
  color: var(--aw-text-secondary-color);
  font-size: 0.8rem;
  padding-bottom: var(--aw-spacing-xs);
  border-bottom: 1px solid var(--aw-panel-border-color);
}

.grid-header > span {
   padding-bottom: var(--aw-spacing-xs); /* if border is on parent */
}

.grid-row {
  display: contents; /* Allows children to participate in grid layout */
}

.grid-row > span, .grid-row > input {
  padding: var(--aw-spacing-xs) 0;
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
  padding: calc(var(--aw-spacing-xs)/2) var(--aw-spacing-sm);
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