import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { decode } from 'msgpack-lite'

export interface DeepSkyObject {
  Name: string
  Type: string
  RA: string
  Dec: string
  Mag?: string
  VMag?: string
  M?: string
  NGC?: string
  IC?: string
  CstarNames?: string
  Identifiers?: string
  CommonNames?: string
}

export const useDeepSkyCatalogStore = defineStore('deepSkyCatalog', () => {
  const allObjects = ref<DeepSkyObject[]>([])
  const isLoaded = ref(false)
  const filters = ref({
    name: '',
    type: '',
    magMin: null as number | null,
    magMax: null as number | null,
    messierOnly: false,
    ngcOnly: false,
    icOnly: false,
  })
  const selectedObject = ref<DeepSkyObject | null>(null)

  async function loadCatalog() {
    if (isLoaded.value) return
    const response = await fetch('/src/assets/catalogs/ngc.msgpack')
    const arrayBuffer = await response.arrayBuffer()
    allObjects.value = decode(new Uint8Array(arrayBuffer)) as DeepSkyObject[]
    isLoaded.value = true
  }

  const filteredObjects = computed(() => {
    let result = allObjects.value
    if (filters.value.name) {
      const name = filters.value.name.toLowerCase()
      result = result.filter(obj =>
        obj.Name?.toLowerCase().includes(name) ||
        obj.CommonNames?.toLowerCase().includes(name) ||
        obj.Identifiers?.toLowerCase().includes(name)
      )
    }
    if (filters.value.type) {
      result = result.filter(obj => obj.Type === filters.value.type)
    }
    if (filters.value.magMin !== null) {
      result = result.filter(obj => {
        const mag = parseFloat(obj.Mag || obj.VMag || '')
        return !isNaN(mag) && mag >= (filters.value.magMin as number)
      })
    }
    if (filters.value.magMax !== null) {
      result = result.filter(obj => {
        const mag = parseFloat(obj.Mag || obj.VMag || '')
        return !isNaN(mag) && mag <= (filters.value.magMax as number)
      })
    }
    if (filters.value.messierOnly) {
      result = result.filter(obj => obj.M)
    }
    if (filters.value.ngcOnly) {
      result = result.filter(obj => obj.NGC)
    }
    if (filters.value.icOnly) {
      result = result.filter(obj => obj.IC)
    }
    return result
  })

  function selectObject(obj: DeepSkyObject) {
    selectedObject.value = obj
  }

  function clearSelection() {
    selectedObject.value = null
  }

  function setFilter<K extends keyof typeof filters.value>(key: K, value: typeof filters.value[K]) {
    filters.value[key] = value
  }

  return {
    allObjects,
    isLoaded,
    filters,
    filteredObjects,
    selectedObject,
    loadCatalog,
    selectObject,
    clearSelection,
    setFilter,
  }
}) 