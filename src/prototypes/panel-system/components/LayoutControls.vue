// Status: Legacy - Prototype Component // This is the layout controls prototype that: // - Tests
layout template selection // - Provides template visualization // - Demonstrates layout switching //
- NOTE: Superseded by new panel system implementation

<script setup lang="ts">
// Define the template interface
interface Template {
  id: string
  name: string
  icon: string
}

// Define props
interface Props {
  templates: Template[]
  selectedTemplate: string
}

defineProps<Props>()

// Define emits
const emit = defineEmits<{
  (e: 'select-template', templateId: string): void
}>()

// Select a template
function selectTemplate(templateId: string) {
  emit('select-template', templateId)
}
</script>

<template>
  <div class="layout-controls">
    <h2 class="layout-title">Layout Template</h2>

    <div class="templates-list">
      <button
        v-for="template in templates"
        :key="template.id"
        class="template-button"
        :class="{ active: selectedTemplate === template.id }"
        :title="template.name"
        @click="selectTemplate(template.id)"
      >
        <span class="template-icon">{{ template.icon }}</span>
        <span class="template-name">{{ template.name }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.layout-controls {
  padding: 1rem;
  background-color: var(--aw-panel-content-bg-color);
  border-bottom: 1px solid var(--aw-panel-border-color);
}

.layout-title {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 500;
  color: var(--aw-text-secondary-color);
}

.templates-list {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.template-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 0.375rem;
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-text-color);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.template-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-color: var(--aw-primary-color);
}

.template-button.active {
  background-color: var(--aw-primary-color);
  color: white;
  border-color: var(--aw-primary-color);
}

.template-icon {
  font-size: 1.125rem;
}

@media (max-width: 768px) {
  .layout-controls {
    padding: 0.75rem;
  }

  .template-button {
    padding: 0.4rem 0.6rem;
  }
}

@media (max-width: 480px) {
  .templates-list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
}
</style>
