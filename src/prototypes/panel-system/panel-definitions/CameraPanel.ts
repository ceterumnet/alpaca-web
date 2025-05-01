// Status: Legacy - Prototype
// This is a prototype panel definition that has been superseded by the new panel system
// The new implementation is in src/panels/CameraPanel.ts
// TODO: Remove this file once migration is complete

// Camera Panel Definition - Based on Alpaca specification
import { UIMode } from '@/stores/useUIPreferencesStore'
import type { PanelDefinition } from './types'
import { InteractionType } from './types'

const CameraPanel: PanelDefinition = {
  deviceType: 'camera',
  name: 'Camera',
  description: 'Controls for camera devices following the ASCOM Alpaca specification',
  defaultWidth: 3,
  defaultHeight: 3,

  features: [
    // PRIMARY FEATURES - Core actions and real-time data
    {
      id: 'exposure',
      name: 'Exposure Control',
      description: 'Start and abort camera exposures',
      priority: 'primary',
      alpacaMethod: 'startexposure',
      interactionType: InteractionType.ACTION,
      modes: [UIMode.OVERVIEW, UIMode.DETAILED, UIMode.FULLSCREEN],
      parameters: {
        sliderMin: 0.001,
        sliderMax: 3600,
        defaultValue: 1.0,
        lightFrameEnabled: true
      }
    },
    {
      id: 'stopExposure',
      name: 'Stop Exposure',
      description: 'Emergency control to abort the current exposure',
      priority: 'primary',
      alpacaMethod: 'stopexposure',
      interactionType: InteractionType.ACTION,
      modes: [UIMode.OVERVIEW, UIMode.DETAILED, UIMode.FULLSCREEN]
    },
    {
      id: 'imageReady',
      name: 'Image Ready Status',
      description: 'Indicates when an image is ready for download',
      priority: 'primary',
      alpacaProperty: 'imageready',
      interactionType: InteractionType.DYNAMIC_DATA,
      modes: [UIMode.OVERVIEW, UIMode.DETAILED, UIMode.FULLSCREEN]
    },
    {
      id: 'download',
      name: 'Image Download',
      description: 'Download and display the captured image',
      priority: 'primary',
      alpacaMethod: 'imagearray',
      interactionType: InteractionType.ACTION,
      modes: [UIMode.OVERVIEW, UIMode.DETAILED, UIMode.FULLSCREEN]
    },
    {
      id: 'progress',
      name: 'Exposure Progress',
      description: 'Shows the progress of the current exposure',
      priority: 'primary',
      alpacaProperty: 'percentcompleted',
      interactionType: InteractionType.DYNAMIC_DATA,
      modes: [UIMode.OVERVIEW, UIMode.DETAILED, UIMode.FULLSCREEN]
    },

    // SECONDARY FEATURES - Important but not essential
    {
      id: 'cooler',
      name: 'CCD Cooling Toggle',
      description: 'Toggle the camera cooler on/off',
      priority: 'secondary',
      alpacaProperty: 'cooleron',
      interactionType: InteractionType.MODE,
      modes: [UIMode.DETAILED, UIMode.FULLSCREEN],
      disabled: true // Disabled by default, enabled if cancool is true
    },
    {
      id: 'temperature',
      name: 'CCD Temperature',
      description: 'Current temperature of the CCD',
      priority: 'secondary',
      alpacaProperty: 'ccdtemperature',
      interactionType: InteractionType.DYNAMIC_DATA,
      modes: [UIMode.DETAILED, UIMode.FULLSCREEN],
      disabled: true
    },
    {
      id: 'targetTemperature',
      name: 'Target Temperature',
      description: 'Set the target cooling temperature',
      priority: 'secondary',
      alpacaProperty: 'setccdtemperature',
      interactionType: InteractionType.SETTING,
      modes: [UIMode.DETAILED, UIMode.FULLSCREEN],
      disabled: true,
      parameters: {
        minTemp: -30,
        maxTemp: 20,
        defaultTemp: 0,
        temperatureStep: 1
      }
    },
    {
      id: 'binning',
      name: 'Binning',
      description: 'Controls for camera binning',
      priority: 'secondary',
      alpacaProperty: 'binx',
      interactionType: InteractionType.SETTING,
      modes: [UIMode.DETAILED, UIMode.FULLSCREEN],
      parameters: {
        binningOptions: [1, 2, 3, 4]
      }
    },

    // TERTIARY FEATURES - Advanced or specialized
    {
      id: 'gainMode',
      name: 'Gain Mode',
      description: 'Select between gain index or value mode',
      priority: 'tertiary',
      alpacaProperty: 'gainmode',
      interactionType: InteractionType.MODE,
      modes: [UIMode.DETAILED, UIMode.FULLSCREEN],
      disabled: true,
      parameters: {
        options: ['Index', 'Value']
      }
    },
    {
      id: 'gains',
      name: 'Gain Index Selection',
      description: 'Select from predefined gain indexes',
      priority: 'tertiary',
      alpacaProperty: 'gains',
      interactionType: InteractionType.SETTING,
      modes: [UIMode.DETAILED, UIMode.FULLSCREEN],
      disabled: true,
      visibleWhen: { gainMode: 'Index' },
      parameters: {
        controlType: 'dropdown'
      }
    },
    {
      id: 'gain',
      name: 'Gain Value',
      description: 'Set a specific gain value',
      priority: 'tertiary',
      alpacaProperty: 'gain',
      interactionType: InteractionType.SETTING,
      modes: [UIMode.DETAILED, UIMode.FULLSCREEN],
      disabled: true,
      visibleWhen: { gainMode: 'Value' },
      parameters: {
        controlType: 'slider',
        min: 0,
        max: 100
      }
    },
    {
      id: 'offsetMode',
      name: 'Offset Mode',
      description: 'Select between offset index or value mode',
      priority: 'tertiary',
      alpacaProperty: 'offsetmode',
      interactionType: InteractionType.MODE,
      modes: [UIMode.DETAILED, UIMode.FULLSCREEN],
      disabled: true,
      parameters: {
        options: ['Index', 'Value']
      }
    },
    {
      id: 'offsets',
      name: 'Offset Index Selection',
      description: 'Select from predefined offset indexes',
      priority: 'tertiary',
      alpacaProperty: 'offsets',
      interactionType: InteractionType.SETTING,
      modes: [UIMode.DETAILED, UIMode.FULLSCREEN],
      disabled: true,
      visibleWhen: { offsetMode: 'Index' },
      parameters: {
        controlType: 'dropdown'
      }
    },
    {
      id: 'offset',
      name: 'Offset Value',
      description: 'Set a specific offset value',
      priority: 'tertiary',
      alpacaProperty: 'offset',
      interactionType: InteractionType.SETTING,
      modes: [UIMode.DETAILED, UIMode.FULLSCREEN],
      disabled: true,
      visibleWhen: { offsetMode: 'Value' },
      parameters: {
        controlType: 'slider',
        min: 0,
        max: 100
      }
    },
    {
      id: 'readMode',
      name: 'Read Mode',
      description: 'Select camera read mode',
      priority: 'tertiary',
      alpacaProperty: 'readoutmode',
      interactionType: InteractionType.SETTING,
      modes: [UIMode.DETAILED, UIMode.FULLSCREEN]
    },
    {
      id: 'imageHistory',
      name: 'Image History',
      description: 'View and manage captured images',
      priority: 'secondary',
      interactionType: InteractionType.FEATURE,
      isExtended: true, // Not part of core Alpaca spec
      modes: [UIMode.DETAILED, UIMode.FULLSCREEN]
    }
  ],

  // Function to filter features based on device capabilities
  filterFeaturesByCapabilities(features, capabilities) {
    return features.map((feature) => {
      const newFeature = { ...feature }

      // Enable/disable cooling features based on camera capabilities
      if (
        feature.id === 'cooler' ||
        feature.id === 'temperature' ||
        feature.id === 'targetTemperature'
      ) {
        newFeature.disabled = !(
          capabilities.cancool === true || capabilities.cansetccdtemperature === true
        )
      }

      // Handle gain mode capabilities
      if (feature.id === 'gainMode') {
        newFeature.disabled = capabilities.cangain === false
      }

      // Handle gain index capabilities - only visible in index mode
      if (feature.id === 'gains') {
        newFeature.disabled =
          capabilities.cangain === false ||
          !capabilities.gains ||
          (Array.isArray(capabilities.gains) && capabilities.gains.length <= 1) ||
          capabilities.gainmode !== 'Index'
      }

      // Handle gain value capabilities - only visible in value mode
      if (feature.id === 'gain') {
        newFeature.disabled = capabilities.cangain === false || capabilities.gainmode !== 'Value'
      }

      // Similar logic for offset modes
      if (feature.id === 'offsetMode') {
        newFeature.disabled = capabilities.canoffset === false
      }

      if (feature.id === 'offsets') {
        newFeature.disabled =
          capabilities.canoffset === false ||
          !capabilities.offsets ||
          (Array.isArray(capabilities.offsets) && capabilities.offsets.length <= 1) ||
          capabilities.offsetmode !== 'Index'
      }

      if (feature.id === 'offset') {
        newFeature.disabled =
          capabilities.canoffset === false || capabilities.offsetmode !== 'Value'
      }

      // Handle read modes if available
      if (feature.id === 'readMode') {
        newFeature.disabled =
          !capabilities.readoutmodes ||
          (Array.isArray(capabilities.readoutmodes) && capabilities.readoutmodes.length <= 1)
      }

      return newFeature
    })
  }
}

export default CameraPanel
