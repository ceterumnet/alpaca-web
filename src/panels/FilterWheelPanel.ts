// Status: Good - Core Component
// This is the filter wheel panel definition that:
// - Defines core filter wheel functionality and features
// - Implements proper ASCOM Alpaca filter wheel interface
// - Provides filter selection and position control
// - Supports filter offset management
// - Maintains proper feature prioritization

import type { PanelDefinition } from '../types/panels/PanelDefinition'
import { FeatureSource, InteractionType, PriorityLevel } from '../types/panels/FeatureTypes'

const FilterWheelPanel: PanelDefinition = {
  id: 'filterwheel-panel',
  deviceType: 'filterwheel',
  title: 'Filter Wheel',
  description: 'Controls for filter wheel devices',
  features: [
    // Primary features (always visible)
    {
      id: 'current-position',
      label: 'Current Position',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Primary,
      component: 'DynamicValue',
      props: {
        property: 'position',
        label: 'Position',
        formatter: (val: unknown) => {
          if (typeof val === 'number') {
            return val.toString()
          }
          return val
        },
        pollInterval: 1000
      }
    },
    {
      id: 'select-filter',
      label: 'Select Filter',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.Action,
      priority: PriorityLevel.Primary,
      component: 'SelectSetting',
      props: {
        property: 'position',
        label: 'Filter',
        optionsProperty: 'names' // This will use the names array from the device
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
        pollInterval: 500
      }
    },

    // Secondary features (visible in detailed mode)
    {
      id: 'filter-names',
      label: 'Available Filters',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Secondary,
      component: 'FilterList',
      props: {
        property: 'names',
        label: 'Filters'
      }
    },
    {
      id: 'filter-offsets',
      label: 'Filter Focus Offsets',
      source: FeatureSource.Extended,
      interactionType: InteractionType.Setting,
      priority: PriorityLevel.Secondary,
      component: 'FilterOffsets',
      props: {
        property: 'focusoffsets',
        label: 'Focus Offsets'
      }
    },

    // Tertiary features (visible only in fullscreen)
    {
      id: 'filter-wheel-name',
      label: 'Filter Wheel Name',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Tertiary,
      component: 'DynamicValue',
      props: {
        property: 'name',
        label: 'Filter Wheel Name'
      }
    },
    {
      id: 'filter-wheel-description',
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
      id: 'slot-count',
      label: 'Number of Filters',
      source: FeatureSource.CoreAlpaca,
      interactionType: InteractionType.DynamicData,
      priority: PriorityLevel.Tertiary,
      component: 'DynamicValue',
      props: {
        property: 'positions',
        label: 'Filter Slots'
      }
    }
  ]
}

export default FilterWheelPanel
