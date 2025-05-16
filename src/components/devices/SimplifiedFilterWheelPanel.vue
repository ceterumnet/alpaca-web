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
      <template v-else-if="isLoading">
        <div class="loading-notice">
          <p>Loading filter wheel details...</p>
        </div>
      </template>
      <template v-else>
        <!-- Current Position -->
        <div class="panel-section">
          <h3>Current Filter</h3>
          <div class="current-filter-display">
            <span class="label">Position:</span>
            <span class="value">{{ currentPosition === -1 ? 'Unknown' : currentPosition }}</span>
            <span class="label">Name:</span>
            <span class="value">{{ currentFilterName }}</span>
          </div>
        </div>

        <!-- Filter Selection -->
        <div class="panel-section">
          <h3>Select Filter</h3>
          <div v-if="filterNames.length > 0" class="filter-selection">
            <select v-model="selectedFilterPosition" @change="selectFilter">
              <option v-for="(name, index) in filterNames" :key="index" :value="index">
                {{ index }}: {{ name }} (Offset: {{ focusOffsets[index] !== undefined ? focusOffsets[index] : 'N/A' }})
              </option>
            </select>
          </div>
          <p v-else>No filter names loaded. Cannot select filter.</p>
        </div>

        <!-- Filter Details & Edit -->
        <div class="panel-section">
          <h3>Filter Details & Edit Names</h3>
          <div v-if="filterNames.length > 0" class="filter-details-grid">
            <div class="grid-header">
              <span>#</span>
              <span>Name (Editable)</span>
              <span>Offset</span>
              <span>Action</span>
            </div>
            <div v-for="(name, index) in filterNames" :key="index" class="grid-row">
              <span>{{ index }}</span>
              <input v-model="editableFilterNames[index]" type="text" class="name-input" />
              <span>{{ focusOffsets[index] !== undefined ? focusOffsets[index] : 'N/A' }}</span>
              <button 
                :disabled="editableFilterNames[index] === filterNames[index]" 
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { callAlpacaMethod, getAlpacaProperties } from '@/utils/alpacaPropertyAccess'

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
const isLoading = ref(true)

const currentDevice = computed(() => {
  return store.getDeviceById(props.deviceId)
})

// FilterWheel state refs
const currentPosition = ref<number>(-1) // -1 for unknown
const filterNames = ref<string[]>([])
const focusOffsets = ref<number[]>([])
const editableFilterNames = ref<string[]>([])

// Selection ref
const selectedFilterPosition = ref<number>(0)

const currentFilterName = computed(() => {
  if (currentPosition.value >= 0 && currentPosition.value < filterNames.value.length) {
    return filterNames.value[currentPosition.value]
  }
  return 'Unknown'
})

const resetFilterWheelState = () => {
  currentPosition.value = -1
  filterNames.value = []
  focusOffsets.value = []
  editableFilterNames.value = []
  selectedFilterPosition.value = 0
}

const fetchFilterWheelDetails = async () => {
  if (!props.isConnected || !props.deviceId) {
    resetFilterWheelState()
    isLoading.value = false
    return
  }
  isLoading.value = true
  try {
    const properties = await getAlpacaProperties(props.deviceId, ['position', 'names', 'focusoffsets'])
    
    currentPosition.value = properties.position as number ?? -1
    filterNames.value = Array.isArray(properties.names) ? properties.names as string[] : []
    focusOffsets.value = Array.isArray(properties.focusoffsets) ? properties.focusoffsets as number[] : []
    
    editableFilterNames.value = [...filterNames.value] // Initialize editable names

    if (currentPosition.value !== -1) {
      selectedFilterPosition.value = currentPosition.value
    }

  } catch (error) {
    console.error('Error fetching filter wheel details:', error)
    resetFilterWheelState()
  }
  isLoading.value = false
}

const selectFilter = async () => {
  if (!props.deviceId || selectedFilterPosition.value === null) return
  try {
    await callAlpacaMethod(props.deviceId, 'setPosition', { Position: selectedFilterPosition.value })
    // Fetch new position to confirm, or wait for poll
    const newPos = await callAlpacaMethod(props.deviceId, 'getPosition') as number
    currentPosition.value = newPos
  } catch (error) {
    console.error(`Error setting filter position to ${selectedFilterPosition.value}:`, error)
    // Revert selection on error if desired, or rely on next poll to correct UI
    if (currentPosition.value !== -1) selectedFilterPosition.value = currentPosition.value;
  }
}

const updateFilterName = async (filterIndex: number) => {
  if (!props.deviceId || !editableFilterNames.value[filterIndex]) return
  const newName = editableFilterNames.value[filterIndex]
  try {
    // Assumes FilterWheelClient.setFilterName (PUT to /name with FilterNumber, FilterName)
    await callAlpacaMethod(props.deviceId, 'setFilterName', { filterNumber: filterIndex, filterName: newName })
    // Refresh names
    filterNames.value[filterIndex] = newName
    // Note: This directly updates the local copy. A full re-fetch might be safer:
    // await fetchFilterWheelDetails(); 
  } catch (error) {
    console.error(`Error updating name for filter ${filterIndex}:`, error)
    // Revert editable name if API call fails
    editableFilterNames.value[filterIndex] = filterNames.value[filterIndex] || '';
  }
}

let pollTimer: number | undefined

const pollFilterWheelStatus = async () => {
  if (!props.isConnected || !props.deviceId) return
  try {
    const pos = await callAlpacaMethod(props.deviceId, 'getPosition') as number | null
    if (pos !== null && pos !== currentPosition.value) {
      currentPosition.value = pos
      if (pos !== -1) {
        selectedFilterPosition.value = pos
      }
    }
    // Optionally re-fetch names/offsets if they can change, though less common for polling
  } catch (error) {
    console.error('Error polling filter wheel status:', error)
  }
}

onMounted(async () => {
  await fetchFilterWheelDetails()
  if (props.isConnected && props.deviceId && !pollTimer) {
    pollTimer = window.setInterval(pollFilterWheelStatus, 3000) // Poll every 3 seconds
  }
})

watch(() => props.isConnected, async (newIsConnected) => {
  await fetchFilterWheelDetails()
  if (newIsConnected && props.deviceId) {
    if (!pollTimer) {
      pollTimer = window.setInterval(pollFilterWheelStatus, 3000)
    }
  } else {
    if (pollTimer) {
      window.clearInterval(pollTimer)
      pollTimer = undefined
    }
  }
})

watch(() => props.deviceId, async (newDeviceId, oldDeviceId) => {
  if (newDeviceId !== oldDeviceId) {
    await fetchFilterWheelDetails()
    if (props.isConnected && props.deviceId) {
      if (!pollTimer) {
        pollTimer = window.setInterval(pollFilterWheelStatus, 3000)
      }
    } else {
      if (pollTimer) {
        clearInterval(pollTimer)
        pollTimer = undefined
      }
    }
  }
}, { immediate: true })

onUnmounted(() => {
  if (pollTimer) {
    window.clearInterval(pollTimer)
  }
})

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

.connection-notice, .loading-notice {
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