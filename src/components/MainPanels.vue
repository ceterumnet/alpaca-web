<script setup lang="ts">
import { GridLayout, GridItem } from 'grid-layout-plus'
import { reactive } from 'vue'
import PanelComponent from './PanelComponent.vue'
import TelescopePanel from './TelescopePanel.vue'
import type { Device } from '@/types/Device'

const layout = reactive([
  { x: 0, y: 0, w: 6, h: 8, i: 'five', deviceType: 'telescope', static: false, connected: true },
  { x: 6, y: 0, w: 6, h: 8, i: 'one', static: false, connected: false },
  { x: 0, y: 0, w: 6, h: 8, i: 'two', static: false, connected: false },
  { x: 6, y: 0, w: 6, h: 8, i: 'three', static: false, connected: false },
  { x: 0, y: 5, w: 6, h: 8, i: 'four', static: false, connected: false }
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
  }
  return PanelComponent
}
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
        <component :is="getComponent(item as Device)" :connected="item.connected" :panel-name="'generic ' + item.i"></component>
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
