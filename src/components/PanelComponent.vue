<script setup lang="ts">
const props = defineProps({
  panelName: { type: String, required: true }
})

props.panelName // string
</script>
<template>
  <div class="panel-container">
    <div class="vue-draggable-handle panel-title">
      <span>{{ panelName }}</span>
      <span class="close-handle">X</span>
    </div>
    <div class="no-drag">
      <div class="select" style="margin: 0 0.5em 0 0.5em">
        and more and more .. and more and more .. and more and more .. and more and more .. and more
        and more .. and more and more .. and more and more .. and more and more .. and more and more
        .. and more and more .. and more and more .. a bunch of stuff inside of here...
      </div>
    </div>
  </div>
</template>

<style scoped>
.close-handle {
  position: absolute;
  right: 0.5em;
}
</style>
