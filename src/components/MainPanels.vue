<script setup lang="ts">
// import PanelLayout from './PanelLayout.vue'
// import Splitter from 'primevue/splitter'
// import SplitterPanel from 'primevue/splitterpanel'
// import Panel from 'primevue/panel'
// import { Vue }
// const panels = [{ title: 'PanelA' }, { title: 'Panel2' }, { title: 'Panel3' }]
import { GridLayout, GridItem } from 'grid-layout-plus'
import { reactive } from 'vue'
import PanelComponent from './PanelComponent.vue'
const layout = reactive([
  {
    x: 0,
    y: 0,
    w: 2,
    h: 2,
    i: '0',
    static: false
    // content: 'lorem ipsum fodder foo 123 \n what is this going to be like? '
  },
  { x: 2, y: 0, w: 2, h: 4, i: '1', static: false },
  { x: 4, y: 0, w: 2, h: 5, i: '2', static: false },
  { x: 0, y: 5, w: 2, h: 3, i: '3', static: false },
  { x: 4, y: 5, w: 2, h: 3, i: '4', static: false }
])
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
        <PanelComponent :panel-name="'Item: ' + item.i"></PanelComponent>
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
  position: absolute;
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
  justify-content: center;
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
</style>
