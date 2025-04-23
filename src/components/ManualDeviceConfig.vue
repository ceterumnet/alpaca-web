<script setup lang="ts">
import { ref } from 'vue'
import { useDiscoveredDevicesStore } from '@/stores/useDiscoveredDevicesStore'

const discoveredDevicesStore = useDiscoveredDevicesStore()

const showForm = ref(false)
const deviceAddress = ref('localhost')
const devicePort = ref(11111)
const isSubmitting = ref(false)
const errorMessage = ref('')

function toggleForm() {
  showForm.value = !showForm.value
  errorMessage.value = ''
}

async function addManualDevice() {
  if (!deviceAddress.value || !devicePort.value) {
    errorMessage.value = 'Address and port are required'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    await discoveredDevicesStore.addManualDevice(deviceAddress.value, devicePort.value)
    // Reset form after successful addition
    deviceAddress.value = 'localhost'
    devicePort.value = 11111
    showForm.value = false
  } catch (error: any) {
    errorMessage.value = error.message || 'Failed to add device'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="manual-device-config">
    <div class="header">
      <button @click="toggleForm" class="toggle-btn">
        {{ showForm ? 'Cancel' : 'Add Device Manually' }}
      </button>
    </div>

    <div v-if="showForm" class="config-form">
      <div class="form-group">
        <label for="deviceAddress">Alpaca Server Address:</label>
        <input
          type="text"
          id="deviceAddress"
          v-model="deviceAddress"
          placeholder="e.g., localhost or 192.168.1.100"
        />
      </div>

      <div class="form-group">
        <label for="devicePort">Alpaca Management Port:</label>
        <input type="number" id="devicePort" v-model="devicePort" min="1" max="65535" />
      </div>

      <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>

      <button @click="addManualDevice" :disabled="isSubmitting" class="add-btn">
        {{ isSubmitting ? 'Adding...' : 'Add Device' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.manual-device-config {
  margin-top: 1rem;
  border-top: 1px solid var(--aw-panel-border-color);
  padding-top: 1rem;
}

.header {
  display: flex;
  justify-content: flex-end;
}

.toggle-btn {
  font-size: 0.9rem;
  padding: 0.25rem 0.5rem;
  background-color: transparent;
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 4px;
  color: var(--aw-text-color);
  cursor: pointer;
}

.toggle-btn:hover {
  background-color: var(--aw-panel-menu-bar-bg-color);
}

.config-form {
  margin-top: 1rem;
  padding: 1rem;
  background-color: var(--aw-form-bg-color);
  border-radius: 4px;
  border: 1px solid var(--aw-panel-border-color);
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
}

.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 4px;
  background-color: var(--aw-input-bg-color, #fff);
  color: var(--aw-text-color);
}

.error-message {
  color: #e53935;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.add-btn {
  padding: 0.5rem 1rem;
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-text-color);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.add-btn:hover {
  background-color: var(--aw-panel-menu-bar-color);
  color: var(--aw-panel-menu-bar-bg-color);
}

.add-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
