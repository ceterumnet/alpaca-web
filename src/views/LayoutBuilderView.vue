// Status: Good - Core View 
// This is the layout builder view that: 
// - Manages panel layouts 
// - Handles layout customization 
// - Provides drag-and-drop support 
// - Supports layout persistence 
// - Maintains layout state

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useLayoutStore } from '@/stores/useLayoutStore'
import CustomLayoutBuilder from '@/components/layout/CustomLayoutBuilder.vue'
import LayoutContainer from '@/components/layout/LayoutContainer.vue'
import type { LayoutDefinition, GridLayoutDefinition } from '@/types/layouts/LayoutDefinition'

// State
const mode = ref<'builder' | 'preview'>('builder')
const currentLayoutId = ref<string>('')

// Router
const router = useRouter()
const route = useRoute()
const layoutStore = useLayoutStore()

// Initialize with layout from URL on mount
onMounted(() => {
  console.log('LayoutBuilderView - Mounted, checking for layout ID in URL')
  console.log('LayoutBuilderView - URL query params:', route.query)
  
  if (route.query.layout) {
    const layoutIdFromUrl = route.query.layout as string
    console.log('LayoutBuilderView - Found layout ID in URL:', layoutIdFromUrl)
    
    // Verify the layout exists
    const layoutExists = layoutStore.gridLayouts.some(l => l.id === layoutIdFromUrl)
    console.log(`LayoutBuilderView - Layout ${layoutIdFromUrl} exists in store: ${layoutExists}`, layoutStore.gridLayouts.map(l => l.id))
    
    if (layoutExists) {
      // Set current layout ID
      currentLayoutId.value = layoutIdFromUrl
      console.log('LayoutBuilderView - currentLayoutId is now:', currentLayoutId.value)
    } else {
      console.warn(`LayoutBuilderView - Layout ${layoutIdFromUrl} not found in gridLayouts store`)
      // Try to find in regular layouts
      const legacyLayoutExists = layoutStore.layouts.some(l => l.id === layoutIdFromUrl)
      if (legacyLayoutExists) {
        console.log(`LayoutBuilderView - Layout ${layoutIdFromUrl} found in legacy layouts store`)
        currentLayoutId.value = layoutIdFromUrl
      } else {
        console.error(`LayoutBuilderView - Layout ${layoutIdFromUrl} not found in any store`)
        // Redirect back to panel layout with an error
        router.push({
          path: '/panel-layout',
          query: { error: 'layout-not-found' }
        })
      }
    }
  } else {
    console.log('LayoutBuilderView - No layout ID found in URL')
  }
})

// Handle layout save
function handleLayoutSave(layoutId: string) {
  console.log(`LayoutBuilderView - Layout saved with ID: ${layoutId}`);
  
  // Debug output of layout data from store
  console.log('LayoutBuilderView - Layout from store:', 
    layoutStore.layouts.find((l: LayoutDefinition) => l.id === layoutId));
  console.log('LayoutBuilderView - GridLayout from store:', 
    layoutStore.gridLayouts.find((l: GridLayoutDefinition) => l.id === layoutId));
  
  currentLayoutId.value = layoutId
  
  // Immediately go back to the panel layout
  goToPanelLayout()
}

// Return to builder
function returnToBuilder() {
  mode.value = 'builder'
}

// Go back to panel layout view
function goToPanelLayout() {
  // Always include the current layout ID in the query, whether we're in preview or builder mode
  if (currentLayoutId.value) {
    router.push({
      path: '/panel-layout',
      query: { layout: currentLayoutId.value }
    })
  } else {
    router.push('/panel-layout')
  }
}
</script>

<template>
  <div class="layout-builder-view">
    <!-- <div class="layout-builder-header">
      <h2>{{ mode === 'builder' ? 'Layout Builder' : 'Layout Preview' }}</h2>
      <div class="header-actions">
        <button v-if="mode === 'preview'" class="action-button" @click="returnToBuilder">
          <span class="icon">✏️</span> Edit Layout
        </button>
        <button class="action-button" @click="goToPanelLayout">
          <span class="icon">🔙</span> Back to Panel Layout
        </button>
      </div>
    </div> -->

    <div v-if="mode === 'builder'" class="builder-mode">
      <CustomLayoutBuilder 
        :key="currentLayoutId || 'new-layout'" 
        :layout-id="currentLayoutId || ''" 
        @save="handleLayoutSave" 
      />
    </div>
    <div v-else class="preview-mode">
      <div class="preview-container">
        <template v-if="currentLayoutId">
          <p class="preview-info">Previewing layout: {{ currentLayoutId }}</p>
          <LayoutContainer :layout-id="currentLayoutId" />
        </template>
        <div v-else class="no-layout">
          <p>No layout to preview.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layout-builder-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.layout-builder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: var(--aw-panel-menu-bar-bg-color, #252525);
  border-bottom: 1px solid var(--aw-border-color, #333333);
}

.layout-builder-header h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.action-button {
  padding: 0.3rem 0.75rem;
  background-color: var(--aw-button-bg-color, #333333);
  color: var(--aw-text-color, #ffffff);
  border: 1px solid var(--aw-border-color, #444444);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: all 0.2s ease;
}

.action-button:hover {
  background-color: var(--aw-button-hover-bg-color, #444444);
  border-color: var(--aw-primary-color, #1e88e5);
}

.icon {
  font-size: 0.9rem;
}

.builder-mode,
.preview-mode {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-container {
  flex: 1;
  overflow: auto;
}

.no-layout {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: var(--aw-text-color, #ffffff);
  font-size: 1.2rem;
  opacity: 0.7;
}

.preview-info {
  background-color: rgba(0, 0, 0, 0.2);
  color: var(--aw-text-color, #fff);
  padding: 0.5rem 1rem;
  margin: 0;
  font-size: 0.9rem;
  text-align: center;
}

@media (max-width: 768px) {
  .layout-builder-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
