import type { Device } from '@/types/Device'
import { ref, computed } from 'vue'
import { Telescope } from '@/types/Telescope'
import { defineStore } from 'pinia'
import { Camera } from '@/types/Camera'

// import '@/types/Device'
export const useDevicesStore = defineStore('devices', () => {
  // Initialize with an empty array
  const devices = ref<Device[]>([])
  const connectedDevices = computed(() => devices.value.filter((device) => device.connected))
  const telescopes = computed(() => devices.value.filter((device) => device instanceof Telescope))
  const cameras = computed(() => devices.value.filter((device) => device instanceof Camera))

  return {
    devices,
    connectedDevices,
    telescopes,
    cameras
    // focusers,
    // filterwheels,
    // switches,
  }
})
