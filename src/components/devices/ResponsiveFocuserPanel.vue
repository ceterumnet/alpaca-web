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
    default: 'Focuser'
  }
})

const emit = defineEmits(['device-change'])

// Handle device change from BasePanel
const handleDeviceChange = (newDeviceId: string) => {
  emit('device-change', newDeviceId)
}

// Setup mock data for demo mode
onMounted(() => {
  if (props.deviceId === 'demo-focuser') {
    console.log('Setting up demo focuser data')
  }
})

// Define focuser panel features with component names matching registered components
const panelFeatures = computed<PanelFeatureDefinition[]>(() => [
  // Position Section - Primary Features
  {
    id: 'position',
    label: 'Position',
    source: FeatureSource.CoreAlpaca,
    interactionType: InteractionType.DynamicData,
    priority: PriorityLevel.Primary,
    component: 'DynamicValue',
    props: {
      label: 'Position',
      property: 'Position',
      formatter: (value: number) => value.toString(),
      refreshRate: 500
    },
    section: 'position',
    icon: 'focus'
  },
  {
    id: 'move-absolute',
    label: 'Move To',
    source: FeatureSource.CoreAlpaca,
    interactionType: InteractionType.Action,
    priority: PriorityLevel.Primary,
    component: 'ActionButton',
    props: {
      label: 'Move To',
      method: 'Move',
      icon: 'focus',
      params: { Position: 0 }
    },
    section: 'position'
  },
  {
    id: 'halt',
    label: 'Halt',
    source: FeatureSource.CoreAlpaca,
    interactionType: InteractionType.Action,
    priority: PriorityLevel.Primary,
    component: 'ActionButton',
    props: {
      label: 'Stop',
      method: 'Halt',
      icon: 'stop'
    },
    section: 'position'
  },

  // Movement Settings - Secondary Features
  {
    id: 'step-size',
    label: 'Step Size',
    source: FeatureSource.CoreAlpaca,
    interactionType: InteractionType.Setting,
    priority: PriorityLevel.Secondary,
    component: 'NumericSetting',
    props: {
      label: 'Step Size',
      property: 'StepSize',
      min: 1,
      max: 100,
      step: 1,
      unit: 'steps'
    },
    section: 'movement',
    icon: 'sliders'
  },
  {
    id: 'move-in',
    label: 'Move In',
    source: FeatureSource.CoreAlpaca,
    interactionType: InteractionType.Action,
    priority: PriorityLevel.Secondary,
    component: 'ActionButton',
    props: {
      label: 'Move In',
      method: 'MoveIn',
      icon: 'arrow-left'
    },
    section: 'movement'
  },
  {
    id: 'move-out',
    label: 'Move Out',
    source: FeatureSource.CoreAlpaca,
    interactionType: InteractionType.Action,
    priority: PriorityLevel.Secondary,
    component: 'ActionButton',
    props: {
      label: 'Move Out',
      method: 'MoveOut',
      icon: 'arrow-right'
    },
    section: 'movement'
  },

  // Status and Features - Secondary Features
  {
    id: 'is-moving',
    label: 'Is Moving',
    source: FeatureSource.CoreAlpaca,
    interactionType: InteractionType.DynamicData,
    priority: PriorityLevel.Secondary,
    component: 'DynamicValue',
    props: {
      label: 'Status',
      property: 'IsMoving',
      formatter: (value: boolean) => (value ? 'Moving' : 'Idle'),
      refreshRate: 500
    },
    section: 'status',
    icon: 'info-circle'
  },
  {
    id: 'temperature',
    label: 'Temperature',
    source: FeatureSource.CoreAlpaca,
    interactionType: InteractionType.DynamicData,
    priority: PriorityLevel.Secondary,
    component: 'DynamicValue',
    props: {
      label: 'Temperature',
      property: 'Temperature',
      formatter: (value: number) => `${value.toFixed(1)}°C`,
      refreshRate: 5000
    },
    section: 'status'
  },

  // Advanced Settings - Tertiary Features
  {
    id: 'max-increment',
    label: 'Max Increment',
    source: FeatureSource.CoreAlpaca,
    interactionType: InteractionType.Setting,
    priority: PriorityLevel.Tertiary,
    component: 'NumericSetting',
    props: {
      label: 'Max Increment',
      property: 'MaxIncrement',
      min: 1,
      max: 10000,
      step: 1
    },
    section: 'advanced',
    icon: 'gear'
  },
  {
    id: 'max-step',
    label: 'Max Step',
    source: FeatureSource.CoreAlpaca,
    interactionType: InteractionType.Setting,
    priority: PriorityLevel.Tertiary,
    component: 'NumericSetting',
    props: {
      label: 'Max Step',
      property: 'MaxStep',
      min: 1,
      max: 100000,
      step: 1
    },
    section: 'advanced'
  },
  {
    id: 'temperature-compensation',
    label: 'Temperature Compensation',
    source: FeatureSource.CoreAlpaca,
    interactionType: InteractionType.Setting,
    priority: PriorityLevel.Tertiary,
    component: 'ToggleSwitch',
    props: {
      label: 'Temp Comp',
      property: 'TempComp'
    },
    section: 'advanced'
  }
])
</script>

<template>
  <!-- Use BasePanel as the outer container -->
  <BasePanel
    :panel-id="'focuser'"
    device-type="focuser"
    :title="title"
    :device-id="deviceId"
    @device-change="handleDeviceChange"
  >
    <template #features>
      <!-- ResponsivePanel provides the responsive layout -->
      <ResponsivePanel
        :device-id="deviceId"
        :title="title"
        device-type="focuser"
        :features="panelFeatures"
        :components-map="componentMap"
        class="aw-responsive-focuser-panel"
      />
    </template>
  </BasePanel>
</template>

<style scoped>
.aw-responsive-focuser-panel {
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
