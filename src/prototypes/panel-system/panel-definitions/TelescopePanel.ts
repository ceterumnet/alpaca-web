// Telescope Panel Definition - Based on Alpaca specification
import { UIMode } from '@/stores/useUIPreferencesStore'
import type { PanelDefinition } from './types'
import { InteractionType } from './types'

const TelescopePanel: PanelDefinition = {
  deviceType: 'telescope',
  name: 'Telescope',
  description: 'Controls for telescope devices following the ASCOM Alpaca specification',
  defaultWidth: 3,
  defaultHeight: 4,

  features: [
    // PRIMARY FEATURES - Core slewing and position controls
    {
      id: 'coordinates',
      name: 'Current Position',
      description: 'Current telescope coordinates (RA/Dec or Alt/Az)',
      priority: 'primary',
      alpacaProperty: 'rightascension,declination',
      interactionType: InteractionType.DYNAMIC_DATA,
      modes: [UIMode.OVERVIEW, UIMode.DETAILED, UIMode.FULLSCREEN]
    },
    {
      id: 'slewToCoordinates',
      name: 'Slew to Coordinates',
      description: 'Slew the telescope to specific coordinates',
      priority: 'primary',
      alpacaMethod: 'slewtocoordinatesasync',
      interactionType: InteractionType.ACTION,
      modes: [UIMode.OVERVIEW, UIMode.DETAILED, UIMode.FULLSCREEN]
    },
    {
      id: 'abortSlew',
      name: 'Abort Slew',
      description: 'Emergency control to stop any telescope motion',
      priority: 'primary',
      alpacaMethod: 'abortslew',
      interactionType: InteractionType.ACTION,
      modes: [UIMode.OVERVIEW, UIMode.DETAILED, UIMode.FULLSCREEN]
    },
    {
      id: 'tracking',
      name: 'Tracking',
      description: 'Toggle telescope tracking on/off',
      priority: 'primary',
      alpacaProperty: 'tracking',
      interactionType: InteractionType.MODE,
      modes: [UIMode.OVERVIEW, UIMode.DETAILED, UIMode.FULLSCREEN]
    },
    {
      id: 'directionalControls',
      name: 'Motion Controls',
      description: 'Manual motion controls (N/S/E/W)',
      priority: 'primary',
      alpacaMethod: 'moveaxis',
      interactionType: InteractionType.ACTION,
      modes: [UIMode.OVERVIEW, UIMode.DETAILED, UIMode.FULLSCREEN]
    },

    // SECONDARY FEATURES - Important but not essential
    {
      id: 'alignmentMode',
      name: 'Alignment Mode',
      description: 'Set telescope alignment mode (Alt/Az, Polar, German)',
      priority: 'secondary',
      alpacaProperty: 'alignmentmode',
      interactionType: InteractionType.MODE,
      modes: [UIMode.DETAILED, UIMode.FULLSCREEN],
      parameters: {
        options: ['altAz', 'polar', 'germanEquatorial']
      }
    },
    {
      id: 'altAzCoordinates',
      name: 'Alt/Az Position',
      description: 'Current altitude and azimuth coordinates',
      priority: 'secondary',
      alpacaProperty: 'altitude,azimuth',
      interactionType: InteractionType.DYNAMIC_DATA,
      modes: [UIMode.DETAILED, UIMode.FULLSCREEN],
      visibleWhen: { alignmentMode: 'altAz' }
    },
    {
      id: 'slewToAltAz',
      name: 'Slew to Alt/Az',
      description: 'Slew to specific altitude and azimuth',
      priority: 'secondary',
      alpacaMethod: 'slewtoaltazasync',
      interactionType: InteractionType.ACTION,
      modes: [UIMode.DETAILED, UIMode.FULLSCREEN],
      visibleWhen: { alignmentMode: 'altAz' }
    },
    {
      id: 'parkControl',
      name: 'Park Controls',
      description: 'Park and unpark the telescope',
      priority: 'secondary',
      alpacaMethod: 'park,unpark',
      interactionType: InteractionType.ACTION,
      modes: [UIMode.DETAILED, UIMode.FULLSCREEN]
    },
    {
      id: 'parkingStatus',
      name: 'Parking Status',
      description: 'Current parking state of the telescope',
      priority: 'secondary',
      alpacaProperty: 'atpark',
      interactionType: InteractionType.DYNAMIC_DATA,
      modes: [UIMode.DETAILED, UIMode.FULLSCREEN]
    },
    {
      id: 'findHome',
      name: 'Find Home',
      description: 'Command telescope to find its home position',
      priority: 'secondary',
      alpacaMethod: 'findhome',
      interactionType: InteractionType.ACTION,
      modes: [UIMode.DETAILED, UIMode.FULLSCREEN]
    },

    // TERTIARY FEATURES - Advanced or specialized
    {
      id: 'sideOfPier',
      name: 'Side of Pier',
      description: 'Current and preferred side of pier (German Equatorial)',
      priority: 'tertiary',
      alpacaProperty: 'sideofpier',
      interactionType: InteractionType.DYNAMIC_DATA,
      modes: [UIMode.DETAILED, UIMode.FULLSCREEN],
      visibleWhen: { alignmentMode: 'germanEquatorial' }
    },
    {
      id: 'trackingRate',
      name: 'Tracking Rate',
      description: 'Set telescope tracking rate',
      priority: 'tertiary',
      alpacaProperty: 'trackingrate',
      interactionType: InteractionType.SETTING,
      modes: [UIMode.DETAILED, UIMode.FULLSCREEN],
      parameters: {
        options: ['sidereal', 'lunar', 'solar', 'custom']
      }
    },
    {
      id: 'customTrackingRate',
      name: 'Custom Rate',
      description: 'Set custom tracking rate in RA and Dec',
      priority: 'tertiary',
      alpacaProperty: 'trackingrates',
      interactionType: InteractionType.SETTING,
      modes: [UIMode.FULLSCREEN],
      visibleWhen: { trackingRate: 'custom' },
      parameters: {
        controlType: 'doubleInput'
      }
    },
    {
      id: 'siteSettings',
      name: 'Site Settings',
      description: 'Set site latitude, longitude, and elevation',
      priority: 'tertiary',
      alpacaProperty: 'sitelatitude,sitelongitude,siteelevation',
      interactionType: InteractionType.SETTING,
      modes: [UIMode.FULLSCREEN]
    },
    {
      id: 'precisionPointing',
      name: 'Precision Pointing',
      description: 'Enhanced precision pointing assistant',
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

      // Handle alignment mode capabilities
      if (feature.id === 'alignmentMode') {
        newFeature.disabled = capabilities.cansetguiderates === false
      }

      // Handle parking capabilities
      if (feature.id === 'parkControl' || feature.id === 'parkingStatus') {
        newFeature.disabled = capabilities.canpark === false
      }

      // Handle home position capabilities
      if (feature.id === 'findHome') {
        newFeature.disabled = capabilities.canfindhome === false
      }

      // Handle side of pier capabilities for German Equatorial mounts
      if (feature.id === 'sideOfPier') {
        newFeature.disabled = capabilities.alignmentmode !== 'germanEquatorial'
      }

      // Handle tracking rate capabilities
      if (feature.id === 'trackingRate') {
        newFeature.disabled = capabilities.cansettrackingrate === false
      }

      // Conditional visibility based on mount type and features
      if (feature.visibleWhen) {
        if (
          (feature.visibleWhen.alignmentMode &&
            feature.visibleWhen.alignmentMode !== capabilities.alignmentmode) ||
          (feature.visibleWhen.trackingRate &&
            feature.visibleWhen.trackingRate !== capabilities.trackingrate)
        ) {
          newFeature.disabled = true
        }
      }

      return newFeature
    })
  }
}

export default TelescopePanel
