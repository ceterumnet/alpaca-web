<template>
  <div class="catalog-demo">
    <header class="demo-header">
      <h1>Astronomical Object Catalog</h1>
      <div class="mode-switcher">
        <button
          :class="['mode-btn', { active: currentMode === 'overview' }]"
          @click="currentMode = 'overview'"
        >
          Overview
        </button>
        <button
          :class="['mode-btn', { active: currentMode === 'detailed' }]"
          @click="currentMode = 'detailed'"
        >
          Detailed
        </button>
        <button
          :class="['mode-btn', { active: currentMode === 'fullscreen' }]"
          @click="currentMode = 'fullscreen'"
        >
          Fullscreen
        </button>
      </div>
    </header>

    <main class="demo-content">
      <!-- The catalog panel -->
      <div class="catalog-panel-container" :class="currentMode">
        <div class="catalog-panel">
          <!-- Search section -->
          <div class="search-section">
            <div class="search-input-container">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search for objects (e.g., M31, Andromeda, Jupiter)"
                class="search-input"
                @keyup.enter="searchObjects"
              />
              <button class="search-button" @click="searchObjects">
                <span class="search-icon">🔍</span>
              </button>
              <button
                v-if="currentMode !== 'overview' && searchResults.length > 0"
                class="filter-button"
                :class="{ active: showFilters }"
                @click="toggleFilters"
              >
                <span class="filter-icon">⚙️</span>
              </button>
            </div>

            <!-- Search filters (visible only in detailed/fullscreen modes) -->
            <div v-if="currentMode !== 'overview' && showFilters" class="filter-controls">
              <div class="filter-section">
                <label>Catalog:</label>
                <div class="filter-options">
                  <div v-for="cat in catalogs" :key="cat.value" class="filter-checkbox">
                    <input
                      :id="cat.value"
                      v-model="selectedCatalogs"
                      type="checkbox"
                      :value="cat.value"
                    />
                    <label :for="cat.value">{{ cat.label }}</label>
                  </div>
                </div>
              </div>

              <div class="filter-section">
                <label>Object Type:</label>
                <div class="filter-options">
                  <div v-for="type in objectTypes" :key="type.value" class="filter-checkbox">
                    <input
                      :id="type.value"
                      v-model="selectedObjectTypes"
                      type="checkbox"
                      :value="type.value"
                    />
                    <label :for="type.value">{{ type.label }}</label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Loading indicator -->
          <div v-if="isLoading" class="loading-indicator">
            <div class="spinner"></div>
            <div>Searching celestial objects...</div>
          </div>

          <!-- Search results -->
          <div v-else-if="searchResults.length > 0" class="search-results">
            <div v-if="selectedObject" class="object-details">
              <div class="object-header">
                <div>
                  <h2>{{ selectedObject.name }}</h2>
                  <div class="object-meta">
                    {{ selectedObject.type }} | {{ selectedObject.catalog }}
                    {{ selectedObject.catalogId }}
                    <span v-if="selectedObject.constellation">
                      | {{ selectedObject.constellation }}</span
                    >
                    <span v-if="selectedObject.magnitude !== undefined">
                      | Magnitude: {{ selectedObject.magnitude }}</span
                    >
                  </div>
                </div>
                <div class="object-actions">
                  <button
                    v-if="currentMode !== 'overview'"
                    class="action-button"
                    :disabled="!canSendToTelescope"
                    title="Send coordinates to telescope"
                    @click="sendToTelescope"
                  >
                    <span>🔭</span>
                  </button>
                  <button
                    v-if="currentMode !== 'overview'"
                    class="action-button"
                    :class="{ 'is-favorite': isFavorite }"
                    title="Toggle favorite"
                    @click="toggleFavorite"
                  >
                    <span>⭐</span>
                  </button>
                </div>
              </div>

              <!-- Object image (not visible in overview mode) -->
              <div
                v-if="currentMode !== 'overview' && selectedObject.imageUrl"
                class="object-image-container"
              >
                <img
                  :src="selectedObject.imageUrl"
                  :alt="selectedObject.name"
                  class="object-image"
                />
              </div>

              <div class="object-description">
                {{ selectedObject.description }}
              </div>

              <!-- Coordinates section -->
              <div
                v-if="selectedObject.ra !== undefined && selectedObject.dec !== undefined"
                class="object-coordinates"
              >
                <div><strong>RA:</strong> {{ formatCoordinate(selectedObject.ra, true) }}</div>
                <div><strong>Dec:</strong> {{ formatCoordinate(selectedObject.dec, false) }}</div>
              </div>
            </div>

            <!-- Object list (shown when no object is selected or in overview mode) -->
            <div v-if="!selectedObject || currentMode === 'overview'" class="object-list">
              <div
                v-for="object in filteredResults"
                :key="object.id"
                class="object-list-item"
                :class="{ active: selectedObject && selectedObject.id === object.id }"
                @click="selectObject(object)"
              >
                <div class="object-list-name">{{ object.name }}</div>
                <div class="object-list-meta">
                  {{ object.catalog }} {{ object.catalogId }} | {{ object.type }}
                </div>
              </div>
            </div>
          </div>

          <!-- No results message -->
          <div v-else-if="searchPerformed && searchResults.length === 0" class="no-results">
            <p>No objects found matching "{{ searchQuery }}"</p>
            <p>Try a different search term like "M31", "Andromeda", or "Jupiter"</p>
          </div>

          <!-- Initial state message -->
          <div v-else class="initial-state">
            <div class="catalog-icon">🌌</div>
            <h3>Celestial Object Catalog</h3>
            <p>Search for stars, galaxies, nebulae, planets and more</p>
            <p class="examples">Examples: M31, Orion, Pleiades, Jupiter</p>
          </div>

          <!-- Favorites section (tertiary feature) -->
          <div
            v-if="currentMode !== 'overview' && favoriteObjects.length > 0"
            class="favorites-section"
          >
            <h3>Favorites</h3>
            <div class="favorites-list">
              <div
                v-for="favorite in favoriteObjects"
                :key="favorite.id"
                class="favorite-item"
                @click="selectObject(favorite)"
              >
                <span>{{ favorite.name }}</span>
                <span class="favorite-catalog"
                  >{{ favorite.catalog }} {{ favorite.catalogId }}</span
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <footer class="demo-footer">
      <p>
        This is an isolated prototype showcasing the Object Catalog panel concept for Alpaca Web.
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// Mock types for celestial objects
interface CelestialObject {
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
enum Catalog {
  MESSIER = 'Messier',
  NGC = 'NGC',
  IC = 'IC',
  SOLAR_SYSTEM = 'Solar System'
}

// Common objects database - a subset for the prototype
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

// State
const currentMode = ref('detailed')
const searchQuery = ref('')
const searchResults = ref<CelestialObject[]>([])
const selectedObject = ref<CelestialObject | null>(null)
const isLoading = ref(false)
const searchPerformed = ref(false)
const showFilters = ref(false)
const favoriteObjects = ref<CelestialObject[]>([])
const isFavorite = ref(false)

// Filters
const selectedCatalogs = ref<string[]>([])
const selectedObjectTypes = ref<string[]>([])

// Filter options
const catalogs = [
  { label: 'Messier', value: Catalog.MESSIER },
  { label: 'NGC', value: Catalog.NGC },
  { label: 'IC', value: Catalog.IC },
  { label: 'Solar System', value: Catalog.SOLAR_SYSTEM }
]

const objectTypes = [
  { label: 'Galaxy', value: 'Galaxy' },
  { label: 'Nebula', value: 'Nebula' },
  { label: 'Star Cluster', value: 'Open Cluster' },
  { label: 'Globular Cluster', value: 'Globular Cluster' },
  { label: 'Planet', value: 'Planet' }
]

// Simulated telescope connection status
const canSendToTelescope = ref(false)

// Search for objects
const searchObjects = async () => {
  if (!searchQuery.value.trim()) return

  isLoading.value = true
  searchPerformed.value = true

  try {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Case-insensitive search
    const normalizedQuery = searchQuery.value.toLowerCase().trim()

    // Search in our local database
    searchResults.value = commonObjects.filter((obj) => {
      const matchesName = obj.name.toLowerCase().includes(normalizedQuery)
      const matchesCatalogId = obj.catalogId.toLowerCase().includes(normalizedQuery)
      const matchesCommonNames =
        obj.commonNames?.some((name) => name.toLowerCase().includes(normalizedQuery)) || false

      return matchesName || matchesCatalogId || matchesCommonNames
    })

    // Automatically select the first result if any found
    if (searchResults.value.length > 0) {
      selectObject(searchResults.value[0])
    } else {
      selectedObject.value = null
    }
  } catch (error) {
    console.error('Failed to search:', error)
    searchResults.value = []
  } finally {
    isLoading.value = false
  }
}

// Apply filters to search results
const filteredResults = computed(() => {
  let results = [...searchResults.value]

  // Apply catalog filter if any selected
  if (selectedCatalogs.value.length > 0) {
    results = results.filter((obj) => selectedCatalogs.value.includes(obj.catalog))
  }

  // Apply object type filter if any selected
  if (selectedObjectTypes.value.length > 0) {
    results = results.filter((obj) => selectedObjectTypes.value.includes(obj.type))
  }

  return results
})

// Select an object for detailed view
const selectObject = (object: CelestialObject) => {
  selectedObject.value = object
  // Check if the selected object is in favorites
  isFavorite.value = favoriteObjects.value.some((fav) => fav.id === object.id)
}

// Toggle show/hide filters
const toggleFilters = () => {
  showFilters.value = !showFilters.value
}

// Toggle favorite status
const toggleFavorite = () => {
  if (!selectedObject.value) return

  if (isFavorite.value) {
    // Remove from favorites
    favoriteObjects.value = favoriteObjects.value.filter(
      (obj) => obj.id !== selectedObject.value!.id
    )
    isFavorite.value = false
  } else {
    // Add to favorites
    favoriteObjects.value.push(selectedObject.value)
    isFavorite.value = true
  }
}

// Send coordinates to telescope (mock functionality)
const sendToTelescope = () => {
  if (!selectedObject.value || !canSendToTelescope.value) return

  // In a real implementation, this would send coordinates to the telescope
  console.log('Sending coordinates to telescope:', {
    ra: selectedObject.value.ra,
    dec: selectedObject.value.dec
  })

  // Mock success message
  alert(`Sending ${selectedObject.value.name} coordinates to telescope`)
}

// Format coordinates from decimal to astronomical format
const formatCoordinate = (value: number, isRA: boolean): string => {
  if (isRA) {
    // Convert RA degrees to hours (15 degrees = 1 hour)
    const totalHours = value / 15
    const hours = Math.floor(totalHours)
    const minutes = Math.floor((totalHours - hours) * 60)
    const seconds = Math.floor(((totalHours - hours) * 60 - minutes) * 60)
    return `${hours}h ${minutes}m ${seconds}s`
  } else {
    // Format declination
    const sign = value >= 0 ? '+' : '-'
    const absValue = Math.abs(value)
    const degrees = Math.floor(absValue)
    const minutes = Math.floor((absValue - degrees) * 60)
    const seconds = Math.floor(((absValue - degrees) * 60 - minutes) * 60)
    return `${sign}${degrees}° ${minutes}' ${seconds}"`
  }
}

// Reset search if mode changes to overview
watch(
  () => currentMode.value,
  (newMode) => {
    if (newMode === 'overview') {
      showFilters.value = false
    }
  }
)

// For demo purposes, simulate a telescope connection after 2 seconds
setTimeout(() => {
  canSendToTelescope.value = true
}, 2000)
</script>

<style scoped>
.catalog-demo {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif;
  background-color: #f5f7fa;
  color: #333;
}

.demo-header {
  padding: 1rem 2rem;
  background-color: #1e88e5;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.demo-header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.mode-switcher {
  display: flex;
  gap: 8px;
}

.mode-btn {
  background-color: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 4px;
  color: white;
  padding: 6px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.mode-btn:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

.mode-btn.active {
  background-color: white;
  color: #1e88e5;
}

.demo-content {
  flex: 1;
  display: flex;
  padding: 2rem;
  justify-content: center;
  overflow: auto;
}

.catalog-panel-container {
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  background-color: white;
  overflow: hidden;
  transition: all 0.3s ease;
}

.catalog-panel-container.overview {
  width: 350px;
  height: 500px;
}

.catalog-panel-container.detailed {
  width: 600px;
  height: 600px;
}

.catalog-panel-container.fullscreen {
  width: 90%;
  height: 80vh;
}

.catalog-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.search-section {
  padding: 10px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.search-input-container {
  display: flex;
  gap: 5px;
}

.search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.search-button,
.filter-button {
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  width: 36px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-button {
  background-color: #f0f0f0;
  color: #666;
}

.filter-button.active {
  background-color: #4a90e2;
  color: white;
}

.filter-controls {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #ddd;
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.filter-section label {
  font-weight: bold;
  font-size: 12px;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #666;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #4a90e2;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.search-results {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.object-details {
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.object-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.object-header h2 {
  margin: 0 0 5px 0;
  font-size: 20px;
}

.object-meta {
  color: #666;
  font-size: 13px;
}

.object-actions {
  display: flex;
  gap: 8px;
}

.action-button {
  background: none;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-button:hover:not(:disabled) {
  background-color: #f0f0f0;
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-button.is-favorite {
  background-color: #fff8e1;
  border-color: #ffd54f;
  color: #ff9800;
}

.object-image-container {
  width: 100%;
  display: flex;
  justify-content: center;
  background-color: #000;
  border-radius: 4px;
  overflow: hidden;
}

.object-image {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
}

.object-description {
  font-size: 14px;
  line-height: 1.5;
  color: #333;
}

.object-coordinates {
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 13px;
  display: flex;
  justify-content: space-around;
}

.object-list {
  width: 100%;
}

.object-list-item {
  padding: 12px 15px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background-color 0.2s;
}

.object-list-item:hover {
  background-color: #f5f5f5;
}

.object-list-item.active {
  background-color: #e3f2fd;
}

.object-list-name {
  font-weight: bold;
  margin-bottom: 3px;
}

.object-list-meta {
  font-size: 12px;
  color: #666;
}

.no-results {
  padding: 30px;
  text-align: center;
  color: #666;
}

.initial-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
  text-align: center;
  color: #666;
}

.catalog-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.initial-state h3 {
  margin: 0 0 10px 0;
  color: #333;
}

.examples {
  margin-top: 15px;
  font-style: italic;
  font-size: 13px;
}

.favorites-section {
  padding: 15px;
  background-color: #f9f9f9;
  border-top: 1px solid #eee;
}

.favorites-section h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #333;
}

.favorites-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.favorite-item {
  background-color: #e3f2fd;
  border: 1px solid #bbdefb;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.favorite-item:hover {
  background-color: #bbdefb;
}

.favorite-catalog {
  color: #666;
  font-size: 11px;
}

.demo-footer {
  padding: 1rem;
  background-color: #f5f5f5;
  border-top: 1px solid #ddd;
  text-align: center;
  font-size: 0.875rem;
  color: #666;
}
</style>
