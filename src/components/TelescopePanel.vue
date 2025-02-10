<script setup lang="ts">
import PanelComponent from './PanelComponent.vue'
import Icon from './Icon.vue'
import { onMounted, reactive } from 'vue'
import axios from 'axios'
const props = defineProps({
  panelName: { type: String, required: true },
  connected: { type: Boolean, required: true },
  idx: { type: Number, required: true },
  deviceNum: { type: Number, required: true }
})

type TelescopeDataType = Record<string, string | number>

const telescopeData = reactive<TelescopeDataType>({})

function someThing() {
  console.log('someThing!')
}

async function fetchData() {
  axios
    .get(`/api/v1/telescope/${props.deviceNum}/devicestate`)
    .then((resp) => {
      console.log('resp from telescope: ', resp)
      for (let index = 0; index < resp.data.Value.length; index++) {
        telescopeData[resp.data.Value[index].Name] = resp.data.Value[index]['Value']
      }
      telescopeData
    })
    .catch((e) => console.error(e))
}

onMounted(() => {
  console.log('type: ', props)
  fetchData()
})
</script>
<template>
  <PanelComponent :panel-name="`Telescope ${deviceNum}`">
    <table class="device-properties">
      <thead>
        <tr>
          <th>Property</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Connected</td>
          <td>{{ connected }}</td>
        </tr>
        <tr v-for="(v, k) in telescopeData" :key="k">
          <td>{{ k }}</td>
          <td>{{ v }}</td>
        </tr>
      </tbody>
    </table>
    <div class="telescope-jog">
      <div class="row">
        <div class="button" @click="someThing"><Icon type="arrow-up"></Icon></div>
      </div>
      <div class="row">
        <div class="button"><Icon type="arrow-left"></Icon></div>
        <div class="button"><Icon type="home"></Icon></div>
        <div class="button"><Icon type="arrow-right"></Icon></div>
      </div>
      <div class="row">
        <div class="button"><Icon type="arrow-down"></Icon></div>
      </div>
      <div class="row" style="margin-top: 10px">
        <div class="button"><Icon type="stop"></Icon></div>
        <div class="button"><Icon type="park"></Icon></div>
      </div>
    </div>
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
  padding-left: 0.5em;
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
