<template>
  <div class="aw-panel deep-sky-catalog-panel">
    <div class="aw-panel-header">Deep Sky Catalog</div>
    <form class="aw-form-group filter-bar" @submit.prevent>
      <div class="filter-row">
        <input v-model="filters.name" class="aw-input" type="text" placeholder="Search name or identifier..." @input="onFilterChange" />
        <select v-model="filters.type" class="aw-select" @change="onFilterChange">
          <option value="">All Types</option>
          <option v-for="type in objectTypes" :key="type" :value="type">{{ type }}</option>
        </select>
        <input v-model.number="filters.magMin" class="aw-input mag-input" type="number" placeholder="Min Mag" @input="onFilterChange" />
        <input v-model.number="filters.magMax" class="aw-input mag-input" type="number" placeholder="Max Mag" @input="onFilterChange" />
        <label class="aw-checkbox-container">
          <input v-model="filters.messierOnly" type="checkbox" @change="onFilterChange" />
          <span class="aw-checkbox"></span> Messier
        </label>
        <label class="aw-checkbox-container">
          <input v-model="filters.ngcOnly" type="checkbox" @change="onFilterChange" />
          <span class="aw-checkbox"></span> NGC
        </label>
        <label class="aw-checkbox-container">
          <input v-model="filters.icOnly" type="checkbox" @change="onFilterChange" />
          <span class="aw-checkbox"></span> IC
        </label>
      </div>
    </form>
    <div class="catalog-results">
      <div
        v-for="obj in filteredObjects"
        :key="(obj.NGC || '') + (obj.IC || '') + (obj.Name || '')"
        class="catalog-result-row"
        :class="{ selected: selectedObject && selectedObject === obj }"
        @click="selectObject(obj)"
      >
        <span class="object-name">{{ obj.Name || obj.CommonNames || obj.Identifiers }}</span>
        <span class="object-type">{{ obj.Type }}</span>
        <span class="object-mag">Mag: {{ obj.Mag || obj.VMag || '?' }}</span>
        <span class="object-id">
          <span v-if="obj.M">M{{ obj.M }}</span>
          <span v-if="obj.NGC">NGC {{ obj.NGC }}</span>
          <span v-if="obj.IC">IC {{ obj.IC }}</span>
        </span>
      </div>
      <div v-if="!filteredObjects.length" class="no-results">No objects found.</div>
    </div>
    <div v-if="selectedObject" class="catalog-detail aw-panel-content-bg-color">
      <div class="detail-header">
        <span class="detail-name">{{ selectedObject.Name }}</span>
        <button class="aw-button aw-button--tertiary close-detail" @click="clearSelection">Close</button>
      </div>
      <div class="detail-fields">
        <div><b>Type:</b> {{ selectedObject.Type }}</div>
        <div><b>RA:</b> {{ selectedObject.RA }}</div>
        <div><b>Dec:</b> {{ selectedObject.Dec }}</div>
        <div><b>Magnitude:</b> {{ selectedObject.Mag || selectedObject.VMag || '?' }}</div>
        <div v-if="selectedObject.M"><b>Messier:</b> M{{ selectedObject.M }}</div>
        <div v-if="selectedObject.NGC"><b>NGC:</b> {{ selectedObject.NGC }}</div>
        <div v-if="selectedObject.IC"><b>IC:</b> {{ selectedObject.IC }}</div>
        <div v-if="selectedObject.CstarNames"><b>Cstar Names:</b> {{ selectedObject.CstarNames }}</div>
        <div v-if="selectedObject.Identifiers"><b>Identifiers:</b> {{ selectedObject.Identifiers }}</div>
        <div v-if="selectedObject.CommonNames"><b>Common Names:</b> {{ selectedObject.CommonNames }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useDeepSkyCatalogStore } from '@/stores/useDeepSkyCatalogStore'
import type { DeepSkyObject } from '@/stores/useDeepSkyCatalogStore'

const store = useDeepSkyCatalogStore()
const filters = store.filters
const filteredObjects = computed(() => store.filteredObjects)
const selectedObject = computed<DeepSkyObject | null>(() => store.selectedObject)

const objectTypes = computed(() => {
  const types = new Set<string>()
  store.allObjects.forEach((obj) => {
    if (obj.Type) types.add(obj.Type)
  })
  return Array.from(types).sort()
})

function onFilterChange() {
  // Triggers computed update
}

function selectObject(obj: DeepSkyObject) {
  store.selectObject(obj)
}

function clearSelection() {
  store.clearSelection()
}

onMounted(() => {
  store.loadCatalog()
})
</script>

<style scoped>
.deep-sky-catalog-panel {
  padding: var(--aw-spacing-md);
  margin: 0 auto;
  box-shadow: var(--aw-shadow-sm);
  display: flex;
  flex-direction: column;
  gap: var(--aw-spacing-md);
}

.aw-panel-header {
  font-size: var(--aw-font-size-xl);
  font-weight: 600;
  color: var(--aw-text-color);
  margin-bottom: var(--aw-spacing-md);
}

.filter-bar {
  display: flex;
  flex-direction: column;
  gap: var(--aw-spacing-sm);
  background: var(--aw-panel-bg-color);
  border-radius: var(--aw-border-radius-sm);
  padding: var(--aw-spacing-sm);
  border: 1px solid var(--aw-panel-border-color);
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--aw-spacing-sm);
  align-items: center;
}

.mag-input {
  max-width: 90px;
}

.catalog-results {
  background: var(--aw-panel-bg-color);
  border-radius: var(--aw-border-radius-sm);
  border: 1px solid var(--aw-panel-border-color);
  max-height: 350px;
  overflow-y: auto;
  margin-bottom: var(--aw-spacing-md);
}

.catalog-result-row {
  display: flex;
  gap: var(--aw-spacing-md);
  align-items: center;
  padding: var(--aw-spacing-xs) var(--aw-spacing-md);
  border-bottom: 1px solid var(--aw-panel-border-color);
  cursor: pointer;
  transition: background 0.15s;
}

.catalog-result-row.selected,
.catalog-result-row:hover {
  background: var(--aw-panel-hover-bg-color);
}

.object-name {
  font-weight: 500;
  color: var(--aw-link-color);
  min-width: 120px;
}

.object-type {
  color: var(--aw-text-secondary-color);
  min-width: 90px;
}

.object-mag {
  color: var(--aw-text-secondary-color);
  min-width: 70px;
}

.object-id {
  color: var(--aw-text-color-muted);
  min-width: 120px;
  display: flex;
  gap: var(--aw-spacing-xs);
}

.no-results {
  padding: var(--aw-spacing-md);
  color: var(--aw-text-color-muted);
  text-align: center;
}

.catalog-detail {
  background: var(--aw-panel-bg-color);
  border-radius: var(--aw-border-radius-sm);
  border: 1px solid var(--aw-panel-border-color);
  padding: var(--aw-spacing-md);
  margin-top: var(--aw-spacing-md);
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--aw-spacing-sm);
}

.detail-name {
  font-size: var(--aw-font-size-lg);
  font-weight: 600;
  color: var(--aw-link-color);
}

.close-detail {
  margin-left: var(--aw-spacing-md);
}

.detail-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--aw-spacing-sm);
}

@media (width <= 700px) {
  .deep-sky-catalog-panel {
    padding: var(--aw-spacing-sm);
  }

  .detail-fields {
    grid-template-columns: 1fr;
  }
}
</style>
