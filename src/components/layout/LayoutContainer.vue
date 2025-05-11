// Status: Good - Core Component // This is the layout container component that: // - Provides base
layout structure // - Handles layout organization // - Supports responsive design // - Manages
layout state // - Maintains layout consistency

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useLayoutStore } from '@/stores/useLayoutStore'
import type { PanelPosition } from '@/types/layouts/LayoutDefinition'

const props = defineProps<{
  layoutId: string
}>()

const layoutStore = useLayoutStore()

// Local computed properties to ensure reactivity
const currentLayout = computed(() => {
  console.log('Computing currentLayout with layoutId:', props.layoutId)
  return layoutStore.layouts.find(layout => layout.id === props.layoutId) || null
})

const currentDeviceLayout = computed(() => {
  if (!currentLayout.value) return null
  console.log('Computing currentDeviceLayout for viewport:', layoutStore.currentViewport)
  return currentLayout.value.layouts.find(layout => layout.deviceType === layoutStore.currentViewport) || null
})

// Watch for changes in the layoutId prop
watch(
  () => props.layoutId,
  (newLayoutId) => {
    console.log('LayoutContainer - Layout ID changed:', newLayoutId)
    console.log('LayoutContainer - Available layouts:', layoutStore.layouts.map(l => l.id))
    layoutStore.setCurrentLayout(newLayoutId)
  }
)

// Set the current layout when component is mounted
onMounted(() => {
  console.log('LayoutContainer - Mounted with layout ID:', props.layoutId)
  console.log('LayoutContainer - Available layouts:', layoutStore.layouts.map(l => l.id))
  layoutStore.setCurrentLayout(props.layoutId)
})

// Computed watchers for debugging
watch(
  () => layoutStore.currentLayout,
  (layout) => {
    console.log('LayoutContainer - Current layout changed:', layout?.id)
  }
)

watch(
  () => layoutStore.currentDeviceLayout,
  (deviceLayout) => {
    console.log('LayoutContainer - Current device layout changed:', 
      deviceLayout ? `${deviceLayout.deviceType} with ${deviceLayout.positions.length} panels` : 'null')
  }
)

// Debug current positions
watch(currentDeviceLayout, (deviceLayout) => {
  if (deviceLayout) {
    console.log(`LayoutContainer - Current device (${deviceLayout.deviceType}) positions:`, 
      deviceLayout.positions.map(p => `${p.panelId}: (${p.x},${p.y}) ${p.width}x${p.height}`))
  }
}, { immediate: true })

// Determine if we're in a mobile view
const isMobileView = computed(() => layoutStore.currentViewport === 'mobile')

// Generate inline styles for each panel based on its position
function getPanelStyle(position: PanelPosition) {
  if (isMobileView.value) {
    // In mobile view, stack panels vertically
    return {
      gridColumnStart: 1,
      gridColumnEnd: -1,
      gridRowStart: 'auto',
      gridRowEnd: 'auto'
    }
  }

  return {
    gridColumnStart: position.x + 1,
    gridColumnEnd: position.x + position.width + 1,
    gridRowStart: position.y + 1,
    gridRowEnd: position.y + position.height + 1
  }
}

// Get device type from panel ID
function getPanelDeviceType(panelId: string): string {
  // Map common panel IDs to their device types
  const panelTypeMap: Record<string, string> = {
    camera: 'camera',
    telescope: 'telescope',
    focuser: 'focuser',
    filterwheel: 'filterwheel',
    dome: 'dome',
    rotator: 'rotator',
    weather: 'observingconditions'
  }

  // Return the device type if it's in our map, otherwise default to the panelId itself
  return panelTypeMap[panelId] || panelId
}
</script>

<template>
  <div :key="props.layoutId" class="aw-layout-container" :class="{ 'aw-layout-container--mobile': isMobileView }">
    <div v-if="currentLayout && currentDeviceLayout" class="aw-layout-container__grid">
      <div
        v-for="position in currentDeviceLayout.positions"
        :key="position.panelId"
        class="aw-layout-container__panel"
        :style="getPanelStyle(position)"
      >
        <!-- Use slot if provided, otherwise fall back to BasePanel -->
        <slot :name="position.panelId" :position="position">
          <!-- Fallback content when slot not provided -->
          <BasePanel
            :panel-id="position.panelId"
            :device-type="getPanelDeviceType(position.panelId)"
            :title="
              getPanelDeviceType(position.panelId).charAt(0).toUpperCase() +
              getPanelDeviceType(position.panelId).slice(1)
            "
          />
        </slot>
      </div>
    </div>
    <div v-else class="aw-layout-container__empty">
      <p>No layout selected or available.</p>
    </div>
  </div>
</template>

<style scoped>
.aw-layout-container {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.aw-layout-container__grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-auto-rows: minmax(100px, auto);
  gap: var(--aw-spacing-sm);
  padding: var(--aw-spacing-sm);
  min-height: 100%;
}

.aw-layout-container__panel {
  background-color: var(--aw-panel-bg-color);
  border-radius: var(--aw-border-radius-sm);
  overflow: hidden;
  box-shadow: var(--aw-shadow-sm);
}

/* Mobile view */
.aw-layout-container--mobile .aw-layout-container__grid {
  display: flex;
  flex-direction: column;
  gap: var(--aw-spacing-sm);
}

.aw-layout-container--mobile .aw-layout-container__panel {
  width: 100%;
  margin-bottom: var(--aw-spacing-sm);
}

.aw-layout-container__empty {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: var(--aw-panel-content-color);
  font-size: var(--aw-font-size-lg, 1.125rem);
  opacity: 0.7;
}
</style>
