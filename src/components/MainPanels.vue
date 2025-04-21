<script setup lang="ts">
import { GridLayout, GridItem } from 'grid-layout-plus'
import { onMounted, reactive } from 'vue'
import PanelComponent from './PanelComponent.vue'
import TelescopePanel from './TelescopePanel.vue'
import CameraPanel from './CameraPanel.vue'
import { DeviceFactory, type Device } from '@/types/Device'
import LoggerPanel from './LoggerPanel.vue'
import { useDevicesStore } from '@/stores/useDevicesStore'
import axios from 'axios'

let layout: any = reactive([
  // { x: 0, y: 0, w: 6, h: 8, i: 'five', deviceType: 'telescope', static: false, connected: false },
  // { x: 6, y: 0, w: 6, h: 8, i: 'one', static: false, connected: false },
  // { x: 0, y: 0, w: 6, h: 8, i: 'two', static: false, connected: false },
  // { x: 6, y: 0, w: 6, h: 8, i: 'three', static: false, connected: false },
  // { x: 0, y: 6, w: 12, h: 8, i: 'six', deviceType: 'logger', static: false, connected: false }
])

function isDevice(obj: Device | object): obj is Device {
  return (obj as Device).deviceType !== undefined
}

const getComponent = function (lookupBy: Device) {
  if (isDevice(lookupBy)) {
    console.log('getComponent: ', lookupBy)
    if (lookupBy['deviceType'].toLowerCase() == 'telescope') {
      return TelescopePanel
    }
    if (lookupBy['deviceType'].toLowerCase() == 'camera') {
      return CameraPanel
    }
    if (lookupBy['deviceType'].toLowerCase() == 'logger') {
      return LoggerPanel
    }
  }
  return PanelComponent
}

function fetchConfiguredDevices() {
  console.log('fetchConfiguredDevices')
  axios
    .get('/management/v1/configureddevices')
    .then((resp) => {
      console.log('resp', resp)
      let deviceArray = resp.data.Value
      let devicesAdded = 0
      for (let deviceIdx = 0; deviceIdx < deviceArray.length; deviceIdx++) {
        const device = deviceArray[deviceIdx]
        console.log('device: ', device)
        // console.log('device.deviceType:', device.DeviceType)
        let deviceInstanceClass = DeviceFactory.deviceTypeMap.get(device.DeviceType.toLowerCase())

        if (undefined !== deviceInstanceClass) {
          console.log('found matching type')
          console.log('DeviceFactory.deviceTypeMap: ', DeviceFactory.deviceTypeMap)
          console.log('DeviceNum: ', device.DeviceNumber)
          // console.log(
          //   'DeviceFactory.deviceTypeMap["Telescope"]: ',
          //   DeviceFactory.deviceTypeMap.get('Telescope')
          // )
          // console.log('deviceInstanceClass:', deviceInstanceClass)
          // { x: 0, y: 0, w: 6, h: 8, i: 'five', deviceType: 'telescope', static: false, connected: false },
          let xPos = devicesAdded % 2 == 0 ? 0 : 6
          devicesAdded++
          layout.push({
            x: xPos,
            y: 0,
            w: 6,
            h: 20,
            i: deviceIdx,
            deviceNum: device.DeviceNumber,
            deviceType: device.DeviceType,
            connected: false
          })
        } else {
          console.log(`no matching type found for ${device.DeviceType}, skipping`)
        }
        // deviceStore.$state.devices.push(new deviceInstanceClass())

        // deviceStore.$state.devices.push(device)
        console.log('layout: ', layout)
      }
    })
    .catch((e) => {
      console.error('problem: ', e)
    })
}

onMounted(() => {
  fetchConfiguredDevices()
})

let deviceStore = useDevicesStore()

console.log('deviceStore: ', deviceStore)
</script>

<template>
  <div style="position: relative">
    <GridLayout v-model:layout="layout" :row-height="30">
      <GridItem
        v-for="item in layout"
        :key="item.i"
        :x="item.x"
        :y="item.y"
        :w="item.w"
        :h="item.h"
        :i="item.i"
        drag-allow-from=".vue-draggable-handle"
        drag-ignore-from=".no-drag"
      >
        <component
          :is="getComponent(item as unknown as Device)"
          :connected="item.connected"
          :panel-name="'generic ' + item.i"
          :idx="item.i"
          :device-num="item.deviceNum"
        ></component>
      </GridItem>
    </GridLayout>
  </div>
</template>

<style scoped>
.vgl-layout {
  background-color: var(--aw-panels-bg-color);
}

:deep(.vgl-item:not(.vgl-item--placeholder)) {
  background-color: var(--aw-panel-resize-bg-color);
  border: 1px solid var(--aw-panel-border-color);
}

:deep(.vgl-item--resizing) {
  opacity: 90%;
}

:deep(.vgl-item--static) {
  background-color: var(--aw-panel-bg-color);
}

:deep(.panel-container) {
  position: relative;
  inset: 0;
  width: 100%;
  height: 100%;
  text-align: center;
  font-size: 0.8em;
  font-family: sans-serif;
  overflow: hidden;
}

:deep(.vgl-item__resizer::before) {
  border-color: var(--aw-panel-resize-color);
}

:deep(.vue-draggable-handle) {
  position: absolute;
  color: var(--aw-panel-menu-bar-color);
  top: 0;
  right: 0;
  box-sizing: border-box;
  width: 100%;
  height: 20px;
  padding: 0;
  cursor: move;
  background-color: var(--aw-panel-menu-bar-bg-color);
  background-origin: content-box;
  border-radius: 2px;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  align-items: center;
  justify-content: left;
  padding-left: 0.3em;
  overflow: hidden;
  text-wrap: nowrap;
}

:deep(.no-drag) {
  text-align: left;
  position: relative;
  top: 20px;
  width: 100%;
  height: calc(100% - 33px);
  background-color: var(--aw-panel-content-bg-color);
  color: var(--aw-panel-content-color);
  scrollbar-color: var(--aw-panel-scrollbar-color-1) var(--aw-panel-scrollbar-color-2);
  overflow-y: scroll;
}

:deep(.panel-title *) {
  color: var(--aw-panel-menu-bar-color);
}
</style>
