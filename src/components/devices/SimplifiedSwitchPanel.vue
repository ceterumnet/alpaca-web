<template>
  <div class="simplified-switch-panel">
    <h3>Switch: {{ device?.name }}</h3>
    <p>Status: {{ device?.status }}</p>
    <p>(Placeholder Panel)</p>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import type { Device } from '@/stores/types/device-store.types'

export default defineComponent({
  name: 'SimplifiedSwitchPanel',
  props: {
    device: {
      type: Object as PropType<Device>,
      required: true
    }
  },
  setup() {
    // Basic setup, can be expanded later
    return {
      // reactive properties or methods
    }
  }
})
</script>

<style scoped>
.simplified-switch-panel {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
</style> 