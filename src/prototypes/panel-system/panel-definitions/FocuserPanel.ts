// Focuser Panel Definition - Based on Alpaca specification
import { UIMode } from '@/stores/useUIPreferencesStore'
import type { PanelDefinition } from './types'
import { InteractionType } from './types'

const FocuserPanel: PanelDefinition = {
  deviceType: 'focuser',
  name: 'Focuser',
  description: 'Controls for focuser devices following the ASCOM Alpaca specification',
  defaultWidth: 2,
  defaultHeight: 3,

  features: [
    // PRIMARY FEATURES - Core movement and position controls
    {
      id: 'position',
      name: 'Current Position',
      description: 'Current focuser position and position control',
      priority: 'primary',
      alpacaProperty: 'position',
      interactionType: InteractionType.DYNAMIC_DATA,
      modes: [UIMode.OVERVIEW, UIMode.DETAILED, UIMode.FULLSCREEN]
    },
    {
      id: 'moveAbsolute',
      name: 'Move Absolute',
      description: 'Move to an absolute position',
      priority: 'primary',
      alpacaMethod: 'move',
      interactionType: InteractionType.ACTION,
      modes: [UIMode.OVERVIEW, UIMode.DETAILED, UIMode.FULLSCREEN]
    },
    {
      id: 'moveRelative',
      name: 'Move Relative',
      description: 'Move in or out by a specific amount',
      priority: 'primary',
      interactionType: InteractionType.ACTION,
      modes: [UIMode.OVERVIEW, UIMode.DETAILED, UIMode.FULLSCREEN],
      parameters: {
        stepSize: 100
      }
    },
    {
      id: 'isMoving',
      name: 'Motion Status',
      description: 'Indicates if the focuser is currently moving',
      priority: 'primary',
      alpacaProperty: 'ismoving',
      interactionType: InteractionType.DYNAMIC_DATA,
      modes: [UIMode.OVERVIEW, UIMode.DETAILED, UIMode.FULLSCREEN]
    },
    {
      id: 'halt',
      name: 'Halt',
      description: 'Emergency stop for focuser movement',
      priority: 'primary',
      alpacaMethod: 'halt',
      interactionType: InteractionType.ACTION,
      modes: [UIMode.OVERVIEW, UIMode.DETAILED, UIMode.FULLSCREEN]
    },

    // SECONDARY FEATURES - Important but not essential
    {
      id: 'tempComp',
      name: 'Temperature Compensation',
      description: 'Toggle temperature compensation mode',
      priority: 'secondary',
      alpacaProperty: 'tempcomp',
      interactionType: InteractionType.MODE,
      modes: [UIMode.DETAILED, UIMode.FULLSCREEN],
      disabled: true // Enabled if tempcomp is available
    },
    {
      id: 'temperature',
      name: 'Temperature',
      description: 'Current focuser temperature',
      priority: 'secondary',
      alpacaProperty: 'temperature',
      interactionType: InteractionType.DYNAMIC_DATA,
      modes: [UIMode.DETAILED, UIMode.FULLSCREEN],
      disabled: true // Enabled if temperature reporting is available
    },
    {
      id: 'tempCompParams',
      name: 'Temp Comp Settings',
      description: 'Temperature compensation parameters',
      priority: 'secondary',
      interactionType: InteractionType.SETTING,
      modes: [UIMode.DETAILED, UIMode.FULLSCREEN],
      disabled: true, // Enabled if tempcomp is available and on
      visibleWhen: { tempComp: true },
      parameters: {
        slope: 0.0,
        stepSize: 10
      }
    },

    // TERTIARY FEATURES - Advanced or specialized
    {
      id: 'maxStep',
      name: 'Maximum Step',
      description: 'Maximum step size for the focuser',
      priority: 'tertiary',
      alpacaProperty: 'maxstep',
      interactionType: InteractionType.SETTING,
      modes: [UIMode.DETAILED, UIMode.FULLSCREEN]
    },
    {
      id: 'maxPosition',
      name: 'Maximum Position',
      description: 'Maximum position of the focuser',
      priority: 'tertiary',
      alpacaProperty: 'maxposition',
      interactionType: InteractionType.DYNAMIC_DATA,
      modes: [UIMode.DETAILED, UIMode.FULLSCREEN]
    },
    {
      id: 'backlash',
      name: 'Backlash Compensation',
      description: 'Configure backlash compensation',
      priority: 'tertiary',
      interactionType: InteractionType.SETTING,
      modes: [UIMode.FULLSCREEN],
      disabled: true, // Enabled if backlash compensation is available
      parameters: {
        backlashIn: 0,
        backlashOut: 0
      }
    },
    {
      id: 'focuserPositionHistory',
      name: 'Position History',
      description: 'View and manage historical focus positions',
      priority: 'tertiary',
      interactionType: InteractionType.FEATURE,
      isExtended: true, // Not part of core Alpaca spec
      modes: [UIMode.FULLSCREEN]
    }
  ],

  // Function to filter features based on device capabilities
  filterFeaturesByCapabilities(features, capabilities) {
    return features.map((feature) => {
      const newFeature = { ...feature }

      // Enable/disable temperature compensation based on capability
      if (feature.id === 'tempComp') {
        newFeature.disabled = capabilities.tempcompavailable === false
      }

      // Enable/disable temperature display based on capability
      if (feature.id === 'temperature') {
        newFeature.disabled = capabilities.tempcomp === false
      }

      // Enable/disable temp comp params based on capability and state
      if (feature.id === 'tempCompParams') {
        newFeature.disabled =
          capabilities.tempcompavailable === false || capabilities.tempcomp === false
      }

      // Enable/disable backlash compensation based on capability
      if (feature.id === 'backlash') {
        newFeature.disabled = capabilities.cansetbacklash === false
      }

      // Conditional visibility based on other settings/modes
      if (feature.visibleWhen) {
        if (
          feature.visibleWhen.tempComp &&
          feature.visibleWhen.tempComp !== capabilities.tempcomp
        ) {
          newFeature.disabled = true
        }
      }

      return newFeature
    })
  }
}

export default FocuserPanel
