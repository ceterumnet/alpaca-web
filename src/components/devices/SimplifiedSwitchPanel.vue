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
        <div class="switches-grid">
          <div v-for="(sw, index) in storedSwitches" :key="sw.name + '-' + index" class="panel-section switch-item">
            <h3 class="switch-name-label">
              <template v-if="editingIndex === index">
                <input v-model="editableSwitchNames[index]" type="text" class="aw-input switch-name-inline-input" placeholder="Edit name" />
                <button
                  class="aw-button aw-button--secondary aw-button--small switch-name-save-btn"
                  :disabled="editableSwitchNames[index] === sw.name || !editableSwitchNames[index]"
                  @click="updateSwitchName(index)"
                >
                  Save
                </button>
                <button class="aw-button aw-button--tertiary aw-button--small switch-name-cancel-btn" @click="cancelEdit(index)">Cancel</button>
              </template>
              <template v-else>
                <span class="switch-name-text">{{ sw.name }}</span>
                <span class="switch-name-edit-icon">
                  <button
                    class="aw-button aw-button--tertiary aw-button--icon-only switch-name-edit-btn"
                    aria-label="Edit name"
                    @click="startEdit(index)"
                  >
                    <Icon type="highlight" size="18" />
                  </button>
                </span>
              </template>
            </h3>
            <p class="switch-description">{{ sw.description }}</p>

            <div class="switch-controls">
              <template v-if="isBooleanSwitch(sw)">
                <div class="switch-input-row">
                  <template v-if="sw.canWrite">
                    <label class="toggle">
                      <input
                        type="checkbox"
                        :checked="Boolean(sw.value)"
                        @change="toggleBooleanSwitch(index, ($event.target as HTMLInputElement).checked)"
                      />
                      <span class="slider"></span>
                    </label>
                    <span class="value-label">{{ Boolean(sw.value) ? 'ON' : 'OFF' }}</span>
                  </template>
                  <template v-else>
                    <div class="switch-input-row switch-input-row--readonly">
                      <div class="switch-row-left">
                        <label class="toggle" aria-label="Read-only toggle" title="This switch is read-only">
                          <input type="checkbox" :checked="Boolean(sw.value)" disabled />
                          <span class="slider"></span>
                        </label>
                      </div>
                      <div class="switch-row-middle value-label">{{ Boolean(sw.value) ? 'ON' : 'OFF' }}</div>
                      <div class="switch-row-right">
                        <Icon type="lock" size="16" class="switch-readonly-icon" title="Read-only" />
                      </div>
                    </div>
                  </template>
                </div>
                <div class="range-label"></div>
              </template>
              <template v-else>
                <div class="switch-input-row switch-input-row--readonly">
                  <div class="switch-row-left">
                    <input
                      type="number"
                      :value="sw.value"
                      :min="sw.min"
                      :max="sw.max"
                      :step="sw.step"
                      class="aw-input"
                      readonly
                      disabled
                      aria-label="Read-only value"
                    />
                  </div>
                  <div class="switch-row-middle value-label">Current: {{ sw.value }}</div>
                  <div class="switch-row-right">
                    <Icon type="lock" size="16" class="switch-readonly-icon" title="Read-only" />
                  </div>
                </div>
                <div class="range-label">
                  <template v-if="sw.min !== undefined && sw.max !== undefined">
                    (Range: {{ sw.min }} to {{ sw.max }}, Step: {{ sw.step }})
                  </template>
                </div>
              </template>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import Icon from '@/components/ui/Icon.vue'
import type { ISwitchDetail } from '@/stores/modules/switchActions'

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
  return currentDevice.value?.sw_switches as ISwitchDetail[] | undefined | null
})

const editableSwitchNames = ref<string[]>([])
const editingIndex = ref<number | null>(null)

watch(
  storedSwitches,
  (newSwitches) => {
    if (newSwitches) {
      editableSwitchNames.value = newSwitches.map((sw) => sw.name)
    } else {
      editableSwitchNames.value = []
    }
  },
  { immediate: true, deep: true }
)

const isBooleanSwitch = (sw: ISwitchDetail): boolean => {
  return sw.min === 0 && sw.max === 1 && sw.step === 1
}

const toggleBooleanSwitch = async (switchIndex: number, newState: boolean) => {
  if (!props.deviceId) return
  try {
    await store.setDeviceSwitchValue(props.deviceId, switchIndex, newState)
  } catch (error) {
    console.error(`Error toggling switch ${switchIndex} via store:`, error)
  }
}

const setNumericSwitchValue = async (switchIndex: number, newValue: number) => {
  if (!props.deviceId || isNaN(newValue)) return
  try {
    await store.setDeviceSwitchValue(props.deviceId, switchIndex, newValue)
  } catch (error) {
    console.error(`Error setting value for switch ${switchIndex} via store:`, error)
  }
}

function startEdit(index: number) {
  editingIndex.value = index
  nextTick(() => {
    const input = document.querySelector<HTMLInputElement>(`.switch-name-inline-input`)
    if (input) input.focus()
  })
}

function cancelEdit(index: number) {
  if (storedSwitches.value && storedSwitches.value[index]) {
    editableSwitchNames.value[index] = storedSwitches.value[index].name
  }
  editingIndex.value = null
}

const doUpdateSwitchName = async (switchIndex: number) => {
  if (!props.deviceId || !editableSwitchNames.value[switchIndex]) return
  const newName = editableSwitchNames.value[switchIndex]
  const oldName = storedSwitches.value?.[switchIndex]?.name
  if (newName === oldName) return

  try {
    await store.setDeviceSwitchName(props.deviceId, switchIndex, newName)
  } catch (error) {
    console.error(`Error updating name for switch ${switchIndex} via store:`, error)
    if (oldName) editableSwitchNames.value[switchIndex] = oldName
  }
}

const updateSwitchName = async (switchIndex: number) => {
  await doUpdateSwitchName(switchIndex)
  editingIndex.value = null
}

onMounted(() => {
  if (props.deviceId && props.isConnected) {
    store.handleSwitchConnected(props.deviceId)
  }
})

watch(
  () => props.isConnected,
  (newIsConnected, oldIsConnected) => {
    if (props.deviceId) {
      if (newIsConnected && !oldIsConnected) {
        store.handleSwitchConnected(props.deviceId)
      } else if (!newIsConnected && oldIsConnected) {
        store.handleSwitchDisconnected(props.deviceId)
      }
    }
  }
)

watch(
  () => props.deviceId,
  (newDeviceId, oldDeviceId) => {
    if (oldDeviceId && props.isConnected) {
      store.handleSwitchDisconnected(oldDeviceId)
    }
    if (newDeviceId && props.isConnected) {
      store.handleSwitchConnected(newDeviceId)
    }
  },
  { immediate: false }
)
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
  box-shadow: var(--aw-shadow-sm);
}

.panel-content {
  overflow-y: auto;
  flex: 1;
  padding: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
}

.panel-section {
  /* margin-bottom: var(--aw-spacing-md); */
  background-color: var(--aw-panel-content-bg-color);
  border-radius: var(--aw-border-radius-sm);
  padding: var(--aw-spacing-sm);
}

.panel-section h3 {
  margin-top: 0;
  margin-bottom: var(--aw-spacing-xs);
  font-size: var(--aw-font-size-base, 1rem);
  background: var(--aw-panel-header-bg-color);
  color: var(--aw-panel-header-text-color);
  border-radius: var(--aw-border-radius-sm);
  padding: var(--aw-spacing-xs) var(--aw-spacing-sm);
  border: none;
}

.connection-notice {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100px;
  background-color: var(--aw-panel-content-bg-color);
  border-radius: var(--aw-border-radius-sm);
  margin-bottom: var(--aw-spacing-md);
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
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
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
  inset: 0;
  background-color: var(--aw-color-neutral-400);
  border: 1px solid var(--aw-input-border-color);
  transition: 0.4s;
  border-radius: var(--aw-border-radius-sm);
}

.slider::before {
  position: absolute;
  content: '';
  height: 20px;
  width: 20px;
  left: 4px;
  bottom: 4px;
  background-color: var(--aw-color-neutral-100);
  box-shadow: 0 1px 4px var(--aw-color-black-50);
  transition: 0.4s;
  border-radius: var(--aw-border-radius-sm);
}

input:checked + .slider {
  background-color: var(--aw-success-color);
}

input:focus + .slider {
  box-shadow: 0 0 1px var(--aw-primary-color);
}

input:checked + .slider::before {
  transform: translateX(22px);
}

.value-label {
  font-size: 0.9rem;
  min-width: 80px;
  font-family: var(--aw-font-family-mono);
}

.range-label {
  font-size: 0.8rem;
  color: var(--aw-text-secondary-color);
  margin-top: var(--aw-spacing-xs);
  display: block;

  /* min-height: 3em; */
}

.switch-name-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--aw-spacing-xs);
}

.switch-name-text {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.switch-name-edit-icon {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.switch-name-inline-input {
  width: 8em;
  font-size: 1em;
  margin-right: var(--aw-spacing-xs);
  padding: var(--aw-spacing-xs) var(--aw-spacing-sm);
}

.switch-name-save-btn,
.switch-name-cancel-btn {
  margin-right: var(--aw-spacing-xs);
}

.switch-name-edit-btn {
  padding: 0 var(--aw-spacing-xs);
  font-size: 1em;
  background-color: transparent;
  border: none;
  color: var(--aw-panel-header-text-color);
  cursor: pointer;
}

.switches-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--aw-spacing-sm);
}

@media (width <= 1100px) {
  .switches-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (width <= 700px) {
  .switches-grid {
    grid-template-columns: 1fr;
  }
}

.switch-input-row {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-md);
  width: 100%;
}

.switch-row-left {
  /* No flex/grid needed for grid layout */
}

.switch-row-middle {
  min-width: 80px;
  text-align: left;
  font-family: var(--aw-font-family-mono);
}

.switch-row-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 24px;
}

.switch-readonly-icon {
  margin-left: var(--aw-spacing-xs);
  color: var(--aw-color-neutral-500);
  vertical-align: middle;
}

.toggle[aria-label='Read-only toggle'] {
  cursor: not-allowed;
}

.toggle[aria-label='Read-only toggle'] .slider {
  cursor: not-allowed;
}

input.aw-input {
  font-family: var(--aw-font-family-mono);
  width: 70px;
}

.switch-input-row--readonly {
  display: grid;
  grid-template-columns: auto 1fr min-content;
  align-items: center;
  gap: var(--aw-spacing-md);
}
</style>
