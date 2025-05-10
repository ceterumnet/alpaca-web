// Status: Good - Core Component
// This is the telescope panel definition that:
// - Defines core telescope functionality and features
// - Implements proper ASCOM Alpaca telescope interface
// - Provides mount control and positioning
// - Supports tracking and slewing operations
// - Maintains proper feature prioritization

import type { PanelDefinition } from '../types/panels/PanelDefinition'
import { FeatureSource, InteractionType, PriorityLevel } from '../types/panels/FeatureTypes'

const TelescopePanel: PanelDefinition = {
  id: 'telescope',
  deviceType: 'telescope',
  title: 'Telescope',
  description: 'Controls for telescope devices',
  features: [
    // Primary features (always visible)
    {
      id: 'coordinates-display',
      label: 'Current Position',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Primary,
      component: 'CoordinatesDisplay',
      props: {
        raProperty: 'rightascension',
        decProperty: 'declination',
        label: 'Position',
        pollInterval: 1000
      }
    },
    {
      id: 'slew-to-coordinates',
      label: 'Go To',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Action,
      priority: PriorityLevel.Primary,
      component: 'SlewToCoordinates',
      props: {
        method: 'slewtocoordinates',
        label: 'Go To Coordinates'
      }
    },
    {
      id: 'abort-slew',
      label: 'Stop',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Action,
      priority: PriorityLevel.Primary,
      component: 'ActionButton',
      props: {
        method: 'abortslew',
        label: 'Stop',
        icon: 'stop',
        confirmText: 'Are you sure you want to abort the current slew?'
      }
    },
    {
      id: 'tracking-toggle',
      label: 'Tracking',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Mode,
      priority: PriorityLevel.Primary,
      component: 'ToggleSwitch',
      props: {
        property: 'tracking',
        label: 'Tracking'
      }
    },

    // Secondary features (visible in detailed mode)
    {
      id: 'slew-rate',
      label: 'Slew Rate',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Setting,
      priority: PriorityLevel.Secondary,
      component: 'NumericSetting',
      props: {
        property: 'slewsettletime',
        label: 'Slew Rate',
        min: 0,
        max: 100,
        step: 1
      }
    },
    {
      id: 'pulse-guide',
      label: 'Pulse Guide',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Action,
      priority: PriorityLevel.Secondary,
      component: 'PulseGuideControl',
      props: {
        method: 'pulseguide',
        label: 'Pulse Guide'
      }
    },
    {
      id: 'site-elevation',
      label: 'Site Elevation',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Secondary,
      component: 'DynamicValue',
      props: {
        property: 'siteelevation',
        label: 'Site Elevation',
        unit: 'm',
        formatter: (val: unknown) => (typeof val === 'number' ? val.toFixed(1) : val),
        pollInterval: 10000
      }
    },
    {
      id: 'alignment-mode',
      label: 'Alignment',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Mode,
      priority: PriorityLevel.Secondary,
      component: 'SelectSetting',
      props: {
        property: 'alignmentmode',
        label: 'Alignment Mode',
        options: [
          { value: 0, label: 'Alt/Az' },
          { value: 1, label: 'Polar' },
          { value: 2, label: 'German Polar' }
        ]
      }
    },

    // Tertiary features (visible only in fullscreen)
    {
      id: 'telescope-name',
      label: 'Telescope Name',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Tertiary,
      component: 'DynamicValue',
      props: {
        property: 'name',
        label: 'Telescope Name'
      }
    },
    {
      id: 'telescope-description',
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
      id: 'sidereal-time',
      label: 'Sidereal Time',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Tertiary,
      component: 'DynamicValue',
      props: {
        property: 'siderealtime',
        label: 'Sidereal Time',
        formatter: (val: unknown) => {
          if (typeof val === 'number') {
            const hours = Math.floor(val)
            const minutes = Math.floor((val - hours) * 60)
            const seconds = Math.floor(((val - hours) * 60 - minutes) * 60)
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
          }
          return val
        },
        pollInterval: 1000
      }
    },
    {
      id: 'park-telescope',
      label: 'Park',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Action,
      priority: PriorityLevel.Tertiary,
      component: 'ActionButton',
      props: {
        method: 'park',
        label: 'Park Telescope',
        icon: 'park'
      }
    },
    {
      id: 'unpark-telescope',
      label: 'Unpark',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Action,
      priority: PriorityLevel.Tertiary,
      component: 'ActionButton',
      props: {
        method: 'unpark',
        label: 'Unpark Telescope',
        icon: 'unpark'
      }
    },
    {
      id: 'site-latitude',
      label: 'Site Latitude',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Setting,
      priority: PriorityLevel.Tertiary,
      component: 'NumericSetting',
      props: {
        property: 'sitelatitude',
        label: 'Site Latitude',
        unit: '°',
        min: -90,
        max: 90,
        step: 0.01
      }
    },
    {
      id: 'site-longitude',
      label: 'Site Longitude',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Setting,
      priority: PriorityLevel.Tertiary,
      component: 'NumericSetting',
      props: {
        property: 'sitelongitude',
        label: 'Site Longitude',
        unit: '°',
        min: -180,
        max: 180,
        step: 0.01
      }
    }
  ]
}

export default TelescopePanel
