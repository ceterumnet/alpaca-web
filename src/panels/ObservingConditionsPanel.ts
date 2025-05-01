// Status: Good - Core Component
// This is the observing conditions panel definition that:
// - Defines core weather monitoring functionality
// - Implements proper ASCOM Alpaca observing conditions interface
// - Provides environmental sensor readings
// - Supports safe observing conditions monitoring
// - Maintains proper feature prioritization

import type { PanelDefinition } from '../types/panels/PanelDefinition'
import { FeatureSource, InteractionType, PriorityLevel } from '../types/panels/FeatureTypes'

const ObservingConditionsPanel: PanelDefinition = {
  id: 'observing-conditions-panel',
  deviceType: 'observingconditions',
  title: 'Observing Conditions',
  description: 'Weather and environmental conditions monitoring',
  features: [
    // Primary features (always visible)
    {
      id: 'temperature',
      label: 'Temperature',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Primary,
      component: 'DynamicValue',
      props: {
        property: 'temperature',
        label: 'Temperature',
        unit: '°C',
        formatter: (val: unknown) => (typeof val === 'number' ? val.toFixed(1) : val),
        pollInterval: 30000
      },
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'sensordescription-temperature',
          value: null,
          condition: 'notEquals'
        }
      ]
    },
    {
      id: 'humidity',
      label: 'Humidity',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Primary,
      component: 'DynamicValue',
      props: {
        property: 'humidity',
        label: 'Humidity',
        unit: '%',
        formatter: (val: unknown) => (typeof val === 'number' ? val.toFixed(0) : val),
        pollInterval: 30000
      },
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'sensordescription-humidity',
          value: null,
          condition: 'notEquals'
        }
      ]
    },
    {
      id: 'pressure',
      label: 'Pressure',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Primary,
      component: 'DynamicValue',
      props: {
        property: 'pressure',
        label: 'Pressure',
        unit: 'hPa',
        formatter: (val: unknown) => (typeof val === 'number' ? val.toFixed(1) : val),
        pollInterval: 30000
      },
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'sensordescription-pressure',
          value: null,
          condition: 'notEquals'
        }
      ]
    },
    {
      id: 'cloudcover',
      label: 'Cloud Cover',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Primary,
      component: 'DynamicValue',
      props: {
        property: 'cloudcover',
        label: 'Cloud Cover',
        unit: '%',
        formatter: (val: unknown) => (typeof val === 'number' ? val.toFixed(0) : val),
        pollInterval: 30000
      },
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'sensordescription-cloudcover',
          value: null,
          condition: 'notEquals'
        }
      ]
    },

    // Secondary features (visible in detailed mode)
    {
      id: 'windspeed',
      label: 'Wind Speed',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Secondary,
      component: 'DynamicValue',
      props: {
        property: 'windspeed',
        label: 'Wind Speed',
        unit: 'm/s',
        formatter: (val: unknown) => (typeof val === 'number' ? val.toFixed(1) : val),
        pollInterval: 30000
      },
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'sensordescription-windspeed',
          value: null,
          condition: 'notEquals'
        }
      ]
    },
    {
      id: 'winddirection',
      label: 'Wind Direction',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Secondary,
      component: 'DynamicValue',
      props: {
        property: 'winddirection',
        label: 'Wind Direction',
        unit: '°',
        formatter: (val: unknown) => {
          if (typeof val === 'number') {
            const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N']
            const index = Math.round(val / 45)
            return `${val.toFixed(0)}° (${directions[index]})`
          }
          return val
        },
        pollInterval: 30000
      },
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'sensordescription-winddirection',
          value: null,
          condition: 'notEquals'
        }
      ]
    },
    {
      id: 'skybrightness',
      label: 'Sky Brightness',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Secondary,
      component: 'DynamicValue',
      props: {
        property: 'skybrightness',
        label: 'Sky Brightness',
        unit: 'lux',
        formatter: (val: unknown) => (typeof val === 'number' ? val.toFixed(2) : val),
        pollInterval: 30000
      },
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'sensordescription-skybrightness',
          value: null,
          condition: 'notEquals'
        }
      ]
    },
    {
      id: 'refresh-data',
      label: 'Refresh Data',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Action,
      priority: PriorityLevel.Secondary,
      component: 'ActionButton',
      props: {
        method: 'refresh',
        label: 'Refresh Data',
        icon: 'refresh'
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
      id: 'skyquality',
      label: 'Sky Quality',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Tertiary,
      component: 'DynamicValue',
      props: {
        property: 'skyquality',
        label: 'Sky Quality',
        unit: 'mag/arcsec²',
        formatter: (val: unknown) => (typeof val === 'number' ? val.toFixed(2) : val),
        pollInterval: 30000
      },
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'sensordescription-skyquality',
          value: null,
          condition: 'notEquals'
        }
      ]
    },
    {
      id: 'starfwhm',
      label: 'Star FWHM',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Tertiary,
      component: 'DynamicValue',
      props: {
        property: 'starfwhm',
        label: 'Star FWHM',
        unit: 'arcsec',
        formatter: (val: unknown) => (typeof val === 'number' ? val.toFixed(2) : val),
        pollInterval: 30000
      },
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'sensordescription-starfwhm',
          value: null,
          condition: 'notEquals'
        }
      ]
    },
    {
      id: 'rainrate',
      label: 'Rain Rate',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Tertiary,
      component: 'DynamicValue',
      props: {
        property: 'rainrate',
        label: 'Rain Rate',
        unit: 'mm/h',
        formatter: (val: unknown) => (typeof val === 'number' ? val.toFixed(1) : val),
        pollInterval: 30000
      },
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'sensordescription-rainrate',
          value: null,
          condition: 'notEquals'
        }
      ]
    },
    {
      id: 'dewpoint',
      label: 'Dew Point',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Tertiary,
      component: 'DynamicValue',
      props: {
        property: 'dewpoint',
        label: 'Dew Point',
        unit: '°C',
        formatter: (val: unknown) => (typeof val === 'number' ? val.toFixed(1) : val),
        pollInterval: 30000
      },
      visibilityRules: [
        {
          type: 'deviceProperty',
          property: 'sensordescription-dewpoint',
          value: null,
          condition: 'notEquals'
        }
      ]
    }
  ]
}

export default ObservingConditionsPanel
