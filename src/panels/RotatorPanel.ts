// Status: Good - Core Component
// This is the rotator panel definition that:
// - Defines core rotator functionality and features
// - Implements proper ASCOM Alpaca rotator interface
// - Provides position angle control
// - Supports mechanical and sky angle modes
// - Maintains proper feature prioritization

import type { PanelDefinition } from '../types/panels/PanelDefinition'
import { FeatureSource, InteractionType, PriorityLevel } from '../types/panels/FeatureTypes'

const RotatorPanel: PanelDefinition = {
  id: 'rotator-panel',
  deviceType: 'rotator',
  title: 'Rotator',
  description: 'Controls for rotator devices',
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
        unit: '°',
        formatter: (val: unknown) => (typeof val === 'number' ? val.toFixed(1) : val),
        pollInterval: 500
      }
    },
    {
      id: 'move-to-position',
      label: 'Move To',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Action,
      priority: PriorityLevel.Primary,
      component: 'RotatorMove',
      props: {
        method: 'moveabsolute',
        label: 'Move To',
        minProperty: 'positions[0]',
        maxProperty: 'positions[1]'
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
        method: 'moverelative',
        label: 'Move Relative',
        stepSizes: [1, 5, 15, 30, 90]
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
      id: 'sync-to-pa',
      label: 'Sync Position',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Action,
      priority: PriorityLevel.Secondary,
      component: 'SyncRotator',
      props: {
        method: 'sync',
        label: 'Sync To'
      }
    },
    {
      id: 'reverse',
      label: 'Reverse Direction',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Mode,
      priority: PriorityLevel.Secondary,
      component: 'ToggleSwitch',
      props: {
        property: 'reverse',
        label: 'Reverse Direction'
      },
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'canreverse',
          value: true,
          condition: 'equals'
        }
      ]
    },

    // Tertiary features (visible only in fullscreen)
    {
      id: 'rotator-name',
      label: 'Rotator Name',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Tertiary,
      component: 'DynamicValue',
      props: {
        property: 'name',
        label: 'Rotator Name'
      }
    },
    {
      id: 'rotator-description',
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
      id: 'step-size',
      label: 'Step Size',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Tertiary,
      component: 'DynamicValue',
      props: {
        property: 'stepsize',
        label: 'Step Size',
        unit: '°',
        formatter: (val: unknown) => (typeof val === 'number' ? val.toFixed(3) : val)
      }
    },
    {
      id: 'mechanical-position',
      label: 'Mechanical Position',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Tertiary,
      component: 'DynamicValue',
      props: {
        property: 'mechanicalposition',
        label: 'Mechanical Position',
        unit: '°',
        formatter: (val: unknown) => (typeof val === 'number' ? val.toFixed(1) : val),
        pollInterval: 1000
      },
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'canreverse',
          value: true,
          condition: 'equals'
        }
      ]
    }
  ]
}

export default RotatorPanel
