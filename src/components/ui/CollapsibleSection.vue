<template>
  <section class="collapsible-section" :class="{ closed: !open }">
    <header class="collapsible-header" @click="toggle">
      <span class="chevron" :class="{ open }">
        <Icon :type="open ? 'chevron-down' : 'chevron-right'" />
      </span>
      <span class="collapsible-title">{{ title }}</span>
    </header>
    <div v-show="open" class="collapsible-content">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch, defineProps, defineEmits } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  title: { type: String, required: true },
  defaultOpen: { type: Boolean, default: true }
})
const emit = defineEmits(['toggle'])
const open = ref(props.defaultOpen)

watch(() => props.defaultOpen, (val) => {
  open.value = val
})

function toggle() {
  open.value = !open.value
  emit('toggle', open.value)
}
</script>

<style scoped>
.collapsible-section {
  background: var(--aw-panel-content-bg-color);
  border-radius: var(--aw-border-radius-sm);
  border: 1px solid var(--aw-panel-border-color);
  /* margin-bottom: var(--aw-spacing-md); */
  box-shadow: var(--aw-shadow-xs, none);
}
.collapsible-header {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: var(--aw-spacing-sm) var(--aw-spacing-md);
  user-select: none;
  font-weight: var(--aw-font-weight-medium, 500);
  font-size: 1rem;
  border-bottom: 1px solid var(--aw-panel-border-color);
  background: var(--aw-panel-header-bg-color, transparent);
}
.chevron {
  display: flex;
  align-items: center;
  margin-right: var(--aw-spacing-sm);
  transition: transform 0.2s;
}
.chevron.open {
  transform: rotate(0deg);
}
.chevron:not(.open) {
  transform: rotate(-90deg);
}
.collapsible-title {
  flex: 1;
  color: var(--aw-text-color);
}
.collapsible-content {
  padding: var(--aw-spacing-md);
}
.closed .collapsible-content {
  display: none;
}
</style> 