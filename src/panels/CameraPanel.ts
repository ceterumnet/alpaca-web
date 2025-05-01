// Status: Good - Core Component
// This is the camera panel definition that:
// - Defines core camera functionality and features
// - Implements proper ASCOM Alpaca camera interface
// - Provides exposure and image handling
// - Supports advanced camera features
// - Maintains proper feature prioritization

import type { PanelDefinition } from '../types/panels/PanelDefinition'
import { FeatureSource, InteractionType, PriorityLevel } from '../types/panels/FeatureTypes'

const CameraPanel: PanelDefinition = {
  id: 'camera-panel',
  deviceType: 'camera',
  title: 'Camera',
  description: 'Controls for camera devices',
  features: [
    // Primary features (always visible)
    {
      id: 'camera-integrated-controls',
      label: 'Camera Controls',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Action,
      priority: PriorityLevel.Primary,
      component: 'CameraControls',
      props: {}
    },
    // Keep existing features for additional data
    {
      id: 'image-ready',
      label: 'Image Ready',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Secondary,
      component: 'DynamicValue',
      props: {
        property: 'imageready',
        label: 'Image Ready',
        formatter: (val: unknown) => (val === true ? 'Yes' : 'No'),
        pollInterval: 1000
      }
    },
    {
      id: 'exposure-progress',
      label: 'Exposure Progress',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Secondary,
      component: 'ProgressBar',
      props: {
        property: 'percentcompleted',
        label: 'Progress',
        pollInterval: 500
      }
    },

    // Secondary features (visible in detailed mode)
    {
      id: 'ccd-temperature',
      label: 'CCD Temperature',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Secondary,
      component: 'DynamicValue',
      props: {
        property: 'ccdtemperature',
        label: 'CCD Temperature',
        unit: '°C',
        formatter: (val: unknown) => (typeof val === 'number' ? val.toFixed(1) : val),
        pollInterval: 5000
      }
    },
    {
      id: 'set-temperature',
      label: 'Set Temperature',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Setting,
      priority: PriorityLevel.Secondary,
      component: 'NumericSetting',
      props: {
        property: 'setccdtemperature',
        label: 'Target Temperature',
        unit: '°C',
        min: -50,
        max: 50,
        step: 0.1
      }
    },
    {
      id: 'cooler-power',
      label: 'Cooler Power',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Secondary,
      component: 'DynamicValue',
      props: {
        property: 'coolerpwr',
        label: 'Cooler Power',
        unit: '%',
        formatter: (val: unknown) => (typeof val === 'number' ? val.toFixed(1) : val),
        pollInterval: 5000
      }
    },
    {
      id: 'cooler-toggle',
      label: 'Cooler',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Mode,
      priority: PriorityLevel.Secondary,
      component: 'ToggleSwitch',
      props: {
        property: 'cooleron',
        label: 'Cooler'
      }
    },

    // Tertiary features (visible only in fullscreen)
    {
      id: 'camera-name',
      label: 'Camera Name',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Tertiary,
      component: 'DynamicValue',
      props: {
        property: 'name',
        label: 'Camera Name'
      }
    },
    {
      id: 'camera-description',
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
      id: 'camera-pixel-size',
      label: 'Pixel Size',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Tertiary,
      component: 'DynamicValue',
      props: {
        property: 'pixelsizex',
        label: 'Pixel Size',
        unit: 'μm',
        formatter: (val: unknown) => (typeof val === 'number' ? val.toFixed(2) : val)
      }
    },
    {
      id: 'gain',
      label: 'Gain',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Setting,
      priority: PriorityLevel.Tertiary,
      component: 'NumericSetting',
      props: {
        property: 'gain',
        label: 'Gain',
        min: 0,
        max: 100,
        step: 1
      }
    }
  ]
}

export default CameraPanel
