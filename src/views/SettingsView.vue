<script setup lang="ts">
import SettingsPanelMigrated from '@/components/ui/SettingsPanelMigrated.vue'
</script>

<template>
  <div class="settings-view">
    <SettingsPanelMigrated />
  </div>
</template>

<style scoped>
.settings-view {
  padding: 20px;
  height: calc(100vh - var(--header-height) - 40px);
  overflow: auto;
}
</style>
