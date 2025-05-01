// Status: Good - Core View 
// This is the device page view that: 
// - Shows individual device details 
// - Handles device operations 
// - Provides device controls 
// - Supports device monitoring 
// - Maintains device state

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUnifiedStore } from '../stores/UnifiedStore'
import DeviceDetailView from './DeviceDetailView.vue'

defineOptions({
  name: 'DevicePage'
})

const route = useRoute()
const router = useRouter()
const store = useUnifiedStore()

// Get device ID from route params
const deviceId = computed(() => route.params.id as string)

// Get the device from the store
const device = computed(() => store.getDeviceById(deviceId.value))

// Page state
const isLoading = ref(true)
const hasError = ref(false)
const errorMessage = ref('')

// Check if the device exists when the component is mounted
onMounted(async () => {
  try {
    isLoading.value = true

    // If no device found, try to load it
    if (!device.value) {
      // In a real app, this might fetch the device from an API
      // For this demo, we'll just check if it exists in the store
      const deviceExists = store.hasDevice(deviceId.value)

      if (!deviceExists) {
        hasError.value = true
        errorMessage.value = `Device with ID ${deviceId.value} not found.`
      }
    }
  } catch (error) {
    hasError.value = true
    errorMessage.value = error instanceof Error ? error.message : 'Unknown error occurred'
  } finally {
    isLoading.value = false
  }
})

// Watch for device changes
watch(device, (newDevice) => {
  if (newDevice) {
    // Reset error state if device is found
    hasError.value = false
    errorMessage.value = ''
  }
})

// Navigate back to devices list
const goToDevicesList = () => {
  router.push('/devices')
}
</script>

<template>
  <div class="device-page">
    <!-- Loading indicator -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading device information...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="hasError" class="error-container">
      <h2>Error</h2>
      <p>{{ errorMessage }}</p>
      <button class="action-button" @click="goToDevicesList">Back to Devices</button>
    </div>

    <!-- Device found - render the detail view -->
    <div v-else>
      <DeviceDetailView />
    </div>
  </div>
</template>

<style scoped>
.device-page {
  height: 100%;
  width: 100%;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 60vh;
  padding: 20px;
}

.loading-spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid var(--aw-panel-resize-bg-color);
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error-container h2 {
  color: #f44336;
  margin-bottom: 10px;
}

.error-container p {
  margin-bottom: 20px;
  max-width: 500px;
}

.action-button {
  padding: 10px 20px;
  font-size: 1rem;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
}

.action-button:hover {
  background-color: var(--aw-panel-resize-bg-color);
}
</style>
