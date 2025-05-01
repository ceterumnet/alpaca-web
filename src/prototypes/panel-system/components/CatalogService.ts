import { ref } from 'vue'

// Types for celestial objects
export interface CelestialObject {
  id: string
  name: string
  commonNames?: string[]
  type: string // galaxy, star, nebula, planet, etc.
  catalog: string // Messier, NGC, IC, etc.
  catalogId: string // M31, NGC7000, etc.
  ra?: number // Right Ascension in degrees
  dec?: number // Declination in degrees
  constellation?: string
  magnitude?: number
  imageUrl?: string
  description?: string
}

// Catalogs we support
export enum Catalog {
  MESSIER = 'Messier',
  NGC = 'NGC',
  IC = 'IC',
  SOLAR_SYSTEM = 'Solar System'
}

// Common objects database - a subset for the prototype
// In a real implementation, this would be fetched from an external API
const commonObjects: CelestialObject[] = [
  {
    id: 'M31',
    name: 'Andromeda Galaxy',
    commonNames: ['Andromeda Galaxy', 'M31', 'NGC224'],
    type: 'Galaxy',
    catalog: Catalog.MESSIER,
    catalogId: 'M31',
    ra: 10.68458,
    dec: 41.26917,
    constellation: 'Andromeda',
    magnitude: 3.4,
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Andromeda_Galaxy_%28with_h-alpha%29.jpg/600px-Andromeda_Galaxy_%28with_h-alpha%29.jpg',
    description:
      'The Andromeda Galaxy is a spiral galaxy approximately 2.5 million light-years from Earth and the nearest major galaxy to the Milky Way.'
  },
  {
    id: 'M42',
    name: 'Orion Nebula',
    commonNames: ['Great Nebula in Orion', 'M42', 'NGC1976'],
    type: 'Nebula',
    catalog: Catalog.MESSIER,
    catalogId: 'M42',
    ra: 83.82208,
    dec: -5.39111,
    constellation: 'Orion',
    magnitude: 4.0,
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Orion_Nebula_-_Hubble_2006_mosaic_18000.jpg/600px-Orion_Nebula_-_Hubble_2006_mosaic_18000.jpg',
    description:
      "The Orion Nebula is a diffuse nebula situated in the Milky Way, being south of Orion's Belt in the constellation of Orion."
  },
  {
    id: 'M45',
    name: 'Pleiades',
    commonNames: ['Seven Sisters', 'M45'],
    type: 'Open Cluster',
    catalog: Catalog.MESSIER,
    catalogId: 'M45',
    ra: 56.75,
    dec: 24.11667,
    constellation: 'Taurus',
    magnitude: 1.6,
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Pleiades_large.jpg/600px-Pleiades_large.jpg',
    description:
      'The Pleiades, also known as the Seven Sisters, is an open star cluster containing middle-aged, hot B-type stars in the constellation Taurus.'
  },
  {
    id: 'M13',
    name: 'Hercules Globular Cluster',
    commonNames: ['Great Globular Cluster in Hercules', 'M13', 'NGC6205'],
    type: 'Globular Cluster',
    catalog: Catalog.MESSIER,
    catalogId: 'M13',
    ra: 250.42083,
    dec: 36.46972,
    constellation: 'Hercules',
    magnitude: 5.8,
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Messier_13.jpg/600px-Messier_13.jpg',
    description:
      'Messier 13 is a globular cluster of several hundred thousand stars in the constellation of Hercules.'
  },
  {
    id: 'JUPITER',
    name: 'Jupiter',
    commonNames: ['Jupiter'],
    type: 'Planet',
    catalog: Catalog.SOLAR_SYSTEM,
    catalogId: 'Jupiter',
    magnitude: -2.2,
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Jupiter_and_its_shrunken_Great_Red_Spot.jpg/600px-Jupiter_and_its_shrunken_Great_Red_Spot.jpg',
    description: 'Jupiter is the fifth planet from the Sun and the largest in the Solar System.'
  },
  {
    id: 'NGC7000',
    name: 'North America Nebula',
    commonNames: ['North America Nebula', 'NGC7000'],
    type: 'Nebula',
    catalog: Catalog.NGC,
    catalogId: 'NGC7000',
    ra: 313.35,
    dec: 44.28333,
    constellation: 'Cygnus',
    magnitude: 4.0,
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/North_america_nebula_Calsky.jpg/600px-North_america_nebula_Calsky.jpg',
    description:
      'The North America Nebula is an emission nebula in the constellation Cygnus, close to Deneb.'
  }
]

// Mock implementation of a catalog service
export class CatalogService {
  private loading = ref(false)
  private error = ref<string | null>(null)

  // Search for an object by name or catalog ID
  async searchObject(query: string): Promise<CelestialObject[]> {
    this.loading.value = true
    this.error.value = null

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Case-insensitive search
      const normalizedQuery = query.toLowerCase().trim()

      // Search in our local database
      const results = commonObjects.filter((obj) => {
        const matchesName = obj.name.toLowerCase().includes(normalizedQuery)
        const matchesCatalogId = obj.catalogId.toLowerCase().includes(normalizedQuery)
        const matchesCommonNames =
          obj.commonNames?.some((name) => name.toLowerCase().includes(normalizedQuery)) || false

        return matchesName || matchesCatalogId || matchesCommonNames
      })

      return results
    } catch (err) {
      this.error.value = 'Failed to search for celestial object'
      console.error('Catalog search error:', err)
      return []
    } finally {
      this.loading.value = false
    }
  }

  // Get loading state
  getLoadingState() {
    return this.loading
  }

  // Get error state
  getErrorState() {
    return this.error
  }
}

// Create a singleton instance
export const catalogService = new CatalogService()
