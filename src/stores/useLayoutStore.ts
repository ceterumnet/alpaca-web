import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const LAYOUT_STORAGE_KEY = 'alpaca-web-layout'

// Define the layout item interface
export interface LayoutItem {
  x: number
  y: number
  w: number
  h: number
  i: string
  deviceType?: string
  deviceNum?: number
  connected?: boolean
  apiBaseUrl?: string
  static?: boolean
}

export const useLayoutStore = defineStore('layout', () => {
  // Store the current layout
  const layout = ref<LayoutItem[]>([])

  // Save layout to localStorage
  function saveLayout() {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout.value))
  }

  // Load layout from localStorage
  function loadLayout(): LayoutItem[] {
    const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (savedLayout) {
      try {
        return JSON.parse(savedLayout)
      } catch (e) {
        console.error('Failed to parse saved layout:', e)
      }
    }
    return []
  }

  // Initialize the layout from localStorage if available
  function initLayout() {
    const savedLayout = loadLayout()
    if (savedLayout.length > 0) {
      layout.value = savedLayout
      return true
    }
    return false
  }

  // Reset the layout to an empty state
  function resetLayout() {
    layout.value = []
    saveLayout()
  }

  // Update the layout with a new configuration
  function updateLayout(newLayout: LayoutItem[]) {
    layout.value = newLayout
    saveLayout()
  }

  // Watch for changes to the layout and save them
  watch(
    layout,
    () => {
      saveLayout()
    },
    { deep: true }
  )

  return {
    layout,
    initLayout,
    loadLayout,
    saveLayout,
    resetLayout,
    updateLayout
  }
})
