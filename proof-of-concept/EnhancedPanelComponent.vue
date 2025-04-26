<template>
  <div
    class="panel"
    :class="{
      fullscreen: mode === 'FULLSCREEN',
      detailed: mode === 'DETAILED',
      overview: mode === 'OVERVIEW'
    }"
  >
    <div class="panel-header">
      <div class="panel-title">
        <slot name="title">{{ title }}</slot>
      </div>
      <div class="panel-actions">
        <button
          v-if="showMinimizeButton"
          class="action-button"
          :title="isMinimized ? 'Expand' : 'Minimize'"
          @click="toggleMinimize"
        >
          <slot name="minimize-icon">
            <span class="icon">{{ isMinimized ? '↗' : '↘' }}</span>
          </slot>
        </button>
        <button v-if="showModeToggle" class="action-button" :title="modeTitle" @click="cycleMode">
          <slot name="mode-icon">
            <span class="icon">{{ modeIcon }}</span>
          </slot>
        </button>
        <button
          v-if="showCloseButton"
          class="action-button"
          title="Close panel"
          @click="closePanel"
        >
          <slot name="close-icon">
            <span class="icon">✕</span>
          </slot>
        </button>
      </div>
    </div>
    <div v-if="!isMinimized" class="panel-content">
      <slot></slot>
    </div>
    <div v-if="!isMinimized && showStatusBar" class="panel-status-bar">
      <slot name="status-bar">
        <span v-if="statusText">{{ statusText }}</span>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUIPreferencesStore } from './UIPreferencesStore'

// Props with types
const props = defineProps({
  panelId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: 'Panel'
  },
  initialMode: {
    type: String,
    default: 'OVERVIEW',
    validator: (value: string) => ['OVERVIEW', 'DETAILED', 'FULLSCREEN'].includes(value)
  },
  showModeToggle: {
    type: Boolean,
    default: true
  },
  showMinimizeButton: {
    type: Boolean,
    default: true
  },
  showCloseButton: {
    type: Boolean,
    default: true
  },
  showStatusBar: {
    type: Boolean,
    default: true
  },
  statusText: {
    type: String,
    default: ''
  }
})

// Emits
const emit = defineEmits(['close', 'mode-change', 'minimize-toggle'])

// State from UI preferences store
const uiStore = useUIPreferencesStore()

// Panel state
const mode = ref(props.initialMode)
const isMinimized = ref(false)

// Load saved preferences on mount
onMounted(() => {
  // Get saved panel state from preferences store
  const savedState = uiStore.getPanelState(props.panelId)
  if (savedState) {
    mode.value = savedState.mode || props.initialMode
    isMinimized.value = savedState.isMinimized || false
  }
})

// Computed properties
const modeIcon = computed(() => {
  switch (mode.value) {
    case 'OVERVIEW':
      return '▤'
    case 'DETAILED':
      return '⊞'
    case 'FULLSCREEN':
      return '⤢'
    default:
      return '▤'
  }
})

const modeTitle = computed(() => {
  switch (mode.value) {
    case 'OVERVIEW':
      return 'Switch to detailed view'
    case 'DETAILED':
      return 'Switch to fullscreen view'
    case 'FULLSCREEN':
      return 'Switch to overview'
    default:
      return 'Change view mode'
  }
})

// Methods
const cycleMode = () => {
  const modes = ['OVERVIEW', 'DETAILED', 'FULLSCREEN']
  const currentIndex = modes.indexOf(mode.value)
  const nextIndex = (currentIndex + 1) % modes.length
  mode.value = modes[nextIndex]

  // Save to preferences
  uiStore.savePanelState(props.panelId, {
    mode: mode.value,
    isMinimized: isMinimized.value
  })

  emit('mode-change', mode.value)
}

const toggleMinimize = () => {
  isMinimized.value = !isMinimized.value

  // Save to preferences
  uiStore.savePanelState(props.panelId, {
    mode: mode.value,
    isMinimized: isMinimized.value
  })

  emit('minimize-toggle', isMinimized.value)
}

const closePanel = () => {
  emit('close')
}
</script>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  background-color: var(--panel-bg, #f5f5f5);
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
  transition: all 0.3s ease;
  overflow: hidden;
  height: 100%;
}

.panel.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 1000;
  border-radius: 0;
  margin: 0;
}

.panel.detailed {
  min-height: 400px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: var(--panel-header-bg, #e8e8e8);
  border-bottom: 1px solid var(--panel-border, #ddd);
}

.panel-title {
  font-weight: bold;
  font-size: 1rem;
  color: var(--panel-title-color, #333);
}

.panel-actions {
  display: flex;
  gap: 0.5rem;
}

.action-button {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.action-button:hover {
  background-color: var(--button-hover-bg, rgba(0, 0, 0, 0.1));
}

.icon {
  width: 1rem;
  height: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.panel-content {
  flex: 1;
  padding: 1rem;
  overflow: auto;
}

.panel-status-bar {
  padding: 0.25rem 1rem;
  background-color: var(--panel-statusbar-bg, #e8e8e8);
  border-top: 1px solid var(--panel-border, #ddd);
  font-size: 0.8rem;
  color: var(--panel-status-color, #666);
}
</style>
