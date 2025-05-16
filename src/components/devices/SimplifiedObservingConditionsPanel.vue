<template>
  <div class="simplified-panel simplified-observingconditions-panel">
    <div class="panel-content">
      <div v-if="!currentDevice" class="connection-notice">
        <div class="connection-message">No Observing Conditions device selected or available</div>
      </div>
      <div v-else-if="!isConnected" class="connection-notice">
        <div class="connection-message">Observing Conditions ({{ currentDevice.name }}) not connected.</div>
        <div class="panel-tip">Use the connect button in the panel header.</div>
      </div>
      <template v-else-if="isLoading">
        <div class="loading-notice">
          <p>Loading observing conditions...</p>
        </div>
      </template>
      <template v-else>
        <div class="panel-section">
          <h3>Ambient Conditions</h3>
          <div class="conditions-grid">
            <div><span class="label">Temperature:</span> <span class="value">{{ formatValue(conditions?.temperature, '°C') }}</span></div>
            <div><span class="label">Humidity:</span> <span class="value">{{ formatValue(conditions?.humidity, '%') }}</span></div>
            <div><span class="label">Pressure:</span> <span class="value">{{ formatValue(conditions?.pressure, 'hPa') }}</span></div>
            <div><span class="label">Dew Point:</span> <span class="value">{{ formatValue(conditions?.dewpoint, '°C') }}</span></div>
          </div>
        </div>

        <div class="panel-section">
          <h3>Sky Conditions</h3>
          <div class="conditions-grid">
            <div><span class="label">Cloud Cover:</span> <span class="value">{{ formatValue(conditions?.cloudcover, '%') }}</span></div>
            <div><span class="label">Sky Temperature:</span> <span class="value">{{ formatValue(conditions?.skytemperature, '°C') }}</span></div>
            <div><span class="label">Sky Brightness:</span> <span class="value">{{ formatValue(conditions?.skybrightness, 'lux') }}</span></div>
            <div><span class="label">Sky Quality:</span> <span class="value">{{ formatValue(conditions?.skyquality, 'mag/arcsec²') }}</span></div>
            <div><span class="label">Star FWHM:</span> <span class="value">{{ formatValue(conditions?.starfwhm, 'arcsec') }}</span></div>
            <div><span class="label">Rain Rate:</span> <span class="value">{{ formatValue(conditions?.rainrate, 'mm/hr') }}</span></div>
          </div>
        </div>

        <div class="panel-section">
          <h3>Wind Conditions</h3>
          <div class="conditions-grid">
            <div><span class="label">Wind Speed:</span> <span class="value">{{ formatValue(conditions?.windspeed, 'm/s') }}</span></div>
            <div><span class="label">Wind Gust:</span> <span class="value">{{ formatValue(conditions?.windgust, 'm/s') }}</span></div>
            <div><span class="label">Wind Direction:</span> <span class="value">{{ formatValue(conditions?.winddirection, '°') }}</span></div>
          </div>
        </div>
        
        <div class="panel-section">
          <h3>Settings</h3>
          <div class="input-group">
            <label :for="deviceId + '-avg-period'">Averaging Period (s):</label>
            <input 
              :id="deviceId + '-avg-period'" 
              v-model.number="averagePeriodInput" 
              type="number" 
              min="0"
              @change="setAveragePeriodHandler"
            />
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
import type { Device } from '@/stores/types/device-store.types'
import type { IObservingConditionsData } from '@/api/alpaca/observingconditions-client'

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

const currentDevice = computed(() => store.getDeviceById(props.deviceId) as Device | undefined)
const conditions = ref<IObservingConditionsData | null>(null)
const averagePeriodInput = ref<number | null>(null)

let pollTimer: number | undefined

const formatValue = (value: number | undefined | null, unit: string = '', precision: number = 1): string => {
  if (value === null || typeof value === 'undefined') return 'N/A'
  return `${value.toFixed(precision)} ${unit}`.trim()
}

const resetState = () => {
  conditions.value = null
  averagePeriodInput.value = null
  isLoading.value = true
}

const fetchAllConditions = async () => {
  if (!props.isConnected || !props.deviceId) {
    resetState()
    return
  }
  isLoading.value = true
  try {
    // Uses the getAllConditions helper from the client
    const data = await callAlpacaMethod(props.deviceId, 'getAllConditions') as IObservingConditionsData
    conditions.value = data
    if (data?.averageperiod !== undefined && averagePeriodInput.value === null) {
      averagePeriodInput.value = data.averageperiod
    }
  } catch (error) {
    console.error(`Error fetching observing conditions for ${props.deviceId}:`, error)
    conditions.value = null // Clear data on error
  }
  isLoading.value = false
}

const setAveragePeriodHandler = async () => {
  if (!props.deviceId || averagePeriodInput.value === null || averagePeriodInput.value < 0) {
    // Optionally revert or show error if input is invalid
    if (conditions.value?.averageperiod !== undefined) {
        averagePeriodInput.value = conditions.value.averageperiod;
    }
    return;
  }
  try {
    await callAlpacaMethod(props.deviceId, 'setAveragePeriod', { Period: averagePeriodInput.value })
    // Refresh conditions to confirm change or rely on poll
    fetchAllConditions(); 
  } catch (error) {
    console.error('Error setting average period:', error)
    // Revert input on error
    if (conditions.value?.averageperiod !== undefined) {
        averagePeriodInput.value = conditions.value.averageperiod;
    }
  }
}

watch(() => props.deviceId, (newId) => {
  if (newId) {
    resetState()
    if (props.isConnected) {
      fetchAllConditions()
    }
  }
}, { immediate: true })

watch(() => props.isConnected, (newIsConnected) => {
  if (newIsConnected && props.deviceId) {
    fetchAllConditions()
    if (!pollTimer) {
      pollTimer = window.setInterval(fetchAllConditions, 15000) // Poll every 15 seconds
    }
  } else {
    resetState()
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = undefined
    }
  }
}, { immediate: true })

onMounted(() => {
  if (props.isConnected && props.deviceId) {
    fetchAllConditions()
    if (!pollTimer) {
      pollTimer = window.setInterval(fetchAllConditions, 15000) 
    }
  }
})

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
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

.connection-message { font-size: 1.1rem; }
.panel-tip { font-size: 0.8rem; }

.conditions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--aw-spacing-sm) var(--aw-spacing-md);
}

.conditions-grid > div {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  padding: calc(var(--aw-spacing-xs) / 2) 0;
}

.label {
  color: var(--aw-text-secondary-color);
}

.value {
  font-weight: var(--aw-font-weight-medium);
  text-align: right;
}

.input-group {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-sm);
}

.input-group label {
  color: var(--aw-text-secondary-color);
  font-size: 0.9rem;
}

.input-group input[type="number"] {
  width: 100px;
  padding: var(--aw-spacing-xs);
  background-color: var(--aw-input-bg-color, var(--aw-panel-bg-color));
  color: var(--aw-text-color);
  border: 1px solid var(--aw-input-border-color, var(--aw-panel-border-color));
  border-radius: var(--aw-border-radius-sm);
}
</style> 