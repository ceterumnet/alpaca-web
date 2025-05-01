// Status: Good - Core Component // This is the responsive panel implementation that: // - Adapts
panel layout to available space // - Manages feature visibility based on priority // - Handles
collapsible sections and grouping // - Provides dynamic component resolution // - Implements proper
event handling /** * Responsive Panel Component * * Provides responsive layout and feature
management for device panels */
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, provide } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { PriorityLevel } from '@/types/panels/FeatureTypes'
import type { PanelFeatureDefinition, VisibilityRule } from '@/types/panels/FeatureTypes'
import CollapsibleSection from './features/CollapsibleSection.vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  deviceType: {
    type: String,
    default: 'generic'
  },
  features: {
    type: Array as () => PanelFeatureDefinition[],
    required: true
  },
  minContentWidth: {
    type: Number,
    default: 320
  },
  maxContentWidth: {
    type: Number,
    default: 800
  },
  componentsMap: {
    type: Object as () => Record<string, unknown>,
    default: () => ({})
  }
})

const emit = defineEmits(['featuresChanged'])

// Panel DOM element reference
const panelRef = ref<HTMLElement | null>(null)
const contentWidth = ref(0)
const sizeMode = ref<'compact' | 'standard' | 'expanded'>('standard')
const featuresBySection = ref<Record<string, PanelFeatureDefinition[]>>({})
const store = useUnifiedStore()

// Provide components map to child components if needed
provide('componentsMap', props.componentsMap)

// Computed widths for responsive design
const compactThreshold = computed(() => props.minContentWidth + 80)
const expandedThreshold = computed(() => props.maxContentWidth - 120)

// Evaluate visibility rules for a feature
const evaluateVisibilityRules = (feature: PanelFeatureDefinition): boolean => {
  // If no visibility rules, feature is always visible
  if (!feature.visibilityRules || feature.visibilityRules.length === 0) {
    return true
  }

  // Get device properties
  const deviceProps = store.getDeviceById(props.deviceId)?.properties || {}

  // Evaluate each rule - all rules must pass for the feature to be visible
  return feature.visibilityRules.every((rule: VisibilityRule) => {
    if (rule.type === 'deviceProperty' && rule.property) {
      const propertyValue = deviceProps[rule.property]

      switch (rule.condition) {
        case 'equals':
          return propertyValue === rule.value
        case 'notEquals':
          return propertyValue !== rule.value
        case 'greaterThan':
          return (
            typeof propertyValue === 'number' &&
            typeof rule.value === 'number' &&
            propertyValue > rule.value
          )
        case 'lessThan':
          return (
            typeof propertyValue === 'number' &&
            typeof rule.value === 'number' &&
            propertyValue < rule.value
          )
        case 'contains':
          return Array.isArray(propertyValue) && propertyValue.includes(rule.value)
        default:
          return true
      }
    }

    // For other rule types, default to visible
    return true
  })
}

// Features to display based on space and visibility rules
const visibleFeatures = computed(() => {
  // First filter by priority based on size mode
  let filteredFeatures: PanelFeatureDefinition[] = []

  // In compact mode, only show primary features
  if (sizeMode.value === 'compact') {
    filteredFeatures = props.features.filter(
      (feature) => feature.priority === PriorityLevel.Primary
    )
  }
  // In standard mode, show primary and secondary features
  else if (sizeMode.value === 'standard') {
    filteredFeatures = props.features.filter(
      (feature) =>
        feature.priority === PriorityLevel.Primary || feature.priority === PriorityLevel.Secondary
    )
  }
  // In expanded mode, show all features
  else {
    filteredFeatures = [...props.features]
  }

  // Then apply visibility rules
  return filteredFeatures.filter(evaluateVisibilityRules)
})

// Group features by section
watch(
  () => visibleFeatures.value,
  (features) => {
    const grouped: Record<string, PanelFeatureDefinition[]> = {}

    features.forEach((feature) => {
      const section = feature.section || 'default'
      if (!grouped[section]) {
        grouped[section] = []
      }
      grouped[section].push(feature)
    })

    featuresBySection.value = grouped
    emit('featuresChanged', features)
  },
  { immediate: true }
)

// Update size mode based on container width
const updateSizeMode = () => {
  if (!panelRef.value) return

  contentWidth.value = panelRef.value.clientWidth

  if (contentWidth.value <= compactThreshold.value) {
    sizeMode.value = 'compact'
  } else if (contentWidth.value >= expandedThreshold.value) {
    sizeMode.value = 'expanded'
  } else {
    sizeMode.value = 'standard'
  }
}

// Use resize observer to track panel size changes
useResizeObserver(panelRef, () => {
  updateSizeMode()
})

// Initial setup
onMounted(() => {
  updateSizeMode()
  window.addEventListener('resize', updateSizeMode)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateSizeMode)
})

// Get priority label for sections
const getSectionPriority = (sectionName: string): 'primary' | 'secondary' | 'tertiary' => {
  // Find the highest priority feature in this section
  const features = featuresBySection.value[sectionName] || []

  if (features.some((f) => f.priority === PriorityLevel.Primary)) {
    return 'primary'
  }

  if (features.some((f) => f.priority === PriorityLevel.Secondary)) {
    return 'secondary'
  }

  return 'tertiary'
}

// Get section icon (use first feature with icon)
const getSectionIcon = (sectionName: string): string => {
  const features = featuresBySection.value[sectionName] || []
  const featureWithIcon = features.find((f) => f.icon)
  return featureWithIcon?.icon || ''
}

// Format section title
const formatSectionTitle = (section: string): string => {
  if (section === 'default') return 'General'

  // Convert camelCase to Title Case
  return section.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())
}

// Helper function to resolve component from string or component reference
const resolveFeatureComponent = (component: string | object): unknown => {
  if (typeof component === 'string') {
    // Try to find the component in the provided componentsMap
    return props.componentsMap[component] || component
  }
  return component
}
</script>

<template>
  <div ref="panelRef" class="responsive-panel" :class="`size-${sizeMode}`">
    <div class="panel-header">
      <h2 class="panel-title">{{ title }}</h2>
      <div class="panel-mode-indicator">{{ sizeMode }}</div>
    </div>

    <div class="panel-content">
      <!-- Render components from slot for registration -->
      <div style="display: none">
        <slot name="components"></slot>
      </div>

      <!-- Render features grouped by section -->
      <template v-for="(features, section) in featuresBySection" :key="section">
        <CollapsibleSection
          :title="formatSectionTitle(section)"
          :icon="getSectionIcon(section)"
          :priority="getSectionPriority(section)"
          :open="section === 'default' || getSectionPriority(section) === 'primary'"
          class="feature-section"
        >
          <div class="features-container">
            <div
              v-for="feature in features"
              :key="feature.id"
              class="feature-wrapper"
              :class="`priority-${feature.priority}`"
            >
              <!-- Use resolveFeatureComponent to handle string component names -->
              <component
                :is="resolveFeatureComponent(feature.component)"
                v-bind="{ ...feature.props, deviceId, deviceType }"
              />
            </div>
          </div>
        </CollapsibleSection>
      </template>
    </div>
  </div>
</template>

<style scoped>
.responsive-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  background-color: var(--color-background);
  transition: all 0.3s ease;
  width: 100%;
  height: 100%;
  color: var(--color-text);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
}

.panel-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-heading);
}

.panel-mode-indicator {
  font-size: 0.8rem;
  padding: 2px 8px;
  background-color: var(--color-background-mute);
  border-radius: 12px;
  color: var(--color-text);
  text-transform: capitalize;
  font-weight: 500;
}

.panel-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background-color: var(--color-background);
}

.feature-section {
  width: 100%;
}

.features-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

/* Size mode specific styles */
.size-compact .features-container {
  grid-template-columns: 1fr;
}

.size-standard .features-container {
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

.size-expanded .features-container {
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
}

/* Feature priority styles */
.feature-wrapper {
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.feature-wrapper:hover {
  background-color: var(--color-background-soft);
}

.priority-primary {
  order: 1;
}

.priority-secondary {
  order: 2;
}

.priority-tertiary {
  order: 3;
}
</style>
