<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useUnifiedStore } from '../../stores/UnifiedStore'
import type { Device } from '../../types/DeviceTypes'
import { UIMode } from '../../stores/useUIPreferencesStore'
import { debugLog } from '../../utils/debugUtils'

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  apiBaseUrl: {
    type: String,
    default: ''
  }
})

const store = useUnifiedStore()
const currentMode = ref(UIMode.OVERVIEW)

// Get the device from the store
const device = computed<Device | null>(() => store.getDeviceById(props.deviceId))

// Derived properties for the panel
const isConnected = computed(() => device.value?.isConnected || false)
const deviceType = computed(() => device.value?.type || '')
const deviceNum = computed(() => parseInt(props.deviceId, 10) || 0)

// Use computed property to get the correct apiBaseUrl
const effectiveApiBaseUrl = computed<string>(() => {
  // First check the prop - this comes from MainPanels
  if (props.apiBaseUrl && props.apiBaseUrl.trim() !== '') {
    return props.apiBaseUrl
  }

  // Then check the device from the store
  if (device.value && device.value.apiBaseUrl) {
    return String(device.value.apiBaseUrl)
  }

  // Fallback to empty string
  return ''
})

// Add debugging on mount
onMounted(() => {
  debugLog('BaseDevicePanel mounted with deviceId:', props.deviceId)
  debugLog('Device from store:', device.value)
  debugLog('API Base URL prop:', props.apiBaseUrl)
  debugLog('Effective API Base URL:', effectiveApiBaseUrl.value)
})

// Event handlers
const handleConnect = () => {
  if (device.value) {
    if (device.value.isConnected) {
      store.disconnectDevice(device.value.id)
    } else {
      store.connectDevice(device.value.id)
    }
  }
}

const handleModeChange = (mode: UIMode) => {
  currentMode.value = mode
}

// Export variables and functions for composition
defineExpose({
  device,
  isConnected,
  deviceType,
  deviceNum,
  currentMode,
  apiBaseUrl: effectiveApiBaseUrl,
  handleConnect,
  handleModeChange
})
</script>

<template>
  <div>
    <slot></slot>
  </div>
</template>
