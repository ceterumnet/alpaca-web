<script setup lang="ts">
import UIDemoComponent from '@/components/ui-examples/UIDemoComponent.vue'
</script>

<template>
  <div class="ui-demo-view">
    <UIDemoComponent />
  </div>
</template>

<style scoped>
.ui-demo-view {
  height: calc(100vh - var(--header-height));
  overflow: auto;
}
</style>
