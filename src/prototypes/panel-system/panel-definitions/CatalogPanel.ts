import { InteractionType } from './types'
import type { PanelDefinition, FeaturePriority, PanelFeature } from './types'
import { UIMode } from '@/stores/useUIPreferencesStore'

// Define the features for the Catalog Panel
const catalogFeatures: PanelFeature[] = [
  {
    id: 'catalog-search',
    name: 'Object Search',
    description: 'Search for celestial objects by name or catalog designation',
    priority: 'primary' as FeaturePriority,
    interactionType: InteractionType.ACTION,
    modes: [UIMode.OVERVIEW, UIMode.DETAILED, UIMode.FULLSCREEN]
  },
  {
    id: 'catalog-info',
    name: 'Object Information',
    description: 'Display detailed information about the selected celestial object',
    priority: 'primary' as FeaturePriority,
    interactionType: InteractionType.DYNAMIC_DATA,
    modes: [UIMode.OVERVIEW, UIMode.DETAILED, UIMode.FULLSCREEN]
  },
  {
    id: 'catalog-image',
    name: 'Object Image',
    description: 'Display image of the selected celestial object',
    priority: 'primary' as FeaturePriority,
    interactionType: InteractionType.DYNAMIC_DATA,
    modes: [UIMode.DETAILED, UIMode.FULLSCREEN]
  },
  {
    id: 'catalog-filter',
    name: 'Filter by Catalog',
    description: 'Filter objects by catalog type (Messier, NGC, IC, etc.)',
    priority: 'secondary' as FeaturePriority,
    interactionType: InteractionType.SETTING,
    modes: [UIMode.DETAILED, UIMode.FULLSCREEN]
  },
  {
    id: 'object-type-filter',
    name: 'Filter by Object Type',
    description: 'Filter objects by type (galaxy, nebula, star cluster, etc.)',
    priority: 'secondary' as FeaturePriority,
    interactionType: InteractionType.SETTING,
    modes: [UIMode.DETAILED, UIMode.FULLSCREEN]
  },
  {
    id: 'constellation-filter',
    name: 'Filter by Constellation',
    description: 'Filter objects by the constellation they appear in',
    priority: 'tertiary' as FeaturePriority,
    interactionType: InteractionType.SETTING,
    modes: [UIMode.DETAILED, UIMode.FULLSCREEN]
  },
  {
    id: 'send-to-telescope',
    name: 'Send to Telescope',
    description: 'Send object coordinates to connected telescope',
    priority: 'secondary' as FeaturePriority,
    interactionType: InteractionType.ACTION,
    modes: [UIMode.DETAILED, UIMode.FULLSCREEN]
  },
  {
    id: 'save-to-favorites',
    name: 'Save to Favorites',
    description: 'Save object to favorites list for quick access',
    priority: 'tertiary' as FeaturePriority,
    interactionType: InteractionType.ACTION,
    modes: [UIMode.DETAILED, UIMode.FULLSCREEN]
  },
  {
    id: 'favorite-objects',
    name: 'Favorite Objects',
    description: 'List of favorite celestial objects',
    priority: 'tertiary' as FeaturePriority,
    interactionType: InteractionType.DYNAMIC_DATA,
    modes: [UIMode.DETAILED, UIMode.FULLSCREEN]
  }
]

// Create the Catalog Panel definition
const CatalogPanel: PanelDefinition = {
  deviceType: 'catalog',
  name: 'Catalog',
  description: 'Lookup and explore celestial objects from various astronomical catalogs',
  features: catalogFeatures,
  defaultWidth: 400,
  defaultHeight: 600
}

export default CatalogPanel
