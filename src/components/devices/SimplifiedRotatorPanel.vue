<template>
  <div class="simplified-rotator-panel">
    <h3>Rotator: {{ device?.name }}</h3>
    <p>Status: {{ device?.status }}</p>
    <p>(Placeholder Panel)</p>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import type { Device } from '@/stores/types/device-store.types'

export default defineComponent({
  name: 'SimplifiedRotatorPanel',
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
.simplified-rotator-panel {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
</style> 