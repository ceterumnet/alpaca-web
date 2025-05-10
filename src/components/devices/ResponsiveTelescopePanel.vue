<script setup lang="ts">
import { computed, onMounted } from 'vue'
import ResponsivePanel from '@/components/panels/ResponsivePanel.vue'
import BasePanel from '@/components/panels/BasePanel.vue'
import { FeatureSource, InteractionType, PriorityLevel } from '@/types/panels/FeatureTypes'
import type { PanelFeatureDefinition } from '@/types/panels/FeatureTypes'
import componentMap from '@/components/panels/features'

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: 'Telescope'
  }
})

const emit = defineEmits(['device-change'])

// Handle device change from BasePanel
const handleDeviceChange = (newDeviceId: string) => {
  emit('device-change', newDeviceId)
}

// Setup mock data for demo mode
onMounted(() => {
  if (props.deviceId === 'demo-telescope') {
    console.log('Setting up demo telescope data')
  }
})

// Define telescope panel features with component names matching registered components
const panelFeatures = computed<PanelFeatureDefinition[]>(() => [
  // Position Section - Primary Features
  {
    id: 'right-ascension',
    label: 'Right Ascension',
    source: FeatureSource.CoreAlpaca,
    interactionType: InteractionType.DynamicData,
    priority: PriorityLevel.Primary,
    component: 'DynamicValue',
    props: {
      label: 'RA',
      property: 'rightascension',
      formatter: (value: number | null) => {
        if (value === null) return 'Unknown';
        // Format RA as HH:MM:SS
        const hours = Math.floor(value)
        const minutes = Math.floor((value - hours) * 60)
        const seconds = Math.floor(((value - hours) * 60 - minutes) * 60)
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      },
      refreshRate: 1000
    },
    section: 'position',
    icon: 'telescope'
  },
  {
    id: 'declination',
    label: 'Declination',
    source: FeatureSource.CoreAlpaca,
    interactionType: InteractionType.DynamicData,
    priority: PriorityLevel.Primary,
    component: 'DynamicValue',
    props: {
      label: 'Dec',
      property: 'declination',
      formatter: (value: number | null) => {
        if (value === null) return 'Unknown';
        // Format Dec as +/-DD:MM:SS
        const sign = value >= 0 ? '+' : '-'
        const absDec = Math.abs(value)
        const degrees = Math.floor(absDec)
        const minutes = Math.floor((absDec - degrees) * 60)
        const seconds = Math.floor(((absDec - degrees) * 60 - minutes) * 60)
        return `${sign}${degrees.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      },
      refreshRate: 1000
    },
    section: 'position'
  },
  {
    id: 'slew-to-coordinates',
    label: 'Slew To Coordinates',
    source: FeatureSource.CoreAlpaca,
    interactionType: InteractionType.Action,
    priority: PriorityLevel.Primary,
    component: 'ActionButton',
    props: {
      label: 'Slew',
      method: 'slewtocoordinates',
      icon: 'telescope',
      params: { RightAscension: 0, Declination: 0 }
    },
    section: 'position'
  },

  // Manual Slew Control - Primary Features
  {
    id: 'manual-slew',
    label: 'Manual Slew Control',
    source: FeatureSource.CoreAlpaca,
    interactionType: InteractionType.Action,
    priority: PriorityLevel.Primary,
    component: 'DirectionalControl',
    props: {
      deviceId: props.deviceId
    },
    section: 'control',
    icon: 'sliders'
  },

  // Tracking Section - Primary Features
  {
    id: 'tracking',
    label: 'Tracking',
    source: FeatureSource.CoreAlpaca,
    interactionType: InteractionType.Setting,
    priority: PriorityLevel.Primary,
    component: 'ToggleSwitch',
    props: {
      label: 'Tracking',
      property: 'tracking'
    },
    section: 'tracking',
    icon: 'tracking-on'
  },
  {
    id: 'tracking-rate',
    label: 'Tracking Rate',
    source: FeatureSource.CoreAlpaca,
    interactionType: InteractionType.Setting,
    priority: PriorityLevel.Primary,
    component: 'SelectSetting',
    props: {
      label: 'Rate',
      property: 'trackingrate',
      options: [
        { value: 0, label: 'Sidereal' },
        { value: 1, label: 'Lunar' },
        { value: 2, label: 'Solar' },
        { value: 3, label: 'King' }
      ]
    },
    section: 'tracking'
  },

  // Movement Section - Secondary Features
  {
    id: 'slew-rate',
    label: 'Slew Rate',
    source: FeatureSource.CoreAlpaca,
    interactionType: InteractionType.Setting,
    priority: PriorityLevel.Secondary,
    component: 'NumericSetting',
    props: {
      label: 'Slew Rate',
      property: 'slewsettletime',
      min: 0,
      max: 30,
      step: 1,
      unit: 'deg/s'
    },
    section: 'movement',
    icon: 'sliders'
  },
  {
    id: 'altitude',
    label: 'Altitude',
    source: FeatureSource.CoreAlpaca,
    interactionType: InteractionType.DynamicData,
    priority: PriorityLevel.Secondary,
    component: 'DynamicValue',
    props: {
      label: 'Altitude',
      property: 'altitude',
      formatter: (value: number | null) => value !== null ? `${value.toFixed(2)}°` : 'Unknown',
      refreshRate: 1000
    },
    section: 'movement'
  },
  {
    id: 'azimuth',
    label: 'Azimuth',
    source: FeatureSource.CoreAlpaca,
    interactionType: InteractionType.DynamicData,
    priority: PriorityLevel.Secondary,
    component: 'DynamicValue',
    props: {
      label: 'Azimuth',
      property: 'azimuth',
      formatter: (value: number | null) => value !== null ? `${value.toFixed(2)}°` : 'Unknown',
      refreshRate: 1000
    },
    section: 'movement'
  },

  // Advanced Features - Tertiary
  {
    id: 'park',
    label: 'Park',
    source: FeatureSource.CoreAlpaca,
    interactionType: InteractionType.Action,
    priority: PriorityLevel.Tertiary,
    component: 'ActionButton',
    props: {
      label: 'Park Telescope',
      method: 'park',
      icon: 'park'
    },
    section: 'advanced',
    icon: 'gear'
  },
  {
    id: 'unpark',
    label: 'Unpark',
    source: FeatureSource.CoreAlpaca,
    interactionType: InteractionType.Action,
    priority: PriorityLevel.Tertiary,
    component: 'ActionButton',
    props: {
      label: 'Unpark Telescope',
      method: 'unpark',
      icon: 'unpark'
    },
    section: 'advanced'
  },
  {
    id: 'home',
    label: 'Find Home',
    source: FeatureSource.CoreAlpaca,
    interactionType: InteractionType.Action,
    priority: PriorityLevel.Tertiary,
    component: 'ActionButton',
    props: {
      label: 'Find Home',
      method: 'findhome',
      icon: 'home'
    },
    section: 'advanced'
  },
  {
    id: 'sync-to-coordinates',
    label: 'Sync To Coordinates',
    source: FeatureSource.CoreAlpaca,
    interactionType: InteractionType.Action,
    priority: PriorityLevel.Tertiary,
    component: 'ActionButton',
    props: {
      label: 'Sync',
      method: 'synctocoordinates',
      icon: 'sync',
      params: { RightAscension: 0, Declination: 0 }
    },
    section: 'advanced'
  }
])
</script>

<template>
  <!-- Use BasePanel as the outer container -->
  <BasePanel
    :panel-id="'telescope'"
    device-type="telescope"
    :title="title"
    :device-id="deviceId"
    @device-change="handleDeviceChange"
  >
    <template #features>
      <!-- ResponsivePanel provides the responsive layout -->
      <ResponsivePanel
        :device-id="deviceId"
        :title="title"
        device-type="telescope"
        :features="panelFeatures"
        :components-map="componentMap"
        class="aw-responsive-telescope-panel"
      />
    </template>
  </BasePanel>
</template>

<style scoped>
.aw-responsive-telescope-panel {
  /* Ensure no overriding styles interfere with visibility */
  --component-text-color: var(--aw-text-color);
  --component-heading-color: var(--aw-panel-content-color);
  --component-background: var(--aw-panel-bg-color);
  --component-background-soft: var(--aw-panel-content-bg-color);
  color: var(--aw-text-color);
}

:deep(.feature-wrapper) {
  color: var(--aw-text-color);
  background-color: var(--aw-panel-content-bg-color);
  border-radius: var(--aw-border-radius-sm, 6px);
  padding: var(--aw-spacing-sm, 10px);
  margin-bottom: var(--aw-spacing-sm, 8px);
}

:deep(.feature-wrapper:hover) {
  background-color: var(--aw-panel-hover-bg-color);
}

:deep(.action-button-feature button),
:deep(.numeric-setting input),
:deep(.toggle-switch .slider) {
  border-color: var(--aw-panel-border-color);
  color: var(--aw-text-color);
}

:deep(.value-label),
:deep(.setting-label),
:deep(.toggle-label) {
  color: var(--aw-text-secondary-color);
}

:deep(.value-content),
:deep(.current-value),
:deep(.toggle-value) {
  color: var(--aw-text-color);
}
</style>
