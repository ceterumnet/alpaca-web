// Status: Good - Core Component
// This is the focuser panel definition that:
// - Defines core focuser functionality and features
// - Implements proper ASCOM Alpaca focuser interface
// - Provides position control and temperature compensation
// - Supports auto-focus operations
// - Maintains proper feature prioritization

import type { PanelDefinition } from '../types/panels/PanelDefinition'
import { FeatureSource, InteractionType, PriorityLevel } from '../types/panels/FeatureTypes'

const FocuserPanel: PanelDefinition = {
  id: 'focuser-panel',
  deviceType: 'focuser',
  title: 'Focuser',
  description: 'Controls for focuser devices',
  features: [
    // Primary features (always visible)
    {
      id: 'position',
      label: 'Current Position',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Primary,
      component: 'DynamicValue',
      props: {
        property: 'position',
        label: 'Position',
        pollInterval: 500
      }
    },
    {
      id: 'move-absolute',
      label: 'Move To Position',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Action,
      priority: PriorityLevel.Primary,
      component: 'FocuserMove',
      props: {
        method: 'move',
        label: 'Move To',
        maxProperty: 'maxstep'
      }
    },
    {
      id: 'move-relative',
      label: 'Move Relative',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Action,
      priority: PriorityLevel.Primary,
      component: 'RelativeMove',
      props: {
        label: 'Move Relative',
        stepSizes: [10, 50, 100, 500, 1000]
      }
    },
    {
      id: 'halt-move',
      label: 'Stop',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Action,
      priority: PriorityLevel.Primary,
      component: 'ActionButton',
      props: {
        method: 'halt',
        label: 'Stop',
        icon: 'stop'
      }
    },
    {
      id: 'is-moving',
      label: 'Movement Status',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Primary,
      component: 'DynamicValue',
      props: {
        property: 'ismoving',
        label: 'Status',
        formatter: (val: unknown) => (val === true ? 'Moving' : 'Idle'),
        pollInterval: 200
      }
    },

    // Secondary features (visible in detailed mode)
    {
      id: 'temperature',
      label: 'Temperature',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Secondary,
      component: 'DynamicValue',
      props: {
        property: 'temperature',
        label: 'Temperature',
        unit: '°C',
        formatter: (val: unknown) => (typeof val === 'number' ? val.toFixed(1) : val),
        pollInterval: 5000
      }
    },
    {
      id: 'temp-comp-toggle',
      label: 'Temperature Compensation',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Mode,
      priority: PriorityLevel.Secondary,
      component: 'ToggleSwitch',
      props: {
        property: 'tempcomp',
        label: 'Temp Comp'
      },
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'tempcompavailable',
          value: true,
          condition: 'equals'
        }
      ]
    },
    {
      id: 'temperature-comp-threshold',
      label: 'Temp Comp Threshold',
      source: FeatureSource.Extended,
      interactionType: InteractionType.Setting,
      priority: PriorityLevel.Secondary,
      component: 'NumericSetting',
      props: {
        property: 'tempcompthreshold',
        label: 'Threshold',
        unit: '°C',
        min: 0.1,
        max: 5,
        step: 0.1
      },
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'tempcompavailable',
          value: true,
          condition: 'equals'
        },
        {
          type: 'deviceProperty',
          property: 'tempcomp',
          value: true,
          condition: 'equals'
        }
      ]
    },

    // Tertiary features (visible only in fullscreen)
    {
      id: 'focuser-name',
      label: 'Focuser Name',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Tertiary,
      component: 'DynamicValue',
      props: {
        property: 'name',
        label: 'Focuser Name'
      }
    },
    {
      id: 'focuser-description',
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
      id: 'max-step',
      label: 'Maximum Step',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Tertiary,
      component: 'DynamicValue',
      props: {
        property: 'maxstep',
        label: 'Maximum Step'
      }
    },
    {
      id: 'step-size',
      label: 'Step Size',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Tertiary,
      component: 'DynamicValue',
      props: {
        property: 'stepsize',
        label: 'Step Size',
        unit: 'µm',
        formatter: (val: unknown) => (typeof val === 'number' ? val.toFixed(2) : val)
      }
    },
    {
      id: 'is-absolute',
      label: 'Absolute Position',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Tertiary,
      component: 'DynamicValue',
      props: {
        property: 'absolute',
        label: 'Absolute Position',
        formatter: (val: unknown) => (val === true ? 'Yes' : 'No')
      }
    },
    {
      id: 'focus-presets',
      label: 'Focus Presets',
      source: FeatureSource.Extended,
      interactionType: InteractionType.Setting,
      priority: PriorityLevel.Tertiary,
      component: 'FocusPresets',
      props: {
        label: 'Saved Positions'
      }
    }
  ]
}

export default FocuserPanel
