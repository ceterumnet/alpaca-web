<script setup lang="ts">
// import '@primevue/themes'
import { onMounted } from 'vue'
import MainPanels from './components/MainPanels.vue'
import DiscoveredDevices from './components/DiscoveredDevices.vue'
import axios from 'axios'
import { useDevicesStore } from './stores/useDevicesStore'
import { Telescope } from './types/Telescope'
import { Camera } from './types/Camera'
import { DeviceFactory, Device } from './types/Device'

var darkMode = false
var themeClass = 'dark-theme'

let deviceStore = useDevicesStore()

async function fetchConfiguredDevices() {
  try {
    // First, get the list of configured devices from the Alpaca server
    const response = await axios.get('/management/v1/configureddevices')
    const configuredDevices = response.data.Value

    // Clear existing devices
    deviceStore.devices = []

    // Process each configured device
    for (const device of configuredDevices) {
      const deviceType = device.DeviceType
      const deviceNumber = device.DeviceNumber

      // Create appropriate device instance based on type
      let newDevice: Device | null = null
      let telescope: Telescope | null = null
      let camera: Camera | null = null

      // Convert deviceType to lowercase for case-insensitive comparison
      const deviceTypeLower = deviceType.toLowerCase()

      switch (deviceTypeLower) {
        case 'telescope':
          telescope = DeviceFactory.createDevice(Telescope)
          telescope.idx = deviceNumber
          newDevice = telescope
          break
        case 'camera':
          camera = DeviceFactory.createDevice(Camera)
          camera.idx = deviceNumber
          newDevice = camera
          break
        default:
          console.warn(`Unsupported device type: ${deviceType}`)
          continue
      }

      if (newDevice) {
        // Check if device is connected
        try {
          const stateResponse = await axios.get(
            `/api/v1/${deviceType.toLowerCase()}/${deviceNumber}/connected`
          )
          newDevice.connected = stateResponse.data.Value
        } catch (error) {
          console.error(`Error checking connection state for ${deviceType} ${deviceNumber}:`, error)
          newDevice.connected = false
        }

        deviceStore.devices.push(newDevice)
      }
    }

    console.log('Configured devices:', deviceStore.devices)
  } catch (error) {
    console.error('Error fetching configured devices:', error)
  }
}

function darkLightToggle() {
  console.log('clicked!')
  darkMode = darkMode ? false : true
  const el = document.body

  if (darkMode) {
    el.classList.add('dark-theme')
  } else {
    el.classList.remove('dark-theme')
  }
  console.log('theme: ', themeClass)
}

onMounted(() => {
  console.log('mounted!!!')
  fetchConfiguredDevices()
})
</script>

<template>
  <header>
    <div class="header-menu">
      <span class="hover-pointer no-select" @click="darkLightToggle()"> Dark / Light </span>
    </div>
  </header>

  <main class="no-select">
    <MainPanels />
  </main>
</template>

<style scoped>
.hover-pointer {
  cursor: pointer;
}

.header-menu {
  align-items: center;
  display: flex;
  background-color: var(--aw-panel-bg-color);
  height: 30px;
}
</style>
