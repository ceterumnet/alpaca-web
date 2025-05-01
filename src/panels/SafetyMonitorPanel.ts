// Status: Good - Core Component
// This is the safety monitor panel definition that:
// - Defines core safety monitoring functionality
// - Implements proper ASCOM Alpaca safety monitor interface
// - Provides critical safety status information
// - Supports automated safety responses
// - Maintains proper feature prioritization

import type { PanelDefinition } from '../types/panels/PanelDefinition'
import { FeatureSource, InteractionType, PriorityLevel } from '../types/panels/FeatureTypes'

const SafetyMonitorPanel: PanelDefinition = {
  id: 'safety-monitor-panel',
  deviceType: 'safetymonitor',
  title: 'Safety Monitor',
  description: 'Monitors observatory safety conditions',
  features: [
    // Primary features (always visible)
    {
      id: 'is-safe',
      label: 'Safety Status',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Primary,
      component: 'DynamicValue',
      props: {
        property: 'issafe',
        label: 'Status',
        formatter: (val: unknown) => {
          if (val === true) return 'Safe'
          if (val === false) return 'Unsafe'
          return String(val)
        },
        pollInterval: 5000
      }
    },
    {
      id: 'safety-indicator',
      label: 'Safety',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Primary,
      component: 'SafetyIndicator',
      props: {
        property: 'issafe',
        label: 'Safety Status'
      }
    },

    // Secondary features (visible in detailed mode)
    {
      id: 'alert-timeout',
      label: 'Alert Timeout',
      source: FeatureSource.Extended,
      interactionType: InteractionType.Setting,
      priority: PriorityLevel.Secondary,
      component: 'NumericSetting',
      props: {
        property: 'alerttimeout',
        label: 'Alert Timeout',
        unit: 's',
        min: 0,
        max: 3600,
        step: 10
      }
    },
    {
      id: 'alert-volume',
      label: 'Alert Volume',
      source: FeatureSource.Extended,
      interactionType: InteractionType.Setting,
      priority: PriorityLevel.Secondary,
      component: 'NumericSetting',
      props: {
        property: 'alertvolume',
        label: 'Alert Volume',
        min: 0,
        max: 100,
        step: 5
      }
    },

    // Tertiary features (visible only in fullscreen)
    {
      id: 'device-name',
      label: 'Device Name',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Tertiary,
      component: 'DynamicValue',
      props: {
        property: 'name',
        label: 'Device Name'
      }
    },
    {
      id: 'device-description',
      label: 'Description',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Tertiary,
      component: 'DynamicValue',
      props: {
        property: 'description',
        label: 'Description'
      }
    },
    {
      id: 'safety-history',
      label: 'Safety History',
      source: FeatureSource.Extended,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Tertiary,
      component: 'SafetyHistory',
      props: {
        label: 'Safety History'
      }
    }
  ]
}

export default SafetyMonitorPanel
