// Status: Unsure if needed - Core Navigation Component 
// This is the navigation state implementation that: 
// - Shows loading states 
// - Displays transition animations 
// - Indicates active sections 
// - Provides visual feedback for navigation 
// - Integrates with the new navigation system

<script setup lang="ts">
  import { ref, onMounted, onUnmounted, computed } from 'vue'
  import { useRoute } from 'vue-router'
  import Icon from '@/components/ui/Icon.vue'
  import type { IconType } from '@/components/ui/Icon.vue'

  defineOptions({
    name: 'NavigationState'
  })

  // Get route and store
  const route = useRoute()

  // State
  const isLoading = ref(false)
  const activeSection = ref('')
  const transitionState = ref<'entering' | 'leaving' | 'idle'>('idle')

  // Map section to valid icon type
  const sectionIconMap: Record<string, IconType> = {
    devices: 'device-unknown',
    discovery: 'search',
    settings: 'gear',
    home: 'home'
  }

  // Computed property for the section icon
  const sectionIcon = computed((): IconType => {
    return sectionIconMap[activeSection.value] || 'device-unknown'
  })

  // Update active section based on route
  const updateActiveSection = () => {
    const path = route.path
    if (path.startsWith('/devices')) {
      activeSection.value = 'devices'
    } else if (path.startsWith('/discovery')) {
      activeSection.value = 'discovery'
    } else if (path.startsWith('/settings')) {
      activeSection.value = 'settings'
    } else {
      activeSection.value = 'home'
    }
  }

  // Watch for route changes
  const handleRouteChange = () => {
    transitionState.value = 'entering'
    updateActiveSection()

    // Simulate loading state for transitions
    isLoading.value = true
    setTimeout(() => {
      isLoading.value = false
      transitionState.value = 'idle'
    }, 300)
  }

  // Lifecycle hooks
  onMounted(() => {
    updateActiveSection()
    window.addEventListener('popstate', handleRouteChange)
  })

  onUnmounted(() => {
    window.removeEventListener('popstate', handleRouteChange)
  })
</script>

<template>
  <div
    class="aw-navigation-state"
    :class="{
      'aw-navigation-state--loading': isLoading,
      'aw-navigation-state--transitioning': transitionState !== 'idle',
      [`aw-navigation-state--section-${activeSection}`]: true
    }"
  >
    <!-- Loading indicator -->
    <div v-if="isLoading" class="aw-navigation-state__loading-indicator">
      <div class="aw-navigation-state__loading-spinner"></div>
      <span class="aw-navigation-state__loading-text">Loading...</span>
    </div>

    <!-- Active section indicator -->
    <div class="aw-navigation-state__active-section">
      <Icon :type="sectionIcon" class="aw-navigation-state__section-icon" />
      <span class="aw-navigation-state__section-label">{{ activeSection }}</span>
    </div>

    <!-- Transition overlay -->
    <div
      v-if="transitionState !== 'idle'"
      class="aw-navigation-state__transition-overlay"
      :class="transitionState"
    ></div>
  </div>
</template>

<style scoped>
  .aw-navigation-state {
    position: relative;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--aw-panel-bg-color);
    border-bottom: 1px solid var(--aw-panel-border-color);
    transition: all 0.3s ease;
  }

  .aw-navigation-state--loading {
    opacity: 0.7;
  }

  .aw-navigation-state--transitioning {
    pointer-events: none;
  }

  .aw-navigation-state__loading-indicator {
    display: flex;
    align-items: center;
    gap: var(--aw-spacing-sm);
    color: var(--aw-panel-content-color);
    font-size: var(--aw-font-size-sm, 0.875rem);
  }

  .aw-navigation-state__loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--aw-panel-border-color);
    border-top-color: var(--aw-panel-content-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .aw-navigation-state__loading-text {
    font-weight: 500;
  }

  .aw-navigation-state__active-section {
    display: flex;
    align-items: center;
    gap: var(--aw-spacing-sm);
    color: var(--aw-panel-content-color);
    font-size: var(--aw-font-size-sm, 0.875rem);
    font-weight: 500;
  }

  .aw-navigation-state__section-icon {
    width: 16px;
    height: 16px;
    opacity: 0.8;
  }

  .aw-navigation-state__transition-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--aw-panel-bg-color);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .aw-navigation-state__transition-overlay.entering {
    opacity: 0.3;
  }

  .aw-navigation-state__transition-overlay.leaving {
    opacity: 0.3;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Section-specific styles */
  .aw-navigation-state--section-devices {
    border-left: 4px solid var(--aw-color-primary-500);
  }

  .aw-navigation-state--section-discovery {
    border-left: 4px solid var(--aw-color-success-500);
  }

  .aw-navigation-state--section-settings {
    border-left: 4px solid var(--aw-color-warning-500);
  }

  .aw-navigation-state--section-home {
    border-left: 4px solid var(--aw-color-primary-300);
  }

  /* Responsive styles */
  @media (max-width: 768px) {
    .aw-navigation-state {
      height: 24px;
    }

    .aw-navigation-state__section-label {
      display: none;
    }

    .aw-navigation-state__loading-text {
      display: none;
    }
  }
</style>
