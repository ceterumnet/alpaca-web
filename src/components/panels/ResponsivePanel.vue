// Status: Good - Core Component 
// This is the responsive panel implementation that: 
// - Adapts panel layout to available space 
// - Manages feature visibility based on priority 
// - Handles collapsible sections and grouping 
// - Provides dynamic component resolution 
// - Implements proper event handling 

/*
 * Responsive Panel Component 
 * Provides responsive layout and feature
 * management for device panels 
 */
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, provide, reactive } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { PriorityLevel } from '@/types/panels/FeatureTypes'
import type { PanelFeatureDefinition, VisibilityRule } from '@/types/panels/FeatureTypes'
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
  },
  sectionColSpans: {
    type: Object as () => Record<string, number>,
    default: () => ({})
  }
})

const emit = defineEmits(['featuresChanged'])

const panelRef = ref<HTMLElement | null>(null)
const contentWidth = ref(0)
const sizeMode = ref<'compact' | 'standard' | 'expanded'>('standard')
const featuresBySection = ref<Record<string, PanelFeatureDefinition[]>>({})
const store = useUnifiedStore()

provide('componentsMap', props.componentsMap)

const compactThreshold = computed(() => props.minContentWidth + 80)
const expandedThreshold = computed(() => props.maxContentWidth - 120)

const evaluateVisibilityRules = (feature: PanelFeatureDefinition): boolean => {
  if (!feature.visibilityRules || feature.visibilityRules.length === 0) {
    return true
  }
  const deviceProps = store.getDeviceById(props.deviceId)?.properties || {}
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
    return true
  })
}

const visibleFeatures = computed(() => {
  let filteredFeatures: PanelFeatureDefinition[] = []
  if (sizeMode.value === 'compact') {
    filteredFeatures = props.features.filter(
      (feature) => feature.priority === PriorityLevel.Primary
    )
  } else if (sizeMode.value === 'standard') {
    filteredFeatures = props.features.filter(
      (feature) =>
        feature.priority === PriorityLevel.Primary || feature.priority === PriorityLevel.Secondary
    )
  } else {
    filteredFeatures = [...props.features]
  }
  return filteredFeatures.filter(evaluateVisibilityRules)
})

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

useResizeObserver(panelRef, () => {
  updateSizeMode()
})

onMounted(() => {
  updateSizeMode()
  window.addEventListener('resize', updateSizeMode)
})
onUnmounted(() => {
  window.removeEventListener('resize', updateSizeMode)
})

const getSectionPriority = (sectionName: string): 'primary' | 'secondary' | 'tertiary' => {
  const features = featuresBySection.value[sectionName] || []
  if (features.some((f) => f.priority === PriorityLevel.Primary)) {
    return 'primary'
  }
  if (features.some((f) => f.priority === PriorityLevel.Secondary)) {
    return 'secondary'
  }
  return 'tertiary'
}

const getSectionIcon = (sectionName: string): string => {
  const features = featuresBySection.value[sectionName] || []
  const featureWithIcon = features.find((f) => f.icon)
  return featureWithIcon?.icon || ''
}

const formatSectionTitle = (section: string): string => {
  if (section === 'default') return 'General'
  return section.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())
}

const resolveFeatureComponent = (component: string | object): unknown => {
  if (typeof component === 'string') {
    return props.componentsMap[component] || component
  }
  return component
}

// Collapsible section state
const openSections = reactive<Record<string, boolean>>({})
watch(
  () => featuresBySection.value,
  (sections) => {
    Object.keys(sections).forEach((section) => {
      if (!(section in openSections)) openSections[section] = true
    })
  },
  { immediate: true }
)
const toggleSection = (section: string) => {
  openSections[section] = !openSections[section]
}
</script>

<template>
  <div ref="panelRef" class="aw-panel aw-panel--responsive" :class="`aw-panel--size-${sizeMode}`">
    <div class="aw-panel__header">
      <h2 class="aw-panel__title">{{ title }}</h2>
      <div class="aw-panel__mode-indicator">{{ sizeMode }}</div>
    </div>
    <div class="aw-panel__content aw-panel__content--grid">
      <div style="display: none">
        <slot name="components"></slot>
      </div>
      <div
        v-for="(features, section) in featuresBySection"
        :key="section"
        class="aw-section__card"
        :class="[`aw-section__card--${getSectionPriority(section)}`]"
        :style="{
          gridColumn: props.sectionColSpans[section]
            ? `span ${props.sectionColSpans[section]}`
            : undefined
        }"
      >
        <div
          class="aw-section__header"
          :class="{ open: openSections[section] }"
          @click="toggleSection(section)"
        >
          <span v-if="getSectionIcon(section)" class="aw-section__icon">
            <i :class="`icon-${getSectionIcon(section)}`"></i>
          </span>
          <span class="aw-section__title">{{ formatSectionTitle(section) }}</span>
          <span class="aw-section__chevron">{{ openSections[section] ? '▼' : '▶' }}</span>
        </div>
        <div v-if="openSections[section]" class="aw-section__features">
          <div
            v-for="feature in features"
            :key="feature.id"
            class="aw-section__feature aw-feature"
            :class="[`aw-feature--priority-${feature.priority}`]"
          >
            <component
              :is="resolveFeatureComponent(feature.component)"
              v-bind="{ ...feature.props, deviceId, deviceType }"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.aw-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--aw-color-border);
  border-radius: 8px;
  overflow: hidden;
  background-color: var(--aw-panel-background);
  transition: all 0.3s ease;
  width: 100%;
  height: 100%;
  color: var(--aw-color-text-primary);
}

.aw-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--aw-spacing-md) var(--aw-spacing-lg);
  background-color: var(--aw-panel-header-background);
  border-bottom: 1px solid var(--aw-color-border);
}

.aw-panel__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--aw-panel-header-text);
}

.aw-panel__mode-indicator {
  font-size: 0.8rem;
  padding: 2px 8px;
  background-color: var(--aw-color-background);
  border-radius: 12px;
  color: var(--aw-color-text-secondary);
  text-transform: capitalize;
  font-weight: 500;
}

.aw-panel__content {
  flex: 1;
  padding: var(--aw-spacing-lg);
  overflow-y: auto;
  background-color: var(--aw-panel-background);
}

.aw-panel__content--grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--aw-spacing-lg);
}

.aw-section__card {
  display: flex;
  flex-direction: column;
  background: var(--aw-color-surface);
  border-radius: 8px;
  border: 1px solid var(--aw-color-border);
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
  transition: box-shadow 0.2s;
}

.aw-section__card--primary {
  border-color: var(--aw-color-primary-light);
}
.aw-section__card--secondary {
  border-color: var(--aw-color-border);
}
.aw-section__card--tertiary {
  border-color: var(--aw-color-border);
}

.aw-section__header {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-md);
  font-weight: 600;
  background: var(--aw-color-background);
  border-radius: 8px 8px 0 0;
  padding: var(--aw-spacing-sm) var(--aw-spacing-md);
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid var(--aw-color-border);
  transition: background 0.2s;
}
.aw-section__header.open {
  background: var(--aw-color-surface);
}
.aw-section__icon {
  color: var(--aw-color-text-secondary);
}
.aw-section__title {
  font-size: 1rem;
  color: var(--aw-color-text-primary);
}
.aw-section__chevron {
  margin-left: auto;
  font-size: 1.1em;
  color: var(--aw-color-text-secondary);
}

.aw-section__features {
  display: flex;
  flex-direction: column;
  gap: var(--aw-spacing-md);
  padding: var(--aw-spacing-md);
}

.aw-section__feature {
  background: var(--aw-color-surface);
  border-radius: 6px;
  padding: var(--aw-spacing-md);
  border: 1px solid var(--aw-color-border);
  transition: background 0.2s;
  color: var(--aw-color-text-primary);
}
.aw-section__feature:hover {
  background: var(--aw-color-primary-light);
}

.aw-feature--priority-primary {
  border-left: 4px solid var(--aw-color-primary);
}
.aw-feature--priority-secondary {
  border-left: 4px solid var(--aw-color-success);
}
.aw-feature--priority-tertiary {
  border-left: 4px solid var(--aw-color-border);
}
</style>
