// Status: Good - Core Component
// This is the dome panel definition that:
// - Defines core dome functionality and features
// - Implements proper ASCOM Alpaca dome interface
// - Provides azimuth and shutter control
// - Supports dome automation and slaving
// - Maintains proper feature prioritization

import type { PanelDefinition } from '../types/panels/PanelDefinition'
import { FeatureSource, InteractionType, PriorityLevel } from '../types/panels/FeatureTypes'

const DomePanel: PanelDefinition = {
  id: 'dome-panel',
  deviceType: 'dome',
  title: 'Dome',
  description: 'Controls for dome devices',
  features: [
    // Primary features (always visible)
    {
      id: 'shutter-status',
      label: 'Shutter Status',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Primary,
      component: 'DynamicValue',
      props: {
        property: 'shutterstatus',
        label: 'Shutter',
        formatter: (val: unknown) => {
          if (typeof val === 'number') {
            const statuses = ['Open', 'Closed', 'Opening', 'Closing', 'Error']
            return statuses[val] || `Unknown (${val})`
          }
          return val
        },
        pollInterval: 1000
      }
    },
    {
      id: 'azimuth',
      label: 'Azimuth',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Primary,
      component: 'DynamicValue',
      props: {
        property: 'azimuth',
        label: 'Azimuth',
        unit: '°',
        formatter: (val: unknown) => (typeof val === 'number' ? val.toFixed(1) : val),
        pollInterval: 1000
      }
    },
    {
      id: 'slew-to-azimuth',
      label: 'Slew To',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Action,
      priority: PriorityLevel.Primary,
      component: 'AzimuthSlew',
      props: {
        method: 'slewtoazimuth',
        label: 'Slew To Azimuth'
      }
    },
    {
      id: 'abort-slew',
      label: 'Abort',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Action,
      priority: PriorityLevel.Primary,
      component: 'ActionButton',
      props: {
        method: 'abortslew',
        label: 'Abort',
        icon: 'stop',
        confirmText: 'Are you sure you want to abort the current slew?'
      }
    },
    {
      id: 'is-slewing',
      label: 'Slew Status',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Primary,
      component: 'DynamicValue',
      props: {
        property: 'slewing',
        label: 'Status',
        formatter: (val: unknown) => (val === true ? 'Slewing' : 'Idle'),
        pollInterval: 500
      }
    },

    // Secondary features (visible in detailed mode)
    {
      id: 'open-shutter',
      label: 'Open Shutter',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Action,
      priority: PriorityLevel.Secondary,
      component: 'ActionButton',
      props: {
        method: 'openshutter',
        label: 'Open Shutter',
        icon: 'open'
      }
    },
    {
      id: 'close-shutter',
      label: 'Close Shutter',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Action,
      priority: PriorityLevel.Secondary,
      component: 'ActionButton',
      props: {
        method: 'closeshutter',
        label: 'Close Shutter',
        icon: 'close'
      }
    },
    {
      id: 'slaved',
      label: 'Telescope Slaving',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Mode,
      priority: PriorityLevel.Secondary,
      component: 'ToggleSwitch',
      props: {
        property: 'slaved',
        label: 'Slave to Telescope'
      },
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'cansetslaved',
          value: true,
          condition: 'equals'
        }
      ]
    },

    // Tertiary features (visible only in fullscreen)
    {
      id: 'dome-name',
      label: 'Dome Name',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Tertiary,
      component: 'DynamicValue',
      props: {
        property: 'name',
        label: 'Dome Name'
      }
    },
    {
      id: 'dome-description',
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
      id: 'altitude',
      label: 'Altitude',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Tertiary,
      component: 'DynamicValue',
      props: {
        property: 'altitude',
        label: 'Altitude',
        unit: '°',
        formatter: (val: unknown) => (typeof val === 'number' ? val.toFixed(1) : val),
        pollInterval: 5000
      }
    },
    {
      id: 'home',
      label: 'Home',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Action,
      priority: PriorityLevel.Tertiary,
      component: 'ActionButton',
      props: {
        method: 'findhome',
        label: 'Find Home',
        icon: 'home'
      },
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'canfindhome',
          value: true,
          condition: 'equals'
        }
      ]
    },
    {
      id: 'park',
      label: 'Park',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Action,
      priority: PriorityLevel.Tertiary,
      component: 'ActionButton',
      props: {
        method: 'park',
        label: 'Park Dome',
        icon: 'park'
      },
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'canpark',
          value: true,
          condition: 'equals'
        }
      ]
    },
    {
      id: 'set-park',
      label: 'Set Park Position',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Action,
      priority: PriorityLevel.Tertiary,
      component: 'ActionButton',
      props: {
        method: 'setpark',
        label: 'Set Park Position',
        icon: 'set'
      },
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'cansetpark',
          value: true,
          condition: 'equals'
        }
      ]
    }
  ]
}

export default DomePanel
