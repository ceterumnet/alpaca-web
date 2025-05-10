<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import ResponsivePanel from '@/components/panels/ResponsivePanel.vue'
import BasePanel from '@/components/panels/BasePanel.vue'
import { FeatureSource, InteractionType, PriorityLevel } from '@/types/panels/FeatureTypes'
import type { PanelFeatureDefinition } from '@/types/panels/FeatureTypes'
import { featureComponents } from '@/components/panels/features'
import CameraControls from '@/components/panels/CameraControls.vue'

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: 'Camera'
  }
})

const emit = defineEmits(['device-change'])

// Handle device change from BasePanel
const handleDeviceChange = (newDeviceId: string) => {
  emit('device-change', newDeviceId)
}

// Create a custom component map that includes both feature components and CameraControls
const componentMap = {
  ...featureComponents,
  CameraControls
}

const store = useUnifiedStore()

// Setup mock data for demo mode
onMounted(() => {
  if (props.deviceId === 'demo-camera') {
    console.log('Setting up demo camera data')
  }
})

// Define camera panel features with component names matching registered components
const panelFeatures = computed<PanelFeatureDefinition[]>(() => {
  // Get device for accessing properties
  const device = store.getDeviceById(props.deviceId)
  const deviceProps = device?.properties || {}

  // Get gain/offset mode information
  const gainMode = deviceProps.gainMode as string
  const offsetMode = deviceProps.offsetMode as string
  const gainOptions = (deviceProps.gainOptions as string[] | number[]) || []
  const offsetOptions = (deviceProps.offsetOptions as string[] | number[]) || []
  const gainMin = (deviceProps.gainmin as number) || 0
  const gainMax = (deviceProps.gainmax as number) || 100
  const offsetMin = (deviceProps.offsetmin as number) || 0
  const offsetMax = (deviceProps.offsetmax as number) || 100

  return [
    // Integrated Camera Controls - This combines exposure control and image display
    {
      id: 'camera-integrated-controls',
      label: 'Camera Controls',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Action,
      priority: PriorityLevel.Primary,
      component: 'CameraControls',
      props: {
        deviceId: props.deviceId
      },
      section: 'primary'
    },

    // Camera Status - Primary Features
    {
      id: 'camera-state',
      label: 'Camera State',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Primary,
      component: 'DynamicValue',
      props: {
        label: 'State',
        property: 'camerastate',
        formatter: (value: number) => {
          const states = ['Idle', 'Waiting', 'Exposing', 'Reading', 'Download', 'Error']
          return states[value] || `Unknown (${value})`
        },
        // Use a reasonable polling interval when visible
        pollInterval: 1000
      },
      section: 'status',
      icon: 'info-circle',
      // Only show when exposing
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'isExposing',
          value: true,
          condition: 'equals'
        }
      ]
    },
    {
      id: 'image-ready',
      label: 'Image Ready',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Primary,
      component: 'DynamicValue',
      props: {
        label: 'Image Ready',
        property: 'imageready',
        formatter: (value: boolean) => (value ? 'Yes' : 'No'),
        // Use a reasonable polling interval when visible
        pollInterval: 1000
      },
      section: 'status',
      // Only show when exposing
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'isExposing',
          value: true,
          condition: 'equals'
        }
      ]
    },

    // Temperature - Secondary Features
    {
      id: 'temperature',
      label: 'Temperature',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Secondary,
      component: 'DynamicValue',
      props: {
        label: 'Current Temp',
        property: 'ccdtemperature',
        formatter: (value: number) => `${value.toFixed(1)}°C`,
        refreshRate: 5000
      },
      section: 'cooling',
      icon: 'thermometer',
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'cansetccdtemperature',
          value: true,
          condition: 'equals'
        }
      ]
    },
    {
      id: 'cooler-on',
      label: 'Cooler',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Setting,
      priority: PriorityLevel.Secondary,
      component: 'ToggleSwitch',
      props: {
        label: 'Cooler',
        property: 'cooleron'
      },
      section: 'cooling',
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'cansetccdtemperature',
          value: true,
          condition: 'equals'
        },
        {
          type: 'deviceProperty',
          property: 'coolerpower',
          value: null,
          condition: 'notEquals'
        }
      ]
    },
    {
      id: 'target-temperature',
      label: 'Target Temperature',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Setting,
      priority: PriorityLevel.Secondary,
      component: 'NumericSetting',
      props: {
        label: 'Target Temp',
        property: 'setccdtemperature',
        min: -50,
        max: 50,
        step: 1,
        unit: '°C'
      },
      section: 'cooling',
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'cansetccdtemperature',
          value: true,
          condition: 'equals'
        }
      ]
    },

    // Camera Settings - Secondary Features
    {
      id: 'gain',
      label: 'Gain',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Setting,
      priority: PriorityLevel.Primary,
      component: gainMode === 'Index' ? 'SelectSetting' : 'NumericSetting',
      props:
        gainMode === 'Index'
          ? {
              label: 'Gain',
              property: 'gain',
              options: Array.isArray(gainOptions)
                ? gainOptions.map((val, idx) => ({
                    value: idx,
                    label: `${val}`
                  }))
                : []
            }
          : {
              label: 'Gain',
              property: 'gain',
              min: gainMin,
              max: gainMax,
              step: 1
            },
      section: 'settings',
      icon: 'sliders'
    },
    {
      id: 'offset',
      label: 'Offset',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Setting,
      priority: PriorityLevel.Primary,
      component: offsetMode === 'Index' ? 'SelectSetting' : 'NumericSetting',
      props:
        offsetMode === 'Index'
          ? {
              label: 'Offset',
              property: 'offset',
              options: Array.isArray(offsetOptions)
                ? offsetOptions.map((val, idx) => ({
                    value: idx,
                    label: `${val}`
                  }))
                : []
            }
          : {
              label: 'Offset',
              property: 'offset',
              min: offsetMin,
              max: offsetMax,
              step: 1
            },
      section: 'settings'
    },

    // Advanced Settings - Tertiary Features
    {
      id: 'binning',
      label: 'Binning',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Setting,
      priority: PriorityLevel.Tertiary,
      component: 'NumericSetting',
      props: {
        label: 'Binning',
        property: 'binx', // Assumes BinX=BinY for simplicity
        min: 1,
        max: 4,
        step: 1
      },
      section: 'advanced',
      icon: 'cog'
    },
    {
      id: 'readout-mode',
      label: 'Readout Mode',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Setting,
      priority: PriorityLevel.Tertiary,
      component: 'SelectSetting',
      props: {
        label: 'Readout Mode',
        property: 'readoutmode',
        options: [], // Will be filled dynamically based on camera capabilities
        optionsGetter: () => {
          const count = store.getDeviceProperty(props.deviceId, 'readoutmodes')
          if (typeof count === 'number' && count > 0) {
            return Array.from({ length: count }, (_, i) => ({
              value: i,
              label: `Mode ${i + 1}`
            }))
          }
          return []
        }
      },
      section: 'advanced'
    }
  ]
})

// Add sectionColSpans mapping
const sectionColSpans = {
  primary: 2
}
</script>

<template>
  <!-- Use BasePanel as the outer container -->
  <BasePanel
    :panel-id="'camera'"
    device-type="camera"
    :title="title"
    :device-id="deviceId"
    @device-change="handleDeviceChange"
  >
    <template #features>
      <!-- ResponsivePanel provides the responsive layout -->
      <ResponsivePanel
        :device-id="deviceId"
        :title="title"
        device-type="camera"
        :features="panelFeatures"
        :components-map="componentMap"
        :section-col-spans="sectionColSpans"
        class="responsive-camera-panel"
      />
    </template>
  </BasePanel>
</template>

<style scoped>
.responsive-camera-panel {
  /* Use color variables from colors.css */
  --component-text-color: var(--aw-text-color);
  --component-heading-color: var(--aw-text-color);
  --component-background: var(--aw-panel-content-bg-color);
  --component-background-soft: var(--aw-panels-bg-color);
  color: var(--aw-text-color);
}

:deep(.feature-wrapper) {
  color: var(--aw-text-color);
  background-color: var(--aw-panels-bg-color);
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 8px;
}

:deep(.feature-wrapper:hover) {
  background-color: var(--aw-panel-border-color);
}

:deep(.action-button-feature button),
:deep(.numeric-setting input),
:deep(.toggle-switch .slider) {
  border-color: var(--aw-input-border-color);
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
