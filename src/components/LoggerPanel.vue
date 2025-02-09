<script setup lang="ts">
import PanelComponent from './PanelComponent.vue'
import Icon from './Icon.vue'
const props = defineProps({
  panelName: { type: String, required: true }
})

function someThing() {
  console.log('someThing!')
}

props.panelName // string
</script>
<template>
  <PanelComponent panel-name="Debug Log">
    <div>Log:</div>
  </PanelComponent>
</template>

<style scoped>
table.device-properties {
  width: calc(100% - 140px);
  margin-left: 10px;
  margin-top: 10px;
  border-collapse: collapse;
}

table.device-properties tr,
td,
th {
  padding: 0.3em 0.5em 0.3em 0.5em;
  border: 1px dashed var(--aw-panel-border-color);
}

table.device-properties td {
  padding-left: 1em;
}

.telescope-jog {
  width: 100px;
  position: absolute;
  right: 10px;
  top: 10px;
  display: flex;
  flex-wrap: wrap;
  /* justify-content: center; */
}

.telescope-jog .row {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.telescope-jog .row.push-left {
  /* I need to figure out why I need this small shim here... */
  margin-left: 2px;
  justify-content: left;
  /* align-items: center; */
}

.telescope-jog div.button {
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
  cursor: pointer;
  margin: 2px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--aw-panel-border-color);
  border-collapse: collapse;
}

.telescope-jog div.no-border {
  border: 0;
}
</style>
