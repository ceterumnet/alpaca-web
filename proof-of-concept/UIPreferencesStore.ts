import { defineStore } from 'pinia'

export interface PanelState {
  mode: string
  isMinimized: boolean
}

interface UIPreferences {
  panelStates: Record<string, PanelState>
}

export const useUIPreferencesStore = defineStore('uiPreferences', {
  state: (): UIPreferences => ({
    panelStates: {}
  }),

  actions: {
    getPanelState(panelId: string): PanelState | null {
      return this.panelStates[panelId] || null
    },

    savePanelState(panelId: string, state: PanelState): void {
      this.panelStates[panelId] = { ...state }
    }
  }
})
