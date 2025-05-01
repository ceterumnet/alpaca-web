// Status: Legacy - Prototype Component // This is the panel definition viewer prototype that: // -
Visualizes panel definitions // - Tests UI mode filtering // - Shows feature priorities // -
Demonstrates interaction types // - NOTE: Superseded by new panel system implementation

<script setup lang="ts">
import { ref, computed } from 'vue'
import { UIMode } from '@/stores/useUIPreferencesStore'
import PanelDefinitions, { InteractionType, type PanelFeature } from '../panel-definitions'

// Define type for known keys in PanelDefinitions
type DeviceType = keyof typeof PanelDefinitions

// Device types available
const deviceTypes = Object.keys(PanelDefinitions) as DeviceType[]
const selectedDeviceType = ref<DeviceType>('camera')

// UI modes for filtering
const uiModes = [
  { value: UIMode.OVERVIEW, label: 'Overview' },
  { value: UIMode.DETAILED, label: 'Detailed' },
  { value: UIMode.FULLSCREEN, label: 'Fullscreen' }
]
const selectedUIMode = ref(UIMode.DETAILED)

// Get the panel definition based on selection
const panelDefinition = computed(() => {
  return PanelDefinitions[selectedDeviceType.value]
})

// Filter features based on the selected UI mode
const visibleFeatures = computed(() => {
  if (!panelDefinition.value) return { primary: [], secondary: [], tertiary: [] }

  const features = panelDefinition.value.features.filter(
    (feature: PanelFeature) => feature.modes.includes(selectedUIMode.value) && !feature.disabled
  )

  // Group by priority
  return {
    primary: features.filter((f: PanelFeature) => f.priority === 'primary'),
    secondary: features.filter((f: PanelFeature) => f.priority === 'secondary'),
    tertiary: features.filter((f: PanelFeature) => f.priority === 'tertiary')
  }
})

// Get the interaction type label
function getInteractionTypeLabel(type: InteractionType | undefined) {
  if (!type) return 'N/A'

  switch (type) {
    case InteractionType.ACTION:
      return 'Action'
    case InteractionType.DYNAMIC_DATA:
      return 'Dynamic Data'
    case InteractionType.SETTING:
      return 'Setting'
    case InteractionType.MODE:
      return 'Mode'
    case InteractionType.FEATURE:
      return 'Extended Feature'
    default:
      return 'Unknown'
  }
}

// Check if a feature would be conditionally visible
function getConditionalVisibility(feature: PanelFeature) {
  if (!feature.visibleWhen) return 'Always visible'

  const conditions = Object.entries(feature.visibleWhen)
    .map(([key, value]) => `${key} = ${value}`)
    .join(' and ')

  return `Visible when: ${conditions}`
}

// Get source label
function getSourceLabel(feature: PanelFeature) {
  return feature.isExtended ? 'Extended' : 'Core Alpaca'
}
</script>

<template>
  <div class="panel-definition-viewer">
    <div class="controls">
      <div class="select-group">
        <label for="device-type">Device Type:</label>
        <select id="device-type" v-model="selectedDeviceType">
          <option v-for="type in deviceTypes" :key="type" :value="type">
            {{ type.charAt(0).toUpperCase() + type.slice(1) }}
          </option>
        </select>
      </div>

      <div class="select-group">
        <label for="ui-mode">UI Mode:</label>
        <select id="ui-mode" v-model="selectedUIMode">
          <option v-for="mode in uiModes" :key="mode.value" :value="mode.value">
            {{ mode.label }}
          </option>
        </select>
      </div>
    </div>

    <div class="panel-info">
      <h2>{{ panelDefinition.name }} Panel</h2>
      <p>{{ panelDefinition.description }}</p>
    </div>

    <div class="features-container">
      <div class="feature-group">
        <h3 class="priority-heading primary">Primary Features</h3>
        <p class="priority-description">
          Essential controls required for basic operation, always visible on all screen sizes
        </p>
        <div class="feature-list">
          <div
            v-for="feature in visibleFeatures.primary"
            :key="feature.id"
            class="feature-card primary"
          >
            <div class="feature-header">
              <h4>{{ feature.name }}</h4>
              <span class="feature-type">{{
                getInteractionTypeLabel(feature.interactionType)
              }}</span>
              <span class="feature-source">{{ getSourceLabel(feature) }}</span>
            </div>
            <p>{{ feature.description }}</p>
            <div v-if="feature.alpacaMethod || feature.alpacaProperty" class="feature-api">
              <span v-if="feature.alpacaMethod">Method: {{ feature.alpacaMethod }}</span>
              <span v-if="feature.alpacaProperty">Property: {{ feature.alpacaProperty }}</span>
            </div>
            <div v-if="feature.visibleWhen" class="feature-visibility">
              <span>{{ getConditionalVisibility(feature) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="feature-group">
        <h3 class="priority-heading secondary">Secondary Features</h3>
        <p class="priority-description">
          Important but not essential features, visible on medium and large screens
        </p>
        <div class="feature-list">
          <div
            v-for="feature in visibleFeatures.secondary"
            :key="feature.id"
            class="feature-card secondary"
          >
            <div class="feature-header">
              <h4>{{ feature.name }}</h4>
              <span class="feature-type">{{
                getInteractionTypeLabel(feature.interactionType)
              }}</span>
              <span class="feature-source">{{ getSourceLabel(feature) }}</span>
            </div>
            <p>{{ feature.description }}</p>
            <div v-if="feature.alpacaMethod || feature.alpacaProperty" class="feature-api">
              <span v-if="feature.alpacaMethod">Method: {{ feature.alpacaMethod }}</span>
              <span v-if="feature.alpacaProperty">Property: {{ feature.alpacaProperty }}</span>
            </div>
            <div v-if="feature.visibleWhen" class="feature-visibility">
              <span>{{ getConditionalVisibility(feature) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="feature-group">
        <h3 class="priority-heading tertiary">Tertiary Features</h3>
        <p class="priority-description">
          Advanced or specialized features, may be collapsed on smaller screens
        </p>
        <div class="feature-list">
          <div
            v-for="feature in visibleFeatures.tertiary"
            :key="feature.id"
            class="feature-card tertiary"
          >
            <div class="feature-header">
              <h4>{{ feature.name }}</h4>
              <span class="feature-type">{{
                getInteractionTypeLabel(feature.interactionType)
              }}</span>
              <span class="feature-source">{{ getSourceLabel(feature) }}</span>
            </div>
            <p>{{ feature.description }}</p>
            <div v-if="feature.alpacaMethod || feature.alpacaProperty" class="feature-api">
              <span v-if="feature.alpacaMethod">Method: {{ feature.alpacaMethod }}</span>
              <span v-if="feature.alpacaProperty">Property: {{ feature.alpacaProperty }}</span>
            </div>
            <div v-if="feature.visibleWhen" class="feature-visibility">
              <span>{{ getConditionalVisibility(feature) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel-definition-viewer {
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.select-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.select-group select {
  padding: 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid var(--aw-panel-border-color);
  background-color: var(--aw-bg-color);
  color: var(--aw-text-color);
}

.panel-info {
  margin-bottom: 2rem;
}

.features-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.priority-heading {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
}

.priority-heading.primary {
  color: var(--aw-primary-color);
}

.priority-heading.secondary {
  color: var(--aw-secondary-color);
}

.priority-heading.tertiary {
  color: var(--aw-muted-color);
}

.priority-description {
  margin-bottom: 1rem;
  font-size: 0.9rem;
  color: var(--aw-text-secondary-color);
}

.feature-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.feature-card {
  padding: 1rem;
  border-radius: 0.5rem;
  background-color: var(--aw-panel-bg-color);
  border: 1px solid var(--aw-panel-border-color);
}

.feature-card.primary {
  border-left: 4px solid var(--aw-primary-color);
}

.feature-card.secondary {
  border-left: 4px solid var(--aw-secondary-color);
}

.feature-card.tertiary {
  border-left: 4px solid var(--aw-muted-color);
}

.feature-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.feature-header h4 {
  margin: 0;
  font-size: 1rem;
}

.feature-type,
.feature-source {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
  background-color: rgba(0, 0, 0, 0.1);
  color: var(--aw-text-secondary-color);
}

.feature-type {
  background-color: rgba(var(--aw-primary-rgb), 0.1);
  color: var(--aw-primary-color);
}

.feature-source {
  background-color: rgba(var(--aw-secondary-rgb), 0.1);
  color: var(--aw-secondary-color);
}

.feature-api {
  margin-top: 0.75rem;
  font-size: 0.8rem;
  color: var(--aw-text-secondary-color);
  display: flex;
  flex-direction: column;
}

.feature-visibility {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  font-style: italic;
  color: var(--aw-text-secondary-color);
  padding: 0.25rem 0.5rem;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 0.25rem;
}
</style>
