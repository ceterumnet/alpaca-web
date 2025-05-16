<template>
  <div class="simplified-panel simplified-switch-panel">
    <div class="panel-content">
      <div v-if="!currentDevice" class="connection-notice">
        <div class="connection-message">No switch device selected or available</div>
      </div>
      <div v-else-if="!props.isConnected" class="connection-notice">
        <div class="connection-message">Switch ({{ currentDevice.name }}) not connected.</div>
        <div class="panel-tip">Use the connect button in the panel header.</div>
      </div>

      <template v-else-if="isLoading">
        <div class="loading-notice">
          <p>Loading switch details...</p>
        </div>
      </template>

      <template v-else-if="switches.length === 0">
         <div class="panel-section">
            <h3>Switches</h3>
            <p>No switches available for this device.</p>
        </div>
      </template>

      <template v-else>
        <div v-for="(sw, index) in switches" :key="index" class="panel-section switch-item">
          <h3>{{ sw.name }}</h3>
          <p class="switch-description">{{ sw.description }}</p>
          
          <div class="switch-controls">
            <template v-if="isBooleanSwitch(sw)">
              <label class="toggle">
                <input type="checkbox" :checked="Boolean(sw.value)" @change="toggleBooleanSwitch(index, ($event.target as HTMLInputElement).checked)">
                <span class="slider"></span>
              </label>
              <span class="value-label">{{ Boolean(sw.value) ? 'ON' : 'OFF' }}</span>
            </template>
            <template v-else>
              <input 
                type="number" 
                :value="sw.value" 
                :min="sw.min"
                :max="sw.max"
                :step="sw.step"
                class="numeric-input"
                @change="setNumericSwitchValue(index, parseFloat(($event.target as HTMLInputElement).value))"
              />
              <span class="value-label">Current: {{ sw.value }}</span>
              <span v-if="sw.min !== undefined && sw.max !== undefined" class="range-label">
                (Range: {{ sw.min }} to {{ sw.max }}, Step: {{ sw.step }})
              </span>
            </template>
          </div>

          <!-- Allow editing switch name -->
          <div class="switch-name-edit">
            <input type="text" :value="editableSwitchNames[index]" placeholder="Edit name" @input="editableSwitchNames[index] = ($event.target as HTMLInputElement).value" />
            <button :disabled="editableSwitchNames[index] === sw.name" @click="updateSwitchName(index)">Save Name</button>
          </div>

        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { callAlpacaMethod } from '@/utils/alpacaPropertyAccess'
import type { ISwitchDetail } from '@/api/alpaca/switch-client' // Import the interface

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

const switches = ref<ISwitchDetail[]>([])
const editableSwitchNames = ref<string[]>([])

const isBooleanSwitch = (sw: ISwitchDetail): boolean => {
  // Heuristic: if min=0, max=1, step=1, treat as boolean for setSwitch method.
  // Alpaca's getswitchvalue always returns a number (double).
  return sw.min === 0 && sw.max === 1 && sw.step === 1;
}

const fetchSwitchDetails = async () => {
  if (!props.isConnected || !props.deviceId) {
    switches.value = []
    editableSwitchNames.value = []
    isLoading.value = false
    return
  }
  isLoading.value = true
  try {
    // `getAllSwitchDetails` is a custom method in our SwitchClient
    const details = await callAlpacaMethod(props.deviceId, 'getAllSwitchDetails') as ISwitchDetail[]
    switches.value = details
    editableSwitchNames.value = details.map(sw => sw.name) // Initialize editable names
  } catch (error) {
    console.error('Error fetching switch details:', error)
    switches.value = []
    editableSwitchNames.value = []
  }
  isLoading.value = false
}

const toggleBooleanSwitch = async (switchIndex: number, newState: boolean) => {
  if (!props.deviceId) return
  try {
    await callAlpacaMethod(props.deviceId, 'setSwitch', { Id: switchIndex, State: newState })
    // Refresh only the affected switch value for responsiveness
    const newValue = await callAlpacaMethod(props.deviceId, 'getSwitchValue', { Id: switchIndex }) as number;
    if (switches.value[switchIndex]) {
        switches.value[switchIndex].value = newValue;
    }
  } catch (error) {
    console.error(`Error toggling switch ${switchIndex}:`, error)
    // Optionally re-fetch all if single update fails or state is complex
    // await fetchSwitchDetails() 
  }
}

const setNumericSwitchValue = async (switchIndex: number, newValue: number) => {
  if (!props.deviceId) return
  try {
    await callAlpacaMethod(props.deviceId, 'setSwitchValue', { Id: switchIndex, Value: newValue })
    // Refresh the affected switch value
    const updatedValue = await callAlpacaMethod(props.deviceId, 'getSwitchValue', { Id: switchIndex }) as number;
     if (switches.value[switchIndex]) {
        switches.value[switchIndex].value = updatedValue;
    }
  } catch (error) {
    console.error(`Error setting value for switch ${switchIndex}:`, error)
  }
}

const updateSwitchName = async (switchIndex: number) => {
  if (!props.deviceId || !editableSwitchNames.value[switchIndex]) return;
  const newName = editableSwitchNames.value[switchIndex];
  try {
    await callAlpacaMethod(props.deviceId, 'setSwitchName', { Id: switchIndex, Name: newName });
    // Refresh the switch name locally after successful update
    if (switches.value[switchIndex]) {
        switches.value[switchIndex].name = newName;
    }
  } catch (error) {
    console.error(`Error updating name for switch ${switchIndex}:`, error);
    // Revert editable name if API call fails
    editableSwitchNames.value[switchIndex] = switches.value[switchIndex]?.name || '';
  }
}

let pollTimer: number | undefined

const pollSwitchValues = async () => {
  if (!props.isConnected || !props.deviceId || switches.value.length === 0) return

  try {
    for (let i = 0; i < switches.value.length; i++) {
      const currentValue = await callAlpacaMethod(props.deviceId, 'getSwitchValue', { Id: i }) as number
      if (switches.value[i] && switches.value[i].value !== currentValue) {
        switches.value[i].value = currentValue
      }
      // Optionally update names too, if they can change dynamically (less common)
      // const currentName = await callAlpacaMethod(props.deviceId, 'getSwitchName', { Id: i }) as string;
      // if (switches.value[i].name !== currentName) {
      //   switches.value[i].name = currentName;
      //   editableSwitchNames.value[i] = currentName;
      // }
    }
  } catch (error) {
    console.error('Error polling switch values:', error)
  }
}

onMounted(async () => {
  await fetchSwitchDetails() 
  if (props.isConnected && props.deviceId && !pollTimer) {
    pollTimer = window.setInterval(pollSwitchValues, 5000) // Poll every 5 seconds
  }
})

watch(() => props.isConnected, async (newIsConnected) => {
  await fetchSwitchDetails() // Refetch all details on connection change
  if (newIsConnected && props.deviceId) {
    if (!pollTimer) {
      pollTimer = window.setInterval(pollSwitchValues, 5000)
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
    await fetchSwitchDetails() // Refetch all details on device change
     if (props.isConnected && props.deviceId) {
        if (!pollTimer) {
            pollTimer = window.setInterval(pollSwitchValues, 5000);
        }
    } else {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = undefined;
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
  background-color: var(--aw-panel-content-bg-color);
  border-radius: calc(var(--aw-spacing-xs) * 1.5);
  margin-bottom: calc(var(--aw-spacing-md) + var(--aw-spacing-xs));
  padding: var(--aw-spacing-md);
  color: var(--aw-text-secondary-color);
}

.connection-message {
  font-size: 1.1rem;
}

.panel-tip {
  font-size: 0.8rem;
}

.switch-item {
  /* styles for individual switch sections if needed */
}

.switch-description {
  font-size: 0.8rem;
  color: var(--aw-text-secondary-color);
  margin-bottom: var(--aw-spacing-sm);
}

.switch-controls {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-sm);
  margin-bottom: var(--aw-spacing-sm);
}

.numeric-input {
  padding: var(--aw-spacing-xs);
  background-color: var(--aw-input-bg-color, var(--aw-panel-bg-color));
  color: var(--aw-text-color);
  border: 1px solid var(--aw-input-border-color, var(--aw-panel-border-color));
  border-radius: var(--aw-border-radius-sm);
  width: 80px;
}

.value-label, .range-label {
  font-size: 0.9rem;
}

.range-label {
  color: var(--aw-text-secondary-color);
  font-size: 0.8rem;
}

.switch-name-edit {
  display: flex;
  gap: var(--aw-spacing-sm);
  align-items: center;
  margin-top: var(--aw-spacing-xs);
}

.switch-name-edit input {
  flex-grow: 1;
  padding: var(--aw-spacing-xs);
  background-color: var(--aw-input-bg-color, var(--aw-panel-bg-color));
  color: var(--aw-text-color);
  border: 1px solid var(--aw-input-border-color, var(--aw-panel-border-color));
  border-radius: var(--aw-border-radius-sm);
}

.switch-name-edit button {
  padding: var(--aw-spacing-xs) var(--aw-spacing-sm);
  background-color: var(--aw-button-secondary-bg-color, var(--aw-primary-color));
  color: var(--aw-button-secondary-text-color, var(--aw-button-primary-text));
  border: 1px solid var(--aw-button-secondary-border-color, var(--aw-primary-color));
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
}

.switch-name-edit button:hover {
  background-color: var(--aw-button-secondary-hover-bg-color, var(--aw-primary-hover-color));
}

.switch-name-edit button:disabled {
  background-color: var(--aw-color-neutral-300);
  border-color: var(--aw-color-neutral-300);
  cursor: not-allowed;
  opacity: 0.7;
}

/* Toggle switch styles from other panels */
.toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--aw-panel-bg-color);
  border: 1px solid var(--aw-panel-border-color);
  transition: .4s;
  border-radius: var(--aw-spacing-lg);
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: var(--aw-text-secondary-color);
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--aw-primary-color);
}

input:checked + .slider:before {
  transform: translateX(calc(var(--aw-spacing-lg) - var(--aw-spacing-xs)));
  background-color: var(--aw-button-primary-text);
}
</style> 