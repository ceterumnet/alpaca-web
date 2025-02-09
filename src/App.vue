<script setup lang="ts">
// import '@primevue/themes'
import { onMounted } from 'vue'
import MainPanels from './components/MainPanels.vue'
import axios from 'axios'
import { useDevicesStore } from './stores/useDevicesStore'
import { Telescope } from './types/Telescope'
import { DeviceFactory } from './types/Device'

var darkMode = false
var themeClass = 'dark-theme'

let deviceStore = useDevicesStore()

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

function fetchConfiguredDevices() {
  axios
    .get('/management/v1/configureddevices')
    .then((resp) => {
      console.log('resp', resp)
      let deviceArray = resp.data.Value
      for (let deviceIdx = 0; deviceIdx < deviceArray.length; deviceIdx++) {
        const device = deviceArray[deviceIdx]
        console.log('device: ', device)
        console.log('device.deviceType:', device.DeviceType)
        let deviceInstanceClass = DeviceFactory.deviceTypeMap.get(device.DeviceType)

        if (undefined !== deviceInstanceClass) {
          console.log('found matching type')
          console.log('DeviceFactory.deviceTypeMap: ', DeviceFactory.deviceTypeMap)
          console.log(
            'DeviceFactory.deviceTypeMap["Telescope"]: ',
            DeviceFactory.deviceTypeMap.get('Telescope')
          )
          console.log('deviceInstanceClass:', deviceInstanceClass)
        } else {
          console.log('no matching type found, skipping')
        }
        // deviceStore.$state.devices.push(new deviceInstanceClass())

        // deviceStore.$state.devices.push(device)
      }
    })
    .catch((e) => {
      console.error('problem: ', e)
    })
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
