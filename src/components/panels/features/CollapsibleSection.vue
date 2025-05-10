<script setup lang="ts">
import { ref, computed } from 'vue'
import Icon from '@/components/ui/Icon.vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: ''
  },
  open: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    default: 'primary',
    validator: (value: string) => ['primary', 'secondary', 'tertiary'].includes(value)
  }
})

const isOpen = ref(props.open)

function toggleSection() {
  isOpen.value = !isOpen.value
}

const sectionClasses = computed(() => ({
  'is-open': isOpen.value,
  [`priority-${props.priority}`]: true
}))
</script>

<template>
  <div class="collapsible-section" :class="sectionClasses">
    <div class="section-header" @click="toggleSection">
      <div class="header-content">
        <Icon v-if="icon" :name="icon" class="section-icon" />
        <h3 class="section-title">{{ title }}</h3>
      </div>
      <Icon :name="isOpen ? 'chevron-up' : 'chevron-down'" class="toggle-icon" />
    </div>
    <div v-show="isOpen" class="section-content">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.collapsible-section {
  border: 1px solid var(--aw-panel-border-color, var(--color-border));
  border-radius: var(--aw-border-radius-lg, 6px);
  margin-bottom: var(--aw-spacing-md, 16px);
  background-color: var(--aw-panel-content-bg-color, var(--color-background-soft));
  transition: all 0.2s ease;
  color: var(--aw-panel-content-color, var(--color-text));
}

.collapsible-section.is-open {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section-header {
  padding: var(--aw-spacing-sm, 12px) var(--aw-spacing-md, 16px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.header-content {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-sm, 8px);
}

.section-icon {
  color: var(--aw-text-secondary-color, var(--color-text-secondary));
}

.section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--aw-heading-color, var(--color-heading));
}

.toggle-icon {
  font-size: 1.2rem;
  color: var(--aw-text-secondary-color, var(--color-text-secondary));
  transition: transform 0.3s ease;
}

.section-content {
  padding: 0 var(--aw-spacing-md, 16px) var(--aw-spacing-md, 16px);
  border-top: 1px solid var(--aw-panel-border-light-color, var(--color-border-light));
}

/* Priority styles */
.priority-primary {
  border-color: var(--aw-color-primary-300, var(--color-primary-light));
}

.priority-primary .section-header {
  background-color: var(--aw-color-primary-100, var(--color-primary-lighter));
}

.priority-primary .section-title {
  color: var(--aw-color-primary-700, var(--color-primary-dark));
}

.priority-secondary {
  border-color: var(--aw-panel-border-color, var(--color-border));
}

.priority-tertiary {
  border-color: var(--aw-panel-border-light-color, var(--color-border-light));
  background-color: var(--aw-panel-bg-color, var(--color-background));
}

.priority-tertiary .section-title {
  color: var(--aw-panel-content-color, var(--color-text));
  font-weight: 500;
}
</style>
