<script setup lang="ts">
import { ref } from 'vue'
import StaticLayoutChooser from '@/components/layout/StaticLayoutChooser.vue'

interface LayoutCell {
  id: string;
  row: number;
  col: number;
  rowSpan?: number;
  colSpan?: number;
  width?: number;
  deviceType?: string | null;
  name?: string;
}

interface LayoutTemplate {
  id: string;
  name: string;
  rows: number;
  cols: number;
  cells: LayoutCell[];
}

const isChoosing = ref(false)
const selectedLayout = ref<LayoutTemplate | null>(null)

function handleLayoutSave(layout: LayoutTemplate) {
  console.log('Layout chosen:', layout)
  isChoosing.value = false
  selectedLayout.value = layout
}

function handleCancel() {
  isChoosing.value = false
}

function startChoosing() {
  isChoosing.value = true
}
</script>

<template>
  <div class="grid-layout-demo">
    <div v-if="!isChoosing" class="grid-layout-demo__intro">
      <h1>Static Layout Chooser Demo</h1>
      <p>
        This demo lets you pick from a set of pre-defined grid layouts and assign devices to each panel.
      </p>
      <div class="grid-layout-demo__actions">
        <button 
          class="aw-button aw-button--primary"
          @click="startChoosing"
        >
          {{ selectedLayout ? 'Choose Another Layout' : 'Choose Layout' }}
        </button>
      </div>
      <div v-if="selectedLayout" class="grid-layout-demo__selected">
        <h2>Selected Layout</h2>
        <pre>{{ selectedLayout }}</pre>
      </div>
    </div>
    <StaticLayoutChooser
      v-if="isChoosing"
      @save="handleLayoutSave"
      @cancel="handleCancel"
    />
  </div>
</template>

<style scoped>
.grid-layout-demo {
  height: 100%;
  padding: 2rem;
}

.grid-layout-demo__intro {
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
}

.grid-layout-demo__intro h1 {
  margin-bottom: 1rem;
}

.grid-layout-demo__actions {
  margin-top: 2rem;
}

.aw-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-weight: 500;
}

.aw-button--primary {
  background-color: var(--aw-color-primary-500);
  color: var(--aw-button-primary-text);
}

.grid-layout-demo__selected {
  margin-top: 2rem;
  text-align: left;
  background: var(--aw-color-neutral-100);
  border-radius: var(--aw-border-radius);
  padding: var(--aw-spacing-md);
  font-size: 0.95rem;
}
</style> 