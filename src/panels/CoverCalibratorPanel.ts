// Status: Good - Core Component
// This is the cover calibrator panel definition that:
// - Defines core cover/calibrator functionality
// - Implements proper ASCOM Alpaca cover calibrator interface
// - Provides cover state and calibrator control
// - Supports brightness and calibration features
// - Maintains proper feature prioritization

import type { PanelDefinition } from '../types/panels/PanelDefinition'
import { FeatureSource, InteractionType, PriorityLevel } from '../types/panels/FeatureTypes'

const CoverCalibratorPanel: PanelDefinition = {
  id: 'cover-calibrator-panel',
  deviceType: 'covercalibrator',
  title: 'Cover/Calibrator',
  description: 'Controls for cover and calibration devices',
  features: [
    // Primary features (always visible)
    {
      id: 'cover-state',
      label: 'Cover State',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Primary,
      component: 'DynamicValue',
      props: {
        property: 'coverstate',
        label: 'Cover',
        formatter: (val: unknown) => {
          if (typeof val === 'number') {
            const states = ['Unknown', 'NotPresent', 'Closed', 'Moving', 'Open', 'Error']
            return states[val] || `Unknown (${val})`
          }
          return val
        },
        pollInterval: 1000
      }
    },
    {
      id: 'open-cover',
      label: 'Open Cover',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Action,
      priority: PriorityLevel.Primary,
      component: 'ActionButton',
      props: {
        method: 'opencover',
        label: 'Open Cover',
        icon: 'open'
      },
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'coverstate',
          value: 2, // Closed
          condition: 'equals'
        }
      ]
    },
    {
      id: 'close-cover',
      label: 'Close Cover',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Action,
      priority: PriorityLevel.Primary,
      component: 'ActionButton',
      props: {
        method: 'closecover',
        label: 'Close Cover',
        icon: 'close'
      },
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'coverstate',
          value: 4, // Open
          condition: 'equals'
        }
      ]
    },
    {
      id: 'halt-cover',
      label: 'Halt Cover',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Action,
      priority: PriorityLevel.Primary,
      component: 'ActionButton',
      props: {
        method: 'haltcover',
        label: 'Halt Cover',
        icon: 'stop'
      },
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'coverstate',
          value: 3, // Moving
          condition: 'equals'
        }
      ]
    },

    // Secondary features (visible in detailed mode)
    {
      id: 'calibrator-state',
      label: 'Calibrator State',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Secondary,
      component: 'DynamicValue',
      props: {
        property: 'calibratorstate',
        label: 'Calibrator',
        formatter: (val: unknown) => {
          if (typeof val === 'number') {
            const states = ['Unknown', 'NotPresent', 'Off', 'NotReady', 'Ready', 'Error']
            return states[val] || `Unknown (${val})`
          }
          return val
        },
        pollInterval: 1000
      }
    },
    {
      id: 'calibrator-brightness',
      label: 'Brightness',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Setting,
      priority: PriorityLevel.Secondary,
      component: 'NumericSetting',
      props: {
        property: 'brightness',
        label: 'Brightness',
        min: 0,
        max: 100,
        step: 1
      },
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'maxbrightness',
          value: 0,
          condition: 'greaterThan'
        }
      ]
    },
    {
      id: 'turn-on-calibrator',
      label: 'Turn On',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Action,
      priority: PriorityLevel.Secondary,
      component: 'ActionButton',
      props: {
        method: 'calibratoron',
        label: 'Turn On Calibrator',
        icon: 'on'
      },
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'calibratorstate',
          value: 2, // Off
          condition: 'equals'
        }
      ]
    },
    {
      id: 'turn-off-calibrator',
      label: 'Turn Off',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Action,
      priority: PriorityLevel.Secondary,
      component: 'ActionButton',
      props: {
        method: 'calibratoroff',
        label: 'Turn Off Calibrator',
        icon: 'off'
      },
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'calibratorstate',
          value: 4, // Ready
          condition: 'equals'
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
      id: 'max-brightness',
      label: 'Maximum Brightness',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Tertiary,
      component: 'DynamicValue',
      props: {
        property: 'maxbrightness',
        label: 'Max Brightness',
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

export default CoverCalibratorPanel
