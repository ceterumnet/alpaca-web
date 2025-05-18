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

      <template v-else-if="!storedSwitches || storedSwitches.length === 0">
         <div class="panel-section">
            <h3>Switches</h3>
            <p>No switches available for this device, or still loading.</p>
        </div>
      </template>

      <template v-else>
        <div v-for="(sw, index) in storedSwitches" :key="sw.name + '-' + index" class="panel-section switch-item">
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

          <div class="switch-name-edit">
            <input v-model="editableSwitchNames[index]" type="text" placeholder="Edit name" />
            <button :disabled="editableSwitchNames[index] === sw.name || !editableSwitchNames[index]" @click="updateSwitchName(index)">Save Name</button>
          </div>

        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import type { ISwitchDetail } from '@/api/alpaca/switch-client'

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

const storedSwitches = computed(() => {
  return currentDevice.value?.sw_switches as ISwitchDetail[] | undefined | null;
});

const editableSwitchNames = ref<string[]>([])

watch(storedSwitches, (newSwitches) => {
  if (newSwitches) {
    editableSwitchNames.value = newSwitches.map(sw => sw.name);
  } else {
    editableSwitchNames.value = [];
  }
}, { immediate: true, deep: true });

const isBooleanSwitch = (sw: ISwitchDetail): boolean => {
  return sw.min === 0 && sw.max === 1 && sw.step === 1;
}

const toggleBooleanSwitch = async (switchIndex: number, newState: boolean) => {
  if (!props.deviceId) return;
  try {
    await store.setDeviceSwitchValue(props.deviceId, switchIndex, newState);
  } catch (error) {
    console.error(`Error toggling switch ${switchIndex} via store:`, error);
  }
}

const setNumericSwitchValue = async (switchIndex: number, newValue: number) => {
  if (!props.deviceId || isNaN(newValue)) return;
  try {
    await store.setDeviceSwitchValue(props.deviceId, switchIndex, newValue);
  } catch (error) {
    console.error(`Error setting value for switch ${switchIndex} via store:`, error);
  }
}

const updateSwitchName = async (switchIndex: number) => {
  if (!props.deviceId || !editableSwitchNames.value[switchIndex]) return;
  const newName = editableSwitchNames.value[switchIndex];
  const oldName = storedSwitches.value?.[switchIndex]?.name;
  if (newName === oldName) return;

  try {
    await store.setDeviceSwitchName(props.deviceId, switchIndex, newName);
  } catch (error) {
    console.error(`Error updating name for switch ${switchIndex} via store:`, error);
    if(oldName) editableSwitchNames.value[switchIndex] = oldName;
  }
}

onMounted(() => {
  if (props.deviceId && props.isConnected) {
    store.handleSwitchConnected(props.deviceId);
  }
});

watch(() => props.isConnected, (newIsConnected, oldIsConnected) => {
  if (props.deviceId) {
    if (newIsConnected && !oldIsConnected) {
      store.handleSwitchConnected(props.deviceId);
    } else if (!newIsConnected && oldIsConnected) {
      store.handleSwitchDisconnected(props.deviceId);
    }
  }
});

watch(() => props.deviceId, (newDeviceId, oldDeviceId) => {
  if (oldDeviceId && props.isConnected) {
    store.handleSwitchDisconnected(oldDeviceId);
  }
  if (newDeviceId && props.isConnected) {
    store.handleSwitchConnected(newDeviceId);
  }
}, { immediate: false });

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

.connection-notice {
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

.connection-message { font-size: 1.1rem; }
.panel-tip { font-size: 0.8rem; }

.switch-item {
  /* Specific styles for switch items if needed */
}

.switch-description {
  font-size: 0.85rem;
  color: var(--aw-text-secondary-color);
  margin-bottom: var(--aw-spacing-sm);
  min-height: 1.2em;
}

.switch-controls {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-md);
  margin-bottom: var(--aw-spacing-sm);
}

.toggle {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 28px;
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
  background-color: var(--aw-input-bg-color);
  border: 1px solid var(--aw-input-border-color);
  transition: .4s;
  border-radius: 28px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--aw-success-color);
}

input:focus + .slider {
  box-shadow: 0 0 1px var(--aw-primary-color);
}

input:checked + .slider:before {
  transform: translateX(22px);
}

.value-label {
  font-size: 0.9rem;
  min-width: 80px;
}

.numeric-input {
  width: 80px;
  padding: var(--aw-spacing-xs);
  background-color: var(--aw-input-bg-color, var(--aw-panel-bg-color));
  color: var(--aw-text-color);
  border: 1px solid var(--aw-input-border-color, var(--aw-panel-border-color));
  border-radius: var(--aw-border-radius-sm);
}

.range-label {
  font-size: 0.8rem;
  color: var(--aw-text-secondary-color);
}

.switch-name-edit {
  margin-top: var(--aw-spacing-sm);
  display: flex;
  gap: var(--aw-spacing-xs);
  align-items: center;
}

.switch-name-edit input[type="text"] {
  flex-grow: 1;
  padding: var(--aw-spacing-xs);
  background-color: var(--aw-input-bg-color, var(--aw-panel-bg-color));
  color: var(--aw-text-color);
  border: 1px solid var(--aw-input-border-color, var(--aw-panel-border-color));
  border-radius: var(--aw-border-radius-sm);
}

.switch-name-edit button {
  padding: var(--aw-spacing-xs) var(--aw-spacing-sm);
  background-color: var(--aw-button-secondary-bg);
  color: var(--aw-button-secondary-text);
  border: none;
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
}

.switch-name-edit button:disabled {
  background-color: var(--aw-color-neutral-300);
  cursor: not-allowed;
  opacity: 0.7;
}

</style> 