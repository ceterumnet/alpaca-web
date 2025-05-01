// Status: Good - Core Component
// This is the switch panel definition that:
// - Defines core switch functionality and features
// - Implements proper ASCOM Alpaca switch interface
// - Provides switch state control and monitoring
// - Supports both boolean and analog switches
// - Maintains proper feature prioritization

import type { PanelDefinition } from '../types/panels/PanelDefinition'
import { FeatureSource, InteractionType, PriorityLevel } from '../types/panels/FeatureTypes'

const SwitchPanel: PanelDefinition = {
  id: 'switch-panel',
  deviceType: 'switch',
  title: 'Switch',
  description: 'Controls for switch devices',
  features: [
    // Primary features (always visible)
    {
      id: 'switch-states',
      label: 'Switch Controls',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Mode,
      priority: PriorityLevel.Primary,
      component: 'SwitchArray',
      props: {
        property: 'maxswitch',
        label: 'Switches'
      }
    },
    {
      id: 'switch-all-on',
      label: 'All On',
      source: FeatureSource.Extended,
      interactionType: InteractionType.Action,
      priority: PriorityLevel.Primary,
      component: 'ActionButton',
      props: {
        method: 'turnAllOn',
        label: 'All On',
        icon: 'power'
      }
    },
    {
      id: 'switch-all-off',
      label: 'All Off',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Action,
      priority: PriorityLevel.Primary,
      component: 'ActionButton',
      props: {
        method: 'turnAllOff',
        label: 'All Off',
        icon: 'power-off'
      }
    },

    // Secondary features (visible in detailed mode)
    {
      id: 'switch-values',
      label: 'Variable Switches',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Setting,
      priority: PriorityLevel.Secondary,
      component: 'VariableSwitchArray',
      props: {
        property: 'maxswitch',
        canWriteProperty: 'canwrite',
        label: 'Switch Values'
      },
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'maxswitchvalue',
          value: 0,
          condition: 'greaterThan'
        }
      ]
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
      id: 'switches-count',
      label: 'Number of Switches',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Tertiary,
      component: 'DynamicValue',
      props: {
        property: 'maxswitch',
        label: 'Switches Count',
        formatter: (val: unknown) => {
          if (typeof val === 'number') {
            return val.toString()
          }
          return val
        }
      }
    }
  ]
}

export default SwitchPanel
