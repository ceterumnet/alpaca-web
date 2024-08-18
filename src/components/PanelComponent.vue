<script setup lang="ts">
const props = defineProps({
  panelName: { type: String, required: true },
  connected: { type: Boolean, required: true }
})

import Icon from './Icon.vue'
props.panelName // string
</script>
<template>
  <div class="panel-container">
    <div class="panel-title">
      <span class="vue-draggable-handle">{{ panelName }}</span>
      <Icon class="close-handle" type="close"></Icon>
      <Icon class="configure-handle" type="gear"></Icon>
      <Icon class="connect-handle" :type="connected ? 'connected' : 'disconnected'"></Icon>
    </div>
    <div class="no-drag">
      <div class="select">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.close-handle {
  position: absolute;
  top: 0.1em;
  right: 0.1em;
}

.configure-handle {
  position: absolute;
  top: 0.1em;
  right: 2em;
}
.connect-handle {
  position: absolute;
  top: 0.1em;
  right: 4em;
}
</style>
