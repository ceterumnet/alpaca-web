<template>
  <div class="device-info-section">
    <template v-if="title">
      <div class="device-info-title">{{ title }}</div>
    </template>
    <dl class="device-info-list">
      <template v-for="([label, value], idx) in info" :key="label + idx">
        <dt class="device-info-label">{{ label }}</dt>
        <dd class="device-info-value">{{ value }}</dd>
      </template>
    </dl>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'

defineProps<{
  info: Array<[string, string]>
  title?: string
}>()
</script>

<style scoped>
.device-info-section {
  background: var(--aw-panel-content-bg-color, #f8f9fa);
  border-radius: var(--aw-border-radius-sm, 6px);
  border: 1px solid var(--aw-panel-border-color, #e0e0e0);
  padding: var(--aw-spacing-sm, 12px) var(--aw-spacing-lg, 24px);
  margin: 0;
  font-size: 0.8rem;
  box-shadow: var(--aw-shadow-sm, none);
  overflow-x: auto;
}

.device-info-title {
  font-weight: 600;
  color: var(--aw-text-secondary-color, #888);
  font-size: 1rem;
  margin-bottom: var(--aw-spacing-xs, 8px);
}

.device-info-list {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: var(--aw-spacing-xs, 6px) var(--aw-spacing-lg, 24px);
  margin: 0;
  padding: 0;
  font-size: 0.8rem;
}

.device-info-label {
  font-weight: 500;
  color: var(--aw-text-secondary-color, #888);
  text-align: left;
  padding-right: var(--aw-spacing-sm, 12px);
  white-space: nowrap;
}

.device-info-value {
  color: var(--aw-text-color, #222);
  text-align: right;
  font-variant-numeric: tabular-nums;
  word-break: break-all;
}

@media (width <= 600px) {
  .device-info-list {
    grid-template-columns: 1fr;
  }

  .device-info-label, .device-info-value {
    padding: 4px 0;
  }
}
</style> 