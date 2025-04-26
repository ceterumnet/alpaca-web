<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import EnhancedDiscoveryPanel from '../components/ui-examples/EnhancedDiscoveryPanel.vue'
import ToastNotification from '../components/ui/ToastNotification.vue'
import {
  useLegacyDeviceStore,
  type UIDiscoveredDevice,
  type ServerData
} from '../stores/deviceStoreAdapter'

defineOptions({
  name: 'DiscoveryView'
})

// Get stores and router
const deviceStore = useLegacyDeviceStore()
const router = useRouter()

// Toast management
const toasts = ref<{ id: number; message: string; type: string }[]>([])
let toastIdCounter = 0

const addToast = (message: string, type = 'success') => {
  const id = toastIdCounter++
  toasts.value.push({ id, message, type })

  // Auto-remove after toast is closed
  setTimeout(() => {
    removeToast(id)
  }, 3500) // Slightly longer than the toast duration
}

const removeToast = (id: number) => {
  const index = toasts.value.findIndex((toast) => toast.id === id)
  if (index !== -1) {
    toasts.value.splice(index, 1)
  }
}

// Event handlers
const handleDiscover = () => {
  deviceStore.startDiscovery()

  if (!deviceStore.isDiscovering) {
    addToast('Device discovery completed', 'info')
  }
}

const handleConnectDevice = (device: UIDiscoveredDevice) => {
  // Add discovered device to managed devices
  const managedDevice = deviceStore.addDiscoveredDeviceToManaged(device.id)

  // Show success toast
  if (managedDevice) {
    addToast(`Added device: ${device.name}`, 'success')
  } else {
    addToast('Failed to add device', 'error')
  }
}

const handleAddServer = (serverData: ServerData) => {
  const newServer = {
    id: Date.now().toString(),
    address: serverData.address,
    port: serverData.port,
    name: serverData.name,
    manufacturer: '',
    location: 'Custom Location',
    version: '',
    isOnline: true,
    isManualEntry: true,
    lastSeen: new Date()
  }

  deviceStore.addServer(newServer)
  addToast(`Server added: ${serverData.name}`, 'success')
}

// Method to go to devices view after adding devices
const goToDevicesView = () => {
  router.push('/devices')
}
</script>

<template>
  <div class="discovery-view">
    <div class="discovery-container">
      <div class="discovery-header">
        <h1>Device Discovery</h1>
        <button class="back-button" @click="goToDevicesView">Back to Devices</button>
      </div>

      <EnhancedDiscoveryPanel
        :servers="deviceStore.servers"
        :devices="deviceStore.discoveredDevices"
        :is-discovering="deviceStore.isDiscovering"
        :last-discovery-time="deviceStore.lastDiscoveryTime"
        @discover="handleDiscover"
        @connect-device="handleConnectDevice"
        @add-server="handleAddServer"
      />
    </div>

    <!-- Toast notifications -->
    <Teleport to="body">
      <TransitionGroup name="toast">
        <ToastNotification
          v-for="toast in toasts"
          :key="toast.id"
          :message="toast.message"
          :type="toast.type"
          @close="() => removeToast(toast.id)"
        />
      </TransitionGroup>
    </Teleport>
  </div>
</template>

<style scoped>
.discovery-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  padding: 20px;
}

.discovery-container {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.discovery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.discovery-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--aw-panel-content-color);
}

.back-button {
  padding: 8px 16px;
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.back-button:hover {
  background-color: var(--aw-panel-resize-bg-color);
}

/* Toast transition styles */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
