// Status: Good - Core View 
// This is the settings view that: 
// - Manages application settings 
// - Handles user preferences 
// - Provides configuration options 
// - Supports theme customization 
// - Maintains settings persistence

<script setup lang="ts">
import SettingsPanel from '@/components/ui/SettingsPanel.vue'
</script>

<template>
  <div class="aw-settings-view">
    <SettingsPanel />
  </div>
</template>

<style scoped>
.aw-settings-view {
  padding: var(--aw-spacing-md);
  height: calc(100vh - var(--header-height) - var(--aw-spacing-md) * 2);
  overflow: auto;
  color: var(--aw-text-color);
}

.aw-prototype-section {
  margin-top: var(--aw-spacing-xl);
  padding: var(--aw-spacing-md);
  background-color: var(--aw-panel-bg-color);
  border-radius: var(--aw-border-radius-md);
  border: 1px dashed var(--aw-color-primary-500);
  box-shadow: var(--aw-shadow-sm);
}

.aw-prototype-section__title {
  margin-top: 0;
  color: var(--aw-color-primary-500);
  font-size: 1.25rem;
}

.aw-prototype-section__description {
  margin: var(--aw-spacing-xs) 0 0;
  font-size: 0.9rem;
  color: var(--aw-text-secondary-color);
}

.aw-prototype-links {
  margin-top: var(--aw-spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--aw-spacing-sm);
}

.aw-prototype-link {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-md);
  padding: var(--aw-spacing-md);
  background-color: var(--aw-panel-content-bg-color);
  border-radius: var(--aw-border-radius-md);
  border: 1px solid var(--aw-panel-border-color);
  text-decoration: none;
  color: var(--aw-text-color);
  transition: all 0.2s ease;
}

.aw-prototype-link:hover {
  transform: translateY(-2px);
  box-shadow: var(--aw-shadow-md);
  border-color: var(--aw-color-primary-500);
}

.aw-prototype-link__icon {
  font-size: 2rem;
  color: var(--aw-color-primary-500);
}

.aw-prototype-link__title {
  margin: 0 0 var(--aw-spacing-xs) 0;
  font-size: 1.1rem;
  color: var(--aw-color-primary-500);
}

.aw-prototype-link__description {
  margin: 0;
  font-size: 0.9rem;
  color: var(--aw-text-secondary-color);
}
</style>
